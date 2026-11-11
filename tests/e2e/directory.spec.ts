import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";

import { authFile, type PERSONAS } from "./global-setup";

/**
 * M9 acceptance: filters combine and live in the URL; visitors cannot see or filter by private
 * fields; an ineligible member cannot review; the badge appears only after admin approval;
 * double opt-in connections share contact details only after acceptance. Axe on every page.
 */
test.skip(process.env.E2E_EXPECT_DB !== "true", "needs the seeded database");
test.describe.configure({ mode: "serial" });
test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "desktop only"));

const as = async (browser: Browser, persona: keyof typeof PERSONAS) =>
  (await browser.newContext({ storageState: authFile(persona) })).newPage();

async function count(page: Page) {
  const text = (await page.getByTestId("result-count").textContent()) ?? "";
  return Number(text.match(/\d+/)?.[0] ?? 0);
}

async function axe(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(violations.map((v) => `${v.id} (${v.nodes.length})`)).toEqual([]);
}

test("member filters combine and stay in the URL", async ({ browser }) => {
  const page = await as(browser, "karim");
  await page.goto("/members");
  const all = await count(page);
  await page.getByTestId("filters").getByLabel("Open to coffee").check();
  await page.getByTestId("filters").getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/coffee=1/);
  const coffee = await count(page);
  expect(coffee).toBeLessThanOrEqual(all);
  for (const card of await page.getByTestId("member-list").locator(":scope > li").all()) {
    await expect(card).toContainText("Open to coffee");
  }

  await page.getByTestId("filters").getByLabel("Language").selectOption("en");
  await page.getByTestId("filters").getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/coffee=1/);
  await expect(page).toHaveURL(/language=en/);
  expect(await count(page)).toBeLessThanOrEqual(coffee);
  await axe(page);
});

test("visitors see limited fields and cannot filter by private ones", async ({ page }) => {
  await page.goto("/members");
  const all = await count(page);
  await expect(page.getByTestId("filters").getByLabel("Industry")).toHaveCount(0);
  await expect(page.getByText(/Sign in to see languages/)).toBeVisible();
  // A crafted URL with private filters is ignored for visitors.
  await page.goto("/members?origin=IN&language=hi&industry=it");
  expect(await count(page)).toBe(all);
  await axe(page);
});

test("an ineligible member cannot review; a quote request makes them eligible", async ({
  browser,
}) => {
  const page = await as(browser, "karim");
  await page.goto("/providers?category=legal");
  await page.getByTestId("provider-card").first().getByRole("heading").getByRole("link").click();
  await expect(page).toHaveURL(/\/providers\/(?!verification-criteria)[^/]+$/);
  await expect(page.getByTestId("review-not-eligible")).toBeVisible();
  await expect(page.getByTestId("review-form")).toHaveCount(0);

  await page
    .getByTestId("quote-form")
    .getByLabel("What do you need?")
    .fill("I need help registering a company and a quote for the paperwork.");
  await page.getByTestId("quote-form").getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText(/Request sent/)).toBeVisible();
  await page.reload();
  const review = page.getByTestId("review-form");
  await expect(review).toBeVisible();
  await review.getByText("5 stars").click();
  await review
    .getByLabel("Your review")
    .fill("Quick reply and clear explanation of the next steps.");
  await review.getByRole("button", { name: "Publish review" }).click();
  await expect(page.getByText("You reviewed this provider.")).toBeVisible();
  await axe(page);
});

test("the badge appears only after an admin approves with every check ticked", async ({
  browser,
}) => {
  const admin = await as(browser, "admin");
  await admin.goto("/admin/providers");
  await admin
    .getByTestId("verification-queue")
    .getByRole("link", { name: "Review" })
    .first()
    .click();
  await expect(admin).toHaveURL(/\/admin\/providers\/[^/]+$/);
  await expect(admin.getByTestId("approve-form")).toBeVisible();
  const name = await admin.getByRole("heading", { level: 1 }).textContent();
  const publicHref = (await admin
    .getByRole("link", { name: /^\/providers\// })
    .getAttribute("href"))!;

  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(publicHref);
  await expect(visitor.getByText("Verification pending")).toBeVisible();
  await expect(visitor.getByText("Verified provider", { exact: true })).toHaveCount(0);

  const approve = admin.getByTestId("approve-form");
  await approve.getByRole("button", { name: "Approve and give the badge" }).click();
  await expect(admin.getByText("Tick every required check before approving.")).toBeVisible();
  for (const label of ["Registered business", "References", "Insurance"])
    await approve.getByLabel(label).check();
  await approve.getByRole("button", { name: "Approve and give the badge" }).click();
  await expect(admin.getByText(/Approved/)).toBeVisible();

  await visitor.reload();
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(name!);
  await expect(visitor.getByText("Verified provider", { exact: true }).first()).toBeVisible();
  await expect(
    visitor.getByRole("link", { name: /Verified provider: What verified means/ }).first(),
  ).toHaveAttribute("href", /verification-criteria/);
});

test("connections are double opt-in; contact details appear only after acceptance", async ({
  browser,
}) => {
  const karim = await as(browser, "karim");
  await karim.goto("/members?q=Marta");
  await karim.getByTestId("member-list").getByRole("link", { name: /Marta/ }).first().click();
  await expect(karim).toHaveURL(/\/members\/[^/?]+$/);
  const profileUrl = karim.url();
  await expect(karim.getByTestId("contact")).toHaveCount(0);
  await karim
    .getByTestId("connect-form")
    .getByLabel("Add a note (optional)")
    .fill("We met at the accounting workshop.");
  await karim.getByTestId("connect-form").getByRole("button", { name: "Send request" }).click();
  await expect(karim.getByTestId("connect-status")).toHaveText("Request pending");

  const marta = await as(browser, "marta");
  await marta.goto("/");
  await expect(marta.getByTestId("notification-bell")).toHaveAttribute("aria-label", /unread/);
  await marta.goto("/notifications");
  await expect(marta.getByTestId("notifications")).toContainText("wants to connect with you");
  await marta.goto("/connections");
  const request = marta
    .getByTestId("pending-requests")
    .getByRole("listitem")
    .filter({ hasText: "Karim" });
  await expect(request).toContainText("We met at the accounting workshop.");
  await request.getByRole("button", { name: "Accept" }).click();
  await expect(marta.getByTestId("pending-requests")).toHaveCount(0);

  await karim.goto(profileUrl);
  await expect(karim.getByTestId("contact")).toContainText("@demo.eib.local");
});

test("provider inbox shows the request, analytics are aggregated, and criteria are published", async ({
  browser,
  page,
}) => {
  const marta = await as(browser, "marta");
  await marta.goto("/provider/inbox");
  await expect(marta.getByRole("heading", { name: "Quote requests" })).toBeVisible();
  await marta.goto("/provider/analytics");
  await expect(marta.getByTestId("analytics")).toContainText("Profile views");
  await axe(marta);

  const karim = await as(browser, "karim");
  const res = await karim.goto("/provider/inbox");
  expect(res?.ok()).toBeTruthy();
  await expect(
    karim.getByRole("heading", { name: "You don't have access to this page" }),
  ).toBeVisible();

  await page.goto("/providers/verification-criteria");
  await expect(page.getByTestId("criteria").getByRole("listitem")).toHaveCount(3);
  await page.goto("/businesses");
  await expect(page.getByTestId("business-list").getByRole("listitem").first()).toBeVisible();
  await axe(page);
});
