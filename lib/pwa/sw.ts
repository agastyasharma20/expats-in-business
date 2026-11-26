/**
 * EiB service worker. Bundled to public/sw.js by scripts/build-sw.mjs (never edit that file).
 *
 * What it does, and nothing more:
 *  - precaches one friendly offline page per language;
 *  - serves a ticket the member saved on this device when the network is gone or very slow;
 *  - keeps build files, logos and optimised images so repeat visits are fast.
 * It never stores API responses, sign-in pages or anything for another member.
 */
import {
  assetUrlsIn,
  CACHE_LIMITS,
  CACHE_NAMES,
  offlinePathFor,
  offlinePaths,
  strategyFor,
} from "./rules";

declare const __EIB_LOCALES__: string[];
declare const __EIB_DEFAULT_LOCALE__: string;

type ExtendableEvent = Event & { waitUntil(promise: Promise<unknown>): void };
type FetchEvent = ExtendableEvent & {
  request: Request;
  preloadResponse: Promise<Response | undefined>;
  respondWith(response: Promise<Response> | Response): void;
};
type MessageEvent = ExtendableEvent & { data: unknown };

type WorkerScope = {
  addEventListener(type: "install" | "activate", listener: (event: ExtendableEvent) => void): void;
  addEventListener(type: "fetch", listener: (event: FetchEvent) => void): void;
  addEventListener(type: "message", listener: (event: MessageEvent) => void): void;
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
  registration: { navigationPreload?: { enable(): Promise<void> } };
  location: Location;
};

const worker = self as unknown as WorkerScope;
const LOCALES = __EIB_LOCALES__;
const DEFAULT_LOCALE = __EIB_DEFAULT_LOCALE__;
/** A saved ticket beats a slow network: after this long, the saved copy is shown. */
const SLOW_NETWORK_MS = 4000;

const KEEP = new Set<string>(Object.values(CACHE_NAMES));

worker.addEventListener("install", (event) => {
  // No skipWaiting here: an update waits until the member taps "Reload" (see PwaRegistrar).
  event.waitUntil(precache());
});

worker.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => !KEEP.has(name)).map((name) => caches.delete(name)));
      await worker.registration.navigationPreload?.enable();
      await worker.clients.claim();
    })(),
  );
});

worker.addEventListener("message", (event) => {
  const data = event.data as { type?: string } | null;
  if (data?.type === "SKIP_WAITING") event.waitUntil(worker.skipWaiting());
});

worker.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const strategy = strategyFor(url, event.request, worker.location.origin);
  if (strategy === "pass") return;
  if (strategy === "navigate") event.respondWith(handleNavigation(event, url));
  else if (strategy === "cache-first") event.respondWith(cacheFirst(event.request));
  else event.respondWith(staleWhileRevalidate(event, CACHE_NAMES.media, CACHE_LIMITS.media));
});

async function precache() {
  const shell = await caches.open(CACHE_NAMES.shell);
  const statics = await caches.open(CACHE_NAMES.static);
  for (const path of offlinePaths(LOCALES, DEFAULT_LOCALE)) {
    try {
      const response = await fetch(path, { cache: "reload" });
      // A redirected response cannot be used to answer a navigation.
      if (!response.ok || response.redirected) continue;
      const html = await response.clone().text();
      await shell.put(path, response);
      await Promise.all(
        assetUrlsIn(html).map(async (asset) => {
          try {
            const file = await fetch(asset);
            if (file.ok) await statics.put(asset, file);
          } catch {
            // One missing file only makes that part of the offline page plainer.
          }
        }),
      );
    } catch {
      // Offline during install: the next update tries again.
    }
  }
}

async function handleNavigation(event: FetchEvent, url: URL): Promise<Response> {
  const privateCache = await caches.open(CACHE_NAMES.private);
  const saved = await privateCache.match(url.pathname, { ignoreSearch: true, ignoreVary: true });
  try {
    const preloaded = await event.preloadResponse;
    if (preloaded) return preloaded;
    const network = fetch(event.request);
    if (!saved) return await network;
    return await Promise.race([
      network,
      new Promise<Response>((resolve) => setTimeout(() => resolve(saved), SLOW_NETWORK_MS)),
    ]);
  } catch {
    if (saved) return saved;
    const shell = await caches.open(CACHE_NAMES.shell);
    const page = await shell.match(offlinePathFor(url.pathname, LOCALES, DEFAULT_LOCALE));
    return page ?? Response.error();
  }
}

async function cacheFirst(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAMES.static);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    await trim(cache, CACHE_LIMITS.static);
  }
  return response;
}

async function staleWhileRevalidate(
  event: FetchEvent,
  cacheName: string,
  limit: number,
): Promise<Response> {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(event.request);
  const refresh = fetch(event.request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(event.request, response.clone());
        await trim(cache, limit);
      }
      return response;
    })
    .catch(() => undefined);
  if (hit) {
    event.waitUntil(refresh);
    return hit;
  }
  return (await refresh) ?? Response.error();
}

/** Keeps a cache bounded: the oldest entries go first. */
async function trim(cache: Cache, max: number) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((key) => cache.delete(key)));
}
