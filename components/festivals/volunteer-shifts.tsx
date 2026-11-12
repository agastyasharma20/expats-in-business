import { HandHeartIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { ActionButton } from "@/components/common/action-button";
import { buttonVariants } from "@/components/ui/button";
import { shiftState } from "@/lib/festivals/rules";
import { Link } from "@/lib/i18n/navigation";
import { joinShift, leaveShift } from "@/server/actions/festivals";

type Shift = {
  id: string;
  role: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  taken: number;
  mine: boolean;
};

/** Volunteer shifts with fill bars; members join or leave with one click. */
export async function VolunteerShifts({
  shifts,
  timeZone,
  signedIn,
  slug,
}: {
  shifts: Shift[];
  timeZone: string;
  signedIn: boolean;
  slug: string;
}) {
  const [t, format] = await Promise.all([getTranslations("festival"), getFormatter()]);
  const when = (d: Date) =>
    format.dateTime(d, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    });
  const errors = t("errors.shift");

  return (
    <ul className="grid gap-3 md:grid-cols-2" data-testid="volunteer-shifts">
      {shifts.map((shift) => {
        const fill = shiftState(shift.capacity, shift.taken);
        return (
          <li
            key={shift.id}
            className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ember-50 text-ember-700">
                <HandHeartIcon aria-hidden="true" className="size-5" />
              </span>
              <div className="flex flex-col">
                <span className="font-heading text-body font-bold text-brand-950">
                  {shift.role}
                </span>
                <span className="text-small text-muted-foreground">
                  {when(shift.startsAt)} –{" "}
                  {format.dateTime(shift.endsAt, { hour: "2-digit", minute: "2-digit", timeZone })}
                </span>
              </div>
            </div>
            {shift.description ? <p className="text-small text-ink">{shift.description}</p> : null}
            <div className="flex flex-col gap-1">
              <span className="h-2 overflow-hidden rounded-full bg-brand-50" aria-hidden="true">
                <span
                  className="block h-full rounded-full bg-brand-700"
                  style={{ width: `${fill.percent}%` }}
                />
              </span>
              <span className="text-small text-muted-foreground">
                {t("shiftFill", { taken: shift.taken, capacity: shift.capacity })}
              </span>
            </div>
            {!signedIn ? (
              <Link
                href={`/sign-in?next=${encodeURIComponent(`/festivals/${slug}#volunteer`)}`}
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "self-start",
                })}
              >
                {t("signInToVolunteer")}
              </Link>
            ) : shift.mine ? (
              <ActionButton
                action={leaveShift}
                fields={{ shiftId: shift.id }}
                variant="ghost"
                toasts={{ left: t("shiftLeft") }}
                errorText={errors}
                className="self-start"
              >
                {t("leaveShift")}
              </ActionButton>
            ) : (
              <ActionButton
                action={joinShift}
                fields={{ shiftId: shift.id }}
                variant={fill.full ? "outline" : "default"}
                toasts={{ joined: t("shiftJoined") }}
                errorText={errors}
                className="self-start"
                testId="join-shift"
              >
                {fill.full ? t("shiftFull") : t("joinShift")}
              </ActionButton>
            )}
          </li>
        );
      })}
    </ul>
  );
}
