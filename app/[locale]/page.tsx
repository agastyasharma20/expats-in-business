import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { DatabaseStatus } from "@/components/system/database-status";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-16">
      <p className="text-sm font-semibold tracking-[0.08em] text-brand-700 uppercase">
        {t("eyebrow")}
      </p>
      <h1 className="font-heading text-4xl font-extrabold text-brand-950">{t("title")}</h1>
      <p className="text-lg text-muted-foreground">{t("intro")}</p>
      <Suspense fallback={<p className="text-muted-foreground">{t("dbChecking")}</p>}>
        <DatabaseStatus />
      </Suspense>
    </main>
  );
}
