import "server-only";

import { getDb } from "@/lib/db";

function today(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Adds one to today's counter for a provider (aggregated: no record of who). Never throws. */
export async function bumpProviderStat(providerId: string, field: "views" | "quoteRequests") {
  const day = today();
  try {
    await getDb().providerDailyStat.upsert({
      where: { providerId_day: { providerId, day } },
      update: { [field]: { increment: 1 } },
      create: { providerId, day, [field]: 1 },
    });
  } catch {
    // analytics must never break a page
  }
}

/** Totals for the last `days` days, oldest first, with zero-filled gaps. */
export async function providerStats(providerIds: string[], days = 30) {
  const since = new Date(today().getTime() - (days - 1) * 86_400_000);
  const rows = await getDb().providerDailyStat.groupBy({
    by: ["day"],
    where: { providerId: { in: providerIds }, day: { gte: since } },
    _sum: { views: true, quoteRequests: true },
  });
  const byDay = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), r._sum]));
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(since.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    const sum = byDay.get(day);
    return { day, views: sum?.views ?? 0, quoteRequests: sum?.quoteRequests ?? 0 };
  });
}

/** Share of decided quote requests that were accepted in the last `days` days (null when none decided). */
export async function quoteOutcomes(providerIds: string[], days = 30) {
  const groups = await getDb().quoteRequest.groupBy({
    by: ["status"],
    where: {
      providerId: { in: providerIds },
      createdAt: { gte: new Date(Date.now() - days * 86_400_000) },
    },
    _count: { _all: true },
  });
  const decided = groups.filter((g) => g.status !== "open").reduce((a, g) => a + g._count._all, 0);
  const accepted = groups.find((g) => g.status === "accepted")?._count._all ?? 0;
  return { decided, accepted, acceptRate: decided ? Math.round((accepted / decided) * 100) : null };
}
