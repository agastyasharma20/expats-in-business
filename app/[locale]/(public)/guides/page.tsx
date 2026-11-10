import { setRequestLocale } from "next-intl/server";

import { ComingSoon } from "@/components/common/coming-soon";
import { comingSoonMetadata } from "@/lib/coming-soon-metadata";

// Placeholder until this feature's milestone ships (see lib/nav.ts, status "comingSoon").
export async function generateMetadata({ params }: PageProps<"/[locale]/guides">) {
  return comingSoonMetadata((await params).locale, "guides");
}

export default async function GuidesPage({ params }: PageProps<"/[locale]/guides">) {
  setRequestLocale((await params).locale);
  return <ComingSoon feature="guides" />;
}
