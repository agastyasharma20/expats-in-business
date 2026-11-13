import { cacheLife, cacheTag } from "next/cache";

import { getDb } from "@/lib/db";

/**
 * Homepage data. Each `load*` function is cached for minutes (the page prerenders as a static
 * shell) and THROWS on failure, so a failure is never cached. The exported `get*` wrappers catch
 * and return an empty result, so each section shows its designed empty state, and log the error.
 */

/** Groups smaller than this are hidden from public aggregates (GDPR rule in CLAUDE.md). */
export const MIN_PUBLIC_GROUP_SIZE = 5;

async function safely<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch (error) {
    console.error("[home] query failed, rendering the empty state instead:", error);
    return fallback;
  }
}

// ─── Upcoming events ─────────────────────────────────────────────────────────────────────────

export type HomeEvent = {
  id: string;
  slug: string;
  title: string;
  formatName: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  venueName: string | null;
  online: boolean;
  priceMinor: number;
  currency: string;
  capacity: number;
  attending: number;
  isDemo: boolean;
};

async function loadUpcomingEvents(limit: number): Promise<HomeEvent[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("events");
  const events = await getDb().event.findMany({
    where: {
      status: "published",
      kind: "session",
      startsAt: { gte: new Date() },
      chapter: { status: "live" },
    },
    orderBy: { startsAt: "asc" },
    take: limit,
    include: {
      format: { select: { name: true } },
      venue: { select: { name: true } },
      chapter: { select: { timezone: true, currency: true } },
      ticketTypes: {
        select: { priceMinor: true, currency: true },
        orderBy: { priceMinor: "asc" },
        take: 1,
      },
      _count: { select: { tickets: { where: { status: "confirmed" } } } },
    },
  });
  return events.map((event) => ({
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
  }));
}

export function getUpcomingEvents(limit = 3): Promise<HomeEvent[]> {
  return safely(() => loadUpcomingEvents(limit), []);
}

// ─── Bubbles ────────────────────────────────────────────────────────────────────────────────

export type BubbleTeaser = {
  slug: string;
  name: string;
  originCountryCode: string;
  members: number;
  isDemo: boolean;
};

async function loadBubbleTeasers(limit: number): Promise<BubbleTeaser[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("bubbles");
  const bubbles = await getDb().bubble.findMany({
    select: {
      slug: true,
      name: true,
      originCountryCode: true,
      isDemo: true,
      _count: { select: { members: true } },
    },
  });
  return bubbles
    .map((b) => ({
      slug: b.slug,
      name: b.name,
      originCountryCode: b.originCountryCode,
      members: b._count.members,
      isDemo: b.isDemo,
    }))
    .filter((b) => b.members >= MIN_PUBLIC_GROUP_SIZE)
    .sort((a, b) => b.members - a.members || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** Bubbles with at least MIN_PUBLIC_GROUP_SIZE members, largest first. */
export function getBubbleTeasers(limit = 8): Promise<BubbleTeaser[]> {
  return safely(() => loadBubbleTeasers(limit), []);
}

// ─── Chapters ───────────────────────────────────────────────────────────────────────────────

export type ChapterStrip = {
  chapters: { slug: string; name: string; status: "live" | "launching" }[];
  topRequests: { city: string; votes: number; isDemo: boolean }[];
};

async function loadChapterStrip(): Promise<ChapterStrip> {
  "use cache";
  cacheLife("minutes");
  cacheTag("chapters");
  const db = getDb();
  const [chapters, requests] = await Promise.all([
    db.chapter.findMany({
      where: { status: { in: ["live", "launching"] } },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: { slug: true, name: true, status: true },
    }),
    db.chapterRequest.findMany({
      select: { city: true, isDemo: true, _count: { select: { votes: true } } },
    }),
  ]);
  return {
    chapters: chapters.map((c) => ({
      slug: c.slug,
      name: c.name,
      status: c.status === "live" ? "live" : "launching",
    })),
    topRequests: requests
      .map((r) => ({ city: r.city, votes: r._count.votes, isDemo: r.isDemo }))
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 4),
  };
}

export function getChapterStrip(): Promise<ChapterStrip> {
  return safely(loadChapterStrip, { chapters: [], topRequests: [] });
}

// ─── Community counts ───────────────────────────────────────────────────────────────────────

export type CommunityCounts = {
  members: number;
  bubbles: number;
  liveChapters: number;
  demo: boolean;
};

async function loadCommunityCounts(): Promise<CommunityCounts> {
  "use cache";
  cacheLife("minutes");
  const db = getDb();
  const [members, demoMembers, bubbles, liveChapters] = await Promise.all([
    db.user.count({ where: { deletionRequestedAt: null } }),
    db.user.count({ where: { isDemo: true } }),
    db.bubble.count(),
    db.chapter.count({ where: { status: "live" } }),
  ]);
  return { members, bubbles, liveChapters, demo: demoMembers > 0 };
}

/** Member and Bubble counts; `demo` is true while any counted record is seeded demo data. */
export function getCommunityCounts(): Promise<CommunityCounts> {
  return safely(loadCommunityCounts, { members: 0, bubbles: 0, liveChapters: 0, demo: true });
}
