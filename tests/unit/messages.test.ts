import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";
import { describe, expect, it } from "vitest";

import en from "@/messages/en.json";
import pl from "@/messages/pl.json";
import uk from "@/messages/uk.json";

type Tree = { [key: string]: string | Tree };

function entries(tree: Tree, prefix = ""): [string, string][] {
  return Object.entries(tree)
    .filter(([key]) => key !== "_status")
    .flatMap(([key, value]) =>
      typeof value === "string" ? [[`${prefix}${key}`, value]] : entries(value, `${prefix}${key}.`),
    );
}

const keys = (tree: Tree) =>
  entries(tree)
    .map(([key]) => key)
    .sort();

/** Every argument a message uses ({name}, {count, plural, …}), including inside plural branches. */
function argumentsOf(elements: MessageFormatElement[], found = new Set<string>()): Set<string> {
  for (const el of elements) {
    // Literal text also has a string `value`; everything else with one is an argument name.
    if (el.type !== TYPE.literal && "value" in el && typeof el.value === "string") {
      found.add(el.value);
    }
    if (el.type === TYPE.plural || el.type === TYPE.select) {
      for (const option of Object.values(el.options)) argumentsOf(option.value, found);
    }
    if (el.type === TYPE.tag) argumentsOf(el.children, found);
  }
  return found;
}

/** Plural categories used by any plural argument in the message. */
function pluralCategories(
  elements: MessageFormatElement[],
  found = new Set<string>(),
): Set<string> {
  for (const el of elements) {
    if (el.type === TYPE.plural) {
      for (const [category, option] of Object.entries(el.options)) {
        found.add(category);
        pluralCategories(option.value, found);
      }
    }
  }
  return found;
}

const translations = [
  ["pl", pl],
  ["uk", uk],
] as const;

describe("message catalogues", () => {
  it.each(translations)("%s has exactly the same keys as en", (_locale, messages) => {
    expect(keys(messages as Tree)).toEqual(keys(en as Tree));
  });

  it("pl and uk say they are machine-translated and not reviewed yet", () => {
    expect(pl._status).toMatch(/reviewed: no/);
    expect(uk._status).toMatch(/reviewed: no/);
  });

  it.each([["en", en] as const, ...translations])(
    "every %s message is valid ICU",
    (_locale, messages) => {
      const broken = entries(messages as Tree).filter(([, text]) => {
        try {
          parse(text);
          return false;
        } catch {
          return true;
        }
      });
      expect(broken.map(([key]) => key)).toEqual([]);
    },
  );

  it.each(translations)(
    "%s keeps every placeholder of the English message",
    (_locale, messages) => {
      const source = new Map(entries(en as Tree));
      const mismatched = entries(messages as Tree).filter(([key, text]) => {
        const english = source.get(key);
        if (!english || key.startsWith("styleguide.")) return false;
        const want = [...argumentsOf(parse(english))].sort();
        const got = [...argumentsOf(parse(text))].sort();
        return JSON.stringify(want) !== JSON.stringify(got);
      });
      expect(mismatched.map(([key]) => key)).toEqual([]);
    },
  );

  it.each(translations)(
    "%s plurals cover the few and many forms Slavic grammar needs",
    (_locale, messages) => {
      const incomplete = entries(messages as Tree).filter(([, text]) => {
        const categories = pluralCategories(parse(text));
        if (!categories.size) return false;
        // Branches like "one {Your chapter}" with an exact =0 are fine; only real count plurals need few/many.
        return (
          categories.has("other") &&
          categories.has("one") &&
          !(categories.has("few") && categories.has("many"))
        );
      });
      expect(incomplete.map(([key]) => key)).toEqual([]);
    },
  );
});

describe("message fallback", () => {
  it("falls back to English for a key missing deep inside a translated namespace", async () => {
    const { mergeMessages } = await import("@/lib/i18n/merge");
    const merged = mergeMessages(
      { a: { b: "English B", c: "English C" }, d: "English D" },
      { a: { b: "Polski B" } },
    ) as { a: { b: string; c: string }; d: string };
    expect(merged).toEqual({ a: { b: "Polski B", c: "English C" }, d: "English D" });
  });
});
