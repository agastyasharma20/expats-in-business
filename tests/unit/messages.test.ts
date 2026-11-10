import { describe, expect, it } from "vitest";

import en from "@/messages/en.json";
import pl from "@/messages/pl.json";
import uk from "@/messages/uk.json";

type Tree = { [key: string]: string | Tree };

function keys(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree)
    .filter(([key]) => key !== "_status")
    .flatMap(([key, value]) =>
      typeof value === "string" ? [`${prefix}${key}`] : keys(value, `${prefix}${key}.`),
    )
    .sort();
}

describe("message catalogues", () => {
  it.each([
    ["pl", pl],
    ["uk", uk],
  ])("%s has exactly the same keys as en", (_locale, messages) => {
    expect(keys(messages as Tree)).toEqual(keys(en as Tree));
  });

  it("pl and uk carry a translation status marker until they are translated", () => {
    expect(pl._status).toMatch(/^TODO/);
    expect(uk._status).toMatch(/^TODO/);
  });
});
