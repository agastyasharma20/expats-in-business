import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Retention periods promised in the privacy policy and the project brief: concierge questions
 * 90 days, the audit log 1 year, and accounts whose owner asked for deletion are removed after a
 * 30-day grace period (the owner can cancel in settings until then).
 */
export const RETENTION_DAYS = { concierge: 90, audit: 365, deletedAccounts: 30 } as const;

const DAY_MS = 86_400_000;
const daysAgo = (now: Date, days: number) => new Date(now.getTime() - days * DAY_MS);

/** The date before which each kind of record is past its retention period. */
export function purgeCutoffs(now = new Date()) {
  return {
    concierge: daysAgo(now, RETENTION_DAYS.concierge),
    audit: daysAgo(now, RETENTION_DAYS.audit),
    deletedAccounts: daysAgo(now, RETENTION_DAYS.deletedAccounts),
  };
}

/**
 * Deletes everything past its retention period and returns how many rows went. Safe to run daily
 * (idempotent). Deleting an account cascades to its tickets, profile, posts and sessions; audit
 * rows keep their text but lose the link to the person (onDelete: SetNull).
 */
export async function purgeExpiredData(db: PrismaClient, now = new Date()) {
  const cutoff = purgeCutoffs(now);
  const concierge = await db.conciergeQuery.deleteMany({
    where: { createdAt: { lt: cutoff.concierge } },
  });
  const audit = await db.auditLog.deleteMany({ where: { createdAt: { lt: cutoff.audit } } });
  const accounts = await db.user.deleteMany({
    where: { deletionRequestedAt: { not: null, lt: cutoff.deletedAccounts } },
  });
  return {
    conciergeQueries: concierge.count,
    auditEntries: audit.count,
    deletedAccounts: accounts.count,
  };
}
