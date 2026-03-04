/**
 * Supabase API client for the extension.
 * Communicates with Supabase Edge Functions and direct table queries.
 */

const DRP_API = {
  SUPABASE_URL: 'https://wmzwakjkiktldydlbvnt.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_pus5nNz8_P1bbUstDUFldw_YwYZnWTl',
  TIMEOUT_MS: 5000,

  /**
   * Make a request to a Supabase Edge Function.
   */
  async callFunction(functionName, body) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const response = await fetch(
        `${this.SUPABASE_URL}/functions/v1/${functionName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`,
            'apikey': this.SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API error ${response.status}: ${error}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  },

  /**
   * Query the Supabase REST API directly (for read-only RLS-allowed queries).
   */
  async query(table, params = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    const url = new URL(`${this.SUPABASE_URL}/rest/v1/${table}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'apikey': this.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Query error ${response.status}: ${error}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  },

  /**
   * Fetch password rules for a domain.
   * @param {string} domain
   * @returns {Promise<{found: boolean, rules: object|null, meta: object|null}>}
   */
  async getRules(domain) {
    const result = await this.callFunction('get-rules', { domain });
    return result;
  },

  /**
   * Submit a new rule contribution.
   * @param {string} domain
   * @param {object} rules
   * @param {string} fingerprint
   */
  async submitRules(domain, rules, fingerprint) {
    return await this.callFunction('submit-rules', { domain, rules, fingerprint });
  },

  /**
   * Vote on a rule.
   * @param {string} ruleId
   * @param {'up'|'down'} vote
   * @param {string} fingerprint
   */
  async vote(ruleId, vote, fingerprint) {
    return await this.callFunction('vote', { rule_id: ruleId, vote, fingerprint });
  },

  /**
   * Report a rule as incorrect/spam/outdated.
   * @param {string} ruleId
   * @param {'incorrect'|'spam'|'outdated'} reason
   * @param {string} fingerprint
   * @param {string} [details]
   */
  async report(ruleId, reason, fingerprint, details) {
    return await this.callFunction('report', { rule_id: ruleId, reason, fingerprint, details });
  },

  /**
   * Get overall statistics.
   * @returns {Promise<{total_domains: number, total_contributors: number}>}
   */
  async getStats() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);
    const headers = {
      'apikey': this.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${this.SUPABASE_ANON_KEY}`,
      'Prefer': 'count=exact',
    };

    try {
      const [domainsRes, contributorsRes] = await Promise.all([
        fetch(`${this.SUPABASE_URL}/rest/v1/domains?select=*`, {
          method: 'HEAD',
          headers,
          signal: controller.signal,
        }),
        fetch(`${this.SUPABASE_URL}/rest/v1/rule_contributions?select=fingerprint`, {
          method: 'HEAD',
          headers: { ...headers, 'Prefer': 'count=exact' },
          signal: controller.signal,
        }),
      ]);

      const parseCount = (res) => {
        const range = res.headers.get('content-range');
        if (range) {
          // Format: "0-N/total" or "*/total"
          const match = range.match(/\/(\d+)/);
          if (match) return parseInt(match[1], 10);
        }
        return 0;
      };

      return {
        total_domains: parseCount(domainsRes),
        total_contributors: parseCount(contributorsRes),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  },
};

if (typeof globalThis !== 'undefined') {
  globalThis.DRP_API = DRP_API;
}
