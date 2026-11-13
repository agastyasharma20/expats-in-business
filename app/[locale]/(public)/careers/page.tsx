import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { BriefcaseIcon, HeartHandshakeIcon, RocketIcon, UsersIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { RoleCard } from "@/components/growth/role-card";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_KINDS, type RoleKind } from "@/lib/growth/rules";
import { listOpenRoles } from "@/lib/growth/opportunities";
import { Link } from "@/lib/i18n/navigation";
import { withAlternates } from "@/lib/seo";
import { cn } from "@/lib/utils";

type Props = PageProps<"/[locale]/careers">;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("careers");
  return withAlternates("/careers", { title: t("title"), description: t("lead") });
}

async function Roles({ searchParams }: { searchParams: Props["searchParams"] }) {
  await connection();
  const raw = (await searchParams).kind;
  const kind = (ROLE_KINDS as readonly string[]).includes(String(raw)) ? (raw as RoleKind) : null;
  const [t, roles] = await Promise.all([
    getTranslations("careers"),
    listOpenRoles(kind ? [kind] : undefined),
  ]);
  const filters: (RoleKind | null)[] = [null, ...ROLE_KINDS];
  return (
    <div className="flex flex-col gap-5">
      <nav aria-label={t("filter")} className="flex flex-wrap gap-2">
        {filters.map((k) => (
          <Link
            key={k ?? "all"}
            href={k ? `/careers?kind=${k}` : "/careers"}
            aria-current={kind === k ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-4 text-small font-semibold",
              kind === k
                ? "border-brand-700 bg-brand-950 text-on-dark"
                : "border-line-strong bg-surface text-ink hover:border-brand-700",
            )}
          >
            {k ? t(`kinds.${k}`) : t("all")}
          </Link>
        ))}
      </nav>
      {roles.length ? (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="roles">
          {roles.map((role, i) => (
            <RoleCard key={role.slug} role={role} index={i} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={BriefcaseIcon}
          title={t("emptyTitle")}
          description={t("emptyText")}
          action={
            <Link href="/ambassadors" className={buttonVariants()}>
              {t("becomeAmbassador")}
            </Link>
          }
        />
      )}
    </div>
  );
}

/** Careers: how to build EiB with us. Most roles are volunteer roles, said plainly on the page. */
export default async function CareersPage({ searchParams }: Props) {
  const t = await getTranslations("careers");
  return (
    <div className="flex flex-col">
      <header className="relative overflow-hidden bg-brand-950 text-on-dark">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 size-96 rounded-full bg-brand-500/25 blur-3xl"
        />
        <div className="container-page relative flex flex-col gap-5 py-16 lg:py-24">
          <p className="eyebrow text-on-dark-muted">{t("eyebrow")}</p>
          <h1 className="max-w-3xl text-display-sm text-on-dark lg:text-display">{t("title")}</h1>
          <p className="max-w-2xl text-h3 font-normal text-on-dark-muted">{t("lead")}</p>
          <p className="max-w-2xl rounded-xl bg-on-dark/10 p-3 text-small text-on-dark">
            {t("honest")}
          </p>
        </div>
      </header>
      <div className="container-page flex flex-col gap-14 py-12">
        <section aria-labelledby="why-title" className="grid gap-5 md:grid-cols-3">
          <h2 id="why-title" className="sr-only">
            {t("whyTitle")}
          </h2>
          {(
            [
              ["mission", HeartHandshakeIcon],
              ["growth", RocketIcon],
              ["people", UsersIcon],
            ] as const
          ).map(([k, Icon], i) => (
            <div
              key={k}
              className="flex animate-rise flex-col gap-2 rounded-2xl border border-line bg-surface p-5"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Icon aria-hidden="true" className="size-7 text-brand-700" />
              <h3 className="text-body font-bold">{t(`why.${k}.title`)}</h3>
              <p className="text-small text-ink">{t(`why.${k}.text`)}</p>
            </div>
          ))}
        </section>
        <section aria-labelledby="roles-title" className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="roles-title" className="text-h2">
              {t("rolesTitle")}
            </h2>
            <Link href="/volunteer" className={buttonVariants({ variant: "outline" })}>
              {t("volunteerLink")}
            </Link>
          </div>
          <Suspense fallback={<Skeleton className="h-72 w-full" />}>
            <Roles searchParams={searchParams} />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
