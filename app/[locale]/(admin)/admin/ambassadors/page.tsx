import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { CrownIcon } from "lucide-react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";

import { ReviewBoard } from "@/components/admin/review-board";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { isAdmin } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { placeLabel } from "@/lib/growth/rules";
import { reviewAmbassador } from "@/server/actions/ambassadors";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminGrowth");
  return { title: t("ambassadorsTitle"), robots: { index: false } };
}

/** Ambassador applications board plus the count of active ambassadors per tier. */
export default async function AdminAmbassadorsPage() {
  const user = await requirePermission("admin.access");
  if (!isAdmin(user)) forbidden();
  const db = getDb();
  const [t, ta, format, locale, apps, active] = await Promise.all([
    getTranslations("adminGrowth"),
    getTranslations("ambassadors"),
    getFormatter(),
    getLocale(),
    db.ambassadorApplication.findMany({
      where: { status: { not: "withdrawn" } },
      orderBy: { createdAt: "asc" },
      take: 400,
      select: {
        id: true,
        scope: true,
        countryCode: true,
        city: true,
        motivation: true,
        experience: true,
        languages: true,
        hoursPerMonth: true,
        linkedinUrl: true,
        status: true,
        isDemo: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    }),
    db.ambassador.groupBy({ by: ["scope"], _count: { _all: true } }),
  ]);
  const regions = new Intl.DisplayNames([locale], { type: "region" });
  const languages = new Intl.DisplayNames([locale], { type: "language" });
  const items = apps.map((a) => ({
    id: a.id,
    status: a.status,
    title: `${a.user.name} · ${placeLabel(a, (c) => regions.of(c) ?? c, ta("global"))}`,
    meta: `${t("hours", { hours: a.hoursPerMonth })} · ${a.languages.map((l) => languages.of(l) ?? l).join(", ")} · ${format.relativeTime(a.createdAt)}`,
    body: a.motivation,
    extra: a.experience,
    link: a.linkedinUrl,
    tags: [ta(`tiers.${a.scope}.short`)],
    isDemo: a.isDemo,
  }));

  return (
    <div className="container-page flex flex-col gap-8 py-10">
      <PageHeader icon={CrownIcon} title={t("ambassadorsTitle")} lead={t("ambassadorsLead")} />
      <dl className="flex flex-wrap gap-3" data-testid="ambassador-counts">
        {(["global", "country", "city"] as const).map((scope) => (
          <div
            key={scope}
            className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2"
          >
            <dt className="text-small text-muted-foreground">{ta(`tiers.${scope}.title`)}</dt>
            <dd>
              <Badge variant="verified">
                {active.find((r) => r.scope === scope)?._count._all ?? 0}
              </Badge>
            </dd>
          </div>
        ))}
      </dl>
      <ReviewBoard items={items} action={reviewAmbassador} testId="ambassador-board" />
    </div>
  );
}
