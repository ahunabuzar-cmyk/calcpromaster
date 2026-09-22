/* ============================================================
 * CalcProMaster — Static Site Generator (SSG)
 * ------------------------------------------------------------
 * Prerenders EVERY route in sitemap.xml as a real static HTML
 * file inside deploy/:
 *  *   deploy/<cat>/<tool-id>/index.html      → 1201 calculator pages
 *   deploy/<cat>/index.html                → 20 category pages
 *   deploy/hub/<cat>/index.html            → 20 comparison hubs
 *   deploy/<cat>/<tool-id>/<modifier>/...  → long-tail virtual pages
 *   deploy/favorites|history|compare/...   → noindex user dashboards
 *
 * Each page = the production SPA shell (deploy/index.html) with:
 *   - unique <title>, meta description, canonical, OG/Twitter tags
 *   - per-tool JSON-LD (WebApplication + BreadcrumbList + HowTo +
 *     FAQPage) with id="ymyl-tool-schema" so the SPA dedups on hydrate
 *   - prerendered #mainContent (breadcrumb, H1, intro, full SEO guide,
 *     FAQ section, related calculators, disclaimer) — crawlable
 *     without JS, then the SPA hydrates the interactive calculator.
 *
 * Netlify's `/* /index.html 200` rewrite NEVER shadows an existing
 * static file (documented "Shadowing" behavior), so these files win
 * automatically with zero extra redirect rules.
 *
 * Run: node scripts/ssg-pages.cjs   (wired into build-deploy.js)
 * ============================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
// Domain — SINGLE SOURCE OF TRUTH: js/site-config.js (`domain:` field).
// Prerendered canonical/OG/schema URLs follow the configured domain, so a
// custom-domain switch is one file edit + rebuild (no stale netlify.app refs).
function readConfigDomain() {
  try {
    const cfg = fs.readFileSync(path.join(ROOT, 'js', 'site-config.js'), 'utf8');
    const m = cfg.match(/domain:\s*'([^']+)'/);
    if (m && m[1]) return m[1].replace(/^https?:\/\//, '');
  } catch (e) { /* fall through to default */ }
  return 'calcpromaster.netlify.app';
}
const DOMAIN = 'https://' + readConfigDomain();

// ---------- 1. Load tool registry (same vm approach as qa-reverse-matrix) ----------
const dataFiles = fs.readdirSync(path.join(ROOT, 'js', 'data'))
  .filter(f => f.endsWith('.js') && f !== 'data.js' && f !== 'data-loader.js');

const ctx = {
  window: {},
  Charts: { gauge: () => '', donut: () => '', bar: () => '', line: () => '' },
  console: { log() {}, warn() {}, error() {} },
  Security: { validateInput: v => v, sanitizeCalcValue: (v, d) => { const n = parseFloat(v); return isNaN(n) ? d : n; }, sanitizeHtml: v => String(v) }
};
ctx.window.Charts = ctx.Charts;
vm.createContext(ctx);

for (const f of dataFiles) {
  try { vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'data', f), 'utf8'), ctx, { filename: f }); }
  catch (e) { console.error('LOAD FAIL', f, e.message); }
}

const ARRAY_NAMES = [
  'FINANCE_TOOLS','HEALTH_TOOLS','MATH_TOOLS','EVERYDAY_TOOLS','SCIENCE_TOOLS',
  'ENGINEERING_TOOLS','CONSTRUCTION_TOOLS','CONVERSION_TOOLS','BUSINESS_TOOLS',
  'AUTO_TRANSPORT_TOOLS','EDUCATION_TOOLS','FOOD_NUTRITION_TOOLS','CAREER_TOOLS','REGIONAL_TOOLS',
  'FITNESS_TOOLS','HOME_GARDEN_TOOLS','LIFESTYLE_TOOLS','FAMILY_TOOLS','TECH_TOOLS','UTILITY_TOOLS'
];
const CAT_KEY = {
  FINANCE_TOOLS: 'finance', HEALTH_TOOLS: 'health', MATH_TOOLS: 'math', EVERYDAY_TOOLS: 'everyday',
  SCIENCE_TOOLS: 'science', ENGINEERING_TOOLS: 'engineering', CONSTRUCTION_TOOLS: 'construction',
  CONVERSION_TOOLS: 'conversion', BUSINESS_TOOLS: 'business', AUTO_TRANSPORT_TOOLS: 'auto',
  EDUCATION_TOOLS: 'education', FOOD_NUTRITION_TOOLS: 'food', CAREER_TOOLS: 'career', REGIONAL_TOOLS: 'regional',
  FITNESS_TOOLS: 'fitness', HOME_GARDEN_TOOLS: 'homegarden', LIFESTYLE_TOOLS: 'lifestyle',
  FAMILY_TOOLS: 'family', TECH_TOOLS: 'tech', UTILITY_TOOLS: 'utilities'
};
const tools = []; // { cat, id, name, desc, inputs, ... }
for (const key of ARRAY_NAMES) {
  let arr;
  try { arr = vm.runInContext(key, ctx); } catch (e) { continue; }
  if (Array.isArray(arr)) {
    const cat = CAT_KEY[key] || key.toLowerCase();
    arr.forEach(t => tools.push(Object.assign({ cat }, t)));
  }
}
const TOOL_MAP = {};
tools.forEach(t => { TOOL_MAP[t.id] = t; });

// ---------- 2. Load SEO content + intros ----------
let TOOL_SEO = {};
try {
  const seoCtx = { window: {}, console: { log() {}, warn() {}, error() {} } };
  vm.createContext(seoCtx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'seo-content.js'), 'utf8'), seoCtx, { filename: 'seo-content.js' });
  TOOL_SEO = seoCtx.TOOL_SEO || {};
} catch (e) { console.error('SEO load fail', e.message); }

