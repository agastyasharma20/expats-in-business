import { managedChapterWhere } from "@/lib/admin/scope";
import { toCsv } from "@/lib/admin/rules";
import { audit } from "@/lib/audit";
import { can } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Attendee list for a festival the caller manages (door lists, catering). Same-origin only,
 * 20 exports an hour, audited. Contains names and party sizes, not emails.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/admin/festivals/[id]/attendees">,
) {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none")
    return new Response("Forbidden", { status: 403 });
  const { id } = await ctx.params;
  const event = await getDb().event.findFirst({
    where: { id, kind: "festival", chapter: managedChapterWhere(user) },
    select: { id: true, slug: true, chapterId: true },
  });
  if (!event || !can(user, "event.manage", { chapterId: event.chapterId })) {
    return new Response("Forbidden", { status: 403 });
  }
  const limit = await rateLimit(`attendees:${user.id}`, 20, 3600);
  if (!limit.ok) return new Response("Too many exports", { status: 429 });
  const tickets = await getDb().ticket.findMany({
    where: { eventId: event.id, status: { in: ["confirmed", "waitlisted"] } },
    orderBy: [{ status: "asc" }, { user: { name: "asc" } }],
    select: {
      status: true,
      quantity: true,
      paidAt: true,
      ticketType: { select: { name: true } },
      user: { select: { name: true } },
      checkIn: { select: { checkedInAt: true } },
    },
  });
  await audit({
    actorId: user.id,
    action: "festival.export",
    entityType: "Event",
    entityId: event.id,
    chapterId: event.chapterId,
    meta: { rows: tickets.length },
  });
  const csv = toCsv([
    ["name", "tier", "people", "status", "paid", "checked_in"],
    ...tickets.map((t) => [
      t.user.name,
      t.ticketType.name,
      t.quantity,
      t.status,
      t.paidAt ? "yes" : "no",
      t.checkIn ? t.checkIn.checkedInAt.toISOString() : "",
    ]),
  ]);
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}-attendees.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
