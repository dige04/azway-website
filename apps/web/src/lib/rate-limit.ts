/**
 * Fixed-window counter per key, in memory (FR-LEAD-08 fallback).
 *
 * Limits on Workers: the map lives in one isolate. Cloudflare runs many
 * isolates (per data centre, recycled at any time), so this caps one client
 * hitting one isolate, the common case for a form, not a distributed attack.
 * The Workers Rate Limiting binding only counts per 10 or 60 seconds, so it
 * cannot express "5 per 10 minutes"; a strict limit needs a Durable Object or
 * a WAF rate-limiting rule on /api/lead (decided with deployment, M8).
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const windows = new Map<string, { start: number; count: number }>();

  return {
    /** Counts one request; false when `key` is over the limit in the current window. */
    allow(key: string, now = Date.now()): boolean {
      if (windows.size > 10_000) {
        for (const [k, w] of windows) if (now - w.start >= windowMs) windows.delete(k);
      }
      const current = windows.get(key);
      if (!current || now - current.start >= windowMs) {
        windows.set(key, { start: now, count: 1 });
        return true;
      }
      current.count++;
      return current.count <= limit;
    },
  };
}
