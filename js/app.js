// CalcPro Main App — SPA routing, tool rendering, search, theme, command palette, toasts.
const App = (function () {
  // Authoritative user-facing calculator count. The runtime ALL_TOOLS array is
  // lazy per-category on calculator pages (only loaded categories present), so
  // counts must prefer the build-time SITE_CONFIG.totalCalculators (synced from
  // the registry by scripts/sync-counts.cjs) and only fall back to ALL_TOOLS.
  function getCalculatorCount() {
    try {
      if (window.SITE_CONFIG && window.SITE_CONFIG.totalCalculators) {
        return window.SITE_CONFIG.totalCalculators;
      }
    } catch (e) {}
    return (typeof ALL_TOOLS !== 'undefined' && ALL_TOOLS.length) || 1201;
  }
  // i18n-aware text helper: returns the translated string when I18n is available,
  // falls back to the English default otherwise. Used by dynamic renders (home,
  // category, tool pages) so the WHOLE site translates, not just the header.
  function _t(key, fallback, params) {
    try {
      if (window.I18n && typeof I18n.t === 'function') {
        var s = I18n.t(key, params || {});
        if (s && s !== key) return s;
      }
    } catch (e) {}
    return fallback;
  }
  // ---------- State (shared object so App._currentTool stays in sync) ----------
  const _state = { tool: null, cat: null, related: null };
  let _searchItems = []; // keyboard-navigable home search matches
  // Unit/keyword words that must never be parsed as a location in long-tail
  // modifier URLs (e.g. /finance/loan-emi/5-years-50000 -> 'years' is a unit).
  const UNIT_WORDS = new Set(['year','years','yr','yrs','month','months','day','days',
    'week','weeks','k','m','thousand','percent','pct','dollars','dollar','usd','inr',
    'eur','gbp','for','in','of','the','a','and']);
  let _searchTimeout = null;
  let _lastCalcValues = null;
  let _pdfPrintPending = false; // one PDF print at a time (double-click guard)

  // ---------- Duplicate-tool merge redirects (SEO cannibalization fix) ----------
  // Old URLs of merged duplicate calculators forward to their canonical page so
  // Googlebot + users never hit a soft-404. Mirrors the 301 rules in _redirects.
  // Key = '<cat>/<tool-id>' of the REMOVED duplicate, value = canonical path.
  const TOOL_REDIRECTS = {
    'utilities/bmi-calc': '/health/bmi',
    'fitness/bmi-fitness': '/health/bmi',
    'utilities/percentage-calc': '/math/percentage',
    'utilities/fraction-calc': '/math/fraction',
    'utilities/ratio-calc': '/math/ratio',
    'utilities/age-calc': '/everyday/age',
    'utilities/discount-calc': '/finance/discount',
    'utilities/fuel-cost-trip': '/everyday/trip-fuel-cost',
    'utilities/time-zone': '/everyday/timezone',
    'utilities/random-number': '/math/random-generator',
    'everyday/tip-calculator': '/finance/tip',
    'everyday/tile': '/construction/tile-calculator',
    'everyday/water-intake': '/food/daily-water-intake',
    'everyday/moving-cost': '/lifestyle/relocation-cost',
    'business/cashflow': '/finance/cash-flow',
    'career/net-worth': '/finance/net-worth-calculator',
    'food/ideal-weight': '/health/ideal-body-weight',
    'family/pregnancy-due': '/health/pregnancy',
    'family/child-bmi-guide': '/family/child-bmi',
    'family/pregnancy-weight-gain': '/health/pregnancy-weight',
    'health/pregnancy-due-date': '/health/pregnancy',
    'fitness/heart-rate-zones': '/health/heart-rate',
    'fitness/macro-calc': '/health/macros'
  };
  // Strip a leading locale segment (/es/...) before matching redirect keys
  function _redirectKey(path) {
    const p = path.replace(/^\//, '');
    const seg = p.split('/');
    if (seg.length && /^[a-z]{2}$/.test(seg[0]) && seg.length >= 2) seg.shift(); // locale prefix
    return seg.join('/');
  }

  // ---------- Theme (Light / Dark / System) ----------
  const THEME_MODES = ['light', 'dark', 'system'];
  function _themeIsDark(mode) {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function _applyTheme(mode, announce) {
    const isDark = _themeIsDark(mode);
    document.body.classList.toggle('dark-theme', isDark);
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.textContent = mode === 'light' ? '☀️' : (mode === 'dark' ? '🌙' : '🖥️');
      btn.title = 'Theme: ' + mode.charAt(0).toUpperCase() + mode.slice(1);
      btn.setAttribute('aria-expanded', 'false');
    }
    // Keep browser chrome + PWA titlebar color in sync with the active theme
    const meta = document.getElementById('meta-theme-color');
    if (meta) meta.setAttribute('content', isDark ? '#0f172a' : '#4f46e5');
    document.dispatchEvent(new CustomEvent('themechange', { detail: { dark: isDark, mode: mode } }));
    if (announce) {
      const label = mode === 'system' ? 'System theme' : mode.charAt(0).toUpperCase() + mode.slice(1) + ' theme';
      showToast(label + ' enabled', 1400);
    }
  }
  function setTheme(mode) {
    if (!THEME_MODES.includes(mode)) mode = 'system';
    localStorage.setItem('calcpro_theme', mode);
    _applyTheme(mode, true);
  }
  function toggleTheme() {
    // Back-compat quick flip (dark <-> light); the nav button opens the 3-way menu
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const current = localStorage.getItem('calcpro_theme') || (prefersDark ? 'dark' : 'light');
    setTheme(current === 'dark' ? 'light' : 'dark');
  }
  function toggleThemeMenu(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const existing = document.getElementById('theme-menu');
    if (existing) {
      existing.remove();
      const b = document.getElementById('theme-toggle'); if (b) b.setAttribute('aria-expanded', 'false');
      return;
    }
    const btn = document.getElementById('theme-toggle');
    const current = localStorage.getItem('calcpro_theme') || 'system';
    const menu = document.createElement('div');
    menu.id = 'theme-menu';
    menu.className = 'theme-menu';
    menu.setAttribute('role', 'menu');
    menu.innerHTML = THEME_MODES.map(mode =>
      '<button class="theme-menu-item' + (mode === current ? ' active' : '') + '" data-mode="' + mode + '" role="menuitem" onclick="App.setTheme(\'' + mode + '\');App.toggleThemeMenu()">' +
      (mode === 'light' ? '☀️ Light' : mode === 'dark' ? '🌙 Dark' : '🖥️ System') +
      (mode === current ? ' ✓' : '') + '</button>'
    ).join('');
    if (btn) {
      btn.setAttribute('aria-expanded', 'true');
      const r = btn.getBoundingClientRect();
      menu.style.top = (r.bottom + 6) + 'px';
      menu.style.right = (window.innerWidth - r.right) + 'px';
    }
    document.body.appendChild(menu);
  }
  function loadTheme() {
    const saved = localStorage.getItem('calcpro_theme');
    const mode = THEME_MODES.includes(saved) ? saved : 'system';
    // FOUC guard: snapshot the system preference before first paint completes
    if (!saved && _themeIsDark('system')) document.body.classList.add('dark-theme');
    _applyTheme(mode, false);
    // Live-follow the OS theme while in system mode
    if (window.matchMedia) {
      try {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (ev) {
          if ((localStorage.getItem('calcpro_theme') || 'system') === 'system') _applyTheme('system', false);
        });
      } catch (e2) { /* older browsers */ }
    }
    // Close the theme menu on outside click / Escape (also reset aria-expanded)
    const _closeThemeMenu = function () {
      const m = document.getElementById('theme-menu');
      if (m) m.remove();
      const b = document.getElementById('theme-toggle');
      if (b) b.setAttribute('aria-expanded', 'false');
    };
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('#theme-menu')) return;
      if (e.target.id === 'theme-toggle') return;
      if (document.getElementById('theme-menu')) _closeThemeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.getElementById('theme-menu')) _closeThemeMenu();
    });
  }

  // ---------- Toast ----------
  function showToast(msg, duration) {
    duration = duration || 2500;
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--text);color:var(--bg);padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;z-index:9999;opacity:0;transition:opacity 0.3s;pointer-events:none;white-space:nowrap';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => { t.style.opacity = '0'; }, duration);
  }

  // ---------- Navigation (clean-path via History API) ----------
  function navigate(path) {
    // SearchAction fulfillment: /?q=loan+calculator (the target advertised in the
    // WebSite JSON-LD sitelinks searchbox) resolves to the best tool match. Runs
    // inside navigate() so it fires on boot AND on every client route pass.
    try {
      const sq = new URLSearchParams(window.location.search).get('q');
      if (sq && sq.trim()) {
        const term = sq.trim().toLowerCase();
        // S0: shared SmartSearch engine first (full registry + fuzzy + NL
        // intents); naive scorer below stays as fallback while it loads / if failed.
        let first = null;
        let catKey = null;
        const smart = ssRows(term, 1);
        if (!smart && typeof ensureSmartSearch === 'function') {
          // Engine still lazy-loading at boot: re-run this resolution once it
          // arrives. The home renderer strips ?q= from the URL and fills the
          // search box as its own fallback, so remember the term in _pendingQ
          // and only auto-redirect if the user is still parked on home.
          _pendingQ = term;
          ensureSmartSearch().then(function (ok) {
            if (!ok) { _pendingQ = null; return; }
            if (_pendingQ && window.location.pathname === '/' && !window.location.search) {
              const retry = ssRows(_pendingQ, 1);
              _pendingQ = null;
              if (retry && retry.length && retry[0].catKey) {
                const dest = '/' + retry[0].catKey + '/' + retry[0].t.id;
                history.replaceState(null, '', dest);
                navigate(dest);
              }
            } else {
              _pendingQ = null;
            }
          });
        }
        if (smart && smart.length) {
          first = smart[0].t;
          catKey = smart[0].catKey || null;
        }
        if (!first) {
          const scored = (typeof ALL_TOOLS !== 'undefined' ? ALL_TOOLS : [])
            .map(t => {
              const name = String(t.name || '').toLowerCase();
              let s = 0;
              if (name === term) s = 100;
              else if (name.indexOf(term) !== -1) s = 60;
              else if (term.split(/\s+/).every(w => name.indexOf(w) !== -1)) s = 40;
              else if (String(t.desc || '').toLowerCase().indexOf(term) !== -1) s = 20;
              return { t, s };
            })
            .filter(x => x.s > 0)
            .sort((a, b) => b.s - a.s);
          if (scored.length) {
            first = scored[0].t;
            catKey = Object.keys(CALC_DATA).find(k => CALC_DATA[k] && Array.isArray(CALC_DATA[k].tools) && CALC_DATA[k].tools.includes(first));
          }
        }
        if (first && catKey) {
          // Clean the URL (drop ?q=) and land on the tool page directly.
          history.replaceState(null, '', '/' + catKey + '/' + first.id);
          path = '/' + catKey + '/' + first.id;
        }
      }
    } catch (e) { /* search resolution must never break navigation */ }
    // Zero-leak guarantee: destroy the previous tool's timers/listeners/workers/DOM refs
    if (typeof ToolLifecycle !== 'undefined' && typeof ToolLifecycle.destroy === 'function') {
      try { ToolLifecycle.destroy(); } catch (e) { /* never let cleanup break navigation */ }
    }
    // Strip leading slash and split
    const cleanPath = path.replace(/^\//, '');
    const parts = cleanPath.split('/').filter(Boolean);
    // Clear any variant robots lock carried from the previous route. Long-tail
    // branches re-arm it via applyVariantSeo AFTER meta render, so post-calc
    // updateMeta calls keep the variant noindex instead of resetting it.
    try { document.documentElement.removeAttribute('data-robots-lock'); } catch (e) {}

    // DUPLICATE-MERGE REDIRECT: old tool URLs → canonical tool page.
    // Handles /cat/tool and /cat/tool/modifier (long-tail) both. Uses replace()
    // so the history entry is swapped (no extra back-button hop), and re-enters
    // navigate() so the canonical page renders exactly like a direct hit.
    // Locale-prefixed paths (/es/utilities/bmi-calc) are normalized via
    // _redirectKey() so the old URL still forwards on every locale.
    const redirKey = _redirectKey(cleanPath);
    const redirParts = redirKey.split('/').filter(Boolean);
    if (redirParts.length >= 2 && redirParts[0] !== 'hub') {
      const key = redirParts[0] + '/' + redirParts[1];
      const target = TOOL_REDIRECTS[key];
      if (target) {
        const modifier = redirParts.slice(2).join('-');
        const dest = modifier ? target + '/' + modifier : target;
        // Router.replace() already _notifies (→ re-enters navigate() with the
        // canonical path), so do NOT call navigate() again here — it would
        // double-render the page. history.replaceState is the no-router fallback.
        if (window.Router && typeof window.Router.replace === 'function') {
          window.Router.replace(dest);
        } else {
          history.replaceState(null, '', dest);
          navigate(dest);
        }
        return;
      }
    }

    // LAZY DATA GUARD: if this route targets a category whose data file is lazy
    // and not loaded yet, fetch it FIRST, then re-run navigation. Eager categories
    // are always ready (script tags in index.html), so this is a no-op for them.
    const lazyCatKey = (parts.length >= 1 && parts[0] !== 'hub')
      ? parts[0]
      : (parts.length >= 2 && parts[0] === 'hub' ? parts[1] : null);
    if (lazyCatKey && typeof window.DataLoader !== 'undefined' &&
        window.DataLoader.isLazy(lazyCatKey) && !window.DataLoader.isLoaded(lazyCatKey)) {
      // NOTE: isLazy() covers BOTH the 16 always-lazy categories AND eager categories
      // whose <script> tag the build trimmed from this prerendered page. isLoaded()
      // checks CALC_DATA directly, so a page that booted with its own category eager
      // skips this branch, while a trimmed category is fetched here first (same lazy
      // path), then this navigation re-runs once the data arrives.
      // RACE-CONDITION GUARD: snapshot the current URL BEFORE awaiting the load.
      // If the user navigates elsewhere while the lazy file downloads, do NOT
      // re-run this (stale) navigation when the promise resolves — it would
      // override the newer page while the URL still points at the newer route.
      const navToken = (window.Router && typeof window.Router.getPath === 'function')
        ? window.Router.getPath()
        : window.location.pathname;
      window.DataLoader.ensure(lazyCatKey).then(function (ok) {
        if (!ok) { _state.page = 'static'; renderStatic('404'); return; }
        const now = (window.Router && typeof window.Router.getPath === 'function')
          ? window.Router.getPath()
          : window.location.pathname;
        if (now !== navToken) return; // user already moved on — skip stale re-route
        // Data hydrated — re-run navigation with the same path.
        navigate(path);
      });
      return;
    }
    
    if (parts.length === 2 && parts[0] === 'hub') {
      // /hub/category — Category Hub comparison page (real computed values)
      const hubKey = parts[1];
      if (window.CategoryHub && typeof window.CategoryHub.renderCategoryHub === 'function') {
        _state.page = 'hub';
        const cat = CALC_DATA[hubKey];
        if (cat) {
          document.title = cat.name + ' Calculators Comparison — CalcPro';
          updateMeta('Compare ' + cat.name + ' calculators side by side with real computed values.', '/hub/' + hubKey);
        }
        // Refresh the cached hub data against current CALC_DATA so lazy-loaded
        // niche categories render real tool lists + comparison tables.
        if (typeof window.CategoryHub.refresh === 'function') {
          try { window.CategoryHub.refresh(); } catch (e) {}
        }
        try { window.CategoryHub.renderCategoryHub(hubKey); } catch (e) { renderStatic('404'); }
        return;
      }
    }
    if (parts.length === 2) {
      // /category/tool-id
      const catKey = parts[0];
      const toolId = parts[1];
      const cat = CALC_DATA[catKey];
      if (cat) {
        const tool = cat.tools.find(t => t.id === toolId);
        if (tool) { _state.page = 'tool'; renderTool(catKey, tool); return; }
      }
    }
    if (parts.length >= 3) {
      // Long-tail programmatic route: /category/tool/modifier
      // e.g. /finance/loan-emi/5-years-50000-florida — same tool, intent-rich URL,
      // auto-filled inputs, instantly computed result, unique title/meta for SEO.
      const catKey = parts[0];
      const toolId = parts[1];
      const modifier = parts.slice(2).join('-');
      const cat = CALC_DATA[catKey];
      if (cat) {
        const tool = cat.tools.find(t => t.id === toolId);
        if (tool) {
          _state.page = 'tool';
          renderTool(catKey, tool);
          applyModifier(tool, modifier);
          applyVariantSeo(catKey, toolId);
          return;
        }
      }
    }
    if (parts.length === 1 && parts[0]) {
      const catKey = parts[0];
      if (CALC_DATA[catKey]) { _state.page = 'category'; renderCategory(catKey); return; }
      if (STATIC_PAGES[catKey]) { _state.page = 'static'; renderStatic(catKey); return; }
    }
    if (!cleanPath || cleanPath === '' || path === '/') { _state.page = 'home'; renderHome(); return; }
    _state.page = 'static';
    renderStatic('404');
  }

  // ---------- Long-tail variant SEO guard ----------
  // Modifier routes (/cat/tool/modifier — duration/amount/geo variants) carry
  // templated, near-duplicate content. Prerendered variants ship static
  // noindex + canonical→base, but the SPA must defend BOTH cases:
  //  1) hydration of a prerendered variant (updateMeta's indexability reset
  //     would otherwise flip it back to indexable), and
  //  2) unbuilt variants served via the SPA shell (index, follow → bad).
  // Runs LAST in the long-tail branch so it wins over renderTool/updateMeta.
  function applyVariantSeo(catKey, toolId) {
    try {
      document.documentElement.setAttribute('data-robots-lock', '1');
      let robots = document.querySelector('meta[name="robots"]');
      if (!robots) {
        robots = document.createElement('meta');
        robots.setAttribute('name', 'robots');
        document.head.appendChild(robots);
      }
      robots.setAttribute('content', 'noindex, follow');
      let canon = document.querySelector('link[rel="canonical"]');
      if (!canon) {
        canon = document.createElement('link');
        canon.setAttribute('rel', 'canonical');
        document.head.appendChild(canon);
      }
      canon.setAttribute('href', window.location.origin + '/' + catKey + '/' + toolId);
    } catch (e) { /* non-fatal */ }
  }

  function navigateToTool(toolId, catKey) {
    if (catKey) {
      Router.navigate('/' + catKey + '/' + toolId);
      return;
    }
    // Find the tool in any category
    for (const [key, cat] of Object.entries(CALC_DATA)) {
      if (cat.tools.some(t => t.id === toolId)) {
        Router.navigate('/' + key + '/' + toolId);
        return;
      }
    }
    showToast('Calculator not found');
  }

  // ---------- Home ----------
  function renderHome() {
    _state.tool = null;
    _state.page = 'home'; // self-healing: language switcher re-render works no matter how we got here
    // SearchAction deep-link support: /?q=loan arrives from the site's WebSite
    // SearchAction markup (also powers browser/answer-engine site search boxes).
    // Route it into the homepage search UI instead of ignoring the query.
    try {
      const qParam = new URLSearchParams(window.location.search).get('q');
      if (qParam && String(qParam).trim()) {
        const term = String(qParam).trim().slice(0, 100);
        window.history.replaceState(null, '', window.location.pathname);
        setTimeout(function () {
          try {
            const box = document.getElementById('home-search');
            if (box) {
              box.value = term;
              box.focus();
              if (typeof App !== 'undefined' && App.homeSearch) App.homeSearch(term);
            }
          } catch (e) { /* non-fatal */ }
        }, 60);
      }
    } catch (e) { /* non-fatal */ }
    const main = document.getElementById('mainContent');
    if (!main) return;
    
    document.title = STATIC_PAGES[''].title;
    updateMeta(STATIC_PAGES[''].desc, '/');
    
    const favs = AdvancedFeatures.getFavorites();
    const history = CalcHistory.getAll();
    const recentTools = history.slice(0, 5);
    const popular = CalcAnalytics.getPopular().slice(0, 8);
    
    // Hero with lightweight canvas particle animation behind content
    // (zero-dependency, pauses when hidden, honors reduced-motion).
    // PERFORMANCE: if the static hero from index.html is still in the DOM (first
    // home render right after boot), REUSE that node instead of rebuilding it —
    // recreating the <h1> would start a NEW LCP candidate and push Largest
    // Contentful Paint to the end of boot (~10s on throttled mobile). The static
    // markup is byte-identical to this string.
    const existingHero = main.querySelector('.hero');
    let html = '';
    if (!existingHero) {
      html = '<div class="hero" style="position:relative;overflow:hidden">';
      html += '<canvas id="hero-canvas" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></canvas>';
      html += '<div class="hero-content" style="position:relative;z-index:1">';
      html += '<h1>CalcPro — <span class="highlight">' + getCalculatorCount() + '+</span> Free Online Calculators</h1>';
      html += '<p class="hero-desc">Free, fast, and accurate calculators with step-by-step solutions, charts, and smart features.</p>';
      html += '<div class="search-box">';
      html += '<input type="text" id="home-search" placeholder="Search ' + getCalculatorCount() + '+ calculators…" oninput="App.homeSearch(this.value)" onkeydown="App.searchKeyNav(event)" autocomplete="off" role="combobox" aria-expanded="false" aria-label="Search calculators">';
      html += '<div id="search-skeleton" class="search-skeleton" hidden aria-hidden="true"><span class="sk-line"></span><span class="sk-line"></span><span class="sk-line"></span></div>';
      html += '<div class="search-results" id="homeSearchResults"></div>';
      html += '</div>';
      // S12 #84 — guided wizard trigger (opens the 2-question picker)
      html += '<div style="margin-top:14px"><button type="button" class="wizard-trigger" data-open-wizard>🧭 Which calculator do I need?</button></div>';
      html += '</div></div>';
    }
    
    // Calculator of the Day + Daily Tip — built INLINE (single render pass).
    // Late injection after mainContent.innerHTML would push the categories grid
    // down ~300px after first paint → layout shift (CLS) on mobile.
    let _codHTML = '', _tipHTML = '';
    if (window.CalculatorOfTheDay && typeof CalculatorOfTheDay.buildSpotlightHTML === 'function') {
      try { _codHTML = CalculatorOfTheDay.buildSpotlightHTML('calc-of-day-spotlight') || ''; } catch (e) { /* non-fatal */ }
    }
    if (window.AdvancedFeatures && typeof AdvancedFeatures.buildDailyTipHTML === 'function') {
      try { _tipHTML = AdvancedFeatures.buildDailyTipHTML() || ''; } catch (e) { /* non-fatal */ }
    }
    html += '<div id="calc-of-day-spotlight">' + _codHTML + '</div>';
    
    // Daily Tip
    html += '<div id="daily-tip-widget">' + _tipHTML + '</div>';
    
    // S7: seasonal promotion banner (date-based config; empty off-season)
    try {
      if (window.Engagement) {
        const banner = Engagement.renderSeasonalBanner();
        if (banner) html += banner;
      }
    } catch (e) { /* non-fatal */ }
    
    // Favorites bar
    if (favs.length > 0) {
      html += '<div class="favorites-bar" id="favorites-bar">';
      html += '<span style="font-size:14px;font-weight:600;margin-right:4px">★</span>';
      favs.slice(0, 8).forEach(f => {
        // XSS-hardening: favorites from localStorage — escape onclick args + text
        html += `<button class="recent-chip" onclick="App.navigateToTool('${Security.sanitizeJsString(f.id)}','${Security.sanitizeJsString(f.cat)}')">${Security.sanitizeHtml(f.name)}</button>`;
      });
      html += '</div>';
    }
    
    // Recently Viewed
    if (recentTools.length > 0) {
      html += '<h2 class="section-title">' + _t('home.recently_viewed', 'Recently Viewed') + '</h2>';
      html += '<div class="recent-bar">';
      recentTools.forEach(h => {
        // XSS-hardening: history entries can carry crafted values — escape id/name before inlining
        html += `<button class="recent-chip" onclick="App.navigateToTool('${Security.sanitizeHtml(h.toolId)}','${Security.sanitizeHtml(h.catKey)}')">${Security.sanitizeHtml(h.toolName || h.toolId)}</button>`;
      });
      html += '</div>';
    }
    
    // Most Used
    if (popular.length > 0) {
      html += '<h2 class="section-title">' + _t('home.most_used', 'Most Used') + '</h2>';
      html += '<div class="recent-bar">';
      popular.forEach(id => {
        const t = TOOL_MAP[id];
        if (t) {
          const catKey = Object.entries(CALC_DATA).find(([k,c]) => c.tools.some(tc => tc.id === id))?.[0];
          // XSS-hardening: analytics ids from localStorage — escape onclick args + text
          html += `<button class="recent-chip" onclick="App.navigateToTool('${Security.sanitizeJsString(id)}','${Security.sanitizeJsString(catKey)}')">${Security.sanitizeHtml(t.name)}</button>`;
        }
      });
      html += '</div>';
    }
    
    // Categories
    html += '<h2 class="section-title">' + _t('home.all_categories', 'All Categories') + '</h2>';
    html += '<div class="categories-grid">';
    Object.entries(CALC_DATA).forEach(([key, cat]) => {
      html += `<div class="category-card" onclick="Router.navigate('/${key}')" data-cat="${key}">
        <div class="cat-icon">${cat.icon}</div>
        <h3>${_t('cat.' + key, cat.name)}</h3>
        <p class="cat-count" data-count-for="${key}">${_t('cat.count', ((window.SITE_CONFIG && window.SITE_CONFIG.catCounts && window.SITE_CONFIG.catCounts[key]) || cat.tools.length) + ' calculators').replace('{count}', (window.SITE_CONFIG && window.SITE_CONFIG.catCounts && window.SITE_CONFIG.catCounts[key]) || cat.tools.length)}</p>
      </div>`;
    });
    html += '</div>';
    
    // Trending/Popular tools — REAL popularity (CalcAnalytics view counts), not the
    // first 12 tools in registry order. Fresh visitors (no local data yet) fall back
    // to a deterministic curated set so the section is never empty or misleading.
    const popIds = CalcAnalytics.getPopular();
    let popularTools = popIds.map(id => TOOL_MAP[id]).filter(Boolean);
    if (popularTools.length < 12) {
      const seen = new Set(popularTools.map(t => t.id));
      for (const c of Object.values(CALC_DATA)) {
        for (const t of c.tools) {
          if (popularTools.length >= 12) break;
          if (seen.has(t.id)) continue;
          popularTools.push(t); seen.add(t.id);
        }
      }
    }
    popularTools = popularTools.slice(0, 12);
    html += '<h2 class="section-title">' + _t('home.popular_tools', 'Popular Tools') + '</h2>';
    html += '<div class="tools-grid">';
    popularTools.forEach(t => {
      const catKey = Object.entries(CALC_DATA).find(([k,c]) => c.tools.includes(t))?.[0];
      html += `<div class="tool-card" onclick="Router.navigate('/${catKey}/${t.id}')">
        <h4>${Security.sanitizeHtml(t.name)}</h4>
        <p>${Security.sanitizeHtml(t.desc)}</p>
      </div>`;
    });
    html += '</div>';
    
    if (existingHero) {
      // REUSE the static hero WITHOUT ever detaching it — removing the LCP element
      // from the DOM (even to re-insert it) discards its LCP entry and starts a new
      // candidate at boot end (~10s throttled). So: keep the node in place, replace
      // only what comes after it, then append the boot-rendered content.
      // The static HTML also has an EMPTY placeholder spotlight BEFORE the hero
      // (same id). It survives this swap, and spotlight code fills + unhides it
      // LATER — which would push the hero down (CLS ~0.23). Drop it up front.
      const staleSpot = main.querySelector('#calc-of-day-spotlight');
      if (staleSpot) staleSpot.remove();
      while (main.lastChild !== existingHero) main.removeChild(main.lastChild);
      const wrap = document.createElement('div');
      wrap.innerHTML = html; // spotlight + tip + favorites + grids (hero not included)
      while (wrap.firstChild) main.appendChild(wrap.firstChild);
      if (!existingHero.querySelector('canvas')) {
        const cv = document.createElement('canvas');
        cv.id = 'hero-canvas';
        cv.setAttribute('aria-hidden', 'true');
        cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
        existingHero.insertBefore(cv, existingHero.firstChild);
      }
    } else {
      main.innerHTML = html;
    }
    
    // Start the hero canvas animation AFTER the DOM is in place (idempotent;
    // re-runs every time home renders, rebinding to the fresh canvas element).
    if (window.HeroCanvas) HeroCanvas.init();
    
    // Init widgets. The spotlight + daily tip were ALREADY built inline in the
    // single render pass above — re-rendering them here would swap the visible
    // cards AFTER first paint and cause a layout shift (CLS) on mobile. Only
    // ensure they are visible; the fav-button inside the card still re-renders
    // itself on demand (see CalculatorOfTheDay.renderSpotlight callers).
    if (window.CalculatorOfTheDay) {
      const _spotEl = document.getElementById('calc-of-day-spotlight');
      if (_spotEl) _spotEl.style.display = 'block';
    }
    if (window.AdvancedFeatures) {
      const _tipEl = document.getElementById('daily-tip-widget');
      if (_tipEl && !_tipEl.children.length && typeof AdvancedFeatures.renderDailyTip === 'function') {
        AdvancedFeatures.renderDailyTip(); // only when the inline pass produced nothing
      }
      AdvancedFeatures.initHomeAnimations();
    }
    if (window.I18nUI) I18nUI.translateStaticUI();
    CalcAnalytics.trackVisit();
    
    // Social proof
    updateSocialProof();

    // Lazy niche-category data is warmed on FIRST USER INTERACTION, not at boot:
    // loading all 13 chunks at boot saturates the throttled mobile pipe (~12s TTI).
    // Counts on the cards are static (SITE_CONFIG.catCounts) so they are correct
    // immediately; search kicks the same warm-up and re-runs on arrival.
    if (typeof window.DataLoader !== 'undefined') {
      ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(function (ev) {
        window.addEventListener(ev, warmLazyData, { once: true, passive: true });
      });
    }
  }

  // PRERENDERED TOOL PAGE: keep only this page's own category data eager so first
  // paint downloads one chunk instead of four (finance alone is ~1.4MB decoded).
  // The dropped eager categories become on-demand: navigation re-fetches them via
  // the same lazy loader, and idle/first-interaction warms them back (search +
  // category counts recover within seconds, without ever blocking the LCP window).
  (function drainEagerChunks() {
    if (!document.documentElement.getAttribute('data-prerendered')) return;
    if (typeof window.DataLoader === 'undefined' || !window.DataLoader.isEager) return;
    var seg = (window.location.pathname.split('/').filter(Boolean)[0] || '');
    if (!seg || !window.DataLoader.isEager(seg)) return;
    var others = ['finance', 'health', 'math', 'everyday'].filter(function (k) { return k !== seg; });
    function warm() { others.forEach(function (k) { window.DataLoader.ensure(k); }); }
    // Idle drain: requestIdleCallback keeps it out of the load window entirely.
    if (typeof requestIdleCallback === 'function') requestIdleCallback(warm, { timeout: 6000 });
    else setTimeout(warm, 2500);
  })();

  // Load all lazy category data on the first real user interaction (then refresh
  // on-screen counts + re-run an active search so lazy matches appear). Idempotent.
  function warmLazyData() {
    if (window.__lazyWarmed || typeof window.DataLoader === 'undefined') return;
    window.__lazyWarmed = true;
    window.DataLoader.loadAll().then(function () {
      if (_state.page !== 'home') return;
      document.querySelectorAll('.cat-count[data-count-for]').forEach(function (el) {
        var key = el.getAttribute('data-count-for');
        var cat = CALC_DATA[key];
        if (cat) el.textContent = cat.tools.length + ' calculators';
      });
      // Keep the hero + search placeholder totals live as lazy data arrives.
      var total = getCalculatorCount();
      var h1 = document.querySelector('.hero h1 .highlight');
      if (h1) h1.textContent = total + '+';
      var ph = document.getElementById('home-search');
      if (ph && ph.placeholder) ph.placeholder = 'Search ' + total + '+ calculators…';
      // Hub comparison tables were cached at init with empty niche categories —
      // regenerate them against the now-hydrated CALC_DATA.
      if (window.CategoryHub && typeof window.CategoryHub.refresh === 'function') {
        try { window.CategoryHub.refresh(); } catch (e) {}
      }
      // Re-run an active home search so lazy-category matches appear instantly.
      var inp = document.getElementById('home-search');
      if (inp && inp.value && typeof App.homeSearch === 'function') App.homeSearch(inp.value);
    });
  }

  // ---------- Category ----------
  function renderCategory(catKey) {
    _state.tool = null;
    const cat = CALC_DATA[catKey];
    if (!cat) { renderStatic('404'); return; }
    
    const main = document.getElementById('mainContent');
    if (!main) return;
    
    const meta = CATEGORY_META[catKey] || {};
    document.title = meta.title || cat.name + ' Calculators - CalcPro';
    updateMeta(meta.desc || cat.name + ' calculators', '/' + catKey);
    
    let html = '<div class="breadcrumb"><a href="/" onclick="event.preventDefault();Router.navigate(\'/\')">Home</a> › ' + cat.name + '</div>';
    html += '<div class="tool-header"><h1>' + cat.icon + ' ' + cat.name + ' Calculators</h1>';
    html += '<p class="tool-desc">' + (meta.desc || cat.name + ' calculators') + '</p>';
    html += '<div class="cat-actions"><button class="btn btn-outline" onclick="event.preventDefault();Router.navigate(\'/hub/' + catKey + '\')">📊 ' + cat.name + ' Comparison Table</button></div></div>';
    
    // Category search
    html += '<input type="text" class="cat-search" placeholder="Search in ' + cat.name + '…" oninput="App.filterCategory(this.value)" id="catFilter">';
    
    // Pagination: huge categories (60+) render first PAGE cards, rest behind
    // a 'Show more' button — faster first paint + shorter scroll on mobile.
    const PAGE = 24;
    const tools = cat.tools;
    const paginated = tools.length > PAGE;
    html += '<div class="tools-grid" id="catTools">';
    tools.forEach((t, i) => {
      const hidden = paginated && i >= PAGE ? ' hidden-tool' : '';
      html += `<div class="tool-card reveal${hidden}" onclick="Router.navigate('/${catKey}/${t.id}')" data-tool-id="${t.id}">
        <h4>${t.name}</h4>
        <p>${t.desc.substring(0, 100)}</p>
        <button class="fav-btn-small" onclick="event.stopPropagation();AdvancedFeatures.toggleFavorite('${t.id}','${t.name}','${catKey}');this.textContent=AdvancedFeatures.isFavorite('${t.id}')?'★':'☆'" title="Toggle favorite">${AdvancedFeatures.isFavorite(t.id) ? '★' : '☆'}</button>
      </div>`;
    });
    html += '</div>';
    if (paginated) {
      html += '<div class="show-more-wrap"><button class="btn-show-more" id="showMoreBtn" onclick="App.showMoreTools(this)">Show <span class="sm-count">' + (tools.length - PAGE) + '</span> more calculators</button></div>';
    }
    
    main.innerHTML = html;
    if (window.I18nUI) I18nUI.translateStaticUI();
    updateSocialProof();
    initScrollReveal();
    if (window.AdvancedFeatures && typeof AdvancedFeatures.initCardTilt === 'function') {
      try { AdvancedFeatures.initCardTilt(); } catch (e) { /* non-fatal */ }
    }
  }

  // Reveal remaining paginated cards (+24 per click, then expand all)
  function showMoreTools(btn) {
    const grid = document.getElementById('catTools');
    if (!grid) return;
    let shown = 0;
    grid.querySelectorAll('.tool-card.hidden-tool').forEach(card => {
      if (shown >= 24) return;
      card.classList.remove('hidden-tool');
      card.classList.add('revealed');
      shown++;
    });
    const remaining = grid.querySelectorAll('.tool-card.hidden-tool').length;
    if (remaining === 0 && btn) { btn.parentElement.style.display = 'none'; }
    else if (btn) {
      const count = btn.querySelector('.sm-count');
      if (count) count.textContent = remaining;
    }
    // Re-apply any active filter so newly shown cards respect it
    const f = document.getElementById('catFilter');
    if (f && f.value) filterCategory(f.value);
  }

  // Scroll-reveal for category/hub cards (skipped for reduced-motion users)
  function initScrollReveal() {
    const els = document.querySelectorAll('.reveal:not(.revealed)');
    if (!els.length) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach(el => el.classList.add('revealed'));
      return;
    }
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('revealed'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('revealed'); io.unobserve(en.target); }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -30px 0px' });
    els.forEach(el => io.observe(el));
  }

  function filterCategory(val) {
    const grid = document.getElementById('catTools');
    if (!grid) return;
    const q = val.toLowerCase().trim();
    // Searching searches the FULL category: temporarily unhide paginated cards
    if (q) grid.querySelectorAll('.tool-card.hidden-tool').forEach(card => card.classList.remove('hidden-tool'));
    grid.querySelectorAll('.tool-card').forEach(card => {
      const name = card.querySelector('h4')?.textContent?.toLowerCase() || '';
      const desc = card.querySelector('p')?.textContent?.toLowerCase() || '';
      card.style.display = (!q || name.includes(q) || desc.includes(q)) ? '' : 'none';
    });
  }

  // ---------- Ad throttle: max 2 visible slots, delayed render ----------
  function _renderAds() {
    var holders = document.querySelectorAll('[class*="ad-"]');
    var shown = 0;
    // Reset counter each navigation — prevents saturation across tool switches
    _adSlotsVisible = 0;
    holders.forEach(function(el) {
      if (shown >= 2) {
        el.style.display = 'none';
        return;
      }
      // Delay ad rendering 800ms — never block executeCalc
      var delay = 800 + shown * 200;
      setTimeout(function() {
        el.style.display = 'block';
      }, delay);
      shown++;
    });
  }
  var _adSlotsVisible = 0;

  // ---------- Tool ----------
  // Fill the unique per-tool intro paragraph from window.TOOL_INTROS (loaded
  // lazily from js/tool-intros.js). Called on render + when that file arrives.
  function _fillToolIntro() {
    var el = document.getElementById('tool-intro');
    if (!el) return;
    var tid = el.getAttribute('data-tool');
    if (!tid) return;
    var txt = (window.TOOL_INTROS && window.TOOL_INTROS[tid]) || '';
    if (txt && el.textContent !== txt) el.textContent = txt;
  }
  // When the intro file (js/tool-intros.js) finishes loading, fill any visible tool intro
  window.addEventListener('intros-loaded', function () {
    _fillToolIntro();
  });

  // Re-apply SEO title/meta/explain when the lazy SEO bundle arrives
  var _seoLoadedHookBound = false;
  function _applySeoWhenLoaded() {
    if (_seoLoadedHookBound) return;
    _seoLoadedHookBound = true;
    window.addEventListener('seo-loaded', function () {
      // Re-apply for the currently rendered tool (if any)
      if (_state.tool && _state.tool.tool) {
        var tool = _state.tool.tool;
        var catKey = _state.cat;
        var seo = window.TOOL_SEO && window.TOOL_SEO[tool.id] || null;
        if (seo) {
          // Long-tail modifier page: keep the intent-rich title/meta + self-canonical
          // URL that applyModifier() already set; only fill content, never overwrite.
          if (_state.modifierPath) {
            updateMeta(seo.metaDesc, _state.modifierPath);
          } else {
            document.title = seo.title;
            var canonPath = seo.canonicalPath || '/' + catKey + '/' + tool.id;
            updateMeta(seo.metaDesc, canonPath);
          }
          // Re-apply the per-tool OG card — updateMeta() above resets OG to the
          // generic og-image.png, so the tool-specific card must win here.
          try { setOgMeta(seo.title, seo.metaDesc, '/og/' + tool.id + '.jpg'); } catch (e) {}
          // Fill the unique intro paragraph too (if tool-intros.js arrived late)
          _fillToolIntro();
          // Fill the AEO block (Block 1) above the form
          var aeoEl = document.getElementById('seo-aeo-area');
          if (aeoEl && seo.aeo && !aeoEl.querySelector('.seo-aeo')) {
            aeoEl.innerHTML = '<div class="explain-card seo-aeo">' + seo.aeo + '</div>';
          }
          // Refresh schema with full SEO data
          try { App.injectToolSchema(tool, catKey); } catch(e) {}
          // Render the SEO guide whenever the bundle arrives (with or without a calc result),
          // so Googlebot sees the full 1,200+ word content even on a fresh visit.
          // NOTE: premium entries carry no `desc` — renderExplain is internally
          // premium-aware, so passing premium through the gate keeps the article
          // rendering on SPA re-navigation after the one-shot premium-loaded event.
          if (seo && (seo.desc || premium)) {
            var resultArea = document.getElementById('result-area');
            try {
              if (resultArea && resultArea.querySelector('.result-main') && _lastCalcValues) {
                renderExplain(tool, _lastCalcValues, { result: resultArea.querySelector('.result-main').textContent });
              } else {
                renderExplain(tool, {}, {});
              }
            } catch(e) {}
          }
        }
      }
    });
  }

  // ---------- Scientific Calculator Keypad ----------
  function _scientificKeypadHtml() {
    const k = (label, action, cls) => '<button type="button" class="sci-key ' + (cls || '') + '" onclick="App.sciKey(\'' + action + '\')">' + label + '</button>';
    return '<div class="sci-calc">' +
      '<div class="sci-display"><input id="sci-display" class="sci-input" value="0" inputmode="decimal" autocomplete="off" spellcheck="false" aria-label="Scientific expression" onkeydown="if(event.key===\'Enter\'){event.preventDefault();App.sciEval();}" oninput="App.sciSync(this.value)"><span id="sci-preview" class="sci-preview"></span></div>' +
      '<div class="sci-rows">' +
        '<div class="sci-row">' + k('AC', 'ac', 'sci-fn') + k('⌫', 'back', 'sci-fn') + k('(', '(', '') + k(')', ')', '') + k('%', '%', '') + '</div>' +
        '<div class="sci-row">' + k('sin', 'sin(', 'sci-fn') + k('cos', 'cos(', 'sci-fn') + k('tan', 'tan(', 'sci-fn') + k('π', 'pi', 'sci-fn') + k('√', 'sqrt(', 'sci-fn') + '</div>' +
        '<div class="sci-row">' + k('ln', 'ln(', 'sci-fn') + k('log', 'log(', 'sci-fn') + k('x²', '^2', 'sci-fn') + k('xʸ', '^', 'sci-fn') + k('÷', '/', 'sci-op') + '</div>' +
        '<div class="sci-row">' + k('7', '7') + k('8', '8') + k('9', '9') + k('×', '*', 'sci-op') + k('e', 'e', 'sci-fn') + '</div>' +
        '<div class="sci-row">' + k('4', '4') + k('5', '5') + k('6', '6') + k('−', '-', 'sci-op') + k('!', '!', 'sci-fn') + '</div>' +
        '<div class="sci-row">' + k('1', '1') + k('2', '2') + k('3', '3') + k('+', '+', 'sci-op') + k('.', '.') + '</div>' +
        '<div class="sci-row">' + k('0', '0') + k('00', '00') + k('=', '=', 'sci-eq') + '</div>' +
      '</div>' +
      '<button type="button" class="calc-btn" onclick="App.sciEval()">🧮 Evaluate</button>' +
      '<p class="sci-note">Scientific notation: sin(45), sqrt(16), 2^10, log(100), 5! — all computed locally, nothing leaves your device.</p>' +
    '</div>';
  }
  // Keypad actions — append token to the live expression, evaluate via SafeMathParser
  function sciKey(action) {
    const inp = document.getElementById('sci-display');
    if (!inp) return;
    let cur = String(inp.value || '');
    if (cur === '0' && /^[0-9]$/.test(action)) cur = '';
    if (action === 'ac') { inp.value = '0'; _sciPreview(''); return; }
    if (action === 'back') { inp.value = cur.length > 1 ? cur.slice(0, -1) : '0'; _sciPreview(''); return; }
    if (action === 'pi') { cur = cur.replace(/0$/, ''); inp.value = (cur === '' ? '' : cur) + Math.PI.toString().slice(0, 8); }
    else if (action === 'e') { inp.value = cur + 'e'; }
    else if (action === '!') { inp.value = cur + '!'; }
    else { inp.value = cur + action; }
    if (action === '=') { sciEval(); return; }
    _sciLive();
  }
  function sciSync(v) { const inp = document.getElementById('sci-display'); if (inp && String(inp.value) !== v) inp.value = v; _sciLive(); }
  function _sciLive() {
    const inp = document.getElementById('sci-display');
    const pv = document.getElementById('sci-preview');
    if (!inp) return;
    const expr = String(inp.value || '');
    if (expr === '0' || expr === '') { if (pv) pv.textContent = ''; return; }
    try { const v = SafeMathParser.safeEval(expr); if (pv) pv.textContent = '= ' + (Number(v.toFixed ? v.toFixed(10) : v)); }
    catch (e) { if (pv) pv.textContent = ''; }
  }
  function sciEval() {
    const inp = document.getElementById('sci-display');
    if (!inp) return;
    const expr = String(inp.value || '');
    let result;
    let ok = true;
    try {
      const v = SafeMathParser.safeEval(expr);
      if (typeof v === 'number' && isNaN(v)) throw new Error('Incomplete expression');
      const shown = Number(v.toFixed ? v.toFixed(10) : v);
      result = { result: String(shown), extra: 'Expression: ' + expr };
    } catch (e) { ok = false; result = { result: 'Invalid expression', extra: e.message }; }
    if (ok) inp.value = result.result; // keep user's expression intact on error
    const pv = document.getElementById('sci-preview'); if (pv) pv.textContent = '';
    // Render result into the standard result panel too
    const ra = document.getElementById('result-area');
    if (ra) {
      ra.innerHTML = '<div class="result-card"><div class="result-main">' + Security.sanitizeHtml(result.result) + '</div>' +
        (result.extra ? '<div class="result-extra">' + Security.sanitizeHtml(result.extra) + '</div>' : '') + '</div>';
    }
  }

  function renderTool(catKey, tool) {
    _state.tool = { catKey, tool };
    _state.cat = catKey;
    _state.related = null; // recomputed by renderRelated() below
    _state.modifierPath = null; // reset — applyModifier() re-sets it for long-tail URLs
    // STRICT TOOL-PAGE GUARDRAIL: heavy canvas animation is homepage-only.
    // Tear it down before rendering any calculator page so inputs, sliders,
    // and calculations run with zero background draw cost on tool pages.
    if (window.HeroCanvas && typeof HeroCanvas.destroy === 'function') {
      try { HeroCanvas.destroy(); } catch (e) { /* non-fatal */ }
    }
    const main = document.getElementById('mainContent');
    if (!main) return;
    
    // Load SEO content lazily (only on tool pages, not home/category)
    if ((!window.TOOL_SEO || !window._seoCatsLoaded || !window._seoCatsLoaded[catKey]) && typeof _initSeo === 'function') {
      _initSeo(catKey).catch(function(){});
    }
    // Use SEO-optimized title/description from TOOL_SEO if available
    var seo = window.TOOL_SEO && window.TOOL_SEO[tool.id] || null;
    document.title = seo ? seo.title : (tool.name + ' - CalcPro');
    // Canonical uses the clean generated path when available, else the category route
    var canonPath = (seo && seo.canonicalPath) ? seo.canonicalPath : '/' + catKey + '/' + tool.id;
    updateMeta(seo ? seo.metaDesc : tool.desc, canonPath);
    // Per-tool OG share card (unique 1200x630 image per calculator)
    setOgMeta(seo ? seo.title : tool.name + ' - CalcPro', seo ? seo.metaDesc : tool.desc, '/og/' + tool.id + '.jpg');
    // Fill the AEO block (Block 1) above the form if SEO content is already loaded
    if (seo) {
      var aeoEl = document.getElementById('seo-aeo-area');
      if (aeoEl && seo.aeo) aeoEl.innerHTML = '<div class="explain-card seo-aeo">' + seo.aeo + '</div>';
    }
    // If SEO bundle still loading, register one-time hook to re-apply title/meta/schema when it arrives
    if (!seo && window._initSeo) {
      _applySeoWhenLoaded();
    }
    
    // Build the form
    let inputsHtml = '';
    (tool.inputs || []).forEach(inp => {
      inputsHtml += '<div class="input-group">';
      inputsHtml += `<label for="${inp.id}">${inp.label}</label>`;
      
      if (inp.type === 'select') {
        // Currency converter: auto-populate From/To selects with ALL world currencies
        const _C = (typeof Currency !== 'undefined') ? Currency : null;
        let selectOpts = inp.opts || [];
        let selectedVal = inp.def || '';
        if (tool.id === 'currency-converter' && (inp.id === 'from' || inp.id === 'to') && _C && _C.getAllCurrencyCodes) {
          selectOpts = _C.getAllCurrencyCodes().map(c => ({ v: c, l: c + ' — ' + _C.getCurrencyName(c) }));
          // S3 #21: pre-select From currency from the visitor's browser locale
          // (no IP lookup, no network call). Falls back to USD if unknown.
          var _detected = (window.SmartAssist && typeof SmartAssist.detectCurrency === 'function')
            ? SmartAssist.detectCurrency(navigator.language, 'USD') : 'USD';
          selectedVal = inp.id === 'from' ? _detected : 'EUR';
        }
        inputsHtml += `<select id="${inp.id}" class="calc-input">`;
        selectOpts.forEach(o => {
          inputsHtml += `<option value="${o.v}" ${o.v === selectedVal ? 'selected' : ''}>${o.l}</option>`;
        });
        inputsHtml += '</select>';
      } else if (inp.type === 'checkbox') {
        inputsHtml += `<label class="action-btn toggle"><input type="checkbox" id="${inp.id}" class="calc-input" ${inp.def ? 'checked' : ''}> ${inp.label}</label>`;
      } else if (inp.type === 'textarea') {
        inputsHtml += `<textarea id="${inp.id}" class="calc-input" rows="4">${inp.def || ''}</textarea>`;
      } else {
        // Privacy: autocomplete="off" + autofill-sniffing guards on ALL inputs (never log sensitive values)
        const native = inp.type === 'number';
        // Universal voice input: a mic button beside EVERY numeric input so the
        // feature works on all 1201 tools and all inputs — not just the first
        // input of small tools (the old behavior hid the mic on >5-input tools).
        // The input + mic are wrapped in a flex row so they share one line.
        if (native) {
          inputsHtml += '<div class="input-row">';
        }
        inputsHtml += `<input type="${inp.type || 'number'}" id="${inp.id}" class="calc-input" value="${inp.def || ''}" ${native ? 'step="any"' : ''} maxlength="200" autocomplete="off" autocapitalize="off" spellcheck="false" data-private="true" oninput="App.clearInputError('${inp.id}')">`;
        if (native) {
          inputsHtml += '<button type="button" class="voice-input-btn" onclick="AdvancedFeatures.voiceInput(\'' + inp.id + '\')" aria-label="Voice input for ' + inp.label + '" title="Speak a number">🎤</button>';
          inputsHtml += '</div>';
        }
        // Inline unit switching (Gap 3 — Omni/RapidTables style): a units array on the
        // input renders a compact unit select that scales the displayed value.
        if (native && Array.isArray(inp.units) && inp.units.length > 1) {
          inputsHtml += `<select id="${inp.id}-unit" class="calc-unit" aria-label="${inp.label} unit" onchange="App.switchUnit('${inp.id}', this.value)">`;
          inp.units.forEach(u => {
            inputsHtml += `<option value="${u.f || 1}" ${u.sel ? 'selected' : ''}>${u.l}</option>`;
          });
          inputsHtml += '</select>';
        }
        // Range slider (Gap 8 — NerdWallet-style interactive inputs): inp.slider = {min,max,step}
        if (native && inp.slider && inp.slider.min !== undefined && inp.slider.max !== undefined) {
          const s = inp.slider;
          inputsHtml += `<input type="range" id="${inp.id}-slider" class="calc-slider" min="${s.min}" max="${s.max}" step="${s.step || 1}" value="${inp.def || s.min}" oninput="App.syncSlider('${inp.id}', this.value)" aria-label="${inp.label} slider">`;
        }
      }
      inputsHtml += '</div>';
    });
    
    const cat = CALC_DATA[catKey];
    
    let html = '<div class="breadcrumb"><a href="/" onclick="event.preventDefault();Router.navigate(\'/\')">' + _t('nav.home', 'Home') + '</a> › <a href="/' + catKey + '" onclick="event.preventDefault();Router.navigate(\'/' + catKey + "\')" + '">' + _t('cat.' + catKey, cat.name) + '</a> › ' + tool.name + '</div>';
    
    html += '<div class="tool-header">';
    html += '<h1>' + tool.name + '</h1>';
    html += '<p class="tool-desc">' + tool.desc + '</p>';
    // Unique per-tool cinematic hero image (generated at /og/<toolId>.jpg by
    // scripts/generate-tool-og.cjs). This is the page's LCP element on tool
    // routes, so it must be EAGER + high priority — lazy-loading the LCP
    // element delays the largest paint by seconds on throttled networks.
    // Silent fallback so a missing image never breaks the page or paints a
    // broken icon.
    html += '<div class="tool-hero-wrap">' +
      '<img class="tool-hero-img" src="/og/' + encodeURIComponent(tool.id) + '.jpg" alt="' + tool.name + ' calculator — free online tool" loading="eager" fetchpriority="high" decoding="async" width="1200" height="630" onerror="this.closest(\'.tool-hero-wrap\').style.display=\'none\'">' +
      '</div>';
    // Privacy-first visible badge — reassures users their data never leaves the device
    html += '<div class="privacy-badge" role="note" aria-label="Privacy">🔒 <span>Your data never leaves your device</span></div>';
    // E-E-A-T trust badges (finance/health = YMYL) — Fact-checked 2026 + Advanced Details
    if (typeof TrustBadges !== 'undefined' && typeof TrustBadges.render === 'function') {
      try { html += TrustBadges.render(tool, catKey); } catch (e) { /* never break render */ }
    }
    html += '<div class="tool-actions">';
    html += '<button class="action-btn" onclick="AdvancedFeatures.toggleFavorite(\'' + tool.id + '\',\'' + tool.name + '\',\'' + catKey + '\');this.textContent=AdvancedFeatures.isFavorite(\'' + tool.id + '\')?\'★ Favorited\':\'☆ Favorite\'">' + (AdvancedFeatures.isFavorite(tool.id) ? '★ Favorited' : '☆ Favorite') + '</button>';
    // Label wrapping a checkbox (NOT a button+checkbox — nested interactive
    // controls are an axe violation and break screen-reader semantics).
    html += '<label class="action-btn toggle"><input type="checkbox" id="auto-calc-toggle" checked onchange="AdvancedFeatures.enableAutoCalc(App._currentTool.tool)"> Auto-Calc</label>';
    html += '<button class="action-btn" onclick="App.printReport()">🖨️ Print</button>';
    html += '<button class="action-btn" onclick="App.exportResultAsPdf()">📄 PDF</button>';
    html += '<button class="action-btn" onclick="AdvancedFeatures.exportCurrentCSV()">📥 CSV</button>';
    html += '<button class="action-btn" onclick="AdvancedFeatures.renderUnitsSettings()">⚙️ Settings</button>';
    html += '<button class="action-btn" onclick="AdvancedFeatures.showGoalSeek(\'' + tool.id + '\')" id="goal-seek-btn">🎯 Goal Seek</button>';
    html += '<button class="action-btn" onclick="AdvancedFeatures.toggleBatch()" id="batch-toggle-btn">📋 Batch</button>';
    html += '<button class="action-btn" onclick="App.shareTool(\'' + tool.id + '\')">🔗 Share</button>';
    html += '<button class="action-btn" onclick="AdvancedFeatures.showEmbedModal(\'' + tool.id + '\')">🔌 Embed</button>';
    html += '</div></div>';
    
    // Chain Bar
    html += '<div id="chain-bar" class="chain-bar" style="display:none"></div>';
    html += '<div id="scenario-bar" class="scenario-bar" style="display:none"></div>';
    html += '<div id="pin-bar" class="pin-bar" style="display:none"></div>';
    html += '<div id="comparison-bar" style="display:none" class="scenario-bar"></div>';
    
    // Preset dropdown
    html += '<div class="preset-bar">';
    html += '<select id="preset-dropdown" aria-label="Load saved preset" onchange="if(this.value)AdvancedFeatures.loadPreset(\'' + tool.id + '\',this.value)"><option value="">' + _t('tool.load_preset', 'Load preset…') + '</option></select>';
    html += '<button class="small-btn" onclick="const p=prompt(\'Preset name:\');if(p)AdvancedFeatures.savePreset(\'' + tool.id + '\',p,App._collectValues());AdvancedFeatures.renderPresetDropdown(\'' + tool.id + '\')">💾 ' + _t('tool.save_preset', 'Save Preset') + '</button>';
    html += '</div>';
    
    // Calc layout
    html += '<form id="calc-form" class="calc-layout" onsubmit="App.executeCalcThrottled(event)">';
    html += '<div class="calc-input-panel">';
    html += '<h3>📝 ' + _t('tool.inputs', 'Inputs') + '</h3>';
    if (tool.custom === 'scientific') {
      // Scientific calculator — full interactive keypad (SafeMathParser-backed, no eval())
      html += _scientificKeypadHtml();
    } else {
      html += inputsHtml;
      html += '<button type="submit" class="calc-btn">🧮 ' + _t('tool.calculate', 'Calculate') + '</button>';
    }
    html += '</div>';
    html += '<div class="calc-result-panel">';      // Header row keeps the Copy action OUT of the heading (cleaner a11y semantics)
    html += '<div class="result-panel-head"><h3>📊 ' + _t('tool.result', 'Result') + '</h3><button type="button" id="copy-result-btn" class="copy-result-btn" onclick="App.copyResult()" title="Copy result to clipboard" aria-label="Copy result">📋 Copy</button></div>';
    // S12 #85: before-you-calculate checklist (collapsed by default, additive)
    html += (window.DecideUI && typeof DecideUI.renderChecklist === 'function') ? DecideUI.renderChecklist(tool) : '';
    // UX Round 3: contextual unit badge strip — filled by executeCalc with the tool's units.
    html += '<div class="result-unit-badges" id="result-unit-badges" role="group" aria-label="Result units"></div>';
    html += '<div class="result-area" id="result-area" data-tool-id="' + tool.id + '" aria-live="polite" aria-atomic="true" role="status">';
    html += '<div class="placeholder">' + _t('result.placeholder', 'Enter values and click Calculate') + '</div>';
    html += '</div>';
    html += '</div>';
    html += '</form>'
    // Unique ~100-word intro paragraph (from js/tool-intros.js — generated by
    // generate-intros.js). Every tool has its own unique text so Google never
    // flags thin/duplicate content. Rendered BELOW the form (same UX-first
    // pattern as the AEO block): tool-intros.js is a large lazy bundle, so
    // filling an intro above the fold would push the calculator down after
    // first paint → layout shift (CLS). Below the fold the late fill is
    // invisible to the CLS metric. Filled via _fillToolIntro + intros-loaded.
    html += '<p id="tool-intro" class="tool-intro" data-tool="' + tool.id + '"></p>';
    // AEO Block 1 ("What This Calculator Does") — moved BELOW the calculator form
    // (UX-first: the calculator must be the immediate experience, per Calculator.net /
    // CalculatorSoup best practice. Content still renders on-page for Googlebot + AI
    // engines, just after the tool instead of burying the inputs below it.)
    html += '<div id="seo-aeo-area" class="seo-aeo-area"></div>';
    
    // Touch hint: swipe left/right to jump to the next/previous tool (touch only)
    html += '<div class="swipe-hint" aria-hidden="true"><span class="swipe-arrow left">◀</span><span>Swipe to switch calculator</span><span class="swipe-arrow">▶</span></div>';
    
    // Contextual affiliate / native ad slot (below result, non-intrusive)
    html += '<div id="monetization-area" class="monetization-area"></div>';
    
    // Batch area
    html += '<div id="batch-area" class="batch-area" style="display:none"></div>';
    
    // What-If / Sensitivity area
    html += '<div id="sensitivity-area" class="sensitivity-area"></div>';
    
    // Zero-Risk feature areas (sliders/geo/heatmap/wizard/debt/vault/voice/score)
    html += '<div id="zr-geo-chip" style="margin:12px 0"></div>';
    html += '<div id="zr-feature-bar" class="zr-feature-bar"></div>';
    html += '<div id="zr-scenario-area"></div>';
    html += '<div id="zr-amort-area"></div>';
    html += '<div id="zr-score-area"></div>';
    html += '<div id="zr-voice-area"></div>';
    
    // Steps area
    html += '<div id="steps-area"></div>';
    
    // Explain area
    html += '<div id="explain-area"></div>';
    
    // Suggestions
    html += '<div id="suggestions-area" class="suggestions-area"></div>';
    
    // Related
    html += '<div class="related-section" id="related-section"></div>';
    
    // E-E-A-T review block — must stay in sync with scripts/ssg-pages.cjs
    // (static HTML ships the same block; re-emitting it on hydration keeps
    // the visible page identical and the block survives SPA re-renders).
    const YMYL_FINANCE_EEAT = ['finance', 'business', 'regional', 'career'];
    const YMYL_HEALTH_EEAT = ['health', 'fitness', 'food', 'family'];
    if (YMYL_FINANCE_EEAT.includes(catKey)) {
      html += '<div class="tool-review-block"><strong>About this page:</strong> Built on standard financial formulas (the same conventions banks use), hand-checked against worked examples and covered by automated tests on every build. Maintained by CalcProMaster\'s developer — not a licensed financial advisor — so results are math education, not financial advice. Read our <a href="/editorial-policy" onclick="event.preventDefault();Router.navigate(\'/editorial-policy\')">editorial policy</a> for how content is written and verified.</div>';
    } else if (YMYL_HEALTH_EEAT.includes(catKey)) {
      html += '<div class="tool-review-block"><strong>About this page:</strong> Built on published, peer-reviewed formulas, hand-checked against worked examples and covered by automated tests on every build. Maintained by CalcProMaster\'s developer — not a medical professional — so results are health education, not medical advice. Read our <a href="/editorial-policy" onclick="event.preventDefault();Router.navigate(\'/editorial-policy\')">editorial policy</a>.</div>';
    } else {
      html += '<div class="tool-review-block"><strong>About this page:</strong> Built on documented public formulas, hand-checked against worked examples and covered by automated tests on every build. See our <a href="/editorial-policy" onclick="event.preventDefault();Router.navigate(\'/editorial-policy\')">editorial policy</a> for how content is written and verified.</div>';
    }
    
    // YMYL disclaimer — every tool page carries a category-appropriate disclaimer at the bottom
    const YMYL_FINANCE = ['finance', 'business', 'regional', 'career'];
    const YMYL_HEALTH = ['health', 'fitness', 'food', 'family'];
    let disclaimer = '<div class="tool-disclaimer"><strong>⚠️ General Disclaimer:</strong> Results are estimates for informational and educational purposes only. Verify independently before making important decisions.</div>';
    if (YMYL_FINANCE.includes(catKey)) {
      disclaimer = '<div class="tool-disclaimer ymyl-finance"><strong>⚠️ Financial Disclaimer:</strong> This calculator provides estimates for informational and educational purposes only and does not constitute financial, investment, tax, or legal advice. Consult a qualified financial advisor before making financial decisions.</div>';
    } else if (YMYL_HEALTH.includes(catKey)) {
      disclaimer = '<div class="tool-disclaimer ymyl-health"><strong>⚠️ Health Disclaimer:</strong> This calculator provides general estimates for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Consult a qualified healthcare provider for any health decision.</div>';
    }
    html += disclaimer;
    
    main.innerHTML = html;
    
    // Idle-hydration: restore values the user typed into the prerendered form
    // before the deferred rebuild (one-shot snapshot taken at flush time). URL
    // share-state below restores later and takes precedence over the snapshot.
    if (window.__restoreStaticInputs) {
      try {
        var _snap = window.__restoreStaticInputs;
        Object.keys(_snap).forEach(function (k) {
          var el = document.getElementById(k) || document.querySelector('[name="' + k + '"]');
          if (el) el.value = _snap[k];
        });
      } catch (e) { /* snapshot restore is best-effort */ }
      // One-shot: without this, a stale snapshot would leak into the NEXT
      // tool's form on a later SPA navigation.
      delete window.__restoreStaticInputs;
    }
    // Smart-input layer (S1): quick-fill presets, typical-value datalists,
    // unit auto-suggest notes, and paste-and-parse — additive, never blocks
    // calculation. Pure enhancement: failure is swallowed silently.
    if (window.SmartInput && typeof SmartInput.enhance === 'function') {
      try { SmartInput.enhance(catKey, tool); } catch (e) { /* best-effort */ }
    }
    // S1#5: undo/redo stack wiring (existing module was previously unwired)
    try {
      if (window.UndoRedo) {
        const urForm = document.getElementById('calc-form');
        if (urForm) {
          if (!document.getElementById('undo-redo-container')) {
            const uc = document.createElement('div');
            uc.id = 'undo-redo-container';
            uc.style.margin = '0 0 8px';
            urForm.parentNode.insertBefore(uc, urForm);
          }
          if (typeof UndoRedo.init === 'function') UndoRedo.init();
          if (typeof UndoRedo.enableUndoRedoForTool === 'function') UndoRedo.enableUndoRedoForTool(tool.id);
          // Apply restored states back to the form (module was stack-only before)
          if (typeof UndoRedo.onRestore === 'function' && !window.UndoRedo.__appApplied) {
            window.UndoRedo.__appApplied = true;
            UndoRedo.onRestore(function (state) {
              const f = document.getElementById('calc-form');
              if (!f || !state || !state.input) return;
              Object.keys(state.input).forEach(function (id) {
                const el = document.getElementById(id);
                if (!el) return;
                if (el.type === 'checkbox') el.checked = state.input[id];
                else el.value = state.input[id];
              });
              try { App.executeCalc({ preventDefault: function () {}, target: f }); } catch (e) { /* recalc best-effort */ }
            });
          }
          // Snapshot on input (debounced 400ms); programmatic restore doesn't fire events, so no loop
          if (urForm.__urSnap) urForm.removeEventListener('input', urForm.__urSnap);
          let urT = null;
          urForm.__urSnap = function () {
            clearTimeout(urT);
            urT = setTimeout(function () {
              const data = {};
              urForm.querySelectorAll('input, select, textarea').forEach(function (el) {
                if (el.id && el.type !== 'file' && el.type !== 'password') data[el.id] = el.type === 'checkbox' ? el.checked : el.value;
              });
              UndoRedo.saveState(function () { return { input: data, toolId: tool.id }; });
            }, 400);
          };
          urForm.addEventListener('input', urForm.__urSnap);
        }
      }
    } catch (e) { /* undo/redo is best-effort */ }
    // Smart-assist layer (S3): plausibility warnings + draft autosave — additive
    if (window.SmartAssist && typeof SmartAssist.enhance === 'function') {
      try { SmartAssist.enhance(tool); } catch (e) { /* best-effort */ }
    }
    
    // Translate the calculator buttons/labels for the active locale — this is
    // what makes the WHOLE tool page (not just the header) switch language.
    if (window.I18nUI && typeof I18nUI.translateCalculatorUI === 'function') {
      try { I18nUI.translateCalculatorUI(tool.id); } catch (e) {}
    }
    
    // Fill the unique intro paragraph immediately if tool-intros.js already
    // arrived (idempotent — no-ops until window.TOOL_INTROS exists; the
    // intros-loaded + seo-loaded events cover the late-arrival case). This
    // also handles SPA same-category navigation where those events already
    // fired before the element was in the DOM.
    _fillToolIntro();
    
    // Throttle AdSense slots — max 2 visible, delayed 800ms (never blocks calc)
    _renderAds();
    
    // Presets
    AdvancedFeatures.renderPresetDropdown(tool.id);
    AdvancedFeatures.enableAutoCalc(tool);
    
    // Zero-Risk features: sliders, geo chip, wizard/debt/vault/PDF buttons
    if (window.ZR && typeof ZR.init === 'function') {
      try { ZR.init(tool, catKey); } catch (e) { /* never break tool render */ }
    }
    
    // Voice dictation button (fills the whole form by voice — every tool)
    if (window.AdvancedFeatures && typeof AdvancedFeatures.initVoiceArea === 'function') {
      try { AdvancedFeatures.initVoiceArea(); } catch (e) { /* never break tool render */ }
    }

    // Chain bar
    AdvancedFeatures.renderChainBar();
    AdvancedFeatures.renderPinBar();
    AdvancedFeatures.renderComparisonBar();
    
    // Restore input values from URL query params (shareable stateful links)
    if (window.URLStateManager && URLStateManager.restore(tool)) {
      // Inputs pre-filled — the auto-calc timer below will run the result automatically
    } else if (typeof AdvancedFeatures.loadFromUrl === 'function') {
      AdvancedFeatures.loadFromUrl(tool);
    }
    
    // Render the full SEO guide (Blocks 3-6) immediately on page load so the
    // 1,200+ word content is visible to users AND Googlebot without waiting for
    // the auto-calc timer or a manual click. (seo is already in scope above.)
    // Premium entries have no `desc` — renderExplain is internally premium-aware,
    // so passing premium through the gate keeps the article rendering on SPA
    // cross-tool navigation even after the one-shot premium-loaded event fired.
    if (seo && (seo.desc || premium)) {
      try { renderExplain(tool, {}, {}); } catch (e) { /* renderExplain is internally guarded */ }
    }
    
    // Auto-calculate on load if Auto-Calc is enabled.
    // Routed through ToolLifecycle so a rapid navigation (within 100ms) cancels the
    // stale timer instead of firing executeCalc against the NEXT tool's DOM.
    const autoToggle = document.getElementById('auto-calc-toggle');
    if (autoToggle && autoToggle.checked) {
      if (typeof ToolLifecycle !== 'undefined' && typeof ToolLifecycle.setTimeoutSafe === 'function') {
        ToolLifecycle.setTimeoutSafe(() => App.executeCalc({ preventDefault: () => {} }), 100);
      } else {
        setTimeout(() => App.executeCalc({ preventDefault: () => {} }), 100);
      }
    }
    
    // Suggestions
    renderSuggestions(catKey, tool);
    
    // Related
    renderRelated(catKey, tool);
    
    CalcAnalytics.trackView(tool.id, tool.name);
    if (window.I18nUI) I18nUI.translateStaticUI();
    // ConfidenceNotes auto-attaches via MutationObserver (init in index.html) — no direct call needed
    if (window.GlossaryTooltips) GlossaryTooltips.init();
    
    // Inject YMYL JSON-LD Schema for this tool
    App.injectToolSchema(tool, catKey);
    
    // Animate chart if present
    setTimeout(() => { if (window.AdvancedFeatures) AdvancedFeatures.animateCharts(); }, 300);
    
    // Social proof
    updateSocialProof();
  }

  // ---------- One-tap copy result (UX: zero friction on mobile/desktop) ----------
  function copyResult() {
    const ra = document.getElementById('result-area');
    const el = ra ? ra.querySelector('.result-main') : null;
    const text = el ? (el.textContent || '').trim() : '';
    if (!text || text.indexOf('Enter values') === 0) {
      showToast('No result yet — press Calculate first', 1800);
      return;
    }
    const doCopy = () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
      }
      return Promise.resolve(false);
    };
    doCopy().then(ok => {
      if (!ok) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
        document.body.appendChild(ta);
        ta.select();
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        ta.remove();
      }
      showToast(ok ? 'Result copied ✓' : 'Copy failed', ok ? 1600 : 2000);
    });
  }

  function renderSuggestions(catKey, tool) {
    const area = document.getElementById('suggestions-area');
    if (!area) return;
    const suggestions = AdvancedFeatures.getSmartSuggestions(catKey, CALC_DATA[catKey], tool);
    if (suggestions.length === 0) { area.style.display = 'none'; return; }
    area.style.display = 'block';
    area.innerHTML = '<h4>💡 You might also like</h4><div class="suggestions-grid">' +
      suggestions.map(s => `<div class="suggestion-card" onclick="Router.navigate('/${catKey}/${s.id}')">${s.name} — ${s.reason}</div>`).join('') +
      '</div>';
  }

  function renderRelated(catKey, tool) {
    const area = document.getElementById('related-section');
    if (!area) return;
    const cat = CALC_DATA[catKey];
    if (!cat) return;
    // Score same-category tools by keyword overlap so genuinely similar tools rank first
    const kwTokens = ((tool.kw || '') + ' ' + tool.name).toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2);
    const score = t => {
      const hay = ((t.kw || '') + ' ' + t.name).toLowerCase();
      return kwTokens.reduce((n, w) => n + (hay.indexOf(w) !== -1 ? 1 : 0), 0);
    };
    let related = cat.tools.filter(t => t.id !== tool.id)
      .map(t => ({ t, s: score(t) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 6)
      .map(x => x.t);
    // Fill shortfalls with popular cross-category tools (still crawlable links)
    if (related.length < 6) {
      const have = new Set(related.map(t => t.id)); have.add(tool.id);
      const allCats = Object.keys(CALC_DATA);
      for (const k of allCats) {
        for (const t of CALC_DATA[k].tools) {
          if (related.length >= 6) break;
          if (have.has(t.id)) continue;
          related.push(t); have.add(t.id);
        }
      }
      related = related.slice(0, 6);
    }
    // Cluster links (C1–C8): up to 2 links from this page's intent cluster,
    // mirroring the build-time behavior in ssg-pages.cjs so prerendered and
    // SPA-rendered pages never diverge. Cross- OR same-category (single-
    // category clusters like C3 tax connect hub ↔ spokes only through this).
    // Hub pages link spokes; spokes link the hub first.
    const clusters = (typeof window !== 'undefined' && window.__CLUSTERS__) || [];
    if (clusters.length) {
      if (!renderRelated._idx) {
        renderRelated._idx = new Map();
        for (const c of clusters) {
          renderRelated._idx.set(c.hub, { cluster: c, isHub: true });
          for (const s of c.spokes) if (!renderRelated._idx.has(s)) renderRelated._idx.set(s, { cluster: c, isHub: false });
        }
      }
      const pageKey = catKey + '/' + tool.id;
      const entry = renderRelated._idx.get(pageKey);
      if (entry) {
        const c = entry.cluster;
        const candidates = (entry.isHub ? c.spokes.slice() : [c.hub].concat(c.spokes))
          .map(k => { const i = k.indexOf('/'); return { cat: k.slice(0, i), id: k.slice(i + 1) }; })
          .filter(k => (k.cat !== catKey || k.id !== tool.id) && CALC_DATA[k.cat] && CALC_DATA[k.cat].tools.some(t => t.id === k.id));
        const seen = new Set(related.map(t => t.id)); seen.add(tool.id);
        const picks = [];
        for (const k of candidates) {
          if (picks.length >= 2) break;
          if (seen.has(k.id)) continue;
          const t = CALC_DATA[k.cat].tools.find(x => x.id === k.id);
          if (t) { picks.push(t); seen.add(k.id); }
        }
        for (let i = picks.length - 1; i >= 0; i--) related.unshift(picks[i]);
        related = related.slice(0, 6);
      }
    }
    if (related.length === 0) { area.style.display = 'none'; return; }
    // Remember the related order so touch swipe navigates through genuinely
    // similar tools (cross-category too) instead of raw category neighbors.
    const catOf = t => Object.keys(CALC_DATA).find(k => CALC_DATA[k].tools.some(x => x.id === t.id)) || catKey;
    _state.related = related.map(t => ({ id: t.id, cat: catOf(t) }));
    // REAL <a href> links — crawlable internal linking (SEO gold) that still uses SPA routing
    area.innerHTML = '<h3>Similar Calculators</h3><div class="related-grid">' +
      related.map(t => {
        const rc = catOf(t);
        return '<a class="related-card" href="' + Router.href('/' + rc + '/' + t.id) + '" onclick="event.preventDefault();Router.navigate(\'/' + rc + '/' + t.id + '\')">' + t.name + '</a>';
      }).join('') +
      '</div>';
  }

  // ---------- Throttled calc trigger (anti spam-click) ----------
  // Wraps the form-submit path so rapid clicks can't hammer executeCalc.
  // Auto-calc timers call executeCalc directly (they're already debounced).
  var _calcSubmitThrottled = null;
  // ---------- Long-tail modifier magic auto-fill ----------
  // /finance/loan-emi/5-years-50000-florida → parse the modifier, pre-fill matching
  // inputs, auto-run the calculation, and rewrite title/meta so every long-tail
  // URL is a unique, indexable page (programmatic SEO).
  function applyModifier(tool, modifier) {
    if (!tool || !tool.inputs || !modifier) return;
    const segments = modifier.toLowerCase().split('-').filter(Boolean);
    const parsed = { years: null, months: null, amount: null, rate: null, location: null };
    segments.forEach(seg => {
      let m;
      if ((m = seg.match(/^(\d+(?:\.\d+)?)(years?|yrs?)$/))) parsed.years = parseFloat(m[1]);
      else if ((m = seg.match(/^(\d+(?:\.\d+)?)months?$/))) parsed.months = parseFloat(m[1]);
      else if ((m = seg.match(/^(\d+(?:\.\d+)?)(k|k-?dollars?|thousand)$/))) parsed.amount = parseFloat(m[1]) * 1000;
      else if ((m = seg.match(/^(\d+(?:\.\d+)?)m$/))) parsed.amount = parseFloat(m[1]) * 1000000;
      else if ((m = seg.match(/^(\d+(?:\.\d+)?)(%|percent|pct)$/))) parsed.rate = parseFloat(m[1]);
      else if ((m = seg.match(/^(\d+(?:\.\d+)?)$/))) {
        // Bare number: >100 is almost always a currency amount, else a term in years
        if (parseFloat(m[1]) > 100) parsed.amount = parseFloat(m[1]);
        else parsed.years = parseFloat(m[1]);
      }
      else if (/^[a-z]{2,}$/.test(seg) && !UNIT_WORDS.has(seg)) parsed.location = seg; // last word = location/keyword
    });

    // Field mapping: match parsed values to the tool's own input fields.
    // 1) id match FIRST (reliable — labels lie: e.g. "Interest Rate (% per year)"
    //    contains 'year' and would wrongly capture a term modifier).
    // 2) fallback to standalone label word match only when no id matches.
    // idKeys: id-substring match (authoritative). labelKeys: conservative fallback
    // (standalone word match). Passing a narrower labelKeys list keeps new id keys
    // like 'current'/'goal' from ever capturing non-monetary labels (e.g. a tool
    // whose label says 'Current Age' or 'Current (A)').
    const mapField = function (idKeys, labelKeys) {
      if (labelKeys === undefined) labelKeys = idKeys;
      const byId = (tool.inputs || []).find(inp => {
        const id = String(inp.id || '').toLowerCase();
        return idKeys.some(k => id === k || id.indexOf(k) !== -1);
      });
      if (byId) return byId;
      return (tool.inputs || []).find(inp => {
        const words = String(inp.label || '').toLowerCase().split(/[^a-z]+/);
        return labelKeys.some(k => words.indexOf(k) !== -1);
      });
    };
    const setVal = function (inp, val) {
      if (!inp) return;
      const el = document.getElementById(inp.id);
      if (!el) return;
      if (inp.type === 'select') {
        const opt = (inp.opts || []).find(o => String(o.v) === String(val) || String(o.l).toLowerCase().indexOf(String(val).toLowerCase()) !== -1);
        if (opt) el.value = opt.v;
      } else if (inp.type === 'checkbox') {
        el.checked = !!val;
      } else {
        el.value = val;
      }
    };
    let filled = 0;
    let amountFilled = false;
    let amountUnit = ''; // 'kWh' when the amount mapped to a kWh-style input
    if (parsed.amount !== null) {
      // Programmatic-SEO audit fix: extended ID-key list covers balance/current/
      // initial/goal/gross/savings/monthly/kwh/desired style input ids (e.g.
      // credit-card-payoff.balance, retirement.current, savings-goal.goal,
      // paycheck.gross, fire.savings, burn-rate.monthly, freelance-rate.desired,
      // solar-panel.monthlyKwh). Label fallback stays on the original safe set so
      // non-monetary labels ('Current Age', 'Current (A)', 'Goal Weight') are
      // never captured.
      const AMOUNT_ID_KEYS = ['amount', 'loan', 'principal', 'price', 'cost', 'salary', 'income', 'investment', 'budget', 'value', 'balance', 'current', 'initial', 'goal', 'gross', 'savings', 'monthly', 'kwh', 'desired'];
      const AMOUNT_LABEL_KEYS = ['amount', 'loan', 'principal', 'price', 'cost', 'salary', 'income', 'investment', 'budget', 'value'];
      let f = mapField(AMOUNT_ID_KEYS, AMOUNT_LABEL_KEYS);
      if (!f) {
        // Salary-style tools take an hourly rate — interpret a bare amount as
        // ANNUAL salary and convert to hourly (hours × weeks from defaults) so
        // /finance/salary/50000 actually computes $50,000/year.
        const hIn = tool.inputs.find(i => i.id === 'hours');
        const wIn = tool.inputs.find(i => i.id === 'weeks');
        if (tool.inputs.some(i => i.id === 'hourly') && hIn && wIn) {
          const hh = parseFloat(hIn.def !== undefined ? hIn.def : 40);
          const ww = parseFloat(wIn.def !== undefined ? wIn.def : 52);
          if (hh > 0 && ww > 0) {
            setVal(tool.inputs.find(i => i.id === 'hourly'), parsed.amount / (hh * ww));
            filled++;
            amountFilled = true;
          }
        }
      } else {
        setVal(f, parsed.amount);
        filled++;
        amountFilled = true;
        if (String(f.id).toLowerCase().indexOf('kwh') !== -1) amountUnit = 'kWh';
      }
    }
    if (parsed.years !== null) {
      const f = mapField(['year', 'term', 'tenure', 'duration']);
      if (f) { setVal(f, parsed.years); filled++; }
    }
    if (parsed.months !== null) {
      const f = mapField(['month']);
      if (f) { setVal(f, parsed.months); filled++; }
    }
    if (parsed.rate !== null) {
      const f = mapField(['rate', 'interest', 'apr', 'percent']);
      if (f) { setVal(f, parsed.rate); filled++; }
    }
    if (parsed.location) {
      const f = mapField(['location', 'state', 'city', 'region', 'country']);
      if (f) { setVal(f, parsed.location); filled++; }
    }

    // Unique long-tail title + meta + canonical (self-canonical per modifier URL)
    const ctx = [];
    // Title guard: only claim the amount when it actually mapped to an input.
    // Unmapped amounts (e.g. genuinely ambiguous bare numbers) must never appear
    // as a '$X' claim while the calc runs on defaults.
    if (parsed.amount !== null && amountFilled) {
      ctx.push(amountUnit === 'kWh'
        ? Number(parsed.amount).toLocaleString() + ' kWh'
        : '$' + Number(parsed.amount).toLocaleString());
    }
    if (parsed.years !== null) ctx.push(parsed.years + (parsed.years === 1 ? ' Year' : ' Years'));
    if (parsed.months !== null) ctx.push(parsed.months + ' Months');
    if (parsed.rate !== null) ctx.push(parsed.rate + '%');
    if (parsed.location) ctx.push(parsed.location.charAt(0).toUpperCase() + parsed.location.slice(1));
    if (ctx.length) {
      const fullPath = '/' + _state.cat + '/' + tool.id + '/' + modifier;
      _state.modifierPath = fullPath;
      document.title = tool.name + ': ' + ctx.join(' ') + ' - CalcProMaster';
      // Word-boundary clip (155 + ellipsis) keeps the meta description inside
      // the ~165-char SERP display limit without cutting mid-word.
      const mDesc = tool.desc + ' Calculate ' + ctx.join(' ') + ' instantly — free, private, step-by-step.';
      updateMeta(mDesc.length > 155 ? mDesc.slice(0, 155).replace(/\s+\S*$/, '').trim() + '…' : mDesc, fullPath);
      // LONG-TAIL NOINDEX (SEO consolidation): every variant URL renders the
      // same calculator as its parent tool page — no genuinely unique data —
      // so the variant marks itself noindex and points its canonical at the
      // PARENT tool page. updateMeta() would otherwise reset robots to
      // indexable, so set it AFTER updateMeta. keepCanonicalHack: updateMeta
      // builds the canonical from the full URL (variant path), so rewrite it
      // to the base tool URL directly, matching the static SSG page output.
      try {
        const robots = document.querySelector('meta[name="robots"]');
        if (robots) robots.content = 'noindex, follow';
        const canon = document.querySelector('link[rel="canonical"]');
        if (canon) canon.href = window.location.origin + '/' + _state.cat + '/' + tool.id;
      } catch (e) { /* non-fatal */ }
      try { App.injectToolSchema(tool, _state.cat); } catch (e) {}
    }

    // Auto-run so the visitor sees the answer with zero typing.
    // NOTE: applyModifier runs synchronously right after renderTool(), so the
    // values are set BEFORE the 100ms auto-calc timer fires — that timer already
    // computes with the filled values. Only schedule a manual re-run when
    // Auto-Calc is disabled, to avoid double execution (double history/analytics).
    if (filled > 0) {
      const autoToggle = document.getElementById('auto-calc-toggle');
      const autoOn = autoToggle ? autoToggle.checked : true;
      if (!autoOn) {
        setTimeout(() => { try { executeCalc({ preventDefault: () => {} }); } catch (e) {} }, 250);
      }
    }
  }

  // ---------- AEO Direct Answer Box ----------
  // Renders a semantic, crawlable 2-sentence answer beneath every calculation result.
  // Sentence 1 states the outcome; sentence 2 reassures privacy. Uses only trusted
  // data (tool labels + sanitized result) — no user-supplied HTML ever.
  function buildDirectAnswer(tool, values, result) {
    if (!result || !result.result) return '';
    // Plain-text main result (strip any structural HTML the tool may have emitted)
    let mainText = String(result.result).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!mainText) return '';
    // Bound the answer to ~180 chars — table-heavy results (amortization, batch
    // output) must not flood the AEO box with a giant wall of text.
    if (mainText.length > 180) {
      mainText = mainText.slice(0, 177).replace(/\s+\S*$/, '') + '…';
    }
    // Pull up to 3 labeled inputs for context
    const ctx = [];
    (tool.inputs || []).slice(0, 3).forEach(inp => {
      const v = values[inp.id];
      if (v === undefined || v === null || v === '') return;
      let disp = String(v);
      if (inp.type === 'select' && Array.isArray(inp.opts)) {
        const opt = inp.opts.find(o => String(o.v) === String(v));
        if (opt) disp = opt.l;
      } else if (inp.type === 'checkbox') {
        disp = v ? 'Yes' : 'No';
      }
      ctx.push((inp.label || inp.id) + ': ' + disp);
    });
    const toolLabel = (tool.name || 'calculator').replace(/ calculator$/i, '');
    const s1 = 'For your inputs' + (ctx.length ? ' (' + ctx.join(', ') + ')' : '') + ', the ' + toolLabel + ' result is ' + mainText + '.';
    const s2 = 'This estimate is calculated instantly in your browser — your data never leaves your device.';
    return '<section class="direct-answer" aria-label="Direct answer">' +
      '<h2>Direct Answer</h2>' +
      '<p>' + Security.sanitizeHtml(s1) + '</p>' +
      '<p class="da-privacy">' + Security.sanitizeHtml(s2) + '</p>' +
      '</section>';
  }

  // ---------- Semantic result table (AI-crawlable structured output) ----------
  // Renders every calculation as a real <table> with input rows + Result/Details rows.
  // Keeps .result-main/.result-extra classes on the cells so downstream features work.
  function buildResultTable(tool, values, result) {
    const rows = [];
    (tool.inputs || []).forEach(function (inp) {
      const val = values[inp.id];
      if (val === undefined || val === null || val === '') return;
      let display = String(val);
      // Select inputs: show the human label, not the stored value code
      if (inp.type === 'select' && Array.isArray(inp.opts)) {
        const opt = inp.opts.find(function (o) { return String(o.v) === String(val); });
        if (opt) display = opt.l;
      } else if (inp.type === 'checkbox') {
        display = val ? 'Yes' : 'No';
      }
      rows.push('<tr><th scope="row">' + Security.sanitizeHtml(inp.label || inp.id) +
        '</th><td>' + Security.sanitizeHtml(display) + '</td></tr>');
    });
    let html = '<table class="result-table" aria-label="Calculation inputs and result">' +
      '<caption class="sr-only">Calculation inputs and result</caption>';
    if (rows.length) {
      html += '<thead><tr><th scope="col">Input</th><th scope="col">Value</th></tr></thead>';
    }
    html += '<tbody>' + rows.join('');
    if (result && result.result) {
      const safe = result.isHtml
        ? (typeof Security.sanitizeOutput === 'function' ? Security.sanitizeOutput(result.result) : Security.sanitizeHtml(result.result))
        : Security.sanitizeHtml(result.result);
      html += '<tr class="result-row"><th scope="row">Result</th><td class="result-main">' + safe + '</td></tr>';
    }
    if (result && result.extra) {
      // result.extraHtml → safe structured HTML (reference tables) through the
      // sanitizeOutput allow-list; otherwise escape fully as plain text.
      const safeExtra = result.extraHtml
        ? (typeof Security.sanitizeOutput === 'function' ? Security.sanitizeOutput(result.extra) : Security.sanitizeHtml(result.extra))
        : Security.sanitizeHtml(result.extra);
      html += '<tr class="extra-row"><th scope="row">Details</th><td class="result-extra">' + safeExtra + '</td></tr>';
    }
    html += '</tbody></table>';
    return html;
  }

  function executeCalcThrottled(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (typeof UXUtils !== 'undefined' && UXUtils.throttle) {
      if (!_calcSubmitThrottled) {
        _calcSubmitThrottled = UXUtils.throttle(function (ev) { executeCalc(ev); }, 400);
      }
      _calcSubmitThrottled(e);
    } else {
      executeCalc(e);
    }
  }

  // ---------- Execute Calculation (async-aware) ----------
  async function executeCalc(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!_state.tool) return;
    
    const values = _collectValues();
    _lastCalcValues = values;
    const tool = _state.tool.tool;
    
    const resultArea = document.getElementById('result-area');
    if (!resultArea) return;
    
    try {
      // Handle async tools (e.g., currency-converter with calc:null, async:true)
      let result;
      if (tool.async === true) {
        if (tool.id === 'currency-converter' && typeof Currency !== 'undefined' && typeof Currency.convert === 'function') {
          result = await Currency.convert(values);
        } else {
          throw new Error('Async calculator not implemented: ' + tool.id);
        }
      } else if (typeof tool.calc === 'function') {
        const raw = tool.calc(values);
        // If calc returns a promise (future-proof), await it
        result = (raw && typeof raw.then === 'function') ? await raw : raw;
      } else if (tool.custom) {
        // Custom rendering tools — scientific calculator evaluates its live keypad expression
        if (tool.custom === 'scientific') {
          const disp = document.getElementById('sci-display');
          const expr = disp ? String(disp.value || '') : '';
          if (!expr) { result = { result: 'Enter an expression', extra: '' }; }
          else {
            try {
              const val = SafeMathParser.safeEval(expr);
              const shown = Number(val.toFixed ? val.toFixed(10) : val);
              result = { result: String(shown), extra: 'Expression: ' + expr };
            } catch (e) { result = { result: 'Invalid expression', extra: e.message }; }
          }
        } else {
          result = { result: 'Use the interactive tool above.', extra: '' };
        }
      } else {
        throw new Error('Calculator not implemented: ' + tool.id);
      }
      
      // NaN guard: division-by-zero / invalid math must never leak "NaN" onto the UI.
      // If any part of the result string contains NaN/undefined, replace the main result
      // with a friendly validation hint instead of raw broken math. Mutates in place so
      // downstream fields (extraHtml, isHtml, steps, units, chart) are preserved.
      if (result && result.result) {
        const resStr = String(result.result);
        // NaN/undefined AND Infinity must never leak to the UI: a tool like the
        // lens calculator returns "Infinity cm" when f == do (1/0), which is not
        // a number a user can act on. Catch all three tokens here.
        if (/\bNaN\b|\bundefined\b|Infinity/i.test(resStr)) {
          const broken = resStr;
          // Actionable error: name the fields that are empty/zero/invalid so the user
          // knows exactly WHAT to fix (instead of a vague "invalid input" message).
          const badLabels = _findBadInputs();
          result.result = badLabels.length
            ? '⚠️ Please check: ' + badLabels.join(', ') + ' — enter valid numbers (can\'t be empty or zero where division is needed).'
            : '⚠️ Please enter valid numbers (values can\'t be zero where division is needed).';
          // Keep the raw broken math as diagnostic context, sanitized of NaN/Infinity tokens.
          result.extra = broken.replace(/\bNaN\b|\bundefined\b|Infinity/gi, '—');
          result.isHtml = false; // friendly message is plain text
          // Red-flag the offending inputs on the form itself for quick visual fix
          _flagBadInputs();
        }
      }
      if (result && result.extra && !result.extraHtml && /\bNaN\b|\bundefined\b|Infinity/i.test(String(result.extra))) {
        result.extra = String(result.extra).replace(/\bNaN\b|\bundefined\b|Infinity/gi, '—');
      }

      // Semantic HTML result table — AI/answer-engine crawlers prioritize structured
      // tabular data for snippet extraction (AEO). Rows: input values → main result → details.
      // NOTE: .result-main/.result-extra class names are preserved INSIDE the table cells so
      // existing queries (renderExplain, animateResultNumber, exportResultAsImage) keep working.
      let html = buildResultTable(tool, values, result);
      // Charts are generated by our own code, not user input, so they're safe
      if (result.chart) {
        html += '<div class="chart-area">' + result.chart + '</div>';
      }
      // AEO Direct Answer Box — semantic 2-sentence instant answer below the result
      // (Google Featured Snippets + ChatGPT/Perplexity love this pattern)
      html += buildDirectAnswer(tool, values, result);
      // Spreadsheet Formula block (Gap 2 — CalculatorSoup's goldmine): ready-to-paste
      // Excel/Sheets cell for the tool's live values, with a one-click copy button.
      if (typeof ExcelFormulas !== 'undefined' && typeof ExcelFormulas.has === 'function' && ExcelFormulas.has(tool.id)) {
        const formula = ExcelFormulas.build(tool.id, values);
        const hint = (ExcelFormulas.EXCEL_FORMULAS && ExcelFormulas.EXCEL_FORMULAS[tool.id]) ? ExcelFormulas.EXCEL_FORMULAS[tool.id].hint : '';
        if (formula) {
          html += '<section class="excel-block" aria-label="Spreadsheet formula">' +
            '<h3>📊 Spreadsheet Formula <span class="excel-badge">Excel / Google Sheets</span></h3>' +
            '<div class="excel-row"><code class="excel-formula" id="excel-formula-" + tool.id + "">' + Security.sanitizeHtml(formula) + '</code>' +
            '<button type="button" class="small-btn" onclick="App.copyExcelFormula(\'' + tool.id + '\')">📋 Copy</button></div>' +
            (hint ? '<p class="excel-hint">' + Security.sanitizeHtml(hint) + '</p>' : '') +
            '</section>';
        }
      }
      resultArea.innerHTML = html;
      
      // UX Round 3: show the tool's units as a compact badge strip under the result heading.
      // Units come from the input schema (label suffix in parens, e.g. "Weight (kg)") —
      // never from user input, so this is sanitize-safe by construction.
      const badgeEl = document.getElementById('result-unit-badges');
      if (badgeEl) {
        const seen = [];
        (tool.inputs || []).forEach(inp => {
          const m = String(inp.label || '').match(/\(([^)]+)\)$/);
          const u = m ? m[1].trim() : '';
          if (u && !seen.includes(u)) seen.push(u);
        });
        badgeEl.innerHTML = seen.length
          ? seen.map(u => '<span class="result-unit-badge">' + Security.sanitizeHtml(u) + '</span>').join('')
          : '';
      }
      
      // Haptic + ASMR success feedback (subtle tactile confirmation of a finished calc)
      if (window.Feedback && typeof Feedback.success === 'function') {
        try { Feedback.success(); } catch (e) {}
      }
      
      // Steps
      if (typeof AdvancedFeatures.renderSteps === 'function') {
        AdvancedFeatures.renderSteps(tool, values, result);
      }
      
      // Explain
      renderExplain(tool, values, result);
      
      // Sensitivity table (ZR heatmap takes over when 2+ numeric inputs exist)
      renderSensitivity(tool, values);
      
      // Zero-Risk post-calc: scenario chart, amortization, health score, voice walkthrough
      if (window.ZR && typeof ZR.afterCalc === 'function') {
        try { ZR.afterCalc(tool, values, result); } catch (e) { /* never break result render */ }
      }
      
      // Visual polish post-calc (S2): what-if balance chart + result gauge — additive
      if (window.VisualPolish && typeof VisualPolish.afterCalc === 'function') {
        try { VisualPolish.afterCalc(tool, values, result); } catch (e) { /* never break result render */ }
      }

      // S7: contextual did-you-know fact under the result (deterministic per tool)
      try {
        if (window.Engagement && !resultArea.querySelector('.cp-funfact')) {
          const factHtml = Engagement.renderFactPanel(tool.cat || '', tool.id);
          if (factHtml) resultArea.insertAdjacentHTML('beforeend', factHtml);
        }
      } catch (e) { /* never break result render */ }

      // S12: one-line summary, interpretation scale, estimate note, payoff timeline (#87/#86/#89/#90)
      try {
        if (window.DecideUI && typeof DecideUI.afterCalc === 'function') {
          DecideUI.afterCalc(tool, values, resultArea);
        }
      } catch (e) { /* never break result render */ }

      // S6: result read-aloud button (user-initiated TTS, not auto)
      try {
        const main = resultArea.querySelector('.result-main');
        if (main && !document.getElementById('cp-speak-result')) {
          const btn = document.createElement('button');
          btn.id = 'cp-speak-result';
          btn.type = 'button';
          btn.textContent = '🔊 Listen';
          btn.setAttribute('aria-label', 'Read the result aloud');
          btn.style.cssText = 'margin:8px 0 0;padding:6px 12px;font-size:.85rem;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text);cursor:pointer';
          btn.addEventListener('click', function () {
            if (window.Comfort) {
              Comfort.speakResult(tool.name, main.textContent + '. ' + (resultArea.querySelector('.result-sub') ? resultArea.querySelector('.result-sub').textContent : ''));
            }
          });
          main.insertAdjacentElement('afterend', btn);
        }
      } catch (e) { /* never break result render */ }
      
      // Animate charts
      setTimeout(() => { if (window.AdvancedFeatures) AdvancedFeatures.animateCharts(); }, 100);
      
      // Animate number count-up on result
      const resultMain = resultArea.querySelector('.result-main');
      if (resultMain) {
        // S10 #71: one-shot highlight pulse (re-added each calc; harmless if reduced-motion)
        resultMain.classList.remove('pulsing');
        void resultMain.offsetWidth; // restart animation
        resultMain.classList.add('pulsing');
        setTimeout(() => {
          if (typeof AdvancedFeatures.animateResultNumber === 'function') {
            AdvancedFeatures.animateResultNumber(resultMain, resultMain.textContent);
          }
        }, 150);
      }
      
      // Success animation (subtle)
      if (typeof AdvancedFeatures.showSuccessAnimation === 'function') {
        AdvancedFeatures.showSuccessAnimation();
      }
      
      // History — save the full input snapshot so entries can be restored (save/load)
      if (typeof CalcHistory !== 'undefined' && typeof CalcHistory.add === 'function') {
        CalcHistory.add({ toolId: tool.id, toolName: tool.name, catKey: _state.cat, result: result.result, extra: result.extra, values: values });
      }
      if (typeof CalcAnalytics !== 'undefined' && typeof CalcAnalytics.trackCalc === 'function') {
        CalcAnalytics.trackCalc(tool.id, tool.name);
      }
      // GA4 calculator event (consent-gated; NO input values / PII — only tool id + category)
      if (window.gtag && window.SITE_GA4_READY) {
        try {
          gtag('event', 'calculator_use', { tool_id: tool.id, tool_category: _state.cat });
        } catch (e) { /* non-fatal — analytics must never break a calculation */ }
      }
      
      // Chain
      if (typeof AdvancedFeatures.addToChain === 'function') {
        AdvancedFeatures.addToChain(tool.id, tool.name, result, values);
        AdvancedFeatures.renderChainBar();
      }
      
      // Achievements
      if (typeof AdvancedFeatures.checkAchievements === 'function') {
        AdvancedFeatures.checkAchievements(tool.id, _state.cat);
      }
      
      // Pin pin bar
      if (typeof AdvancedFeatures.renderPinBar === 'function') {
        AdvancedFeatures.renderPinBar();
      }
      
      // Stateful URLs: serialize inputs into the query string (shareable + back/forward-safe)
      if (window.URLStateManager) {
        try { URLStateManager.pushState(tool, values); } catch (e) { /* best-effort */ }
      }
      
      // Announce result to screen readers (aria-live)
      if (window.A11y) {
        try { A11y.announceResult(result && result.result ? String(result.result) : ''); } catch (e) {}
      }
      
      // Broadcast calc completion — CommunityGrowth listens for export-bar + newsletter nudge
      try {
        window.dispatchEvent(new CustomEvent('calc:done', { detail: { toolId: tool.id, catKey: _state.cat, result: result } }));
      } catch (e) {}
      
      // Render contextual affiliate offer below the result
      if (window.MonetizationManager) {
        try { MonetizationManager.render(tool.id, _state.cat, 'monetization-area'); } catch (e) {}
      }
      
    } catch (err) {
      var errMsg = err.message || String(err);
      // Show friendly toast instead of blank crash
      try { App.showToast('Calculation error: please verify your input formats.', 4000); } catch(e) {}
      // Dispatch crash event for step-log / timeline capture
      try {
        window.dispatchEvent(new CustomEvent('calc:fatal_crash', {
          detail: { toolId: _state.tool.tool.id, error: errMsg, stack: err.stack || '' }
        }));
      } catch(e) {}
      // Structured log via Monitor (Sentry-ready, localStorage buffer)
      if (typeof Monitor !== 'undefined' && typeof Monitor.captureException === 'function') {
        try { Monitor.captureException(err, 'executeCalc toolId=' + (_state.tool.tool.id || '')); } catch(e) {}
      }
      // Return safe fallback so the UI panel doesn't freeze
      resultArea.innerHTML = '<div class="error">Error: ' + Security.sanitizeHtml(errMsg) + '</div>' +
        '<div class="result-extra" style="margin-top:8px;font-size:13px;color:var(--text-light)">' +
        'Our team has been alerted. Please verify your input formats.</div>';
    }
  }

  function renderExplain(tool, values, result) {
    const area = document.getElementById('explain-area');
    if (!area) return;
    
    // Use SEO-optimized 500+ word guide from TOOL_SEO if available
    var seo = window.TOOL_SEO && window.TOOL_SEO[tool.id] || null;
    
    if (seo && seo.desc) {
      // Full SEO guide: 6-block blueprint with proper heading hierarchy (h2 > h3).
      // seo.desc already contains its own <h2>What This Calculator Does</h2>,
      // so no extra heading is prepended here to avoid duplicate h2s.
      var html = '<div class="explain-card seo-guide">';
      html += seo.desc;
      
      // Append FAQs from SEO data (Block 6)
      if (seo.faqs && seo.faqs.length > 0) {
        html += '<h2>Frequently Asked Questions</h2>';
        html += '<div class="seo-faqs">';
        seo.faqs.forEach(function(faq) {
          html += '<h3>' + faq.q + '</h3>';
          html += '<p>' + faq.a + '</p>';
        });
        html += '</div>';
      }
      
      html += '</div>';
      area.innerHTML = html;
      return;
    }
    
    // Fallback: Build structural explain card
    var parts = [];
    
    // 1. Quick summary (one line, under 15 words)
    parts.push('<div class="explain-summary">📋 <strong>What this means:</strong> ' + getExplainSummary(tool, values) + '</div>');
    
    // 2. Key facts as a bullet grid
    var facts = getExplainFacts(tool, values, result);
    if (facts.length > 0) {
      parts.push('<ul class="explain-facts">');
      facts.forEach(function(f) {
        parts.push('<li>' + f + '</li>');
      });
      parts.push('</ul>');
    }
    
    // 3. Input variable table
    var grid = getExplainGrid(tool, values);
    if (grid.length > 0) {
      parts.push('<div class="explain-grid">');
      grid.forEach(function(row) {
        parts.push('<div class="explain-grid-item"><span class="eg-label">' + row[0] + '</span><span class="eg-value">' + row[1] + '</span></div>');
      });
      parts.push('</div>');
    }
    
    // 4. Dynamic value tip
    var tip = getExplainTip(tool, values, result);
    if (tip) {
      parts.push('<div class="explain-tip">💡 <strong>Pro Tip:</strong> ' + tip + '</div>');
    }
    
    area.innerHTML = '<div class="explain-card how-it-works"><h4>🔍 How This Works</h4>' + parts.join('') + '</div>';
  }
  
  function getExplainSummary(tool, values) {
    var s = {
      'loan-emi': 'Your periodic payment: split of principal vs interest over time.',
      'mortgage': 'Your monthly payment: principal + interest across the loan term.',
      'auto-loan': 'Car loan payment including principal, interest, and amortization.',
      'bmi': 'Body Mass Index from your height and weight. Screening tool only.',
      'compound-interest': 'Your money grows exponentially — earnings generate more earnings.',
      'simple-interest': 'Linear growth on principal only. No compounding effect.',
      'percentage': 'Part-to-whole ratio expressed as a fraction of 100.',
      'tip': 'Suggested gratuity based on bill total and service percentage.',
      'fuel-cost': 'Estimated fuel expense for a trip based on distance and mileage.',
      'age': 'Exact age in years, months, and days from birth date.',
      'date-diff': 'Precise calendar gap between two selected dates.',
    };
    return s[tool.id] || 'Result calculated from your inputs using standard formulas.';
  }
  
  function getExplainFacts(tool, values, result) {
    var facts = [];
    var r = result && result.result ? result.result.toString() : '';
    
    if (tool.id === 'loan-emi' || tool.id === 'mortgage' || tool.id === 'auto-loan') {
      var mode = values.mode || 'payment';
      facts.push('Standard amortization formula: fixed payment, declining interest over time.');
      facts.push('Each payment splits into interest cost + principal reduction.');
      if (mode === 'payment') facts.push('Lower rate or shorter term = less total interest paid.');
      if (mode === 'amount') facts.push('Your income and debt ratio limits maximum borrowing power.');
    } else if (tool.id === 'bmi') {
      facts.push('Formula: weight(kg) ÷ height(m)². Age and muscle mass affect accuracy.');
      facts.push('Healthy range: 18.5–24.9. Athletes may show higher BMI with low body fat.');
      facts.push('30+ indicates obesity. Consult a doctor for clinical assessment.');
    } else if (tool.id === 'compound-interest') {
      facts.push('Formula: A = P × (1 + r/n)⁽ⁿˣ⁾. More freq = faster growth.');
      facts.push('Starting 5 years earlier can double your final corpus.');
      if (values.contribution > 0) facts.push('Monthly contributions amplify the snowball effect significantly.');
    } else if (tool.id === 'simple-interest') {
      facts.push('Formula: I = P × r × t. No compounding on earned interest.');
      facts.push('Common for short-term loans and certain bonds.');
    } else {
      facts.push('Result is based on standard mathematical formulas for this type.');
      facts.push('All calculations are estimates. Verify independently for critical decisions.');
    }
    return facts;
  }
  
  function getExplainGrid(tool, values) {
    var grid = [];
    (tool.inputs || []).forEach(function(inp) {
      if (inp.type === 'number' || inp.type === 'text') {
        var val = values[inp.id];
        if (val !== undefined && val !== '') {
          grid.push([inp.label || inp.id, String(val)]);
        }
      }
    });
    return grid;
  }
  
  function getExplainTip(tool, values, result) {
    // Dynamic, actionable value tips. Targets Google Helpful Content criteria.
    var tips = {
      'loan-emi': function() {
        var r = parseFloat(values.rate) || 6;
        if (r > 2) return 'A 0.5% rate reduction saves about $50/year per $10k borrowed. Over 5 years that is ~$250 saved.';
        return 'Making one extra payment per year cuts your loan term by years.';
      },
      'mortgage': function() {
        return 'Paying bi-weekly instead of monthly makes 13 full payments per year, shaving ~4 years off a 30-year loan.';
      },
      'auto-loan': function() {
        return 'A 60-month loan costs less in interest than 72 months. Stretch only if monthly budget is tight.';
      },
      'bmi': function() {
        var bmi = result && result.result ? parseFloat(result.result) : 0;
        if (bmi > 25) return 'Losing 5–10% of body weight can lower BMI by 2–4 points and reduce health risks.';
        if (bmi < 18.5) return 'Gaining 5–10 lbs moves most underweight individuals into the healthy range.';
        return 'Maintaining your current BMI reduces risk of heart disease and diabetes.';
      },
      'compound-interest': function() {
        return 'Even small extra monthly contributions accelerate growth dramatically over 10+ years.';
      },
      'simple-interest': function() {
        return 'Simple interest is best for short terms. Switch to compound for long-term growth.';
      },
      'percentage': function() {
        return 'A 20% down payment on a home avoids PMI insurance, saving hundreds per month.';
      },
      'tip': function() {
        return 'Rounding up to the nearest dollar as a tip adds up to meaningful generosity over time.';
      },
      'fuel-cost': function() {
        return 'Driving 5 mph slower on highways improves fuel efficiency by 7–14%.';
      },
    };
    var gen = tips[tool.id];
    return gen ? gen() : null;
  }

  function renderSensitivity(tool, values) {
    const area = document.getElementById('sensitivity-area');
    if (!area) return;
    
    // Only show for tools with at least 1 numeric input
    const numInputs = tool.inputs.filter(i => i.type === 'number').filter(i => i.id !== 'mode' && i.id !== 'paymentFreq' && i.id !== 'freq');
    if (numInputs.length === 0 || tool.inputs.length > 8) { area.innerHTML = ''; return; }
    
    // ZR heatmap renders the 2-variable color grid when available
    if (numInputs.length >= 2 && window.ZR && typeof ZR.heatmap === 'function') {
      try { if (ZR.heatmap(tool, values)) return; } catch (e) { /* fall back to table */ }
    }
    
    const firstNum = numInputs[0];
    const baseVal = parseFloat(values[firstNum.id]) || 0;
    if (!baseVal) { area.innerHTML = ''; return; }
    
    let html = '<details class="calc-collapsible" open><summary>📊 Sensitivity Analysis — Varying ' + firstNum.label + '</summary>';
    html += '<table class="sensitivity-table"><thead><tr><th>Change</th><th>Value</th><th>Result</th></tr></thead><tbody>';
    
    const variations = [-20, -10, -5, 0, 5, 10, 20];
    variations.forEach(pct => {
      const val = baseVal * (1 + pct / 100);
      const testVals = { ...values, [firstNum.id]: val };
      try {
        const r = tool.calc(testVals);
        // Tool results can be numbers (e.g. auto-fare returns 85) — coerce before substring
        const resultStr = String(r.result == null ? '' : r.result);
        const delta = pct;
        html += '<tr class="' + (delta === 0 ? 'base-row' : '') + '">';
        html += '<td>' + (delta > 0 ? '+' : '') + delta + '%</td>';
        html += '<td>' + val.toFixed(2) + '</td>';
        // XSS-hardening: tool results can echo user input — escape before innerHTML
        html += '<td class="' + (delta !== 0 ? (delta > 0 ? 'delta-pos' : 'delta-neg') : '') + '">' + Security.sanitizeHtml(resultStr.substring(0, 30)) + '</td>';
        html += '</tr>';
      } catch (e) {
        // skip failed
      }
    });
    
    html += '</tbody></table></details>';
    area.innerHTML = html;
  }

  function _collectValues() {
    const values = {};
    if (!_state.tool) return values;
    _state.tool.tool.inputs.forEach(inp => {
      const el = document.getElementById(inp.id);
      if (el) {
        if (inp.type === 'checkbox') values[inp.id] = el.checked;
        else if (inp.type === 'number') {
          // Use Security.sanitizeCalcValue for robust numeric sanitation
          let v = Security.sanitizeCalcValue(el.value, 0);
          // Inline unit switching (Gap 3): when a unit select is attached, the input
          // shows the value in the SELECTED unit — divide back to the base unit here
          // so the calc always receives kg/cm/km (factor 1) regardless of display.
          const uSel = document.getElementById(inp.id + '-unit');
          if (uSel && uSel.dataset && uSel.dataset.f) {
            const f = parseFloat(uSel.dataset.f);
            if (f && isFinite(f) && f !== 1) v = v / f;
          }
          values[inp.id] = v;
        }
        else values[inp.id] = Security.validateInput(el.value, { maxLen: 500 });
      } else {
        values[inp.id] = inp.def || '';
      }
    });
    return values;
  }

  // UX Round 3: actionable validation. Finds numeric inputs that are empty, NaN, or
  // zero — these are the usual culprits behind a NaN result (division by zero).
  function _findBadInputs() {
    const out = [];
    if (!_state.tool) return out;
    (_state.tool.tool.inputs || []).forEach(inp => {
      if (inp.type === 'number') {
        const el = document.getElementById(inp.id);
        if (!el) return;
        const raw = String(el.value || '').trim();
        const n = parseFloat(raw);
        const bad = raw === '' || !isFinite(n) || n === 0;
        if (bad) out.push(String(inp.label || inp.id));
      }
    });
    return out;
  }

  // Adds a red error ring + tooltip to the offending inputs (cleared on next input).
  function _flagBadInputs() {
    if (!_state.tool) return;
    (_state.tool.tool.inputs || []).forEach(inp => {
      if (inp.type !== 'number') return;
      const el = document.getElementById(inp.id);
      if (!el) return;
      const raw = String(el.value || '').trim();
      const n = parseFloat(raw);
      const bad = raw === '' || !isFinite(n) || n === 0;
      el.classList.toggle('input-error', bad);
      el.setAttribute('aria-invalid', bad ? 'true' : 'false');
      if (bad) {
        const label = String(inp.label || inp.id);
        el.title = 'Enter a valid non-zero number for ' + label;
      }
    });
  }

  // Clears error styling as soon as the user starts typing a fix.
  function clearInputError(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('input-error');
    el.removeAttribute('aria-invalid');
    el.removeAttribute('title');
  }

  // ---------- Static Pages ----------
  function updateSocialProof() {
    const container = document.getElementById('social-proof-stats');
    if (!container) return;
    try {
      const data = CalcAnalytics.getData();
      const totalCalcs = data.totalCalcs || 0;
      const totalVisits = data.totalVisits || 0;
      const toolsUsed = Object.keys(data.tools || {}).length;
      const formattedCalcs = totalCalcs.toLocaleString();
      const formattedVisits = totalVisits.toLocaleString();
      container.innerHTML = [
        `<span>🧮 <strong>${formattedCalcs}</strong> calculations run</span>`,
        `<span>👥 <strong>${formattedVisits}</strong> visits</span>`,
        `<span>🛠️ <strong>${toolsUsed}</strong> calculators used</span>`,
        `<span>📱 Runs in your browser • No server storage</span>`
      ].join('');
    } catch(e) {
      container.innerHTML = '<span>⚡ ' + getCalculatorCount() + '+ calculators • 100% free</span>';
    }
  }

  function updateSocialProof() {
    const container = document.getElementById('social-proof-stats');
    if (!container) return;
    try {
      const data = CalcAnalytics.getData();
      const totalCalcs = data.totalCalcs || 0;
      const totalVisits = data.totalVisits || 0;
      const toolsUsed = Object.keys(data.tools || {}).length;
      const formattedCalcs = totalCalcs.toLocaleString();
      const formattedVisits = totalVisits.toLocaleString();
      container.innerHTML = [
        `<span>🧮 <strong>${formattedCalcs}</strong> calculations run</span>`,
        `<span>👥 <strong>${formattedVisits}</strong> visits</span>`,
        `<span>🛠️ <strong>${toolsUsed}</strong> calculators used</span>`,
        `<span>📱 Runs in your browser • No server storage</span>`
      ].join('');
    } catch(e) {
      container.innerHTML = '<span>⚡ ' + getCalculatorCount() + '+ calculators • 100% free</span>';
    }
  }

  function renderStatic(pageKey) {
    _state.tool = null;
    const page = STATIC_PAGES[pageKey];
    if (!page) { renderStatic('404'); return; }
    
    const main = document.getElementById('mainContent');
    if (!main) return;
    document.title = page.title;
    updateMeta(page.desc, '/' + pageKey);
    // SPA soft-404 guard: when a URL falls through to the 404 page, tell crawlers
    // it is NOT indexable content (the 200 shell alone looks like a soft-404).
    // Restored to index,follow as soon as any real page renders (see below).
    if (page.type === '404') {
      let robots = document.querySelector('meta[name="robots"]');
      if (!robots) {
        robots = document.createElement('meta');
        robots.name = 'robots';
        document.head.appendChild(robots);
      }
      robots.content = 'noindex, follow';
    } else {
      const robots = document.querySelector('meta[name="robots"]');
      if (robots && robots.content.indexOf('noindex') !== -1) robots.content = 'index, follow';
    }
    
    let html = '';
    
    if (page.type === 'home') { renderHome(); return; }
    if (page.type === 'about') {
      html = '<div class="legal-page">';
      html += '<h1>About CalcPro</h1>';
      html += '<p class="legal-meta">CalcPro is a free, comprehensive online calculator platform with ' + getCalculatorCount() + '+ tools spanning finance, health, math, science, business, construction, conversion, education, and everyday life.</p>';
      html += '<h2>Our Mission</h2>';
      html += '<p>To provide accurate, easy-to-use, and free calculators with step-by-step solutions — no sign-ups, no data collection without your consent, no hidden fees.</p>';
      html += '<h2>Key Features</h2>';
      html += '<ul><li>' + getCalculatorCount() + '+ calculators across ' + Object.keys(CALC_DATA).length + ' categories</li><li>Step-by-step solutions</li><li>Interactive charts and visualizations</li><li>Dark mode and high-contrast accessibility</li><li>PWA — installable and works offline</li><li>Multi-language support scaffold</li><li>QR code sharing</li><li>Scenario comparison mode</li></ul>';
      html += '<h2>Technology</h2>';
      html += '<p>Built with pure vanilla JavaScript, CSS, and HTML. Zero external dependencies. All calculations run entirely in your browser — your inputs and results are never sent to any server. The only external requests are optional consent-gated analytics and advertising scripts, which measure page visits and never receive your calculator inputs.</p>';
      html += '<h2>Contact</h2>';
      html += '<p>Have feedback, suggestions, or found a bug? <a href="/contact" onclick="event.preventDefault();Router.navigate(\'/contact\')">Contact us</a>.</p>';
      html += '</div>';
    } else if (page.type === 'editorial-policy') {
      // Single source of truth: the same content the static /editorial-policy
      // page serves (js/legal-pages.js EDITORIAL_POLICY), rendered in-SPA.
      const stripSpa = function (h) { return String(h).replace(/\sonclick="[^"]*"/g, ''); };
      html = (typeof LegalPages !== 'undefined' && LegalPages.EDITORIAL_POLICY)
        ? stripSpa(LegalPages.EDITORIAL_POLICY)
        : '<h1>Editorial Policy</h1><p>How CalcProMaster content is written, verified and corrected: published formulas, hand-checked worked examples, and an automated QA contract on every build. Contact <a href="mailto:calpromaster@gmail.com">calpromaster@gmail.com</a> for corrections.</p>';
    } else if (page.type === 'privacy') {
      html = '<div class="legal-page"><h1>Privacy Policy</h1>';
      html += '<p class="legal-meta">Last updated: July 2026</p>';
      html += '<p>CalcPro respects your privacy. This policy explains how we handle your data.</p>';
      html += '<h2>Data We Collect</h2>';
      html += '<p><strong>We collect NO personal data on our servers.</strong> All calculations happen entirely in your browser. We do not have accounts, logins, or databases.</p>';
      html += '<h2>Local Storage</h2>';
      html += '<p>CalcPro uses your browser\'s localStorage to save:</p>';
      html += '<ul><li>Your calculation history</li><li>Your favorite calculators</li><li>Theme preference (dark/light mode)</li><li>Saved presets and pinned results</li><li>Anonymous usage statistics (visit count, tool usage counts)</li></ul>';
      html += '<p>This data never leaves your device. You can clear it at any time via your browser settings.</p>';
      html += '<h2>Third-Party Services</h2>';
      html += '<p><strong>Currency Exchange Rates:</strong> We fetch live exchange rates from open.er-api.com. This does not send any personal data.</p>';
      html += '<p><strong>Google Analytics:</strong> We use Google Analytics 4 with consent mode. Analytics only activates if you accept. No personal data is shared.</p>';
      html += '<p><strong>Google AdSense:</strong> If enabled, AdSense may use cookies for personalized advertising. This is governed by Google\'s privacy policy.</p>';
      html += '<h2>Your Rights</h2>';
      html += '<p>You can view, export, or delete all your localStorage data at any time through your browser settings. No personal data is stored on any server.</p>';
      html += '<h2>Contact</h2>';
      html += '<p>For privacy questions: <a href="/contact" onclick="event.preventDefault();Router.navigate(\'/contact\')">Contact page</a></p></div>';
    } else if (pageKey === 'terms') {
      html = '<div class="legal-page"><h1>Terms of Service</h1>';
      html += '<p class="legal-meta">Last updated: July 2026</p>';
      html += '<h2>Acceptance of Terms</h2>';
      html += '<p>By using CalcPro, you agree to these terms. If you do not agree, do not use the site.</p>';
      html += '<h2>Use of Calculators</h2>';
      html += '<p>All calculators are provided for informational and educational purposes only. Results are estimates and should not be used as the sole basis for financial, medical, legal, or other important decisions.</p>';
      html += '<h2>No Warranty</h2>';
      html += '<p>CalcPro provides the service "as is" without any warranty. We do not guarantee accuracy, completeness, or timeliness of calculations.</p>';
      html += '<h2>Limitation of Liability</h2>';
      html += '<p>CalcPro and its creators are not liable for any damages arising from use of this site.</p>';
      html += '<h2>Intellectual Property</h2>';
      html += '<p>All content, code, and design are owned by CalcPro. You may not reproduce, distribute, or modify without permission.</p>';
      html += '<h2>Changes</h2>';
      html += '<p>We may update these terms at any time. Continued use after changes constitutes acceptance.</p>';
      html += '<h2>Governing Law</h2>';
      html += '<p>These terms are governed by the laws of [Your Country/State]. Please replace this with your jurisdiction.</p></div>';
    } else if (pageKey === 'cookies') {
      html = '<div class="legal-page"><h1>Cookie & Local Storage Policy</h1>';
      html += '<p class="legal-meta">Last updated: July 2026</p>';
      html += '<h2>How We Use Storage</h2>';
      html += '<p>CalcPro uses browser localStorage (not cookies) to save your preferences, calculation history, and favorites. This is essential for the app to function.</p>';
      html += '<h2>Third-Party Cookies</h2>';
      html += '<p>If you enable Google Analytics or AdSense via our consent banner, those services may set their own cookies. You can control this via the consent banner.</p>';
      html += '<h2>Managing Your Data</h2>';
      html += '<p>You can clear all CalcPro data at any time through your browser settings or by clearing localStorage.</p></div>';
    } else if (pageKey === 'contact') {
      html = '<div class="legal-page"><h1>Contact CalcProMaster</h1>';
      html += '<p>We\'d love to hear from you! Whether you have questions, feedback, found a bug, or want to partner with us, please reach out.</p>';
      html += '<div class="contact-email">📧 <a href="mailto:calpromaster@gmail.com">calpromaster@gmail.com</a></div>';
      html += '<h2>Business &amp; Partnership Inquiries</h2>';
      html += '<p>Interested in affiliate partnerships, sponsored placements, content collaborations, or backlink exchanges? Email <a href="mailto:calpromaster@gmail.com">calpromaster@gmail.com</a> with the subject line <em>Partnership</em> and we typically reply within 2-3 business days.</p>';
      html += '<p>We accept a limited number of <strong>sponsored recommendation placements</strong> in calculator result pages (clearly labeled "Recommended") plus <strong>guest content and editorial backlinks</strong>. All partnerships are disclosed and never affect calculation results.</p>';
      html += '<h2>Recommended Resources &amp; Partners</h2>';
      html += '<p>We carefully curate a short list of trusted resources we personally use and recommend. These links may include affiliate relationships — when you buy through them we may earn a small commission at no extra cost to you. It never affects our calculator results.</p>';
      html += '<ul class="partner-list">';
      html += '<li>📈 <a href="https://www.investopedia.com/" rel="nofollow noopener sponsored" target="_blank">Investopedia</a> — financial education and definitions</li>';
      html += '<li>💳 <a href="https://www.nerdwallet.com/" rel="nofollow noopener sponsored" target="_blank">NerdWallet</a> — rate and card comparisons</li>';
      html += '<li>📊 <a href="https://www.semrush.com/" rel="nofollow noopener sponsored" target="_blank">Semrush</a> — SEO and keyword research</li>';
      html += '<li>🔗 <a href="https://ahrefs.com/" rel="nofollow noopener sponsored" target="_blank">Ahrefs</a> — backlink analysis</li>';
      html += '<li>🩺 <a href="https://www.who.int/health-topics" rel="nofollow noopener" target="_blank">WHO Health Topics</a> — health standards (editorial reference)</li>';
      html += '</ul>';
      html += '<h2>Report a Bug</h2>';
      html += '<p>Found something not working? Please include details about what you were calculating and what went wrong.</p>';
      html += '<h2>Feature Requests</h2>';
      html += '<p>Have an idea for a new calculator or feature? We\'d love to hear it.</p></div>';
    } else if (pageKey === 'favorites') {
      const favs = AdvancedFeatures.getFavorites();
      html = '<div class="legal-page"><h1>★ Your Favorites</h1>';
      if (favs.length === 0) {
        html += '<div class="empty-state"><div class="empty-state-icon">⭐</div><h3>No Favorites Yet</h3><p>Browse calculators and click the ★ button to save your favorites for quick access.</p><button class="action-btn" onclick="Router.navigate(\'/\')">Browse Calculators</button></div>';
      } else {
        html += '<div class="tools-grid">';
        favs.forEach(f => {
          // XSS-hardening: favorites from localStorage — escape onclick args + text
          html += `<div class="tool-card" onclick="App.navigateToTool('${Security.sanitizeJsString(f.id)}','${Security.sanitizeJsString(f.cat)}')"><h4>${Security.sanitizeHtml(f.name)}</h4></div>`;
        });
        html += '</div>';
      }
      html += '</div>';
    } else if (pageKey === 'history') {
      const hist = CalcHistory.getAll();
      html = '<div class="legal-page"><h1>📜 Calculation History</h1>';
      html += '<p class="legal-meta">Your last ' + Math.min(hist.length, 200) + ' calculations, saved locally on this device. Click a row to restore its inputs (save/load).</p>';
      // Toolbar: search + export/import backup + clear
      html += '<div class="history-toolbar">';
      html += '<input type="text" id="history-search" class="cat-search" placeholder="Search history…" oninput="App.filterHistory(this.value)" aria-label="Search history">';
      html += '<button class="action-btn small-btn" onclick="App.exportHistory()" title="Download backup JSON">⬇️ Export</button>';
      html += '<button class="action-btn small-btn" onclick="App.importHistory()" title="Restore from backup JSON">⬆️ Import</button>';
      html += '</div>';
      html += '<div id="history-list-container">' + _historyListHtml(hist) + '</div>';
      if (hist.length > 0) {
        html += '<button class="action-btn" style="margin-top:16px" onclick="CalcHistory.clear();Router.navigate(\'/history\')">Clear History</button>';
      }
      html += '</div>';
    } else if (pageKey === 'compare') {
      html = '<div class="legal-page"><h1>📊 Compare Results</h1>';
      html += '<p>Open any calculator, pin results, then come here to compare them side by side.</p>';
      html += '<div id="compare-content"></div></div>';
    } else if (pageKey === 'disclaimer-finance' || pageKey === 'disclaimer-health' || pageKey === 'disclaimer-general') {
      html = '<div class="legal-page"><h1>' + page.title + '</h1>';
      html += '<p class="legal-meta">Last updated: July 2026</p>';
      if (pageKey === 'disclaimer-finance') {
        html += '<div class="legal-warning">⚠️ This calculator provides estimates for informational purposes only and does not constitute financial advice. Consult a qualified financial advisor before making financial decisions.</div>';
        html += '<p>The finance calculators on CalcPro are designed for educational and illustrative purposes. They do not account for all factors that may affect real-world financial outcomes, including but not limited to: taxes, fees, inflation, market volatility, and individual circumstances.</p>';
      } else if (pageKey === 'disclaimer-health') {
        html += '<div class="legal-warning">⚠️ This calculator provides general estimates and is not a substitute for professional medical advice. Consult a doctor or healthcare provider.</div>';
        html += '<p>Health calculators on CalcPro provide general estimates based on standard formulas. Individual results may vary significantly based on genetics, lifestyle, medical conditions, and other factors.</p>';
      } else {
        html += '<div class="legal-warning">⚠️ Results are estimates only. Verify important calculations independently.</div>';
        html += '<p>All calculators on CalcPro are provided "as-is" for informational purposes. While we strive for accuracy, we cannot guarantee that results are error-free or appropriate for your specific situation.</p>';
      }
      html += '<h2>Important Notes</h2>';
      html += '<ul><li>Always verify critical calculations with a professional</li><li>Results may differ from real-world outcomes</li><li>We are not liable for decisions based on these calculations</li></ul></div>';
    } else if (pageKey === 'guides') {
      // Educational guides hub — links to the static guide articles under /guides/
      // (full page loads: the guides are standalone static HTML pages).
      html = '<div class="legal-page"><h1>📚 Educational Guides &amp; How-To Articles</h1>';
      html += '<p class="legal-meta">Free, step-by-step explanations of the calculations people search for most — formulas, worked examples, and links to the matching calculators.</p>';
      html += '<h2 style="margin-top:22px">Browse by topic</h2>';
      html += '<a href="/guides/loans-mortgages" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Loan &amp; Mortgage Guides</strong><br><span style="color:var(--text-light);font-size:13px">EMI, compound interest, mortgage payments — formulas and honest limits.</span></a>';
      html += '<a href="/guides/tax-salary" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Tax &amp; Salary Guides</strong><br><span style="color:var(--text-light);font-size:13px">Income tax brackets, reverse GST, zakat, gross-to-net salary.</span></a>';
      html += '<a href="/guides/health-fitness" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Health &amp; Fitness Guides</strong><br><span style="color:var(--text-light);font-size:13px">BMI and what it ignores, BMR/TDEE math, calorie deficits.</span></a>';
      html += '<a href="/guides/math-statistics" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Math &amp; Statistics Guides</strong><br><span style="color:var(--text-light);font-size:13px">Percentage formulas, statistics basics, random number generators.</span></a>';
      html += '<a href="/guides/business" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Business Guides</strong><br><span style="color:var(--text-light);font-size:13px">Break-even café example, margin vs markup, target profit.</span></a>';
      html += '<a href="/guides/construction" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Construction Guides</strong><br><span style="color:var(--text-light);font-size:13px">Concrete volume and bags, the 10% wastage rule, unit conversions.</span></a>';
      html += '<a href="/guides/science" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Science Guides</strong><br><span style="color:var(--text-light);font-size:13px">Ohm\u2019s law, density, force — physics formulas with worked numbers.</span></a>';
      html += '<a href="/guides/engineering" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Engineering Guides</strong><br><span style="color:var(--text-light);font-size:13px">Voltage drop, gear ratios, torque — the assumptions behind the formulas.</span></a>';
      html += '<a href="/guides/auto" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Auto &amp; Vehicle Guides</strong><br><span style="color:var(--text-light);font-size:13px">Fuel cost per km, car EMI, EV-vs-petrol decision.</span></a>';
      html += '<a href="/guides/career" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Career &amp; Freelance Guides</strong><br><span style="color:var(--text-light);font-size:13px">Hourly conversion, freelance rates, overtime pay.</span></a>';
      html += '<a href="/guides/homegarden" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Home &amp; Garden Guides</strong><br><span style="color:var(--text-light);font-size:13px">Room area, paint coverage, wallpaper rolls, AC sizing.</span></a>';
      html += '<a href="/guides/family" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Family &amp; Parenting Guides</strong><br><span style="color:var(--text-light);font-size:13px">Family budgets, baby growth, college savings.</span></a>';
      html += '<a href="/guides/food" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Food &amp; Nutrition Guides</strong><br><span style="color:var(--text-light);font-size:13px">Daily calories, macros, protein targets, recipe scaling.</span></a>';
      html += '<a href="/guides/lifestyle" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Lifestyle Guides</strong><br><span style="color:var(--text-light);font-size:13px">Moving costs, deposits, true cost of daily habits.</span></a>';
      html += '<a href="/guides/regional" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Regional Finance Guides</strong><br><span style="color:var(--text-light);font-size:13px">FD, PPF, SIP, GST — India-specific rules.</span></a>';
      html += '<a href="/guides/everyday" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Everyday Guides</strong><br><span style="color:var(--text-light);font-size:13px">Exact age, date differences, electricity bills decoded.</span></a>';
      html += '<a href="/guides/utilities" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Utilities Guides</strong><br><span style="color:var(--text-light);font-size:13px">Password entropy, UUID guarantees, tool concepts.</span></a>';
      html += '<div style="margin-top:20px"><strong style="font-size:15px">From the blog</strong> — <a href="/blog" style="color:var(--primary)">all posts</a></div>';
      html += '<a href="/blog/stacked-discounts" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>\u201cExtra 20% off\u201d is less than you think</strong><br><span style="color:var(--text-light);font-size:13px">Why 30% + 20% off is 44%, not 50% — stacked discount math with worked examples.</span></a>';
      html += '<a href="/blog/how-emi-works" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>How banks calculate your EMI</strong><br><span style="color:var(--text-light);font-size:13px">Amortization demystified: the shifting interest/principal split, a real 36-month view, prepayment math.</span></a>';
      html += '<a href="/blog/bmi-honest-look" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>BMI is a screening tool, not a diagnosis</strong><br><span style="color:var(--text-light);font-size:13px">What the formula can and cannot see — and which companion metrics fill the gaps.</span></a>';
      html += '<div class="related-tools" style="display:flex;flex-direction:column;gap:14px;margin-top:8px">';
      html += '<a href="/guides/percentage" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>How to Calculate Percentage — Formula, Examples &amp; Common Mistakes</strong><br><span style="color:var(--text-light);font-size:13px">The one formula behind every percentage problem, with worked examples and the mistakes to avoid.</span></a>';
      html += '<a href="/guides/emi" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>How to Calculate Loan EMI — Formula &amp; Step-by-Step Example</strong><br><span style="color:var(--text-light);font-size:13px">How banks work out your monthly payment, with a full worked example.</span></a>';
      html += '<a href="/guides/age" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>How to Calculate Your Exact Age in Years, Months &amp; Days</strong><br><span style="color:var(--text-light);font-size:13px">The manual method, step by step, and how leap years affect the total.</span></a>';
      html += '<a href="/guides/bmi" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>How to Calculate BMI — Formula, Ranges &amp; What the Number Means</strong><br><span style="color:var(--text-light);font-size:13px">Metric and imperial formulas, the WHO ranges, and the honest limitations of BMI.</span></a>';
      html += '<a href="/guides/compound-interest" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>How Compound Interest Works — Formula &amp; Growth Examples</strong><br><span style="color:var(--text-light);font-size:13px">Why compounding beats simple interest, with worked examples and the Rule of 72.</span></a>';
      html += '<a href="/guides/mortgage" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>How Mortgage Payments Work — Principal, Interest &amp; Amortization</strong><br><span style="color:var(--text-light);font-size:13px">What PITI means, how amortization shifts your payment, and what LTV means for your rate.</span></a>';
      html += '<a href="/guides/zakat" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>How to Calculate Zakat — Nisab, Rates &amp; Worked Examples</strong><br><span style="color:var(--text-light);font-size:13px">The 2.5% formula, zakatable wealth, and gold/silver nisab thresholds with a worked example.</span></a>';
      html += '<a href="/guides/income-tax" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>How Income Tax Is Calculated — Brackets &amp; Marginal Rates</strong><br><span style="color:var(--text-light);font-size:13px">Marginal vs effective rate with worked examples and country-specific calculators.</span></a>';
      html += '<a href="/guides/currency-conversion" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>How Currency Conversion Works — Rates, Spreads &amp; Hidden Fees</strong><br><span style="color:var(--text-light);font-size:13px">Mid-market rate, spreads, fixed fees, and why DCC at terminals costs 3–8%.</span></a>';
      html += '<a href="/guides/discount" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>How to Calculate a Discount — Percent Off &amp; Stacked Discounts</strong><br><span style="color:var(--text-light);font-size:13px">The percent-off formula, reverse calculation, and the stacked-discount trap.</span></a>';
      html += '<a href="/guides/tip" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>How to Calculate a Tip — Rates, Splitting &amp; Tipping Abroad</strong><br><span style="color:var(--text-light);font-size:13px">Mental-math shortcuts for 10/15/20%, rates by service, and fair bill splitting.</span></a>';
      html += '<a href="/guides/gst-sales-tax" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>GST &amp; Sales Tax Explained — Adding, Removing &amp; Reverse Tax Math</strong><br><span style="color:var(--text-light);font-size:13px">Add or remove tax from any price, with country rates and the reverse-GST formula.</span></a>';
      html += '<a href="/guides/glossary" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Calculator &amp; Finance Glossary — 36 Terms Explained</strong><br><span style="color:var(--text-light);font-size:13px">APR, EMI, CAGR, BMI, TDEE, LTV and more — plain-English definitions by category.</span></a>';
      html += '<a href="/guides/inflation" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>How Inflation Is Calculated — CPI &amp; Purchasing Power</strong><br><span style="color:var(--text-light);font-size:13px">The cross-year money formula and what $100 becomes at 2%, 5% and 8% inflation.</span></a>';
      html += '<a href="/guides/salary" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Gross Salary vs In-Hand Salary — Take-Home Pay Explained</strong><br><span style="color:var(--text-light);font-size:13px">Why CTC ≠ gross ≠ net, and the gross-to-net calculation step by step.</span></a>';
      html += '<a href="/guides/retirement" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>How Much You Need to Retire — The 25x Rule Explained</strong><br><span style="color:var(--text-light);font-size:13px">Your retirement number, the limits of the 4% guideline, and the levers that move it most.</span></a>';
      html += '<a href="/guides/calories" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>How to Calculate Calories — BMR, TDEE &amp; Deficit Math</strong><br><span style="color:var(--text-light);font-size:13px">Mifflin-St Jeor BMR, activity multipliers, and realistic deficit targets.</span></a>';
      html += '<a href="/guides/debt-payoff" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Debt Snowball vs Avalanche — Which Pays Off Faster?</strong><br><span style="color:var(--text-light);font-size:13px">Both strategies on one debt list — interest saved vs motivation of quick wins.</span></a>';
      html += '<a href="/guides/random-numbers" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>How Random Number Generators Work</strong><br><span style="color:var(--text-light);font-size:13px">Seeds, algorithms, and PRNG vs crypto-grade randomness.</span></a>';
      html += '<a href="/guides/concrete" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>How to Calculate Concrete — Bags, Yards &amp; the 10% Rule</strong><br><span style="color:var(--text-light);font-size:13px">Volume formulas, mix ratios, and bag counts per pour.</span></a>';
      html += '<a href="/guides/unit-conversion" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Metric to Imperial Conversion — Exact Factors</strong><br><span style="color:var(--text-light);font-size:13px">Exact factors for length, weight, volume, temperature and data.</span></a>';
      html += '<a href="/guides/gpa" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>How GPA Is Calculated — Weighted &amp; Cumulative</strong><br><span style="color:var(--text-light);font-size:13px">Quality points, credit-hour weighting, and the 5.0 scale question.</span></a>';
      html += '<a href="/guides/break-even" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Break-Even Analysis — Formula &amp; Margin of Safety</strong><br><span style="color:var(--text-light);font-size:13px">Contribution margin and a full café example with target profit.</span></a>';
      html += '<a href="/guides/passwords" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Password Strength — Entropy &amp; Crack Time</strong><br><span style="color:var(--text-light);font-size:13px">Why length beats symbol swaps, and passphrase math that works.</span></a>';
      html += '<a href="/guides/baby-cost" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Baby Cost — First-Year Budget</strong><br><span style="color:var(--text-light);font-size:13px">Gear + essentials + childcare: a computed example showing why care choice swings the total by $15,000.</span></a>';
      html += '<a href="/guides/ideal-weight" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Ideal Weight — Devine vs BMI Range</strong><br><span style="color:var(--text-light);font-size:13px">Why one number and one range disagree, and which question each answers.</span></a>';
      html += '<a href="/guides/bmr" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>BMR — Mifflin-St Jeor, Line by Line</strong><br><span style="color:var(--text-light);font-size:13px">Worked formula, TDEE multipliers, and why equations disagree by 74 kcal.</span></a>';
      html += '<a href="/guides/profit-margin" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Profit Margin — and the Markup Trap</strong><br><span style="color:var(--text-light);font-size:13px">A 40% margin is a 66.7% markup — the mix-up that underprices businesses.</span></a>';
      html += '<a href="/guides/ohms-law" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Ohm\'s Law — V = IR With Real Numbers</strong><br><span style="color:var(--text-light);font-size:13px">Series vs parallel circuits computed, power dissipation, linear limits.</span></a>';
      html += '<a href="/guides/gear-ratio" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Gear Ratio — Speed for Torque</strong><br><span style="color:var(--text-light);font-size:13px">Driven÷driver formula, 1,500-rpm example, multi-stage multiplication.</span></a>';
      html += '<a href="/guides/fuel-cost" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Fuel Cost — the Three-Variable Formula</strong><br><span style="color:var(--text-light);font-size:13px">Distance ÷ efficiency × price with a computed 15,000 km year.</span></a>';
      html += '<a href="/guides/hourly-rate" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Freelance Rate — Income ÷ Billable Hours</strong><br><span style="color:var(--text-light);font-size:13px">The 60% utilization rule that fixes salary-÷-2,080 underpricing.</span></a>';
      html += '<a href="/guides/paint-coverage" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Paint Coverage — Area × Coats ÷ Spread Rate</strong><br><span style="color:var(--text-light);font-size:13px">Wall area minus openings, two-coat rule, reality adjustments.</span></a>';
      html += '<a href="/guides/macro-calculator" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Macros — the 4-4-9 Rule, Worked</strong><br><span style="color:var(--text-light);font-size:13px">Calories to grams with a checked 2,400 kcal example and sanity bands.</span></a>';
      html += '<a href="/guides/sip" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>SIP Math — Where ₹5,000/Month Goes</strong><br><span style="color:var(--text-light);font-size:13px">Annuity FV formula and why the last years contribute most growth.</span></a>';
      html += '<a href="/guides/fd-ppf-sip" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>FD vs PPF vs SIP — One Sum, Three Machines</strong><br><span style="color:var(--text-light);font-size:13px">₹1 lakh computed three ways, tax included, matched to goal dates.</span></a>';
      html += '<a href="/guides/ev-vs-petrol" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>EV vs Petrol — the Per-KM Math</strong><br><span style="color:var(--text-light);font-size:13px">1.20 vs 6.67 per km computed, plus the five forgotten factors.</span></a>';
      html += '<a href="/guides/wedding-budget" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Wedding Budget — Split, Then Guard</strong><br><span style="color:var(--text-light);font-size:13px">Category shares with a real buffer, and the guest-count lever.</span></a>';
      html += '<a href="/guides/freelance-rate-card" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>The Rate Card — Floor, Project, Retainer</strong><br><span style="color:var(--text-light);font-size:13px">Three pricing modes from one floor rate, with a risk factor.</span></a>';
      html += '<a href="/guides/screen-time" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Screen Time — Compounding Daily Hours</strong><br><span style="color:var(--text-light);font-size:13px">3 h/day = 45.6 full days a year: the table and the honest framing.</span></a>';
      html += '<a href="/guides/electricity-bill" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Electricity Bill, Decoded</strong><br><span style="color:var(--text-light);font-size:13px">Watts × hours × rate on a fridge vs an AC, plus tiered slabs.</span></a>';
      html += '<a href="/guides/business-days" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Business Days — the Math of Deadlines</strong><br><span style="color:var(--text-light);font-size:13px">A calendar month is only ~22 workdays; here is where counts break.</span></a>';
      html += '<a href="/guides/grade-needed" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>What Do I Need on the Final?</strong><br><span style="color:var(--text-light);font-size:13px">The weighted formula, and reading impossible answers honestly.</span></a>';
      html += '<a href="/guides/room-area" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Room Area — Shapes and the Waste Rule</strong><br><span style="color:var(--text-light);font-size:13px">L-shapes decomposed, plus the 10% that keeps orders complete.</span></a>';
      html += '<a href="/guides/ac-size" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>AC Sizing — BTU and the Oversizing Trap</strong><br><span style="color:var(--text-light);font-size:13px">BTU/sq ft with climate adjustment, tonnage, why bigger cools worse.</span></a>';
      html += '<a href="/guides/protein-intake" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>Protein Need — g/kg, Then Real Food</strong><br><span style="color:var(--text-light);font-size:13px">0.8–2.0 g/kg bands with a 112 g worked day and food equivalents.</span></a>';
      html += '</div>';
      html += '<p style="margin-top:18px">Looking for a specific calculation? Try the <a href="/" onclick="event.preventDefault();Router.navigate(\'/\')">homepage search</a> — ' + getCalculatorCount() + '+ calculators across 20 categories.</p></div>';
    } else if (pageKey === 'blog') {
      // Blog hub — links to static explainer posts under /blog/ (full page loads,
      // same pattern as the guides hub above).
      html = '<div class="legal-page"><h1>CalcProMaster Blog</h1>';
      html += '<p>Short, honest explainers on the math behind everyday decisions — the calculations that quietly cost people money, and the numbers behind the health metrics everyone quotes. Every post shows its working.</p>';
      html += '<div class="related-tools" style="display:flex;flex-direction:column;gap:14px;margin-top:8px">';
      html += '<a href="/blog/stacked-discounts" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>\u201cExtra 20% off\u201d is less than you think</strong><br><span style="color:var(--text-light);font-size:13px">Why 30% + 20% off is 44%, not 50% — stacked discount math with worked examples.</span></a>';
      html += '<a href="/blog/how-emi-works" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>How banks calculate your EMI</strong><br><span style="color:var(--text-light);font-size:13px">Amortization demystified: the shifting interest/principal split and prepayment math.</span></a>';
      html += '<a href="/blog/bmi-honest-look" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>BMI is a screening tool, not a diagnosis</strong><br><span style="color:var(--text-light);font-size:13px">What the formula can and cannot see — and which companion metrics fill the gaps.</span></a>';
      html += '<a href="/blog/rule-of-72" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>The Rule of 72 — where doubling-time math bends</strong><br><span style="color:var(--text-light);font-size:13px">The exact error table: 2% off at 3%, 8% off at 24%, perfect at 9%.</span></a>';
      html += '<a href="/blog/concrete-patio-math" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>The 4-inch mistake — concrete orders gone wrong</strong><br><span style="color:var(--text-light);font-size:13px">A 20×20 patio: 5.4 cubic yards, 222 bags, and the 12× unit trap.</span></a>';
      html += '<a href="/blog/ev-vs-petrol-tco" class="guide-card" style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;text-decoration:none;display:block"><strong>EV vs petrol — the 5-year math nobody finishes</strong><br><span style="color:var(--text-light);font-size:13px">82,000/year energy savings vs the 4.9-year premium payback.</span></a>';
      html += '</div>';
      html += '<p style="margin-top:18px">Deeper step-by-step coverage lives in the <a href="/guides" onclick="event.preventDefault();Router.navigate(\'/guides\')">guides library</a> — 64 guides with formulas, worked examples and FAQs.</p></div>';
    } else if (pageKey === '404') {
      html = '<div class="legal-page"><div class="empty-state"><div class="empty-state-icon">🔍</div><h1>404 — Page Not Found</h1>';
      html += '<p>The page you\'re looking for doesn\'t exist. Let\'s find what you need instead.</p>';
      html += '<div class="search-box" style="margin:24px auto"><input type="text" placeholder="Search ' + getCalculatorCount() + '+ calculators…" oninput="App.homeSearch(this.value)" onkeydown="App.searchKeyNav(event)" id="search-404-input" role="combobox" aria-expanded="false" aria-label="Search calculators"><div class="search-results" id="homeSearchResults"></div></div>';
      html += '<div style="margin-top:24px"><a href="/" class="action-btn" onclick="event.preventDefault();Router.navigate(\'/\')">🏠 Return to Home</a>';
      html += ' <a href="/finance" class="action-btn" onclick="event.preventDefault();Router.navigate(\'/finance\')">💰 Popular Calculators</a></div></div></div>';
    }
    
    main.innerHTML = html;
    if (window.I18nUI) I18nUI.translateStaticUI();
    if (pageKey === 'compare' && window.AdvancedFeatures) {
      AdvancedFeatures.openCompare();
    }
    updateSocialProof();
  }

  // ---------- Search ----------
  // ---- Search intelligence (typo tolerance + intent aliases + ranking) ----
  // Levenshtein distance ≤2 on name tokens — "morggage", "percemtage" still hit.
  function _lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    const row0 = Array.from({ length: n + 1 }, (_, i) => i);
    const row1 = new Array(n + 1);
    for (let i = 1; i <= m; i++) {
      row1[0] = i;
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        row1[j] = Math.min(row0[j] + 1, row1[j - 1] + 1, row0[j - 1] + cost);
      }
      row0.splice(0, n + 1, ...row1);
    }
    return row0[n];
  }
  // Intent aliases: a user typing a generic word should still land the exact
  // calculators they mean ("mortgage" → Mortgage + Loan EMI + Amortization).
  const SEARCH_ALIASES = {
    mortgage: ['mortgage', 'loan-emi', 'amortization', 'home-afford', 'interest-only'],
    loan: ['loan-emi', 'auto-loan', 'mortgage', 'loan-to-value', 'amortization'],
    interest: ['simple-interest', 'compound-interest', 'loan-emi', 'apr'],
    tax: ['income-tax', 'sales-tax', 'capital-gains', 'crypto-tax', 'paycheck'],
    sip: ['sip', 'ppf', 'compound-interest', 'retirement'],
    date: ['date-diff', 'age', 'time-calc'],
    converter: ['currency-converter', 'length', 'weight', 'temperature'],
    bmi: ['bmi', 'body-fat', 'ideal-body-weight', 'calorie'],
    discount: ['discount', 'sales-tax', 'markup'],
    percentage: ['percentage', 'percent-change', 'fraction', 'ratio']
  };
  // ---------- S0: shared SmartSearch engine (js/smart-search.js + js/tool-catalog.js) ----------
  // ONE scoring core for every search surface: home/404 dropdown, nav search,
  // ?q= SearchAction resolver, command palette. The engine + full registry
  // catalog load lazily (first search interaction, or idle at ~2.5s) so they
  // never touch the critical boot path; every surface falls back to its
  // previous local logic until then (or if the load fails).
  let _ssLoadPromise = null;
  let _ssCatalog = null;
  let _pendingQ = null; // ?q= term awaiting resolution while the engine lazy-loads
  function ssAvailable() {
    return typeof window.SmartSearch === 'object' && window.SmartSearch &&
           Array.isArray(window.TOOL_CATALOG) && window.TOOL_CATALOG.length > 0;
  }
  function ssCatalog() {
    if (!_ssCatalog && ssAvailable()) {
      try { _ssCatalog = window.SmartSearch.buildCatalog(window.TOOL_CATALOG); } catch (e) { return null; }
    }
    return _ssCatalog;
  }
  function loadScriptOnce(src) {
    return new Promise(function (res) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { res(true); };
      s.onerror = function () { res(false); };
      document.head.appendChild(s);
    });
  }
  function ensureSmartSearch() {
    if (ssAvailable()) return Promise.resolve(true);
    if (!_ssLoadPromise) {
      _ssLoadPromise = loadScriptOnce('js/smart-search.js')
        .then(function (ok) { return ok ? loadScriptOnce('js/tool-catalog.js') : false; })
        .then(function (ok) { if (ok) ssCatalog(); return ssAvailable(); })
        .catch(function () { return false; });
    }
    return _ssLoadPromise;
  }
  // Run the shared engine and map rows onto the {t, score, catKey, alias}
  // shape the UI layers already consume. Returns null while the engine is
  // unavailable (callers fall back to their legacy scorers).
  function ssRows(q, limit) {
    const cat = ssCatalog();
    if (!cat || !window.SmartSearch) return null;
    try {
      return window.SmartSearch.search(q, cat, { limit: limit || 10 }).map(function (r) {
        const bare = String(r.id || '').split('/').pop();
        const t = TOOL_MAP[bare] || { id: bare, name: r.name, desc: r.desc, kw: '' };
        return { t: t, score: r.score, catKey: r.cat, alias: (r.why === 'intent' || r.why === 'synonym') ? q : undefined };
      });
    } catch (e) { return null; }
  }
  // Warm the engine shortly after boot (mirrors the tool-intros idle pattern;
  // never blocks paint or interaction).
  setTimeout(function () { try { ensureSmartSearch(); } catch (e) { /* never break boot */ } }, 2500);

  function _searchScore(t, q) {
    const name = t.name.toLowerCase();
    const kw = (t.kw || '').toLowerCase();
    const desc = (t.desc || '').toLowerCase();
    if (name === q) return 100;
    if (name.indexOf(q) === 0) return 90;
    if (name.includes(q)) return 80;
    if (kw.includes(q)) return 65;
    if (desc.includes(q)) return 50;
    // Fuzzy on name tokens (words ≥4 chars) — tolerant of one/two typos
    let best = 0;
    const tokens = name.split(/[^a-z0-9]+/).filter(w => w.length >= 4);
    for (const w of tokens) {
      if (Math.abs(w.length - q.length) > 2) continue;
      const d = _lev(w, q);
      if (d <= 1) best = Math.max(best, 45);
      else if (d <= 2 && w.length >= 5) best = Math.max(best, 35);
    }
    return best;
  }
  function _searchAll(q) {
    // S0: shared SmartSearch engine first (full registry + fuzzy + synonyms +
    // NL intents, incl. lazy categories not yet loaded). Legacy scorer below
    // stays as fallback while the engine loads / if it fails.
    const smart = ssRows(q, 10);
    if (smart) return smart;
    const results = new Map(); // id -> {score, catKey}
    const add = (t, score) => {
      const cur = results.get(t.id);
      if (!cur || score > cur.score) {
        const catKey = Object.entries(CALC_DATA).find(([k,c]) => c.tools.includes(t))?.[0];
        results.set(t.id, { t, score, catKey });
      }
    };
    for (const t of ALL_TOOLS) {
      const s = _searchScore(t, q);
      if (s > 0) add(t, s);
    }
    // Alias lift: generic intent words surface their exact calculators
    const alias = SEARCH_ALIASES[q];
    if (alias) {
      for (const id of alias) {
        const t = TOOL_MAP[id];
        if (t) {
          const cur = results.get(id);
          if (!cur || 88 > cur.score) {
            const catKey = Object.entries(CALC_DATA).find(([k,c]) => c.tools.includes(t))?.[0];
            results.set(id, { t, score: 88, catKey, alias: q });
          }
        }
      }
    }
    return [...results.values()].sort((a, b) => b.score - a.score).slice(0, 10);
  }
  function homeSearch(val) {
    // First search keystroke also warms the lazy categories in the background, so
    // results for niche calculators appear as the user keeps typing.
    if (typeof warmLazyData === 'function') warmLazyData();
    // First keystroke also lazy-loads the shared SmartSearch engine; until it
    // arrives this keystroke uses the legacy scorer, the next one is smart.
    ensureSmartSearch();
    const q = val.toLowerCase().trim();
    const results = document.getElementById('homeSearchResults');
    if (!results) return;
    const input = document.getElementById('home-search') || document.getElementById('search-404-input');
    if (!q) { results.style.display = 'none'; if (input) input.setAttribute('aria-expanded', 'false'); return; }
    // #70 skeleton placeholder: while the SmartSearch engine is still lazy-loading,
    // show pulsing lines instead of an ambiguous pause (legacy scorer still fills
    // results underneath; the skeleton is removed as soon as results render).
    const skel = document.getElementById('search-skeleton');
    if (skel) { skel.hidden = false; }
    setTimeout(function () { const s = document.getElementById('search-skeleton'); if (s) s.hidden = true; }, 700);
    
    const matches = _searchAll(q);
    _searchItems = matches;
    if (input) input.setAttribute('aria-expanded', 'true');
    
    if (matches.length === 0) {
      results.innerHTML = '<div class="search-item" style="color:var(--text-light)">No calculators found — try a different word</div>';
    } else {
      results.innerHTML = matches.map(m => {
        const t = m.t;
        const catName = m.catKey && CALC_DATA[m.catKey] ? CALC_DATA[m.catKey].name : '';
        const chip = m.alias ? ' <span class="search-chip">via ' + Security.sanitizeHtml(m.alias) + '</span>' : '';
        return `<div class="search-item" role="option" onclick="Router.navigate('/${Security.sanitizeJsString(m.catKey)}/${Security.sanitizeJsString(t.id)}');document.getElementById('homeSearchResults').style.display='none'">
          <strong>${Security.sanitizeHtml(t.name)}</strong>${chip} <span class="search-cat">${Security.sanitizeHtml(catName)}</span><br>
          <small style="color:var(--text-light)">${Security.sanitizeHtml((t.desc || '').substring(0, 60))}</small>
        </div>`;
      }).join('');
    }
    results.style.display = 'block';
  }

  // Keyboard navigation for live search results (ArrowUp/Down move, Enter opens, Esc closes)
  function searchKeyNav(e) {
    const results = document.getElementById('homeSearchResults');
    if (!results || results.style.display === 'none') return;
    const items = Array.from(results.querySelectorAll('.search-item'));
    if (items.length === 0) return;
    const keys = ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    let idx = items.findIndex(el => el.classList.contains('search-active'));
    if (e.key === 'ArrowDown') {
      idx = (idx + 1) % items.length;
      items.forEach((el, i) => el.classList.toggle('search-active', i === idx));
      items[idx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      idx = (idx - 1 + items.length) % items.length;
      items.forEach((el, i) => el.classList.toggle('search-active', i === idx));
      items[idx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      const active = items[idx >= 0 ? idx : 0];
      if (active && typeof active.onclick === 'function') active.onclick();
    } else if (e.key === 'Escape') {
      results.style.display = 'none';
      const input = document.getElementById('home-search') || document.getElementById('search-404-input');
      if (input) input.setAttribute('aria-expanded', 'false');
    }
  }

  function search(val) {
    // Nav search: jump straight to the best match. S0 shared engine first
    // (fuzzy + synonyms + NL intents over the FULL registry, incl. lazy cats),
    // legacy name-include fallback while it loads / if it failed.
    const q = val.toLowerCase().trim();
    if (!q) return;
    const smart = ssRows(q, 1);
    if (smart && smart.length && smart[0].catKey) {
      Router.navigate('/' + smart[0].catKey + '/' + smart[0].t.id);
      return;
    }
    ensureSmartSearch();
    const matches = ALL_TOOLS.filter(t => t.name.toLowerCase().includes(q)).slice(0, 5);
    if (matches.length === 0) return;
    const first = matches[0];
    const catKey = Object.entries(CALC_DATA).find(([k,c]) => c.tools.includes(first))?.[0];
    if (catKey) Router.navigate('/' + catKey + '/' + first.id);
  }

  // ---------- Command Palette ----------
  function openPalette() {
    const overlay = document.getElementById('cmdPalette');
    const input = document.getElementById('cmdInput');
    if (overlay && input) {
      overlay.classList.add('active');
      input.value = '';
      input.focus();
      paletteFilter('');
    }
  }
  function closePalette() {
    document.getElementById('cmdPalette')?.classList.remove('active');
  }
  function paletteFilter(val) {
    const q = val.toLowerCase().trim();
    const results = document.getElementById('cmdResults');
    if (!results) return;
    
    let items = ALL_TOOLS;
    if (q) {
      // S0: shared SmartSearch engine ranks the palette too (fuzzy + synonyms
      // + NL intents). Only tools already loaded (TOOL_MAP) are shown, same
      // as before; legacy substring filter stays as fallback while it loads.
      const smart = ssRows(q, 15);
      if (smart) {
        const mapped = smart.map(m => m.t).filter(t => TOOL_MAP[t.id]);
        items = mapped.length ? mapped : items.filter(t => t.name.toLowerCase().includes(q) || (t.desc && t.desc.toLowerCase().includes(q)));
      } else {
        ensureSmartSearch();
        items = items.filter(t => t.name.toLowerCase().includes(q) || (t.desc && t.desc.toLowerCase().includes(q)));
      }
    } else {
      // Show recent/favorites first
      items = items.slice(0, 20);
    }
    items = items.slice(0, 15);
    
    if (items.length === 0) {
      results.innerHTML = '<div class="cmd-empty">No results</div>';
      return;
    }
    
    results.innerHTML = items.map((t, i) => {
      const catKey = Object.entries(CALC_DATA).find(([k,c]) => c.tools.includes(t))?.[0];
      const catName = catKey ? CALC_DATA[catKey].name : '';
      return `<div class="cmd-item ${i === 0 ? 'active' : ''}" onclick="App.closePalette();Router.navigate('/${catKey}/${t.id}')">
        <div><div class="cmd-name">${t.name}</div><div class="cmd-desc">${t.desc.substring(0, 80)}</div></div>
        <span class="cmd-cat">${catName}</span>
      </div>`;
    }).join('');
  }
  function paletteKey(e) {
    const items = document.querySelectorAll('.cmd-item');
    let active = document.querySelector('.cmd-item.active');
    let idx = -1;
    if (active) {
      items.forEach((el, i) => { if (el === active) idx = i; });
    }
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (idx + 1) % items.length;
      if (active) active.classList.remove('active');
      items[next].classList.add('active');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (idx - 1 + items.length) % items.length;
      if (active) active.classList.remove('active');
      items[prev].classList.add('active');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active) active.click();
    } else if (e.key === 'Escape') {
      closePalette();
    }
  }

  // ---------- Share ----------
  function shareTool(toolId) {
    if (typeof AdvancedFeatures.trackShare === 'function') { try { AdvancedFeatures.trackShare(); } catch (e) { /* never break share */ } }
    const url = window.location.href;
    const qr = QRCode.toDataURL(url, 6);
    const modal = document.getElementById('modalOverlay');
    const body = document.getElementById('modalBody');
    if (!modal || !body) return;
    
    const shareUrl = AdvancedFeatures.generateShareLink(App._currentTool?.tool || TOOL_MAP[toolId], App._currentTool ? _collectValues() : {});
    
    body.innerHTML = '<h3>🔗 Share</h3>' +
      '<p style="font-size:14px;color:var(--text-light);margin-bottom:16px">Share a link with pre-filled values or copy the page URL.</p>' +
      '<img src="' + qr + '" style="display:block;margin:0 auto 16px;border:1px solid var(--border);border-radius:8px" alt="QR Code">' +
      '<input type="text" class="share-link" value="' + shareUrl + '" readonly onclick="this.select()">' +
      '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">' +
      '<button class="action-btn" onclick="navigator.clipboard.writeText(\'' + shareUrl.replace(/'/g, "\\'") + '\');App.showToast(\'Link copied!\')">📋 Copy Link</button>' +
      '<button class="action-btn" onclick="AdvancedFeatures.exportResultAsImage(\'' + (App._currentTool?.tool?.name || 'CalcPro') + '\',\'' + (document.querySelector('.result-main')?.textContent?.replace(/'/g, "\\\\'") || '') + '\',\'' + (document.querySelector('.result-extra')?.textContent?.replace(/'/g, "\\\\'") || '') + '\')">🖼️ Export Image</button>' +
      '<button class="action-btn" onclick="AdvancedFeatures.exportStoryImage(\'' + (App._currentTool?.tool?.name || 'CalcPro') + '\',\'' + (document.querySelector('.result-main')?.textContent?.replace(/'/g, "\\\\'") || '') + '\',\'' + (document.querySelector('.result-extra')?.textContent?.replace(/'/g, "\\\\'") || '') + '\')">📱 Story</button>' +
      // WhatsApp share — huge for India/Pakistan users. Packages the result
      // summary + shareable link into a wa.me deep link (no API, no tracking).
      '<button class="action-btn" style="background:#25D366;color:#fff;border-color:#1da851" onclick="window.open(\'https://wa.me/?text=' + encodeURIComponent((App._currentTool?.tool?.name || 'CalcPro') + ' result: ' + (document.querySelector('.result-main')?.textContent?.trim()?.slice(0, 200) || '') + ' — ' + shareUrl) + '\',\'_blank\',\'noopener\')">💬 WhatsApp</button>' +
      // S4 #34: WhatsApp-ready formatted summary (emoji + line breaks), copied
      // to clipboard — user pastes it straight into any chat app.
      '<button class="action-btn" onclick="App.copyFormattedResult()">🧾 Formatted text</button>' +
      '</div>';
    modal.classList.add('active');
  }

  // ---------- S4 #34: WhatsApp-ready formatted result text ----------
  // Pure builder (testable): takes tool name, main/extra result text, link.
  // Returns emoji-formatted multi-line summary for chat apps.
  function buildFormattedResult(toolName, main, extra, link) {
    var lines = [];
    var name = String(toolName || 'CalcPro').trim();
    var m = String(main || '').replace(/\s+/g, ' ').trim();
    if (!m) return null;
    lines.push('🧮 ' + name + ' — Result');
    lines.push('📊 ' + m);
    var x = String(extra || '').replace(/\s+/g, ' ').trim();
    if (x) lines.push('ℹ️ ' + x);
    if (link) lines.push('🔗 ' + String(link));
    lines.push('(via CalcProMaster)');
    return lines.join('\n');
  }
  function copyFormattedResult() {
    var ra = document.getElementById('result-area');
    var mainEl = ra ? ra.querySelector('.result-main') : null;
    var main = mainEl ? (mainEl.textContent || '').trim() : '';
    if (!main || main.indexOf('Enter values') === 0) {
      showToast('No result yet — press Calculate first', 1800);
      return;
    }
    var extraEl = ra ? ra.querySelector('.result-extra') : null;
    var extra = extraEl ? (extraEl.textContent || '').trim() : '';
    var toolName = (App._currentTool && App._currentTool.tool && App._currentTool.tool.name) || 'CalcPro';
    var text = buildFormattedResult(toolName, main, extra, window.location.href);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { showToast('Formatted result copied ✓ — paste it anywhere', 2000); }).catch(function () { _legacyCopy(text); showToast('Formatted result copied ✓', 2000); });
    } else {
      _legacyCopy(text);
      showToast('Formatted result copied ✓', 2000);
    }
  }

  // ---------- Print ----------
  function printReport() {
    window.print();
  }

  // ---------- Result → branded PDF report (zero-dependency, CSP-safe) ----------
  // Opens a clean, print-optimized report window with the current tool's result,
  // inputs and branding, then triggers the print dialog so the user can save as
  // PDF. Everything is escaped (results can contain user-driven input via
  // shareable URLs). No external libraries, works offline.
  function exportResultAsPdf() {
    var report = { tool: '', toolId: '', inputs: {}, result: '', extra: '', url: window.location.href, ts: new Date().toLocaleString() };
    try {
      var cur = App._currentTool;
      if (cur && cur.tool) {
        report.tool = cur.tool.name || '';
        report.toolId = cur.tool.id || '';
      }
      var vals = _collectValues ? _collectValues() : {};
      report.inputs = vals;
    } catch (e) { /* best-effort */ }
    var rm = document.getElementById('result-area');
    if (rm) {
      var main = rm.querySelector('.result-main');
      var extra = rm.querySelector('.result-extra');
      if (main) report.result = main.textContent.trim();
      if (extra) report.extra = extra.textContent.trim();
    }
    // PDF prints via a hidden same-origin iframe below — no popup involved,
    // so popup blockers (common on mobile browsers) can no longer break it.
    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }
    var rows = Object.entries(report.inputs || {})
      .map(function (kv) { return '<tr><td>' + esc(kv[0]) + '</td><td>' + esc(kv[1]) + '</td></tr>'; }).join('');
    // Build a branded HTML report string (escaped — results can carry user
    // input via shareable URLs) and print it from a hidden iframe.
    var html =
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>CalcProMaster — ' + esc(report.tool || 'Result Report') + '</title>' +
      '<style>body{font-family:Inter,Arial,sans-serif;max-width:720px;margin:32px auto;padding:0 20px;color:#1e293b}' +
      'h1{font-size:22px;border-bottom:2px solid #4f46e5;padding-bottom:10px}' +
      'table{border-collapse:collapse;width:100%;margin:16px 0}td,th{border:1px solid #e2e8f0;padding:8px 10px;font-size:13px;text-align:left}' +
      'th{background:#f1f5f9}.result{font-size:20px;font-weight:700;color:#4f46e5;padding:12px;background:#eef2ff;border-radius:8px;margin:12px 0}' +
      '.extra{color:#64748b;font-size:14px;margin:8px 0}.meta{color:#94a3b8;font-size:12px;margin-bottom:4px}' +
      '.brand{color:#4f46e5;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px}</style></head><body>' +
      '<div class="brand">CalcProMaster</div>' +
      '<h1>' + esc(report.tool || 'Result Report') + '</h1>' +
      '<div class="meta">Generated: ' + esc(report.ts) + '<br>URL: ' + esc(report.url) + '</div>' +
      '<div class="result">' + esc(report.result || '—') + '</div>' +
      (report.extra ? '<div class="extra">' + esc(report.extra) + '</div>' : '') +
      '<h2>Inputs</h2><table><thead><tr><th>Input</th><th>Value</th></tr></thead><tbody>' + (rows || '<tr><td colspan="2">—</td></tr>') + '</tbody></table>' +
      '<p style="font-size:11px;color:#94a3b8;margin-top:24px">Generated by CalcProMaster — ' + getCalculatorCount() + '+ free calculators. Estimates only; verify independently. Your data never leaves your device.</p>' +
      '</body></html>';
    // One print at a time: ignore rapid double-clicks so the report is never
    // cleared mid-dialog by a second write.
    if (_pdfPrintPending) return;
    var frame = document.getElementById('pdf-print-frame');
    if (!frame) {
      frame = document.createElement('iframe');
      frame.id = 'pdf-print-frame';
      frame.setAttribute('aria-hidden', 'true');
      // Offscreen but NOT visibility:hidden — hidden/zero-size iframes can
      // print blank on iOS Safari / Android WebViews; offscreen keeps the
      // document rendered so print engines capture the full report.
      frame.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;border:0';
      document.body.appendChild(frame);
    }
    var fdoc = frame.contentDocument || frame.contentWindow.document;
    fdoc.open();
    fdoc.write(html);
    fdoc.close();
    // Trigger the browser print dialog (user picks Save as PDF on desktop + mobile).
    _pdfPrintPending = true;
    setTimeout(function () {
      try {
        frame.contentWindow.focus();
        frame.contentWindow.onafterprint = function () { try { frame.remove(); } catch (e) {} };
        frame.contentWindow.print();
        // Fallback cleanup in case afterprint never fires.
        setTimeout(function () { try { frame.remove(); } catch (e) {} }, 30000);
      } catch (e) { showToast('Print failed — try the CSV export instead', 3500); }
      finally { _pdfPrintPending = false; }
    }, 400);
  }

  // ---------- Privacy-friendly local page view ----------
  function trackPageView() {
    try { CalcAnalytics.trackVisit(); } catch(e) { /* analytics unavailable */ }
  }

  // ---------- YMYL JSON-LD Schema Generator (per tool page) ----------
  function injectToolSchema(tool, catKey, result) {
    // Remove any existing tool-specific schema
    var oldSchema = document.getElementById('ymyl-tool-schema');
    if (oldSchema) oldSchema.remove();
    
    if (!tool) return;
    
    var seo = window.TOOL_SEO && window.TOOL_SEO[tool.id] || null;
    
    // Build combined WebApplication + FAQPage schema
    var schemas = [];
    
    // 1. WebApplication schema (category mapped from catKey per blueprint: Finance/Health/Business/Utility)
    var CAT_APP_MAP = {
      finance: 'FinanceApplication', health: 'HealthApplication', business: 'BusinessApplication',
      career: 'BusinessApplication', family: 'HealthApplication', education: 'EducationalApplication'
    };
    var appSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      'name': tool.name + ' - CalcPro',
      'url': window.location.href,
      'description': (seo ? seo.metaDesc : tool.desc),
      'applicationCategory': CAT_APP_MAP[catKey] || 'UtilitiesApplication',
      'operatingSystem': 'Any',
      'browserRequirements': 'JavaScript required. Works on Chrome, Firefox, Safari, Edge.',
      'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' },
      'featureList': [
        'Step-by-step solutions with formula breakdown',
        '100% free with no sign-up required',
        'Runs entirely in your browser — no server upload',
        'Works offline after first load',
        'Share results with link or export as image or CSV'
      ]
    };
    schemas.push(appSchema);
    
    // 1b. BreadcrumbList schema (Home > Calculators > Category > Tool —
    // 'Calculators' points at the home page, which lists all calculators, so every URL is real)
    var catLabel = (seo && seo.catName) ? seo.catName : (catKey || 'Tools');
    var crumbOrigin = window.location.origin;
    var crumbUrl = window.location.href.split('?')[0].split('#')[0];
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': crumbOrigin + '/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Calculators', 'item': crumbOrigin + '/' },
        { '@type': 'ListItem', 'position': 3, 'name': catLabel, 'item': crumbOrigin + '/' + catKey },
        { '@type': 'ListItem', 'position': 4, 'name': tool.name, 'item': crumbUrl }
      ]
    });
    
    // 2. HowTo schema (from steps)
    if (typeof tool.steps === 'function') {
      try {
        var testValues = {};
        (tool.inputs || []).forEach(function(inp) {
          testValues[inp.id] = inp.def || (inp.type === 'number' ? 0 : '');
        });
        var stepsResult = tool.steps(testValues);
        if (stepsResult && stepsResult.length > 0) {
          var howTo = {
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            'name': 'How to use the ' + tool.name,
            'step': stepsResult.slice(0, 5).map(function(s, i) {
              return {
                '@type': 'HowToStep',
                'position': i + 1,
                'text': s.replace(/^Step\s+\d+:\s*/i, '')
              };
            })
          };
          schemas.push(howTo);
        }
      } catch(e) {}
    }
    
    // 3. FAQPage schema (from TOOL_SEO or YMYL categories)
    var faqItems = [];
    if (seo && seo.faqs && seo.faqs.length > 0) {
      seo.faqs.forEach(function(faq) {
        faqItems.push({
          '@type': 'Question',
          'name': faq.q,
          'acceptedAnswer': { '@type': 'Answer', 'text': faq.a }
        });
      });
    }
    // Fallback for YMYL categories without SEO data
    if (faqItems.length === 0) {
      var ymylCats = ['finance', 'health', 'business', 'career', 'family'];
      if (ymylCats.includes(catKey)) {
        faqItems.push({
          '@type': 'Question',
          'name': 'What does this ' + tool.name + ' calculate?',
          'acceptedAnswer': { '@type': 'Answer', 'text': tool.desc }
        });
        faqItems.push({
          '@type': 'Question',
          'name': 'Is CalcPro a substitute for professional ' + (catKey === 'health' ? 'medical' : 'financial') + ' advice?',
          'acceptedAnswer': { '@type': 'Answer', 'text': 'No. This calculator provides estimates for informational purposes. Consult a qualified professional for important decisions.' }
        });
      }
    }
    if (faqItems.length > 0) {
      var faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': faqItems
      };
      schemas.push(faqSchema);
    }
    
    // Write schemas (as JSON-LD array or single object)
    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'ymyl-tool-schema';
    script.textContent = JSON.stringify(schemas.length === 1 ? schemas[0] : schemas, null, 2);
    document.head.appendChild(script);
  }

  // ---------- SEO Meta (dynamic title, canonical, OG, Twitter) ----------
  // Set per-tool Open Graph / Twitter card meta (title, description, image).
  // Uses the unique per-tool share card at /og/<toolId>.jpg (generated by
  // scripts/generate-tool-og.cjs). Idempotent — safe to call on every render.
  function setOgMeta(ogTitle, ogDesc, ogImagePath) {
    try {
      const ogMap = [
        ['og:title', ogTitle || document.title],
        ['og:description', ogDesc || ''],
        ['og:image', window.location.origin + ogImagePath],
        ['og:image:width', '1200'],
        ['og:image:height', '630'],
        ['og:type', 'website'],
        ['twitter:card', 'summary_large_image'],
        ['twitter:title', ogTitle || document.title],
        ['twitter:description', ogDesc || ''],
        ['twitter:image', window.location.origin + ogImagePath]
      ];
      ogMap.forEach(function (pair) {
        let el = document.querySelector('meta[property="' + pair[0] + '"], meta[name="' + pair[0] + '"]');
        if (!el) {
          el = document.createElement('meta');
          el.setAttribute(pair[0].indexOf(':') > -1 && pair[0].indexOf('og:') === 0 ? 'property' : 'name', pair[0]);
          document.head.appendChild(el);
        }
        el.setAttribute(pair[0].indexOf('og:') === 0 ? 'property' : 'name', pair[0]);
        el.setAttribute('content', String(pair[1]).slice(0, 300));
      });
    } catch (e) { /* meta is best-effort */ }
  }

  function updateMeta(desc, canonicalUrl) {
    // Description
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    meta.content = desc || 'Free advanced online calculators';
    // Indexability reset: any real (non-404) page must always be indexable.
    // The 404 renderer sets robots noindex; this guarantees every other route
    // flips it back (covers SPA navigations that bypass renderStatic).
    // VARIANT GUARD: long-tail modifier routes RE-LOCK noindex after meta render
    // (applyVariantSeo sets <html data-robots-lock>). updateMeta clears the lock
    // here at the start of the next render so normal pages stay indexable.
    // VARIANT LOCK: long-tail modifier pages stay noindex even when later
    // updateMeta calls (e.g. post-calc result descriptions) re-run this reset.
    // Lock is armed by applyVariantSeo and cleared at the top of navigate().
    const robotsLocked = document.documentElement.hasAttribute('data-robots-lock');
    try {
      const robots = document.querySelector('meta[name="robots"]');
      if (robotsLocked) {
        robots.content = 'noindex, follow';
      } else if (robots && robots.content.indexOf('noindex') !== -1) {
        robots.content = 'index, follow';
      }
    } catch (e) { /* non-fatal */ }
    // Generic OG/Twitter fallback for non-tool pages (home, category, hub, static,
    // 404). Per-tool cards override this in renderTool via setOgMeta(). This
    // guarantees shares NEVER carry a stale previous tool's title/image.
    try { setOgMeta(document.title, desc || 'Free advanced online calculators', '/og-image.png'); } catch (e) { /* best-effort */ }
    
    // Canonical URL (auto-detect domain from window.location). For localized pages the
    // canonical carries the active locale so Google sees ONE URL per language version.
    const baseUrl = window.location.origin;
    const activeLocale = (window.I18n && typeof I18n.getLocale === 'function' && I18n.getLocale()) || 'en';
    let canonPath = canonicalUrl || window.location.pathname.split('?')[0].split('#')[0];
    if (canonicalUrl && activeLocale !== 'en' && canonPath !== '/' && canonPath.indexOf('/' + activeLocale + '/') !== 0) {
      canonPath = '/' + activeLocale + canonPath;
    }
    const fullUrl = baseUrl + canonPath;
    let canon = document.querySelector('link[rel="canonical"]');
    if (!canon) {
      canon = document.createElement('link');
      canon.rel = 'canonical';
      document.head.appendChild(canon);
    }
    canon.href = fullUrl;
    if (robotsLocked) {
      // Variant lock also pins the canonical to the BASE tool page, matching the
      // static SSG output (updateMeta would otherwise self-canonicalize the URL).
      try {
        const segs = window.location.pathname.split('?')[0].split('#')[0].replace(/\/+$/, '').split('/').filter(Boolean);
        if (segs.length >= 3) canon.href = window.location.origin + '/' + segs[0] + '/' + segs[1];
      } catch (e) { /* non-fatal */ }
    }
    
    // OG:title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.content = document.title;
    
    // OG:description
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement('meta');
      ogDesc.setAttribute('property', 'og:description');
      document.head.appendChild(ogDesc);
    }
    ogDesc.content = desc || 'Free advanced online calculators';
    
    // OG:url
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.content = fullUrl;
    
    // Twitter:title
    let twTitle = document.querySelector('meta[name="twitter:title"]');
    if (!twTitle) {
      twTitle = document.createElement('meta');
      twTitle.name = 'twitter:title';
      document.head.appendChild(twTitle);
    }
    twTitle.content = document.title;
    
    // Twitter:description
    let twDesc = document.querySelector('meta[name="twitter:description"]');
    if (!twDesc) {
      twDesc = document.createElement('meta');
      twDesc.name = 'twitter:description';
      document.head.appendChild(twDesc);
    }
    twDesc.content = desc || 'Free advanced online calculators';
  }

  // ---------- Global Keyboard Shortcuts ----------
  function initKeyboard() {
    document.addEventListener('keydown', function(e) {
      // Ctrl+K or Cmd+K: open command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        App.openPalette();
      }
      // Escape: close modals/palette
      if (e.key === 'Escape') {
        closePalette();
        document.getElementById('modalOverlay')?.classList.remove('active');
        document.getElementById('compare-modal')?.classList.remove('active');
      }
      // Enter on calculator inputs: trigger calculate if not in palette
      if (e.key === 'Enter' && e.target.closest('.calc-input') && !e.target.closest('.cmd-palette')) {
        e.preventDefault();
        executeCalc({ preventDefault: () => {} });
      }
    });
  }

  // ---------- Init ----------
  function init() {
    // Error boundary: if a tool render throws, show a friendly card instead of a blank screen
    if (typeof Monitor !== 'undefined') {
      try { Monitor.init(); } catch(e) {}
    }
    loadTheme();
    initKeyboard();
    
    // One-time cleanup: drop favorites/history/pins pointing at tools that were
    // merged or removed (SEO dedupe). Derives the removed ids from TOOL_REDIRECTS
    // keys, so this never touches live calculators and is idempotent on reruns.
    try {
      const removedIds = new Set(Object.keys(TOOL_REDIRECTS).map(k => k.split('/')[1]));
      if (removedIds.size) {
        if (typeof CalcHistory !== 'undefined' && typeof CalcHistory.purgeToolIds === 'function') {
          CalcHistory.purgeToolIds(removedIds);
        }
        if (window.AdvancedFeatures && typeof AdvancedFeatures.purgeRemovedToolIds === 'function') {
          AdvancedFeatures.purgeRemovedToolIds(removedIds);
        }
        if (typeof CalcAnalytics !== 'undefined') {
          try {
            const d = CalcAnalytics.getData();
            if (d && d.tools) {
              let changed = false;
              Object.keys(d.tools).forEach(function (id) {
                if (removedIds.has(id)) { delete d.tools[id]; changed = true; }
              });
              if (changed) localStorage.setItem('calcpro_analytics', JSON.stringify(d));
            }
          } catch (e) { /* non-fatal */ }
        }
      }
    } catch (e) { /* never block boot */ }
    
    // Embed mode: when loaded as an iframe widget (?embed=true), add .embed-mode so
    // CSS hides the site chrome (header/nav/footer/cookie banner) — creators get a
    // clean embeddable calculator. Sandboxed iframes keep working (allow-same-origin
    // → localStorage). Widget sessions don't need the consent banner: auto-accept.
    try {
      if (new URLSearchParams(window.location.search).get('embed') === 'true') {
        document.documentElement.classList.add('embed-mode');
        try { localStorage.setItem('calcpro_consent', 'accepted'); } catch (e) {}
      }
    } catch (e) { /* non-fatal */ }
    
    // i18n: resolve the active locale (localStorage or browser detect) BEFORE routing,
    // so URL-based locale routing below can override it cleanly and Router stays in sync.
    if (window.I18n && typeof I18n.init === 'function') {
      try { I18n.init(); } catch (e) {}
    }
    if (window.Router && typeof Router.setLocale === 'function' && window.I18n) {
      Router.setLocale(I18n.getLocale());
    }
    
    // Handle hash changes
    // History API routing via Router (clean paths for SEO)
    // Wire Category Hub routes AFTER App exists (the inline CategoryHub.init() in
    // index.html runs at parse time when App is still undefined — this call is
    // the real registration point). Idempotent: safe to call again.
    if (window.CategoryHub && typeof CategoryHub.init === 'function') {
      try { CategoryHub.init(); } catch (e) { /* hub is optional */ }
    }
    // Idle-hydration: on a prerendered tool page the DOM is already on screen
    // (LCP element baked in). The first navigate() would rebuild the identical
    // markup, and on slow devices that synchronous rebuild (style+layout of the
    // full tool article) blocks the main thread for seconds right at boot —
    // which is exactly the LCP window. So defer that first rebuild to idle and
    // flush it immediately on first interaction (pointer/key) so the very first
    // tap on a control hits freshly-bound listeners instead of a no-op.
    // Gate: only when the URL self-matches a prerendered canonical tool page
    // (long-tail variants need their noindex/canonical guard applied, and
    // non-tool routes genuinely need to re-render). Subsequent navigations
    // (SPA clicks) are never deferred — they replace the page.
    var _staticHydrationTimer = null;
    function _flushStaticHydration() {
      if (window.__staticHydrationDone) return;
      window.__staticHydrationDone = true;
      if (_staticHydrationTimer) { clearTimeout(_staticHydrationTimer); _staticHydrationTimer = null; }
      ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
        window.removeEventListener(ev, _flushStaticHydration);
      });
      if (_pendingStaticPath !== null) {
        var p = _pendingStaticPath; _pendingStaticPath = null;
        // Snapshot NOW (flush time) — anything the user typed into the static
        // form before the rebuild is preserved across the rebuild.
        var _preInputs = {};
        try {
          document.querySelectorAll('#mainContent input, #mainContent select, #mainContent textarea').forEach(function (el) {
            var k = el.id || el.name; if (k) _preInputs[k] = el.value;
          });
        } catch (e) {}
        window.__restoreStaticInputs = _preInputs;
        // User may have already navigated elsewhere during the idle window —
        // only hydrate if the URL still matches the page that's on screen.
        if (window.location.pathname === p) {
          try { navigate(p); } catch (e) { /* never break boot on hydration */ }
        }
      }
    }
    var _pendingStaticPath = null;
    (function deferFirstNavigation() {
      var canonical = document.querySelector('link[rel="canonical"]');
      var canonicalHref = canonical ? canonical.getAttribute('href') : null;
      var isSelfCanonical = canonicalHref && window.location.pathname === canonicalHref.replace(/^https?:\/\/[^/]+/, '');
      var locked = document.documentElement.hasAttribute('data-robots-lock');
      if (document.documentElement.getAttribute('data-prerendered') === '1' &&
          isSelfCanonical && !locked) {
        _pendingStaticPath = window.location.pathname;
        _staticHydrationTimer = setTimeout(function () {
          _staticHydrationTimer = null;
          try { requestIdleCallback ? requestIdleCallback(_flushStaticHydration, { timeout: 2000 }) : setTimeout(_flushStaticHydration, 200); }
          catch (e) { _flushStaticHydration(); }
        }, 120);
        ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
          window.addEventListener(ev, _flushStaticHydration, { passive: true });
        });
      } else {
        // Not a self-canonical prerendered tool page: render immediately via
        // Router.init's initial callback below (it calls navigate with the
        // current path). Just make sure the flush state is settled.
        _flushStaticHydration();
      }
    })();
    Router.init(function (path) {
      if (_pendingStaticPath === null) {
        // Normal case: no deferred hydration (or already flushed) — render now.
        navigate(path);
      } else if (path !== _pendingStaticPath) {
        // A DIFFERENT destination arrived while self-hydration was pending
        // (SPA link click, popstate, ?q= resolve). Discard the pending
        // self-hydration and render the new destination immediately.
        _pendingStaticPath = null;
        _flushStaticHydration();
        navigate(path);
      }
      // else: same path as the pending self-hydration — the idle flush above
      // will run navigate() with this exact path.
    });
    
    // Announce successful boot — the index.html watchdog listens for this and
    // will NEVER replace a working page with its recovery card.
    try { window.dispatchEvent(new CustomEvent('calcpro-booted')); } catch (e) {}
    
    trackPageView();
    
    // Init glossary tooltips
    if (window.AdvancedFeatures) {
      AdvancedFeatures.initGlossaryTooltips();
    }
    
    // Init voice if supported
    if (window.AdvancedFeatures) {
      AdvancedFeatures.initVoice();
    }
    
    // Touch swipe: horizontal swipe on a tool page goes to prev/next tool in
    // the same category. Passive listeners, only fires on clean horizontal drags.
    let _touchX = null, _touchY = null, _touchAt = 0;
    document.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      _touchX = e.touches[0].clientX; _touchY = e.touches[0].clientY; _touchAt = Date.now();
    }, { passive: true });
    document.addEventListener('touchend', function (e) {
      if (_touchX === null || !e.changedTouches[0]) return;
      const dx = e.changedTouches[0].clientX - _touchX;
      const dy = e.changedTouches[0].clientY - _touchY;
      const dt = Date.now() - _touchAt;
      _touchX = null; _touchY = null;
      if (dt > 800 || Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 1.5) return;
      if (_state.page !== 'tool' || !_state.tool || !_state.cat) return;
      const currentId = _state.tool.tool.id;
      const dir = dx < 0 ? 1 : -1;
      // Prefer the Similar-Calculators list (meaningful next/prev); wrap around.
      const rel = (_state.related && _state.related.length > 1) ? _state.related : null;
      if (rel) {
        const ri = rel.findIndex(function (r) { return r.id === currentId; });
        if (ri !== -1) {
          const target = rel[ri + dir] || (dir > 0 ? rel[0] : rel[rel.length - 1]);
          if (target && target.id !== currentId) { navigateToTool(target.id, target.cat || _state.cat); return; }
        }
      }
      // Fallback: same-category neighbors
      const cat = CALC_DATA[_state.cat];
      if (!cat || !cat.tools || cat.tools.length < 2) return;
      const idx = cat.tools.findIndex(function (t) { return t.id === currentId; });
      if (idx === -1) return;
      const next = dir > 0 ? cat.tools[(idx + 1) % cat.tools.length] : cat.tools[(idx - 1 + cat.tools.length) % cat.tools.length];
      if (next && next.id !== currentId) navigateToTool(next.id, _state.cat);
    }, { passive: true });
    
    // Cookie consent — show banner only when no choice has been recorded yet
    const consent = localStorage.getItem('calcpro_consent');
    if (!consent) {
      const banner = document.getElementById('cookie-banner');
      if (banner) banner.style.display = 'block';
    }
    // Harden consent controls: bind handlers via addEventListener (not just inline
    // onclick) so the banner always responds, even if a script elsewhere overrides.
    const _wire = function (id, fn) {
      const el = document.getElementById(id);
      if (el && typeof window[fn] === 'function') el.addEventListener('click', window[fn]);
    };
    _wire('cookie-accept', 'acceptConsent');
    _wire('cookie-reject', 'rejectConsent');
    _wire('cookie-settings', 'openConsentSettings');
    const _saveBtn = document.getElementById('consent-save-btn');
    if (_saveBtn && typeof window.saveConsentSettings === 'function') _saveBtn.addEventListener('click', window.saveConsentSettings);
    
    // Update social proof in footer
    setTimeout(updateSocialProof, 200);
    
    console.log('CalcPro initialized — calculators loaded');
  }

  // ---------- Favorite button i18n label ----------
  // Star (★/☆) is preserved; the word itself is translated so the button never
  // reverts to English after a click or a live locale switch.
  window.favLabel = function (toolId) {
    var fav = AdvancedFeatures.isFavorite(toolId);
    return (fav ? '★ ' : '☆ ') + _t(fav ? 'tool.favorited' : 'tool.favorite', fav ? 'Favorited' : 'Favorite');
  };
  window.refreshFavoriteBtn = function (toolId) {
    var btn = document.querySelector('[data-fav-btn="' + toolId + '"]');
    if (!btn) return;
    var span = btn.querySelector('[data-i18n-btn="favorite"]') || btn;
    span.textContent = App.favLabel(toolId);
    if (window.I18nUI && typeof I18nUI.translateStaticUI === 'function') I18nUI.translateStaticUI();
  };

  // ---------- Hero language switcher (EN / اردو / हिंदी) ----------
  window.setHeroLanguage = function (code) {
    if (!window.I18n) return;
    I18n.setLocale(code);
    // Re-render home so the hero title/desc/search switch instantly (no reload)
    if (_state && _state.page === 'home') {
      renderHome();
    }
    // Update any static UI (nav, footer) via the i18n UI bridge
    if (window.I18nUI && typeof I18nUI.setLanguage === 'function') {
      I18nUI.setLanguage(code);
    }
    App.showToast(code === 'ur' ? 'زبان: اردو' : (code === 'hi' ? 'भाषा: हिंदी' : 'Language: English'), 1200);
  };

  // ---------- Cookie/Consent Handlers ----------
  window.acceptConsent = function () {
    localStorage.setItem('calcpro_consent', 'accepted');
    localStorage.setItem('calcpro_consent_analytics', 'granted');
    localStorage.setItem('calcpro_consent_ads', 'granted');
    var banner = document.getElementById('cookie-banner');
    if (banner) banner.style.display = 'none';
    var settings = document.getElementById('consent-settings-modal');
    if (settings) settings.style.display = 'none';
    // Enable analytics if GA is configured
    if (window.gtag) {
      gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted'
      });
    }
  };
  window.rejectConsent = function () {
    localStorage.setItem('calcpro_consent', 'rejected');
    localStorage.setItem('calcpro_consent_analytics', 'denied');
    localStorage.setItem('calcpro_consent_ads', 'denied');
    var banner = document.getElementById('cookie-banner');
    if (banner) banner.style.display = 'none';
    var settings = document.getElementById('consent-settings-modal');
    if (settings) settings.style.display = 'none';
  };
  // Granular consent settings modal
  window.openConsentSettings = function () {
    var modal = document.getElementById('consent-settings-modal');
    if (!modal) return;
    var ana = document.getElementById('consent-toggle-analytics');
    var ads = document.getElementById('consent-toggle-ads');
    if (ana) ana.checked = localStorage.getItem('calcpro_consent_analytics') !== 'denied';
    if (ads) ads.checked = localStorage.getItem('calcpro_consent_ads') !== 'denied';
    modal.style.display = 'flex';
  };
  window.saveConsentSettings = function () {
    var ana = document.getElementById('consent-toggle-analytics');
    var ads = document.getElementById('consent-toggle-ads');
    var analyticsGranted = !ana || ana.checked;
    var adsGranted = !ads || ads.checked;
    localStorage.setItem('calcpro_consent', 'accepted');
    localStorage.setItem('calcpro_consent_analytics', analyticsGranted ? 'granted' : 'denied');
    localStorage.setItem('calcpro_consent_ads', adsGranted ? 'granted' : 'denied');
    var banner = document.getElementById('cookie-banner');
    if (banner) banner.style.display = 'none';
    var modal = document.getElementById('consent-settings-modal');
    if (modal) modal.style.display = 'none';
    if (window.gtag) {
      gtag('consent', 'update', {
        analytics_storage: analyticsGranted ? 'granted' : 'denied',
        ad_storage: adsGranted ? 'granted' : 'denied',
        ad_user_data: adsGranted ? 'granted' : 'denied',
        ad_personalization: adsGranted ? 'granted' : 'denied'
      });
    }
  };
  window.closeConsentSettings = function () {
    var modal = document.getElementById('consent-settings-modal');
    if (modal) modal.style.display = 'none';
  };
  // Wire settings modal outside-click + Escape to close
  document.addEventListener('click', function (e) {
    var modal = document.getElementById('consent-settings-modal');
    if (modal && modal.style.display === 'flex' && e.target === modal) {
      modal.style.display = 'none';
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var modal = document.getElementById('consent-settings-modal');
      if (modal) modal.style.display = 'none';
    }
  });

  // ---------- Inline unit switching (Gap 3) ----------
  // Scale the displayed value when the user picks a different unit. The input
  // always stores the BASE value (factor 1); switching multiplies by the ratio
  // of old→new factor so the underlying calc never sees garbage.
  function switchUnit(inputId, factor) {
    const input = document.getElementById(inputId);
    const sel = document.getElementById(inputId + '-unit');
    if (!input || !sel) return;
    const oldF = parseFloat(sel.dataset.f || '1') || 1;
    const newF = parseFloat(factor) || 1;
    const num = parseFloat(input.value);
    if (isFinite(num) && oldF !== newF) {
      // Ratio is newF/oldF (e.g. kg→lb: 70 * 2.20462 = 154.32 lb). parseFloat
      // strips trailing zeros safely — never regex-strip "100" → "1".
      input.value = String(parseFloat(Number(num * newF / oldF).toFixed(6)));
    }
    sel.dataset.f = newF;
    // Re-run the calc so the result reflects the new unit immediately
    if (document.getElementById('auto-calc-toggle') && document.getElementById('auto-calc-toggle').checked) {
      App.executeCalc({ preventDefault: function () {}, target: document.getElementById('calc-form') });
    }
  }

  // ---------- Range slider ↔ number input sync (Gap 8) ----------
  function syncSlider(inputId, val) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.value = val;
    if (document.getElementById('auto-calc-toggle') && document.getElementById('auto-calc-toggle').checked) {
      App.executeCalc({ preventDefault: function () {}, target: document.getElementById('calc-form') });
    }
  }

  // ---------- Copy spreadsheet formula (Gap 2) ----------
  function copyExcelFormula(toolId) {
    const code = document.getElementById('excel-formula-' + toolId);
    if (!code) return;
    const text = code.textContent || '';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('Formula copied to clipboard ✓', 1600);
      }).catch(function () { _legacyCopy(text); });
    } else {
      _legacyCopy(text);
    }
  }
  function _legacyCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast('Formula copied ✓', 1600); }
    catch (e) { showToast('Copy failed — select & copy manually', 2000); }
    document.body.removeChild(ta);
  }

  // ---------- Execute a palette command (typed or recent) ----------
  // Commands are short strings like "/finance/loan-emi" (path form) or a bare
  // tool id/name. Unknown commands resolve through the tool index, so typing a
  // tool name always lands somewhere useful instead of erroring.
  function executeCommand(cmd) {
    if (!cmd) return;
    const c = String(cmd).trim();
    // Path form: /category/tool — navigate directly.
    if (c.charAt(0) === '/') {
      navigate(c);
      return;
    }
    // Category-only command (e.g. "finance") — go to the category page.
    if (CALC_DATA[c]) {
      renderCategory(c);
      return;
    }
    // Bare tool id or name — search every category's tool list.
    for (const catKey in CALC_DATA) {
      const cat = CALC_DATA[catKey];
      if (!cat || !cat.tools) continue;
      const tool = cat.tools.find(function (t) {
        return t.id === c || (t.name && t.name.toLowerCase() === c.toLowerCase());
      });
      if (tool) {
        navigateToTool(tool.id, catKey);
        return;
      }
    }
    showToast('No calculator found for "' + cmd + '"', 2200);
  }

  // ---------- Public API ----------
  // ---------- Mobile nav menu (hamburger) ----------
  function _setNavOpen(open) {
    const links = document.getElementById('nav-links');
    const btn = document.getElementById('menu-btn');
    if (links) links.classList.toggle('active', open);
    if (btn) btn.setAttribute('aria-expanded', String(open));
    return open;
  }
  function toggleNavMenu() {
    const links = document.getElementById('nav-links');
    const open = links ? !links.classList.contains('active') : false;
    const opened = _setNavOpen(open);
    // Move focus into the menu when opening (keyboard users)
    if (opened && links) {
      const first = links.querySelector('a, input, button');
      if (first) setTimeout(function () { try { first.focus(); } catch (e) {} }, 60);
    }
  }
  // Close the mobile menu on: Escape, tapping outside the header, or choosing a link.
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') {
      const links = document.getElementById('nav-links');
      if (links && links.classList.contains('active')) {
        _setNavOpen(false);
        const btn = document.getElementById('menu-btn');
        if (btn) btn.focus();
      }
    }
  });
  document.addEventListener('click', function (ev) {
    const links = document.getElementById('nav-links');
    if (!links || !links.classList.contains('active')) return;
    const inside = ev.target.closest('#nav-links, .menu-btn');
    const isNavLink = !!ev.target.closest('#nav-links a');
    if (!inside || isNavLink) _setNavOpen(false);
  });

  return {
    init,
    navigate,
    navigateToTool,
    search,
    homeSearch,
    searchKeyNav,
    clearInputError,
    toggleNavMenu,
    executeCalc,
    executeCalcThrottled,
    _collectValues,
    switchUnit,
    syncSlider,
    copyExcelFormula,
    copyResult,
    get _currentTool() { return _state.tool; },
    setTheme,
    toggleTheme,
    toggleThemeMenu,
    showToast,
    openPalette,
    closePalette,
    paletteFilter,
    paletteKey,
    shareTool,
    buildFormattedResult,
    copyFormattedResult,
    printReport,
    exportResultAsPdf,
    injectToolSchema,
    sciKey, sciEval, sciSync,
    renderHome,
    filterCategory,
    updateSocialProof,
    executeCommand,
    showMoreTools,
    initScrollReveal,
  };
})();

// Initialize on page load
if (typeof window !== 'undefined') {
  window.App = App;
  document.addEventListener('DOMContentLoaded', function () {
    App.init();
    // S2 visual polish: saved accent color + first-visit onboarding tour
    if (window.VisualPolish && typeof VisualPolish.init === 'function') {
      try { VisualPolish.init(); } catch (e) { /* best-effort */ }
    }
    // S3 smart assist: fire any due opt-in reminders
    if (window.SmartAssist && typeof SmartAssist.init === 'function') {
      try { SmartAssist.init(); } catch (e) { /* best-effort */ }
    }
    // S5 power tools: shortcut cheat-sheet (?) + floating mini-calculator
    if (window.PowerTools && typeof PowerTools.attachGlobalKeys === 'function') {
      try { PowerTools.attachGlobalKeys(); } catch (e) { /* best-effort */ }
    }
    if (window.PowerTools && typeof PowerTools.initMiniCalc === 'function') {
      try { PowerTools.initMiniCalc(); } catch (e) { /* best-effort */ }
    }
    // S6 comfort: persisted font scale + colorblind palette + motion override
    if (window.Comfort && typeof Comfort.init === 'function') {
      try { Comfort.init(); } catch (e) { /* best-effort */ }
    }
  });
}
