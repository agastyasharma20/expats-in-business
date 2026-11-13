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
  /**
   * Show the toast as soon as the action resolves instead of after re-render. Use it where the
   * refresh moves or removes this button (a card changing column), which would lose the message.
   * Needs JavaScript, so the default keeps the no-JS form behaviour.
   */
  toastOnResolve?: boolean;
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
  toastOnResolve = false,
  ...aria
}: ActionButtonProps) {
  const notify = (result: ActionState) => {
    if (!result) return;
    if (result.ok) {
      const text = toasts?.[result.message ?? ""];
      if (text) toast.success(text);
    } else if (errorText) toast.error(errorText);
  };
  const [state, formAction, pending] = useActionState(
    toastOnResolve
      ? async (prev: ActionState, form: FormData) => {
          const result = await action(prev, form);
          notify(result);
          return result;
        }
      : action,
    null,
  );
  const shown = useRef<ActionState>(null);
  useEffect(() => {
    if (toastOnResolve || !state || state === shown.current) return;
    shown.current = state;
    notify(state);
    // notify only reads props that are stable for one rendered button
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, toastOnResolve]);

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
