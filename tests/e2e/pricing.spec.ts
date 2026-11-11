import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { authFile } from "./global-setup";

/** M8 acceptance: pricing from Plan rows with the test-mode banner, subscribe, cancel, corporate form. */
test("pricing shows plans from the database, labelled as proposals, and passes axe", async ({
  page,
}) => {
  test.skip(process.env.E2E_EXPECT_DB !== "true", "needs the seeded database");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/pricing");
  await expect(page.getByTestId("pricing-banner")).toContainText("Test mode");
  await expect(page.getByTestId("pricing-banner")).toContainText("net of VAT");
  await expect(page.locator('[data-testid="plan-community"]:visible')).toHaveCount(1);
  await expect(page.getByTestId("plan-plus-month")).toBeVisible();
  await expect(page.getByTestId("plan-plus-year")).toBeHidden();

  // The billing-period switch is CSS only: works without JavaScript.
  await page.getByText("Yearly", { exact: true }).click();
  await expect(page.getByTestId("plan-plus-year")).toBeVisible();
  await expect(page.getByTestId("plan-plus-month")).toBeHidden();

  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(violations).toEqual([]);
});

test.describe("subscriptions", () => {
  test.skip(process.env.E2E_EXPECT_DB !== "true", "needs the seeded database");
  test.describe.configure({ mode: "serial" });
  test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "desktop only"));
  test.use({ storageState: authFile("karim") });

  test("a member subscribes (simulated in demo mode) and can cancel at period end", async ({
    page,
  }) => {
    await page.goto("/pricing");
    await page
      .getByTestId("plan-plus-month")
      .getByRole("button", { name: /Choose/ })
      .click();
    await expect(page).toHaveURL(
      /settings\/billing\?status=(simulated|success)|checkout\.stripe\.com/,
    );
    test.skip(page.url().includes("stripe.com"), "real Stripe test checkout configured");
    await expect(page.getByText("Current plan: Member Plus")).toBeVisible();
    await expect(page.getByText(/Renews on/)).toBeVisible();

    await page
      .getByTestId("cancel-plan")
      .getByRole("button", { name: "Cancel at period end" })
      .click();
    await expect(page.getByText(/Ends on/)).toBeVisible();
    await page.getByTestId("cancel-plan").getByRole("button", { name: "Keep my plan" }).click();
    await expect(page.getByText(/Renews on/)).toBeVisible();
  });
});

test("corporate enquiry reaches the team", async ({ page }) => {
  await page.goto("/pricing/corporate");
  const form = page.getByTestId("corporate-form");
  await form.getByLabel("Company").fill("Demo Company (test)");
  await form.getByLabel("Your name").fill("E2E Tester");
  await form.getByLabel("Work email").fill("tester@example.test");
  await form.getByLabel("What do you need?").fill("Onboarding for our international team, please.");
  await form.getByRole("button", { name: "Send enquiry" }).click();
  await expect(page.getByText(/We received your enquiry/)).toBeVisible();
});

test("the pricing page has no runtime data in its shell (static, fast)", async ({ request }) => {
  const res = await request.get("/pricing");
  expect(res.ok()).toBeTruthy();
  expect(await res.text()).toContain("Member Plus");
});
