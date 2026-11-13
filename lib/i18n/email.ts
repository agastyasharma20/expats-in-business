import { createTranslator } from "next-intl";

import en from "@/messages/en.json";
import pl from "@/messages/pl.json";
import uk from "@/messages/uk.json";

import { mergeMessages, type Tree } from "./merge";
import { locales, routing, type Locale } from "./routing";

const CATALOGUES: Record<Locale, Tree> = { en, pl, uk };

/** The recipient's saved language when it is supported, otherwise the platform default. */
export function emailLocale(saved: string | null | undefined): Locale {
  return (locales as readonly string[]).includes(saved ?? "")
    ? (saved as Locale)
    : routing.defaultLocale;
}

/**
 * Translator for email copy, usable outside React (server actions, Better Auth callbacks and
 * background jobs). Missing keys fall back to English like the UI.
 */
export function emailTranslator(saved: string | null | undefined) {
  const locale = emailLocale(saved);
  const messages = (locale === "en" ? en : mergeMessages(en, CATALOGUES[locale])) as typeof en;
  return { locale, t: createTranslator({ locale, messages, namespace: "emails" }) };
}

/** Absolute link in the recipient's language ("as-needed" prefix: the default has none). */
export function localizedUrl(path: string, locale: Locale, appUrl: string): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return new URL(`${prefix}${path}`, appUrl).toString();
}
