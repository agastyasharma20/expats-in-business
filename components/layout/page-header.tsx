import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: React.ReactNode;
  lead?: React.ReactNode;
  eyebrow?: React.ReactNode;
  icon?: LucideIcon;
  /** Buttons or links aligned to the right on wide screens. */
  actions?: React.ReactNode;
  className?: string;
};

/** Consistent page heading for member, community and admin pages (one h1, rises in on load). */
export function PageHeader({
  title,
  lead,
  eyebrow,
  icon: Icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex animate-rise flex-col gap-4 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="flex max-w-2xl flex-col gap-2">
        {eyebrow ? <p className="eyebrow text-brand-700">{eyebrow}</p> : null}
        <h1 className="flex items-center gap-3 text-h2 sm:text-h1">
          {Icon ? (
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-950">
              <Icon aria-hidden="true" className="size-6" />
            </span>
          ) : null}
          {title}
        </h1>
        {lead ? <p className="text-muted-foreground">{lead}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}
