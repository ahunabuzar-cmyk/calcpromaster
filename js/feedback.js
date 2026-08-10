// Haptics (navigator.vibrate) + ASMR WebAudio micro-interactions — zero dependencies.
// A subtle tactile layer: soft click on buttons/cards, tick on sliders, gentle two-tone
// chime on successful calculation. All sounds are synthesized (no asset downloads),
// volume kept low, and everything respects prefers-reduced-motion + a persisted toggle.
const Feedback = (function () {
  let audioCtx = null;
  let soundEnabled = true;
  let lastTick = 0;
  const PREF_KEY = 'calcpro_feedback_sound';
  const TICK_THROTTLE_MS = 60;
  // navigator.vibrate() is user-activation-gated: calling it before the user has
  // tapped/clicked/keyed logs a browser warning and does nothing. Track the first
  // real gesture so haptics only fire when they can actually work (e.g. the
  // auto-run success chime on URL deep-links never triggers the console warning).
  let hasUserGesture = false;

  function loadPref() {
    try { soundEnabled = localStorage.getItem(PREF_KEY) !== 'off'; } catch (e) {}
  }
  function savePref() {
    try { localStorage.setItem(PREF_KEY, soundEnabled ? 'on' : 'off'); } catch (e) {}
  }
  function reducedMotion() {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  // Lazily create + resume the AudioContext. Only called from user-gesture paths
  // (click/input listeners and the pointerdown unlock), so autoplay policy is happy.
  function getCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) { try { audioCtx = new AC(); } catch (e) { audioCtx = null; } }
    }
    if (audioCtx && audioCtx.state === 'suspended') { try { audioCtx.resume(); } catch (e) {} }
    return audioCtx;
  }
  function blip(freq, dur, vol, type, when) {
    if (!soundEnabled || reducedMotion()) return;
    const ctx = getCtx();
    if (!ctx) return;
    try {
      const t0 = ctx.currentTime + (when || 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (e) { /* silent — never let feedback break the app */ }
  }
  function vibrate(pattern) {
    if (reducedMotion()) return;
    if (!hasUserGesture) return; // vibrate is a no-op pre-gesture anyway — skip the warning
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
  }
  const CLICKABLE = 'button, .btn, .action-btn, .small-btn, .tool-card, .category-card, .suggestion-card, .related-card, .lang-option, .lang-trigger, .cmd-item, .search-item, [role="menuitem"], input[type="checkbox"], input[type="radio"], input[type="range"], .toggle';

  function init() {
    loadPref();
    // Mark the first real user gesture (pointerdown/keydown) so vibrate() is gated
    // behind it. Also unlocks the AudioContext on the same gesture (autoplay policy).
    document.addEventListener('pointerdown', function once() {
      hasUserGesture = true;
      getCtx();
      document.removeEventListener('pointerdown', once);
    });
    document.addEventListener('keydown', function onceKey() {
      hasUserGesture = true;
      document.removeEventListener('keydown', onceKey);
    });
    // Clicks on interactive elements → tap (or toggle for checkboxes/radios)
    document.addEventListener('click', function (e) {
      const el = e.target && e.target.closest ? e.target.closest(CLICKABLE) : null;
      if (!el) return;
      if (e.target.matches && e.target.matches('input[type="checkbox"], input[type="radio"]')) {
        Feedback.toggle();
      } else if (e.target.matches && e.target.matches('input[type="range"]')) {
        return; // handled on 'input' below
      } else {
        Feedback.tap();
      }
    });
    // Slider drags → faint tick
    document.addEventListener('input', function (e) {
      if (e.target && e.target.matches && e.target.matches('input[type="range"]')) {
        Feedback.tick();
      }
    });
  }

  return {
    init: init,
    tap: function () { vibrate(8); blip(640, 0.06, 0.03, 'triangle'); },
    tick: function () {
      // Throttle slider drags — one blip per ~60ms max, never a rapid-fire wall of blips
      const now = Date.now();
      if (now - lastTick < TICK_THROTTLE_MS) return;
      lastTick = now;
      if (soundEnabled && !reducedMotion()) blip(880, 0.03, 0.012, 'sine');
    },
    toggle: function () {
      vibrate(12);
      blip(520, 0.05, 0.025, 'triangle');
      setTimeout(function () { blip(760, 0.05, 0.02, 'sine'); }, 40);
    },
    success: function () {
      vibrate([18, 40, 30]);
      blip(523, 0.1, 0.035, 'sine');
      blip(784, 0.14, 0.03, 'sine', 0.09);
    },
    setSound: function (on) { soundEnabled = !!on; savePref(); },
    isSoundEnabled: function () { return soundEnabled; }
  };
})();

if (typeof window !== 'undefined') {
  window.Feedback = Feedback;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Feedback.init);
  } else {
    Feedback.init();
  }
}
