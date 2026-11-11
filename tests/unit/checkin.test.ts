import { describe, expect, it } from "vitest";

import { classifyScan, parseQrToken } from "@/lib/events/checkin-rules";
import { slugify } from "@/lib/slug";

const base = {
  eventId: "evt",
  status: "confirmed" as const,
  user: { name: "Demo Person" },
  checkIn: null,
};

describe("classifyScan", () => {
  it("accepts a confirmed ticket for this event once", () => {
    expect(classifyScan(base, "evt")).toEqual({ status: "ok", name: "Demo Person" });
  });

  it("reports repeats with the first check-in time", () => {
    const at = new Date("2026-11-11T18:05:00Z");
    expect(classifyScan({ ...base, checkIn: { checkedInAt: at } }, "evt")).toEqual({
      status: "already",
      name: "Demo Person",
      at: at.toISOString(),
    });
  });

  it("rejects unknown, other-event and unconfirmed tickets without naming anyone", () => {
    expect(classifyScan(null, "evt")).toEqual({ status: "invalid" });
    expect(classifyScan(base, "other")).toEqual({ status: "wrongEvent" });
    for (const status of ["reserved", "waitlisted", "cancelled"] as const) {
      expect(classifyScan({ ...base, status }, "evt")).toEqual({ status: "notConfirmed" });
    }
  });
});

describe("parseQrToken", () => {
  it("accepts our base64url tokens and rejects anything else", () => {
    expect(parseQrToken("  Ab3_-xYz0123456789abcd ")).toBe("Ab3_-xYz0123456789abcd");
    expect(parseQrToken("https://evil.example/?x=1")).toBeNull();
    expect(parseQrToken("short")).toBeNull();
    expect(parseQrToken("a".repeat(65))).toBeNull();
  });
});

describe("slugify", () => {
  it("handles Polish letters and trims to 60 characters", () => {
    expect(slugify("Kraków: Łódź & Gdańsk!")).toBe("krakow-lodz-gdansk");
    expect(slugify("x".repeat(80)).length).toBe(60);
  });
});

describe("safeNext", () => {
  const app = "http://localhost:3000";
  it("keeps same-site paths with query and hash", async () => {
    const { safeNext } = await import("@/lib/safe-redirect");
    expect(safeNext("/events/x?a=1#b", app)).toBe("/events/x?a=1#b");
    expect(safeNext(["/settings", "/x"], app)).toBe("/settings");
  });
  it("rejects open-redirect tricks", async () => {
    const { safeNext } = await import("@/lib/safe-redirect");
    for (const bad of [
      "//evil.example",
      "/\\evil.example",
      "https://evil.example",
      "/\tevil",
      "evil",
      undefined,
      "",
    ]) {
      expect(safeNext(bad, app)).toBe("/dashboard");
    }
  });
});
