import "server-only";

import { getDb } from "@/lib/db";
import { actionEmail, sendEmail } from "@/lib/email";
import { getEnv } from "@/lib/env";
import { emailTranslator, localizedUrl } from "@/lib/i18n/email";
import { PAYMENT_WINDOW_MINUTES } from "./capacity";
import { promoteWaitlist } from "./tickets";

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

/** Confirmation, waitlist and promotion emails all point to the ticket page (QR code there). */
export async function sendTicketEmail(
  ticketId: string,
  reason: "confirmed" | "waitlisted" | "promoted",
) {
  const ticket = await getDb().ticket.findUnique({
    where: { id: ticketId },
    select: {
      status: true,
      user: { select: { email: true, locale: true } },
      event: { select: { title: true } },
    },
  });
  if (!ticket) return;
  // The member's own language (Settings, Account); English when none is saved.
  const { locale, t } = emailTranslator(ticket.user.locale);
  const url = localizedUrl(`/tickets/${ticketId}`, locale, getEnv().APP_URL);
  const key =
    reason === "promoted"
      ? ticket.status === "reserved"
        ? "promotedReserved"
        : "promotedConfirmed"
      : reason;
  const event = ticket.event.title;
  const subject = t(`ticket.${key}.subject`, { event });
  const message = actionEmail({
    heading: subject,
    body: t(`ticket.${key}.body`, { minutes: PAYMENT_WINDOW_MINUTES }),
    cta: t(`ticket.${key}.cta`),
    url,
  });
  await sendEmail({ to: ticket.user.email, subject, ...message });
}
