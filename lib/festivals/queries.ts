import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import type { Prisma } from "@/generated/prisma/client";
import { managedChapterWhere } from "@/lib/admin/scope";
import type { AuthUser } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import { placesLeft } from "@/lib/events/capacity";
import { takenWhere } from "@/lib/events/queries";

import { tierState } from "./rules";

/** Places taken per tier (sum of party sizes) for one event. */
async function soldByTier(eventId: string) {
  const rows = await getDb().ticket.groupBy({
    by: ["ticketTypeId"],
    where: { eventId, ...takenWhere() },
    _sum: { quantity: true },
  });
  return new Map(rows.map((r) => [r.ticketTypeId, r._sum.quantity ?? 0]));
}

const listSelect = {
  id: true,
  slug: true,
  title: true,
  tagline: true,
  summary: true,
  startsAt: true,
  endsAt: true,
  capacity: true,
  isDemo: true,
  chapter: { select: { name: true, timezone: true, currency: true } },
  venue: { select: { name: true } },
  ticketTypes: { select: { priceMinor: true, currency: true }, orderBy: { priceMinor: "asc" } },
} satisfies Prisma.EventSelect;

/** Published festivals, upcoming first (or past ones, newest first). */
export function listFestivals(when: "upcoming" | "past" = "upcoming") {
  const now = new Date();
  return getDb().event.findMany({
    where: {
      kind: "festival",
      status: "published",
      ...(when === "upcoming" ? { endsAt: { gte: now } } : { endsAt: { lt: now } }),
    },
    orderBy: { startsAt: when === "upcoming" ? "asc" : "desc" },
    take: 24,
    select: listSelect,
  });
}

async function loadFestivalPublic(slug: string) {
  "use cache";
  // Shared by every visitor: refreshed every 30 s and on any ticket or content change ("events").
  cacheLife({ stale: 30, revalidate: 30, expire: 300 });
  cacheTag("events", `festival:${slug}`);
  const db = getDb();
  const event = await db.event.findUnique({
    where: { slug },
    include: {
      chapter: { select: { name: true, slug: true, timezone: true, currency: true } },
      venue: true,
      ticketTypes: { orderBy: [{ sortOrder: "asc" }, { priceMinor: "asc" }] },
      programme: { orderBy: { startsAt: "asc" } },
      faqs: { orderBy: { sortOrder: "asc" } },
      sponsorships: {
        orderBy: { createdAt: "asc" },
        select: { tier: true, sponsor: { select: { name: true, website: true, isDemo: true } } },
      },
      shifts: {
        orderBy: { startsAt: "asc" },
        include: { _count: { select: { signups: true } } },
      },
    },
  });
  if (!event || event.kind !== "festival" || event.status === "draft") return null;
  const now = new Date();
  const [sold, taken] = await Promise.all([
    soldByTier(event.id),
    db.ticket
      .aggregate({ _sum: { quantity: true }, where: { eventId: event.id, ...takenWhere(now) } })
      .then((r) => r._sum.quantity ?? 0),
  ]);
  const eventLeft = placesLeft(event.capacity, taken);
  return {
    ...event,
    taken,
    eventLeft,
    tiers: event.ticketTypes.map((tier) => ({
      ...tier,
      ...tierState({
        capacity: tier.capacity,
        sold: sold.get(tier.id) ?? 0,
        eventLeft,
        salesEndAt: tier.salesEndAt,
        now,
      }),
    })),
    shifts: event.shifts.map((shift) => ({ ...shift, taken: shift._count.signups })),
  };
}

export type PublicFestival = NonNullable<Awaited<ReturnType<typeof loadFestivalPublic>>>;

/**
 * Public festival data (no viewer data inside, so it is safe to cache and share). Availability
 * shown here is advisory: the RSVP action re-checks capacity under a row lock.
 */
export async function getFestivalPublic(slug: string) {
  return loadFestivalPublic(slug);
}

/** What the signed-in viewer has at this festival: ticket, stall application, volunteer shifts. */
export async function getFestivalViewer(eventId: string, userId: string) {
  const db = getDb();
  const [ticket, stall, signups] = await Promise.all([
    db.ticket.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { id: true, status: true, quantity: true },
    }),
    db.stallApplication.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { id: true, status: true, businessName: true },
    }),
    db.volunteerSignup.findMany({
      where: { userId, shift: { eventId } },
      select: { shiftId: true },
    }),
  ]);
  return { ticket, stall, shiftIds: new Set(signups.map((s) => s.shiftId)) };
}

/** Festivals in the chapters this user manages (admins: all). */
export async function listManagedFestivals(user: AuthUser) {
  const db = getDb();
  const events = await db.event.findMany({
    where: { kind: "festival", chapter: managedChapterWhere(user) },
    orderBy: { startsAt: "desc" },
    select: {
      ...listSelect,
      status: true,
      _count: { select: { stalls: { where: { status: "submitted" } } } },
    },
  });
  const sums = await db.ticket.groupBy({
    by: ["eventId"],
    where: { eventId: { in: events.map((e) => e.id) }, ...takenWhere() },
    _sum: { quantity: true },
  });
  const byEvent = new Map(sums.map((s) => [s.eventId, s._sum.quantity ?? 0]));
  return events.map((e) => ({ ...e, taken: byEvent.get(e.id) ?? 0 }));
}

/** Everything the festival console needs, for one festival the user may manage. */
export async function getFestivalAdmin(id: string, user: AuthUser) {
  const db = getDb();
  const event = await db.event.findFirst({
    where: { id, kind: "festival", chapter: managedChapterWhere(user) },
    include: {
      chapter: { select: { id: true, name: true, timezone: true, currency: true } },
      venue: true,
      ticketTypes: { orderBy: [{ sortOrder: "asc" }, { priceMinor: "asc" }] },
      programme: { orderBy: { startsAt: "asc" } },
      faqs: { orderBy: { sortOrder: "asc" } },
      sponsorships: { include: { sponsor: true }, orderBy: { createdAt: "asc" } },
      shifts: {
        orderBy: { startsAt: "asc" },
        include: { signups: { select: { user: { select: { name: true } } } } },
      },
      stalls: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });
  if (!event) return null;
  const [sold, tickets, checkedIn, waitlisted] = await Promise.all([
    soldByTier(event.id),
    db.ticket.findMany({
      where: { eventId: event.id, status: "confirmed" },
      select: {
        status: true,
        quantity: true,
        paidAt: true,
        ticketType: { select: { priceMinor: true } },
      },
    }),
    db.ticket
      .aggregate({
        _sum: { quantity: true },
        where: { eventId: event.id, checkIn: { isNot: null } },
      })
      .then((r) => r._sum.quantity ?? 0),
    db.ticket
      .aggregate({ _sum: { quantity: true }, where: { eventId: event.id, status: "waitlisted" } })
      .then((r) => r._sum.quantity ?? 0),
  ]);
  return { event, sold, tickets, checkedIn, waitlisted };
}
