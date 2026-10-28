/* ============================================================
 * CalcProMaster — Static Site Generator (SSG)
 * ------------------------------------------------------------
 * Prerenders EVERY route in sitemap.xml as a real static HTML
 * file inside deploy/:
 *  *   deploy/<cat>/<tool-id>/index.html      → 1201 calculator pages
 *   deploy/<cat>/index.html                → 20 category pages (list + FAQ)
 *   deploy/hub/<cat>/index.html            → 20 comparison hubs (table only —
 *     they no longer re-render the category catalog; docs/DUPLICATE-HUBS-FIX.md)
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

// Per-category methodology text + reviewer bylines. Shared with the client
// (js/app.js reads window.CategoryMethodology) so prerendered HTML and the
// hydrated DOM stay identical.
const CategoryMethodology = require(path.join(ROOT, 'js', 'category-methodology.js'));
// Per-category depth block (intro + "what you can work out" + FAQs) for the
// comparison hubs. Hubs were ~300-650 words of boilerplate and Google crawled
// them without indexing ("Crawled - currently not indexed"); they are also the
// link junction feeding every tool page, so thinness there costs twice.
const CategoryDepth = require(path.join(ROOT, 'js', 'category-depth.js'));

// Registry count — SINGLE SOURCE OF TRUTH (same approach as sync-counts.cjs).
// Hardcoding "1216+" here made the prerendered homepage title/desc/OG go stale
// every time the registry moved (1219 batch #4 proved it). Read it live instead.
function registryCount() {
  try {
    let total = 0;
    for (const f of fs.readdirSync(path.join(ROOT, 'js', 'data')).filter((x) => x.endsWith('.js'))) {
      const mod = require(path.join(ROOT, 'js', 'data', f));
      if (Array.isArray(mod)) total += mod.length;
    }
    return total;
  } catch (e) { return 1219; }
}
const TOTAL = registryCount();
const TOTAL_PLUS = TOTAL + '+';
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

// Content freshness stamp. The build regenerates every page from the same
// registry + SEO source, so "modified" == "this build". External audits look for
// a machine-readable date (JSON-LD dateModified / <time datetime>) and reported
// "no machine-readable dates" before this existed. BUILD_DATE is overridable so
// a reproducible/staged build can pin the date it is published under.
const CONTENT_DATE = (process.env.BUILD_DATE || new Date().toISOString().slice(0, 10));
const CONTENT_MONTH = new Date(CONTENT_DATE + 'T00:00:00Z').toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

// Page-specific <meta name="keywords">. The shell ships ONE global list (the
// homepage's), so every one of the 1,600+ prerendered pages used to repeat
// "calculators, online calculators, ..." verbatim — i.e. the page's own term was
// never in its keywords meta (an audit "exact keyword does not exist in meta
// keywords" hit on every tool page). Derive the list from the page's own title:
// the phrase before the first separator is the primary term by construction.
function deriveKeywords(title, extra) {
  const clean = String(title || '').replace(/&amp;/g, '&').split(/\s*(?:—|–|\||:)\s*/)[0].trim();
  const primary = clean.toLowerCase().replace(/[^a-z0-9\s'-]/g, '').replace(/\s+/g, ' ').trim();
  const list = [];
  const push = (k) => { const v = String(k || '').trim(); if (v && v.length > 2 && !list.includes(v)) list.push(v); };
  push(primary);
  // Bare head noun ("income tax" from "income tax calculator") is how people
  // actually search; the old "<title> formula" variant produced nonsense tags
  // like "finance calculators comparison formula" on hub pages.
  if (/\bcalculators?\b/.test(primary)) push(primary.replace(/\bcalculators?\b\s*$/, '').trim());
  else push(primary + ' calculator');
  for (const e of (extra || [])) push(String(e).toLowerCase());
  push('free online calculator');
  push('step by step calculator');
  // Keep the tag honest and short: Google ignores it, but audit tools still
  // count length, and a 300-char keyword soup reads as stuffing.
  const out = [];
  for (const k of list) { if ((out.join(', ') + ', ' + k).length > 180) break; out.push(k); }
  return out.join(', ');
}

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

// ---------- 3b. Per-tool content enhancement (page-2 → page-1 push) ----------
// Extra section (formula + verified data table) appended to specific tool pages.
// Content lives in js/tool-enhance.js — the SAME file the browser bundle loads
// via js/app.js renderExplain(), so the prerendered HTML and the hydrated DOM
// stay identical. Only deterministic formula/maths content belongs there.
let TOOL_ENHANCE = {};
try {
  const enhCtx = { window: {}, module: { exports: {} }, console: { log() {}, warn() {}, error() {} } };
  vm.createContext(enhCtx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'tool-enhance.js'), 'utf8'), enhCtx, { filename: 'tool-enhance.js' });
  TOOL_ENHANCE = enhCtx.window.TOOL_ENHANCE || enhCtx.module.exports || {};
} catch (e) { console.error('tool-enhance load fail', e.message); }

