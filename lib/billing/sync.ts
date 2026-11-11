import "server-only";

import type Stripe from "stripe";

import { getDb } from "@/lib/db";

import { ENTITLED_STATUSES, mapStripeStatus } from "./rules";

/**
 * Mirrors a Stripe subscription into our table (keyed by its Stripe id). Our ids travel in the
 * subscription metadata, set at checkout, so no lookup by email is ever needed.
 */
export async function syncSubscription(sub: Stripe.Subscription) {
  const userId = sub.metadata.userId;
  const planId = sub.metadata.planId;
  if (!userId || !planId) return;
  const status = mapStripeStatus(sub.status);
  const periodEndSeconds = sub.items.data[0]?.current_period_end;
  const data = {
    status,
    planId,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    currentPeriodEnd: periodEndSeconds ? new Date(periodEndSeconds * 1000) : null,
  };
  const db = getDb();
  await db.$transaction(async (tx) => {
    const saved = await tx.subscription.upsert({
      where: { stripeSubscriptionId: sub.id },
      update: data,
      create: { ...data, userId, stripeSubscriptionId: sub.id },
    });
    // One paid plan at a time: a new active subscription ends any older one in our records.
    if (status !== "canceled") {
      await tx.subscription.updateMany({
        where: { userId, id: { not: saved.id }, status: { in: [...ENTITLED_STATUSES] } },
        data: { status: "canceled" },
      });
    }
  });
}
