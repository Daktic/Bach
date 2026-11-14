import "server-only";

// Small in-memory cache for paid third-party API calls (cost requirement in
// the PRD: cache lookups and searches instead of calling on every render).
// Best effort: each server instance has its own cache and it empties on
// restart, which is fine for a ~10-person guest list.

interface Entry<V> {
  value: V;
  expiresAt: number;
}

export interface TtlCache<V> {
  get(key: string): V | undefined;
  set(key: string, value: V, ttlMs: number): void;
}

export function createTtlCache<V>(maxEntries = 200): TtlCache<V> {
  const entries = new Map<string, Entry<V>>();
  return {
    get(key) {
      const hit = entries.get(key);
      if (!hit) return undefined;
      if (hit.expiresAt <= Date.now()) {
        entries.delete(key);
        return undefined;
      }
      return hit.value;
    },
    set(key, value, ttlMs) {
      entries.delete(key);
      entries.set(key, { value, expiresAt: Date.now() + ttlMs });
      // Map keeps insertion order: drop the oldest entries past the cap.
      while (entries.size > maxEntries) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        entries.delete(oldest);
      }
    },
  };
}
