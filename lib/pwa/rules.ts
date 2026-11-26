/**
 * Caching rules for the service worker, kept free of browser globals so they can be unit tested.
 * lib/pwa/sw.ts applies them; scripts/build-sw.mjs bundles both into public/sw.js.
 */
export const SW_VERSION = "v1";

export const CACHE_NAMES = {
  /** The offline page and the scripts and styles it needs. Replaced on every version bump. */
  shell: `eib-shell-${SW_VERSION}`,
  /** Content-hashed build files: safe to serve from cache forever. */
  static: `eib-static-${SW_VERSION}`,
  /** Optimised images, logos and fonts: served from cache, refreshed in the background. */
  media: `eib-media-${SW_VERSION}`,
  /**
   * Tickets a member opened on this device. Written only by the ticket page (lib/pwa/private-cache.ts),
   * wiped on sign-out, and never touched by version bumps.
   */
  private: "eib-private-v1",
} as const;

export const CACHE_LIMITS = { static: 120, media: 80 } as const;

export type Strategy = "navigate" | "cache-first" | "stale-while-revalidate" | "pass";

type RequestLike = {
  method: string;
  mode: string;
  headers: { get(name: string): string | null };
};

const MEDIA_EXTENSION = /\.(?:png|jpe?g|webp|avif|svg|ico|woff2?)$/i;

/** Decides how the worker answers a request. Anything not listed here goes straight to the network. */
export function strategyFor(url: URL, request: RequestLike, origin: string): Strategy {
  if (request.method !== "GET" || url.origin !== origin) return "pass";
  const { pathname } = url;
  // Never touch API calls (auth, payments, check-in) or Next's data requests.
  if (pathname.startsWith("/api/")) return "pass";
  if (request.headers.get("rsc") || request.headers.get("next-router-prefetch")) return "pass";
  if (request.mode === "navigate") return "navigate";
  if (pathname.startsWith("/_next/static/")) return "cache-first";
  if (pathname === "/_next/image") return "stale-while-revalidate";
  if (
    (pathname.startsWith("/brand/") ||
      pathname.startsWith("/icons/") ||
      pathname.startsWith("/maps/")) &&
    MEDIA_EXTENSION.test(pathname)
  ) {
    return "stale-while-revalidate";
  }
  return "pass";
}

/** The locale prefix of a path, or null for the default locale (prefix "as-needed"). */
export function localeOfPath(pathname: string, locales: readonly string[], defaultLocale: string) {
  const first = pathname.split("/")[1] ?? "";
  return locales.includes(first) && first !== defaultLocale ? first : null;
}

/** Offline page for a path: `/offline` for the default locale, `/pl/offline` and so on. */
export function offlinePathFor(
  pathname: string,
  locales: readonly string[],
  defaultLocale: string,
): string {
  const locale = localeOfPath(pathname, locales, defaultLocale);
  return locale ? `/${locale}/offline` : "/offline";
}

/** Every offline page worth precaching, one per locale. */
export function offlinePaths(locales: readonly string[], defaultLocale: string): string[] {
  return locales.map((locale) => (locale === defaultLocale ? "/offline" : `/${locale}/offline`));
}

/** Build files (scripts, styles, fonts) an HTML document refers to, so they can be precached. */
export function assetUrlsIn(html: string): string[] {
  const found = html.match(/\/_next\/static\/[^"'\s)\\<>]+\.(?:js|css|woff2?)/g) ?? [];
  return [...new Set(found)];
}
