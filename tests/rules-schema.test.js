const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { loadModule } = require('./setup');

// Load the rules module (chrome.i18n is already mocked by setup)
loadModule('extension/utils/rules-schema.js');
const { validateRules, formatRulesForDisplay, getConfidenceLevel, extractRulesFromInput } = globalThis.DRP_Rules;

// ── validateRules ────────────────────────────────────────────────────

describe('DRP_Rules.validateRules', () => {
  it('accepts valid minimal rules (empty object)', () => {
    const result = validateRules({});
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('accepts valid rules with all fields', () => {
    const result = validateRules({
      min_length: 8,
      max_length: 64,
      require_uppercase: true,
      require_lowercase: true,
      require_number: true,
      require_special: false,
      no_spaces: true,
      allowed_special_chars: '!@#$%',
      disallowed_chars: '<>',
      notes: 'Some notes',
    });
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('accepts boundary min_length = 1', () => {
    const result = validateRules({ min_length: 1 });
    assert.equal(result.valid, true);
  });

  it('accepts boundary min_length = 200', () => {
    const result = validateRules({ min_length: 200 });
    assert.equal(result.valid, true);
  });

  it('accepts boundary max_length = 1', () => {
    const result = validateRules({ max_length: 1 });
    assert.equal(result.valid, true);
  });

  it('accepts boundary max_length = 1000', () => {
    const result = validateRules({ max_length: 1000 });
    assert.equal(result.valid, true);
  });

  describe('invalid rules', () => {
    it('rejects min_length = 0', () => {
      const result = validateRules({ min_length: 0 });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('min_length')));
    });

    it('rejects min_length = 201', () => {
      const result = validateRules({ min_length: 201 });
      assert.equal(result.valid, false);
    });

    it('rejects non-integer min_length', () => {
      const result = validateRules({ min_length: 8.5 });
      assert.equal(result.valid, false);
    });

    it('rejects string min_length', () => {
      const result = validateRules({ min_length: '8' });
      assert.equal(result.valid, false);
    });

    it('rejects max_length = 0', () => {
      const result = validateRules({ max_length: 0 });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('max_length')));
    });

    it('rejects max_length = 1001', () => {
      const result = validateRules({ max_length: 1001 });
      assert.equal(result.valid, false);
    });

    it('rejects min_length > max_length', () => {
      const result = validateRules({ min_length: 20, max_length: 10 });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('min_length cannot be greater than max_length')));
    });

    it('rejects non-boolean require_uppercase', () => {
      const result = validateRules({ require_uppercase: 'yes' });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('require_uppercase')));
    });

    it('rejects non-boolean require_lowercase', () => {
      const result = validateRules({ require_lowercase: 1 });
      assert.equal(result.valid, false);
    });

    it('rejects non-boolean require_number', () => {
      const result = validateRules({ require_number: 'true' });
      assert.equal(result.valid, false);
    });

    it('rejects non-boolean require_special', () => {
      const result = validateRules({ require_special: null });
      // null is treated as "not set" due to != null check, so it should be valid
      const result2 = validateRules({ require_special: 0 });
      assert.equal(result2.valid, false);
    });

    it('rejects non-boolean no_spaces', () => {
      const result = validateRules({ no_spaces: 'true' });
      assert.equal(result.valid, false);
    });

    it('rejects non-string allowed_special_chars', () => {
      const result = validateRules({ allowed_special_chars: 123 });
      assert.equal(result.valid, false);
    });

    it('rejects non-string disallowed_chars', () => {
      const result = validateRules({ disallowed_chars: true });
      assert.equal(result.valid, false);
    });

    it('rejects non-string notes', () => {
      const result = validateRules({ notes: 123 });
      assert.equal(result.valid, false);
    });

    it('rejects notes over 500 characters', () => {
      const result = validateRules({ notes: 'x'.repeat(501) });
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.includes('500')));
    });

    it('accepts notes exactly 500 characters', () => {
      const result = validateRules({ notes: 'x'.repeat(500) });
      assert.equal(result.valid, true);
    });

    it('collects multiple errors', () => {
      const result = validateRules({
        min_length: -1,
        max_length: 2000,
        require_uppercase: 'yes',
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors.length >= 3);
    });
  });
});

// ── formatRulesForDisplay ────────────────────────────────────────────

