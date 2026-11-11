import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { toQueryString } from "@/lib/directory/filters";
import { Link } from "@/lib/i18n/navigation";

type Filters = Record<string, string | number | boolean | undefined> & { page: number };

/** Previous / next as real links that keep every filter. Rendered only when there is more than one page. */
export async function Pagination({
  path,
  filters,
  pages,
}: {
  path: string;
  filters: Filters;
  pages: number;
}) {
  if (pages <= 1) return null;
  const t = await getTranslations("directory");
  const href = (page: number) => `${path}${toQueryString({ ...filters, page })}`;
  return (
    <nav aria-label={t("pagination")} className="flex items-center justify-between gap-3">
      {filters.page > 1 ? (
        <Link href={href(filters.page - 1)} className={buttonVariants({ variant: "outline" })}>
          <ChevronLeftIcon aria-hidden="true" />
          {t("previous")}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-small text-muted-foreground">
        {t("pageOf", { page: filters.page, pages })}
      </span>
      {filters.page < pages ? (
        <Link href={href(filters.page + 1)} className={buttonVariants({ variant: "outline" })}>
          {t("next")}
          <ChevronRightIcon aria-hidden="true" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
