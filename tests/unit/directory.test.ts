import { describe, expect, it } from "vitest";

import { canApprove } from "@/config/verification";
import { cardFields, reviewEligibility } from "@/lib/directory/eligibility";
import {
  averageRating,
  parseMemberFilters,
  parseProviderFilters,
  toQueryString,
  withFilter,
} from "@/lib/directory/filters";

describe("parseMemberFilters", () => {
  it("combines valid filters", () => {
    expect(
      parseMemberFilters({
        q: " Anna ",
        industry: "it",
        skill: "React",
        language: "PL",
        origin: "in",
        chapter: "krakow",
        coffee: "1",
        page: "2",
      }),
    ).toEqual({
      q: "Anna",
      industry: "it",
      skill: "react",
      language: "pl",
      origin: "IN",
      chapter: "krakow",
      coffee: true,
      page: 2,
    });
  });

  it("drops malformed values instead of passing them on", () => {
    const f = parseMemberFilters({
      q: "%",
      industry: "IT; DROP",
      language: "eng",
      origin: "IND",
      page: "-3",
      coffee: "yes",
    });
    expect(f).toEqual({
      q: undefined,
      industry: undefined,
      skill: undefined,
      language: undefined,
      origin: undefined,
      chapter: undefined,
      coffee: undefined,
      page: 1,
    });
  });

  it("strips wildcards and markup from free text", () => {
    expect(parseMemberFilters({ q: "<b>Jo%_hn</b>" }).q).toBe("bJohnb");
    expect(parseMemberFilters({ q: "a".repeat(100) }).q?.length).toBe(60);
  });

  it("takes the first of repeated params", () => {
    expect(parseProviderFilters({ category: ["legal", "tax"], verified: "1" })).toMatchObject({
      category: "legal",
      verified: true,
    });
  });
});

describe("query strings", () => {
  it("are canonical: sorted keys, defaults and page 1 omitted", () => {
    expect(
      toQueryString({ q: "x", page: 1, coffee: true, chapter: undefined, industry: "it" }),
    ).toBe("?coffee=1&industry=it&q=x");
    expect(toQueryString({ page: 1 })).toBe("");
  });

  it("reset to page 1 when another filter changes", () => {
    expect(withFilter({ page: 4, q: "a" }, "q", "b")).toEqual({ page: 1, q: "b" });
    expect(withFilter({ page: 4, q: "a" }, "page", 5)).toEqual({ page: 5, q: "a" });
  });
});

describe("reviewEligibility", () => {
  const base = {
    viewerId: "u1",
    ownerId: "owner",
    hasQuoteRequest: false,
    sharedEvent: false,
    alreadyReviewed: false,
  };
  it("requires a shared quote request or session", () => {
    expect(reviewEligibility(base)).toBe("noInteraction");
    expect(reviewEligibility({ ...base, hasQuoteRequest: true })).toBe("eligible");
    expect(reviewEligibility({ ...base, sharedEvent: true })).toBe("eligible");
  });
  it("blocks visitors, the owner and second reviews", () => {
    expect(reviewEligibility({ ...base, viewerId: null })).toBe("signIn");
    expect(reviewEligibility({ ...base, viewerId: "owner", hasQuoteRequest: true })).toBe("owner");
    expect(reviewEligibility({ ...base, hasQuoteRequest: true, alreadyReviewed: true })).toBe(
      "alreadyReviewed",
    );
  });
});

describe("cardFields", () => {
  const all = { showOrigin: true, showLanguages: true, showIndustry: true, showSkills: false };
  it("visitors see none of the optional fields", () => {
    expect(cardFields(false, all)).toEqual({
      origin: false,
      languages: false,
      industry: false,
      skills: false,
    });
  });
  it("members see only what each person switched on", () => {
    expect(cardFields(true, all)).toEqual({
      origin: true,
      languages: true,
      industry: true,
      skills: false,
    });
  });
});

describe("verification", () => {
  it("approves only with every required criterion checked", () => {
    expect(
      canApprove({ registryChecked: true, referencesChecked: true, insuranceChecked: true }),
    ).toBe(true);
    expect(canApprove({ registryChecked: true, referencesChecked: true })).toBe(false);
    expect(canApprove({})).toBe(false);
  });
});

describe("averageRating", () => {
  it("rounds to one decimal", () => {
    expect(averageRating([5, 4, 4])).toBe(4.3);
    expect(averageRating([])).toBeNull();
  });
});
