/**
 * The roadmap's 2-sentence personal intro. The model only writes words around a plan that the
 * rules already fixed; it never sees or changes the selection or order. Pure parts are here
 * (template, output check); the model call is in lib/roadmap/ai-intro.ts.
 */
export type IntroFacts = { total: number; firstWeek: number; firstTitle: string };

type Format = (
  key: "intro1" | "intro2Week" | "intro2",
  values: Record<string, string | number>,
) => string;

const ENGLISH: Format = (key, v) =>
  ({
    intro1: `Your Landing Roadmap has ${v.total} steps for your first 90 days.`,
    intro2Week: `Start with “${v.first}” this week; every step links to a guide with official sources.`,
    intro2: `Start with “${v.first}”; every step links to a guide with official sources.`,
  })[key];

/** Template fallback (also used offline and when the model output fails the check). */
export function introTemplate(facts: IntroFacts, format: Format = ENGLISH): string {
  return `${format("intro1", { total: facts.total })} ${format(facts.firstWeek > 0 ? "intro2Week" : "intro2", { first: facts.firstTitle })}`;
}

/** Model output is used only if it is short, plain and exactly one or two sentences. */
export function isAcceptableIntro(text: string): boolean {
  const clean = text.trim();
  if (!clean || clean.length > 320 || /\n/.test(clean)) return false;
  if (/https?:|www\.|@|\[\[|<|>|\{|\}/i.test(clean)) return false;
  if (clean.split(/\s+/).length > 50) return false;
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences.length >= 1 && sentences.length <= 2 && /[.!?]$/.test(clean);
}
