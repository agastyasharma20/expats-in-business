import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** The Guides index groups guides by country; every guide page cites official sources. */
const COUNTRIES: [string, string, number][] = [
  ["pl", "Poland", 8],
  ["in", "India", 5],
  ["lk", "Sri Lanka", 4],
];

const NEW_GUIDES = [
  "in-visas-for-foreigners",
  "in-foreigner-registration",
  "in-tax-residency-aadhaar-gst",
  "in-banking-for-foreigners",
  "in-set-up-a-business",
  "lk-visas-and-eta",
  "lk-tax-tin-and-vat",
  "lk-banking-and-money",
  "lk-start-a-business",
];

test.describe("guides by country", () => {
  test("the index lists Poland, India and Sri Lanka with the right guides", async ({ page }) => {
    await page.goto("/guides");
    for (const [code, name, count] of COUNTRIES) {
      const section = page.getByTestId(`guides-${code}`);
      await expect(section.getByRole("heading", { level: 2, name })).toBeVisible();
      await expect(section.getByTestId("guide-list").getByRole("listitem")).toHaveCount(count);
    }
  });

  test("the index is accessible and fits a phone", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/guides");
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    ).toBe(false);
  });

  for (const slug of NEW_GUIDES) {
    test(`/guides/${slug} shows its date, official sources and is accessible`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      const response = await page.goto(`/guides/${slug}`);
      expect(response?.status()).toBe(200);
      await expect(page.getByTestId("last-verified")).toContainText("November 27, 2026");
      await expect(page.getByTestId("disclaimer")).toContainText("not legal advice");
      const links = page.getByTestId("sources").getByRole("link");
      expect(await links.count()).toBeGreaterThan(0);
      for (const link of await links.all()) {
        await expect(link).toHaveAttribute("href", /^https:\/\//);
        await expect(link).toHaveAttribute("rel", /noopener/);
      }
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
        .analyze();
      expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }
});