let TOOL_INTROS = {};
try {
  const introCtx = { window: {}, console: { log() {}, warn() {}, error() {} } };
  vm.createContext(introCtx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'tool-intros.js'), 'utf8'), introCtx, { filename: 'tool-intros.js' });
  TOOL_INTROS = introCtx.TOOL_INTROS || {};
} catch (e) { console.error('intros load fail', e.message); }

// ---------- 3. Category metadata ----------
const CATEGORY_META = {
  finance: { title: 'Finance Calculators — Loan, EMI, Tax & SIP Tools', desc: 'Free financial calculators for loans, mortgages, investments, taxes, retirement and more.' },
  health: { title: 'Health & Fitness Calculators', desc: 'Calculate BMI, BMR, calories, body fat, heart rate and other health metrics.' },
  math: { title: 'Math Calculators — Percentage, Fraction & Algebra Tools', desc: 'Scientific calculators, algebra, geometry, statistics and more math tools.' },
  everyday: { title: 'Everyday Calculators', desc: 'Free everyday calculators — age, dates, fuel cost, cooking conversions, tips and time planning for daily life questions.' },
  science: { title: 'Science Calculators — Physics & Chemistry Formulas', desc: 'Free science calculators for physics and chemistry — density, molarity, kinetic energy, wave speed and lab conversions.' },
  engineering: { title: 'Engineering Calculators — Electrical, Mechanical & Civil', desc: 'Free engineering calculators for electrical, mechanical and civil work — beam loads, wire gauge, Ohm law, torque and more.' },
  construction: { title: 'Construction Calculators — Concrete, Rebar & Roofing', desc: 'Free construction calculators for concrete volume, rebar, roofing, flooring and building material estimates.' },
  conversion: { title: 'Unit Conversion Calculators', desc: 'Free unit conversion calculators — length, weight, volume, temperature, speed, area and more with instant results.' },
  business: { title: 'Business Calculators', desc: 'Free business calculators for ROI, profit margin, cash flow, break-even, CAC, LTV and markup — estimate any business metric in seconds.' },
  education: { title: 'Education Calculators — GPA, Final Grade & Test Scores', desc: 'Free education calculators for GPA, final grades, test scores, study time and grade targets — plan your coursework with real numbers.' },
  utilities: { title: 'Utility Calculators', desc: 'Free utility calculators — QR codes, password strength, color converters, unit helpers and other handy everyday tools.' },
  lifestyle: { title: 'Lifestyle & Home Calculators', desc: 'Free lifestyle calculators for moving costs, rent splits, cooking conversions, pet care and everyday home decisions.' },
  regional: { title: 'Regional Calculators (India/PK/UAE)', desc: 'Free regional calculators for India, Pakistan and UAE — FD, RD, PPF, GST, zakat, income tax and local salary math.' },
  food: { title: 'Food & Nutrition Calculators', desc: 'Free food and nutrition calculators — calories, macros, keto limits, meal planning and recipe scaling with instant results.' },
  fitness: { title: 'Fitness & Exercise Calculators', desc: 'Free fitness calculators for running pace, one-rep max, heart-rate zones, calories burned and workout planning.' },
  auto: { title: 'Auto & Transport Calculators', desc: 'Fuel cost, EV charging, car loan, depreciation and mileage calculators.' },
  career: { title: 'Career & Freelance Calculators', desc: 'Salary converter, freelance rate, job offer compare and side hustle profit.' },
  homegarden: { title: 'Home & Garden Calculators', desc: 'Paint, wallpaper, lighting, AC size, garden soil and DIY project calculators.' },
  tech: { title: 'Tech & Digital Calculators', desc: 'Download time, data usage, password strength, domain value and tech ROI.' },
  family: { title: 'Parenting & Family Calculators', desc: 'Child height prediction, family budget, college savings, childcare cost and estate planning.' },
};
const CAT_NAME = {
  finance: 'Finance', health: 'Health', math: 'Math', everyday: 'Everyday', science: 'Science',
  engineering: 'Engineering', construction: 'Construction', conversion: 'Conversion', business: 'Business',
  education: 'Education', utilities: 'Utilities', lifestyle: 'Lifestyle', regional: 'Regional',
  food: 'Food & Nutrition', fitness: 'Fitness', auto: 'Auto & Transport', career: 'Career',
  homegarden: 'Home & Garden', tech: 'Tech & Digital', family: 'Family'
};

// ---------- 4. Read the SPA shell template ----------
let SHELL = '';
try { SHELL = fs.readFileSync(path.join(DEPLOY, 'index.html'), 'utf8'); }
catch (e) { console.error('deploy/index.html missing — run build-deploy.js first'); process.exit(1); }

// 4b. Strip the FULL inlined CSS (build-deploy.js inlines ~70KB of minified CSS
// into deploy/index.html for the critical path). Per-route pages don't need it
// inline — deploy/styles.css exists and is cacheable, so reference it externally
// to keep 769 static pages small (~54KB each instead of ~124KB).
SHELL = SHELL.replace(/<!-- Critical CSS[\s\S]*?<\/style>\n?/, '<link rel="stylesheet" href="/styles.css">\n');
// Fallback: if the marker changed, strip any giant inline <style> that follows it.
if (SHELL.indexOf('<style>') !== -1 && SHELL.indexOf('/* Critical CSS') !== -1) {
  SHELL = SHELL.replace(/<style>\s*\/\* Critical CSS[\s\S]*?<\/style>/, '<link rel="stylesheet" href="/styles.css">');
}

