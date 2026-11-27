import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteBanner } from "@/components/layout/site-banner";
import { SiteHeader } from "@/components/layout/site-header";
import { MAIN_CONTENT_ID, SkipLink } from "@/components/layout/skip-link";
import { PwaShell } from "@/components/pwa/pwa-shell";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { pwaConfig } from "@/config/pwa";
import { colorTokens } from "@/lib/design/tokens";
import { bodyFont, headingFont } from "@/lib/fonts";
import { routing } from "@/lib/i18n/routing";

import "../globals.css";

/** Only these namespaces are used by client components; the rest stay on the server (smaller JS). */
const CLIENT_NAMESPACES = [
  "roadmap",
  "concierge",
  "scanner",
  "pulse",
  "common",
  "nav",
  "chapter",
  "language",
  "errors",
  "auth",
  "onboarding",
  "settings",
  "profile",
  "help",
  "group",
  "adminShell",
  "festival",
  "spotlight",
  "ambassadors",
  "unrsvp",
  "pwa",
] as const;

function pickClientMessages(messages: Record<string, unknown>) {
  return Object.fromEntries(CLIENT_NAMESPACES.map((key) => [key, messages[key]]));
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** Browser chrome takes the Deep Teal of the top bar; content may extend under phone notches. */
export const viewport: Viewport = {
  themeColor: colorTokens["brand-950"],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: { default: t("title"), template: t("titleTemplate") },
    description: t("description"),
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    applicationName: pwaConfig.name,
    appleWebApp: { capable: true, title: pwaConfig.shortName, statusBarStyle: "default" },
    formatDetection: { telephone: false },
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
        <div aria-hidden="true" className="scroll-progress" />
        <NextIntlClientProvider messages={pickClientMessages(await getMessages())}>
          <TooltipProvider>
            <SkipLink />
            <Suspense fallback={null}>
              <SiteBanner />
            </Suspense>
            <SiteHeader />
            <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex flex-1 flex-col outline-none">
              {children}
            </main>
            <SiteFooter />
            <PwaShell />
          </TooltipProvider>
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
