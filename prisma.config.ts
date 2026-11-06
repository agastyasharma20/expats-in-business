import "dotenv/config";

import { defineConfig } from "prisma/config";

// Prisma 7 does not load .env by itself; dotenv/config does. `prisma generate` does not need a
// database, so a missing DATABASE_URL (e.g. in CI) only matters for migrate/seed commands.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed/index.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