// ---------- 5. Helpers ----------
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function escAttr(s) { return esc(s).replace(/'/g, '&#39;'); }

// Replace the <head> meta: title, description, canonical, OG/Twitter.
function rewriteHead(html, opts) {
  let out = html;
  const title = opts.title || 'CalcProMaster';
  const desc = opts.desc || '';
  const canon = opts.canonical || '/';
  const ogTitle = opts.ogTitle || title;
  const ogDesc = opts.ogDesc || desc;
  const ogImage = opts.ogImage || '/og-image.png';
  const robots = opts.robots || 'index, follow';

  out = out.replace(/<title>[^<]*<\/title>/, '<title>' + esc(title) + '</title>');
  out = out.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + escAttr(desc) + '">');
  out = out.replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="' + escAttr(robots) + '">');
  out = out.replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + DOMAIN + canon + '">');
  out = out.replace(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + escAttr(ogTitle) + '">');
  out = out.replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + escAttr(ogDesc) + '">');
  out = out.replace(/<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="' + DOMAIN + canon + '">');
  out = out.replace(/<meta property="og:image" content="[^"]*">/, '<meta property="og:image" content="' + DOMAIN + ogImage + '">');
  out = out.replace(/<meta name="twitter:card" content="[^"]*">/, '<meta name="twitter:card" content="summary_large_image">');
  out = out.replace(/<meta name="twitter:image" content="[^"]*">/, '<meta name="twitter:image" content="' + DOMAIN + ogImage + '">');
  // LCP preload: per-tool hero images (/og/<toolId>.jpg) are the LCP element on
  // tool routes. Preloading them in <head> lets the browser start the fetch at
  // HTML-parse time instead of waiting for hydration + renderTool() to inject
  // the <img>. Non-tool pages keep the default (no preload).
  if (opts.heroPreload) {
    // Relative href on purpose: the <img> twin is relative, so the preload and
    // the actual fetch match per spec. An absolute DOMAIN URL here would be
    // cross-origin on any non-production origin (localhost dev, Playwright
    // deploy server) and get blocked by CSP img-src 'self' → console error.
    out = out.replace('<link rel="canonical"', '<link rel="preload" as="image" href="' + opts.heroPreload + '" fetchpriority="high"><link rel="canonical"');
  }
  return out;
}

// Replace the home JSON-LD block with per-tool schema (id=ymyl-tool-schema).
function rewriteSchema(html, schemaHtml) {
  // Replace the FIRST application/ld+json block (home Organization/WebSite/ItemList)
  const re = /<script type="application\/ld\+json">[\s\S]*?<\/script>/;
  return html.replace(re, '<script type="application/ld+json" id="ymyl-tool-schema">\n' + schemaHtml + '\n  </script>');
}

// Append content just before </main> (preserves existing static hero/skeleton).
function rewriteMainAppend(html, contentHtml) {
  const start = html.indexOf('<main id="mainContent">');
  const end = html.lastIndexOf('</main>');
  if (start === -1 || end === -1) return html;
  return html.slice(0, end) + '\n    ' + contentHtml + '\n  ' + html.slice(end);
}

// Replace #mainContent innerHTML.
function rewriteMain(html, contentHtml) {
  const start = html.indexOf('<main id="mainContent">');
  const end = html.indexOf('</main>', start);
  if (start === -1 || end === -1) return html;
  return html.slice(0, start) + '<main id="mainContent">\n' + contentHtml + '\n  </main>' + html.slice(end + '</main>'.length);
}

