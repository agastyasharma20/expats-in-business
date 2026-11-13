import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeftIcon, CalendarDaysIcon, CrownIcon, SparklesIcon, UsersIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { AmbassadorList } from "@/components/growth/ambassador-list";
import { LandmarkArt } from "@/components/landmarks";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getChapterMeta, getChapterPage } from "@/lib/growth/queries";
import { Link } from "@/lib/i18n/navigation";
import { withAlternates } from "@/lib/seo";

type Props = PageProps<"/[locale]/chapters/[slug]">;

export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [t, chapter] = await Promise.all([getTranslations("chapters"), getChapterMeta(slug)]);
  if (!chapter) return {};
  return withAlternates(`/chapters/${slug}`, {
    title: t("chapterTitle", { city: chapter.name }),
    description: chapter.tagline ?? t("lead"),
  });
}

/** City chapter: the city's landmark panorama, status, sessions and festivals, ambassadors. */
async function ChapterView({ params }: { params: Props["params"] }) {
  await connection();
  const { slug } = await params;
  const [t, format, chapter] = await Promise.all([
    getTranslations("chapters"),
    getFormatter(),
    getChapterPage(slug),
  ]);
  if (!chapter) notFound();
  const live = chapter.status === "live";

  return (
    <>
      <header className="relative overflow-hidden bg-brand-950 text-on-dark">
        <div className="container-page flex flex-col gap-4 pt-10 lg:pt-16">
          <Link
            href={`/countries/${chapter.country.code.toLowerCase()}`}
            className="inline-flex min-h-11 items-center gap-2 self-start text-small font-semibold text-on-dark-muted hover:text-on-dark hover:underline"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            {chapter.country.name}
          </Link>
          <p className="flex flex-wrap items-center gap-2">
            <Badge variant={live ? "verified" : "unconfirmed"}>
              {t(`status.${chapter.status}`)}
            </Badge>
            {chapter.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
          </p>
          <h1 className="text-display-sm text-on-dark lg:text-display">{chapter.name}</h1>
          {chapter.tagline ? (
            <p className="max-w-2xl text-h3 font-normal text-on-dark-muted">{chapter.tagline}</p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            {live ? (
              <Link
                href="/sign-in"
                className={buttonVariants({ variant: "highlight", size: "lg" })}
              >
                {t("join", { city: chapter.name })}
              </Link>
            ) : (
              <Link
                href="/ambassadors#apply"
                className={buttonVariants({ variant: "highlight", size: "lg" })}
              >
                <SparklesIcon aria-hidden="true" />
                {t("helpLaunch", { city: chapter.name })}
              </Link>
            )}
            <Link href="/events" className={buttonVariants({ variant: "secondary", size: "lg" })}>
              {t("allSessions")}
            </Link>
          </div>
        </div>
        <LandmarkArt
          landmark={chapter.landmark ?? chapter.country.landmark}
          className="text-brand-500"
        />
      </header>

      <div className="container-page flex flex-col gap-14 py-12">
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="chapter-facts">
          {[
            { key: "members", icon: UsersIcon, value: chapter.members ?? t("underFive") },
            { key: "sessions", icon: CalendarDaysIcon, value: chapter.events.length },
            { key: "ambassadors", icon: CrownIcon, value: chapter.ambassadors.length },
            { key: "leads", icon: SparklesIcon, value: chapter.leads },
          ].map((f, i) => (
            <div
              key={f.key}
              className="flex animate-rise flex-col gap-1 rounded-2xl border border-line bg-surface p-4 shadow-card"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <dt className="flex items-center gap-1.5 text-small text-muted-foreground">
                <f.icon aria-hidden="true" className="size-4 text-brand-700" />
                {t(`facts.${f.key}`)}
              </dt>
              <dd className="font-heading text-h2 font-bold text-brand-950 tabular-nums">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="upcoming-title" className="flex flex-col gap-4">
          <h2 id="upcoming-title" className="text-h2">
            {t("upcoming", { city: chapter.name })}
          </h2>
          {chapter.events.length ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {chapter.events.map((e) => (
                <li key={e.slug}>
                  <Link
                    href={e.kind === "festival" ? `/festivals/${e.slug}` : `/events/${e.slug}`}
                    className={
                      e.kind === "festival"
                        ? "festival-ring festival-ring-lg flex"
                        : "flex rounded-2xl border border-line"
                    }
                  >
                    <span className="flex w-full flex-col gap-1 rounded-[1.35rem] bg-surface p-4">
                      <span className="flex items-center gap-2 font-semibold text-brand-950">
                        {e.kind === "festival" ? (
                          <SparklesIcon aria-hidden="true" className="size-4 text-ember-600" />
                        ) : null}
                        {e.title}
                      </span>
                      <span className="text-small text-muted-foreground">
                        {format.dateTime(e.startsAt, {
                          dateStyle: "full",
                          timeZone: chapter.timezone,
                        })}
                        {e.venue ? ` · ${e.venue.name}` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-line-strong bg-surface p-5 text-muted-foreground">
              {live ? t("noSessions") : t("launchingNote", { city: chapter.name })}
            </p>
          )}
        </section>

        <section aria-labelledby="amb-title" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="amb-title" className="text-h2">
              {t("cityAmbassadors", { city: chapter.name })}
            </h2>
            <Link href="/ambassadors#apply" className={buttonVariants({ variant: "outline" })}>
              {t("becomeAmbassador")}
            </Link>
          </div>
          {chapter.ambassadors.length ? (
            <AmbassadorList ambassadors={chapter.ambassadors} />
          ) : (
            <p className="rounded-2xl border border-dashed border-line-strong bg-surface p-5 text-muted-foreground">
              {t("noCityAmbassadors", { city: chapter.name })}
            </p>
          )}
        </section>
      </div>
    </>
  );
}

export default function ChapterPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-[28rem] w-full rounded-none" />}>
      <ChapterView params={params} />
    </Suspense>
  );
}
