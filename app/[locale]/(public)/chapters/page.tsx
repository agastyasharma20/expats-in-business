import { ComingSoon } from "@/components/common/coming-soon";
import { comingSoonMetadata } from "@/lib/coming-soon-metadata";

// Placeholder until this feature ships; linked from the homepage.
export function generateMetadata() {
  return comingSoonMetadata("chapters");
}

export default function ChaptersPage() {
  return <ComingSoon feature="chapters" />;
}
