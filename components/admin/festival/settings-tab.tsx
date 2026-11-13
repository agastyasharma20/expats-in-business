import { ActionForm, Toggle } from "@/components/common/action-form";

import { controlStyles } from "@/components/ui/control-styles";
import { fromMinorUnits } from "@/lib/money";
import { cn } from "@/lib/utils";

import { updateFestival } from "@/server/actions/festivals-admin";
import { consoleText, field, input, type Console } from "./content-tabs";

export async function SettingsTab({ data }: { data: Console }) {
  const { t, errors } = await consoleText();
  const { event } = data;
  const fee =
    event.stallFeeMinor === null
      ? ""
      : String(fromMinorUnits(event.stallFeeMinor, event.chapter.currency));
  return (
    <ActionForm
      action={updateFestival}
      submitLabel={t("save")}
      pendingLabel={t("saving")}
      successText={t("saved")}
      errorTexts={errors}
      className="rounded-2xl border border-line bg-surface p-6"
    >
      <input type="hidden" name="eventId" value={event.id} />
      <label className={field}>
        {t("fields.title")}
        <input name="title" required defaultValue={event.title} maxLength={120} className={input} />
      </label>
      <label className={field}>
        {t("fields.tagline")}
        <input
          name="tagline"
          defaultValue={event.tagline ?? ""}
          maxLength={160}
          className={input}
        />
      </label>
      <label className={field}>
        {t("fields.summary")}
        <input
          name="summary"
          required
          defaultValue={event.summary}
          maxLength={200}
          className={input}
        />
      </label>
      <label className={field}>
        {t("fields.description")}
        <textarea
          name="description"
          required
          rows={8}
          defaultValue={event.description}
          maxLength={8000}
          className={cn(controlStyles, "resize-y py-2.5")}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={field}>
          {t("fields.capacity")}
          <input
            name="capacity"
            type="number"
            required
            min={10}
            defaultValue={event.capacity}
            className={input}
          />
        </label>
        <label className={field}>
          {t("fields.maxPerOrder")}
          <input
            name="maxPerOrder"
            type="number"
            required
            min={1}
            max={10}
            defaultValue={event.maxPerOrder}
            className={input}
          />
        </label>
        <label className={field}>
          {t("fields.stallFee", { currency: event.chapter.currency })}
          <input name="stallFee" inputMode="decimal" defaultValue={fee} className={input} />
        </label>
      </div>
      <Toggle
        name="volunteersOpen"
        label={t("fields.volunteersOpen")}
        defaultChecked={event.volunteersOpen}
      />
      <Toggle name="stallsOpen" label={t("fields.stallsOpen")} defaultChecked={event.stallsOpen} />
    </ActionForm>
  );
}
