"use client";

import { m } from "motion/react";
import { cn } from "cn";

import { duration, ease } from "./tokens";

type SuccessCheckProps = {
  /** Accessible text, e.g. t("roadmap.taskDone"). Announced politely. */
  label: string;
  className?: string;
};

/** Circle and tick that draw in over 500ms. Uses currentColor (text-success by default). */
export function SuccessCheck({ label, className }: SuccessCheckProps) {
  return (
    <span role="status" className={cn("inline-flex text-success", className)}>
      <svg viewBox="0 0 52 52" className="size-full" aria-hidden="true" fill="none">
        <m.circle
          cx="26"
          cy="26"
          r="23"
          stroke="currentColor"
          strokeWidth="3"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: duration.success, ease }}
        />
        <m.path
          d="M15 27 L23 35 L38 18"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: duration.success * 0.6, ease, delay: duration.success * 0.4 }}
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
