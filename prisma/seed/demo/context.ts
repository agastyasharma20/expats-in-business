import { createId } from "@paralleldrive/cuid2";
import { faker } from "@faker-js/faker";

import type { PrismaClient } from "../../../generated/prisma/client";

/** Fixed seed: the same command always produces the same demo content. */
export const FAKER_SEED = 2026;
export const DEMO_EMAIL_DOMAIN = "demo.eib.local";
export const DEMO_PASSWORD = "Demo!2026";

export type SeedContext = {
  db: PrismaClient;
  /** Midnight UTC of the reference day; past and upcoming events are placed around it. */
  today: Date;
  chapters: { live: ChapterRef; launching: ChapterRef };
};

export type ChapterRef = { id: string; slug: string; timezone: string; currency: string };

export function resetRandom() {
  faker.seed(FAKER_SEED);
}

export { createId, faker };

/** Lower-case, accent-free, hyphenated. */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ł/g, "l")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Deterministic random token (QR codes, report links) from the seeded generator. */
export function token(length = 32): string {
  return faker.string.alphanumeric({ length, casing: "mixed" });
}

/** Inserts in chunks to keep statements small. */
export async function insertMany<T>(
  rows: T[],
  write: (chunk: T[]) => Promise<unknown>,
  size = 500,
): Promise<void> {
  for (let i = 0; i < rows.length; i += size) await write(rows.slice(i, i + size));
}
