import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// CLAUDE.md: "Never hard-code hex in components." Colours live in app/globals.css and its mirror
// lib/design/tokens.ts; everything that renders UI must use tokens (Tailwind classes or var(--x)).
const root = path.resolve(__dirname, "../..");
const scanned = ["components", "app"];
const allowed = new Set([path.join("app", "globals.css")]);

/** Hex colour literals in code, ignoring comments and in-page anchors like "#buttons". */
function findHexColours(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const hex = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi;
  return [...code.matchAll(hex)]
    .filter((match) => {
      const index = match.index ?? 0;
      const before = code.slice(Math.max(0, index - 8), index);
      // In-page anchors only: href="#abc" or href={`#${id}`}.
      return !/href=(?:"|'|{`)$/.test(before);
    })
    .map((match) => match[0]);
}

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return files(full);
    return /\.(tsx?|css)$/.test(name) ? [full] : [];
  });
}

describe("findHexColours", () => {
  it("finds colours in classes and styles", () => {
    expect(findHexColours('className="bg-[#12635a]"')).toEqual(["#12635a"]);
    expect(findHexColours("style={{ color: '#fff' }}")).toEqual(["#fff"]);
    expect(findHexColours('const brand = "#093334";')).toEqual(["#093334"]);
    expect(findHexColours("border: 1px solid #0a3335aa;")).toEqual(["#0a3335aa"]);
  });

  it("ignores comments and anchors", () => {
    expect(findHexColours("// Founding member #017\n/* #ffffff */")).toEqual([]);
    expect(findHexColours('href="#buttons"')).toEqual([]);
    expect(findHexColours("href={`#${id}`}")).toEqual([]);
  });
});

describe("no hard-coded colours", () => {
  it("components and app files contain no hex colour literals", () => {
    const offenders = scanned
      .flatMap((dir) => files(path.join(root, dir)))
      .filter((file) => !allowed.has(path.relative(root, file)))
      .flatMap((file) =>
        findHexColours(readFileSync(file, "utf8")).map(
          (colour) => `${path.relative(root, file)}: ${colour}`,
        ),
      );
    expect(offenders).toEqual([]);
  });
});
