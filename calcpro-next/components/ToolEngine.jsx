'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getTool } from '../lib/tools';
import '../lib/runtime'; // side-effect: attach window.Charts/Security/... for calc()
import { executeCalc, unitLabel, isLoanTool } from '../lib/runCalc';
import { getPrefs, subscribe } from '../lib/prefs';
import ToolField from './ToolField';
import ResultPanel from './ResultPanel';
import ComparePanel from './ComparePanel';
import AmortizationTable from './AmortizationTable';
import ExportPanel from './ExportPanel';

// ====== ToolEngine — the Dynamic UI Engine ======
// Step 1: schema parser + real-time calc (debounced 200ms), async-aware
// Step 4: serializes inputs into the URL (?amount=100000&rate=8.5) and
//         restores + auto-calculates from query params on load (shareable)
// Step 5: scenario comparison toggle + amortization table + export panel
export default function ToolEngine({ categoryKey, toolId }) {
  const tool = useMemo(() => getTool(categoryKey, toolId), [categoryKey, toolId]);

  const [values, setValues] = useState(() => buildDefaults(tool));
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [lastRun, setLastRun] = useState(0);
  const [compare, setCompare] = useState(false);
  const calcIdRef = useRef(0);
  const prefsRef = useRef(getPrefs());

  // Reset state whenever the tool changes (navigation between tools)
  useEffect(() => {
    setValues(buildDefaults(tool));
    setResult(null);
    setError(null);
    setCompare(false);
  }, [tool]);

  // ---------- URL query-param sync (Step 4 — shareable results) ----------
  // Restore values from ?amount=...&rate=... on load, then auto-calc.
  useEffect(() => {
    if (!tool || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (![...params.keys()].length) return;
    const restored = {};
    let any = false;
    (tool.inputs || []).forEach((inp) => {
      const v = params.get(inp.id);
      if (v !== null) {
        restored[inp.id] = inp.type === 'checkbox' ? v === 'true' : v;
        any = true;
      }
    });
    if (any) setValues((prev) => ({ ...prev, ...restored }));
  }, [tool]);

  // Push serialized values to the URL after each successful calc (replaceState
  // — no history spam, back/forward safe).
  useEffect(() => {
    if (!tool || !lastRun || typeof window === 'undefined') return;
    const params = new URLSearchParams();
    (tool.inputs || []).forEach((inp) => {
      const v = values[inp.id];
      if (v !== undefined && v !== null && v !== '' && v !== false && v !== true) {
        params.set(inp.id, String(v));
      }
    });
    const qs = params.toString();
    const url = window.location.pathname + (qs ? '?' + qs : '');
    try { window.history.replaceState(null, '', url); } catch (e) { /* sandboxed */ }
  }, [lastRun, tool, values]);

  // -------- async-aware calculation executor (shared engine) --------
  const runCalc = useCallback(async () => {
    if (!tool) return;
    const id = ++calcIdRef.current; // guard against out-of-order async results
    setCalculating(true);
    setError(null);
    const { result: out, error: err } = await executeCalc(tool, values);
    if (id !== calcIdRef.current) return; // superseded
    setResult(out);
    setError(err);
    setLastRun(Date.now());
    setCalculating(false);
  }, [tool, values]);

  // Re-run when the global unit/currency preference changes (unit conversion
  // changes the values handed to calc(); currency re-renders result display).
  // Ref-stable listener: runCalc is recreated every render, so we hold the
  // latest one in a ref and subscribe exactly once.
  const runCalcRef = useRef(runCalc);
  runCalcRef.current = runCalc;
  useEffect(() => {
    const unsub = subscribe((prefs) => {
      const changedUnit = prefs.unit !== prefsRef.current.unit;
      const changedCurrency = prefs.currency !== prefsRef.current.currency;
      prefsRef.current = prefs;
      // Re-run on EITHER change: unit changes the values handed to calc();
      // currency re-renders the result in the new display currency
      // (executeCalc → convertResult reads getPrefs().currency at call time,
      // always on a fresh tool.calc() output — no double-conversion).
      if (changedUnit || changedCurrency) runCalcRef.current();
    });
    return unsub;
  }, []);

  // -------- real-time: debounced auto-calc on every values change --------
  useEffect(() => {
    if (!tool || compare) return; // hidden panel shouldn't calc in compare mode
    const t = setTimeout(() => { runCalc(); }, 200);
    return () => clearTimeout(t);
  }, [values, tool, runCalc, compare]);

  // -------- immediate calculate button (flush the debounce) --------
  const calculateNow = useCallback(() => { runCalc(); }, [runCalc]);

  if (!tool) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Calculator not found.
      </div>
    );
  }

  const onFieldChange = (id, v) => setValues((prev) => ({ ...prev, [id]: v }));

  // Fields with unit-aware labels (km↔mi from the global switcher)
  const inputs = (tool.inputs || []).map((inp) => ({
    ...inp,
    label: unitLabel(inp, prefsRef.current.unit),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-400">
          {compare ? 'Comparing two scenarios side by side' : 'Results update automatically as you type.'}
        </div>
        <button
          type="button"
          onClick={() => setCompare((c) => !c)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
            compare
              ? 'border-primary bg-primary text-white shadow-sm'
              : 'border-slate-300 bg-white text-slate-600 hover:border-primary/50 hover:text-primary'
          }`}
        >
          {compare ? '✕ Close Comparison' : '⇄ Compare Scenarios'}
        </button>
      </div>

      {compare ? (
        <ComparePanel categoryKey={categoryKey} toolId={toolId} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ---------- Inputs panel ---------- */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-ink">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-sm">📝</span>
              Inputs
            </h2>
            <form
              className="space-y-4"
              onSubmit={(e) => { e.preventDefault(); calculateNow(); }}
              aria-label={`${tool.name} inputs`}
            >
              {inputs.map((inp) => (
                <ToolField key={tool.id + '-' + inp.id} inp={inp} value={values[inp.id]} onChange={onFieldChange} />
              ))}
              <button
                type="submit"
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-md transition hover:bg-primary-dark active:scale-[0.99]"
              >
                🧮 Calculate
              </button>
            </form>
          </div>

          {/* ---------- Results panel ---------- */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center justify-between text-base font-bold text-ink">
              <span className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-sm">📊</span>
                Result
              </span>
              {calculating && <span className="text-xs font-medium text-primary">Calculating…</span>}
            </h2>
            <div aria-live="polite" aria-atomic="true">
              <ResultPanel
                tool={tool}
                values={values}
                result={result}
                error={error}
                calculating={calculating}
              />
            </div>
            {lastRun > 0 && !error && (
              <p className="mt-4 text-right text-[11px] text-slate-400">
                Last run {new Date(lastRun).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Amortization schedule — Step 5 (loan-like tools only) */}
      {!compare && isLoanTool(tool) && result && !error && (
        <AmortizationTable tool={tool} values={values} />
      )}

      {/* Export / history / embed — Step 5 */}
      {!compare && (
        <ExportPanel categoryKey={categoryKey} toolId={toolId} tool={tool} values={values} result={result} />
      )}
    </div>
  );
}

// Build the initial values map from the schema defaults
function buildDefaults(tool) {
  const d = {};
  if (!tool) return d;
  (tool.inputs || []).forEach((inp) => {
    if (inp.type === 'checkbox') d[inp.id] = !!inp.def;
    else if (inp.type === 'range') d[inp.id] = inp.def ?? 50;
    else if (inp.type === 'number') d[inp.id] = inp.def ?? '';
    else d[inp.id] = inp.def ?? (inp.type === 'select' ? (inp.opts?.[0]?.v ?? '') : '');
  });
  return d;
}
