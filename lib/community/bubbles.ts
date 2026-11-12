import "server-only";

import { getDb } from "@/lib/db";

import { publicCount } from "./rules";

/** All Bubbles with a member count that is only published from 5 members up. */
export async function listBubbles(userId: string | null) {
  const db = getDb();
  const [bubbles, mine] = await Promise.all([
    db.bubble.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        originCountryCode: true,
        description: true,
        isDemo: true,
        _count: { select: { members: true } },
        members: {
          where: { isLead: true },
          take: 1,
          select: { user: { select: { name: true } } },
        },
      },
    }),
    userId
      ? db.bubbleMember.findMany({ where: { userId }, select: { bubbleId: true } })
      : Promise.resolve([]),
  ]);
  const joined = new Set(mine.map((m) => m.bubbleId));
  return bubbles.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    countryCode: b.originCountryCode,
    description: b.description,
    isDemo: b.isDemo,
    count: publicCount(b._count.members),
    lead: b.members[0]?.user.name ?? null,
    joined: joined.has(b.id),
  }));
}

/** One Bubble page: lead, members who chose to be listed, upcoming sessions and its group. */
export async function getBubble(slug: string, userId: string | null) {
  const db = getDb();
  const bubble = await db.bubble.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      originCountryCode: true,
      description: true,
      isDemo: true,
      _count: { select: { members: true } },
      groups: { take: 1, select: { slug: true, name: true } },
    },
  });
  if (!bubble) return null;
  const [members, events, me] = await Promise.all([
    db.bubbleMember.findMany({
      where: { bubbleId: bubble.id, isVisible: true, user: { suspendedAt: null } },
      orderBy: [{ isLead: "desc" }, { joinedAt: "asc" }],
      take: 24,
      select: {
        isLead: true,
        user: {
          select: {
            name: true,
            profile: { select: { slug: true, isPublic: true, headline: true } },
          },
        },
        chapter: { select: { name: true } },
      },
    }),
    db.event.findMany({
      where: { bubbleId: bubble.id, status: "published", startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 4,
      select: {
        slug: true,
        title: true,
        startsAt: true,
        chapter: { select: { timezone: true, name: true } },
      },
    }),
    userId
      ? db.bubbleMember.findUnique({
          where: { bubbleId_userId: { bubbleId: bubble.id, userId } },
          select: { isVisible: true, isLead: true },
        })
      : null,
  ]);
  // Signed-out visitors see names only for members with a public profile.
  const listed = members.filter((m) => userId || m.user.profile?.isPublic);
  return {
    ...bubble,
    count: publicCount(bubble._count.members),
    lead: members.find((m) => m.isLead) ?? null,
    members: listed,
    events,
    me,
  };
}
