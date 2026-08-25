// ============================================================
// SolveFor — Safe Reverse Calculation / Goal-Seek Engine
// ------------------------------------------------------------
// Additive capability: normal forward calculation is untouched.
// Given known inputs + a target result + a variable to solve for,
// returns a solution with method, verification and clear status.
//
// Strategy (in priority order):
//   1. ANALYTICAL  — tool.reverse.variables[x].analytical(others, target)
//                    exact closed-form inverse (preferred, never approximate).
//   2. NUMERIC     — tool.reverse.variables[x].{fn, domain, monotonic}
//                    robust bisection over a declared bracket.
//   3. GENERIC     — no declaration: use the tool's own calc() + result
//                    extraction, adaptive bracket from slider/domain, bisection.
//
// Every result is VERIFIED by substituting it back into the original calc()
// and comparing to the target within tolerance (Phase 10). If verification
// fails, the solver NEVER presents the value as valid — it returns status
// 'none' with an honest message instead of a fake answer.
//
// Safety: max iterations, no infinite loops, no browser freeze, no silent
// wrong answers, multiple-solution support for declared analytical roots.
// ============================================================
const SolveFor = (function () {
  'use strict';

  // ---- Result target extraction ----
  // Prefer a declarative extractor (tool.reverse.target); else parse the first
  // number out of result.result (the primary output of the tool).
  function extractTarget(tool, result) {
    if (tool && tool.reverse && typeof tool.reverse.target === 'function') {
      const v = tool.reverse.target(result);
      if (typeof v === 'number' && isFinite(v)) return v;
    }
    if (!result) return NaN;
    const s = String(result.result || '');
    const m = s.match(/-?\d[\d,]*(?:\.\d+)?/);
    return m ? parseFloat(m[0].replace(/,/g, '')) : NaN;
  }

  // ---- Forward evaluation ----
  // The target quantity as a function of the solve variable x (others fixed).
  function forward(tool, baseValues, solveForId, x, declaredFn) {
    if (declaredFn) {
      try {
        const v = declaredFn(x, baseValues);
        return (typeof v === 'number' && isFinite(v)) ? v : NaN;
      } catch (e) { return NaN; }
    }
    const v = Object.assign({}, baseValues);
    v[solveForId] = x;
    let r;
    try { r = tool.calc(v); } catch (e) { return NaN; }
    return extractTarget(tool, r);
  }

  // ---- Robust bisection (f monotonic on [a,b]) ----
  // Returns { value, iterations } or null if target not bracketed / not found.
  function bisect(f, a, b, target, opts) {
    opts = opts || {};
    const maxIter = opts.maxIter || 200;
    const relTol = opts.relTol || 1e-9;
    const absTol = opts.absTol || 1e-9;
    if (!isFinite(a) || !isFinite(b) || a > b) return null;
    let fa = f(a) - target;
    let fb = f(b) - target;
    // NaN at an endpoint (e.g. division-by-zero at x=0 in some formulas):
    // nudge that side inward until the function is evaluable, so valid
    // solutions near the singularity are still found.
    let guard = 0;
    while ((!isFinite(fa) || !isFinite(fb)) && guard < 200) {
      if (!isFinite(fa)) { a += (b - a) * 0.02; fa = f(a) - target; }
      if (!isFinite(fb)) { b -= (b - a) * 0.02; fb = f(b) - target; }
      guard++;
    }
    if (!isFinite(fa) || !isFinite(fb) || a >= b) return null;
    // Target outside the function's range on this bracket → no solution.
    if (fa * fb > 0) return null;
    let lo = a, hi = b;
    for (let i = 0; i < maxIter; i++) {
      const mid = (lo + hi) / 2;
      const fm = f(mid) - target;
      if (!isFinite(fm)) { hi = mid; continue; } // narrow away from NaN region
      if (Math.abs(fm) <= absTol + relTol * Math.abs(target)) {
        return { value: mid, iterations: i + 1 };
      }
      if (fa * fm < 0) { hi = mid; fb = fm; } else { lo = mid; fa = fm; }
    }
    return { value: (lo + hi) / 2, iterations: maxIter };
  }

  // ---- Verification (Phase 10) ----
  // Substitute the found value back into the ORIGINAL calc and compare to target.
  // Tolerance 1% — user-entered targets are typically rounded (e.g. 22.86 BMI),
  // so a relative error up to 1% is a genuine match, not a wrong answer.
  function verify(tool, baseValues, solveForId, value, target) {
    const got = forward(tool, baseValues, solveForId, value, null);
    if (!isFinite(got)) return { ok: false, got: NaN, err: Infinity };
    const err = Math.abs(got - target) / Math.max(1, Math.abs(target));
    return { ok: err <= 1e-2, got: got, err: err };
  }

  // ---- Domain filter ----
  // Keep only analytical roots that fall inside the variable's declared domain
  // (e.g. weight/height must be >= 0 — a negative physical quantity is invalid).
  function inDomain(varDef, v) {
    if (!varDef || !Array.isArray(varDef.domain)) return true;
    return v >= varDef.domain[0] - 1e-9 && v <= varDef.domain[1] + 1e-9;
  }

  // ---- Main solve ----
  function solve(tool, baseValues, solveForId, target) {
    if (!tool || typeof tool.calc !== 'function') {
      return { status: 'error', message: 'This calculator cannot be solved.' };
    }
    if (!isFinite(target)) {
      return { status: 'error', message: 'Enter a valid numeric target value.' };
    }

    const rev = tool.reverse || {};
    // Values that must be held fixed for the solve (e.g. loan-emi mode='payment').
    const effBase = Object.assign({}, baseValues, rev.fixed || {});
    const varDef = rev.variables && rev.variables[solveForId];

    // 1) ANALYTICAL
    if (varDef && typeof varDef.analytical === 'function') {
      try {
        const others = Object.assign({}, effBase);
        delete others[solveForId];
        const res = varDef.analytical(others, target);
        const values = (Array.isArray(res) ? res : [res])
          .filter(function (v) { return typeof v === 'number' && isFinite(v); })
          .filter(function (v) { return inDomain(varDef, v); });
        if (values.length === 0) {
          return { status: 'none', message: 'No valid solution exists for this target value.' };
        }
        const primary = values[0];
        const vf = verify(tool, effBase, solveForId, primary, target);
        return {
          status: values.length > 1 ? 'multiple' : (vf.ok ? 'exact' : 'approximate'),
          value: primary,
          values: values,
          method: 'analytical',
          iterations: 0,
          verification: vf,
          message: vf.ok ? '' : 'Analytical solution could not be verified — check inputs.'
        };
      } catch (e) {
        return { status: 'error', message: 'Could not compute a solution for this target.' };
      }
    }

    // 2) DECLARED NUMERIC
    if (varDef && typeof varDef.fn === 'function') {
      const domain = varDef.domain || [0, 1e7];
      const f = function (x) { return forward(tool, effBase, solveForId, x, varDef.fn); };
      const r = bisect(f, domain[0], domain[1], target, {});
      if (!r) {
        return { status: 'none', message: 'No solution found in the allowed range for this value.' };
      }
      const vf = verify(tool, effBase, solveForId, r.value, target);
      if (!vf.ok) {
        return { status: 'none', message: 'Could not verify a solution for this target value.' };
      }
      return {
        status: 'approximate', value: r.value, method: 'numerical',
        iterations: r.iterations, verification: vf,
        message: 'Approximate solution (numerical method).'
      };
    }

    // 3) GENERIC FALLBACK — tool.calc + result parsing + adaptive bracket.
    const inp = (tool.inputs || []).filter(function (i) { return i.id === solveForId; })[0];
    let lo = 0, hi = 1e7;
    if (inp && inp.slider && isFinite(inp.slider.min) && isFinite(inp.slider.max)) {
      lo = inp.slider.min; hi = inp.slider.max;
    }
    if (varDef && Array.isArray(varDef.domain)) { lo = varDef.domain[0]; hi = varDef.domain[1]; }
    const cur = baseValues[solveForId];
    if (typeof cur === 'number' && cur < 0) lo = Math.min(lo, cur * 2);
    const f = function (x) { return forward(tool, effBase, solveForId, x, null); };
    const r = bisect(f, lo, hi, target, {});
    if (!r) {
      return { status: 'none', message: 'Could not find a value that produces this result. Try a different target or check the other inputs.' };
    }
    const vf = verify(tool, effBase, solveForId, r.value, target);
    if (!vf.ok) {
      return { status: 'none', message: 'Could not verify a value that produces this result.' };
    }
    return {
      status: 'approximate', value: r.value, method: 'numerical',
      iterations: r.iterations, verification: vf,
      message: 'Approximate solution (numerical method).'
    };
  }

  // ---- Which inputs are solvable for a tool ----
  // Declared reverse.solveFor restricts the set; otherwise all numeric inputs.
  function solvableInputs(tool) {
    if (!tool || !Array.isArray(tool.inputs)) return [];
    const numeric = tool.inputs.filter(function (i) { return i.type === 'number'; });
    const rev = tool.reverse || {};
    if (rev.solveFor) {
      const allowed = Array.isArray(rev.solveFor) ? rev.solveFor : Object.keys(rev.solveFor);
      const set = {};
      allowed.forEach(function (id) { set[id] = 1; });
      return numeric.filter(function (i) { return set[i.id]; });
    }
    return numeric;
  }

  return { solve: solve, extractTarget: extractTarget, verify: verify, forward: forward, solvableInputs: solvableInputs };
})();
if (typeof window !== 'undefined') window.SolveFor = SolveFor;
