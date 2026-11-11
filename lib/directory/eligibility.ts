/**
 * Who may review a provider (brief 3E): only members who shared a quote request with the provider
 * or attended the same session as its owner. Never the owner, never twice. Pure and unit-tested.
 */
export type ReviewContext = {
  viewerId: string | null;
  ownerId: string | null;
  hasQuoteRequest: boolean;
  sharedEvent: boolean;
  alreadyReviewed: boolean;
};

export type ReviewEligibility =
  "eligible" | "signIn" | "owner" | "noInteraction" | "alreadyReviewed";

export function reviewEligibility(ctx: ReviewContext): ReviewEligibility {
  if (!ctx.viewerId) return "signIn";
  if (ctx.ownerId && ctx.viewerId === ctx.ownerId) return "owner";
  if (ctx.alreadyReviewed) return "alreadyReviewed";
  if (!ctx.hasQuoteRequest && !ctx.sharedEvent) return "noInteraction";
  return "eligible";
}

/** Directory visibility: what a viewer sees on a member card (visitors see the least). */
export type CardFields = {
  origin: boolean;
  languages: boolean;
  industry: boolean;
  skills: boolean;
};

export function cardFields(
  signedIn: boolean,
  flags: {
    showOrigin: boolean;
    showLanguages: boolean;
    showIndustry: boolean;
    showSkills: boolean;
  },
): CardFields {
  if (!signedIn) return { origin: false, languages: false, industry: false, skills: false };
  return {
    origin: flags.showOrigin,
    languages: flags.showLanguages,
    industry: flags.showIndustry,
    skills: flags.showSkills,
  };
}
