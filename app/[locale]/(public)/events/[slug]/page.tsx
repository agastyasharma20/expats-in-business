import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  CalendarPlusIcon,
  MapPinIcon,
  TicketIcon,
  UsersIcon,
  VideoIcon,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { ExternalLink } from "@/components/common/external-link";
import { Fact } from "@/components/common/fact";
import { EventJsonLd } from "@/components/events/event-json-ld";
import { RsvpPanel } from "@/components/events/rsvp-panel";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { placesLeft } from "@/lib/events/capacity";
import { getEventBySlug, getEventMeta } from "@/lib/events/queries";
import { Link } from "@/lib/i18n/navigation";
import { formatMoney } from "@/lib/money";
import { formatInZone } from "@/lib/time";

type Props = PageProps<"/[locale]/events/[slug]">;

// Live places and the visitor's own ticket: rendered per request.
export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getEventMeta((await params).slug);
  return event ? { title: event.title, description: event.summary } : {};
}

async function EventView({ params, searchParams }: Props) {
  const event = await getEventBySlug((await params).slug);
  if (!event) notFound();
  const [t, locale, query] = await Promise.all([
    getTranslations("events"),
    getLocale(),
    searchParams,
  ]);
  const zone = event.chapter.timezone;
  const day = formatInZone(event.startsAt, zone, locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = `${formatInZone(event.startsAt, zone, locale, { hour: "2-digit", minute: "2-digit" })}–${formatInZone(event.endsAt, zone, locale, { hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}`;
  const cheapest = event.ticketTypes[0];
  const price =
    !cheapest || cheapest.priceMinor === 0
      ? t("free")
      : formatMoney({ amountMinor: cheapest.priceMinor, currency: cheapest.currency }, locale, {
          hideZeroDecimals: true,
        });
  const left = placesLeft(event.capacity, event.taken);
  const ended = event.endsAt < new Date();

  return (
    <article className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <EventJsonLd
        event={event}
        price={cheapest?.priceMinor ?? 0}
        currency={cheapest?.currency ?? event.chapter.currency}
      />
      <div className="flex flex-col gap-8">
        <header className="flex flex-col items-start gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{event.format.name}</Badge>
            {event.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
          </div>
          <h1 className="text-h1">{event.title}</h1>
          <p className="text-lg text-muted-foreground">{event.summary}</p>
        </header>
        {query.payment === "cancelled" ? (
          <p
            role="status"
            className="rounded-lg border border-warning/40 bg-warning-50 p-4 text-warning"
          >
            {t("paymentCancelled")}
          </p>
        ) : null}
        <dl className="grid gap-5 sm:grid-cols-2">
          <Fact icon={CalendarDaysIcon} label={t("when")}>
            <time dateTime={event.startsAt.toISOString()}>{day}</time>
            <br />
            {time}
          </Fact>
          <Fact icon={event.venue ? MapPinIcon : VideoIcon} label={t("where")}>
            {event.venue ? (
              <>
                {event.venue.name}
                {event.venue.address ? (
                  <>
                    <br />
                    {event.venue.address}
                  </>
                ) : null}
                {event.venue.mapUrl ? (
                  <>
                    <br />
                    <ExternalLink href={event.venue.mapUrl}>{t("map")}</ExternalLink>
                  </>
                ) : null}
              </>
            ) : (
              <>
                {t("online")}
                <br />
                <span className="text-small text-muted-foreground">{t("onlineJoin")}</span>
              </>
            )}
          </Fact>
          <Fact icon={TicketIcon} label={t("price")}>
            {price}
          </Fact>
          <Fact icon={UsersIcon} label={t("places")}>
            {left > 0 ? t("placesLeft", { left, capacity: event.capacity }) : t("full")}
            {event.waitlisted ? (
              <>
                <br />
                <span className="text-small text-muted-foreground">
                  {t("waitlistCount", { count: event.waitlisted })}
                </span>
              </>
            ) : null}
          </Fact>
        </dl>
        <section aria-labelledby="about-title" className="flex flex-col gap-3">
          <h2 id="about-title" className="text-h3">
            {t("about")}
          </h2>
          {event.description.split(/\n{2,}/).map((paragraph) => (
            <p key={paragraph.slice(0, 32)} className="max-w-prose whitespace-pre-line">
              {paragraph}
            </p>
          ))}
        </section>
      </div>
      <aside className="flex flex-col gap-4 self-start rounded-xl border border-line bg-surface p-6 shadow-card lg:sticky lg:top-24">
        {ended ? (
          <p className="text-muted-foreground">{t("ended")}</p>
        ) : (
          <RsvpPanel
            event={{
              id: event.id,
              slug: event.slug,
              ticketTypes: event.ticketTypes,
              full: left === 0,
            }}
          />
        )}
        <a
          href={`/api/events/${event.slug}/ics`}
          download
          className={buttonVariants({ variant: "outline" })}
        >
          <CalendarPlusIcon aria-hidden="true" />
          {t("addToCalendar")}
        </a>
      </aside>
    </article>
  );
}

export default async function EventPage(props: Props) {
  const t = await getTranslations("events");
  return (
    <div className="container-page flex flex-col gap-6 py-10">
      <Link
        href="/events"
        className={buttonVariants({ variant: "link", size: "inline", className: "self-start" })}
      >
        <ArrowLeftIcon aria-hidden="true" />
        {t("back")}
      </Link>
      <Suspense fallback={<Skeleton className="h-[32rem] w-full" />}>
        <EventView {...props} />
      </Suspense>
    </div>
  );
}
