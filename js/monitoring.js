// ====== CalcProMaster Monitoring & Error Boundary ======
// 1. Global error boundary: window.onerror + unhandledrejection
// 2. User-friendly fallback card ("Tool failed to load, refresh page") instead of blank screen
// 3. Sentry/GlitchTip-ready structured logger (localStorage buffer + optional remote DSN)
const Monitor = (function () {
  var DSN = '';                       // set via Monitor.init({ dsn }) when ready
  var bufferKey = 'calcpro_crash_logs';
  var _bound = false;
  var _beforeSend = null;             // hook to attach toolId/env before shipping

  // ---------- Structured logging ----------
  function _loadBuffer() {
    try { return JSON.parse(localStorage.getItem(bufferKey) || '[]'); } catch (e) { return []; }
  }
  function _saveBuffer(logs) {
    try { localStorage.setItem(bufferKey, JSON.stringify(logs.slice(-50))); } catch (e) {}
  }
  function captureException(err, context) {
    var entry = {
      ts: Date.now(),
      message: (err && err.message) || String(err),
      stack: (err && err.stack) || '',
      context: context || '',
      toolId: (window.App && App._currentTool && App._currentTool.tool && App._currentTool.tool.id) || null,
      url: window.location.href,
      env: navigator.userAgent
    };
    // Allow external hook to enrich (e.g., attach Sentry tags)
    if (_beforeSend) { try { entry = _beforeSend(entry) || entry; } catch (e) {} }
    var logs = _loadBuffer();
    logs.push(entry);
    _saveBuffer(logs);
    // Remote shipping — drop-in for Sentry/GlitchTip
    if (DSN) {
      try {
        fetch(DSN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: entry })
        }).catch(function () {});
      } catch (e) {}
    }
    return entry;
  }

  // ---------- Error boundary UI ----------
  function showErrorCard(message, toolName) {
    var main = document.getElementById('mainContent');
    if (!main) return;
    // Only render the card if the main content area is empty/broken (blank-screen prevention)
    var existing = main.querySelector('.error-boundary-card');
    if (existing) return;
    var safeMsg = String(message || 'Something went wrong').replace(/[<>&"']/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#039;' }[c];
    });
    main.innerHTML =
      '<div class="error-boundary-card" role="alert" style="max-width:520px;margin:80px auto;padding:40px 32px;background:var(--surface);border:1px solid var(--border);border-radius:16px;text-align:center;box-shadow:var(--shadow-lg)">' +
        '<div style="font-size:52px;margin-bottom:16px">😵</div>' +
        '<h2 style="margin-bottom:8px;font-family:var(--font-display)">Tool failed to load</h2>' +
        '<p style="color:var(--text-light);margin-bottom:20px">' + safeMsg + '</p>' +
        '<button class="action-btn calc-btn" onclick="location.reload()" style="background:var(--primary);color:#fff;border:none;padding:12px 28px;border-radius:10px;font-weight:600;cursor:pointer">🔄 Refresh page</button>' +
      '</div>';
    if (typeof App !== 'undefined' && App.showToast) {
      try { App.showToast('Something went wrong. Our team has been notified.', 4000); } catch (e) {}
    }
  }

  // ---------- Global handlers ----------
  function bind() {
    if (_bound) return;
    _bound = true;
    window.onerror = function (msg, url, line, col, err) {
      captureException(err || new Error(String(msg)), 'url=' + url + ':' + line + ':' + col);
      return true; // prevent default browser dialog
    };
    window.addEventListener('unhandledrejection', function (e) {
      var reason = e.reason;
      captureException(reason instanceof Error ? reason : new Error(String(reason)), 'unhandledrejection');
    });
    // Calc crash events dispatched by App.executeCalc
    window.addEventListener('calc:fatal_crash', function (e) {
      var d = (e && e.detail) || {};
      captureException(new Error(d.error || 'calc crash'), 'toolId=' + d.toolId);
    });
    // Boundary render: if main content stays empty after load, show card
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', armBlankScreenGuard);
    } else {
      armBlankScreenGuard();
    }
  }

  function armBlankScreenGuard() {
    // After 4s, if mainContent is still just the loader, render fallback
    setTimeout(function () {
      var main = document.getElementById('mainContent');
      if (!main) return;
      var txt = (main.textContent || '').trim();
      if (txt === 'Loading...' || txt === '') {
        showErrorCard('The page could not start. Please refresh.', null);
      }
    }, 4000);
  }

  function init(opts) {
    opts = opts || {};
    if (opts.dsn) DSN = opts.dsn;
    if (typeof opts.beforeSend === 'function') _beforeSend = opts.beforeSend;
    bind();
    // Take over from the early head-script hook: remove its unhandledrejection
    // listener so the same rejection is never logged twice, then drain its buffer.
    try {
      if (window._earlyRejHandler) {
        window.removeEventListener('unhandledrejection', window._earlyRejHandler);
        window._earlyRejHandler = null;
      }
    } catch (e) { /* non-fatal */ }
    try {
      if (window._crashLogs && window._crashLogs.length) {
        var early = window._crashLogs;
        window._crashLogs = [];
        var logs = _loadBuffer();
        logs = logs.concat(early);
        _saveBuffer(logs);
      }
    } catch (e) { /* non-fatal */ }
  }

  return {
    init: init,
    captureException: captureException,
    showErrorCard: showErrorCard,
    getLogs: _loadBuffer,
    clearLogs: function () { try { localStorage.removeItem(bufferKey); } catch (e) {} }
  };
})();

if (typeof window !== 'undefined') {
  window.Monitor = Monitor;
  // Auto-init at script load (DSN stays empty until owner configures it)
  Monitor.init();
}
