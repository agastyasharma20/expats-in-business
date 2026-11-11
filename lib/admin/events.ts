import "server-only";

import type { AuthUser } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";

import { managedChapterWhere } from "./scope";

const RECENT_DAYS = 14;

/** Events a lead can run: upcoming plus the last two weeks (for late check-ins and Pulse replays). */
export function listManagedEvents(user: AuthUser) {
  return getDb().event.findMany({
    where: {
      chapter: managedChapterWhere(user),
      endsAt: { gte: new Date(Date.now() - RECENT_DAYS * 86_400_000) },
    },
    orderBy: { startsAt: "asc" },
    take: 50,
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      startsAt: true,
      chapter: { select: { name: true, timezone: true } },
      _count: { select: { tickets: { where: { status: "confirmed" } }, checkIns: true } },
    },
  });
}
