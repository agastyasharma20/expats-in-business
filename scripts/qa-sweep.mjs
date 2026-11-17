// Route-by-route QA sweep against a running production server with demo data.
//   $env:QA_BASE_URL="http://localhost:3000"; node scripts/qa-sweep.mjs [out.json]
// For every route, as the right persona and at 1440 px and 375 px, it records: HTTP status, final URL,
// console errors, page errors, failed requests, axe (WCAG 2 A and AA) violations, a single h1,
// horizontal overflow and nearly empty pages. Access control is checked by scripts/qa-access.mjs.
import { writeFileSync } from "node:fs";

import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";

const base = process.env.QA_BASE_URL ?? "http://localhost:3000";
const outFile = process.argv[2] ?? "qa-sweep.json";
const ids = JSON.parse(process.env.QA_IDS ?? "{}");
const PASSWORD = "Demo!2026";
const PERSONAS = {
  admin: "admin@demo.eib.local",
  member: "priya@demo.eib.local",
  karim: "karim@demo.eib.local",
  provider: "marta.provider@demo.eib.local",
};

/** [path, persona, expected]: expected "ok" (200) or a redirect/forbidden note for the matrix. */
const ROUTES = [
  // public
  ...[
    "/",
    "/events",
    "/events/formats",
    `/events/${ids.event}`,
    "/festivals",
    `/festivals/${ids.festival}`,
    "/chapters",
    `/chapters/${ids.chapter}`,
    `/countries/${ids.country}`,
    "/bubbles",
    `/bubbles/${ids.bubble}`,
    "/guides",
    `/guides/${ids.guide}`,
    "/members",
    `/members/${ids.member}`,
    "/providers",
    `/providers/${ids.provider}`,
    "/providers/verification-criteria",
    "/businesses",
    "/pricing",
    "/pricing/corporate",
    "/ambassadors",
    "/careers",
    `/careers/${ids.career}`,
    "/volunteer",
    "/get-involved",
    "/team",
    "/help",
    "/concierge",
    "/legal/privacy",
    "/legal/terms",
    "/legal/cookies",
    "/sign-in",
    `/sponsor-report/${ids.token}`,
    "/styleguide",
  ].map((p) => [p, "visitor"]),
  // member
  ...[
    "/dashboard",
    "/onboarding",
    "/roadmap",
    "/roulette",
    "/community",
    `/community/${ids.group}`,
    "/connections",
    "/notifications",
    "/my/events",
    "/my/businesses",
    "/settings",
    "/settings/profile",
    "/settings/account",
    "/settings/email",
    "/settings/privacy",
    "/settings/billing",
    `/tickets/${ids.ticket}`,
    `/met/${ids.event}`,
  ].map((p) => [p, "karim"]),
  // provider
  ...["/provider/inbox", "/provider/analytics"].map((p) => [p, "provider"]),
  // admin
  ...[
    "/admin",
    "/admin/events",
    "/admin/events/new",
    `/admin/events/${ids.eventId}/check-in`,
    `/admin/events/${ids.eventId}/pulse`,
    "/admin/festivals",
    "/admin/festivals/new",
    `/admin/festivals/${ids.festId}`,
    "/admin/members",
    "/admin/providers",
    `/admin/providers/${ids.providerId}`,
    "/moderation",
    "/admin/applications",
    "/admin/ambassadors",
    "/admin/roles",
    "/admin/roulette",
    "/admin/audit",
    "/admin/catalogs",
    "/admin/team",
    "/admin/settings",
    "/admin/system",
  ].map((p) => [p, "admin"]),
];

const browser = await chromium.launch();
const contexts = new Map();

async function contextFor(persona) {
  if (contexts.has(persona)) return contexts.get(persona);
  const context = await browser.newContext();
  if (persona !== "visitor") {
    const response = await context.request.post(
      new URL("/api/auth/sign-in/email", base).toString(),
      {
        headers: { origin: base },
        data: { email: PERSONAS[persona], password: PASSWORD },
      },
    );
    if (!response.ok()) throw new Error(`sign-in failed for ${persona}: ${response.status()}`);
  }
  contexts.set(persona, context);
  return context;
}

async function visit(path, persona, viewport, locale = "") {
  const context = await contextFor(persona);
  const page = await context.newPage();
  await page.setViewportSize(viewport);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const consoleErrors = [];
  const failed = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text().slice(0, 160)));
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message.slice(0, 160)}`));
  page.on("response", (r) => {
    const status = r.status();
    if (status >= 400 && !r.url().includes("/_next/image"))
      failed.push(`${status} ${new URL(r.url()).pathname}`);
  });
  const result = { path: `${locale}${path}`, persona, viewport: viewport.width };
  try {
    const response = await page.goto(new URL(`${locale}${path}`, base).toString(), {
      waitUntil: "load",
      timeout: 60_000,
    });
    result.status = response?.status() ?? 0;
    await page.waitForTimeout(700);
    result.finalPath = new URL(page.url()).pathname;
    result.h1 = await page.locator("h1").count();
    result.textLength = (
      await page
        .locator("main")
        .first()
        .innerText()
        .catch(() => "")
    ).trim().length;
    result.overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    result.lang = await page.evaluate(() => document.documentElement.lang);
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    result.axe = axe.violations.map((v) => `${v.id} (${v.impact}, ${v.nodes.length})`);
    result.consoleErrors = consoleErrors;
    result.failedRequests = failed.filter(
      (f) => !f.startsWith(`${result.status} ${new URL(page.url()).pathname}`),
    );
  } catch (error) {
    result.error = String(error.message ?? error).slice(0, 200);
  } finally {
    await page.close();
  }
  return result;
}

// QA_PERSONAS=karim,admin,provider re-checks only those personas' routes (no localised pass).
const only = process.env.QA_PERSONAS?.split(",");
const results = [];
const desktop = { width: 1440, height: 900 };
const phone = { width: 375, height: 812 };

try {
  for (const [path, persona] of ROUTES.filter(([, who]) => !only || only.includes(who))) {
    if (path.includes("undefined")) {
      results.push({ path, persona, error: "missing id for dynamic route (QA_IDS)" });
      continue;
    }
    results.push(await visit(path, persona, desktop));
    results.push(await visit(path, persona, phone));
    console.info("swept", persona, path);
  }
  // Public pages in Polish and Ukrainian (desktop).
  if (!only)
    for (const [path, persona] of ROUTES.filter(([, who]) => who === "visitor").slice(0, 28)) {
      if (path.includes("undefined") || path === "/styleguide") continue;
      for (const locale of ["/pl", "/uk"])
        results.push(await visit(path === "/" ? "" : path, persona, desktop, locale));
      console.info("localised", path);
    }
  writeFileSync(
    outFile,
    JSON.stringify({ base, when: new Date().toISOString(), results }, null, 2),
  );
  console.info("wrote", outFile, results.length, "page checks");
} finally {
  await browser.close();
}
