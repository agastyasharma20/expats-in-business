import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Set E2E_EXPECT_DB=true where a migrated database is available (CI, local after setup).
const expectDb = process.env.E2E_EXPECT_DB === "true";

test.describe("Milestone 1 home", () => {
  test("loads with no console errors @smoke", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("EiB platform: Milestone 1");
    await expect(page.getByTestId("db-status")).toBeVisible();
    if (expectDb) await expect(page.getByTestId("db-status")).toHaveAttribute("data-db", "up");
    expect(errors).toEqual([]);
  });

  test("has no serious accessibility violations @a11y", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("db-status")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

test("health endpoint reports status and database @smoke", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { status: string; db: boolean };
  expect(body.status).toBe("ok");
  expect(typeof body.db).toBe("boolean");
  if (expectDb) expect(body.db).toBe(true);
});
