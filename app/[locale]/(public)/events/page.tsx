import { setRequestLocale } from "next-intl/server";

import { ComingSoon } from "@/components/common/coming-soon";
import { comingSoonMetadata } from "@/lib/coming-soon-metadata";

// Placeholder until this feature's milestone ships (see lib/nav.ts, status "comingSoon").
export async function generateMetadata({ params }: PageProps<"/[locale]/events">) {
  return comingSoonMetadata((await params).locale, "events");
}

export default async function EventsPage({ params }: PageProps<"/[locale]/events">) {
  setRequestLocale((await params).locale);
  return <ComingSoon feature="events" />;
}
