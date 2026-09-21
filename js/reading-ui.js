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

  // ---------- boot ----------
  function init() {
    var content = document.querySelector('.tool-content, article, main');
    var docH = document.documentElement.scrollHeight;
    if (docH - window.innerHeight > R.SCROLL_THRESHOLD) {
      buildToolbar();
      buildProgress();
      buildJumpBtn();
      buildToc(content);
      window.addEventListener('scroll', requestAnimationFrameWrap(onScroll), { passive: true });
      onScroll();
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