// ---------- 3. Category metadata ----------
const CATEGORY_META = {
  finance: { title: 'Finance Calculators — Loan, EMI, Tax & SIP Tools', desc: 'Loan, mortgage, EMI, tax, retirement and SIP calculators — each page shows the formula, the inputs and every step of the working.' },
  health: { title: 'Health & Fitness Calculators', desc: 'Calculate BMI, BMR, calories, body fat, heart rate and other health metrics.' },
  math: { title: 'Math Calculators — Percentage, Fraction & Algebra Tools', desc: 'Scientific calculators, algebra, geometry, statistics and more math tools.' },
  everyday: { title: 'Everyday Calculators', desc: 'Age, date, fuel, cooking, tip and time calculators for daily questions — enter two values and the working appears beside the result.' },
  science: { title: 'Science Calculators — Physics & Chemistry Formulas', desc: 'Physics and chemistry calculators — density, molarity, kinetic energy, wave speed and lab conversions, with units checked in every step.' },
  engineering: { title: 'Engineering Calculators — Electrical, Mechanical & Civil', desc: 'Electrical, mechanical and civil calculators for beam loads, wire gauge, Ohm law and torque — formula and worked steps on each page.' },
  construction: { title: 'Construction Calculators — Concrete, Rebar & Roofing', desc: 'Concrete volume, rebar, roofing, flooring and material estimates, with the coverage assumptions listed beside every result.' },
  conversion: { title: 'Unit Conversion Calculators', desc: 'Length, weight, volume, temperature, speed and area converters — exact factors, with no rounding until the final digit.' },
  business: { title: 'Business Calculators', desc: 'ROI, profit margin, cash flow, break-even, CAC, LTV and markup calculators — enter your figures and compare the scenarios side by side.' },
  education: { title: 'Education Calculators — GPA, Final Grade & Test Scores', desc: 'GPA, final grade, test score and study-time calculators — see the weighting that produces the number before you rely on it.' },
  utilities: { title: 'Utility Calculators', desc: 'QR codes, password strength, colour converters and unit helpers — small tools that run in the browser and never upload your input.' },
  lifestyle: { title: 'Lifestyle & Home Calculators', desc: 'Moving cost, rent split, cooking conversion, pet care and home-decision calculators, with the assumptions shown beside each result.' },
  regional: { title: 'Regional Calculators (India/PK/UAE)', desc: 'India, Pakistan and UAE calculators for FD, RD, PPF, GST, zakat, income tax and take-home salary, using current published slabs.' },
  food: { title: 'Food & Nutrition Calculators', desc: 'Calorie, macro, keto and meal-planning calculators — portion and recipe scaling with the nutrition reference behind each figure.' },
  fitness: { title: 'Fitness & Exercise Calculators', desc: 'Running pace, one-rep max, heart-rate zones and calories-burned calculators, with the training formula shown step by step.' },
  auto: { title: 'Auto & Transport Calculators', desc: 'Fuel cost, EV charging, car loan, depreciation and mileage calculators.' },
  career: { title: 'Career & Freelance Calculators', desc: 'Salary converter, freelance rate, job offer compare and side hustle profit.' },
  homegarden: { title: 'Home & Garden Calculators', desc: 'Paint, wallpaper, lighting, AC size, garden soil and DIY project calculators.' },
  tech: { title: 'Tech & Digital Calculators', desc: 'Download time, data usage, password strength, domain value and tech ROI.' },
  family: { title: 'Parenting & Family Calculators', desc: 'Child height prediction, family budget, college savings, childcare cost and estate planning.' },
};
// Category → category-hub guide (/guides/<name>, sitemap form = no trailing
// slash). In hubs ke static inlinks sirf 1-2 the (audit: weak) — ab har tool
// page + category page unko link karta hai (~700 inlinks/hub, depth-2 boost).
const GUIDE_HUB = {
  finance: '/guides/loans-mortgages', health: '/guides/health-fitness', math: '/guides/math-statistics',
  everyday: '/guides/everyday', science: '/guides/science', engineering: '/guides/engineering',
  construction: '/guides/construction', conversion: '/guides/unit-conversion', business: '/guides/business',
  auto: '/guides/auto', education: '/guides/gpa', food: '/guides/food', career: '/guides/career',
  regional: '/guides/regional', fitness: '/guides/health-fitness', homegarden: '/guides/homegarden',
  lifestyle: '/guides/lifestyle', family: '/guides/family', tech: '/guides/utilities', utilities: '/guides/utilities'
};

