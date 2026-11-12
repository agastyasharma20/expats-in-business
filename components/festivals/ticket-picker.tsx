"use client";

import { useActionState, useState } from "react";
import { MinusIcon, PlusIcon, TicketIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/server/actions/account";
import { rsvp } from "@/server/actions/rsvp";

export type PickerTier = {
  id: string;
  name: string;
  description: string | null;
  priceMinor: number;
  currency: string;
  state: "onSale" | "lowStock" | "soldOut" | "ended";
  left: number;
  salesEndAt: string | null;
};

/**
 * Tier cards + party size + total. The total is only a preview: the server takes the tier price
 * from the database and checks the party size against the festival limit and live capacity.
 */
export function TicketPicker({
  eventId,
  tiers,
  maxPerOrder,
}: {
  eventId: string;
  tiers: PickerTier[];
  maxPerOrder: number;
}) {
  const t = useTranslations("festival");
  const locale = useLocale();
  const buyable = tiers.filter((tier) => tier.state === "onSale" || tier.state === "lowStock");
  const [tierId, setTierId] = useState(buyable[0]?.id ?? tiers[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [state, action, pending] = useActionState<ActionState, FormData>(rsvp, null);
  const tier = tiers.find((x) => x.id === tierId);
  const soldOut = !tier || tier.state === "soldOut" || tier.state === "ended";
  const max = Math.max(1, Math.min(maxPerOrder, tier && tier.left > 0 ? tier.left : 1));
  const qty = Math.min(quantity, max);
  const money = (minor: number, currency: string) =>
    formatMoney({ amountMinor: minor, currency }, locale, { hideZeroDecimals: true });
  const total = tier ? money(tier.priceMinor * qty, tier.currency) : "";
  const error =
    state && !state.ok
      ? t.has(`errors.${state.message}`)
        ? t(`errors.${state.message}`)
        : t("errors.default")
      : null;

  return (
    <form action={action} className="flex flex-col gap-5" data-testid="ticket-picker">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="quantity" value={qty} />
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">{t("chooseTier")}</legend>
        {tiers.map((x) => {
          const disabled = x.state === "soldOut" || x.state === "ended";
          return (
            <label
              key={x.id}
              className={cn(
                "relative flex cursor-pointer flex-col gap-1.5 rounded-2xl border-2 bg-surface p-4 transition-transform duration-(--duration-micro)",
                "has-checked:border-brand-700 has-checked:bg-brand-50 has-focus-visible:outline-2 has-focus-visible:outline-ring",
                disabled
                  ? "cursor-not-allowed border-line opacity-70"
                  : "border-line hover:-translate-y-0.5",
              )}
            >
              <input
                type="radio"
                name="ticketTypeId"
                value={x.id}
                checked={tierId === x.id}
                disabled={disabled}
                onChange={() => setTierId(x.id)}
                className="sr-only"
              />
              <span className="flex items-start justify-between gap-2">
                <span className="font-heading text-body font-bold text-brand-950">{x.name}</span>
                <span className="font-heading text-body font-bold text-brand-950 tabular-nums">
                  {x.priceMinor ? money(x.priceMinor, x.currency) : t("free")}
                </span>
              </span>
              {x.description ? (
                <span className="text-small text-muted-foreground">{x.description}</span>
              ) : null}
              <span
                className={cn(
                  "text-small font-semibold",
                  x.state === "lowStock"
                    ? "text-ember-700"
                    : disabled
                      ? "text-ink-muted"
                      : "text-success",
                )}
              >
                {t(`tierState.${x.state}`, { left: x.left })}
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-canvas p-4">
        <div className="flex items-center gap-3">
          <span id="qty-label" className="font-semibold text-ink">
            {t("people")}
          </span>
          <div className="flex items-center gap-1" role="group" aria-labelledby="qty-label">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("fewer")}
              disabled={qty <= 1 || soldOut}
              onClick={() => setQuantity(Math.max(1, qty - 1))}
            >
              <MinusIcon aria-hidden="true" />
            </Button>
            <output
              aria-live="polite"
              className="w-10 text-center font-heading text-h3 font-bold text-brand-950 tabular-nums"
            >
              {qty}
            </output>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("more")}
              disabled={qty >= max || soldOut}
              onClick={() => setQuantity(Math.min(max, qty + 1))}
            >
              <PlusIcon aria-hidden="true" />
            </Button>
          </div>
        </div>
        <p className="text-right">
          <span className="block text-small text-muted-foreground">{t("total")}</span>
          <span className="font-heading text-h3 font-bold text-brand-950 tabular-nums">
            {tier && tier.priceMinor === 0 ? t("free") : total}
          </span>
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-small font-semibold text-danger">
          {error}
        </p>
      ) : null}
      {state?.ok && state.message === "waitlisted" ? (
        <p role="status" className="text-small font-semibold text-brand-950">
          {t("waitlisted")}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={pending || soldOut}
        aria-busy={pending || undefined}
      >
        <TicketIcon aria-hidden="true" />
        {pending
          ? t("processing")
          : soldOut
            ? t("soldOut")
            : tier && tier.priceMinor > 0
              ? t("buy", { count: qty })
              : t("reserve", { count: qty })}
      </Button>
      <p className="text-small text-muted-foreground">{t("paymentNote")}</p>
    </form>
  );
}
