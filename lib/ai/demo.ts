import type { Adapter } from "./chain";
import type { Passage } from "./prompt";

/**
 * Offline "demo" adapter: no model, no network. It formats the best retrieved passages as a cited
 * answer (first sentences of each, with [[id]] citations), streamed word by word. Used when no AI
 * key is configured and as the final fallback of the chain.
 */
const SENTENCES_PER_PASSAGE = 2;
const MAX_PASSAGES = 2;

function firstSentences(text: string, count: number): string[] {
  const flat = text
    .replace(/\n+/g, " ")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\s+-\s+/g, " ");
  const sentences = flat.match(/[^.!?]+[.!?]+/g) ?? [flat];
  return sentences
    .slice(0, count)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function composeDemoAnswer(passages: Passage[]): string {
  return (
    passages
      .slice(0, MAX_PASSAGES)
      // Every sentence carries its own citation (the answer gate requires one per sentence).
      .flatMap((p) =>
        firstSentences(p.content, SENTENCES_PER_PASSAGE).map(
          (sentence) => `${sentence} [[${p.id}]]`,
        ),
      )
      .join(" ")
  );
}

export function createDemoAdapter(passages: Passage[], delayMs = 12): Adapter {
  return {
    name: "demo",
    available: true,
    async *stream({ signal }) {
      for (const word of composeDemoAnswer(passages).split(/(?<=\s)/)) {
        if (signal?.aborted) return;
        if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
        yield word;
      }
    },
  };
}
