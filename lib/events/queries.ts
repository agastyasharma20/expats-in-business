import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import type { HomeEvent } from "@/lib/home/queries";

import { reservationCutoff } from "./capacity";

/** Tickets that hold a place: confirmed, or reserved and still inside the payment window. */
export function takenWhere(now = new Date()): Prisma.TicketWhereInput {
  return {
    OR: [
      { status: "confirmed" },
      { status: "reserved", updatedAt: { gte: reservationCutoff(now) } },
    ],
  };
}

export type EventFilters = { when: "upcoming" | "past"; format?: string; chapter?: string };

const cardInclude = {
  format: { select: { name: true } },
  venue: { select: { name: true } },
  chapter: { select: { timezone: true, currency: true } },
  ticketTypes: {
    select: { priceMinor: true, currency: true },
    orderBy: { priceMinor: "asc" },
    take: 1,
  },
  _count: { select: { tickets: { where: { status: "confirmed" } } } },
} satisfies Prisma.EventInclude;

type CardRow = Prisma.EventGetPayload<{ include: typeof cardInclude }>;

function toCard(event: CardRow): HomeEvent {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    formatName: event.format.name,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timezone: event.chapter.timezone,
    venueName: event.venue?.name ?? null,
    online: Boolean(event.onlineUrl),
    priceMinor: event.ticketTypes[0]?.priceMinor ?? 0,
    currency: event.ticketTypes[0]?.currency ?? event.chapter.currency,
    capacity: event.capacity,
    attending: event._count.tickets,
    isDemo: event.isDemo,
  };
}

export async function listEvents(filters: EventFilters, take = 24): Promise<HomeEvent[]> {
  const now = new Date();
  const rows = await getDb().event.findMany({
    where: {
      status: "published",
      startsAt: filters.when === "upcoming" ? { gte: now } : { lt: now },
      chapter: {
        status: { in: ["live", "launching"] },
        ...(filters.chapter && { slug: filters.chapter }),
      },
      ...(filters.format && { format: { slug: filters.format } }),
    },
    orderBy: { startsAt: filters.when === "upcoming" ? "asc" : "desc" },
    take,
    include: cardInclude,
  });
  return rows.map(toCard);
}

/** Session formats change rarely: cached, so /events/formats prerenders. */
export async function listFormats() {
  "use cache";
  cacheLife("hours");
  cacheTag("formats");
  return getDb().eventFormat.findMany({
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true, description: true, defaultDurationMin: true },
  });
}

export async function getEventBySlug(slug: string) {
  const db = getDb();
  const event = await db.event.findUnique({
    where: { slug },
    include: {
      format: true,
      venue: true,
      chapter: {
        select: { slug: true, name: true, timezone: true, currency: true, locales: true },
      },
      ticketTypes: { orderBy: { priceMinor: "asc" } },
    },
  });
  if (!event || event.status === "draft") return null;
  const [taken, waitlisted] = await Promise.all([
    db.ticket.count({ where: { eventId: event.id, ...takenWhere() } }),
    db.ticket.count({ where: { eventId: event.id, status: "waitlisted" } }),
  ]);
  return { ...event, taken, waitlisted };
}

export function getMyTicket(eventId: string, userId: string) {
  return getDb().ticket.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { id: true, status: true, updatedAt: true },
  });
}

/** Title and summary for <head> only: cached and time-independent (safe while prerendering). */
export async function getEventMeta(slug: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("events");
  return getDb().event.findFirst({
    where: { slug, status: { not: "draft" } },
    select: { title: true, summary: true },
  });
}
