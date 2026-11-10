import { CalendarDaysIcon, MapPinIcon, UsersIcon, VideoIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { HomeEvent } from "@/lib/home/queries";
import { Link } from "@/lib/i18n/navigation";
import { formatMoney } from "@/lib/money";
import { formatInZone } from "@/lib/time";

/**
 * Equal-height event card (fixes old-portal bug 12): date and time in the chapter's time zone,
 * venue, price and places, always. The whole card is one link via the title (stretched).
 */
export async function EventCard({ event, href }: { event: HomeEvent; href: string }) {
  const t = await getTranslations("home.events");
  const locale = await getLocale();
  const when = formatInZone(event.startsAt, event.timezone, locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const price =
    event.priceMinor === 0
      ? t("free")
      : formatMoney({ amountMinor: event.priceMinor, currency: event.currency }, locale, {
          hideZeroDecimals: true,
        });
  const left = Math.max(event.capacity - event.attending, 0);

  return (
    <Card
      equalHeight
      className="relative transition-transform duration-(--duration-micro) focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring hover:-translate-y-0.5"
    >
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{event.formatName}</Badge>
          {event.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
        </div>
        <CardTitle className="mt-1">
          <Link
            href={href}
            className="outline-none after:absolute after:inset-0 after:content-['']"
          >
            {event.title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2 text-small text-ink">
          <li className="flex items-center gap-2">
            <CalendarDaysIcon aria-hidden="true" className="size-4 text-brand-700" />
            <time dateTime={event.startsAt.toISOString()}>{when}</time>
          </li>
          <li className="flex items-center gap-2">
            {event.online ? (
              <VideoIcon aria-hidden="true" className="size-4 text-brand-700" />
            ) : (
              <MapPinIcon aria-hidden="true" className="size-4 text-brand-700" />
            )}
            {event.online ? t("online") : event.venueName}
          </li>
          <li className="flex items-center gap-2">
            <UsersIcon aria-hidden="true" className="size-4 text-brand-700" />
            {left > 0 ? t("spotsLeft", { count: left }) : t("full")}
          </li>
        </ul>
      </CardContent>
      <CardFooter className="justify-between">
        <span className="font-heading text-lg font-bold text-brand-950">{price}</span>
        <span className="text-small text-muted-foreground">
          {t("going", { count: event.attending })}
        </span>
      </CardFooter>
    </Card>
  );
}
