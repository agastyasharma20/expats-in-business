import { describe, expect, it } from "vitest";

import { visibleProfile } from "@/lib/member/visibility";

const row = {
  isPublic: true,
  showBio: false,
  showOrigin: true,
  showLanguages: false,
  showIndustry: true,
  showSkills: false,
  openToCoffee: true,
  headline: "QA engineer",
  bio: "Secret bio",
  originCountryCode: "IN",
  languages: ["en", "hi"],
  skills: ["testing"],
  user: { name: "Demo Person" },
  industry: { name: "IT" },
  homeChapter: { name: "Kraków" },
};

describe("visibleProfile", () => {
  it("hides switched-off fields from visitors", () => {
    const p = visibleProfile(row, false)!;
    expect(p.bio).toBeUndefined();
    expect(p.languages).toBeUndefined();
    expect(p.skills).toBeUndefined();
    expect(p.originCountryCode).toBe("IN");
    expect(p.industry).toBe("IT");
  });

  it("shows everything to the owner", () => {
    const p = visibleProfile(row, true)!;
    expect(p.bio).toBe("Secret bio");
    expect(p.skills).toEqual(["testing"]);
  });

  it("returns nothing for a private profile unless owner", () => {
    expect(visibleProfile({ ...row, isPublic: false }, false)).toBeNull();
    expect(visibleProfile({ ...row, isPublic: false }, true)).not.toBeNull();
  });

  it("never exposes an email field", () => {
    expect(Object.keys(visibleProfile(row, true)!)).not.toContain("email");
  });
});
