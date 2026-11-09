// Regenerates web brand assets from EiB's original files in docs/brand/source/.
// Run: node scripts/brand-assets.mjs   (re-run whenever EiB sends new artwork)
// Sources were downloaded from expatsinbusiness.org on 2026-11-07 (see docs/brand/BRAND.md).
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (file) => path.join(root, "docs/brand/source", file);
const out = (file) => path.join(root, file);

const WORDMARK = source("eib-logo-wordmark-3000.png"); // teal #074C4C on transparent
const MONOGRAM = source("eib-monogram-270.png"); // white "EB" on a Deep Teal circle

mkdirSync(out("public/brand"), { recursive: true });

async function wordmarks() {
  const base = sharp(WORDMARK).trim().resize({ width: 1200 });
  // Original colours, for white or light backgrounds.
  await base.clone().png({ compressionLevel: 9 }).toFile(out("public/brand/eib-logo.png"));
  // White version, for Deep Teal backgrounds: keep the alpha channel, set every pixel to white.
  const { data, info } = await base
    .clone()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
  }
  await sharp(data, { raw: info })
    .png({ compressionLevel: 9 })
    .toFile(out("public/brand/eib-logo-white.png"));
}

async function monograms() {
  await sharp(MONOGRAM).resize(256).png().toFile(out("public/brand/eib-monogram.png"));
  // Next.js file-convention icons (served as <link rel="icon"> and apple-touch-icon).
  await sharp(MONOGRAM).resize(192).png().toFile(out("app/icon.png"));
  await sharp(MONOGRAM).resize(180).png().toFile(out("app/apple-icon.png"));
}

await Promise.all([wordmarks(), monograms()]);
console.info("Brand assets written to public/brand/ and app/icon.png, app/apple-icon.png");
