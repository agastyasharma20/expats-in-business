import { describe, expect, it } from "vitest";

import { introTemplate, isAcceptableIntro } from "@/lib/roadmap/intro";
import { buildRoadmap, columnFor, mergeRoadmap, type TaskDefinition } from "@/lib/roadmap/rules";

/**
 * Written before lib/roadmap/rules.ts (M11 is test-driven). The library mirrors the seeded Poland
 * template: brief order PESEL → trusted profile → MOS → bank → health → address → tax → KSeF →
 * Bubble → first session, with day 7/30/60/90 offsets.
 */
const NON_EU = ["non_eu_employee", "non_eu_founder", "student", "family_member"] as const;
const library: TaskDefinition[] = [
  {
    slug: "pesel",
    appliesTo: [],
    forGoals: [],
    dependsOn: [],
    dueOffsetDays: 30,
    sortOrder: 0,
    skipForCitizens: true,
  },
  {
    slug: "trusted-profile",
    appliesTo: [],
    forGoals: [],
    dependsOn: ["pesel"],
    dueOffsetDays: 30,
    sortOrder: 1,
    skipForCitizens: false,
  },
  {
    slug: "mos-application",
    appliesTo: [...NON_EU],
    forGoals: [],
    dependsOn: [],
    dueOffsetDays: 30,
    sortOrder: 2,
    skipForCitizens: true,
  },
  {
    slug: "bank-account",
    appliesTo: [],
    forGoals: [],
    dependsOn: [],
    dueOffsetDays: 30,
    sortOrder: 3,
    skipForCitizens: false,
  },
  {
    slug: "health-insurance",
    appliesTo: [],
    forGoals: [],
    dependsOn: [],
    dueOffsetDays: 30,
    sortOrder: 4,
    skipForCitizens: false,
  },
  {
    slug: "address-registration",
    appliesTo: [],
    forGoals: [],
    dependsOn: [],
    dueOffsetDays: 30,
    sortOrder: 5,
    skipForCitizens: false,
  },
  {
    slug: "tax-basics",
    appliesTo: [],
    forGoals: ["find-clients"],
    dependsOn: [],
    dueOffsetDays: 60,
    sortOrder: 6,
    skipForCitizens: false,
  },
  {
    slug: "ksef",
    appliesTo: [],
    forGoals: ["find-clients"],
    dependsOn: ["tax-basics"],
    dueOffsetDays: 90,
    sortOrder: 7,
    skipForCitizens: false,
  },
  {
    slug: "join-bubble",
    appliesTo: [],
    forGoals: [],
    dependsOn: [],
    dueOffsetDays: 7,
    sortOrder: 8,
    skipForCitizens: false,
  },
  {
    slug: "first-session",
    appliesTo: [],
    forGoals: [],
    dependsOn: [],
    dueOffsetDays: 30,
    sortOrder: 9,
    skipForCitizens: false,
  },
];

const arrival = new Date("2026-11-02T00:00:00Z");
const base = { countryCode: "PL", arrivalDate: arrival, goals: ["settle-in"] };
const slugs = (input: Parameters<typeof buildRoadmap>[0]) =>
  buildRoadmap(input, library).map((t) => t.slug);
const SETTLING = [
  "pesel",
  "trusted-profile",
  "bank-account",
  "health-insurance",
  "address-registration",
  "join-bubble",
  "first-session",
];
const NON_EU_SETTLING = [
  "pesel",
  "trusted-profile",
  "mos-application",
  "bank-account",
  "health-insurance",
  "address-registration",
  "join-bubble",
  "first-session",
];

