"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { routing } from "@/lib/i18n/routing";

/** The public address of the install page in the visitor's language. */
export function installUrl(locale: string): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return `${window.location.origin}${prefix}/install`;
}

/**
 * QR code that opens the install page on a phone. Built in the browser (the library loads only
 * when this renders) and coloured from the design tokens, so no colour is hard-coded.
 */
export function InstallQr({ size = 176 }: { size?: number }) {
  const t = useTranslations("pwa.install");
  const locale = useLocale();
  const [image, setImage] = useState<{ src: string; url: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = installUrl(locale);
    const css = getComputedStyle(document.documentElement);
    import("qrcode").then(async ({ default: QRCode }) => {
      const src = await QRCode.toDataURL(url, {
        width: size * 2,
        margin: 1,
        errorCorrectionLevel: "M",
        color: {
          dark: css.getPropertyValue("--brand-950").trim() || "black",
          light: css.getPropertyValue("--surface").trim() || "white",
        },
      });
      if (!cancelled) setImage({ src, url });
    });
    return () => {
      cancelled = true;
    };
  }, [locale, size]);

  return (
    <figure className="flex flex-col items-center gap-2" data-testid="install-qr">
      <div
        className="flex items-center justify-center rounded-xl border border-line bg-surface p-2"
        style={{ width: size + 18, height: size + 18 }}
      >
        {image ? (
          // A data URL: next/image adds nothing here.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.src}
            alt={t("qrAlt", { url: image.url })}
            width={size}
            height={size}
            className="size-full"
          />
        ) : null}
      </div>
      <figcaption className="max-w-48 text-center text-small text-muted-foreground">
        {t("qrCaption")}
      </figcaption>
    </figure>
  );
}
