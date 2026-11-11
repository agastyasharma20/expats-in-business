"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { ENTITLED_STATUSES, periodEnd } from "@/lib/billing/rules";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getStripe, paymentMethodsFor } from "@/lib/stripe";

import type { ActionState } from "./account";

/** Stripe customer for a user, created once and stored (needed for the billing portal). */
async function customerFor(userId: string) {
  const stripe = getStripe()!;
  const db = getDb();
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, name: true, stripeCustomerId: true },
  });
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await stripe.customers.create(
    { email: user.email, name: user.name, metadata: { userId } },
    { idempotencyKey: `customer-${userId}` },
  );
  await db.user.update({ where: { id: userId }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

/** Start a subscription. Amount and interval come from the Plan row, never from the form. */
export async function subscribe(_prev: ActionState, form: FormData): Promise<ActionState> {
  const code = z.string().min(1).max(40).safeParse(form.get("plan"));
  if (!code.success) return { ok: false, message: "default" };
  const user = await requireUser("/pricing");
  const db = getDb();
  const plan = await db.plan.findUnique({ where: { code: code.data } });
  if (!plan || !plan.isActive || !plan.interval || plan.amountMinor <= 0)
    return { ok: false, message: "default" };
  if (plan.contactOnly) redirect("/pricing/corporate");

  const stripe = getStripe();
  const appUrl = getEnv().APP_URL;
  if (!stripe) {
    if (!getEnv().DEMO_MODE) return { ok: false, message: "unavailable" };
    // Demo without Stripe keys: one active plan at a time, labelled as simulated on the billing page.
    await db.$transaction([
      db.subscription.updateMany({
        where: { userId: user.id, status: { in: [...ENTITLED_STATUSES] } },
        data: { status: "canceled" },
      }),
      db.subscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          status: "active",
          currentPeriodEnd: periodEnd(new Date(), plan.interval),
        },
      }),
    ]);
    revalidatePath("/", "layout");
    redirect("/settings/billing?status=simulated");
  }

  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      customer: await customerFor(user.id),
      allowed_payment_method_types: paymentMethodsFor(plan.currency).filter((m) => m === "card"),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: plan.currency.toLowerCase(),
            unit_amount: plan.amountMinor,
            recurring: { interval: plan.interval },
            product_data: { name: `Expats in Business ${plan.name}` },
          },
        },
      ],
      metadata: { userId: user.id, planId: plan.id },
      subscription_data: { metadata: { userId: user.id, planId: plan.id } },
      success_url: `${appUrl}/settings/billing?status=success`,
      cancel_url: `${appUrl}/pricing`,
    },
    { idempotencyKey: `subscribe-${user.id}-${plan.id}-${Math.floor(Date.now() / 60_000)}` },
  );
  redirect(session.url!);
}

/** Stripe billing portal (cards, invoices, cancel), or the simulated controls in demo mode. */
export async function openBillingPortal(): Promise<ActionState> {
  const user = await requireUser("/settings/billing");
  const stripe = getStripe();
  if (!stripe) return { ok: false, message: "unavailable" };
  const portal = await stripe.billingPortal.sessions.create({
    customer: await customerFor(user.id),
    return_url: `${getEnv().APP_URL}/settings/billing`,
  });
  redirect(portal.url);
}

/** Cancel at period end, or undo that. Stripe is updated first when the plan is a real subscription. */
export async function setCancelAtPeriodEnd(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser("/settings/billing");
  const cancel = form.get("cancel") === "true";
  const db = getDb();
  const sub = await db.subscription.findFirst({
    where: { userId: user.id, status: { in: [...ENTITLED_STATUSES] } },
    orderBy: { createdAt: "desc" },
  });
  if (!sub) return { ok: false };
  if (sub.stripeSubscriptionId) {
    const stripe = getStripe();
    if (!stripe) return { ok: false, message: "unavailable" };
    await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: cancel });
  }
  await db.subscription.update({ where: { id: sub.id }, data: { cancelAtPeriodEnd: cancel } });
  revalidatePath("/settings/billing");
  return { ok: true, message: cancel ? "cancelled" : "resumed" };
}
