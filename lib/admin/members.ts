import "server-only";

import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";

export const MEMBERS_PAGE = 25;

/** URL filters for /admin/members (GET form). Anything malformed falls back to the default. */
export const memberFilterSchema = z.object({
  q: z.string().trim().max(80).catch(""),
  status: z.enum(["all", "active", "suspended", "deletion"]).catch("all"),
  role: z.enum(["any", "admin", "chapter_lead", "moderator", "bubble_lead"]).catch("any"),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});
export type MemberFilters = z.infer<typeof memberFilterSchema>;

export function memberWhere(f: MemberFilters): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};
  if (f.q) {
    where.OR = [
      { name: { contains: f.q, mode: "insensitive" } },
      { email: { contains: f.q, mode: "insensitive" } },
    ];
  }
  if (f.status === "active") Object.assign(where, { suspendedAt: null, deletionRequestedAt: null });
  if (f.status === "suspended") where.suspendedAt = { not: null };
  if (f.status === "deletion") where.deletionRequestedAt = { not: null };
  if (f.role !== "any") where.roles = { some: { role: f.role } };
  return where;
}

export async function listMembers(f: MemberFilters) {
  const db = getDb();
  const where = memberWhere(f);
  const [total, rows] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (f.page - 1) * MEMBERS_PAGE,
      take: MEMBERS_PAGE,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        suspendedAt: true,
        deletionRequestedAt: true,
        isDemo: true,
        roles: { select: { id: true, role: true, chapter: { select: { id: true, name: true } } } },
        profile: { select: { slug: true, homeChapter: { select: { name: true } } } },
        _count: { select: { checkIns: true } },
      },
    }),
  ]);
  return { total, rows, pages: Math.max(1, Math.ceil(total / MEMBERS_PAGE)) };
}
