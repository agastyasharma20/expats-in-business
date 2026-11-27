import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** One-click sandbox sign-in (DEMO_MODE only). Needs the seeded demo database. */
test.describe("one-click demo sign-in", () => {
  test.skip(process.env.E2E_EXPECT_DB !== "true", "needs the seeded database");

  test("clicking a name signs in straight away", async ({ page }) => {
    await page.goto("/sign-in");
    const panel = page.getByTestId("demo-login");
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("listitem")).toHaveCount(6);
    await page.getByTestId("demo-priya").click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("button", { name: /Priya/ }).first()).toBeVisible();
  });

  test("works with the keyboard alone", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByTestId("demo-karim").focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("keeps the return path", async ({ page }) => {
    await page.goto("/sign-in?next=/events");
    await page.getByTestId("demo-priya").click();
    await expect(page).toHaveURL(/\/events/);
  });

  test("the admin card opens the admin area", async ({ page }) => {
    await page.goto("/sign-in?next=/admin");
    await page.getByTestId("demo-admin").click();
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByRole("navigation", { name: "Admin sections" })).toBeVisible();
  });

  test("is accessible, fits a phone and respects reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/sign-in");
    await expect(page.getByTestId("demo-login")).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
    // Every card is a real, named, 44px-high control.
    for (const card of await page.getByTestId("demo-login").getByRole("button").all()) {
      await expect(card).toHaveAccessibleName(/Use .*@demo\.eib\.local/);
      const box = await card.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });
});
