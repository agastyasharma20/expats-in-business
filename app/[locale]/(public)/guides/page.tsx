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

/** Countries in the order guides are listed: the launch country first, then alphabetical. */
const COUNTRY_ORDER = ["PL", "IN", "LK"];

function groupByCountry(guides: Awaited<ReturnType<typeof allGuides>>) {
  const byCountry = new Map<string, typeof guides>();
  for (const guide of guides) {
    const code = guide.frontmatter.countryCode;
    byCountry.set(code, [...(byCountry.get(code) ?? []), guide]);
  }
  const rank = (code: string) => {
    const i = COUNTRY_ORDER.indexOf(code);
    return i === -1 ? COUNTRY_ORDER.length : i;
  };
  return [...byCountry.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([code, list]) => ({
      code,
      guides: [...list].sort((a, b) => a.frontmatter.title.localeCompare(b.frontmatter.title)),
    }));
}

/** Guide index: static (content is in the repo), grouped by country with last-verified dates. */
export default async function GuidesPage() {
  const [t, c, format, guides, locale] = await Promise.all([
    getTranslations("guides"),
    getTranslations("concierge"),
    getFormatter(),
    allGuides(),
    getLocale(),
  ]);
  const countries = groupByCountry(guides);
  const regionName = new Intl.DisplayNames([locale], { type: "region" });

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
      {countries.length ? (
        <div className="flex flex-col gap-12">
          {countries.map((country) => (
            <section
              key={country.code}
              aria-labelledby={`guides-${country.code}`}
              className="flex flex-col gap-5"
              data-testid={`guides-${country.code.toLowerCase()}`}
            >
              <h2 id={`guides-${country.code}`} className="text-h2">
                {regionName.of(country.code) ?? country.code}
              </h2>
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="guide-list">
                {country.guides.map((guide) => (
                  <li key={`${guide.country}/${guide.slug}`}>
                    <article className="relative flex h-full flex-col gap-3 rounded-xl border border-line bg-surface p-5 shadow-card transition-transform duration-(--duration-micro) focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring hover:-translate-y-0.5">
                      <Badge variant="verified" className="gap-1 self-start">
                        <BadgeCheckIcon aria-hidden="true" className="size-3.5" />
                        {t("lastVerified", {
                          date: format.dateTime(guide.frontmatter.lastVerified, {
                            dateStyle: "medium",
                          }),
                        })}
                      </Badge>
                      <h3 className="text-h3">
                        <Link
                          href={`/guides/${guide.slug}`}
                          className="outline-none after:absolute after:inset-0 after:content-['']"
                        >
                          {guideText(guide.frontmatter, locale).title}
                        </Link>
                      </h3>
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
            </section>
          ))}
        </div>
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
