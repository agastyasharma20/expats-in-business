import { expect, test } from "@playwright/test";

/**
 * M15 quality bar: reduced motion really switches animations off, keyboard users get a working
 * skip link and a visible focus ring, and no key page scrolls sideways on a phone in any language.
 */
const PHONE_PAGES = [
  "/",
  "/pl/events",
  "/uk/festivals",
  "/pl/pricing",
  "/uk/bubbles",
  "/pl/guides",
];

test("reduced motion: entrance animations finish instantly", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "desktop only");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/pl/festivals");
  const animated = page.locator(".animate-rise").first();
  await expect(animated).toBeAttached();
  const duration = await animated.evaluate((el) => getComputedStyle(el).animationDuration);
  // CSS fallback sets 0.01ms; anything above 1ms means motion still plays.
  expect(Number.parseFloat(duration) * (duration.endsWith("ms") ? 1 : 1000)).toBeLessThanOrEqual(1);
});

test("keyboard: skip link moves focus to the main content with a visible ring", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "desktop only");
  await page.goto("/uk");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Перейти до вмісту" });
  await expect(skip).toBeFocused();
  const outline = await skip.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

for (const path of PHONE_PAGES) {
  test(`${path} does not scroll sideways on a phone`, async ({ page }, info) => {
    test.skip(info.project.name !== "mobile", "mobile only");
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
