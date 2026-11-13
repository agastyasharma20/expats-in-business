import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { authFile } from "./global-setup";

/**
 * Festivals: an organiser creates and builds a festival in the console and publishes it; a member
 * buys a group ticket, volunteers and applies for a stall; the organiser reviews the stall; a
 * tampered party size is refused. Needs the seeded demo database.
 */
test.skip(process.env.E2E_EXPECT_DB !== "true", "needs the seeded database");
test.describe.configure({ mode: "serial" });
test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "desktop only"));

const stamp = Date.now().toString(36);
const title = `E2E Festival ${stamp}`;
let consoleUrl = "";
let publicUrl = "";

const isoDay = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

async function axe(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(violations.map((v) => v.id)).toEqual([]);
}

test.describe("organiser", () => {
  test.use({ storageState: authFile("admin") });

  test("creates a festival, adds programme, tier, shift and FAQ, and publishes it", async ({
    page,
  }) => {
    test.setTimeout(90_000); // about ten page loads: longer than one interaction test
    await page.goto("/admin/festivals/new");
    const form = page.getByTestId("festival-builder");
    await form.getByLabel("Festival name").fill(title);
    await form
      .getByLabel("Tagline (one line)")
      .fill("Music, food and stalls from every community.");
    await form
      .getByLabel("Short summary (cards and search)")
      .fill("End-to-end test festival for the console.");
    await form.getByLabel("First day").fill(isoDay(30));
    await form.getByLabel("Last day").fill(isoDay(31));
    await form.getByLabel("Ticket name").fill("Standard");
    await form.getByLabel("Price").fill("25");
    await form.getByRole("button", { name: "Create draft" }).click();
    // Wait for the console itself ("/admin/festivals/new" would also match a bare id pattern).
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page).not.toHaveURL(/\/new$/);
    consoleUrl = new URL(page.url()).pathname;

    await page.goto(`${consoleUrl}?tab=programme`);
    await page.getByLabel("Title", { exact: true }).fill("Opening concert");
    await page.getByLabel("Date").fill(isoDay(30));
    await page.getByLabel("Start").fill("14:00");
    await page.getByLabel("End").fill("15:00");
    await page.getByRole("button", { name: "Add to programme" }).click();
    await expect(page.getByText("Opening concert")).toBeVisible();

    await page.goto(`${consoleUrl}?tab=tickets`);
    await page.getByLabel("Ticket name").fill("Family");
    await page.getByLabel("Price").fill("0");
    await page.getByLabel(/Places in this tier/).fill("20");
    await page.getByRole("button", { name: "Add ticket tier" }).click();
    await expect(page.getByText(/Family · Free/)).toBeVisible();

    await page.goto(`${consoleUrl}?tab=settings`);
    await page.getByLabel("Open volunteer sign-up on the public page").check();
    await page.getByLabel("Open stall applications on the public page").check();
    await page
      .getByLabel("Description")
      .fill(
        "A long enough description of the end-to-end festival so the checklist item for details is complete.",
      );
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved.").first()).toBeVisible();

    await page.goto(`${consoleUrl}?tab=volunteers`);
    await page.getByLabel("Role").fill("Welcome desk");
    await page.getByLabel("Date").fill(isoDay(30));
    await page.getByLabel("Start").fill("12:00");
    await page.getByLabel("End").fill("15:00");
    await page.getByRole("button", { name: "Add volunteer shift" }).click();
    await expect(page.getByText("0 of 4 volunteers")).toBeVisible();

    await page.goto(consoleUrl);
    await page.getByTestId("festival-published").click();
    // State, not toast: the console now offers "Unpublish" (works with or without hydration).
    await expect(page.getByTestId("festival-draft")).toBeVisible();
    await page.getByRole("link", { name: "Public page" }).click();
    await page.waitForURL((url) => url.pathname.startsWith("/festivals/"));
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    publicUrl = new URL(page.url()).pathname;
    await axe(page);
  });
});

test.describe("member", () => {
  test.use({ storageState: authFile("karim") });

  test("a tampered party size is refused by the server", async ({ page }) => {
    await page.goto(publicUrl);
    const picker = page.getByTestId("ticket-picker");
    await expect(picker).toBeVisible();
    // Tamper only after hydration: React restores the controlled value while hydrating, which on a
    // slow dev server can happen after load and would quietly turn the request back into 1 person.
    await page.waitForLoadState("networkidle");
    const quantity = picker.locator('input[name="quantity"]');
    await quantity.evaluate((el: HTMLInputElement) => (el.value = "15"));
    await expect(quantity).toHaveValue("15");
    await picker.getByRole("button", { name: /Buy|Reserve/ }).click();
    await expect(picker.getByRole("alert")).toContainText("number of people");
  });

  test("buys a family ticket for three, volunteers and applies for a stall", async ({ page }) => {
    await page.goto(publicUrl);
    const picker = page.getByTestId("ticket-picker");
    await picker.locator("label", { hasText: "Family" }).click();
    await picker.getByRole("button", { name: "One more person" }).click();
    await picker.getByRole("button", { name: "One more person" }).click();
    await picker.getByRole("button", { name: "Reserve 3 places" }).click();
    await expect(page).toHaveURL(/\/tickets\//);
    await expect(page.getByTestId("ticket-party")).toHaveText("Admits 3 people");

    await page.goto(publicUrl);
    await expect(page.getByTestId("festival-ticket")).toContainText("3 people");
    await page.getByTestId("join-shift").first().click();
    await expect(page.getByText("1 of 4 volunteers")).toBeVisible();

    const stall = page.getByTestId("stall-form");
    await stall.getByLabel("Stall or business name").fill(`E2E Spices ${stamp}`);
    await stall
      .getByLabel("What will you offer?")
      .fill("Spice blends from North Africa, tastings, recipes in English and French.");
    await stall.getByRole("button", { name: "Send application" }).click();
    await expect(page.getByTestId("stall-status")).toContainText("under review");
  });

  test("cannot open the festival console", async ({ page }) => {
    await page.goto(consoleUrl);
    await expect(
      page.getByRole("heading", { name: "You don't have access to this page" }),
    ).toBeVisible();
    expect(
      (await page.request.get(`/api/admin${consoleUrl.replace("/admin", "")}/attendees`)).status(),
    ).toBe(403);
  });
});

test.describe("organiser review", () => {
  test.use({ storageState: authFile("admin") });

  test("accepts the stall and sees sales in the console", async ({ page }) => {
    await page.goto(`${consoleUrl}?tab=stalls`);
    const review = page
      .getByTestId("stall-review")
      .getByRole("listitem")
      .filter({ hasText: `E2E Spices ${stamp}` });
    await review.getByLabel("Decision").selectOption("accepted");
    await review.getByRole("button", { name: "Save decision" }).click();
    await expect(review.locator("[data-variant=verified]", { hasText: "Accepted" })).toBeVisible();
    await page.goto(consoleUrl);
    await expect(page.getByTestId("festival-stats")).toContainText("3 / 500");
    const csv = await page.request.get(`/api/admin${consoleUrl.replace("/admin", "")}/attendees`);
    expect(csv.status()).toBe(200);
    expect(await csv.text()).toContain("Karim Demo");
  });
});
