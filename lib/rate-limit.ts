import { getDb } from "./db";

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSeconds: number };

/**
 * Postgres-backed fixed-window limiter (works across server instances). One atomic upsert per call:
 * the window resets when it has expired, otherwise the counter increments.
 * Example: rateLimit(`help:${ip}`, 5, 3600) allows 5 contact messages per hour per IP.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const rows = await getDb().$queryRaw<{ count: number; windowStart: Date }[]>`
    INSERT INTO "RateLimit" ("key", "windowStart", "count") VALUES (${key}, now(), 1)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSeconds}) THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < now() - make_interval(secs => ${windowSeconds}) THEN now() ELSE "RateLimit"."windowStart" END
    RETURNING "count", "windowStart"`;
  const row = rows[0]!;
  const elapsed = (Date.now() - row.windowStart.getTime()) / 1000;
  return {
    ok: row.count <= limit,
    remaining: Math.max(limit - row.count, 0),
    retryAfterSeconds: Math.max(Math.ceil(windowSeconds - elapsed), 0),
  };
}
