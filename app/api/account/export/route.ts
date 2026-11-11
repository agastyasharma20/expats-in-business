import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

/** GDPR data export: everything we hold about the signed-in member, as a JSON download. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const data = await getDb().user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      locale: true,
      createdAt: true,
      emails: { select: { email: true, verifiedAt: true, createdAt: true } },
      profile: { include: { goals: { select: { goal: { select: { slug: true } } } } } },
      roles: { select: { role: true, chapterId: true } },
      consents: { select: { type: true, granted: true, updatedAt: true } },
      tickets: {
        select: {
          eventId: true,
          status: true,
          createdAt: true,
          checkIn: { select: { checkedInAt: true } },
        },
      },
      connectionsSent: { select: { addresseeId: true, status: true, createdAt: true } },
      connectionsReceived: { select: { requesterId: true, status: true, createdAt: true } },
      subscriptions: {
        select: { status: true, createdAt: true, plan: { select: { code: true } } },
      },
    },
  });
  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="eib-data-${user.id}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
