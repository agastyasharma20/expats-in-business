import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

import { getEnv } from "./env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: getEnv().DATABASE_URL,
    // Under load (parallel build workers, Docker networking on Windows) a new connection can take a
    // few seconds; 2 s caused spurious failures. The health check keeps its own 2.5 s probe.
    connectionTimeoutMillis: 10_000,
    max: 10,
    idleTimeoutMillis: 30_000,
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
