"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { startInstallListeners } from "@/lib/pwa/install-store";

/**
 * Registers the service worker (production builds only: in development a worker would serve
 * stale pages) and offers a one-tap reload when a new version is waiting.
 */
export function PwaRegistrar() {
  const t = useTranslations("pwa.update");

  useEffect(() => startInstallListeners(), []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const container = navigator.serviceWorker;
    // Without a controller the first install is not an update, so it must not reload the page.
    const hadController = Boolean(container.controller);
    let reloading = false;
    let refreshTimer: number | undefined;

    const announce = (waiting: ServiceWorker) => {
      toast(t("title"), {
        id: "pwa-update",
        description: t("description"),
        duration: Number.POSITIVE_INFINITY,
        action: {
          label: t("action"),
          onClick: () => waiting.postMessage({ type: "SKIP_WAITING" }),
        },
      });
    };

    const onControllerChange = () => {
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    };
    container.addEventListener("controllerchange", onControllerChange);

    let cancelled = false;
    void container
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        if (cancelled) return;
        if (registration.waiting && container.controller) announce(registration.waiting);
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          installing?.addEventListener("statechange", () => {
            if (installing.state === "installed" && container.controller) announce(installing);
          });
        });
        // Look for a new version when the app comes back to the foreground, and hourly.
        const check = () => void registration.update().catch(() => undefined);
        const onVisible = () => {
          if (document.visibilityState === "visible") check();
        };
        document.addEventListener("visibilitychange", onVisible);
        refreshTimer = window.setInterval(check, 60 * 60 * 1000);
        cleanup = () => document.removeEventListener("visibilitychange", onVisible);
      })
      .catch(() => undefined);

    let cleanup = () => {};
    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
      cleanup();
      container.removeEventListener("controllerchange", onControllerChange);
    };
  }, [t]);

  return null;
}
