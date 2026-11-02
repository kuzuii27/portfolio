// shortcut: in-memory per server instance, resets on restart; upgrade to KV/Turnstile if spam appears
const hits = new Map<string, number[]>();

export function allow(key: string, now: number, limit = 5, windowMs = 3_600_000, record = true): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.set(key, recent);
  if (recent.length >= limit) return false;
  if (record) recent.push(now);
  return true;
}
