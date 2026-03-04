/**
 * Content script: detects password fields and injects rule tooltips.
 * Runs on every page at document_idle, plus watches for dynamic DOM changes.
 */

(function () {
  'use strict';

  const PROCESSED_ATTR = 'data-drp-processed';
  let currentDomain = '';

  // Track tooltips per input so we can clean up when inputs are removed
  const tooltipMap = new WeakMap();

  /**
   * Check if the extension context is still valid.
   */
  function isExtensionContextValid() {
    try {
      return !!chrome.runtime && !!chrome.runtime.id;
    } catch (e) {
      return false;
    }
  }

  /**
   * Check if an input is a password field (or looks like one).
   */
  function isPasswordInput(el) {
    if (el.tagName !== 'INPUT') return false;
    if (el.type === 'password') return true;

    // Heuristic: some sites use type="text" with masking
    const nameOrId = (el.name + ' ' + el.id + ' ' + el.getAttribute('autocomplete')).toLowerCase();
    if (el.type === 'text' && /passw|passwd|pwd/.test(nameOrId)) return true;

    return false;
  }

  /**
   * Check if we're in a cross-origin iframe (skip those).
   */
  function isInCrossOriginIframe() {
    try {
      // If we can't access parent origin, we're cross-origin
      if (window.self !== window.top) {
        void window.top.location.href;
      }
      return false;
    } catch (e) {
      return true;
    }
  }

  /**
   * Process a single password input: fetch rules and show tooltip.
   */
  async function processPasswordInput(input) {
    if (input.getAttribute(PROCESSED_ATTR)) return;
    input.setAttribute(PROCESSED_ATTR, 'true');

    if (!isExtensionContextValid()) return;

    if (!currentDomain) {
      currentDomain = DRP_Domain.getDomainFromUrl();
    }
    if (!currentDomain) return;

    // Check if user dismissed tooltips for this domain
    try {
      const dismissed = await DRP_Tooltip.isDismissed(currentDomain);
      if (dismissed) return;
    } catch (e) {
      return;
    }

    // Request rules from service worker
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_RULES',
        domain: currentDomain,
      });

      let host;
      if (response && response.found && response.rules) {
        host = DRP_Tooltip.create(input, {
          rules: response.rules,
          domain: currentDomain,
          confidence_score: response.meta?.confidence_score,
          contributor_count: response.meta?.contributor_count,
          upvotes: response.meta?.upvotes,
          downvotes: response.meta?.downvotes,
          rule_id: response.meta?.rule_id,
        });
      } else {
        // Show contribute prompt
        host = DRP_Tooltip.createNoRulesPrompt(input, currentDomain);
      }

      if (host) {
        tooltipMap.set(input, host);
      }
    } catch (err) {
      // Extension context may be invalidated; silently fail
      console.debug('[DRP] Failed to get rules:', err.message);
    }
  }

  /**
   * Clean up tooltip for a removed input element.
   */
  function cleanupRemovedInput(input) {
    const host = tooltipMap.get(input);
    if (host) {
      DRP_Tooltip.removeTooltip(host);
      tooltipMap.delete(input);
    }
    input.removeAttribute(PROCESSED_ATTR);
  }

  /**
   * Scan the DOM for password inputs and process them.
   */
  function scanForPasswordInputs(root = document) {
    const inputs = root.querySelectorAll('input');
    for (const input of inputs) {
      if (isPasswordInput(input) && !input.getAttribute(PROCESSED_ATTR)) {
        processPasswordInput(input);
      }
    }
  }

  /**
   * Set up MutationObserver to detect dynamically added/removed password fields.
   */
  function observeDOMChanges() {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Handle added nodes
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;

          // Check if the added node itself is a password input
          if (isPasswordInput(node)) {
            processPasswordInput(node);
          }

          // Check children of the added node
          if (node.querySelectorAll) {
            const inputs = node.querySelectorAll('input');
            for (const input of inputs) {
              if (isPasswordInput(input) && !input.getAttribute(PROCESSED_ATTR)) {
                processPasswordInput(input);
              }
            }
          }
        }

        // Handle removed nodes — clean up associated tooltips
        for (const node of mutation.removedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;

          if (node.tagName === 'INPUT' && node.getAttribute(PROCESSED_ATTR)) {
            cleanupRemovedInput(node);
          }

          if (node.querySelectorAll) {
            const inputs = node.querySelectorAll(`input[${PROCESSED_ATTR}]`);
            for (const input of inputs) {
              cleanupRemovedInput(input);
            }
          }
        }

        // Also handle attribute changes (e.g., type changed to "password")
        if (mutation.type === 'attributes' && mutation.attributeName === 'type') {
          if (isPasswordInput(mutation.target) && !mutation.target.getAttribute(PROCESSED_ATTR)) {
            processPasswordInput(mutation.target);
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['type'],
    });
  }

  // Initialize
  function init() {
    if (!document.body) return;

    // Skip cross-origin iframes — we can't get a meaningful domain
    if (isInCrossOriginIframe()) return;

    scanForPasswordInputs();
    observeDOMChanges();
  }

  // Run when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
