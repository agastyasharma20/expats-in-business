"use server";

import { cookies } from "next/headers";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth/session";
import { CHAPTER_COOKIE, GLOBAL_CHAPTER, getChapterOptions } from "@/lib/chapters";
import { getDb } from "@/lib/db";
import { locales } from "@/lib/i18n/routing";
import { rateLimit } from "@/lib/rate-limit";

const chapterSchema = z.object({ slug: z.string().regex(/^[a-z0-9-]{1,64}$/) });

export type SetChapterResult = { ok: true } | { ok: false; error: "invalid" | "unknown" };

/**
 * Saves the visitor's chapter choice in a first-party preference cookie (a setting the visitor
 * asked for, so it is a strictly necessary cookie; see content/legal/cookies.mdx).
 * Public action: no sign-in needed, no personal data stored.
 */
export async function setPreferredChapter(input: unknown): Promise<SetChapterResult> {
  const parsed = chapterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const { slug } = parsed.data;
  if (slug !== GLOBAL_CHAPTER) {
    const options = await getChapterOptions();
    if (!options.some((option) => option.slug === slug)) return { ok: false, error: "unknown" };
  }

  (await cookies()).set(CHAPTER_COOKIE, slug, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  return { ok: true };
}

const localeSchema = z.enum(locales);

/**
 * Remembers the language a signed-in member picked in the header, so emails (tickets, reminders,
 * sign-in links) arrive in it too. Visitors: no-op. Only supported locales are stored.
 */
export async function rememberLocale(input: unknown): Promise<{ ok: boolean }> {
  const parsed = localeSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const user = await getSessionUser();
  if (!user) return { ok: true };
  if (!(await rateLimit(`locale:${user.id}`, 20, 3600)).ok) return { ok: false };
  await getDb().user.update({ where: { id: user.id }, data: { locale: parsed.data } });
  return { ok: true };
}
