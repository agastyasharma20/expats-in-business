import { Suspense } from "react";
import type { Metadata } from "next";
import { BriefcaseIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { FilterForm } from "@/components/directory/filter-form";
import { Pagination } from "@/components/directory/pagination";
import { ProviderCard } from "@/components/directory/provider-card";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LANGUAGE_CODES } from "@/lib/countries";
import { parseProviderFilters } from "@/lib/directory/filters";
import { listCategories, searchProviders } from "@/lib/directory/queries";
import { Link } from "@/lib/i18n/navigation";

type Props = PageProps<"/[locale]/providers">;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("providers");
  return { title: t("title"), description: t("lead") };
}

async function Results({ searchParams }: { searchParams: Props["searchParams"] }) {
  const [params, t, d, locale, categories] = await Promise.all([
    searchParams,
    getTranslations("providers"),
    getTranslations("directory"),
    getLocale(),
    listCategories(),
  ]);
  const filters = parseProviderFilters(params);
  const { rows, total, pages } = await searchProviders(filters);
  const languages = new Intl.DisplayNames([locale], { type: "language" });
  return (
    <>
      <FilterForm
        action="/providers"
        q={filters.q}
        fields={[
          {
            kind: "select",
            name: "category",
            label: t("category"),
            value: filters.category,
            options: categories.map((c) => ({ value: c.slug, label: c.name })),
          },
          {
            kind: "select",
            name: "language",
            label: t("language"),
            value: filters.language,
            options: LANGUAGE_CODES.slice(0, 12).map((l) => ({
              value: l,
              label: languages.of(l) ?? l,
            })),
          },
          { kind: "check", name: "verified", label: t("verifiedOnly"), checked: filters.verified },
        ]}
      />
      <p role="status" className="font-semibold text-brand-950" data-testid="result-count">
        {d("results", { count: total })}
      </p>
      {rows.length ? (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="provider-list">
          {rows.map((provider) => (
            <li key={provider.id}>
              <ProviderCard provider={provider} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={BriefcaseIcon}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Link href="/providers" className={buttonVariants()}>
              {d("clear")}
            </Link>
          }
        />
      )}
      <Pagination path="/providers" filters={filters} pages={pages} />
    </>
  );
}

export default async function ProvidersPage({ searchParams }: Props) {
  const t = await getTranslations("providers");
  return (
    <div className="container-page flex flex-col gap-6 py-12">
      <header className="flex max-w-3xl flex-col items-start gap-2">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="text-muted-foreground">{t("lead")}</p>
        <Link
          href="/providers/verification-criteria"
          className={buttonVariants({ variant: "link", size: "inline" })}
        >
          {t("verifiedLink")}
        </Link>
      </header>
      <Suspense fallback={<Skeleton className="h-[40rem] w-full" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
