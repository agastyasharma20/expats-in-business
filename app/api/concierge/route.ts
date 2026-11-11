import { z } from "zod";

import { buildInstructions, buildPrompt } from "@/lib/ai/prompt";
import { generate } from "@/lib/ai/provider";
import { orchestrate, type ConciergeEvent } from "@/lib/ai/concierge";
import { normaliseQuestion } from "@/lib/ai/redact";
import { retrieve } from "@/lib/ai/retrieval";
import { hasEntitlement } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session";
import { conciergeCountry, sourceTitles } from "@/lib/content/guide-index";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

const body = z.object({
  question: z.string().min(3).max(1000),
  locale: z.enum(["en", "pl", "uk"]).default("en"),
});
const LANGUAGE = { en: "English", pl: "Polish", uk: "Ukrainian" } as const;

function utcDay() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Concierge stream (Server-Sent Events over POST). Members only. Pipeline: redact → rate limit and
 * daily quota → retrieve passages from the member's country → provider chain → citation gate →
 * log (redacted question, cited chunk ids, provider; no user id, no personal data).
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "signIn" }, { status: 401 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });
  const question = normaliseQuestion(parsed.data.question);
  if (question.length < 3) return Response.json({ error: "invalid" }, { status: 400 });

  if (!(await rateLimit(`concierge-burst:${user.id}`, 5, 60)).ok)
    return Response.json({ error: "rateLimited" }, { status: 429 });
  const unlimited = hasEntitlement(user, "concierge.unlimited");
  const quota = getEnv().AI_DAILY_FREE_QUOTA;
  const daily = unlimited
    ? null
    : await rateLimit(`concierge-day:${user.id}:${utcDay()}`, quota, 86_400);
  if (daily && !daily.ok) return Response.json({ error: "quota", limit: quota }, { status: 429 });

  const [country, titles] = await Promise.all([conciergeCountry(user.id), sourceTitles()]);
  const { passages } = await retrieve(question, country, titles);
  const controller = new AbortController();
  request.signal.addEventListener("abort", () => controller.abort());

  const events = orchestrate(
    passages,
    () =>
      generate({
        instructions: buildInstructions(LANGUAGE[parsed.data.locale]),
        prompt: buildPrompt(question, passages),
        passages,
        signal: controller.signal,
      }),
    (outcome) => {
      if (!outcome.answered) controller.abort(); // stop paying for tokens nobody will see
      void getDb()
        .conciergeQuery.create({
          data: {
            question,
            citedChunkIds: outcome.cited,
            provider: outcome.provider ?? "none",
            answered: outcome.answered,
          },
        })
        .catch((error: unknown) => console.error("[concierge] log failed:", error));
    },
  );

  const encoder = new TextEncoder();
  const send = (event: ConciergeEvent | { type: "quota"; remaining: number | null }) =>
    encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
  const stream = new ReadableStream({
    async start(controllerStream) {
      controllerStream.enqueue(send({ type: "quota", remaining: daily ? daily.remaining : null }));
      try {
        for await (const event of events) controllerStream.enqueue(send(event));
      } catch {
        controllerStream.enqueue(send({ type: "handoff", reason: "error" }));
      } finally {
        controllerStream.close();
      }
    },
    cancel() {
      controller.abort();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
