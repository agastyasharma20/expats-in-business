import { LegalPageView, legalMetadata } from "@/components/content/legal-page-view";

export function generateMetadata() {
  return legalMetadata("terms");
}

export default function LegalTermsPage() {
  return <LegalPageView slug="terms" />;
}
