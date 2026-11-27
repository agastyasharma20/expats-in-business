import { expect, test } from "@playwright/test";

import { authFile } from "./global-setup";

/**
 * Denied pages render the styled "no access" page and stay out of search indexes. The HTTP status
 * stays 200: Next only sends 403 before streaming starts, and the shell streams first
 * (docs: file-conventions/forbidden). The page must never be a 404, which hid this once.
 */
test.describe("denied pages", () => {
  test.skip(process.env.E2E_EXPECT_DB !== "true", "needs the seeded database");
  test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "desktop only"));

  test.describe("member", () => {
    test.use({ storageState: authFile("karim") });
    for (const path of ["/admin", "/admin/chapters", "/provider/inbox"]) {
      test(`${path} shows the no-access page`, async ({ page }) => {
        const response = await page.goto(path);
        expect(response?.status()).not.toBe(404);
        await expect(
          page.getByRole("heading", { level: 1, name: "You don't have access to this page" }),
        ).toBeVisible();
        expect(
          await page.locator('meta[name="robots"][content*="noindex"]').count(),
        ).toBeGreaterThan(0);
      });
    }
  });

  test.describe("admin", () => {
    test.use({ storageState: authFile("admin") });
    test("/admin opens normally", async ({ page }) => {
      const response = await page.goto("/admin");
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("navigation", { name: "Admin sections" })).toBeVisible();
    });
  });

  test("a visitor is sent to sign in", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
