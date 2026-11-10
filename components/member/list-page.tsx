import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";

type ListPageProps = {
  title: string;
  icon: LucideIcon;
  items: { id: string; title: React.ReactNode; meta?: React.ReactNode; href?: string }[];
  empty: { text: string; actionLabel: string; actionHref: string };
};

/** Simple member list (targets of the dashboard stat cards); designed empty state with a next step. */
export function ListPage({ title, icon, items, empty }: ListPageProps) {
  return (
    <div className="container-page flex flex-col gap-8 py-12">
      <h1 className="text-h1">{title}</h1>
      {items.length ? (
        <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-1 p-4">
              {item.href ? (
                <Link href={item.href} className="font-semibold text-brand-950 hover:underline">
                  {item.title}
                </Link>
              ) : (
                <span className="font-semibold text-brand-950">{item.title}</span>
              )}
              {item.meta ? (
                <span className="text-small text-muted-foreground">{item.meta}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={icon}
          title={title}
          description={empty.text}
          action={
            <Link href={empty.actionHref} className={buttonVariants()}>
              {empty.actionLabel}
            </Link>
          }
        />
      )}
    </div>
  );
}
