import { BookOpenIcon, ExternalLinkIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import type { RoadmapItem } from "@/lib/roadmap/service";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

import { TaskToggle } from "./task-toggle";

type Props = {
  item: RoadmapItem;
  step: number;
  total: number;
  official: string | null;
  titles: Map<string, string>;
};

/** One roadmap step: why it matters, guide and official links, due date, done toggle. */
export async function TaskCard({ item, step, total, official, titles }: Props) {
  const overdue = item.overdue;
  const [t, common, format] = await Promise.all([
    getTranslations("roadmap"),
    getTranslations("common"),
    getFormatter(),
  ]);
  const date = (d: Date) => format.dateTime(d, { dateStyle: "medium", timeZone: "UTC" });
  const done = Boolean(item.doneAt);

  return (
    <article
      className={cn(
        "relative flex flex-col gap-3 rounded-xl border bg-surface p-5 shadow-card",
        done ? "border-success/40 bg-success-50/40" : "border-line",
      )}
      data-testid="roadmap-task"
      data-slug={item.slug}
      data-done={done || undefined}
    >
      <p className="eyebrow text-muted-foreground">{t("step", { n: step, total })}</p>
      <h3 className={cn("text-h3", done && "text-muted-foreground line-through decoration-2")}>
        {item.title}
      </h3>
      <p className="text-small text-ink">{item.why}</p>
      {item.dependsOn.length ? (
        <p className="text-small text-muted-foreground">
          {t("after", { steps: item.dependsOn.map((s) => titles.get(s) ?? s).join(", ") })}
        </p>
      ) : null}
      <p
        className={cn(
          "text-small font-semibold",
          done ? "text-success" : overdue ? "text-danger" : "text-brand-950",
        )}
      >
        {done && item.doneAt
          ? t("doneOn", { date: date(item.doneAt) })
          : overdue
            ? t("overdue", { date: date(item.dueAt) })
            : t("due", { date: date(item.dueAt) })}
      </p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-small">
        {item.guideSlug ? (
          <Link
            href={`/guides/${item.guideSlug}`}
            className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand-700 underline"
          >
            <BookOpenIcon aria-hidden="true" className="size-4" />
            {t("guide")}
          </Link>
        ) : null}
        {official ? (
          <a
            href={official}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1 font-semibold text-brand-700 underline"
          >
            <ExternalLinkIcon aria-hidden="true" className="size-4" />
            {t("official")}
            <span className="sr-only"> ({common("opensInNewTab")})</span>
          </a>
        ) : null}
      </div>
      <TaskToggle id={item.id} done={done} title={item.title} />
    </article>
  );
}
