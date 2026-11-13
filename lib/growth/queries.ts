import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { publicCount } from "@/lib/community/rules";
import { getDb } from "@/lib/db";

const visibleAmbassador = {
  isVisible: true,
  user: { suspendedAt: null, deletionRequestedAt: null },
} as const;

const ambassadorSelect = {
  id: true,
  scope: true,
  countryCode: true,
  city: true,
  isDemo: true,
  since: true,
  user: {
    select: { name: true, profile: { select: { slug: true, isPublic: true, headline: true } } },
  },
} as const;

/** Countries with chapters or city requests, for the /chapters world view. Cached, tag "chapters". */
export async function listCountries() {
  "use cache";
  cacheLife("minutes");
  cacheTag("chapters");
  const db = getDb();
  const countries = await db.country.findMany({
    where: { OR: [{ chapters: { some: {} } }, { chapterRequests: { some: {} } }] },
    orderBy: { name: "asc" },
    select: {
      code: true,
      name: true,
      landmark: true,
      tagline: true,
      isDemo: true,
      chapters: {
        where: { status: { in: ["live", "launching"] } },
        orderBy: [{ status: "asc" }, { name: "asc" }],
        select: {
          slug: true,
          name: true,
          status: true,
          isDemo: true,
          _count: { select: { profiles: true } },
        },
      },
      chapterRequests: {
        select: { id: true, city: true, isDemo: true, _count: { select: { votes: true } } },
      },
    },
  });
  return countries
    .map((c) => ({
      ...c,
      chapters: c.chapters.map((ch) => ({ ...ch, members: publicCount(ch._count.profiles) })),
      requests: c.chapterRequests
        .map((r) => ({ id: r.id, city: r.city, isDemo: r.isDemo, votes: r._count.votes }))
        .sort((a, b) => b.votes - a.votes),
    }))
    .sort((a, b) => b.chapters.length - a.chapters.length || a.name.localeCompare(b.name));
}

/** Country hub page data. */
export async function getCountry(code: string) {
  const db = getDb();
  const country = await db.country.findUnique({
    where: { code: code.toUpperCase() },
    select: {
      code: true,
      name: true,
      landmark: true,
      tagline: true,
      isDemo: true,
      defaultCurrency: true,
      chapters: {
        orderBy: [{ status: "asc" }, { name: "asc" }],
        select: {
          slug: true,
          name: true,
          status: true,
          landmark: true,
          tagline: true,
          isDemo: true,
          _count: { select: { profiles: true } },
        },
      },
      chapterRequests: {
        select: { id: true, city: true, isDemo: true, _count: { select: { votes: true } } },
      },
      _count: { select: { guides: true } },
    },
  });
  if (!country) return null;
  const ambassadors = await db.ambassador.findMany({
    where: { countryCode: country.code, scope: { in: ["country", "city"] }, ...visibleAmbassador },
    orderBy: [{ scope: "asc" }, { since: "asc" }],
    take: 24,
    select: ambassadorSelect,
  });
  return {
    ...country,
    chapters: country.chapters.map((ch) => ({ ...ch, members: publicCount(ch._count.profiles) })),
    requests: country.chapterRequests
      .map((r) => ({ id: r.id, city: r.city, isDemo: r.isDemo, votes: r._count.votes }))
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 8),
    ambassadors,
  };
}

/** Name and tagline for a chapter's metadata (cached; no clock, so it can prerender). */
export async function getChapterMeta(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("chapters");
  const chapter = await getDb().chapter.findUnique({
    where: { slug },
    select: { name: true, tagline: true, status: true },
  });
  return chapter && chapter.status !== "requested" ? chapter : null;
}

/** City chapter page data: status, upcoming sessions and festivals, ambassadors, member count. */
export async function getChapterPage(slug: string) {
  const db = getDb();
  const chapter = await db.chapter.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      city: true,
      status: true,
      landmark: true,
      tagline: true,
      timezone: true,
      currency: true,
      isDemo: true,
      launchedAt: true,
      country: { select: { code: true, name: true, landmark: true } },
      _count: { select: { profiles: true, bubbleMembers: true } },
    },
  });
  if (!chapter || chapter.status === "requested") return null;
  const [events, ambassadors, leads] = await Promise.all([
    db.event.findMany({
      where: { chapterId: chapter.id, status: "published", endsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 6,
      select: {
        slug: true,
        title: true,
        kind: true,
        startsAt: true,
        isDemo: true,
        venue: { select: { name: true } },
      },
    }),
    db.ambassador.findMany({
      where: {
        scope: "city",
        countryCode: chapter.country.code,
        city: { equals: chapter.city, mode: "insensitive" },
        ...visibleAmbassador,
      },
      take: 12,
      select: ambassadorSelect,
    }),
    db.chapterRole.count({ where: { chapterId: chapter.id, role: "chapter_lead" } }),
  ]);
  return { ...chapter, members: publicCount(chapter._count.profiles), events, ambassadors, leads };
}

/** Visible ambassadors grouped by tier for the /ambassadors page. */
export async function listAmbassadors() {
  return getDb().ambassador.findMany({
    where: visibleAmbassador,
    orderBy: [{ scope: "asc" }, { since: "asc" }],
    take: 60,
    select: ambassadorSelect,
  });
}

export function myAmbassadorApplications(userId: string) {
  return getDb().ambassadorApplication.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { id: true, scope: true, countryCode: true, city: true, status: true, createdAt: true },
  });
}
