import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";

// Badges never carry meaning by colour alone: every variant is used with a visible text label.
const badgeVariants = cva(
  "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-pill border border-transparent px-2.5 text-[0.8125rem] leading-none font-bold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&>svg]:pointer-events-none [&>svg]:size-3.5!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border-line-strong bg-surface text-ink",
        destructive: "bg-danger-50 text-danger",
        /** Verified provider or business: links to the published criteria page. */
        verified: "bg-brand-100 text-brand-950",
        /** "Founding member #017" */
        founding: "bg-highlight text-ink",
        /** Seeded demo content: "Demo profile", "Demo provider", "Demo data". */
        demo: "border-warning/40 bg-warning-50 text-warning",
        /** Not yet confirmed by EiB, or a labelled placeholder (facts registry). */
        unconfirmed: "border-dashed border-line-strong bg-surface text-ink-muted",
        /** Cultural Bubble (country of origin). */
        bubble: "bg-ember-50 text-ember-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean };

function Badge({ className, variant = "default", asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants, type BadgeProps };
