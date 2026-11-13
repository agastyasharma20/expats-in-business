import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { BriefcaseIcon, InboxIcon, ListIcon, PlusIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { ReviewBoard } from "@/components/admin/review-board";
import { RoleForm } from "@/components/admin/role-form";
import { Panel } from "@/components/dashboard/panel";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { isAdmin } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { Link } from "@/lib/i18n/navigation";
import { reviewRoleApplication } from "@/server/actions/roles";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("adminGrowth");
  return { title: t("rolesTitle"), robots: { index: false } };
}

/** Careers admin: write roles (draft → open → closed) and review who applied. */
export default async function AdminRolesPage() {
  const user = await requirePermission("admin.access");
  if (!isAdmin(user)) forbidden();
  const db = getDb();
  const [t, tc, format, roles, apps] = await Promise.all([
    getTranslations("adminGrowth"),
    getTranslations("careers"),
    getFormatter(),
    db.openRole.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { _count: { select: { applications: true } } },
    }),
    db.roleApplication.findMany({
      where: { status: { not: "withdrawn" } },
      orderBy: { createdAt: "asc" },
      take: 400,
      select: {
        id: true,
        status: true,
        message: true,
        portfolioUrl: true,
        createdAt: true,
        user: { select: { name: true } },
        role: { select: { title: true, kind: true, isDemo: true } },
      },
    }),
  ]);
  const items = apps.map((a) => ({
    id: a.id,
    status: a.status,
    title: `${a.user.name} · ${a.role.title}`,
    meta: format.relativeTime(a.createdAt),
    body: a.message,
    link: a.portfolioUrl,
    tags: [tc(`kinds.${a.role.kind}`)],
    isDemo: a.role.isDemo,
  }));

  return (
    <div className="container-page flex flex-col gap-8 py-10">
      <PageHeader icon={BriefcaseIcon} title={t("rolesTitle")} lead={t("rolesLead")} />
      <Panel id="role-apps" title={t("applicationsTitle")} icon={InboxIcon}>
        <ReviewBoard items={items} action={reviewRoleApplication} testId="role-board" />
      </Panel>
      <Panel id="roles-list" title={t("rolesList")} icon={ListIcon}>
        <ul className="flex flex-col gap-3" data-testid="admin-roles">
          {roles.map((role) => (
            <li key={role.id} className="rounded-xl border border-line bg-surface">
              <details>
                <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-2 p-4">
                  <span className="font-semibold text-brand-950">{role.title}</span>
                  <Badge variant={role.status === "open" ? "verified" : "outline"}>
                    {t(`roleStatus.${role.status}`)}
                  </Badge>
                  <Badge variant="secondary">{tc(`kinds.${role.kind}`)}</Badge>
                  {role.isDemo ? <Badge variant="demo">{t("demo")}</Badge> : null}
                  <span className="text-small text-muted-foreground">
                    {t("applicants", { count: role._count.applications })}
                  </span>
                </summary>
                <div className="flex flex-col gap-3 border-t border-line p-4">
                  {role.status === "open" ? (
                    <Link
                      href={`/careers/${role.slug}`}
                      className="inline-flex min-h-11 items-center self-start font-semibold text-primary underline"
                    >
                      {t("viewPublic")}
                    </Link>
                  ) : null}
                  <RoleForm role={role} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel id="role-new" title={t("roleNew")} icon={PlusIcon}>
        <RoleForm />
      </Panel>
    </div>
  );
}
