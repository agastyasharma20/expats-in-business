import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import QRCode from "qrcode";

import { ActionForm } from "@/components/common/action-form";
import { ExternalLink } from "@/components/common/external-link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/session";
import { colorTokens } from "@/lib/design/tokens";
import { getDb } from "@/lib/db";
import { Link } from "@/lib/i18n/navigation";
import { formatInZone } from "@/lib/time";
import { cancelTicket, payTicket } from "@/server/actions/rsvp";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

type Props = PageProps<"/[locale]/tickets/[id]">;

export const metadata: Metadata = { robots: { index: false } };

const STATUS_VARIANT = {
  confirmed: "verified",
  reserved: "unconfirmed",
  waitlisted: "secondary",
  cancelled: "outline",
} as const;

async function TicketView({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/tickets/${id}`);
  // Only the ticket's owner can see it (the QR token is a credential).
  const ticket = await getDb().ticket.findFirst({
    where: { id, userId: user.id },
    include: {
      checkIn: { select: { checkedInAt: true } },
      ticketType: { select: { name: true } },
      event: {
        select: {
          slug: true,
          title: true,
          startsAt: true,
          endsAt: true,
          onlineUrl: true,
          venue: { select: { name: true, address: true } },
          chapter: { select: { timezone: true } },
        },
      },
    },
  });
  if (!ticket) notFound();
  const [t, e, locale] = await Promise.all([
    getTranslations("ticket"),
    getTranslations("events"),
    getLocale(),
  ]);
  const zone = ticket.event.chapter.timezone;
  const upcoming = ticket.event.endsAt > new Date();
  const qr =
    ticket.status === "confirmed"
      ? await QRCode.toString(ticket.qrToken, {
          type: "svg",
          errorCorrectionLevel: "M",
          margin: 1,
          color: { dark: colorTokens["brand-950"], light: colorTokens.surface },
        })
      : null;

  return (
    <article className="flex flex-col gap-6" data-testid="ticket">
      <header className="flex flex-col items-start gap-2">
        <Badge variant={STATUS_VARIANT[ticket.status]}>{t(`status.${ticket.status}`)}</Badge>
        <h1 className="text-h1">{ticket.event.title}</h1>
        <p className="text-muted-foreground">
          {formatInZone(ticket.event.startsAt, zone, locale, {
            dateStyle: "full",
            timeStyle: "short",
          })}
          {ticket.event.venue ? ` · ${ticket.event.venue.name}` : ` · ${e("online")}`}
        </p>
      </header>

      {query.payment === "simulated" ? (
        <p
          role="status"
          className="rounded-lg border border-warning/40 bg-warning-50 p-4 text-warning"
        >
          {t("simulated")}
        </p>
      ) : null}
      {query.payment === "success" && ticket.status === "confirmed" ? (
        <p
          role="status"
          className="rounded-lg border border-success/40 bg-success-50 p-4 text-success"
        >
          {t("paid")}
        </p>
      ) : null}

      {qr ? (
        <figure className="flex flex-col items-center gap-3 self-center rounded-2xl border border-line bg-surface p-6 shadow-card">
          {/* SVG generated on the server from our own token: no user input inside. */}
          <div
            role="img"
            aria-label={t("qrLabel", { event: ticket.event.title })}
            className="size-60 [&_svg]:size-full"
            dangerouslySetInnerHTML={{ __html: qr }}
          />
          <figcaption className="text-center text-small text-muted-foreground">
            {ticket.checkIn
              ? t("checkedIn", {
                  time: formatInZone(ticket.checkIn.checkedInAt, zone, locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                })
              : t("qrHelp")}
          </figcaption>
        </figure>
      ) : (
        <p className="rounded-lg border border-line bg-surface p-4">
          {
            {
              waitlisted: t("waitlistHelp"),
              reserved: t("reservedHelp"),
              cancelled: ticket.paidAt ? t("cancelledPaid") : t("cancelledHelp"),
              confirmed: "",
            }[ticket.status]
          }
        </p>
      )}

      {ticket.paidAt && ticket.status === "confirmed" ? (
        <p className="text-small text-muted-foreground">
          {t("paidOn", {
            date: formatInZone(ticket.paidAt, zone, locale, { dateStyle: "medium" }),
          })}{" "}
          · {ticket.ticketType.name}
        </p>
      ) : null}
      {ticket.status === "confirmed" && ticket.event.onlineUrl && upcoming ? (
        <p>
          <ExternalLink href={ticket.event.onlineUrl}>{t("online")}</ExternalLink>
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {ticket.status === "reserved" && upcoming ? (
          <ActionForm
            action={payTicket}
            submitLabel={e("pay")}
            pendingLabel={e("processing")}
            errorTexts={{ default: e("errors.default"), full: e("errors.full") }}
          >
            <input type="hidden" name="ticketId" value={ticket.id} />
          </ActionForm>
        ) : null}
        {ticket.checkIn ? (
          <Link href={`/met/${ticket.event.slug}`} className={buttonVariants()}>
            {t("whoIMet")}
          </Link>
        ) : null}
        <Link
          href={`/events/${ticket.event.slug}`}
          className={buttonVariants({ variant: "outline" })}
        >
          {t("event")}
        </Link>
        {ticket.status !== "cancelled" && upcoming && !ticket.checkIn ? (
          <ActionForm
            action={cancelTicket}
            submitLabel={ticket.status === "waitlisted" ? t("cancelWaitlist") : t("cancel")}
            pendingLabel={e("processing")}
            successText={t("cancelled")}
            errorTexts={{ default: e("errors.default") }}
            submitVariant="ghost"
            testId="cancel-ticket"
          >
            <input type="hidden" name="ticketId" value={ticket.id} />
          </ActionForm>
        ) : null}
      </div>
    </article>
  );
}

export default function TicketPage(props: Props) {
  return (
    <div className="container-page max-w-2xl py-12">
      <Suspense fallback={<Skeleton className="h-[30rem] w-full" />}>
        <TicketView {...props} />
      </Suspense>
    </div>
  );
}
