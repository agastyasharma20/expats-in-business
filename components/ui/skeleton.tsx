import { cn } from "cn";

/**
 * Loading placeholder with a 1.4s shimmer (one of the only looping animations allowed). The shimmer
 * moves background-position, which is cheap, and stops under prefers-reduced-motion. Decorative:
 * the loading region itself should carry aria-busy and a text label.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--muted)_0%,var(--brand-100)_50%,var(--muted)_100%)] bg-size-[200%_100%] motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
