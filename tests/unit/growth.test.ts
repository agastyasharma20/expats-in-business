import { describe, expect, it } from "vitest";

import {
  ambassadorDetailsSchema,
  ambassadorPlaceSchema,
  canMove,
  cityKey,
  cityRequestSchema,
  nextMoves,
  placeLabel,
  REVIEW_STATUSES,
} from "@/lib/growth/rules";
import { growNav } from "@/lib/nav";
import en from "@/messages/en.json";

const details = {
  motivation:
    "I moved abroad myself and want newcomers in my city to find their people faster than I did, really.",
  experience: "Organised meetups for a student association for two years.",
  languages: ["en", "pl"],
  hoursPerMonth: "8",
  linkedinUrl: "",
};

describe("review workflow", () => {
  it("never leaves withdrawn and never moves to submitted or withdrawn by review", () => {
    expect(nextMoves("withdrawn")).toEqual([]);
    for (const from of REVIEW_STATUSES) {
      expect(canMove(from, "submitted")).toBe(false);
      expect(canMove(from, "withdrawn")).toBe(false);
      expect(canMove(from, from)).toBe(false);
    }
  });

  it("lets reviewers reopen decisions", () => {
    expect(canMove("accepted", "in_review")).toBe(true);
    expect(canMove("declined", "in_review")).toBe(true);
    expect(canMove("accepted", "declined")).toBe(false);
  });

  it("has a label for every move button and column", () => {
    for (const from of REVIEW_STATUSES)
      for (const to of nextMoves(from)) {
        expect(en.adminGrowth.move).toHaveProperty(to);
        expect(en.adminGrowth.moved).toHaveProperty(to);
      }
  });
});

describe("ambassador place", () => {
  it("accepts each tier with the fields it needs", () => {
    expect(ambassadorPlaceSchema.safeParse({ scope: "global" }).success).toBe(true);
    expect(ambassadorPlaceSchema.safeParse({ scope: "country", countryCode: "IN" }).success).toBe(
      true,
    );
    expect(
      ambassadorPlaceSchema.safeParse({ scope: "city", countryCode: "IN", city: "Indore" }).success,
    ).toBe(true);
    expect(
      ambassadorPlaceSchema.safeParse({ scope: "city", countryCode: "UA", city: "Індор" }).success,
    ).toBe(true);
  });

  it("rejects missing or invalid places", () => {
    expect(ambassadorPlaceSchema.safeParse({ scope: "city", countryCode: "IN" }).success).toBe(
      false,
    );
    expect(ambassadorPlaceSchema.safeParse({ scope: "country", countryCode: "XX" }).success).toBe(
      false,
    );
    expect(
      ambassadorPlaceSchema.safeParse({ scope: "city", countryCode: "PL", city: "<script>" })
        .success,
    ).toBe(false);
    expect(ambassadorPlaceSchema.safeParse({ scope: "admin" }).success).toBe(false);
  });
});

describe("ambassador details", () => {
  it("accepts a complete application", () => {
    expect(ambassadorDetailsSchema.safeParse(details).success).toBe(true);
  });

  it("only accepts https LinkedIn links", () => {
    const ok = (linkedinUrl: string) =>
      ambassadorDetailsSchema.safeParse({ ...details, linkedinUrl }).success;
    expect(ok("https://www.linkedin.com/in/someone")).toBe(true);
    expect(ok("http://www.linkedin.com/in/someone")).toBe(false);
    expect(ok("https://linkedin.com.evil.example/in/x")).toBe(false);
    expect(ok("javascript:alert(1)")).toBe(false);
  });

  it("bounds hours and languages", () => {
    expect(ambassadorDetailsSchema.safeParse({ ...details, hoursPerMonth: "500" }).success).toBe(
      false,
    );
    expect(ambassadorDetailsSchema.safeParse({ ...details, languages: [] }).success).toBe(false);
    expect(ambassadorDetailsSchema.safeParse({ ...details, motivation: "short" }).success).toBe(
      false,
    );
  });
});

describe("city requests", () => {
  it("folds accents, case and spacing into one key", () => {
    expect(cityKey("Kraków")).toBe("krakow");
    expect(cityKey("  KRAKÓW ")).toBe("krakow");
    expect(cityKey("Łódź")).toBe("lodz");
    expect(cityKey("New Delhi")).toBe("new-delhi");
  });

  it("validates country and city", () => {
    expect(cityRequestSchema.safeParse({ countryCode: "IN", city: "Pune" }).success).toBe(true);
    expect(cityRequestSchema.safeParse({ countryCode: "IN", city: "P" }).success).toBe(false);
  });
});

describe("place labels", () => {
  const name = (code: string) => ({ IN: "India", PL: "Poland" })[code] ?? code;
  it("formats each tier", () => {
    expect(placeLabel({ scope: "global", countryCode: null, city: null }, name, "Worldwide")).toBe(
      "Worldwide",
    );
    expect(placeLabel({ scope: "country", countryCode: "IN", city: null }, name, "W")).toBe(
      "India",
    );
    expect(placeLabel({ scope: "city", countryCode: "IN", city: "Indore" }, name, "W")).toBe(
      "Indore, India",
    );
  });
});

describe("grow navigation", () => {
  it("links every growth page with a label", () => {
    expect(growNav.map((i) => i.href)).toEqual([
      "/chapters",
      "/ambassadors",
      "/volunteer",
      "/careers",
    ]);
    for (const item of growNav) expect(en.nav).toHaveProperty(item.labelKey.replace("nav.", ""));
  });
});
