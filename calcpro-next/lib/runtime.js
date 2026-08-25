// ====== Client runtime shim ======
// The shared tool-suite calc(v) functions call bare globals (Charts.bar,
// AdvancedCalc.generateAmortization, Security.sanitizeCalcValue, Currency.convert,
// QRCode.generate) — exactly like the vanilla SPA. This module imports core.js +
// qrcode.js for their side effect: each attaches itself to `window` in the browser,
// so those identifiers resolve when a calculation runs.
//
// core.js never touches the DOM at module load, so SSR is safe too.
import '@calcpro-js/core.js';
import '@calcpro-js/calc-modes.js';
import '@calcpro-js/qrcode.js';

// No-op marker — importing this module guarantees the runtime is attached.
export function ensureRuntime() {
  return true;
}
