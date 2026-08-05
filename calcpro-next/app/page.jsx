import Link from 'next/link';
import { CATEGORY_DEFS, TOTAL_CALCULATORS } from '../lib/tools';

export default function HomePage() {
  return (
    <>
      <section className="rounded-3xl bg-gradient-to-br from-primary via-primary-dark to-violet-700 px-6 py-12 text-center text-white shadow-xl">
        <h1 className="mx-auto max-w-3xl font-display text-3xl font-extrabold sm:text-5xl">
          {TOTAL_CALCULATORS}+ Free Online Calculators
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/85 sm:text-base">
          Finance, health, math, business, auto and career tools with step-by-step solutions and charts.
          Everything runs in your browser — fast, private, free.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold">
          <span className="rounded-full bg-white/15 px-3 py-1">⚡ Real-time results</span>
          <span className="rounded-full bg-white/15 px-3 py-1">📐 Step-by-step solutions</span>
          <span className="rounded-full bg-white/15 px-3 py-1">🔒 100% client-side</span>
        </div>
      </section>

      <h2 className="mt-10 mb-4 font-display text-xl font-bold text-ink">All Categories</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Object.entries(CATEGORY_DEFS).map(([key, cat]) => (
          <Link
            key={key}
            href={`/${key}`}
            className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <div className="text-2xl">{cat.icon}</div>
            <div className="mt-2 font-display text-sm font-bold text-ink group-hover:text-primary">{cat.name}</div>
            <div className="text-xs text-slate-400">{cat.tools.length} calculators</div>
          </Link>
        ))}
      </div>
    </>
  );
}
