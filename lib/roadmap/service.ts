import "server-only";

import { getDb } from "@/lib/db";

import { buildRoadmap, columnFor, mergeRoadmap, type ResidenceSituation } from "./rules";

export type RoadmapItem = {
  id: string;
  slug: string;
  title: string;
  why: string;
  guideSlug: string | null;
  dueAt: Date;
  doneAt: Date | null;
  column: 30 | 60 | 90;
  dependsOn: string[];
  overdue: boolean;
};

/**
 * Brings a member's saved roadmap in line with their current onboarding answers (pure rules, see
 * lib/roadmap/rules.ts) and returns it in plan order. Completed tasks are never lost; open tasks
 * that no longer apply are removed; due dates of open tasks follow a changed arrival date.
 */
export async function syncRoadmap(userId: string): Promise<RoadmapItem[]> {
  const db = getDb();
  const profile = await db.profile.findUnique({
    where: { userId },
    select: {
      originCountryCode: true,
      residenceSituation: true,
      arrivalDate: true,
      homeChapter: { select: { countryCode: true } },
      goals: { select: { goal: { select: { slug: true } } } },
    },
  });
  const countryCode = profile?.homeChapter?.countryCode;
  if (!profile || !countryCode) return [];
  const template = await db.roadmapTemplate.findFirst({
    where: { countryCode },
    select: { tasks: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template) return [];

  const planned = buildRoadmap(
    {
      countryCode,
      originCountryCode: profile.originCountryCode,
      residenceSituation: profile.residenceSituation as ResidenceSituation | null,
      goals: profile.goals.map((g) => g.goal.slug),
      arrivalDate: profile.arrivalDate,
    },
    template.tasks,
  );
  const bySlug = new Map(template.tasks.map((t) => [t.slug, t]));
  const existing = await db.userTask.findMany({
    where: { userId, task: { template: { countryCode } } },
    select: { id: true, doneAt: true, dueAt: true, task: { select: { slug: true } } },
  });
  const plan = mergeRoadmap(
    existing.map((e) => ({ slug: e.task.slug, doneAt: e.doneAt })),
    planned,
  );
  const due = new Map(planned.map((p) => [p.slug, p.dueAt]));

  await db.$transaction([
    db.userTask.deleteMany({
      where: {
        userId,
        id: { in: existing.filter((e) => plan.remove.includes(e.task.slug)).map((e) => e.id) },
      },
    }),
    db.userTask.createMany({
      data: plan.add.map((slug) => ({
        userId,
        taskId: bySlug.get(slug)!.id,
        dueAt: due.get(slug)!,
      })),
      skipDuplicates: true,
    }),
    ...existing
      .filter(
        (e) =>
          !e.doneAt &&
          due.has(e.task.slug) &&
          due.get(e.task.slug)!.getTime() !== e.dueAt.getTime(),
      )
      .map((e) =>
        db.userTask.update({
          where: { id: e.id },
          data: { dueAt: due.get(e.task.slug)!, remindedAt: null },
        }),
      ),
  ]);

  const rows = await db.userTask.findMany({
    where: { userId, task: { template: { countryCode } } },
    select: {
      id: true,
      dueAt: true,
      doneAt: true,
      task: {
        select: {
          slug: true,
          title: true,
          description: true,
          guideSlug: true,
          dependsOn: true,
          dueOffsetDays: true,
        },
      },
    },
  });
  const position = new Map(planned.map((p, i) => [p.slug, i]));
  const now = Date.now();
  return rows
    .map((r) => ({
      id: r.id,
      slug: r.task.slug,
      title: r.task.title,
      why: r.task.description,
      guideSlug: r.task.guideSlug,
      dueAt: r.dueAt,
      doneAt: r.doneAt,
      column:
        planned.find((p) => p.slug === r.task.slug)?.column ?? columnFor(r.task.dueOffsetDays),
      dependsOn: planned.find((p) => p.slug === r.task.slug)?.dependsOn ?? [],
      overdue: !r.doneAt && r.dueAt.getTime() < now,
    }))
    .sort(
      (a, b) =>
        (position.get(a.slug) ?? 999) - (position.get(b.slug) ?? 999) ||
        a.dueAt.getTime() - b.dueAt.getTime(),
    );
}

export function progressOf(items: readonly { doneAt: Date | null }[]) {
  const done = items.filter((i) => i.doneAt).length;
  return {
    done,
    total: items.length,
    percent: items.length ? Math.round((done / items.length) * 100) : 0,
  };
}
