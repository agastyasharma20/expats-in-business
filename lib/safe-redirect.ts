/**
 * Return path after sign-in: same-site paths only. Rejects protocol-relative ("//evil"),
 * backslash tricks ("/\evil", which browsers treat like "//"), control characters and any URL
 * that resolves to another origin.
 */
export function safeNext(
  value: string | string[] | undefined,
  appUrl: string,
  fallback = "/dashboard",
): string {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  const base = new URL(appUrl);
  const url = new URL(next, base);
  return url.origin === base.origin ? `${url.pathname}${url.search}${url.hash}` : fallback;
}
