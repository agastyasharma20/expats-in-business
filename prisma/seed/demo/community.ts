import { createId, faker, slugify, type SeedContext } from "./context";
import type { DemoEvents } from "./events";
import type { DemoPeople } from "./people";

const PROVIDER_COUNT = 30;

/**
 * Cities that asked for a chapter: 140 votes across 12 cities (brief 3L). Polish cities belong to
 * the existing country hub; the four abroad add demo-only country rows (removed by demo:reset).
 */
const requestCities = [
  { city: "Wrocław", country: "PL", votes: 24 },
  { city: "Gdańsk", country: "PL", votes: 19 },
  { city: "Poznań", country: "PL", votes: 16 },
  { city: "Łódź", country: "PL", votes: 12 },
  { city: "Katowice", country: "PL", votes: 11 },
  { city: "Lublin", country: "PL", votes: 9 },
  { city: "Szczecin", country: "PL", votes: 6 },
  { city: "Rzeszów", country: "PL", votes: 5 },
  { city: "Berlin", country: "DE", votes: 14 },
  { city: "Prague", country: "CZ", votes: 11 },
  { city: "Lisbon", country: "PT", votes: 7 },
  { city: "Dublin", country: "IE", votes: 6 },
];
const demoCountries = [
  {
    code: "DE",
    name: "Germany",
    defaultCurrency: "EUR",
    defaultTimezone: "Europe/Berlin",
    locales: ["en", "de"],
  },
  {
    code: "CZ",
    name: "Czechia",
    defaultCurrency: "CZK",
    defaultTimezone: "Europe/Prague",
    locales: ["en", "cs"],
  },
  {
    code: "PT",
    name: "Portugal",
    defaultCurrency: "EUR",
    defaultTimezone: "Europe/Lisbon",
    locales: ["en", "pt"],
  },
  {
    code: "IE",
    name: "Ireland",
    defaultCurrency: "EUR",
    defaultTimezone: "Europe/Dublin",
    locales: ["en"],
  },
];

