import "server-only";

import { scopeKey } from "@/config/roulette";
import { getDb } from "@/lib/db";

/** Scopes a member can join (home chapter, joined Bubbles) with their opt-in state. */
export async function rouletteScopes(userId: string) {
  const db = getDb();
  const [profile, bubbles, optIns] = await Promise.all([
    db.profile.findUnique({
      where: { userId },
      select: { homeChapter: { select: { id: true, name: true } } },
    }),
    db.bubbleMember.findMany({
      where: { userId },
      select: { bubble: { select: { id: true, name: true } } },
    }),
    db.rouletteOptIn.findMany({ where: { userId }, select: { scopeKey: true } }),
  ]);
  const joined = new Set(optIns.map((o) => o.scopeKey));
  const scopes = [
    ...(profile?.homeChapter
      ? [{ kind: "chapter" as const, id: profile.homeChapter.id, name: profile.homeChapter.name }]
      : []),
    ...bubbles.map((b) => ({ kind: "bubble" as const, id: b.bubble.id, name: b.bubble.name })),
  ];
  return scopes.map((s) => {
    const key = scopeKey(s);
    return { ...s, key, joined: joined.has(key) };
  });
}

/** The member's matches, newest first. Emails are included only for confirmed matches. */
export async function myMatches(userId: string) {
  const rows = await getDb().rouletteMatch.findMany({
    where: { members: { some: { userId } } },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      status: true,
      cafe: true,
      round: { select: { weekStart: true, scopeKey: true } },
      members: {
        select: {
          userId: true,
          accepted: true,
          user: {
            select: {
              name: true,
              email: true,
              profile: { select: { slug: true, isPublic: true, headline: true } },
            },
          },
        },
      },
    },
  });
  return rows.map((match) => {
    const me = match.members.find((m) => m.userId === userId);
    return {
      id: match.id,
      status: match.status,
      cafe: match.cafe,
      weekStart: match.round.weekStart,
      myAnswer: me?.accepted ?? null,
      others: match.members
        .filter((m) => m.userId !== userId)
        .map((m) => ({
          name: m.user.name,
          headline: m.user.profile?.isPublic ? m.user.profile.headline : null,
          slug: m.user.profile?.isPublic ? m.user.profile.slug : null,
          accepted: m.accepted,
          email: match.status === "confirmed" ? m.user.email : null,
        })),
    };
  });
}
