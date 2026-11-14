import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { authFile } from "./global-setup";

/**
 * Team page: the public page (founder's message and people) and the admin editor with a photo
 * upload. Needs the seeded demo database. Uses names that cannot clash with demo data.
 */
test.skip(process.env.E2E_EXPECT_DB !== "true", "needs the seeded database");
test.describe.configure({ mode: "serial" });
test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "desktop only"));

// A real 1x1 PNG, so the server can decode, resize and re-encode it.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const NAME = `E2E Teammate ${Date.now().toString(36)}`;

async function expectNoAxeViolations(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(violations.map((v) => v.id)).toEqual([]);
}

test.describe("visitor", () => {
  test("the team page shows the founder's message and people, and passes axe", async ({ page }) => {
    await page.goto("/team");
    await expect(page.getByRole("heading", { level: 1, name: "Our team" })).toBeVisible();
    await expect(page.getByTestId("founder-message")).toBeVisible();
    await expect(page.getByTestId("team-member").first()).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("the admin editor is not open to visitors", async ({ page }) => {
    await page.goto("/admin/team");
    await expect(page).toHaveURL(/sign-in/);
  });
});

test.describe("admin", () => {
  test.use({ storageState: authFile("admin") });

  test("adds a person with a photo, shows them publicly, hides and deletes them", async ({
    page,
  }) => {
    await page.goto("/admin/team");
    await expectNoAxeViolations(page);

    const form = page.getByTestId("member-form-new");
    await form.getByLabel("Full name").fill(NAME);
    await form.getByLabel("Designation").fill("Volunteer (e2e)");
    await form.getByLabel("Group").selectOption("volunteers");
    await form.getByLabel("With EiB since (optional)").fill("2024-03");
    await form
      .getByLabel("LinkedIn profile URL (optional)")
      .fill("https://www.linkedin.com/in/e2e");
    await form.locator('input[name="photo"]').setInputFiles({
      name: "face.png",
      mimeType: "image/png",
      buffer: PNG,
    });
    await form.getByLabel("Photo description (for screen readers)").fill("E2E portrait");
    await form.getByRole("button", { name: "Save" }).click();
    await expect(page.getByTestId("team-admin-row").filter({ hasText: NAME })).toBeVisible();

    await page.goto("/team");
    const card = page.getByTestId("team-member").filter({ hasText: NAME });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Since Mar 2024");
    await expect(card.getByRole("img", { name: "E2E portrait" })).toBeVisible();
    await expect(card.getByRole("link", { name: `${NAME} on LinkedIn` })).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/e2e",
    );
    // The email was not given, so no mail link is shown.
    await expect(card.getByRole("link", { name: /^Email / })).toHaveCount(0);

    // Hide: the person disappears from the public page.
    await page.goto("/admin/team");
    const row = page.getByTestId("team-admin-row").filter({ hasText: NAME });
    await row.locator("summary").click();
    await row.getByLabel("Show this person on the public page").uncheck();
    await row.getByRole("button", { name: "Save" }).click();
    await expect(row.getByText("Hidden")).toBeVisible();
    await page.goto("/team");
    await expect(page.getByTestId("team-member").filter({ hasText: NAME })).toHaveCount(0);

    // Delete.
    await page.goto("/admin/team");
    const again = page.getByTestId("team-admin-row").filter({ hasText: NAME });
    await again.locator("summary").click();
    await again.getByRole("button", { name: "Delete person" }).click();
    await expect(page.getByTestId("team-admin-row").filter({ hasText: NAME })).toHaveCount(0);
  });

  test("rejects a file that is not an image", async ({ page }) => {
    await page.goto("/admin/team");
    const form = page.getByTestId("member-form-new");
    await form.getByLabel("Full name").fill("E2E Not an image");
    await form.getByLabel("Designation").fill("Volunteer (e2e)");
    await form.locator('input[name="photo"]').setInputFiles({
      name: "fake.png",
      mimeType: "image/png",
      buffer: Buffer.from("this is not an image"),
    });
    await form.getByRole("button", { name: "Save" }).click();
    await expect(form.getByRole("alert")).toContainText("not a supported image");
    await page.goto("/team");
    await expect(page.getByText("E2E Not an image")).toHaveCount(0);
  });
});
