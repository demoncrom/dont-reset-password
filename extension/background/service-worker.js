/**
 * Background service worker.
 * Handles message routing between content scripts / popup and the Supabase API.
 * Manages cache, installation ID, and fingerprint generation.
 */

// Import utilities (service worker scope)
importScripts(
  '../utils/domain.js',
  '../utils/rules-schema.js',
  '../utils/cache.js',
  '../utils/api.js',
  '../utils/i18n.js'
);

// ── Installation ID ──────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    const installationId = crypto.randomUUID();
    await chrome.storage.local.set({ drp_installation_id: installationId });
    console.log('[DRP] Installed, ID:', installationId);
  }
});

/**
 * Get the hashed fingerprint from installation ID.
 */
async function getFingerprint() {
  const data = await chrome.storage.local.get('drp_installation_id');
  let id = data.drp_installation_id;
  if (!id) {
    id = crypto.randomUUID();
    await chrome.storage.local.set({ drp_installation_id: id });
  }
  // SHA-256 hash
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(id));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Message Handler ──────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch((err) => {
    console.error('[DRP] Message handler error:', err);
    sendResponse({ error: err.message });
  });
  return true; // keep the message channel open for async response
});

async function handleMessage(message, sender) {
  switch (message.type) {
    case 'GET_RULES':
      return await handleGetRules(message.domain);

    case 'SUBMIT_RULES':
      return await handleSubmitRules(message.domain, message.rules);

    case 'VOTE':
      return await handleVote(message.ruleId, message.vote, message.domain);

    case 'REPORT':
      return await handleReport(message.ruleId, message.reason, message.details, message.domain);

    case 'GET_DOMAIN':
      // Helper for popup to get current tab's domain
      return await getCurrentTabDomain();

    case 'GET_STATS':
      return await handleGetStats();

    case 'OPEN_POPUP':
      // Can't programmatically open popup, but could set badge
      return { success: true };

    default:
      return { error: 'Unknown message type' };
  }
}

// ── GET_RULES ────────────────────────────────────────────────────────

async function handleGetRules(domain) {
  if (!domain) return { found: false, rules: null, meta: null };

  // Check cache first
  const cached = await DRP_Cache.get(domain);
  if (cached !== null) {
    // cached could be { found: false } or { found: true, rules, meta }
    return cached;
  }

  // Fetch from API
  try {
    const result = await DRP_API.getRules(domain);

    // Cache the result (even "not found" to avoid repeated API calls)
    const cacheEntry = result.found
      ? { found: true, rules: result.rules, meta: result.meta }
      : { found: false, rules: null, meta: null };

    await DRP_Cache.set(domain, cacheEntry);
    return cacheEntry;
  } catch (err) {
    console.warn('[DRP] API fetch failed, returning cache miss:', err.message);
    return { found: false, rules: null, meta: null, error: err.message };
  }
}

// ── SUBMIT_RULES ─────────────────────────────────────────────────────

async function handleSubmitRules(domain, rules) {
  const validation = DRP_Rules.validateRules(rules);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  const fingerprint = await getFingerprint();

  try {
    const result = await DRP_API.submitRules(domain, rules, fingerprint);
    // Invalidate cache so next load picks up the new rules
    await DRP_Cache.invalidate(domain);
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── VOTE ─────────────────────────────────────────────────────────────

async function handleVote(ruleId, vote, domain) {
  if (!ruleId || !['up', 'down'].includes(vote)) {
    return { success: false, error: 'Invalid vote' };
  }

  const fingerprint = await getFingerprint();

  try {
    const result = await DRP_API.vote(ruleId, vote, fingerprint);
    if (domain) await DRP_Cache.invalidate(domain);
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── REPORT ───────────────────────────────────────────────────────────

async function handleReport(ruleId, reason, details, domain) {
  if (!ruleId || !['incorrect', 'spam', 'outdated'].includes(reason)) {
    return { success: false, error: 'Invalid report' };
  }

  const fingerprint = await getFingerprint();

  try {
    const result = await DRP_API.report(ruleId, reason, fingerprint, details);
    if (domain) await DRP_Cache.invalidate(domain);
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── GET CURRENT TAB DOMAIN ───────────────────────────────────────────

async function getCurrentTabDomain() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      const domain = DRP_Domain.getDomainFromUrl(tab.url);
      return { domain, url: tab.url };
    }
  } catch (err) {
    console.warn('[DRP] Could not get tab:', err.message);
  }
  return { domain: '', url: '' };
}

// ── STATS ────────────────────────────────────────────────────────────

async function handleGetStats() {
  try {
    const result = await DRP_API.getStats();
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
