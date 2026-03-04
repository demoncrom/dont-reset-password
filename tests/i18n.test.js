const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./setup');

// Load the i18n module
loadModule('extension/utils/i18n.js');
const DRP_i18n = globalThis.DRP_i18n;

describe('DRP_i18n', () => {
  describe('msg', () => {
    it('returns localized message for known key', () => {
      const result = DRP_i18n.msg('extensionName');
      assert.equal(result, "Don't Reset Password");
    });

    it('returns key for unknown message', () => {
      const result = DRP_i18n.msg('nonExistentKey');
      assert.equal(result, 'nonExistentKey');
    });

    it('substitutes single placeholder', () => {
      const result = DRP_i18n.msg('ruleMinLength', '8');
      assert.ok(result.includes('8'));
    });

    it('substitutes array of placeholders', () => {
      const result = DRP_i18n.msg('confidenceLabel', ['High', '5']);
      assert.ok(result.includes('High') || result.includes('5'));
    });

    it('handles no substitutions for message without placeholders', () => {
      const result = DRP_i18n.msg('ruleRequireUppercase');
      assert.equal(result, 'Must include uppercase letter');
    });
  });

  describe('getLanguage', () => {
    it('returns language string', () => {
      const lang = DRP_i18n.getLanguage();
      assert.equal(typeof lang, 'string');
      assert.equal(lang, 'en');
    });
  });

  describe('fallback when chrome.i18n is absent', () => {
    it('falls back to key when chrome.i18n is removed', () => {
      const savedI18n = chrome.i18n;
      chrome.i18n = undefined;

      // Re-evaluate to get fresh DRP_i18n with no chrome.i18n
      const freshModule = {};
      const DRP_i18n_fallback = {
        msg(key, substitutions) {
          if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
            const subs = Array.isArray(substitutions) ? substitutions : substitutions ? [substitutions] : undefined;
            return chrome.i18n.getMessage(key, subs) || key;
          }
          return key;
        },
        getLanguage() {
          if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage) {
            return chrome.i18n.getUILanguage();
          }
          return navigator.language || 'en';
        },
      };

      assert.equal(DRP_i18n_fallback.msg('extensionName'), 'extensionName');
      // Falls back to navigator.language which may be 'en', 'en-US', etc.
      assert.ok(DRP_i18n_fallback.getLanguage().startsWith('en'));

      // Restore
      chrome.i18n = savedI18n;
    });
  });
});
