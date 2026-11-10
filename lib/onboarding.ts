export const ONBOARDING_STEPS = [
  "chapter",
  "origin",
  "languages",
  "industry",
  "goals",
  "arrival",
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
export const RESIDENCE_SITUATIONS = [
  "eu_citizen",
  "non_eu_employee",
  "non_eu_founder",
  "student",
  "family_member",
] as const;
export const DELETION_GRACE_DAYS = 30;
