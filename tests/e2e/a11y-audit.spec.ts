import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { allInternalHrefs } from "../../lib/nav";

import { authFile, type PERSONAS } from "./global-setup";

/**
 * Strict accessibility audit. Unlike the crawler (serious and critical only, WCAG 2.1), this fails on
 * ANY axe violation of ANY impact, against WCAG 2.0, 2.1 and 2.2 level A and AA plus axe's
 * best-practice rules, for visitors and for signed-in members, providers and admins.
 * Automated rules cover part of WCAG; the keyboard and structure checks below cover more.
 */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

const PUBLIC_EXTRA = ["/sign-in", "/offline", "/help", "/legal/privacy", "/legal/terms"];
const MEMBER = [
  "/dashboard",
  "/roadmap",
  "/concierge",
  "/connections",
  "/notifications",
  "/my/events",
  "/my/businesses",
  "/settings/profile",
  "/settings/account",
  "/settings/email",
  "/settings/billing",
  "/settings/privacy",
];
const ADMIN = [
  "/admin",
  "/admin/chapters",
  "/admin/events",
  "/admin/members",
  "/admin/team",
  "/admin/roles",
  "/admin/audit",
  "/admin/system",
  "/admin/settings",
  "/admin/providers",
  "/admin/festivals",
  "/admin/applications",
  "/admin/catalogs",
  "/admin/ambassadors",
  "/admin/roulette",
];
const PROVIDER = ["/provider/inbox", "/provider/analytics"];

async function audit(page: Page, path: string) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const response = await page.goto(path);
  expect(response?.status(), path).toBeLessThan(400);
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const lines = results.violations.map(
    (v) =>
      `${v.id} [${v.impact}]: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.target.join(" ")}`,
  );
  expect(lines, path).toEqual([]);
  // Structure: a language, a title, one h1, a main landmark.
  await expect(page.locator("html")).toHaveAttribute("lang", /^[a-z]{2}/);
  expect((await page.title()).trim().length, `${path} title`).toBeGreaterThan(0);
  expect(await page.getByRole("heading", { level: 1 }).count(), `${path} h1`).toBe(1);
  expect(await page.getByRole("main").count(), `${path} main`).toBe(1);
}

function group(name: string, paths: string[], persona?: keyof typeof PERSONAS) {
  test.describe(name, () => {
    test.describe.configure({ timeout: 90_000 });
    if (persona) {
      test.skip(process.env.E2E_EXPECT_DB !== "true", "needs the seeded database");
      test.use({ storageState: authFile(persona) });
    }
    for (const path of paths) {
      test(`${path} has no violations`, async ({ page }) => {
        await audit(page, path);
      });
    }
  });
}

group("visitor", [...new Set([...allInternalHrefs(), ...PUBLIC_EXTRA])]);
group("member", MEMBER, "priya");
group("admin", ADMIN, "admin");
group("provider", PROVIDER, "marta");

test.describe("keyboard", () => {
  test("the first Tab stop is the skip link and it lands on the main content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("every focused control on the home page shows a visible focus ring", async ({ page }) => {
    await page.goto("/");
    const missing: string[] = [];
    for (let i = 0; i < 25; i += 1) {
      await page.keyboard.press("Tab");
      await page.waitForTimeout(300); // let the 150 ms focus transition finish
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        // The ring may sit on the control or, for whole-card links, on an ancestor (focus-within).
        const shows = (node: Element) => {
          const s = getComputedStyle(node);
          return (
            (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none"
          );
        };
        let ok = false;
        for (let node: Element | null = el, depth = 0; node && depth < 4; depth += 1) {
          ok = ok || shows(node);
          node = node.parentElement;
        }
        return {
          label: (el.getAttribute("aria-label") ?? el.textContent ?? el.tagName)
            .trim()
            .slice(0, 40),
          ok,
        };
      });
      if (info && !info.ok) missing.push(info.label);
    }
    expect(missing).toEqual([]);
  });

  test("the page can be zoomed to 200% without horizontal scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 800 }); // 1280px at 200%
    for (const path of ["/", "/events", "/pricing", "/sign-in"]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflow, path).toBe(false);
    }
  });
});
