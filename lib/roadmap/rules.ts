/**
 * Landing Roadmap rules (brief 3G): a pure, deterministic function from onboarding answers to an
 * ordered task list. No AI involved: the model may only write the intro (lib/roadmap/intro.ts).
 *
 * Selection:  a task applies when (appliesTo is empty or contains the residence situation) and
 *             (forGoals is empty or shares a goal) and not (skipForCitizens for a citizen of the
 *             chapter's country, e.g. a Polish returnee already has a PESEL).
 *             Founders implicitly have the "find-clients" goal (their business needs clients).
 * Order:      dependencies first, then the library order (the brief's sequence).
 * Due dates:  arrival date (or today) + offset, and never before a dependency's due date.
 */
export type ResidenceSituation =
  "eu_citizen" | "non_eu_employee" | "non_eu_founder" | "student" | "family_member";

export type TaskDefinition = {
  slug: string;
  appliesTo: readonly ResidenceSituation[];
  forGoals: readonly string[];
  dependsOn: readonly string[];
  dueOffsetDays: number;
  sortOrder: number;
  skipForCitizens: boolean;
};

export type RoadmapInput = {
  countryCode: string;
  originCountryCode: string | null;
  residenceSituation: ResidenceSituation | null;
  goals: readonly string[];
  arrivalDate: Date | null;
};

export type PlannedTask = {
  slug: string;
  dependsOn: string[];
  dueOffsetDays: number;
  dueAt: Date;
  column: 30 | 60 | 90;
};

const DAY_MS = 86_400_000;
const FOUNDER_GOALS: Partial<Record<ResidenceSituation, readonly string[]>> = {
  non_eu_founder: ["find-clients"],
};

export function columnFor(offsetDays: number): 30 | 60 | 90 {
  if (offsetDays <= 30) return 30;
  if (offsetDays <= 60) return 60;
  return 90;
}

function applies(
  task: TaskDefinition,
  input: RoadmapInput,
  goals: Set<string>,
  citizen: boolean,
): boolean {
  if (citizen && task.skipForCitizens) return false;
  if (
    task.appliesTo.length &&
    (!input.residenceSituation || !task.appliesTo.includes(input.residenceSituation))
  )
    return false;
  if (task.forGoals.length && !task.forGoals.some((g) => goals.has(g))) return false;
  return true;
}

/** Topological order (Kahn's algorithm), ties broken by library order; cycles fall back to order. */
function order(tasks: TaskDefinition[]): TaskDefinition[] {
  const remaining = new Map(tasks.map((t) => [t.slug, t]));
  const done = new Set<string>();
  const result: TaskDefinition[] = [];
  while (remaining.size) {
    const ready = [...remaining.values()]
      .filter((t) => t.dependsOn.every((d) => done.has(d) || !remaining.has(d)))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const next = ready[0] ?? [...remaining.values()].sort((a, b) => a.sortOrder - b.sortOrder)[0]!;
    remaining.delete(next.slug);
    done.add(next.slug);
    result.push(next);
  }
  return result;
}

export function buildRoadmap(
  input: RoadmapInput,
  library: readonly TaskDefinition[],
  now: Date = new Date(),
): PlannedTask[] {
  const citizen = Boolean(input.originCountryCode) && input.originCountryCode === input.countryCode;
  const goals = new Set([
    ...input.goals,
    ...(input.residenceSituation ? (FOUNDER_GOALS[input.residenceSituation] ?? []) : []),
  ]);
  const selected = library.filter((t) => applies(t, input, goals, citizen));
  const chosen = new Set(selected.map((t) => t.slug));
  const pruned = selected.map((t) => ({
    ...t,
    dependsOn: t.dependsOn.filter((d) => chosen.has(d)),
  }));

  const start = input.arrivalDate ?? now;
  const startDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const offsets = new Map<string, number>();
  return order(pruned).map((task) => {
    const offset = Math.max(task.dueOffsetDays, ...task.dependsOn.map((d) => offsets.get(d) ?? 0));
    offsets.set(task.slug, offset);
    return {
      slug: task.slug,
      dependsOn: [...task.dependsOn],
      dueOffsetDays: offset,
      dueAt: new Date(startDay + offset * DAY_MS),
      column: columnFor(offset),
    };
  });
}

/**
 * Regenerating after onboarding edits: completed tasks are always kept; new tasks are added;
 * open tasks that no longer apply are removed. Pure (the caller writes the plan).
 */
export function mergeRoadmap(
  existing: readonly { slug: string; doneAt: Date | null }[],
  generated: readonly { slug: string }[],
) {
  const wanted = new Set(generated.map((t) => t.slug));
  const have = new Set(existing.map((t) => t.slug));
  return {
    keep: existing.filter((t) => t.doneAt || wanted.has(t.slug)).map((t) => t.slug),
    remove: existing.filter((t) => !t.doneAt && !wanted.has(t.slug)).map((t) => t.slug),
    add: generated.map((t) => t.slug).filter((slug) => !have.has(slug)),
  };
}
