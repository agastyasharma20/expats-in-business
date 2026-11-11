"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { ONBOARDING_STEPS, RESIDENCE_SITUATIONS as RESIDENCE } from "@/lib/onboarding";

import type { ActionState } from "./account";

const stepSchemas = {
  chapter: z.object({ chapterId: z.string().min(1) }),
  origin: z.object({ originCountryCode: z.string().regex(/^[A-Z]{2}$/) }),
  languages: z.object({
    languages: z
      .array(z.string().regex(/^[a-z]{2}$/))
      .min(1)
      .max(10),
  }),
  industry: z.object({
    industryId: z.string().min(1),
    headline: z.string().trim().max(120).optional(),
  }),
  goals: z.object({ goals: z.array(z.string().min(1)).min(1).max(5) }),
  arrival: z.object({ arrivalDate: z.coerce.date(), residenceSituation: z.enum(RESIDENCE) }),
};

function slugFor(name: string, id: string) {
  const base = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base || "member"}-${id.slice(-6)}`;
}

/** Next founding number in a chapter (first `foundingLimit` members), retried once on a race. */
async function assignFoundingNumber(profileId: string, chapterId: string) {
  const db = getDb();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const chapter = await db.chapter.findUnique({
      where: { id: chapterId },
      select: { foundingLimit: true },
    });
    const max = await db.profile.aggregate({
      where: { homeChapterId: chapterId },
      _max: { foundingNumber: true },
    });
    const next = (max._max.foundingNumber ?? 0) + 1;
    if (!chapter || next > chapter.foundingLimit) return;
    try {
      await db.profile.update({ where: { id: profileId }, data: { foundingNumber: next } });
      return;
    } catch {
      // unique (chapter, number) conflict: someone took it; try the next one
    }
  }
}

/** Saves one onboarding step (each step persists on its own), then moves to the next. */
export async function saveOnboardingStep(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/onboarding");
  const step = String(form.get("step")) as (typeof ONBOARDING_STEPS)[number];
  const index = ONBOARDING_STEPS.indexOf(step);
  if (index < 0) return { ok: false, message: "invalid" };
  const raw = {
    ...Object.fromEntries(form),
    languages: form.getAll("languages"),
    goals: form.getAll("goals"),
  };
  const parsed = stepSchemas[step].safeParse(raw);
  if (!parsed.success) return { ok: false, message: "required" };

  const db = getDb();
  const profile = await db.profile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, slug: slugFor(user.name, user.id) },
  });
  const data = parsed.data as Record<string, unknown>;
  if (step === "goals") {
    const goals = await db.goal.findMany({
      where: { slug: { in: data.goals as string[] } },
      select: { id: true },
    });
    await db.profileGoal.deleteMany({ where: { profileId: profile.id } });
    await db.profileGoal.createMany({
      data: goals.map((g) => ({ profileId: profile.id, goalId: g.id })),
    });
  } else if (step === "chapter") {
    await db.profile.update({
      where: { id: profile.id },
      data: { homeChapterId: data.chapterId as string },
    });
    if (!(await db.chapterRole.count({ where: { userId: user.id, role: "member" } }))) {
      await db.chapterRole.create({
        data: { userId: user.id, role: "member", chapterId: data.chapterId as string },
      });
    }
  } else {
    await db.profile.update({ where: { id: profile.id }, data });
  }
  await db.profile.update({
    where: { id: profile.id },
    data: { onboardingStep: Math.max(profile.onboardingStep, index + 1) },
  });

  if (index === ONBOARDING_STEPS.length - 1) {
    const done = await db.profile.findUnique({
      where: { id: profile.id },
      select: { homeChapterId: true, foundingNumber: true },
    });
    if (done?.homeChapterId && !done.foundingNumber)
      await assignFoundingNumber(profile.id, done.homeChapterId);
    redirect("/dashboard");
  }
  redirect(`/onboarding?step=${index + 2}`);
}
