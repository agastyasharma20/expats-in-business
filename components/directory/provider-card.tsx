import { BadgeCheckIcon, ClockIcon, StarIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";
import type { ProviderCardData } from "@/lib/directory/queries";
import { Link } from "@/lib/i18n/navigation";

/** Verified badge: always text + icon, and it links to the published criteria (brief 3E). */
export async function VerifiedBadge() {
  const t = await getTranslations("providers");
  return (
    <Link
      href="/providers/verification-criteria"
      className="relative z-10 inline-flex rounded-full"
      aria-label={`${t("verified")}: ${t("verifiedLink")}`}
    >
      <Badge variant="verified" className="gap-1">
        <BadgeCheckIcon aria-hidden="true" className="size-3.5" />
        {t("verified")}
      </Badge>
    </Link>
  );
}

export async function Rating({ rating, count }: { rating: number | null; count: number }) {
  const [t, locale] = await Promise.all([getTranslations("providers"), getLocale()]);
  return (
    <span className="inline-flex items-center gap-1.5 text-small text-ink">
      {rating !== null ? (
        <>
          <StarIcon aria-hidden="true" className="size-4 fill-current text-brand-700" />
          <span className="font-semibold">
            {t("rating", {
              rating: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(rating),
            })}
          </span>
          <span className="text-muted-foreground">· {t("reviews", { count })}</span>
        </>
      ) : (
        <span className="text-muted-foreground">{t("reviews", { count: 0 })}</span>
      )}
    </span>
  );
}

/** Equal-height provider card; the whole card is one link via the name (stretched). */
export async function ProviderCard({ provider }: { provider: ProviderCardData }) {
  const [t, locale] = await Promise.all([getTranslations("providers"), getLocale()]);
  const languages = new Intl.DisplayNames([locale], { type: "language" });
  return (
    <article
      className="relative flex h-full flex-col gap-3 rounded-xl border border-line bg-surface p-5 shadow-card transition-transform duration-(--duration-micro) focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring hover:-translate-y-0.5"
      data-testid="provider-card"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{provider.category.name}</Badge>
        {provider.verificationStatus === "verified" ? <VerifiedBadge /> : null}
        {provider.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
      </div>
      <h2 className="text-h3">
        <Link
          href={`/providers/${provider.slug}`}
          className="outline-none after:absolute after:inset-0 after:content-['']"
        >
          {provider.name}
        </Link>
      </h2>
      <p className="line-clamp-2 text-small text-ink">{provider.description}</p>
      <p className="text-small text-muted-foreground">
        {provider.languages.map((l) => languages.of(l)).join(", ")}
      </p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
        <Rating rating={provider.rating} count={provider.reviewCount} />
        {provider.responseTimeHours ? (
          <span className="inline-flex items-center gap-1 text-small text-muted-foreground">
            <ClockIcon aria-hidden="true" className="size-4" />
            {t("responseTime", { hours: provider.responseTimeHours })}
          </span>
        ) : null}
      </div>
    </article>
  );
}
