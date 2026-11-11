"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { CHECKOUT_SESSION_MINUTES } from "@/lib/events/capacity";
import { claimTicket, promoteWaitlist, renewHold, sendTicketEmail } from "@/lib/events/tickets";
import { rateLimit } from "@/lib/rate-limit";
import { getStripe, paymentMethodsFor } from "@/lib/stripe";

import type { ActionState } from "./account";

const rsvpSchema = z.object({ eventId: z.string().min(1), ticketTypeId: z.string().min(1) });

/** Closes a checkout session that must no longer be paid (cancelled ticket, replaced session). */
async function expireSession(sessionId: string | null) {
  const stripe = getStripe();
  if (!stripe || !sessionId) return;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status === "open") await stripe.checkout.sessions.expire(sessionId);
  } catch {
    // already expired or unknown: nothing to close
  }
}

/**
 * Sends the member to pay for a reserved ticket. The amount comes from the database; an open
 * session is reused (double clicks, back button), and only the ticket's current session can confirm it.
 */
async function startCheckout(ticketId: string): Promise<string> {
  const db = getDb();
  const ticket = await db.ticket.findUniqueOrThrow({
    where: { id: ticketId },
    include: {
      ticketType: true,
      event: { select: { slug: true, title: true } },
      user: { select: { email: true } },
    },
  });
  const appUrl = getEnv().APP_URL;
  const stripe = getStripe();
  if (!stripe) {
    // No Stripe keys: demo mode simulates a successful test payment (labelled on the ticket page).
    if (!getEnv().DEMO_MODE) throw new Error("payments-unavailable");
    await db.ticket.update({
      where: { id: ticketId },
      data: { status: "confirmed", paidAt: new Date() },
    });
    await sendTicketEmail(ticketId, "confirmed");
    return `/tickets/${ticketId}?payment=simulated`;
  }
  if (ticket.stripeSessionId) {
    const current = await stripe.checkout.sessions
      .retrieve(ticket.stripeSessionId)
      .catch(() => null);
    if (current?.status === "open" && current.url) return current.url;
  }
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: ticket.user.email,
      allowed_payment_method_types: paymentMethodsFor(ticket.ticketType.currency),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: ticket.ticketType.currency.toLowerCase(),
            unit_amount: ticket.ticketType.priceMinor,
            product_data: { name: `${ticket.event.title}: ${ticket.ticketType.name}` },
          },
        },
      ],
      metadata: { ticketId },
      payment_intent_data: { metadata: { ticketId } },
      client_reference_id: ticketId,
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_SESSION_MINUTES * 60,
      success_url: `${appUrl}/tickets/${ticketId}?payment=success`,
      cancel_url: `${appUrl}/events/${ticket.event.slug}?payment=cancelled`,
    },
    { idempotencyKey: `checkout-${ticketId}-${randomBytes(8).toString("hex")}` },
  );
  await db.ticket.update({ where: { id: ticketId }, data: { stripeSessionId: session.id } });
  return session.url!;
}

/** RSVP: confirm (free), reserve and pay (paid), or join the waitlist when full. */
export async function rsvp(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = rsvpSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "invalid" };
  const db = getDb();
  const event = await db.event.findUnique({
    where: { id: parsed.data.eventId },
    select: {
      slug: true,
      status: true,
      startsAt: true,
      capacity: true,
      ticketTypes: { where: { id: parsed.data.ticketTypeId } },
    },
  });
  const ticketType = event?.ticketTypes[0];
  if (!event || !ticketType || event.status !== "published" || event.startsAt < new Date())
    return { ok: false, message: "closed" };
  const user = await requireUser(`/events/${event.slug}`);
  if (!(await rateLimit(`rsvp:${user.id}`, 20, 3600)).ok)
    return { ok: false, message: "rateLimited" };

  const { ticket, staleSessionId } = await claimTicket({
    eventId: parsed.data.eventId,
    ticketTypeId: ticketType.id,
    userId: user.id,
    paid: ticketType.priceMinor > 0,
    capacity: event.capacity,
  });
  await expireSession(staleSessionId);
  revalidateTag("events", "max");
  revalidatePath(`/events/${event.slug}`);
  if (ticket.status === "waitlisted") {
    await sendTicketEmail(ticket.id, "waitlisted");
    return { ok: true, message: "waitlisted" };
  }
  if (ticket.status === "reserved") redirect(await startCheckout(ticket.id));
  await sendTicketEmail(ticket.id, "confirmed");
  redirect(`/tickets/${ticket.id}`);
}

/** Pay for a reserved ticket (after a waitlist promotion or an abandoned checkout). */
export async function payTicket(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const ticket = await getDb().ticket.findFirst({
    where: { id: String(form.get("ticketId")), userId: user.id, status: "reserved" },
    select: { id: true, event: { select: { slug: true } } },
  });
  if (!ticket) return { ok: false, message: "invalid" };
  // Only renew the hold if a place is still free; otherwise back to the waitlist.
  if (!(await renewHold(ticket.id))) {
    revalidatePath(`/tickets/${ticket.id}`);
    revalidateTag("events", "max");
    return { ok: false, message: "full" };
  }
  redirect(await startCheckout(ticket.id));
}

/** Cancel a place or waitlist spot; the next person in line moves up straight away. */
export async function cancelTicket(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const ticket = await getDb().ticket.findFirst({
    where: { id: String(form.get("ticketId")), userId: user.id, status: { not: "cancelled" } },
    include: { event: { select: { slug: true, startsAt: true } } },
  });
  if (!ticket || ticket.event.startsAt < new Date()) return { ok: false, message: "invalid" };
  await getDb().ticket.update({
    where: { id: ticket.id },
    data: { status: "cancelled", stripeSessionId: null },
  });
  // An unpaid open session must not be payable any more.
  if (!ticket.paidAt) await expireSession(ticket.stripeSessionId);
  await promoteWaitlist(ticket.eventId);
  revalidateTag("events", "max");
  revalidatePath(`/events/${ticket.event.slug}`);
  revalidatePath(`/tickets/${ticket.id}`);
  return { ok: true, message: ticket.paidAt ? "cancelledPaid" : "cancelled" };
}
