/**
 * Small in-process TTL cache with LRU-style eviction.
 * No external dependency, which keeps the backend stateless and simple.
 */

export interface CacheEntry<V> {
  value: V;
  expiresAt: number;
  /** monotonically increasing access counter, used for eviction */
  touched: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
}

export class TtlCache<V> {
  private store = new Map<string, CacheEntry<V>>();
  private clock = 0;
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 1000,
  ) {}

  get(key: string): V | undefined {
    const hit = this.store.get(key);
    if (!hit) {
      this.misses++;
      return undefined;
    }
    if (hit.expiresAt < Date.now()) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }
    hit.touched = ++this.clock;
    this.hits++;
    return hit.value;
  }

  set(key: string, value: V): void {
    // make room if we're at capacity
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      this.evictColdest();
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs, touched: ++this.clock });
  }

  /** Cache the result of an async producer, with in-flight de-duplication. */
  async wrap(key: string, producer: () => Promise<V>): Promise<{ value: V; cached: boolean }> {
    const hit = this.get(key);
    if (hit !== undefined) return { value: hit, cached: true };

    // join an already-running request for the same key
    const existing = TtlCache.inflight.get(key) as Promise<V> | undefined;
    if (existing) return { value: await existing, cached: true };

    const p = producer()
      .then((value) => {
        this.set(key, value);
        TtlCache.inflight.delete(key);
        return value;
      })
      .catch((err) => {
        TtlCache.inflight.delete(key);
        throw err;
      });

    TtlCache.inflight.set(key, p as Promise<unknown>);
    return { value: await p, cached: false };
  }

  private evictColdest(): void {
    let coldestKey: string | null = null;
    let coldest = Infinity;
    for (const [k, v] of this.store) {
      if (v.touched < coldest) {
        coldest = v.touched;
        coldestKey = k;
      }
    }
    if (coldestKey) {
      this.store.delete(coldestKey);
      this.evictions++;
    }
  }

  stats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate: total === 0 ? 0 : Math.round((this.hits / total) * 1000) / 10,
    };
  }

  /** Shared map of in-flight promises across all cache instances. */
  private static inflight = new Map<string, Promise<unknown>>();

  static get inflightCount(): number {
    return TtlCache.inflight.size;
  }
}
