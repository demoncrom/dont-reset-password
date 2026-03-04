const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./setup');

// Load the API module
loadModule('extension/utils/api.js');
const DRP_API = globalThis.DRP_API;

describe('DRP_API', () => {
  let fetchCalls;

  beforeEach(() => {
    fetchCalls = [];
    globalThis._fetchMock = async (url, options) => {
      fetchCalls.push({ url: url.toString(), options });
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
        text: async () => 'OK',
      };
    };
  });

  afterEach(() => {
    globalThis._fetchMock = null;
  });

  describe('callFunction', () => {
    it('constructs correct URL', async () => {
      await DRP_API.callFunction('get-rules', { domain: 'example.com' });
      assert.equal(fetchCalls.length, 1);
      assert.ok(fetchCalls[0].url.includes('/functions/v1/get-rules'));
    });

    it('includes correct headers', async () => {
      await DRP_API.callFunction('test-func', {});
      const headers = fetchCalls[0].options.headers;
      assert.equal(headers['Content-Type'], 'application/json');
      assert.ok(headers['Authorization'].startsWith('Bearer '));
      assert.equal(headers['apikey'], DRP_API.SUPABASE_ANON_KEY);
    });

    it('sends POST with JSON body', async () => {
      const body = { domain: 'test.com', rules: { min_length: 8 } };
      await DRP_API.callFunction('submit-rules', body);
      assert.equal(fetchCalls[0].options.method, 'POST');
      assert.equal(fetchCalls[0].options.body, JSON.stringify(body));
    });

    it('passes AbortController signal', async () => {
      await DRP_API.callFunction('test', {});
      assert.ok(fetchCalls[0].options.signal instanceof AbortSignal);
    });

    it('handles HTTP errors', async () => {
      globalThis._fetchMock = async () => ({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
        json: async () => ({}),
      });

      await assert.rejects(
        () => DRP_API.callFunction('fail', {}),
        (err) => {
          assert.ok(err.message.includes('500'));
          assert.ok(err.message.includes('Internal Server Error'));
          return true;
        }
      );
    });

    it('handles 404 errors', async () => {
      globalThis._fetchMock = async () => ({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
        json: async () => ({}),
      });

      await assert.rejects(
        () => DRP_API.callFunction('missing', {}),
        (err) => {
          assert.ok(err.message.includes('404'));
          return true;
        }
      );
    });

    it('handles abort/timeout', async () => {
      globalThis._fetchMock = async (url, options) => {
        // Simulate the signal already being aborted
        if (options.signal.aborted) {
          throw new DOMException('The operation was aborted', 'AbortError');
        }
        // Actually abort it to simulate timeout
        throw new DOMException('The operation was aborted', 'AbortError');
      };

      await assert.rejects(
        () => DRP_API.callFunction('slow', {}),
        (err) => {
          assert.ok(err.name === 'AbortError' || err.message.includes('abort'));
          return true;
        }
      );
    });
  });

  describe('query', () => {
    it('constructs correct REST URL', async () => {
      await DRP_API.query('domains', { select: 'count' });
      assert.equal(fetchCalls.length, 1);
      assert.ok(fetchCalls[0].url.includes('/rest/v1/domains'));
      assert.ok(fetchCalls[0].url.includes('select=count'));
    });

    it('uses GET method', async () => {
      await DRP_API.query('domains');
      assert.equal(fetchCalls[0].options.method, 'GET');
    });

    it('includes auth headers', async () => {
      await DRP_API.query('domains');
      const headers = fetchCalls[0].options.headers;
      assert.equal(headers['apikey'], DRP_API.SUPABASE_ANON_KEY);
      assert.ok(headers['Authorization'].startsWith('Bearer '));
    });

    it('handles query errors', async () => {
      globalThis._fetchMock = async () => ({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
        json: async () => ({}),
      });

      await assert.rejects(
        () => DRP_API.query('secret_table'),
        (err) => {
          assert.ok(err.message.includes('403'));
          return true;
        }
      );
    });
  });

  describe('getRules', () => {
    it('calls get-rules function with domain', async () => {
      await DRP_API.getRules('example.com');
      assert.equal(fetchCalls.length, 1);
      assert.ok(fetchCalls[0].url.includes('get-rules'));
      const body = JSON.parse(fetchCalls[0].options.body);
      assert.equal(body.domain, 'example.com');
    });
  });

  describe('submitRules', () => {
    it('calls submit-rules with domain, rules, and fingerprint', async () => {
      const rules = { min_length: 8 };
      await DRP_API.submitRules('test.com', rules, 'fp123');
      assert.equal(fetchCalls.length, 1);
      assert.ok(fetchCalls[0].url.includes('submit-rules'));
      const body = JSON.parse(fetchCalls[0].options.body);
      assert.equal(body.domain, 'test.com');
      assert.deepEqual(body.rules, rules);
      assert.equal(body.fingerprint, 'fp123');
    });
  });

  describe('vote', () => {
    it('calls vote with rule_id, vote, and fingerprint', async () => {
      await DRP_API.vote('rule-uuid', 'up', 'fp456');
      assert.ok(fetchCalls[0].url.includes('/functions/v1/vote'));
      const body = JSON.parse(fetchCalls[0].options.body);
      assert.equal(body.rule_id, 'rule-uuid');
      assert.equal(body.vote, 'up');
      assert.equal(body.fingerprint, 'fp456');
    });
  });

  describe('report', () => {
    it('calls report with all params', async () => {
      await DRP_API.report('rule-uuid', 'incorrect', 'fp789', 'Wrong rules');
      assert.ok(fetchCalls[0].url.includes('/functions/v1/report'));
      const body = JSON.parse(fetchCalls[0].options.body);
      assert.equal(body.rule_id, 'rule-uuid');
      assert.equal(body.reason, 'incorrect');
      assert.equal(body.fingerprint, 'fp789');
      assert.equal(body.details, 'Wrong rules');
    });

    it('calls report without details', async () => {
      await DRP_API.report('rule-uuid', 'spam', 'fp789');
      const body = JSON.parse(fetchCalls[0].options.body);
      assert.equal(body.details, undefined);
    });
  });

  describe('getStats', () => {
    it('queries domains and contributions tables', async () => {
      globalThis._fetchMock = async (url, options) => {
        fetchCalls.push({ url: url.toString(), options });
        const headers = new Map();
        if (url.toString().includes('/domains')) {
          headers.set('content-range', '0-41/42');
        } else {
          headers.set('content-range', '0-99/100');
        }
        return {
          ok: true,
          status: 200,
          headers: { get: (key) => headers.get(key) },
          json: async () => ([]),
          text: async () => '',
        };
      };

      const result = await DRP_API.getStats();
      assert.equal(result.total_domains, 42);
      assert.equal(result.total_contributors, 100);
      // Should have made 2 fetch calls (domains + contributions)
      assert.equal(fetchCalls.length, 2);
      assert.ok(fetchCalls.some(c => c.url.includes('/rest/v1/domains')));
      assert.ok(fetchCalls.some(c => c.url.includes('/rest/v1/rule_contributions')));
    });

    it('uses HEAD method with Prefer: count=exact header', async () => {
      globalThis._fetchMock = async (url, options) => {
        fetchCalls.push({ url: url.toString(), options });
        return {
          ok: true,
          status: 200,
          headers: { get: () => '*/0' },
          json: async () => ([]),
          text: async () => '',
        };
      };

      await DRP_API.getStats();
      for (const call of fetchCalls) {
        assert.equal(call.options.method, 'HEAD');
      }
    });

    it('returns 0 when content-range header is missing', async () => {
      globalThis._fetchMock = async (url, options) => {
        fetchCalls.push({ url: url.toString(), options });
        return {
          ok: true,
          status: 200,
          headers: { get: () => null },
          json: async () => ([]),
          text: async () => '',
        };
      };

      const result = await DRP_API.getStats();
      assert.equal(result.total_domains, 0);
      assert.equal(result.total_contributors, 0);
    });
  });
});
