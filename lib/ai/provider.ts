import "server-only";

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, type LanguageModel } from "ai";

import { getEnv } from "@/lib/env";

import {
  orderAdapters,
  runChain,
  type Adapter,
  type ProviderName,
  type StreamRequest,
} from "./chain";
import { createDemoAdapter } from "./demo";
import type { Passage } from "./prompt";

/** First token within 10 s, whole answer within 45 s; otherwise the chain moves on. */
const TIMEOUT = { firstChunkMs: 10_000, totalMs: 45_000 } as const;

const DEFAULT_MODELS: Record<Exclude<ProviderName, "demo">, string> = {
  groq: "openai/gpt-oss-120b",
  gemini: "gemini-2.5-flash",
  openrouter: "openai/gpt-oss-120b:free",
  anthropic: "claude-sonnet-5-5",
};

function modelAdapter(
  name: Exclude<ProviderName, "demo">,
  model: (() => LanguageModel) | null,
): Adapter {
  return {
    name,
    available: model !== null,
    async *stream({ instructions, prompt, signal }: StreamRequest) {
      const result = streamText({
        model: model!(),
        instructions,
        prompt,
        temperature: 0.1,
        maxOutputTokens: 400,
        maxRetries: 0, // retries are the chain's job (next provider), not the SDK's
        timeout: TIMEOUT,
        abortSignal: signal,
      });
      for await (const part of result.fullStream) {
        if (part.type === "text-delta") yield part.text;
        else if (part.type === "error") throw part.error;
      }
    },
  };
}

/**
 * One interface for every provider (brief 4): groq | gemini | openrouter | anthropic | demo, with an
 * automatic fallback chain starting at AI_PROVIDER and ending at demo. Keys come from the env only.
 */
export function buildAdapters(passages: Passage[]): Adapter[] {
  const env = getEnv();
  return [
    modelAdapter(
      "groq",
      env.GROQ_API_KEY
        ? () => createGroq({ apiKey: env.GROQ_API_KEY })(env.GROQ_MODEL ?? DEFAULT_MODELS.groq)
        : null,
    ),
    modelAdapter(
      "gemini",
      env.GEMINI_API_KEY
        ? () =>
            createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY })(
              env.GEMINI_MODEL ?? DEFAULT_MODELS.gemini,
            )
        : null,
    ),
    modelAdapter(
      "openrouter",
      env.OPENROUTER_API_KEY
        ? () =>
            createOpenRouter({ apiKey: env.OPENROUTER_API_KEY })(
              env.OPENROUTER_MODEL ?? DEFAULT_MODELS.openrouter,
            )
        : null,
    ),
    modelAdapter(
      "anthropic",
      env.ANTHROPIC_API_KEY
        ? () =>
            createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })(
              env.ANTHROPIC_MODEL ?? DEFAULT_MODELS.anthropic,
            )
        : null,
    ),
    createDemoAdapter(passages),
  ];
}

/** demoOnly: the global daily budget is spent, so no paid or rate-limited provider is called. */
export function generate(request: StreamRequest & { passages: Passage[]; demoOnly?: boolean }) {
  const all = buildAdapters(request.passages);
  const adapters = request.demoOnly
    ? all.filter((a) => a.name === "demo")
    : orderAdapters(all, getEnv().AI_PROVIDER);
  return runChain(adapters, request);
}
