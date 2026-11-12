import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { z } from "zod";

import { PrintButton } from "@/components/common/print-button";
import { Skeleton } from "@/components/ui/skeleton";
import { publicCount } from "@/lib/community/rules";
import { getDb } from "@/lib/db";

type Props = PageProps<"/[locale]/sponsor-report/[token]">;

export const instant = false;
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{24,64}$/);

/**
 * Sponsor ROI report behind an unguessable signed link (192-bit token, one per sponsorship).
 * Only aggregates are shown, and any count under 5 is hidden so no attendee can be singled out.
 */
async function Report({ params }: { params: Props["params"] }) {
  const { token } = await params;
  if (!tokenSchema.safeParse(token).success) notFound();
  const db = getDb();
  const sponsorship = await db.sponsorship.findUnique({
    where: { reportToken: token },
    select: {
      tier: true,
      sponsor: { select: { name: true } },
      event: {
        select: {
          id: true,
          title: true,
          kind: true,
          startsAt: true,
          endsAt: true,
          capacity: true,
          venue: { select: { name: true } },
          chapter: { select: { name: true, timezone: true } },
        },
      },
    },
  });
  if (!sponsorship) notFound();
  const { event } = sponsorship;
  const [t, format, attending, checkedIn, origins, programme] = await Promise.all([
    getTranslations("sponsorReport"),
    getFormatter(),
    db.ticket.aggregate({
      _sum: { quantity: true },
      where: { eventId: event.id, status: "confirmed" },
    }),
    db.ticket.aggregate({
      _sum: { quantity: true },
      where: { eventId: event.id, checkIn: { isNot: null } },
    }),
    db.profile.groupBy({
      by: ["originCountryCode"],
      where: {
        originCountryCode: { not: null },
        user: { tickets: { some: { eventId: event.id, status: "confirmed" } } },
      },
      _count: { _all: true },
    }),
    db.eventProgrammeItem.count({ where: { eventId: event.id } }),
  ]);
  const shownOrigins = origins.filter((o) => (o._count._all ?? 0) >= 5).length;
  const numbers = [
    { key: "registered", value: publicCount(attending._sum.quantity ?? 0) },
    { key: "attended", value: publicCount(checkedIn._sum.quantity ?? 0) },
    { key: "countries", value: shownOrigins >= 1 ? shownOrigins : null },
    { key: "programme", value: programme || null },
  ];

  return (
    <article className="flex flex-col gap-8" data-testid="sponsor-report">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="eyebrow text-brand-700">
            {t("eyebrow", { sponsor: sponsorship.sponsor.name })}
          </p>
          <h1 className="text-h1">{event.title}</h1>
          <p className="text-muted-foreground">
            {format.dateTimeRange(event.startsAt, event.endsAt, {
              dateStyle: "long",
              timeZone: event.chapter.timezone,
            })}
            {event.venue ? ` · ${event.venue.name}` : ""} · {event.chapter.name}
          </p>
          <p className="font-semibold text-ink">{t("tier", { tier: sponsorship.tier })}</p>
        </div>
        <PrintButton label={t("print")} />
      </header>
      <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {numbers.map((n) => (
          <div
            key={n.key}
            className="flex break-inside-avoid flex-col gap-1 rounded-2xl border border-line bg-surface p-5"
          >
            <dt className="text-small text-muted-foreground">{t(`numbers.${n.key}`)}</dt>
            <dd className="font-heading text-h2 font-bold text-brand-950 tabular-nums">
              {n.value ?? t("hidden")}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-small text-muted-foreground">{t("privacy")}</p>
      <footer className="border-t border-line pt-4 text-small text-muted-foreground">
        {t("generated", { date: format.dateTime(new Date(), { dateStyle: "long" }) })}
      </footer>
    </article>
  );
}

export default function SponsorReportPage({ params }: Props) {
  return (
    <div className="container-page max-w-4xl py-12">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Report params={params} />
      </Suspense>
    </div>
  );
}
