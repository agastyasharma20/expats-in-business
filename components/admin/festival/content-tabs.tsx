import { Trash2Icon } from "lucide-react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";

import { ActionButton } from "@/components/common/action-button";
import { ActionForm } from "@/components/common/action-form";
import { Badge } from "@/components/ui/badge";
import { controlStyles } from "@/components/ui/control-styles";
import type { getFestivalAdmin } from "@/lib/festivals/queries";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  addFaq,
  addPartner,
  addProgrammeItem,
  addTier,
  removeFaq,
  removePartner,
  removeProgrammeItem,
  removeTier,
} from "@/server/actions/festival-content";

export type Console = NonNullable<Awaited<ReturnType<typeof getFestivalAdmin>>>;

export const field = "flex flex-col gap-1 text-small font-semibold text-ink";
export const input = cn(controlStyles, "h-11");

export async function consoleText() {
  const t = await getTranslations("adminFestivals");
  return {
    t,
    errors: {
      default: t("errors.default"),
      dates: t("errors.dates"),
      tierInUse: t("errors.tierInUse"),
      shiftInUse: t("errors.shiftInUse"),
      rateLimited: t("errors.rateLimited"),
      capacity: t("errors.capacity"),
      noTiers: t("errors.noTiers"),
    },
  };
}

export function Remove({
  action,
  eventId,
  itemId,
  label,
}: {
  action: Parameters<typeof ActionButton>[0]["action"];
  eventId: string;
  itemId: string;
  label: string;
}) {
  return (
    <ActionButton
      action={action}
      fields={{ eventId, itemId }}
      variant="ghost"
      aria-label={label}
      errorText={label}
    >
      <Trash2Icon aria-hidden="true" />
    </ActionButton>
  );
}

export async function TiersTab({ data }: { data: Console }) {
  const [{ t, errors }, locale] = await Promise.all([consoleText(), getLocale()]);
  const { event, sold } = data;
  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
        {event.ticketTypes.map((tier) => (
          <li key={tier.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <span className="flex flex-col">
              <span className="font-semibold text-brand-950">
                {tier.name} ·{" "}
                {tier.priceMinor
                  ? formatMoney({ amountMinor: tier.priceMinor, currency: tier.currency }, locale)
                  : t("free")}
              </span>
              <span className="text-small text-muted-foreground">
                {t("tierSold", {
                  sold: sold.get(tier.id) ?? 0,
                  cap: tier.capacity ?? event.capacity,
                })}
                {tier.salesEndAt ? ` · ${t("salesEnd")}` : ""}
              </span>
            </span>
            <Remove
              action={removeTier}
              eventId={event.id}
              itemId={tier.id}
              label={t("remove", { name: tier.name })}
            />
          </li>
        ))}
      </ul>
      <ActionForm
        action={addTier}
        submitLabel={t("addTier")}
        pendingLabel={t("saving")}
        successText={t("saved")}
        errorTexts={errors}
        className="rounded-2xl border border-line bg-surface p-5"
      >
        <input type="hidden" name="eventId" value={event.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={field}>
            {t("fields.tierName")}
            <input name="name" required maxLength={60} className={input} />
          </label>
          <label className={field}>
            {t("fields.tierPrice")}
            <input name="price" required inputMode="decimal" defaultValue="0" className={input} />
          </label>
          <label className={field}>
            {t("fields.tierCapacity")}
            <input name="capacity" type="number" min={1} className={input} />
          </label>
          <label className={field}>
            {t("fields.sortOrder")}
            <input
              name="sortOrder"
              type="number"
              min={0}
              max={99}
              defaultValue={0}
              className={input}
            />
          </label>
          <label className={field}>
            {t("fields.salesEndDate")}
            <input name="salesEndDate" type="date" className={input} />
          </label>
          <label className={field}>
            {t("fields.salesEndTime")}
            <input name="salesEndTime" type="time" className={input} />
          </label>
        </div>
        <label className={field}>
          {t("fields.tierDescription")}
          <input name="description" maxLength={200} className={input} />
        </label>
      </ActionForm>
    </div>
  );
}

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

export async function PartnersTab({ data }: { data: Console }) {
  const { t, errors } = await consoleText();
  const { event } = data;
  const tiers = ["headline", "gold", "silver", "community", "media"] as const;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <h3 className="text-h3">{t("partners")}</h3>
        <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
          {event.sponsorships.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 p-4">
              <span className="flex flex-col">
                <span className="font-semibold text-brand-950">{s.sponsor.name}</span>
                <span className="text-small text-muted-foreground">
                  {t(`partnerTiers.${s.tier}`)} ·{" "}
                  <a className="text-primary underline" href={`/sponsor-report/${s.reportToken}`}>
                    {t("reportLink")}
                  </a>
                </span>
              </span>
              <Remove
                action={removePartner}
                eventId={event.id}
                itemId={s.id}
                label={t("remove", { name: s.sponsor.name })}
              />
            </li>
          ))}
        </ul>
        <ActionForm
          action={addPartner}
          submitLabel={t("addPartner")}
          pendingLabel={t("saving")}
          successText={t("saved")}
          errorTexts={errors}
          className="rounded-2xl border border-line bg-surface p-5"
        >
          <input type="hidden" name="eventId" value={event.id} />
          <label className={field}>
            {t("fields.partnerName")}
            <input name="name" required maxLength={120} className={input} />
          </label>
          <label className={field}>
            {t("fields.website")}
            <input name="website" type="url" placeholder="https://" className={input} />
          </label>
          <label className={field}>
            {t("fields.partnerTier")}
            <select name="tier" className={input}>
              {tiers.map((x) => (
                <option key={x} value={x}>
                  {t(`partnerTiers.${x}`)}
                </option>
              ))}
            </select>
          </label>
          <p className="text-small text-muted-foreground">{t("permissionNote")}</p>
        </ActionForm>
      </div>
      <div className="flex flex-col gap-4">
        <h3 className="text-h3">{t("faq")}</h3>
        <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
          {event.faqs.map((f) => (
            <li key={f.id} className="flex items-start justify-between gap-3 p-4">
              <span className="flex flex-col">
                <span className="font-semibold text-brand-950">{f.question}</span>
                <span className="line-clamp-2 text-small text-muted-foreground">{f.answer}</span>
              </span>
              <Remove
                action={removeFaq}
                eventId={event.id}
                itemId={f.id}
                label={t("remove", { name: f.question })}
              />
            </li>
          ))}
        </ul>
        <ActionForm
          action={addFaq}
          submitLabel={t("addFaq")}
          pendingLabel={t("saving")}
          successText={t("saved")}
          errorTexts={errors}
          className="rounded-2xl border border-line bg-surface p-5"
        >
          <input type="hidden" name="eventId" value={event.id} />
          <label className={field}>
            {t("fields.question")}
            <input name="question" required minLength={5} maxLength={200} className={input} />
          </label>
          <label className={field}>
            {t("fields.answer")}
            <textarea
              name="answer"
              required
              minLength={5}
              maxLength={1500}
              rows={3}
              className={cn(controlStyles, "resize-y py-2.5")}
            />
          </label>
        </ActionForm>
      </div>
    </div>
  );
}
