import { describe, expect, it } from "vitest";

import {
  chapterSlugFor,
  isValidTimeZone,
  launchChapterSchema,
  withCountryDefaults,
} from "@/lib/growth/launch";

const valid = { city: "Gdańsk", countryCode: "pl", status: "launching" };

describe("chapter launch form", () => {
  it("needs only a city, a country and a status", () => {
    const parsed = launchChapterSchema.parse({
      ...valid,
      timezone: "",
      currency: "",
      tagline: "",
      leadEmail: "",
    });
    expect(parsed.countryCode).toBe("PL");
    expect(parsed.timezone).toBeUndefined();
    expect(parsed.currency).toBeUndefined();
    expect(parsed.leadEmail).toBeUndefined();
  });

  it("normalises currency and lead email", () => {
    const parsed = launchChapterSchema.parse({
      ...valid,
      currency: "eur",
      leadEmail: " Lead@Example.COM ",
    });
    expect(parsed.currency).toBe("EUR");
    expect(parsed.leadEmail).toBe("lead@example.com");
  });

  it("rejects bad input", () => {
    for (const bad of [
      { ...valid, city: "A" },
      { ...valid, countryCode: "POL" },
      { ...valid, status: "requested" },
      { ...valid, timezone: "Mars/Olympus" },
      { ...valid, currency: "zloty" },
      { ...valid, leadEmail: "not-an-email" },
    ]) {
      expect(launchChapterSchema.safeParse(bad).success).toBe(false);
    }
  });

  it("checks time zones against the real list", () => {
    expect(isValidTimeZone("Europe/Warsaw")).toBe(true);
    expect(isValidTimeZone("Europe/Atlantis")).toBe(false);
  });

  it("gives each city one stable, accent-free slug", () => {
    expect(chapterSlugFor("Kraków")).toBe("krakow");
    expect(chapterSlugFor(" Gdańsk ")).toBe("gdansk");
    expect(chapterSlugFor("São Paulo")).toBe("sao-paulo");
    expect(chapterSlugFor("!!")).toBe("");
  });

  it("falls back to the country's time zone and currency", () => {
    const country = { defaultTimezone: "Europe/Warsaw", defaultCurrency: "PLN" };
    const empty = launchChapterSchema.parse({ ...valid });
    expect(withCountryDefaults(empty, country)).toEqual({
      timezone: "Europe/Warsaw",
      currency: "PLN",
    });
    const own = launchChapterSchema.parse({ ...valid, timezone: "Europe/Berlin", currency: "EUR" });
    expect(withCountryDefaults(own, country)).toEqual({
      timezone: "Europe/Berlin",
      currency: "EUR",
    });
  });
});
