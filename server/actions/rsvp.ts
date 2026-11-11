"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { PAYMENT_WINDOW_MINUTES } from "@/lib/events/capacity";
import { claimTicket, promoteWaitlist, sendTicketEmail } from "@/lib/events/tickets";
import { rateLimit } from "@/lib/rate-limit";
import { getStripe, paymentMethodsFor } from "@/lib/stripe";

import type { ActionState } from "./account";

const rsvpSchema = z.object({ eventId: z.string().min(1), ticketTypeId: z.string().min(1) });

/** Sends the member to pay for a reserved ticket. The amount always comes from the database. */
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
      client_reference_id: ticketId,
      expires_at: Math.floor(Date.now() / 1000) + PAYMENT_WINDOW_MINUTES * 60,
      success_url: `${appUrl}/tickets/${ticketId}?payment=success`,
      cancel_url: `${appUrl}/events/${ticket.event.slug}?payment=cancelled`,
    },
    // One session per reservation, even if the button is pressed twice.
    { idempotencyKey: `checkout-${ticketId}-${ticket.updatedAt.getTime()}` },
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

  const ticket = await claimTicket({
    eventId: parsed.data.eventId,
    ticketTypeId: ticketType.id,
    userId: user.id,
    paid: ticketType.priceMinor > 0,
    capacity: event.capacity,
  });
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
  });
  if (!ticket) return { ok: false, message: "invalid" };
  // Refresh the hold so the payment window starts now.
  await getDb().ticket.update({ where: { id: ticket.id }, data: { updatedAt: new Date() } });
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
  await getDb().ticket.update({ where: { id: ticket.id }, data: { status: "cancelled" } });
  await promoteWaitlist(ticket.eventId);
  revalidateTag("events", "max");
  revalidatePath(`/events/${ticket.event.slug}`);
  revalidatePath(`/tickets/${ticket.id}`);
  return { ok: true, message: ticket.paidAt ? "cancelledPaid" : "cancelled" };
}
