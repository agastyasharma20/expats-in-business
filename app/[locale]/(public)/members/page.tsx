import { Suspense } from "react";
import type { Metadata } from "next";
import { UsersIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { FilterForm, type FilterField } from "@/components/directory/filter-form";
import { MemberCard } from "@/components/directory/member-card";
import { Pagination } from "@/components/directory/pagination";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/lib/auth/session";
import { parseMemberFilters } from "@/lib/directory/filters";
import { memberFilterOptions, searchMembers } from "@/lib/directory/queries";
import { Link } from "@/lib/i18n/navigation";
import { withAlternates } from "@/lib/seo";

type Props = PageProps<"/[locale]/members">;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("members");
  return withAlternates("/members", { title: t("title"), description: t("lead") });
}

async function Results({ searchParams }: { searchParams: Props["searchParams"] }) {
  const [params, user, t, d, locale, options] = await Promise.all([
    searchParams,
    getSessionUser(),
    getTranslations("members"),
    getTranslations("directory"),
    getLocale(),
    memberFilterOptions(),
  ]);
  const signedIn = Boolean(user);
  const filters = parseMemberFilters(params);
  const { rows, total, pages } = await searchMembers(filters, signedIn);
  const regions = new Intl.DisplayNames([locale], { type: "region" });
  const languages = new Intl.DisplayNames([locale], { type: "language" });

  const fields: FilterField[] = [
    {
      kind: "select",
      name: "chapter",
      label: t("chapter"),
      value: filters.chapter,
      options: options.chapters.map((c) => ({ value: c.slug, label: c.name })),
    },
    ...(signedIn
      ? ([
          {
            kind: "select",
            name: "industry",
            label: t("industry"),
            value: filters.industry,
            options: options.industries.map((i) => ({ value: i.slug, label: i.name })),
          },
          {
            kind: "select",
            name: "language",
            label: t("language"),
            value: filters.language,
            options: options.languages.map((l) => ({ value: l, label: languages.of(l) ?? l })),
          },
          {
            kind: "select",
            name: "origin",
            label: t("origin"),
            value: filters.origin,
            hint: t("originHint"),
            options: options.origins.map((o) => ({ value: o, label: regions.of(o) ?? o })),
          },
          {
            kind: "text",
            name: "skill",
            label: t("skill"),
            value: filters.skill,
            placeholder: t("skillPlaceholder"),
          },
        ] satisfies FilterField[])
      : []),
    { kind: "check", name: "coffee", label: t("coffee"), checked: filters.coffee },
  ];

  return (
    <>
      <FilterForm action="/members" q={filters.q} fields={fields} />
      {!signedIn ? (
        <p className="flex flex-wrap items-center gap-3 text-small text-muted-foreground">
          {t("visitorNote")}
          <Link
            href="/sign-in?next=%2Fmembers"
            className={buttonVariants({ variant: "link", size: "inline" })}
          >
            {t("signIn")}
          </Link>
        </p>
      ) : null}
      <p role="status" className="font-semibold text-brand-950" data-testid="result-count">
        {d("results", { count: total })}
      </p>
      {rows.length ? (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="member-list">
          {rows.map((member) => (
            <li key={member.slug}>
              <MemberCard member={member} signedIn={signedIn} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={UsersIcon}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Link href="/members" className={buttonVariants()}>
              {d("clear")}
            </Link>
          }
        />
      )}
      <Pagination path="/members" filters={filters} pages={pages} />
    </>
  );
}

export default async function MembersPage({ searchParams }: Props) {
  const t = await getTranslations("members");
  return (
    <div className="container-page flex flex-col gap-6 py-12">
      <header className="flex max-w-3xl flex-col gap-2">
        <h1 className="text-h1">{t("title")}</h1>
        <p className="text-muted-foreground">{t("lead")}</p>
      </header>
      <Suspense fallback={<Skeleton className="h-[40rem] w-full" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
