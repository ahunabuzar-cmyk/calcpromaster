#!/usr/bin/env node
// ============================================================
// CalcProMaster — Phase 1 site inventory (har page ki asli haalat)
// ------------------------------------------------------------
// Ye "sab pages unique aur index-ready hain" maan kar nahi chalta. Jo cheezein
// asli mein maujood hain unhi se inventory banti hai:
//   sitemap.xml                        → URL list + canonical form
//   deploy/ (built HTML)               → title, H1, meta description, canonical
//                                        tag, robots meta, internal links, text
//   all-tool-ids.json / tool-routes    → calculator naam + category
//   data/index-panel-history.json      → GSC ka per-URL index status (asli)
//   data/query-reach.json              → reach (kitni queries par impressions)
//
// Duplication PROXY se nahi naapte: har page ke 8-word shingles banate hain aur
// dekhte hain kaunsa shingle 3+ doosre pages par bhi hai. Wo ratio = template
// share. Ye measured hai, "lagta hai duplicate hai" nahi.
//
// Output: data/site-inventory.json · data/site-inventory.csv · docs/SITE-INVENTORY.md
// Usage : node scripts/build-site-inventory.cjs
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITEMAP = path.join(ROOT, 'sitemap.xml');
const DEPLOY = path.join(ROOT, 'deploy');
const OUT_JSON = path.join(ROOT, 'data', 'site-inventory.json');
const OUT_CSV = path.join(ROOT, 'data', 'site-inventory.csv');
const OUT_DOC = path.join(ROOT, 'docs', 'SITE-INVENTORY.md');

// Sitemap ke bahar wale page types (static/legal/hub) ka bhi naam ho, warna
// "unknown" sab kuch ho jata hai aur inventory bekaar.
const STATIC_PAGE_TYPES = ['about', 'contact', 'privacy', 'terms', 'cookies', 'stats', 'changelog',
  'editorial-policy', 'disclaimer-general', 'disclaimer-finance', 'disclaimer-health', 'graph'];

// ---------- pure helpers (unit-tested) ----------

