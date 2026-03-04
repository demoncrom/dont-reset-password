/**
 * Local cache management using chrome.storage.local.
 * Caches password rules per domain with TTL.
 */

const DRP_Cache = {
  CACHE_KEY: 'drp_rules_cache',
  TTL_MS: 60 * 60 * 1000, // 1 hour
  MAX_ENTRIES: 100,

  /**
   * Get cached rules for a domain.
   * @param {string} domain
   * @returns {Promise<object|null>} The cached rules, or null if expired/missing
   */
  async get(domain) {
    const data = await chrome.storage.local.get(this.CACHE_KEY);
    const cache = data[this.CACHE_KEY] || {};
    const entry = cache[domain];

    if (!entry) return null;
    if (Date.now() - entry.fetched_at > this.TTL_MS) {
      // Expired — clean up
      delete cache[domain];
      await chrome.storage.local.set({ [this.CACHE_KEY]: cache });
      return null;
    }
    return entry.rules;
  },

  /**
   * Store rules for a domain in cache.
   * @param {string} domain
   * @param {object|null} rules - The rules object, or null for "no rules found"
   */
  async set(domain, rules) {
    const data = await chrome.storage.local.get(this.CACHE_KEY);
    const cache = data[this.CACHE_KEY] || {};

    cache[domain] = {
      rules,
      fetched_at: Date.now(),
    };

    // Evict oldest entries if over limit
    const entries = Object.entries(cache);
    if (entries.length > this.MAX_ENTRIES) {
      entries.sort((a, b) => a[1].fetched_at - b[1].fetched_at);
      const toRemove = entries.slice(0, entries.length - this.MAX_ENTRIES);
      for (const [key] of toRemove) {
        delete cache[key];
      }
    }

    await chrome.storage.local.set({ [this.CACHE_KEY]: cache });
  },

  /**
   * Invalidate cache for a specific domain.
   * @param {string} domain
   */
  async invalidate(domain) {
    const data = await chrome.storage.local.get(this.CACHE_KEY);
    const cache = data[this.CACHE_KEY] || {};
    delete cache[domain];
    await chrome.storage.local.set({ [this.CACHE_KEY]: cache });
  },

  /**
   * Clear entire cache.
   */
  async clear() {
    await chrome.storage.local.remove(this.CACHE_KEY);
  },
};

if (typeof globalThis !== 'undefined') {
  globalThis.DRP_Cache = DRP_Cache;
}
