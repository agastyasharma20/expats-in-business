import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { getFact } from "@/config/facts";
import { getDb } from "@/lib/db";
import { routing } from "@/lib/i18n/routing";
import { formatMoney } from "@/lib/money";
import { OG_SIZE, renderCard } from "@/lib/og/card";
import { formatInZone } from "@/lib/time";

export const alt = "Expats in Business session";
export const size = OG_SIZE;
export const contentType = "image/png";

// Route handlers cannot read next/root-params yet, so the locale comes from params explicitly.
export default async function EventImage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: requested, slug } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const [t, event] = await Promise.all([
    getTranslations({ locale, namespace: "events" }),
    getDb().event.findUnique({
      where: { slug },
      select: {
        title: true,
        status: true,
        startsAt: true,
        onlineUrl: true,
        format: { select: { name: true } },
        venue: { select: { name: true } },
        chapter: { select: { name: true, timezone: true } },
        ticketTypes: {
          select: { priceMinor: true, currency: true },
          orderBy: { priceMinor: "asc" },
          take: 1,
        },
      },
    }),
  ]);
  const footer = getFact("org.name").value;
  if (!event || event.status === "draft") {
    return renderCard({ eyebrow: footer, title: t("title"), details: [], footer });
  }
  const tier = event.ticketTypes[0];
  return renderCard({
    eyebrow: `${event.format.name} · ${event.chapter.name}`,
    title: event.title,
    details: [
      formatInZone(event.startsAt, event.chapter.timezone, locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }),
      event.venue?.name ?? t("online"),
      tier && tier.priceMinor
        ? formatMoney({ amountMinor: tier.priceMinor, currency: tier.currency }, locale, {
            hideZeroDecimals: true,
          })
        : t("free"),
    ],
    badge: event.status === "cancelled" ? undefined : t("rsvp"),
    footer,
  });
}
