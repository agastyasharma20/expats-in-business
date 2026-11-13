export type Tree = { [key: string]: unknown };

/** Deep merge: a key missing at any depth in a translation falls back to English (never a raw key). */
export function mergeMessages(base: Tree, override: Tree): Tree {
  const out: Tree = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = out[key];
    out[key] =
      value && typeof value === "object" && current && typeof current === "object"
        ? mergeMessages(current as Tree, value as Tree)
        : value;
  }
  return out;
}
