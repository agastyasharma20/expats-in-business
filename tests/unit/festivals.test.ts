import { describe, expect, it } from "vitest";

import { decideRsvp, pickPromotions } from "@/lib/events/capacity";
import { localToUtc, priceField } from "@/lib/festivals/form";
import {
  grossRevenue,
  launchChecklist,
  programmeByDay,
  quantityOptions,
  shiftState,
  stagesOf,
  tierState,
} from "@/lib/festivals/rules";

const now = new Date("2026-11-13T10:00:00Z");
const at = (iso: string) => new Date(iso);

describe("group orders and tier caps", () => {
  it("needs room for the whole party, in the event and in the tier", () => {
    expect(decideRsvp({ capacity: 100, taken: 97, paid: true, quantity: 3 })).toBe("reserved");
    expect(decideRsvp({ capacity: 100, taken: 98, paid: true, quantity: 3 })).toBe("waitlisted");
    expect(
      decideRsvp({
        capacity: 100,
        taken: 0,
        paid: false,
        quantity: 4,
        tierCapacity: 10,
        tierTaken: 7,
      }),
    ).toBe("waitlisted");
    expect(
      decideRsvp({
        capacity: 100,
        taken: 0,
        paid: false,
        quantity: 3,
        tierCapacity: 10,
        tierTaken: 7,
      }),
    ).toBe("confirmed");
  });

  it("keeps single tickets behaving as before", () => {
    expect(decideRsvp({ capacity: 1, taken: 0, paid: false })).toBe("confirmed");
    expect(decideRsvp({ capacity: 1, taken: 1, paid: false })).toBe("waitlisted");
  });

  it("promotes whole parties only, oldest first, letting smaller ones fill the gap", () => {
    const list = [
      { id: "family", quantity: 4, createdAt: at("2026-11-01T00:00:00Z") },
      { id: "couple", quantity: 2, createdAt: at("2026-11-02T00:00:00Z") },
      { id: "solo", quantity: 1, createdAt: at("2026-11-03T00:00:00Z") },
    ];
    expect(pickPromotions(list, 3).map((t) => t.id)).toEqual(["couple", "solo"]);
    expect(pickPromotions(list, 4).map((t) => t.id)).toEqual(["family"]);
    expect(pickPromotions(list, 0)).toEqual([]);
  });
});

describe("tier state", () => {
  const base = { capacity: 50, sold: 0, eventLeft: 500, salesEndAt: null, now };
  it("reports on sale, low stock, sold out and ended", () => {
    expect(tierState(base)).toEqual({ state: "onSale", left: 50 });
    expect(tierState({ ...base, sold: 45 })).toEqual({ state: "lowStock", left: 5 });
    expect(tierState({ ...base, sold: 50 })).toEqual({ state: "soldOut", left: 0 });
    expect(tierState({ ...base, salesEndAt: at("2026-11-13T09:59:00Z") }).state).toBe("ended");
  });
  it("never shows more than the event has left", () => {
    expect(tierState({ ...base, capacity: null, eventLeft: 3 })).toEqual({
      state: "lowStock",
      left: 3,
    });
    expect(tierState({ ...base, eventLeft: 0 }).state).toBe("soldOut");
  });
  it("offers party sizes up to the limit and the places left", () => {
    expect(quantityOptions(6, 100)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(quantityOptions(6, 2)).toEqual([1, 2]);
    expect(quantityOptions(50, 100)).toHaveLength(10);
  });
});

describe("programme", () => {
  const item = (start: string, stage: string | null) => ({
    startsAt: at(start),
    endsAt: at(start),
    stage,
  });
  it("groups by local day in the chapter timezone", () => {
    // 23:30 UTC on 5 Dec is already 6 Dec in Warsaw.
    const days = programmeByDay(
      [item("2026-12-05T12:00:00Z", "Main"), item("2026-12-05T23:30:00Z", "Main")],
      "Europe/Warsaw",
    );
    expect(days.map((d) => d.day)).toEqual(["2026-12-05", "2026-12-06"]);
  });
  it("lists stages once, in order", () => {
    expect(
      stagesOf([{ stage: "Main" }, { stage: null }, { stage: "Kids" }, { stage: "Main" }]),
    ).toEqual(["Main", "Kids"]);
  });
});

describe("console numbers", () => {
  it("counts revenue from confirmed paid tickets only, price times party size", () => {
    expect(
      grossRevenue([
        { status: "confirmed", quantity: 3, paidAt: now, priceMinor: 5000 },
        { status: "confirmed", quantity: 1, paidAt: null, priceMinor: 5000 },
        { status: "waitlisted", quantity: 2, paidAt: now, priceMinor: 5000 },
      ]),
    ).toBe(15000);
  });
  it("scores the launch checklist", () => {
    const ready = launchChecklist({
      description: "x".repeat(80),
      tagline: "Food, music and stalls",
      hasVenue: true,
      tiers: 2,
      programme: 3,
      faqs: 3,
      partners: 1,
      shifts: 0,
      volunteersOpen: false,
      published: true,
    });
    expect(ready.percent).toBe(100);
    const draft = launchChecklist({
      ...{
        description: "short",
        tagline: null,
        hasVenue: true,
        tiers: 0,
        programme: 0,
        faqs: 0,
        partners: 0,
        shifts: 0,
        volunteersOpen: true,
        published: false,
      },
    });
    expect(draft.items.filter((i) => !i.done).map((i) => i.key)).toEqual([
      "details",
      "tiers",
      "programme",
      "faq",
      "partners",
      "volunteers",
      "published",
    ]);
  });
  it("tracks shift fill", () => {
    expect(shiftState(4, 4)).toEqual({ left: 0, full: true, percent: 100 });
    expect(shiftState(4, 1).percent).toBe(25);
  });
});

describe("form parsing", () => {
  it("parses prices safely", () => {
    expect(priceField.parse("49,90")).toBe(49.9);
    expect(priceField.safeParse("-5").success).toBe(false);
    expect(priceField.safeParse("1e5").success).toBe(false);
    expect(priceField.safeParse("10.999").success).toBe(false);
  });
  it("converts local festival times to UTC", () => {
    expect(localToUtc("2026-12-05", "18:00", "Europe/Warsaw").toISOString()).toBe(
      "2026-12-05T17:00:00.000Z",
    );
  });
});

describe("chapter preference cookie", () => {
  it("reads only a valid slug from the Cookie header", async () => {
    const { preferredChapterFromHeader } = await import("@/lib/chapters-shared");
    expect(preferredChapterFromHeader("a=1; eib-chapter=krakow; b=2")).toBe("krakow");
    expect(preferredChapterFromHeader("eib-chapter=..%2Fadmin")).toBe("global");
    expect(preferredChapterFromHeader("eib-chapter=%E0%A4%A")).toBe("global");
    expect(preferredChapterFromHeader(null)).toBe("global");
    expect(preferredChapterFromHeader("other=krakow")).toBe("global");
  });
});
