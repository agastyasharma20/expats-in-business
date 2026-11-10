import { cacheLife, cacheTag } from "next/cache";
import { cookies } from "next/headers";

import { CHAPTER_COOKIE, GLOBAL_CHAPTER, type ChapterOption } from "./chapters-shared";
import { getDb } from "./db";

export { CHAPTER_COOKIE, GLOBAL_CHAPTER, type ChapterOption };

/**
 * Chapters a visitor can pick: live first, then launching. Cached for minutes and tagged so the
 * chapter-in-a-box admin can revalidate it. Returns [] when the database is unreachable, so the
 * header still renders (Global only).
 */
async function loadChapterOptions(): Promise<ChapterOption[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("chapters");
  // Throws on failure so a failure is never cached (see getChapterOptions).
  const chapters = await getDb().chapter.findMany({
    where: { status: { in: ["live", "launching"] } },
    select: { slug: true, name: true, status: true },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
  return chapters.map((chapter) => ({
    slug: chapter.slug,
    name: chapter.name,
    status: chapter.status === "live" ? "live" : "launching",
  }));
}

/**
 * Chapters a visitor can pick: live first, then launching. Cached for minutes and tagged so the
 * chapter-in-a-box admin can revalidate it. Returns [] when the database is unreachable, so the
 * header still renders (Global only).
 */
export async function getChapterOptions(): Promise<ChapterOption[]> {
  try {
    return await loadChapterOptions();
  } catch (error) {
    console.error("[chapters] query failed, showing Global only:", error);
    return [];
  }
}

/** The visitor's chosen chapter slug from the preference cookie, or "global". */
export async function getPreferredChapterSlug(): Promise<string> {
  const value = (await cookies()).get(CHAPTER_COOKIE)?.value;
  return value && /^[a-z0-9-]{1,64}$/.test(value) ? value : GLOBAL_CHAPTER;
}
