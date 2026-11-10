import { useTranslations } from "next-intl";

export const MAIN_CONTENT_ID = "main-content";

/** First focusable element on every page: jumps keyboard users past the header. */
export function SkipLink() {
  const t = useTranslations("common");
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only z-50 rounded-lg bg-surface px-4 py-3 font-semibold text-brand-950 shadow-raised focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      {t("skipToContent")}
    </a>
  );
}
