'use client';

import { useEffect, useMemo, useState } from 'react';
import core from '@calcpro-js/core.js';

// ====== AmortizationTable — Year-by-Year Breakdown (Step 5) ======
// For loan-like tools (rate + amount + years), renders a full amortization
// schedule grouped by year: payment, interest, principal, balance + totals.
// Uses the SAME engine as the vanilla app (AdvancedCalc.generateAmortization).
function money(n) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AmortizationTable({ tool, values }) {
  const [open, setOpen] = useState(false);
  const schedule = useMemo(() => buildSchedule(tool, values), [tool, values]);

  if (!schedule) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-base font-bold text-ink transition hover:text-primary"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-sm">📆</span>
          Amortization Schedule (Year by Year)
        </span>
        <span className={`text-slate-400 transition ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="mt-4">
          <div className="mb-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Monthly Payment</p>
              <p className="text-sm font-bold text-ink">{money(schedule.emi)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Total Interest</p>
              <p className="text-sm font-bold text-amber-600">{money(schedule.totalInterest)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Total Payment</p>
              <p className="text-sm font-bold text-ink">{money(schedule.totalPayment)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Principal</p>
              <p className="text-sm font-bold text-ink">{money(schedule.principal)}</p>
            </div>
          </div>

          <div className="max-h-80 overflow-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Year</th>
                  <th className="px-3 py-2 text-right font-semibold">Paid</th>
                  <th className="px-3 py-2 text-right font-semibold">Interest</th>
                  <th className="px-3 py-2 text-right font-semibold">Principal</th>
                  <th className="px-3 py-2 text-right font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedule.years.map((y, i) => (
                  <tr key={i} className={i % 2 ? 'bg-slate-50/50' : 'bg-white'}>
                    <td className="px-3 py-2 font-semibold text-ink">{y.year}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(y.paid)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-amber-600">{money(y.interest)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(y.principal)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">{money(y.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            End of year {schedule.years.length || '—'}: balance {money(schedule.years[schedule.years.length - 1]?.balance || 0)}
          </p>
        </div>
      )}
    </div>
  );
}

function buildSchedule(tool, values) {
  const AdvancedCalc = (typeof window !== 'undefined' && window.AdvancedCalc) || core.AdvancedCalc;
  if (!AdvancedCalc || !AdvancedCalc.generateAmortization) return null;

  const find = (...ids) => {
    for (const id of ids) {
      if (values[id] !== undefined && values[id] !== null && values[id] !== '') {
        const n = parseFloat(values[id]);
        if (isFinite(n)) return n;
      }
    }
    return null;
  };

  const amount = find('amount', 'principal', 'principalAmount');
  const rate = find('rate', 'interestRate', 'annualRate');
  const years = find('years', 'term', 'months') / (values.months && !values.years ? 12 : 1) || null;
  if (amount === null || rate === null || years === null) return null;
  if (amount <= 0 || years <= 0) return null;

  try {
    const s = AdvancedCalc.generateAmortization(amount, rate, years, '$');
    const yearsArr = [];
    for (let y = 1; y <= s.schedule.length / 12 + 1; y++) {
      const rows = s.schedule.slice((y - 1) * 12, y * 12);
      if (!rows.length) break;
      const paid = rows.reduce((a, r) => a + r.payment, 0);
      const interest = rows.reduce((a, r) => a + r.interest, 0);
      yearsArr.push({
        year: y,
        paid,
        interest,
        principal: paid - interest,
        balance: rows[rows.length - 1].balance,
      });
      if (rows[rows.length - 1].balance <= 0.005) break;
    }
    return { emi: s.emi, totalPayment: s.totalPayment, totalInterest: s.totalInterest, principal: s.principal, years: yearsArr };
  } catch (e) {
    return null;
  }
}
