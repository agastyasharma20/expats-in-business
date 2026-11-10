"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";

import { cn } from "@/lib/utils";

import { duration } from "./tokens";

type StatCounterProps = {
  value: number;
  /** Shown after the number, e.g. "+" for "35+". */
  suffix?: string;
  className?: string;
};

/** ease-out quart, close to the brand curve cubic-bezier(0.22, 1, 0.36, 1). */
const easeOut = (t: number) => 1 - (1 - t) ** 4;

/**
 * Counts up to `value` over 1.2s when it scrolls into view. No animation library: the homepage
 * stays light. The final value is always in the HTML (no-JS, screen readers, crawlers); an
 * invisible copy reserves the width so nothing shifts; prefers-reduced-motion skips the count.
 */
export function StatCounter({ value, suffix = "", className }: StatCounterProps) {
  const locale = useLocale();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const format = (n: number) => new Intl.NumberFormat(locale).format(Math.round(n)) + suffix;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const node = valueRef.current;
    if (!wrapper || !node || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const formatter = new Intl.NumberFormat(locale);
    const raf =
      window.requestAnimationFrame?.bind(window) ??
      ((cb: FrameRequestCallback) => window.setTimeout(() => cb(performance.now()), 16));
    let frame = 0;
    let cancelled = false;

    const run = () => {
      const total = duration.counter * 1000;
      // Use the frame clock for both ends: rAF timestamps can be earlier than performance.now(),
      // which would make progress negative and flash negative numbers.
      let start: number | undefined;
      const step = (now: number) => {
        if (cancelled) return;
        start ??= now;
        const progress = Math.min(Math.max((now - start) / total, 0), 1);
        node.textContent = formatter.format(Math.round(value * easeOut(progress))) + suffix;
        if (progress < 1) frame = raf(step);
      };
      frame = raf(step);
    };

    // Starts as soon as the first pixel is visible, so the reset to 0 happens at the screen edge.
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        run();
      }
    });
    observer.observe(wrapper);

    return () => {
      cancelled = true;
      observer.disconnect();
      if (frame) window.cancelAnimationFrame?.(frame);
    };
  }, [locale, suffix, value]);

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
