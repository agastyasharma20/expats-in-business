import type {
  BillingInterval,
  PlanTier,
  ResidenceSituation,
} from "../../../generated/prisma/client";

/**
 * Real configuration (isDemo = false). Event format durations and descriptions are editable
 * defaults for the event builder, not statements about how EiB runs its sessions.
 * Edit here, or later in the admin catalogs, to change it.
 * Event formats come from docs/FACTS.md; plan prices are the brief's proposals (priceStatus
 * "proposal" shows the "Proposed prices · net of VAT · Test mode" banner).
 */
export const eventFormats = [
  {
    slug: "connect-collaborate",
    name: "Connect & Collaborate",
    minutes: 150,
    description: "Networking session: short introductions, then open conversation.",
  },
  {
    slug: "guest-speaker",
    name: "Guest Speaker",
    minutes: 120,
    description: "A talk by a guest followed by questions and networking.",
  },
  {
    slug: "cultural-exchange",
    name: "Cultural Exchange",
    minutes: 150,
    description: "Members share the business culture of their home countries.",
  },
  {
    slug: "virtual-connect",
    name: "Virtual Connect",
    minutes: 60,
    description: "Online session for members who cannot join in person.",
  },
  {
    slug: "business-development",
    name: "Business Development",
    minutes: 180,
    description: "Hands-on workshop on a practical business topic.",
  },
] as const;

export const industries = [
  "Software and IT",
  "Quality assurance",
  "Marketing and design",
  "Finance and accounting",
  "Consulting",
  "Education and training",
  "Hospitality and food",
  "Health and wellbeing",
  "Legal services",
  "Logistics and trade",
  "Real estate",
  "Creative industries",
];

export const goals = [
  { slug: "find-clients", name: "Find clients" },
  { slug: "find-job", name: "Find a job" },
  { slug: "settle-in", name: "Settle in" },
  { slug: "meet-people", name: "Meet people" },
  { slug: "give-back", name: "Give back" },
] as const;

export const providerCategories = [
  { slug: "legal", name: "Legal" },
  { slug: "tax-accounting", name: "Tax and accounting" },
  { slug: "relocation", name: "Relocation" },
  { slug: "housing", name: "Housing" },
  { slug: "language", name: "Language" },
  { slug: "insurance", name: "Insurance" },
] as const;

export const badges = [
  { slug: "founding-member", name: "Founding member" },
  { slug: "speaker", name: "Speaker" },
  { slug: "bubble-lead", name: "Bubble Lead" },
];

type PlanSeed = {
  code: string;
  tier: PlanTier;
  name: string;
  interval: BillingInterval | null;
  /** Major units in the country currency; stored as minor units. */
  amount: number;
  perLeadFee?: number;
  contactOnly?: boolean;
  features: string[];
};

/** docs/PROJECT_BRIEF.md 3D. Proposals, not approved prices. */
export const plans: PlanSeed[] = [
  {
    code: "community",
    tier: "community",
    name: "Community",
    interval: null,
    amount: 0,
    features: [
      "profile",
      "events",
      "directory",
      "guides",
      "bubbles",
      "roadmap",
      "concierge-10-per-day",
    ],
  },
  {
    code: "plus-month",
    tier: "plus",
    name: "Member Plus",
    interval: "month",
    amount: 19,
    features: [
      "concierge-unlimited",
      "coffee-roulette-priority",
      "early-event-access",
      "workshop-discounts",
      "deadline-reminders",
    ],
  },
  {
    code: "plus-year",
    tier: "plus",
    name: "Member Plus",
    interval: "year",
    amount: 190,
    features: [
      "concierge-unlimited",
      "coffee-roulette-priority",
      "early-event-access",
      "workshop-discounts",
      "deadline-reminders",
    ],
  },
  {
    code: "business-month",
    tier: "business",
    name: "Business",
    interval: "month",
    amount: 49,
    features: ["business-listing", "lead-inbox", "featured-in-bubble", "workshop-seats-2"],
  },
  {
    code: "business-year",
    tier: "business",
    name: "Business",
    interval: "year",
    amount: 490,
    features: ["business-listing", "lead-inbox", "featured-in-bubble", "workshop-seats-2"],
  },
  {
    code: "provider-month",
    tier: "provider",
    name: "Verified Provider",
    interval: "month",
    amount: 149,
    perLeadFee: 40,
    features: ["verified-badge", "quote-requests", "analytics"],
  },
  {
    code: "provider-year",
    tier: "provider",
    name: "Verified Provider",
    interval: "year",
    amount: 1490,
    perLeadFee: 40,
    features: ["verified-badge", "quote-requests", "analytics"],
  },
  {
    code: "corporate-year",
    tier: "corporate",
    name: "Corporate",
    interval: "year",
    amount: 7900,
    contactOnly: true,
    features: ["plus-seats-25", "branded-onboarding-2", "aggregate-report"],
  },
];

const NON_EU: ResidenceSituation[] = [
  "non_eu_employee",
  "non_eu_founder",
  "student",
  "family_member",
];

/**
 * Landing Roadmap task library (brief 3G). Descriptions point to guides instead of stating rules,
 * so legal details live only in sourced guides. lib/roadmap/rules.ts picks and orders tasks.
 */
export const roadmapTasks = [
  {
    slug: "pesel",
    title: "Get your PESEL number",
    guideSlug: "pesel",
    appliesTo: [],
    forGoals: [],
    dependsOn: [],
    due: 30,
  },
  {
    slug: "trusted-profile",
    title: "Set up your trusted profile",
    guideSlug: "trusted-profile",
    appliesTo: [],
    forGoals: [],
    dependsOn: ["pesel"],
    due: 30,
  },
  {
    slug: "mos-application",
    title: "Apply for residence online (MOS)",
    guideSlug: "mos-residence-application",
    appliesTo: NON_EU,
    forGoals: [],
    dependsOn: [],
    due: 30,
  },
  {
    slug: "bank-account",
    title: "Open a bank account",
    guideSlug: "banking-basics",
    appliesTo: [],
    forGoals: [],
    dependsOn: [],
    due: 30,
  },
  {
    slug: "health-insurance",
    title: "Sort out health insurance",
    guideSlug: "health-insurance-basics",
    appliesTo: [],
    forGoals: [],
    dependsOn: [],
    due: 30,
  },
  {
    slug: "address-registration",
    title: "Register your address",
    guideSlug: "pesel",
    appliesTo: [],
    forGoals: [],
    dependsOn: [],
    due: 30,
  },
  {
    slug: "tax-basics",
    title: "Learn the tax basics",
    guideSlug: "zus-sole-traders",
    appliesTo: [],
    forGoals: ["find-clients"],
    dependsOn: [],
    due: 60,
  },
  {
    slug: "ksef",
    title: "Prepare for KSeF e-invoicing",
    guideSlug: "ksef-e-invoicing",
    appliesTo: [],
    forGoals: ["find-clients"],
    dependsOn: ["tax-basics"],
    due: 90,
  },
  {
    slug: "join-bubble",
    title: "Join your Cultural Bubble",
    guideSlug: null,
    appliesTo: [],
    forGoals: [],
    dependsOn: [],
    due: 7,
  },
  {
    slug: "first-session",
    title: "Come to your first EiB session",
    guideSlug: null,
    appliesTo: [],
    forGoals: [],
    dependsOn: [],
    due: 30,
  },
] satisfies {
  slug: string;
  title: string;
  guideSlug: string | null;
  appliesTo: ResidenceSituation[];
  forGoals: string[];
  dependsOn: string[];
  due: number;
}[];
