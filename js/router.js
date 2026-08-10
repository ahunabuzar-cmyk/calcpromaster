// ====== CalcProMaster History API Router ======
// Converts hash-based SPA routing (#/finance/loan-emi) to clean paths (/finance/loan-emi)
// Enables Googlebot to index individual calculator pages as distinct URLs
// Zero external dependencies — lightweight ~2KB

const Router = (function () {
  var _onNavigate = null;       // callback(path) on every navigation
  var _initialPath = null;      // captured at init time
  var _isPopState = false;      // guard to avoid double-fire
  var _locale = null;           // active locale prefix (e.g. 'es') or null for English

  // ---------- Path helpers ----------

  // Get the current logical path (strip origin, trailing slash, index.html)
  function getPath() {
    var raw;
    if (window.location.protocol === 'file:') {
      // FILE:// MODE (local testing only): under file:// the pathname is the
      // OS drive path (e.g. /C:/Users/.../deploy/index.html), which never maps
      // to a route. Treat it as home, unless a legacy hash route (#/cat/tool)
      // is present — the hash-migration block below then routes normally.
      raw = '/';
    } else {
      // IMPORTANT: use pathname ONLY. The query string carries calculator input
      // STATE (share links like /finance/loan-emi?amount=100000&rate=8.5) and is
      // restored by URLStateManager — it must NEVER be treated as part of the route
      // path, or every share link falls through to the 404 page.
      raw = window.location.pathname;
    }
    // Strip trailing slash (except for root)
    if (raw.length > 1 && raw.charAt(raw.length - 1) === '/') {
      raw = raw.slice(0, -1);
    }
    // If there's a hash, migrate it (for backward compatibility with old bookmarks)
    if (window.location.hash && window.location.hash.indexOf('#/') === 0) {
      var hashPath = window.location.hash.replace(/^#/, '');
      if (hashPath && hashPath !== '/') {
        // Replace the URL silently — this migrates old hash links
        var migrated = hashPath;
        if (migrated.charAt(0) !== '/') migrated = '/' + migrated;
        if (raw === '/' || raw === '/index.html' || raw === '') {
          raw = migrated;
        }
      }
    }
    if (raw === '' || raw === '/index.html') raw = '/';
    return raw;
  }

  // Normalize a path: ensure it starts with /
  function normalizePath(path) {
    if (!path) return '/';
    if (path.charAt(0) !== '/') path = '/' + path;
    return path;
  }

  // ---------- i18n locale-aware URLs ----------

  // Set the active locale ('es', 'ur', ...) — null/'en' keeps clean English paths.
  // All navigate()/href() calls then prefix paths with /xx/ for shareable localized URLs.
  function setLocale(locale) {
    _locale = (locale && locale !== 'en') ? locale : null;
  }

  // Prefix a clean path with the current locale (idempotent: never double-prefixes)
  function localize(path) {
    path = normalizePath(path);
    if (!_locale) return path;
    var prefix = '/' + _locale;
    if (path === prefix) return path;
    if (path.indexOf(prefix + '/') === 0) return path;
    if (path === '/') return prefix;
    return prefix + path;
  }

  // Current path WITHOUT any locale prefix (used to rebuild URLs when locale changes).
  // All CalcProMaster locales are exactly 2-letter codes (en/es/hi/ur/fr/...), and no
  // category/tool/static route uses a 2-letter slug, so stripping a leading /xx/ segment
  // is unambiguous — this also handles switching directly between two non-English
  // locales (e.g. /es/... -> /hi/...) without leaving a stale /es/ in the path.
  function getCleanPath() {
    var p = getPath();
    var m = p.match(/^\/([a-z]{2})(\/|$)/);
    if (m) {
      var rest = p.slice(m[1].length + 1);
      return rest === '' ? '/' : rest;
    }
    return p;
  }

  // ---------- Navigation ----------

  // Navigate to a clean URL via pushState — no page reload (locale-aware)
  function navigate(path, opts) {
    opts = opts || {};
    // Defensive: never treat a query string or hash as part of the route path
    // (share URLs carry input state; URLStateManager restores it separately).
    path = String(path).split('?')[0].split('#')[0];
    path = localize(normalizePath(path));

    // Don't push duplicate of current path
    if (path === getPath() && !opts.force) return;

    history.pushState(null, '', path);
    _notify(path);
  }

  // Replace current URL without adding a history entry (locale-aware)
  function replace(path) {
    path = localize(normalizePath(path));
    history.replaceState(null, '', path);
    _notify(path);
  }

  // Update the URL silently (replaceState, NO route callback) — used when the locale
  // changes so the address bar shows /xx/... without re-rendering the current page
  // (preserves calculator inputs).
  function syncUrl(path) {
    path = localize(normalizePath(path));
    history.replaceState(null, '', path);
  }

  // ---------- Internal ----------

  function _notify(path) {
    if (typeof _onNavigate === 'function') {
      _onNavigate(path);
    }
    // Broadcast so UI modules (e.g. UserDashboard sidebar) can refresh after navigation
    try {
      window.dispatchEvent(new CustomEvent('route:changed', { detail: { path: path } }));
    } catch (e) { /* older browsers */ }
  }

  // ---------- PopState handler (back/forward buttons) ----------

  function _onPopState() {
    var path = getPath();
    _notify(path);
  }

  // ---------- Init ----------

  // init(callback) — sets up the router. callback(path) is called on every navigation.
  function init(callback) {
    _onNavigate = callback;

    // Listen for back/forward browser navigation
    window.addEventListener('popstate', _onPopState);

    // Capture initial path
    _initialPath = getPath();

    // If there's an old hash URL, migrate it to clean path now
    if (window.location.hash && window.location.hash.indexOf('#/') === 0) {
      var hashPath = window.location.hash.replace(/^#/, '');
      if (hashPath && hashPath !== '/' && hashPath !== '') {
        if (hashPath.charAt(0) !== '/') hashPath = '/' + hashPath;
        replace(hashPath);
      }
    }

    // Fire initial callback with the current path
    if (typeof callback === 'function') {
      setTimeout(function () { callback(_initialPath); }, 0);
    }
  }

  // ---------- Link handler helper ----------
  // Use for onclick in generated HTML: onclick="Router.handleClick(event, '/path')"

  function handleClick(event, path) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    navigate(path);
  }

  // ---------- Generate a clean URL from a path ----------

  function href(path) {
    return localize(normalizePath(path));
  }

  // ---------- Public API ----------

  return {
    init: init,
    navigate: navigate,
    replace: replace,
    syncUrl: syncUrl,
    getPath: getPath,
    getCleanPath: getCleanPath,
    href: href,
    setLocale: setLocale,
    localize: localize,
    handleClick: handleClick,
  };
})();

if (typeof window !== 'undefined') {
  window.Router = Router;
}
