// ====== UX Utils ======
// Global debounce / throttle / rAF utilities (Pillar 4: UX Polish)
// Prevents spam-click "Calculate" crashes and range-slider thrash on ANY input.
const UXUtils = (function () {
  function debounce(fn, ms) {
    let t = null;
    return function () {
      const ctx = this, args = arguments;
      if (t) clearTimeout(t);
      t = setTimeout(function () { t = null; fn.apply(ctx, args); }, ms == null ? 300 : ms);
    };
  }

  function throttle(fn, ms) {
    let last = 0, t = null, ctx = null, args = null;
    return function () {
      ctx = this; args = arguments;
      const now = Date.now();
      const remaining = ms - (now - last);
      if (remaining <= 0) {
        if (t) { clearTimeout(t); t = null; }
        last = now;
        fn.apply(ctx, args);
      } else if (!t) {
        t = setTimeout(function () {
          t = null; last = Date.now();
          fn.apply(ctx, args);
        }, remaining);
      }
    };
  }

  // rAF-throttled: coalesces rapid events (scroll, slider drag) into one frame
  function rafThrottle(fn) {
    let queued = false;
    return function () {
      const ctx = this, args = arguments;
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        fn.apply(ctx, args);
      });
    };
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  return { debounce, throttle, rafThrottle, clamp };
})();

if (typeof window !== 'undefined') window.UXUtils = UXUtils;
if (typeof module !== 'undefined' && module.exports) module.exports = { UXUtils };
