import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageBand } from "@/components/layout/page-band";
import { InstallButton } from "@/components/pwa/install-button";
import { InstallGuide } from "@/components/pwa/install-guide";
import { withAlternates } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pwa.install");
  return withAlternates("/install", { title: t("pageTitle"), description: t("pageLead") });
}

/**
 * The shareable install page: send this link (or its QR code) to anyone. It detects the device in
 * the browser and shows the right steps first, with every other device listed below.
 */
export default async function InstallPage() {
  const t = await getTranslations("pwa.install");
  return (
    <div className="flex flex-col">
      <PageBand
        eyebrow={t("pageEyebrow")}
        title={t("pageTitle")}
        lead={t("pageLead")}
        actions={<InstallButton variant="highlight" size="lg" />}
      />
      <div className="container-page py-14">
        <section aria-labelledby="install-how" className="mx-auto flex max-w-2xl flex-col gap-6">
          <h2 id="install-how" className="text-h2">
            {t("howTitle")}
          </h2>
          <InstallGuide expandAll />
        </section>
      </div>
    </div>
  );
}
