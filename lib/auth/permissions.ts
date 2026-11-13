/**
 * Pure permission rules (brief section 5); no I/O, fully unit-tested.
 * visitor < member (+ Plus/Business/Provider entitlements); bubble_lead and moderator moderate
 * their groups; chapter_lead manages their own chapter; admin does everything everywhere.
 */
// ambassador: a community role (public listing), no admin powers.
export type RoleName =
  | "member"
  | "bubble_lead"
  | "moderator"
  | "chapter_lead"
  | "admin"
  | "ambassador";
export type PlanTier = "community" | "plus" | "business" | "provider" | "corporate";

export type AuthUser = {
  id: string;
  /** chapterId null = global role (only meaningful for admin). */
  roles: { role: RoleName; chapterId: string | null }[];
  /** Tiers of active subscriptions; Community is implicit. */
  tiers: PlanTier[];
  ownsProvider: boolean;
};

export type Action =
  | "admin.access"
  | "chapter.manage"
  | "event.manage"
  | "event.scan"
  | "event.pulse"
  | "applications.review"
  | "analytics.view"
  | "sponsorReport.view"
  | "group.moderate"
  | "provider.inbox";

export type Feature =
  | "concierge.unlimited"
  | "roulette.priority"
  | "events.earlyAccess"
  | "workshops.discount"
  | "reminders.deadlines"
  | "business.listing"
  | "leads.inbox"
  | "bubble.featured"
  | "provider.badge"
  | "provider.quotes"
  | "provider.analytics";

/** Features each paid tier unlocks (brief 3D). Corporate seats are Member Plus seats. */
export const ENTITLEMENTS: Record<PlanTier, readonly Feature[]> = {
  community: [],
  plus: [
    "concierge.unlimited",
    "roulette.priority",
    "events.earlyAccess",
    "workshops.discount",
    "reminders.deadlines",
  ],
  business: ["business.listing", "leads.inbox", "bubble.featured"],
  provider: ["provider.badge", "provider.quotes", "provider.analytics", "leads.inbox"],
  corporate: [
    "concierge.unlimited",
    "roulette.priority",
    "events.earlyAccess",
    "workshops.discount",
    "reminders.deadlines",
  ],
};

/** Free members' daily concierge questions (Plus is unlimited). */
export const FREE_CONCIERGE_QUESTIONS_PER_DAY = 10;

export function isAdmin(user: AuthUser | null): boolean {
  return Boolean(user?.roles.some((r) => r.role === "admin"));
}

/** True if the user holds `role` in `chapterId` (or globally). Admins hold every role. */
export function hasRole(user: AuthUser | null, role: RoleName, chapterId?: string): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return user.roles.some(
    (r) =>
      r.role === role &&
      (chapterId === undefined || r.chapterId === null || r.chapterId === chapterId),
  );
}

const CHAPTER_LEAD_ACTIONS: Action[] = [
  "chapter.manage",
  "event.manage",
  "event.scan",
  "event.pulse",
  "applications.review",
  "analytics.view",
  "sponsorReport.view",
  "admin.access",
];

/** Whether `user` may perform `action`, optionally scoped to a chapter. */
export function can(
  user: AuthUser | null,
  action: Action,
  scope: { chapterId?: string } = {},
): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (CHAPTER_LEAD_ACTIONS.includes(action)) return hasRole(user, "chapter_lead", scope.chapterId);
  if (action === "group.moderate") {
    return (
      hasRole(user, "moderator", scope.chapterId) ||
      hasRole(user, "bubble_lead", scope.chapterId) ||
      hasRole(user, "chapter_lead", scope.chapterId)
    );
  }
  if (action === "provider.inbox") return user.ownsProvider;
  return false;
}

/** Whether `user` has `feature` through any active plan. Visitors and Community members have none. */
export function hasEntitlement(user: AuthUser | null, feature: Feature): boolean {
  if (!user) return false;
  return user.tiers.some((tier) => ENTITLEMENTS[tier].includes(feature));
}
