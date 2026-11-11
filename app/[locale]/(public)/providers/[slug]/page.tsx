import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ClockIcon, LanguagesIcon, MapPinIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { QuotePanel, ReviewPanel } from "@/components/directory/provider-actions";
import { Rating, VerifiedBadge } from "@/components/directory/provider-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth/session";
import { getProvider } from "@/lib/directory/queries";
import { bumpProviderStat } from "@/lib/directory/stats";
import { Link } from "@/lib/i18n/navigation";

type Props = PageProps<"/[locale]/providers/[slug]">;

// Reviews, eligibility and the view counter are per request.
export const instant = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const provider = await getProvider((await params).slug);
  return provider ? { title: provider.name, description: provider.description } : {};
}

async function ProviderView({ params }: { params: Props["params"] }) {
  const { slug } = await params;
  const [provider, viewer] = await Promise.all([getProvider(slug), getSessionUser()]);
  if (!provider) notFound();
  const [t, r, locale] = await Promise.all([
    getTranslations("providers"),
    getTranslations("providers.review"),
    getLocale(),
  ]);
  if (viewer?.id !== provider.ownerId) await bumpProviderStat(provider.id, "views");
  const languages = new Intl.DisplayNames([locale], { type: "language" });
  const ctx = {
    slug,
    providerId: provider.id,
    ownerId: provider.ownerId,
    viewerId: viewer?.id ?? null,
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_24rem]">
      <article className="flex flex-col gap-8">
        <header className="flex flex-col items-start gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{provider.category.name}</Badge>
            {provider.verificationStatus === "verified" ? <VerifiedBadge /> : null}
            {provider.verificationStatus === "pending" ? (
              <Badge variant="unconfirmed">{t("pending")}</Badge>
            ) : null}
            {provider.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
          </div>
          <h1 className="text-h1">{provider.name}</h1>
          <Rating rating={provider.rating} count={provider._count.reviews} />
          <p className="max-w-prose text-lg text-ink">{provider.description}</p>
        </header>
        <dl className="grid gap-5 sm:grid-cols-3">
          <div className="flex gap-3">
            <LanguagesIcon aria-hidden="true" className="mt-1 size-5 text-brand-700" />
            <div>
              <dt className="eyebrow text-muted-foreground">{t("languages")}</dt>
              <dd>{provider.languages.map((l) => languages.of(l)).join(", ")}</dd>
            </div>
          </div>
          <div className="flex gap-3">
            <MapPinIcon aria-hidden="true" className="mt-1 size-5 text-brand-700" />
            <div>
              <dt className="eyebrow text-muted-foreground">{t("chapter")}</dt>
              <dd>{provider.chapter.name}</dd>
            </div>
          </div>
          {provider.responseTimeHours ? (
            <div className="flex gap-3">
              <ClockIcon aria-hidden="true" className="mt-1 size-5 text-brand-700" />
              <div>
                <dt className="sr-only">{t("responseTime", { hours: "" })}</dt>
                <dd>{t("responseTime", { hours: provider.responseTimeHours })}</dd>
              </div>
            </div>
          ) : null}
        </dl>
        <section aria-labelledby="services-title" className="flex flex-col gap-3">
          <h2 id="services-title" className="text-h3">
            {t("services")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {provider.services.map((s) => (
              <li key={s}>
                <Badge variant="outline">{s}</Badge>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="reviews-title" className="flex flex-col gap-4">
          <h2 id="reviews-title" className="text-h3">
            {r("title")}
          </h2>
          <ReviewPanel {...ctx} />
          {provider.reviews.length ? (
            <ul className="flex flex-col gap-3" data-testid="reviews">
              {provider.reviews.map((review) => (
                <li key={review.id} className="rounded-xl border border-line bg-surface p-4">
                  <p className="flex flex-wrap items-center gap-2 text-small">
                    <span className="font-semibold">{t("rating", { rating: review.rating })}</span>
                    <span className="text-muted-foreground">
                      · {review.author.name.split(" ")[0]} ·{" "}
                      {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                        review.createdAt,
                      )}
                    </span>
                    {review.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
                  </p>
                  <p className="mt-2 text-ink">{review.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">{r("empty")}</p>
          )}
        </section>
      </article>
      <aside className="flex flex-col gap-3 self-start rounded-xl border border-line bg-surface p-6 shadow-card lg:sticky lg:top-24">
        <h2 className="text-h3">{t("quote.title")}</h2>
        <p className="text-small text-muted-foreground">{t("quote.lead")}</p>
        <QuotePanel {...ctx} />
      </aside>
    </div>
  );
}

export default async function ProviderPage({ params }: Props) {
  const t = await getTranslations("providers");
  return (
    <div className="container-page flex flex-col gap-6 py-10">
      <Link
        href="/providers"
        className={buttonVariants({ variant: "link", size: "inline", className: "self-start" })}
      >
        <ArrowLeftIcon aria-hidden="true" />
        {t("title")}
      </Link>
      <Suspense fallback={<Skeleton className="h-[36rem] w-full" />}>
        <ProviderView params={params} />
      </Suspense>
    </div>
  );
}
