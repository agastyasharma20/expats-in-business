import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import en from "@/messages/en.json";

import { routing } from "./routing";

type Messages = typeof en;

async function loadMessages(locale: string): Promise<Messages> {
  if (locale === "en") return en;
  // Other locales are merged over English so missing keys fall back to en.
  const localeMessages = (await import(`@/messages/${locale}.json`)).default as Partial<Messages>;
  return { ...en, ...localeMessages };
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return { locale, messages: await loadMessages(locale) };
});
