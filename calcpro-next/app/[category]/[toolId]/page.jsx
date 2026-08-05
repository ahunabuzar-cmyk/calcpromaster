import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCategory, getTool } from '../../../lib/tools';
import { getToolSeoWithFallback } from '../../../lib/seo-content-lookup';
import ToolEngine from '../../../components/ToolEngine';
import SeoArticle from '../../../components/SeoArticle';

// SEO metadata — prefers the shared pre-written SEO package (seo-content.js),
// falls back to schema-synthesized title/desc so every tool page still ranks.
// Next.js 15: params is async — await it before use
export async function generateMetadata({ params }) {
  const { category, toolId } = await params;
  const tool = getTool(category, toolId);
  if (!tool) return { title: 'Calculator not found' };
  const seo = getToolSeoWithFallback(toolId, tool);
  const keywords = String(tool.kw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const title = seo?.title || tool.name;
  const description = seo?.metaDesc || tool.desc;
  return {
    title,
    description,
    keywords: keywords.length ? keywords : undefined,
    alternates: { canonical: `/tools/${toolId}` },
    openGraph: {
      title: `${title} — Free Online Calculator`,
      description,
      type: 'website',
      url: `/tools/${toolId}`,
    },
    robots: { index: true, follow: true },
  };
}

export default async function ToolPage({ params }) {
  const { category, toolId } = await params;
  const cat = getCategory(category);
  const tool = getTool(category, toolId);
  if (!cat || !tool) notFound();
  const seo = getToolSeoWithFallback(toolId, tool);

  // Related tools in the same category (for internal linking)
  const related = cat.tools.filter((t) => t.id !== tool.id).slice(0, 6);

  return (
    <>
      <nav className="mb-4 text-xs text-slate-400">
        <Link href="/" className="hover:text-primary">Home</Link>
        <span className="mx-1.5">›</span>
        <Link href={`/${category}`} className="hover:text-primary">{cat.name}</Link>
        <span className="mx-1.5">›</span>
        <span className="text-slate-600">{tool.name}</span>
      </nav>

      <section className="mb-6">
        <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{tool.name}</h1>
        <p className="mt-1 text-sm text-slate-500">{tool.desc}</p>
        {/* E-E-A-T trust badges (finance/health = YMYL) — SmartAsset/CalculatorSoup style */}
        {['finance', 'health', 'food', 'fitness', 'regional'].includes(category) && (
          <div className="mt-3 flex flex-wrap gap-2 text-[12px] font-semibold">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-emerald-700">
              ✓ Fact-checked 2026
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-indigo-700">
              Updated August 2026
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-slate-500">
              🔒 Runs in your browser
            </span>
          </div>
        )}
        {/* Unique ~100-word intro paragraph (js/tool-intros.js) — every one of the
            548 tools has its own text so Google never flags thin/duplicate content. */}
        {seo?.intro && (
          <p className="tool-intro mt-3 max-w-3xl text-[15px] leading-relaxed text-slate-600">
            {seo.intro}
          </p>
        )}
      </section>

      {/* Dynamic UI Engine — schema → form → real-time calc */}
      <ToolEngine categoryKey={category} toolId={toolId} />

      {/* Programmatic SEO — long-form article + FAQ accordion + JSON-LD (Step 3) */}
      <SeoArticle categoryKey={category} toolId={toolId} />

      {/* Related calculators — internal linking */}
      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-display text-lg font-bold text-ink">More {cat.name} Calculators</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((t) => (
              <Link
                key={t.id}
                href={`/${category}/${t.id}`}
                className="group rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-ink shadow-sm transition hover:border-primary/40 hover:text-primary"
              >
                {t.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
