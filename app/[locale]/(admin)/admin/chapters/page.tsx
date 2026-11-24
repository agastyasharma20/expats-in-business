import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { ListIcon, MegaphoneIcon, PlusIcon, RocketIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ChapterLaunchForm } from "@/components/admin/chapter-launch-form";
import { ActionButton } from "@/components/common/action-button";
import { Panel } from "@/components/dashboard/panel";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { isAdmin } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { Link } from "@/lib/i18n/navigation";
import { setChapterStatus } from "@/server/actions/chapter-launch";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminChapters");
  return { title: t("title"), robots: { index: false } };
}

/** Chapter-in-a-box: launch a city in under a minute, and move chapters between waitlist and live. */
export default async function AdminChaptersPage() {
  const user = await requirePermission("admin.access");
  if (!isAdmin(user)) forbidden();
  const db = getDb();
  const [t, countries, chapters, requests] = await Promise.all([
    getTranslations("adminChapters"),
    db.country.findMany({
      orderBy: { name: "asc" },
      select: { code: true, name: true, defaultTimezone: true, defaultCurrency: true },
    }),
    db.chapter.findMany({
      where: { status: { in: ["live", "launching"] } },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        timezone: true,
        currency: true,
        isDemo: true,
        country: { select: { name: true } },
      },
    }),
    db.chapterRequest.findMany({
      select: {
        id: true,
        city: true,
        country: { select: { name: true } },
        _count: { select: { votes: true } },
      },
      take: 100,
    }),
  ]);
  const wanted = requests
    .filter((r) => r._count.votes > 0)
    .sort((a, b) => b._count.votes - a._count.votes)
    .slice(0, 10);

  return (
    <div className="container-page flex flex-col gap-8 py-10">
      <PageHeader icon={RocketIcon} title={t("title")} lead={t("lead")} />
      <Panel id="launch" title={t("launchTitle")} icon={PlusIcon}>
        <ChapterLaunchForm countries={countries} />
      </Panel>
      <Panel id="chapters-list" title={t("listTitle")} icon={ListIcon}>
        <ul className="flex flex-col gap-3" data-testid="admin-chapters">
          {chapters.map((chapter) => {
            const next = chapter.status === "live" ? "launching" : "live";
            return (
              <li
                key={chapter.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface p-4"
                data-testid="admin-chapter"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link
                    href={`/chapters/${chapter.slug}`}
                    className="font-semibold text-brand-950 hover:underline"
                  >
                    {chapter.name}
                  </Link>
                  <span className="text-small text-muted-foreground">
                    {chapter.country.name} · {chapter.timezone} · {chapter.currency}
                  </span>
                </div>
                <Badge variant={chapter.status === "live" ? "verified" : "unconfirmed"}>
                  {t(`status.${chapter.status}`)}
                </Badge>
                {chapter.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
                <ActionButton
                  action={setChapterStatus}
                  fields={{ id: chapter.id, status: next }}
                  toasts={{ live: t("nowLive"), launching: t("nowLaunching") }}
                  errorText={t("errors.default")}
                  testId={`chapter-${chapter.slug}-${next}`}
                >
                  {t(`moveTo.${next}`)}
                </ActionButton>
              </li>
            );
          })}
        </ul>
      </Panel>
      <Panel id="wanted" title={t("wantedTitle")} icon={MegaphoneIcon}>
        {wanted.length ? (
          <ul className="flex flex-col gap-2" data-testid="wanted-cities">
            {wanted.map((request) => (
              <li key={request.id} className="flex items-center justify-between gap-3">
                <span className="font-semibold text-brand-950">
                  {request.city}, {request.country.name}
                </span>
                <span className="text-small text-muted-foreground">
                  {t("votes", { count: request._count.votes })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">{t("wantedEmpty")}</p>
        )}
      </Panel>
    </div>
  );
}
