import { ArrowRightIcon, MapPinIcon, VoteIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { LandmarkArt } from "@/components/landmarks";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

type Country = {
  code: string;
  name: string;
  landmark: string | null;
  tagline: string | null;
  isDemo: boolean;
  chapters: {
    slug: string;
    name: string;
    status: string;
    isDemo: boolean;
    members: number | null;
  }[];
  requests: { id: string; city: string; votes: number }[];
};

/** A country with its landmark panorama, its chapters and the cities asking for one. */
export async function CountryCard({ country, index }: { country: Country; index: number }) {
  const t = await getTranslations("chapters");
  return (
    <article
      className="group flex animate-rise flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-card"
      style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
      data-testid="country-card"
    >
      <div className="relative bg-brand-50 text-brand-700">
        <LandmarkArt landmark={country.landmark} className="h-36 md:h-40 lg:h-44" />
        <div className="absolute top-4 left-4 flex gap-1.5">
          {country.isDemo ? <Badge variant="demo">{t("demoCountry")}</Badge> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-h3">
            <Link
              href={`/countries/${country.code.toLowerCase()}`}
              className="outline-none group-hover:underline focus-visible:underline"
            >
              {country.name}
            </Link>
          </h3>
          {country.tagline ? (
            <p className="text-small text-muted-foreground">{country.tagline}</p>
          ) : null}
        </div>
        {country.chapters.length ? (
          <ul className="flex flex-col gap-2">
            {country.chapters.map((ch) => (
              <li key={ch.slug}>
                <Link
                  href={`/chapters/${ch.slug}`}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-line px-3 hover:border-brand-700 hover:bg-brand-50"
                >
                  <span className="flex items-center gap-2 font-semibold text-brand-950">
                    <MapPinIcon aria-hidden="true" className="size-4 text-brand-700" />
                    {ch.name}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {ch.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
                    <Badge variant={ch.status === "live" ? "verified" : "unconfirmed"}>
                      {t(`status.${ch.status}`)}
                    </Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-small text-muted-foreground">{t("noChapters")}</p>
        )}
        {country.requests.length ? (
          <div className="flex flex-col gap-1.5">
            <p className="flex items-center gap-1.5 text-small font-semibold text-ink">
              <VoteIcon aria-hidden="true" className="size-4 text-brand-700" />
              {t("requested")}
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {country.requests.slice(0, 5).map((r) => (
                <li
                  key={r.id}
                  className="rounded-full border border-line-strong px-2.5 py-1 text-small text-ink"
                >
                  {r.city} · {t("votes", { count: r.votes })}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <Link
          href={`/countries/${country.code.toLowerCase()}`}
          className={cn(
            "mt-auto inline-flex min-h-11 items-center gap-1.5 self-start text-small font-semibold text-primary hover:underline",
          )}
        >
          {t("openHub", { country: country.name })}
          <ArrowRightIcon aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </article>
  );
}