// Build the preredered #mainContent for a tool page.
function buildToolContent(tool, catKey) {
  const seo = TOOL_SEO[tool.id] || {};
  const intro = TOOL_INTROS[tool.id] || '';
  const catName = (seo.catName) || CAT_NAME[catKey] || catKey;
  const canonPath = seo.canonicalPath || '/' + catKey + '/' + tool.id;

  // Breadcrumb (Home › Category › Tool) — real crawlable links
  let html = '<div class="breadcrumb"><a href="/">Home</a> › <a href="/' + catKey + '">' + esc(catName) + '</a> › ' + esc(tool.name) + '</div>';

  // Tool header
  html += '<div class="tool-header">';
  html += '<h1>' + esc(tool.name) + '</h1>';
  html += '<p class="tool-desc">' + (tool.desc ? esc(tool.desc) : '') + '</p>';
  // Hero image (the page's LCP element) — baked into the static HTML so the
  // browser starts the fetch at parse time instead of waiting for hydration.
  // renderTool() re-creates the identical <img> (eager + fetchpriority=high) on
  // hydration — served from cache, no second request. Same onerror fallback.
  html += '<div class="tool-hero-wrap"><img class="tool-hero-img" src="/og/' + encodeURIComponent(tool.id) + '.jpg" alt="' + escAttr(tool.name + ' calculator — free online tool') + '" loading="eager" fetchpriority="high" decoding="async" width="1200" height="630" onerror="this.closest(\'.tool-hero-wrap\').style.display=\'none\'"></div>';
  html += '<div class="privacy-badge" role="note" aria-label="Privacy">🔒 <span>Your data never leaves your device</span></div>';
  html += '</div>';

  // Unique intro paragraph
  if (intro) html += '<p class="tool-intro" data-tool="' + escAttr(tool.id) + '">' + esc(intro) + '</p>';

  // AEO block (Block 1)
  if (seo.aeo) html += '<div class="seo-aeo-area"><div class="explain-card seo-aeo">' + seo.aeo + '</div></div>';

  // Full SEO guide (500+ words: how-to, formula, example, interpretation)
  if (seo.desc) html += '<div class="explain-card seo-guide">' + seo.desc + '</div>';

  // FAQ section (Block 6)
  if (seo.faqs && seo.faqs.length) {
    html += '<div class="explain-card seo-guide"><h2>Frequently Asked Questions</h2><div class="seo-faqs">';
    seo.faqs.forEach(function (faq) {
      html += '<h3>' + faq.q + '</h3><p>' + faq.a + '</p>';
    });
    html += '</div></div>';
  }

  // Related calculators (real crawlable <a href> links)
  const related = getRelated(tool, catKey);
  if (related.length) {
    html += '<div class="related-section"><h3>Similar Calculators</h3><div class="related-grid">';
    related.forEach(function (r) {
      html += '<a class="related-card" href="/' + r.cat + '/' + r.id + '">' + esc(r.name) + '</a>';
    });
    html += '</div></div>';
  }

  // E-E-A-T review block (YMYL pages get the full honest-authorship text).
  // Must stay in sync with the identical block in js/app.js renderTool().
  const YMYL_EEAT_FINANCE = ['finance', 'business', 'regional', 'career'];
  const YMYL_EEAT_HEALTH = ['health', 'fitness', 'food', 'family'];
  let reviewBlock;
  if (YMYL_EEAT_FINANCE.includes(catKey)) {
    reviewBlock = '<div class="tool-review-block"><strong>About this page:</strong> Built on standard financial formulas (the same conventions banks use), hand-checked against worked examples and covered by automated tests on every build. Maintained by CalcProMaster\'s developer — not a licensed financial advisor — so results are math education, not financial advice. Read our <a href="/editorial-policy">editorial policy</a> for how content is written and verified.</div>';
  } else if (YMYL_EEAT_HEALTH.includes(catKey)) {
    reviewBlock = '<div class="tool-review-block"><strong>About this page:</strong> Built on published, peer-reviewed formulas, hand-checked against worked examples and covered by automated tests on every build. Maintained by CalcProMaster\'s developer — not a medical professional — so results are health education, not medical advice. Read our <a href="/editorial-policy">editorial policy</a>.</div>';
  } else {
    reviewBlock = '<div class="tool-review-block"><strong>About this page:</strong> Built on documented public formulas, hand-checked against worked examples and covered by automated tests on every build. See our <a href="/editorial-policy">editorial policy</a> for how content is written and verified.</div>';
  }
  html += reviewBlock;

  // YMYL disclaimer
  const YMYL_FINANCE = ['finance', 'business', 'regional', 'career'];
  const YMYL_HEALTH = ['health', 'fitness', 'food', 'family'];
  let disclaimer = '<div class="tool-disclaimer"><strong>⚠️ General Disclaimer:</strong> Results are estimates for informational and educational purposes only. Verify independently before making important decisions.</div>';
  if (YMYL_FINANCE.includes(catKey)) disclaimer = '<div class="tool-disclaimer ymyl-finance"><strong>⚠️ Financial Disclaimer:</strong> This calculator provides estimates for informational and educational purposes only and does not constitute financial, investment, tax, or legal advice. Consult a qualified financial advisor before making financial decisions.</div>';
  else if (YMYL_HEALTH.includes(catKey)) disclaimer = '<div class="tool-disclaimer ymyl-health"><strong>⚠️ Health Disclaimer:</strong> This calculator provides general estimates for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Consult a qualified healthcare provider for any health decision.</div>';
  html += disclaimer;

  return html;
}

// Related calculators: same-category neighbors first, then keyword overlap, up to 6.
// Cluster map (C1–C8): cross-category intent clusters that getRelated() pulls
// up to 2 links from, so intent islands (e.g. /finance/loan-emi ↔
// /auto/car-loan-emi) are visibly connected. Validated by
// scripts/check-cluster-links.cjs against the sitemap.
const CLUSTERS = require(path.join(ROOT, 'js', 'cluster-map.js'));
const clusterByPage = (() => {
  const m = new Map(); // 'cat/id' -> { cluster, isHub }
  for (const c of CLUSTERS) {
    m.set(c.hub, { cluster: c, isHub: true });
    for (const s of c.spokes) if (!m.has(s)) m.set(s, { cluster: c, isHub: false });
  }
  return m;
})();

function getRelated(tool, catKey) {
  const rel = [];
  const seen = new Set([tool.id]);
  const catTools = tools.filter(t => t.cat === catKey && t.id !== tool.id);
  catTools.slice(0, 6).forEach(t => { if (!seen.has(t.id)) { seen.add(t.id); rel.push(t); } });
  if (rel.length < 6) {
    const kw = (tool.name + ' ' + (tool.desc || '')).toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3);
    const scored = tools.filter(t => t.cat !== catKey && !seen.has(t.id)).map(t => {
      const hay = (t.name + ' ' + (t.desc || '')).toLowerCase();
      return { t, score: kw.filter(w => hay.indexOf(w) !== -1).length };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score);
    for (const x of scored) {
      if (rel.length >= 6) break;
      if (!seen.has(x.t.id)) { seen.add(x.t.id); rel.push(x.t); }
    }
  }
  // Cluster override: up to 2 links from this page's intent cluster first
  // (hub first, then spokes) — cross- OR same-category, keeping the total at 6.
  // Dedupe via `seen` prevents double links; single-category clusters (e.g.
  // C3 tax, C7 crypto) rely on this to connect hub ↔ spokes at all. When the
  // page IS the hub, link a couple of spokes (they already link back via the
  // same rule, and the hub lists every tool in its own category anyway).
  const pageKey = catKey + '/' + tool.id;
  const entry = clusterByPage.get(pageKey);
  if (entry) {
    const c = entry.cluster;
    const candidates = (entry.isHub ? c.spokes.slice() : [c.hub, ...c.spokes])
      .map(k => { const i = k.indexOf('/'); return { cat: k.slice(0, i), id: k.slice(i + 1) }; })
      .filter(k => k.cat !== catKey || k.id !== tool.id);
    const picks = [];
    for (const k of candidates) {
      if (picks.length >= 2) break;
      if (seen.has(k.id)) continue;
      if (!tools.some(t => t.cat === k.cat && t.id === k.id)) continue; // safety: registry-only
      picks.push(k); seen.add(k.id);
    }
    for (let i = picks.length - 1; i >= 0; i--) rel.unshift(picks[i]);
    if (rel.length > 6) rel.length = 6;
  }
  return rel.slice(0, 6);
}

