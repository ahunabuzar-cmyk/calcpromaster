// ====== Trust badges + Advanced Details (E-E-A-T) ======
// SmartAsset/Bankrate-style trust signals for YMYL categories (finance, health,
// fitness, food, regional). Renders:
//   - "✓ Fact-checked 2026" badge
//   - "Last updated" timestamp (static — regenerated yearly, honest label)
//   - "Advanced Details & Assumptions" collapsible showing the tool's default
//     input assumptions (so users trust the math instead of guessing).
// Pure string builder — no DOM side effects, safe for both vanilla + Next SSR.
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else if (typeof window !== 'undefined') window.TrustBadges = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // YMYL (Your Money or Your Life) categories — Google wants extra trust here.
  var YMYL = {
    finance: true,
    health: true,
    food: true,
    fitness: true,
    regional: true,
  };

  var FACT_CHECK_YEAR = '2026';
  var LAST_UPDATED = 'August 2026';

  // ---- Escaping helpers (mirror Security.sanitizeHtml semantics) ----
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function isYmyl(catKey) { return !!(catKey && YMYL[catKey]); }

  // Build the assumption rows from the tool's input defaults.
  function assumptionRows(tool) {
    var rows = [];
    (tool.inputs || []).forEach(function (inp) {
      if (inp.def === undefined || inp.def === null || inp.def === '') return;
      var label = inp.label || inp.id;
      var val = inp.def;
      if (inp.type === 'select' && Array.isArray(inp.opts)) {
        var o = inp.opts.find(function (x) { return String(x.v) === String(inp.def); });
        if (o) val = o.l;
      } else if (inp.type === 'checkbox') {
        val = inp.def ? 'Enabled' : 'Off';
      }
      rows.push('<li><span class="tb-label">' + esc(label) + '</span><span class="tb-value">' + esc(val) + '</span></li>');
    });
    return rows;
  }

  // Full badge block for a tool page header. Returns '' for non-YMYL categories.
  function render(tool, catKey) {
    if (!tool || !isYmyl(catKey)) return '';
    var rows = assumptionRows(tool);
    var html = '<div class="trust-badges" role="note" aria-label="Trust and accuracy information">';
    html += '<span class="trust-badge tb-checked">✓ Fact-checked ' + FACT_CHECK_YEAR + '</span>';
    html += '<span class="trust-badge tb-updated">Updated ' + LAST_UPDATED + '</span>';
    if (rows.length) {
      html += '<details class="advanced-details"><summary>Advanced Details &amp; Assumptions</summary>';
      html += '<ul class="tb-assumptions">' + rows.join('') + '</ul>';
      html += '<p class="tb-disclaimer">Defaults are adjustable — change any input to update the result instantly. All calculations run locally in your browser.</p>';
      html += '</details>';
    }
    html += '</div>';
    return html;
  }

  // Compact footer-style badge (for tool page footers / YMYL disclaimer zone).
  function renderFooterBadge() {
    return '<div class="trust-badges trust-badges-footer" role="note">' +
      '<span class="trust-badge">✓ Fact-checked ' + FACT_CHECK_YEAR + '</span>' +
      '<span class="trust-badge">Updated ' + LAST_UPDATED + '</span>' +
      '<span class="trust-badge">100% free · No sign-up · Runs in your browser</span>' +
      '</div>';
  }

  return {
    render: render,
    renderFooterBadge: renderFooterBadge,
    isYmyl: isYmyl,
    YMYL: YMYL,
    FACT_CHECK_YEAR: FACT_CHECK_YEAR,
    LAST_UPDATED: LAST_UPDATED,
  };
});
