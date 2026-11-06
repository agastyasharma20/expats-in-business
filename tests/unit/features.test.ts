import { describe, expect, it } from "vitest";

import { getFeatureFlags } from "@/config/features";

describe("feature flags", () => {
  it("maps FEATURE_* env values to named flags", () => {
    expect(
      getFeatureFlags({
        FEATURE_COFFEE_ROULETTE: false,
        FEATURE_SESSION_PULSE: true,
        FEATURE_BUBBLES_MAP: true,
        FEATURE_PAID_TICKETS: false,
      }),
    ).toEqual({ coffeeRoulette: false, sessionPulse: true, bubblesMap: true, paidTickets: false });
  });
});
