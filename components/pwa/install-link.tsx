"use client";

import { useSyncExternalStore } from "react";
import { DownloadIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  getInstallState,
  getServerInstallState,
  promptInstall,
  subscribeInstall,
} from "@/lib/pwa/install-store";

/**
 * "Install the app" button for the footer. Rendered only when the browser can install the app
 * right now, so it is never a dead control (CLAUDE.md rule 7).
 */
export function InstallLink({ className }: { className?: string }) {
  const t = useTranslations("pwa.install");
  const install = useSyncExternalStore(subscribeInstall, getInstallState, getServerInstallState);
  if (!install.canPrompt || install.standalone) return null;
  return (
    <button type="button" onClick={() => void promptInstall()} className={className}>
      <DownloadIcon aria-hidden="true" className="size-4" />
      {t("footerLink")}
    </button>
  );
}
