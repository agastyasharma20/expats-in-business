import { PLACEHOLDER_CAFES } from "@/config/roulette";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  matchParticipants,
  NO_REPEAT_DAYS,
  seededRandom,
  weekStart,
} from "@/lib/community/roulette";

const ENTITLED = ["active", "trialing"] as const;

/**
 * Weekly Coffee Roulette (npm run jobs -- roulette, or "Run now" in /admin/roulette).
 * Per scope: one round per week (unique scope + week, so a second run does nothing), matches
 * from the pure algorithm, an in-app notification for every member. Suspended or
 * deletion-pending accounts are skipped. Returns counts only (no personal data in logs).
 */
export async function runRoulette(
  db: PrismaClient,
  _appUrl: string,
  options: { now?: Date; onlyScope?: string } = {},
) {
  const now = options.now ?? new Date();
  const week = weekStart(now);
  const scopes = options.onlyScope
    ? [options.onlyScope]
    : (await db.rouletteOptIn.findMany({ distinct: ["scopeKey"], select: { scopeKey: true } })).map(
        (s) => s.scopeKey,
      );
  let rounds = 0;
  let matches = 0;
  let unmatched = 0;

  for (const scope of scopes) {
    const exists = await db.rouletteRound.findUnique({
      where: { scopeKey_weekStart: { scopeKey: scope, weekStart: week } },
      select: { id: true },
    });
    if (exists) continue;
    const optIns = await db.rouletteOptIn.findMany({
      where: { scopeKey: scope, user: { suspendedAt: null, deletionRequestedAt: null } },
      select: {
        user: {
          select: {
            id: true,
            profile: {
              select: { skills: true, goals: { select: { goal: { select: { slug: true } } } } },
            },
            subscriptions: {
              where: { status: { in: [...ENTITLED] } },
              select: { plan: { select: { tier: true } } },
            },
          },
        },
      },
    });
    if (optIns.length < 2) continue;
    const ids = optIns.map((o) => o.user.id);
    const past = await db.rouletteMatch.findMany({
      where: {
        createdAt: { gte: new Date(now.getTime() - NO_REPEAT_DAYS * 86_400_000) },
        members: { some: { userId: { in: ids } } },
      },
      select: { createdAt: true, members: { select: { userId: true } } },
    });
    const result = matchParticipants(
      optIns.map(({ user }) => ({
        id: user.id,
        optedIn: true,
        goals: user.profile?.goals.map((g) => g.goal.slug) ?? [],
        skills: user.profile?.skills ?? [],
        priority: user.subscriptions.some((s) => ["plus", "corporate"].includes(s.plan.tier)),
      })),
      past.map((m) => ({ members: m.members.map((x) => x.userId), at: m.createdAt })),
      `${scope}:${week.toISOString().slice(0, 10)}`,
      now,
    );
    const random = seededRandom(`${scope}:cafe:${week.toISOString()}`);
    try {
      await db.$transaction(async (tx) => {
        const round = await tx.rouletteRound.create({ data: { scopeKey: scope, weekStart: week } });
        for (const group of result.groups) {
          await tx.rouletteMatch.create({
            data: {
              roundId: round.id,
              cafe: PLACEHOLDER_CAFES[Math.floor(random() * PLACEHOLDER_CAFES.length)],
              members: { create: group.map((userId) => ({ userId })) },
            },
          });
        }
        await tx.notification.createMany({
          data: result.groups.flat().map((userId) => ({
            userId,
            type: "rouletteMatch",
            href: "/roulette",
            data: {},
          })),
        });
      });
    } catch (error) {
      // A parallel run created the same round first (unique scope + week): nothing to do.
      if ((error as { code?: string }).code === "P2002") continue;
      throw error;
    }
    rounds += 1;
    matches += result.groups.length;
    unmatched += result.unmatched.length;
  }
  return { rounds, matches, unmatched };
}
