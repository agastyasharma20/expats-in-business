import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { getFact } from "@/config/facts";
import { getDb } from "@/lib/db";
import { routing } from "@/lib/i18n/routing";
import { formatMoney } from "@/lib/money";
import { OG_SIZE, renderCard } from "@/lib/og/card";
import { formatInZone } from "@/lib/time";

export const alt = "Expats in Business festival";
export const size = OG_SIZE;
export const contentType = "image/png";

// Route handlers cannot read next/root-params yet, so the locale comes from params explicitly.
export default async function FestivalImage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: requested, slug } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const [t, festival] = await Promise.all([
    getTranslations({ locale, namespace: "festival" }),
    getDb().event.findUnique({
      where: { slug },
      select: {
        title: true,
        kind: true,
        status: true,
        startsAt: true,
        tagline: true,
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
  // Drafts and unknown slugs get the generic card: nothing private leaks through the image URL.
  if (!festival || festival.kind !== "festival" || festival.status === "draft") {
    return renderCard({ eyebrow: t("eyebrow"), title: t("listTitle"), details: [], footer });
  }
  const tier = festival.ticketTypes[0];
  const price = tier
    ? tier.priceMinor
      ? t("fromPrice", {
          price: formatMoney({ amountMinor: tier.priceMinor, currency: tier.currency }, locale, {
            hideZeroDecimals: true,
          }),
        })
      : t("freeEntry")
    : null;
  return renderCard({
    eyebrow: `${t("badge")} · ${festival.chapter.name}`,
    title: festival.title,
    details: [
      formatInZone(festival.startsAt, festival.chapter.timezone, locale, { dateStyle: "full" }),
      ...(festival.venue ? [festival.venue.name] : []),
      ...(price ? [price] : []),
    ],
    badge: festival.status === "cancelled" ? t("cancelled") : t("getTickets"),
    footer,
  });
}
