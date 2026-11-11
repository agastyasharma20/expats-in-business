import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { providerStats, quoteOutcomes } from "@/lib/directory/stats";

export const metadata: Metadata = { robots: { index: false } };

/** Aggregated analytics from daily counters. There are no individual viewers to show: none are stored. */
export default async function ProviderAnalyticsPage() {
  const user = await requireUser("/provider/analytics");
  const [t, locale] = await Promise.all([getTranslations("providerArea"), getLocale()]);
  const providers = await getDb().provider.findMany({
    where: { ownerId: user.id },
    select: { id: true },
  });
  const ids = providers.map((p) => p.id);
  const [days, outcomes] = await Promise.all([providerStats(ids, 28), quoteOutcomes(ids, 30)]);
  const views = days.reduce((a, d) => a + d.views, 0);
  const requests = days.reduce((a, d) => a + d.quoteRequests, 0);
  const weeks = Array.from({ length: 4 }, (_, i) => days.slice(i * 7, i * 7 + 7));
  const number = new Intl.NumberFormat(locale);
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-h2">{t("analyticsTitle")}</h1>
        <p className="text-muted-foreground">{t("analyticsLead")}</p>
      </header>
      <dl className="grid gap-4 sm:grid-cols-3" data-testid="analytics">
        {[
          { label: t("views"), value: number.format(views) },
          { label: t("quoteRequests"), value: number.format(requests) },
          {
            label: t("acceptRate"),
            value: outcomes.acceptRate === null ? "–" : `${outcomes.acceptRate}%`,
          },
        ].map((tile) => (
          <div
            key={tile.label}
            className="rounded-xl border border-line bg-surface p-5 shadow-card"
          >
            <dt className="text-small text-muted-foreground">{tile.label}</dt>
            <dd className="font-heading text-h2 font-bold text-brand-950">{tile.value}</dd>
          </div>
        ))}
      </dl>
      <table className="w-full overflow-hidden rounded-xl border border-line bg-surface text-left">
        <caption className="sr-only">{t("table")}</caption>
        <thead className="bg-canvas text-small text-muted-foreground">
          <tr>
            <th scope="col" className="p-3 font-semibold">
              {t("table")}
            </th>
            <th scope="col" className="p-3 text-right font-semibold">
              {t("views")}
            </th>
            <th scope="col" className="p-3 text-right font-semibold">
              {t("quoteRequests")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {weeks.map((week) => (
            <tr key={week[0]!.day}>
              <th scope="row" className="p-3 font-normal">
                {t("week", { date: date.format(new Date(week[0]!.day)) })}
              </th>
              <td className="p-3 text-right tabular-nums">
                {number.format(week.reduce((a, d) => a + d.views, 0))}
              </td>
              <td className="p-3 text-right tabular-nums">
                {number.format(week.reduce((a, d) => a + d.quoteRequests, 0))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
