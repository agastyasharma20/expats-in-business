/**
 * Client IP for rate limits. X-Forwarded-For is set by the client unless a trusted proxy rewrites
 * it, so it is only used when TRUSTED_PROXY_HOPS says how many proxies sit in front of the app:
 * the address is then the entry that many places from the right (the one our proxy saw).
 * With no trusted proxy, null is returned and callers skip per-IP limits (per-account and global
 * limits still apply). Pure and unit-tested.
 */
export function clientIp(forwardedFor: string | null, trustedHops: number): string | null {
  if (!forwardedFor || trustedHops < 1) return null;
  const chain = forwardedFor
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const candidate = chain[chain.length - trustedHops];
  return candidate && /^[0-9a-f:.]{3,45}$/i.test(candidate) ? candidate : null;
}
