import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { authFile } from "./global-setup";

/** Applications board and catalogs (M14): a member applies, an admin accepts; catalogs are admin-only. */
test.skip(process.env.E2E_EXPECT_DB !== "true", "needs the seeded database");
test.describe.configure({ mode: "serial" });
test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "desktop only"));

const topic = `E2E talk ${Date.now().toString(36)}`;

test.describe("member", () => {
  test.use({ storageState: authFile("priya") });

  test("applies to speak and sees the application", async ({ page }) => {
    await page.goto("/get-involved");
    const form = page.getByTestId("involved-form");
    await form.getByLabel("How do you want to get involved?").selectOption("speaker");
    await form.getByLabel("Topic or idea (one line)").fill(topic);
    await form
      .getByLabel("Tell us more")
      .fill(
        "A practical talk on registering a sole proprietorship as a non-EU founder, with a checklist.",
      );
    await form.getByRole("button", { name: "Send application" }).click();
    await expect(page.getByTestId("my-applications")).toContainText(topic);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
  });

  test("cannot open catalogs or the applications board", async ({ page }) => {
    for (const path of ["/admin/catalogs", "/admin/applications"]) {
      await page.goto(path);
      await expect(
        page.getByRole("heading", { name: "You don't have access to this page" }),
      ).toBeVisible();
    }
  });
});

test.describe("admin", () => {
  test.use({ storageState: authFile("admin") });

  test("moves the application to review and accepts it", async ({ page }) => {
    await page.goto("/admin/applications");
    const card = () =>
      page.getByTestId("applications-board").getByRole("listitem").filter({ hasText: topic });
    await card().getByRole("button", { name: "Review" }).click();
    await expect(page.locator("#col-in_review").locator("..")).toContainText(topic);
    await card().getByRole("button", { name: "Accept" }).click();
    await expect(page.locator("#col-accepted").locator("..")).toContainText(topic);
    await page.goto("/admin/audit?action=application");
    await expect(page.getByTestId("audit-log")).toContainText("application.move");
  });

  test("catalogs list plans, formats and categories", async ({ page }) => {
    await page.goto("/admin/catalogs");
    await expect(page.getByTestId("catalog-plans")).toContainText("Member Plus");
    await expect(page.getByRole("heading", { name: "Event formats" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Provider categories" })).toBeVisible();
  });
});