describe("roadmap scenarios", () => {
  it("Priya, non-EU employee: residence application, no business tasks", () => {
    expect(
      slugs({
        ...base,
        residenceSituation: "non_eu_employee",
        originCountryCode: "IN",
        goals: ["find-job", "meet-people"],
      }),
    ).toEqual(NON_EU_SETTLING);
  });

  it("Karim, non-EU founder: also tax basics and KSeF, KSeF after tax basics", () => {
    const list = slugs({
      ...base,
      residenceSituation: "non_eu_founder",
      originCountryCode: "TN",
      goals: ["meet-people"],
    });
    expect(list).toEqual([
      "pesel",
      "trusted-profile",
      "mos-application",
      "bank-account",
      "health-insurance",
      "address-registration",
      "tax-basics",
      "ksef",
      "join-bubble",
      "first-session",
    ]);
    expect(list.indexOf("ksef")).toBeGreaterThan(list.indexOf("tax-basics"));
  });

  it("student: residence application, no business tasks", () => {
    expect(slugs({ ...base, residenceSituation: "student", originCountryCode: "UA" })).toEqual(
      NON_EU_SETTLING,
    );
  });

  it("family member: residence application, no business tasks", () => {
    expect(
      slugs({ ...base, residenceSituation: "family_member", originCountryCode: "BR" }),
    ).toEqual(NON_EU_SETTLING);
  });

  it("EU citizen: no residence application", () => {
    expect(slugs({ ...base, residenceSituation: "eu_citizen", originCountryCode: "IT" })).toEqual(
      SETTLING,
    );
  });

  it("Polish returnee: no PESEL and no residence application; trusted profile no longer waits for PESEL", () => {
    const tasks = buildRoadmap(
      { ...base, residenceSituation: "eu_citizen", originCountryCode: "PL" },
      library,
    );
    expect(tasks.map((t) => t.slug)).toEqual([
      "trusted-profile",
      "bank-account",
      "health-insurance",
      "address-registration",
      "join-bubble",
      "first-session",
    ]);
    expect(tasks.find((t) => t.slug === "trusted-profile")!.dependsOn).toEqual([]);
  });

  it("any member with the find-clients goal gets the business tasks", () => {
    expect(
      slugs({
        ...base,
        residenceSituation: "eu_citizen",
        originCountryCode: "IT",
        goals: ["find-clients"],
      }),
    ).toContain("ksef");
  });
});

describe("due dates and columns", () => {
  const tasks = buildRoadmap(
    { ...base, residenceSituation: "non_eu_founder", originCountryCode: "TN" },
    library,
  );
  const due = (slug: string) =>
    tasks
      .find((t) => t.slug === slug)!
      .dueAt.toISOString()
      .slice(0, 10);

  it("are arrival + offset (day 7/30/60/90)", () => {
    expect(due("join-bubble")).toBe("2026-11-09");
    expect(due("pesel")).toBe("2026-12-02");
    expect(due("tax-basics")).toBe("2027-01-01");
    expect(due("ksef")).toBe("2027-01-31");
  });

  it("never fall before a dependency's due date", () => {
    const custom: TaskDefinition[] = [
      {
        slug: "a",
        appliesTo: [],
        forGoals: [],
        dependsOn: [],
        dueOffsetDays: 60,
        sortOrder: 0,
        skipForCitizens: false,
      },
      {
        slug: "b",
        appliesTo: [],
        forGoals: [],
        dependsOn: ["a"],
        dueOffsetDays: 7,
        sortOrder: 1,
        skipForCitizens: false,
      },
    ];
    const [a, b] = buildRoadmap(
      { ...base, residenceSituation: "eu_citizen", originCountryCode: "IT" },
      custom,
    );
    expect(b!.dueAt.getTime()).toBeGreaterThanOrEqual(a!.dueAt.getTime());
  });

  it("group into 30/60/90 columns", () => {
    expect(columnFor(7)).toBe(30);
    expect(columnFor(30)).toBe(30);
    expect(columnFor(45)).toBe(60);
    expect(columnFor(90)).toBe(90);
    expect(columnFor(400)).toBe(90);
  });

  it("orders dependencies first even if the library lists them later", () => {
    const shuffled = [...library].reverse();
    const list = slugs.call(null, {
      ...base,
      residenceSituation: "non_eu_founder",
      originCountryCode: "TN",
    });
    const fromShuffled = buildRoadmap(
      { ...base, residenceSituation: "non_eu_founder", originCountryCode: "TN" },
      shuffled,
    ).map((t) => t.slug);
    expect(fromShuffled).toEqual(list);
  });

  it("is deterministic and does not depend on a missing arrival date crashing", () => {
    const noArrival = buildRoadmap(
      { ...base, arrivalDate: null, residenceSituation: "eu_citizen", originCountryCode: "IT" },
      library,
      new Date("2026-12-01T00:00:00Z"),
    );
    expect(noArrival[0]!.dueAt.toISOString().slice(0, 10)).toBe("2026-12-31");
  });
});

