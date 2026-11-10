// Lighthouse (mobile) against a PRODUCTION server. Fails if any category scores below the target.
//   npm run build && npm start   (or: npx next start -p 3100)
//   npm run lighthouse                         → audits the routes below on http://localhost:3000
//   LH_BASE_URL=http://localhost:3100 npm run lighthouse
//   npm run lighthouse -- /pricing /legal/privacy   → audits only the given paths
// Uses Playwright's Chromium when CHROME_PATH is not set. Reports land in .lighthouseci/ (git-ignored).
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium } from "@playwright/test";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";

const TARGET = Number(process.env.LH_TARGET ?? 90);
const base = process.env.LH_BASE_URL ?? "http://localhost:3000";
// Brief targets: /, /c/krakow/events, /events/[id] and /pricing. Add them here as they ship.
const DEFAULT_ROUTES = ["/"];
const routes = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_ROUTES;
const categories = ["performance", "accessibility", "best-practices", "seo"];
const outDir = path.join(process.cwd(), ".lighthouseci");
mkdirSync(outDir, { recursive: true });

const chrome = await chromeLauncher.launch({
  chromePath: process.env.CHROME_PATH ?? chromium.executablePath(),
  chromeFlags: ["--headless=new", "--no-sandbox"],
});

let failed = false;
try {
  for (const route of routes) {
    const url = new URL(route, base).toString();
    // Warm the route once so first-compile or cold-cache time is not measured.
    await fetch(url).catch(() => undefined);
    const result = await lighthouse(url, {
      port: chrome.port,
      output: "html",
      onlyCategories: categories,
      logLevel: "error",
    });
    if (!result) throw new Error(`No Lighthouse result for ${url}`);
    const { lhr, report } = result;
    const file = path.join(outDir, `${route.replace(/[^a-z0-9]+/gi, "_") || "home"}.html`);
    writeFileSync(file, Array.isArray(report) ? report[0] : report);

    const scores = categories.map((id) => [id, Math.round((lhr.categories[id]?.score ?? 0) * 100)]);
    const metrics = ["largest-contentful-paint", "cumulative-layout-shift", "total-blocking-time"]
      .map(
        (id) =>
          `${id
            .split("-")
            .map((w) => w[0])
            .join("")
            .toUpperCase()} ${lhr.audits[id]?.displayValue ?? "?"}`,
      )
      .join(" · ");
    console.info(`${route}  ${scores.map(([id, s]) => `${id} ${s}`).join(" · ")}  |  ${metrics}`);
    for (const [id, score] of scores) {
      if (score < TARGET) {
        failed = true;
        const failing = Object.values(lhr.audits)
          .filter(
            (a) =>
              a.score !== null &&
              a.score < 0.9 &&
              lhr.categories[id].auditRefs.some((r) => r.id === a.id && r.weight > 0),
          )
          .map((a) => `    - ${a.title}${a.displayValue ? ` (${a.displayValue})` : ""}`);
        console.error(`  ✗ ${id} ${score} < ${TARGET}\n${failing.slice(0, 8).join("\n")}`);
      }
    }
  }
} finally {
  await chrome.kill();
}

if (failed) process.exit(1);
console.info(`✓ All categories ≥ ${TARGET}. Reports: ${outDir}`);
