/**
 * Domain extraction utility.
 * Extracts the effective top-level domain + 1 (eTLD+1) from a URL.
 * e.g., "login.accounts.google.com" -> "google.com"
 *       "www.bbc.co.uk" -> "bbc.co.uk"
 */

// Multi-level TLDs that require an extra segment
const MULTI_LEVEL_TLDS = new Set([
  'co.uk', 'co.jp', 'co.kr', 'co.nz', 'co.za', 'co.in', 'co.id', 'co.th',
  'com.au', 'com.br', 'com.cn', 'com.hk', 'com.tw', 'com.sg', 'com.my',
  'com.mx', 'com.ar', 'com.co', 'com.tr', 'com.ua', 'com.vn', 'com.pk',
  'com.ng', 'com.eg', 'com.sa', 'com.ph', 'com.bd',
  'org.uk', 'org.au', 'org.cn', 'org.hk', 'org.tw', 'org.nz',
  'net.au', 'net.cn', 'net.uk', 'net.nz',
  'ac.uk', 'ac.jp', 'ac.kr', 'ac.cn', 'ac.nz',
  'edu.au', 'edu.cn', 'edu.hk', 'edu.tw',
  'gov.uk', 'gov.au', 'gov.cn', 'gov.in',
  'ne.jp', 'or.jp', 'go.jp',
]);

/**
 * Extract eTLD+1 from a hostname.
 * @param {string} hostname - e.g., "login.accounts.google.com"
 * @returns {string} - e.g., "google.com"
 */
function extractDomain(hostname) {
  if (!hostname) return '';

  // Remove port if present
  hostname = hostname.split(':')[0].toLowerCase().trim();

  // Skip IP addresses
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return hostname;
  // Skip localhost
  if (hostname === 'localhost') return hostname;

  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;

  // Check for multi-level TLD
  const lastTwo = parts.slice(-2).join('.');
  if (MULTI_LEVEL_TLDS.has(lastTwo)) {
    // Need 3 segments: e.g., bbc.co.uk
    return parts.slice(-3).join('.');
  }

  // Default: last 2 segments
  return parts.slice(-2).join('.');
}

/**
 * Extract domain from the current page URL.
 * @param {string} [url] - Optional URL string. Uses window.location if omitted.
 * @returns {string} The eTLD+1 domain.
 */
function getDomainFromUrl(url) {
  try {
    const urlObj = url ? new URL(url) : window.location;
    return extractDomain(urlObj.hostname);
  } catch {
    return '';
  }
}

// Export for use in other scripts and for testing
if (typeof globalThis !== 'undefined') {
  globalThis.DRP_Domain = { extractDomain, getDomainFromUrl };
}
