import { z } from "zod";

import { can } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { checkIn } from "@/lib/events/checkin";
import { parseQrToken } from "@/lib/events/checkin-rules";
import { rateLimit } from "@/lib/rate-limit";

const body = z.object({
  eventId: z.string().min(1),
  token: z.string().max(200).optional(),
  ticketId: z.string().max(64).optional(),
});

/** Door check-in for chapter leads and admins: QR token or manual ticket id; 60 scans per minute. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ status: "invalid" }, { status: 400 });

  const event = await getDb().event.findUnique({
    where: { id: parsed.data.eventId },
    select: { chapterId: true },
  });
  if (!event) return Response.json({ status: "invalid" }, { status: 404 });
  if (!can(user, "event.scan", { chapterId: event.chapterId }))
    return Response.json({ error: "forbidden" }, { status: 403 });
  if (!(await rateLimit(`checkin:${user.id}`, 60, 60)).ok)
    return Response.json({ error: "rateLimited" }, { status: 429 });

  const token = parsed.data.token ? parseQrToken(parsed.data.token) : undefined;
  if (parsed.data.token && !token) return Response.json({ status: "invalid" });
  const result = await checkIn({
    eventId: parsed.data.eventId,
    token: token ?? undefined,
    ticketId: parsed.data.ticketId,
    scannerId: user.id,
  });
  return Response.json(result);
}
