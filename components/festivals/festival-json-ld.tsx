import { getEnv } from "@/lib/env";

type Festival = {
  slug: string;
  title: string;
  summary: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  eventLeft: number;
  venue: { name: string; address: string | null } | null;
  chapter: { currency: string };
  programme: { title: string; performer: string | null; startsAt: Date; endsAt: Date }[];
};

/** schema.org Festival with sub-events from the programme. "<" is escaped (no script injection). */
export function FestivalJsonLd({ festival, price }: { festival: Festival; price: number }) {
  const url = new URL(`/festivals/${festival.slug}`, getEnv().APP_URL).toString();
  const data = {
    "@context": "https://schema.org",
    "@type": "Festival",
    name: festival.title,
    description: festival.summary,
    startDate: festival.startsAt.toISOString(),
    endDate: festival.endsAt.toISOString(),
    eventStatus:
      festival.status === "cancelled"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(festival.venue && {
      location: {
        "@type": "Place",
        name: festival.venue.name,
        ...(festival.venue.address && { address: festival.venue.address }),
      },
    }),
    organizer: { "@type": "Organization", name: "Expats in Business" },
    offers: {
      "@type": "Offer",
      url,
      price: (price / 100).toFixed(2),
      priceCurrency: festival.chapter.currency,
      availability:
        festival.eventLeft > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
    },
    subEvent: festival.programme.slice(0, 30).map((item) => ({
      "@type": "Event",
      name: item.title,
      startDate: item.startsAt.toISOString(),
      endDate: item.endsAt.toISOString(),
      ...(item.performer && { performer: { "@type": "PerformingGroup", name: item.performer } }),
    })),
    url,
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
