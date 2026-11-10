import { setRequestLocale } from "next-intl/server";

import { ComingSoon } from "@/components/common/coming-soon";
import { comingSoonMetadata } from "@/lib/coming-soon-metadata";

// Placeholder until this feature's milestone ships (see lib/nav.ts, status "comingSoon").
export async function generateMetadata({ params }: PageProps<"/[locale]/sign-in">) {
  return comingSoonMetadata((await params).locale, "signIn");
}

export default async function SignInPage({ params }: PageProps<"/[locale]/sign-in">) {
  setRequestLocale((await params).locale);
  return <ComingSoon feature="signIn" />;
}
