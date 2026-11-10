type ProfileRow = {
  isPublic: boolean;
  showBio: boolean;
  showOrigin: boolean;
  showLanguages: boolean;
  showIndustry: boolean;
  showSkills: boolean;
  openToCoffee: boolean;
  headline: string | null;
  bio: string | null;
  originCountryCode: string | null;
  languages: string[];
  skills: string[];
  user: { name: string };
  industry: { name: string } | null;
  homeChapter: { name: string } | null;
};

export type VisibleProfile = {
  name: string;
  headline: string | null;
  chapter: string | null;
  openToCoffee: boolean;
  bio?: string | null;
  originCountryCode?: string | null;
  languages?: string[];
  industry?: string | null;
  skills?: string[];
};

/**
 * What a viewer may see (old bug 14). The owner sees everything; everyone else sees only fields
 * switched on, and nothing for a private profile. Email is never part of the result.
 */
export function visibleProfile(row: ProfileRow, isOwner: boolean): VisibleProfile | null {
  if (!row.isPublic && !isOwner) return null;
  const show = (flag: boolean) => isOwner || flag;
  return {
    name: row.user.name,
    headline: row.headline,
    chapter: row.homeChapter?.name ?? null,
    openToCoffee: row.openToCoffee,
    ...(show(row.showBio) && { bio: row.bio }),
    ...(show(row.showOrigin) && { originCountryCode: row.originCountryCode }),
    ...(show(row.showLanguages) && { languages: row.languages }),
    ...(show(row.showIndustry) && { industry: row.industry?.name ?? null }),
    ...(show(row.showSkills) && { skills: row.skills }),
  };
}
