import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

/** Filter options as real links (shareable URLs, work without JavaScript); the current one is marked. */
export function FilterChips({
  items,
}: {
  items: { label: string; href: string; current: boolean }[];
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item.href + item.label}>
          <Link
            href={item.href}
            aria-current={item.current ? "true" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-4 font-semibold transition-colors duration-(--duration-micro)",
              item.current
                ? "border-primary bg-primary text-primary-foreground"
                : "border-line-strong bg-surface text-brand-950 hover:border-brand-700",
            )}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
