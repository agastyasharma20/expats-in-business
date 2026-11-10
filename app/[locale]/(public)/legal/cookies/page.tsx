import { LegalPageView, legalMetadata } from "@/components/content/legal-page-view";

export function generateMetadata() {
  return legalMetadata("cookies");
}

export default function LegalCookiesPage() {
  return <LegalPageView slug="cookies" />;
}
