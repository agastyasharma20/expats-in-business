import { describe, expect, it } from "vitest";

import { contrastRatio, formatRatio, meetsContrast, parseHex } from "@/lib/design/contrast";
import { colorTokens, contrastPairs } from "@/lib/design/tokens";

describe("contrast maths", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#093334", "#c5e8eb")).toBeCloseTo(
      contrastRatio("#c5e8eb", "#093334"),
      10,
    );
  });

  it("rejects malformed colours", () => {
    expect(() => parseHex("teal")).toThrow();
    expect(() => parseHex("#fff")).toThrow();
  });

  it("formats by rounding down", () => {
    expect(formatRatio(4.499)).toBe("4.49");
  });
});

describe("design-system contrast pairs", () => {
  it.each(contrastPairs)("$id: $foreground on $background meets $level", (pair) => {
    const ratio = contrastRatio(colorTokens[pair.foreground], colorTokens[pair.background]);
    expect(meetsContrast(ratio, pair.level), `${formatRatio(ratio)}:1`).toBe(true);
  });

  it("has unique ids", () => {
    const ids = contrastPairs.map((pair) => pair.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
