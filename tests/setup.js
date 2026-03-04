/**
 * Test setup — mocks browser APIs so extension code can run in Node.js.
 * Must be imported before any extension module.
 */

const fs = require('fs');
const path = require('path');

// ── Load English messages for i18n mock ──────────────────────────────
const messagesPath = path.join(__dirname, '..', 'extension', '_locales', 'en', 'messages.json');
const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf-8'));

// ── In-memory chrome.storage.local ───────────────────────────────────
const storageData = {};

const chromeStorageLocal = {
  get(keys) {
    return new Promise((resolve) => {
      if (typeof keys === 'string') {
        resolve({ [keys]: storageData[keys] });
      } else if (Array.isArray(keys)) {
        const result = {};
        for (const k of keys) result[k] = storageData[k];
        resolve(result);
      } else {
        resolve({ ...storageData });
      }
    });
  },
  set(items) {
    return new Promise((resolve) => {
      Object.assign(storageData, items);
      resolve();
    });
  },
  remove(keys) {
    return new Promise((resolve) => {
      const arr = typeof keys === 'string' ? [keys] : keys;
      for (const k of arr) delete storageData[k];
      resolve();
    });
  },
};

// ── chrome.i18n mock ─────────────────────────────────────────────────
const chromeI18n = {
  getMessage(key, substitutions) {
    const entry = messages[key];
    if (!entry) return '';
    let msg = entry.message;
    if (substitutions) {
      const subs = Array.isArray(substitutions) ? substitutions : [substitutions];
      subs.forEach((sub, i) => {
        msg = msg.replace(new RegExp(`\\$${i + 1}`, 'g'), sub);
        // Also replace named placeholders that reference $N
        if (entry.placeholders) {
          for (const [, ph] of Object.entries(entry.placeholders)) {
            if (ph.content === `$${i + 1}`) {
              const phPattern = `\\$${Object.keys(entry.placeholders).find(
                k => entry.placeholders[k] === ph
              ).toUpperCase()}\\$`;
              msg = msg.replace(new RegExp(phPattern, 'g'), sub);
            }
          }
        }
      });
    }
    return msg;
  },
  getUILanguage() {
    return 'en';
  },
};

// ── chrome.runtime mock ──────────────────────────────────────────────
const chromeRuntime = {
  sendMessage: () => Promise.resolve({}),
  onMessage: { addListener() {} },
  onInstalled: { addListener() {} },
};

// ── chrome.tabs mock ─────────────────────────────────────────────────
const chromeTabs = {
  query: () => Promise.resolve([]),
};

// ── Assemble global chrome object ────────────────────────────────────
globalThis.chrome = {
  storage: { local: chromeStorageLocal },
  i18n: chromeI18n,
  runtime: chromeRuntime,
  tabs: chromeTabs,
};

// ── navigator mock (for i18n fallback) ───────────────────────────────
if (typeof globalThis.navigator === 'undefined') {
  globalThis.navigator = { language: 'en' };
}

// ── Fetch mock ───────────────────────────────────────────────────────
// Each test can override globalThis._fetchMock to control behavior.
globalThis._fetchMock = null;

const originalFetch = globalThis.fetch;
globalThis.fetch = function mockFetch(...args) {
  if (globalThis._fetchMock) {
    return globalThis._fetchMock(...args);
  }
  // Default: return a success with empty JSON
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  });
};

// ── Helper: reset storage between tests ──────────────────────────────
function resetStorage() {
  for (const key of Object.keys(storageData)) {
    delete storageData[key];
  }
}

// ── Helper: load an extension source file into globalThis ────────────
function loadModule(relativePath) {
  const filePath = path.join(__dirname, '..', relativePath);
  const code = fs.readFileSync(filePath, 'utf-8');
  // Wrap in a function to avoid variable conflicts between files
  const wrapped = `(function() { ${code} })();`;
  eval(wrapped);
}

module.exports = { resetStorage, loadModule, messages, storageData };
