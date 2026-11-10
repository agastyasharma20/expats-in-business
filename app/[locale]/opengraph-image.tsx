import { readFile } from "node:fs/promises";
import path from "node:path";

import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ImageResponse } from "next/og";

import { getFact } from "@/config/facts";
import { colorTokens } from "@/lib/design/tokens";
import { routing } from "@/lib/i18n/routing";

// Social preview for the homepage of each locale (1200×630, Deep Teal, white monogram).
export const alt = "Expats in Business";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Route handlers cannot read next/root-params yet, so the locale comes from params explicitly.
export default async function OpenGraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const requested = (await params).locale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "home" });
  const monogram = await readFile(path.join(process.cwd(), "public", "brand", "eib-monogram.png"));
  const src = `data:image/png;base64,${monogram.toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: colorTokens["brand-950"],
        color: colorTokens["on-dark"],
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain img */}
      <img src={src} width={120} height={120} alt="" />
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            fontSize: 28,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: colorTokens["brand-100"],
          }}
        >
          {t("eyebrow")}
        </div>
        <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1, maxWidth: 980 }}>
          {t("title")}
        </div>
      </div>
      <div style={{ fontSize: 28, color: colorTokens["on-dark-muted"] }}>
        {getFact("org.name").value}
      </div>
    </div>,
    size,
  );
}
