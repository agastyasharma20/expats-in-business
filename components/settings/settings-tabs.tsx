"use client";

import { Link, usePathname } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

/** Tab-style links (real URLs, so each tab can be bookmarked and survives a reload). */
export function SettingsTabs({
  tabs,
  label,
}: {
  tabs: { href: string; label: string }[];
  label: string;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="-mx-1 overflow-x-auto border-b border-line">
      <ul className="flex gap-1 px-1">
        {tabs.map((tab) => {
          const current = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center border-b-2 px-3 font-semibold whitespace-nowrap",
                  current
                    ? "border-brand-700 text-brand-950"
                    : "border-transparent text-muted-foreground hover:text-brand-950",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
