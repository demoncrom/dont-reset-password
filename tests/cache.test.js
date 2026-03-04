const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule, resetStorage } = require('./setup');

// Load the cache module
loadModule('extension/utils/cache.js');
const DRP_Cache = globalThis.DRP_Cache;

describe('DRP_Cache', () => {
  beforeEach(() => {
    resetStorage();
  });

  describe('get/set basic operations', () => {
    it('returns null for uncached domain', async () => {
      const result = await DRP_Cache.get('example.com');
      assert.equal(result, null);
    });

    it('stores and retrieves rules', async () => {
      const rules = { min_length: 8, require_uppercase: true };
      await DRP_Cache.set('example.com', rules);
      const result = await DRP_Cache.get('example.com');
      assert.deepEqual(result, rules);
    });

    it('stores null rules (no rules found)', async () => {
      await DRP_Cache.set('example.com', null);
      const result = await DRP_Cache.get('example.com');
      assert.equal(result, null);
      // But the entry should exist — set then get of null means the domain
      // was cached as "no rules". However the get() checks entry existence
      // and returns entry.rules which is null, so it's indistinguishable.
      // This is expected behavior.
    });

    it('stores rules for multiple domains', async () => {
      await DRP_Cache.set('google.com', { min_length: 8 });
      await DRP_Cache.set('github.com', { min_length: 12 });
      assert.deepEqual(await DRP_Cache.get('google.com'), { min_length: 8 });
      assert.deepEqual(await DRP_Cache.get('github.com'), { min_length: 12 });
    });

    it('overwrites existing entry for same domain', async () => {
      await DRP_Cache.set('example.com', { min_length: 6 });
      await DRP_Cache.set('example.com', { min_length: 10 });
      const result = await DRP_Cache.get('example.com');
      assert.deepEqual(result, { min_length: 10 });
    });
  });

  describe('TTL expiry', () => {
    it('returns null for expired entry', async () => {
      // Store entry with a past timestamp by manipulating Date.now
      const realDateNow = Date.now;
      const pastTime = realDateNow() - DRP_Cache.TTL_MS - 1000;

      // Set the entry with a past timestamp
      Date.now = () => pastTime;
      await DRP_Cache.set('example.com', { min_length: 8 });

      // Restore Date.now — now it's "after TTL"
      Date.now = realDateNow;

      const result = await DRP_Cache.get('example.com');
      assert.equal(result, null);
    });

    it('returns entry if within TTL', async () => {
      const realDateNow = Date.now;
      const recentTime = realDateNow() - (DRP_Cache.TTL_MS / 2);

      Date.now = () => recentTime;
      await DRP_Cache.set('example.com', { min_length: 8 });

      Date.now = realDateNow;

      const result = await DRP_Cache.get('example.com');
      assert.deepEqual(result, { min_length: 8 });
    });
  });

  describe('LRU eviction', () => {
    it('evicts oldest entries when exceeding MAX_ENTRIES', async () => {
      const realDateNow = Date.now;
      // Use a base time that's recent enough to not expire under TTL
      const baseTime = realDateNow();

      // Insert MAX_ENTRIES + 5 entries with incrementing timestamps
      for (let i = 0; i < DRP_Cache.MAX_ENTRIES + 5; i++) {
        Date.now = () => baseTime + i;
        await DRP_Cache.set(`domain${i}.com`, { id: i });
      }

      // Restore Date.now (still within TTL since baseTime is recent)
      Date.now = realDateNow;

      // The first 5 entries should have been evicted
      for (let i = 0; i < 5; i++) {
        const result = await DRP_Cache.get(`domain${i}.com`);
        assert.equal(result, null, `domain${i}.com should have been evicted`);
      }

      // The remaining entries should still exist
      const result = await DRP_Cache.get(`domain5.com`);
      assert.deepEqual(result, { id: 5 });

      const lastResult = await DRP_Cache.get(`domain${DRP_Cache.MAX_ENTRIES + 4}.com`);
      assert.deepEqual(lastResult, { id: DRP_Cache.MAX_ENTRIES + 4 });
    });

    it('keeps exactly MAX_ENTRIES after eviction', async () => {
      const realDateNow = Date.now;
      const baseTime = realDateNow();

      for (let i = 0; i < DRP_Cache.MAX_ENTRIES + 10; i++) {
        Date.now = () => baseTime + i;
        await DRP_Cache.set(`d${i}.com`, { id: i });
      }

      Date.now = realDateNow;

      // Read cache directly from storage to check size
      const data = await chrome.storage.local.get(DRP_Cache.CACHE_KEY);
      const cache = data[DRP_Cache.CACHE_KEY];
      assert.equal(Object.keys(cache).length, DRP_Cache.MAX_ENTRIES);
    });
  });

  describe('invalidate', () => {
    it('removes specific domain from cache', async () => {
      await DRP_Cache.set('google.com', { min_length: 8 });
      await DRP_Cache.set('github.com', { min_length: 12 });

      await DRP_Cache.invalidate('google.com');

      assert.equal(await DRP_Cache.get('google.com'), null);
      assert.deepEqual(await DRP_Cache.get('github.com'), { min_length: 12 });
    });

    it('does nothing when invalidating non-existent domain', async () => {
      await DRP_Cache.set('google.com', { min_length: 8 });
      await DRP_Cache.invalidate('nonexistent.com');
      assert.deepEqual(await DRP_Cache.get('google.com'), { min_length: 8 });
    });
  });

  describe('clear', () => {
    it('removes all cached entries', async () => {
      await DRP_Cache.set('google.com', { min_length: 8 });
      await DRP_Cache.set('github.com', { min_length: 12 });

      await DRP_Cache.clear();

      assert.equal(await DRP_Cache.get('google.com'), null);
      assert.equal(await DRP_Cache.get('github.com'), null);
    });

    it('clear on empty cache does not error', async () => {
      await DRP_Cache.clear();
      // Should not throw
    });
  });
});
