import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRightIcon, BookOpenIcon, MapPinIcon, UsersIcon, VoteIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { AmbassadorList } from "@/components/growth/ambassador-list";
import { LandmarkArt } from "@/components/landmarks";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCountry } from "@/lib/growth/queries";
import { Link } from "@/lib/i18n/navigation";
import { withAlternates } from "@/lib/seo";

type Props = PageProps<"/[locale]/countries/[code]">;

export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  if (!/^[a-z]{2}$/i.test(code)) return {};
  const [t, country] = await Promise.all([getTranslations("chapters"), getCountry(code)]);
  if (!country) return {};
  return withAlternates(`/countries/${code.toLowerCase()}`, {
    title: t("countryTitle", { country: country.name }),
    description: country.tagline ?? t("lead"),
  });
}

/** Country hub: the national panorama, city chapters, requested cities, ambassadors, guides. */
async function CountryView({ params }: { params: Props["params"] }) {
  const { code } = await params;
  if (!/^[a-z]{2}$/i.test(code)) notFound();
  const [t, country] = await Promise.all([getTranslations("chapters"), getCountry(code)]);
  if (!country) notFound();

  return (
    <>
      <header className="relative overflow-hidden bg-brand-950 text-on-dark">
        <div className="container-page flex flex-col gap-4 pt-14 lg:pt-20">
          <p className="flex flex-wrap items-center gap-2">
            <span className="eyebrow text-on-dark-muted">{t("countryEyebrow")}</span>
            {country.isDemo ? <Badge variant="demo">{t("demoCountry")}</Badge> : null}
          </p>
          <h1 className="text-display-sm text-on-dark lg:text-display">{country.name}</h1>
          {country.tagline ? (
            <p className="max-w-2xl text-h3 font-normal text-on-dark-muted">{country.tagline}</p>
          ) : null}
          <dl className="flex flex-wrap gap-x-8 gap-y-2 pt-1 font-semibold">
            <div className="flex items-center gap-2">
              <MapPinIcon aria-hidden="true" className="size-5 text-on-dark-muted" />
              <dt className="sr-only">{t("chaptersLabel")}</dt>
              <dd>{t("chapterCount", { count: country.chapters.length })}</dd>
            </div>
            <div className="flex items-center gap-2">
              <BookOpenIcon aria-hidden="true" className="size-5 text-on-dark-muted" />
              <dt className="sr-only">{t("guidesLabel")}</dt>
              <dd>{t("guideCount", { count: country._count.guides })}</dd>
            </div>
          </dl>
        </div>
        <LandmarkArt landmark={country.landmark} className="text-brand-500" />
      </header>

      <div className="container-page flex flex-col gap-14 py-12">
        <section aria-labelledby="cities-title" className="flex flex-col gap-5">
          <h2 id="cities-title" className="text-h2">
            {t("citiesTitle", { country: country.name })}
          </h2>
          {country.chapters.length ? (
            <ul className="grid gap-5 md:grid-cols-2">
              {country.chapters.map((ch, i) => (
                <li
                  key={ch.slug}
                  className="animate-rise"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <Link
                    href={`/chapters/${ch.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-card transition-transform duration-(--duration-micro) hover:-translate-y-1"
                  >
                    <span className="bg-brand-50 text-brand-700">
                      <LandmarkArt
                        landmark={ch.landmark ?? country.landmark}
                        className="h-32 md:h-36 lg:h-40"
                      />
                    </span>
                    <span className="flex flex-1 flex-col gap-2 p-5">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-heading text-h3 font-bold text-brand-950 group-hover:underline">
                          {ch.name}
                        </span>
                        <span className="flex gap-1.5">
                          {ch.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
                          <Badge variant={ch.status === "live" ? "verified" : "unconfirmed"}>
                            {t(`status.${ch.status}`)}
                          </Badge>
                        </span>
                      </span>
                      {ch.tagline ? (
                        <span className="text-small text-ink">{ch.tagline}</span>
                      ) : null}
                      <span className="mt-auto flex items-center gap-1.5 text-small text-muted-foreground">
                        <UsersIcon aria-hidden="true" className="size-4" />
                        {ch.members === null
                          ? t("fewMembers")
                          : t("members", { count: ch.members })}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">{t("noChapters")}</p>
          )}
        </section>

        {country.requests.length ? (
          <section aria-labelledby="requests-title" className="flex flex-col gap-4">
            <h2 id="requests-title" className="flex items-center gap-2 text-h3">
              <VoteIcon aria-hidden="true" className="size-6 text-brand-700" />
              {t("requestsTitle")}
            </h2>
            <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {country.requests.map((r, i) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4"
                >
                  <span className="flex items-center gap-2 font-semibold text-brand-950">
                    <span className="flex size-7 items-center justify-center rounded-full bg-brand-100 text-small">
                      {i + 1}
                    </span>
                    {r.city}
                  </span>
                  <span className="text-small text-muted-foreground">
                    {t("votes", { count: r.votes })}
                  </span>
                </li>
              ))}
            </ol>
            <Link
              href="/chapters#vote"
              className={buttonVariants({ variant: "outline", className: "self-start" })}
            >
              {t("vote.cta")}
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </section>
        ) : null}

        <section aria-labelledby="amb-title" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="amb-title" className="text-h2">
              {t("ambassadorsTitle", { country: country.name })}
            </h2>
            <Link href="/ambassadors#apply" className={buttonVariants()}>
              {t("becomeAmbassador")}
            </Link>
          </div>
          {country.ambassadors.length ? (
            <AmbassadorList ambassadors={country.ambassadors} />
          ) : (
            <p className="rounded-2xl border border-dashed border-line-strong bg-surface p-5 text-muted-foreground">
              {t("noAmbassadors")}
            </p>
          )}
        </section>
      </div>
    </>
  );
}

export default function CountryPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-[28rem] w-full rounded-none" />}>
      <CountryView params={params} />
    </Suspense>
  );
}
