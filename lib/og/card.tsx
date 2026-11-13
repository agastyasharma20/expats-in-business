import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

import { colorTokens } from "@/lib/design/tokens";

export const OG_SIZE = { width: 1200, height: 630 };

type Card = {
  eyebrow: string;
  title: string;
  /** Up to three short lines under the title (date, venue, price). */
  details: string[];
  badge?: string;
  footer: string;
};

let monogram: string | undefined;

/**
 * Branded 1200×630 social card (Deep Teal, white monogram, ember accent line). Shared by the
 * homepage, session and festival images so every shared link looks the same.
 */
export async function renderCard({ eyebrow, title, details, badge, footer }: Card) {
  monogram ??= `data:image/png;base64,${(
    await readFile(path.join(process.cwd(), "public", "brand", "eib-monogram.png"))
  ).toString("base64")}`;
  const long = title.length > 48;

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
        borderBottom: `16px solid ${colorTokens["ember-500"]}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain img */}
        <img src={monogram} width={96} height={96} alt="" />
        {badge ? (
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 700,
              padding: "10px 22px",
              borderRadius: 999,
              background: colorTokens["brand-100"],
              color: colorTokens["brand-950"],
            }}
          >
            {badge}
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div
          style={{
            fontSize: 26,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: colorTokens["brand-100"],
          }}
        >
          {eyebrow}
        </div>
        <div style={{ fontSize: long ? 56 : 68, fontWeight: 700, lineHeight: 1.1, maxWidth: 1040 }}>
          {title}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          {details.slice(0, 3).map((line) => (
            <div key={line} style={{ fontSize: 30, color: colorTokens["on-dark-muted"] }}>
              {line}
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 26, color: colorTokens["on-dark-muted"] }}>{footer}</div>
    </div>,
    OG_SIZE,
  );
}
