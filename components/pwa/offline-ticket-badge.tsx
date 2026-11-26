"use client";

import { useEffect, useState } from "react";
import { CircleCheckIcon, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";

import { isTicketSaved, saveTicketOffline } from "@/lib/pwa/private-cache";

type OfflineTicketBadgeProps = {
  title: string;
  startsAt: string;
  endsAt: string;
  /** Start time formatted in the chapter's time zone, for the offline page's list. */
  when: string;
};

/**
 * Saves the member's confirmed ticket on this device (QR code included) and says so, so the
 * ticket still opens at the door without signal. Shows nothing where the browser cannot cache.
 */
export function OfflineTicketBadge({ title, startsAt, endsAt, when }: OfflineTicketBadgeProps) {
  const t = useTranslations("pwa");
  const [state, setState] = useState<"saving" | "saved" | "unavailable">("saving");

  useEffect(() => {
    let active = true;
    const path = window.location.pathname;
    void (async () => {
      // Always refresh the copy: the ticket may have changed (for example a paid upgrade).
      const saved = await saveTicketOffline({ path, title, startsAt, endsAt, when });
      const ok = saved || (await isTicketSaved(path));
      if (active) setState(ok ? "saved" : "unavailable");
    })();
    return () => {
      active = false;
    };
  }, [title, startsAt, endsAt, when]);

  if (state === "unavailable") return null;
  return (
    <p
      role="status"
      data-print-hide
      data-testid="offline-ticket-status"
      className="flex items-center gap-2 self-center rounded-pill bg-brand-50 px-4 py-2 text-small text-brand-950"
    >
      {state === "saving" ? (
        <>
          <Loader2Icon aria-hidden="true" className="size-4 animate-spin" />
          {t("ticketSaving")}
        </>
      ) : (
        <>
          <CircleCheckIcon aria-hidden="true" className="size-4 animate-pop text-success" />
          {t("ticketSaved")}
        </>
      )}
    </p>
  );
}
