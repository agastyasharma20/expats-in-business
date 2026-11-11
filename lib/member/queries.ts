import "server-only";

import { getDb } from "@/lib/db";

/** Dashboard data for one member: counts behind the stat cards, next session, suggestions. */
export async function getDashboard(userId: string) {
  const db = getDb();
  const now = new Date();
  const profile = await db.profile.findUnique({
    where: { userId },
    select: {
      onboardingStep: true,
      foundingNumber: true,
      homeChapterId: true,
      homeChapter: { select: { name: true } },
    },
  });
  const [events, connections, businesses, nextTicket, suggested] = await Promise.all([
    db.ticket.count({ where: { userId, status: "confirmed" } }),
    db.connection.count({
      where: { status: "accepted", OR: [{ requesterId: userId }, { addresseeId: userId }] },
    }),
    db.business.count({ where: { ownerId: userId } }),
    db.ticket.findFirst({
      where: { userId, status: "confirmed", event: { startsAt: { gte: now } } },
      orderBy: { event: { startsAt: "asc" } },
      select: {
        event: {
          select: { title: true, startsAt: true, chapter: { select: { timezone: true } } },
        },
      },
    }),
    profile?.homeChapterId
      ? db.profile.findMany({
          where: { homeChapterId: profile.homeChapterId, isPublic: true, userId: { not: userId } },
          orderBy: { createdAt: "desc" },
          take: 3,
          select: { slug: true, headline: true, isDemo: true, user: { select: { name: true } } },
        })
      : [],
  ]);
  return { profile, stats: { events, connections, businesses }, nextTicket, suggested };
}

export function getMyTickets(userId: string) {
  return getDb().ticket.findMany({
    where: { userId, status: "confirmed" },
    orderBy: { event: { startsAt: "desc" } },
    select: {
      id: true,
      checkIn: { select: { id: true } },
      event: {
        select: { title: true, startsAt: true, chapter: { select: { timezone: true } } },
      },
    },
  });
}

export async function getMyConnections(userId: string) {
  const rows = await getDb().connection.findMany({
    where: { status: "accepted", OR: [{ requesterId: userId }, { addresseeId: userId }] },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      metAtEvent: { select: { title: true } },
      requesterId: true,
      requester: { select: { name: true, profile: { select: { slug: true, headline: true } } } },
      addressee: { select: { name: true, profile: { select: { slug: true, headline: true } } } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    metAt: row.metAtEvent?.title ?? null,
    person: row.requesterId === userId ? row.addressee : row.requester,
  }));
}

export function getMyBusinesses(userId: string) {
  return getDb().business.findMany({
    where: { ownerId: userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true, chapter: { select: { name: true } } },
  });
}
