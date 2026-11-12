import "server-only";

import { getDb } from "@/lib/db";

import { classifyScan, type ScanResult } from "./checkin-rules";

/**
 * Checks a ticket in by QR token (scanner) or ticket id (manual search). The CheckIn row is unique
 * per ticket, so a token works once even if two scanners read it at the same moment.
 */
export async function checkIn(input: {
  eventId: string;
  token?: string;
  ticketId?: string;
  scannerId: string;
}): Promise<ScanResult> {
  const db = getDb();
  const where = input.token
    ? { qrToken: input.token }
    : input.ticketId
      ? { id: input.ticketId }
      : null;
  if (!where) return { status: "invalid" };
  const ticket = await db.ticket.findUnique({
    where,
    select: {
      id: true,
      eventId: true,
      userId: true,
      status: true,
      quantity: true,
      user: { select: { name: true } },
      checkIn: { select: { checkedInAt: true } },
    },
  });
  const classified = classifyScan(ticket, input.eventId);
  // Group tickets: door staff see how many people this one QR code admits.
  const verdict =
    ticket && ticket.quantity > 1 && "name" in classified && classified.name
      ? { ...classified, name: `${classified.name} (×${ticket.quantity})` }
      : classified;
  if (verdict.status !== "ok" || !ticket) return verdict;
  try {
    await db.checkIn.create({
      data: {
        ticketId: ticket.id,
        eventId: ticket.eventId,
        userId: ticket.userId,
        scannedById: input.scannerId,
        method: input.token ? "qr" : "manual",
      },
    });
    return verdict;
  } catch {
    const existing = await db.checkIn.findUnique({ where: { ticketId: ticket.id } });
    return {
      status: "already",
      name: ticket.user.name,
      at: existing?.checkedInAt.toISOString() ?? null,
    };
  }
}

/** Live numbers for the Pulse screen. Origins are only shown for groups of 5 or more (privacy). */
export async function pulseSnapshot(eventId: string) {
  const db = getDb();
  const since = new Date(Date.now() - 10 * 60_000);
  const [event, confirmed, checkedIn, lastTen, origins] = await Promise.all([
    db.event.findUnique({ where: { id: eventId }, select: { capacity: true, title: true } }),
    db.ticket.count({ where: { eventId, status: "confirmed" } }),
    db.checkIn.count({ where: { eventId } }),
    db.checkIn.count({ where: { eventId, checkedInAt: { gte: since } } }),
    db.$queryRaw<{ code: string; count: bigint }[]>`
      SELECT p."originCountryCode" AS code, COUNT(*) AS count
      FROM "CheckIn" c JOIN "Profile" p ON p."userId" = c."userId"
      WHERE c."eventId" = ${eventId} AND p."originCountryCode" IS NOT NULL AND p."showOrigin" = true AND p."isPublic" = true
      GROUP BY p."originCountryCode" HAVING COUNT(*) >= 5 ORDER BY count DESC LIMIT 6`,
  ]);
  return {
    title: event?.title ?? "",
    capacity: event?.capacity ?? 0,
    confirmed,
    checkedIn,
    lastTenMinutes: lastTen,
    origins: origins.map((o) => ({ code: o.code, count: Number(o.count) })),
    at: new Date().toISOString(),
  };
}

export type PulseSnapshot = Awaited<ReturnType<typeof pulseSnapshot>>;
