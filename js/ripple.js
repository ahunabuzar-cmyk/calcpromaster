/* CalcProMaster Click Ripple — global tactile feedback for buttons & cards.
 * Zero per-button listeners: ONE delegated click handler on document.
 * - Targets .action-btn, .small-btn, .tool-card, .category-card, .lang-chip, button
 * - Uses a single .ripple-ink span animated by CSS (GPU-friendly transform/opacity)
 * - No layout shift: ink is position:absolute inside the relative overflow:hidden host
 * - Respects prefers-reduced-motion (skips ripple entirely)
 */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var RIPPLE_SELECTOR = '.action-btn, .small-btn, .tool-card, .category-card, .lang-chip, button, .suggestion-card, .recent-chip';

  function isRippleHost(el) {
    var node = el;
    while (node && node !== document.body) {
      if (node.matches && node.matches(RIPPLE_SELECTOR)) return node;
      node = node.parentElement;
    }
    return null;
  }

  function spawnRipple(host, clientX, clientY) {
    if (reducedMotion) return;
    // Reuse a cached ink element when possible (avoid GC churn on rapid clicks)
    var ink = document.createElement('span');
    ink.className = 'ripple-ink';

    var rect = host.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height) * 1.1;
    var x = clientX - rect.left;
    var y = clientY - rect.top;

    ink.style.width = size + 'px';
    ink.style.height = size + 'px';
    ink.style.left = x + 'px';
    ink.style.top = y + 'px';

    if (!host.classList.contains('ripple-host')) host.classList.add('ripple-host');
    host.appendChild(ink);
    ink.addEventListener('animationend', function () {
      if (ink.parentNode) ink.parentNode.removeChild(ink);
    });
  }

  document.addEventListener('pointerdown', function (e) {
    var host = isRippleHost(e.target);
    if (host) spawnRipple(host, e.clientX, e.clientY);
  }, { passive: true });
})();
