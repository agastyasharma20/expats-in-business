import "server-only";

import { randomBytes } from "node:crypto";

import { revalidateTag } from "next/cache";

import type { TicketStatus } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";

import { decideRsvp, pickPromotions, placesLeft, reservationCutoff } from "./capacity";
import { takenWhere } from "./queries";

import { sendTicketEmail } from "./ticket-followups";

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["$transaction"]>[0]>[0];

/** Unguessable, single-purpose token printed in the QR code (never the ticket id). */
export function newQrToken() {
  return randomBytes(18).toString("base64url");
}

/** Serialises RSVPs per event: the row lock makes "count, then write" safe for the last place. */
async function lockEvent(tx: Tx, eventId: string) {
  await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${eventId} FOR UPDATE`;
}

/** Transactions fail fast instead of hanging: a stuck lock becomes an error the member can retry. */
function inTransaction<T>(run: (tx: Tx) => Promise<T>): Promise<T> {
  return getDb().$transaction(run, { maxWait: 5_000, timeout: 10_000 });
}

/** Places held (sum of party sizes), optionally in one tier and excluding one ticket. */
async function placesTaken(
  tx: Tx,
  eventId: string,
  options: { exceptTicketId?: string; ticketTypeId?: string } = {},
) {
  const result = await tx.ticket.aggregate({
    _sum: { quantity: true },
    where: {
      eventId,
      ...(options.exceptTicketId ? { id: { not: options.exceptTicketId } } : {}),
      ...(options.ticketTypeId ? { ticketTypeId: options.ticketTypeId } : {}),
      ...takenWhere(),
    },
  });
  return result._sum.quantity ?? 0;
}

/** Whether a party of `quantity` fits the event and its tier right now (caller holds the lock). */
async function fits(
  tx: Tx,
  ticket: { id?: string; eventId: string; ticketTypeId: string; quantity: number },
) {
  // One query at a time: a transaction holds a single connection, and the pg driver must not be
  // asked to run two queries on it at once (that stalled reservations under load, finding F2).
  const event = await tx.event.findUniqueOrThrow({
    where: { id: ticket.eventId },
    select: { capacity: true },
  });
  const tier = await tx.ticketType.findUniqueOrThrow({
    where: { id: ticket.ticketTypeId },
    select: { capacity: true },
  });
  const taken = await placesTaken(tx, ticket.eventId, { exceptTicketId: ticket.id });
  const tierTaken = await placesTaken(tx, ticket.eventId, {
    exceptTicketId: ticket.id,
    ticketTypeId: ticket.ticketTypeId,
  });
  return (
    decideRsvp({
      capacity: event.capacity,
      taken,
      paid: false,
      quantity: ticket.quantity,
      tierCapacity: tier.capacity,
      tierTaken,
    }) !== "waitlisted"
  );
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
  /** Party size, already validated against the event's maxPerOrder. */
  quantity?: number;
  tierCapacity?: number | null;
}) {
  const quantity = input.quantity ?? 1;
  return inTransaction(async (tx) => {
    await lockEvent(tx, input.eventId);
    const existing = await tx.ticket.findUnique({
      where: { eventId_userId: { eventId: input.eventId, userId: input.userId } },
    });
    if (existing && existing.status !== "cancelled" && !holdExpired(existing)) {
      return { ticket: existing, staleSessionId: null };
    }
    const except = { exceptTicketId: existing?.id };
    const taken = await placesTaken(tx, input.eventId, except);
    const tierTaken = await placesTaken(tx, input.eventId, {
      ...except,
      ticketTypeId: input.ticketTypeId,
    });
    const status: TicketStatus = decideRsvp({
      capacity: input.capacity,
      taken,
      paid: input.paid,
      quantity,
      tierCapacity: input.tierCapacity,
      tierTaken,
    });
    const data = {
      status,
      quantity,
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
  return inTransaction(async (tx) => {
    const ticket = await tx.ticket.findUniqueOrThrow({
      where: { id: ticketId },
      select: { id: true, eventId: true, ticketTypeId: true, quantity: true },
    });
    await lockEvent(tx, ticket.eventId);
    const free = await fits(tx, ticket);
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
  const result = await inTransaction(async (tx) => {
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
    // The paid total must be exactly tier price x party size, in the tier's currency.
    if (
      session.amountTotal !== ticket.ticketType.priceMinor * ticket.quantity ||
      session.currency?.toUpperCase() !== ticket.ticketType.currency.toUpperCase()
    ) {
      return "mismatch" as const;
    }
    await lockEvent(tx, ticket.eventId);
    if (!(await fits(tx, ticket))) {
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

/** Moves the oldest waitlisted members up into freed places and emails them. */
export async function promoteWaitlist(eventId: string) {
  const promoted = await inTransaction(async (tx) => {
    await lockEvent(tx, eventId);
    const event = await tx.event.findUniqueOrThrow({
      where: { id: eventId },
      select: { capacity: true },
    });
    const taken = await placesTaken(tx, eventId);
    const waitlist = await tx.ticket.findMany({
      where: { eventId, status: "waitlisted" },
      select: {
        id: true,
        eventId: true,
        ticketTypeId: true,
        quantity: true,
        createdAt: true,
        ticketType: { select: { priceMinor: true } },
      },
    });
    const candidates = pickPromotions(waitlist, placesLeft(event.capacity, taken));
    const chosen: typeof candidates = [];
    // Tier caps are re-checked one by one, so promotions never overfill a sold-out tier.
    for (const ticket of candidates) {
      if (!(await fits(tx, ticket))) continue;
      chosen.push(ticket);
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
