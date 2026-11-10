import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MAIN_CONTENT_ID, SkipLink } from "@/components/layout/skip-link";
import { MotionProvider } from "@/components/motion/motion-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { bodyFont, headingFont } from "@/lib/fonts";
import { routing } from "@/lib/i18n/routing";

import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: { default: t("title"), template: t("titleTemplate") },
    description: t("description"),
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  };
}

// The locale is a root param (app/[locale] holds the root layout), read via next/root-params.
export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await rootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html
      lang={locale}
      className={`${bodyFont.variable} ${headingFont.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <MotionProvider>
            <TooltipProvider>
              <SkipLink />
              <SiteHeader />
              <main
                id={MAIN_CONTENT_ID}
                tabIndex={-1}
                className="flex flex-1 flex-col outline-none"
              >
                {children}
              </main>
              <SiteFooter />
            </TooltipProvider>
          </MotionProvider>
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