// ---------- 3c. Related reading (contextual inlink depth) ----------
// Hand-picked guide/blog article for specific tool pages. These 10 guide/blog
// pages were only reachable from their index + 1-2 siblings (crawl-report
// "few internal backlinks"). Each entry adds ONE contextual editorial link on a
// genuinely related tool page — never a site-wide boilerplate block, so the
// link is useful to a reader and passes a manual-review smell test.
const RELATED_READING = {
  // /blog/bmi-honest-look
  'health/bmi': [{ href: '/blog/bmi-honest-look', label: 'Is BMI a fair health measure?' }],
  'health/body-fat': [{ href: '/blog/bmi-honest-look', label: 'BMI vs body fat — which counts?' }],
  'health/ideal-weight': [{ href: '/blog/bmi-honest-look', label: 'The honest limits of BMI' }],
  'fitness/body-fat-fitness': [{ href: '/blog/bmi-honest-look', label: 'Why BMI can mislead fit athletes' }],
  // /blog/concrete-patio-math
  'construction/concrete-slab': [{ href: '/blog/concrete-patio-math', label: 'Concrete patio math: how much mix?' }],
  'construction/concrete-bags': [{ href: '/blog/concrete-patio-math', label: 'Concrete patio math: bags vs ready-mix' }],
  'construction/paver-calculator': [{ href: '/blog/concrete-patio-math', label: 'Paving & patio quantity math' }],
  'construction/footing-size': [{ href: '/blog/concrete-patio-math', label: 'Footing & patio concrete math' }],
  // /blog/ev-vs-petrol-tco
  'auto/ev-vs-gas-petrol': [{ href: '/blog/ev-vs-petrol-tco', label: 'EV vs petrol total cost of ownership' }],
  'auto/ev-charging-cost': [{ href: '/blog/ev-vs-petrol-tco', label: 'EV running cost vs petrol, per km' }],
  'auto/ev-range': [{ href: '/blog/ev-vs-petrol-tco', label: 'EV vs petrol: real running costs' }],
  'auto/hybrid-savings': [{ href: '/blog/ev-vs-petrol-tco', label: 'Hybrid vs EV vs petrol running costs' }],
  'auto/fuel-cost': [{ href: '/blog/ev-vs-petrol-tco', label: 'Fuel vs EV running cost, per km' }],
  // /blog/how-emi-works
  'finance/loan-emi': [{ href: '/blog/how-emi-works', label: 'How EMI is actually calculated' }],
  'finance/mortgage': [{ href: '/blog/how-emi-works', label: 'How home-loan EMIs work' }],
  'finance/auto-loan': [{ href: '/blog/how-emi-works', label: 'How car-loan EMIs work' }],
  'finance/biweekly-mortgage': [{ href: '/blog/how-emi-works', label: 'How EMI and repayments work' }],
  'finance/loan-balance': [{ href: '/blog/how-emi-works', label: 'How EMI splits principal vs interest' }],
  // /blog/rule-of-72
  'finance/compound-interest': [{ href: '/blog/rule-of-72', label: 'The Rule of 72 for doubling time' }],
  'finance/sip': [{ href: '/blog/rule-of-72', label: 'Estimate doubling time with the Rule of 72' }],
  'finance/cagr': [{ href: '/blog/rule-of-72', label: 'Rule of 72 vs CAGR' }],
  'finance/cd-calculator': [{ href: '/blog/rule-of-72', label: 'How fast will your money double?' }],
  'finance/deposit-interest': [{ href: '/blog/rule-of-72', label: 'Rule of 72: quick growth estimate' }],
  // /blog/stacked-discounts
  'finance/discount': [{ href: '/blog/stacked-discounts', label: 'Stacked discounts: why 20%+20% ≠ 40%' }],
  'math/percentage': [{ href: '/blog/stacked-discounts', label: 'Why stacked percentages confuse' }],
  'finance/sales-tax': [{ href: '/blog/stacked-discounts', label: 'Stacked percentage maths' }],
  'finance/simple-interest': [{ href: '/blog/stacked-discounts', label: 'Stacked discounts explained' }],
  // /guides/age
  'utilities/age-exact': [{ href: '/guides/age', label: 'How age is calculated, exactly' }],
  'everyday/age': [{ href: '/guides/age', label: 'Age calculation guide' }],
  'everyday/days-between': [{ href: '/guides/age', label: 'Counting days and age' }],
  'utilities/date-add': [{ href: '/guides/age', label: 'Adding dates and ages' }],
  // /guides/gst-sales-tax
  'regional/gst-calculator': [{ href: '/guides/gst-sales-tax', label: 'GST & sales tax explained' }],
  'everyday/gst': [{ href: '/guides/gst-sales-tax', label: 'GST adding/removing guide' }],
  'business/markup-margin': [{ href: '/guides/gst-sales-tax', label: 'Tax, markup & margin guide' }],
  // /guides/rent-vs-buy
  'finance/rent-vs-buy': [{ href: '/guides/rent-vs-buy', label: 'Rent vs buy: the real maths' }],
  'finance/loan-qualify': [{ href: '/guides/rent-vs-buy', label: 'Rent vs buy affordability' }],
  'lifestyle/home-renovation': [{ href: '/guides/rent-vs-buy', label: 'Renting vs buying a home' }],
  'lifestyle/relocation-cost': [{ href: '/guides/rent-vs-buy', label: 'Moving, renting or buying?' }],
  // /guides/zakat
  'regional/gold-rate': [{ href: '/guides/zakat', label: 'Zakat on gold, cash & savings' }],
  'regional/gold-silver': [{ href: '/guides/zakat', label: 'Zakat: how gold holdings count' }],
  'finance/investment': [
    { href: '/blog/rule-of-72', label: 'The Rule of 72 for doubling time' },
    { href: '/guides/zakat', label: 'Zakat on investments & savings' }
  ],
  // ---- second inlink for the 21 guides that only /guides/ linked ----
  // Ahrefs reported "Page has only one dofollow incoming internal link" on
  // these. Each guide now also gets a contextual link from the two tools it is
  // actually about, which is where a reader would look for it.
  'homegarden/ac-size': [{ href: '/guides/ac-size', label: 'AC size: the BTU maths' }],
  // (merged with the electricity-bill entry below — one key, both guides)
  'lifestyle/baby-cost': [{ href: '/guides/baby-cost', label: 'First-year baby costs, itemised' }],
  'family/family-budget': [{ href: '/guides/baby-cost', label: 'Budgeting for a new baby' }],
  'health/bmr': [{ href: '/guides/bmr', label: 'BMR formulas compared' }],
  'health/bmr-mifflin': [{ href: '/guides/bmr', label: 'Why Mifflin-St Jeor is the default' }],
  'health/body-fat': [{ href: '/guides/body-fat', label: 'Body-fat methods compared' }],
  'health/body-fat-navy': [{ href: '/guides/body-fat', label: 'Navy tape method explained' }],
  'everyday/business-days': [{ href: '/guides/business-days', label: 'Counting business days and holidays' }],
  'finance/credit-card-payoff': [{ href: '/guides/credit-card-minimum', label: 'Why minimum payments keep you in debt' }],
  'finance/debt-ratio': [
    { href: '/guides/credit-card-minimum', label: 'Minimum payments vs the full balance' },
    { href: '/guides/debt-ratio', label: 'Debt-to-income limits explained' }
  ],
  'finance/loan-qualify': [{ href: '/guides/debt-ratio', label: 'What DTI lenders actually accept' }],
  'conversion/currency-conv': [{ href: '/guides/currency-conversion', label: 'Exchange-rate spreads explained' }],
  'finance/currency-converter': [{ href: '/guides/currency-conversion', label: 'Mid-market vs bank rates' }],
  'lifestyle/electricity-bill-saving': [
    { href: '/guides/electricity-bill', label: 'Reading an electricity bill' },
    { href: '/guides/ac-size', label: 'Air-conditioning size and running cost' }
  ],
  'regional/electricity-bill-india': [{ href: '/guides/electricity-bill', label: 'Slab tariffs and fixed charges' }],
  'regional/ppf-calculator': [{ href: '/guides/fd-ppf-sip', label: 'FD, PPF and SIP compared' }],
  'finance/sip': [{ href: '/guides/fd-ppf-sip', label: 'SIP vs FD vs PPF' }],
  'business/freelance-rate': [{ href: '/guides/freelance-rate-card', label: 'Building a freelance rate card' }],
  'career/salary-converter': [{ href: '/guides/tax-salary', label: 'Gross vs net salary, step by step' }],
  'auto/fuel-cost': [{ href: '/guides/fuel-cost', label: 'Fuel cost per km, explained' }],
  'auto/mileage-calculator': [{ href: '/guides/fuel-cost', label: 'Mileage and fuel-cost maths' }],
  'engineering/gear-ratio': [{ href: '/guides/gear-ratio', label: 'Gear ratio and torque maths' }],
  'auto/power-to-weight': [{ href: '/guides/gear-ratio', label: 'Gearing, torque and acceleration' }],
  'education/grade-needed': [{ href: '/guides/grade-needed', label: 'What score you still need' }],
  'education/gpa': [{ href: '/guides/grade-needed', label: 'Grades, GPA and target scores' }],
  'finance/net-worth-calculator': [{ href: '/guides/net-worth', label: 'How net worth is calculated' }],
  'finance/npv': [{ href: '/guides/npv-vs-irr', label: 'NPV vs IRR: when they disagree' }],
  'finance/irr': [{ href: '/guides/npv-vs-irr', label: 'IRR and multiple sign changes' }],
  'lifestyle/paint-coverage': [{ href: '/guides/paint-coverage', label: 'Paint coverage and coats' }],
  'lifestyle/home-renovation': [{ href: '/guides/paint-coverage', label: 'Estimating paint for a room' }],
  'food/protein-need': [{ href: '/guides/protein-intake', label: 'Protein targets by body weight' }],
  'food/vegan-protein': [{ href: '/guides/protein-intake', label: 'Hitting protein on a plant diet' }],
  'health/sleep': [{ href: '/guides/sleep-cycles', label: 'Sleep cycles and wake times' }],
  'health/sleep-quality': [{ href: '/guides/sleep-cycles', label: 'Why 90-minute cycles matter' }],
  'finance/us-income-tax': [{ href: '/guides/tax-salary', label: 'Marginal vs effective tax' }],
  'finance/uk-income-tax': [{ href: '/guides/tax-salary', label: 'Take-home pay after tax' }],
  'health/water-intake-health': [{ href: '/guides/water-intake', label: 'How much water you actually need' }],
  'food/daily-water-intake': [{ href: '/guides/water-intake', label: 'Water needs and activity' }]
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

// The HOMEPAGE must keep the inline CSS build-deploy.js just wrote: writePage('')
// below re-emits deploy/index.html, and using the stripped SHELL there silently
// threw the inline CSS away and put a render-blocking <link rel="stylesheet">
// back on the homepage (measured: 360ms of blocking + an 85KB stylesheet that
// the already-inlined rules made 81% redundant). Snapshot it BEFORE the strip.
const SHELL_HOME = SHELL;

// 4b. Replace the shell's above-the-fold CSS with ONE external stylesheet link.
// The shell (deploy/index.html, written by build-deploy.js — which no longer
// inlines the full sheet, see the note above `minifyCss` there) carries a small
// critical-CSS block plus `preload as="style"` and a <noscript> fallback. A
// prerendered page is its own document, so it does not need the critical block
// twice: it gets the same cacheable /styles.css the other 1,500 pages use, as a
// single link. Consuming the preload + noscript lines too keeps that at exactly
// one stylesheet reference per page instead of three.
SHELL = SHELL.replace(
  /\s*<!-- Critical CSS inline for instant first paint -->[\s\S]*?<\/noscript>\n?/,
  '\n  <link rel="stylesheet" href="/styles.css">\n'
);
// Fallback for an older shell shape: strip whatever inline CSS block follows
// the marker and leave one external link.
if (/<!-- Critical CSS/.test(SHELL)) {
  SHELL = SHELL.replace(/<!-- Critical CSS[\s\S]*?<\/style>\n?/, '<link rel="stylesheet" href="/styles.css">\n');
}

// 4c. Drop the homepage's FAQ from every generated page.
// The shell (deploy/index.html) carries the site FAQ — 16 questions, ~617 words.
// Every page that inherits the shell was therefore shipping that same text
// verbatim: measured 2026-10-27, 1,512 generated pages (1,492 tool/category +
// 20 hubs), ~617 of a tool page's ~2,285 visible words — 27% of the page was
// byte-identical to 1,511 other URLs. Its "Frequently asked questions" heading
// also duplicated the tool's own FAQ heading on the same document. Google
// discounts site-wide boilerplate, but it is the single largest block of
// internal duplicate content on the site, and it inflates every page's word
// count without adding anything page-specific.
// Nothing unique is lost: the homepage keeps the FAQ (and the FAQPage JSON-LD
// that describes those questions lives there too), and every tool/category page
// keeps its own FAQ, worked example and formula blocks. The two links the site
// block carried (/finance/loan-emi/, /health/bmi/) stay in home-about and the
// footer, so no crawl path is removed.
SHELL = SHELL.replace(/\s*<section class="home-faq">[\s\S]*?<\/section>/, '\n');

// ---------- 5. Helpers ----------
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function escAttr(s) { return esc(s).replace(/'/g, '&#39;'); }

// Replace the <head> meta: title, description, canonical, OG/Twitter.
// Titles shorter than ~30 chars are flagged "too short" by crawlers and read
// poorly in the SERP. Pad deterministically with the brand so both the static
// and (mirrored in app.js) hydrated title pass the check.
function padTitle(s) {
  s = String(s == null ? '' : s);
  if (!s) return 'CalcProMaster — Free Online Calculators';
  if (s.length >= 30) return s;
  if (/CalcProMaster/i.test(s)) return s + ' — Free Online Calculators';
  return s + ' | CalcProMaster';
}

function rewriteHead(html, opts) {
  let out = html;
  const title = padTitle(opts.title || 'CalcProMaster');
  const desc = opts.desc || '';
  const canon = opts.canonical || '/';
  const ogTitle = padTitle(opts.ogTitle || title);
  const ogDesc = opts.ogDesc || desc;
  const ogImage = opts.ogImage || '/og-image.png';
  const robots = opts.robots || 'index, follow';

  out = out.replace(/<title>[^<]*<\/title>/, '<title>' + esc(title) + '</title>');
  out = out.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + escAttr(desc) + '">');
  out = out.replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="' + escAttr(robots) + '">');
  const kw = opts.keywords || deriveKeywords(title);
  out = out.replace(/<meta name="keywords" content="[^"]*">/, '<meta name="keywords" content="' + escAttr(kw) + '">');
  out = out.replace(/<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + DOMAIN + canon + '">');
  out = out.replace(/<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + escAttr(ogTitle) + '">');
  out = out.replace(/<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + escAttr(ogDesc) + '">');
  out = out.replace(/<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="' + DOMAIN + canon + '">');
  out = out.replace(/<meta property="og:image" content="[^"]*">/, '<meta property="og:image" content="' + DOMAIN + ogImage + '">');
  out = out.replace(/<meta name="twitter:card" content="[^"]*">/, '<meta name="twitter:card" content="summary_large_image">');
  // Complete Twitter card: title + description must accompany card + image.
  out = out.replace(/<meta name="twitter:title" content="[^"]*">/, '<meta name="twitter:title" content="' + escAttr(ogTitle) + '">');
  out = out.replace(/<meta name="twitter:description" content="[^"]*">/, '<meta name="twitter:description" content="' + escAttr(ogDesc) + '">');
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
  // Category links MUST carry the trailing slash: categories are served at
  // /<cat>/ (directory index), so linking to /<cat> would 308-redirect and
  // Sitechecker flags every page as "internal links to 3xx" + "trailing slash
  // mismatch". Canonical + sitemap already use the slash form.
  let html = '<div class="breadcrumb"><a href="/">Home</a> › <a href="/' + catKey + '/">' + esc(catName) + '</a> › ' + esc(tool.name) + '</div>';

  // Tool header
  html += '<div class="tool-header">';
  html += '<h1>' + esc(tool.name) + '</h1>';
  html += '<p class="tool-desc">' + (tool.desc ? esc(tool.desc) : '') + '</p>';
  // Hero image (the page's LCP element) — baked into the static HTML so the
  // browser starts the fetch at parse time instead of waiting for hydration.
  // renderTool() re-creates the identical <img> (eager + fetchpriority=high) on
  // hydration — served from cache, no second request. Same onerror fallback.
  // No inline onerror: the fallback is a delegated capture-phase listener in
  // js/app.js (inline event handlers are a CSP-hardening audit failure).
  // Alt text must name the tool without stuttering: the names already carry
  // their product noun ("Loan EMI Calculator"), so appending another one shipped
  // "Loan EMI Calculator calculator — free online tool" on the 940 pages whose
  // tool name ends in Calculator/Converter (measured 2026-10-27).
  const heroNoun = /\b(calculator|converter|estimator|planner|checker|tracker|comparison|generator|solver|finder|builder|maker|simulator)s?\b/i.test(tool.name)
    ? tool.name + ' — free online tool'
    : tool.name + ' calculator — free online tool';
  html += '<div class="tool-hero-wrap"><img class="tool-hero-img" src="/og/' + encodeURIComponent(tool.id) + '.jpg" alt="' + escAttr(heroNoun) + '" loading="eager" fetchpriority="high" decoding="async" width="1200" height="630"></div>';
  html += '<div class="privacy-badge" role="note" aria-label="Privacy">🔒 <span>Your data never leaves your device</span></div>';
  // Visible + machine-readable freshness (matches JSON-LD dateModified above).
  // Just the machine-readable date. The old trailing sentence ("formula and
  // worked example checked against the current rates") was byte-identical on
  // every tool page, which is duplicate content with no added meaning.
  html += '<p class="tool-reviewed">Reviewed <time datetime="' + CONTENT_DATE + '">' + esc(CONTENT_MONTH) + '</time></p>';
  html += '</div>';

  // Unique intro paragraph
  if (intro) html += '<p class="tool-intro" data-tool="' + escAttr(tool.id) + '">' + esc(intro) + '</p>';

  // AEO block (Block 1)
  if (seo.aeo) html += '<div class="seo-aeo-area"><div class="explain-card seo-aeo">' + seo.aeo + '</div></div>';

  // Per-tool enhancement (optional): extra formula + data-table section, used
  // to push high-impression page-2 pages onto page 1. See TOOL_ENHANCE above.
  //
  // Ye card PRERENDER mein AEO block ke turant baad aata hai, 500-word guide ke
  // baad nahi. Wajah do tarfa hai (`docs/PAGE-EXPOSURE-PROOF.md`):
  //   1. Runtime injector (`js/tool-enhance.js`) isay pehle explain-card ke
  //      andar append karta hai — yani hydration ke baad section upar hota hai.
  //      Us se pehle SSG usay FAQ se just pehle rakhta tha, is liye prerender
  //      (jise crawler padhta hai) aur hydrated DOM ka order alag tha.
  //   2. Measured: guide ke baad hone se page ka unique table 35-37% depth par
  //      chala jata tha, aksar FAQ ke ek-do line pehle — yani practically hidden.
  if (TOOL_ENHANCE[tool.id]) html += '<div class="explain-card tool-enhance">' + TOOL_ENHANCE[tool.id] + '</div>';

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
      html += '<a class="related-card" href="/' + r.cat + '/' + r.id + '/">' + esc(r.name) + '</a>';
    });
    html += '</div></div>';
  }

  // "More <Category> Calculators" — a ROTATED same-category window (not the
  // always-first-6 used above) so inlinks spread across the whole category
  // instead of concentrating on the first handful. This lifts the pages that
  // were only reachable from their category/hub page above the "few internal
  // backlinks" threshold, without adding a link-heavy block.
  const catAll = tools.filter(t => t.cat === catKey);
  if (catAll.length > 8) {
    const startAt = catAll.findIndex(t => t.id === tool.id);
    const more = [];
    for (let i = 1; i < catAll.length && more.length < 6; i++) {
      const t = catAll[(startAt + i + catAll.length) % catAll.length];
      if (t.id !== tool.id) more.push(t);
    }
    if (more.length) {
      html += '<div class="related-section"><h3>More ' + esc(CAT_NAME[catKey] || catKey) + ' Calculators</h3><div class="related-grid">';
      more.forEach(function (m) {
        html += '<a class="related-card" href="/' + catKey + '/' + m.id + '/">' + esc(m.name) + '</a>';
      });
      html += '</div></div>';
    }
  }

  // Link the category comparison hub from every tool page. Only +1 link per
  // page (category pages are already near the 100-link crawler threshold), but
  // it lifts each of the 20 hub pages well above the "few internal backlinks"
  // floor.
  if (CAT_NAME[catKey]) {
    html += '<p class="hub-link-row"><a href="/hub/' + catKey + '/">Compare all ' + esc(CAT_NAME[catKey]) + ' calculators</a></p>';
  }

  // Related reading — one hand-picked guide/blog article where it genuinely
  // adds context (see RELATED_READING). Keeps these pages above the "few
  // internal backlinks" floor with editorial links, not boilerplate.
  const reading = RELATED_READING[catKey + '/' + tool.id];
  if (reading && reading.length) {
    html += '<p class="related-reading-row">Related reading: ' +
      reading.map(function (l) { return '<a href="' + l.href + '">' + esc(l.label) + '</a>'; }).join(' · ') +
      '</p>';
  }

  // E-E-A-T review block (YMYL pages get the full honest-authorship text).
  // Must stay in sync with the identical block in js/app.js renderTool().
  const YMYL_EEAT_FINANCE = ['finance', 'business', 'regional', 'career'];
  const YMYL_EEAT_HEALTH = ['health', 'fitness', 'food', 'family'];
  let reviewBlock;
  if (YMYL_EEAT_FINANCE.includes(catKey)) {
    reviewBlock = '<div class="tool-review-block"><strong>About this page:</strong> Standard financial formulas, checked against worked examples and covered by automated tests. Math education, not financial advice — see our <a href="/editorial-policy">editorial policy</a>.</div>';
  } else if (YMYL_EEAT_HEALTH.includes(catKey)) {
    reviewBlock = '<div class="tool-review-block"><strong>About this page:</strong> Published, peer-reviewed formulas, checked against worked examples and covered by automated tests. Health education, not medical advice — see our <a href="/editorial-policy">editorial policy</a>.</div>';
  } else {
    reviewBlock = '<div class="tool-review-block"><strong>About this page:</strong> Documented public formulas, checked against worked examples and covered by automated tests — see our <a href="/editorial-policy">editorial policy</a>.</div>';
  }
  html += reviewBlock;
  // Per-category methodology + reviewer byline (shared module, kept in sync
  // with the identical block in js/app.js).
  html += CategoryMethodology.bylineHtml(catKey);
  html += CategoryMethodology.methodologyHtml(catKey);

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
    // Machine-readable recency (schema.org supports both on WebApplication).
    // Kept in the prerendered JSON-LD so it is present for crawlers that never
    // execute JS — the hydrated page rebuilds the same block from js/app.js.
    datePublished: '2025-01-15',
    dateModified: CONTENT_DATE,
    inLanguage: 'en',
    isAccessibleForFree: true,
    featureList: ['Step-by-step solutions with formula breakdown', '100% free with no sign-up required', 'Runs entirely in your browser — no server upload', 'Works offline after first load', 'Share results with link or export as image or CSV'],
    // Semantic entity coverage (2026-10-19): the generated related-term set was
    // never rendered or published, so "semantic optimization" existed only in
    // the generator. Thing entities + keywords put it in the crawlable JSON-LD.
    // Mirrors the injected schema in js/app.js.
    keywords: (seo.lsi || []).slice(0, 8).join(', '),
    about: (seo.lsi || []).slice(0, 4).map(t => ({ '@type': 'Thing', name: t }))
  });

  // 1b. BreadcrumbList
  schemas.push({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: DOMAIN + '/' },
      { '@type': 'ListItem', position: 2, name: 'Calculators', item: DOMAIN + '/' },
      { '@type': 'ListItem', position: 3, name: catName, item: DOMAIN + '/' + catKey + '/' },
      { '@type': 'ListItem', position: 4, name: tool.name, item: DOMAIN + canonPath + (canonPath.endsWith('/') ? '' : '/') }
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
  // Directory-style pages serve their 200 at /path/ (Netlify pretty-URLs the
  // non-slash form → /path/). Point canonical + og:url at the SLASH form so
  // the canonical never references a redirecting URL — that mismatch is what
  // produced GSC's "Page with redirect" / "Alternate page with canonical"
  // rows. Root ('/') already carries the slash; file-like paths are skipped.
  const toSlashForm = (u) => {
    const m = String(u).match(/^(https:\/\/[^/]+)(\/[^["?#]*)?$/);
    if (!m) return u;
    const p = m[2] || '/';
    if (p === '/' || /\/[^/]*\.[a-z0-9]+$/i.test(p)) return u;
    return m[1] + p.replace(/\/+$/, '') + '/';
  };
  html = html.replace(/(<link rel="canonical" href=")([^"]+)(")/g, (s, a, u, c) => a + toSlashForm(u) + c);
  html = html.replace(/(<meta property="og:url" content=")([^"]+)(")/g, (s, a, u, c) => a + toSlashForm(u) + c);
  // Freshness stamp on EVERY prerendered page. Tool pages already carry the
  // "Reviewed <time>" line (buildToolContent); category, hub, long-tail, guide
  // and dashboard pages had no machine-readable date at all. One insertion point
  // here keeps it uniform instead of teaching each builder about dates.
  if (!/<time datetime=/.test(html)) {
    const stamp = '<p class="tool-reviewed">Last updated <time datetime="' + CONTENT_DATE + '">' + esc(CONTENT_MONTH) + '</time></p>';
    const close = html.lastIndexOf('</main>');
    if (close !== -1) html = html.slice(0, close) + stamp + '\n  ' + html.slice(close);
  }
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
  // PER-PAGE DATA: since 2026-10-13 the shell (index.html) ships NO category
  // chunks at all — it only ships js/home-tools.js (names, ~20KB raw) so the
  // homepage renders without finance/math/health/everyday (~120KB gzip).
  // A prerendered TOOL page still needs its OWN category to render the calculator,
  // so the build INJECTS exactly one <script defer> tag here (previously it
  // kept one of four shell tags and dropped three). Everything else stays
  // on-demand: navigation re-fetches through js/data-loader.js, idle warms the
  // four popular chunks, and js/home-tools.js is dropped because a tool page
  // never renders the homepage's name-only blocks.
  const CAT_DATA_FILE = {
    finance: 'finance', health: 'health', math: 'math', everyday: 'everyday',
    science: 'science', engineering: 'engineering', construction: 'construction',
    conversion: 'conversion', business: 'business', education: 'education',
    utilities: 'utilities', lifestyle: 'lifestyle', regional: 'regional',
    food: 'food-nutrition', fitness: 'fitness-exercise', auto: 'auto-transport',
    career: 'career-freelance', homegarden: 'home-garden', tech: 'tech-digital',
    family: 'parenting-family'
  };
  const ownFile = CAT_DATA_FILE[catKey];
  if (ownFile) {
    const ownTag = '<script defer src="js/data/' + ownFile + '.js"></script>';
    if (page.indexOf(ownTag) === -1) {
      // Must land BEFORE js/data.js: that file reads the globals the chunk defines
      // (FINANCE_TOOLS, …) when it builds CALC_DATA, and before data-loader.js so
      // the loader sees the populated category and skips an extra fetch.
      const anchor = '<script defer src="js/data.js"></script>';
      if (page.indexOf(anchor) !== -1) page = page.replace(anchor, ownTag + '\n  ' + anchor);
    }
    // The homepage bootstrap is homepage-only; a tool page never needs the seeds.
    page = page.replace('<script defer src="js/home-tools.js"></script>', '');
  }
  page = rewriteSchema(page, buildToolSchema(tool, catKey, canonPath));
  page = rewriteMain(page, buildToolContent(tool, catKey));
  // INTERNAL-LINK BOOST: append 6 deterministic same-category tool links after
  // the main content (AFTER rewriteMain — it replaces #mainContent). 279 tool
  // pages had ZERO static inlinks (crawlers treat them as dead-ends →
  // 'Discovered/Unknown' stagnation); this guarantees every tool page ≥6 static
  // inlinks from category siblings. Deterministic rotation (stride 7) keeps the
  // graph stable across builds.
  {
    // BUGFIX (build-hang): purana loop `for (let k = 1; picks.length < 6; k++)`
    // UNBOUNDED tha — jab sibs.length % 7 === 0 (7/14/21/28...) stride-7 sirf
    // 1-2 indexes repeat karta hai, picks.size kabhi 6 nahi pahunchta →
    // infinite loop → SSG hang → build-deploy ads.txt ke baad atak jata tha.
    // Ab k bounded hai aur UNIQUE INDEXES par pick hota hai (guaranteed
    // termination + guaranteed 6 unique picks jab siblings ≥6 hain).
    const sibs = tools.filter(x => x.cat === catKey && x.id !== tool.id);
    const at = tools.findIndex(x => x.id === tool.id);
    const want = Math.min(6, sibs.length);
    const used = new Set();
    const picks = [];
    // Pass 1 (stride-7 rotation): k is BOUNDED (<= sibs.length) — period of the
    // sequence is sibs.length/gcd(sibs.length,7), jo hamesha <= sibs.length hota
    // hai, to ye loop hamesha terminate hota hai.
    for (let k = 1; picks.length < want && k <= sibs.length; k++) {
      const idx = ((at + k * 7) % sibs.length + sibs.length) % sibs.length;
      if (used.has(idx)) continue;
      used.add(idx);
      picks.push(sibs[idx]);
    }
    // Pass 2 (sequential fill): jab sibs.length % 7 === 0 stride pass sirf
    // sibs.length/7 distinct deta hai — baaqi slots sequential unique se bharo.
    for (let idx = 0; picks.length < want && idx < sibs.length; idx++) {
      if (used.has(idx)) continue;
      used.add(idx);
      picks.push(sibs[idx]);
    }
    if (picks.length) {
      // Depth-2: last link = category guide-hub (no-slash, sitemap form) — weak
      // hub-guides ko har tool page se ek inlink milta hai.
      const hub = GUIDE_HUB[catKey];
      const more = '<div class="tool-more-links"><h2>More ' + esc(CAT_NAME[catKey] || catKey) + ' Calculators</h2>' +
        '<p>' + picks.map(x => '<a href="/' + catKey + '/' + x.id + '/">' + esc(x.name) + '</a>').join(' · ') +
        (hub ? ' · <a href="' + hub + '">' + esc(CAT_NAME[catKey] || catKey) + ' Guides</a>' : '') + '</p></div>';
      page = rewriteMainAppend(page, more);
    }
  }
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
  // Featured interactive math tools — real, working pages that complement the
  // formula calculators below (also linked site-wide from the nav + footer).
  if (catKey === 'math') {
    content += '<div class="cat-featured"><p><strong>Interactive math tools:</strong> <a href="/graph">Function Grapher</a> — plot y = f(x) instantly and see where it crosses zero · <a href="/geometry-lab">Interactive Geometry Lab</a> — drag a triangle and watch sides, angles, perimeter and area update live.</p></div>';
  }
  // Category-hub inlinks for the four highest-impression, zero-click pages.
  // Mirror of the same block in js/app.js — the prerendered page and the
  // client-rendered page must carry identical markup.
  if (catKey === 'finance') {
    content += '<div class="cat-featured"><p><strong>Most-used money calculators:</strong> <a href="/finance/apy-calculator/">APY Calculator</a> — the annual percentage yield a nominal rate actually pays once compounding is counted · <a href="/finance/pmi-calculator/">PMI Calculator</a> — the private mortgage insurance a low-down-payment loan adds to the monthly bill · <a href="/finance/fha-loan/">FHA Loan Calculator</a> — the monthly payment with FHA mortgage insurance included.</p></div>';
  }
  if (catKey === 'lifestyle') {
    content += '<div class="cat-featured"><p><strong>Household cost calculators:</strong> <a href="/lifestyle/home-insurance/">Home Insurance Calculator</a> — turn your home value and an annual rate into the premium you should expect to pay.</p></div>';
  }
  // How this category's numbers are produced (also shown on each tool page).
  content += CategoryMethodology.methodologyHtml(catKey);
  content += '<div class="tools-grid">';
  catTools.slice(0, 48).forEach(t => {
    content += '<div class="tool-card" data-tool-id="' + escAttr(t.id) + '"><h2><a href="/' + catKey + '/' + t.id + '/">' + esc(t.name) + '</a></h2><p>' + esc(String(t.desc || '').substring(0, 100)) + '</p></div>';
  });
  content += '</div>';
  // DEPTH-2 INLINK BOOST: category-hub guides sirf 1-2 inlinks se weak the —
  // category page khud apne hub ko link karta hai (no-slash = sitemap form).
  if (GUIDE_HUB[catKey]) {
    content += '<div class="cat-guide-link"><p>Formulas, worked examples aur edge cases ke liye: <a href="' + GUIDE_HUB[catKey] + '">' + esc(CAT_NAME[catKey] || catKey) + ' guides</a></p></div>';
  }
  // Category-level FAQ — MOVED here from /hub/<cat>/ (one owner per block: the
  // two pages used to render the identical FAQ, methodology note and catalog).
  content += CategoryDepth.faqHtml(catKey);

  let page = rewriteHead(SHELL, { title, desc, canonical: canonPath, ogTitle: title, ogDesc: desc });
  const catFaq = CategoryDepth.faqSchema(catKey);
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
        '@type': 'ListItem', position: i + 1, name: t.name, url: DOMAIN + '/' + catKey + '/' + t.id + '/'
      }))
    }
  }, ...(catFaq ? [{ ...catFaq, url: DOMAIN + canonPath }] : [])], null, 2);
  page = rewriteSchema(page, catSchema);
  page = rewriteMain(page, content);
  writePage(catKey, page);
}

