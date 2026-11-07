import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

type EmptyStateProps = {
  title: React.ReactNode;
  description: React.ReactNode;
  /** Required: an empty page always offers a next step (a button or link). */
  action: React.ReactNode;
  icon?: LucideIcon;
  /** Heading level for the title, so it fits the page outline. */
  headingLevel?: "h2" | "h3";
  className?: string;
};

/** Designed empty state with a next action (CLAUDE.md rule 8: no page ships empty). */
function EmptyState({
  title,
  description,
  action,
  icon: Icon,
  headingLevel = "h2",
  className,
}: EmptyStateProps) {
  const Heading = headingLevel;
  return (
    <section
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center gap-4 rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="flex size-14 items-center justify-center rounded-full bg-brand-100 text-brand-950">
          <Icon aria-hidden="true" className="size-7" />
        </span>
      ) : null}
      <div className="flex max-w-md flex-col gap-2">
        <Heading className="text-h3">{title}</Heading>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">{action}</div>
    </section>
  );
}

export { EmptyState, type EmptyStateProps };
