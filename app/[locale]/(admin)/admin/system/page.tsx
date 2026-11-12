import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import {
  CheckCircle2Icon,
  CpuIcon,
  DatabaseIcon,
  GaugeIcon,
  ShieldIcon,
  XCircleIcon,
} from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { Panel } from "@/components/dashboard/panel";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { measureDbLatency } from "@/lib/admin/system";
import { isAdmin } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getFlags } from "@/lib/features";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminSystem");
  return { title: t("title"), robots: { index: false } };
}

/**
 * System status for admins: database latency, migrations, rate-limit pressure by bucket (keys are
 * aggregated, so no account ids are shown), jobs and configuration. Secrets are never displayed.
 */
export default async function AdminSystemPage() {
  const user = await requirePermission("admin.access");
  if (!isAdmin(user)) forbidden();
  const db = getDb();
  const latency = await measureDbLatency();
  const env = getEnv();
  const [t, format, flags, migrations, buckets, lastRound, lastReminder] = await Promise.all([
    getTranslations("adminSystem"),
    getFormatter(),
    getFlags(),
    db.$queryRaw<{ name: string; at: Date }[]>`
      SELECT migration_name AS name, finished_at AS at FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1`,
    db.$queryRaw<{ bucket: string; keys: number; hits: number }[]>`
      SELECT split_part("key", ':', 1) AS bucket, count(*)::int AS keys, sum("count")::int AS hits
      FROM "RateLimit" WHERE "windowStart" > now() - interval '1 hour'
      GROUP BY 1 ORDER BY 3 DESC LIMIT 12`,
    db.rouletteRound.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    db.userTask.findFirst({
      where: { remindedAt: { not: null } },
      orderBy: { remindedAt: "desc" },
      select: { remindedAt: true },
    }),
  ]);
  const checks = [
    { key: "database", ok: latency < 200, value: t("ms", { ms: latency }) },
    {
      key: "stripe",
      ok: Boolean(env.STRIPE_SECRET_KEY),
      value: env.STRIPE_SECRET_KEY ? t("testMode") : t("notConfigured"),
    },
    { key: "ai", ok: true, value: env.AI_PROVIDER },
    {
      key: "proxy",
      ok: env.TRUSTED_PROXY_HOPS > 0 || env.NODE_ENV !== "production",
      value: String(env.TRUSTED_PROXY_HOPS),
    },
  ];
  const when = (date: Date | null | undefined) => (date ? format.relativeTime(date) : t("never"));

  return (
    <div className="container-page flex flex-col gap-8 py-10">
      <PageHeader icon={GaugeIcon} title={t("title")} lead={t("lead")} />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="system-checks">
        {checks.map((check) => (
          <li
            key={check.key}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card"
          >
            {check.ok ? (
              <CheckCircle2Icon aria-hidden="true" className="size-6 shrink-0 text-success" />
            ) : (
              <XCircleIcon aria-hidden="true" className="size-6 shrink-0 text-danger" />
            )}
            <span className="flex flex-col">
              <span className="font-semibold text-brand-950">{t(`checks.${check.key}`)}</span>
              <span className="text-small text-muted-foreground">
                {check.ok ? t("ok") : t("attention")} · {check.value}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel id="limits" title={t("limits.title")} icon={ShieldIcon}>
          <p className="text-small text-muted-foreground">{t("limits.lead")}</p>
          {buckets.length ? (
            <table className="w-full text-left text-small">
              <thead className="text-muted-foreground">
                <tr>
                  <th scope="col" className="py-2 font-semibold">
                    {t("limits.bucket")}
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    {t("limits.keys")}
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    {t("limits.hits")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {buckets.map((b) => (
                  <tr key={b.bucket}>
                    <th scope="row" className="py-2 font-normal">
                      <code className="rounded bg-brand-50 px-1.5 text-brand-950">{b.bucket}</code>
                    </th>
                    <td className="py-2 text-right tabular-nums">{b.keys}</td>
                    <td className="py-2 text-right tabular-nums">{b.hits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted-foreground">{t("limits.empty")}</p>
          )}
        </Panel>

        <Panel id="runtime" title={t("runtime.title")} icon={CpuIcon}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-small">
            <dt className="text-muted-foreground">{t("runtime.mode")}</dt>
            <dd className="font-semibold text-ink">{env.NODE_ENV}</dd>
            <dt className="text-muted-foreground">{t("runtime.node")}</dt>
            <dd className="font-semibold text-ink">{process.version}</dd>
            <dt className="text-muted-foreground">{t("runtime.migration")}</dt>
            <dd className="font-semibold break-all text-ink">{migrations[0]?.name ?? "—"}</dd>
            <dt className="text-muted-foreground">{t("runtime.roulette")}</dt>
            <dd className="font-semibold text-ink">{when(lastRound?.createdAt)}</dd>
            <dt className="text-muted-foreground">{t("runtime.reminders")}</dt>
            <dd className="font-semibold text-ink">{when(lastReminder?.remindedAt)}</dd>
          </dl>
          <div className="flex flex-wrap gap-2">
            {Object.entries(flags).map(([name, on]) => (
              <Badge key={name} variant={on ? "verified" : "outline"}>
                <DatabaseIcon aria-hidden="true" className="size-3.5" />
                {name}: {on ? t("on") : t("off")}
              </Badge>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
