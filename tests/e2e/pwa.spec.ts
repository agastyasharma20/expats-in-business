import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Installable app: manifest, icons, offline page and the service worker. The worker only registers
 * in production builds, so the offline test runs against `npm run build && npm start` (CI does).
 */
const PRODUCTION = Boolean(process.env.CI) || process.env.E2E_PRODUCTION === "true";

async function expectNoAxeViolations(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(violations.map((v) => v.id)).toEqual([]);
}

test.describe("installable app", () => {
  test("the manifest is linked and every icon it names loads", async ({ page, request }) => {
    await page.goto("/");
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(href).toBeTruthy();
    const response = await request.get(href!);
    expect(response.ok()).toBe(true);
    const manifest = await response.json();
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === "maskable")).toBe(
      true,
    );
    for (const icon of manifest.icons as { src: string; type: string }[]) {
      const file = await request.get(icon.src);
      expect(file.ok(), icon.src).toBe(true);
      expect(file.headers()["content-type"]).toContain(icon.type);
    }
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", /#/);
  });

  test("the worker script is served fresh, as JavaScript", async ({ request }) => {
    const response = await request.get("/sw.js");
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("javascript");
    expect(response.headers()["cache-control"]).toContain("no-cache");
  });

  test("the offline page is designed, accessible and offers a next step", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto("/offline");
    await expect(page.getByRole("heading", { level: 1, name: "You're offline" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" }).first()).toBeVisible();
    // No ticket saved in a fresh browser: a designed empty state, not a blank list.
    await expect(page.getByRole("heading", { name: "No saved tickets yet" })).toBeVisible();
    await expectNoAxeViolations(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
    expect(errors).toEqual([]);
  });

  test("the offline page lists tickets saved on this device", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "eib:saved-tickets",
        JSON.stringify([
          {
            path: "/tickets/demo-ticket",
            title: "Demo breakfast",
            startsAt: "2099-01-01T08:00:00.000Z",
            when: "1 Jan 2099, 09:00",
            expiresAt: Date.now() + 86_400_000,
          },
        ]),
      );
    });
    await page.goto("/offline");
    const link = page.getByRole("link", { name: /Demo breakfast/ });
    await expect(link).toHaveAttribute("href", "/tickets/demo-ticket");
    await expectNoAxeViolations(page);
  });

  test("the Polish offline page is translated", async ({ page }) => {
    await page.goto("/pl/offline");
    await expect(page.getByRole("heading", { level: 1, name: "Jesteś offline" })).toBeVisible();
  });
});

test.describe("service worker", () => {
  test.skip(!PRODUCTION, "the worker registers in production builds only");
  test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "desktop only"));

  test("shows the offline page for a page that cannot load, then recovers", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    // Wait until the worker controls the page and has finished precaching.
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true);
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const names = await caches.keys();
          for (const name of names) {
            if (await (await caches.open(name)).match("/offline")) return true;
          }
          return false;
        }),
      )
      .toBe(true);

    await context.setOffline(true);
    await page.goto("/events");
    await expect(page.getByRole("heading", { level: 1, name: "You're offline" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "You're offline" })).toBeVisible();

    await context.setOffline(false);
    await expect(page.getByRole("heading", { level: 1, name: "Sessions" })).toBeVisible({
      timeout: 15_000,
    });
  });
});
