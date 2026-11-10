import {
  fakerEN,
  fakerEN_IN,
  fakerES_MX,
  fakerFR,
  fakerIT,
  fakerPL,
  fakerTR,
  fakerUK,
  type Faker,
} from "@faker-js/faker";
import { hashPassword } from "better-auth/crypto";

import type { ResidenceSituation, RoleName } from "../../../generated/prisma/client";

import {
  createId,
  DEMO_EMAIL_DOMAIN,
  DEMO_PASSWORD,
  faker,
  insertMany,
  slugify,
  type SeedContext,
} from "./context";

/** The 8 demo Bubbles (brief 3L) and a name generator for each origin. */
export const bubbleOrigins = [
  { code: "IN", name: "India", names: fakerEN_IN },
  { code: "LK", name: "Sri Lanka", names: fakerEN_IN },
  { code: "UA", name: "Ukraine", names: fakerUK },
  { code: "TR", name: "Turkey", names: fakerTR },
  { code: "MX", name: "Mexico", names: fakerES_MX },
  { code: "IT", name: "Italy", names: fakerIT },
  { code: "TN", name: "Tunisia", names: fakerFR },
  { code: "PL", name: "Poland", names: fakerPL },
] as const;

const OTHER_ORIGINS = ["DE", "BR", "NG", "VN", "ES", "US", "GB", "PH"];
const MEMBER_COUNT = 120;
const RESIDENCE: ResidenceSituation[] = [
  "eu_citizen",
  "non_eu_employee",
  "non_eu_founder",
  "student",
  "family_member",
];
const LANGUAGES = ["en", "pl", "uk", "hi", "ta", "si", "tr", "es", "it", "ar", "fr", "de"];

type Account = {
  key: string;
  name: string;
  email: string;
  origin: string;
  roles: { role: RoleName; global?: boolean }[];
};

/** Demo sign-in accounts (brief 3L). Fictional composites; "Demo" surname keeps them obviously fake. */
const accounts: Account[] = [
  {
    key: "admin",
    name: "Admin Demo",
    email: `admin@${DEMO_EMAIL_DOMAIN}`,
    origin: "PL",
    roles: [{ role: "admin", global: true }],
  },
  {
    key: "lead",
    name: "Alex Demo",
    email: `lead@${DEMO_EMAIL_DOMAIN}`,
    origin: "IT",
    roles: [{ role: "chapter_lead" }, { role: "member" }],
  },
  {
    key: "priya",
    name: "Priya Demo",
    email: `priya@${DEMO_EMAIL_DOMAIN}`,
    origin: "IN",
    roles: [{ role: "member" }],
  },
  {
    key: "karim",
    name: "Karim Demo",
    email: `karim@${DEMO_EMAIL_DOMAIN}`,
    origin: "TN",
    roles: [{ role: "member" }],
  },
  {
    key: "marta",
    name: "Marta Demo",
    email: `marta.provider@${DEMO_EMAIL_DOMAIN}`,
    origin: "PL",
    roles: [{ role: "member" }],
  },
  {
    key: "sponsor",
    name: "Anna Demo",
    email: `sponsor@${DEMO_EMAIL_DOMAIN}`,
    origin: "PL",
    roles: [{ role: "member" }],
  },
];

export type DemoPeople = {
  userIds: string[];
  byKey: Record<string, string>;
  originByUser: Map<string, string>;
  bubbleIds: Map<string, string>;
};

function nameFor(origin: string): string {
  const generator: Faker = bubbleOrigins.find((b) => b.code === origin)?.names ?? fakerEN;
  return generator.person.fullName();
}

