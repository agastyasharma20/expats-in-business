import { Suspense } from "react";
import type { Metadata } from "next";
import { GlobeIcon, MegaphoneIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { CountryCard } from "@/components/growth/country-card";
import { VoteCityForm } from "@/components/growth/vote-city-form";
import { WorldArt } from "@/components/home/hero-art/world";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { listCountries } from "@/lib/growth/queries";
import { Link } from "@/lib/i18n/navigation";
import { withAlternates } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("chapters");
  return withAlternates("/chapters", { title: t("title"), description: t("lead") });
}

async function Countries() {
  const countries = await listCountries().catch(() => []);
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" data-testid="countries">
      {countries.map((country, i) => (
        <CountryCard key={country.code} country={country} index={i} />
      ))}
    </div>
  );
}

async function VoteArea() {
  const [t, user] = await Promise.all([getTranslations("chapters"), getSessionUser()]);
  if (!user) {
    return (
      <Link
        href={`/sign-in?next=${encodeURIComponent("/chapters#vote")}`}
        className={buttonVariants({ className: "self-start" })}
      >
        {t("vote.signIn")}
      </Link>
    );
  }
  const countries = await getDb().country.findMany({
    orderBy: { name: "asc" },
    select: { code: true, name: true },
  });
  return <VoteCityForm countries={countries} />;
}

/** The world view: every country hub, its city chapters and the cities voting for EiB. */
export default async function ChaptersPage() {
  const t = await getTranslations("chapters");
  return (
    <div className="flex flex-col">
      <header className="relative overflow-hidden bg-brand-950 text-on-dark">
        <div className="container-page flex flex-col gap-4 pt-14 pb-4 lg:pt-20">
          <p className="eyebrow text-on-dark-muted">{t("eyebrow")}</p>
          <h1 className="max-w-3xl text-display-sm text-on-dark lg:text-display">{t("title")}</h1>
          <p className="max-w-2xl text-h3 font-normal text-on-dark-muted">{t("lead")}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <a href="#vote" className={buttonVariants({ variant: "highlight", size: "lg" })}>
              <MegaphoneIcon aria-hidden="true" />
              {t("vote.cta")}
            </a>
            <Link
              href="/ambassadors"
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              <GlobeIcon aria-hidden="true" />
              {t("ambassadorCta")}
            </Link>
          </div>
        </div>
        <WorldArt className="text-brand-500" />
      </header>

      <div className="container-page flex flex-col gap-14 py-12">
        <section aria-labelledby="countries-title" className="flex flex-col gap-5">
          <h2 id="countries-title" className="text-h2">
            {t("countriesTitle")}
          </h2>
          <Suspense
            fallback={
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                <Skeleton className="h-96 rounded-3xl" />
                <Skeleton className="h-96 rounded-3xl" />
              </div>
            }
          >
            <Countries />
          </Suspense>
        </section>

        <section
          id="vote"
          aria-labelledby="vote-title"
          className="flex scroll-mt-28 flex-col gap-4 rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-8"
        >
          <h2 id="vote-title" className="text-h2">
            {t("vote.title")}
          </h2>
          <p className="max-w-2xl text-ink">{t("vote.lead")}</p>
          <Suspense fallback={<Skeleton className="h-24 w-full" />}>
            <VoteArea />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
