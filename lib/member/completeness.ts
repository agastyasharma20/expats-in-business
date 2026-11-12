/** Profile completeness: each item is something a member can fix in settings (no vanity points). */
export const PROFILE_CHECKS = [
  "headline",
  "bio",
  "chapter",
  "origin",
  "languages",
  "skills",
  "goals",
] as const;
export type ProfileCheck = (typeof PROFILE_CHECKS)[number];

export function profileCompleteness(profile: {
  headline: string | null;
  bio: string | null;
  homeChapterId: string | null;
  originCountryCode: string | null;
  languages: string[];
  skills: string[];
  goalCount: number;
}) {
  const done: Record<ProfileCheck, boolean> = {
    headline: Boolean(profile.headline?.trim()),
    bio: Boolean(profile.bio?.trim()),
    chapter: Boolean(profile.homeChapterId),
    origin: Boolean(profile.originCountryCode),
    languages: profile.languages.length > 0,
    skills: profile.skills.length > 0,
    goals: profile.goalCount > 0,
  };
  const missing = PROFILE_CHECKS.filter((key) => !done[key]);
  return {
    percent: Math.round(((PROFILE_CHECKS.length - missing.length) / PROFILE_CHECKS.length) * 100),
    missing,
  };
}