// Build per-tool JSON-LD (mirrors injectToolSchema in js/app.js).
function buildToolSchema(tool, catKey, canonPath) {
  const seo = TOOL_SEO[tool.id] || {};
  const catName = seo.catName || CAT_NAME[catKey] || catKey;
  const schemas = [];

  // 1. WebApplication
  const CAT_APP_MAP = { finance: 'FinanceApplication', health: 'HealthApplication', business: 'BusinessApplication', career: 'BusinessApplication', family: 'HealthApplication', education: 'EducationalApplication' };
  schemas.push({
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: tool.name + ' - CalcPro',
    url: DOMAIN + canonPath,
    description: seo.metaDesc || tool.desc,
    applicationCategory: CAT_APP_MAP[catKey] || 'UtilitiesApplication',
    operatingSystem: 'Any',
    browserRequirements: 'JavaScript required. Works on Chrome, Firefox, Safari, Edge.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    featureList: ['Step-by-step solutions with formula breakdown', '100% free with no sign-up required', 'Runs entirely in your browser — no server upload', 'Works offline after first load', 'Share results with link or export as image or CSV']
  });

  // 1b. BreadcrumbList
  schemas.push({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: DOMAIN + '/' },
      { '@type': 'ListItem', position: 2, name: 'Calculators', item: DOMAIN + '/' },
      { '@type': 'ListItem', position: 3, name: catName, item: DOMAIN + '/' + catKey },
      { '@type': 'ListItem', position: 4, name: tool.name, item: DOMAIN + canonPath }
    ]
  });

  // 2. HowTo (from steps with default values)
  if (typeof tool.steps === 'function') {
    try {
      const testValues = {};
      (tool.inputs || []).forEach(inp => { testValues[inp.id] = inp.def || (inp.type === 'number' ? 0 : ''); });
      const stepsResult = tool.steps(testValues);
      if (stepsResult && stepsResult.length) {
        schemas.push({
          '@context': 'https://schema.org', '@type': 'HowTo',
          name: 'How to use the ' + tool.name,
          step: stepsResult.slice(0, 5).map((s, i) => ({ '@type': 'HowToStep', position: i + 1, text: String(s).replace(/^Step\s+\d+:\s*/i, '') }))
        });
      }
    } catch (e) {}
  }

  // 3. FAQPage
  const faqItems = [];
  if (seo.faqs && seo.faqs.length) {
    seo.faqs.forEach(faq => faqItems.push({ '@type': 'Question', name: faq.q, acceptedAnswer: { '@type': 'Answer', text: faq.a } }));
  }
  if (faqItems.length) schemas.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqItems });

  return JSON.stringify(schemas, null, 2);
}

// ---------- 6. Long-tail modifier parsing (mirrors applyModifier ctx logic) ----------
function parseModifierTitle(tool, modifier) {
  const segments = String(modifier).toLowerCase().split('-').filter(Boolean);
  const parsed = { years: null, months: null, amount: null, rate: null, location: null };
  segments.forEach(seg => {
    let m;
    if ((m = seg.match(/^(\d+(?:\.\d+)?)(years?|yrs?)$/))) parsed.years = parseFloat(m[1]);
    else if ((m = seg.match(/^(\d+(?:\.\d+)?)months?$/))) parsed.months = parseFloat(m[1]);
    else if ((m = seg.match(/^(\d+(?:\.\d+)?)(k|k-?dollars?|thousand)$/))) parsed.amount = parseFloat(m[1]) * 1000;
    else if ((m = seg.match(/^(\d+(?:\.\d+)?)m$/))) parsed.amount = parseFloat(m[1]) * 1000000;
    else if ((m = seg.match(/^(\d+(?:\.\d+)?)(%|percent|pct)$/))) parsed.rate = parseFloat(m[1]);
    else if ((m = seg.match(/^(\d+(?:\.\d+)?)$/))) { if (parseFloat(m[1]) > 100) parsed.amount = parseFloat(m[1]); else parsed.years = parseFloat(m[1]); }
    else if (/^[a-z]{2,}$/.test(seg) && !['year','years','yr','yrs','month','months','percent','pct'].includes(seg)) parsed.location = seg;
  });
  const ctx = [];
  if (parsed.amount !== null) ctx.push('$' + Number(parsed.amount).toLocaleString());
  if (parsed.years !== null) ctx.push(parsed.years + (parsed.years === 1 ? ' Year' : ' Years'));
  if (parsed.months !== null) ctx.push(parsed.months + ' Months');
  if (parsed.rate !== null) ctx.push(parsed.rate + '%');
  if (parsed.location) ctx.push(parsed.location.charAt(0).toUpperCase() + parsed.location.slice(1));
  if (!ctx.length) return null;
  return { title: tool.name + ': ' + ctx.join(' ') + ' - CalcProMaster', ctx: ctx.join(' ') };
}

// ---------- 7. Generate all pages ----------
let written = 0;
const writePage = function (relDir, html) {
  const dir = path.join(DEPLOY, relDir);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  written++;
};

