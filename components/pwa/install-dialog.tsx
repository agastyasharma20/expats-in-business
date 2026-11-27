"use client";

import { useSyncExternalStore } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getInstallDialogOpen,
  getServerInstallDialogOpen,
  restoreInstallFocus,
  setInstallDialogOpen,
  subscribeInstallDialog,
} from "@/lib/pwa/install-store";

import monogram from "@/public/brand/eib-monogram.png";

import { InstallGuide } from "./install-guide";

/**
 * The install popup. Every "Install app" button opens it (or the browser's own dialog where that
 * works). Radix handles the modal behaviour: focus moves in, is trapped, Escape closes it and focus
 * returns to the button that opened it. Mounted once in the app shell.
 */
export function InstallDialog() {
  const t = useTranslations("pwa.install");
  const open = useSyncExternalStore(
    subscribeInstallDialog,
    getInstallDialogOpen,
    getServerInstallDialogOpen,
  );

  return (
    <Dialog open={open} onOpenChange={setInstallDialogOpen}>
      <DialogContent
        data-testid="install-dialog"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreInstallFocus();
        }}
        className="max-h-[92dvh] gap-5 overflow-y-auto sm:max-w-lg"
      >
        <DialogHeader className="flex-row items-center gap-4 pr-10">
          <Image
            src={monogram}
            alt=""
            width={64}
            height={64}
            className="float-soft size-16 shrink-0 animate-pop rounded-2xl shadow-card"
          />
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-h2 leading-tight">{t("title")}</DialogTitle>
            <DialogDescription>{t("lead")}</DialogDescription>
          </div>
        </DialogHeader>
        <InstallGuide />
      </DialogContent>
    </Dialog>
  );
}
