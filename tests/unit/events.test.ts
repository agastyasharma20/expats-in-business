import { describe, expect, it } from "vitest";

import { decideRsvp, pickPromotions, placesLeft, reservationCutoff } from "@/lib/events/capacity";
import { buildIcs, escapeIcs } from "@/lib/events/ics";

describe("capacity", () => {
  it("never reports negative places", () => {
    expect(placesLeft(10, 12)).toBe(0);
    expect(placesLeft(10, 4)).toBe(6);
  });

  it("confirms free, reserves paid, waitlists when full", () => {
    expect(decideRsvp({ capacity: 2, taken: 1, paid: false })).toBe("confirmed");
    expect(decideRsvp({ capacity: 2, taken: 1, paid: true })).toBe("reserved");
    expect(decideRsvp({ capacity: 2, taken: 2, paid: false })).toBe("waitlisted");
    expect(decideRsvp({ capacity: 0, taken: 0, paid: true })).toBe("waitlisted");
  });

  it("promotes the oldest waitlisted tickets first, only as many as places", () => {
    const at = (m: number) => ({ id: String(m), createdAt: new Date(2026, 0, 1, 10, m) });
    expect(pickPromotions([at(5), at(1), at(3)], 2).map((t) => t.id)).toEqual(["1", "3"]);
    expect(pickPromotions([at(1)], 0)).toEqual([]);
    expect(pickPromotions([at(1)], -1)).toEqual([]);
  });

  it("expires reservations after the payment window", () => {
    const now = new Date("2026-11-11T12:00:00Z");
    expect(reservationCutoff(now).toISOString()).toBe("2026-11-11T11:30:00.000Z");
  });
});

describe("ics", () => {
  const ics = buildIcs({
    uid: "evt1@eib",
    title: "Coffee, cake; and networking",
    description: "Line one\nLine two",
    location: "Demo venue, Old Town",
    url: "https://example.test/events/coffee",
    startsAt: new Date("2026-12-01T17:00:00Z"),
    endsAt: new Date("2026-12-01T19:00:00Z"),
    updatedAt: new Date("2026-11-11T08:00:00Z"),
  });

  it("uses UTC times and CRLF line endings", () => {
    expect(ics).toContain("DTSTART:20261201T170000Z\r\n");
    expect(ics).toContain("DTEND:20261201T190000Z\r\n");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("escapes special characters", () => {
    expect(escapeIcs("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
    expect(ics).toContain("SUMMARY:Coffee\\, cake\\; and networking");
  });

  it("folds long lines to 75 octets", () => {
    const long = buildIcs({
      ...{
        uid: "u",
        url: "https://x.test",
        location: null,
        startsAt: new Date(),
        endsAt: new Date(),
        updatedAt: new Date(),
      },
      title: "x".repeat(200),
      description: "d",
    });
    for (const line of long.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
  });
});
