import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { BadgeCheckIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { isAdmin } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { Link } from "@/lib/i18n/navigation";

export const metadata: Metadata = { robots: { index: false } };

/** Verification queue (admins): pending providers first, then the latest decisions. */
export default async function AdminProvidersPage() {
  const user = await requireUser("/admin/providers");
  if (!isAdmin(user)) forbidden();
  const [t, locale] = await Promise.all([getTranslations("adminProviders"), getLocale()]);
  const db = getDb();
  const [pending, history] = await Promise.all([
    db.provider.findMany({
      where: { verificationStatus: "pending" },
      orderBy: { updatedAt: "asc" },
      select: {
        id: true,
        name: true,
        category: { select: { name: true } },
        chapter: { select: { name: true } },
        updatedAt: true,
      },
    }),
    db.providerVerification.findMany({
      where: { decidedAt: { not: null } },
      orderBy: { decidedAt: "desc" },
      take: 15,
      select: {
        id: true,
        decidedAt: true,
        provider: { select: { id: true, name: true, verificationStatus: true } },
        verifiedBy: { select: { name: true } },
      },
    }),
  ]);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <div className="container-page flex flex-col gap-8 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="text-muted-foreground">{t("lead")}</p>
      </header>
      <section aria-labelledby="queue-title" className="flex flex-col gap-3">
        <h2 id="queue-title" className="text-h3">
          {t("queue")}
        </h2>
        {pending.length ? (
          <ul
            className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface"
            data-testid="verification-queue"
          >
            {pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex flex-col">
                  <span className="font-semibold text-brand-950">{p.name}</span>
                  <span className="text-small text-muted-foreground">
                    {p.category.name} · {p.chapter.name} · {date.format(p.updatedAt)}
                  </span>
                </div>
                <Link href={`/admin/providers/${p.id}`} className={buttonVariants({ size: "sm" })}>
                  {t("review")}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={BadgeCheckIcon}
            title={t("queue")}
            description={t("empty")}
            action={
              <Link href="/providers" className={buttonVariants({ variant: "outline" })}>
                {t("manage")}
              </Link>
            }
            headingLevel="h3"
          />
        )}
      </section>
      <section aria-labelledby="history-title" className="flex flex-col gap-3">
        <h2 id="history-title" className="text-h3">
          {t("history")}
        </h2>
        <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
          {history.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <Link
                href={`/admin/providers/${h.provider.id}`}
                className="font-semibold text-brand-950 underline"
              >
                {h.provider.name}
              </Link>
              <span className="flex items-center gap-2 text-small text-muted-foreground">
                <Badge
                  variant={h.provider.verificationStatus === "verified" ? "verified" : "outline"}
                >
                  {h.provider.verificationStatus}
                </Badge>
                {h.decidedAt ? date.format(h.decidedAt) : null} · {h.verifiedBy?.name}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
