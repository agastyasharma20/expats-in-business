"use server";

import { revalidatePath, updateTag } from "next/cache";
import { forbidden } from "next/navigation";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { isAdmin } from "@/lib/auth/permissions";
import { requirePermission, requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { formEntries, idField } from "@/lib/festivals/form";
import {
  ambassadorDetailsSchema,
  ambassadorPlaceSchema,
  canMove,
  REVIEW_STATUSES,
} from "@/lib/growth/rules";
import { notify } from "@/lib/notifications";
import { withinLimits } from "@/lib/security/limits";

import type { ActionState } from "./account";

/**
 * Apply to become a Global, Country or City ambassador. Members only (name and email come from
 * the account); the place is validated per tier; one open application per tier is enforced by a
 * partial unique index, so a double click or a scripted resubmit cannot duplicate it.
 */
export async function applyAmbassador(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/ambassadors");
  const raw = formEntries(form);
  const place = ambassadorPlaceSchema.safeParse(raw);
  const details = ambassadorDetailsSchema.safeParse({
    ...raw,
    languages: form.getAll("languages").filter((v): v is string => typeof v === "string"),
  });
  if (!place.success || !details.success) return { ok: false, message: "default" };
  if (!(await withinLimits(user.id, "apply"))) return { ok: false, message: "rateLimited" };
  const d = details.data;
  try {
    await getDb().ambassadorApplication.create({
      data: {
        userId: user.id,
        scope: place.data.scope,
        countryCode: place.data.scope === "global" ? null : place.data.countryCode,
        city: place.data.scope === "city" ? place.data.city : null,
        motivation: d.motivation,
        experience: d.experience,
        languages: d.languages,
        hoursPerMonth: d.hoursPerMonth,
        linkedinUrl: d.linkedinUrl || null,
      },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return { ok: false, message: "exists" };
    throw error;
  }
  revalidatePath("/ambassadors");
  updateTag("chapters");
  revalidatePath("/admin/ambassadors");
  return { ok: true, message: "sent" };
}

export async function withdrawAmbassador(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/ambassadors");
  if (!(await withinLimits(user.id, "account"))) return { ok: false, message: "rateLimited" };
  const id = idField.safeParse(form.get("id"));
  if (!id.success) return { ok: false };
  const { count } = await getDb().ambassadorApplication.updateMany({
    where: {
      id: id.data,
      userId: user.id,
      status: { in: ["submitted", "in_review", "waitlisted"] },
    },
    data: { status: "withdrawn" },
  });
  if (!count) return { ok: false };
  revalidatePath("/ambassadors");
  updateTag("chapters");
  return { ok: true, message: "withdrawn" };
}

/** Show or hide yourself on the public ambassador lists. */
export async function setAmbassadorVisibility(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser("/ambassadors");
  if (!(await withinLimits(user.id, "account"))) return { ok: false, message: "rateLimited" };
  const visible = form.get("visible") === "true";
  await getDb().ambassador.updateMany({ where: { userId: user.id }, data: { isVisible: visible } });
  revalidatePath("/ambassadors");
  updateTag("chapters");
  return { ok: true, message: visible ? "shown" : "hidden" };
}

const reviewSchema = z.object({
  id: idField,
  status: z.enum(REVIEW_STATUSES),
  note: z.string().trim().max(500).default(""),
});

const NOTICE = {
  accepted: "ambassadorAccepted",
  waitlisted: "ambassadorWaitlisted",
  declined: "ambassadorDeclined",
} as const;

/**
 * Admin decision. Accepting creates the public Ambassador record in the same transaction (and
 * never twice for the same person and place); every decision is audited and the applicant told.
 */
export async function reviewAmbassador(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requirePermission("admin.access");
  if (!isAdmin(user)) forbidden();
  if (!(await withinLimits(user.id, "admin"))) return { ok: false, message: "rateLimited" };
  const parsed = reviewSchema.safeParse(formEntries(form));
  if (!parsed.success) return { ok: false };
  const { id, status, note } = parsed.data;
  const db = getDb();
  const app = await db.ambassadorApplication.findUnique({ where: { id } });
  if (!app || !canMove(app.status, status)) return { ok: false, message: "move" };
  await db.$transaction(async (tx) => {
    await tx.ambassadorApplication.update({
      where: { id },
      data: { status, reviewNote: note || null, reviewedById: user.id, reviewedAt: new Date() },
    });
    const place = {
      userId: app.userId,
      scope: app.scope,
      countryCode: app.countryCode,
      city: app.city,
    };
    const existing = await tx.ambassador.findFirst({ where: place, select: { id: true } });
    if (status === "accepted" && !existing) {
      await tx.ambassador.create({ data: { ...place, isDemo: app.isDemo } });
    }
    // Moving an accepted application back to review takes the public listing down again.
    if (app.status === "accepted" && status !== "accepted" && existing) {
      await tx.ambassador.delete({ where: { id: existing.id } });
    }
  });
  await audit({
    actorId: user.id,
    action: "ambassador.review",
    entityType: "AmbassadorApplication",
    entityId: id,
    meta: { from: app.status, to: status, scope: app.scope },
  });
  if (status in NOTICE) {
    await notify(app.userId, NOTICE[status as keyof typeof NOTICE], "/ambassadors");
  }
  revalidatePath("/admin/ambassadors");
  revalidatePath("/ambassadors");
  updateTag("chapters");
  return { ok: true, message: status };
}
