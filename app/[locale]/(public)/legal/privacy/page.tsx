import { LegalPageView, legalMetadata } from "@/components/content/legal-page-view";

export function generateMetadata() {
  return legalMetadata("privacy");
}

export default function LegalPrivacyPage() {
  return <LegalPageView slug="privacy" />;
}
