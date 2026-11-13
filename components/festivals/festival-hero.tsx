import { CalendarDaysIcon, MapPinIcon, SparklesIcon, TicketIcon, UsersIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PublicFestival } from "@/lib/festivals/queries";

import { Countdown } from "./countdown";

const BAND = "relative overflow-hidden bg-brand-950 text-on-dark";
const INNER =
  "container-page grid min-h-[22rem] gap-8 py-14 lg:min-h-[26rem] lg:grid-cols-[1fr_auto] lg:items-end lg:py-20";

/**
 * Festival hero. The title is the largest paint (LCP), so it renders without an entrance
 * animation; the band has a minimum height shared with its skeleton, so nothing shifts when the
 * content streams in.
 */
export async function FestivalHero({
  festival,
  range,
  upcoming,
  ctaLabel,
}: {
  festival: PublicFestival;
  range: string;
  upcoming: boolean;
  ctaLabel: string;
}) {
  const t = await getTranslations("festival");
  return (
    <header className={BAND}>
      <div className={INNER}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="bubble" className="gap-1">
              <SparklesIcon aria-hidden="true" className="size-3.5" />
              {t("badge")}
            </Badge>
            {festival.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
            {festival.status === "cancelled" ? (
              <Badge variant="destructive">{t("cancelled")}</Badge>
            ) : null}
          </div>
          <h1 className="text-display-sm text-on-dark lg:text-display">{festival.title}</h1>
          {festival.tagline ? (
            <p className="max-w-2xl text-h3 font-normal text-on-dark-muted">{festival.tagline}</p>
          ) : null}
          <dl className="flex flex-wrap gap-x-8 gap-y-3 pt-2">
            <div className="flex items-center gap-2">
              <dt className="sr-only">{t("when")}</dt>
              <CalendarDaysIcon aria-hidden="true" className="size-5 text-on-dark-muted" />
              <dd className="font-semibold">{range}</dd>
            </div>
            {festival.venue ? (
              <div className="flex items-center gap-2">
                <dt className="sr-only">{t("where")}</dt>
                <MapPinIcon aria-hidden="true" className="size-5 text-on-dark-muted" />
                <dd className="font-semibold">{festival.venue.name}</dd>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <dt className="sr-only">{t("capacity")}</dt>
              <UsersIcon aria-hidden="true" className="size-5 text-on-dark-muted" />
              <dd className="font-semibold">
                {t("placesLeft", { left: festival.eventLeft, capacity: festival.capacity })}
              </dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-col items-start gap-4 lg:items-end">
          {upcoming ? <Countdown startsAt={festival.startsAt.toISOString()} /> : null}
          <a href="#tickets" className={buttonVariants({ size: "lg", variant: "highlight" })}>
            <TicketIcon aria-hidden="true" />
            {ctaLabel}
          </a>
        </div>
      </div>
    </header>
  );
}

/** Same band and minimum height as the hero, so the streamed hero replaces it without a shift. */
export function FestivalHeroSkeleton() {
  return (
    <div className={BAND} aria-hidden="true">
      <div className={INNER}>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-7 w-40 opacity-20" />
          <Skeleton className="h-12 w-3/4 opacity-20" />
          <Skeleton className="h-8 w-2/3 opacity-20" />
          <Skeleton className="h-6 w-1/2 opacity-20" />
        </div>
      </div>
    </div>
  );
}
