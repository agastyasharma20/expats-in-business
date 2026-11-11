/**
 * Directory filters live in the URL (shareable, back-button safe). Parsing is strict: unknown or
 * malformed values are dropped, never passed to the database. Pure and unit-tested.
 */
export type SearchParams = Record<string, string | string[] | undefined>;

export type MemberFilters = {
  q?: string;
  industry?: string;
  skill?: string;
  language?: string;
  origin?: string;
  chapter?: string;
  coffee?: boolean;
  page: number;
};

export type ProviderFilters = {
  q?: string;
  category?: string;
  language?: string;
  verified?: boolean;
  page: number;
};
export type BusinessFilters = { q?: string; category?: string; page: number };

export const PAGE_SIZE = 24;

const SLUG = /^[a-z0-9-]{1,60}$/;

function one(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

function text(params: SearchParams, key: string, max = 60): string | undefined {
  const value = one(params, key);
  if (!value) return undefined;
  // Letters, digits, spaces and a few separators; anything else is stripped (no wildcards, no markup).
  const clean = value
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s.+#&'-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
  return clean.length >= 2 ? clean : undefined;
}

function slug(params: SearchParams, key: string) {
  const value = one(params, key)?.toLowerCase();
  return value && SLUG.test(value) ? value : undefined;
}

function code(
  params: SearchParams,
  key: string,
  pattern: RegExp,
  transform: (v: string) => string,
) {
  const value = one(params, key);
  if (!value) return undefined;
  const normalised = transform(value);
  return pattern.test(normalised) ? normalised : undefined;
}

function page(params: SearchParams) {
  const n = Number(one(params, "page"));
  return Number.isInteger(n) && n >= 1 && n <= 500 ? n : 1;
}

const flag = (params: SearchParams, key: string) => one(params, key) === "1";

export function parseMemberFilters(params: SearchParams): MemberFilters {
  return {
    q: text(params, "q"),
    industry: slug(params, "industry"),
    skill: text(params, "skill", 40)?.toLowerCase(),
    language: code(params, "language", /^[a-z]{2}$/, (v) => v.toLowerCase()),
    origin: code(params, "origin", /^[A-Z]{2}$/, (v) => v.toUpperCase()),
    chapter: slug(params, "chapter"),
    coffee: flag(params, "coffee") || undefined,
    page: page(params),
  };
}

export function parseProviderFilters(params: SearchParams): ProviderFilters {
  return {
    q: text(params, "q"),
    category: slug(params, "category"),
    language: code(params, "language", /^[a-z]{2}$/, (v) => v.toLowerCase()),
    verified: flag(params, "verified") || undefined,
    page: page(params),
  };
}

export function parseBusinessFilters(params: SearchParams): BusinessFilters {
  return { q: text(params, "q"), category: slug(params, "category"), page: page(params) };
}

/** Canonical query string: stable key order, defaults omitted, page 1 omitted. */
export function toQueryString(
  filters: Record<string, string | number | boolean | undefined>,
): string {
  const query = new URLSearchParams();
  for (const key of Object.keys(filters).sort()) {
    const value = filters[key];
    if (value === undefined || value === false || value === "") continue;
    if (key === "page" && value === 1) continue;
    query.set(key, value === true ? "1" : String(value));
  }
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

/** Same filters with one key changed (and back to page 1 unless the page itself changes). */
export function withFilter<T extends { page: number }>(
  filters: T,
  key: keyof T,
  value: T[keyof T] | undefined,
): T {
  return { ...filters, [key]: value, ...(key === "page" ? {} : { page: 1 }) };
}

/** Average rating with one decimal, or null with no reviews. */
export function averageRating(ratings: number[]): number | null {
  if (!ratings.length) return null;
  return Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
}
