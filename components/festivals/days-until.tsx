"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * "in 21 days" / "today", computed in the browser so prerendered pages (header, homepage) never
 * read the clock on the server. Renders an empty placeholder of the same height until mounted.
 */
export function DaysUntil({ iso, className }: { iso: string; className?: string }) {
  const t = useTranslations("spotlight");
  const [days, setDays] = useState<number | null>(null);
  useEffect(() => {
    const update = () =>
      setDays(Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)));
    const first = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 3_600_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [iso]);
  if (days === null) return <span className={className} aria-hidden="true" />;
  return <span className={className}>{days ? t("inDays", { count: days }) : t("today")}</span>;
}
