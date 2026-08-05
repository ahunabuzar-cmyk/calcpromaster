'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getTool } from '../lib/tools';
import '../lib/runtime';
import { executeCalc, unitLabel } from '../lib/runCalc';
import { getPrefs, subscribe } from '../lib/prefs';
import ToolField from './ToolField';
import ResultPanel from './ResultPanel';

// ====== ComparePanel — Side-by-Side Scenario Comparison (Step 5) ======
// Two independent copies of the tool's input form (Scenario A / Scenario B),
// each running calc() in real time. Ideal for "what if" — compare two loan
// amounts, two rates, two budgets without leaving the page.
export default function ComparePanel({ categoryKey, toolId }) {
  const tool = useMemo(() => getTool(categoryKey, toolId), [categoryKey, toolId]);
  const [valuesA, setValuesA] = useState(() => buildDefaults(tool));
  const [valuesB, setValuesB] = useState(() => buildDefaults(tool));
  const [resA, setResA] = useState({ result: null, error: null });
  const [resB, setResB] = useState({ result: null, error: null });
  const [prefsVersion, setPrefsVersion] = useState(0);
  const idRef = useRef({ a: 0, b: 0 });

  // Re-run both panels when the global currency/unit preference changes
  // (unit changes the values handed to calc(); currency re-renders results).
  useEffect(() => subscribe(() => setPrefsVersion((v) => v + 1)), []);

  useEffect(() => {
    setValuesA(buildDefaults(tool));
    setValuesB(buildDefaults(tool));
    setResA({ result: null, error: null });
    setResB({ result: null, error: null });
  }, [tool]);

  // Debounced real-time calc for both panels
  useEffect(() => {
    if (!tool) return;
    const t = setTimeout(async () => {
      const ia = ++idRef.current.a;
      const ib = ++idRef.current.b;
      const [a, b] = await Promise.all([executeCalc(tool, valuesA), executeCalc(tool, valuesB)]);
      if (ia === idRef.current.a) setResA(a);
      if (ib === idRef.current.b) setResB(b);
    }, 200);
    return () => clearTimeout(t);
  }, [tool, valuesA, valuesB, prefsVersion]);

  if (!tool) return null;

  const inputs = (tool.inputs || []).map((inp) => ({ ...inp, label: unitLabel(inp, getPrefs().unit) }));

  const panel = (title, tone, values, setValues, res) => (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${tone === 'A' ? 'border-primary/30' : 'border-emerald-300'}`}>
      <h3 className={`mb-3 text-sm font-extrabold uppercase tracking-wide ${tone === 'A' ? 'text-primary' : 'text-emerald-600'}`}>
        {tone} — {title}
      </h3>
      <div className="space-y-4">
        {inputs.map((inp) => (
          <ToolField
            key={inp.id}
            inp={inp}
            value={values[inp.id]}
            onChange={(id, v) => setValues((prev) => ({ ...prev, [id]: v }))}
          />
        ))}
      </div>
      <div className="mt-4 border-t border-slate-100 pt-4">
        <ResultPanel tool={tool} values={values} result={res.result} error={res.error} calculating={false} />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-2">
        {panel('Scenario A', 'A', valuesA, setValuesA, resA)}
        {panel('Scenario B', 'B', valuesB, setValuesB, resB)}
      </div>

      {/* Quick diff hint when both results exist */}
      {resA.result && resB.result && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
          💡 Both scenarios calculated live. Tweak inputs on either side and the diff updates instantly.
        </div>
      )}
    </div>
  );
}

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
