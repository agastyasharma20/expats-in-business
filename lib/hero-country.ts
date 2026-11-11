import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { GLOBAL_CHAPTER, getPreferredChapterSlug } from "./chapters";
import { getDb } from "./db";

/**
 * Country for a chapter slug; for Global, the country hub with the most live chapters (today the
 * one where EiB started), so nothing is hard-coded. Throws on failure so failures aren't cached.
 */
async function loadCountry(slug: string): Promise<string | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("chapters");
  const db = getDb();
  if (slug !== GLOBAL_CHAPTER) {
    const chapter = await db.chapter.findUnique({ where: { slug }, select: { countryCode: true } });
    if (chapter) return chapter.countryCode;
  }
  const [top] = await db.chapter.groupBy({
    by: ["countryCode"],
    where: { status: "live" },
    _count: { _all: true },
    orderBy: { _count: { countryCode: "desc" } },
    take: 1,
  });
  return top?.countryCode ?? null;
}

/** ISO country code whose hero panorama to show, or null (world design). */
export async function getHeroCountry(): Promise<string | null> {
  // Read the cookie outside try: during prerender it must bail out (Suspense), not be swallowed.
  const slug = await getPreferredChapterSlug();
  try {
    return await loadCountry(slug);
  } catch (error) {
    console.error("[hero] country lookup failed, showing the world design:", error);
    return null;
  }
}
