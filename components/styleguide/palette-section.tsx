import { useTranslations } from "next-intl";

import { colorTokenNames, colorTokens } from "@/lib/design/tokens";

import { StyleguideSection } from "./section";

// Swatches use the CSS variables, never literal colour values.
export function PaletteSection() {
  const t = useTranslations("styleguide");

  return (
    <StyleguideSection id="palette" title={t("sections.palette")}>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {colorTokenNames.map((token) => (
          <li
            key={token}
            className="flex items-center gap-4 rounded-xl border border-line bg-surface p-3"
          >
            <span
              aria-hidden="true"
              className="size-14 shrink-0 rounded-lg border border-line"
              style={{ backgroundColor: `var(--${token})` }}
            />
            <span className="flex min-w-0 flex-col">
              <span className="font-heading font-bold text-brand-950">{token}</span>
              <code className="text-small text-ink">{colorTokens[token]}</code>
              <span className="text-small text-muted-foreground">{t(`tokens.${token}`)}</span>
            </span>
          </li>
        ))}
      </ul>
    </StyleguideSection>
  );
}
