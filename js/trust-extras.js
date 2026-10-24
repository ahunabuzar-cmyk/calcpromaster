/* ============================================================
 * TrustExtras — honest trust & social-proof widgets for tool pages
 * ------------------------------------------------------------
 * Three features, all local-first and truthful:
 *  1. Per-calculator rating — the user rates a tool; the widget
 *     shows THEIR rating and a local count. No fabricated global
 *     numbers. Aggregate counts are shown only when real data exists.
 *  2. Usage counter — renders a number ONLY if real usage data is
 *     injected (window.__CPM_USAGE__). Otherwise it renders nothing.
 *     Never invents numbers.
 *  3. Reference rate label — a clearly labeled, sourced reference
 *     value shown as context (never financial advice).
 * Pure helpers are exposed for unit tests; DOM work is guarded.
 * ============================================================ */
(function (root) {
  'use strict';

  var RKEY = 'calcprom:ratings:v1';

  function storage() {
    try { if (typeof localStorage !== 'undefined' && localStorage) return localStorage; } catch (e) {}
    return null;
  }
  function readAll() {
    var s = storage();
    if (!s) return {};
    try { return JSON.parse(s.getItem(RKEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function writeAll(obj) {
    var s = storage();
    if (s) { try { s.setItem(RKEY, JSON.stringify(obj)); } catch (e) {} }
  }

  /** Record a 1-5 star rating for a tool id. Returns the stored value. */
  function setRating(toolId, stars) {
    stars = Math.max(1, Math.min(5, Math.round(Number(stars) || 0)));
    var all = readAll();
    all[toolId] = stars;
    writeAll(all);
    return stars;
  }
  function getRating(toolId) {
    var all = readAll();
    return all[toolId] || 0;
  }

  /** Real aggregate counts, if the site ever injects them. Never invented. */
  function usageFor(toolId) {
    var data = (typeof window !== 'undefined') ? window.__CPM_USAGE__ : null;
    if (!data || typeof data !== 'object') return null;
    var n = data[toolId];
    return (typeof n === 'number' && isFinite(n) && n >= 0) ? n : null;
  }

  /** A clearly labeled, sourced reference value. Context only, not advice. */
  function referenceRate() {
    return {
      label: 'Reference only',
      value: 'Central-bank policy rates vary by country and change at scheduled meetings.',
      note: 'This is general context, not a live quote or financial advice. Check the official source for the current rate.',
      reviewed: '2026-10'
    };
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function ratingHtml(toolId) {
    var mine = getRating(toolId);
    var count = usageFor(toolId);
    var stars = '';
    for (var i = 1; i <= 5; i++) {
      // Sizing (background/border/font/padding) lives in styles.css so the
      // coarse-pointer media query can give the stars a 44px tap target — an
      // inline value cannot be overridden without !important. Only the
      // per-star colour stays inline.
      stars += '<button type="button" class="cpm-star" data-v="' + i + '" aria-label="Rate ' + i + ' out of 5" style="color:' + (i <= mine ? '#f59e0b' : '#cbd5e1') + '">\u2605</button>';
    }
    return '<div class="cpm-rating" data-tool="' + escapeHtml(toolId) + '" style="margin:10px 0;color:#475569;font-size:.9rem;">' +
      '<span style="margin-right:6px;">Was this helpful?</span>' + stars +
      (mine ? '<span style="margin-left:8px;">You rated ' + mine + '/5</span>' : '') +
      (count != null ? '<span style="margin-left:8px;">' + count + ' uses this week</span>' : '') +
      '</div>';
  }

  function ratingNote() {
    return 'Ratings are stored on your device only. We do not invent usage numbers; an aggregate count appears only when real data is available.';
  }

  function mountRating(toolId) {
    if (typeof document === 'undefined' || !toolId) return;
    var host = document.getElementById('steps-area') || document.getElementById('result-area') || document.getElementById('explain-area');
    if (!host) return;
    var prev = document.getElementById('cpm-rating-host');
    if (prev) prev.parentNode.removeChild(prev);
    var wrap = document.createElement('div');
    wrap.id = 'cpm-rating-host';
    wrap.innerHTML = ratingHtml(toolId) + '<p style="color:#94a3b8;font-size:.78rem;margin:4px 0 12px;">' + ratingNote() + '</p>';
    host.parentNode.insertBefore(wrap, host.nextSibling);
    wrap.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.cpm-star') : null;
      if (!b) return;
      setRating(toolId, b.getAttribute('data-v'));
      mountRating(toolId);
    });
  }

  var TrustExtras = {
    setRating: setRating,
    getRating: getRating,
    usageFor: usageFor,
    referenceRate: referenceRate,
    ratingHtml: ratingHtml,
    ratingNote: ratingNote,
    mountRating: mountRating
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = TrustExtras;
  if (typeof window !== 'undefined') {
    window.TrustExtras = TrustExtras;
    try {
      window.addEventListener('calc:done', function (e) {
        try { mountRating(e && e.detail ? e.detail.toolId : null); } catch (err) {}
      });
    } catch (e) {}
  }
})(typeof window !== 'undefined' ? window : globalThis);
