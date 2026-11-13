"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { parseScopeKey } from "@/config/roulette";
import { requireAdminAction } from "@/lib/admin/guard";

import { audit } from "@/lib/audit";

import { cleanPostBody } from "@/lib/community/rules";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";

import { runRoulette } from "@/lib/jobs/roulette";

import type { ActionState } from "./account";

const id = z.string().trim().min(1).max(40);

const broadcastSchema = z.object({
  chapterId: z.union([id, z.literal("all")]),
  text: z.string().trim().min(10).max(280),
});

/** In-app announcement to every active member of a chapter (or everyone). Max 5 a day. */
export async function broadcast(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, limited } = await requireAdminAction("broadcast");
  if (limited) return { ok: false, message: "rateLimited" };
  const parsed = broadcastSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "broadcast" };
  const cleaned = cleanPostBody(parsed.data.text);
  if (!cleaned.ok) return { ok: false, message: "broadcast" };
  const db = getDb();
  const recipients = await db.user.findMany({
    where: {
      suspendedAt: null,
      deletionRequestedAt: null,
      ...(parsed.data.chapterId === "all"
        ? {}
        : { profile: { homeChapterId: parsed.data.chapterId } }),
    },
    select: { id: true },
  });
  await db.notification.createMany({
    data: recipients.map((r) => ({
      userId: r.id,
      type: "announcement",
      href: "/notifications",
      data: { text: cleaned.body.replace(/\s+/g, " ") },
    })),
  });
  await audit({
    actorId: user.id,
    action: "broadcast.send",
    entityType: "Chapter",
    entityId: parsed.data.chapterId,
    chapterId: parsed.data.chapterId === "all" ? null : parsed.data.chapterId,
    meta: { recipients: recipients.length },
  });
  return { ok: true, message: String(recipients.length) };
}

/** Draw this week's Coffee Roulette for one scope now (idempotent: once per week per scope). */
export async function runRouletteNow(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, limited } = await requireAdminAction();
  if (limited) return { ok: false, message: "rateLimited" };
  const scope = String(form.get("scope") ?? "");
  if (!parseScopeKey(scope)) return { ok: false };
  const result = await runRoulette(getDb(), getEnv().BETTER_AUTH_URL, { onlyScope: scope });
  await audit({
    actorId: user.id,
    action: "roulette.run",
    entityType: "RouletteRound",
    entityId: scope,
    meta: result,
  });
  revalidatePath("/admin/roulette");
  return { ok: true, message: result.rounds ? "ran" : "already" };
}
