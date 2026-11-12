import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { authFile } from "./global-setup";

/**
 * M13 community and M14 command centre in the browser: posting, reactions, Bubbles map and list,
 * Coffee Roulette, moderation, admin scoping and feature flags. Needs the seeded demo database.
 */
test.skip(process.env.E2E_EXPECT_DB !== "true", "needs the seeded database");
test.describe.configure({ mode: "serial" });
test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "desktop only"));

async function expectNoAxeViolations(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(violations.map((v) => v.id)).toEqual([]);
}

test.describe("visitor", () => {
  test("Bubbles page shows the map with linked countries and the list alternative", async ({
    page,
  }) => {
    await page.goto("/bubbles");
    const map = page.getByTestId("bubble-map");
    await expect(map).toBeVisible();
    await expect(map.getByRole("link", { name: /India: \d+ members/ })).toHaveAttribute(
      "href",
      /\/bubbles\/india/,
    );
    await expect(page.getByTestId("bubble-list").getByRole("listitem")).toHaveCount(8);
    await expectNoAxeViolations(page);
  });

  test("groups are for members only", async ({ page }) => {
    await page.goto("/community");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

test.describe("member", () => {
  test.use({ storageState: authFile("priya") });

  test("posts in her Bubble group and reacts", async ({ page }) => {
    const text = `E2E question ${Date.now()}: where do you buy spices in town?`;
    await page.goto("/community/bubble-in");
    await page.getByLabel("Write a post").fill(text);
    await page.getByTestId("post-composer").locator("label", { hasText: "Question" }).click();
    await page.getByRole("button", { name: "Publish" }).click();
    const post = page.getByTestId("post").filter({ hasText: text });
    await expect(post).toBeVisible();
    // The same text again is rejected as copy-paste spam.
    await page.getByLabel("Write a post").fill(text);
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByTestId("post-composer").getByRole("alert")).toContainText(
      /already posted|posting a lot/,
    );
    // Reactions: optimistic and persisted.
    const thumbs = post.getByRole("button", { name: /React with 👍/ });
    await thumbs.click();
    await expect(thumbs).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(
      page.getByTestId("post").filter({ hasText: text }).getByRole("button", { name: /👍, 1/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await expectNoAxeViolations(page);
  });

  test("cannot post in a Bubble she has not joined", async ({ page }) => {
    await page.goto("/community/bubble-mx");
    await expect(page.getByTestId("post-composer")).toHaveCount(0);
    await expect(page.getByText("Join this Bubble to post here.")).toBeVisible();
  });

  test("sees and answers her Coffee Roulette match", async ({ page }) => {
    await page.goto("/roulette");
    await expect(page.getByTestId("roulette-scopes")).toContainText("Chapter Kraków");
    const accept = page.getByTestId("roulette-accept").first();
    if (await accept.count()) {
      await accept.click();
      await expect(page.getByText("You accepted").first()).toBeVisible();
    }
    await expectNoAxeViolations(page);
  });

  test("dashboard links every card and shows community panels", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByTestId("stat-bubbles")).toHaveAttribute("href", /\/bubbles$/);
    await expect(page.getByRole("heading", { name: "Profile strength" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "From your groups" })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("is refused by the admin area and the members export", async ({ page }) => {
    // The shell streams before the guard runs, so the status stays 200; the 403 page replaces it.
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "You don't have access to this page" }),
    ).toBeVisible();
    const csv = await page.request.get("/api/admin/export");
    expect(csv.status()).toBe(403);
  });
});

test.describe("admin", () => {
  test.use({ storageState: authFile("admin") });

  test("command centre shows KPIs, charts and chapter health", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByTestId("admin-kpis").getByRole("listitem")).toHaveCount(8);
    await expect(page.getByTestId("chapter-health")).toContainText("Kraków");
    await expect(page.getByRole("img", { name: /daily sign-ups/ })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("command palette jumps to a section", async ({ page }) => {
    await page.goto("/admin");
    const search = page.getByRole("combobox", { name: "Go to an admin page" });
    // The shortcut listener attaches on hydration; retry the key press until the palette opens.
    await expect(async () => {
      if (!(await search.isVisible())) await page.keyboard.press("Control+k");
      await expect(search).toBeVisible({ timeout: 1000 });
    }).toPass();
    await search.fill("audit");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/admin\/audit/);
    await expect(page.getByTestId("audit-log")).toBeVisible();
  });

  test("a feature flag hides the Bubbles map without a deploy", async ({ page }) => {
    await page.goto("/admin/settings");
    await page.getByTestId("flag-bubblesMap").click();
    await expect(page.getByTestId("flag-bubblesMap")).toHaveText("Turn on");
    await page.goto("/bubbles");
    await expect(page.getByTestId("bubble-map")).toHaveCount(0);
    await expect(page.getByTestId("bubble-list")).toBeVisible();
    await page.goto("/admin/settings");
    await page.getByTestId("flag-bubblesMap").click();
    await expect(page.getByTestId("flag-bubblesMap")).toHaveText("Turn off");
  });

  test("moderation queue decision is applied and audited", async ({ page }) => {
    await page.goto("/moderation");
    const remove = page.getByTestId("moderation-remove").first();
    if (await remove.count()) {
      await remove.click();
      await expect(page.getByText(/Post removed|All clear/).first()).toBeVisible();
      await page.goto("/admin/audit");
      await expect(page.getByTestId("audit-log")).toContainText("post.remove");
    }
  });
});
