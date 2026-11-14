"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { withinLimits } from "@/lib/security/limits";

import type { ActionState } from "./account";

const bubbleSchema = z.object({ bubbleId: z.string().trim().min(1).max(40) });

async function loadBubble(form: FormData) {
  const parsed = bubbleSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return null;
  return getDb().bubble.findUnique({
    where: { id: parsed.data.bubbleId },
    select: { id: true, slug: true },
  });
}

const refresh = (slug: string) => {
  revalidatePath(`/bubbles/${slug}`);
  revalidatePath("/bubbles");
  revalidatePath("/community");
  revalidatePath("/roulette");
};

/** Join a Bubble (any member may join any Bubble; origin is not checked or required). */
export async function joinBubble(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/bubbles");
  const bubble = await loadBubble(form);
  if (!bubble) return { ok: false };
  if (!(await withinLimits(user.id, "bubble"))) return { ok: false, message: "rateLimited" };
  const profile = await getDb().profile.findUnique({
    where: { userId: user.id },
    select: { homeChapterId: true },
  });
  await getDb().bubbleMember.upsert({
    where: { bubbleId_userId: { bubbleId: bubble.id, userId: user.id } },
    update: {},
    create: {
      bubbleId: bubble.id,
      userId: user.id,
      chapterId: profile?.homeChapterId ?? null,
      isVisible: false,
    },
  });
  refresh(bubble.slug);
  return { ok: true, message: "joined" };
}

/** Leave a Bubble. Leads hand over first (a chapter lead reassigns), so the Bubble keeps a lead. */
export async function leaveBubble(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/bubbles");
  const bubble = await loadBubble(form);
  if (!bubble) return { ok: false };
  if (!(await withinLimits(user.id, "bubble"))) return { ok: false, message: "rateLimited" };
  const db = getDb();
  const { count } = await db.bubbleMember.deleteMany({
    where: { bubbleId: bubble.id, userId: user.id, isLead: false },
  });
  if (!count) return { ok: false, message: "lead" };
  await db.rouletteOptIn.deleteMany({
    where: { userId: user.id, scopeKey: `bubble:${bubble.id}` },
  });
  refresh(bubble.slug);
  return { ok: true, message: "left" };
}

/** Show or hide yourself on the Bubble page (hidden by default when joining). */
export async function setBubbleVisibility(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser("/bubbles");
  if (!(await withinLimits(user.id, "bubble"))) return { ok: false, message: "rateLimited" };
  const bubble = await loadBubble(form);
  if (!bubble) return { ok: false };
  const visible = form.get("visible") === "true";
  const { count } = await getDb().bubbleMember.updateMany({
    where: { bubbleId: bubble.id, userId: user.id },
    data: { isVisible: visible },
  });
  if (!count) return { ok: false };
  refresh(bubble.slug);
  return { ok: true, message: visible ? "shown" : "hidden" };
}
