// ====== Shared calculation engine (client-only) ======
// Used by ToolEngine (Step 1) and the Scenario Comparison panel (Step 5).
//   - collectValues: sanitizes schema inputs (mirrors vanilla Security)
//   - executeCalc: async-aware — awaits currency-converter, guards out-of-order
//   - Unit conversion: km↔miles transparently on distance inputs
//   - Currency conversion: converts `$X` amounts in results to the global
//     display currency using the vanilla Currency fallback rates (offline-safe)

import { getPrefs } from './prefs';

// ---------- distance-input detection (for the km/miles switcher) ----------
export function isDistanceInput(inp) {
  return inp?.type === 'number' && /\b(km|kilometers?|mile|miles?|mileage|distance)\b/i.test(inp.label || '');
}

export function nativeUnitOf(inp) {
  return /mile/.test((inp.label || '').toLowerCase()) ? 'mi' : 'km';
}

// Convert a native-unit value to the display unit (prefUnit: 'km' | 'mi')
export function toDisplay(value, inp, prefUnit) {
  if (!isDistanceInput(inp)) return value;
  const n = Number(value);
  if (!isFinite(n)) return value;
  const nu = nativeUnitOf(inp);
  if (prefUnit === nu) return n;
  if (prefUnit === 'mi' && nu === 'km') return +(n * 0.621371192).toFixed(4);
  if (prefUnit === 'km' && nu === 'mi') return +(n * 1.609344).toFixed(4);
  return n;
}

// Convert a display-unit value back to the tool's native unit before calc
export function toNative(value, inp, prefUnit) {
  if (!isDistanceInput(inp)) return value;
  const n = Number(value);
  if (!isFinite(n)) return value;
  const nu = nativeUnitOf(inp);
  if (prefUnit === nu) return n;
  if (prefUnit === 'mi' && nu === 'km') return +(n / 0.621371192).toFixed(4);
  if (prefUnit === 'km' && nu === 'mi') return +(n / 1.609344).toFixed(4);
  return n;
}

// Update a label to show the user's chosen unit (km ↔ miles)
export function unitLabel(inp, prefUnit) {
  const l = inp.label || inp.id;
  if (!isDistanceInput(inp) || nativeUnitOf(inp) === prefUnit) return l;
  if (prefUnit === 'mi') {
    return l.replace(/\bkilometers?\b/gi, 'miles').replace(/\bkm\b/g, 'mi');
  }
  return l.replace(/\bmiles?\b/gi, 'kilometers').replace(/\bmi\b/g, 'km');
}

// ---------- value collection (sanitized, unit-converted) ----------
export function collectValues(tool, values) {
  const Security = (typeof window !== 'undefined' && window.Security) || null;
  const prefUnit = getPrefs().unit;
  const out = {};
  (tool?.inputs || []).forEach((inp) => {
    const raw = values[inp.id];
    if (inp.type === 'checkbox') out[inp.id] = !!raw;
    else if (inp.type === 'number') {
      let v = Security ? Security.sanitizeCalcValue(raw, 0) : (parseFloat(raw) || 0);
      out[inp.id] = toNative(v, inp, prefUnit);
    } else if (inp.type === 'range') {
      out[inp.id] = toNative(Number(raw) || 0, inp, prefUnit);
    } else {
      out[inp.id] = Security ? Security.validateInput(raw, { maxLen: 500 }) : String(raw ?? '');
    }
  });
  return out;
}

// ---------- display-currency conversion of `$X` amounts ----------
function convertMoneyText(text, currency) {
  if (typeof window === 'undefined' || !window.Currency) return text;
  const rates = window.Currency.FALLBACK_RATES || {};
  const info = window.Currency.CURRENCY_INFO || {};
  const rate = rates[currency];
  const sym = (info[currency] && info[currency].symbol) || currency;
  if (!rate || currency === 'USD') return text;
  return String(text).replace(/\$(\s?[\d,]+(?:\.\d+)?)/g, (_m, num) => {
    const amt = parseFloat(num.replace(/,/g, '')) * rate;
    return sym + amt.toLocaleString(undefined, { maximumFractionDigits: 2 });
  });
}

function convertResult(tool, out) {
  if (!out || tool.id === 'currency-converter') return out; // never double-convert
  const cur = getPrefs().currency;
  if (cur === 'USD' || typeof out !== 'object') return out;
  const next = { ...out };
  if (typeof next.result === 'string') next.result = convertMoneyText(next.result, cur);
  if (typeof next.extra === 'string') next.extra = convertMoneyText(next.extra, cur);
  return next;
}

// ---------- async-aware execution ----------
export async function executeCalc(tool, values) {
  if (!tool) return { error: 'Calculator not found.' };
  if (!tool.calc && !tool.async) return { error: 'Calculator not implemented.' };
  try {
    const collected = collectValues(tool, values);
    let out;
    if (tool.async === true) {
      if (tool.id === 'currency-converter' && typeof window !== 'undefined' && window.Currency && typeof window.Currency.convert === 'function') {
        out = await window.Currency.convert(collected);
      } else if (typeof tool.calc === 'function') {
        out = await tool.calc(collected);
      } else {
        throw new Error('Async calculator not implemented: ' + tool.id);
      }
    } else if (typeof tool.calc === 'function') {
      const raw = tool.calc(collected);
      out = (raw && typeof raw.then === 'function') ? await raw : raw;
    } else {
      throw new Error('Calculator not implemented: ' + tool.id);
    }
    return { result: convertResult(tool, out), error: null };
  } catch (err) {
    return { result: null, error: err?.message || String(err) };
  }
}

// Detect loan-like tools (for the amortization table — Step 5)
export function isLoanTool(tool) {
  if (!tool || !Array.isArray(tool.inputs)) return false;
  const ids = new Set(tool.inputs.map((i) => i.id));
  return ids.has('rate') && (ids.has('amount') || ids.has('principal')) && (ids.has('years') || ids.has('months') || ids.has('term'));
}
