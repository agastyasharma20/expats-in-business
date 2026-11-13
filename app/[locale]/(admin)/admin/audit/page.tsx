import { Suspense } from "react";
import type { Metadata } from "next";
import { ScrollTextIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import { z } from "zod";

import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { controlStyles } from "@/components/ui/control-styles";
import { Skeleton } from "@/components/ui/skeleton";
import { isAdmin } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

type Props = PageProps<"/[locale]/admin/audit">;
const PAGE = 40;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminAudit");
  return { title: t("title"), robots: { index: false } };
}

const filterSchema = z.object({
  action: z
    .string()
    .trim()
    .regex(/^[a-z.]{0,40}$/)
    .catch(""),
  page: z.coerce.number().int().min(1).max(5000).catch(1),
});

/** Audit log: admins see everything; chapter leads see entries for their chapters. */
async function AuditTable({ searchParams }: { searchParams: Props["searchParams"] }) {
  const user = await requirePermission("admin.access");
  const raw = await searchParams;
  const f = filterSchema.parse({ action: raw.action, page: raw.page });
  const chapterIds = isAdmin(user)
    ? null
    : user.roles.filter((r) => r.role === "chapter_lead" && r.chapterId).map((r) => r.chapterId!);
  const where = {
    ...(chapterIds ? { chapterId: { in: chapterIds } } : {}),
    ...(f.action ? { action: { startsWith: f.action } } : {}),
  };
  const db = getDb();
  const [t, format, rows, total, actions] = await Promise.all([
    getTranslations("adminAudit"),
    getFormatter(),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (f.page - 1) * PAGE,
      take: PAGE,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        meta: true,
        createdAt: true,
        actor: { select: { name: true } },
        chapter: { select: { name: true } },
      },
    }),
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where: chapterIds ? { chapterId: { in: chapterIds } } : {},
      distinct: ["action"],
      select: { action: true },
      take: 100,
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (page: number) =>
    `/admin/audit?${new URLSearchParams({ action: f.action, page: String(page) })}`;

  return (
    <>
      <form
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card"
        role="search"
      >
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-small font-semibold text-ink">
          {t("action")}
          <select name="action" defaultValue={f.action} className={cn(controlStyles, "h-11")}>
            <option value="">{t("allActions")}</option>
            {actions.map((a) => (
              <option key={a.action} value={a.action}>
                {a.action}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit">{t("apply")}</Button>
      </form>
      <div
        className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-card"
        role="region"
        aria-label={t("title")}
        tabIndex={0}
      >
        <table className="w-full min-w-[44rem] text-left text-small" data-testid="audit-log">
          <thead className="bg-canvas text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t("when")}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t("who")}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t("action")}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t("entity")}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                {t("details")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    <time dateTime={row.createdAt.toISOString()}>
                      {format.dateTime(row.createdAt, { dateStyle: "medium", timeStyle: "short" })}
                    </time>
                  </td>
                  <td className="px-4 py-3 text-ink">{row.actor?.name ?? t("system")}</td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-brand-50 px-1.5 py-0.5 text-brand-950">
                      {row.action}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {row.entityType}
                    {row.chapter ? ` · ${row.chapter.name}` : ""}
                  </td>
                  <td className="px-4 py-3 font-mono text-[0.8125rem] text-muted-foreground">
                    {row.meta ? JSON.stringify(row.meta) : "—"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {t("empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 ? (
        <nav aria-label={t("pagination")} className="flex items-center justify-center gap-2">
          {f.page > 1 ? (
            <Link
              href={href(f.page - 1)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {t("prev")}
            </Link>
          ) : null}
          <span className="text-small text-muted-foreground">
            {t("page", { page: f.page, pages })}
          </span>
          {f.page < pages ? (
            <Link
              href={href(f.page + 1)}
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

export default async function AuditPage({ searchParams }: Props) {
  const t = await getTranslations("adminAudit");
  return (
    <div className="container-page flex flex-col gap-6 py-10">
      <PageHeader icon={ScrollTextIcon} title={t("title")} lead={t("lead")} />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <AuditTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
