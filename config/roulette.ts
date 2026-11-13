/**
 * Coffee Roulette suggestions. No café partnerships exist yet, so every entry is a clearly
 * labelled placeholder (CLAUDE.md rule 3); replace with real partners once agreed in writing.
 */
export const PLACEHOLDER_CAFES = [
  "Partner café placeholder A (no partnership yet)",
  "Partner café placeholder B (no partnership yet)",
  "Partner café placeholder C (no partnership yet)",
] as const;

/** Scope keys: one roulette per chapter and one per Cultural Bubble. */
export type RouletteScope = { kind: "chapter" | "bubble"; id: string };

export function scopeKey(scope: RouletteScope): string {
  return `${scope.kind}:${scope.id}`;
}

export function parseScopeKey(key: string): RouletteScope | null {
  const match = /^(chapter|bubble):([a-z0-9]{1,40})$/.exec(key);
  return match ? { kind: match[1] as RouletteScope["kind"], id: match[2]! } : null;
}
