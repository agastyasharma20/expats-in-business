/**
 * Capacity rules for RSVPs (pure, unit-tested). A place is taken by a confirmed ticket or by a
 * reserved one still inside its payment window; everything else waits in line, first come first served.
 */
/** How long a reserved place is held. Longer than a checkout session, so a hold outlives its payment. */
export const PAYMENT_WINDOW_MINUTES = 35;
/** Stripe Checkout session lifetime (Stripe requires at least 30 minutes). */
export const CHECKOUT_SESSION_MINUTES = 31;

export type RsvpDecision = "confirmed" | "reserved" | "waitlisted";

export function placesLeft(capacity: number, taken: number): number {
  return Math.max(capacity - taken, 0);
}

/**
 * Free events confirm straight away; paid ones hold a place while the member pays. A party of
 * `quantity` needs that many places in the event and, if the tier has its own cap, in the tier.
 */
export function decideRsvp(input: {
  capacity: number;
  taken: number;
  paid: boolean;
  quantity?: number;
  tierCapacity?: number | null;
  tierTaken?: number;
}): RsvpDecision {
  const quantity = input.quantity ?? 1;
  if (placesLeft(input.capacity, input.taken) < quantity) return "waitlisted";
  if (input.tierCapacity && placesLeft(input.tierCapacity, input.tierTaken ?? 0) < quantity) {
    return "waitlisted";
  }
  return input.paid ? "reserved" : "confirmed";
}

/** Reserved tickets older than the payment window no longer hold a place. */
export function reservationCutoff(now: Date): Date {
  return new Date(now.getTime() - PAYMENT_WINDOW_MINUTES * 60_000);
}

/**
 * Who moves up when places free: oldest first, each party only if it fits whole (a family of four
 * is never split); a smaller party behind it may take places it cannot use. Promotion of a paid
 * ticket reserves the place and asks the member to pay.
 */
export function pickPromotions<T extends { createdAt: Date; quantity?: number }>(
  waitlist: T[],
  freePlaces: number,
): T[] {
  let left = Math.max(freePlaces, 0);
  const chosen: T[] = [];
  for (const ticket of [...waitlist].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  )) {
    const size = ticket.quantity ?? 1;
    if (size <= left) {
      chosen.push(ticket);
      left -= size;
    }
    if (!left) break;
  }
  return chosen;
}
