// A minimal in-memory TTL cache. No extra dependency needed for this scale
// of app — if you outgrow a single process (multiple server instances
// behind a load balancer), swap this for Redis using the same
// getOrSet(key, ttlMs, fetcher) interface so callers don't need to change.

class TTLCache {
  constructor() {
    this.store = new Map(); // key -> { value, expiresAt }
    this.inFlight = new Map(); // key -> Promise (de-dupes concurrent misses)
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value, ttlMs) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /**
   * Returns the cached value if fresh. On a miss, ensures only ONE call to
   * `fetcher` runs even if getOrSet() is called many times concurrently for
   * the same key (e.g. 50 users loading the market page at the same
   * millisecond) — everyone else just awaits the same in-flight promise.
   */
  async getOrSet(key, ttlMs, fetcher) {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    if (this.inFlight.has(key)) {
      return this.inFlight.get(key);
    }

    const promise = (async () => {
      try {
        const value = await fetcher();
        if (value !== null && value !== undefined) {
          this.set(key, value, ttlMs);
        }
        return value;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

module.exports = new TTLCache();
