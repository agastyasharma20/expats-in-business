import { describe, expect, it } from "vitest";

import { currencyExponent, formatMoney, fromMinorUnits, sumMoney, toMinorUnits } from "@/lib/money";
import { addDays, formatInZone, utcToZoned, zoneOffsetMinutes, zonedTimeToUtc } from "@/lib/time";

// Intl output uses narrow no-break spaces in some locales; normalise for comparisons.
const plain = (s: string) => s.replace(/[  ]/g, " ");

describe("money", () => {
  it("knows currency exponents", () => {
    expect(currencyExponent("PLN")).toBe(2);
    expect(currencyExponent("JPY")).toBe(0);
    expect(currencyExponent("BHD")).toBe(3);
  });

  it("converts between major and minor units without float drift", () => {
    expect(toMinorUnits(19.99, "PLN")).toBe(1999);
    expect(toMinorUnits(0.1 + 0.2, "PLN")).toBe(30);
    expect(toMinorUnits(-4.005, "PLN")).toBe(-401);
    expect(toMinorUnits(1500, "JPY")).toBe(1500);
    expect(fromMinorUnits(1999, "PLN")).toBe(19.99);
    expect(() => fromMinorUnits(19.5, "PLN")).toThrow();
  });

  it("formats in the viewer's locale", () => {
    expect(plain(formatMoney({ amountMinor: 1900, currency: "PLN" }, "pl"))).toBe("19,00 zł");
    expect(plain(formatMoney({ amountMinor: 1900, currency: "PLN" }, "en"))).toBe("PLN 19.00");
    expect(
      plain(formatMoney({ amountMinor: 1900, currency: "PLN" }, "pl", { hideZeroDecimals: true })),
    ).toBe("19 zł");
    expect(
      plain(formatMoney({ amountMinor: 1950, currency: "EUR" }, "en", { hideZeroDecimals: true })),
    ).toBe("€19.50");
  });

  it("refuses invalid currencies and mixed sums", () => {
    expect(() => currencyExponent("zł")).toThrow();
    expect(
      sumMoney(
        [
          { amountMinor: 100, currency: "PLN" },
          { amountMinor: 250, currency: "PLN" },
        ],
        "PLN",
      ),
    ).toEqual({
      amountMinor: 350,
      currency: "PLN",
    });
    expect(() => sumMoney([{ amountMinor: 100, currency: "EUR" }], "PLN")).toThrow();
  });
});

describe("time", () => {
  const zone = "Europe/Warsaw";

  it("computes zone offsets across daylight saving", () => {
    expect(zoneOffsetMinutes(new Date("2026-01-15T12:00:00Z"), zone)).toBe(60);
    expect(zoneOffsetMinutes(new Date("2026-07-15T12:00:00Z"), zone)).toBe(120);
  });

  it("turns chapter wall-clock time into UTC and back", () => {
    const winter = zonedTimeToUtc({ year: 2026, month: 1, day: 22, hour: 18, minute: 0 }, zone);
    expect(winter.toISOString()).toBe("2026-01-22T17:00:00.000Z");
    const summer = zonedTimeToUtc({ year: 2026, month: 6, day: 18, hour: 18, minute: 30 }, zone);
    expect(summer.toISOString()).toBe("2026-06-18T16:30:00.000Z");
    expect(utcToZoned(summer, zone)).toEqual({
      year: 2026,
      month: 6,
      day: 18,
      hour: 18,
      minute: 30,
    });
  });

  it("handles the night the clocks change", () => {
    // 29 Mar 2026: 02:00 → 03:00 in Europe/Warsaw; 02:30 does not exist and resolves forwards.
    const skipped = zonedTimeToUtc({ year: 2026, month: 3, day: 29, hour: 2, minute: 30 }, zone);
    expect(utcToZoned(skipped, zone).hour).toBe(3);
  });

  it("works for any zone, not just the first chapter's", () => {
    const ny = zonedTimeToUtc(
      { year: 2026, month: 11, day: 10, hour: 9, minute: 0 },
      "America/New_York",
    );
    expect(ny.toISOString()).toBe("2026-11-10T14:00:00.000Z");
  });

  it("formats in the chapter zone and locale", () => {
    const date = new Date("2026-01-22T17:00:00Z");
    expect(plain(formatInZone(date, zone, "en-GB", { hour: "2-digit", minute: "2-digit" }))).toBe(
      "18:00",
    );
    expect(
      plain(formatInZone(date, "Asia/Kolkata", "en-GB", { hour: "2-digit", minute: "2-digit" })),
    ).toBe("22:30");
    expect(addDays(date, 2).toISOString()).toBe("2026-01-24T17:00:00.000Z");
  });
});
