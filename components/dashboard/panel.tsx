import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Dashboard card shell: icon, heading, optional link in the corner, equal height in its row. */
export function Panel({
  id,
  title,
  icon: Icon,
  aside,
  children,
  className,
  delay = 0,
  testId,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Entrance stagger index (60ms steps). */
  delay?: number;
  testId?: string;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      data-testid={testId}
      className={cn(
        "flex animate-rise flex-col gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6",
        className,
      )}
      style={{ animationDelay: `${delay * 60}ms` }}
    >
      <header className="flex items-center justify-between gap-3">
        <h2 id={`${id}-title`} className="flex items-center gap-2.5 text-body font-bold">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-100 text-brand-950">
            <Icon aria-hidden="true" className="size-5" />
          </span>
          {title}
        </h2>
        {aside}
      </header>
      {children}
    </section>
  );
}
