"use client";

import { Link, usePathname } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

type NavLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  onNavigate?: () => void;
  /** Only the exact path is current (not its sub-pages). */
  exact?: boolean;
};

/** Internal link that marks the current page with aria-current (and a visible underline). */
export function NavLink({ href, children, className, onNavigate, exact }: NavLinkProps) {
  const pathname = usePathname();
  const current =
    pathname === href || (!exact && href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "inline-flex min-h-11 items-center rounded-md px-3 font-heading font-semibold text-brand-950 hover:bg-brand-50 aria-[current=page]:underline aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8",
        className,
      )}
    >
      {children}
    </Link>
  );
}
