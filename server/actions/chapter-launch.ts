"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { requireAdminAction } from "@/lib/admin/guard";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { formEntries, idField } from "@/lib/festivals/form";
import {
  chapterSlugFor,
  LAUNCH_STATUSES,
  launchChapterSchema,
  withCountryDefaults,
} from "@/lib/growth/launch";

import type { ActionState } from "./account";

function refresh() {
  updateTag("chapters");
  revalidatePath("/chapters");
  revalidatePath("/admin/chapters");
}

/**
 * Admin only: opens a new city chapter in one step. It appears in the switcher, on /chapters and
 * in the sitemap without a deploy. Time zone and currency default to the country's. An optional
 * chapter lead (an existing member, by email) gets the role in the same transaction.
 */
export async function launchChapter(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, limited } = await requireAdminAction();
  if (limited) return { ok: false, message: "rateLimited" };
  const parsed = launchChapterSchema.safeParse(formEntries(form));
  if (!parsed.success) return { ok: false, message: "default" };
  const input = parsed.data;
  const slug = chapterSlugFor(input.city);
  if (!slug) return { ok: false, message: "default" };

  const db = getDb();
  const country = await db.country.findUnique({ where: { code: input.countryCode } });
  if (!country) return { ok: false, message: "country" };
  if (await db.chapter.findUnique({ where: { slug }, select: { id: true } })) {
    return { ok: false, message: "exists" };
  }
  const lead = input.leadEmail
    ? await db.user.findUnique({ where: { email: input.leadEmail }, select: { id: true } })
    : null;
  if (input.leadEmail && !lead) return { ok: false, message: "leadNotFound" };

  const { timezone, currency } = withCountryDefaults(input, country);
  try {
    const chapter = await db.$transaction(async (tx) => {
      const created = await tx.chapter.create({
        data: {
          slug,
          name: input.city,
          city: input.city,
          countryCode: country.code,
          timezone,
          currency,
          locales: country.locales,
          status: input.status,
          launchedAt: input.status === "live" ? new Date() : null,
          tagline: input.tagline ?? null,
          // In a demo, new cities are part of the demo layer and vanish on `npm run demo:reset`.
          isDemo: getEnv().DEMO_MODE,
        },
      });
      if (lead) {
        await tx.chapterRole.create({
          data: { userId: lead.id, chapterId: created.id, role: "chapter_lead" },
        });
      }
      return created;
    });
    await audit({
      actorId: user.id,
      action: "chapter.launch",
      entityType: "Chapter",
      entityId: chapter.id,
      chapterId: chapter.id,
      meta: { slug, status: input.status, lead: Boolean(lead) },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return { ok: false, message: "exists" };
    throw error;
  }
  refresh();
  return { ok: true, message: input.city };
}

const statusSchema = z.object({ id: idField, status: z.enum(LAUNCH_STATUSES) });

/** Admin only: moves a chapter between "launching" (waitlist) and "live". */
export async function setChapterStatus(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, limited } = await requireAdminAction();
  if (limited) return { ok: false, message: "rateLimited" };
  const parsed = statusSchema.safeParse(formEntries(form));
  if (!parsed.success) return { ok: false };
  const db = getDb();
  const chapter = await db.chapter.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, status: true, launchedAt: true },
  });
  if (!chapter || chapter.status === "requested") return { ok: false };
  await db.chapter.update({
    where: { id: chapter.id },
    data: {
      status: parsed.data.status,
      launchedAt:
        parsed.data.status === "live" ? (chapter.launchedAt ?? new Date()) : chapter.launchedAt,
    },
  });
  await audit({
    actorId: user.id,
    action: "chapter.status",
    entityType: "Chapter",
    entityId: chapter.id,
    chapterId: chapter.id,
    meta: { from: chapter.status, to: parsed.data.status },
  });
  refresh();
  return { ok: true, message: parsed.data.status };
}
