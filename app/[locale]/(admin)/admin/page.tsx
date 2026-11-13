import type { Metadata } from "next";
import {
  ActivityIcon,
  BotIcon,
  CalendarDaysIcon,
  FlagIcon,
  GaugeIcon,
  QrCodeIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { BarChart } from "@/components/admin/bar-chart";
import { Panel } from "@/components/dashboard/panel";
import { PageHeader } from "@/components/layout/page-header";
import { StatCounter } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { chapterHealth, getOverview, recentActivity } from "@/lib/admin/metrics";
import { requirePermission } from "@/lib/auth/session";
import { Link } from "@/lib/i18n/navigation";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("title"), robots: { index: false } };
}

export default async function AdminPage() {
  const user = await requirePermission("admin.access");
  const [t, format, overview, activity] = await Promise.all([
    getTranslations("admin"),
    getFormatter(),
    getOverview(user),
    recentActivity(user),
  ]);
  const health = await chapterHealth(overview.chapters.map((c) => c.id));
  const k = overview.kpis;
  const formatDay = (day: string) =>
    format.dateTime(new Date(`${day}T00:00:00Z`), {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

  const kpis = [
    {
      key: "members",
      value: k.members,
      icon: UsersIcon,
      href: overview.global ? "/admin/members" : null,
    },
    { key: "newMembers", value: k.newMembers, icon: UserPlusIcon, href: null },
    { key: "upcoming", value: k.upcoming, icon: CalendarDaysIcon, href: "/admin/events" },
    { key: "checkIns", value: k.checkIns30, icon: QrCodeIcon, href: null },
    {
      key: "reports",
      value: k.openReports,
      icon: FlagIcon,
      href: "/moderation",
      alert: k.openReports > 0,
    },
    ...(overview.global
      ? [
          {
            key: "verifications",
            value: k.pendingVerifications,
            icon: ShieldCheckIcon,
            href: "/admin/providers",
            alert: k.pendingVerifications > 0,
          },
          { key: "concierge", value: k.concierge30, icon: BotIcon, href: null },
          {
            key: "suspended",
            value: k.suspended,
            icon: ShieldAlertIcon,
            href: "/admin/members?status=suspended",
          },
        ]
      : []),
  ];
  const top = overview.funnel[0]?.value || 1;

  return (
    <div className="container-page flex flex-col gap-8 py-10">
      <PageHeader
        icon={GaugeIcon}
        eyebrow={
          overview.global
            ? t("scopeGlobal")
            : t("scopeChapters", { count: overview.chapters.length })
        }
        title={t("title")}
        lead={t("lead")}
        actions={
          <Link href="/admin/events/new" className={buttonVariants()}>
            {t("newEvent")}
          </Link>
        }
      />

      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" data-testid="admin-kpis">
        {kpis.map((kpi, i) => {
          const body = (
            <>
              <span className="flex items-center justify-between">
                <kpi.icon aria-hidden="true" className="size-5 text-brand-700" />
                {"alert" in kpi && kpi.alert ? (
                  <Badge variant="destructive">{t("needsAction")}</Badge>
                ) : null}
              </span>
              <StatCounter
                value={kpi.value}
                className="font-heading text-h2 font-bold text-brand-950"
              />
              <span className="text-small text-muted-foreground">{t(`kpi.${kpi.key}`)}</span>
            </>
          );
          const cls =
            "flex h-full flex-col gap-2 rounded-2xl border border-line bg-surface p-5 shadow-card";
          return (
            <li key={kpi.key} className="animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
              {kpi.href ? (
                <Link
                  href={kpi.href}
                  className={`${cls} transition-transform duration-(--duration-micro) hover:-translate-y-0.5 hover:border-line-strong`}
                >
                  {body}
                </Link>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel id="signups" title={t("charts.signups")} icon={UserPlusIcon} delay={2}>
          <BarChart
            data={overview.signups}
            label={t("charts.signupsLabel")}
            formatDay={formatDay}
            tableLabel={t("charts.table")}
          />
        </Panel>
        <Panel id="checkins" title={t("charts.checkIns")} icon={QrCodeIcon} delay={3}>
          <BarChart
            data={overview.checkIns}
            label={t("charts.checkInsLabel")}
            formatDay={formatDay}
            tableLabel={t("charts.table")}
          />
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel
          id="funnel"
          title={t("funnel.title")}
          icon={ActivityIcon}
          delay={4}
          className="lg:col-span-2"
        >
          <ol className="flex flex-col gap-3">
            {overview.funnel.map((step, i) => {
              const pct = Math.round((step.value / top) * 100);
              const prev = overview.funnel[i - 1]?.value;
              return (
                <li key={step.key} className="flex flex-col gap-1.5">
                  <span className="flex items-baseline justify-between gap-2 text-small">
                    <span className="font-semibold text-ink">{t(`funnel.${step.key}`)}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {format.number(step.value)} · {pct}%
                      {prev
                        ? ` · ${t("funnel.step", { pct: Math.round((step.value / prev) * 100) })}`
                        : null}
                    </span>
                  </span>
                  <span className="h-3 overflow-hidden rounded-full bg-brand-50">
                    <span
                      className="block h-full origin-left animate-rise rounded-full bg-brand-700"
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </span>
                </li>
              );
            })}
          </ol>
        </Panel>

        <Panel
          id="activity"
          title={t("activity.title")}
          icon={ActivityIcon}
          delay={5}
          aside={
            <Link
              href="/admin/audit"
              className="inline-flex min-h-11 items-center text-small font-semibold text-primary hover:underline"
            >
              {t("activity.all")}
            </Link>
          }
        >
          {activity.length ? (
            <ol className="flex flex-col gap-3">
              {activity.map((entry) => (
                <li key={entry.id} className="flex flex-col border-l-2 border-brand-200 pl-3">
                  <span className="text-small font-semibold text-ink">
                    {t.has(`actions.${entry.action}`) ? t(`actions.${entry.action}`) : entry.action}
                  </span>
                  <span className="text-small text-muted-foreground">
                    {entry.actor?.name ?? t("activity.system")} ·{" "}
                    {format.relativeTime(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground">{t("activity.empty")}</p>
          )}
        </Panel>
      </div>

      <section aria-labelledby="health-title" className="flex flex-col gap-4">
        <h2 id="health-title" className="text-h3">
          {t("health.title")}
        </h2>
        <div
          className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-card"
          tabIndex={0}
          role="region"
          aria-labelledby="health-title"
        >
          <table className="w-full min-w-[36rem] text-left text-small" data-testid="chapter-health">
            <thead className="bg-canvas text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">
                  {t("health.chapter")}
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  {t("health.status")}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  {t("health.members")}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  {t("health.sessions")}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  {t("health.checkIns")}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  {t("health.leads")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {overview.chapters.map((chapter) => {
                const row = health.find((h) => h.id === chapter.id)!;
                return (
                  <tr key={chapter.id}>
                    <th scope="row" className="px-4 py-3 font-semibold text-brand-950">
                      {chapter.name}
                    </th>
                    <td className="px-4 py-3">
                      <Badge variant={chapter.status === "live" ? "verified" : "unconfirmed"}>
                        {t(`health.statuses.${chapter.status}`)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.members}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.sessions}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.checkIns}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.leads || (
                        <span className="font-semibold text-danger">{t("health.noLead")}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
