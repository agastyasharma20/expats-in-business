import "server-only";

import { getDb } from "@/lib/db";

/** Round-trip time of a trivial query, in milliseconds. */
export async function measureDbLatency(): Promise<number> {
  const started = performance.now();
  await getDb().$queryRaw`SELECT 1`;
  return Math.round(performance.now() - started);
}
