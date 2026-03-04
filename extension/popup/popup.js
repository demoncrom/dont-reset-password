/**
 * Popup script: manages the 5 UI states.
 * - Loading
 * - Rules Found
 * - No Rules (contribute form)
 * - Submission Success
 * - Not on a Website
 */

(function () {
  'use strict';

  const msg = DRP_i18n.msg;

  // State elements
  const stateLoading = document.getElementById('state-loading');
  const stateRules = document.getElementById('state-rules');
  const stateNoRules = document.getElementById('state-no-rules');
  const stateSuccess = document.getElementById('state-success');
  const stateNoWebsite = document.getElementById('state-no-website');

  let currentDomain = '';
  let currentRuleId = '';

  // ── Init ───────────────────────────────────────────────────────────

  async function init() {
    localizeLabels();

    const tabInfo = await chrome.runtime.sendMessage({ type: 'GET_DOMAIN' });
    currentDomain = tabInfo.domain;

    if (!currentDomain || currentDomain === 'localhost' || !tabInfo.url.startsWith('http')) {
      showState('no-website');
      loadStats();
      return;
    }

    document.getElementById('loading-text').textContent = msg('popupLoading', currentDomain);

    const result = await chrome.runtime.sendMessage({ type: 'GET_RULES', domain: currentDomain });

    if (result && result.found && result.rules) {
      showRules(result);
    } else {
      showNoRules();
    }
  }

  // ── Localize Labels ────────────────────────────────────────────────

  function localizeLabels() {
    document.getElementById('label-min-length').textContent = msg('formMinLength');
    document.getElementById('label-max-length').textContent = msg('formMaxLength');
    document.getElementById('label-require-uppercase').textContent = msg('formRequireUppercase');
    document.getElementById('label-require-lowercase').textContent = msg('formRequireLowercase');
    document.getElementById('label-require-number').textContent = msg('formRequireNumber');
    document.getElementById('label-require-special').textContent = msg('formRequireSpecial');
    document.getElementById('label-allowed-special').textContent = msg('formAllowedSpecialChars');
    document.getElementById('label-no-spaces').textContent = msg('formNoSpaces');
    document.getElementById('label-notes').textContent = msg('formNotes');
    document.getElementById('btn-submit').textContent = msg('formSubmit');
    document.getElementById('btn-report').textContent = msg('reportIncorrect');
    document.getElementById('no-website-title').textContent = msg('popupNotOnWebsite');
    document.getElementById('success-message').textContent = msg('formSubmitSuccess');
    document.getElementById('notes-hint').textContent = msg('notesHint');
    document.getElementById('privacy-notice').textContent = msg('privacyNotice');
  }

  // ── Show State ─────────────────────────────────────────────────────

  function showState(name) {
    const states = [stateLoading, stateRules, stateNoRules, stateSuccess, stateNoWebsite];
    const map = { loading: stateLoading, rules: stateRules, 'no-rules': stateNoRules, success: stateSuccess, 'no-website': stateNoWebsite };

    const target = map[name];
    for (const el of states) {
      if (el === target) {
        el.classList.remove('hidden');
        // Re-trigger fade-in animation
        el.style.animation = 'none';
        el.offsetHeight; // force reflow
        el.style.animation = '';
      } else {
        el.classList.add('hidden');
      }
    }
  }

  // ── Show Rules ─────────────────────────────────────────────────────

  function showRules(result) {
    const { rules, meta } = result;
    currentRuleId = meta?.rule_id || '';

    document.getElementById('rules-title').textContent = msg('tooltipTitle', currentDomain);

    const listEl = document.getElementById('rules-list');
    listEl.innerHTML = '';
    const items = DRP_Rules.formatRulesForDisplay(rules);
    for (const item of items) {
      const div = document.createElement('div');
      div.className = `rule-item ${item.type}`;

      const icon = document.createElement('span');
      icon.className = 'rule-icon';
      icon.textContent = item.type === 'requirement' ? '\u2713' : item.type === 'warning' ? '!' : 'i';

      const text = document.createElement('span');
      text.textContent = item.text;

      div.appendChild(icon);
      div.appendChild(text);
      listEl.appendChild(div);
    }

    const confidenceLevel = DRP_Rules.getConfidenceLevel(meta?.confidence_score || 0);
    document.getElementById('rules-confidence').textContent =
      msg('confidenceLabel', confidenceLevel, String(meta?.contributor_count || 0));

    document.getElementById('vote-up-count').textContent = meta?.upvotes || 0;
    document.getElementById('vote-down-count').textContent = meta?.downvotes || 0;

    showState('rules');
  }

  // ── Show No Rules ──────────────────────────────────────────────────

  function showNoRules() {
    document.getElementById('no-rules-title').textContent = msg('popupNoRulesTitle', currentDomain);
    document.getElementById('no-rules-subtitle').textContent = msg('popupBeFirstContributor');
    showState('no-rules');
  }

  // ── Load Stats ─────────────────────────────────────────────────────

  async function loadStats() {
    document.getElementById('stats-line').textContent = msg('popupStatsLine', '...', '...');

    try {
      const stats = await chrome.runtime.sendMessage({ type: 'GET_STATS' });
      if (stats && stats.success) {
        document.getElementById('stats-line').textContent =
          msg('popupStatsLine', String(stats.total_domains || 0), String(stats.total_contributors || 0));
      }
    } catch {
      // Non-critical, keep placeholder
    }
  }

  // ── Inline Validation ──────────────────────────────────────────────

  function showFieldError(fieldId, errorId, message) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(errorId);
    if (message) {
      field.classList.add('field-error');
      error.textContent = message;
      error.classList.add('visible');
    } else {
      field.classList.remove('field-error');
      error.textContent = '';
      error.classList.remove('visible');
    }
  }

  function clearAllErrors() {
    for (const el of document.querySelectorAll('.field-error')) {
      el.classList.remove('field-error');
    }
    for (const el of document.querySelectorAll('.error-text')) {
      el.textContent = '';
      el.classList.remove('visible');
    }
    const banner = document.getElementById('form-error-banner');
    banner.textContent = '';
    banner.classList.remove('visible');
  }

  function validateField(fieldId) {
    const minEl = document.getElementById('field-min-length');
    const maxEl = document.getElementById('field-max-length');

    if (fieldId === 'field-min-length') {
      const val = minEl.value.trim();
      if (val !== '') {
        const num = parseInt(val, 10);
        if (isNaN(num) || num < 1 || num > 200) {
          showFieldError('field-min-length', 'error-min-length', msg('validationMinRange'));
          return false;
        }
        const maxVal = maxEl.value.trim();
        if (maxVal !== '') {
          const maxNum = parseInt(maxVal, 10);
          if (!isNaN(maxNum) && num > maxNum) {
            showFieldError('field-min-length', 'error-min-length', msg('validationMinExceedsMax'));
            return false;
          }
        }
      }
      showFieldError('field-min-length', 'error-min-length', '');
      return true;
    }

    if (fieldId === 'field-max-length') {
      const val = maxEl.value.trim();
      if (val !== '') {
        const num = parseInt(val, 10);
        if (isNaN(num) || num < 1 || num > 1000) {
          showFieldError('field-max-length', 'error-max-length', msg('validationMaxRange'));
          return false;
        }
        // Cross-field: re-validate min if present
        const minVal = minEl.value.trim();
        if (minVal !== '') {
          const minNum = parseInt(minVal, 10);
          if (!isNaN(minNum) && minNum > num) {
            showFieldError('field-min-length', 'error-min-length', msg('validationMinExceedsMax'));
          } else {
            showFieldError('field-min-length', 'error-min-length', '');
          }
        }
      }
      showFieldError('field-max-length', 'error-max-length', '');
      return true;
    }

    if (fieldId === 'field-notes') {
      const val = document.getElementById('field-notes').value;
      if (val.length > 500) {
        showFieldError('field-notes', 'error-notes', msg('validationNotesTooLong'));
        return false;
      }
      showFieldError('field-notes', 'error-notes', '');
      return true;
    }

    return true;
  }

  // Debounce helper
  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  const debouncedValidate = debounce((fieldId) => validateField(fieldId), 300);

  // Attach inline validation listeners
  for (const id of ['field-min-length', 'field-max-length', 'field-notes']) {
    document.getElementById(id).addEventListener('input', () => debouncedValidate(id));
    document.getElementById(id).addEventListener('blur', () => validateField(id));
  }

  // ── Event Handlers ─────────────────────────────────────────────────

  // Toggle special chars row when "require special" is checked
  document.getElementById('field-require-special').addEventListener('change', (e) => {
    document.getElementById('special-chars-row').style.display = e.target.checked ? '' : 'none';
  });

  // Vote buttons (optimistic UI)
  document.getElementById('btn-vote-up').addEventListener('click', async () => {
    if (!currentRuleId) return;
    const btn = document.getElementById('btn-vote-up');
    btn.classList.add('active');
    document.getElementById('btn-vote-down').classList.remove('active');
    const countEl = document.getElementById('vote-up-count');
    const originalCount = countEl.textContent;
    countEl.textContent = parseInt(originalCount) + 1;
    const result = await chrome.runtime.sendMessage({ type: 'VOTE', ruleId: currentRuleId, vote: 'up', domain: currentDomain });
    if (!result || !result.success) {
      countEl.textContent = originalCount;
      btn.classList.remove('active');
    }
  });

  document.getElementById('btn-vote-down').addEventListener('click', async () => {
    if (!currentRuleId) return;
    const btn = document.getElementById('btn-vote-down');
    btn.classList.add('active');
    document.getElementById('btn-vote-up').classList.remove('active');
    const countEl = document.getElementById('vote-down-count');
    const originalCount = countEl.textContent;
    countEl.textContent = parseInt(originalCount) + 1;
    const result = await chrome.runtime.sendMessage({ type: 'VOTE', ruleId: currentRuleId, vote: 'down', domain: currentDomain });
    if (!result || !result.success) {
      countEl.textContent = originalCount;
      btn.classList.remove('active');
    }
  });

  // Report link
  document.getElementById('btn-report').addEventListener('click', async (e) => {
    e.preventDefault();
    if (!currentRuleId) return;
    await chrome.runtime.sendMessage({ type: 'REPORT', ruleId: currentRuleId, reason: 'incorrect', domain: currentDomain });
    document.getElementById('btn-report').textContent = '\u2713 ' + msg('reportIncorrect');
    document.getElementById('btn-report').style.color = 'var(--clr-success)';
  });

  // Contribute form submission
  document.getElementById('contribute-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors();

    const rules = {};
    const minLen = document.getElementById('field-min-length').value;
    const maxLen = document.getElementById('field-max-length').value;
    if (minLen) rules.min_length = parseInt(minLen, 10);
    if (maxLen) rules.max_length = parseInt(maxLen, 10);

    rules.require_uppercase = document.getElementById('field-require-uppercase').checked;
    rules.require_lowercase = document.getElementById('field-require-lowercase').checked;
    rules.require_number = document.getElementById('field-require-number').checked;
    rules.require_special = document.getElementById('field-require-special').checked;
    rules.no_spaces = document.getElementById('field-no-spaces').checked;

    const specialChars = document.getElementById('field-allowed-special').value.trim();
    if (specialChars) rules.allowed_special_chars = specialChars;

    const notes = document.getElementById('field-notes').value.trim();
    if (notes) rules.notes = notes;

    // Validate
    const validation = DRP_Rules.validateRules(rules);
    if (!validation.valid) {
      // Map errors to specific fields where possible
      for (const err of validation.errors) {
        if (err.includes('min_length') && err.includes('greater than')) {
          showFieldError('field-min-length', 'error-min-length', msg('validationMinExceedsMax'));
        } else if (err.includes('min_length')) {
          showFieldError('field-min-length', 'error-min-length', msg('validationMinRange'));
        } else if (err.includes('max_length')) {
          showFieldError('field-max-length', 'error-max-length', msg('validationMaxRange'));
        } else if (err.includes('notes')) {
          showFieldError('field-notes', 'error-notes', msg('validationNotesTooLong'));
        }
      }
      return;
    }

    // Submit
    const btn = document.getElementById('btn-submit');
    const banner = document.getElementById('form-error-banner');
    btn.disabled = true;
    btn.textContent = '...';
    banner.classList.remove('visible');

    const result = await chrome.runtime.sendMessage({
      type: 'SUBMIT_RULES',
      domain: currentDomain,
      rules,
    });

    if (result && result.success) {
      showState('success');
    } else {
      btn.disabled = false;
      btn.textContent = msg('formSubmit');
      banner.textContent = result?.error || msg('submitError');
      banner.classList.add('visible');
    }
  });

  // ── Start ──────────────────────────────────────────────────────────

  init();
})();
