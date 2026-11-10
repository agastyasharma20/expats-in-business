import type { Metadata } from "next";
import { TriangleAlertIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LegalDocument } from "@/components/content/legal-document";
import { NavLink } from "@/components/layout/nav-link";
import { getLegalMeta, isLegalSlug, legalSlugs } from "@/lib/content/legal";
import { routing } from "@/lib/i18n/routing";
import { legalNav } from "@/lib/nav";

export function generateStaticParams() {
  return legalSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/legal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  if (!isLegalSlug(slug)) return {};
  const meta = await getLegalMeta(slug);
  // Drafts are not in force, so keep them out of search results.
  return {
    title: meta.title,
    description: meta.description,
    robots: { index: meta.status !== "draft" },
  };
}

export default async function LegalPage({ params }: PageProps<"/[locale]/legal/[slug]">) {
  const { locale, slug } = await params;
  if (!isLegalSlug(slug) || !hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  const nav = await getTranslations("nav");

  return (
    <div className="container-page grid gap-10 py-12 lg:grid-cols-[14rem_1fr]">
      <nav aria-label={t("onThisPage")} className="lg:sticky lg:top-28 lg:self-start">
        <ul className="flex flex-wrap gap-1 lg:flex-col">
          {legalNav.map((item) => (
            <li key={item.id}>
              <NavLink href={item.href}>{nav(item.id)}</NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex min-w-0 flex-col gap-6">
        <div
          role="note"
          className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-50 p-4 text-warning"
        >
          <TriangleAlertIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <div className="flex flex-col gap-1">
            <p className="font-bold">{t("draftBanner")}</p>
            <p>{t("draftNote")}</p>
            {locale !== "en" ? <p lang={locale}>{t("englishOnly")}</p> : null}
          </div>
        </div>
        <div lang="en">
          <LegalDocument slug={slug} locale={locale} />
        </div>
      </div>
    </div>
  );
}
