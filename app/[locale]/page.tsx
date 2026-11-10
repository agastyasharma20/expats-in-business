import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { DatabaseStatus } from "@/components/system/database-status";
import { buttonVariants } from "@/components/ui/button";
import { areDevToolsEnabled } from "@/lib/dev-tools";
import { Link } from "@/lib/i18n/navigation";

export default async function HomePage() {
  const t = await getTranslations("home");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-16">
      <p className="eyebrow text-brand-700">{t("eyebrow")}</p>
      <h1 className="text-h1">{t("title")}</h1>
      <p className="text-muted-foreground">{t("intro")}</p>
      <Suspense fallback={<p className="text-muted-foreground">{t("dbChecking")}</p>}>
        <DatabaseStatus />
      </Suspense>
      {areDevToolsEnabled() ? (
        <Link href="/styleguide" className={`${buttonVariants({ variant: "outline" })} self-start`}>
          {t("styleguideLink")}
        </Link>
      ) : null}
    </div>
  );
}
