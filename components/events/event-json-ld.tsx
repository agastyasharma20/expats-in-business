import { getEnv } from "@/lib/env";

type JsonLdEvent = {
  slug: string;
  title: string;
  summary: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  venue: { name: string; address: string | null } | null;
  onlineUrl: string | null;
};

/** schema.org Event, so search engines can show date, place and price. Escapes "<" for safety. */
export function EventJsonLd({
  event,
  price,
  currency,
}: {
  event: JsonLdEvent;
  price: number;
  currency: string;
}) {
  const url = new URL(`/events/${event.slug}`, getEnv().APP_URL).toString();
  const data = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.summary,
    startDate: event.startsAt.toISOString(),
    endDate: event.endsAt.toISOString(),
    eventStatus:
      event.status === "cancelled"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
    eventAttendanceMode: event.venue
      ? "https://schema.org/OfflineEventAttendanceMode"
      : "https://schema.org/OnlineEventAttendanceMode",
    location: event.venue
      ? {
          "@type": "Place",
          name: event.venue.name,
          ...(event.venue.address && { address: event.venue.address }),
        }
      : { "@type": "VirtualLocation", url },
    organizer: { "@type": "Organization", name: "Expats in Business" },
    offers: {
      "@type": "Offer",
      url,
      price: (price / 100).toFixed(2),
      priceCurrency: currency,
      availability: "https://schema.org/InStock",
    },
    url,
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
