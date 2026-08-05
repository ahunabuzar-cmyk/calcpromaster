// ====== SeoArticle — programmatic SEO landing content (server component) ======
// Renders the shared per-tool SEO package from js/seo-content.js:
//  1. The 400-800 word human-style guide (rich HTML: h2/h3/p/ul/ol)
//  2. A native <details> FAQ accordion (zero-JS, crawlable, a11y-friendly)
//  3. Combined JSON-LD: WebApplication + HowTo + FAQPage for rich SERP results
// Imported ONLY by server components (page.jsx) — the 1.3 MB data file never
// ships to the client. Kept as a server component (no 'use client').
import { getToolSeo } from '../lib/seo-content-lookup';

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export default function SeoArticle({ categoryKey, toolId }) {
  const seo = getToolSeo(toolId);
  if (!seo) return null;

  const descHtml = seo.desc || '';
  const faqs = Array.isArray(seo.faqs) ? seo.faqs : [];

  // ---------- JSON-LD: WebApplication + HowTo + FAQPage ----------
  const webApp = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: seo.title || toolId,
        applicationCategory: 'UtilityApplication',
        operatingSystem: 'All',
        browserRequirements: 'Requires JavaScript',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        description: (seo.metaDesc || '').slice(0, 160),
      },
      {
        '@type': 'HowTo',
        name: `How to use the ${seo.title || toolId}`,
        step: (seo.howtoSteps || []).map((s, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          text: s,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  };

  return (
    <section className="mt-12 space-y-8" aria-label={`About ${seo.title || 'this calculator'}`}>
      {/* ---------- The long-form article (from seo-content.js) ---------- */}
      {descHtml && (
        <article
          className="prose-seo"
          dangerouslySetInnerHTML={{ __html: descHtml }}
        />
      )}

      {/* ---------- FAQ accordion (native details — zero JS, crawlable) ---------- */}
      {faqs.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-display text-lg font-bold text-ink">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {faqs.map((f, i) => (
              <details
                key={i}
                className="group rounded-xl border border-slate-200 bg-slate-50/60 open:bg-white"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink transition hover:text-primary [&::-webkit-details-marker]:hidden">
                  <span>{f.q}</span>
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-slate-100 text-slate-400 transition group-open:rotate-45 group-open:bg-primary/10 group-open:text-primary">
                    +
                  </span>
                </summary>
                <p className="px-4 pb-4 text-sm leading-relaxed text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* ---------- JSON-LD for search engines ---------- */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webApp) }}
      />
    </section>
  );
}
