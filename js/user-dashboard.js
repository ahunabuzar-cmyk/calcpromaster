// ====== UserDashboard (Pillar 3: Addictive User Retention) ======
// Slide-out sidebar giving instant access to Favorites and the last 10
// calculations. Pure localStorage — no database. Reuses the existing
// AdvancedFeatures favorites + CalcHistory stores.
const UserDashboard = (function () {
  var SIDEBAR_ID = 'user-sidebar';
  var OPEN_KEY = 'calcpro_sidebar_open';

  function getFavorites() {
    try { return window.AdvancedFeatures ? AdvancedFeatures.getFavorites() : []; } catch (e) { return []; }
  }
  function getRecent(n) {
    try { return (window.CalcHistory ? CalcHistory.getAll() : []).slice(0, n || 10); } catch (e) { return []; }
  }

  // Build the sidebar markup once (lazy on first open)
  function ensureSidebar() {
    var el = document.getElementById(SIDEBAR_ID);
    if (el) return el;
    el = document.createElement('aside');
    el.id = SIDEBAR_ID;
    el.className = 'user-sidebar';
    el.setAttribute('aria-label', 'Your dashboard');
    el.innerHTML =
      '<div class="usb-header">' +
        '<div class="usb-title">📊 My Dashboard</div>' +
        '<button class="usb-close" onclick="UserDashboard.toggle(false)" aria-label="Close dashboard">×</button>' +
      '</div>' +
      '<div class="usb-section"><h4>⭐ Favorites</h4><div id="usb-favorites" class="usb-list"></div></div>' +
      '<div class="usb-section"><h4>🕒 Recent (last 10)</h4><div id="usb-recent" class="usb-list"></div></div>' +
      '<div class="usb-footer">' +
        '<a href="/favorites" class="usb-link" onclick="event.preventDefault();UserDashboard.go(\'/favorites\')">Manage favorites →</a>' +
        '<a href="/history" class="usb-link" onclick="event.preventDefault();UserDashboard.go(\'/history\')">Full history →</a>' +
      '</div>' +
      '<div id="usb-donation-slot"></div>';
    document.body.appendChild(el);

    // Close on overlay click / Escape
    var overlay = document.createElement('div');
    overlay.id = 'usb-overlay';
    overlay.className = 'usb-overlay';
    overlay.onclick = function () { UserDashboard.toggle(false); };
    document.body.appendChild(overlay);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && UserDashboard.isOpen()) UserDashboard.toggle(false);
    });
    return el;
  }

  function renderLists() {
    var el = ensureSidebar();
    var favBox = el.querySelector('#usb-favorites');
    var recBox = el.querySelector('#usb-recent');
    if (!favBox || !recBox) return;

    // NOTE: clicks route through UserDashboard.go(toolId, catKey) → App.navigateToTool,
    // which searches ALL categories when catKey is missing (e.g. crash-history entries).
    // Building the path inline ('/' + catKey + '/' + id) would produce broken '//id' 404s.
    var favs = getFavorites().slice(0, 10);
    // XSS-hardening: favorites come from localStorage — escape onclick args (JS-string ctx) + text
    favBox.innerHTML = favs.length
      ? favs.map(function (f) {
          return '<button class="usb-item" onclick="UserDashboard.go(\'' + Security.sanitizeJsString(f.id) + '\',\'' + Security.sanitizeJsString(f.cat) + '\')">' +
            '<span class="usb-item-icon">⭐</span><span class="usb-item-name">' + Security.sanitizeHtml(f.name) + '</span></button>';
        }).join('')
      : '<div class="usb-empty">No favorites yet — tap ★ on any tool.</div>';

    var rec = getRecent(10);
    // XSS-hardening: history entries can carry crafted values — escape onclick args + text
    recBox.innerHTML = rec.length
      ? rec.map(function (h) {
          return '<button class="usb-item" onclick="UserDashboard.go(\'' + Security.sanitizeJsString(h.toolId || '') + '\',\'' + Security.sanitizeJsString(h.catKey || '') + '\')">' +
            '<span class="usb-item-icon">🕒</span>' +
            '<span class="usb-item-name">' + Security.sanitizeHtml(h.toolName || h.toolId) + '</span>' +
            '<span class="usb-item-result">' + Security.sanitizeHtml(String(h.result || '').substring(0, 28)) + '</span></button>';
        }).join('')
      : '<div class="usb-empty">Run a calculation to see it here.</div>';
  }

  function toggle(force) {
    var open = force !== undefined ? force : !isOpen();
    var el = ensureSidebar();
    el.classList.toggle('open', open);
    document.getElementById('usb-overlay').classList.toggle('active', open);
    try { localStorage.setItem(OPEN_KEY, open ? '1' : '0'); } catch (e) {}
    if (open) {
      renderLists();
      // donate widget lives in the sidebar slot
      if (window.DonationWidget) DonationWidget.renderInto('usb-donation-slot');
      var closeBtn = el.querySelector('.usb-close');
      if (closeBtn) closeBtn.focus();
      document.body.classList.add('usb-open');
    } else {
      document.body.classList.remove('usb-open');
    }
  }

  function isOpen() {
    var el = document.getElementById(SIDEBAR_ID);
    return el ? el.classList.contains('open') : false;
  }

  function go(toolId, catKey) {
    toggle(false);
    try {
      if (window.App && typeof App.navigateToTool === 'function') {
        // Reuses category search — safe when catKey is empty
        App.navigateToTool(toolId, catKey);
      } else if (window.Router) {
        var path = catKey ? '/' + catKey + '/' + toolId : '/finance/' + toolId;
        Router.navigate(path);
      }
    } catch (e) { /* best-effort */ }
  }

  // Re-render whenever navigation happens (favorites/history change)
  function refresh() {
    if (isOpen()) renderLists();
  }

  function init() {
    // Restore open state from last visit
    try { if (localStorage.getItem(OPEN_KEY) === '1') toggle(true); } catch (e) {}
    // Re-render lists after browser back/forward navigation
    window.addEventListener('popstate', refresh);
    // Re-render after in-app navigation too (Router dispatches a custom event)
    window.addEventListener('route:changed', refresh);
    // Hook the toggle button in the nav bar
    var btn = document.getElementById('user-dashboard-btn');
    if (btn) btn.addEventListener('click', function (e) { e.preventDefault(); toggle(); });
  }

  return { init: init, toggle: toggle, isOpen: isOpen, go: go, refresh: refresh, renderLists: renderLists };
})();

if (typeof window !== 'undefined') window.UserDashboard = UserDashboard;
if (typeof module !== 'undefined' && module.exports) module.exports = { UserDashboard };
