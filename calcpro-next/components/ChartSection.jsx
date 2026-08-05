'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
  RadialBarChart, RadialBar,
} from 'recharts';

// ====== ChartSection — interactive Recharts visualizations ======
// The vanilla Charts module (js/core.js) generates static SVG strings for
// result.chart, and now ALSO records the raw data on window.__calcproChart
// (see the `record()` hook in core.js). This component reads that registry
// and re-renders the same data as a fully interactive chart — hover tooltips,
// legends, animations — using Recharts. If no registry data exists yet, it
// falls back to the original static SVG (server-rendered, crawlable).
const PALETTE = ['#4f7cff', '#2dd4bf', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

function fmt(v) {
  const n = Number(v);
  if (!isFinite(n)) return String(v);
  if (Math.abs(n) >= 1000000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (Math.abs(n) >= 100) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (Math.abs(n) >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return n.toFixed(2);
}

function buildSeries(type, reg) {
  // Convert { data[], labels[], value, max } into Recharts data rows
  if (type === 'bar' || type === 'line' || type === 'donut') {
    const data = reg.data || [];
    const labels = reg.labels || data.map((_, i) => '#' + (i + 1));
    return data.map((v, i) => ({ name: String(labels[i] ?? ('#' + (i + 1))), value: Number(v) || 0 }));
  }
  return null;
}

function renderChart(type, reg) {
  const series = buildSeries(type, reg);
  if (!series || series.length === 0) return null;

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={series.length > 10 ? 'preserveStartEnd' : 0} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={52} tickFormatter={fmt} />
          <Tooltip formatter={(v) => [fmt(v), 'Value']} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={350}>
            {series.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'donut') {
    return (
      <div className="flex flex-col items-center gap-2 sm:flex-row">
        <ResponsiveContainer width="100%" height={240} className="max-w-[260px]">
          <PieChart>
            <Pie data={series} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}
              paddingAngle={3} strokeWidth={2} animationDuration={350}>
              {series.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => [fmt(v), 'Value']} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={series.length > 10 ? 'preserveStartEnd' : 0} />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={52} tickFormatter={fmt} />
          <Tooltip formatter={(v) => [fmt(v), 'Value']} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }} />
          <Line type="monotone" dataKey="value" stroke="#4f7cff" strokeWidth={2.5} dot={{ r: 3.5, fill: '#4f7cff' }} activeDot={{ r: 5 }} animationDuration={350} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'gauge') {
    const value = Number(reg.value) || 0;
    const max = Number(reg.max) || (value || 100);
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    const color = pct < 50 ? '#2dd4bf' : pct < 80 ? '#f59e0b' : '#ef4444';
    return (
      <div className="flex flex-col items-center">
        <ResponsiveContainer width="100%" height={220} className="max-w-[280px]">
          <RadialBarChart data={[{ name: 'value', value: pct, fill: color }]} innerRadius="72%" outerRadius="100%"
            startAngle={200} endAngle={-20} cy="72%">
            <RadialBar dataKey="value" background={{ fill: '#e2e8f0' }} cornerRadius={12} animationDuration={350} />
          </RadialBarChart>
        </ResponsiveContainer>
        <p className="-mt-14 text-center text-2xl font-extrabold text-ink">{fmt(value)}</p>
        <p className="text-xs text-slate-400">of {fmt(max)}</p>
      </div>
    );
  }

  return null;
}

export default function ChartSection({ svg }) {
  const [reg, setReg] = useState(null);

  // Read the registry after each render — the vanilla calc() writes it
  // synchronously right before returning result.chart.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.__calcproChart) return;
    setReg({ ...window.__calcproChart });
  }, [svg]);

  if (!reg) {
    // Fallback: the crawlable static SVG (first paint, SSR)
    if (!svg) return null;
    return (
      <div className="chart-area rounded-xl border border-slate-200 bg-white p-3" aria-label="Calculation chart">
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    );
  }

  const interactive = renderChart(reg.type, reg);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Interactive chart</p>
      {interactive || (svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : null)}
    </div>
  );
}
