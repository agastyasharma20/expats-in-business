"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { locales } from "@/lib/i18n/routing";

export type ActionState = { ok: boolean; message?: string } | null;

const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

const profileSchema = z.object({
  headline: z.string().trim().max(120).optional().default(""),
  bio: z.string().trim().max(1000).optional().default(""),
  skills: z.string().trim().max(300).optional().default(""),
  openToCoffee: checkbox,
  isPublic: checkbox,
  showBio: checkbox,
  showOrigin: checkbox,
  showLanguages: checkbox,
  showIndustry: checkbox,
  showSkills: checkbox,
});

/** Settings → Profile: text fields and per-field visibility (old bug 14: public profile visible). */
export async function updateProfile(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/settings/profile");
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "invalid" };
  const { skills, headline, bio, ...flags } = parsed.data;
  const profile = await getDb().profile.update({
    where: { userId: user.id },
    data: {
      ...flags,
      headline: headline || null,
      bio: bio || null,
      skills: skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 15),
    },
    select: { slug: true },
  });
  revalidatePath("/settings/profile");
  revalidatePath(`/members/${profile.slug}`);
  return { ok: true };
}

const accountSchema = z.object({ name: z.string().trim().min(2).max(80), locale: z.enum(locales) });

/** Settings → Account: persists, survives a reload (old bug 6). */
export async function updateAccount(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/settings/account");
  const parsed = accountSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "invalid" };
  await getDb().user.update({ where: { id: user.id }, data: parsed.data });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Settings → Privacy: schedule deletion (hard delete after 30 days by the jobs runner) or cancel it. */
export async function setDeletion(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/settings/privacy");
  const cancel = form.get("intent") === "cancel";
  if (!cancel && form.get("confirm") !== "DELETE") return { ok: false, message: "confirm" };
  await getDb().user.update({
    where: { id: user.id },
    data: { deletionRequestedAt: cancel ? null : new Date() },
  });
  revalidatePath("/settings/privacy");
  return { ok: true };
}
