// ====== A11y (Pillar 3: Accessibility & Keyboard Navigation) ======
// Screen-reader + keyboard support: skip link, focus management on route
// change, aria-live announcements for results, and visible focus enforcement.
const A11y = (function () {
  // Ensure a skip-to-content link exists (top-left, visible on focus)
  function ensureSkipLink() {
    if (document.getElementById('a11y-skip')) return;
    var a = document.createElement('a');
    a.id = 'a11y-skip';
    a.className = 'a11y-skip';
    a.href = '#mainContent';
    a.textContent = 'Skip to content';
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var main = document.getElementById('mainContent');
      if (main) { main.setAttribute('tabindex', '-1'); main.focus(); }
    });
    document.body.insertBefore(a, document.body.firstChild);
  }

  // Move focus to the top of the newly rendered view (route change)
  function announceAndFocus() {
    var main = document.getElementById('mainContent');
    if (main) {
      main.setAttribute('tabindex', '-1');
      main.focus({ preventScroll: true });
    }
  }

  // Announce a result to screen readers via the aria-live result container
  function announceResult(text) {
    var area = document.getElementById('result-area');
    if (!area) return;
    // aria-live="polite" is set on #result-area at render time; update its text node
    area.setAttribute('aria-live', 'polite');
    // If the result already rendered, the live region picks it up; for safety,
    // also emit to a dedicated visually-hidden announcer for chained updates.
    var ann = document.getElementById('a11y-announcer');
    if (!ann) {
      ann = document.createElement('div');
      ann.id = 'a11y-announcer';
      ann.setAttribute('aria-live', 'polite');
      ann.className = 'sr-only';
      document.body.appendChild(ann);
    }
    ann.textContent = text || 'Calculation complete';
    setTimeout(function () { ann.textContent = ''; }, 2000);
  }

  // Patch tool forms: ensure every interactive control has an accessible name
  function auditInputs() {
    document.querySelectorAll('#calc-form input, #calc-form select, #calc-form textarea, #calc-form button').forEach(function (el) {
      if (!el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) {
        var label = null;
        if (el.id) label = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        if (label && label.textContent.trim()) {
          el.setAttribute('aria-label', label.textContent.trim());
        }
      }
    });
  }

  // Visible focus enforcement: any element that receives keyboard focus gets a ring
  function enforceVisibleFocus() {
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') document.body.classList.add('keyboard-nav');
    });
    document.addEventListener('mousedown', function () {
      document.body.classList.remove('keyboard-nav');
    });
    // Tab-out-of-modal trap for modal overlays
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var modal = document.querySelector('.modal-overlay.active, .cmd-palette.active, .user-sidebar.open');
      if (!modal) return;
      var focusables = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  function init() {
    ensureSkipLink();
    enforceVisibleFocus();
    // Re-audit inputs on every tool render
    var main = document.getElementById('mainContent');
    if (main) {
      new MutationObserver(function () {
        auditInputs();
      }).observe(main, { childList: true, subtree: true });
    }
    // Focus the main content after route changes (SPA navigation)
    window.addEventListener('popstate', function () { announceAndFocus(); });
  }

  return { init: init, announceResult: announceResult, announceAndFocus: announceAndFocus, auditInputs: auditInputs };
})();

if (typeof window !== 'undefined') window.A11y = A11y;
if (typeof module !== 'undefined' && module.exports) module.exports = { A11y };
