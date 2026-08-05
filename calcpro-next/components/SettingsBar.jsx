'use client';

import { useState } from 'react';
import { getPrefs, setPrefs } from '../lib/prefs';

// ====== SettingsBar — global Currency + Unit switchers (Step 4) ======
// Renders compact selects in the header. Writes to the shared prefs store;
// every calculator re-renders instantly with the new currency/unit.
const CURRENCIES = [
  { code: 'USD', sym: '$', label: 'US Dollar' },
  { code: 'INR', sym: '₹', label: 'Indian Rupee' },
  { code: 'EUR', sym: '€', label: 'Euro' },
  { code: 'GBP', sym: '£', label: 'British Pound' },
  { code: 'PKR', sym: '₨', label: 'Pakistani Rupee' },
  { code: 'AED', sym: 'د.إ', label: 'UAE Dirham' },
  { code: 'JPY', sym: '¥', label: 'Japanese Yen' },
  { code: 'CNY', sym: '¥', label: 'Chinese Yuan' },
];

export default function SettingsBar() {
  const [prefs, setLocal] = useState(() => ({ ...getPrefs() }));

  const change = (patch) => {
    setPrefs(patch);
    setLocal({ ...getPrefs() });
  };

  const selectCls =
    'rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 shadow-sm outline-none transition hover:border-primary/40 focus:border-primary focus:ring-2 focus:ring-primary/30';

  return (
    <div className="flex items-center gap-1.5" aria-label="Global settings">
      <label className="sr-only" htmlFor="pref-currency">Display currency</label>
      <select
        id="pref-currency"
        className={selectCls}
        value={prefs.currency}
        onChange={(e) => change({ currency: e.target.value })}
        title="Display currency"
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>{c.sym} {c.code}</option>
        ))}
      </select>

      <label className="sr-only" htmlFor="pref-unit">Distance unit</label>
      <select
        id="pref-unit"
        className={selectCls}
        value={prefs.unit}
        onChange={(e) => change({ unit: e.target.value })}
        title="Distance unit"
      >
        <option value="km">km</option>
        <option value="mi">mi</option>
      </select>
    </div>
  );
}
