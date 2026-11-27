"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { DownloadIcon, WifiOffIcon, XIcon, ZapIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  getInstallDialogOpen,
  getInstallState,
  getServerInstallDialogOpen,
  getServerInstallState,
  startInstall,
  subscribeInstall,
  subscribeInstallDialog,
} from "@/lib/pwa/install-store";

import monogram from "@/public/brand/eib-monogram.png";

const DISMISSED_KEY = "eib:install-dismissed";
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;
/** Wait a little so the card never competes with the first impression of a page. */
const SHOW_AFTER_MS = 8_000;

function snoozed(): boolean {
  try {
    const at = Number(window.localStorage.getItem(DISMISSED_KEY));
    return at > 0 && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

/**
 * A friendly, dismissible card that invites people to install the app. It appears for everyone who
 * has not installed (every phone, tablet and computer), never inside the installed app, and stays
 * away for 30 days after "Not now". "Install app" installs in one tap where the browser allows it
 * and otherwise opens the dialog with the steps for the device. Escape closes it.
 */
export function InstallPrompt() {
  const t = useTranslations("pwa.install");
  const install = useSyncExternalStore(subscribeInstall, getInstallState, getServerInstallState);
  const dialogOpen = useSyncExternalStore(
    subscribeInstallDialog,
    getInstallDialogOpen,
    getServerInstallDialogOpen,
  );
  const [ready, setReady] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (install.standalone || snoozed()) return;
    const timer = window.setTimeout(() => setReady(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [install.standalone]);

  useEffect(() => {
    if (!ready || closed) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !getInstallDialogOpen()) dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, closed]);

  function dismiss() {
    setClosed(true);
    try {
      window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // Storage blocked: the card simply returns next visit.
    }
  }

  async function accept() {
    setClosed(true);
    await startInstall();
  }

  if (!ready || closed || install.standalone || dialogOpen) return null;

  return (
    <aside
      aria-labelledby="install-title"
      data-print-hide
      data-testid="install-prompt"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md animate-sheet-up flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-raised sm:right-6 sm:bottom-6 sm:left-auto sm:mx-0"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("close")}
        className="absolute top-1 right-1 flex size-11 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-brand-50 hover:text-brand-950"
      >
        <XIcon aria-hidden="true" className="size-5" />
      </button>
      <div className="flex items-center gap-4 pr-8">
        <Image
          src={monogram}
          alt=""
          width={56}
          height={56}
          className="float-soft size-14 shrink-0 rounded-2xl shadow-card"
        />
        <div className="flex flex-col gap-1">
          <h2 id="install-title" className="text-h3 leading-tight">
            {t("title")}
          </h2>
          <p className="text-small text-muted-foreground">{t("lead")}</p>
        </div>
      </div>
      <ul className="flex flex-col gap-2 text-small">
        <li className="flex items-center gap-3">
          <WifiOffIcon aria-hidden="true" className="size-4 shrink-0 text-brand-950" />
          {t("benefitOffline")}
        </li>
        <li className="flex items-center gap-3">
          <ZapIcon aria-hidden="true" className="size-4 shrink-0 text-brand-950" />
          {t("benefitFast")}
        </li>
      </ul>
      <div className="flex flex-wrap gap-3">
        <Button onClick={accept} className="flex-1" data-testid="install-prompt-action">
          <DownloadIcon aria-hidden="true" />
          {t("action")}
        </Button>
        <Button variant="ghost" onClick={dismiss}>
          {t("later")}
        </Button>
      </div>
    </aside>
  );
}
