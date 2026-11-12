import type { Env } from "@/lib/env";

/**
 * Feature flags. Defaults live in lib/env.ts and can be overridden with FEATURE_* variables.
 * Cut order if we fall behind: coffeeRoulette → sessionPulse → bubblesMap (becomes a list).
 * Navigation and the link crawler must respect these flags so a disabled feature leaves no dead links.
 */
export type FeatureFlags = {
  coffeeRoulette: boolean;
  sessionPulse: boolean;
  bubblesMap: boolean;
  paidTickets: boolean;
};

export function getFeatureFlags(env: Pick<Env, `FEATURE_${string}` & keyof Env>): FeatureFlags {
  return {
    coffeeRoulette: env.FEATURE_COFFEE_ROULETTE,
    sessionPulse: env.FEATURE_SESSION_PULSE,
    bubblesMap: env.FEATURE_BUBBLES_MAP,
    paidTickets: env.FEATURE_PAID_TICKETS,
  };
}

export const FLAG_NAMES = ["coffeeRoulette", "sessionPulse", "bubblesMap", "paidTickets"] as const;

/** Env defaults plus admin overrides (SiteSetting "featureFlags"); unknown or bad values are ignored. */
export function mergeFlags(defaults: FeatureFlags, overrides: unknown): FeatureFlags {
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) return defaults;
  const merged = { ...defaults };
  for (const name of FLAG_NAMES) {
    const value = (overrides as Record<string, unknown>)[name];
    if (typeof value === "boolean") merged[name] = value;
  }
  return merged;
}
