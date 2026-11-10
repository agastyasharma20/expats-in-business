import { ComingSoon } from "@/components/common/coming-soon";
import { comingSoonMetadata } from "@/lib/coming-soon-metadata";

// Placeholder until this feature ships; linked from the homepage.
export function generateMetadata() {
  return comingSoonMetadata("bubbles");
}

export default function BubblesPage() {
  return <ComingSoon feature="bubbles" />;
}
