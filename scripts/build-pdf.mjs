// Builds docs/EiB-Platform-Overview.pdf from docs/pdf/overview.html.
//   node scripts/build-pdf.mjs
// Numbers come from docs/test-evidence/summary.json (written by the QA analysis), so nothing is typed by hand.
// Needs the screenshots in docs/screenshots (node scripts/capture-screenshots.mjs).
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "@playwright/test";

const root = process.cwd();
// Usage: node scripts/build-pdf.mjs [template.html] [output.pdf] [data.json]
const [inArg, outArg, dataArg] = process.argv.slice(2);
const htmlPath = path.join(root, inArg ?? "docs/pdf/overview.html");
const outPath = path.join(root, outArg ?? "docs/EiB-Platform-Overview.pdf");
const summary = JSON.parse(
  readFileSync(path.join(root, dataArg ?? "docs/test-evidence/summary.json"), "utf8"),
);
const values = {
  date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
  ...summary,
};

let html = readFileSync(htmlPath, "utf8");
html = html.replace(/\{\{(\w+)\}\}/g, (_, key) => {
  if (!(key in values)) throw new Error(`No value for {{${key}}}`);
  return String(values[key]);
});
const builtPath = path.join(path.dirname(htmlPath), ".built.html");
writeFileSync(builtPath, html);

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(builtPath).toString(), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const out = outPath;
  await page.pdf({ path: out, format: "A4", printBackground: true, preferCSSPageSize: true });
  console.info("wrote", path.relative(root, out));
} finally {
  await browser.close();
}
