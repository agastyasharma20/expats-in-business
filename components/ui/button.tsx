import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Slot } from "radix-ui";

// EiB buttons: sentence case, Cabin semibold, 44px minimum touch target, visible focus outline.
// Only transform is transitioned (press feedback); colour changes are instant (motion rules).
const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent font-heading font-semibold whitespace-nowrap transition-transform duration-(--duration-micro) ease-(--ease-brand) outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        /** Primary action: EiB Green. */
        default: "bg-primary text-primary-foreground hover:bg-brand-800",
        /** The one "Join EiB" moment per screen: the live site's CTA orange, darkened for contrast. */
        highlight: "bg-ember-600 text-on-dark hover:bg-ember-700",
        secondary: "bg-secondary text-secondary-foreground hover:bg-brand-200",
        /** Matches the live site's outlined "Need help?" button. */
        outline:
          "border-brand-950 bg-surface text-brand-950 hover:bg-brand-50 aria-expanded:bg-brand-50",
        ghost: "text-brand-950 hover:bg-brand-50 aria-expanded:bg-brand-50",
        destructive: "bg-destructive text-on-dark hover:bg-danger-700",
        link: "text-primary underline decoration-1 underline-offset-4 hover:text-brand-800 hover:decoration-2",
      },
      size: {
        default: "h-11 px-5 text-body",
        // 40px visual height, 44px hit area via the pseudo-element.
        sm: "h-10 px-4 text-small before:absolute before:-inset-y-0.5 before:inset-x-0 before:content-['']",
        lg: "h-12 px-6 text-[1.0625rem]",
        icon: "size-11",
        "icon-sm":
          "size-10 before:absolute before:-inset-0.5 before:content-[''] [&_svg:not([class*='size-'])]:size-4",
        /** For link-style buttons inside running text. */
        inline: "h-auto p-0 text-[length:inherit] font-[inherit]",
      },
    },
    compoundVariants: [{ variant: "link", size: "default", class: "h-auto min-h-11 px-0 py-2.5" }],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants, type ButtonProps };
