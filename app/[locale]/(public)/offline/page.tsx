import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { OfflineArt } from "@/components/pwa/offline-art";
import { OfflineView } from "@/components/pwa/offline-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pwa.offline");
  // Shown by the service worker in place of any page that cannot load: never for search engines.
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function OfflinePage() {
  const t = await getTranslations("pwa.offline");
  return (
    <div className="container-page flex flex-col items-center gap-10 py-12 text-center sm:py-16">
      <div className="flex flex-col items-center gap-5">
        <OfflineArt label={t("art")} />
        <div className="flex max-w-xl animate-rise flex-col items-center gap-3">
          <p className="eyebrow text-brand-700">{t("eyebrow")}</p>
          <h1 className="text-h1">{t("title")}</h1>
          <p className="text-muted-foreground">{t("lead")}</p>
        </div>
      </div>
      <OfflineView />
    </div>
  );
}
