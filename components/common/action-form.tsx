"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/server/actions/account";

type ActionFormProps = {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel: string;
  pendingLabel: string;
  /** Toast on success; "{value}" is replaced with the action's message (e.g. the email address). */
  successText?: string;
  /** Inline error per action message code, plus "default". */
  errorTexts: Record<string, string>;
  submitVariant?: ButtonProps["variant"];
  className?: string;
  testId?: string;
};

/** Server-action form: fields come in as (server-rendered) children; pending state, errors and a toast. */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel,
  successText,
  errorTexts,
  submitVariant,
  className,
  testId,
}: ActionFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const shown = useRef<ActionState>(null);

  useEffect(() => {
    if (state && state !== shown.current && state.ok && successText) {
      toast.success(successText.replace("{value}", state.message ?? ""));
    }
    shown.current = state;
  }, [state, successText]);

  const error = state && !state.ok ? (errorTexts[state.message ?? ""] ?? errorTexts.default) : null;

  return (
    <form action={formAction} className={cn("flex flex-col gap-5", className)} data-testid={testId}>
      {children}
      {error ? (
        <p role="alert" className="text-small font-semibold text-danger">
          {error}
        </p>
      ) : null}
      <div>
        <Button
          type="submit"
          variant={submitVariant}
          disabled={pending}
          aria-busy={pending || undefined}
        >
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}

/** Native checkbox styled to the tokens (44px row target). */
export function Toggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-ink">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-5 accent-[var(--brand-700)]"
      />
      {label}
    </label>
  );
}
