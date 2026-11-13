import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

import { locales, routing } from "@/lib/i18n/routing";

/** Path in a locale with the "as-needed" prefix (the default locale has none). */
export function localizedPath(path: string, locale: string): string {
  if (locale === routing.defaultLocale) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/** hreflang map for a path: every locale plus x-default (pure, unit-tested). */
export function languageAlternates(path: string): Record<string, string> {
  return {
    ...Object.fromEntries(locales.map((l) => [l, localizedPath(path, l)])),
    "x-default": localizedPath(path, routing.defaultLocale),
  };
}

/**
 * Adds the canonical URL (this locale's version) and hreflang alternates to a page's metadata,
 * plus matching Open Graph URL and locale. Relative URLs resolve against metadataBase (APP_URL).
 */
export async function withAlternates(path: string, metadata: Metadata): Promise<Metadata> {
  const locale = await getLocale();
  const canonical = localizedPath(path, locale);
  return {
    ...metadata,
    alternates: { canonical, languages: languageAlternates(path) },
    openGraph: {
      type: "website",
      siteName: "Expats in Business",
      locale,
      url: canonical,
      ...(typeof metadata.title === "string" && { title: metadata.title }),
      ...(metadata.description && { description: metadata.description }),
      ...metadata.openGraph,
    },
  };
}
