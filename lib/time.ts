/**
 * Times are stored in UTC and shown in the chapter's IANA time zone (never a hard-coded zone).
 * Built on Intl only, so it works the same on the server, in the browser and in the seed.
 */

export type ZonedDateTime = {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function partsInZone(date: Date, timeZone: string): ZonedDateTime & { second: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Offset of `timeZone` from UTC at `date`, in minutes (e.g. +60 for Europe/Warsaw in winter). */
export function zoneOffsetMinutes(date: Date, timeZone: string): number {
  const p = partsInZone(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60_000);
}

/**
 * The UTC instant for a wall-clock time in `timeZone`, e.g. 18:00 in the chapter's city.
 * Handles daylight-saving changes; a time skipped by the spring change resolves forwards.
 */
export function zonedTimeToUtc(local: ZonedDateTime, timeZone: string): Date {
  const guess = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  const first = guess - zoneOffsetMinutes(new Date(guess), timeZone) * 60_000;
  const second = guess - zoneOffsetMinutes(new Date(first), timeZone) * 60_000;
  return new Date(second);
}

/** Wall-clock parts of a UTC instant in `timeZone`. */
export function utcToZoned(date: Date, timeZone: string): ZonedDateTime {
  const { year, month, day, hour, minute } = partsInZone(date, timeZone);
  return { year, month, day, hour, minute };
}

/** Localised date/time in the chapter's zone, e.g. "Thu 12 Feb, 18:00". */
export function formatInZone(
  date: Date,
  timeZone: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(date);
}

/** Adds whole days to a UTC instant (calendar-agnostic; use zonedTimeToUtc for local wall times). */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}
