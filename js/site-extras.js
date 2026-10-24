// ============================================================
// Site extras — universal smart search + reading preferences
// ------------------------------------------------------------
// Injected (defer) into EVERY page by scripts/apply-site-extras.cjs, so the
// static pages that ship no app bundle get the same two things the SPA has:
//
//   1. A calculator search box. Pages that already have one (the SPA nav
//      search, the home hero) are left alone — this only fills the gap on
//      guides, blog posts, legal pages and the prerendered long-form pages.
//      The 259KB TOOL_CATALOG is fetched on FIRST FOCUS, never on load.
//   2. Reading preferences (text size, high contrast, readable font) that
//      persist in localStorage and survive navigation.
//
// Everything is namespaced `sx-` and feature-detected, so a page that breaks
// JS still reads fine: the search box simply stays empty and the toolbar never
// appears. No inline handlers (CSP + the head-criteria audit both forbid them).
// ============================================================
(function () {
  'use strict';
  if (window.__sxLoaded) return;
  window.__sxLoaded = true;

  var PREFS_KEY = 'calcpro.ui.prefs.v1';
  var root = document.documentElement;
  var prefs = readPrefs();

  function readPrefs() {
    try {
      var p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      return p && typeof p === 'object' ? p : {};
    } catch (e) { return {}; }
  }
  function savePrefs() {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* private mode */ }
  }
  function applyPrefs() {
    root.classList.toggle('sx-text-lg', prefs.size === 'lg');
    root.classList.toggle('sx-text-xl', prefs.size === 'xl');
    root.classList.toggle('sx-contrast', !!prefs.contrast);
    root.classList.toggle('sx-readable', !!prefs.readable);
  }

  var CSS = [
    /* ---- reading preferences ---- */
    'html.sx-text-lg{zoom:1.12}',
    'html.sx-text-xl{zoom:1.25}',
    'html.sx-readable body{font-family:Verdana,"Atkinson Hyperlegible",system-ui,-apple-system,sans-serif!important;letter-spacing:.012em;line-height:1.95!important}',
    'html.sx-readable p,html.sx-readable li{max-width:74ch}',
    'html.sx-contrast{--bg:#fff;--surface:#fff;--text:#111;--text-light:#333;--border:#555;--primary:#0b3ea8;background:#fff!important;color:#111!important}',
    'html.sx-contrast body,html.sx-contrast main,html.sx-contrast header,html.sx-contrast footer,html.sx-contrast section,html.sx-contrast article,html.sx-contrast .card,html.sx-contrast .tool-card,html.sx-contrast .panel{background:#fff!important;color:#111!important;box-shadow:none!important}',
    'html.sx-contrast a{color:#0b3ea8!important;text-decoration:underline!important}',
    'html.sx-contrast h1,html.sx-contrast h2,html.sx-contrast h3,html.sx-contrast h4,html.sx-contrast p,html.sx-contrast li,html.sx-contrast td,html.sx-contrast th,html.sx-contrast span,html.sx-contrast label{color:#111!important}',
    'html.sx-contrast button,html.sx-contrast input,html.sx-contrast select{background:#fff!important;color:#111!important;border:1px solid #333!important}',
    /* ---- toolbar ---- */
    '.sx-bar{position:fixed;left:16px;bottom:16px;z-index:998;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}',
    '.sx-bar button{font:inherit}',
    '.sx-toggle{width:44px;height:44px;border-radius:50%;border:1px solid var(--border,#cbd5e1);background:var(--surface,#fff);color:var(--text,#0f172a);font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 6px 18px rgba(15,23,42,.18);line-height:1}',
    '.sx-toggle:focus-visible,.sx-panel button:focus-visible,.sx-panel input:focus-visible,.sx-input:focus-visible{outline:3px solid #4f46e5;outline-offset:2px}',
    '.sx-panel{position:absolute;left:0;bottom:52px;width:236px;padding:12px 14px;border-radius:12px;border:1px solid var(--border,#cbd5e1);background:var(--surface,#fff);color:var(--text,#0f172a);box-shadow:0 18px 40px rgba(15,23,42,.22);font-size:13px}',
    '.sx-panel[hidden]{display:none}',
    '.sx-panel .sx-title{margin:0 0 8px;font-weight:700;font-size:12px;letter-spacing:.04em;text-transform:uppercase;opacity:.7}',
    '.sx-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0;min-height:28px}',
    '.sx-seg{display:flex;gap:4px}',
    '.sx-seg button{min-width:34px;height:28px;border-radius:7px;border:1px solid var(--border,#cbd5e1);background:transparent;color:inherit;cursor:pointer;font-size:12px;font-weight:700}',
    '.sx-seg button[aria-pressed="true"]{background:#4f46e5;border-color:#4f46e5;color:#fff}',
    '.sx-panel input[type="checkbox"]{width:18px;height:18px;accent-color:#4f46e5}',
    '.sx-hint{margin:10px 0 0;font-size:11px;opacity:.65;line-height:1.5}',
    /* ---- injected search ---- */
    '.sx-search{position:relative;flex:1 1 220px;min-width:180px;max-width:420px}',
    '.sx-input{width:100%;padding:8px 12px;font:inherit;font-size:14px;color:var(--text,#0f172a);background:var(--surface,#fff);border:1px solid var(--border,#cbd5e1);border-radius:9px}',
    '.sx-results{position:absolute;top:calc(100% + 6px);left:0;right:0;max-height:340px;overflow:auto;background:var(--surface,#fff);border:1px solid var(--border,#cbd5e1);border-radius:12px;box-shadow:0 18px 40px rgba(15,23,42,.2);z-index:1200;padding:4px}',
    '.sx-results[hidden]{display:none}',
    '.sx-results a{display:block;padding:8px 10px;border-radius:8px;text-decoration:none;color:var(--text,#0f172a);font-size:14px;line-height:1.35}',
    '.sx-results a .sx-cat{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.04em;opacity:.6;margin-top:2px}',
    '.sx-results a[aria-selected="true"],.sx-results a:hover{background:rgba(79,70,229,.12)}',
    '.sx-results .sx-empty{padding:10px;font-size:13px;opacity:.7}',
    '.sx-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}',
    '@media (max-width:520px){.sx-panel{width:min(84vw,236px)}.sx-search{max-width:none;width:100%}}',
    '@media (prefers-reduced-motion:reduce){.sx-toggle,.sx-panel{transition:none}}'
  ].join('\n');

  function addCss() {
    if (document.getElementById('sx-css')) return;
    var s = document.createElement('style');
    s.id = 'sx-css';
    s.textContent = CSS;
    (document.head || root).appendChild(s);
  }

  // ---------- Reading toolbar ----------
  var panel = null, toggle = null;

  function buildToolbar() {
    var bar = document.createElement('div');
    bar.className = 'sx-bar';
    bar.innerHTML =
      '<button type="button" class="sx-toggle" id="sx-toggle" aria-expanded="false" aria-controls="sx-panel" aria-label="Reading settings: text size, contrast, font" title="Reading settings (Alt+R)">Aa</button>' +
      '<div class="sx-panel" id="sx-panel" role="group" aria-label="Reading settings" hidden>' +
      '<p class="sx-title">Reading</p>' +
      '<div class="sx-row"><span>Text size</span><div class="sx-seg" role="group" aria-label="Text size">' +
      '<button type="button" data-size="sm" aria-pressed="false" aria-label="Normal text size">A</button>' +
      '<button type="button" data-size="lg" aria-pressed="false" aria-label="Larger text">A+</button>' +
      '<button type="button" data-size="xl" aria-pressed="false" aria-label="Largest text">A++</button>' +
      '</div></div>' +
      '<label class="sx-row"><span>High contrast</span><input type="checkbox" id="sx-contrast"></label>' +
      '<label class="sx-row"><span>Readable font</span><input type="checkbox" id="sx-readable"></label>' +
      '<p class="sx-hint">Saved in this browser only. Keyboard shortcut: Alt+R.</p>' +
      '</div>';
    document.body.appendChild(bar);
    toggle = document.getElementById('sx-toggle');
    panel = document.getElementById('sx-panel');

    panel.addEventListener('change', function (e) {
      var t = e.target;
      if (t.id === 'sx-contrast') prefs.contrast = !!t.checked;
      else if (t.id === 'sx-readable') prefs.readable = !!t.checked;
      else return;
      savePrefs();
      applyPrefs();
    });

    panel.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button[data-size]') : null;
      if (!btn) return;
      var size = btn.getAttribute('data-size');
      prefs.size = (prefs.size === size || size === 'sm') ? undefined : size;
      if (!prefs.size) delete prefs.size;
      savePrefs();
      applyPrefs();
      syncControls();
    });

    toggle.addEventListener('click', function () {
      var open = panel.hidden;
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        var first = panel.querySelector('button[data-size]');
        if (first) first.focus();
      }
    });

    document.addEventListener('click', function (e) {
      if (panel.hidden) return;
      if (bar.contains(e.target)) return;
      close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) { close(); }
      if (e.altKey && (e.key === 'r' || e.key === 'R')) { e.preventDefault(); toggle.click(); }
    });

    syncControls();
  }

  function close() {
    if (!panel) return;
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  }

  function syncControls() {
    var size = prefs.size || 'sm';
    var btns = panel.querySelectorAll('button[data-size]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', btns[i].getAttribute('data-size') === size ? 'true' : 'false');
    }
    document.getElementById('sx-contrast').checked = !!prefs.contrast;
    document.getElementById('sx-readable').checked = !!prefs.readable;
  }

  // ---------- Universal calculator search ----------
  var catalogPromise = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      // Match by PATH, not by the literal attribute: the shell ships
      // "js/smart-search.js" while callers ask for "/js/smart-search.js", so an
      // exact selector missed the existing tag and injected a SECOND copy of a
      // classic script — which re-declares its top-level consts and throws
      // "Identifier 'SmartSearch' has already been declared".
      var want = src.replace(/^\//, '').split('?')[0];
      var existing = null;
      var tags = document.querySelectorAll('script[src]');
      for (var i = 0; i < tags.length; i++) {
        if ((tags[i].getAttribute('src') || '').replace(/^\//, '').split('?')[0] === want) { existing = tags[i]; break; }
      }
      if (existing) {
        if (existing.getAttribute('data-sx-loaded') === '1' || document.readyState !== 'loading') return resolve();
        existing.addEventListener('load', function () { resolve(); });
        existing.addEventListener('error', function () { reject(new Error('load failed')); });
        return;
      }
      var el = document.createElement('script');
      var v = document.documentElement && document.documentElement.getAttribute('data-asset-version');
      el.src = v && !/[?&]v=/.test(src) ? src + (src.indexOf('?') === -1 ? '?' : '&') + 'v=' + v : src;
      el.async = true;
      el.addEventListener('load', function () { el.setAttribute('data-sx-loaded', '1'); resolve(); });
      el.addEventListener('error', function () { reject(new Error('load failed: ' + src)); });
      (document.head || root).appendChild(el);
    });
  }

  function ensureCatalog() {
    if (window.SmartSearch && window.TOOL_CATALOG) return Promise.resolve(true);
    if (!catalogPromise) {
      catalogPromise = loadScript('/js/tool-catalog.js')
        .then(function () { return loadScript('/js/smart-search.js'); })
        .then(function () { return !!(window.SmartSearch && window.TOOL_CATALOG); })
        .catch(function () { return false; });
    }
    return catalogPromise;
  }

  function buildSearch() {
    if (document.getElementById('home-search') || document.querySelector('.nav-search')) return;
    var header = document.querySelector('header') || document.querySelector('.site-header');
    var main = document.querySelector('main') || document.getElementById('mainContent');
    if (!header && !main) return;

    var host = document.createElement('div');
    host.className = 'sx-search';
    host.innerHTML =
      '<label class="sx-sr" for="sx-q">Search calculators</label>' +
      '<input class="sx-input" id="sx-q" type="search" placeholder="Search calculators…" autocomplete="off" ' +
      'role="combobox" aria-expanded="false" aria-controls="sx-results" aria-autocomplete="list">' +
      '<div class="sx-results" id="sx-results" role="listbox" aria-label="Calculator results" hidden></div>';

    if (header) header.appendChild(host);
    else main.insertBefore(host, main.firstChild);

    var input = host.querySelector('#sx-q');
    var results = host.querySelector('#sx-results');
    var items = [];
    var active = -1;
    var timer = null;

    function hide() {
      results.hidden = true;
      results.innerHTML = '';
      items = [];
      active = -1;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    }

    function show(list, query) {
      results.innerHTML = '';
      items = [];
      active = -1;
      if (!list.length) {
        var empty = document.createElement('p');
        empty.className = 'sx-empty';
        empty.textContent = 'No calculator matches “' + query + '”. Try “loan EMI”, “BMI” or “percentage”.';
        results.appendChild(empty);
      } else {
        list.forEach(function (r, i) {
          var a = document.createElement('a');
          a.href = '/' + r.cat + '/' + r.id + '/';
          a.id = 'sx-opt-' + i;
          a.setAttribute('role', 'option');
          a.textContent = r.name;
          var c = document.createElement('span');
          c.className = 'sx-cat';
          c.textContent = (r.cat || '').replace(/-/g, ' ');
          a.appendChild(c);
          results.appendChild(a);
          items.push(a);
        });
      }
      results.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }

    // A sentence like "emi on 5 lakh for 20 years" matches no tool name, so the
    // matcher sees only the words that name a calculator. Keeps the search
    // useful on guide/blog pages, where there is no parser to prefill inputs.
    function matchable(q) {
      var stripped = String(q)
        .replace(/[₹$€£%]/g, ' ')
        .replace(/\d+(?:[.,]\d+)?/g, ' ')
        .replace(/\b(k|thousand|lakh|lakhs|lac|lacs|million|mn|crore|crores|cr|billion|bn|percent|pct|years?|yrs?|months?|weeks?|days?|kg|kgs|cm|mm|ft|feet|pounds?|lbs?|dollars?|rupees?|rs|usd|pkr|inr|eur|gbp|aed)\b/g, ' ')
        .replace(/\b(on|for|at|with|the|my|is|of|a|an|and|to|in|per|how|much|many|calculate|calculator|compute|what|please)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return stripped;
    }

    function run() {
      var q = input.value.trim();
      if (q.length < 2) { hide(); return; }
      ensureCatalog().then(function (ok) {
        if (!ok || !window.SmartSearch) { hide(); return; }
        var list = [];
        try {
          var cat = window.SmartSearch.buildCatalog(window.TOOL_CATALOG);
          var qm = matchable(q) || q;
          list = window.SmartSearch.search(qm, cat, { limit: 7 });
          if (!list.length && qm !== q) list = window.SmartSearch.search(q, cat, { limit: 7 });
        } catch (e) { list = []; }
        show(list, q);
      });
    }

    input.addEventListener('focus', function () { ensureCatalog(); });
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(run, 120);
    });
    input.addEventListener('keydown', function (e) {
      if (results.hidden || !items.length) {
        if (e.key === 'Enter') run();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var dir = e.key === 'ArrowDown' ? 1 : -1;
        active = (active + dir + items.length) % items.length;
        items.forEach(function (a, i) { a.setAttribute('aria-selected', i === active ? 'true' : 'false'); });
        input.setAttribute('aria-activedescendant', items[active].id);
        items[active].scrollIntoView({ block: 'nearest' });
        return;
      }
      if (e.key === 'Enter' && active >= 0) {
        e.preventDefault();
        window.location.href = items[active].href;
      }
      if (e.key === 'Escape') { hide(); }
    });
    document.addEventListener('click', function (e) {
      if (!host.contains(e.target)) hide();
    });
  }

  // Email links are authored as href="/contact" data-email="…" instead of a
  // static mailto:. Cloudflare's Email Address Obfuscation rewrites every static
  // mailto into /cdn-cgi/l/email-protection#…, which crawlers then report as a
  // broken internal link on every page that has one. A data-email attribute is
  // not touched by the edge, and this handler opens the mail client on click;
  // with JS off the link still lands on the contact page.
  function initEmailLinks() {
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[data-email]') : null;
      if (!a) return;
      var addr = a.getAttribute('data-email');
      if (!addr) return;
      e.preventDefault();
      window.location.href = 'mailto:' + addr;
    });
  }

  function init() {
    applyPrefs();
    addCss();
    initEmailLinks();
    if (document.body) buildToolbar(); else document.addEventListener('DOMContentLoaded', buildToolbar);
    buildSearch();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
