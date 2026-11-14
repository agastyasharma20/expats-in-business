// Captures the README and PDF screenshots from a running PRODUCTION server with demo data.
//   $env:SHOT_BASE_URL="http://localhost:3000"; node scripts/capture-screenshots.mjs
// Signs in as the demo admin (password from the demo seed) for the admin pages. Output: docs/screenshots/.
import { mkdirSync } from "node:fs";
import path from "node:path";

import { chromium } from "@playwright/test";

const base = process.env.SHOT_BASE_URL ?? "http://localhost:3000";
const out = path.join(process.cwd(), "docs", "screenshots");
mkdirSync(out, { recursive: true });

const PUBLIC = [
  ["home", "/"],
  ["events", "/events"],
  ["festival", "/festivals/demo-festival-of-cultures"],
  ["bubbles", "/bubbles"],
  ["guides", "/guides"],
  ["providers", "/providers"],
  ["pricing", "/pricing"],
  ["chapters", "/chapters"],
  ["ambassadors", "/ambassadors"],
  ["team", "/team"],
  ["home-pl", "/pl"],
];
const MOBILE = new Set(["home", "events", "team", "bubbles"]);
const MEMBER = [
  ["dashboard", "/dashboard"],
  ["roadmap", "/roadmap"],
  ["concierge", "/concierge"],
  ["connections", "/connections"],
];
const ADMIN = [
  ["admin", "/admin"],
  ["admin-team", "/admin/team"],
  ["admin-members", "/admin/members"],
  ["admin-settings", "/admin/settings"],
];

async function shot(page, name, route, size, suffix) {
  await page.setViewportSize(size);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(new URL(route, base).toString(), { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const file = path.join(out, `${name}-${suffix}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.info("saved", path.relative(process.cwd(), file));
}

const browser = await chromium.launch();
try {
  const desktop = { width: 1440, height: 900 };
  const phone = { width: 375, height: 812 };

  const visitor = await browser.newContext();
  const page = await visitor.newPage();
  for (const [name, route] of PUBLIC) {
    await shot(page, name, route, desktop, "desktop");
    if (MOBILE.has(name)) await shot(page, name, route, phone, "mobile");
  }

  async function signedIn(email) {
    const context = await browser.newContext();
    const response = await context.request.post(
      new URL("/api/auth/sign-in/email", base).toString(),
      {
        headers: { origin: base },
        data: { email, password: "Demo!2026" },
      },
    );
    if (!response.ok()) throw new Error(`sign-in failed for ${email}: ${response.status()}`);
    return context.newPage();
  }

  const member = await signedIn("karim@demo.eib.local");
  for (const [name, route] of MEMBER) await shot(member, name, route, desktop, "desktop");
  const admin = await signedIn("admin@demo.eib.local");
  for (const [name, route] of ADMIN) await shot(admin, name, route, desktop, "desktop");
} finally {
  await browser.close();
}
