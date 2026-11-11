import type { LucideIcon } from "lucide-react";

/**
 * One label/value pair inside a <dl>. Valid definition-list markup: the wrapper div holds only
 * a <dt> and a <dd>, and the icon sits inside the <dt> (decorative, hidden from assistive tech).
 */
export function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="eyebrow flex items-center gap-2 text-muted-foreground">
        <Icon aria-hidden="true" className="size-5 shrink-0 text-brand-700" />
        {label}
      </dt>
      <dd className="pl-7 text-ink">{children}</dd>
    </div>
  );
}
