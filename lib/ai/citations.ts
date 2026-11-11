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
