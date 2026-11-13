"use client";

import { useActionState, useState } from "react";
import { Building2Icon, GlobeIcon, MapIcon, SendIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { controlStyles } from "@/components/ui/control-styles";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/server/actions/account";
import { applyAmbassador } from "@/server/actions/ambassadors";

type Scope = "global" | "country" | "city";
const SCOPES: { scope: Scope; icon: typeof GlobeIcon }[] = [
  { scope: "global", icon: GlobeIcon },
  { scope: "country", icon: MapIcon },
  { scope: "city", icon: Building2Icon },
];

type Option = readonly [code: string, name: string];

/**
 * Ambassador application. Country and language names come from the server (Node and browsers
 * ship different Intl display names, which would break hydration). The fields shown follow the tier; the server validates the same rules
 * again (ambassadorPlaceSchema), so editing hidden fields in the browser changes nothing.
 */
export function AmbassadorForm({
  countries,
  languages,
  defaultCountry,
}: {
  countries: Option[];
  languages: Option[];
  defaultCountry?: string;
}) {
  const t = useTranslations("ambassadors");
  const [scope, setScope] = useState<Scope>("city");
  const [motivation, setMotivation] = useState("");
  const [hours, setHours] = useState(8);
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, form) => {
    const result = await applyAmbassador(prev, form);
    if (result?.ok) toast.success(t("sent"));
    return result;
  }, null);

  const error =
    state && !state.ok
      ? t.has(`errors.${state.message}`)
        ? t(`errors.${state.message}`)
        : t("errors.default")
      : null;
  const field = "flex flex-col gap-1.5 text-small font-semibold text-ink";

  return (
    <form action={action} className="flex flex-col gap-6" data-testid="ambassador-form">
      <fieldset className="grid gap-3 md:grid-cols-3">
        <legend className="mb-2 font-heading text-body font-bold text-brand-950">
          {t("form.tier")}
        </legend>
        {SCOPES.map(({ scope: s, icon: Icon }) => (
          <label
            key={s}
            className="flex cursor-pointer flex-col gap-2 rounded-2xl border-2 border-line bg-surface p-4 transition-transform duration-(--duration-micro) hover:-translate-y-0.5 has-checked:border-brand-700 has-checked:bg-brand-50 has-focus-visible:outline-2 has-focus-visible:outline-ring"
          >
            <input
              type="radio"
              name="scope"
              value={s}
              checked={scope === s}
              onChange={() => setScope(s)}
              className="sr-only"
            />
            <Icon aria-hidden="true" className="size-6 text-brand-700" />
            <span className="font-heading text-body font-bold text-brand-950">
              {t(`tiers.${s}.title`)}
            </span>
            <span className="text-small font-normal text-muted-foreground">
              {t(`tiers.${s}.short`)}
            </span>
          </label>
        ))}
      </fieldset>

      {scope !== "global" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={field}>
            {t("form.country")}
            <select
              name="countryCode"
              required
              defaultValue={defaultCountry ?? "PL"}
              className={cn(controlStyles, "h-11")}
            >
              {countries.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          {scope === "city" ? (
            <label className={field}>
              {t("form.city")}
              <input
                name="city"
                required
                minLength={2}
                maxLength={60}
                placeholder={t("form.cityPlaceholder")}
                className={cn(controlStyles, "h-11")}
              />
            </label>
          ) : null}
        </div>
      ) : null}

      <label className={field}>
        {t("form.motivation")}
        <textarea
          name="motivation"
          required
          minLength={80}
          maxLength={2000}
          rows={5}
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          className={cn(controlStyles, "resize-y py-2.5")}
        />
        <span
          className={cn(
            "font-normal",
            motivation.length < 80 ? "text-muted-foreground" : "text-success",
          )}
        >
          {t("form.motivationHint", { count: motivation.length })}
        </span>
      </label>
      <label className={field}>
        {t("form.experience")}
        <textarea
          name="experience"
          required
          minLength={40}
          maxLength={2000}
          rows={4}
          className={cn(controlStyles, "resize-y py-2.5")}
        />
        <span className="font-normal text-muted-foreground">{t("form.experienceHint")}</span>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-small font-semibold text-ink">{t("form.languages")}</legend>
        <div className="flex flex-wrap gap-2">
          {languages.map(([code, name]) => (
            <label
              key={code}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line-strong px-4 text-small font-semibold text-ink has-checked:border-brand-700 has-checked:bg-brand-50 has-checked:text-brand-950 has-focus-visible:outline-2 has-focus-visible:outline-ring"
            >
              <input
                type="checkbox"
                name="languages"
                value={code}
                defaultChecked={code === "en"}
                className="sr-only"
              />
              {name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={field}>
          {t("form.hours", { hours })}
          <input
            type="range"
            name="hoursPerMonth"
            min={2}
            max={40}
            step={1}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="h-11 accent-brand-700"
          />
        </label>
        <label className={field}>
          {t("form.linkedin")}
          <input
            name="linkedinUrl"
            type="url"
            inputMode="url"
            placeholder="https://www.linkedin.com/in/…"
            maxLength={300}
            className={cn(controlStyles, "h-11")}
          />
        </label>
      </div>

      <p className="text-small text-muted-foreground">{t("form.privacy")}</p>
      {error ? (
        <p role="alert" className="font-semibold text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} className="self-start">
        <SendIcon aria-hidden="true" />
        {pending ? t("form.sending") : t("form.submit")}
      </Button>
    </form>
  );
}
