import { ArrowRightIcon, SparklesIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { nextFestival } from "@/lib/growth/opportunities";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

import { DaysUntil } from "./days-until";

/**
 * Header pill shown only while a festival is published and upcoming: the rotating ember, teal
 * and gold ring marks it as special. Hidden below lg (the homepage banner covers phones).
 */
export async function FestivalSpotlightPill() {
  const festival = await nextFestival().catch(() => null);
  if (!festival) return null;
  return (
    <Link
      href={`/festivals/${festival.slug}`}
      className="festival-ring hidden shrink-0 transition-transform duration-(--duration-micro) hover:-translate-y-0.5 xl:inline-flex"
      data-testid="festival-pill"
    >
      <span className="flex min-h-10 items-center gap-2 rounded-full bg-surface px-3.5 text-small font-bold text-brand-950">
        <SparklesIcon aria-hidden="true" className="size-4 text-ember-600" />
        <span className="max-w-40 truncate">{festival.title}</span>
        <DaysUntil
          iso={festival.startsAt.toISOString()}
          className="min-w-12 rounded-full bg-brand-950 px-2 py-0.5 text-center text-[0.75rem] text-on-dark"
        />
      </span>
    </Link>
  );
}

/** Homepage banner for the next festival, with the same ring in a larger format. */
export async function FestivalSpotlightBanner() {
  const festival = await nextFestival().catch(() => null);
  if (!festival) return null;
  const [t, format] = await Promise.all([getTranslations("spotlight"), getFormatter()]);
  return (
    <section aria-labelledby="spotlight-title" className="container-page py-6">
      <div className="festival-ring festival-ring-lg animate-rise" data-testid="festival-banner">
        <div className="relative flex flex-col gap-5 overflow-hidden rounded-[1.35rem] bg-brand-950 p-6 text-on-dark sm:p-8 md:flex-row md:items-center md:justify-between">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-ember-500/20 blur-3xl"
          />
          <div className="relative flex flex-col gap-2">
            <p className="flex flex-wrap items-center gap-2">
              <Badge variant="bubble" className="gap-1">
                <SparklesIcon aria-hidden="true" className="size-3.5" />
                {t("eyebrow")}
              </Badge>
              {festival.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
            </p>
            <h2 id="spotlight-title" className="text-h2 text-on-dark">
              {festival.title}
            </h2>
            {festival.tagline ? (
              <p className="max-w-2xl text-on-dark-muted">{festival.tagline}</p>
            ) : null}
            <p className="font-semibold">
              {format.dateTime(festival.startsAt, {
                weekday: "long",
                day: "numeric",
                month: "long",
                timeZone: festival.chapter.timezone,
              })}{" "}
              · {festival.chapter.name} · <DaysUntil iso={festival.startsAt.toISOString()} />
            </p>
          </div>
          <Link
            href={`/festivals/${festival.slug}`}
            className={cn(
              buttonVariants({ size: "lg", variant: "highlight" }),
              "relative shrink-0",
            )}
          >
            {t("cta")}
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
