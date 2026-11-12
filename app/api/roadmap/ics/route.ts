import { getSessionUser } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { buildTaskCalendar } from "@/lib/events/ics";
import { syncRoadmap } from "@/lib/roadmap/service";

/** The member's open roadmap steps as all-day calendar events on their due dates. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return new Response("Sign in first", { status: 401 });
  const items = await syncRoadmap(user.id);
  const url = new URL("/roadmap", getEnv().APP_URL).toString();
  const now = new Date();
  const body = buildTaskCalendar(
    "EiB Landing Roadmap",
    items
      .filter((i) => !i.doneAt)
      .map((i) => ({
        uid: `${i.id}@expatsinbusiness`,
        title: i.title,
        description: i.why,
        url,
        date: i.dueAt,
        stamp: now,
      })),
  );
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="eib-roadmap.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
