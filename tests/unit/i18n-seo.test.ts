import { describe, expect, it } from "vitest";

import { guideText, type GuideFrontmatter } from "@/lib/content/guides";
import { emailLocale, emailTranslator, localizedUrl } from "@/lib/i18n/email";
import { languageAlternates, localizedPath } from "@/lib/seo";

describe("localized paths and hreflang", () => {
  it("prefixes every locale except the default", () => {
    expect(localizedPath("/events", "en")).toBe("/events");
    expect(localizedPath("/events", "pl")).toBe("/pl/events");
    expect(localizedPath("/", "uk")).toBe("/uk");
    expect(localizedPath("/", "en")).toBe("/");
  });

  it("lists every language plus x-default", () => {
    expect(languageAlternates("/festivals/x")).toEqual({
      en: "/festivals/x",
      pl: "/pl/festivals/x",
      uk: "/uk/festivals/x",
      "x-default": "/festivals/x",
    });
  });
});

describe("email language", () => {
  it("uses the member's saved language and falls back to English", () => {
    expect(emailLocale("pl")).toBe("pl");
    expect(emailLocale("uk")).toBe("uk");
    expect(emailLocale(null)).toBe("en");
    expect(emailLocale("de")).toBe("en");
    expect(emailLocale("../../etc")).toBe("en");
  });

  it("translates email copy with values filled in", () => {
    expect(emailTranslator("pl").t("ticket.confirmed.subject", { event: "Mixer" })).toBe(
      "Twój bilet: Mixer",
    );
    expect(emailTranslator("uk").t("verify.body", { email: "a@b.pl", hours: 24 })).toContain(
      "a@b.pl",
    );
    expect(emailTranslator(undefined).t("magicLink.cta")).toBe("Sign in");
  });

  it("builds links in the recipient's language", () => {
    expect(localizedUrl("/tickets/1", "pl", "https://eib.example")).toBe(
      "https://eib.example/pl/tickets/1",
    );
    expect(localizedUrl("/tickets/1", "en", "https://eib.example")).toBe(
      "https://eib.example/tickets/1",
    );
  });
});

describe("guide summaries", () => {
  const fm = {
    title: "Getting a PESEL number",
    description: "How foreigners get a PESEL number.",
    translations: {
      pl: { title: "Jak uzyskać PESEL", description: "Jak cudzoziemcy uzyskują PESEL." },
    },
  } as unknown as GuideFrontmatter;

  it("shows the machine-translated summary when it exists, labelled as such", () => {
    expect(guideText(fm, "pl")).toEqual({
      title: "Jak uzyskać PESEL",
      description: "Jak cudzoziemcy uzyskują PESEL.",
      machine: true,
    });
  });

  it("keeps the original for English and missing translations", () => {
    expect(guideText(fm, "en").machine).toBe(false);
    expect(guideText(fm, "uk").title).toBe("Getting a PESEL number");
  });
});