// 7a. Tool pages (1201)
for (const tool of tools) {
  const catKey = tool.cat;
  const seo = TOOL_SEO[tool.id] || {};
  const canonPath = seo.canonicalPath || '/' + catKey + '/' + tool.id;
  const title = seo.title || tool.name + ' - CalcPro';
  const desc = seo.metaDesc || tool.desc || '';
  const ogImage = '/og/' + tool.id + '.jpg';

  let page = rewriteHead(SHELL, {
    title, desc, canonical: canonPath,
    ogTitle: title, ogDesc: desc, ogImage,
    heroPreload: ogImage
  });
  // Mark the shell as carrying a prerendered tool article. app.js uses this
  // (plus a self-canonical check) to defer the first identical rebuild to idle
  // — the baked DOM is already on screen, so hydration right at boot would
  // block the main thread inside the LCP window on slow devices.
  page = page.replace('<html', '<html data-prerendered="1"');
  // PER-PAGE DATA TRIM: the shell ships 4 eager category chunks (finance/health/
  // math/everyday). A prerendered TOOL page only needs its OWN category to render
  // the calculator — drop the other three <script defer> tags and their <link
  // rel=preload> hints so first paint downloads one chunk instead of four
  // (finance alone is ~1.4MB decoded). app.js + data-loader.js re-fetch the
  // dropped chunks on demand (SPA navigation) or at idle, so search and category
  // counts recover within seconds — outside the LCP window. Category/hub pages
  // keep all four: their templates read counts across categories at boot.
  const EAGER_DATA_TAGS = [
    { cat: 'finance',  file: 'js/data/finance.js' },
    { cat: 'health',   file: 'js/data/health.js' },
    { cat: 'math',     file: 'js/data/math.js' },
    { cat: 'everyday', file: 'js/data/everyday.js' }
  ];
  for (const t of EAGER_DATA_TAGS) {
    if (t.cat === catKey) continue;
    page = page.replace('<script defer src="' + t.file + '"></script>', '');
    page = page.replace('<link rel="preload" as="script" href="' + t.file + '">', '');
  }
  page = rewriteSchema(page, buildToolSchema(tool, catKey, canonPath));
  page = rewriteMain(page, buildToolContent(tool, catKey));
  writePage(path.join(catKey, tool.id), page);
}

// 7b. Category pages (20)
for (const catKey of Object.keys(CATEGORY_META)) {
  const meta = CATEGORY_META[catKey];
  const catTools = tools.filter(t => t.cat === catKey);
  const title = meta.title;
  const desc = meta.desc;
  const canonPath = '/' + catKey;

  let content = '<div class="breadcrumb"><a href="/">Home</a> › ' + esc(CAT_NAME[catKey] || catKey) + '</div>';
  content += '<div class="tool-header"><h1>' + esc(title) + '</h1><p class="tool-desc">' + esc(desc) + '</p></div>';
  // Unique crawlable intro per category (topical context + how to use the list)
  const CAT_INTROS = {
    finance: 'Loan payments, interest growth, tax brackets and investment returns all reduce to a handful of standard formulas. Each calculator below shows the formula, a worked example with default inputs, and the assumptions behind the result — so you can verify the math instead of trusting a bare number. Pick a tool, or start with the guides linked at the bottom of each page.',
    health: 'Health metrics are useful when you know what they measure and what they ignore. Every calculator here states its formula (Mifflin-St Jeor for BMR, the standard BMI ratio, established zone percentages), a worked example, and its limits — including the population ranges each formula was derived from. Results are estimates to discuss with a clinician, not diagnoses.',
    math: 'From percentages and fractions to statistics and number theory, these tools show every step of the working next to the result. Each calculator lists its formula and assumptions so you can check the arithmetic yourself, and most include boundary notes (zero, negatives, decimals) so edge cases behave the way the math says they should.',
    everyday: 'The questions that come up between birthdays, bills and road trips — age in exact years and days, fuel costs for a journey, cooking conversions, tip splits. Each calculator runs entirely in your browser, remembers nothing, and shows the working so you can adapt it to your own numbers.',
    science: 'Physics and chemistry calculations with the constants and units spelled out: which gas constant the ideal-gas tool assumes, which half-life convention the decay calculator uses, what density formula sits behind the result. Worked examples use real-world magnitudes so you can sanity-check your own inputs.',
    engineering: 'Sizing, loads, currents and flows — the calculations engineers redo a dozen times a day. Each tool cites its governing formula (Darcy-Weisbach for pipe loss, Euler for buckling, standard wire-gauge tables) and states the safety margins it does NOT include, so a code check still belongs with a licensed engineer.',
    construction: 'Material estimates decide whether a pour comes in on budget or needs an emergency re-order. Concrete volume, bag counts, brick quantities and paint coverage calculators all include the wastage buffer professionals add, and each shows the volume math so you can adjust for your own site conditions.',
    conversion: 'Exact conversion factors — not rounded approximations — for length, weight, volume, temperature, speed and data. Each converter shows the factor it applies and the reverse direction, so a millimetre that matters stays precise instead of drifting through chained approximations.',
    business: 'Margins, break-even, customer costs and return on spend. Each calculator separates fixed from variable costs, shows the formula with a worked example, and flags the assumptions (like constant unit economics) that small businesses most often get wrong.',
    education: 'Grade math causes more arguments than it should: weighted categories, dropped scores, what a final exam can actually change. These calculators show the weighting math explicitly, with worked examples for common grading schemes, so you can check the arithmetic against your syllabus.',
    utilities: 'Small tools that answer small questions fast — password entropy, QR codes, color conversions, unit helpers. Each one runs client-side, states exactly what it does and does not do, and never sends your input anywhere.',
    lifestyle: 'Moving, renting, cooking, pets — the domestic math that has no spreadsheet when you need it. Every calculator shows its assumptions (per-person shares, average consumption rates) and the working, so the estimate matches your reality rather than an average.',
    regional: 'Calculators localized for India, Pakistan and the UAE: income tax slabs, zakat nisab thresholds, GST/VAT rates and salary structures that differ from US defaults. Each tool states which country rules and tax year it applies, and links the official source where the numbers come from.',
    food: 'Nutrition math from calories to macros: Mifflin-St Jeor BMR, activity multipliers, keto carb limits, recipe scaling. Each calculator shows its formula and the population range it was derived from, and reminds you where individual variation matters more than the formula.',
    fitness: 'Training zones, paces, one-rep maxes and calorie burn — with the testing protocols spelled out (which formula, which heart-rate percentages, which MET values). Each tool explains what its estimate assumes about terrain, treadmill calibration and individual physiology.',
    auto: 'Owning and driving costs more than the sticker price. Fuel cost, depreciation, insurance, lease-vs-buy and EV charging calculators all show the per-km or per-year math, state the default prices they assume, and let you replace every default with your own numbers.',
    career: 'Rate math for people who sell their time: freelance hourly rates, salary conversions, job-offer comparison, side-hustle margins. Each calculator shows the overhead and utilization assumptions behind the numbers, because a rate that ignores unpaid admin is a pay cut.',
    homegarden: 'Paint coverage, wallpaper rolls, AC sizing, soil volumes — the DIY estimates that get expensive when guessed. Each calculator uses standard coverage rates (and says what they are), shows the area math, and tells you when to add the professional buffer.',
    tech: 'Download times, data usage, password strength, hosting costs — measured against real-world network speeds and current pricing assumptions, each stated on the page. Tools that estimate security margins (password entropy, crack time) show the math and the honest caveats.',
    family: 'Parenting costs from diapers to college, plus the family-budget math that keeps the household honest. Each calculator shows its assumptions — regional cost averages, growth rates — and lets you replace them with your own family numbers.'
  };
  if (CAT_INTROS[catKey]) {
    content += '<div class="cat-intro"><p>' + esc(CAT_INTROS[catKey]) + '</p></div>';
  }
  content += '<div class="tools-grid">';
  catTools.slice(0, 48).forEach(t => {
    content += '<div class="tool-card" data-tool-id="' + escAttr(t.id) + '"><h2><a href="/' + catKey + '/' + t.id + '">' + esc(t.name) + '</a></h2><p>' + esc(String(t.desc || '').substring(0, 100)) + '</p></div>';
  });
  content += '</div>';

  let page = rewriteHead(SHELL, { title, desc, canonical: canonPath, ogTitle: title, ogDesc: desc });
  // Category schema: keep a minimal BreadcrumbList instead of the home array
  const catSchema = JSON.stringify([{
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: DOMAIN + '/' },
      { '@type': 'ListItem', position: 2, name: CAT_NAME[catKey] || catKey, item: DOMAIN + canonPath }
    ]
  }, {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: title, description: desc, url: DOMAIN + canonPath,
    // ItemList carries the ACTUAL item URLs (the 48 crawlable cards rendered
    // below) — numberOfItems alone gives search engines nothing to walk.
    mainEntity: {
      '@type': 'ItemList', numberOfItems: catTools.length,
      itemListElement: catTools.slice(0, 48).map((t, i) => ({
        '@type': 'ListItem', position: i + 1, name: t.name, url: DOMAIN + '/' + catKey + '/' + t.id
      }))
    }
  }], null, 2);
  page = rewriteSchema(page, catSchema);
  page = rewriteMain(page, content);
  writePage(catKey, page);
}

