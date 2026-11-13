import type { MetadataRoute } from "next";

import { allGuides } from "@/lib/content/guide-index";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { locales, routing } from "@/lib/i18n/routing";

const STATIC_PATHS = [
  "/",
  "/events",
  "/events/formats",
  "/festivals",
  "/members",
  "/providers",
  "/providers/verification-criteria",
  "/businesses",
  "/bubbles",
  "/guides",
  "/pricing",
  "/pricing/corporate",
  "/chapters",
  "/get-involved",
  "/help",
  "/legal/privacy",
  "/legal/terms",
  "/legal/cookies",
];

/** URL of a path in a locale ("as-needed" prefix: the default locale has none). */
function localized(base: string, path: string, locale: string): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return new URL(`${prefix}${path === "/" && prefix ? "" : path}`, base).toString();
}

function entry(base: string, path: string, lastModified?: Date): MetadataRoute.Sitemap[number] {
  return {
    url: localized(base, path, routing.defaultLocale),
    lastModified,
    alternates: {
      languages: Object.fromEntries(locales.map((l) => [l, localized(base, path, l)])),
    },
  };
}

/**
 * Sitemap with language alternates: static public pages, guides, upcoming published sessions and
 * festivals, and Bubbles. Member profiles are left out (their owners control visibility).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getEnv().APP_URL;
  const now = new Date();
  const db = getDb();
  const [guides, events, bubbles] = await Promise.all([
    allGuides().catch(() => []),
    db.event
      .findMany({
        where: { status: "published", endsAt: { gte: now } },
        select: { slug: true, kind: true, updatedAt: true },
        take: 500,
      })
      .catch(() => []),
    db.bubble.findMany({ select: { slug: true, createdAt: true } }).catch(() => []),
  ]);
  return [
    ...STATIC_PATHS.map((path) => entry(base, path)),
    ...guides.map((g) => entry(base, `/guides/${g.slug}`)),
    ...events.map((e) =>
      entry(base, `/${e.kind === "festival" ? "festivals" : "events"}/${e.slug}`, e.updatedAt),
    ),
    ...bubbles.map((b) => entry(base, `/bubbles/${b.slug}`, b.createdAt)),
  ];
}
