/**
 * Verified provider criteria (brief 3E). The admin checklist and the public criteria page both read
 * this list, so the badge always means exactly what the published page says. Swap or extend here.
 */
export const VERIFICATION_CRITERIA = [
  { id: "registryChecked", titleKey: "registry", requiredForBadge: true },
  { id: "referencesChecked", titleKey: "references", requiredForBadge: true },
  { id: "insuranceChecked", titleKey: "insurance", requiredForBadge: true },
] as const;

export type VerificationCriterion = (typeof VERIFICATION_CRITERIA)[number]["id"];

/** A provider may only be approved when every required criterion is checked. */
export function canApprove(checks: Partial<Record<VerificationCriterion, boolean>>): boolean {
  return VERIFICATION_CRITERIA.every((c) => !c.requiredForBadge || checks[c.id] === true);
}

/** Quote requests a member may send per day (brief 3E). */
export const QUOTE_REQUESTS_PER_DAY = 5;
/** Connection requests a member may send per day from the directory. */
export const CONNECTION_REQUESTS_PER_DAY = 20;