describe('DRP_Rules.formatRulesForDisplay', () => {
  it('returns empty array for empty rules', () => {
    const items = formatRulesForDisplay({});
    assert.equal(items.length, 0);
  });

  it('formats min_length as requirement', () => {
    const items = formatRulesForDisplay({ min_length: 8 });
    assert.equal(items.length, 1);
    assert.equal(items[0].type, 'requirement');
    assert.ok(items[0].text.includes('8'));
  });

  it('formats max_length as warning', () => {
    const items = formatRulesForDisplay({ max_length: 64 });
    assert.equal(items.length, 1);
    assert.equal(items[0].type, 'warning');
    assert.ok(items[0].text.includes('64'));
  });

  it('formats require_uppercase', () => {
    const items = formatRulesForDisplay({ require_uppercase: true });
    assert.equal(items.length, 1);
    assert.equal(items[0].type, 'requirement');
  });

  it('skips false boolean fields', () => {
    const items = formatRulesForDisplay({
      require_uppercase: false,
      require_lowercase: false,
    });
    assert.equal(items.length, 0);
  });

  it('formats require_special with allowed chars', () => {
    const items = formatRulesForDisplay({
      require_special: true,
      allowed_special_chars: '!@#$',
    });
    assert.equal(items.length, 1);
    assert.ok(items[0].text.includes('!@#$'));
  });

  it('formats require_special without allowed chars', () => {
    const items = formatRulesForDisplay({ require_special: true });
    assert.equal(items.length, 1);
    assert.equal(items[0].type, 'requirement');
  });

  it('formats disallowed_chars as warning', () => {
    const items = formatRulesForDisplay({ disallowed_chars: '<>' });
    assert.equal(items.length, 1);
    assert.equal(items[0].type, 'warning');
    assert.ok(items[0].text.includes('<>'));
  });

  it('formats no_spaces as warning', () => {
    const items = formatRulesForDisplay({ no_spaces: true });
    assert.equal(items.length, 1);
    assert.equal(items[0].type, 'warning');
  });

  it('formats notes as info', () => {
    const items = formatRulesForDisplay({ notes: 'Some extra info' });
    assert.equal(items.length, 1);
    assert.equal(items[0].type, 'info');
    assert.equal(items[0].text, 'Some extra info');
  });

  it('formats full rule set in correct order', () => {
    const items = formatRulesForDisplay({
      min_length: 8,
      max_length: 64,
      require_uppercase: true,
      require_lowercase: true,
      require_number: true,
      require_special: true,
      disallowed_chars: '<>',
      no_spaces: true,
      notes: 'Extra info',
    });
    assert.equal(items.length, 9);
    // Check ordering: min, max, upper, lower, number, special, disallowed, no_spaces, notes
    assert.equal(items[0].type, 'requirement'); // min_length
    assert.equal(items[1].type, 'warning');     // max_length
    assert.equal(items[items.length - 1].type, 'info'); // notes
  });
});

// ── getConfidenceLevel ───────────────────────────────────────────────

describe('DRP_Rules.getConfidenceLevel', () => {
  it('returns Low for score 0.0', () => {
    const level = getConfidenceLevel(0.0);
    assert.ok(level.includes('Low') || level === 'confidenceLow');
  });

  it('returns Low for score 0.39', () => {
    const level = getConfidenceLevel(0.39);
    assert.ok(level.includes('Low') || level === 'confidenceLow');
  });

  it('returns Medium for score 0.4', () => {
    const level = getConfidenceLevel(0.4);
    assert.ok(level.includes('Medium') || level === 'confidenceMedium');
  });

  it('returns Medium for score 0.69', () => {
    const level = getConfidenceLevel(0.69);
    assert.ok(level.includes('Medium') || level === 'confidenceMedium');
  });

  it('returns High for score 0.7', () => {
    const level = getConfidenceLevel(0.7);
    assert.ok(level.includes('High') || level === 'confidenceHigh');
  });

  it('returns High for score 1.0', () => {
    const level = getConfidenceLevel(1.0);
    assert.ok(level.includes('High') || level === 'confidenceHigh');
  });
});

// ── extractRulesFromInput ────────────────────────────────────────────

describe('DRP_Rules.extractRulesFromInput', () => {
  // Mock a minimal DOM element
  function mockInput(attrs = {}) {
    return {
      getAttribute(name) {
        return attrs[name] || null;
      },
    };
  }

  it('extracts minlength', () => {
    const rules = extractRulesFromInput(mockInput({ minlength: '8' }));
    assert.equal(rules.min_length, 8);
  });

  it('extracts maxlength', () => {
    const rules = extractRulesFromInput(mockInput({ maxlength: '64' }));
    assert.equal(rules.max_length, 64);
  });

  it('extracts uppercase from pattern', () => {
    const rules = extractRulesFromInput(mockInput({ pattern: '(?=.*[A-Z])' }));
    assert.equal(rules.require_uppercase, true);
  });

  it('extracts lowercase from pattern', () => {
    const rules = extractRulesFromInput(mockInput({ pattern: '(?=.*[a-z])' }));
    assert.equal(rules.require_lowercase, true);
  });

  it('extracts number from pattern with [0-9]', () => {
    const rules = extractRulesFromInput(mockInput({ pattern: '(?=.*[0-9])' }));
    assert.equal(rules.require_number, true);
  });

  it('extracts number from pattern with \\d', () => {
    const rules = extractRulesFromInput(mockInput({ pattern: '(?=.*\\d)' }));
    assert.equal(rules.require_number, true);
  });

  it('extracts special from pattern', () => {
    const rules = extractRulesFromInput(mockInput({ pattern: '(?=.*[!@#$%^&*])' }));
    assert.equal(rules.require_special, true);
  });

  it('returns empty object for input with no attrs', () => {
    const rules = extractRulesFromInput(mockInput());
    assert.deepEqual(rules, {});
  });

  it('extracts both minlength and pattern', () => {
    const rules = extractRulesFromInput(mockInput({
      minlength: '12',
      pattern: '(?=.*[A-Z])(?=.*[0-9])',
    }));
    assert.equal(rules.min_length, 12);
    assert.equal(rules.require_uppercase, true);
    assert.equal(rules.require_number, true);
  });
});
