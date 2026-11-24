interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  insertedAt: number;
}

export interface CacheOptions {
  maxEntries?: number;
  now?: () => number;
}

/**
 * A size-bounded LRU with per-entry TTL. It never stores errors; callers
 * decide explicitly when a partial result is safe to cache for a short time.
 */
export class LruTtlCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();
  private readonly maxEntries: number;
  private readonly now: () => number;

  constructor(options: CacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? 250;
    this.now = options.now ?? Date.now;
  }

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    // Refresh LRU order.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    if (ttlMs <= 0) return;
    if (this.entries.has(key)) this.entries.delete(key);
    this.entries.set(key, {
      value,
      expiresAt: this.now() + ttlMs,
      insertedAt: this.now(),
    });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next();
      if (oldest.done) break;
      this.entries.delete(oldest.value);
    }
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}

export const CACHE_TTL = {
  search: 10 * 60 * 1000,
  metadata: 24 * 60 * 60 * 1000,
  neighborhood: 24 * 60 * 60 * 1000,
  partial: 30 * 1000,
} as const;

export function buildCacheKey(
  provider: string,
  endpoint: string,
  params: Record<string, string | number | boolean | null | undefined>,
  fields: readonly string[],
  schemaVersion: number,
  extra?: Record<string, string | number | null | undefined>,
): string {
  const orderedParams = Object.keys(params)
    .sort()
    .map((key) => [key, params[key] ?? null]);
  const orderedExtra = extra
    ? Object.keys(extra)
        .sort()
        .map((key) => [key, extra[key] ?? null])
    : [];
  return JSON.stringify({
    provider,
    endpoint,
    params: orderedParams,
    fields: [...fields].sort(),
    schemaVersion,
    extra: orderedExtra,
  });
}

type GlobalWithCache = typeof globalThis & {
  __paperOrbitCaches?: Map<string, LruTtlCache<unknown>>;
};

function caches(): Map<string, LruTtlCache<unknown>> {
  const globalStore = globalThis as GlobalWithCache;
  if (!globalStore.__paperOrbitCaches) {
    globalStore.__paperOrbitCaches = new Map();
  }
  return globalStore.__paperOrbitCaches;
}

export function getCache<T>(name: string): LruTtlCache<T> {
  const store = caches();
  let cache = store.get(name);
  if (!cache) {
    cache = new LruTtlCache<unknown>({ maxEntries: 250 });
    store.set(name, cache);
  }
  return cache as LruTtlCache<T>;
}

export function resetCachesForTests() {
  for (const cache of caches().values()) cache.clear();
}
