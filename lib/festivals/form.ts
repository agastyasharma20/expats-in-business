/**
 * Form helpers for the festival console (pure): date + time fields in the chapter timezone,
 * prices in major units converted with the currency's exponent.
 */
import { z } from "zod";

import { toMinorUnits } from "@/lib/money";
import { zonedTimeToUtc } from "@/lib/time";

export const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const timeField = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const idField = z.string().trim().min(1).max(40);
/** Price typed by an organiser (e.g. "49.90"); never negative, at most two decimals. */
export const priceField = z
  .string()
  .trim()
  .regex(/^\d{1,6}([.,]\d{1,2})?$/)
  .transform((v) => Number(v.replace(",", ".")));

/** "2026-12-05" + "18:30" in Europe/Warsaw → the UTC instant. */
export function localToUtc(date: string, time: string, timeZone: string): Date {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const [hour, minute] = time.split(":").map(Number) as [number, number];
  return zonedTimeToUtc({ year, month, day, hour, minute }, timeZone);
}

export function priceToMinor(price: number, currency: string): number {
  return toMinorUnits(price, currency);
}

/** Drops empty strings so optional fields fall back to their defaults in Zod. */
export function formEntries(form: FormData): Record<string, string> {
  return Object.fromEntries(
    [...form].filter(
      (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1] !== "",
    ),
  );
}
