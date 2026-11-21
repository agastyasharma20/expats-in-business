import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { purgeCutoffs, purgeExpiredData, RETENTION_DAYS } from "@/lib/jobs/purge";

const NOW = new Date("2026-11-21T12:00:00.000Z");
const days = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

describe("retention purge", () => {
  it("uses the periods stated in the privacy policy", () => {
    expect(RETENTION_DAYS).toEqual({ concierge: 90, audit: 365, deletedAccounts: 30 });
    const cutoff = purgeCutoffs(NOW);
    expect(cutoff.concierge).toEqual(days(90));
    expect(cutoff.audit).toEqual(days(365));
    expect(cutoff.deletedAccounts).toEqual(days(30));
  });

  it("deletes only rows older than each cutoff and reports the counts", async () => {
    const deleteMany = (count: number) => vi.fn().mockResolvedValue({ count });
    const db = {
      conciergeQuery: { deleteMany: deleteMany(4) },
      auditLog: { deleteMany: deleteMany(2) },
      user: { deleteMany: deleteMany(1) },
    };
    const result = await purgeExpiredData(db as unknown as PrismaClient, NOW);
    expect(result).toEqual({ conciergeQueries: 4, auditEntries: 2, deletedAccounts: 1 });
    expect(db.conciergeQuery.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: days(90) } },
    });
    expect(db.auditLog.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: days(365) } },
    });
    // Accounts are only removed once the owner asked for deletion (never a null request date).
    expect(db.user.deleteMany).toHaveBeenCalledWith({
      where: { deletionRequestedAt: { not: null, lt: days(30) } },
    });
  });
});
