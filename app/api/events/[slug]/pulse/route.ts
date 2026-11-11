import { can } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { pulseSnapshot } from "@/lib/events/checkin";

const INTERVAL_MS = 3000;
const MAX_MINUTES = 240;

/** Server-Sent Events for the Pulse screen: a fresh snapshot every 3 s until the screen closes. */
export async function GET(request: Request, { params }: RouteContext<"/api/events/[slug]/pulse">) {
  const user = await getSessionUser();
  const event = await getDb().event.findUnique({
    where: { slug: (await params).slug },
    select: { id: true, chapterId: true },
  });
  if (!event) return new Response("Not found", { status: 404 });
  if (!can(user, "event.pulse", { chapterId: event.chapterId }))
    return new Response("Forbidden", { status: user ? 403 : 401 });

  const encoder = new TextEncoder();
  const deadline = Date.now() + MAX_MINUTES * 60_000;
  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        const snapshot = await pulseSnapshot(event.id);
        controller.enqueue(encoder.encode(`event: pulse\ndata: ${JSON.stringify(snapshot)}\n\n`));
      };
      try {
        controller.enqueue(encoder.encode("retry: 5000\n\n"));
        while (!request.signal.aborted && Date.now() < deadline) {
          await send();
          await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
        }
      } catch {
        // client went away or the database hiccuped: the browser reconnects (retry above)
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