// 7c. Hub pages (20)
for (const catKey of Object.keys(CATEGORY_META)) {
  const meta = CATEGORY_META[catKey];
  const catTools = tools.filter(t => t.cat === catKey);
  const title = CAT_NAME[catKey] + ' Calculators Comparison — CalcPro';
  // The hub needs its own description: reusing the category sentence made
  // /finance and /hub/finance share a meta description verbatim, which is a
  // duplicate-content signal on the pair meant to target different intents.
  // Stating the count and the comparison purpose keeps it distinct and short.
  const hubDesc = 'All ' + catTools.length + ' ' + CAT_NAME[catKey] + ' calculators in one comparison table, with the formula and a worked example for each.';
  const desc = hubDesc.length <= 150 ? hubDesc : meta.desc;
  const canonPath = '/hub/' + catKey;

  let content = '<div class="breadcrumb"><a href="/">Home</a> › <a href="/' + catKey + '/">' + esc(CAT_NAME[catKey]) + '</a> › Comparison</div>';
  content += '<div class="tool-header"><h1>' + esc(CAT_NAME[catKey]) + ' Calculators Comparison</h1><p class="tool-desc">' + esc(desc) + '</p></div>';
  // DE-DUPLICATION (see docs/DUPLICATE-HUBS-FIX.md): the hub keeps only the
  // blocks the category page does NOT render. The shared methodology note, the
  // 48-card catalog grid and the category FAQ used to ship on both pages, which
  // made a pair ~80% identical 5-grams. The methodology note and the FAQ now
  // live on /<cat>/ (+ every tool page); the grid is replaced below by a
  // comparison table whose columns (what it works out / what you enter) exist
  // nowhere else, while every row still links its tool page.
  // Depth block: category-specific intro + "what you can work out" list. Hubs
  // were thin boilerplate (Google crawled without indexing), so this is the
  // unique content that makes the page worth indexing in its own right.
  content += CategoryDepth.introHtml(catKey);
  content += CategoryDepth.compareTableHtml(catKey, catTools.slice(0, 48));
  content += '<div class="cat-guide-link"><p>Prefer the annotated list? <a href="/' + catKey + '/">Browse the full list with one line on what each calculator does</a>.</p></div>';

  let page = rewriteHead(SHELL, { title, desc, canonical: canonPath, ogTitle: title, ogDesc: desc });
  const hubSchema = JSON.stringify([{
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: DOMAIN + '/' },
      { '@type': 'ListItem', position: 2, name: CAT_NAME[catKey] || catKey, item: DOMAIN + '/' + catKey + '/' },
      { '@type': 'ListItem', position: 3, name: 'Comparison', item: DOMAIN + canonPath }
    ]
  }, {
    // ItemList mirrors the comparison table rows actually rendered above.
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: title, description: desc, url: DOMAIN + canonPath,
    mainEntity: {
      '@type': 'ItemList', numberOfItems: catTools.length,
      itemListElement: catTools.slice(0, 48).map((t, i) => ({
        '@type': 'ListItem', position: i + 1, name: t.name, url: DOMAIN + '/' + catKey + '/' + t.id + '/'
      }))
    }
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
  // These variants are noindex, but a 70-90 char description still rendered a
  // stub in analytics previews; build a full sentence that names the pre-filled
  // context instead of appending a fragment to the tool blurb.
  const toolBlurb = String(tool.desc || '').replace(/\s+$/, '').replace(/\.$/, '');
  const rawDesc = `${tool.name} with ${parsed.ctx} pre-filled: ${toolBlurb}. Every step of the working is shown, and nothing is uploaded.`;
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
    // Anchor text deliberately avoids repeating "calculator" 20x: an external
    // audit read the homepage as 6.6% keyword density (stuffed) and 48 of the 86
    // hits were these generated link labels, not editorial copy.
    return '<a class="home-cat-link" href="/' + catKey + '/">' + esc(name) + ' (' + count + ' tools)</a>';
  }).join('\n    ');
  const hubLinks = Object.keys(CATEGORY_META).map(catKey => {
    const name = CAT_NAME[catKey] || catKey;
    return '<a class="home-cat-link" href="/hub/' + catKey + '/">Compare ' + esc(name) + ' options</a>';
  }).join('\n    ');
  // APPEND crawlable content AFTER the static hero + boot skeleton (preserving
  // the LCP-optimized hero and the CLS-safe skeleton that renderHome() reuses).
  // The SPA replaces #mainContent on boot anyway; this static block gives crawlers
  // a real crawl path to every category and hub without touching the hero.
  // NO FAQ HERE. The shell (index.html) already ships a visible 15-question FAQ
  // section AND its FAQPage JSON-LD. This block used to add a sixth block of the
  // same five questions plus a SECOND FAQPage script, so the deployed homepage
  // carried two "Frequently asked questions" headings and two FAQ schemas —
  // duplicate content on the site's most important URL, and the main reason an
  // external audit counted 35 headings and heavy keyword repetition on it.
  // One owner per block: the FAQ stays in index.html, this adds only the crawl
  // path (category + hub links) and the "Why" paragraph the shell does not have.
  const content = '<h2 class="section-title">All Categories</h2><div class="home-cat-links">' + catLinks + '</div>' +
    '<h2 class="section-title">Category Comparisons</h2><div class="home-cat-links">' + hubLinks + '</div>' +
    '<h2 class="section-title">Why These Tools Are Different</h2>' +
    '<p>Every page shows its formula, a worked example, and the assumptions behind the result, so you can check the numbers. Everything is computed in your browser and never leaves your device.</p>' +
    '<h2 class="section-title">How to Pick the Right One</h2>' +
    '<p>Start with the question you want answered, not with the list. Comparing offers? Open the loan or mortgage page. Checking a health number? Open the BMI or calorie page. Each page names the inputs it needs, the formula it uses, and the unit it returns.</p>' +
    '<p>Then check the assumptions. Rates, prices and guidelines move, so every page states the defaults it ships with and lets you replace them. A result is only as good as the numbers you type.</p>' +
    '<p>Finally, keep the working. Copy the share link to save a scenario, export CSV to move the numbers into a spreadsheet, or print to PDF when you need a record. Nothing is uploaded, so the same inputs always return the same answer.</p>' +
    '<p class="tool-reviewed">Last updated <time datetime="' + CONTENT_DATE + '">' + esc(CONTENT_MONTH) + '</time></p>';
  // Shell with the FULL inline CSS preserved (see SHELL_HOME above) — the
  // homepage is a single page load, so inlining wins; prerendered routes reuse
  // the cached external stylesheet instead.
  let page = rewriteHead(SHELL_HOME, {
    // Title keyword placement (2026-10-17): an external audit measured the old
    // title as "primary term 34 chars in" and only 45 characters long. The head
    // term now leads the string and the total sits in the 50-60 char window.
    title: 'Calculators: ' + TOTAL_PLUS + ' Free Online Tools — CalcProMaster',
    // 140-160 chars, opens on the head term and ends on a call to action — the
    // audit flagged the previous 188-char string for both length and no CTA.
    // Leads on the head terms instead of "Free online …", which is the shape an
    // external snippet audit showed Google rewriting. Must stay byte-identical
    // to index.html and js/data.js.
    desc: 'Calculators for loans, mortgages, BMI, tax and unit conversion — ' + TOTAL_PLUS + ' tools that show the formula and every step. Try one now, no sign-up.',
    canonical: '/', ogTitle: 'Calculators: ' + TOTAL_PLUS + ' Free Online Tools — CalcProMaster',
    // Homepage keeps the broad head terms; every other page derives its own from
    // its title (see deriveKeywords) instead of inheriting this list.
    keywords: 'calculators, online calculators, free online calculators, calculator with steps, ' + TOTAL_PLUS + ' calculators, loan emi calculator, mortgage calculator, bmi calculator, percentage calculator, unit converter, tax calculator',
    ogDesc: TOTAL_PLUS + ' free online calculators with step-by-step solutions, formulas and charts. No sign-up, no tracking.'
  });
  page = rewriteMainAppend(page, content);
  // No second FAQPage script: index.html's own FAQPage is the single schema for
  // this URL (two identical FAQ schemas on one page is a duplicate-block signal,
  // not extra coverage).
  writePage('', page);
}

// ---------- 8. Report ----------
console.log('SSG complete: ' + written + ' static pages written under deploy/');
const cats = Object.keys(CATEGORY_META).length;
console.log('  tools: ' + tools.length + ' · categories: ' + cats + ' · hubs: ' + cats + ' · long-tail: ' + LONGTAIL.length + ' · noindex dashboards: 3');