describe("regenerating after onboarding changes", () => {
  it("keeps completed tasks, adds new ones, drops open ones that no longer apply", () => {
    const existing = [
      { slug: "pesel", doneAt: new Date("2026-11-20T00:00:00Z") },
      { slug: "mos-application", doneAt: null },
      { slug: "mos-application-old", doneAt: null },
    ];
    const generated = buildRoadmap(
      { ...base, residenceSituation: "eu_citizen", originCountryCode: "IT" },
      library,
    );
    const plan = mergeRoadmap(existing, generated);
    expect(plan.keep).toContain("pesel"); // done, and still in the plan
    expect(plan.remove).toEqual(["mos-application", "mos-application-old"]); // open and no longer applies
    expect(plan.add).toEqual(generated.map((t) => t.slug).filter((s) => s !== "pesel"));
  });

  it("never removes a completed task, even if it no longer applies", () => {
    const plan = mergeRoadmap([{ slug: "mos-application", doneAt: new Date() }], []);
    expect(plan.remove).toEqual([]);
    expect(plan.keep).toEqual(["mos-application"]);
  });
});

describe("AI intro never changes selection or order", () => {
  it("falls back to a 2-sentence template that only describes the plan", () => {
    const tasks = buildRoadmap(
      { ...base, residenceSituation: "non_eu_employee", originCountryCode: "IN" },
      library,
    );
    const intro = introTemplate({
      total: tasks.length,
      firstWeek: 1,
      firstTitle: "Join your Cultural Bubble",
    });
    expect(intro.split(/(?<=[.!?])\s+/)).toHaveLength(2);
    expect(isAcceptableIntro(intro)).toBe(true);
  });

  it("rejects model output that is too long, has links, or more than 2 sentences", () => {
    expect(isAcceptableIntro("One. Two. Three.")).toBe(false);
    expect(isAcceptableIntro("See https://evil.example now. Then go.")).toBe(false);
    expect(isAcceptableIntro("x ".repeat(80))).toBe(false);
    expect(isAcceptableIntro("Welcome to Poland. Here is your plan.")).toBe(true);
  });

  it("the rules take no intro input: the same answers always give the same tasks", () => {
    const input = {
      ...base,
      residenceSituation: "non_eu_founder" as const,
      originCountryCode: "TN",
    };
    expect(buildRoadmap(input, library)).toEqual(buildRoadmap(input, library));
    expect(buildRoadmap.length).toBeLessThanOrEqual(3);
  });
});

describe("roadmap calendar", async () => {
  const { buildTaskCalendar } = await import("@/lib/events/ics");
  it("exports all-day events on each due date", () => {
    const ics = buildTaskCalendar("My roadmap", [
      {
        uid: "t1@eib",
        title: "Get your PESEL number",
        description: "Why, it matters",
        url: "https://x.test/roadmap",
        date: new Date("2026-12-02T00:00:00Z"),
        stamp: new Date("2026-11-12T00:00:00Z"),
      },
    ]);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261202\r\n");
    expect(ics).toContain("DTEND;VALUE=DATE:20261203\r\n");
    expect(ics).toContain("DESCRIPTION:Why\\, it matters");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });
});
