// ============================================================
// Power Tools (S5) — keyboard cheat-sheet, floating mini-calculator,
// bookmarklet generator. Additive; every UI element optional-per-page.
// Dual-mode: window.PowerTools in browser, module.exports for tests.
// ============================================================
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PowerTools = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var LS = {
    miniCollapsed: 'cp.minicalc.collapsed'
  };

  // ---- 1. Cheat-sheet data (single source for the overlay) ----
  var SHORTCUTS = [
    { keys: 'Ctrl / ⌘ + K', desc: 'Command palette — jump to any calculator' },
    { keys: '/', desc: 'Focus the search box' },
    { keys: '↑ ↓', desc: 'Move through search / palette results' },
    { keys: 'Enter', desc: 'Open the highlighted result' },
    { keys: 'Esc', desc: 'Close overlays and dialogs' },
    { keys: 'Ctrl / ⌘ + Z', desc: 'Undo the last calculator input change' },
    { keys: 'Ctrl / ⌘ + Y', desc: 'Redo an undone input change' },
    { keys: '?', desc: 'Show this cheat sheet' }
  ];

  function shortcuts() { return SHORTCUTS.slice(); }

  // Build (once) and toggle the overlay. Safe to call repeatedly.
  function toggleCheatSheet() {
    var d = root.document;
    if (!d) return false;
    var existing = d.getElementById('cp-cheatsheet');
    if (existing) { // toggle off
      existing.remove();
      return false;
    }
    var overlay = d.createElement('div');
    overlay.id = 'cp-cheatsheet';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Keyboard shortcuts');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';
    var rows = SHORTCUTS.map(function (s) {
      return '<tr><td style="padding:6px 14px 6px 0;white-space:nowrap"><kbd style="background:var(--surface-2,#eee);border:1px solid var(--border,#ccc);border-radius:4px;padding:2px 8px;font-family:inherit">' + s.keys + '</kbd></td><td style="padding:6px 0">' + s.desc + '</td></tr>';
    }).join('');
    overlay.innerHTML =
      '<div style="background:var(--surface,#fff);color:var(--text,#111);border-radius:12px;max-width:460px;width:100%;padding:20px 24px;box-shadow:0 8px 40px rgba(0,0,0,.3)">' +
      '<h2 style="margin:0 0 12px;font-size:1.1rem">Keyboard shortcuts</h2>' +
      '<table style="border-collapse:collapse;font-size:.95rem">' + rows + '</table>' +
      '<p style="margin:14px 0 0;font-size:.85rem;opacity:.75">Press <kbd>Esc</kbd> or click outside to close.</p>' +
      '</div>';
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    d.body.appendChild(overlay);
    return true;
  }

  // Global key handler: '?' (shift+/) opens the sheet, Esc closes.
  function attachGlobalKeys() {
    var d = root.document;
    if (!d || attachGlobalKeys._done) return;
    attachGlobalKeys._done = true;
    d.addEventListener('keydown', function (e) {
      var t = e.target;
      var typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (e.key === '?' && !typing) { e.preventDefault(); toggleCheatSheet(); }
      if (e.key === 'Escape') {
        var sheet = d.getElementById('cp-cheatsheet');
        if (sheet) sheet.remove();
      }
    });
  }

  // ---- 2. Floating mini-calculator ----
  // Uses SafeMathParser when present (never eval). Renders a small
  // bottom-left launcher that expands into an expression box + history.
  function initMiniCalc() {
    var d = root.document;
    if (!d || d.getElementById('cp-minicalc')) return null;
    var wrap = d.createElement('div');
    wrap.id = 'cp-minicalc';
    wrap.style.cssText = 'position:fixed;left:14px;bottom:14px;z-index:9500';
    var collapsed = root.localStorage && root.localStorage.getItem(LS.miniCollapsed) !== '0';
    wrap.innerHTML =
      '<button id="cp-minicalc-toggle" aria-label="Toggle mini calculator" aria-expanded="' + (!collapsed) + '" style="width:44px;height:44px;border-radius:50%;border:1px solid var(--border,#ccc);background:var(--surface,#fff);color:var(--text,#111);box-shadow:0 2px 10px rgba(0,0,0,.2);cursor:pointer;font-size:1.2rem">🧮</button>' +
      '<div id="cp-minicalc-panel" role="group" aria-label="Mini calculator" style="display:' + (collapsed ? 'none' : 'block') + ';margin-bottom:8px;background:var(--surface,#fff);color:var(--text,#111);border:1px solid var(--border,#ccc);border-radius:10px;padding:10px;box-shadow:0 4px 20px rgba(0,0,0,.25);width:220px">' +
      '<input id="cp-minicalc-input" inputmode="text" placeholder="e.g. 25*12+40" aria-label="Expression" style="width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid var(--border,#ccc);border-radius:6px;background:var(--surface,#fff);color:var(--text,#111)">' +
      '<output id="cp-minicalc-out" aria-live="polite" style="display:block;margin-top:6px;font-variant-numeric:tabular-nums;min-height:1.3em">—</output>' +
      '</div>';
    var toggleBtn = wrap.querySelector('#cp-minicalc-toggle');
    var panel = wrap.querySelector('#cp-minicalc-panel');
    var input = wrap.querySelector('#cp-minicalc-input');
    var out = wrap.querySelector('#cp-minicalc-out');
    toggleBtn.addEventListener('click', function () {
      var show = panel.style.display === 'none';
      panel.style.display = show ? 'block' : 'none';
      toggleBtn.setAttribute('aria-expanded', String(show));
      try { root.localStorage.setItem(LS.miniCollapsed, show ? '1' : '0'); } catch (e) { /* private mode */ }
      if (show) input.focus();
    });
    function evalExpr(raw) {
      var expr = String(raw || '').trim();
      if (!expr) return null;
      var P = root.SafeMathParser;
      if (P && typeof P.safeEval === 'function') {
        var v = P.safeEval(expr);
        return (typeof v === 'number' && isFinite(v)) ? v : null;
      }
      return null;
    }
    input.addEventListener('input', function () {
      var v = evalExpr(input.value);
      out.textContent = (v === null) ? '—' : String(v);
      out.value = (v === null) ? '' : String(v);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var v = evalExpr(input.value);
        if (v !== null) {
          try { root.localStorage.setItem('cp.minicalc.last', String(v)); } catch (err) { /* ignore */ }
        }
      }
    });
    d.body.appendChild(wrap);
    return wrap;
  }

  // ---- 3. Bookmarklet source ----
  // Select a number on any page → opens CalcProMaster search prefilled (?q=),
  // which the site already handles. Returns the javascript: URL string.
  function bookmarkletSource(baseUrl) {
    var base = baseUrl || 'https://calcpromaster.netlify.app/';
    var code = "(function(){var s=window.getSelection?String(window.getSelection()):'';if(s){location.href=" + JSON.stringify(base) + "+'?q='+encodeURIComponent(s)}})();";
    return 'javascript:' + code;
  }

  // Drag-link markup for the cheat-sheet / tools page.
  function bookmarkletLinkHtml(baseUrl) {
    return '<a href="' + bookmarkletSource(baseUrl).replace(/"/g, '&quot;') + '" onclick="return false" style="cursor:grab">🔍 CalcPro Search</a>';
  }

  return {
    SHORTCUTS: SHORTCUTS,
    shortcuts: shortcuts,
    toggleCheatSheet: toggleCheatSheet,
    attachGlobalKeys: attachGlobalKeys,
    initMiniCalc: initMiniCalc,
    bookmarkletSource: bookmarkletSource,
    bookmarkletLinkHtml: bookmarkletLinkHtml,
    LS: LS
  };
});
