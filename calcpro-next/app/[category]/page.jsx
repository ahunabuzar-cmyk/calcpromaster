import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCategory, getCategoryMeta } from '../../lib/tools';

// Next.js 15: params is async — await it before use
export async function generateMetadata({ params }) {
  const { category } = await params;
  const meta = getCategoryMeta(category);
  const cat = getCategory(category);
  if (!cat) return { title: 'Category not found' };
  return {
    title: meta?.title || `${cat.name} Calculators`,
    description: meta?.desc || `${cat.name} calculators`,
  };
}

export default async function CategoryPage({ params }) {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) notFound();

  const meta = getCategoryMeta(category);

  return (
    <>
      <nav className="mb-4 text-xs text-slate-400">
        <Link href="/" className="hover:text-primary">Home</Link>
        <span className="mx-1.5">›</span>
        <span className="text-slate-600">{cat.name}</span>
      </nav>

      <section className="mb-6">
        <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
          {cat.icon} {cat.name} Calculators
        </h1>
        <p className="mt-1 text-sm text-slate-500">{meta?.desc}</p>
        <p className="mt-2 text-xs font-semibold text-slate-400">{cat.tools.length} calculators</p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cat.tools.map((t) => (
          <Link
            key={t.id}
            href={`/${category}/${t.id}`}
            className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <div className="font-display text-sm font-bold text-ink group-hover:text-primary">{t.name}</div>
            <div className="mt-1 line-clamp-2 text-xs text-slate-500">{t.desc}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
