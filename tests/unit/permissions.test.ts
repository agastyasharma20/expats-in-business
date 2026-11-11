import { describe, expect, it } from "vitest";

import {
  can,
  hasEntitlement,
  hasRole,
  type Action,
  type AuthUser,
  type Feature,
} from "@/lib/auth/permissions";

const KRK = "chapter-krakow";
const WAW = "chapter-warsaw";
const user = (over: Partial<AuthUser> = {}): AuthUser => ({
  id: "u",
  roles: [{ role: "member", chapterId: KRK }],
  tiers: [],
  ownsProvider: false,
  ...over,
});

const visitor = null;
const member = user();
const lead = user({
  roles: [
    { role: "chapter_lead", chapterId: KRK },
    { role: "member", chapterId: KRK },
  ],
});
const bubbleLead = user({ roles: [{ role: "bubble_lead", chapterId: KRK }] });
const admin = user({ roles: [{ role: "admin", chapterId: null }] });
const provider = user({ ownsProvider: true, tiers: ["provider"] });

describe("roles", () => {
  it("scopes chapter roles to their chapter; admins hold every role", () => {
    expect(hasRole(lead, "chapter_lead", KRK)).toBe(true);
    expect(hasRole(lead, "chapter_lead", WAW)).toBe(false);
    expect(hasRole(member, "chapter_lead")).toBe(false);
    expect(hasRole(admin, "chapter_lead", WAW)).toBe(true);
    expect(hasRole(visitor, "member")).toBe(false);
  });
});

describe("action matrix", () => {
  const leadActions: Action[] = [
    "admin.access",
    "chapter.manage",
    "event.manage",
    "event.scan",
    "event.pulse",
    "applications.review",
    "analytics.view",
    "sponsorReport.view",
  ];

  it.each(leadActions)(
    "%s: lead in own chapter yes, other chapter no, member and visitor no, admin yes",
    (action) => {
      expect(can(lead, action, { chapterId: KRK })).toBe(true);
      expect(can(lead, action, { chapterId: WAW })).toBe(false);
      expect(can(member, action, { chapterId: KRK })).toBe(false);
      expect(can(visitor, action)).toBe(false);
      expect(can(admin, action, { chapterId: WAW })).toBe(true);
    },
  );

  it("group moderation: bubble leads and leads in their chapter", () => {
    expect(can(bubbleLead, "group.moderate", { chapterId: KRK })).toBe(true);
    expect(can(bubbleLead, "group.moderate", { chapterId: WAW })).toBe(false);
    expect(can(lead, "group.moderate", { chapterId: KRK })).toBe(true);
    expect(can(member, "group.moderate", { chapterId: KRK })).toBe(false);
  });

  it("provider inbox needs an owned provider listing", () => {
    expect(can(provider, "provider.inbox")).toBe(true);
    expect(can(member, "provider.inbox")).toBe(false);
  });
});

describe("entitlements", () => {
  const cases: [string, AuthUser | null, Feature, boolean][] = [
    ["visitor has nothing", visitor, "concierge.unlimited", false],
    ["community member has nothing paid", member, "concierge.unlimited", false],
    ["plus gets unlimited concierge", user({ tiers: ["plus"] }), "concierge.unlimited", true],
    ["plus does not get a business listing", user({ tiers: ["plus"] }), "business.listing", false],
    ["business gets a listing and leads", user({ tiers: ["business"] }), "leads.inbox", true],
    ["provider gets quotes", provider, "provider.quotes", true],
    ["corporate seats are Plus seats", user({ tiers: ["corporate"] }), "roulette.priority", true],
    ["tiers combine", user({ tiers: ["plus", "business"] }), "bubble.featured", true],
  ];
  it.each(cases)("%s", (_name, who, feature, expected) => {
    expect(hasEntitlement(who, feature)).toBe(expected);
  });
});
