import { getFormatter } from "next-intl/server";

import { ActionForm } from "@/components/common/action-form";
import { Badge } from "@/components/ui/badge";

import { cn } from "@/lib/utils";
import { addShift, removeShift } from "@/server/actions/festival-content";
import { reviewStall } from "@/server/actions/festival-extras";

import { consoleText, field, input, Remove, type Console } from "./content-tabs";

const STALL_BADGE = {
  submitted: "unconfirmed",
  accepted: "verified",
  waitlisted: "secondary",
  declined: "destructive",
  withdrawn: "outline",
} as const;

export async function VolunteersTab({ data }: { data: Console }) {
  const [{ t, errors }, format] = await Promise.all([consoleText(), getFormatter()]);
  const { event } = data;
  const tz = event.chapter.timezone;
  return (
    <div className="flex flex-col gap-6">
      {!event.volunteersOpen ? (
        <p className="rounded-xl bg-warning-50 p-3 text-small font-semibold text-warning">
          {t("volunteersClosed")}
        </p>
      ) : null}
      <ul className="grid gap-3 md:grid-cols-2">
        {event.shifts.map((shift) => (
          <li
            key={shift.id}
            className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4"
          >
            <span className="flex items-start justify-between gap-2">
              <span className="flex flex-col">
                <span className="font-semibold text-brand-950">{shift.role}</span>
                <span className="text-small text-muted-foreground">
                  {format.dateTimeRange(shift.startsAt, shift.endsAt, {
                    weekday: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: tz,
                  })}
                </span>
              </span>
              <Remove
                action={removeShift}
                eventId={event.id}
                itemId={shift.id}
                label={t("remove", { name: shift.role })}
              />
            </span>
            <span className="text-small font-semibold text-ink">
              {t("shiftFill", { taken: shift.signups.length, capacity: shift.capacity })}
            </span>
            {shift.signups.length ? (
              <span className="text-small text-muted-foreground">
                {shift.signups.map((s) => s.user.name).join(", ")}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <ActionForm
        action={addShift}
        submitLabel={t("addShift")}
        pendingLabel={t("saving")}
        successText={t("saved")}
        errorTexts={errors}
        className="rounded-2xl border border-line bg-surface p-5"
      >
        <input type="hidden" name="eventId" value={event.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={field}>
            {t("fields.role")}
            <input
              name="role"
              required
              maxLength={80}
              placeholder={t("rolePlaceholder")}
              className={input}
            />
          </label>
          <label className={field}>
            {t("fields.shiftCapacity")}
            <input
              name="capacity"
              type="number"
              required
              min={1}
              max={500}
              defaultValue={4}
              className={input}
            />
          </label>
          <label className={field}>
            {t("fields.date")}
            <input name="date" type="date" required className={input} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={field}>
              {t("fields.start")}
              <input name="start" type="time" required className={input} />
            </label>
            <label className={field}>
              {t("fields.end")}
              <input name="end" type="time" required className={input} />
            </label>
          </div>
        </div>
        <label className={field}>
          {t("fields.shiftDescription")}
          <input name="description" maxLength={300} className={input} />
        </label>
      </ActionForm>
    </div>
  );
}

export async function StallsTab({ data }: { data: Console }) {
  const { t, errors } = await consoleText();
  const { event } = data;
  if (!event.stalls.length)
    return (
      <p className="text-muted-foreground">
        {event.stallsOpen ? t("stallsEmpty") : t("stallsClosed")}
      </p>
    );
  return (
    <ul className="flex flex-col gap-4" data-testid="stall-review">
      {event.stalls.map((stall) => (
        <li
          key={stall.id}
          className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-card"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className="flex flex-col">
              <span className="font-heading text-body font-bold text-brand-950">
                {stall.businessName}
              </span>
              <span className="text-small text-muted-foreground">
                {t(`stallCategories.${stall.category}`)} · {stall.user.name} · {stall.user.email}
              </span>
            </span>
            <Badge variant={STALL_BADGE[stall.status]}>{t(`stallStatus.${stall.status}`)}</Badge>
          </div>
          <p className="text-small whitespace-pre-line text-ink">{stall.description}</p>
          {stall.website ? (
            <a
              href={stall.website}
              rel="noopener noreferrer nofollow"
              target="_blank"
              className="text-small font-semibold text-primary underline"
            >
              {stall.website}
            </a>
          ) : null}
          {stall.status !== "withdrawn" ? (
            <ActionForm
              action={reviewStall}
              submitLabel={t("saveDecision")}
              pendingLabel={t("saving")}
              successText={t("saved")}
              errorTexts={errors}
              submitVariant="outline"
              className="gap-3 sm:flex-row sm:items-end"
            >
              <input type="hidden" name="eventId" value={event.id} />
              <input type="hidden" name="itemId" value={stall.id} />
              <label className={field}>
                {t("decision")}
                <select
                  name="decision"
                  defaultValue={stall.status === "submitted" ? "accepted" : stall.status}
                  className={input}
                >
                  {(["accepted", "waitlisted", "declined"] as const).map((d) => (
                    <option key={d} value={d}>
                      {t(`stallStatus.${d}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={cn(field, "flex-1")}>
                {t("note")}
                <input
                  name="note"
                  maxLength={500}
                  defaultValue={stall.reviewNote ?? ""}
                  className={input}
                />
              </label>
            </ActionForm>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
