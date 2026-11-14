import { revalidatePath, revalidateTag } from "next/cache";
import type Stripe from "stripe";

import { syncSubscription } from "@/lib/billing/sync";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { confirmPaidTicket } from "@/lib/events/tickets";
import { getStripe } from "@/lib/stripe";
import { releaseSession } from "@/lib/events/ticket-followups";

/** Refunds a payment that cannot become a ticket (stale session, wrong amount, session full). */
async function refund(stripe: Stripe, session: Stripe.Checkout.Session, reason: string) {
  const intent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (!intent) return;
  await stripe.refunds.create(
    { payment_intent: intent, reason: "requested_by_customer", metadata: { eib_reason: reason } },
    { idempotencyKey: `refund-${intent}` },
  );
}

async function handle(stripe: Stripe, event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      const ticketId = session.metadata?.ticketId;
      if (ticketId && session.mode === "payment" && session.payment_status === "paid") {
        const result = await confirmPaidTicket(ticketId, {
          id: session.id,
          amountTotal: session.amount_total,
          currency: session.currency,
        });
        if (result === "mismatch" || result === "full") await refund(stripe, session, result);
      }
      if (session.mode === "subscription" && typeof session.subscription === "string") {
        await syncSubscription(await stripe.subscriptions.retrieve(session.subscription));
      }
      return;
    }
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed": {
      const session = event.data.object;
      if (session.metadata?.ticketId) await releaseSession(session.metadata.ticketId, session.id);
      return;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      return;
    default:
      return;
  }
}

/**
 * Stripe webhook: signature verified; each event handled once (StripeEvent). The marker is removed
 * again if handling fails, so Stripe's retry gets another chance instead of being dropped.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = getEnv().STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!stripe || !secret) return Response.json({ error: "stripe-not-configured" }, { status: 503 });
  if (!signature) return Response.json({ error: "missing-signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return Response.json({ error: "invalid-signature" }, { status: 400 });
  }

  const db = getDb();
  try {
    await db.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch {
    return Response.json({ received: true, duplicate: true });
  }
  try {
    await handle(stripe, event);
  } catch (error) {
    await db.stripeEvent.delete({ where: { id: event.id } }).catch(() => undefined);
    console.error("[stripe] webhook handling failed, Stripe will retry:", event.type, error);
    return Response.json({ error: "handler-failed" }, { status: 500 });
  }
  revalidateTag("events", "max");
  revalidatePath("/", "layout");
  return Response.json({ received: true });
}
