import type { LucideIcon } from "lucide-react";

/** A festival page section with its anchor (the sticky section nav links to `id`). */
export function FestivalSection({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-28 flex-col gap-5">
      <h2 id={`${id}-title`} className="flex items-center gap-3 text-h2">
        <span className="flex size-11 items-center justify-center rounded-xl bg-brand-100 text-brand-950">
          <Icon aria-hidden="true" className="size-6" />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}
