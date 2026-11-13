"use client";

import { useActionState } from "react";
import { StoreIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { controlStyles } from "@/components/ui/control-styles";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/server/actions/account";
import { applyForStall } from "@/server/actions/festivals";

const CATEGORIES = ["food", "crafts", "culture", "services", "nonprofit", "other"] as const;

/** Stall / vendor application. Replies go to the member's account email (no extra contact data). */
export function StallForm({ eventId }: { eventId: string }) {
  const t = useTranslations("festival");
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, form) => {
    const result = await applyForStall(prev, form);
    if (result?.ok) toast.success(t("stallSent"));
    return result;
  }, null);
  const error =
    state && !state.ok
      ? t.has(`errors.${state.message}`)
        ? t(`errors.${state.message}`)
        : t("errors.stall")
      : null;
  const field = "flex flex-col gap-1 text-small font-semibold text-ink";

  return (
    <form action={action} className="flex flex-col gap-4" data-testid="stall-form">
      <input type="hidden" name="eventId" value={eventId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={field}>
          {t("stall.name")}
          <input
            name="businessName"
            required
            minLength={2}
            maxLength={120}
            className={cn(controlStyles, "h-11")}
          />
        </label>
        <label className={field}>
          {t("stall.category")}
          <select name="category" className={cn(controlStyles, "h-11")} defaultValue="food">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`stallCategories.${c}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={field}>
        {t("stall.description")}
        <textarea
          name="description"
          required
          minLength={30}
          maxLength={1500}
          rows={4}
          aria-describedby="stall-hint"
          className={cn(controlStyles, "resize-y py-2.5")}
        />
        <span id="stall-hint" className="font-normal text-muted-foreground">
          {t("stall.hint")}
        </span>
      </label>
      <label className={field}>
        {t("stall.website")}
        <input
          name="website"
          type="url"
          inputMode="url"
          placeholder="https://"
          maxLength={300}
          className={cn(controlStyles, "h-11")}
        />
      </label>
      {error ? (
        <p role="alert" className="font-semibold text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="self-start">
        <StoreIcon aria-hidden="true" />
        {pending ? t("processing") : t("stall.submit")}
      </Button>
    </form>
  );
}
