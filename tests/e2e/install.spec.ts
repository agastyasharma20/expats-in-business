import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** The visible install entry points and the animated install popup, on every kind of device. */
const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const FIREFOX_DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0";

async function openDialog(page: Page) {
  await page.getByTestId("install-button").first().click();
  const dialog = page.getByRole("dialog", { name: "Install the EiB app" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("install entry points", () => {
  test("every public page has a visible Install app button", async ({ page }) => {
    for (const path of ["/", "/events", "/about", "/pricing", "/install"]) {
      await page.goto(path);
      await expect(page.getByTestId("install-button").first(), path).toBeVisible();
    }
  });

  test("the footer links to the shareable install page", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator("footer").getByRole("link", { name: "Install app", exact: true }),
    ).toHaveAttribute("href", "/install");
  });

  test("the button opens a dialog that traps focus and closes with Escape", async ({ page }) => {
    await page.goto("/");
    const button = page.getByTestId("install-button").first();
    await button.click();
    const dialog = page.getByRole("dialog", { name: "Install the EiB app" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId("install-steps").getByRole("listitem").first()).toBeVisible();
    // Focus is inside the dialog and stays there while tabbing.
    for (let i = 0; i < 8; i += 1) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(button).toBeFocused();
  });

  test("the open dialog is accessible", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await openDialog(page);
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
      .include('[role="dialog"]')
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test("a friendly card appears after a short wait and can be dismissed for good", async ({
    page,
  }) => {
    await page.clock.install();
    await page.goto("/");
    await expect(page.getByTestId("install-prompt")).toHaveCount(0);
    await page.clock.fastForward(9_000);
    const card = page.getByTestId("install-prompt");
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Not now" }).click();
    await expect(card).toBeHidden();
    await page.reload();
    await page.clock.fastForward(9_000);
    await expect(page.getByTestId("install-prompt")).toHaveCount(0);
  });

  test("the card's Install app button opens the steps", async ({ page }) => {
    await page.clock.install();
    await page.goto("/");
    await page.clock.fastForward(9_000);
    await page.getByTestId("install-prompt-action").click();
    await expect(page.getByRole("dialog", { name: "Install the EiB app" })).toBeVisible();
  });
});

test.describe("steps match the device", () => {
  test.describe("iPhone Safari", () => {
    test.use({ userAgent: IPHONE_SAFARI });
    test("shows Share and Add to Home Screen, and no QR code", async ({ page }) => {
      await page.goto("/install");
      await expect(page.getByTestId("install-steps")).toContainText("Share");
      await expect(page.getByTestId("install-steps")).toContainText("Add to Home Screen");
      await expect(page.getByTestId("install-qr")).toHaveCount(0);
    });
  });

  test.describe("Android Chrome", () => {
    test.use({ userAgent: ANDROID_CHROME });
    test("shows the browser menu steps", async ({ page }) => {
      await page.goto("/install");
      await expect(page.getByTestId("install-steps")).toContainText("Install app");
    });
  });

  test.describe("Firefox on a computer", () => {
    test.use({ userAgent: FIREFOX_DESKTOP });
    test("says plainly it cannot install and offers the QR code", async ({ page }) => {
      await page.goto("/install");
      await expect(page.getByTestId("install-steps")).toContainText("cannot install web apps");
      await expect(page.getByTestId("install-qr").getByRole("img")).toBeVisible();
    });
  });

  test("all other devices are listed on the install page", async ({ page }) => {
    await page.goto("/install");
    for (const name of ["iPhone and iPad", "Android", "Computer"]) {
      await expect(page.getByRole("heading", { name, level: 4 })).toBeVisible();
    }
  });
});

test.describe("install page", () => {
  test("is accessible, translated and fits a phone", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/install");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Install EiB");
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
      .analyze();
    expect(violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
    await page.goto("/pl/install");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Zainstaluj EiB");
    await page.goto("/uk/install");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Встановіть EiB");
  });
});
