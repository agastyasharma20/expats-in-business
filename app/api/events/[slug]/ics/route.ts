import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { buildIcs } from "@/lib/events/ics";

/** Add-to-calendar file for a published event. */
export async function GET(_request: Request, { params }: RouteContext<"/api/events/[slug]/ics">) {
  const { slug } = await params;
  const event = await getDb().event.findUnique({
    where: { slug },
    include: { venue: { select: { name: true, address: true } } },
  });
  if (!event || event.status !== "published") return new Response("Not found", { status: 404 });
  const url = new URL(`/events/${slug}`, getEnv().APP_URL).toString();
  const location = event.venue
    ? [event.venue.name, event.venue.address].filter(Boolean).join(", ")
    : event.onlineUrl;
  const body = buildIcs({
    uid: `${event.id}@expatsinbusiness`,
    title: event.title,
    description: event.summary,
    location,
    url,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    updatedAt: event.updatedAt,
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.ics"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
