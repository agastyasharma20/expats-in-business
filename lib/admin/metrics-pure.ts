const DAY = 86_400_000;

/** UTC day keys for the last `days` days, oldest first (chart x-axis). */
export function dayKeys(days: number, now: Date): string[] {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: days }, (_, i) =>
    new Date(end - (days - 1 - i) * DAY).toISOString().slice(0, 10),
  );
}

/** Fills missing days with 0 so the series always has `days` points. */
export function toSeries(rows: { day: string; count: number }[], keys: string[]) {
  const map = new Map(rows.map((r) => [r.day, r.count]));
  return keys.map((day) => ({ day, count: map.get(day) ?? 0 }));
}
