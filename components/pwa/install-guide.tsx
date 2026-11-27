"use client";

import { useSyncExternalStore } from "react";
import { CheckIcon, CopyIcon, DownloadIcon, ShareIcon, WifiOffIcon, ZapIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  getInstallState,
  getServerInstallState,
  promptInstall,
  subscribeInstall,
} from "@/lib/pwa/install-store";
import { isDesktop } from "@/lib/pwa/platform";
import { cn } from "@/lib/utils";

import { DEVICE_GROUPS, INSTALL_STEPS } from "./install-steps";
import { InstallQr, installUrl } from "./install-qr";

/**
 * Everything a person needs to install the app: a one-tap button where the browser allows it,
 * animated steps for their device, a QR code on computers, a link to share, and every other device.
 * Used inside the install dialog and on the /install page.
 */
export function InstallGuide({ expandAll = false }: { expandAll?: boolean }) {
  const t = useTranslations("pwa.install");
  const locale = useLocale();
  const install = useSyncExternalStore(subscribeInstall, getInstallState, getServerInstallState);
  const steps = INSTALL_STEPS[install.platform];
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(installUrl(locale));
      toast.success(t("linkCopied"));
    } catch {
      toast.error(t("copyFailed"));
    }
  }

  async function shareLink() {
    try {
      await navigator.share({ title: t("title"), text: t("shareText"), url: installUrl(locale) });
    } catch {
      // The person closed the share sheet: nothing to do.
    }
  }

  if (install.standalone) {
    return (
      <p
        role="status"
        className="flex items-center gap-3 rounded-xl bg-brand-50 p-4 font-semibold text-brand-950"
      >
        <CheckIcon aria-hidden="true" className="size-5 shrink-0" />
        {t("alreadyInstalled")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="install-guide">
      <ul className="flex flex-wrap gap-2 text-small font-semibold text-brand-950">
        {[
          { icon: WifiOffIcon, text: t("benefitOffline") },
          { icon: ZapIcon, text: t("benefitFast") },
          { icon: DownloadIcon, text: t("benefitFree") },
        ].map(({ icon: Icon, text }, i) => (
          <li
            key={text}
            style={{ animationDelay: `${i * 60}ms` }}
            className="flex animate-rise items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5"
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {text}
          </li>
        ))}
      </ul>

      {install.canPrompt ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-brand-50 p-4">
          <p className="text-small text-ink">{t("nativeReady")}</p>
          <Button size="lg" onClick={() => void promptInstall()} data-testid="install-now">
            <DownloadIcon aria-hidden="true" />
            {t("installNow")}
          </Button>
        </div>
      ) : null}

      <section aria-labelledby="install-steps-title" className="flex flex-col gap-3">
        <h3 id="install-steps-title" className="text-h3">
          {t("yourDevice")}
          <span className="block text-small font-semibold text-muted-foreground">
            {t(`platforms.${install.platform}`)}
          </span>
        </h3>
        <ol className="flex flex-col gap-2" data-testid="install-steps">
          {steps.map(({ icon: Icon, key }, i) => (
            <li
              key={key}
              style={{ animationDelay: `${120 + i * 90}ms` }}
              className="flex animate-rise items-center gap-3 rounded-xl border border-line bg-surface p-3"
            >
              <span
                aria-hidden="true"
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-950 text-small font-bold text-on-dark"
              >
                {i + 1}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "relative flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-950",
                  i === 0 && "tap-hint",
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="text-ink">{t(`steps.${key}`)}</span>
            </li>
          ))}
        </ol>
      </section>

      {isDesktop(install.platform) ? <InstallQr /> : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={copyLink}>
          <CopyIcon aria-hidden="true" />
          {t("copyLink")}
        </Button>
        {canShare ? (
          <Button variant="outline" onClick={shareLink}>
            <ShareIcon aria-hidden="true" />
            {t("share")}
          </Button>
        ) : null}
      </div>

      <details open={expandAll} className="rounded-xl border border-line bg-surface p-4">
        <summary className="min-h-11 cursor-pointer font-heading font-semibold text-brand-950">
          {t("otherDevices")}
        </summary>
        <div className="mt-3 flex flex-col gap-5">
          {DEVICE_GROUPS.map((group) => (
            <section key={group.id} aria-labelledby={`install-group-${group.id}`}>
              <h4 id={`install-group-${group.id}`} className="text-body font-bold text-brand-950">
                {t(`groups.${group.id}`)}
              </h4>
              <ul className="mt-2 flex flex-col gap-3">
                {group.platforms.map((platform) => (
                  <li key={platform} className="flex flex-col gap-1">
                    <span className="text-small font-semibold text-muted-foreground">
                      {t(`platforms.${platform}`)}
                    </span>
                    <ol className="ml-5 list-decimal text-small text-ink">
                      {INSTALL_STEPS[platform].map(({ key }) => (
                        <li key={key}>{t(`steps.${key}`)}</li>
                      ))}
                    </ol>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </details>
    </div>
  );
}
