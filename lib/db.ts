import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

import { getEnv } from "./env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: getEnv().DATABASE_URL,
    // Fail fast when the database is down instead of hanging a request.
    connectionTimeoutMillis: 2_000,
  });
  return new PrismaClient({ adapter });
}

/** Lazily created Prisma client, reused across hot reloads in development. */
export function getDb(): PrismaClient {
  globalForPrisma.prisma ??= createClient();
  return globalForPrisma.prisma;
}

/**
 * True when the database answers a trivial query within the timeout. Never throws: a missing or
 * invalid env, a stopped container or a slow network all count as "not reachable".
 */
export async function isDatabaseReachable(timeoutMs = 2_500): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs);
  });
  try {
    const probe = getDb().$queryRaw`SELECT 1`.then(() => true as const);
    return await Promise.race([probe, timeout]);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
