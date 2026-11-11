import "server-only";

import { randomBytes } from "node:crypto";

import { revalidateTag } from "next/cache";

import type { TicketStatus } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { actionEmail, sendEmail } from "@/lib/email";
import { getEnv } from "@/lib/env";

import { decideRsvp, pickPromotions, placesLeft } from "./capacity";
import { takenWhere } from "./queries";

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["$transaction"]>[0]>[0];

/** Unguessable, single-purpose token printed in the QR code (never the ticket id). */
export function newQrToken() {
  return randomBytes(18).toString("base64url");
}

/** Serialises RSVPs per event: the row lock makes "count, then insert" safe for the last place. */
async function lockEvent(tx: Tx, eventId: string) {
  await tx.$queryRaw`SELECT id FROM "Event" WHERE id = ${eventId} FOR UPDATE`;
}

/** Takes a place (or a waitlist spot) for one member; re-uses their cancelled ticket if any. */
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
    if (existing && existing.status !== "cancelled") return existing;
    const taken = await tx.ticket.count({ where: { eventId: input.eventId, ...takenWhere() } });
    const status: TicketStatus = decideRsvp({ capacity: input.capacity, taken, paid: input.paid });
    const data = {
      status,
      ticketTypeId: input.ticketTypeId,
      qrToken: newQrToken(),
      stripeSessionId: null,
      paidAt: null,
    };
    return existing
      ? tx.ticket.update({ where: { id: existing.id }, data })
      : tx.ticket.create({ data: { ...data, eventId: input.eventId, userId: input.userId } });
  });
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
      body:
        ticket.status === "reserved"
          ? "A place is now held for you. Complete the payment within 30 minutes to keep it."
          : "Good news: you moved up from the waitlist and have a place.",
      cta: ticket.status === "reserved" ? "Pay and confirm" : "Open my ticket",
    },
  }[reason];
  const message = actionEmail({ heading: copy.subject, body: copy.body, cta: copy.cta, url });
  await sendEmail({ to: ticket.user.email, subject: copy.subject, ...message });
}
