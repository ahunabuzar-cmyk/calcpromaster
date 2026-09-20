// ============================================================
// Comfort (S6) — result text-to-speech, font-size adjuster,
// colorblind palette mode, reduced-motion manual override.
// All additive, persisted in localStorage, no data collection.
// Dual-mode: window.Comfort in browser, module.exports for tests.
// ============================================================
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.Comfort = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  var LS = {
    fontScale: 'cp.fontScale',
    cbMode: 'cp.colorblind',
    motion: 'cp.reducedMotionOverride'
  };

  // ---------- helpers ----------
  function lsGet(k) { try { return root.localStorage ? root.localStorage.getItem(k) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { if (root.localStorage) root.localStorage.setItem(k, v); } catch (e) { /* private mode */ } }

  // ---------- 1. Result TTS ----------
  // Speaks a short, natural sentence for a calculator result.
  // No-op when speechSynthesis is missing or muted; never throws.
  function speakResult(toolName, summary) {
    var synth = root.speechSynthesis;
    if (!synth || typeof synth.speak !== 'function') return false;
    var text = (toolName ? toolName + '. ' : '') + String(summary || '').slice(0, 240);
    if (!text.trim()) return false;
    try {
      synth.cancel(); // stop any queued speech (e.g. repeated calculations)
      var u = new root.SpeechSynthesisUtterance(text);
      u.rate = 1.02;
      u.volume = 0.9;
      synth.speak(u);
      return true;
    } catch (e) { return false; }
  }

  function stopSpeaking() {
    try { if (root.speechSynthesis) root.speechSynthesis.cancel(); } catch (e) { /* noop */ }
  }

  // ---------- 2. Font-size adjuster ----------
  // Root font scale in 5 steps: 85% .. 115%. Independent of browser zoom.
  var FONT_STEPS = [0.85, 0.925, 1, 1.075, 1.15];
  function fontSteps() { return FONT_STEPS.slice(); }
  function fontIndex() {
    var v = parseFloat(lsGet(LS.fontScale) || '1');
    var i = FONT_STEPS.indexOf(v);
    return i === -1 ? 2 : i;
  }
  function applyFontScale(idx) {
    var i = Math.max(0, Math.min(FONT_STEPS.length - 1, idx));
    lsSet(LS.fontScale, String(FONT_STEPS[i]));
    var d = root.document;
    if (d && d.documentElement) d.documentElement.style.fontSize = (16 * FONT_STEPS[i]) + 'px';
    return FONT_STEPS[i];
  }
  function fontLarger() { return applyFontScale(fontIndex() + 1); }
  function fontSmaller() { return applyFontScale(fontIndex() - 1); }

  // ---------- 3. Colorblind-friendly palettes ----------
  // Applies a data-attribute on <html>; CSS overrides chart/status colors.
  // Modes verified against common simulation palettes (protan/deutan/tritan-safe hues).
  var CB_MODES = ['none', 'protanopia', 'deuteranopia', 'tritanopia'];
  function cbModes() { return CB_MODES.slice(); }
  function cbMode() {
    var v = lsGet(LS.cbMode);
    return CB_MODES.indexOf(v) === -1 ? 'none' : v;
  }
  function applyCbMode(mode) {
    if (CB_MODES.indexOf(mode) === -1) return cbMode();
    lsSet(LS.cbMode, mode);
    var d = root.document;
    if (d && d.documentElement) {
      if (mode === 'none') d.documentElement.removeAttribute('data-cb');
      else d.documentElement.setAttribute('data-cb', mode);
    }
    return mode;
  }

  // ---------- 4. Reduced-motion manual override ----------
  // States: 'auto' (respect prefers-reduced-motion), 'on' (force), 'off' (allow).
  function motionState() {
    var v = lsGet(LS.motion);
    return (v === 'on' || v === 'off') ? v : 'auto';
  }
  function setMotionState(v) {
    if (v !== 'on' && v !== 'off') v = 'auto';
    lsSet(LS.motion, v);
    var d = root.document;
    if (d && d.documentElement) {
      if (v === 'on') d.documentElement.setAttribute('data-reduced-motion', 'on');
      else d.documentElement.removeAttribute('data-reduced-motion');
    }
    return v;
  }
  // Single function other modules should call: true = animations should be minimized.
  function prefersReducedMotion() {
    if (motionState() === 'on') return true;
    if (motionState() === 'off') return false;
    try {
      return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  }

  // ---------- init ----------
  function init() {
    var d = root.document;
    if (!d || !d.documentElement) return;
    applyFontScale(fontIndex());
    applyCbMode(cbMode());
    if (motionState() === 'on') d.documentElement.setAttribute('data-reduced-motion', 'on');
  }

  return {
    LS: LS,
    speakResult: speakResult,
    stopSpeaking: stopSpeaking,
    fontSteps: fontSteps,
    fontIndex: fontIndex,
    applyFontScale: applyFontScale,
    fontLarger: fontLarger,
    fontSmaller: fontSmaller,
    cbModes: cbModes,
    cbMode: cbMode,
    applyCbMode: applyCbMode,
    motionState: motionState,
    setMotionState: setMotionState,
    prefersReducedMotion: prefersReducedMotion,
    init: init
  };
});
