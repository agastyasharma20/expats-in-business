// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Finding F2 regression: many members reserving the last places at once must never overbook and
 * must all finish (no stuck transaction). Needs a database, so it only runs when
 * TEST_DATABASE_URL is set (the local Docker database works):
 *   TEST_DATABASE_URL=postgresql://eib:eib_local_only@localhost:5433/eib npx vitest run tests/unit/ticket-concurrency
 */
const url = process.env.TEST_DATABASE_URL;

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", async () => {
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("@/generated/prisma/client");
  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL, max: 10 }),
  });
  return { getDb: () => client };
});

const PEOPLE = 12;
const CAPACITY = 5;
const tag = `conc-${Date.now().toString(36)}`;

describe.skipIf(!url)("reserving the last places at the same time", () => {
  let eventId = "";
  let ticketTypeId = "";
  const userIds: string[] = [];

  beforeAll(async () => {
    const { getDb } = await import("@/lib/db");
    const db = getDb();
    // An event nobody holds a ticket for, so the capacity below is the only limit.
    const event = await db.event.findFirst({
      where: { tickets: { none: {} }, ticketTypes: { some: {} } },
      select: { id: true, ticketTypes: { select: { id: true }, take: 1 } },
    });
    if (!event) throw new Error("the seeded database has no event without tickets");
    eventId = event.id;
    ticketTypeId = event.ticketTypes[0].id;
    for (let i = 0; i < PEOPLE; i++) {
      const user = await db.user.create({
        data: { name: `Concurrency ${i}`, email: `${tag}-${i}@example.test`, isDemo: true },
      });
      userIds.push(user.id);
    }
  });

  afterAll(async () => {
    const { getDb } = await import("@/lib/db");
    // Deleting the users removes their tickets (cascade).
    await getDb().user.deleteMany({ where: { id: { in: userIds } } });
  });

  it("gives out exactly the free places, puts the rest on the waitlist, and finishes", async () => {
    const { claimTicket } = await import("@/lib/events/tickets");
    const started = Date.now();
    const results = await Promise.all(
      userIds.map((userId) =>
        claimTicket({ eventId, ticketTypeId, userId, paid: false, capacity: CAPACITY }),
      ),
    );
    const statuses = results.map((result) => result.ticket.status);
    expect(statuses.filter((status) => status === "confirmed")).toHaveLength(CAPACITY);
    expect(statuses.filter((status) => status === "waitlisted")).toHaveLength(PEOPLE - CAPACITY);
    expect(Date.now() - started).toBeLessThan(15_000);
  });
});
