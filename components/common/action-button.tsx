"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";
import type { ActionState } from "@/server/actions/account";

type ActionButtonProps = {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  /** Hidden fields sent with the click. The server re-checks every one of them. */
  fields: Record<string, string>;
  children: React.ReactNode;
  /** Toasts keyed by the action's message code ("" = success without a code). */
  toasts?: Record<string, string>;
  errorText?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  "aria-label"?: string;
  "aria-pressed"?: boolean;
  testId?: string;
};

/** One-click server action as a real form (works without JavaScript); pending state and toasts. */
export function ActionButton({
  action,
  fields,
  children,
  toasts,
  errorText,
  variant = "outline",
  size = "sm",
  className,
  testId,
  ...aria
}: ActionButtonProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const shown = useRef<ActionState>(null);
  useEffect(() => {
    if (!state || state === shown.current) return;
    shown.current = state;
    if (state.ok) {
      const text = toasts?.[state.message ?? ""];
      if (text) toast.success(text);
    } else if (errorText) toast.error(errorText);
  }, [state, toasts, errorText]);

  return (
    <form action={formAction} className="inline-flex">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button
        type="submit"
        variant={variant}
        size={size}
        disabled={pending}
        aria-busy={pending || undefined}
        className={className}
        data-testid={testId}
        {...aria}
      >
        {children}
      </Button>
    </form>
  );
}
