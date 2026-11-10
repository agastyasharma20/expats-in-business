import { ExternalLinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

type ExternalLinkBaseProps = Omit<React.ComponentProps<"a">, "target" | "rel"> & {
  href: string;
  /** Screen-reader text appended to the link, e.g. "(opens in a new tab)". */
  newTabLabel: string;
  /** Hide the trailing icon, e.g. when the link already shows a brand icon. */
  hideIcon?: boolean;
};

export type ExternalLinkProps = Omit<ExternalLinkBaseProps, "newTabLabel">;

/**
 * Link to another site: opens in a new tab with rel="noopener noreferrer", shows an icon and tells
 * screen-reader users it opens a new tab. Styled like every other link (fixes old-portal bug 2).
 * Use this base directly where request APIs are unavailable (inside "use cache").
 */
export function ExternalLinkBase({
  href,
  className,
  children,
  hideIcon = false,
  newTabLabel,
  ...props
}: ExternalLinkBaseProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 font-semibold text-primary underline decoration-1 underline-offset-4 hover:text-brand-800 hover:decoration-2",
        className,
      )}
      {...props}
    >
      {children}
      {hideIcon ? null : <ExternalLinkIcon aria-hidden="true" className="size-4 shrink-0" />}
      <span className="sr-only"> {newTabLabel}</span>
    </a>
  );
}

/** ExternalLink with the translated "opens in a new tab" label. */
export function ExternalLink(props: ExternalLinkProps) {
  const t = useTranslations("common");
  return <ExternalLinkBase {...props} newTabLabel={t("opensInNewTab")} />;
}
