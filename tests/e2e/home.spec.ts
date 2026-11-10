import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Set E2E_EXPECT_DB=true where a migrated and seeded database is available (CI, local after setup).
const expectDb = process.env.E2E_EXPECT_DB === "true";

test.describe("homepage", () => {
  test("renders every section with no console errors @smoke", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "The business network for internationals",
    );
    for (const name of [
      "Upcoming sessions",
      "How it works",
      "Cultural Bubbles",
      "Chapters",
      "Partners",
      "What members say",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: "Join free" }).first()).toBeVisible();
    // The verified fact, never a demo number.
    await expect(page.getByText("35+").first()).toBeAttached();
    expect(errors).toEqual([]);
  });

  test("labels placeholders and demo data honestly", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Partner logo, permission pending")).toHaveCount(4);
    await expect(page.getByText("Placeholder testimonial")).toHaveCount(3);
    if (expectDb) {
      await expect(
        page.getByRole("heading", { level: 2, name: "Upcoming sessions" }),
      ).toBeVisible();
      await expect(page.locator("section[aria-labelledby=events-title] > ul > li")).toHaveCount(3);
      await expect(page.getByText("Demo data").first()).toBeVisible();
    }
  });

  test("has no serious accessibility violations @a11y", async ({ page }) => {
    // Axe must see final colours, not entrance animations mid-fade.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
  });

  test("does not scroll sideways", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("ships Organization JSON-LD and an OG image", async ({ page, request }) => {
    await page.goto("/");
    const json = await page.locator('script[type="application/ld+json"]').first().textContent();
    const data = JSON.parse(json ?? "{}") as { "@type"?: string; name?: string; sameAs?: string[] };
    expect(data["@type"]).toBe("Organization");
    expect(data.name).toBe("Expats in Business");
    expect(data.sameAs?.length).toBeGreaterThanOrEqual(4);

    const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(ogImage).toBeTruthy();
    const image = await request.get(new URL(ogImage!).pathname + new URL(ogImage!).search);
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toContain("image/png");
  });
});

test("health endpoint reports status and database @smoke", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  const body = (await response.json()) as { status: string; db: boolean };
  expect(body.status).toBe("ok");
  expect(typeof body.db).toBe("boolean");
  if (expectDb) expect(body.db).toBe(true);
});
