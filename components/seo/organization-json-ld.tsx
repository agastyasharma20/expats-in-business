import { getFact } from "@/config/facts";
import { socialNav } from "@/lib/nav";

/** schema.org Organization, built only from verified facts (config/facts.ts). */
export function OrganizationJsonLd({ baseUrl }: { baseUrl: string }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: getFact("org.name").value,
    slogan: getFact("org.tagline").value,
    url: baseUrl,
    logo: new URL("/brand/eib-logo.png", baseUrl).toString(),
    email: getFact("contact.email").value,
    sameAs: socialNav.map((item) => getFact(item.fact).value),
  };
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output with "<" escaped, so the payload cannot close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
