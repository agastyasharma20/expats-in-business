// Lists pages of docs/pdf/.overview.built.html whose content is taller than the A4 page.
//   node scripts/build-pdf.mjs <template> <out.pdf> <data.json> && node scripts/check-pdf-overflow.mjs
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "@playwright/test";

// Usage: node scripts/check-pdf-overflow.mjs [docs/pdf/.built.html]
const file = path.join(process.cwd(), process.argv[2] ?? "docs/pdf/.built.html");
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(file).toString(), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll(".page")].map((el, i) => {
      // Content bottom = lowest child bottom, compared with the folio line (page bottom padding).
      const top = el.getBoundingClientRect().top;
      const folio = el.querySelector(".folio");
      const limit = folio ? folio.getBoundingClientRect().top - top : el.clientHeight;
      let bottom = 0;
      for (const child of el.children) {
        if (child.classList.contains("folio")) continue;
        bottom = Math.max(bottom, child.getBoundingClientRect().bottom - top);
      }
      return {
        page: i + 1,
        bottom: Math.round(bottom),
        limit: Math.round(limit),
        over: Math.round(bottom - limit),
      };
    }),
  );
  for (const r of rows)
    console.info(
      `page ${String(r.page).padStart(2)}  content ends ${r.bottom}px, folio at ${r.limit}px  ${r.over > 0 ? `OVERFLOW by ${r.over}px` : "ok"}`,
    );
} finally {
  await browser.close();
}
