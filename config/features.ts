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
