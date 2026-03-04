/**
 * Password rules data structure, validation, and display formatting.
 */

/**
 * Validate a rules object. Returns { valid: boolean, errors: string[] }.
 */
function validateRules(rules) {
  const errors = [];

  if (rules.min_length != null) {
    if (!Number.isInteger(rules.min_length) || rules.min_length < 1 || rules.min_length > 200) {
      errors.push('min_length must be an integer between 1 and 200');
    }
  }
  if (rules.max_length != null) {
    if (!Number.isInteger(rules.max_length) || rules.max_length < 1 || rules.max_length > 1000) {
      errors.push('max_length must be an integer between 1 and 1000');
    }
  }
  if (rules.min_length != null && rules.max_length != null) {
    if (rules.min_length > rules.max_length) {
      errors.push('min_length cannot be greater than max_length');
    }
  }

  const booleanFields = [
    'require_uppercase', 'require_lowercase', 'require_number',
    'require_special', 'no_spaces'
  ];
  for (const field of booleanFields) {
    if (rules[field] != null && typeof rules[field] !== 'boolean') {
      errors.push(`${field} must be a boolean`);
    }
  }

  if (rules.allowed_special_chars != null && typeof rules.allowed_special_chars !== 'string') {
    errors.push('allowed_special_chars must be a string');
  }
  if (rules.disallowed_chars != null && typeof rules.disallowed_chars !== 'string') {
    errors.push('disallowed_chars must be a string');
  }
  if (rules.notes != null) {
    if (typeof rules.notes !== 'string') {
      errors.push('notes must be a string');
    } else if (rules.notes.length > 500) {
      errors.push('notes must be 500 characters or fewer');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Format rules into an array of display items.
 * Each item: { text: string, type: 'requirement' | 'warning' | 'info' }
 */
function formatRulesForDisplay(rules) {
  const items = [];
  const msg = typeof chrome !== 'undefined' && chrome.i18n
    ? (key, ...subs) => chrome.i18n.getMessage(key, subs) || key
    : (key, ...subs) => key; // fallback for non-extension context

  if (rules.min_length != null) {
    items.push({ text: msg('ruleMinLength', String(rules.min_length)), type: 'requirement' });
  }
  if (rules.max_length != null) {
    items.push({ text: msg('ruleMaxLength', String(rules.max_length)), type: 'warning' });
  }
  if (rules.require_uppercase) {
    items.push({ text: msg('ruleRequireUppercase'), type: 'requirement' });
  }
  if (rules.require_lowercase) {
    items.push({ text: msg('ruleRequireLowercase'), type: 'requirement' });
  }
  if (rules.require_number) {
    items.push({ text: msg('ruleRequireNumber'), type: 'requirement' });
  }
  if (rules.require_special) {
    const text = rules.allowed_special_chars
      ? msg('ruleAllowedSpecialChars', rules.allowed_special_chars)
      : msg('ruleRequireSpecial');
    items.push({ text, type: 'requirement' });
  }
  if (rules.disallowed_chars) {
    items.push({ text: msg('ruleDisallowedChars', rules.disallowed_chars), type: 'warning' });
  }
  if (rules.no_spaces) {
    items.push({ text: msg('ruleNoSpaces'), type: 'warning' });
  }
  if (rules.notes) {
    items.push({ text: rules.notes, type: 'info' });
  }

  return items;
}

/**
 * Get confidence level label from score.
 */
function getConfidenceLevel(score) {
  const msg = typeof chrome !== 'undefined' && chrome.i18n
    ? (key) => chrome.i18n.getMessage(key) || key
    : (key) => key;

  if (score >= 0.7) return msg('confidenceHigh');
  if (score >= 0.4) return msg('confidenceMedium');
  return msg('confidenceLow');
}

/**
 * Extract password constraints from an input element's HTML attributes.
 * Useful for pre-filling the contribution form.
 */
function extractRulesFromInput(input) {
  const rules = {};

  const minLength = input.getAttribute('minlength');
  if (minLength) rules.min_length = parseInt(minLength, 10);

  const maxLength = input.getAttribute('maxlength');
  if (maxLength) rules.max_length = parseInt(maxLength, 10);

  const pattern = input.getAttribute('pattern');
  if (pattern) {
    if (/\[A-Z\]|\\p\{Lu\}/i.test(pattern)) rules.require_uppercase = true;
    if (/\[a-z\]|\\p\{Ll\}/i.test(pattern)) rules.require_lowercase = true;
    if (/\[0-9\]|\\d/.test(pattern)) rules.require_number = true;
    if (/[!@#$%^&*]/.test(pattern)) rules.require_special = true;
  }

  return rules;
}

if (typeof globalThis !== 'undefined') {
  globalThis.DRP_Rules = {
    validateRules,
    formatRulesForDisplay,
    getConfidenceLevel,
    extractRulesFromInput,
  };
}
