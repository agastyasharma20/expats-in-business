import type { Metadata } from "next";
import { BadgeCheckIcon, BookOpenIcon, MessageCircleQuestionIcon } from "lucide-react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { allGuides } from "@/lib/content/guide-index";
import { Link } from "@/lib/i18n/navigation";
import { withAlternates } from "@/lib/seo";
import { guideText } from "@/lib/content/guides";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("guides");
  return withAlternates("/guides", { title: t("title"), description: t("lead") });
}

/** Guide index: static (content is in the repo), grouped cards with last-verified dates. */
export default async function GuidesPage() {
  const [t, c, format, guides, locale] = await Promise.all([
    getTranslations("guides"),
    getTranslations("concierge"),
    getFormatter(),
    allGuides(),
    getLocale(),
  ]);
  const sorted = [...guides].sort((a, b) => a.frontmatter.title.localeCompare(b.frontmatter.title));

  return (
    <div className="container-page flex flex-col gap-8 py-12">
      <header className="flex max-w-3xl flex-col items-start gap-3">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("lead")}</p>
        <Link href="/concierge" className={buttonVariants({ variant: "outline" })}>
          <MessageCircleQuestionIcon aria-hidden="true" />
          {c("title")}
        </Link>
      </header>
      {sorted.length ? (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="guide-list">
          {sorted.map((guide) => (
            <li key={`${guide.country}/${guide.slug}`}>
              <article className="relative flex h-full flex-col gap-3 rounded-xl border border-line bg-surface p-5 shadow-card transition-transform duration-(--duration-micro) focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring hover:-translate-y-0.5">
                <Badge variant="verified" className="gap-1 self-start">
                  <BadgeCheckIcon aria-hidden="true" className="size-3.5" />
                  {t("lastVerified", {
                    date: format.dateTime(guide.frontmatter.lastVerified, { dateStyle: "medium" }),
                  })}
                </Badge>
                <h2 className="text-h3">
                  <Link
                    href={`/guides/${guide.slug}`}
                    className="outline-none after:absolute after:inset-0 after:content-['']"
                  >
                    {guideText(guide.frontmatter, locale).title}
                  </Link>
                </h2>
                <p className="flex-1 text-small text-ink">
                  {guideText(guide.frontmatter, locale).description}
                </p>
                {guideText(guide.frontmatter, locale).machine ? (
                  <p className="text-small text-muted-foreground">{t("machineShort")}</p>
                ) : null}
                <p className="text-small text-muted-foreground">
                  {t("count", { count: guide.frontmatter.sources.length })}
                </p>
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={BookOpenIcon}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Link href="/help" className={buttonVariants()}>
              {t("ask")}
            </Link>
          }
        />
      )}
    </div>
  );
}
