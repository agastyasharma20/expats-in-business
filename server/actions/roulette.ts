"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { parseScopeKey } from "@/config/roulette";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getFlags } from "@/lib/features";
import { firstName, notify } from "@/lib/notifications";
import { withinLimits } from "@/lib/security/limits";

import type { ActionState } from "./account";

/** A member may only join a scope they belong to: their home chapter or a Bubble they joined. */
async function mayUseScope(userId: string, key: string): Promise<boolean> {
  const scope = parseScopeKey(key);
  if (!scope) return false;
  const db = getDb();
  if (scope.kind === "chapter") {
    const profile = await db.profile.findUnique({
      where: { userId },
      select: { homeChapterId: true },
    });
    return profile?.homeChapterId === scope.id;
  }
  const member = await db.bubbleMember.findUnique({
    where: { bubbleId_userId: { bubbleId: scope.id, userId } },
    select: { userId: true },
  });
  return Boolean(member);
}

const optSchema = z.object({ scope: z.string().max(60), join: z.enum(["true", "false"]) });

export async function setRouletteOptIn(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/roulette");
  if (!(await getFlags()).coffeeRoulette) return { ok: false, message: "disabled" };
  const parsed = optSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false };
  if (!(await withinLimits(user.id, "roulette"))) return { ok: false, message: "rateLimited" };
  const { scope, join } = parsed.data;
  const db = getDb();
  if (join === "true") {
    if (!(await mayUseScope(user.id, scope))) return { ok: false, message: "forbidden" };
    await db.rouletteOptIn.upsert({
      where: { userId_scopeKey: { userId: user.id, scopeKey: scope } },
      update: {},
      create: { userId: user.id, scopeKey: scope },
    });
  } else {
    await db.rouletteOptIn.deleteMany({ where: { userId: user.id, scopeKey: scope } });
  }
  revalidatePath("/roulette");
  revalidatePath("/dashboard");
  return { ok: true, message: join === "true" ? "joined" : "left" };
}

const respondSchema = z.object({
  matchId: z.string().trim().min(1).max(40),
  decision: z.enum(["accept", "decline"]),
});

/**
 * Accept or decline a match. Confirmed only when everyone accepts (then contact details are
 * shown to the group); any decline cancels it for all.
 */
export async function respondRoulette(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/roulette");
  const parsed = respondSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false };
  if (!(await withinLimits(user.id, "roulette"))) return { ok: false, message: "rateLimited" };
  const { matchId, decision } = parsed.data;
  const db = getDb();
  const accept = decision === "accept";

  const outcome = await db.$transaction(async (tx) => {
    const { count } = await tx.rouletteMatchMember.updateMany({
      where: { matchId, userId: user.id, accepted: null, match: { status: "proposed" } },
      data: { accepted: accept, respondedAt: new Date() },
    });
    if (!count) return null;
    const members = await tx.rouletteMatchMember.findMany({
      where: { matchId },
      select: { userId: true, accepted: true },
    });
    const status = !accept
      ? "declined"
      : members.every((m) => m.accepted)
        ? "confirmed"
        : "proposed";
    if (status !== "proposed")
      await tx.rouletteMatch.update({ where: { id: matchId }, data: { status } });
    return { status, others: members.filter((m) => m.userId !== user.id).map((m) => m.userId) };
  });
  if (!outcome) return { ok: false, message: "invalid" };

  if (outcome.status === "confirmed") {
    for (const id of [...outcome.others, user.id])
      await notify(id, "rouletteConfirmed", "/roulette");
  } else if (outcome.status === "declined") {
    for (const id of outcome.others) {
      await notify(id, "rouletteDeclined", "/roulette", { name: firstName(user.name) });
    }
  }
  revalidatePath("/roulette");
  revalidatePath("/dashboard");
  return { ok: true, message: accept ? "accepted" : "declined" };
}