// 7c. Hub pages (20)
for (const catKey of Object.keys(CATEGORY_META)) {
  const meta = CATEGORY_META[catKey];
  const catTools = tools.filter(t => t.cat === catKey);
  const title = CAT_NAME[catKey] + ' Calculators Comparison — CalcPro';
  const desc = 'Compare ' + CAT_NAME[catKey] + ' calculators side by side. ' + meta.desc;
  const canonPath = '/hub/' + catKey;

  let content = '<div class="breadcrumb"><a href="/">Home</a> › <a href="/' + catKey + '">' + esc(CAT_NAME[catKey]) + '</a> › Comparison</div>';
  content += '<div class="tool-header"><h1>' + esc(CAT_NAME[catKey]) + ' Calculators Comparison</h1><p class="tool-desc">' + esc(desc) + '</p></div>';
  content += '<h2>' + esc(CAT_NAME[catKey]) + ' Calculators</h2>';
  content += '<div class="hub-tools-grid">';
  catTools.slice(0, 48).forEach(t => {
    content += '<div class="hub-card"><h3><a href="/' + catKey + '/' + t.id + '">' + esc(t.name) + '</a></h3><p>' + esc(String(t.desc || '').substring(0, 120)) + '</p></div>';
  });
  content += '</div>';

  let page = rewriteHead(SHELL, { title, desc, canonical: canonPath, ogTitle: title, ogDesc: desc });
  const hubSchema = JSON.stringify([{
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: DOMAIN + '/' },
      { '@type': 'ListItem', position: 2, name: CAT_NAME[catKey] || catKey, item: DOMAIN + '/' + catKey },
      { '@type': 'ListItem', position: 3, name: 'Comparison', item: DOMAIN + canonPath }
    ]
  }], null, 2);
  page = rewriteSchema(page, hubSchema);
  page = rewriteMain(page, content);
  writePage(path.join('hub', catKey), page);
}

// 7d. Long-tail virtual pages (from sitemap LONGTAIL list)
const LONGTAIL = [];
try {
  const sm = fs.readFileSync(path.join(ROOT, 'generate-sitemap.js'), 'utf8');
  const m = sm.match(/const LONGTAIL = \[([\s\S]*?)\n\];/);
  if (m) {
    const re = /\['([^']+)',\s*'([^']+)',\s*'([^']+)'\]/g;
    let x;
    while ((x = re.exec(m[1])) !== null) LONGTAIL.push([x[1], x[2], x[3]]);
  }
} catch (e) { console.error('long-tail parse fail', e.message); }

