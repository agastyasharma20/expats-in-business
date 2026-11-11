import { describe, expect, it } from "vitest";

import { mapStripeStatus, monthsSaved, periodEnd, plansForInterval } from "@/lib/billing/rules";

describe("periodEnd", () => {
  it("adds a calendar month or year in UTC", () => {
    expect(periodEnd(new Date("2026-11-11T10:00:00Z"), "month").toISOString()).toBe(
      "2026-12-11T10:00:00.000Z",
    );
    expect(periodEnd(new Date("2026-11-11T10:00:00Z"), "year").toISOString()).toBe(
      "2027-11-11T10:00:00.000Z",
    );
  });

  it("clamps to the last day of shorter months", () => {
    expect(periodEnd(new Date("2027-01-31T00:00:00Z"), "month").toISOString()).toBe(
      "2027-02-28T00:00:00.000Z",
    );
    expect(periodEnd(new Date("2028-02-29T00:00:00Z"), "year").toISOString()).toBe(
      "2029-02-28T00:00:00.000Z",
    );
  });
});

describe("plansForInterval", () => {
  const plans = [
    { code: "community", tier: "community", interval: null, contactOnly: false },
    { code: "plus-month", tier: "plus", interval: "month" as const, contactOnly: false },
    { code: "plus-year", tier: "plus", interval: "year" as const, contactOnly: false },
    { code: "corporate-year", tier: "corporate", interval: "year" as const, contactOnly: true },
  ];

  it("keeps free and contact-only plans in both periods", () => {
    expect(plansForInterval(plans, "month").map((p) => p.code)).toEqual([
      "community",
      "plus-month",
      "corporate-year",
    ]);
    expect(plansForInterval(plans, "year").map((p) => p.code)).toEqual([
      "community",
      "plus-year",
      "corporate-year",
    ]);
  });
});

describe("monthsSaved", () => {
  it("rounds the yearly saving to whole months", () => {
    expect(monthsSaved(1900, 19000)).toBe(2);
    expect(monthsSaved(4900, 49000)).toBe(2);
    expect(monthsSaved(0, 0)).toBe(0);
    expect(monthsSaved(1000, 13000)).toBe(0);
  });
});

describe("mapStripeStatus", () => {
  it("only grants access for paying states", () => {
    expect(mapStripeStatus("active")).toBe("active");
    expect(mapStripeStatus("unpaid")).toBe("past_due");
    for (const s of ["incomplete", "incomplete_expired", "canceled", "paused", "weird"]) {
      expect(mapStripeStatus(s)).toBe("canceled");
    }
  });
});
