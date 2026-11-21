import { getTranslations } from "next-intl/server";

import { isAdmin } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import { NavLink } from "@/components/layout/nav-link";

import { CommandPalette } from "./command-palette";

/** Sections of the command centre; `adminOnly` sections are hidden (and server-guarded) for leads. */
export const ADMIN_SECTIONS = [
  { key: "overview", href: "/admin", adminOnly: false },
  { key: "events", href: "/admin/events", adminOnly: false },
  { key: "festivals", href: "/admin/festivals", adminOnly: false },
  { key: "members", href: "/admin/members", adminOnly: true },
  { key: "providers", href: "/admin/providers", adminOnly: true },
  { key: "moderation", href: "/moderation", adminOnly: false },
  { key: "applications", href: "/admin/applications", adminOnly: false },
  { key: "ambassadors", href: "/admin/ambassadors", adminOnly: true },
  { key: "roles", href: "/admin/roles", adminOnly: true },
  { key: "roulette", href: "/admin/roulette", adminOnly: true },
  { key: "audit", href: "/admin/audit", adminOnly: false },
  { key: "catalogs", href: "/admin/catalogs", adminOnly: true },
  { key: "team", href: "/admin/team", adminOnly: true },
  { key: "settings", href: "/admin/settings", adminOnly: true },
  { key: "system", href: "/admin/system", adminOnly: true },
] as const;

/** Admin sub-navigation band (horizontal, scrolls on phones) with the command palette. */
export async function AdminNav({ user }: { user: SessionUser }) {
  const t = await getTranslations("adminShell");
  const sections = ADMIN_SECTIONS.filter((s) => !s.adminOnly || isAdmin(user));
  const quick = [
    { href: "/admin/events/new", label: t("quick.newEvent"), group: t("quickGroup") },
    { href: "/admin/festivals/new", label: t("quick.newFestival"), group: t("quickGroup") },
    { href: "/dashboard", label: t("quick.dashboard"), group: t("quickGroup") },
  ];
  return (
    <div className="border-b border-line bg-surface">
      <div className="container-page flex items-start gap-3 py-2">
        {/* Phones scroll the tabs sideways; from 1024 px they wrap, so none hides under the search box (F5). */}
        <nav
          aria-label={t("label")}
          className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 lg:flex-wrap lg:overflow-visible"
        >
          {sections.map((section) => (
            <NavLink
              key={section.key}
              href={section.href}
              exact={section.href === "/admin"}
              className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-small font-semibold whitespace-nowrap text-ink hover:bg-brand-50 aria-[current=page]:bg-brand-100 aria-[current=page]:text-brand-950"
            >
              {t(`sections.${section.key}`)}
            </NavLink>
          ))}
        </nav>
        <CommandPalette
          items={[
            ...sections.map((s) => ({
              href: s.href,
              label: t(`sections.${s.key}`),
              group: t("sectionsGroup"),
            })),
            ...quick,
          ]}
        />
      </div>
    </div>
  );
}
