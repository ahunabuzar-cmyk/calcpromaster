// ====== CalcProMaster ToolLifecycle Manager ======
// Zero-leak guarantee: every tool registers timers/listeners/DOM refs here,
// and on route change destroy() unbinds everything before the next tool renders.
// Priority: zero memory leaks, sub-second route changes.
const ToolLifecycle = (function () {
  var _timers = [];          // { id, type: 'timeout'|'interval' }
  var _listeners = [];       // { target, type, fn, opts }
  var _domRefs = [];         // detached node references to release
  var _workers = [];         // active Worker instances
  var _destroyHooks = [];    // per-tool cleanup functions returned by init()
  var _activeToolId = null;
  var _registered = false;

  // Register a cleanup hook that runs when the current tool is destroyed.
  function registerTool(toolId, destroyHook) {
    _activeToolId = toolId;
    if (typeof destroyHook === 'function') _destroyHooks.push({ toolId: toolId, fn: destroyHook });
    // Track listeners/timers created AFTER registration for this tool
    return {
      timer: trackTimer,
      listen: trackListener,
      ref: trackRef,
      worker: trackWorker,
      done: destroyHook
    };
  }

  function trackTimer(fn, delay, isInterval) {
    var id = isInterval ? setInterval(fn, delay) : setTimeout(fn, delay);
    _timers.push({ id: id, type: isInterval ? 'interval' : 'timeout' });
    return id;
  }
  function trackListener(target, type, fn, opts) {
    if (!target || typeof target.addEventListener !== 'function') return null;
    target.addEventListener(type, fn, opts);
    _listeners.push({ target: target, type: type, fn: fn, opts: opts });
    return fn;
  }
  function trackRef(el) {
    if (el) _domRefs.push(el);
    return el;
  }
  function trackWorker(w) {
    if (w) _workers.push(w);
    return w;
  }

  // Wrapper that auto-registers an interval to the active tool
  function setIntervalSafe(fn, delay) { return trackTimer(fn, delay, true); }
  function setTimeoutSafe(fn, delay) { return trackTimer(fn, delay, false); }

  // Destroy everything for the CURRENT tool — called by the router before rendering a new route.
  function destroy(toolId) {
    // Run tool-specific cleanup hooks first
    var i;
    for (i = 0; i < _destroyHooks.length; i++) {
      try { _destroyHooks[i].fn(); } catch (e) { /* never let cleanup break navigation */ }
    }
    _destroyHooks = [];
    // Clear all timers
    for (i = 0; i < _timers.length; i++) {
      if (_timers[i].type === 'interval') clearInterval(_timers[i].id);
      else clearTimeout(_timers[i].id);
    }
    _timers = [];
    // Remove all tracked listeners
    for (i = 0; i < _listeners.length; i++) {
      try {
        _listeners[i].target.removeEventListener(_listeners[i].type, _listeners[i].fn, _listeners[i].opts);
      } catch (e) { /* element may be gone */ }
    }
    _listeners = [];
    // Terminate workers
    for (i = 0; i < _workers.length; i++) {
      try { _workers[i].terminate(); } catch (e) { /* already dead */ }
    }
    _workers = [];
    // Release DOM references
    _domRefs = [];
    _activeToolId = null;
  }

  // Full teardown (used on beforeunload / SW update)
  function teardownAll() {
    destroy(null);
  }

  // ---- Auto-track window/document listeners created while a tool is active ----
  // Tools that use addEventListener directly can route through these helpers:
  //   const lc = ToolLifecycle.current();
  //   lc.on(window, 'scroll', handler)
  //   lc.interval(() => {...}, 1000)
  function current() {
    return {
      on: trackListener,
      interval: function (fn, d) { return trackTimer(fn, d, true); },
      timeout: function (fn, d) { return trackTimer(fn, d, false); },
      ref: trackRef,
      worker: trackWorker
    };
  }

  // One-time global listener registration for popstate (never destroyed — router owns it)
  function listenGlobal(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    return fn;
  }

  if (!_registered) {
    _registered = true;
    // Defensive: on unload, clear anything left so the page never keeps timers alive
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', teardownAll);
    }
  }

  return {
    registerTool: registerTool,
    destroy: destroy,
    teardownAll: teardownAll,
    current: current,
    setIntervalSafe: setIntervalSafe,
    setTimeoutSafe: setTimeoutSafe,
    listenGlobal: listenGlobal,
    get activeToolId() { return _activeToolId; }
  };
})();

if (typeof window !== 'undefined') window.ToolLifecycle = ToolLifecycle;
