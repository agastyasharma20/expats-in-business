import { defineRouting } from "next-intl/routing";

// Supported UI locales. pl and uk fall back to en until Milestone 15.
export const locales = ["en", "pl", "uk"] as const;
export type Locale = (typeof locales)[number];

const FALLBACK_LOCALE: Locale = "en";

export function resolveDefaultLocale(value: string | undefined): Locale {
  return locales.find((locale) => locale === value) ?? FALLBACK_LOCALE;
}

export const routing = defineRouting({
  locales,
  defaultLocale: resolveDefaultLocale(process.env.DEFAULT_LOCALE),
  localePrefix: "as-needed",
});
