"use client";

import { CalendarDaysIcon, HomeIcon, SparklesIcon, TicketIcon, UserRoundIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "home", href: "/", icon: HomeIcon },
  { id: "events", href: "/events", icon: CalendarDaysIcon },
  { id: "tickets", href: "/my/events", icon: TicketIcon },
  { id: "concierge", href: "/concierge", icon: SparklesIcon },
  { id: "account", href: "/dashboard", icon: UserRoundIcon },
] as const;

/** The signed-in area lives under several prefixes; the account tab owns all of them. */
const ACCOUNT_PREFIXES = ["/dashboard", "/settings", "/roadmap", "/connections", "/community"];

function isActive(id: (typeof TABS)[number]["id"], href: string, pathname: string) {
  if (id === "home") return pathname === "/";
  if (id === "account") return ACCOUNT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * App-style bottom navigation. It only appears when EiB runs as an installed app on a phone
 * (CSS `display-mode: standalone`, see .app-tabbar in globals.css); in a normal browser tab the
 * regular header does the job.
 */
export function AppTabBar() {
  const t = useTranslations("pwa.tabs");
  const pathname = usePathname();
  return (
    <nav aria-label={t("label")} className="app-tabbar" data-print-hide>
      {TABS.map(({ id, href, icon: Icon }) => {
        const active = isActive(id, href, pathname);
        return (
          <Link
            key={id}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.75rem] leading-none font-semibold transition-colors duration-(--duration-micro) outline-none focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ring",
              active ? "text-brand-950" : "text-ink-muted",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex h-8 w-14 items-center justify-center rounded-pill transition-[transform,background-color] duration-(--duration-micro) ease-(--ease-brand) group-active:scale-90",
                active ? "bg-brand-100" : "bg-transparent",
              )}
            >
              <Icon className="size-5" />
            </span>
            {t(id)}
          </Link>
        );
      })}
    </nav>
  );
}
