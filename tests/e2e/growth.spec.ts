import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { authFile } from "./global-setup";

/**
 * Growth: chapters, country and city pages (India Gate, Rajwada), ambassadors, careers and
 * volunteering; a member applies to be a city ambassador and an admin accepts; a member applies
 * for a role and withdraws. Needs the seeded demo database.
 */
test.skip(process.env.E2E_EXPECT_DB !== "true", "needs the seeded database");

async function axe(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(violations.map((v) => v.id)).toEqual([]);
}

test.describe("public growth pages", () => {
  for (const [path, heading] of [
    ["/chapters", "Chapters around the world"],
    ["/countries/IN", "India"],
    ["/chapters/indore", "Indore"],
    ["/ambassadors", "Represent EiB where you live"],
    ["/careers", "Build EiB with us"],
    ["/volunteer", "Give a few hours, make a big difference"],
  ] as const) {
    test(`${path} renders and passes axe`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await axe(page);
    });
  }

  test("India and Indore show their landmark panoramas", async ({ page }) => {
    await page.goto("/countries/IN");
    await expect(page.locator('svg[data-hero-art="IN"]').first()).toBeVisible();
    await page.goto("/chapters/indore");
    await expect(page.locator('svg[data-hero-art="IN-indore"]').first()).toBeVisible();
    await expect(page.getByTestId("chapter-facts")).toBeVisible();
  });

  test("the festival spotlight links to the next festival", async ({ page }) => {
    await page.goto("/");
    const banner = page.getByTestId("festival-banner");
    await expect(banner).toBeVisible();
    await banner.getByRole("link").first().click();
    await expect(page).toHaveURL(/\/festivals\//);
  });

  test("careers filter by type and role pages ask guests to sign in", async ({ page }) => {
    await page.goto("/careers?kind=internship");
    const cards = page.getByTestId("role-card");
    await expect(cards.first()).toBeVisible();
    await cards.first().click();
    await expect(page.getByRole("link", { name: "Sign in to apply" })).toBeVisible();
  });
});

test.describe.serial("ambassador application", () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "desktop only"));

  test.describe("member", () => {
    test.use({ storageState: authFile("karim") });
    test("applies as a city ambassador", async ({ page }) => {
      await page.goto("/ambassadors#apply");
      const form = page.getByTestId("ambassador-form");
      await form.getByText("City ambassador").click();
      await form.getByRole("combobox", { name: "Country", exact: true }).selectOption("IN");
      await form.getByRole("textbox", { name: "City", exact: true }).fill("Indore");
      await form
        .getByLabel("Why do you want to be an ambassador?")
        .fill(
          "E2E: I want to welcome internationals in Indore and help the chapter launch with its first sessions.",
        );
      await form
        .getByLabel("Relevant experience")
        .fill("E2E: ran a language exchange for two years.");
      await form.getByRole("button", { name: "Send application" }).click();
      await expect(
        page.getByText(/Your application is in|already have an open application/),
      ).toBeVisible();
    });
  });

  test.describe("admin", () => {
    test.use({ storageState: authFile("admin") });
    test("accepts it on the board", async ({ page }) => {
      await page.goto("/admin/ambassadors");
      const board = page.getByTestId("ambassador-board");
      const card = board
        .locator("li", { hasText: "Indore, India" })
        .filter({ hasText: "Karim" })
        .first();
      await expect(card).toBeVisible();
      await card.getByRole("button", { name: "Accept" }).click();
      await expect(page.getByText("Accepted. The applicant has been told.")).toBeVisible();
      await axe(page);
    });
  });
});

test.describe("role application", () => {
  test.use({ storageState: authFile("priya") });
  test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "desktop only"));

  test("applies for a role and withdraws", async ({ page }) => {
    await page.goto("/careers/demo-content-creator");
    const form = page.getByTestId("role-apply");
    await form
      .getByLabel("Why are you a good fit?")
      .fill("E2E: I make short videos for a community page and have five hours a week.");
    await form.getByRole("button", { name: "Send application" }).click();
    const status = page.getByTestId("role-application");
    await expect(status).toBeVisible();
    await status.getByRole("button", { name: "Withdraw application" }).click();
    await expect(page.getByTestId("role-apply")).toBeVisible();
  });
});
