import "server-only";

import { randomBytes } from "node:crypto";

import { revalidateTag } from "next/cache";

import type { TicketStatus } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { actionEmail, sendEmail } from "@/lib/email";
import { getEnv } from "@/lib/env";

import {
  PAYMENT_WINDOW_MINUTES,
  decideRsvp,
  pickPromotions,
  placesLeft,
  reservationCutoff,
} from "./capacity";
import { takenWhere } from "./queries";

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["$transaction"]>[0]>[0];

/** Unguessable, single-purpose token printed in the QR code (never the ticket id). */
export function newQrToken() {
  return randomBytes(18).toString("base64url");
}

/** Serialises RSVPs per event: the row lock makes "count, then write" safe for the last place. */
async function lockEvent(tx: Tx, eventId: string) {
  await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${eventId} FOR UPDATE`;
}

/** Places held by everyone except one ticket (so a ticket never competes with itself). */
async function takenByOthers(tx: Tx, eventId: string, ticketId: string) {
  return tx.ticket.count({ where: { eventId, id: { not: ticketId }, ...takenWhere() } });
}

function holdExpired(ticket: { status: TicketStatus; updatedAt: Date }) {
  return ticket.status === "reserved" && ticket.updatedAt < reservationCutoff(new Date());
}

/**
 * Takes a place (or a waitlist spot) for one member. A cancelled ticket or an expired hold is
 * decided again from scratch; `staleSessionId` is a checkout session the caller must expire.
 */
export async function claimTicket(input: {
  eventId: string;
  ticketTypeId: string;
  userId: string;
  paid: boolean;
  capacity: number;
}) {
  return getDb().$transaction(async (tx) => {
    await lockEvent(tx, input.eventId);
    const existing = await tx.ticket.findUnique({
      where: { eventId_userId: { eventId: input.eventId, userId: input.userId } },
    });
    if (existing && existing.status !== "cancelled" && !holdExpired(existing)) {
      return { ticket: existing, staleSessionId: null };
    }
    const taken = existing
      ? await takenByOthers(tx, input.eventId, existing.id)
      : await tx.ticket.count({ where: { eventId: input.eventId, ...takenWhere() } });
    const status: TicketStatus = decideRsvp({ capacity: input.capacity, taken, paid: input.paid });
    const data = {
      status,
      ticketTypeId: input.ticketTypeId,
      qrToken: newQrToken(),
      stripeSessionId: null,
      paidAt: null,
    };
    const ticket = existing
      ? await tx.ticket.update({ where: { id: existing.id }, data })
      : await tx.ticket.create({ data: { ...data, eventId: input.eventId, userId: input.userId } });
    return { ticket, staleSessionId: existing?.stripeSessionId ?? null };
  });
}

/**
 * Renews a reserved ticket's hold before a new payment attempt, but only if a place is still free;
 * otherwise the member goes back to the waitlist (no overbooking after a lapsed hold).
 */
export async function renewHold(ticketId: string): Promise<boolean> {
  return getDb().$transaction(async (tx) => {
    const ticket = await tx.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      select: { eventId: true },
    });
    await lockEvent(tx, ticket.eventId);
    const event = await tx.event.findUniqueOrThrow({
      where: { id: ticket.eventId },
      select: { capacity: true },
    });
    const free = placesLeft(event.capacity, await takenByOthers(tx, ticket.eventId, ticketId)) > 0;
    await tx.ticket.update({
      where: { id: ticketId },
      data: free ? { updatedAt: new Date() } : { status: "waitlisted", stripeSessionId: null },
    });
    return free;
  });
}

export type PaidSession = { id: string; amountTotal: number | null; currency: string | null };

/**
 * Confirms a ticket from a paid Checkout session. Only the ticket's current session counts, the
 * amount and currency must match the ticket type, and a place must still be free (late BLIK or
 * Przelewy24 confirmations). Anything else is reported so the caller refunds the payment.
 */
export async function confirmPaidTicket(
  ticketId: string,
  session: PaidSession,
): Promise<"confirmed" | "duplicate" | "mismatch" | "full"> {
  const result = await getDb().$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { id: ticketId },
      include: {
        ticketType: { select: { priceMinor: true, currency: true } },
        event: { select: { capacity: true } },
      },
    });
    // Same session delivered twice (completed + async succeeded): already done, never refund it.
    if (ticket?.status === "confirmed" && ticket.stripeSessionId === session.id)
      return "duplicate" as const;
    if (!ticket || ticket.status !== "reserved" || ticket.stripeSessionId !== session.id)
      return "mismatch" as const;
    if (
      session.amountTotal !== ticket.ticketType.priceMinor ||
      session.currency?.toUpperCase() !== ticket.ticketType.currency.toUpperCase()
    ) {
      return "mismatch" as const;
    }
    await lockEvent(tx, ticket.eventId);
    if (
      placesLeft(ticket.event.capacity, await takenByOthers(tx, ticket.eventId, ticket.id)) === 0
    ) {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: { status: "waitlisted", stripeSessionId: null },
      });
      return "full" as const;
    }
    await tx.ticket.update({
      where: { id: ticket.id },
      data: { status: "confirmed", paidAt: new Date() },
    });
    return "confirmed" as const;
  });
  if (result === "confirmed") await sendTicketEmail(ticketId, "confirmed");
  return result;
}

/** A checkout session expired or failed: release the hold only if it was the ticket's current session. */
export async function releaseSession(ticketId: string, sessionId: string) {
  const db = getDb();
  const ticket = await db.ticket.findUnique({ where: { id: ticketId }, select: { eventId: true } });
  const { count } = await db.ticket.updateMany({
    where: { id: ticketId, status: "reserved", stripeSessionId: sessionId },
    data: { status: "cancelled", stripeSessionId: null },
  });
  if (count && ticket) await promoteWaitlist(ticket.eventId);
}

/** Moves the oldest waitlisted members up into freed places and emails them. */
export async function promoteWaitlist(eventId: string) {
  const promoted = await getDb().$transaction(async (tx) => {
    await lockEvent(tx, eventId);
    const event = await tx.event.findUniqueOrThrow({
      where: { id: eventId },
      select: { capacity: true },
    });
    const taken = await tx.ticket.count({ where: { eventId, ...takenWhere() } });
    const waitlist = await tx.ticket.findMany({
      where: { eventId, status: "waitlisted" },
      select: { id: true, createdAt: true, ticketType: { select: { priceMinor: true } } },
    });
    const chosen = pickPromotions(waitlist, placesLeft(event.capacity, taken));
    for (const ticket of chosen) {
      await tx.ticket.update({
        where: { id: ticket.id },
        data: { status: ticket.ticketType.priceMinor > 0 ? "reserved" : "confirmed" },
      });
    }
    return chosen.map((t) => t.id);
  });
  for (const id of promoted) await sendTicketEmail(id, "promoted");
  if (promoted.length) revalidateTag("events", "max");
  return promoted.length;
}

/** Confirmation, waitlist and promotion emails all point to the ticket page (QR code there). */
export async function sendTicketEmail(
  ticketId: string,
  reason: "confirmed" | "waitlisted" | "promoted",
) {
  const ticket = await getDb().ticket.findUnique({
    where: { id: ticketId },
    select: { status: true, user: { select: { email: true } }, event: { select: { title: true } } },
  });
  if (!ticket) return;
  const url = new URL(`/tickets/${ticketId}`, getEnv().APP_URL).toString();
  const reserved = ticket.status === "reserved";
  const copy = {
    confirmed: {
      subject: `Your ticket: ${ticket.event.title}`,
      body: "You have a place. Show the QR code on your ticket page at the door.",
      cta: "Open my ticket",
    },
    waitlisted: {
      subject: `Waitlist: ${ticket.event.title}`,
      body: "The session is full, so you are on the waitlist. We email you as soon as a place frees up.",
      cta: "View my waitlist spot",
    },
    promoted: {
      subject: `A place opened up: ${ticket.event.title}`,
      body: reserved
        ? `A place is now held for you. Complete the payment within ${PAYMENT_WINDOW_MINUTES} minutes to keep it.`
        : "Good news: you moved up from the waitlist and have a place.",
      cta: reserved ? "Pay and confirm" : "Open my ticket",
    },
  }[reason];
  const message = actionEmail({ heading: copy.subject, body: copy.body, cta: copy.cta, url });
  await sendEmail({ to: ticket.user.email, subject: copy.subject, ...message });
}
