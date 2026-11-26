// Bundles lib/pwa/sw.ts into public/sw.js (a classic worker script, no imports at runtime).
// Runs before `npm run dev` and `npm run build`; the output is git-ignored.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Keep in step with lib/i18n/routing.ts (tests/unit/pwa.test.ts fails if they drift apart).
const locales = ["en", "pl", "uk"];
const defaultLocale = locales.includes(process.env.DEFAULT_LOCALE ?? "")
  ? process.env.DEFAULT_LOCALE
  : "en";

const result = await build({
  entryPoints: [path.join(root, "lib/pwa/sw.ts")],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  target: "es2020",
  define: {
    __EIB_LOCALES__: JSON.stringify(locales),
    __EIB_DEFAULT_LOCALE__: JSON.stringify(defaultLocale),
  },
});
writeFileSync(path.join(root, "public/sw.js"), result.outputFiles[0].text);
console.info("Service worker written to public/sw.js");
