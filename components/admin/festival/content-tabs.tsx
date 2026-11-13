import { Trash2Icon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { ActionButton } from "@/components/common/action-button";
import { ActionForm } from "@/components/common/action-form";

import { controlStyles } from "@/components/ui/control-styles";
import type { getFestivalAdmin } from "@/lib/festivals/queries";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { addTier, removeTier } from "@/server/actions/festival-content";

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
