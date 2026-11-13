import { describe, expect, it } from "vitest";

import { dayKeys, toSeries } from "@/lib/admin/metrics-pure";
import { canChangeRole, canSuspend, csvCell, parseBanner, toCsv } from "@/lib/admin/rules";
import type { AuthUser } from "@/lib/auth/permissions";
import { profileCompleteness } from "@/lib/member/completeness";

const admin: AuthUser = {
  id: "a1",
  roles: [{ role: "admin", chapterId: null }],
  tiers: [],
  ownsProvider: false,
};
const lead: AuthUser = {
  id: "l1",
  roles: [{ role: "chapter_lead", chapterId: "krk" }],
  tiers: [],
  ownsProvider: false,
};
const member = { id: "m1", roles: [{ role: "member" as const }] };

describe("admin account rules", () => {
  it("lets admins suspend members but not themselves or other admins", () => {
    expect(canSuspend(admin, member)).toBe(true);
    expect(canSuspend(admin, { id: "a1", roles: [{ role: "admin" }] })).toBe(false);
    expect(canSuspend(admin, { id: "a2", roles: [{ role: "admin" }] })).toBe(false);
  });

  it("never lets chapter leads or visitors suspend", () => {
    expect(canSuspend(lead, member)).toBe(false);
    expect(canSuspend(null, member)).toBe(false);
  });

  it("grants only chapter roles, never admin (even from an edited request)", () => {
    expect(canChangeRole(admin, member, "moderator")).toBe(true);
    expect(canChangeRole(admin, member, "admin")).toBe(false);
    expect(canChangeRole(admin, member, "owner")).toBe(false);
    expect(canChangeRole(lead, member, "moderator")).toBe(false);
  });
});

describe("CSV export", () => {
  it("neutralises spreadsheet formulas and escapes quotes", () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell("+48 123")).toBe(`"'+48 123"`);
    expect(csvCell("@cmd")).toBe(`"'@cmd"`);
    expect(csvCell("Priya")).toBe(`"Priya"`);
    expect(csvCell(null)).toBe(`""`);
    expect(
      toCsv([
        ["a", 1],
        ["b", true],
      ]),
    ).toBe(`"a","1"\r\n"b","true"\r\n`);
  });
});

describe("site banner", () => {
  it("accepts only a complete, enabled banner", () => {
    expect(parseBanner({ enabled: true, text: "Maintenance tonight", tone: "warning" })).toEqual({
      enabled: true,
      text: "Maintenance tonight",
      tone: "warning",
    });
    expect(parseBanner({ enabled: false, text: "x" })).toBeNull();
    expect(parseBanner({ enabled: true, text: "  " })).toBeNull();
    expect(parseBanner({ enabled: true, text: "Hi", tone: "<b>" })?.tone).toBe("info");
    expect(parseBanner("nope")).toBeNull();
  });
});

describe("chart series", () => {
  it("fills every day of the window with zero when missing", () => {
    const keys = dayKeys(3, new Date("2026-11-12T15:00:00Z"));
    expect(keys).toEqual(["2026-11-10", "2026-11-11", "2026-11-12"]);
    expect(toSeries([{ day: "2026-11-11", count: 4 }], keys).map((p) => p.count)).toEqual([
      0, 4, 0,
    ]);
  });
});

describe("profile completeness", () => {
  it("lists what is missing and scores the rest", () => {
    const result = profileCompleteness({
      headline: "Designer",
      bio: "",
      homeChapterId: "krk",
      originCountryCode: null,
      languages: ["en"],
      skills: [],
      goalCount: 1,
    });
    expect(result.missing).toEqual(["bio", "origin", "skills"]);
    expect(result.percent).toBe(57);
  });
});
