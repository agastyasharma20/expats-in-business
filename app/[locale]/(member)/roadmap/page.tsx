import type { Metadata } from "next";
import { CalendarPlusIcon, MapIcon, PencilIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/common/empty-state";
import { MotionProvider } from "@/components/motion/motion-provider";
import { ProgressRing } from "@/components/roadmap/progress-ring";
import { TaskCard } from "@/components/roadmap/task-card";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { allGuides } from "@/lib/content/guide-index";
import { Link } from "@/lib/i18n/navigation";
import { aiIntro } from "@/lib/roadmap/ai-intro";
import { introTemplate } from "@/lib/roadmap/intro";
import { progressOf, syncRoadmap } from "@/lib/roadmap/service";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("roadmap");
  return { title: t("title"), robots: { index: false } };
}

const COLUMNS = [30, 60, 90] as const;

/**
 * The member's 30/60/90 plan: three columns on desktop, one numbered stepper on mobile. The rules
 * pick and order the steps; the optional AI intro only describes them.
 */
export default async function RoadmapPage() {
  const user = await requireUser("/roadmap");
  const [t, items, guides] = await Promise.all([
    getTranslations("roadmap"),
    syncRoadmap(user.id),
    allGuides(),
  ]);

  if (!items.length) {
    return (
      <div className="container-page py-12">
        <EmptyState
          icon={MapIcon}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            <Link href="/onboarding" className={buttonVariants()}>
              {t("finish")}
            </Link>
          }
        />
      </div>
    );
  }

  const official = new Map(guides.map((g) => [g.slug, g.frontmatter.sources[0]?.url ?? null]));
  const titles = new Map(items.map((i) => [i.slug, i.title]));
  const progress = progressOf(items);
  const firstOpen = items.find((i) => !i.doneAt) ?? items[0]!;
  const intro =
    (await aiIntro(items.map((i) => i.title))) ??
    introTemplate(
      {
        total: items.length,
        firstWeek: items.filter((i) => !i.doneAt && i.column === 30).length,
        firstTitle: firstOpen.title,
      },
      (key, values) => t(key, values),
    );

  return (
    <MotionProvider>
      <div className="container-page flex flex-col gap-8 py-12">
        <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex max-w-2xl flex-col gap-3">
            <h1 className="text-h1">{t("title")}</h1>
            <p className="text-lg text-ink" data-testid="roadmap-intro">
              {intro}
            </p>
            <p className="text-small text-muted-foreground">{t("label")}</p>
          </div>
          <div className="flex items-center gap-4">
            <ProgressRing
              percent={progress.percent}
              label={t("progressLabel", { percent: progress.percent })}
            />
            <p className="font-semibold text-brand-950" data-testid="roadmap-progress">
              {t("progress", { done: progress.done, total: progress.total })}
            </p>
          </div>
        </header>
        <div className="flex flex-wrap gap-3">
          {/* Plain link: a file download, not a page. */}
          <a href="/api/roadmap/ics" download className={buttonVariants({ variant: "outline" })}>
            <CalendarPlusIcon aria-hidden="true" />
            {t("export")}
          </a>
          <Link href="/onboarding?step=1" className={buttonVariants({ variant: "ghost" })}>
            <PencilIcon aria-hidden="true" />
            {t("editAnswers")}
          </Link>
        </div>
        <p className="-mt-4 text-small text-muted-foreground">{t("editHint")}</p>

        <div className="grid gap-8 lg:grid-cols-3">
          {COLUMNS.map((column) => {
            const inColumn = items.filter((i) => i.column === column);
            return (
              <section
                key={column}
                aria-labelledby={`col-${column}`}
                className="flex flex-col gap-4"
                data-testid={`column-${column}`}
              >
                <h2 id={`col-${column}`} className="text-h3">
                  {t(`columns.${column}`)}
                </h2>
                {inColumn.length ? (
                  <ol className="relative flex flex-col gap-4 border-l-2 border-brand-100 pl-5 lg:border-l-0 lg:pl-0">
                    {inColumn.map((item) => (
                      <li key={item.id} className="relative">
                        {/* Stepper dot on mobile; the columns carry the structure on desktop. */}
                        <span
                          aria-hidden="true"
                          className={`absolute top-6 -left-[1.95rem] size-3 rounded-full border-2 border-surface lg:hidden ${item.doneAt ? "bg-success" : "bg-brand-700"}`}
                        />
                        <TaskCard
                          item={item}
                          step={items.indexOf(item) + 1}
                          total={items.length}
                          official={item.guideSlug ? (official.get(item.guideSlug) ?? null) : null}
                          titles={titles}
                        />
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-small text-muted-foreground">—</p>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </MotionProvider>
  );
}
