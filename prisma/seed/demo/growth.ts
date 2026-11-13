import { createId, faker, slugify, type SeedContext } from "./context";
import { demoRoles as roles } from "./growth-roles";
import type { DemoPeople } from "./people";

const DAY = 86_400_000;
const HOUR = 3_600_000;

/** A demo country hub and launching city chapter: shows how EiB opens a new country. */
const india = {
  code: "IN",
  name: "India",
  defaultCurrency: "INR",
  defaultTimezone: "Asia/Kolkata",
  locales: ["en"],
  landmark: "india",
  tagline: "Demo country hub: how EiB looks when a new country opens.",
};

const indiaRequests = [
  { city: "Mumbai", votes: 18 },
  { city: "Bengaluru", votes: 15 },
  { city: "Pune", votes: 9 },
  { city: "New Delhi", votes: 8 },
];

/** Growth layer: India and Indore, the Cultoura demo edition, open roles and ambassadors. */
export async function seedGrowth(ctx: SeedContext, people: DemoPeople) {
  const { db, chapters, today } = ctx;
  const { userIds, byKey } = people;

  await db.country.upsert({
    where: { code: india.code },
    update: { landmark: india.landmark, tagline: india.tagline },
    create: { ...india, isDemo: true },
  });
  await db.chapter.create({
    data: {
      slug: "indore",
      name: "Indore",
      city: "Indore",
      countryCode: "IN",
      timezone: india.defaultTimezone,
      currency: india.defaultCurrency,
      locales: india.locales,
      status: "launching",
      landmark: "indore",
      tagline: "Demo chapter: a city chapter in its launching phase.",
      isDemo: true,
    },
  });
  for (const request of indiaRequests) {
    const id = createId();
    await db.chapterRequest.create({
      data: {
        id,
        city: request.city,
        cityKey: slugify(request.city),
        countryCode: "IN",
        isDemo: true,
      },
    });
    await db.chapterRequestVote.createMany({
      data: faker.helpers
        .arrayElements(userIds, request.votes)
        .map((userId) => ({ requestId: id, userId })),
    });
  }

  await db.openRole.createMany({
    data: roles.map((r) => ({ ...r, id: createId(), status: "open" as const, isDemo: true })),
  });
  const openRoles = await db.openRole.findMany({ where: { isDemo: true }, select: { id: true } });
  await db.roleApplication.createMany({
    data: userIds.slice(90, 96).map((userId, i) => ({
      roleId: openRoles[i % openRoles.length]!.id,
      userId,
      message:
        "Demo application: I would like to help EiB grow and can give a few hours every month.",
      status: (
        ["submitted", "in_review", "submitted", "waitlisted", "submitted", "in_review"] as const
      )[i]!,
    })),
    skipDuplicates: true,
  });

  // Ambassadors: the scope/place pairs follow the database CHECK constraints.
  const krakowCity = await db.chapter.findUnique({
    where: { id: chapters.live.id },
    select: { city: true },
  });
  const places = [
    { scope: "global" as const, countryCode: null, city: null },
    { scope: "country" as const, countryCode: "PL", city: null },
    { scope: "country" as const, countryCode: "IN", city: null },
    { scope: "city" as const, countryCode: "PL", city: krakowCity?.city ?? null },
    { scope: "city" as const, countryCode: "IN", city: "Indore" },
  ].filter((p) => p.scope !== "city" || p.city);
  const ambassadorUsers = [
    byKey.priya,
    byKey.karim,
    byKey.marta,
    ...userIds.slice(100, 104),
  ].filter(Boolean) as string[];
  await db.ambassador.createMany({
    data: places.map((p, i) => ({
      ...p,
      userId: ambassadorUsers[i]!,
      since: new Date(today.getTime() - (60 + i * 20) * DAY),
      isVisible: true,
      isDemo: true,
    })),
  });
  await db.ambassadorApplication.createMany({
    data: [
      { scope: "city" as const, countryCode: "IN", city: "Mumbai", status: "submitted" as const },
      { scope: "country" as const, countryCode: "DE", city: null, status: "in_review" as const },
      { scope: "city" as const, countryCode: "PL", city: "Gdańsk", status: "waitlisted" as const },
      { scope: "global" as const, countryCode: null, city: null, status: "submitted" as const },
    ].map((a, i) => ({
      ...a,
      userId: userIds[110 + i]!,
      motivation:
        "Demo application: I moved abroad myself and want newcomers in my city to find their people faster than I did.",
      experience:
        "Demo: organised meetups for a student association and volunteered at cultural events.",
      languages: ["en", "hi", "pl"].slice(0, 1 + (i % 3)),
      hoursPerMonth: 6 + i * 2,
      isDemo: true,
    })),
  });

  await seedCultoura(ctx, people, today);
}

/** Cultoura is EiB's real cultural-exchange series (docs/FACTS.md); this edition is fictional. */
async function seedCultoura(ctx: SeedContext, people: DemoPeople, today: Date) {
  const { db, chapters } = ctx;
  const [venue, format] = await Promise.all([
    db.venue.findFirst({ where: { chapterId: chapters.live.id, isDemo: true } }),
    db.eventFormat.findFirst({ where: { slug: "cultural-exchange" } }),
  ]);
  if (!venue || !format) return;
  const startsAt = new Date(today.getTime() + 12 * DAY + 13 * HOUR);
  const eventId = createId();
  await db.event.create({
    data: {
      id: eventId,
      kind: "festival",
      slug: "demo-cultoura",
      chapterId: chapters.live.id,
      formatId: format.id,
      title: "Cultoura (demo edition)",
      tagline: "EiB's cultural-exchange series, shown here with fictional demo content.",
      summary: "Demo edition of Cultoura: date, programme and tickets are placeholders.",
      description:
        "Demo data: Cultoura is EiB's cultural-exchange series. This edition is fictional and shows how a " +
        "Cultoura day would run on the platform: Cultural Bubbles present food, music and stories from home.",
      startsAt,
      endsAt: new Date(startsAt.getTime() + 8 * HOUR),
      venueId: venue.id,
      capacity: 300,
      maxPerOrder: 4,
      status: "published",
      volunteersOpen: true,
      stallsOpen: false,
      createdById: people.byKey.lead,
      isDemo: true,
      ticketTypes: {
        create: [
          {
            name: "Free entry (demo)",
            priceMinor: 0,
            currency: chapters.live.currency,
            sortOrder: 0,
            description: "Placeholder tier for the demo.",
          },
        ],
      },
    },
  });
  await db.volunteerShift.createMany({
    data: [
      { role: "Welcome desk (demo)", offset: 0, minutes: 180, capacity: 3 },
      { role: "Bubble tables (demo)", offset: 2, minutes: 240, capacity: 5 },
      { role: "Photo crew (demo)", offset: 4, minutes: 180, capacity: 2 },
    ].map(({ offset, minutes, ...s }) => {
      const start = new Date(startsAt.getTime() + offset * HOUR);
      return {
        ...s,
        id: createId(),
        eventId,
        startsAt: start,
        endsAt: new Date(start.getTime() + minutes * 60_000),
      };
    }),
  });
}
