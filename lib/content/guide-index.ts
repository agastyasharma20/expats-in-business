import "server-only";

import { readdir } from "node:fs/promises";
import path from "node:path";

import { cacheLife, cacheTag } from "next/cache";

import { getDb } from "@/lib/db";

import { listGuides, type GuideFile } from "./guides";

const GUIDES_DIR = path.join(process.cwd(), "content", "guides");

/** Country folders that have guides (lowercase ISO codes, e.g. "pl"). */
export async function guideCountries(): Promise<string[]> {
  const entries = await readdir(GUIDES_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

/** All guides of all countries, cached (content changes ship with a deploy). */
export async function allGuides(): Promise<GuideFile[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("guides");
  const countries = await guideCountries();
  return (await Promise.all(countries.map((c) => listGuides(c)))).flat();
}

/** Official source URL → its title, for the concierge source chips. */
export async function sourceTitles(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const guide of await allGuides())
    for (const s of guide.frontmatter.sources) map.set(s.url, s.title);
  return map;
}

/**
 * Which country's guides answer a member: their home chapter's country, otherwise the country with
 * the most guides (never a hard-coded code).
 */
export async function conciergeCountry(userId: string): Promise<string> {
  const profile = await getDb().profile.findUnique({
    where: { userId },
    select: { homeChapter: { select: { countryCode: true } } },
  });
  if (profile?.homeChapter?.countryCode) return profile.homeChapter.countryCode;
  const guides = await allGuides();
  const counts = new Map<string, number>();
  for (const g of guides)
    counts.set(g.frontmatter.countryCode, (counts.get(g.frontmatter.countryCode) ?? 0) + 1);
  // No guides anywhere: an empty code retrieves nothing, so the concierge hands off.
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}
