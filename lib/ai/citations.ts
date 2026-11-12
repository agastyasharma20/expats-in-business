/**
 * Citation rules for concierge answers (pure, unit-tested). The model cites passages as [[id]].
 * Every cited id must be one of the passages retrieved for this question; one unknown id drops the
 * whole answer, and an answer without any valid citation is never shown.
 */
const CITATION = /\[\[([A-Za-z0-9_-]{1,64})\]\]/g;

export function extractCitations(text: string): string[] {
  return [...text.matchAll(CITATION)].map((m) => m[1]!);
}

export type CitationCheck =
  | { ok: true; cited: string[] }
  | { ok: false; reason: "unknownCitation" | "noCitation"; unknown?: string[] };

export function checkCitations(
  text: string,
  allowed: ReadonlySet<string>,
  requireOne = true,
): CitationCheck {
  const cited = [...new Set(extractCitations(text))];
  const unknown = cited.filter((id) => !allowed.has(id));
  if (unknown.length) return { ok: false, reason: "unknownCitation", unknown };
  if (requireOne && cited.length === 0) return { ok: false, reason: "noCitation" };
  return { ok: true, cited };
}

/** Replaces [[id]] markers with numbered references [1], [2] in the order of `order`. */
export function numberCitations(text: string, order: readonly string[]): string {
  return text.replace(CITATION, (_, id: string) => {
    const index = order.indexOf(id);
    return index >= 0 ? `[${index + 1}]` : "";
  });
}

/**
 * Collects streamed text and releases whole sentences only (so each sentence's citations can be
 * checked before anyone sees it). A citation right after the full stop belongs to that sentence.
 */
export class SentenceBuffer {
  private pending = "";

  push(delta: string): string[] {
    this.pending += delta;
    const out: string[] = [];
    // A sentence ends at . ! ? (plus any citations right after it) before whitespace, or at a blank line.
    // The next word must already be there (and not be a citation), so trailing [[id]]s stay attached.
    const end = /[.!?]+(?:\s*\[\[[A-Za-z0-9_-]{1,64}\]\])*(?=\s+[^\s[])|\n\s*\n/g;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = end.exec(this.pending))) {
      const stop = match.index + match[0].length;
      const sentence = this.pending.slice(last, stop).trim();
      if (sentence) out.push(sentence);
      last = stop;
    }
    this.pending = this.pending.slice(last);
    return out;
  }

  flush(): string[] {
    const rest = this.pending.trim();
    this.pending = "";
    return rest ? [rest] : [];
  }
}

/** Any "[[" or "]]" left after removing well-formed citations means a malformed citation. */
export function hasMalformedCitation(text: string): boolean {
  return /\[\[|\]\]/.test(text.replace(CITATION, ""));
}

const STOPWORDS = new Set(
  "about above after again also another because been before being below between both cannot could does doing down during each from further have having here into itself more most must only other ought over same should some such than that their theirs them then there these they this those through under until very were what when where which while with would your yours will shall need needs".split(
    " ",
  ),
);

/** Content words of a text: lowercase, letters only, 4+ letters, no stop words, 5-letter stems. */
export function contentStems(text: string): Set<string> {
  const words = text
    .replace(CITATION, " ")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .match(/\p{L}{4,}/gu);
  return new Set((words ?? []).filter((w) => !STOPWORDS.has(w)).map((w) => w.slice(0, 5)));
}

/**
 * Grounding check: a sentence must share most of its content words with the passages it cites,
 * so a model cannot attach a valid citation to invented facts. Short connective sentences (under
 * 3 content words) pass on their citation alone.
 */
export const MIN_GROUNDING = 0.5;

export function isGrounded(sentence: string, citedPassages: string[]): boolean {
  const words = contentStems(sentence);
  if (words.size < 3) return true;
  const source = contentStems(citedPassages.join(" "));
  let shared = 0;
  for (const word of words) if (source.has(word)) shared += 1;
  return shared / words.size >= MIN_GROUNDING;
}
