"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CalendarXIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ActionState } from "@/server/actions/account";
import { cancelTicket } from "@/server/actions/rsvp";

type Props = {
  ticketId: string;
  status: "confirmed" | "waitlisted" | "reserved";
  /** Party size on the ticket (festival group tickets), shown in the confirmation. */
  quantity?: number;
};

/**
 * Un-RSVP with an inline two-step confirmation (no browser dialog): one click opens the
 * confirmation, focus moves to it, Escape or "Keep my place" closes it. The server re-checks
 * ownership, timing and check-in, so the button alone decides nothing.
 */
export function UnrsvpButton({ ticketId, status, quantity = 1 }: Props) {
  const t = useTranslations("unrsvp");
  const [open, setOpen] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, form) => {
    const result = await cancelTicket(prev, form);
    if (result?.ok) toast.success(t(`done.${result.message ?? "cancelled"}`));
    return result;
  }, null);

  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  const waitlist = status === "waitlisted";
  if (!open) {
    return (
      <Button
        ref={openRef}
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="self-start"
        data-testid="unrsvp-open"
      >
        <CalendarXIcon aria-hidden="true" />
        {waitlist ? t("openWaitlist") : t("open")}
      </Button>
    );
  }

  const error = state && !state.ok ? t(`errors.${state.message ?? "default"}`) : null;
  return (
    <form
      action={action}
      role="group"
      aria-labelledby={`unrsvp-${ticketId}`}
      className="flex animate-rise flex-col gap-3 rounded-xl border border-line-strong bg-surface p-4"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          requestAnimationFrame(() => openRef.current?.focus());
        }
      }}
      data-testid="unrsvp-confirm"
    >
      <input type="hidden" name="ticketId" value={ticketId} />
      <p id={`unrsvp-${ticketId}`} className="font-heading font-bold text-brand-950">
        {waitlist ? t("titleWaitlist") : t("title", { count: quantity })}
      </p>
      <p className="text-small text-ink">{waitlist ? t("textWaitlist") : t("text")}</p>
      {error ? (
        <p role="alert" className="text-small font-semibold text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          ref={confirmRef}
          type="submit"
          variant="outline"
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {pending ? t("pending") : waitlist ? t("confirmWaitlist") : t("confirm")}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          {t("keep")}
        </Button>
      </div>
    </form>
  );
}
