/**
 * Answer orchestration (pure: the provider stream is injected, so it is unit-tested with fakes).
 * Sentences are released only after their citations are checked against the retrieved passages.
 * Any unknown citation, an explicit NO_ANSWER, or an answer without a single valid citation ends
 * in a handoff instead of an answer.
 */
import type { ChainEvent, ProviderName } from "./chain";
import { checkCitations, extractCitations, SentenceBuffer } from "./citations";
import { NO_ANSWER, type Passage } from "./prompt";

export type HandoffReason =
  "lowSimilarity" | "noAnswer" | "noCitation" | "unknownCitation" | "error";

export type ConciergeEvent =
  | { type: "sources"; sources: Passage[] }
  | { type: "text"; text: string }
  | { type: "reset" }
  | { type: "handoff"; reason: HandoffReason }
  | { type: "done"; cited: string[]; provider: ProviderName | null };

export type Outcome = {
  answered: boolean;
  cited: string[];
  provider: ProviderName | null;
  reason?: HandoffReason;
};

export async function* orchestrate(
  passages: Passage[],
  stream: () => AsyncIterable<ChainEvent>,
  onOutcome: (outcome: Outcome) => void = () => undefined,
): AsyncGenerator<ConciergeEvent> {
  let provider: ProviderName | null = null;
  const fail = (reason: HandoffReason): ConciergeEvent => {
    onOutcome({ answered: false, cited: [], provider, reason });
    return { type: "handoff", reason };
  };
  if (!passages.length) {
    yield fail("lowSimilarity");
    return;
  }
  const allowed = new Set(passages.map((p) => p.id));
  yield { type: "sources", sources: passages };

  let buffer = new SentenceBuffer();
  let cited = new Set<string>();
  // The opening text is held back while it could still be the NO_ANSWER sentinel.
  let held = "";
  let holding = true;

  /** Checks each sentence before release; returns a handoff to stop, or null to continue. */
  function* release(sentences: string[]): Generator<ConciergeEvent, ConciergeEvent | null> {
    for (const sentence of sentences) {
      if (sentence.includes(NO_ANSWER)) return fail("noAnswer");
      if (!checkCitations(sentence, allowed, false).ok) return fail("unknownCitation");
      for (const id of extractCitations(sentence)) cited.add(id);
      yield { type: "text", text: sentence };
    }
    return null;
  }

  try {
    for await (const event of stream()) {
      if (event.type === "provider") {
        provider = event.name;
        continue;
      }
      if (event.type === "reset") {
        buffer = new SentenceBuffer();
        cited = new Set();
        held = "";
        holding = true;
        yield { type: "reset" };
        continue;
      }
      let text = event.text;
      if (holding) {
        held += text;
        const start = held.trimStart();
        if (start.startsWith(NO_ANSWER)) {
          yield fail("noAnswer");
          return;
        }
        if (NO_ANSWER.startsWith(start)) continue;
        holding = false;
        text = held;
        held = "";
      }
      const stop = yield* release(buffer.push(text));
      if (stop) {
        yield stop;
        return;
      }
    }
    if (holding && held.trim()) {
      yield fail(held.trim() === NO_ANSWER ? "noAnswer" : "noCitation");
      return;
    }
    const stop = yield* release(buffer.flush());
    if (stop) {
      yield stop;
      return;
    }
  } catch {
    yield fail("error");
    return;
  }

  if (!cited.size) {
    yield fail("noCitation");
    return;
  }
  onOutcome({ answered: true, cited: [...cited], provider });
  yield { type: "done", cited: [...cited], provider };
}
