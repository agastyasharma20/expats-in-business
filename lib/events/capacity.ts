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

/** Free events confirm straight away; paid ones hold a place while the member pays. */
export function decideRsvp(input: {
  capacity: number;
  taken: number;
  paid: boolean;
}): RsvpDecision {
  if (placesLeft(input.capacity, input.taken) === 0) return "waitlisted";
  return input.paid ? "reserved" : "confirmed";
}

/** Reserved tickets older than the payment window no longer hold a place. */
export function reservationCutoff(now: Date): Date {
  return new Date(now.getTime() - PAYMENT_WINDOW_MINUTES * 60_000);
}

/**
 * Who moves up when places free: the oldest waitlisted tickets, as many as there are places.
 * Promotion of a paid ticket reserves the place and asks the member to pay.
 */
export function pickPromotions<T extends { createdAt: Date }>(
  waitlist: T[],
  freePlaces: number,
): T[] {
  return [...waitlist]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .slice(0, Math.max(freePlaces, 0));
}
