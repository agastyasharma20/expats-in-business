"use server";

import { revalidatePath } from "next/cache";
import { forbidden } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { can, isAdmin } from "@/lib/auth/permissions";
import { requirePermission, requireUser } from "@/lib/auth/session";
import { cleanPostBody } from "@/lib/community/rules";
import { getDb } from "@/lib/db";
import { formEntries, idField } from "@/lib/festivals/form";
import { notify } from "@/lib/notifications";
import { withinLimits } from "@/lib/security/limits";

import type { ActionState } from "./account";

const applySchema = z.object({
  type: z.enum(["speaker", "story", "contributor"]),
  topic: z.string().trim().min(5).max(120),
  pitch: z.string().trim().min(40).max(2000),
  link: z.union([z.url({ protocol: /^https$/ }).max(300), z.literal("")]).default(""),
});

/**
 * Get involved: speak at a session, share your story, or contribute (guides, translations, design).
 * Members only (name and email come from the account, nothing extra is collected); one open
 * application per type; the text is cleaned like a post.
 */
export async function applyToContribute(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/get-involved");
  const parsed = applySchema.safeParse(formEntries(form));
  if (!parsed.success) return { ok: false, message: "default" };
  const pitch = cleanPostBody(parsed.data.pitch);
  if (!pitch.ok) return { ok: false, message: "default" };
  if (!(await withinLimits(user.id, "apply"))) return { ok: false, message: "rateLimited" };
  const db = getDb();
  const open = await db.application.count({
    where: { userId: user.id, type: parsed.data.type, status: { in: ["submitted", "in_review"] } },
  });
  if (open) return { ok: false, message: "exists" };
  const profile = await db.profile.findUnique({
    where: { userId: user.id },
    select: { homeChapterId: true },
  });
  await db.application.create({
    data: {
      type: parsed.data.type,
      userId: user.id,
      chapterId: profile?.homeChapterId ?? null,
      name: user.name,
      email: user.email,
      answers: { topic: parsed.data.topic, pitch: pitch.body, link: parsed.data.link || null },
    },
  });
  revalidatePath("/get-involved");
  revalidatePath("/admin/applications");
  return { ok: true, message: "sent" };
}

const moveSchema = z.object({
  id: idField,
  status: z.enum(["submitted", "in_review", "accepted", "declined"]),
});

/** Move an application on the board. Chapter leads only for their chapter; the applicant is told. */
export async function moveApplication(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requirePermission("applications.review");
  if (!(await withinLimits(user.id, "admin"))) return { ok: false, message: "rateLimited" };
  const parsed = moveSchema.safeParse(formEntries(form));
  if (!parsed.success) return { ok: false };
  const db = getDb();
  const app = await db.application.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, chapterId: true, userId: true, status: true },
  });
  if (!app) return { ok: false };
  const allowed =
    isAdmin(user) ||
    (app.chapterId && can(user, "applications.review", { chapterId: app.chapterId }));
  if (!allowed) forbidden();
  await db.application.update({ where: { id: app.id }, data: { status: parsed.data.status } });
  await audit({
    actorId: user.id,
    action: "application.move",
    entityType: "Application",
    entityId: app.id,
    chapterId: app.chapterId,
    meta: { from: app.status, to: parsed.data.status },
  });
  if (app.userId && (parsed.data.status === "accepted" || parsed.data.status === "declined")) {
    await notify(
      app.userId,
      parsed.data.status === "accepted" ? "applicationAccepted" : "applicationDeclined",
      "/get-involved",
    );
  }
  revalidatePath("/admin/applications");
  return { ok: true, message: parsed.data.status };
}
