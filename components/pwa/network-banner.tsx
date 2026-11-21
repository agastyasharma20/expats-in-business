"use client";

import { useEffect, useState } from "react";
import { CircleCheckIcon, WifiOffIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/lib/i18n/navigation";

type Status = "online" | "offline" | "restored";

/**
 * A small pill at the top of the screen: slides in when the connection drops (with a link to the
 * saved tickets) and confirms when it comes back. The live region is always in the page so screen
 * readers announce the change.
 */
export function NetworkBanner() {
  const t = useTranslations("pwa.network");
  const [status, setStatus] = useState<Status>("online");

  useEffect(() => {
    let timer: number | undefined;
    const goOffline = () => {
      window.clearTimeout(timer);
      setStatus("offline");
    };
    const goOnline = () => {
      setStatus((current) => (current === "offline" ? "restored" : current));
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setStatus("online"), 3200);
    };
    // Deferred so the first render matches the server's.
    const initial = window.setTimeout(() => {
      if (!navigator.onLine) goOffline();
    }, 0);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.clearTimeout(initial);
      window.clearTimeout(timer);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      data-print-hide
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-[max(0.5rem,env(safe-area-inset-top))]"
    >
      {status === "offline" ? (
        <div className="pointer-events-auto flex animate-sheet-down items-center gap-3 rounded-pill bg-brand-950 py-1.5 pr-2 pl-4 text-small text-on-dark shadow-raised">
          <WifiOffIcon aria-hidden="true" className="size-4 shrink-0" />
          <span className="font-semibold">{t("offline")}</span>
          <Link
            href="/offline"
            className="inline-flex min-h-11 items-center rounded-pill px-3 font-semibold underline underline-offset-4 hover:bg-brand-800"
          >
            {t("savedTickets")}
          </Link>
        </div>
      ) : null}
      {status === "restored" ? (
        <div className="pointer-events-auto flex animate-sheet-down items-center gap-2 rounded-pill border border-success/40 bg-success-50 px-4 py-2.5 text-small font-semibold text-success shadow-raised">
          <CircleCheckIcon aria-hidden="true" className="size-4 shrink-0" />
          {t("online")}
        </div>
      ) : null}
    </div>
  );
}
