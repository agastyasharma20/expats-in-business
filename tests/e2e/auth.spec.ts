import AxeBuilder from "@axe-core/playwright";
import { authFile } from "./global-setup";
import { expect, test, type APIRequestContext } from "@playwright/test";

/**
 * M6 acceptance: sign-in, onboarding-gated dashboard, settings persistence, email verification,
 * profile visibility, copy link and the 403. Needs the demo seed and Mailpit (E2E_EXPECT_DB=true).
 * Serial and desktop-only: tests share one signed-in member and the sign-in rate limit (5/min).
 */
const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";
const MEMBER = "priya@demo.eib.local";

test.skip(process.env.E2E_EXPECT_DB !== "true", "needs the seeded database and Mailpit");
test.describe.configure({ mode: "serial" });
test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "desktop only"));

const storage = authFile("priya");

async function latestLink(request: APIRequestContext, to: string, pattern: RegExp, after: number) {
  for (let i = 0; i < 40; i += 1) {
    const search = await request.get(
      `${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}&limit=1`,
    );
    const [message] = (await search.json()).messages ?? [];
    if (message && Date.parse(message.Created) >= after - 1000) {
      const full = await (await request.get(`${MAILPIT}/api/v1/message/${message.ID}`)).json();
      const match = String(full.Text).match(pattern);
      if (match) return match[0];
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`no email for ${to}`);
}

test("signed-out visitors are sent to sign-in, and the page passes axe", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard/);
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(violations).toEqual([]);
});

test("magic link signs in to the dashboard in under 2 s (bug 7)", async ({ page, request }) => {
  const sentAt = Date.now();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(MEMBER);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Check your inbox" })).toContainText(
    MEMBER,
  );
  const link = await latestLink(request, MEMBER, /https?:\/\/\S+magic-link\/verify\S+/, sentAt);
  const started = Date.now();
  await page.goto(link);
  await expect(
    page.getByRole("heading", { level: 1, name: /^Good (morning|afternoon|evening),/ }),
  ).toBeVisible();
  expect(Date.now() - started).toBeLessThan(2000);
});

test("every dashboard stat card navigates (bugs 1, 13)", async ({ browser }) => {
  const page = await (await browser.newContext({ storageState: storage })).newPage();
  for (const [key, path] of [
    ["events", "/my/events"],
    ["connections", "/connections"],
    ["businesses", "/my/businesses"],
  ]) {
    await page.goto("/dashboard");
    await page.getByTestId(`stat-${key}`).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("account edits persist after reload (bug 6)", async ({ browser }) => {
  const page = await (await browser.newContext({ storageState: storage })).newPage();
  const name = `Priya Demo ${Date.now() % 10_000}`;
  await page.goto("/settings/account");
  await page.getByLabel("Name").fill(name);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Changes saved")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Name")).toHaveValue(name);
});

test("a secondary email is verified through the Mailpit link (bug 5)", async ({
  browser,
  request,
}) => {
  const page = await (await browser.newContext({ storageState: storage })).newPage();
  const email = `e2e-${Date.now()}@example.test`;
  const sentAt = Date.now();
  await page.goto("/settings/email");
  await page.getByTestId("add-email-form").getByLabel("Add email").fill(email);
  await page.getByTestId("add-email-form").getByRole("button", { name: "Add email" }).click();
  await expect(page.getByTestId("email-list")).toContainText(email);
  const link = await latestLink(
    request,
    email,
    /https?:\/\/\S+\/api\/email\/verify\?token=[\w-]+/,
    sentAt,
  );
  await page.goto(link);
  await expect(page.getByText("Email verified.")).toBeVisible();
  await expect(
    page.getByTestId("email-list").getByRole("listitem").filter({ hasText: email }),
  ).toContainText("Verified");
});

test("visitors cannot see fields switched off (bug 14); copy link fills the clipboard (bug 4)", async ({
  browser,
}) => {
  const context = await browser.newContext({ storageState: storage });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const page = await context.newPage();
  await page.goto("/settings/profile");
  await page.getByLabel("Skills", { exact: true }).fill("secret-skill");
  await page.getByLabel("Show skills").uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Changes saved")).toBeVisible();
  const profilePath = await page
    .getByRole("link", { name: "View public profile" })
    .getAttribute("href");

  await page.goto(profilePath!);
  await expect(page.getByTestId("member-profile")).toContainText("secret-skill"); // owner sees all
  await page.getByRole("button", { name: "Copy profile link" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(
    new RegExp(`${profilePath}$`),
  );

  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(profilePath!);
  await expect(visitor.getByTestId("member-profile")).toBeVisible();
  await expect(visitor.getByTestId("member-profile")).not.toContainText("secret-skill");
  await expect(visitor.getByText("@demo.eib.local")).toHaveCount(0);
});

test("a member gets the styled 403 on /admin", async ({ browser }) => {
  const page = await (await browser.newContext({ storageState: storage })).newPage();
  // The shell streams before the guard runs, so the HTTP status stays 200; the 403 page replaces the content.
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "You don't have access to this page" }),
  ).toBeVisible();
});

test("help form sends a message to the team (bug 3)", async ({ page }) => {
  await page.goto("/help");
  const form = page.getByTestId("help-form");
  await form.getByLabel("Your name").fill("E2E Visitor");
  await form.getByLabel("Your email").fill("visitor@example.test");
  await form.getByLabel("Message").fill("Testing the help form end to end.");
  await form.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText(/Your message was sent/)).toBeVisible();
});
