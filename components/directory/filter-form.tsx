import { SearchIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/lib/i18n/navigation";

export type FilterField =
  | {
      kind: "select";
      name: string;
      label: string;
      value?: string;
      options: { value: string; label: string }[];
      hint?: string;
    }
  | { kind: "text"; name: string; label: string; value?: string; placeholder?: string }
  | { kind: "check"; name: string; label: string; checked?: boolean };

const control =
  "min-h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/**
 * Directory filters as a plain GET form: the URL is the state (shareable, back button works),
 * filters combine, and it works without JavaScript. Server-rendered.
 */
export async function FilterForm({
  action,
  q,
  fields,
}: {
  action: string;
  q?: string;
  fields: FilterField[];
}) {
  const t = await getTranslations("directory");
  // No action attribute: the form submits to the current URL, so the locale prefix is kept.
  return (
    <form
      method="get"
      role="search"
      aria-label={t("filters")}
      className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 shadow-card"
      data-testid="filters"
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-small font-semibold">{t("search")}</span>
        <span className="relative">
          <SearchIcon
            aria-hidden="true"
            className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            name="q"
            type="search"
            defaultValue={q}
            placeholder={t("searchPlaceholder")}
            maxLength={60}
            className="pl-10"
          />
        </span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) =>
          field.kind === "select" ? (
            <label key={field.name} className="flex flex-col gap-1.5">
              <span className="text-small font-semibold">{field.label}</span>
              <select name={field.name} defaultValue={field.value ?? ""} className={control}>
                <option value="">{t("any")}</option>
                {field.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {field.hint ? (
                <span className="text-small text-muted-foreground">{field.hint}</span>
              ) : null}
            </label>
          ) : field.kind === "text" ? (
            <label key={field.name} className="flex flex-col gap-1.5">
              <span className="text-small font-semibold">{field.label}</span>
              <Input
                name={field.name}
                defaultValue={field.value}
                placeholder={field.placeholder}
                maxLength={40}
              />
            </label>
          ) : (
            <label
              key={field.name}
              className="flex min-h-11 cursor-pointer items-center gap-3 self-end text-ink"
            >
              <input
                type="checkbox"
                name={field.name}
                value="1"
                defaultChecked={field.checked}
                className="size-5 accent-brand-700"
              />
              {field.label}
            </label>
          ),
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit">{t("apply")}</Button>
        <Link href={action} className={buttonVariants({ variant: "ghost" })}>
          {t("clear")}
        </Link>
      </div>
    </form>
  );
}
