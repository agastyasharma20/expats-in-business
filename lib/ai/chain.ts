/**
 * Provider fallback chain (pure orchestration, unit-tested with fake adapters). Adapters are tried
 * in order; a rate limit (429), server error (5xx), timeout or network failure moves on to the next
 * one. The demo adapter is always last, so an answer path exists even fully offline.
 */
export type ProviderName = "groq" | "gemini" | "openrouter" | "anthropic" | "demo";

export type StreamRequest = { instructions: string; prompt: string; signal?: AbortSignal };

export type Adapter = {
  name: ProviderName;
  /** Configured (has a key)? Unconfigured adapters are skipped. */
  available: boolean;
  stream(request: StreamRequest): AsyncIterable<string>;
};

type ErrorLike = {
  name?: string;
  statusCode?: number;
  isRetryable?: boolean;
  code?: string;
  cause?: unknown;
  message?: string;
};

/** Errors that mean "try the next provider" (not "the request itself is wrong"). */
export function isFallbackError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as ErrorLike;
  if (
    e.name === "AbortError" &&
    !String(e.message ?? "")
      .toLowerCase()
      .includes("timeout")
  )
    return false;
  if (typeof e.statusCode === "number")
    return e.statusCode === 429 || e.statusCode === 408 || e.statusCode >= 500;
  if (e.isRetryable) return true;
  if (/timeout|timed out/i.test(`${e.name ?? ""} ${e.message ?? ""}`)) return true;
  if (e.name === "TypeError" && /fetch failed|network/i.test(e.message ?? "")) return true;
  if (["ECONNRESET", "ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "EAI_AGAIN"].includes(e.code ?? ""))
    return true;
  return e.cause ? isFallbackError(e.cause) : false;
}

/** Order of adapters: the configured first choice, then the others, demo always last. */
export function orderAdapters(adapters: Adapter[], first: ProviderName): Adapter[] {
  const usable = adapters.filter((a) => a.available || a.name === "demo");
  const head = usable.filter((a) => a.name === first && a.name !== "demo");
  const middle = usable.filter((a) => a.name !== first && a.name !== "demo");
  const demo = usable.filter((a) => a.name === "demo");
  return [...head, ...middle, ...demo];
}

export type ChainEvent =
  { type: "provider"; name: ProviderName } | { type: "reset" } | { type: "text"; text: string };

/**
 * Streams from the first adapter that works. If one fails with a fallback error, even mid-answer,
 * a "reset" is emitted (the caller discards what it had) and the next adapter starts over.
 * Non-fallback errors are rethrown.
 */
export async function* runChain(
  adapters: Adapter[],
  request: StreamRequest,
): AsyncGenerator<ChainEvent> {
  let lastError: unknown;
  for (const [index, adapter] of adapters.entries()) {
    let started = false;
    try {
      yield { type: "provider", name: adapter.name };
      for await (const text of adapter.stream(request)) {
        started = true;
        yield { type: "text", text };
      }
      return;
    } catch (error) {
      lastError = error;
      if (request.signal?.aborted) throw error;
      if (!isFallbackError(error) || index === adapters.length - 1) throw error;
      if (started) yield { type: "reset" };
    }
  }
  throw lastError ?? new Error("no-adapter");
}
