import { setRequestLocale } from "next-intl/server";

import { ComingSoon } from "@/components/common/coming-soon";
import { comingSoonMetadata } from "@/lib/coming-soon-metadata";

// Placeholder until this feature's milestone ships (see lib/nav.ts, status "comingSoon").
export async function generateMetadata({ params }: PageProps<"/[locale]/pricing">) {
  return comingSoonMetadata((await params).locale, "pricing");
}

export default async function PricingPage({ params }: PageProps<"/[locale]/pricing">) {
  setRequestLocale((await params).locale);
  return <ComingSoon feature="pricing" />;
}
