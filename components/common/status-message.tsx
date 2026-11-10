import type { LucideIcon } from "lucide-react";

type StatusMessageProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Always at least one working next step (home, retry, contact). */
  actions: React.ReactNode;
};

/** Shared look for 404 and error pages. Presentational only, so error boundaries can use it. */
export function StatusMessage({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
}: StatusMessageProps) {
  return (
    <div className="container-page flex flex-1 flex-col items-start justify-center gap-6 py-16 md:py-24">
      <span className="flex size-16 items-center justify-center rounded-full bg-brand-100 text-brand-950">
        <Icon aria-hidden="true" className="size-8" />
      </span>
      <div className="flex max-w-2xl flex-col gap-3">
        <p className="eyebrow text-brand-700">{eyebrow}</p>
        <h1 className="text-display-sm md:text-h1">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap gap-3">{actions}</div>
    </div>
  );
}
