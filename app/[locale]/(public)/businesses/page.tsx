import { Suspense } from "react";
import type { Metadata } from "next";
import { StoreIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { ExternalLink } from "@/components/common/external-link";
import { FilterForm } from "@/components/directory/filter-form";
import { Pagination } from "@/components/directory/pagination";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { parseBusinessFilters } from "@/lib/directory/filters";
import { listCategories, searchBusinesses } from "@/lib/directory/queries";
import { Link } from "@/lib/i18n/navigation";

type Props = PageProps<"/[locale]/businesses">;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businesses");
  return { title: t("title"), description: t("lead") };
}

async function Results({ searchParams }: { searchParams: Props["searchParams"] }) {
  const [params, t, d, categories] = await Promise.all([
    searchParams,
    getTranslations("businesses"),
    getTranslations("directory"),
    listCategories(),
  ]);
  const filters = parseBusinessFilters(params);
  const { rows, total, pages } = await searchBusinesses(filters);
  return (
    <>
      <FilterForm
        action="/businesses"
        q={filters.q}
        fields={[
          {
            kind: "select",
            name: "category",
            label: t("category"),
            value: filters.category,
            options: categories.map((c) => ({ value: c.slug, label: c.name })),
          },
        ]}
      />
      <p role="status" className="font-semibold text-brand-950" data-testid="result-count">
        {d("results", { count: total })}
      </p>
      {rows.length ? (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="business-list">
          {rows.map((b) => {
            const ownerSlug = b.owner.profile?.isPublic ? b.owner.profile.slug : null;
            return (
              <li key={b.id}>
                <article className="flex h-full flex-col gap-3 rounded-xl border border-line bg-surface p-5 shadow-card">
                  <div className="flex flex-wrap gap-2">
                    {b.category ? <Badge variant="secondary">{b.category.name}</Badge> : null}
                    {b.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
                  </div>
                  <h2 className="text-h3">{b.name}</h2>
                  <p className="text-small text-ink">{b.description}</p>
                  <p className="mt-auto text-small text-muted-foreground">
                    {b.chapter.name} ·{" "}
                    {ownerSlug ? (
                      <Link
                        href={`/members/${ownerSlug}`}
                        className="font-semibold text-brand-700 underline"
                      >
                        {t("owner", { name: b.owner.name })}
                      </Link>
                    ) : (
                      t("owner", { name: b.owner.name })
                    )}
                  </p>
                  {b.website ? <ExternalLink href={b.website}>{t("website")}</ExternalLink> : null}
                </article>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={StoreIcon}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Link href="/pricing" className={buttonVariants()}>
              {t("list")}
            </Link>
          }
        />
      )}
      <Pagination path="/businesses" filters={filters} pages={pages} />
    </>
  );
}

export default async function BusinessesPage({ searchParams }: Props) {
  const t = await getTranslations("businesses");
  return (
    <div className="container-page flex flex-col gap-6 py-12">
      <header className="flex max-w-3xl flex-col gap-2">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="text-muted-foreground">{t("lead")}</p>
      </header>
      <Suspense fallback={<Skeleton className="h-[30rem] w-full" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
