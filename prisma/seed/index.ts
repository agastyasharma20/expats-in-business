import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../../generated/prisma/client";

import { chapters, countries } from "./base/geography";

// Idempotent base seed: safe to run repeatedly. Demo data (isDemo) arrives in Milestone 3.
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set. Run `npm run setup` first.");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    for (const country of countries) {
      await db.country.upsert({ where: { code: country.code }, update: country, create: country });
    }
    for (const chapter of chapters) {
      const country = countries.find((c) => c.code === chapter.countryCode);
      if (!country) throw new Error(`Unknown country ${chapter.countryCode} for ${chapter.slug}`);
      const data = {
        ...chapter,
        timezone: country.defaultTimezone,
        currency: country.defaultCurrency,
        locales: country.locales,
        // launchedAt stays empty until the real launch date is confirmed (see docs/FACTS.md).
      };
      await db.chapter.upsert({ where: { slug: chapter.slug }, update: data, create: data });
    }
    console.log(`Seeded ${countries.length} country and ${chapters.length} chapters.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