export async function seedPeople(ctx: SeedContext): Promise<DemoPeople> {
  const { db, chapters, today } = ctx;
  const [industries, goals] = await Promise.all([db.industry.findMany(), db.goal.findMany()]);
  for (const gen of [fakerEN, fakerEN_IN, fakerUK, fakerTR, fakerES_MX, fakerIT, fakerFR, fakerPL])
    gen.seed(faker.number.int());

  const users: { id: string; name: string; email: string; origin: string; key?: string }[] =
    accounts.map((a) => ({
      id: createId(),
      name: a.name,
      email: a.email,
      origin: a.origin,
      key: a.key,
    }));
  // 7 members per Bubble at least, so every Bubble passes the "hide groups under 5" rule.
  for (let i = users.length; i < MEMBER_COUNT; i += 1) {
    const origin =
      i < 6 + bubbleOrigins.length * 7
        ? bubbleOrigins[(i - 6) % bubbleOrigins.length]!.code
        : faker.helpers.arrayElement([...OTHER_ORIGINS, ...bubbleOrigins.map((b) => b.code)]);
    users.push({
      id: createId(),
      name: nameFor(origin),
      email: `member${String(i).padStart(3, "0")}@${DEMO_EMAIL_DOMAIN}`,
      origin,
    });
  }

  await insertMany(users, (chunk) =>
    db.user.createMany({
      data: chunk.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        emailVerified: true,
        isDemo: true,
        locale: chapters.live.locales[0] ?? null,
      })),
    }),
  );

  const password = await hashPassword(DEMO_PASSWORD);
  await db.account.createMany({
    data: users
      .filter((u) => u.key)
      .map((u) => ({
        id: createId(),
        accountId: u.id,
        providerId: "credential",
        userId: u.id,
        password,
      })),
  });

  const profiles = users.map((u, index) => {
    const inWarsaw = index >= 6 && index % 9 === 0;
    const chapterId = inWarsaw ? chapters.launching.id : chapters.live.id;
    return {
      id: createId(),
      userId: u.id,
      slug: `${slugify(u.name)}-${index}`,
      headline: `${faker.helpers.arrayElement(industries).name} · Demo profile`,
      bio: "Demo profile: fictional member created for the platform demo.",
      homeChapterId: chapterId,
      originCountryCode: u.origin,
      languages: faker.helpers
        .arrayElements(LANGUAGES, { min: 1, max: 3 })
        .concat("en")
        .filter((v, i, a) => a.indexOf(v) === i),
      industryId: faker.helpers.arrayElement(industries).id,
      skills: faker.helpers.arrayElements(
        [
          "sales",
          "marketing",
          "software",
          "design",
          "accounting",
          "law",
          "teaching",
          "operations",
          "data",
          "hr",
        ],
        { min: 2, max: 4 },
      ),
      arrivalDate: new Date(
        today.getTime() - faker.number.int({ min: 30, max: 3000 }) * 86_400_000,
      ),
      residenceSituation:
        u.origin === "PL" || u.origin === "IT" || u.origin === "ES" || u.origin === "DE"
          ? ("eu_citizen" as const)
          : faker.helpers.arrayElement(RESIDENCE.slice(1)),
      openToCoffee: faker.datatype.boolean({ probability: 0.6 }),
      foundingNumber: index + 1 <= 500 && !inWarsaw ? index + 1 : null,
      onboardingStep: 6,
      isDemo: true,
    };
  });
  // Founding numbers must be unique per chapter: renumber Kraków members in join order.
  let founding = 0;
  for (const p of profiles)
    p.foundingNumber = p.homeChapterId === chapters.live.id ? ++founding : null;
  await insertMany(profiles, (chunk) => db.profile.createMany({ data: chunk }));
  await db.profileGoal.createMany({
    data: profiles.flatMap((p) =>
      faker.helpers
        .arrayElements(goals, { min: 1, max: 3 })
        .map((g) => ({ profileId: p.id, goalId: g.id })),
    ),
  });

  const byKey = Object.fromEntries(users.filter((u) => u.key).map((u) => [u.key!, u.id]));
  const roleRows = users.flatMap((u) => {
    const account = accounts.find((a) => a.key === u.key);
    const roles = account?.roles ?? [{ role: "member" as RoleName }];
    const home = profiles.find((p) => p.userId === u.id)!.homeChapterId;
    return roles.map((r) => ({
      id: createId(),
      userId: u.id,
      role: r.role,
      chapterId: "global" in r && r.global ? null : home,
    }));
  });
  await db.chapterRole.createMany({ data: roleRows });
  await db.consent.createMany({
    data: users.flatMap((u) =>
      (["matching", "who_i_met", "avatar_display"] as const).map((type) => ({
        id: createId(),
        userId: u.id,
        type,
        granted: faker.datatype.boolean({ probability: 0.8 }),
      })),
    ),
  });

  const bubbleIds = new Map<string, string>();
  for (const origin of bubbleOrigins) {
    const id = createId();
    bubbleIds.set(origin.code, id);
    await db.bubble.create({
      data: {
        id,
        slug: slugify(origin.name),
        name: `${origin.name} Bubble`,
        originCountryCode: origin.code,
        description: `Members whose roots are in ${origin.name}. Demo data.`,
        isDemo: true,
      },
    });
  }
  const bubbleMembers = users
    .filter((u) => bubbleIds.has(u.origin))
    .map((u) => ({
      bubbleId: bubbleIds.get(u.origin)!,
      userId: u.id,
      chapterId: profiles.find((p) => p.userId === u.id)!.homeChapterId,
      isVisible: faker.datatype.boolean({ probability: 0.85 }),
      isLead: false,
    }));
  // First member of each Bubble (excluding the demo accounts) leads it.
  for (const code of bubbleIds.keys()) {
    const lead = bubbleMembers.find(
      (m) => m.bubbleId === bubbleIds.get(code) && !Object.values(byKey).includes(m.userId),
    );
    if (lead) Object.assign(lead, { isLead: true, isVisible: true });
  }
  await db.bubbleMember.createMany({ data: bubbleMembers });
  const leads = bubbleMembers.filter((m) => m.isLead);
  await db.chapterRole.createMany({
    data: leads.map((m) => ({
      id: createId(),
      userId: m.userId,
      role: "bubble_lead" as const,
      chapterId: m.chapterId,
    })),
  });

  return {
    userIds: users.map((u) => u.id),
    byKey,
    originByUser: new Map(users.map((u) => [u.id, u.origin])),
    bubbleIds,
  };
}
