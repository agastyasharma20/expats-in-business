"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import type { PulseSnapshot } from "@/lib/events/checkin";
import { cn } from "@/lib/utils";

/** Big-screen live view for the room (projector or TV). Server-Sent Events, auto-reconnecting. */
export function PulseScreen({ slug, initial }: { slug: string; initial: PulseSnapshot }) {
  const t = useTranslations("pulse");
  const locale = useLocale();
  const [data, setData] = useState(initial);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const source = new EventSource(`/api/events/${slug}/pulse`);
    source.addEventListener("pulse", (event) => {
      setData(JSON.parse((event as MessageEvent<string>).data) as PulseSnapshot);
      setLive(true);
    });
    source.onerror = () => setLive(false);
    return () => source.close();
  }, [slug]);

  const fill = data.capacity ? Math.min(data.checkedIn / data.capacity, 1) : 0;
  const regions = new Intl.DisplayNames([locale], { type: "region" });
  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(data.at));

  return (
    <div
      className="flex min-h-[80vh] flex-col gap-10 rounded-3xl bg-brand-950 p-8 text-on-dark md:p-12"
      data-testid="pulse"
    >
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-h2 text-on-dark md:text-display-sm">{data.title}</h1>
        <span
          className="flex items-center gap-2 rounded-full border border-on-dark-muted px-4 py-1 font-semibold"
          aria-live="polite"
        >
          <span
            aria-hidden="true"
            className={cn("size-3 rounded-full", live ? "bg-ember-500" : "bg-on-dark-muted")}
          />
          {live ? t("live") : t("reconnecting")}
        </span>
      </header>
      <div className="grid flex-1 gap-8 md:grid-cols-3">
        <div className="flex flex-col justify-center gap-2 md:col-span-2">
          <p className="eyebrow text-on-dark-muted">{t("checkedIn")}</p>
          <p
            className="font-heading text-[clamp(5rem,16vw,12rem)] leading-none font-bold"
            data-testid="pulse-count"
          >
            {data.checkedIn}
          </p>
          <p className="text-lg text-on-dark-muted">
            {t("ofConfirmed", { confirmed: data.confirmed })}
          </p>
          <div
            className="mt-6 h-4 overflow-hidden rounded-full bg-on-dark/15"
            role="img"
            aria-label={`${t("capacity")}: ${Math.round(fill * 100)}%`}
          >
            <div
              className="h-full origin-left rounded-full bg-brand-100 transition-transform duration-500"
              style={{ transform: `scaleX(${fill})` }}
            />
          </div>
          <p className="text-small text-on-dark-muted">
            {t("capacity")}: {Math.round(fill * 100)}%
          </p>
        </div>
        <div className="flex flex-col gap-6">
          <div>
            <p className="eyebrow text-on-dark-muted">{t("recent")}</p>
            <p className="font-heading text-h1 font-bold text-on-dark">+{data.lastTenMinutes}</p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="eyebrow text-on-dark-muted">{t("origins")}</p>
            {data.origins.length ? (
              <ul className="flex flex-col gap-1 text-lg">
                {data.origins.map((o) => (
                  <li key={o.code} className="flex justify-between gap-4">
                    <span>{regions.of(o.code)}</span>
                    <span className="font-bold">{o.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-small text-on-dark-muted">{t("originsHidden")}</p>
            )}
          </div>
        </div>
      </div>
      <p className="text-small text-on-dark-muted">{t("updated", { time })}</p>
    </div>
  );
}
