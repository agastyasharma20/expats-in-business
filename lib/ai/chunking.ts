/**
 * Heading-aware chunking for guide embeddings (pure, unit-tested). Each chunk belongs to one "##"
 * section, keeps that heading for context and source chips, and stays near TARGET_TOKENS; long
 * sections split on paragraph boundaries, never mid-sentence. TODO notes are never embedded: the
 * concierge must not answer from unverified text.
 */
export const TARGET_TOKENS = 500;
const MAX_TOKENS = 650;

export type Chunk = { ordinal: number; heading: string; content: string };

/** Rough token estimate for English/Polish prose (~4 characters per token). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Drops MDX/markdown noise: TODO callouts, JSX tags, link targets, emphasis markers. */
export function cleanMarkdown(markdown: string): string {
  return markdown
    .split("\n")
    .filter((line) => !/^>\s*\*\*TODO/i.test(line.trim()))
    .join("\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/^>\s?/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Splits one paragraph that is itself too long at sentence ends. */
function splitLongParagraph(paragraph: string): string[] {
  if (estimateTokens(paragraph) <= MAX_TOKENS) return [paragraph];
  const sentences = paragraph.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [paragraph];
  const parts: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && estimateTokens(current + sentence) > TARGET_TOKENS) {
      parts.push(current.trim());
      current = "";
    }
    current += sentence;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

export function chunkGuide(title: string, body: string): Chunk[] {
  const sections: { heading: string; text: string }[] = [];
  let heading = title;
  let buffer: string[] = [];
  const flush = () => {
    const text = cleanMarkdown(buffer.join("\n"));
    if (text) sections.push({ heading, text });
    buffer = [];
  };
  for (const line of body.split("\n")) {
    const match = /^#{2,3}\s+(.+)$/.exec(line.trim());
    if (match) {
      flush();
      heading = match[1]!.trim();
    } else {
      buffer.push(line);
    }
  }
  flush();

  const chunks: Chunk[] = [];
  for (const section of sections) {
    let current = "";
    for (const paragraph of splitParagraphs(section.text).flatMap(splitLongParagraph)) {
      if (current && estimateTokens(`${current}\n\n${paragraph}`) > TARGET_TOKENS) {
        chunks.push({ ordinal: chunks.length, heading: section.heading, content: current });
        current = "";
      }
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
    if (current)
      chunks.push({ ordinal: chunks.length, heading: section.heading, content: current });
  }
  return chunks;
}
