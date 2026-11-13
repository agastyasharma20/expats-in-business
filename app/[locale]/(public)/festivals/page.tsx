import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { CalendarDaysIcon, MapPinIcon, PartyPopperIcon, SparklesIcon } from "lucide-react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listFestivals } from "@/lib/festivals/queries";
import { Link } from "@/lib/i18n/navigation";
import { formatMoney } from "@/lib/money";
import { withAlternates } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("festival");
  return withAlternates("/festivals", { title: t("listTitle"), description: t("listLead") });
}

async function FestivalList() {
  await connection();
  const [t, format, locale, upcoming, past] = await Promise.all([
    getTranslations("festival"),
    getFormatter(),
    getLocale(),
    listFestivals("upcoming"),
    listFestivals("past"),
  ]);
  if (!upcoming.length && !past.length) {
    return (
      <EmptyState
        icon={PartyPopperIcon}
        title={t("emptyTitle")}
        description={t("emptyText")}
        action={
          <Link href="/events" className={buttonVariants()}>
            {t("seeSessions")}
          </Link>
        }
      />
    );
  }
  const card = (f: (typeof upcoming)[number], i: number, isPast = false) => {
    const from = f.ticketTypes[0];
    return (
      <li
        key={f.id}
        className="animate-rise"
        style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}
      >
        <Link
          href={`/festivals/${f.slug}`}
          className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-card transition-transform duration-(--duration-micro) hover:-translate-y-1"
        >
          <span className="flex flex-col gap-3 bg-brand-950 p-6 text-on-dark">
            <span className="flex flex-wrap gap-2">
              <Badge variant="bubble" className="gap-1">
                <SparklesIcon aria-hidden="true" className="size-3.5" />
                {t("badge")}
              </Badge>
              {f.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
              {isPast ? <Badge variant="outline">{t("ended")}</Badge> : null}
            </span>
            <span className="font-heading text-h3 font-bold text-on-dark group-hover:underline">
              {f.title}
            </span>
            {f.tagline ? <span className="text-on-dark-muted">{f.tagline}</span> : null}
          </span>
          <span className="flex flex-1 flex-col gap-2 p-6 text-small text-ink">
            <span className="flex items-center gap-2">
              <CalendarDaysIcon aria-hidden="true" className="size-4 text-brand-700" />
              {format.dateTimeRange(f.startsAt, f.endsAt, {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: f.chapter.timezone,
              })}
            </span>
            <span className="flex items-center gap-2">
              <MapPinIcon aria-hidden="true" className="size-4 text-brand-700" />
              {f.venue?.name ?? f.chapter.name} · {f.chapter.name}
            </span>
            {from ? (
              <span className="mt-auto pt-3 font-heading text-body font-bold text-brand-950">
                {from.priceMinor
                  ? t("fromPrice", {
                      price: formatMoney(
                        { amountMinor: from.priceMinor, currency: from.currency },
                        locale,
                        { hideZeroDecimals: true },
                      ),
                    })
                  : t("freeEntry")}
              </span>
            ) : null}
          </span>
        </Link>
      </li>
    );
  };
  return (
    <>
      {upcoming.length ? (
        <section aria-labelledby="upcoming-title" className="flex flex-col gap-4">
          <h2 id="upcoming-title" className="text-h3">
            {t("upcoming")}
          </h2>
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="festival-list">
            {upcoming.map((f, i) => card(f, i))}
          </ul>
        </section>
      ) : null}
      {past.length ? (
        <section aria-labelledby="past-title" className="flex flex-col gap-4">
          <h2 id="past-title" className="text-h3">
            {t("past")}
          </h2>
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {past.map((f, i) => card(f, i, true))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

export default async function FestivalsPage() {
  const t = await getTranslations("festival");
  return (
    <div className="container-page flex flex-col gap-10 py-12">
      <PageHeader
        icon={PartyPopperIcon}
        eyebrow={t("eyebrow")}
        title={t("listTitle")}
        lead={t("listLead")}
      />
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-3xl" />}>
        <FestivalList />
      </Suspense>
    </div>
  );
}
