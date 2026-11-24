import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { authFile } from "./global-setup";

/** About, Partners, Stories (public, facts-only) and the admin chapter-launch form. */
async function expectCleanPage(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(violations.map((v) => v.id)).toEqual([]);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
}

test.describe("public story pages", () => {
  test("About states only verified facts and links their sources", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("new country home");
    await expect(page.getByText("Ziyan Sinnen")).toBeVisible();
    await expect(page.getByTestId("about-formats").getByRole("listitem")).toHaveCount(5);
    const milestones = page.getByTestId("about-milestones").getByRole("listitem");
    await expect(milestones).toHaveCount(4);
    await expect(milestones.first()).toContainText("27 Mar 2025");
    await expect(page.getByText("Joint meetup with InterNations")).toBeVisible();
    // Every source link opens in a new tab, safely.
    for (const link of await page.getByRole("link", { name: /^Source/ }).all()) {
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
    }
    await expectCleanPage(page);
    expect(errors).toEqual([]);
  });

  test("Partners shows what is confirmed and a designed empty state for logos", async ({
    page,
  }) => {
    await page.goto("/partners");
    await expect(page.getByRole("heading", { level: 1, name: "Working together" })).toBeVisible();
    await expect(page.getByTestId("partner-collaboration")).toContainText("InterNations");
    await expect(page.getByText("Partner logos appear here, with permission")).toBeVisible();
    await expect(page.getByTestId("partner-ways").getByRole("listitem")).toHaveCount(3);
    for (const link of await page.getByRole("link", { name: "Become a partner" }).all()) {
      await expect(link).toHaveAttribute("href", "/help");
    }
    await expectCleanPage(page);
  });

  test("Stories labels its episodes as placeholders and links the real channel", async ({
    page,
  }) => {
    await page.goto("/stories");
    await expect(page.getByTestId("story-episodes").getByText("Placeholder episode")).toHaveCount(
      3,
    );
    const watch = page.getByRole("link", { name: /Watch on YouTube/ });
    await expect(watch).toHaveAttribute("href", "https://www.youtube.com/@expatsinbusiness");
    await expectCleanPage(page);
  });

  test("the three pages are reachable from the footer and translated", async ({ page }) => {
    await page.goto("/");
    for (const [name, path] of [
      ["About", "/about"],
      ["Stories", "/stories"],
      ["Partners", "/partners"],
    ] as const) {
      await expect(page.locator("footer").getByRole("link", { name, exact: true })).toHaveAttribute(
        "href",
        path,
      );
    }
    await page.goto("/pl/about");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("nowym kraju");
  });
});

test.describe("chapter launch", () => {
  test.skip(process.env.E2E_EXPECT_DB !== "true", "needs the seeded database");
  test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "desktop only"));
  test.describe.configure({ mode: "serial" });

  const city = `E2E Testville ${Date.now().toString(36)}`;
  const slug = city.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  test.describe("members", () => {
    test.use({ storageState: authFile("karim") });
    test("cannot open the launch form", async ({ page }) => {
      await page.goto("/admin/chapters");
      await expect(page.getByTestId("chapter-launch")).toHaveCount(0);
    });
  });

  test.describe("admin", () => {
    test.use({ storageState: authFile("admin") });

    test("launches a city with country defaults, promotes it, and refuses a duplicate", async ({
      page,
    }) => {
      await page.goto("/admin/chapters");
      await expect(page.getByTestId("admin-chapters")).toBeVisible();
      const form = page.getByTestId("chapter-launch");
      await form.getByLabel("City").fill(city);
      await form.locator(`select[name="countryCode"]`).selectOption({ label: "Poland" });
      await form.getByRole("button", { name: "Launch chapter" }).click();
      await expect(page.getByText(`${city} is launched.`)).toBeVisible();

      const row = page.getByTestId("admin-chapter").filter({ hasText: city });
      await expect(row).toContainText("Launching");
      // Time zone and currency came from the country, not from the form.
      await expect(row).toContainText("Europe/Warsaw");
      await expect(row).toContainText("PLN");

      // It is public straight away, with no deploy.
      await page.goto(`/chapters/${slug}`);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(city);

      await page.goto("/admin/chapters");
      await page.getByTestId(`chapter-${slug}-live`).click();
      await expect(page.getByTestId("admin-chapter").filter({ hasText: city })).toContainText(
        "Live",
      );

      // Same city again: refused with a clear message.
      const again = page.getByTestId("chapter-launch");
      await again.getByLabel("City").fill(city);
      await again.locator(`select[name="countryCode"]`).selectOption({ label: "Poland" });
      await again.getByRole("button", { name: "Launch chapter" }).click();
      await expect(page.getByText("A chapter for this city already exists.")).toBeVisible();
    });

    test("an unknown chapter lead email is refused and creates nothing", async ({ page }) => {
      const other = `E2E Nowhere ${Date.now().toString(36)}`;
      await page.goto("/admin/chapters");
      const form = page.getByTestId("chapter-launch");
      await form.getByLabel("City").fill(other);
      await form.locator(`select[name="countryCode"]`).selectOption({ label: "Poland" });
      await form.getByLabel(/Chapter lead email/).fill("nobody-here@example.com");
      await form.getByRole("button", { name: "Launch chapter" }).click();
      await expect(page.getByText("No member has that email address.")).toBeVisible();
      await expect(page.getByTestId("admin-chapters")).not.toContainText(other);
    });
  });
});
