import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";

import en from "@/messages/en.json";

import { routing } from "./routing";

type Messages = typeof en;

async function loadMessages(locale: string): Promise<Messages> {
  if (locale === "en") return en;
  // Other locales are merged over English so missing keys fall back to en.
  const localeMessages = (await import(`@/messages/${locale}.json`)).default as Partial<Messages>;
  return { ...en, ...localeMessages };
}

/**
 * The locale comes from an explicit argument (e.g. getTranslations({ locale })) or from the
 * `[locale]` root param via next/root-params. Reading the root param instead of awaiting `params`
 * in every page keeps client navigations instant (no URL data outside Suspense) and replaces
 * next-intl's deprecated setRequestLocale().
 */
export default getRequestConfig(async ({ locale: explicit }) => {
  const requested = explicit ?? (await rootLocale());
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return { locale, messages: await loadMessages(locale) };
});
