"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { formId } from "@/lib/festivals/form";
import { firstName, notify } from "@/lib/notifications";
import { withinLimits } from "@/lib/security/limits";
import { rateLimit } from "@/lib/rate-limit";

import type { ActionState } from "./account";

/** Who I met: opt in or out of being visible to people who checked in at the same sessions. */
export async function setWhoIMet(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!(await withinLimits(user.id, "account"))) return { ok: false, message: "rateLimited" };
  const granted = form.get("granted") === "true";
  await getDb().consent.upsert({
    where: { userId_type: { userId: user.id, type: "who_i_met" } },
    update: { granted },
    create: { userId: user.id, type: "who_i_met", granted },
  });
  revalidatePath("/met/[slug]", "page");
  return { ok: true };
}

const requestSchema = z.object({ addresseeId: z.string().min(1), eventId: z.string().min(1) });

/**
 * One-tap request to someone you met. Both people must have checked in at that session and opted
 * in to Who I met, so nobody can be contacted through it by a stranger. 30 requests per hour.
 */
export async function requestConnection(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = requestSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success || parsed.data.addresseeId === user.id)
    return { ok: false, message: "invalid" };
  if (!(await rateLimit(`connect:${user.id}`, 30, 3600)).ok)
    return { ok: false, message: "rateLimited" };
  const { addresseeId, eventId } = parsed.data;
  const db = getDb();
  const [attended, optedIn] = await Promise.all([
    db.checkIn.count({ where: { eventId, userId: { in: [user.id, addresseeId] } } }),
    db.consent.count({
      where: { type: "who_i_met", granted: true, userId: { in: [user.id, addresseeId] } },
    }),
  ]);
  if (attended < 2 || optedIn < 2) return { ok: false, message: "invalid" };
  const existing = await db.connection.findFirst({
    where: {
      OR: [
        { requesterId: user.id, addresseeId },
        { requesterId: addresseeId, addresseeId: user.id },
      ],
    },
  });
  if (!existing) {
    await db.connection.create({
      data: { requesterId: user.id, addresseeId, metAtEventId: eventId, status: "pending" },
    });
  }
  revalidatePath("/met/[slug]", "page");
  return { ok: true };
}

/** Accept or decline a request addressed to you (double opt-in: only accepted ones count). */
export async function respondConnection(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/connections");
  if (!(await withinLimits(user.id, "account"))) return { ok: false, message: "rateLimited" };
  const accept = form.get("decision") === "accept";
  const { count } = await getDb().connection.updateMany({
    where: { id: formId(form, "id"), addresseeId: user.id, status: "pending" },
    data: { status: accept ? "accepted" : "declined", respondedAt: new Date() },
  });
  if (!count) return { ok: false };
  if (accept) {
    const connection = await getDb().connection.findUnique({
      where: { id: formId(form, "id") },
      select: { requesterId: true },
    });
    if (connection)
      await notify(connection.requesterId, "connectionAccepted", "/connections", {
        name: firstName(user.name),
      });
  }
  revalidatePath("/connections");
  revalidatePath("/dashboard");
  return { ok: true, message: accept ? "accepted" : "declined" };
}
