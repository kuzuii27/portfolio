// shortcut: in-memory per server instance, resets on restart; upgrade to KV/Turnstile if spam appears
const hits = new Map<string, number[]>();

export function allow(key: string, now: number, limit = 5, windowMs = 3_600_000): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
