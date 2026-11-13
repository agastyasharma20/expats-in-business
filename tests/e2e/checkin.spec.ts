import { expect, test, type Browser, type Page } from "@playwright/test";

import { authFile } from "./global-setup";

/**
 * M7 part 2 acceptance: event builder (< 2 min), waitlist promotion on cancel, door check-in
 * (manual + API rules), Pulse SSE, Who I met with double opt-in connections.
 */
test.skip(process.env.E2E_EXPECT_DB !== "true", "needs the seeded database");
test.describe.configure({ mode: "serial" });
test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "desktop only"));

const as = async (browser: Browser, persona: "admin" | "karim" | "priya") =>
  (await browser.newContext({ storageState: authFile(persona) })).newPage();

const stamp = Date.now().toString(36);
let small = ""; // capacity 1, for the waitlist
let mixer = ""; // capacity 20, for check-in and Who I met
let mixerId = "";

async function buildEvent(page: Page, title: string, capacity: number) {
  const started = Date.now();
  await page.goto("/admin/events/new");
  const form = page.getByTestId("event-builder");
  await form.getByLabel("Title", { exact: true }).fill(title);
  await form.getByLabel("Short summary").fill("End-to-end test session for the event builder.");
  await form.getByLabel("Venue", { exact: true }).selectOption({ index: 1 });
  await form.getByLabel("Places").fill(String(capacity));
  await form.getByRole("button", { name: "Create event" }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  expect(Date.now() - started).toBeLessThan(120_000);
  return new URL(page.url()).pathname.split("/").pop()!;
}

async function reserve(page: Page, slug: string, button: RegExp) {
  await page.goto(`/events/${slug}`);
  await page.getByRole("button", { name: button }).click();
}

test("a chapter lead builds and publishes events in under two minutes", async ({ browser }) => {
  const admin = await as(browser, "admin");
  small = await buildEvent(admin, `E2E Small ${stamp}`, 1);
  mixer = await buildEvent(admin, `E2E Mixer ${stamp}`, 20);
  await admin.goto("/admin/events");
  const row = admin
    .getByTestId("admin-events")
    .getByRole("listitem")
    .filter({ hasText: `E2E Mixer ${stamp}` });
  mixerId = (await row.getByRole("link", { name: "Check-in" }).getAttribute("href"))!.split(
    "/",
  )[3]!;
  expect(mixerId).toBeTruthy();
});

test("a full session waitlists, and a cancellation promotes the next person", async ({
  browser,
}) => {
  const karim = await as(browser, "karim");
  const priya = await as(browser, "priya");
  await reserve(karim, small, /Reserve a free place/);
  await expect(karim).toHaveURL(/\/tickets\//);

  await reserve(priya, small, /Join the waitlist/);
  await expect(priya.getByTestId("rsvp-status")).toContainText("You are on the waitlist");

  await karim.getByTestId("unrsvp-open").click();
  await karim.getByRole("button", { name: "Yes, un-RSVP" }).click();
  await expect(karim.getByText("Cancelled", { exact: true })).toBeVisible();

  await priya.goto(`/events/${small}`);
  await expect(priya.getByTestId("rsvp-status")).toContainText("You have a place");
});

test("door check-in: manual search, single use, members cannot scan", async ({ browser }) => {
  const karim = await as(browser, "karim");
  const priya = await as(browser, "priya");
  await reserve(karim, mixer, /Reserve a free place/);
  await expect(karim).toHaveURL(/\/tickets\//);
  const karimTicket = new URL(karim.url()).pathname.split("/").pop()!;
  await reserve(priya, mixer, /Reserve a free place/);
  await expect(priya).toHaveURL(/\/tickets\//);

  const admin = await as(browser, "admin");
  await admin.goto(`/admin/events/${mixerId}/check-in`);
  await expect(admin.getByTestId("checkin-count")).toContainText("0 of 2");
  for (const name of ["Karim", "Priya"]) {
    await admin.getByPlaceholder("Type a name").fill(name);
    await admin.getByRole("button", { name: "Check in" }).click();
    await expect(admin.getByTestId("scan-result")).toContainText("Welcome");
  }
  await expect(admin.getByTestId("checkin-count")).toContainText("2 of 2");

  const again = await admin.request.post("/api/checkin", {
    data: { eventId: mixerId, ticketId: karimTicket },
  });
  expect((await again.json()).status).toBe("already");
  const bogus = await admin.request.post("/api/checkin", {
    data: { eventId: mixerId, token: "https://evil.example" },
  });
  expect((await bogus.json()).status).toBe("invalid");
  const member = await karim.request.post("/api/checkin", {
    data: { eventId: mixerId, ticketId: karimTicket },
  });
  expect(member.status()).toBe(403);

  await karim.goto(`/tickets/${karimTicket}`);
  await expect(karim.getByText(/Checked in at/)).toBeVisible();
});

test("Pulse streams live numbers", async ({ browser }) => {
  const admin = await as(browser, "admin");
  await admin.goto(`/admin/events/${mixerId}/pulse`);
  await expect(admin.getByTestId("pulse-count")).toHaveText("2");
  await expect(admin.getByText("Live", { exact: true })).toBeVisible();
});

test("Who I met: both opt in, one requests, the other accepts", async ({ browser }) => {
  test.setTimeout(60_000); // two people, several server round-trips
  const karim = await as(browser, "karim");
  const priya = await as(browser, "priya");
  for (const page of [karim, priya]) {
    await page.goto(`/met/${mixer}`);
    // The demo seed may already have opted this persona in.
    const showMe = page.getByTestId("who-i-met-consent").getByRole("button", { name: "Show me" });
    await expect(page.getByTestId("who-i-met-consent")).toBeVisible();
    if (await showMe.isVisible()) await showMe.click();
    await expect(page.getByText("You are visible")).toBeVisible();
  }
  await priya.reload();
  const row = priya.getByTestId("met-list").getByRole("listitem").filter({ hasText: "Karim" });
  await row.getByRole("button", { name: "Connect" }).click();
  await expect(row).toContainText("Request sent");

  await karim.goto("/connections");
  const request = karim
    .getByTestId("pending-requests")
    .getByRole("listitem")
    .filter({ hasText: "Priya" });
  await request.getByRole("button", { name: "Accept" }).click();
  // The request leaves the pending list and Priya is now a connection.
  await expect(karim.getByTestId("pending-requests")).toHaveCount(0);
  await expect(karim.getByRole("main").getByRole("link", { name: /Priya/ })).toBeVisible();
});
