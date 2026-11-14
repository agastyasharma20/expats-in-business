import { getFormatter } from "next-intl/server";

import { ActionForm } from "@/components/common/action-form";
import { Badge } from "@/components/ui/badge";

import { addProgrammeItem, removeProgrammeItem } from "@/server/actions/festival-content";
import { consoleText, field, input, Remove, type Console } from "./content-tabs";

export async function ProgrammeTab({ data }: { data: Console }) {
  const [{ t, errors }, format] = await Promise.all([consoleText(), getFormatter()]);
  const { event } = data;
  const tz = event.chapter.timezone;
  const kinds = [
    "performance",
    "talk",
    "workshop",
    "food",
    "family",
    "exhibition",
    "other",
  ] as const;
  return (
    <div className="flex flex-col gap-6">
      {event.programme.length ? (
        <ol className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
          {event.programme.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <span className="flex flex-col">
                <span className="font-semibold text-brand-950">
                  {item.title} <Badge variant="secondary">{item.kind}</Badge>
                </span>
                <span className="text-small text-muted-foreground">
                  {format.dateTimeRange(item.startsAt, item.endsAt, {
                    weekday: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: tz,
                  })}
                  {item.stage ? ` · ${item.stage}` : ""}
                  {item.performer ? ` · ${item.performer}` : ""}
                </span>
              </span>
              <Remove
                action={removeProgrammeItem}
                eventId={event.id}
                itemId={item.id}
                label={t("remove", { name: item.title })}
              />
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-muted-foreground">{t("programmeEmpty")}</p>
      )}
      <ActionForm
        action={addProgrammeItem}
        submitLabel={t("addItem")}
        pendingLabel={t("saving")}
        successText={t("saved")}
        errorTexts={errors}
        className="rounded-2xl border border-line bg-surface p-5"
      >
        <input type="hidden" name="eventId" value={event.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={field}>
            {t("fields.itemTitle")}
            <input name="title" required maxLength={120} className={input} />
          </label>
          <label className={field}>
            {t("fields.kind")}
            <select name="kind" className={input}>
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {t(`kinds.${k}`)}
                </option>
              ))}
            </select>
          </label>
          <label className={field}>
            {t("fields.stage")}
            <input
              name="stage"
              maxLength={60}
              placeholder={t("stagePlaceholder")}
              className={input}
            />
          </label>
          <label className={field}>
            {t("fields.performer")}
            <input name="performer" maxLength={120} className={input} />
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
          {t("fields.itemDescription")}
          <input name="description" maxLength={500} className={input} />
        </label>
        <p className="text-small text-muted-foreground">{t("timezoneNote", { tz })}</p>
      </ActionForm>
    </div>
  );
}
