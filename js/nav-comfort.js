// ============================================================
// Navigation & Visual Comfort modules (S9 #61-68 + S10 #69-77)
//   #61 category-switcher dropdown data (breadcrumb attach)
//   #62 Recently Viewed tracker (auto, separate from manual History)
//   #63 scroll-to-top logic
//   #64 shrink-on-scroll mini-header state
//   #65 category color coding (20 stable hues)
//   #66 related-calculators carousel ordering
//   #67 jump-back-to-input (S8 covers UI; here: target finder)
//   #69 content-width preference
//   #71 result-box highlight pulse trigger
//   #73 "you are here" breadcrumb marking
//   #74 grid/list view toggle (category pages, persisted)
//   #75 zoom-safety class thresholds
//   #76 empty-state content builder (honest, no fake illustrations)
// Pure logic exported for tests; DOM wiring in nav-ui.js.
// ============================================================
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.NavComfort = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KEYS = {
    recent: 'calcpro_recent_views',
    viewMode: 'calcpro_cat_view_mode',
    width: 'calcpro_reading_prefs', // contentWidth rides the S8 prefs blob
  };

  // ---- #65 category color coding: stable hash → 20-hue palette ----
  var CAT_HUES = [4, 26, 45, 68, 90, 122, 145, 168, 190, 212, 234, 256, 278, 300, 322, 344, 16, 58, 134, 268];

  function hashKey(s) {
    var h = 0;
    for (var i = 0; i < String(s).length; i++) h = ((h << 5) - h + String(s).charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function categoryColor(catKey) {
    var hue = CAT_HUES[hashKey(catKey) % CAT_HUES.length];
    return { hue: hue, bg: 'hsl(' + hue + ', 72%, 94%)', fg: 'hsl(' + hue + ', 65%, 32%)', border: 'hsl(' + hue + ', 60%, 80%)' };
  }

  // ---- #62 Recently Viewed (auto-tracked, capped) ----
  var RECENT_MAX = 8;

  function pushRecent(list, entry, now) {
    var arr = Array.isArray(list) ? list.slice() : [];
    arr = arr.filter(function (e) { return e && e.id !== entry.id; });
    arr.unshift({ id: entry.id, cat: entry.cat || '', name: entry.name || entry.id, ts: now || Date.now() });
    if (arr.length > RECENT_MAX) arr.length = RECENT_MAX;
    return arr;
  }

  function dedupeRecent(list, withinMs, now) {
    // collapse re-visits of the same tool inside a short window
    var seen = {};
    var out = [];
    for (var i = 0; i < (list || []).length; i++) {
      var e = list[i];
      if (seen[e.id] && now - seen[e.id] < withinMs) continue;
      seen[e.id] = e.ts;
      out.push(e);
    }
    return out;
  }

  // ---- #63 scroll-to-top visibility rule ----
  function scrollTopVisible(scrollY, viewportH, threshold) {
    return scrollY > (threshold || Math.max(2.5 * viewportH, 800));
  }

  // ---- #64 mini-header shrink state ----
  function headerShrinkState(scrollY, lastY) {
    var down = scrollY > lastY + 4;
    var up = scrollY < lastY - 4;
    var shrink = scrollY > 140;
    return { shrink: shrink, hide: shrink && down, show: up || scrollY <= 140 };
  }

  // ---- #61 category switcher options ----
  function buildCategoryOptions(categories, currentKey) {
    return Object.keys(categories || {})
      .filter(function (k) { return k !== currentKey; })
      .map(function (k) { return { key: k, name: (categories[k] && categories[k].name) || k }; })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
  }

  // ---- #66 related-calculators carousel ordering ----
  // nearest matches first, capped, excludes self
  function orderRelated(related, currentId, cap) {
    var n = Math.min(cap || 6, related ? related.length : 0);
    var out = [];
    for (var i = 0; i < (related || []).length && out.length < n; i++) {
      var r = related[i];
      if (!r || r.id === currentId) continue;
      out.push(r);
    }
    return out;
  }

  // ---- #74 grid/list view preference ----
  function normalizeViewMode(mode) { return mode === 'list' ? 'list' : 'grid'; }

  // ---- #75 zoom-safety breakpoint class ----
  function zoomClass(zoomPct) {
    if (zoomPct >= 200) return 'zoom-200';
    if (zoomPct >= 150) return 'zoom-150';
    return '';
  }

  // ---- #76 empty states: honest copy + action, no fake art ----
  function emptyState(kind, toolCount) {
    var map = {
      favorites: {
        title: 'No favorites yet',
        body: 'Tap the star on any calculator to pin it here for quick access.',
        action: { label: 'Browse all ' + toolCount + ' calculators', href: '/#tools' },
      },
      history: {
        title: 'No calculations yet',
        body: 'Results you calculate are listed here so you can pick up where you left off.',
        action: { label: 'Find a calculator', href: '/#search' },
      },
      recent: {
        title: 'Nothing viewed yet',
        body: 'The last calculators you open will appear here automatically.',
        action: { label: 'Go to homepage', href: '/' },
      },
    };
    return map[kind] || null;
  }

  // ---- #71 result highlight: throttle so pulses don't stack per keystroke ----
  function shouldPulse(lastPulseAt, now, minGapMs) {
    return !lastPulseAt || now - lastPulseAt >= (minGapMs || 1500);
  }

  // ---- #73 "you are here" marking ----
  function markCurrentPath(currentPath, hrefs) {
    return (hrefs || []).map(function (h) {
      return { href: h.href, text: h.text, current: h.href === currentPath };
    });
  }

  return {
    KEYS: KEYS,
    RECENT_MAX: RECENT_MAX,
    categoryColor: categoryColor,
    pushRecent: pushRecent,
    dedupeRecent: dedupeRecent,
    scrollTopVisible: scrollTopVisible,
    headerShrinkState: headerShrinkState,
    buildCategoryOptions: buildCategoryOptions,
    orderRelated: orderRelated,
    normalizeViewMode: normalizeViewMode,
    zoomClass: zoomClass,
    emptyState: emptyState,
    shouldPulse: shouldPulse,
    markCurrentPath: markCurrentPath,
  };
});
