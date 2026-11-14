/** Team page validation (pure, unit-tested). Empty optional fields become null. */
import { z } from "zod";

export const TEAM_GROUPS = ["founders", "leads", "team", "volunteers"] as const;
export type TeamGroup = (typeof TEAM_GROUPS)[number];

/** Photos: any common image up to this size is accepted, then resized and re-encoded. */
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

const optionalMonth = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .transform((v) => new Date(`${v}-01T00:00:00.000Z`))
  .or(z.literal("").transform(() => null))
  .nullable()
  .optional()
  .transform((v) => v ?? null);

/** Only https links to linkedin.com (or a subdomain) are stored. */
export const linkedinUrl = z
  .string()
  .trim()
  .max(200)
  .refine((v) => {
    if (v === "") return true;
    try {
      const url = new URL(v);
      return (
        url.protocol === "https:" &&
        (url.hostname === "linkedin.com" || url.hostname.endsWith(".linkedin.com"))
      );
    } catch {
      return false;
    }
  })
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null);

export const memberSchema = z
  .object({
    id: z.string().trim().min(1).max(40).optional(),
    name: z.string().trim().min(2).max(80),
    designation: z.string().trim().min(2).max(100),
    grp: z.enum(TEAM_GROUPS).default("team"),
    bio: optionalText(600),
    photoAlt: optionalText(160),
    startedAt: optionalMonth,
    endedAt: optionalMonth,
    linkedinUrl,
    email: z
      .string()
      .trim()
      .max(160)
      .pipe(z.union([z.literal(""), z.email()]))
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    showEmail: z.coerce.boolean().default(false),
    isVisible: z.coerce.boolean().default(true),
    sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  })
  .refine((v) => !(v.startedAt && v.endedAt) || v.endedAt >= v.startedAt, {
    path: ["endedAt"],
  })
  // An address is only shown when the person gave one.
  .transform((v) => ({ ...v, showEmail: v.showEmail && v.email !== null }));

export const founderSchema = z.object({
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(20).max(4000),
  founderName: z.string().trim().min(2).max(80),
  designation: z.string().trim().min(2).max(100),
  photoAlt: optionalText(160),
});

/** "Jan 2024 – present" style label parts; the caller formats months in the visitor's locale. */
export function tenure(startedAt: Date | null, endedAt: Date | null) {
  return { from: startedAt, to: endedAt, current: startedAt !== null && endedAt === null };
}
