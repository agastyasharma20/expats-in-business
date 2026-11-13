"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(s / 86_400),
    hours: Math.floor((s % 86_400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
  };
}

/**
 * Time until the festival opens. Renders nothing on the server (no hydration mismatch, no CLS:
 * the slot keeps its height) and updates once a minute; screen readers get one static label.
 */
export function Countdown({ startsAt }: { startsAt: string }) {
  const t = useTranslations("festival");
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 60_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);
  const target = new Date(startsAt).getTime();
  const left = now === null ? null : parts(target - now);
  const units = left
    ? ([
        ["days", left.days],
        ["hours", left.hours],
        ["minutes", left.minutes],
      ] as const)
    : null;

  return (
    <div role="timer" className="flex min-h-20 items-end gap-3" aria-label={t("countdownLabel")}>
      {units && target > (now ?? 0)
        ? units.map(([unit, value]) => (
            <span
              key={unit}
              className="flex min-w-16 animate-rise flex-col items-center rounded-xl bg-on-dark/10 px-3 py-2"
            >
              <span className="font-heading text-h2 font-bold text-on-dark tabular-nums">
                {value}
              </span>
              <span className="text-small text-on-dark-muted">{t(`units.${unit}`)}</span>
            </span>
          ))
        : null}
    </div>
  );
}
