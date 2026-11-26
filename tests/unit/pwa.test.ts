import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";
import { colorTokens } from "@/lib/design/tokens";
import { locales } from "@/lib/i18n/routing";
import { parseSavedTickets } from "@/lib/pwa/private-cache";
import {
  assetUrlsIn,
  CACHE_NAMES,
  localeOfPath,
  offlinePathFor,
  offlinePaths,
  strategyFor,
} from "@/lib/pwa/rules";

const ORIGIN = "https://eib.test";
const get = (pathname: string, extra: { mode?: string; headers?: Record<string, string> } = {}) =>
  strategyFor(
    new URL(pathname, ORIGIN),
    {
      method: "GET",
      mode: extra.mode ?? "no-cors",
      headers: { get: (name) => extra.headers?.[name.toLowerCase()] ?? null },
    },
    ORIGIN,
  );

describe("service worker caching rules", () => {
  it("answers page navigations itself so it can fall back offline", () => {
    expect(get("/events", { mode: "navigate" })).toBe("navigate");
    expect(get("/pl/tickets/abc", { mode: "navigate" })).toBe("navigate");
  });

  it("keeps hashed build files and images in cache", () => {
    expect(get("/_next/static/chunks/app.js")).toBe("cache-first");
    expect(get("/_next/image")).toBe("stale-while-revalidate");
    expect(get("/brand/eib-logo.png")).toBe("stale-while-revalidate");
    expect(get("/icons/icon-192.png")).toBe("stale-while-revalidate");
  });

  it("never touches API calls, payments, data requests, writes or other origins", () => {
    expect(get("/api/checkin", { mode: "navigate" })).toBe("pass");
    expect(get("/api/auth/get-session")).toBe("pass");
    expect(get("/events", { headers: { rsc: "1" } })).toBe("pass");
    expect(get("/events", { headers: { "next-router-prefetch": "1" } })).toBe("pass");
    expect(
      strategyFor(
        new URL("/x", ORIGIN),
        { method: "POST", mode: "same-origin", headers: { get: () => null } },
        ORIGIN,
      ),
    ).toBe("pass");
    expect(
      strategyFor(
        new URL("https://checkout.stripe.com/pay", ORIGIN),
        { method: "GET", mode: "navigate", headers: { get: () => null } },
        ORIGIN,
      ),
    ).toBe("pass");
    expect(get("/sw.js")).toBe("pass");
  });

  it("picks the offline page for the language of the path", () => {
    expect(offlinePathFor("/events", locales, "en")).toBe("/offline");
    expect(offlinePathFor("/pl/events", locales, "en")).toBe("/pl/offline");
    expect(offlinePathFor("/uk", locales, "en")).toBe("/uk/offline");
    // The default locale has no prefix, whichever locale that is.
    expect(offlinePathFor("/pl/events", locales, "pl")).toBe("/offline");
    expect(localeOfPath("/en/events", locales, "en")).toBeNull();
  });

  it("precaches one offline page per language, with no redirecting URL", () => {
    expect(offlinePaths(locales, "en")).toEqual(["/offline", "/pl/offline", "/uk/offline"]);
    expect(offlinePaths(locales, "pl")).toEqual(["/en/offline", "/offline", "/uk/offline"]);
  });

  it("finds the scripts, styles and fonts an HTML page needs", () => {
    const html =
      '<link rel="stylesheet" href="/_next/static/chunks/a.css"/><script src="/_next/static/chunks/b.js" async></script>' +
      '<script>self.__next_f.push(["\\/_next\\/static\\/x"])</script><script src="/_next/static/chunks/b.js"></script>' +
      '<link rel="preload" href="/_next/static/media/font.woff2" as="font"/>';
    expect(assetUrlsIn(html)).toEqual([
      "/_next/static/chunks/a.css",
      "/_next/static/chunks/b.js",
      "/_next/static/media/font.woff2",
    ]);
  });

  it("keeps the private cache out of version bumps", () => {
    expect(CACHE_NAMES.private).not.toContain(CACHE_NAMES.shell);
    expect(Object.values(CACHE_NAMES)).toHaveLength(new Set(Object.values(CACHE_NAMES)).size);
  });

  it("bundles the same languages the app supports", () => {
    const script = readFileSync(path.resolve(__dirname, "../../scripts/build-sw.mjs"), "utf8");
    const listed = /const locales = (\[[^\]]*\])/.exec(script)?.[1] ?? "[]";
    expect(JSON.parse(listed)).toEqual([...locales]);
  });
});

describe("web app manifest", () => {
  const app = manifest();

  it("is installable: name, standalone display, start page and 192/512 icons", () => {
    expect(app.name).toBeTruthy();
    expect(app.short_name?.length).toBeLessThanOrEqual(12);
    expect(app.display).toBe("standalone");
    expect(app.start_url).toMatch(/^\//);
    const sizes = (app.icons ?? []).map((icon) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    expect((app.icons ?? []).some((icon) => icon.purpose === "maskable")).toBe(true);
  });

  it("uses brand tokens for its colours", () => {
    expect(app.theme_color).toBe(colorTokens["brand-950"]);
    expect(app.background_color).toBe(colorTokens.canvas);
  });

  it("points every icon and shortcut at something that exists", () => {
    for (const icon of app.icons ?? []) {
      expect(() =>
        readFileSync(path.resolve(__dirname, "../../public", `.${icon.src}`)),
      ).not.toThrow();
    }
    expect(app.shortcuts?.length).toBeGreaterThan(0);
    for (const shortcut of app.shortcuts ?? []) expect(shortcut.url).toMatch(/^\//);
  });
});

describe("saved tickets list", () => {
  const entry = {
    path: "/tickets/a",
    title: "Founders breakfast",
    startsAt: "2026-12-01T08:00:00.000Z",
    when: "1 Dec 2026, 09:00",
    expiresAt: 2_000,
  };

  it("keeps live entries, soonest event first", () => {
    const later = { ...entry, path: "/tickets/b", startsAt: "2026-12-05T08:00:00.000Z" };
    const raw = JSON.stringify([later, entry]);
    expect(parseSavedTickets(raw, 1_000).map((item) => item.path)).toEqual([
      "/tickets/a",
      "/tickets/b",
    ]);
  });

  it("drops expired, malformed and off-site entries", () => {
    const raw = JSON.stringify([
      { ...entry, expiresAt: 500 },
      { ...entry, path: "https://evil.example/x" },
      { title: "no path" },
      "nonsense",
    ]);
    expect(parseSavedTickets(raw, 1_000)).toEqual([]);
    expect(parseSavedTickets("{not json", 1_000)).toEqual([]);
    expect(parseSavedTickets(null, 1_000)).toEqual([]);
  });
});
