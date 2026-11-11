/** What the scanner shows (pure, unit-tested). Names only on success or repeat: nothing for strangers. */
export type ScanResult =
  | { status: "ok"; name: string }
  | { status: "already"; name: string; at: string | null }
  | { status: "wrongEvent" }
  | { status: "notConfirmed" }
  | { status: "invalid" };

type ScannedTicket = {
  eventId: string;
  status: "confirmed" | "reserved" | "waitlisted" | "cancelled";
  user: { name: string };
  checkIn: { checkedInAt: Date } | null;
} | null;

export function classifyScan(ticket: ScannedTicket, eventId: string): ScanResult {
  if (!ticket) return { status: "invalid" };
  if (ticket.eventId !== eventId) return { status: "wrongEvent" };
  if (ticket.status !== "confirmed") return { status: "notConfirmed" };
  if (ticket.checkIn)
    return {
      status: "already",
      name: ticket.user.name,
      at: ticket.checkIn.checkedInAt.toISOString(),
    };
  return { status: "ok", name: ticket.user.name };
}

/** Scanner input from a QR code: our tokens are 24 base64url characters; anything else is rejected early. */
export function parseQrToken(raw: string): string | null {
  const value = raw.trim();
  return /^[A-Za-z0-9_-]{16,64}$/.test(value) ? value : null;
}
