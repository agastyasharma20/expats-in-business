import { CompassIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { StatusMessage } from "@/components/common/status-message";
import { buttonVariants } from "@/components/ui/button";
import { bodyFont, headingFont } from "@/lib/fonts";
import { routing } from "@/lib/i18n/routing";

import "./globals.css";

/** 404 for paths outside any locale; shown in the default locale. */
export default async function RootNotFound() {
  const locale = routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "errors" });
  const common = await getTranslations({ locale, namespace: "common" });

  return (
    <html
      lang={locale}
      className={`${bodyFont.variable} ${headingFont.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <main className="flex flex-1 flex-col">
          <StatusMessage
            icon={CompassIcon}
            eyebrow={t("notFoundEyebrow")}
            title={t("notFoundTitle")}
            description={t("notFoundDescription")}
            actions={
              <Link href="/" className={buttonVariants()}>
                {common("backHome")}
              </Link>
            }
          />
        </main>
      </body>
    </html>
  );
}
