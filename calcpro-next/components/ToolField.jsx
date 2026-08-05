'use client';

import { useState } from 'react';

// ====== ToolField — renders ONE schema input ======
// Supports: number, select, range (slider), checkbox, textarea, text.
// Fully controlled: value + onChange(id, value). All fields get labels + aria.
// Unit switching (inp.units) mirrors the vanilla site: the ToolEngine state always
// holds the BASE value (factor 1); this field converts display ⇄ base via the
// selected unit's factor. Sliders (inp.slider) operate on the base value directly.
export default function ToolField({ inp, value, onChange }) {
  const id = inp.id;
  const label = inp.label || inp.id;

  // Inline unit switching — selected unit factor (default: the schema's sel unit or 1).
  const hasUnits = inp.type === 'number' && Array.isArray(inp.units) && inp.units.length > 1;
  const defaultUnit = hasUnits ? (inp.units.find((u) => u.sel) || inp.units[0]) : null;
  const [unitFactor, setUnitFactor] = useState(defaultUnit ? Number(defaultUnit.f) || 1 : 1);

  const set = (v) => onChange(id, v);

  // --- select ---
  if (inp.type === 'select') {
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-semibold text-ink">{label}</label>
        <select
          id={id}
          name={id}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
          value={String(value ?? '')}
          onChange={(e) => set(e.target.value)}
        >
          {(inp.opts || []).map((o) => (
            <option key={o.v} value={o.v}>{o.l}</option>
          ))}
        </select>
      </div>
    );
  }

  // --- checkbox ---
  if (inp.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2.5 rounded-lg border border-slate-300 bg-white px-3 py-2.5 cursor-pointer transition hover:border-primary/50">
        <input
          id={id}
          type="checkbox"
          className="h-4 w-4 accent-primary"
          checked={!!value}
          onChange={(e) => set(e.target.checked)}
        />
        <span className="text-sm font-semibold text-ink">{label}</span>
      </label>
    );
  }

  // --- textarea ---
  if (inp.type === 'textarea') {
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-semibold text-ink">{label}</label>
        <textarea
          id={id}
          name={id}
          rows="4"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
          value={String(value ?? '')}
          onChange={(e) => set(e.target.value)}
        />
      </div>
    );
  }

  // --- range slider (min/max/step optional, defaults 0-100) ---
  if (inp.type === 'range') {
    const min = inp.min ?? 0;
    const max = inp.max ?? 100;
    const step = inp.step ?? 1;
    const num = Number(value ?? 0);
    const pct = max > min ? Math.min(100, Math.max(0, ((num - min) / (max - min)) * 100)) : 0;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="flex items-center justify-between text-sm font-semibold text-ink">
          <span>{label}</span>
          <output className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{num}</output>
        </label>
        <div className="flex items-center gap-3">
          <input
            id={id}
            type="range"
            min={min}
            max={max}
            step={step}
            aria-valuetext={`${num}`}
            className="slider-track h-2 w-full cursor-pointer appearance-none rounded-full transition focus:outline-none focus:ring-2 focus:ring-primary/40"
            style={{
              background: `linear-gradient(to right, var(--primary, #4f46e5) ${pct}%, #e2e8f0 ${pct}%)`,
            }}
            value={num}
            onChange={(e) => set(Number(e.target.value))}
          />
          <input
            type="number"
            aria-label={`${label} (fine)`}
            className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-ink shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            value={num}
            min={min}
            max={max}
            step={step}
            onChange={(e) => set(Number(e.target.value))}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
    );
  }

  // --- number / text (default) ---
  const isNumber = inp.type === 'number';
  const hasSlider = isNumber && inp.slider && inp.slider.min !== undefined && inp.slider.max !== undefined;

  // Display the base value scaled to the selected unit (e.g. 70 kg shown as 154.32 lb).
  // Empty state stays empty — Number('') is 0 and would wrongly show "0".
  const num = Number(value);
  const isEmpty = value === '' || value === null || value === undefined;
  const displayVal = isNumber && hasUnits && !isEmpty && isFinite(num)
    ? String(parseFloat((num * unitFactor).toFixed(6)))
    : String(value ?? '');

  const onNumChange = (e) => {
    const typed = parseFloat(e.target.value);
    if (hasUnits) {
      // Typed value is in the SELECTED unit → convert back to base for state.
      set(isFinite(typed) ? String(parseFloat((typed / unitFactor).toFixed(6))) : e.target.value);
    } else {
      set(e.target.value);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">{label}</label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          name={id}
          type={isNumber ? 'number' : 'text'}
          step={isNumber ? 'any' : undefined}
          inputMode={isNumber ? 'decimal' : undefined}
          autoComplete="off"
          maxLength={200}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
          value={displayVal}
          onChange={onNumChange}
        />
        {hasUnits && (
          <select
            aria-label={`${label} unit`}
            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-ink shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            value={String(unitFactor)}
            onChange={(e) => setUnitFactor(Number(e.target.value) || 1)}
          >
            {inp.units.map((u) => (
              <option key={u.l} value={u.f || 1}>{u.l}</option>
            ))}
          </select>
        )}
      </div>
      {hasSlider && (
        <input
          id={`${id}-slider`}
          type="range"
          min={inp.slider.min}
          max={inp.slider.max}
          step={inp.slider.step || 1}
          aria-label={`${label} slider`}
          className="slider-track h-2 w-full cursor-pointer appearance-none rounded-full transition focus:outline-none focus:ring-2 focus:ring-primary/40"
          value={isFinite(num) ? num : (inp.def ?? inp.slider.min)}
          onChange={(e) => set(Number(e.target.value))}
        />
      )}
    </div>
  );
}
