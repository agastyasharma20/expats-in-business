/**
 * Launching a new city chapter from the admin panel ("chapter-in-a-box"). Pure rules, so the
 * server action stays short and the checks are unit tested.
 */
import { z } from "zod";

import { slugify } from "@/lib/slug";

export const LAUNCH_STATUSES = ["launching", "live"] as const;

/** True for a real IANA zone such as "Europe/Warsaw" (the runtime knows them all). */
export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

/** Fields of the launch form. Zone and currency may be left empty: the country's defaults apply. */
export const launchChapterSchema = z.object({
  city: z.string().trim().min(2).max(60),
  countryCode: z
    .string()
    .trim()
    .length(2)
    .transform((value) => value.toUpperCase()),
  status: z.enum(LAUNCH_STATUSES),
  timezone: optionalText(60).refine((v) => v === undefined || isValidTimeZone(v)),
  currency: optionalText(3)
    .refine((v) => v === undefined || /^[A-Za-z]{3}$/.test(v))
    .transform((v) => v?.toUpperCase()),
  tagline: optionalText(120),
  leadEmail: optionalText(200)
    .refine((v) => v === undefined || z.email().safeParse(v).success)
    .transform((v) => v?.toLowerCase()),
});

export type LaunchChapterInput = z.infer<typeof launchChapterSchema>;

/** The URL slug a city gets: "Kraków" → "krakow". Empty when the name has no usable letters. */
export function chapterSlugFor(city: string): string {
  return slugify(city);
}

/** What the new chapter uses when the form leaves a value empty. */
export function withCountryDefaults(
  input: LaunchChapterInput,
  country: { defaultTimezone: string; defaultCurrency: string },
) {
  return {
    timezone: input.timezone ?? country.defaultTimezone,
    currency: input.currency ?? country.defaultCurrency,
  };
}
