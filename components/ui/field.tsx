import * as React from "react";
import { cn } from "@/lib/utils";

import { Label } from "./label";

type ControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
};

type FieldProps = {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  /** Text shown next to the label of required fields, e.g. t("common.required"). */
  requiredLabel?: React.ReactNode;
  className?: string;
  children: (props: ControlProps) => React.ReactNode;
};

/**
 * Label + control + hint + error, wired for assistive tech: the control gets aria-describedby for
 * the hint and error, aria-invalid when there is an error, and the error is announced (role="alert").
 */
function Field({
  id,
  label,
  hint,
  error,
  required,
  requiredLabel,
  className,
  children,
}: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div data-slot="field" className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required && requiredLabel ? (
          <span className="font-normal text-muted-foreground">{requiredLabel}</span>
        ) : null}
      </Label>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        "aria-required": required ? true : undefined,
      })}
      {hint ? (
        <p id={hintId} className="text-small text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-small font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { Field, type FieldProps, type ControlProps };
