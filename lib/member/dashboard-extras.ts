import "server-only";

import { getDb } from "@/lib/db";

import { PROFILE_CHECKS, profileCompleteness } from "./completeness";

/** The second row of dashboard data: community, roulette, notifications and profile strength. */
export async function getDashboardExtras(userId: string) {
  const db = getDb();
  const [profile, bubbles, pendingRequests, match, notifications] = await Promise.all([
    db.profile.findUnique({
      where: { userId },
      select: {
        headline: true,
        bio: true,
        homeChapterId: true,
        originCountryCode: true,
        languages: true,
        skills: true,
        _count: { select: { goals: true } },
        homeChapter: { select: { timezone: true } },
      },
    }),
    db.bubbleMember.findMany({ where: { userId }, select: { bubbleId: true } }),
    db.connection.count({ where: { addresseeId: userId, status: "pending" } }),
    db.rouletteMatch.findFirst({
      where: { members: { some: { userId } }, status: { in: ["proposed", "confirmed"] } },
      orderBy: { createdAt: "desc" },
      select: {
        status: true,
        members: { select: { userId: true, accepted: true, user: { select: { name: true } } } },
      },
    }),
    db.notification.findMany({
      where: { userId, readAt: null },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true, type: true, href: true, data: true, createdAt: true },
    }),
  ]);
  const bubbleIds = bubbles.map((b) => b.bubbleId);
  const posts = await db.post.findMany({
    where: {
      removedAt: null,
      hiddenAt: null,
      authorId: { not: userId },
      group: {
        OR: [
          ...(bubbleIds.length ? [{ bubbleId: { in: bubbleIds } }] : []),
          ...(profile?.homeChapterId ? [{ chapterId: profile.homeChapterId }] : []),
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: {
      id: true,
      kind: true,
      body: true,
      createdAt: true,
      author: { select: { name: true } },
      group: { select: { slug: true, name: true } },
    },
  });
  const me = match?.members.find((m) => m.userId === userId);
  return {
    timezone: profile?.homeChapter?.timezone ?? null,
    completeness: profile
      ? profileCompleteness({ ...profile, goalCount: profile._count.goals })
      : { percent: 0, missing: [...PROFILE_CHECKS] },
    bubbleCount: bubbles.length,
    pendingRequests,
    match: match
      ? {
          status: match.status,
          needsAnswer: match.status === "proposed" && me?.accepted === null,
          names: match.members.filter((m) => m.userId !== userId).map((m) => m.user.name),
        }
      : null,
    notifications,
    posts: bubbleIds.length || profile?.homeChapterId ? posts : [],
  };
}
