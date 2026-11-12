import { memberFilterSchema, memberWhere } from "@/lib/admin/members";
import { toCsv } from "@/lib/admin/rules";
import { audit } from "@/lib/audit";
import { isAdmin } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

const MAX_ROWS = 10_000;

/**
 * Members CSV for admins (the filters of /admin/members). Same-origin only, 10 exports an hour,
 * every export audited with its row count. Cells are escaped against CSV formula injection.
 */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || !isAdmin(user)) return new Response("Forbidden", { status: 403 });
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return new Response("Forbidden", { status: 403 });
  }
  const limit = await rateLimit(`export:${user.id}`, 10, 3600);
  if (!limit.ok) {
    return new Response("Too many exports", {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    });
  }
  const url = new URL(request.url);
  const filters = memberFilterSchema.parse({
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    role: url.searchParams.get("role") ?? undefined,
    page: 1,
  });
  const rows = await getDb().user.findMany({
    where: memberWhere(filters),
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      suspendedAt: true,
      isDemo: true,
      roles: { select: { role: true } },
      profile: { select: { homeChapter: { select: { name: true } } } },
    },
  });
  await audit({
    actorId: user.id,
    action: "member.export",
    entityType: "User",
    entityId: "csv",
    meta: { rows: rows.length },
  });
  const csv = toCsv([
    ["id", "name", "email", "chapter", "roles", "joined", "suspended", "demo"],
    ...rows.map((r) => [
      r.id,
      r.name,
      r.email,
      r.profile?.homeChapter?.name ?? "",
      r.roles.map((x) => x.role).join(" "),
      r.createdAt.toISOString().slice(0, 10),
      r.suspendedAt ? "yes" : "no",
      r.isDemo ? "yes" : "no",
    ]),
  ]);
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="eib-members-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
