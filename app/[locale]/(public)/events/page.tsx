import { ComingSoon } from "@/components/common/coming-soon";
import { comingSoonMetadata } from "@/lib/coming-soon-metadata";

// Placeholder until this feature's milestone ships (see lib/nav.ts, status "comingSoon").
// The locale comes from next/root-params via lib/i18n/request.ts, so no params are read here.
export function generateMetadata() {
  return comingSoonMetadata("events");
}

export default function EventsPage() {
  return <ComingSoon feature="events" />;
}
