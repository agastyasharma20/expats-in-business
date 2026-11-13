/**
 * Growth rules (pure, unit-tested): ambassador tiers and their required places, review-status
 * moves, open-role kinds and city keys for chapter requests. Server actions parse with these, so
 * a request edited in the browser cannot create an impossible application or skip a review step.
 */
import { z } from "zod";

import { COUNTRY_CODES, LANGUAGE_CODES } from "@/lib/countries";

export const AMBASSADOR_SCOPES = ["global", "country", "city"] as const;
export type AmbassadorScope = (typeof AMBASSADOR_SCOPES)[number];

export const ROLE_KINDS = ["volunteer", "internship", "part_time", "full_time"] as const;
export type RoleKind = (typeof ROLE_KINDS)[number];

export const REVIEW_STATUSES = [
  "submitted",
  "in_review",
  "accepted",
  "waitlisted",
  "declined",
  "withdrawn",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** Allowed review moves for organisers. Withdrawn is the applicant's own, final choice. */
const MOVES: Record<ReviewStatus, readonly ReviewStatus[]> = {
  submitted: ["in_review", "accepted", "waitlisted", "declined"],
  in_review: ["accepted", "waitlisted", "declined"],
  waitlisted: ["in_review", "accepted", "declined"],
  accepted: ["in_review"],
  declined: ["in_review"],
  withdrawn: [],
};

export function canMove(from: ReviewStatus, to: ReviewStatus): boolean {
  return MOVES[from].includes(to);
}

const city = z
  .string()
  .trim()
  .min(2)
  .max(60)
  // Letters (any script), spaces, dots, apostrophes and hyphens: "Kraków", "São Paulo", "Індор".
  .regex(/^[\p{L}][\p{L}\p{M} .'-]*$/u);

const country = z.enum(COUNTRY_CODES as [string, ...string[]]);

/** The place an ambassador represents, validated per tier. */
export const ambassadorPlaceSchema = z.discriminatedUnion("scope", [
  z.object({ scope: z.literal("global") }),
  z.object({ scope: z.literal("country"), countryCode: country }),
  z.object({ scope: z.literal("city"), countryCode: country, city }),
]);
export type AmbassadorPlace = z.infer<typeof ambassadorPlaceSchema>;

export const ambassadorDetailsSchema = z.object({
  motivation: z.string().trim().min(80).max(2000),
  experience: z.string().trim().min(40).max(2000),
  languages: z
    .array(z.enum(LANGUAGE_CODES as [string, ...string[]]))
    .min(1)
    .max(8),
  hoursPerMonth: z.coerce.number().int().min(2).max(160),
  linkedinUrl: z
    .union([
      z.url({ protocol: /^https$/, hostname: /(^|\.)linkedin\.com$/ }).max(300),
      z.literal(""),
    ])
    .default(""),
});

/** Lower-case, accent-free key, so "Kraków", "krakow" and " KRAKÓW " are one city request. */
export function cityKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "l")
    .toLowerCase()
    .replace(/[^\p{L}0-9]+/gu, "-")
    .replace(/(^-|-$)/g, "");
}

export const cityRequestSchema = z.object({ countryCode: country, city });

/** Human place label for an ambassador: "Global", "India", "Indore, India". */
export function placeLabel(
  place: { scope: AmbassadorScope; countryCode: string | null; city: string | null },
  countryName: (code: string) => string,
  globalLabel: string,
): string {
  if (place.scope === "global" || !place.countryCode) return globalLabel;
  const name = countryName(place.countryCode);
  return place.scope === "city" && place.city ? `${place.city}, ${name}` : name;
}

/** The statuses a reviewer may move an application to next (buttons on the admin boards). */
export function nextMoves(from: ReviewStatus): readonly ReviewStatus[] {
  return MOVES[from];
}
