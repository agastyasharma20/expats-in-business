// Fills keys missing from messages/pl.json and messages/uk.json with the English text, removes keys
// that no longer exist in en.json, and keeps every existing translation. Run after editing en.json:
//   npm run messages:sync
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (locale) =>
  JSON.parse(readFileSync(path.join(root, "messages", `${locale}.json`), "utf8"));
const STATUS = "TODO: copied from en, translate in M15 (machine-translated, reviewed: no)";

/** Same shape as `source`, taking values from `existing` where they exist. */
function merge(source, existing) {
  const out = {};
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object") {
      out[key] = merge(
        value,
        existing?.[key] && typeof existing[key] === "object" ? existing[key] : {},
      );
    } else {
      out[key] = typeof existing?.[key] === "string" ? existing[key] : value;
    }
  }
  return out;
}

const en = read("en");
for (const locale of ["pl", "uk"]) {
  const current = read(locale);
  const synced = { _status: current._status ?? STATUS, ...merge(en, current) };
  writeFileSync(
    path.join(root, "messages", `${locale}.json`),
    JSON.stringify(synced, null, 2) + "\n",
  );
  console.info(`messages/${locale}.json synced with en.json`);
}
