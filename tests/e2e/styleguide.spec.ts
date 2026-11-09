import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// /styleguide exists in development and demo mode (CI runs with DEMO_MODE=true).
test.describe("styleguide", () => {
  test("loads at an unprefixed URL with no console errors @smoke", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    // Unprefixed path: guards the proxy matcher regression (only "/" used to be locale-routed).
    const response = await page.goto("/styleguide");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("EiB design system");
    expect(errors).toEqual([]);
  });

  test("every text/background pair passes its contrast level", async ({ page }) => {
    await page.goto("/styleguide");
    const rows = page.getByTestId("contrast-row");
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(20);
    await expect(page.locator('[data-testid="contrast-row"][data-pass="false"]')).toHaveCount(0);
  });

  test("has no serious accessibility violations @a11y", async ({ page }) => {
    await page.goto("/styleguide");
    await expect(page.getByTestId("contrast-row").first()).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
  });

  test("does not scroll sideways", async ({ page }) => {
    await page.goto("/styleguide");
    await expect(page.getByTestId("contrast-row").first()).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("example buttons explain themselves instead of doing nothing", async ({ page }) => {
    await page.goto("/styleguide");
    await page.getByRole("button", { name: "Join free" }).first().click();
    await expect(page.getByText(/does nothing here/)).toBeVisible();
  });

  test("shows final values immediately with reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/styleguide#motion");
    await expect(page.getByTestId("stat-counter-value")).toHaveText("35+");
  });
});
