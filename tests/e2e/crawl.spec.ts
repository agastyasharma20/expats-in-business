import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { locales, routing } from "../../lib/i18n/routing";
import { allInternalHrefs, legalNav } from "../../lib/nav";

// Every nav and footer destination in every locale: no 404s, axe clean, every button does something.
function localized(href: string, locale: string): string {
  if (locale === routing.defaultLocale) return href;
  return href === "/" ? `/${locale}` : `/${locale}${href}`;
}

const pages = allInternalHrefs();

/** Starts counting DOM mutations, ignoring the header's own scroll-state attribute. */
async function watchMutations(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __mutations: number; __observer?: MutationObserver };
    w.__observer?.disconnect();
    w.__mutations = 0;
    w.__observer = new MutationObserver((records) => {
      w.__mutations += records.filter((record) => record.attributeName !== "data-scrolled").length;
    });
    w.__observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
  });
}

async function mutationCount(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __mutations: number }).__mutations);
}

test.describe("nav and footer crawl", () => {
  // Each test visits several pages (three locales, or one reload per button), so it needs more
  // than the default per-test budget when workers share one server.
  test.describe.configure({ timeout: 120_000 });

  for (const href of pages) {
    test(`${href} loads in every locale, axe clean @a11y`, async ({ page }) => {
      for (const locale of locales) {
        const path = localized(href, locale);
        const response = await page.goto(path);
        expect(response?.status(), path).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      }
      await page.goto(href);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
    });

    test(`${href}: every button does something`, async ({ page }) => {
      await page.goto(href);
      const count = await page.locator("button:visible:enabled").count();
      for (let index = 0; index < count; index += 1) {
        await page.goto(href);
        const button = page.locator("button:visible:enabled").nth(index);
        const label = (await button.getAttribute("aria-label")) ?? (await button.innerText());
        const urlBefore = page.url();
        await watchMutations(page);
        await button.click();
        await page.waitForTimeout(400);
        const changed = page.url() !== urlBefore || (await mutationCount(page)) > 0;
        expect(changed, `button "${label.trim()}" on ${href} had no visible effect`).toBe(true);
      }
    });
  }

  test("legal pages contain no raw markdown", async ({ request }) => {
    for (const item of legalNav) {
      const html = await (await request.get(item.href)).text();
      const text = html.replace(/<script[\s\S]*?<\/script>/gi, "");
      expect(text, item.href).not.toContain("##");
      expect(text, item.href).not.toContain("**");
    }
  });

  test("external links in the footer open safely", async ({ page }) => {
    await page.goto("/");
    const external = page.locator('footer a[href^="http"]');
    expect(await external.count()).toBeGreaterThan(4);
    for (const link of await external.all()) {
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
    }
  });

  test("unknown paths show the styled 404 with a way home", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("We couldn't find that page");
    await expect(page.getByRole("main").getByRole("link", { name: "Back to home" })).toBeVisible();
  });
});
