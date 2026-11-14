import type { PrismaClient } from "../../../generated/prisma/client";

import { seedCommunity } from "./community";
import { resetRandom, type SeedContext } from "./context";
import { seedEngagement } from "./engagement";
import { seedEvents } from "./events";
import { seedFestival } from "./festival";
import { seedGrowth } from "./growth";
import { seedPeople } from "./people";
import { clearTeamDemo, seedTeam } from "./team";

/** Removes every demo record (isDemo = true); cascades take tickets, roles, votes and the rest. */
export async function clearDemo(db: PrismaClient) {
  await clearTeamDemo(db);
  await db.chapterRequest.deleteMany({ where: { isDemo: true } });
  // Also events that demo accounts created during a demo (event builder), and any left at demo venues.
  await db.event.deleteMany({
    where: { OR: [{ isDemo: true }, { createdBy: { isDemo: true } }, { venue: { isDemo: true } }] },
  });
  await db.sponsor.deleteMany({ where: { isDemo: true } });
  await db.venue.deleteMany({ where: { isDemo: true } });
  await db.group.deleteMany({ where: { isDemo: true } });
  await db.provider.deleteMany({ where: { isDemo: true } });
  await db.business.deleteMany({ where: { isDemo: true } });
  await db.application.deleteMany({ where: { isDemo: true } });
  await db.bubble.deleteMany({ where: { isDemo: true } });
  await db.openRole.deleteMany({ where: { isDemo: true } });
  await db.ambassador.deleteMany({ where: { isDemo: true } });
  await db.ambassadorApplication.deleteMany({ where: { isDemo: true } });
  await db.user.deleteMany({ where: { isDemo: true } });
  await db.chapter.deleteMany({ where: { isDemo: true, events: { none: {} } } });
  // Roulette rounds whose members were all demo accounts (cascade emptied them).
  await db.rouletteRound.deleteMany({ where: { matches: { every: { members: { none: {} } } } } });
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
  await seedEngagement(ctx, people, events);
  await seedFestival(ctx, people);
  await seedGrowth(ctx, people);
  await seedTeam(db);
}
