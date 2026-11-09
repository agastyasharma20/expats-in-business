import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { facts, type Fact } from "@/config/facts";
import {
  accountNav,
  allInternalHrefs,
  footerColumns,
  legalNav,
  mainNav,
  socialNav,
} from "@/lib/nav";
import en from "@/messages/en.json";

function duplicates(values: readonly string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

function message(key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], en);
}

const menus = {
  header: [...mainNav, accountNav.signIn],
  footerAll: footerColumns.flatMap((column) => column.items),
  legal: legalNav,
};

describe("navigation config", () => {
  it.each(Object.entries(menus))("%s has no duplicate hrefs or labels", (_name, items) => {
    expect(duplicates(items.map((item) => item.href))).toEqual([]);
    expect(duplicates(items.map((item) => item.labelKey))).toEqual([]);
  });

  it("social links have no duplicates", () => {
    expect(duplicates(socialNav.map((item) => item.fact))).toEqual([]);
    expect(duplicates(socialNav.map((item) => item.labelKey))).toEqual([]);
  });

  it("every label and heading exists in the English messages", () => {
    const keys = [
      ...Object.values(menus).flatMap((items) => items.map((item) => item.labelKey)),
      ...socialNav.map((item) => item.labelKey),
      ...footerColumns.map((column) => column.headingKey),
    ];
    expect(keys.filter((key) => typeof message(key) !== "string")).toEqual([]);
  });

  it("internal hrefs are root-relative and unique", () => {
    const hrefs = allInternalHrefs();
    expect(hrefs.every((href) => href.startsWith("/"))).toBe(true);
    expect(duplicates(hrefs)).toEqual([]);
  });
});

describe("facts registry", () => {
  const factsDoc = readFileSync(path.resolve(__dirname, "../../docs/FACTS.md"), "utf8");
  const entries = Object.entries(facts) as [string, Fact][];

  it.each(entries.filter(([, fact]) => fact.status === "verified"))(
    "%s is verified with a source, a review date and a FACTS.md entry",
    (_key, fact) => {
      expect(fact.source).toMatch(/^https:\/\//);
      expect(fact.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(factsDoc).toContain(fact.value.replace(/^https:\/\//, ""));
    },
  );

  it("social links point at https URLs", () => {
    for (const item of socialNav) expect(facts[item.fact].value).toMatch(/^https:\/\//);
  });
});
