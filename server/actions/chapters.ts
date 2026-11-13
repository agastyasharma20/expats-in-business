"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { formEntries } from "@/lib/festivals/form";
import { cityKey, cityRequestSchema } from "@/lib/growth/rules";
import { withinLimits } from "@/lib/security/limits";

import type { ActionState } from "./account";

/**
 * "Bring EiB to my city": one vote per member and city. Spellings of the same city ("Kraków",
 * "krakow") count as one request. Only countries EiB knows can be chosen (the country row must
 * exist), so the list stays clean.
 */
export async function voteForCity(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/chapters");
  const parsed = cityRequestSchema.safeParse(formEntries(form));
  if (!parsed.success) return { ok: false, message: "default" };
  if (!(await withinLimits(user.id, "vote"))) return { ok: false, message: "rateLimited" };
  const db = getDb();
  const country = await db.country.findUnique({
    where: { code: parsed.data.countryCode },
    select: { code: true },
  });
  if (!country) return { ok: false, message: "country" };
  const key = cityKey(parsed.data.city);
  const live = await db.chapter.count({
    where: { countryCode: country.code, status: { in: ["live", "launching"] }, slug: key },
  });
  if (live) return { ok: false, message: "exists" };
  const request = await db.chapterRequest.upsert({
    where: { countryCode_cityKey: { countryCode: country.code, cityKey: key } },
    update: {},
    create: { countryCode: country.code, cityKey: key, city: parsed.data.city },
  });
  const created = await db.chapterRequestVote.createMany({
    data: [{ requestId: request.id, userId: user.id }],
    skipDuplicates: true,
  });
  updateTag("chapters");
  revalidatePath("/chapters");
  return { ok: true, message: created.count ? "voted" : "already" };
}
