import { headers } from "next/headers";
import { z } from "zod";

import { orchestrate, type ConciergeEvent } from "@/lib/ai/concierge";
import { buildInstructions, buildPrompt } from "@/lib/ai/prompt";
import { generate } from "@/lib/ai/provider";
import { normaliseQuestion } from "@/lib/ai/redact";
import { retrieve } from "@/lib/ai/retrieval";
import { hasEntitlement } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session";
import { conciergeCountry, sourceTitles } from "@/lib/content/guide-index";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 4096;
const PER_IP_DAILY = 60;
const body = z.object({ question: z.string().min(3).max(1000) });

/**
 * Guides are written in English and every sentence must be grounded in its cited passage, so the
 * concierge answers in English for now (translated guides will allow other languages).
 */
const ANSWER_LANGUAGE = "English";

function utcDay() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Concierge (Server-Sent Events over POST), members only. Pipeline: size cap → redact → burst,
 * daily (member and IP) limits → retrieve passages from the member's country → provider chain
 * (demo only once the global daily budget is spent) → answer gate → log without personal data.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "signIn" }, { status: 401 });
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > MAX_BODY_BYTES) {
    return Response.json({ error: "invalid" }, { status: 413 });
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return Response.json({ error: "invalid" }, { status: 413 });
  const parsed = body.safeParse(
    (() => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })(),
  );
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });
  const question = normaliseQuestion(parsed.data.question);
  if (question.length < 3) return Response.json({ error: "invalid" }, { status: 400 });

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const day = utcDay();
  if (!(await rateLimit(`concierge-burst:${user.id}`, 5, 60)).ok)
    return Response.json({ error: "rateLimited" }, { status: 429 });
  if (!(await rateLimit(`concierge-ip:${ip}:${day}`, PER_IP_DAILY, 86_400)).ok)
    return Response.json({ error: "rateLimited" }, { status: 429 });
  const env = getEnv();
  const daily = hasEntitlement(user, "concierge.unlimited")
    ? null
    : await rateLimit(`concierge-day:${user.id}:${day}`, env.AI_DAILY_FREE_QUOTA, 86_400);
  if (daily && !daily.ok)
    return Response.json({ error: "quota", limit: env.AI_DAILY_FREE_QUOTA }, { status: 429 });

  const [country, titles] = await Promise.all([conciergeCountry(user.id), sourceTitles()]);
  const { passages } = await retrieve(question, country, titles);
  // Model calls only happen with passages; count them against the platform-wide budget.
  const budget = passages.length
    ? await rateLimit(`concierge-global:${day}`, env.AI_GLOBAL_DAILY_BUDGET, 86_400)
    : { ok: true };

  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort());
  const events = orchestrate(
    passages,
    () =>
      generate({
        instructions: buildInstructions(ANSWER_LANGUAGE),
        prompt: buildPrompt(question, passages),
        passages,
        signal: abort.signal,
        demoOnly: !budget.ok,
      }),
    (outcome) => {
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
  const frame = (event: ConciergeEvent | { type: "quota"; remaining: number | null }) =>
    encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
  let closed = false;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Parameters<typeof frame>[0]) => {
        if (!closed) controller.enqueue(frame(event));
      };
      try {
        send({ type: "quota", remaining: daily ? daily.remaining : null });
        for await (const event of events) {
          if (closed) break;
          send(event);
        }
      } catch {
        send({ type: "handoff", reason: "error" });
      } finally {
        if (!closed) {
          closed = true;
          controller.close();
        }
      }
    },
    async cancel() {
      closed = true;
      abort.abort();
      await events.return(undefined);
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
