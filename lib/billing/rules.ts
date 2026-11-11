/** Subscription rules (pure, unit-tested). */
export type Interval = "month" | "year";

export type PlanLike = { tier: string; interval: Interval | null; contactOnly: boolean };

/** Statuses that grant a plan's entitlements. past_due keeps access while Stripe retries the card. */
export const ENTITLED_STATUSES = ["active", "trialing", "past_due"] as const;

/** End of a billing period that starts at `from` (calendar months, clamped to the month's last day). */
export function periodEnd(from: Date, interval: Interval): Date {
  const end = new Date(from);
  const day = end.getUTCDate();
  end.setUTCDate(1);
  if (interval === "year") end.setUTCFullYear(end.getUTCFullYear() + 1);
  else end.setUTCMonth(end.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, lastDay));
  return end;
}

/** Plans shown for a billing period: free and contact-only plans always; paid plans in that period. */
export function plansForInterval<T extends PlanLike>(plans: T[], interval: Interval): T[] {
  return plans.filter(
    (plan) => plan.interval === null || plan.contactOnly || plan.interval === interval,
  );
}

/** Months of the monthly price you save by paying yearly (e.g. 190 vs 19 × 12 → 2). */
export function monthsSaved(monthlyMinor: number, yearlyMinor: number): number {
  if (monthlyMinor <= 0) return 0;
  return Math.max(Math.round((monthlyMinor * 12 - yearlyMinor) / monthlyMinor), 0);
}

/** Maps a Stripe subscription status onto ours (unknown or incomplete → canceled: no access). */
export function mapStripeStatus(status: string): "active" | "trialing" | "past_due" | "canceled" {
  if (status === "active" || status === "trialing" || status === "past_due") return status;
  if (status === "unpaid") return "past_due";
  return "canceled";
}
