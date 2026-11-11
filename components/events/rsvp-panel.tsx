import { getLocale, getTranslations } from "next-intl/server";

import { ActionForm } from "@/components/common/action-form";
import { buttonVariants } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/session";
import { getMyTicket } from "@/lib/events/queries";
import { Link } from "@/lib/i18n/navigation";
import { formatMoney } from "@/lib/money";
import { rsvp } from "@/server/actions/rsvp";

type RsvpPanelProps = {
  event: {
    id: string;
    slug: string;
    full: boolean;
    ticketTypes: { id: string; name: string; priceMinor: number; currency: string }[];
  };
};

/** The one call to action on an event page; its state follows the member's own ticket. */
export async function RsvpPanel({ event }: RsvpPanelProps) {
  const [t, locale, user] = await Promise.all([
    getTranslations("events"),
    getLocale(),
    getSessionUser(),
  ]);

  if (!user) {
    return (
      <Link
        href={`/sign-in?next=${encodeURIComponent(`/events/${event.slug}`)}`}
        className={buttonVariants({ size: "lg" })}
      >
        {t("signInToRsvp")}
      </Link>
    );
  }

  const ticket = await getMyTicket(event.id, user.id);
  if (ticket && ticket.status !== "cancelled") {
    const label = {
      confirmed: t("youreGoing"),
      waitlisted: t("youreWaitlisted"),
      reserved: t("youreReserved"),
    }[ticket.status];
    return (
      <div className="flex flex-col gap-3" data-testid="rsvp-status">
        <p role="status" className="font-heading text-lg font-bold text-brand-950">
          {label}
        </p>
        <Link href={`/tickets/${ticket.id}`} className={buttonVariants({ size: "lg" })}>
          {ticket.status === "reserved" ? t("pay") : t("viewTicket")}
        </Link>
      </div>
    );
  }

  const errors = {
    default: t("errors.default"),
    closed: t("errors.closed"),
    rateLimited: t("errors.rateLimited"),
  };
  return (
    <div className="flex flex-col gap-3">
      {event.ticketTypes.map((type) => {
        const label = event.full
          ? t("joinWaitlist")
          : type.priceMinor === 0
            ? t("rsvp")
            : t("buy", {
                price: formatMoney(
                  { amountMinor: type.priceMinor, currency: type.currency },
                  locale,
                  { hideZeroDecimals: true },
                ),
              });
        return (
          <ActionForm
            key={type.id}
            action={rsvp}
            submitLabel={label}
            pendingLabel={t("processing")}
            successText={t("waitlistedToast")}
            errorTexts={errors}
            submitVariant={event.full ? "outline" : "default"}
            className="[&_button]:w-full"
            testId="rsvp-form"
          >
            <input type="hidden" name="eventId" value={event.id} />
            <input type="hidden" name="ticketTypeId" value={type.id} />
            {event.ticketTypes.length > 1 ? (
              <p className="text-small font-semibold">{type.name}</p>
            ) : null}
          </ActionForm>
        );
      })}
    </div>
  );
}
