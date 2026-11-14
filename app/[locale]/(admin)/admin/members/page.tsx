import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { DownloadIcon, SearchIcon, UsersIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { MemberRowActions } from "@/components/admin/member-row-actions";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { controlStyles } from "@/components/ui/control-styles";
import { Skeleton } from "@/components/ui/skeleton";
import { listMembers, memberFilterSchema, type MemberFilters } from "@/lib/admin/members";
import { isAdmin } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

type Props = PageProps<"/[locale]/admin/members">;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminMembers");
  return { title: t("title"), robots: { index: false } };
}

function pageHref(f: MemberFilters, page: number) {
  const params = new URLSearchParams({
    q: f.q,
    status: f.status,
    role: f.role,
    page: String(page),
  });
  return `/admin/members?${params.toString()}`;
}

async function MembersTable({ searchParams }: { searchParams: Props["searchParams"] }) {
  await connection();
  const user = await requirePermission("admin.access");
  if (!isAdmin(user)) forbidden();
  const raw = await searchParams;
  const filters = memberFilterSchema.parse({
    q: typeof raw.q === "string" ? raw.q : undefined,
    status: raw.status,
    role: raw.role,
    page: raw.page,
  });
  const [t, format, { rows, total, pages }, chapters] = await Promise.all([
    getTranslations("adminMembers"),
    getFormatter(),
    listMembers(filters),
    getDb().chapter.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const exportParams = new URLSearchParams({
    q: filters.q,
    status: filters.status,
    role: filters.role,
  });

  return (
    <>
      <form
        method="get"
        className="grid gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
        role="search"
      >
        <label className="flex flex-col gap-1 text-small font-semibold text-ink">
          {t("search")}
          <input
            name="q"
            defaultValue={filters.q}
            maxLength={80}
            placeholder={t("searchPlaceholder")}
            className={cn(controlStyles, "h-11")}
          />
        </label>
        <label className="flex flex-col gap-1 text-small font-semibold text-ink">
          {t("status")}
          <select name="status" defaultValue={filters.status} className={cn(controlStyles, "h-11")}>
            {(["all", "active", "suspended", "deletion"] as const).map((s) => (
              <option key={s} value={s}>
                {t(`statuses.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-small font-semibold text-ink">
          {t("roleFilter")}
          <select name="role" defaultValue={filters.role} className={cn(controlStyles, "h-11")}>
            {(["any", "admin", "chapter_lead", "moderator", "bubble_lead"] as const).map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}`)}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit">
          <SearchIcon aria-hidden="true" />
          {t("apply")}
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-muted-foreground" aria-live="polite">
          {t("results", { count: total })}
        </p>
        <a
          href={`/api/admin/export?${exportParams.toString()}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
          download
        >
          <DownloadIcon aria-hidden="true" />
          {t("export")}
        </a>
      </div>

      <ul className="flex flex-col gap-3" data-testid="admin-members">
        {rows.map((m) => {
          const locked = m.id === user.id || m.roles.some((r) => r.role === "admin");
          return (
            <li key={m.id} className="rounded-2xl border border-line bg-surface shadow-card">
              <details className="group">
                <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4">
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold text-brand-950">{m.name}</span>
                    <span className="truncate text-small text-muted-foreground">{m.email}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-small">
                    {m.suspendedAt ? (
                      <Badge variant="destructive">{t("statuses.suspended")}</Badge>
                    ) : null}
                    {m.deletionRequestedAt ? (
                      <Badge variant="unconfirmed">{t("statuses.deletion")}</Badge>
                    ) : null}
                    {m.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
                    {m.roles
                      .filter((r) => r.role !== "member")
                      .slice(0, 2)
                      .map((r) => (
                        <Badge key={r.id} variant="secondary">
                          {t(`roles.${r.role}`)}
                        </Badge>
                      ))}
                    <span className="text-muted-foreground">
                      {m.profile?.homeChapter?.name ?? "—"} ·{" "}
                      {t("joined", { date: format.dateTime(m.createdAt, { dateStyle: "medium" }) })}{" "}
                      · {t("checkIns", { count: m._count.checkIns })}
                    </span>
                    <span
                      aria-hidden="true"
                      className="text-primary transition-transform duration-(--duration-micro) group-open:rotate-90"
                    >
                      ›
                    </span>
                  </span>
                </summary>
                <div className="border-t border-line p-4">
                  {m.profile?.slug ? (
                    <Link
                      href={`/members/${m.profile.slug}`}
                      className="mb-3 inline-flex min-h-11 items-center text-small font-semibold text-primary hover:underline"
                    >
                      {t("viewProfile")}
                    </Link>
                  ) : null}
                  <MemberRowActions member={m} chapters={chapters} locked={locked} />
                </div>
              </details>
            </li>
          );
        })}
      </ul>

      {pages > 1 ? (
        <nav aria-label={t("pagination")} className="flex items-center justify-center gap-2">
          {filters.page > 1 ? (
            <Link
              href={pageHref(filters, filters.page - 1)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {t("prev")}
            </Link>
          ) : null}
          <span className="text-small text-muted-foreground">
            {t("page", { page: filters.page, pages })}
          </span>
          {filters.page < pages ? (
            <Link
              href={pageHref(filters, filters.page + 1)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {t("next")}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}

export default async function AdminMembersPage({ searchParams }: Props) {
  const t = await getTranslations("adminMembers");
  return (
    <div className="container-page flex flex-col gap-6 py-10">
      <PageHeader icon={UsersIcon} title={t("title")} lead={t("lead")} />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <MembersTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
