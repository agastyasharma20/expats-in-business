import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../generated/prisma/client";

import { seedBase } from "./base";
import { clearDemo, seedDemo } from "./demo";

/**
 *   npm run db:seed               base layer (upsert) + demo layer (replaced)
 *   npm run db:seed -- --base-only   real configuration only, e.g. for a clean install
 * SEED_REFERENCE_DATE=YYYY-MM-DD pins "today" so the output is byte-for-byte reproducible.
 */
export function referenceDay(): Date {
  const pinned = process.env.SEED_REFERENCE_DATE;
  const base = pinned ? new Date(`${pinned}T00:00:00Z`) : new Date();
  if (Number.isNaN(base.getTime())) throw new Error(`Invalid SEED_REFERENCE_DATE "${pinned}"`);
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
}

export function createSeedClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set. Run `npm run setup` first.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export async function runSeed(db: PrismaClient, { baseOnly = false } = {}) {
  await seedBase(db);
  if (baseOnly) return;
  await clearDemo(db);
  await seedDemo(db, referenceDay());
}

// Run directly (npm run db:seed), not when imported by scripts/demo-reset.ts.
if (process.argv[1]?.replace(/\\/g, "/").endsWith("prisma/seed/index.ts")) {
  const db = createSeedClient();
  const started = performance.now();
  runSeed(db, { baseOnly: process.argv.includes("--base-only") })
    .then(() =>
      console.log(`Seed finished in ${((performance.now() - started) / 1000).toFixed(1)} s`),
    )
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
