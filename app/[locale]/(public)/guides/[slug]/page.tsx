import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";

import { GuideDocument } from "@/components/content/guide-document";
import { buttonVariants } from "@/components/ui/button";
import { allGuides } from "@/lib/content/guide-index";
import { Link } from "@/lib/i18n/navigation";
import { routing } from "@/lib/i18n/routing";

type Props = PageProps<"/[locale]/guides/[slug]">;

/** Every guide is known at build time, so each page is prerendered (static, fast). */
export async function generateStaticParams() {
  return (await allGuides()).map((g) => ({ slug: g.slug }));
}

async function findGuide(slug: string) {
  const guides = await allGuides();
  const guide = guides.find((g) => g.slug === slug);
  if (!guide) return null;
  // Related: listed in frontmatter first, then other guides from the same country.
  const sameCountry = guides.filter((g) => g.country === guide.country && g.slug !== slug);
  const named = guide.frontmatter.related
    .map((s) => sameCountry.find((g) => g.slug === s))
    .filter((g) => g !== undefined);
  const related = [...named, ...sameCountry.filter((g) => !named.includes(g))].slice(0, 3);
  return { guide, related };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await findGuide((await params).slug);
  return found
    ? { title: found.guide.frontmatter.title, description: found.guide.frontmatter.description }
    : {};
}

export default async function GuidePage({ params }: Props) {
  const found = await findGuide((await params).slug);
  if (!found) notFound();
  const requested = await rootLocale();
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const t = await getTranslations("guides");
  return (
    <div className="container-page flex flex-col gap-6 py-10">
      <Link
        href="/guides"
        className={buttonVariants({ variant: "link", size: "inline", className: "self-start" })}
      >
        <ArrowLeftIcon aria-hidden="true" />
        {t("back")}
      </Link>
      <GuideDocument guide={found.guide} related={found.related} locale={locale} />
    </div>
  );
}
