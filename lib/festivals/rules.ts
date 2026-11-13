/**
 * Festival rules (pure, unit-tested): tier sales state, programme grouping, the launch checklist
 * and revenue. No I/O; the server loads rows and asks these functions.
 */
import { placesLeft } from "@/lib/events/capacity";
import { utcToZoned } from "@/lib/time";

export const MAX_PER_ORDER_LIMIT = 10;
/** Shown as "only N left" once a tier is this close to selling out. */
export const LOW_STOCK = 10;

export type TierState = "onSale" | "lowStock" | "soldOut" | "ended";

export function tierState(input: {
  /** Tier cap (null = shares the event capacity). */
  capacity: number | null;
  sold: number;
  eventLeft: number;
  salesEndAt: Date | null;
  now: Date;
}): { state: TierState; left: number } {
  if (input.salesEndAt && input.salesEndAt <= input.now) return { state: "ended", left: 0 };
  const tierLeft =
    input.capacity === null ? input.eventLeft : placesLeft(input.capacity, input.sold);
  const left = Math.min(tierLeft, input.eventLeft);
  if (left <= 0) return { state: "soldOut", left: 0 };
  return { state: left <= LOW_STOCK ? "lowStock" : "onSale", left };
}

/** Party sizes a buyer can pick: up to the event's limit and the places left (at least 1). */
export function quantityOptions(maxPerOrder: number, left: number): number[] {
  const max = Math.max(1, Math.min(maxPerOrder, MAX_PER_ORDER_LIMIT, left || 1));
  return Array.from({ length: max }, (_, i) => i + 1);
}

type Item = { startsAt: Date; endsAt: Date; stage: string | null };

/** Programme grouped by local day (chapter timezone), each day sorted by start then stage. */
export function programmeByDay<T extends Item>(items: T[], timeZone: string) {
  const days = new Map<string, T[]>();
  for (const item of [...items].sort(
    (a, b) =>
      a.startsAt.getTime() - b.startsAt.getTime() || (a.stage ?? "").localeCompare(b.stage ?? ""),
  )) {
    const z = utcToZoned(item.startsAt, timeZone);
    const key = `${z.year}-${String(z.month).padStart(2, "0")}-${String(z.day).padStart(2, "0")}`;
    days.set(key, [...(days.get(key) ?? []), item]);
  }
  return [...days.entries()].map(([day, list]) => ({ day, items: list }));
}

/** Distinct stage names in first-appearance order ("Main stage", "Kids corner", …). */
export function stagesOf(items: { stage: string | null }[]): string[] {
  return [...new Set(items.map((i) => i.stage).filter((s): s is string => Boolean(s?.trim())))];
}

export const CHECKLIST = [
  "details",
  "venue",
  "tiers",
  "programme",
  "faq",
  "partners",
  "volunteers",
  "published",
] as const;
export type ChecklistKey = (typeof CHECKLIST)[number];

/** What is still missing before a festival is ready to promote. */
export function launchChecklist(f: {
  description: string;
  tagline: string | null;
  hasVenue: boolean;
  tiers: number;
  programme: number;
  faqs: number;
  partners: number;
  shifts: number;
  volunteersOpen: boolean;
  published: boolean;
}) {
  const done: Record<ChecklistKey, boolean> = {
    details: f.description.trim().length >= 80 && Boolean(f.tagline?.trim()),
    venue: f.hasVenue,
    tiers: f.tiers > 0,
    programme: f.programme >= 3,
    faq: f.faqs >= 3,
    partners: f.partners > 0,
    volunteers: !f.volunteersOpen || f.shifts > 0,
    published: f.published,
  };
  const completed = CHECKLIST.filter((k) => done[k]).length;
  return {
    items: CHECKLIST.map((key) => ({ key, done: done[key] })),
    percent: Math.round((completed / CHECKLIST.length) * 100),
  };
}

/** Gross ticket revenue in minor units from confirmed, paid tickets (price × party size). */
export function grossRevenue(
  tickets: { status: string; quantity: number; paidAt: Date | null; priceMinor: number }[],
): number {
  return tickets
    .filter((t) => t.status === "confirmed" && t.paidAt)
    .reduce((sum, t) => sum + t.priceMinor * t.quantity, 0);
}

/** Volunteer shift fill state. */
export function shiftState(capacity: number, taken: number) {
  const left = placesLeft(capacity, taken);
  return { left, full: left === 0, percent: Math.min(100, Math.round((taken / capacity) * 100)) };
}
