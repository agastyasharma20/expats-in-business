"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

type StatCounterProps = {
  value: number;
  /** Shown after the number, e.g. "+" for "35+". */
  suffix?: string;
  className?: string;
};

/**
 * Counts up to `value` over 1.2s when it scrolls into view. The final value is always in the HTML
 * (no-JS, screen readers, crawlers); an invisible copy reserves the width so nothing shifts.
 */
export function StatCounter({ value, suffix = "", className }: StatCounterProps) {
  const locale = useLocale();
  const format = (n: number) => new Intl.NumberFormat(locale).format(Math.round(n)) + suffix;
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (!inView || reduced) return;
    const controls = animate(0, value, {
      duration: 1.2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setShown(latest),
    });
    return () => controls.stop();
  }, [inView, reduced, value]);

  return (
    <span ref={ref} className={cn("relative inline-grid tabular-nums", className)}>
      <span className="sr-only">{format(value)}</span>
      {/* Reserves the final width; the animated copy sits on top in the same grid cell. */}
      <span aria-hidden="true" className="invisible col-start-1 row-start-1">
        {format(value)}
      </span>
      <span aria-hidden="true" data-testid="stat-counter-value" className="col-start-1 row-start-1">
        {format(shown)}
      </span>
    </span>
  );
}
