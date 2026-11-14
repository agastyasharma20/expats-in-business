import "server-only";

import { rateLimit } from "@/lib/rate-limit";

/**
 * Named, layered limits for member writes. Each bucket has a burst window (stops scripts that
 * hammer an action) and a daily cap (stops slow automation). Limits are keyed by account, so they
 * hold no matter how requests are sent (browser, DevTools, curl or a bot).
 */
export const LIMITS = {
  post: [
    [5, 600],
    [30, 86_400],
  ],
  reaction: [
    [60, 60],
    [600, 86_400],
  ],
  report: [
    [5, 600],
    [20, 86_400],
  ],
  moderate: [
    [60, 60],
    [1000, 86_400],
  ],
  bubble: [
    [10, 600],
    [40, 86_400],
  ],
  roulette: [
    [20, 600],
    [60, 86_400],
  ],
  admin: [
    [60, 60],
    [2000, 86_400],
  ],
  festival: [
    [10, 600],
    [40, 86_400],
  ],
  vote: [
    [10, 3600],
    [20, 86_400],
  ],
  apply: [
    [3, 3600],
    [6, 86_400],
  ],
  // Stripe Checkout and portal sessions (each call costs an API request).
  billing: [
    [10, 3600],
    [30, 86_400],
  ],
  review: [
    [5, 3600],
    [20, 86_400],
  ],
  verify: [
    [3, 3600],
    [6, 86_400],
  ],
  // Cheap owner-scoped writes (profile, settings, responses): stops scripted hammering only.
  account: [
    [60, 600],
    [400, 86_400],
  ],
  broadcast: [
    [2, 3600],
    [5, 86_400],
  ],
} as const satisfies Record<string, readonly (readonly [number, number])[]>;

export type LimitBucket = keyof typeof LIMITS;

/** True when every window of `bucket` still has room for this account. */
export async function withinLimits(userId: string, bucket: LimitBucket): Promise<boolean> {
  for (const [limit, seconds] of LIMITS[bucket]) {
    const result = await rateLimit(`${bucket}:${seconds}:${userId}`, limit, seconds);
    if (!result.ok) return false;
  }
  return true;
}
