/**
 * Answer gate (pure: the provider stream is injected, so it is unit-tested with fakes).
 *
 * Nothing the model writes reaches the user until the complete answer has passed every check:
 * each sentence carries at least one citation, every citation is one of the retrieved passages,
 * no citation is malformed, no sentence is a NO_ANSWER variant, and each sentence is grounded in
 * the passages it cites (shared content words). Any failure turns the whole answer into a handoff.
 * Only then are the cited sources and the sentences sent. Uncited text is never shown.
 */
import type { ChainEvent, ProviderName } from "./chain";
import { extractCitations, hasMalformedCitation, isGrounded, SentenceBuffer } from "./citations";
import type { Passage } from "./prompt";

export type HandoffReason =
  "lowSimilarity" | "noAnswer" | "noCitation" | "unknownCitation" | "ungrounded" | "error";

export type ConciergeEvent =
  | { type: "sources"; sources: Passage[] }
  | { type: "text"; text: string }
  | { type: "handoff"; reason: HandoffReason }
  | { type: "done"; cited: string[]; provider: ProviderName | null };

export type Outcome = {
  answered: boolean;
  cited: string[];
  provider: ProviderName | null;
  reason?: HandoffReason;
};

/** NO_ANSWER in any spelling the model might produce ("no answer", "No_Answer.", …). */
const NO_ANSWER_PATTERN = /\bno[\s_-]*answer\b/i;

export type Verdict =
  { ok: true; sentences: string[]; cited: string[] } | { ok: false; reason: HandoffReason };

/** Checks a complete answer against the retrieved passages (pure). */
export function judgeAnswer(text: string, passages: Passage[]): Verdict {
  const byId = new Map(passages.map((p) => [p.id, p]));
  if (NO_ANSWER_PATTERN.test(text)) return { ok: false, reason: "noAnswer" };
  const buffer = new SentenceBuffer();
  const sentences = [...buffer.push(text), ...buffer.flush()].map((s) => s.trim()).filter(Boolean);
  if (!sentences.length) return { ok: false, reason: "noCitation" };
  const cited = new Set<string>();
  for (const sentence of sentences) {
    if (hasMalformedCitation(sentence)) return { ok: false, reason: "unknownCitation" };
    const ids = extractCitations(sentence);
    if (!ids.length) return { ok: false, reason: "noCitation" };
    if (ids.some((id) => !byId.has(id))) return { ok: false, reason: "unknownCitation" };
    if (
      !isGrounded(
        sentence,
        ids.map((id) => byId.get(id)!.content),
      )
    )
      return { ok: false, reason: "ungrounded" };
    for (const id of ids) cited.add(id);
  }
  return { ok: true, sentences, cited: [...cited] };
}

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

  let answer = "";
  try {
    for await (const event of stream()) {
      if (event.type === "provider") provider = event.name;
      else if (event.type === "reset")
        answer = ""; // the next provider starts over
      else answer += event.text;
    }
  } catch {
    yield fail("error");
    return;
  }

  const verdict = judgeAnswer(answer, passages);
  if (!verdict.ok) {
    yield fail(verdict.reason);
    return;
  }
  // Only the passages the answer actually cites are sent to the browser, after the checks.
  yield { type: "sources", sources: passages.filter((p) => verdict.cited.includes(p.id)) };
  for (const sentence of verdict.sentences) yield { type: "text", text: sentence };
  onOutcome({ answered: true, cited: verdict.cited, provider });
  yield { type: "done", cited: verdict.cited, provider };
}
