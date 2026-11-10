import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import type { ComingSoonFeature } from "@/components/common/coming-soon";

/** Title and description for a coming-soon route; not indexed until the real page ships. */
export async function comingSoonMetadata(
  locale: string,
  feature: ComingSoonFeature,
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "comingSoon" });
  return {
    title: t(`${feature}.title`),
    description: t(`${feature}.description`),
    robots: { index: false, follow: true },
  };
}
