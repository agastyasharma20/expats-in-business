import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { colorTokens } from "@/lib/design/tokens";

const css = readFileSync(path.resolve(__dirname, "../../app/globals.css"), "utf8");
const rootStart = css.indexOf(":root {");
const rootBlock = css.slice(rootStart, css.indexOf("}", rootStart));

function cssHexTokens(): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const match of rootBlock.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    const [, name, value] = match;
    if (name && value) tokens[name] = value.toLowerCase();
  }
  return tokens;
}

describe("colour tokens", () => {
  it("lib/design/tokens.ts mirrors every hex token in app/globals.css", () => {
    expect(colorTokens).toEqual(cssHexTokens());
  });
});
