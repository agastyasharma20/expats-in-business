import { cacheLife } from "next/cache";
import { getFormatter, getTranslations } from "next-intl/server";
import { evaluate } from "next-mdx-remote-client/rsc";
import remarkGfm from "remark-gfm";

import { getFact } from "@/config/facts";
import { legalFrontmatterSchema, readLegalSource, type LegalSlug } from "@/lib/content/legal";

import type { Locale } from "@/lib/i18n/routing";

import { createProseComponents, Prose } from "./prose";

/**
 * Renders content/legal/<slug>.mdx to HTML on the server (cached; content changes need a deploy).
 * Facts reach the MDX through `scope` ({orgName}, {contactEmail}), never as copied text.
 */
export async function LegalDocument({ slug, locale }: { slug: LegalSlug; locale: Locale }) {
  "use cache";
  cacheLife("days");

  // Request APIs are unavailable here: every translation gets the locale explicitly.
  const common = await getTranslations({ locale, namespace: "common" });
  const source = await readLegalSource(slug);
  const { content, frontmatter, error } = await evaluate({
    source,
    components: createProseComponents({
      locale,
      newTabLabel: common("opensInNewTab"),
      contactEmail: getFact("contact.email").value,
    }),
    options: {
      parseFrontmatter: true,
      mdxOptions: { remarkPlugins: [remarkGfm] },
      scope: {
        orgName: getFact("org.name").value,
        contactEmail: getFact("contact.email").value,
      },
    },
  });
  if (error) throw error;

  const meta = legalFrontmatterSchema.parse(frontmatter);
  const t = await getTranslations({ locale, namespace: "legal" });
  const format = await getFormatter({ locale });

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-h1">{meta.title}</h1>
        <p className="text-small text-muted-foreground">
          {t("lastUpdated", { date: format.dateTime(meta.lastUpdated, { dateStyle: "long" }) })}
        </p>
      </header>
      <Prose>{content}</Prose>
    </article>
  );
}
