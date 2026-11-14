import "server-only";

// Per-guest budget for paid third-party API calls (cost requirement in the
// PRD). Cache hits don't count, only calls that would reach the paid API.
// Stops one guest, or a page abusing their session, from draining the shared
// quota for everyone. Best effort like ttl-cache: each server instance keeps
// its own counts, and they reset on restart.

export interface RateLimiter {
  /** Spends one call from `key`'s budget. False once this window's budget is used up. */
  take(key: string): boolean;
}

export function createRateLimiter(
  limit: number,
  windowMs: number,
  now: () => number = Date.now,
): RateLimiter {
  // Keyed by guest id, so it stays as small as the guest list.
  const windows = new Map<string, { used: number; resetAt: number }>();
  return {
    take(key) {
      const t = now();
      let w = windows.get(key);
      if (!w || w.resetAt <= t) {
        w = { used: 0, resetAt: t + windowMs };
        windows.set(key, w);
      }
      if (w.used >= limit) return false;
      w.used++;
      return true;
    },
  };
}
