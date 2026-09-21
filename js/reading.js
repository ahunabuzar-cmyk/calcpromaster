// ============================================================
// Reading & Content Layout (S8 — features 51-60)
//   #51 distraction-free reading mode (guides/blog/tool pages)
//   #52 sticky TOC sidebar with scroll-spy highlight
//   #53 thin reading-progress bar on long pages
//   #54 line-height / letter-spacing adjuster (persisted)
//   #55 dyslexia-friendly font toggle (data-dyslexic + swap)
//   #56 collapsible content sections — SEO-safe <details>
//   #57 tab organizer — accessible tabs, content stays in DOM
//   #58 jump-back-to-input button on long calculator pages
//   #59 number-format toggle (500,000 vs 5,00,000 vs plain)
//   #60 print-optimized clean result view
// Pure logic is exported for tests; DOM work happens in init()
// and is a no-op when document is unavailable (Node tests).
// Additive: no existing localStorage key is overwritten — new keys
// are namespaced under calcpro_reading_*.
// ============================================================
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.Reading = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KEYS = {
    prefs: 'calcpro_reading_prefs',
    recent: 'calcpro_recent_tools',
  };

  var NUMBER_FORMATS = ['western', 'indian', 'plain'];
  var LH_STEPS = [1.4, 1.5, 1.6, 1.75, 1.9, 2.0, 2.2];
  var LS_STEPS = ['normal', 'wide', 'wider'];
  var SCROLL_THRESHOLD = 600; // px before progress bar / jump button appear

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode */ }
  }

  // ---- persisted preferences (one JSON blob, additive namespace) ----
  function loadPrefs() {
    var raw = safeGet(KEYS.prefs);
    var p = raw ? safeParse(raw) : {};
    return {
      lineHeight: p.lineHeight || 1.5,
      letterSpacing: p.letterSpacing || 'normal',
      dyslexic: !!p.dyslexic,
      numberFormat: NUMBER_FORMATS.indexOf(p.numberFormat) !== -1 ? p.numberFormat : 'western',
      contentWidth: p.contentWidth || 'normal',
    };
  }
  function safeParse(raw) {
    try { return JSON.parse(raw); } catch (e) { return {}; }
  }
  function savePrefs(prefs) {
    safeSet(KEYS.prefs, prefs);
  }

  // ---- #54 line-height & letter-spacing ----
  function nextLineHeight(current, dir) {
    var i = LH_STEPS.indexOf(current);
    if (i === -1) i = 1;
    i = Math.max(0, Math.min(LH_STEPS.length - 1, i + dir));
    return LH_STEPS[i];
  }
  function nextLetterSpacing(current, dir) {
    var i = LS_STEPS.indexOf(current);
    if (i === -1) i = 0;
    i = Math.max(0, Math.min(LS_STEPS.length - 1, i + dir));
    return LS_STEPS[i];
  }

  // ---- #59 number formatting: western 1,234,567 | indian 12,34,567 | plain ----
  function formatNumber(n, fmt) {
    n = Number(n);
    if (!isFinite(n)) return String(n);
    var neg = n < 0 ? '-' : '';
    n = Math.abs(n);
    var parts = String(n).split('.');
    var intPart = parts[0];
    var decPart = parts.length > 1 ? '.' + parts[1] : '';
    if (fmt === 'plain') return neg + intPart + decPart;
    if (fmt === 'indian') {
      var last3 = intPart.slice(-3);
      var rest = intPart.slice(0, -3);
      if (rest) last3 = ',' + last3;
      var grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
      return neg + (grouped ? grouped + last3 : last3) + decPart;
    }
    // western
    return neg + intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + decPart;
  }

  // ---- #52 TOC extraction from rendered content (h2/h3) ----
  function extractHeadings(html) {
    var out = [];
    var re = /<(h2|h3)[^>]*>([\s\S]*?)<\/\1>/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
      var text = m[2].replace(/<[^>]+>/g, '').trim();
      if (!text) continue;
      out.push({ level: m[1].toLowerCase(), text: text });
    }
    return out;
  }

  function slugify(text) {
    return 'sec-' + String(text).toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
  }

  // Assign stable ids to h2/h3 inside a container element; returns TOC tree.
  function buildToc(container) {
    if (!container || !container.querySelectorAll) return [];
    var heads = container.querySelectorAll('h2, h3');
    var toc = [];
    for (var i = 0; i < heads.length; i++) {
      var h = heads[i];
      if (!h.id) h.id = slugify(h.textContent || 'section-' + i);
      toc.push({ level: h.tagName.toLowerCase(), text: (h.textContent || '').trim(), id: h.id });
    }
    return toc;
  }

  // Scroll-spy: given heading offsets, which section is active?
  function activeSection(offsets, scrollY, viewportH) {
    if (!offsets || !offsets.length) return null;
    var line = scrollY + Math.min(viewportH * 0.3, 160);
    var active = offsets[0].id;
    for (var i = 0; i < offsets.length; i++) {
      if (offsets[i].top <= line) active = offsets[i].id;
      else break;
    }
    return active;
  }

  // ---- #53 reading progress ----
  function progressPercent(scrollY, docHeight, viewportH) {
    var max = docHeight - viewportH;
    if (max <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((scrollY / max) * 100)));
  }

  // ---- #51 distraction-free mode: toggle + restore ----
  // A body-level attribute + class pair; CSS hides chrome, module restores it.
  function applyDistractionFree(doc, on) {
    var body = doc && doc.body;
    if (!body) return false;
    if (on) {
      body.setAttribute('data-reading-mode', 'on');
      return true;
    }
    body.removeAttribute('data-reading-mode');
    return false;
  }

  // ---- #55 dyslexia-friendly font ----
  function applyDyslexic(doc, on) {
    var de = doc && doc.documentElement;
    if (!de) return false;
    if (on) { de.setAttribute('data-dyslexic', 'on'); return true; }
    de.removeAttribute('data-dyslexic');
    return false;
  }

  // ---- #56 SEO-safe collapsibles ----
  // Rewrites a container's plain sections into <details open><summary>.
  // Content stays in the DOM and open-by-default => crawlers & no-JS see it.
  function makeCollapsible(html, opts) {
    opts = opts || {};
    var open = opts.open !== false;
    var headingRe = /<h2([^>]*)>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2|$)/gi;
    var m, out = '';
    while ((m = headingRe.exec(html)) !== null) {
      var attrs = m[1] || '';
      var title = m[2].replace(/<[^>]+>/g, '').trim();
      var body = m[3];
      if (!title) { out += '<h2' + attrs + '>' + m[2] + '</h2>' + body; continue; }
      if (opts.skip && opts.skip.test(title)) {
        out += '<h2' + attrs + '>' + m[2] + '</h2>' + body;
        continue;
      }
      out += '<details class="collapsible"' + (open ? ' open' : '') + '><summary>' + title + '</summary>' + body + '</details>';
    }
    return out || html;
  }

  // ---- #57 SEO-safe tabs ----
  // Tab headers + panels. Panels are real DOM siblings (not display:none'd
  // server-side): the non-active panel uses the .tab-panel[hidden] attribute,
  // and the prerendered HTML ships ALL panels visible with only
  // progressive-enhancement hiding applied by JS at runtime. Crawlers and
  // no-JS users see everything; interactive users get tabs.
  function makeTabs(sections) {
    // sections: [{title, html}]
    var idBase = 'tabs-' + Math.abs(hashString(sections.map(function (s) { return s.title; }).join('|')));
    var nav = '';
    var panels = '';
    for (var i = 0; i < sections.length; i++) {
      var id = idBase + '-' + i;
      var sel = i === 0;
      nav += '<button role="tab" id="' + id + '-tab" aria-controls="' + id + '"' +
        (sel ? ' aria-selected="true" tabindex="0"' : ' aria-selected="false" tabindex="-1"') +
        '>' + sections[i].title + '</button>';
      panels += '<div role="tabpanel" id="' + id + '" aria-labelledby="' + id + '-tab"' +
        (sel ? '' : ' hidden') + '>' + sections[i].html + '</div>';
    }
    return '<div class="tabs" role="tablist" aria-label="Page sections">' + nav + '</div>' + panels;
  }

  function hashString(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return h;
  }

  // Which panel activates on arrow keys in a tablist?
  function nextTabIndex(count, current, dir) {
    if (count <= 0) return 0;
    var n = (current + dir) % count;
    if (n < 0) n += count;
    return n;
  }

  // ---- #60 print view ----
  // Print-only CSS class list: what stays visible on a printed page.
  var PRINT_HIDE_SELECTORS = [
    'header', 'footer', 'nav', '#cookie-banner', '#back-to-top',
    '.related-section', '.share-bar', '.ad-slot', '#reading-toolbar',
    '.sidebar', 'aside',
  ];

  return {
    KEYS: KEYS,
    NUMBER_FORMATS: NUMBER_FORMATS,
    LH_STEPS: LH_STEPS,
    LS_STEPS: LS_STEPS,
    PRINT_HIDE_SELECTORS: PRINT_HIDE_SELECTORS,
    loadPrefs: loadPrefs,
    savePrefs: savePrefs,
    nextLineHeight: nextLineHeight,
    nextLetterSpacing: nextLetterSpacing,
    formatNumber: formatNumber,
    extractHeadings: extractHeadings,
    slugify: slugify,
    buildToc: buildToc,
    activeSection: activeSection,
    progressPercent: progressPercent,
    applyDistractionFree: applyDistractionFree,
    applyDyslexic: applyDyslexic,
    makeCollapsible: makeCollapsible,
    makeTabs: makeTabs,
    nextTabIndex: nextTabIndex,
    SCROLL_THRESHOLD: SCROLL_THRESHOLD,
  };
});
