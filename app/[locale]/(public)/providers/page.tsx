import { setRequestLocale } from "next-intl/server";

import { ComingSoon } from "@/components/common/coming-soon";
import { comingSoonMetadata } from "@/lib/coming-soon-metadata";

// Placeholder until this feature's milestone ships (see lib/nav.ts, status "comingSoon").
export async function generateMetadata({ params }: PageProps<"/[locale]/providers">) {
  return comingSoonMetadata((await params).locale, "providers");
}

export default async function ProvidersPage({ params }: PageProps<"/[locale]/providers">) {
  setRequestLocale((await params).locale);
  return <ComingSoon feature="providers" />;
}
