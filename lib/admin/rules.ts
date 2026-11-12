/**
 * Admin rules (pure, unit-tested). The server actions load actor and target from the database and
 * ask these functions, so an edited request (DevTools, curl) cannot widen what an admin may do.
 */
import { isAdmin, type AuthUser, type RoleName } from "@/lib/auth/permissions";

/** Roles an admin can grant from the members table. "admin" is granted only via the database. */
export const GRANTABLE_ROLES = ["member", "bubble_lead", "moderator", "chapter_lead"] as const;
export type GrantableRole = (typeof GRANTABLE_ROLES)[number];

type Target = { id: string; roles: { role: RoleName }[] };

/** Admins can suspend anyone except themselves and other admins (no lock-out wars). */
export function canSuspend(actor: AuthUser | null, target: Target): boolean {
  if (!actor || !isAdmin(actor) || actor.id === target.id) return false;
  return !target.roles.some((r) => r.role === "admin");
}

/** Grant or revoke a chapter-scoped role. Never on yourself, never on an admin account. */
export function canChangeRole(actor: AuthUser | null, target: Target, role: string): boolean {
  if (!canSuspend(actor, target)) return false;
  return (GRANTABLE_ROLES as readonly string[]).includes(role);
}

/** CSV cell: quoted, quotes doubled, and formula prefixes neutralised (CSV injection). */
export function csvCell(value: string | number | boolean | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(rows: (string | number | boolean | null | undefined)[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export const BANNER_TONES = ["info", "warning"] as const;
export type Banner = { enabled: boolean; text: string; tone: (typeof BANNER_TONES)[number] };

/** Validates a stored banner value; anything malformed means "no banner". */
export function parseBanner(value: unknown): Banner | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (v.enabled !== true || typeof v.text !== "string" || !v.text.trim()) return null;
  const tone = BANNER_TONES.includes(v.tone as Banner["tone"])
    ? (v.tone as Banner["tone"])
    : "info";
  return { enabled: true, text: v.text.slice(0, 200), tone };
}