export async function seedCommunity(ctx: SeedContext, people: DemoPeople, events: DemoEvents) {
  const { db, chapters } = ctx;
  const { userIds, byKey } = people;

  // ── Providers and businesses ──
  const categories = await db.providerCategory.findMany({ orderBy: { sortOrder: "asc" } });
  const providers = Array.from({ length: PROVIDER_COUNT }, (_, i) => {
    const category = categories[i % categories.length]!;
    const isMarta = i === 0;
    const name = isMarta ? "Marta Demo Accounting" : `Demo provider: ${faker.company.name()}`;
    return {
      id: createId(),
      slug: `${slugify(name)}-${i}`,
      ownerId: isMarta ? byKey.marta! : null,
      chapterId: chapters.live.id,
      categoryId: isMarta ? categories.find((c) => c.slug === "tax-accounting")!.id : category.id,
      name,
      description: "Demo provider: fictional business created for the platform demo.",
      services: faker.helpers.arrayElements(
        ["Consultation", "Document review", "Monthly service", "Workshop", "Translation"],
        { min: 2, max: 3 },
      ),
      languages: faker.helpers
        .arrayElements(["en", "pl", "uk", "es", "it", "tr"], { min: 1, max: 3 })
        .concat("en")
        .filter((v, k, a) => a.indexOf(v) === k),
      responseTimeHours: faker.helpers.arrayElement([4, 12, 24, 48]),
      verificationStatus:
        isMarta || i % 3 === 0
          ? ("verified" as const)
          : i % 5 === 0
            ? ("pending" as const)
            : ("none" as const),
      isDemo: true,
    };
  });
  await db.provider.createMany({ data: providers });
  await db.providerVerification.createMany({
    data: providers
      .filter((p) => p.verificationStatus === "verified")
      .map((p) => ({
        id: createId(),
        providerId: p.id,
        registryChecked: true,
        referencesChecked: true,
        insuranceChecked: true,
        verifiedById: byKey.admin,
        decidedAt: ctx.today,
        notes: "Demo verification",
      })),
  });
  await db.business.create({
    data: {
      id: createId(),
      slug: "karim-demo-digital-studio",
      ownerId: byKey.karim!,
      chapterId: chapters.live.id,
      categoryId: null,
      name: "Karim Demo Digital Studio",
      description: "Demo business: one-person digital agency (fictional).",
      isDemo: true,
    },
  });

  const quotes = providers.slice(0, 10).map((p, i) => ({
    id: createId(),
    providerId: p.id,
    requesterId: userIds[10 + i]!,
    message: "Demo quote request: I would like to know your rates.",
    status: i % 2 === 0 ? ("accepted" as const) : ("open" as const),
    acceptedAt: i % 2 === 0 ? ctx.today : null,
    isDemo: true,
  }));
  await db.quoteRequest.createMany({ data: quotes });
  await db.review.createMany({
    data: quotes
      .filter((q) => q.status === "accepted")
      .map((q) => ({
        id: createId(),
        providerId: q.providerId,
        authorId: q.requesterId,
        quoteRequestId: q.id,
        rating: faker.number.int({ min: 4, max: 5 }),
        body: "Demo review: placeholder text.",
        isDemo: true,
      })),
  });

  // ── Connections, mostly confirmed at events (the north-star metric) ──
  const pairs = new Set<string>();
  const connections = [];
  while (connections.length < 160) {
    const [a, b] = faker.helpers.arrayElements(userIds, 2) as [string, string];
    const key = [a, b].sort().join(":");
    if (pairs.has(key)) continue;
    pairs.add(key);
    const accepted = faker.datatype.boolean({ probability: 0.75 });
    connections.push({
      id: createId(),
      requesterId: a,
      addresseeId: b,
      status: accepted ? ("accepted" as const) : ("pending" as const),
      metAtEventId: faker.helpers.arrayElement(events.pastEventIds),
      respondedAt: accepted ? ctx.today : null,
      isDemo: true,
    });
  }
  await db.connection.createMany({ data: connections });

  // ── Chapter requests ──
  for (const country of demoCountries) {
    await db.country.upsert({
      where: { code: country.code },
      update: {},
      create: { ...country, isDemo: true },
    });
  }
  for (const request of requestCities) {
    const id = createId();
    await db.chapterRequest.create({
      data: {
        id,
        city: request.city,
        cityKey: slugify(request.city),
        countryCode: request.country,
        isDemo: true,
      },
    });
    await db.chapterRequestVote.createMany({
      data: faker.helpers
        .arrayElements(userIds, request.votes)
        .map((userId) => ({ requestId: id, userId })),
    });
  }

  // ── Groups, posts and applications ──
  const groups = [
    {
      id: createId(),
      slug: `${slugify(chapters.live.slug)}-community`,
      name: "Chapter community (demo)",
      kind: "chapter" as const,
      chapterId: chapters.live.id,
      bubbleId: null,
      isDemo: true,
    },
    ...[...people.bubbleIds.entries()].map(([code, bubbleId]) => ({
      id: createId(),
      slug: `bubble-${code.toLowerCase()}`,
      name: `Bubble group ${code} (demo)`,
      kind: "bubble" as const,
      chapterId: null,
      bubbleId,
      isDemo: true,
    })),
  ];
  await db.group.createMany({ data: groups });
  await db.post.createMany({
    data: groups.flatMap((g) => [
      {
        id: createId(),
        groupId: g.id,
        authorId: byKey.lead!,
        kind: "announcement" as const,
        body: "Demo announcement: welcome to the group.",
        pinned: true,
        isDemo: true,
      },
      {
        id: createId(),
        groupId: g.id,
        authorId: faker.helpers.arrayElement(userIds),
        kind: "question" as const,
        body: "Demo question: placeholder text.",
        pinned: false,
        isDemo: true,
      },
    ]),
  });
  await db.application.createMany({
    data: (["speaker", "story", "contributor"] as const).map((type, i) => ({
      id: createId(),
      type,
      status: i === 0 ? ("in_review" as const) : ("submitted" as const),
      userId: userIds[20 + i],
      chapterId: chapters.live.id,
      name: "Demo applicant",
      email: `applicant${i}@demo.eib.local`,
      answers: { note: "Demo application" },
      isDemo: true,
    })),
  });

  // A few demo subscriptions so billing screens have data.
  const plusPlan = await db.plan.findUnique({ where: { code: "plus-month" } });
  if (plusPlan) {
    await db.subscription.createMany({
      data: userIds.slice(30, 36).map((userId) => ({
        id: createId(),
        userId,
        planId: plusPlan.id,
        status: "active" as const,
        currentPeriodEnd: new Date(ctx.today.getTime() + 20 * 86_400_000),
        isDemo: true,
      })),
    });
  }
}
