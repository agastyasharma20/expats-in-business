import "server-only";

import { isAdmin, type AuthUser } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";

import { dayKeys, toSeries } from "./metrics-pure";
import { managedChapterWhere } from "./scope";

const DAY = 86_400_000;

/**
 * Command-centre numbers. Admins see everything; chapter leads see their chapters (members by
 * home chapter, events and check-ins by event chapter). Only counts leave this function.
 */
export async function getOverview(user: AuthUser, now = new Date()) {
  const db = getDb();
  const global = isAdmin(user);
  const chapters = await db.chapter.findMany({
    where: managedChapterWhere(user),
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, status: true },
  });
  const ids = chapters.map((c) => c.id);
  const memberWhere = global ? {} : { profile: { homeChapterId: { in: ids } } };
  const eventWhere = global ? {} : { chapterId: { in: ids } };
  const since30 = new Date(now.getTime() - 30 * DAY);
  const keys = dayKeys(30, now);

  const [
    members,
    newMembers,
    onboarded,
    attended,
    connected,
    upcoming,
    checkIns30,
    openReports,
    pendingVerifications,
    concierge30,
    suspended,
    signupRows,
    checkInRows,
  ] = await Promise.all([
    db.user.count({ where: memberWhere }),
    db.user.count({ where: { ...memberWhere, createdAt: { gte: since30 } } }),
    db.user.count({
      where: {
        ...memberWhere,
        profile: { onboardingStep: { gte: 1 }, ...(global ? {} : { homeChapterId: { in: ids } }) },
      },
    }),
    db.user.count({ where: { ...memberWhere, checkIns: { some: {} } } }),
    db.user.count({
      where: {
        ...memberWhere,
        OR: [
          { connectionsSent: { some: { status: "accepted" } } },
          { connectionsReceived: { some: { status: "accepted" } } },
        ],
      },
    }),
    db.event.count({ where: { ...eventWhere, status: "published", startsAt: { gte: now } } }),
    db.checkIn.count({ where: { checkedInAt: { gte: since30 }, event: eventWhere } }),
    db.postReport.count({ where: { status: "open" } }),
    global ? db.provider.count({ where: { verificationStatus: "pending" } }) : 0,
    global ? db.conciergeQuery.count({ where: { createdAt: { gte: since30 } } }) : 0,
    global ? db.user.count({ where: { suspendedAt: { not: null } } }) : 0,
    global
      ? db.$queryRaw<{ day: string; count: number }[]>`
          SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day, count(*)::int AS count
          FROM "user" WHERE "createdAt" >= ${since30} GROUP BY 1`
      : db.$queryRaw<{ day: string; count: number }[]>`
          SELECT to_char(date_trunc('day', u."createdAt"), 'YYYY-MM-DD') AS day, count(*)::int AS count
          FROM "user" u JOIN "Profile" p ON p."userId" = u.id
          WHERE u."createdAt" >= ${since30} AND p."homeChapterId" = ANY(${ids}) GROUP BY 1`,
    db.$queryRaw<{ day: string; count: number }[]>`
      SELECT to_char(date_trunc('day', c."checkedInAt"), 'YYYY-MM-DD') AS day, count(*)::int AS count
      FROM "CheckIn" c JOIN "Event" e ON e.id = c."eventId"
      WHERE c."checkedInAt" >= ${since30} AND (${global} OR e."chapterId" = ANY(${ids})) GROUP BY 1`,
  ]);

  return {
    global,
    chapters,
    kpis: {
      members,
      newMembers,
      upcoming,
      checkIns30,
      openReports,
      pendingVerifications,
      concierge30,
      suspended,
    },
    funnel: [
      { key: "signedUp", value: members },
      { key: "onboarded", value: onboarded },
      { key: "attended", value: attended },
      { key: "connected", value: connected },
    ],
    signups: toSeries(signupRows, keys),
    checkIns: toSeries(checkInRows, keys),
  };
}

/** Per-chapter health: members, sessions in the next 30 days, check-ins in the last 30. */
export async function chapterHealth(chapterIds: string[], now = new Date()) {
  const db = getDb();
  const since = new Date(now.getTime() - 30 * DAY);
  const until = new Date(now.getTime() + 30 * DAY);
  return Promise.all(
    chapterIds.map(async (id) => {
      const [members, sessions, checkIns, leads] = await Promise.all([
        db.profile.count({ where: { homeChapterId: id } }),
        db.event.count({
          where: { chapterId: id, status: "published", startsAt: { gte: now, lte: until } },
        }),
        db.checkIn.count({ where: { checkedInAt: { gte: since }, event: { chapterId: id } } }),
        db.chapterRole.count({ where: { chapterId: id, role: "chapter_lead" } }),
      ]);
      return { id, members, sessions, checkIns, leads };
    }),
  );
}

/** Latest audit entries (actions only; actor name for context, no personal data in meta). */
export function recentActivity(user: AuthUser, take = 8) {
  const ids = isAdmin(user)
    ? undefined
    : user.roles.filter((r) => r.role === "chapter_lead" && r.chapterId).map((r) => r.chapterId!);
  return getDb().auditLog.findMany({
    where: ids ? { chapterId: { in: ids } } : {},
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      action: true,
      entityType: true,
      createdAt: true,
      actor: { select: { name: true } },
    },
  });
}
