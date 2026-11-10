import { setRequestLocale } from "next-intl/server";

import { ComingSoon } from "@/components/common/coming-soon";
import { comingSoonMetadata } from "@/lib/coming-soon-metadata";

// Placeholder until this feature's milestone ships (see lib/nav.ts, status "comingSoon").
export async function generateMetadata({ params }: PageProps<"/[locale]/members">) {
  return comingSoonMetadata((await params).locale, "members");
}

export default async function MembersPage({ params }: PageProps<"/[locale]/members">) {
  setRequestLocale((await params).locale);
  return <ComingSoon feature="members" />;
}
