import { useTranslations } from "next-intl";

import { StyleguideSection } from "./section";

// Sizes mirror the --text-* tokens in app/globals.css.
const scale = [
  {
    key: "display",
    className: "text-display-sm md:text-display font-heading font-bold text-brand-950",
    size: "56 (36)",
    lineHeight: "64 (44)",
  },
  {
    key: "h1",
    className: "text-h1 font-heading font-bold text-brand-950",
    size: "40",
    lineHeight: "48",
  },
  {
    key: "h2",
    className: "text-h2 font-heading font-bold text-brand-950",
    size: "32",
    lineHeight: "40",
  },
  {
    key: "h3",
    className: "text-h3 font-heading font-bold text-brand-950",
    size: "24",
    lineHeight: "32",
  },
  { key: "body", className: "text-body text-ink max-w-prose", size: "16", lineHeight: "26" },
  { key: "small", className: "text-small text-muted-foreground", size: "14", lineHeight: "22" },
] as const;

export function TypeSection() {
  const t = useTranslations("styleguide");

  return (
    <StyleguideSection id="type" title={t("sections.type")} intro={t("type.fonts")}>
      <p className="eyebrow text-brand-700">{t("type.eyebrow")}</p>
      <dl className="flex flex-col gap-6">
        {scale.map((item) => (
          <div key={item.key} className="flex flex-col gap-1 border-b border-line pb-4">
            <dt className="text-small font-semibold text-muted-foreground">
              {t("type.spec", { name: item.key, size: item.size, lineHeight: item.lineHeight })}
            </dt>
            {/* Shown as styled text, not real headings, to keep the page outline clean. */}
            <dd className={item.className}>{t(`type.${item.key}`)}</dd>
          </div>
        ))}
      </dl>
    </StyleguideSection>
  );
}
