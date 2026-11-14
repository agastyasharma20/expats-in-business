import { cache } from "react";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";

import { ActionButton } from "@/components/common/action-button";
import { UnrsvpButton } from "@/components/events/unrsvp-button";
import { buttonVariants } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { getFestivalViewer, type PublicFestival } from "@/lib/festivals/queries";
import { Link } from "@/lib/i18n/navigation";
import { withdrawStall } from "@/server/actions/festivals";

import { StallForm } from "./stall-form";
import { TicketPicker } from "./ticket-picker";
import { VolunteerShifts } from "./volunteer-shifts";

/** One viewer lookup per request, shared by the three panels. */
const viewerFor = cache(async (eventId: string) => {
  await connection();
  const user = await getSessionUser();
  return { user, data: user ? await getFestivalViewer(eventId, user.id) : null };
});

const signInHref = (slug: string, anchor: string) =>
  `/sign-in?next=${encodeURIComponent(`/festivals/${slug}#${anchor}`)}`;

/** The member's ticket, the ticket picker, or a sign-in link. */
export async function TicketsPanel({ festival }: { festival: PublicFestival }) {
  await connection();
  const [t, { user, data }] = await Promise.all([
    getTranslations("festival"),
    viewerFor(festival.id),
  ]);
  const upcoming = festival.startsAt > new Date() && festival.status === "published";
  const ticket = data?.ticket;
  if (ticket && ticket.status !== "cancelled") {
    return (
      <div
        className="flex flex-col gap-3 rounded-2xl border-2 border-brand-700 bg-brand-50 p-5"
        data-testid="festival-ticket"
      >
        <p className="font-heading text-h3 font-bold text-brand-950">
          {t(`ticketStatus.${ticket.status}`, { count: ticket.quantity })}
        </p>
        <Link
          href={`/tickets/${ticket.id}`}
          className={buttonVariants({ className: "self-start" })}
        >
          {t("viewTicket")}
        </Link>
        {upcoming && ticket.status !== "reserved" ? (
          <UnrsvpButton ticketId={ticket.id} status={ticket.status} quantity={ticket.quantity} />
        ) : null}
      </div>
    );
  }
  if (!upcoming) return <p className="text-muted-foreground">{t("salesClosed")}</p>;
  if (!user) {
    return (
      <Link href={signInHref(festival.slug, "tickets")} className={buttonVariants({ size: "lg" })}>
        {t("signInToBuy")}
      </Link>
    );
  }
  return (
    <TicketPicker
      eventId={festival.id}
      maxPerOrder={festival.maxPerOrder}
      tiers={festival.tiers.map((x) => ({
        id: x.id,
        name: x.name,
        description: x.description,
        priceMinor: x.priceMinor,
        currency: x.currency,
        state: x.state,
        left: x.left,
        salesEndAt: x.salesEndAt?.toISOString() ?? null,
      }))}
    />
  );
}

/** Volunteer shifts, marking the ones this member already joined. */
export async function VolunteerPanel({ festival }: { festival: PublicFestival }) {
  const { user, data } = await viewerFor(festival.id);
  return (
    <VolunteerShifts
      shifts={festival.shifts.map((shift) => ({
        ...shift,
        mine: Boolean(data?.shiftIds.has(shift.id)),
      }))}
      timeZone={festival.chapter.timezone}
      signedIn={Boolean(user)}
      slug={festival.slug}
    />
  );
}

/** The member's stall application status, the application form, or a sign-in link. */
export async function StallPanel({ festival }: { festival: PublicFestival }) {
  const [t, { user, data }] = await Promise.all([
    getTranslations("festival"),
    viewerFor(festival.id),
  ]);
  const stall = data?.stall;
  if (stall && stall.status !== "withdrawn") {
    return (
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5"
        data-testid="stall-status"
      >
        <p className="font-semibold text-brand-950">
          {t(`stallStatus.${stall.status}`, { name: stall.businessName })}
        </p>
        {["submitted", "waitlisted"].includes(stall.status) ? (
          <ActionButton
            action={withdrawStall}
            fields={{ eventId: festival.id }}
            variant="ghost"
            toasts={{ withdrawn: t("stallWithdrawn") }}
          >
            {t("withdraw")}
          </ActionButton>
        ) : null}
      </div>
    );
  }
  if (user) return <StallForm eventId={festival.id} />;
  return (
    <Link
      href={signInHref(festival.slug, "stalls")}
      className={buttonVariants({ variant: "outline", className: "self-start" })}
    >
      {t("signInToApply")}
    </Link>
  );
}
