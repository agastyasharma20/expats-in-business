import type { PrismaClient } from "../../../generated/prisma/client";

import { seedCommunity } from "./community";
import { resetRandom, type SeedContext } from "./context";
import { seedEvents } from "./events";
import { seedPeople } from "./people";

/** Removes every demo record (isDemo = true); cascades take tickets, roles, votes and the rest. */
export async function clearDemo(db: PrismaClient) {
  await db.chapterRequest.deleteMany({ where: { isDemo: true } });
  await db.event.deleteMany({ where: { isDemo: true } });
  await db.sponsor.deleteMany({ where: { isDemo: true } });
  await db.venue.deleteMany({ where: { isDemo: true } });
  await db.group.deleteMany({ where: { isDemo: true } });
  await db.provider.deleteMany({ where: { isDemo: true } });
  await db.business.deleteMany({ where: { isDemo: true } });
  await db.application.deleteMany({ where: { isDemo: true } });
  await db.bubble.deleteMany({ where: { isDemo: true } });
  await db.user.deleteMany({ where: { isDemo: true } });
  // Keep a demo country if a real (non-demo) chapter request now points at it.
  await db.country.deleteMany({
    where: { isDemo: true, chapterRequests: { none: { isDemo: false } } },
  });
}

/** Rebuilds the deterministic demo layer (brief 3L). Requires the base layer. */
export async function seedDemo(db: PrismaClient, today: Date) {
  const [live, launching] = await Promise.all([
    db.chapter.findFirst({ where: { status: "live" }, orderBy: { createdAt: "asc" } }),
    db.chapter.findFirst({ where: { status: "launching" }, orderBy: { createdAt: "asc" } }),
  ]);
  if (!live || !launching)
    throw new Error("Base layer missing: expected one live and one launching chapter.");

  resetRandom();
  const ctx: SeedContext = { db, today, chapters: { live, launching } };
  const people = await seedPeople(ctx);
  const events = await seedEvents(ctx, people);
  await seedCommunity(ctx, people, events);
}