// LONG-TAIL NOINDEX GUARD (SEO consolidation, option a): ALL modifier variant
// pages render the same calculator as their parent tool page with no genuinely
// unique data (geo names are cosmetic; duration/amount only pre-fill inputs).
// Each variant is therefore emitted with robots noindex + canonical pointing at
// the PARENT tool page, and is excluded from the sitemap (generate-sitemap.js
// mirrors this guard). The pages stay reachable so pre-filled deep links and
// old backlinks still work — they just don't compete for indexation anymore.
const GEO_WORDS = ['florida', 'texas', 'california', 'arizona', 'newyork', 'new-york', 'georgia', 'ohio', 'illinois', 'pennsylvania', 'michigan', 'virginia', 'washington', 'colorado', 'oregon', 'nevada'];
const isGeoVariant = (modifier) => GEO_WORDS.some(g => String(modifier).toLowerCase().indexOf(g) !== -1);

for (const [catKey, toolId, modifier] of LONGTAIL) {
  const tool = TOOL_MAP[toolId];
  if (!tool || tool.cat !== catKey) continue;
  const parsed = parseModifierTitle(tool, modifier);
  if (!parsed) continue;
  const canonPath = '/' + catKey + '/' + toolId + '/' + modifier;
  const title = parsed.title;
  // Word-boundary clip to 155 chars (with ellipsis) so HTML-entity escaping
  // (& → &amp;) keeps the rendered meta description within the 165-char
  // display limit WITHOUT cutting mid-word ("free, private, s" reads broken
  // in the SERP and lowers CTR).
  const rawDesc = String((tool.desc || '') + ' Calculate ' + parsed.ctx + ' instantly — free, private, step-by-step.');
  const desc = rawDesc.length > 155
    ? rawDesc.slice(0, 155).replace(/\s+\S*$/, '').trim() + '…'
    : rawDesc;
  const ogImage = '/og/' + toolId + '.jpg';

  let page = rewriteHead(SHELL, { title, desc, canonical: canonPath, ogTitle: title, ogDesc: desc, ogImage, heroPreload: ogImage });
  // noindex EVERY long-tail variant; canonical consolidates to the base tool page.
  page = page.replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex, follow">');
  page = page.replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + DOMAIN + '/' + catKey + '/' + toolId + '">');
  page = rewriteSchema(page, buildToolSchema(tool, catKey, canonPath));
  page = rewriteMain(page, buildToolContent(tool, catKey));
  writePage(path.join(catKey, toolId, modifier), page);
}

// 7e. Noindex user-dashboard pages (favorites / history / compare)
for (const slug of ['favorites', 'history', 'compare']) {
  const titles = { favorites: 'Your Favorites', history: 'Calculation History', compare: 'Compare Results' };
  const descs = {
    favorites: 'Your saved favorite calculators on CalcProMaster — private, stored only in your browser.',
    history: 'View your past calculations on CalcProMaster — private, stored only in your browser.',
    compare: 'Compare your pinned calculation results side by side on CalcProMaster.'
  };
  let content = '<div class="tool-header"><h1>' + titles[slug] + '</h1><p class="tool-desc">' + descs[slug] + '</p></div>';
  content += '<p>This page is populated by your browser and is not a public indexable page.</p>';
  let page = rewriteHead(SHELL, { title: titles[slug], desc: descs[slug], canonical: '/' + slug, ogTitle: titles[slug], ogDesc: descs[slug], robots: 'noindex, follow' });
  page = rewriteMain(page, content);
  writePage(slug, page);
}

// 7f. Homepage — prerender crawlable category + hub links (the SPA shell alone
// shows only the hero; the category grid is JS-rendered, so crawlers see ~200
// words. Static links below give Google a real crawl path to every category.)
{
  const catLinks = Object.keys(CATEGORY_META).map(catKey => {
    const name = CAT_NAME[catKey] || catKey;
    const meta = CATEGORY_META[catKey];
    const count = tools.filter(t => t.cat === catKey).length;
    return '<a class="home-cat-link" href="/' + catKey + '">' + esc(name) + ' (' + count + ' calculators)</a>';
  }).join('\n    ');
  const hubLinks = Object.keys(CATEGORY_META).map(catKey => {
    const name = CAT_NAME[catKey] || catKey;
    return '<a class="home-cat-link" href="/hub/' + catKey + '">Compare ' + esc(name) + ' calculators</a>';
  }).join('\n    ');
  // APPEND crawlable content AFTER the static hero + boot skeleton (preserving
  // the LCP-optimized hero and the CLS-safe skeleton that renderHome() reuses).
  // The SPA replaces #mainContent on boot anyway; this static block gives crawlers
  // a real crawl path to every category and hub without touching the hero.
  const content = '<h2 class="section-title">All Categories</h2><div class="home-cat-links">' + catLinks + '</div>' +
    '<h2 class="section-title">Category Comparisons</h2><div class="home-cat-links">' + hubLinks + '</div>' +
    '<h2 class="section-title">Why CalcProMaster</h2>' +
    '<p>Every calculator shows its formula, a step-by-step worked example, and the assumptions behind the result, so you can trust the numbers. Results are computed instantly in your browser and never leave your device.</p>';
  let page = rewriteHead(SHELL, {
    title: 'CalcProMaster — 1206+ Free Online Calculators',
    desc: 'CalcProMaster — 1201+ free calculators for finance, health, math, science, engineering and everyday life. Step-by-step solutions, formulas, charts. No sign-up.',
    canonical: '/', ogTitle: 'CalcProMaster — Free Online Calculators',
    ogDesc: '1201+ free online calculators with step-by-step solutions, formulas and charts. No sign-up, no tracking.'
  });
  page = rewriteMainAppend(page, content);
  writePage('', page);
}

// ---------- 8. Report ----------
console.log('SSG complete: ' + written + ' static pages written under deploy/');
const cats = Object.keys(CATEGORY_META).length;
console.log('  tools: ' + tools.length + ' · categories: ' + cats + ' · hubs: ' + cats + ' · long-tail: ' + LONGTAIL.length + ' · noindex dashboards: 3');
