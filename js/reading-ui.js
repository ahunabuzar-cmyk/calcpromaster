// ============================================================
// Reading UI wiring (S8) — browser-side counterpart of reading.js.
// Injects: reading toolbar (spacing/dyslexia/format/print/distraction-free),
// TOC sidebar with scroll-spy, reading progress bar, jump-to-input button.
// Loaded deferred; every DOM step guarded; Node-safe (no-op).
// Additive: reads/writes only calcpro_reading_* keys.
// ============================================================
(function () {
  'use strict';
  if (typeof document === 'undefined') return; // Node/test safety

  var R = window.Reading;
  if (!R) return;

  var prefs = R.loadPrefs();
  var uiBuilt = false;

  function $(sel, el) { return (el || document).querySelector(sel); }

  // ---------- apply persisted prefs ----------
  function applyPrefs() {
    var de = document.documentElement;
    de.style.setProperty('--reading-lh', String(prefs.lineHeight));
    de.style.setProperty('--reading-ls',
      prefs.letterSpacing === 'wide' ? '0.03em' : prefs.letterSpacing === 'wider' ? '0.07em' : 'normal');
    R.applyDyslexic(document, prefs.dyslexic);
    de.setAttribute('data-numfmt', prefs.numberFormat);
  }

  // ---------- toolbar ----------
  function buildToolbar() {
    if ($('#reading-toolbar')) return;
    var bar = document.createElement('div');
    bar.id = 'reading-toolbar';
    bar.hidden = true; // shown on long pages only
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Reading options');
    bar.innerHTML =
      '<button type="button" data-act="lh" title="Line height" aria-label="Increase line height">A↕</button>' +
      '<button type="button" data-act="ls" title="Letter spacing" aria-label="Adjust letter spacing">A⇔</button>' +
      '<button type="button" data-act="dys" role="switch" aria-checked="' + prefs.dyslexic + '" title="Dyslexia-friendly font" aria-label="Dyslexia-friendly font">Dys</button>' +
      '<button type="button" data-act="fmt" title="Number format: ' + prefs.numberFormat + '" aria-label="Number format">#,##0</button>' +
      '<button type="button" data-act="collapse" aria-pressed="false" title="Collapse long sections" aria-label="Collapse long sections">⊟</button>' +
      '<button type="button" data-act="tabs" aria-pressed="false" title="Organize sections as tabs" aria-label="Organize sections as tabs">▤ Tabs</button>' +
      '<button type="button" data-act="print" title="Print view" aria-label="Print this page">⎙</button>' +
      '<button type="button" data-act="zen" title="Distraction-free reading" aria-label="Distraction-free reading">Zen</button>';
    document.body.appendChild(bar);
    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'lh') {
        prefs.lineHeight = R.nextLineHeight(prefs.lineHeight, 1);
      } else if (act === 'ls') {
        prefs.letterSpacing = R.nextLetterSpacing(prefs.letterSpacing, 1);
      } else if (act === 'dys') {
        prefs.dyslexic = !prefs.dyslexic;
        btn.setAttribute('aria-checked', String(prefs.dyslexic));
      } else if (act === 'fmt') {
        var i = R.NUMBER_FORMATS.indexOf(prefs.numberFormat);
        prefs.numberFormat = R.NUMBER_FORMATS[(i + 1) % R.NUMBER_FORMATS.length];
        btn.title = 'Number format: ' + prefs.numberFormat;
        document.documentElement.setAttribute('data-numfmt', prefs.numberFormat);
        document.dispatchEvent(new CustomEvent('reading:numfmt', { detail: prefs.numberFormat }));
      } else if (act === 'collapse') {
        var wrapped = !document.body.hasAttribute('data-collapsed-sections');
        applyCollapsibleSections(wrapped);
        btn.setAttribute('aria-pressed', String(wrapped));
      } else if (act === 'tabs') {
        var tabbed = !document.body.hasAttribute('data-tabbed-sections');
        applyTabbedSections(tabbed);
        btn.setAttribute('aria-pressed', String(tabbed));
      } else if (act === 'print') {
        document.body.classList.add('print-view');
        window.print();
        setTimeout(function () { document.body.classList.remove('print-view'); }, 800);
        return;
      } else if (act === 'zen') {
        var on = !document.body.hasAttribute('data-reading-mode');
        R.applyDistractionFree(document, on);
        btn.setAttribute('aria-pressed', String(on));
        return; // zen doesn't persist
      }
      R.savePrefs(prefs);
      applyPrefs();
    });
  }

  // ---------- progress bar ----------
  function buildProgress() {
    if ($('#reading-progress')) return;
    var p = document.createElement('div');
    p.id = 'reading-progress';
    p.setAttribute('aria-hidden', 'true');
    var fill = document.createElement('div');
    fill.className = 'rp-fill';
    p.appendChild(fill);
    document.body.appendChild(p);
  }

  // ---------- TOC ----------
  function buildToc(container) {
    if (!container || $('#toc-sidebar')) return;
    var items = R.buildToc(container);
    if (items.length < 3) return; // not worth a sidebar
    var aside = document.createElement('nav');
    aside.id = 'toc-sidebar';
    aside.setAttribute('aria-label', 'On this page');
    var h = document.createElement('h2');
    h.textContent = 'On this page';
    aside.appendChild(h);
    var ul = document.createElement('ul');
    items.forEach(function (it) {
      var li = document.createElement('li');
      li.className = 'toc-' + it.level;
      var a = document.createElement('a');
      a.href = '#' + it.id;
      a.textContent = it.text;
      li.appendChild(a);
      ul.appendChild(li);
    });
    aside.appendChild(ul);
    var main = document.querySelector('main') || document.body;
    main.insertBefore(aside, main.firstChild);
  }

  // ---------- jump-to-input ----------
  function buildJumpBtn() {
    if ($('#jump-to-input')) return;
    var b = document.createElement('button');
    b.id = 'jump-to-input';
    b.type = 'button';
    b.hidden = true;
    b.textContent = '↑ Inputs';
    b.setAttribute('aria-label', 'Jump back to calculator inputs');
    b.addEventListener('click', function () {
      var t = $('#calculator-app, #tool-form, .calc-form, form');
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    document.body.appendChild(b);
  }

  // ---------- scroll effects (single rAF listener) ----------
  function onScroll() {
    var docH = document.documentElement.scrollHeight;
    var vh = window.innerHeight;
    var y = window.scrollY || 0;
    var pct = R.progressPercent(y, docH, vh);
    var bar = $('#reading-progress .rp-fill');
    if (bar) bar.style.width = pct + '%';
    var long = docH - vh > R.SCROLL_THRESHOLD;
    var tb = $('#reading-toolbar');
    if (tb) tb.hidden = !long;
    var jb = $('#jump-to-input');
    if (jb) jb.hidden = !(long && y > R.SCROLL_THRESHOLD);
    syncStickyCalc();
    spyToc(y, vh);
  }

  function spyToc(y, vh) {
    var links = document.querySelectorAll('#toc-sidebar a');
    if (!links.length) return;
    var offsets = [];
    links.forEach(function (a) {
      var el = document.getElementById(a.getAttribute('href').slice(1));
      if (el) offsets.push({ id: a.getAttribute('href').slice(1), top: el.getBoundingClientRect().top + y });
    });
    var active = R.activeSection(offsets, y, vh);
    links.forEach(function (a) {
      var on = a.getAttribute('href') === '#' + active;
      a.classList.toggle('toc-active', on);
      if (on) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  }

  // ---------- #56 collapsible sections (user-optional, SEO-safe) ----------
  // Wraps long .explain-card sections (skip FAQ+review) in <details open>:
  // content stays in the DOM and crawlers see everything; the toggle only
  // shortens the page on demand.
  function applyCollapsibleSections(on) {
    if (on) {
      var cards = document.querySelectorAll('.explain-card.seo-guide');
      var wrapped = 0;
      cards.forEach(function (card) {
        if (card.dataset.collapsibleDone || card.querySelector('.seo-faqs, .tool-review-block')) return;
        var h2 = card.querySelector('h2');
        var title = h2 ? h2.textContent : 'Section';
        var details = document.createElement('details');
        details.className = 'collapsible';
        details.open = true;
        var summary = document.createElement('summary');
        summary.textContent = title;
        details.appendChild(summary);
        while (card.firstChild) details.appendChild(card.firstChild);
        card.appendChild(details);
        card.dataset.collapsibleDone = '1';
        wrapped++;
      });
      if (wrapped) document.body.setAttribute('data-collapsed-sections', 'on');
    } else {
      document.querySelectorAll('details.collapsible').forEach(function (d) {
        var card = d.closest('.explain-card');
        if (card && card.dataset.collapsibleDone) {
          while (d.firstChild) card.insertBefore(d.firstChild, d);
          d.remove();
          delete card.dataset.collapsibleDone;
        }
      });
      document.body.removeAttribute('data-collapsed-sections');
    }
  }

  // ---------- #57 tab organization (user-optional, SEO-safe) ----------
  // Groups sibling .explain-card sections into an accessible tablist built by
  // Reading.makeTabs. The prerendered HTML ships all sections visible; hiding
  // only happens client-side on user request. Re-expanding restores the DOM.
  function applyTabbedSections(on) {
    var cards = Array.prototype.slice.call(document.querySelectorAll('.explain-card.seo-guide'));
    if (on && cards.length >= 2) {
      var anchorParent = cards[0].parentNode;
      var anchorNext = cards[0];
      var sections = cards.map(function (card) {
        var h2 = card.querySelector('h2');
        return { title: h2 ? h2.textContent : 'Section', card: card };
      });
      var html = R.makeTabs(sections.map(function (s) { return { title: s.title, html: '' }; }));
      var holder = document.createElement('div');
      holder.id = 'cpm-section-tabs';
      holder.innerHTML = html;
      var tablist = holder.querySelector('[role=tablist]');
      var panels = holder.querySelectorAll('[role=tabpanel]');
      anchorParent.insertBefore(holder, anchorNext); // insert BEFORE moving cards in
      cards.forEach(function (card, i) {
        var panel = panels[i];
        if (!panel) return;
        panel.appendChild(card);
        if (i > 0) panel.hidden = true;
        tablist.appendChild(holder.querySelector('#' + panel.id + '-tab'));
      });
      wireTabKeys(holder, sections.length);
      document.body.setAttribute('data-tabbed-sections', 'on');
    } else if (!on) {
      var holderEl = document.getElementById('cpm-section-tabs');
      if (holderEl) {
        var parent = holderEl.parentNode;
        Array.prototype.slice.call(holderEl.querySelectorAll('.explain-card')).forEach(function (card) {
          parent.insertBefore(card, holderEl);
          card.hidden = false;
        });
        holderEl.remove();
      }
      document.body.removeAttribute('data-tabbed-sections');
    }
  }

  function wireTabKeys(holder, count) {
    var tablist = holder.querySelector('[role=tablist]');
    if (!tablist) return;
    var tabs = tablist.querySelectorAll('[role=tab]');
    tablist.addEventListener('keydown', function (e) {
      var current = -1;
      tabs.forEach(function (t, i) { if (t.getAttribute('tabindex') === '0') current = i; });
      var dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      var next = R.nextTabIndex(tabs.length, current, dir);
      tabs.forEach(function (t, i) {
        var on = i === next;
        t.setAttribute('tabindex', on ? '0' : '-1');
        t.setAttribute('aria-selected', String(on));
        t.classList.toggle('tab-active', on);
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      tabs[next].focus();
    });
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        tabs.forEach(function (o) {
          var on = o === t;
          o.setAttribute('aria-selected', String(on));
          o.setAttribute('tabindex', on ? '0' : '-1');
          var panel = document.getElementById(o.getAttribute('aria-controls'));
          if (panel) panel.hidden = !on;
        });
      });
    });
  }

  // ---------- #58 sticky calculator bar (long calculator pages) ----------
  // A compact bar showing the last result, fixed to the viewport bottom,
  // appearing only after the real calculator has scrolled out of view.
  function buildStickyCalc() {
    if ($('#cpm-sticky-calc') || !document.getElementById('calc-form')) return;
    var bar = document.createElement('div');
    bar.id = 'cpm-sticky-calc';
    bar.hidden = true;
    bar.setAttribute('role', 'status');
    bar.innerHTML =
      '<span class="sc-result" aria-live="polite">—</span>' +
      '<span class="sc-actions">' +
      '<button type="button" data-act="edit">✏️ Edit inputs</button>' +
      '<button type="button" data-act="share">🔗 Share</button>' +
      '<button type="button" data-act="print">⎙</button>' +
      '</span>';
    document.body.appendChild(bar);
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]');
      if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'edit') {
        var f = document.getElementById('calc-form');
        if (f) f.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (act === 'share') {
        if (window.App && typeof App.shareTool === 'function') App.shareTool();
      } else if (act === 'print') {
        document.body.classList.add('print-view');
        window.print();
        setTimeout(function () { document.body.classList.remove('print-view'); }, 800);
      }
    });
  }

  function syncStickyCalc() {
    var bar = $('#cpm-sticky-calc');
    var form = document.getElementById('calc-form');
    var res = document.querySelector('#result .result-main, .result-main');
    if (!bar || !form) return;
    var y = window.scrollY || 0;
    var r = form.getBoundingClientRect();
    var outOfView = r.bottom < 0;
    bar.hidden = !outOfView;
    if (outOfView && res) {
      var txt = (res.textContent || '').trim();
      if (txt) bar.querySelector('.sc-result').textContent = txt;
    }
  }

  // ---------- #83 one-handed mode (phone: controls in thumb reach) ----------
  function applyOneHanded(on) {
    if (on) document.documentElement.setAttribute('data-one-handed', 'on');
    else document.documentElement.removeAttribute('data-one-handed');
    prefs.oneHanded = on;
    R.savePrefs(prefs);
  }

  // ---------- boot ----------
  function init() {
    var content = document.querySelector('.tool-content, article, main');
    var docH = document.documentElement.scrollHeight;
    if (docH - window.innerHeight > R.SCROLL_THRESHOLD) {
      buildToolbar();
      buildProgress();
      buildJumpBtn();
      buildToc(content);
      buildStickyCalc();
      window.addEventListener('scroll', requestAnimationFrameWrap(onScroll), { passive: true });
      onScroll();
    }
    // one-handed toggle (S11 #83): mobile only, persisted
    if (window.matchMedia && window.matchMedia('(max-width: 640px)').matches && !$('#cpm-one-handed-toggle')) {
      var oh = document.createElement('button');
      oh.id = 'cpm-one-handed-toggle';
      oh.type = 'button';
      oh.textContent = '☝️';
      oh.title = 'One-handed mode';
      oh.setAttribute('aria-label', 'Toggle one-handed layout mode');
      oh.setAttribute('aria-pressed', String(!!prefs.oneHanded));
      oh.addEventListener('click', function () {
        var on = !document.documentElement.hasAttribute('data-one-handed');
        applyOneHanded(on);
        oh.setAttribute('aria-pressed', String(on));
      });
      document.body.appendChild(oh);
      if (prefs.oneHanded) applyOneHanded(true);
    }
    applyPrefs();
    uiBuilt = true;
  }

  function requestAnimationFrameWrap(fn) {
    var ticking = false;
    return function (e) {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; fn(e); });
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
