import AxeBuilder from "@axe-core/playwright";
import { authFile } from "./global-setup";
import { expect, test, type Page } from "@playwright/test";

/**
 * M7 part 1 acceptance: list and filters, event page facts, .ics, RSVP → QR ticket → cancel,
 * paid ticket (simulated payment in demo mode without Stripe keys), webhook rejects unsigned calls.
 */
test.skip(process.env.E2E_EXPECT_DB !== "true", "needs the seeded database");
test.describe.configure({ mode: "serial" });
test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "desktop only"));

const storage = authFile("karim");

/** First upcoming card matching a price kind with places left, opened. */
async function openEvent(page: Page, kind: "free" | "paid") {
  await page.goto("/events");
  // Skip full sessions and those created by other specs running in parallel ("E2E …").
  const cards = page
    .getByTestId("event-list")
    .locator(":scope > li")
    .filter({ hasNotText: "Full" })
    .filter({ hasNotText: /E2E / });
  const card =
    kind === "free"
      ? cards.filter({ hasText: "Free" }).first()
      : cards.filter({ hasNotText: "Free" }).first();
  await card.getByRole("link").click();
  await expect(page).toHaveURL(/\/events\/(?!formats)[^/?]+(\?.*)?$/);
  await expect(page.getByRole("link", { name: "All sessions" })).toBeVisible();
}

test("events list filters by time and format, and passes axe", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/events");
  await expect(page.getByTestId("event-list").locator(":scope > li").first()).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(violations).toEqual([]);

  await page.getByRole("link", { name: "Past", exact: true }).click();
  await expect(page).toHaveURL(/when=past/);
  await expect(page.getByRole("link", { name: "Past", exact: true })).toHaveAttribute(
    "aria-current",
    "true",
  );

  await page.goto("/events/formats");
  const first = page.getByRole("listitem").first();
  await first.getByRole("link").click();
  await expect(page).toHaveURL(/format=/);
});

test("event page shows date, venue, price, places, and a working .ics", async ({
  page,
  request,
}) => {
  await openEvent(page, "free");
  for (const label of ["When", "Where", "Price", "Places"])
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  await expect(page.locator('script[type="application/ld+json"]').first()).toBeAttached();
  const slug = new URL(page.url()).pathname.split("/").pop();
  const ics = await request.get(`/api/events/${slug}/ics`);
  expect(ics.headers()["content-type"]).toContain("text/calendar");
  expect(await ics.text()).toContain("BEGIN:VEVENT");
});

test("visitors are asked to sign in before reserving", async ({ page }) => {
  await openEvent(page, "free");
  await expect(page.getByRole("link", { name: "Sign in to reserve a place" })).toHaveAttribute(
    "href",
    /sign-in\?next=/,
  );
});

test("a member reserves a free place, gets a QR ticket and can cancel", async ({ browser }) => {
  const page = await (await browser.newContext({ storageState: storage })).newPage();
  await openEvent(page, "free");
  const eventUrl = page.url();
  await page.getByRole("button", { name: "Reserve a free place" }).click();
  await expect(page).toHaveURL(/\/tickets\//);
  await expect(page.getByText("Confirmed")).toBeVisible();
  await expect(page.getByRole("img", { name: /QR code for checking in/ })).toBeVisible();

  await page.getByTestId("unrsvp-open").click();
  await page.getByRole("button", { name: "Yes, un-RSVP" }).click();
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
  await page.goto(eventUrl);
  await expect(page.getByRole("button", { name: "Reserve a free place" })).toBeVisible();
});

test("a member can RSVP and un-RSVP straight from the event page", async ({ browser }) => {
  // Another persona than the test above, so parallel runs never share a ticket.
  const page = await (await browser.newContext({ storageState: authFile("priya") })).newPage();
  await openEvent(page, "free");
  const eventUrl = page.url();
  const reserve = page.getByRole("button", { name: "Reserve a free place" });
  // The demo seed may already give this persona a place: un-RSVP first, then RSVP again.
  await expect(reserve.or(page.getByTestId("rsvp-status"))).toBeVisible();
  if (!(await reserve.isVisible())) {
    await page.getByTestId("unrsvp-open").click();
    await page.getByRole("button", { name: "Yes, un-RSVP" }).click();
    await expect(reserve).toBeVisible();
  }
  await reserve.click();
  await expect(page).toHaveURL(/\/tickets\//);
  await page.goto(eventUrl);
  await expect(page.getByTestId("rsvp-status")).toContainText("You have a place");

  // Two steps: "Keep my place" closes without cancelling; Escape too.
  await page.getByTestId("unrsvp-open").click();
  await expect(page.getByRole("button", { name: "Yes, un-RSVP" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("unrsvp-confirm")).toHaveCount(0);
  await expect(page.getByTestId("rsvp-status")).toContainText("You have a place");

  await page.getByTestId("unrsvp-open").click();
  await page.getByRole("button", { name: "Yes, un-RSVP" }).click();
  await expect(page.getByText(/no longer going/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Reserve a free place" })).toBeVisible();
});

test("a paid ticket goes through (simulated) payment and is confirmed", async ({ browser }) => {
  const page = await (await browser.newContext({ storageState: storage })).newPage();
  // Pick a paid session this persona has no ticket for yet (the demo seed gives some tickets).
  await page.goto("/events");
  const paid = page
    .getByTestId("event-list")
    .locator(":scope > li")
    .filter({ hasNotText: "Full" })
    .filter({ hasNotText: "Free" });
  await expect(paid.first()).toBeVisible(); // the list streams in under Suspense
  const hrefs = await paid
    .getByRole("link")
    .evaluateAll((links) => links.map((a) => a.getAttribute("href")));
  const buy = page.getByRole("button", { name: /Buy ticket/ });
  for (const href of hrefs) {
    await page.goto(href!);
    await expect(
      page.getByTestId("rsvp-form").or(page.getByTestId("rsvp-status")).first(),
    ).toBeVisible();
    if (await buy.isVisible()) break;
  }
  await buy.click();
  await expect(page).toHaveURL(/\/tickets\/.+payment=(simulated|success)|checkout\.stripe\.com/);
  if (page.url().includes("payment=simulated")) {
    await expect(page.getByText(/Test mode: payment simulated/)).toBeVisible();
    await expect(page.getByRole("img", { name: /QR code/ })).toBeVisible();
  }
});

test("the Stripe webhook rejects unsigned requests", async ({ request }) => {
  const res = await request.post("/api/stripe/webhook", {
    data: { type: "checkout.session.completed" },
  });
  expect([400, 503]).toContain(res.status());
});
