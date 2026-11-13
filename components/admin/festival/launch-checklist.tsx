import { CheckCircle2Icon, CircleIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ProgressRing } from "@/components/roadmap/progress-ring";

type Checklist = { percent: number; items: { key: string; done: boolean }[] };

/** Console overview: what is still missing before the festival can be published. */
export async function LaunchChecklist({ checklist }: { checklist: Checklist }) {
  const t = await getTranslations("adminFestivals");
  return (
    <section
      aria-labelledby="checklist-title"
      className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6 shadow-card sm:flex-row sm:items-start"
    >
      <ProgressRing
        percent={checklist.percent}
        label={t("checklistLabel", { percent: checklist.percent })}
      />
      <div className="flex flex-1 flex-col gap-3">
        <h2 id="checklist-title" className="text-h3">
          {t("checklistTitle")}
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {checklist.items.map((item) => (
            <li key={item.key} className="flex items-center gap-2 text-ink">
              {item.done ? (
                <CheckCircle2Icon aria-hidden="true" className="size-5 text-success" />
              ) : (
                <CircleIcon aria-hidden="true" className="size-5 text-line-strong" />
              )}
              <span className={item.done ? "" : "font-semibold"}>{t(`checklist.${item.key}`)}</span>
              <span className="sr-only">{item.done ? t("done") : t("todo")}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
