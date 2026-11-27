"use client";

import { useSyncExternalStore } from "react";
import { DownloadIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button, type ButtonProps } from "@/components/ui/button";
import {
  getInstallState,
  getServerInstallState,
  startInstall,
  subscribeInstall,
} from "@/lib/pwa/install-store";
import { cn } from "@/lib/utils";

/**
 * "Install app", visible on every page for every visitor who has not installed yet. One tap installs
 * where the browser allows it; everywhere else it opens the dialog with the steps for this device.
 * Hidden only inside the installed app. It is a real button that always does something.
 */
export function InstallButton({
  className,
  iconOnlyOnSmall = false,
  variant = "outline",
  size = "sm",
}: {
  className?: string;
  /** Header use: show only the icon (with an accessible name) on narrow screens. */
  iconOnlyOnSmall?: boolean;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const t = useTranslations("pwa.install");
  const install = useSyncExternalStore(subscribeInstall, getInstallState, getServerInstallState);
  if (install.standalone) return null;
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={() => void startInstall()}
      className={className}
      data-testid="install-button"
    >
      <DownloadIcon aria-hidden="true" />
      <span className={cn(iconOnlyOnSmall && "sr-only sm:not-sr-only")}>{t("action")}</span>
    </Button>
  );
}
