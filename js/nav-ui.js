// ============================================================
// Nav/Comfort/Decide UI wiring (S9-S12) — browser-side glue.
//  - #62 Recently Viewed: records tool visits, renders widget on home
//  - #63 scroll-to-top button (created lazily)
//  - #64 mini-header shrink on scroll
//  - #71 result pulse throttle
//  - #74 grid/list toggle on category pages
//  - #84 guided wizard ("Which calculator do I need?")
//  - #87 one-line summary + #89 estimate note injection into result area
// All deferred; Node-safe; only calcpro_* namespaced keys.
// ============================================================
(function () {
  'use strict';
  if (typeof document === 'undefined') return;

  var N = window.NavComfort;
  var D = window.Decide;
  if (!N || !D) return;

  function $(s, el) { return (el || document).querySelector(s); }

  // ---------- #62 recently viewed ----------
  var RECENT_KEY = N.KEYS.recent;

  function recordRecent() {
    var m = location.pathname.match(/^\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/i);
    if (!m) return;
    var id = m[2], cat = m[1];
    var name = (document.title || '').split(/[:|—-]/)[0].trim() || id;
    var list;
    try { list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch (e) { list = []; }
    list = N.dedupeRecent(N.pushRecent(list, { id: id, cat: cat, name: name }), 30000, Date.now());
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch (e) { /* private mode */ }
  }

  function renderRecentWidget() {
    var host = document.getElementById('recent-widget-host');
    if (!host) return;
    var list;
    try { list = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch (e) { list = []; }
    if (!list.length) {
      var es = N.emptyState('recent');
      host.innerHTML = '<div class="empty-state"><p><strong>' + es.title + '</strong></p><p>' + es.body + '</p></div>';
      return;
    }
    var html = '<ul class="recent-list">';
    for (var i = 0; i < Math.min(6, list.length); i++) {
      var e = list[i];
      html += '<li><a href="/' + e.cat + '/' + e.id + '">' + e.name + '</a></li>';
    }
    host.innerHTML = html + '</ul>';
  }

  // ---------- #63 scroll-to-top ----------
  // NOTE: #63 already has a working controller in index.html (opacity-based).
  // We do NOT bind a second one — two controllers would fight over the node.
  function wireScrollTop() { /* handled by existing inline logic */ }

  // ---------- #64 mini-header ----------
  function wireMiniHeader() {
    var hd = document.querySelector('header');
    if (!hd) return;
    var lastY = window.scrollY, tick = false;
    window.addEventListener('scroll', function () {
      if (tick) return;
      tick = true;
      requestAnimationFrame(function () {
        tick = false;
        var st = N.headerShrinkState(window.scrollY, lastY);
        lastY = window.scrollY;
        hd.classList.toggle('hdr-shrink', st.shrink && !st.hide);
        hd.classList.toggle('hdr-hide', st.hide);
      });
    }, { passive: true });
  }

  // ---------- #71 result pulse ----------
  var lastPulse = 0;
  document.addEventListener('calcpro:result', function (e) {
    var box = document.querySelector('.result-card, .result-box, #result');
    if (!box) return;
    var now = Date.now();
    if (!N.shouldPulse(lastPulse, now)) return;
    lastPulse = now;
    box.classList.remove('result-pulse');
    void box.offsetWidth; // restart animation
    box.classList.add('result-pulse');
    setTimeout(function () { box.classList.remove('result-pulse'); }, 1200);
  });

  // ---------- #74 grid/list toggle ----------
  function wireViewToggle() {
    var grid = document.getElementById('tools-grid') || document.querySelector('.category-grid');
    if (!grid) return;
    var mode = 'grid';
    try { mode = N.normalizeViewMode(localStorage.getItem(N.KEYS.viewMode)); } catch (e) { /* default */ }
    apply(mode);
    var bar = document.createElement('div');
    bar.className = 'view-toggle';
    bar.innerHTML =
      '<button type="button" data-mode="grid" aria-pressed="' + (mode === 'grid') + '" aria-label="Grid view">▦</button>' +
      '<button type="button" data-mode="list" aria-pressed="' + (mode === 'list') + '" aria-label="List view">☰</button>';
    grid.parentNode.insertBefore(bar, grid);
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-mode]');
      if (!b) return;
      mode = b.getAttribute('data-mode');
      try { localStorage.setItem(N.KEYS.viewMode, JSON.stringify(mode)); } catch (err) { /* private mode */ }
      apply(mode);
      bar.querySelectorAll('button').forEach(function (x) {
        x.setAttribute('aria-pressed', String(x.getAttribute('data-mode') === mode));
      });
    });
    function apply(m) {
      grid.classList.toggle('as-list', m === 'list');
    }
  }

  // ---------- #84 wizard ----------
  var WIZARD_QS = [
    {
      q: 'What do you need to work out?',
      key: 'task',
      options: [
        { label: '💰 Money — loan, EMI, savings, retirement', value: 'money' },
        { label: '🫀 Health — weight, fitness, nutrition', value: 'health' },
        { label: '📐 Math — percentages, geometry, statistics', value: 'math' },
        { label: '🏗️ Build — concrete, paint, tiles', value: 'build' },
        { label: '🔄 Convert units', value: 'convert' },
        { label: '📅 Dates — age, deadlines, work days', value: 'date' },
      ],
    },
    {
      q: 'Which sounds closest?',
      key: 'area',
      optionsByTask: {
        money: [
          { label: 'Monthly loan/EMI payment', value: 'loan' },
          { label: 'Saving toward a goal', value: 'save' },
          { label: 'Retirement planning', value: 'plan' },
        ],
        health: [
          { label: 'Healthy weight range', value: 'weight' },
          { label: 'Calories burned', value: 'food' },
          { label: 'Gym strength (1RM)', value: 'fitness' },
        ],
        math: [
          { label: 'Percentages', value: 'algebra' },
          { label: 'Areas & geometry', value: 'geometry' },
          { label: 'Averages & statistics', value: 'stats' },
        ],
        build: [
          { label: 'Concrete volume', value: 'material' },
          { label: 'Paint coverage', value: 'area' },
          { label: 'Tiles & flooring', value: 'cost' },
        ],
        convert: [
          { label: 'Length & distance', value: 'length' },
          { label: 'Weight & mass', value: 'weight' },
          { label: 'Temperature', value: 'temp' },
        ],
        date: [
          { label: 'Age calculator', value: 'age' },
          { label: 'Days between dates', value: 'days' },
          { label: 'Business days', value: 'work' },
        ],
      },
    },
  ];

  function openWizard() {
    var data = (window.CALC_DATA) || {};
    var answers = {};
    var overlay = document.createElement('div');
    overlay.className = 'wizard-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Which calculator do I need?');
    document.body.appendChild(overlay);

    function step(i) {
      var q = WIZARD_QS[i];
      var opts = q.options || (q.optionsByTask && q.optionsByTask[answers.task]) || [];
      var html = '<div class="wizard-card"><h2>' + q.q + '</h2><div class="wizard-opts">';
      opts.forEach(function (o, oi) {
        html += '<button type="button" data-v="' + o.value + '">' + o.label + '</button>';
      });
      html += '</div>';
      if (i > 0) html += '<button type="button" class="wizard-back">← Back</button>';
      html += '<button type="button" class="wizard-close" aria-label="Close">✕</button></div>';
      overlay.innerHTML = html;

      overlay.querySelectorAll('.wizard-opts button').forEach(function (b) {
        b.addEventListener('click', function () {
          answers[q.key] = b.getAttribute('data-v');
          if (i + 1 < WIZARD_QS.length) step(i + 1);
          else finish();
        });
      });
      var back = overlay.querySelector('.wizard-back');
      if (back) back.addEventListener('click', function () { step(i - 1); });
      overlay.querySelector('.wizard-close').addEventListener('click', close);
    }

    function finish() {
      var rec = D.recommend(data, answers);
      if (rec && rec.cat && rec.id) {
        overlay.innerHTML = '<div class="wizard-card"><h2>Recommended for you</h2><p><a class="wizard-go" href="/' + rec.cat + '/' + rec.id + '">' + rec.name + '</a></p><p class="wizard-note">Not quite? Use search (Ctrl+K) — it understands plain questions.</p><button type="button" class="wizard-close" aria-label="Close">✕</button></div>';
        var go = overlay.querySelector('.wizard-go');
        go.addEventListener('click', function (ev) {
          ev.preventDefault();
          close();
          if (window.Router && window.Router.navigate) window.Router.navigate('/' + rec.cat + '/' + rec.id);
          else location.href = go.getAttribute('href');
        });
      } else {
        overlay.innerHTML = '<div class="wizard-card"><h2>Try search instead</h2><p>Describe what you need in the search box — it handles plain-language questions.</p><button type="button" class="wizard-close" aria-label="Close">✕</button></div>';
      }
      overlay.querySelector('.wizard-close').addEventListener('click', close);
    }

    function close() { overlay.remove(); }
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });
    step(0);
  }

  // Global access for delegated triggers (home re-renders its hero, so a
  // document-level listener is the only binding that survives re-renders).
  window.openCalcWizard = openWizard;
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-open-wizard]');
    if (t) { e.preventDefault(); openWizard(); }
  });

  function wireWizard() {
    var host = document.getElementById('wizard-host');
    if (!host) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'wizard-trigger';
    b.textContent = '🧭 Which calculator do I need?';
    b.addEventListener('click', openWizard);
    host.appendChild(b);
  }

  // ---------- S11 #68: mobile bottom navigation bar ----------
  // Thumb-reachable persistent bar (Home | Search | Favorites | History | Settings).
  // Adds page context via aria-current; hidden site-wide via CSS on desktop and
  // when the viewport exceeds 820px. All actions are real navigation/APIs —
  // no dead buttons.
  function renderBottomNav() {
    if (document.getElementById('cpm-bottom-nav')) return;
    var nav = document.createElement('nav');
    nav.id = 'cpm-bottom-nav';
    nav.className = 'cpm-bottom-nav';
    nav.setAttribute('aria-label', 'Mobile navigation');
    var items = [
      { href: '/', icon: '⌂', label: 'Home', key: 'home' },
      { act: 'search', icon: '🔍', label: 'Search', key: 'search' },
      { href: '/favorites', icon: '★', label: 'Favorites', key: 'favorites' },
      { href: '/history', icon: '🕘', label: 'History', key: 'history' },
      { act: 'settings', icon: '⚙', label: 'Settings', key: 'settings' }
    ];
    var path = window.location.pathname.replace(/\/+$/, '') || '/';
    nav.innerHTML = items.map(function (it) {
      var current = it.href && (it.href === '/' ? path === '/' : path.indexOf(it.href) === 0);
      var inner = '<span class="bn-icon" aria-hidden="true">' + it.icon + '</span><span class="bn-label">' + it.label + '</span>';
      if (it.act === 'search') {
        return '<button type="button" class="bn-item" data-bn-act="search" aria-label="Search calculators">' + inner + '</button>';
      }
      if (it.act === 'settings') {
        return '<button type="button" class="bn-item" data-bn-act="settings" aria-label="Display preferences">' + inner + '</button>';
      }
      return '<a class="bn-item" href="' + it.href + '"' + (current ? ' aria-current="page"' : '') + '>' + inner + '</a>';
    }).join('');
    document.body.appendChild(nav);
    nav.addEventListener('click', function (e) {
      var b = e.target.closest('[data-bn-act]');
      if (!b) return;
      e.preventDefault();
      if (b.getAttribute('data-bn-act') === 'search') {
        var searchInput = document.getElementById('tool-search') || document.querySelector('input[type="search"]');
        if (searchInput) { searchInput.focus(); searchInput.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
        else if (window.App && typeof App.openPalette === 'function') App.openPalette();
      } else if (b.getAttribute('data-bn-act') === 'settings') {
        if (window.AdvancedFeatures && typeof AdvancedFeatures.renderUnitsSettings === 'function') AdvancedFeatures.renderUnitsSettings();
      }
    });
  }

  // ---------- #82 pull-to-refresh (list pages only, via Decide gate) ----------
  function wirePullToRefresh() {
    var D = window.Decide;
    if (!D || typeof D.pullToRefreshAllowed !== 'function') return;
    if (!window.matchMedia || !window.matchMedia('(max-width: 640px)').matches) return; // touch/mobile context
    var path = location.pathname;
    var kind = path === '/' ? 'home' : path.indexOf('/guides') === 0 ? 'guides'
      : /^\/[a-z0-9-]+\/?$/.test(path) ? 'category' : null;
    if (!D.pullToRefreshAllowed(kind, 0)) return;
    var startY = null, pulling = false;
    var indicator = null;
    function showIndicator(pct) {
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'cpm-ptr';
        indicator.setAttribute('aria-hidden', 'true');
        document.body.appendChild(indicator);
      }
      indicator.style.transform = 'translateY(' + Math.round(pct * 48) + 'px)';
      indicator.style.opacity = pct > 0.15 ? '1' : '0';
    }
    document.addEventListener('touchstart', function (e) {
      startY = (e.touches[0] && e.touches[0].clientY) || null;
      pulling = (window.scrollY || 0) <= 0 && startY !== null;
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (!pulling) return;
      var dy = (e.touches[0].clientY - startY);
      if (dy <= 0) { showIndicator(0); return; }
      showIndicator(Math.min(dy / 120, 1));
    }, { passive: true });
    document.addEventListener('touchend', function () {
      if (pulling) showIndicator(0);
      pulling = false;
      startY = null;
    }, { passive: true });
  }

  // ---------- #61 breadcrumb category switcher ----------
  function wireCategorySwitcher() {
    var N = window.NavComfort;
    var meta = window.CATEGORY_META;
    var crumb = document.querySelector('.breadcrumb');
    if (!N || !meta || !crumb || document.getElementById('cpm-cat-switch')) return;
    // current category = first crumb link that is a /category path
    var currentKey = null;
    crumb.querySelectorAll('a').forEach(function (a) {
      var m = (a.getAttribute('href') || '').match(/^\/([a-z0-9-]+)\/?$/);
      if (m && meta[m[1]]) currentKey = m[1];
    });
    if (!currentKey) return; // homepage/other pages keep plain breadcrumb
    var named = {};
    Object.keys(meta).forEach(function (k) { named[k] = { name: (meta[k] && meta[k].title) || k }; });
    var opts = N.buildCategoryOptions(named, currentKey);
    var sel = document.createElement('select');
    sel.id = 'cpm-cat-switch';
    sel.className = 'cpm-cat-switch';
    sel.setAttribute('aria-label', 'Switch to another category');
    sel.innerHTML = '<option value="" selected>📂 ' + currentKey + '</option>' +
      opts.map(function (o) { return '<option value="/' + o.key + '">' + o.name + '</option>'; }).join('');
    sel.addEventListener('change', function () { if (sel.value) location.assign(sel.value); });
    crumb.appendChild(sel);
  }

  // ---------- #66 related-calculators carousel ----------
  // ≥4 related cards: switch the grid to a swipeable scroll-snap row ordered
  // by NavComfort.orderRelated. Fewer items stay a plain grid.
  function enhanceRelatedCarousel() {
    var N = window.NavComfort;
    var grid = document.querySelector('.related-section .related-grid');
    if (!N || !grid || grid.dataset.carouselDone) return;
    var links = Array.prototype.slice.call(grid.querySelectorAll('a.related-card'));
    if (links.length < 4) return;
    var currentId = decodeURIComponent((location.pathname.split('/').pop() || '').replace(/\.html$/, ''));
    var items = links.map(function (a) { return { id: (a.getAttribute('href') || '').split('/').pop(), el: a }; });
    var ordered = N.orderRelated(items, currentId, 8);
    grid.classList.add('related-carousel');
    grid.dataset.carouselDone = '1';
    ordered.forEach(function (r) { grid.appendChild(r.el); });
  }

  // ---------- #75 zoom-safety classes (desktop zoom heuristic) ----------
  function applyZoomClass() {
    var N = window.NavComfort;
    if (!N) return;
    var html = document.documentElement;
    function upd() {
      var z = (window.outerWidth && window.innerWidth) ? Math.round((window.outerWidth / window.innerWidth) * 100) : 100;
      var cls = N.zoomClass(z);
      html.classList.remove('zoom-150', 'zoom-200');
      if (cls) html.classList.add(cls);
    }
    upd();
    window.addEventListener('resize', upd);
  }

  // ---------- boot ----------
  function init() {
    recordRecent();
    wireScrollTop();
    wireMiniHeader();
    renderRecentWidget();
    wireViewToggle();
    wireWizard();
    renderBottomNav();
    wirePullToRefresh();
    wireCategorySwitcher();
    enhanceRelatedCarousel();
    applyZoomClass();
    document.documentElement.setAttribute('data-navui', 'ready');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
