"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { useLocale } from "next-intl";

import { cn } from "@/lib/utils";

import { duration, ease } from "./tokens";

type StatCounterProps = {
  value: number;
  /** Shown after the number, e.g. "+" for "35+". */
  suffix?: string;
  className?: string;
};

/**
 * Counts up to `value` over 1.2s when it scrolls into view. The final value is always in the HTML
 * (no-JS, screen readers, crawlers); an invisible copy reserves the width so nothing shifts.
 * The count starts as soon as the first pixel enters the viewport, so the reset to 0 happens at
 * the screen edge rather than in plain sight. Frames are written to the DOM directly (no re-renders).
 */
export function StatCounter({ value, suffix = "", className }: StatCounterProps) {
  const locale = useLocale();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(wrapperRef, { once: true, amount: 0 });
  const reduced = useReducedMotion();
  const format = (n: number) => new Intl.NumberFormat(locale).format(Math.round(n)) + suffix;

  useEffect(() => {
    const node = valueRef.current;
    if (!inView || reduced || !node) return;
    const formatter = new Intl.NumberFormat(locale);
    const controls = animate(0, value, {
      duration: duration.counter,
      ease,
      onUpdate: (latest) => {
        node.textContent = formatter.format(Math.round(latest)) + suffix;
      },
    });
    return () => controls.stop();
  }, [inView, reduced, value, locale, suffix]);

  return (
    <span ref={wrapperRef} className={cn("relative inline-grid tabular-nums", className)}>
      <span className="sr-only">{format(value)}</span>
      {/* Reserves the final width; the animated copy sits on top in the same grid cell. */}
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">
        {format(value)}
      </span>
      <span
        ref={valueRef}
        aria-hidden="true"
        data-testid="stat-counter-value"
        className="col-start-1 row-start-1"
      >
        {format(value)}
      </span>
    </span>
  );
}
