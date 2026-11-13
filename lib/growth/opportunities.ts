import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { getDb } from "@/lib/db";

/** Open roles, optionally of some kinds (volunteer page shows volunteer roles only). */
export function listOpenRoles(kinds?: ("volunteer" | "internship" | "part_time" | "full_time")[]) {
  return getDb().openRole.findMany({
    where: { status: "open", ...(kinds ? { kind: { in: kinds } } : {}) },
    orderBy: [{ kind: "asc" }, { createdAt: "desc" }],
    select: {
      slug: true,
      title: true,
      team: true,
      kind: true,
      location: true,
      commitment: true,
      summary: true,
      isDemo: true,
    },
  });
}

export async function getRole(slug: string, userId: string | null) {
  const db = getDb();
  const role = await db.openRole.findUnique({ where: { slug } });
  if (!role || role.status === "draft") return null;
  const application = userId
    ? await db.roleApplication.findUnique({
        where: { roleId_userId: { roleId: role.id, userId } },
        select: { id: true, status: true },
      })
    : null;
  return { role, application };
}

/** Upcoming festivals that are recruiting volunteers (volunteer page). */
export function festivalsNeedingVolunteers() {
  return getDb().event.findMany({
    where: {
      kind: "festival",
      status: "published",
      volunteersOpen: true,
      startsAt: { gte: new Date() },
    },
    orderBy: { startsAt: "asc" },
    take: 4,
    select: {
      slug: true,
      title: true,
      startsAt: true,
      isDemo: true,
      chapter: { select: { name: true, timezone: true } },
      shifts: { select: { capacity: true, _count: { select: { signups: true } } } },
    },
  });
}

/** The next published festival, for the header spotlight and the homepage banner. */
export async function nextFestival() {
  "use cache";
  cacheLife("minutes");
  cacheTag("events");
  return getDb().event.findFirst({
    where: { kind: "festival", status: "published", endsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    select: {
      slug: true,
      title: true,
      tagline: true,
      startsAt: true,
      isDemo: true,
      chapter: { select: { name: true, timezone: true } },
    },
  });
}
