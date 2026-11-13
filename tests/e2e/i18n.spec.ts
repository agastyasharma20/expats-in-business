import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * M15: Polish and Ukrainian are real translations (html lang, UI text), every public page has a
 * canonical URL and hreflang alternates, guides label machine-translated summaries, and social
 * cards exist for festivals. Axe must be clean in every language (longer words, other scripts).
 */
test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop", "desktop only"));

const pages = [
  { path: "/pl", lang: "pl", text: "Sieć biznesowa dla obcokrajowców" },
  { path: "/uk", lang: "uk", text: "Бізнес-мережа для іноземців" },
  { path: "/pl/events", lang: "pl", text: "Spotkania" },
  { path: "/uk/guides", lang: "uk", text: "Путівники" },
] as const;

for (const { path, lang, text } of pages) {
  test(`${path} is translated, has hreflang and is axe clean`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(text);
    for (const hreflang of ["en", "pl", "uk", "x-default"]) {
      await expect(page.locator(`link[rel="alternate"][hreflang="${hreflang}"]`)).toHaveCount(1);
    }
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`/${lang}(/|$)`),
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
  });
}

test("guides in Polish show a labelled machine-translated summary", async ({ page }) => {
  await page.goto("/pl/guides/pesel");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Jak uzyskać numer PESEL");
  await expect(page.getByTestId("machine-translated")).toContainText("przetłumaczone maszynowo");
  await expect(page.locator('script[type="application/ld+json"]').first()).toBeAttached();
});

test("festival pages have a social card image and FAQ structured data", async ({
  page,
  request,
}) => {
  test.skip(process.env.E2E_EXPECT_DB !== "true", "needs the seeded database");
  await page.goto("/uk/festivals/demo-festival-of-cultures");
  const og = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(og).toBeTruthy();
  const image = await request.get(new URL(og!).pathname);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toContain("image/png");
  const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(jsonLd.join(" ")).toContain('"FAQPage"');
  expect(jsonLd.join(" ")).toContain('"Festival"');
});

test("robots and sitemap are served", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /admin");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain('hreflang="uk"');
});
