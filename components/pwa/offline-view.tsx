"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { RefreshCwIcon, TicketIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { parseSavedTickets, SAVED_TICKETS_KEY } from "@/lib/pwa/private-cache";

function subscribeStorage(listener: () => void) {
  window.addEventListener("storage", listener);
  return () => window.removeEventListener("storage", listener);
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(SAVED_TICKETS_KEY);
  } catch {
    return null;
  }
}

/**
 * The interactive half of the offline page: retry, automatic reload when the connection returns,
 * and the tickets saved on this device (plain links: a saved ticket opens from the cache).
 */
export function OfflineView() {
  const t = useTranslations("pwa.offline");
  // undefined on the server and during hydration, so the first paint matches.
  const raw = useSyncExternalStore(subscribeStorage, readRaw, () => undefined);
  const tickets = useMemo(() => (raw === undefined ? null : parseSavedTickets(raw)), [raw]);
  const [reconnected, setReconnected] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    const onOnline = () => {
      setReconnected(true);
      timer = window.setTimeout(() => window.location.reload(), 900);
    };
    window.addEventListener("online", onOnline);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return (
    <div className="flex w-full max-w-xl flex-col gap-10">
      <div className="flex flex-col items-center gap-3">
        <Button size="lg" onClick={() => window.location.reload()}>
          <RefreshCwIcon aria-hidden="true" />
          {t("retry")}
        </Button>
        <p role="status" className="min-h-6 text-small text-muted-foreground">
          {reconnected ? t("reconnected") : t("waiting")}
        </p>
      </div>

      <section aria-labelledby="saved-tickets" className="flex flex-col gap-4">
        <h2 id="saved-tickets" className="text-h3">
          {t("savedTitle")}
        </h2>
        {tickets === null ? (
          <Skeleton className="h-24 w-full rounded-2xl" />
        ) : tickets.length === 0 ? (
          <EmptyState
            icon={TicketIcon}
            headingLevel="h3"
            title={t("savedEmptyTitle")}
            description={t("savedEmptyText")}
            action={
              <Button variant="outline" onClick={() => window.location.reload()}>
                {t("retry")}
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {tickets.map((ticket) => (
              <li key={ticket.path}>
                {/* A plain anchor on purpose: offline, the service worker answers the page request. */}
                <a
                  href={ticket.path}
                  className="flex min-h-16 items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card transition-transform duration-(--duration-micro) ease-(--ease-brand) hover:-translate-y-0.5 active:translate-y-0"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-950">
                    <TicketIcon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-heading font-bold text-brand-950">
                      {ticket.title}
                    </span>
                    <span className="text-small text-muted-foreground">{ticket.when}</span>
                  </span>
                  <span className="ml-auto text-small font-semibold text-brand-700">
                    {t("openTicket")}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
