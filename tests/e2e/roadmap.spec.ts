import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { authFile } from "./global-setup";

/**
 * M11 acceptance in the browser (the 6 rule scenarios are unit tests): Karim (non-EU founder) gets
 * the founder plan; a done step persists; editing onboarding regenerates the plan and keeps the
 * completed step; the calendar export works; the dashboard shows the progress ring. Works with
 * AI_PROVIDER=demo (template intro).
 */
test.skip(process.env.E2E_EXPECT_DB !== "true", "needs the seeded database");
test.describe.configure({ mode: "serial" });
test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "desktop only"));
test.use({ storageState: authFile("karim") });

const task = (page: Page, slug: string) =>
  page.locator(`[data-testid="roadmap-task"][data-slug="${slug}"]`);

test("a non-EU founder gets PESEL, residence, tax and KSeF steps in 30/60/90 columns", async ({
  page,
}) => {
  await page.goto("/roadmap");
  await expect(page.getByTestId("roadmap-intro")).toContainText("steps for your first 90 days");
  for (const slug of [
    "pesel",
    "trusted-profile",
    "mos-application",
    "tax-basics",
    "ksef",
    "join-bubble",
  ])
    await expect(task(page, slug)).toBeVisible();
  await expect(page.getByTestId("column-30").locator('[data-slug="pesel"]')).toBeVisible();
  await expect(page.getByTestId("column-60").locator('[data-slug="tax-basics"]')).toBeVisible();
  await expect(page.getByTestId("column-90").locator('[data-slug="ksef"]')).toBeVisible();
  await expect(task(page, "trusted-profile")).toContainText("After: Get your PESEL number");
  await expect(task(page, "pesel").getByRole("link", { name: /Official page/ })).toHaveAttribute(
    "href",
    /^https:\/\/www\.gov\.pl\//,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(violations.map((v) => v.id)).toEqual([]);
});

test("marking a step done persists and moves the progress", async ({ page }) => {
  await page.goto("/roadmap");
  await expect(page.getByTestId("roadmap-progress")).toContainText("0 of 10");
  await task(page, "pesel")
    .getByRole("button", { name: /Mark as done/ })
    .click();
  await expect(task(page, "pesel")).toHaveAttribute("data-done", "true");
  await page.reload();
  await expect(task(page, "pesel")).toHaveAttribute("data-done", "true");
  await expect(page.getByTestId("roadmap-progress")).toContainText("1 of 10");
});

test("editing onboarding regenerates the plan and keeps completed steps", async ({ page }) => {
  await page.goto("/onboarding?step=6");
  await page.getByLabel("Residence situation").selectOption("student");
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/roadmap");
  await expect(task(page, "ksef")).toHaveCount(0); // students do not get the founder steps
  await expect(task(page, "tax-basics")).toHaveCount(0);
  await expect(task(page, "mos-application")).toBeVisible();
  await expect(task(page, "pesel")).toHaveAttribute("data-done", "true"); // kept
  await expect(page.getByTestId("roadmap-progress")).toContainText("1 of 8");
});

test("deadlines export to a calendar; the dashboard shows the ring", async ({ page, request }) => {
  const ics = await page.request.get("/api/roadmap/ics");
  expect(ics.headers()["content-type"]).toContain("text/calendar");
  const body = await ics.text();
  expect(body).toContain("BEGIN:VEVENT");
  expect(body).toContain("DTSTART;VALUE=DATE:");
  expect(body).not.toContain("Get your PESEL number"); // done steps are not exported

  const anonymous = await request.get("/api/roadmap/ics", { headers: { cookie: "" } });
  expect([401, 200]).toContain(anonymous.status());

  await page.goto("/dashboard");
  await expect(page.getByTestId("dashboard-roadmap").getByTestId("progress-ring")).toBeVisible();
  await page
    .getByTestId("dashboard-roadmap")
    .getByRole("link", { name: "Open my roadmap" })
    .click();
  await expect(page).toHaveURL(/\/roadmap$/);
});
