import { ExternalLinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";

type ExternalLinkProps = Omit<React.ComponentProps<"a">, "target" | "rel"> & {
  href: string;
  /** Hide the trailing icon, e.g. when the link already shows a brand icon. */
  hideIcon?: boolean;
};

/**
 * Link to another site: opens in a new tab with rel="noopener noreferrer", shows an icon and tells
 * screen-reader users it opens a new tab. Styled like every other link (fixes old-portal bug 2).
 */
function ExternalLink({
  href,
  className,
  children,
  hideIcon = false,
  ...props
}: ExternalLinkProps) {
  const t = useTranslations("common");
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
      <span className="sr-only"> {t("opensInNewTab")}</span>
    </a>
  );
}

export { ExternalLink, type ExternalLinkProps };