const decode = (s) => String(s || '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;|&rsquo;/g, "'").replace(/&nbsp;/g, ' ')
  .trim();

// Page ka asli dikhne wala text (script/style/svg/attributes hata kar). Shingle
// aur word-count dono isi par bante hain — warna inline JS hi "content" ban jata.
function pageText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function words(text) {
  return String(text || '').split(/[^a-z0-9%.$]+/).filter((w) => w.length > 1);
}

// 8-word shingles, evenly sampled to a cap so a 100k-word page cannot blow up
// the frequency map. cap = 0 ka matlab sab.
function shingles(text, n = 8, cap = 400) {
  const w = words(text);
  const out = [];
  for (let i = 0; i + n <= w.length; i++) out.push(w.slice(i, i + n).join(' '));
  if (!cap || out.length <= cap) return out;
  const step = Math.ceil(out.length / cap);
  const sampled = [];
  for (let i = 0; i < out.length; i += step) sampled.push(out[i]);
  return sampled;
}

function parsePage(html) {
  const src = String(html || '');
  const title = decode((src.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  const h1matches = [...src.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => decode(m[1].replace(/<[^>]+>/g, ' ')));
  const desc = decode((src.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) || [])[1] || '');
  const canonical = ((src.match(/<link[^>]+rel=["']canonical["'][^>]*>/i) || [])[0] || '').match(/href=["']([^"']+)["']/i);
  const robots = ((src.match(/<meta\s+name=["']robots["'][^>]*>/i) || [])[0] || '').match(/content=["']([^"']+)["']/i);
  const hrefs = [...src.matchAll(/href=["'](\/[^"'#?]*)["']/gi)].map((m) => m[1]);
  const internalLinks = [...new Set(hrefs)];
  const text = pageText(src);
  return {
    title,
    h1: h1matches[0] || '',
    h1Count: h1matches.length,
    description: desc,
    canonical: canonical ? canonical[1] : null,
    robots: robots ? robots[1].toLowerCase() : null,
    internalLinkCount: internalLinks.length,
    internalLinks,
    wordCount: words(text).length,
    text,
  };
}

// URL ko page type + category mein baanto (sitemap path se, guess se nahi).
function classifyUrl(url) {
  const p = String(url).replace(/^https?:\/\/[^/]+/, '').replace(/\/+$/, '') || '/';
  if (p === '/') return { path: '/', pageType: 'home', category: '(root)', slug: '' };
  const seg = p.split('/').filter(Boolean);
  const cat = seg[0];
  const slug = seg[seg.length - 1];
  if (seg.length === 1) {
    if (STATIC_PAGE_TYPES.includes(cat)) return { path: p, pageType: 'static', category: '(root)', slug: cat };
    return { path: p, pageType: 'hub', category: cat, slug: cat };
  }
  if (cat === 'guides') return { path: p, pageType: 'guide', category: 'guides', slug };
  if (cat === 'blog') return { path: p, pageType: 'blog', category: 'blog', slug };
  if (cat === 'hub') return { path: p, pageType: 'hub', category: seg[1] || 'hub', slug };
  if (cat === 'embed') return { path: p, pageType: 'embed', category: 'embed', slug };
  return { path: p, pageType: 'calculator', category: cat, slug };
}

// Search intent title/H1 se — pattern-based, aur pattern code mein likha hua hai
// taake koi bhi isay check kar sake (ye "AI ne decide kiya" nahi hai).
const INTENT_RULES = [
  { intent: 'informational-question', re: /\b(how|what|why|when|which|should|does|do i|can i)\b/i },
  { intent: 'commercial-comparison', re: /\b(vs|versus|compare|comparison|alternative|best|top \d+)\b/i },
  { intent: 'transactional-convert', re: /\b(converter|convert|calculator|estimate|generator)\b/i },
  { intent: 'informational-guide', re: /\b(guide|explained|explainer|formula|method|table|chart)\b/i },
  { intent: 'informational-definition', re: /\b(glossary|definition|meaning|what is)\b/i },
];
function deriveIntent({ title, h1 }) {
  const hay = (String(title || '') + ' ' + String(h1 || ''));
  for (const r of INTENT_RULES) if (r.re.test(hay)) return r.intent;
  return 'unclassified';
}

// Action classification. Har rule evidence-based hai — GSC index status,
// duplicate ratio, reach tier, aur technical flags. Koi rule "lagta hai" par
// nahi chalta.
function classifyAction(p) {
  const issues = [];
  const gsc = p.indexStatus || 'not-checked';

  if (p.robots && /noindex/.test(p.robots)) issues.push('noindex-meta');
  if (!p.title) issues.push('missing-title');
  if (!p.h1) issues.push('missing-h1');
  if (p.h1Count > 1) issues.push('multiple-h1');
  if (!p.description) issues.push('missing-meta-description');
  if (!p.canonical) issues.push('missing-canonical');
  if (p.canonical && p.canonical.replace(/\/+$/, '') !== ('https://calcpromaster.com' + p.path).replace(/\/+$/, '')) {
    issues.push('canonical-mismatch');
  }
  if (p.internalLinkCount < 10) issues.push('few-internal-links');

  const indexing = ['URL is unknown to Google', 'Discovered - currently not indexed',
    'Crawled - currently not indexed', 'Page with redirect',
    'Duplicate without user-selected canonical', 'Excluded by noindex tag'].includes(gsc);
  if (indexing) issues.push('not-indexed:' + gsc);

  // Priority order: pehle indexing, phir cannibalization, phir duplication,
  // phir reach/technical polish.
  if (indexing) return { classification: 'investigate-indexing', issues };
  if (p.cannibalGroupSize > 1) return { classification: 'investigate-cannibalization', issues };
  if (p.duplicateRatio !== null && p.duplicateRatio >= 0.5) return { classification: 'major-improve', issues };
  if (p.reachTier === 'stuck' || p.reachTier === 'thin') return { classification: 'major-improve', issues };
  if (issues.some((i) => ['missing-title', 'missing-h1', 'missing-canonical', 'multiple-h1', 'canonical-mismatch'].includes(i))) {
    return { classification: 'minor-update', issues };
  }
  if (issues.length) return { classification: 'minor-update', issues };
  if (p.duplicateRatio !== null && p.duplicateRatio >= 0.3) return { classification: 'minor-update', issues };
  return { classification: 'keep-improve', issues };
}

// Ek page ke shingles kitne doosre pages par bhi hain (template share).
function duplicateRatio(myShingles, freq, minPages = 3) {
  if (!myShingles.length) return null;
  let dup = 0;
  for (const s of myShingles) if ((freq.get(s) || 0) >= minPages) dup++;
  return +(dup / myShingles.length).toFixed(3);
}

// ---------- local file lookup ----------

function localFilesFor(relPath) {
  const rel = relPath === '/' ? '' : relPath.replace(/^\//, '');
  return [
    path.join(DEPLOY, rel, 'index.html'),
    path.join(DEPLOY, rel + '.html'),
    path.join(DEPLOY, rel),
  ];
}

function findLocal(relPath) {
  for (const f of localFilesFor(relPath)) {
    try { if (fs.statSync(f).isFile()) return f; } catch (e) { /* keep looking */ }
  }
  return null;
}

// ---------- main ----------

function main() {
  const started = Date.now();
  if (!fs.existsSync(SITEMAP)) {
    console.error('missing sitemap.xml — pehle `node generate-sitemap.js` chalao');
    process.exit(1);
  }
  if (!fs.existsSync(DEPLOY)) {
    console.error('missing deploy/ — ye prerendered HTML par chalti hai. `node build-deploy.js` chalao.');
    process.exit(1);
  }

  const sitemapUrls = [...fs.readFileSync(SITEMAP, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].trim());

  // Tool naam + category (all-tool-ids.json naam deta hai, tool-routes cat).
  const toolNames = new Map();
  try {
    for (const t of JSON.parse(fs.readFileSync(path.join(ROOT, 'all-tool-ids.json'), 'utf8'))) {
      toolNames.set(t.id, t.name);
    }
  } catch (e) { /* optional */ }
  const toolCats = new Map();
  try {
    for (const t of JSON.parse(fs.readFileSync(path.join(ROOT, 'tool-routes.json'), 'utf8'))) {
      toolCats.set(t.id, t.cat);
    }
  } catch (e) { /* optional */ }

  // GSC ka asli per-URL index status.
  const indexStatus = new Map();
  const historyFile = path.join(ROOT, 'data', 'index-panel-history.json');
  if (fs.existsSync(historyFile)) {
    const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    const latest = history[history.length - 1];
    for (const [url, status] of Object.entries((latest && latest.checked) || {})) {
      indexStatus.set(url.replace(/\/+$/, ''), status);
    }
  }

  // Reach (agar query-reach chala hua hai).
  const reach = new Map();
  const reachFile = path.join(ROOT, 'data', 'query-reach.json');
  if (fs.existsSync(reachFile)) {
    const r = JSON.parse(fs.readFileSync(reachFile, 'utf8'));
    for (const p of r.topPages || []) reach.set(p.path, { tier: p.tier, queries: p.distinctQueries, impressions: p.impressions });
    for (const b of r.backlog || []) {
      const e = reach.get(b.path) || {};
      reach.set(b.path, { ...e, action: b.action });
    }
  }

  // Pass 1: parse + shingle + frequency map.
  const pages = [];
  const freq = new Map();
  const missingLocal = [];
  for (const url of sitemapUrls) {
    const cls = classifyUrl(url);
    const file = findLocal(cls.path);
    if (!file) {
      missingLocal.push(cls.path);
      continue;
    }
    const html = fs.readFileSync(file, 'utf8');
    const parsed = parsePage(html);
    const sh = shingles(parsed.text, 8, 400);
    for (const s of sh) freq.set(s, (freq.get(s) || 0) + 1);
    pages.push({
      url,
      ...cls,
      title: parsed.title,
      h1: parsed.h1,
      h1Count: parsed.h1Count,
      description: parsed.description,
      canonical: parsed.canonical,
      robots: parsed.robots,
      internalLinkCount: parsed.internalLinkCount,
      internalLinks: parsed.internalLinks,
      wordCount: parsed.wordCount,
      shingleCount: sh.length,
      _shingles: sh,
      indexStatus: indexStatus.get(url.replace(/\/+$/, '')) || null,
    });
  }

  // Pass 2: duplicate ratio (measured), cannibalization groups (same title),
  // tool naam, reach, classification.
  const titleGroups = new Map();
  for (const p of pages) {
    if (!p.title) continue;
    const k = p.title.toLowerCase();
    titleGroups.set(k, (titleGroups.get(k) || 0) + 1);
  }

  for (const p of pages) {
    p.duplicateRatio = duplicateRatio(p._shingles, freq);
    p.cannibalGroupSize = titleGroups.get((p.title || '').toLowerCase()) || 1;
    const toolId = p.slug && (toolNames.has(p.slug) ? p.slug : (toolCats.has(p.slug) ? p.slug : null));
    p.calculatorName = toolId && toolNames.has(toolId) ? toolNames.get(toolId) : null;
    p.toolId = toolId || null;
    if (p.pageType === 'calculator' && p.slug && /^[a-z0-9-]+$/.test(p.slug) && toolCats.has(p.slug)) {
      p.category = toolCats.get(p.slug);
    }
    const r = reach.get(p.path);
    p.reachTier = r ? r.tier : null;
    p.reachQueries = r ? r.queries : null;
    p.reachImpressions = r ? r.impressions : null;
    p.reachAction = r && r.action ? r.action : null;
    const cls = classifyAction(p);
    p.classification = cls.classification;
    p.technicalIssues = cls.issues;
    delete p._shingles;
  }

  // ---------- aggregates ----------
  const byClassification = {};
  for (const p of pages) byClassification[p.classification] = (byClassification[p.classification] || 0) + 1;
  const byPageType = {};
  for (const p of pages) byPageType[p.pageType] = (byPageType[p.pageType] || 0) + 1;
  const byCategory = {};
  for (const p of pages) byCategory[p.category] = (byCategory[p.category] || 0) + 1;
  const byIndexStatus = {};
  for (const p of pages) {
    const k = p.indexStatus || 'not-checked';
    byIndexStatus[k] = (byIndexStatus[k] || 0) + 1;
  }
  const templates = pages.filter((p) => p.duplicateRatio !== null).slice()
    .sort((a, b) => b.duplicateRatio - a.duplicateRatio);
  const cannibalGroups = [...titleGroups.entries()].filter(([, n]) => n > 1)
    .map(([title, n]) => ({ title, pages: pages.filter((p) => (p.title || '').toLowerCase() === title).map((p) => p.path) }))
    .sort((a, b) => b.pages.length - a.pages.length);

  const report = {
    generatedAt: new Date().toISOString(),
    scope: {
      sitemapUrls: sitemapUrls.length,
      inventoried: pages.length,
      missingLocalHtml: missingLocal.length,
      note: 'deploy/ ka prerendered HTML source of truth hai; indexStatus GSC panel snapshot se.',
    },
    totals: {
      words: pages.reduce((s, p) => s + p.wordCount, 0),
      medianWords: pages.length ? pages.map((p) => p.wordCount).sort((a, b) => a - b)[Math.floor(pages.length / 2)] : 0,
      avgInternalLinks: pages.length ? +(pages.reduce((s, p) => s + p.internalLinkCount, 0) / pages.length).toFixed(1) : 0,
      avgDuplicateRatio: avg(pages.map((p) => p.duplicateRatio).filter((x) => x !== null)),
    },
    byClassification,
    byPageType,
    byCategory,
    byIndexStatus,
    missingLocalHtml: missingLocal,
    cannibalization: cannibalGroups.slice(0, 25),
    topTemplates: templates.slice(0, 25).map((p) => ({
      path: p.path, duplicateRatio: p.duplicateRatio, wordCount: p.wordCount, pageType: p.pageType,
    })),
    pages,
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(OUT_CSV, toCsv(pages));
  fs.writeFileSync(OUT_DOC, buildDoc(report));

  console.log(`site inventory: ${pages.length}/${sitemapUrls.length} sitemap URLs (local HTML missing: ${missingLocal.length})`);
  console.log('by classification: ' + Object.entries(byClassification).map(([k, v]) => `${k}=${v}`).join(' · '));
  console.log('by page type: ' + Object.entries(byPageType).map(([k, v]) => `${k}=${v}`).join(' · '));
  console.log(`avg duplicate (template) ratio: ${report.totals.avgDuplicateRatio} · same-title groups: ${cannibalGroups.length}`);
  console.log('report: docs/SITE-INVENTORY.md · data/site-inventory.json · data/site-inventory.csv');
  console.log(`(${Math.round((Date.now() - started) / 1000)}s)`);
}

function avg(arr) { return arr.length ? +(arr.reduce((s, x) => s + x, 0) / arr.length).toFixed(3) : null; }

const CSV_COLUMNS = ['path', 'pageType', 'category', 'calculatorName', 'primaryTopic', 'title', 'h1',
  'indexStatus', 'canonical', 'duplicateRatio', 'reachTier', 'reachQueries', 'reachImpressions',
  'internalLinkCount', 'wordCount', 'classification', 'technicalIssues'];

function primaryTopicOf(p) {
  // Primary topic = H1 agar hai, warna title ka pehla hissa. Guess nahi — jo
  // page khud kehta hai wahi.
  if (p.h1) return p.h1;
  return (p.title || '').split(/[—|\-–]/)[0].trim();
}

function toCsv(pages) {
  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = Array.isArray(v) ? v.join(' ') : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const head = CSV_COLUMNS.join(',');
  const rows = pages.map((p) => CSV_COLUMNS.map((c) => esc(
    c === 'primaryTopic' ? primaryTopicOf(p)
      : c === 'technicalIssues' ? p.technicalIssues
        : p[c])).join(','));
  return head + '\n' + rows.join('\n') + '\n';
}

function buildDoc(report) {
  const md = (s) => '\u0060' + s + '\u0060';
  const L = [];
  L.push('# Site inventory — Phase 1 (har page ki asli haalat)');
  L.push('');
  L.push(`> Auto-generated by \`node scripts/build-site-inventory.cjs\` · **${report.scope.inventoried}/${report.scope.sitemapUrls}** sitemap URLs.`);
  L.push('> Sources: `sitemap.xml`, `deploy/` ka prerendered HTML, `all-tool-ids.json`, `tool-routes.json`, `data/index-panel-history.json` (GSC index status), `data/query-reach.json` (reach).');
  L.push('> **Kuch bhi andaza nahi lagaya gaya** — jahan data nahi hai wahan `not-checked` / `—` likha hai.');
  L.push('');
  L.push('## 1. Scope + honesty box');
  L.push('');
  L.push('| | |');
  L.push('|---|---|');
  L.push(`| Sitemap URLs | ${report.scope.sitemapUrls} |`);
  L.push(`| Inventory mein aaye | **${report.scope.inventoried}** |`);
  L.push(`| Local HTML nahi mila | ${report.scope.missingLocalHtml} |`);
  L.push(`| Total words (measured) | ${report.totals.words.toLocaleString('en-US')} |`);
  L.push(`| Median page length | ${report.totals.medianWords} words |`);
  L.push(`| Average internal links | ${report.totals.avgInternalLinks} |`);
  L.push(`| Average template-share (duplicate ratio) | ${report.totals.avgDuplicateRatio} |`);
  L.push('');
  L.push('**Jo is inventory mein NAHI hai (aur kyun):**');
  L.push('');
  L.push('- **Search volume, keyword difficulty, CPC, backlinks, competitor metrics** — koi external keyword tool is environment se connected nahi hai. In numbers ko invent karna mana hai, is liye ye columns khaali hain. In ke liye Google Keyword Planner / Ahrefs / Semrush ka export chahiye.');
  L.push('- **Clicks, CTR, average position** — GSC ka full query/page export (`data/gsc-query-page.json`) site par maujood hai, magar sirf 28-din window ka aur 69% impressions ka. Jo measure hua wo `query-reach.json` mein hai.');
  L.push('- **Crawl/robots live behaviour** — ye local build se banta hai, live crawl se nahi.');
  L.push('');
  L.push('## 2. Classification (evidence ke saath)');
  L.push('');
  L.push('| Classification | Pages | Matlab |');
  L.push('|---|---|---|');
  const meaning = {
    'investigate-indexing': 'GSC index status kharab (unknown / discovered / crawled-not-indexed / redirect / duplicate) → pehle yahi dekho',
    'investigate-cannibalization': 'ek hi title do ya zyada pages par → intent check karke consolidate ya differentiate karo',
    'major-improve': 'template-share ≥ 50% ya reach `stuck`/`thin` → content/section ko asli kaam karna hai',
    'minor-update': 'technical flags (title/H1/canonical/meta/internal links) ya template-share ≥ 30%',
    'keep-improve': 'koi blocker nahi; bas position/content polish',
  };
  for (const [k, v] of Object.entries(report.byClassification).sort((a, b) => b[1] - a[1])) {
    L.push(`| ${md(k)} | **${v}** | ${meaning[k] || ''} |`);
  }
  L.push('');
  L.push('## 3. Page types + categories');
  L.push('');
  L.push('| Page type | Pages |');
  L.push('|---|---|');
  for (const [k, v] of Object.entries(report.byPageType).sort((a, b) => b[1] - a[1])) L.push(`| ${md(k)} | ${v} |`);
  L.push('');
  L.push('| Category | Pages |');
  L.push('|---|---|');
  for (const [k, v] of Object.entries(report.byCategory).sort((a, b) => b[1] - a[1])) L.push(`| ${md(k)} | ${v} |`);
  L.push('');
  L.push('## 4. GSC index status (measured, per URL)');
  L.push('');
  L.push('| GSC status | Pages |');
  L.push('|---|---|');
  for (const [k, v] of Object.entries(report.byIndexStatus).sort((a, b) => b[1] - a[1])) L.push(`| ${md(k)} | ${v} |`);
  L.push('');
  L.push('`not-checked` ka matlab: URL GSC ke panel snapshot mein nahi tha (panel sirf queue/control sample check karta hai) — ye "indexed hai" nahi hai, ye "pata nahi" hai.');
  L.push('');
  L.push('## 5. Template share — sab se zyada repeated pages');
  L.push('');
  L.push('`duplicateRatio` = is page ke 8-word shingles ka wo hissa jo **3 ya zyada doosre pages** par bhi milta hai. Zyada ratio = zyada hissa boilerplate/template hai, is liye page apne aap ko unique nahi bana pa raha.');
  L.push('');
  L.push('| Path | Type | duplicateRatio | Words |');
  L.push('|---|---|---|---|');
  for (const t of report.topTemplates) L.push(`| ${md(t.path)} | ${t.pageType} | **${t.duplicateRatio}** | ${t.wordCount} |`);
  L.push('');
  L.push('## 6. Cannibalization suspects (same title, different URL)');
  L.push('');
  if (!report.cannibalization.length) L.push('Koi do pages ka title bilkul same nahi hai. Ye **alkat na hone ka proof nahi hai** — chhote wording differences yahan nahi pakde jate, un ke liye intent clustering chahiye (Phase 4).');
  else {
    L.push('| Title | Pages |');
    L.push('|---|---|');
    for (const g of report.cannibalization) L.push(`| ${g.title.slice(0, 80)} | ${g.pages.map((p) => md(p)).join(' ')} |`);
  }
  L.push('');
  L.push('## 7. Reproduce');
  L.push('');
  L.push('```bash');
  L.push('node build-deploy.js                    # deploy/ refresh (ye inventory built HTML padhti hai)');
  L.push('node scripts/build-site-inventory.cjs   # inventory + CSV');
  L.push('```');
  L.push('');
  return L.join('\n');
}

if (require.main === module) main();

module.exports = {
  decode, pageText, words, shingles, parsePage, classifyUrl, deriveIntent, classifyAction,
  duplicateRatio, primaryTopicOf, toCsv, buildDoc, CSV_COLUMNS,
};
