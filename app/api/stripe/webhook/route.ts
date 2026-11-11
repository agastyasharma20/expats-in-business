import { revalidatePath, revalidateTag } from "next/cache";

import { syncSubscription } from "@/lib/billing/sync";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { promoteWaitlist, sendTicketEmail } from "@/lib/events/tickets";
import { getStripe } from "@/lib/stripe";

/**
 * Stripe webhook: signature verified, each event handled once (StripeEvent table), and status
 * changes are conditional (reserved → confirmed/cancelled), so retries and replays are harmless.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = getEnv().STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!stripe || !secret) return Response.json({ error: "stripe-not-configured" }, { status: 503 });
  if (!signature) return Response.json({ error: "missing-signature" }, { status: 400 });

  let event;
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

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object;
    const ticketId = session.metadata?.ticketId;
    if (ticketId && session.payment_status === "paid") {
      const { count } = await db.ticket.updateMany({
        where: { id: ticketId, status: "reserved" },
        data: { status: "confirmed", paidAt: new Date(), stripeSessionId: session.id },
      });
      if (count) await sendTicketEmail(ticketId, "confirmed");
    }
    if (session.mode === "subscription" && typeof session.subscription === "string") {
      await syncSubscription(await stripe.subscriptions.retrieve(session.subscription));
    }
  } else if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    await syncSubscription(event.data.object);
  } else if (
    event.type === "checkout.session.expired" ||
    event.type === "checkout.session.async_payment_failed"
  ) {
    const ticketId = event.data.object.metadata?.ticketId;
    if (ticketId) {
      const ticket = await db.ticket.findUnique({
        where: { id: ticketId },
        select: { eventId: true },
      });
      const { count } = await db.ticket.updateMany({
        where: { id: ticketId, status: "reserved" },
        data: { status: "cancelled" },
      });
      if (count && ticket) await promoteWaitlist(ticket.eventId);
    }
  }
  revalidateTag("events", "max");
  revalidatePath("/", "layout");
  return Response.json({ received: true });
}
