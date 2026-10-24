#!/usr/bin/env node
// UberSuggest research pass — turns the five competitor keyword-gap exports plus
// the two site-level UberSuggest exports into one decision-ready dataset.
//
// Inputs (Downloads, read-only):
//   keywords gap for calculator.net (1).csv      2000 rows — head competitor
//   keywords gap for omnicalculator.com.csv      2000 rows — long-tail depth
//   keywords gap for calculatorsoup.com (1).csv  2000 rows — math/date depth
//   keywords gap for rapidtables.com.csv         2000 rows — conversion depth
//   keywords gap for calculator.io.csv            640 rows — modern UI competitor
//   ubersuggest calculator.csv                    502 rows — head "calculator" terms
//   ubersuggest CalcProMaster Suggested Keywords.csv  50 rows — site-specific ideas
//   ubersuggest opportunity backlinks.csv / refDomains.csv  500 rows each
//
// Outputs:
//   data/ubersuggest-research-2026-10-18.json   machine-readable
//   docs/UBERSUGGEST-RESEARCH-2026-10-18.md     human report (written separately)
//
// The matching rule is deliberately conservative: a keyword only counts as
// covered when every meaningful token appears in one live page slug. A wrong
// "covered" hides a real gap; a wrong "missing" only costs one review line.
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const DL = path.join(os.homedir(), 'Downloads');
const OUT_JSON = path.join(ROOT, 'data', 'ubersuggest-research-2026-10-18.json');

const SOURCES = [
  ['calculator.net', 'keywords gap for calculator.net (1).csv'],
  ['omnicalculator.com', 'keywords gap for omnicalculator.com.csv'],
  ['calculatorsoup.com', 'keywords gap for calculatorsoup.com (1).csv'],
  ['rapidtables.com', 'keywords gap for rapidtables.com.csv'],
  ['calculator.io', 'keywords gap for calculator.io.csv'],
];
const HEAD_FILE = 'ubersuggest calculator.csv';
const SITE_FILE = 'ubersuggest CalcProMaster Suggested Keywords.csv';
const BACKLINK_FILE = 'ubersuggest opportunity backlinks.csv';
const REFDOMAIN_FILE = 'ubersuggest opportunity refDomains.csv';

// ---------------------------------------------------------------- CSV parser
// Quote-aware: the backlink export contains commas inside quoted URLs.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift().map((h) => h.trim());
  return rows.filter((r) => r.length > 1 || (r[0] || '').trim()).map((r) => {
    const o = {};
    header.forEach((h, i) => { o[h] = (r[i] || '').trim(); });
    return o;
  });
}

// ------------------------------------------------------------- tokenisation
const STOP = new Set(['a', 'an', 'the', 'of', 'for', 'to', 'in', 'on', 'by', 'with', 'and', 'or', 'is', 'are', 'my', 'your', 'how', 'much', 'many', 'what', 'do', 'i', 'you', 'me', 'it', 'from', 'at', 'as']);
const GENERIC = new Set([
  'calculator', 'calculators', 'calc', 'online', 'free', 'best', 'easy', 'simple', 'quick',
  'tool', 'tools', 'estimate', 'estimator', 'estimation', 'calculate', 'calculation',
  'compute', 'solver', 'solve', 'checker', 'value', 'result', 'results', 'chart', 'table',
  'converter', 'convert', 'conversion', 'finding', 'find', 'use', 'using', 'way',
]);
// Off-intent: a shopper/watcher/developer query, not a calculation the site answers.
const OFF_INTENT = new Set([
  'download', 'apk', 'app', 'apps', 'playstore', 'install', 'installer', 'offline',
  'casio', 'sharp', 'orpat', 'xiaomi', 'citizen', 'flipkart', 'amazon', 'zepto', 'buy',
  'price', 'prices', 'under', 'near', 'shop', 'store', 'repair', 'battery', 'cover',
  'pouch', 'box', 'keychain', 'watch', 'wrist', 'model', 'models', 'digital', 'pink',
  'logo', 'icon', 'emoji', 'font', 'wallpaper', 'image', 'pic', 'photo', 'drawing', '3d',
  'png', 'code', 'python', 'javascript', 'java', 'html', 'css', 'switch', 'case', 'c',
  'program', 'project', 'tutorial', 'source', 'github', 'excel', 'tally', 'sheets',
  'hsn', 'gst', 'spelling', 'meaning', 'hindi', 'marathi', 'urdu', 'joke', 'jokes', 'meme',
  'quotes', 'movie', 'song', 'video', 'game', 'games', 'trick', 'tricks', 'hack', 'hacks',
  'shortcut', 'keyboard', 'movie', 'shukla', 'kapil', 'aaaa', 'zz', '0000', '07734', '80085',
  'lock', 'hider', 'hide', 'vault', 'gallery', 'secret', 'mod', 'pro', 'premium',
  'simulator', 'voice', 'talking', 'print', 'printer', 'scanner', 'billing', 'machine',
  'compass', 'geometry', 'pencil', 'notepad', 'writing', 'pad', 'shop', 'online', 'store',
]);
// Verticals the site actually serves (keeps a "mortgage" or "bmi" query in scope
// and a "blox fruit" query out).
const SITE_VERTICALS = new Set([
  'finance', 'loan', 'mortgage', 'interest', 'bmi', 'bmr', 'tdee', 'calorie', 'protein',
  'pregnancy', 'date', 'time', 'age', 'math', 'fraction', 'percent', 'area', 'volume',
  'concrete', 'tile', 'paint', 'roof', 'electricity', 'vat', 'tax', 'salary', 'gpa',
  'grade', 'currency', 'unit', 'length', 'weight', 'temperature', 'speed', 'density',
  'bmr', 'body', 'sleep', 'water', 'fuel', 'mileage', 'discount', 'tip', 'odds',
  'probability', 'statistics', 'standard', 'deviation', 'ratio', 'compound', 'savings',
  'retirement', 'investment', 'roi', 'cagr', 'emi', 'amortization', 'lease', 'apr',
  'apy', 'inflation', 'gst', 'hst', 'payroll', 'overtime', 'hours', 'business', 'days',
  'week', 'month', 'year', 'baby', 'ovulation', 'due', 'conception', 'macro', 'fiber',
  'carb', 'fat', 'sodium', 'vitamin', 'bmi', 'bsa', 'gfr', 'a1c', 'heart', 'pace',
  'hydration', 'paint', 'flooring', 'gravel', 'mulch', 'sod', 'fence', 'deck', 'stair',
  'drywall', 'insulation', 'btu', 'ac', 'heater', 'solar', 'wire', 'voltage', 'ohm',
  'resistor', 'bandwidth', 'subnet', 'hex', 'binary', 'roman', 'scientific', 'matrix',
  'slope', 'distance', 'midpoint', 'triangle', 'circle', 'cylinder', 'sphere', 'cone',
  'logarithm', 'log', 'exponent', 'root', 'square', 'cube', 'quadratic', 'polynomial',
  'prime', 'factor', 'lcm', 'gcd', 'mean', 'median', 'mode', 'range', 'z', 'p',
]);
const SYN = new Map([
  ['paycheck', 'salary'], ['pay', 'salary'], ['payroll', 'salary'], ['wage', 'salary'],
  ['wages', 'salary'], ['stub', 'salary'], ['lender', 'loan'], ['borrowing', 'loan'],
  ['int', 'interest'], ['maths', 'math'], ['mathematical', 'math'],
  ['grader', 'grade'], ['grading', 'grade'], ['measuring', 'measure'], ['solving', 'solve'],
  ['dating', 'date'], ['pricing', 'price'], ['valuing', 'value'], ['rating', 'rate'],
  ['amortisation', 'amortization'], ['cement', 'concrete'], ['sq', 'square'],
  ['ft', 'foot'], ['feet', 'foot'], ['graphical', 'graph'], ['graphing', 'graph'],
  ['worked', 'hours'], ['working', 'hours'], ['timesheet', 'hours'], ['deduction', 'deductions'],
  ['converting', 'convert'], ['converter', 'convert'], ['conversion', 'convert'],
  ['calculating', 'calculate'], ['calculation', 'calculate'], ['estimating', 'estimate'],
  ['kgs', 'kg'], ['lbs', 'lb'], ['pounds', 'lb'], ['inches', 'inch'], ['cms', 'cm'],
  ['metres', 'meter'], ['meters', 'meter'], ['litres', 'liter'], ['liters', 'liter'],
]);
const tokens = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s-]+/g, ' ').split(/[\s-]+/).filter(Boolean);
const stem = (t) => {
  if (t.length >= 5 && t.endsWith('ing')) {
    const base = t.slice(0, -3);
    return /([a-z])\1$/.test(base) ? base.slice(0, -1) : base;
  }
  if (t.length >= 4 && t.endsWith('ies')) return t.slice(0, -3) + 'y';
  return t.length >= 4 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t;
};
const canon = (t) => {
  let out = t;
  for (let i = 0; i < 3; i++) {
    const next = SYN.get(out) || stem(out);
    if (next === out) break;
    out = next;
  }
  return out;
};
// GENERIC words (calculator, online, free…) never help identify a page: every
// slug would have to contain them, which only the homepage-ish pages do. They
// are dropped here, so "age calculator" reduces to {age} and matches /everyday/age/.
const keyTokens = (s) => tokens(s).map(canon).filter((t) => t.length >= 2 && !STOP.has(t) && !GENERIC.has(t));
// Clock/weather/navigation phrasings are not calculations even though they share
// a word with a tool we own ("time now uk" is a world clock, not time arithmetic).
const OFF_PHRASE = [
  /\btime now\b/, /\bcurrent time\b/, /\bwhat time\b/, /\bclock\b/, /\bweather\b/,
  // World-clock queries ("time in pakistan", "est time") are timezone lookups,
  // not time arithmetic, even though they share the word "time".
  /\btime (in|of|for) [a-z]+/, /\b[a-z]+ time\b/, /\btime zone\b/,
  /\bdice\b/, /\brandom number\b/, /\bpassword\b/, /\blove\b/, /\bzodiac\b/, /\bblox\b/, /\bmovie\b/, /\bsong\b/,
];
const isOffIntent = (s) => {
  const t = tokens(s);
  return t.some((x) => OFF_INTENT.has(x)) || OFF_PHRASE.some((re) => re.test(s.toLowerCase()));
};

// -------------------------------------------------------- live page inventory
function loadPages() {
  const sm = path.join(ROOT, 'deploy', 'sitemap.xml');
  if (!fs.existsSync(sm)) throw new Error('deploy/sitemap.xml missing — build first');
  const xml = fs.readFileSync(sm, 'utf8');
  const pages = [];
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const url = m[1].trim();
    let p;
    try { p = new URL(url).pathname; } catch { continue; }
    const slug = p.replace(/^\/|\/$/g, '');
    if (!slug) continue;
    pages.push({ url, path: '/' + slug + '/', slug, tokens: keyTokens(slug.replace(/\//g, ' ')) });
  }
  return pages;
}

// Two tiers, because a wrong "missing" wastes a build and a wrong "covered"
// hides a gap:
//   exact   — one page slug holds every keyword token ("bmi" ⊂ "bmi calculator")
//   variant — the page slug is a strict subset of the keyword and keeps the head
//             term ("bmi female" → /health/bmi/). The page already answers the
//             intent; it needs a section/H2, not a new URL.
// Anything else is a genuine gap.
// Hubs are not tools: /stats and /guides/ are single-token index pages that
// “contain” any keyword sharing that word. Treating them as coverage would hide
// real gaps, so they never match and they never count as a tool page.
const HUB = /^\/(stats|guides|blog|about|privacy|terms|contact|embed|search|category|calculators?)\/?$/;
const NOISE_EXTRA = new Set(['xe', 'net', 'now', 'uk', 'us', 'british', 'united', 'kingdom', 'love', 'google', 'app', 'online', 'free', 'download', 'best', 'my', 'me', 'calculator', 'calculators']);

// Lazy text index over the built pages, so a “variant” verdict is evidence-based:
// the phrase only counts as answered when the qualifier words appear in the
// page's visible text. Reading 1,400 files up front would be wasteful; only
// candidates that survive the slug test are read, and each is cached.
const textCache = new Map();
function pageText(p) {
  if (textCache.has(p.path)) return textCache.get(p.path);
  const bases = [
    path.join(ROOT, 'deploy', p.path.replace(/^\//, ''), 'index.html'),
    path.join(ROOT, 'deploy', p.path.replace(/^\//, '').replace(/\/$/, '') + '.html'),
  ];
  let html = '';
  for (const b of bases) {
    if (fs.existsSync(b)) { html = fs.readFileSync(b, 'utf8'); break; }
  }
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .toLowerCase();
  textCache.set(p.path, text);
  return text;
}

function matchPage(kw, pages) {
  const kt = keyTokens(kw);
  if (!kt.length) return null;
  let exact = null, variant = null;
  for (const p of pages) {
    if (p.tokens.length < 2 || HUB.test(p.path)) continue;
    if (kt.every((t) => p.tokens.includes(t))) {
      // Every keyword token present. Prefer the tightest slug, but a guide is not
      // a calculator: "calculator emi" belongs on /finance/loan-emi/, not
      // /guides/emi/, even though the guide slug is shorter.
      const gap = p.tokens.length - kt.length;
      const score = gap + (/^\/(guides|blog)\//.test(p.path) ? 5 : 0);
      if (!exact || score < exact.score) exact = { ...p, score, match: 'exact' };
      continue;
    }
    // Variant: the page's tool noun (last slug token, e.g. “area”, “bmi”) appears
    // in the phrase and the phrase adds qualifiers. Candidate for a section on
    // that page — a lead to verify, never proof of coverage.
    const noun = p.tokens[p.tokens.length - 1];
    if (!kt.includes(noun)) continue;
    // The phrase has to lead with a word this page owns. Without this, "birth
    // date" lands on carbon-dating and "mutual fund" on a chit-fund page, only
    // because they share a tail noun.
    if (!p.tokens.includes(kt[0])) continue;
    // A brand/filler word anywhere in the phrase ("calculator net age") makes the
    // whole row unusable as content evidence — not just when it is the qualifier.
    if (kt.some((t) => NOISE_EXTRA.has(t))) continue;
    const extra = kt.filter((t) => !p.tokens.includes(t));
    if (extra.length < 1 || extra.length > 3) continue;
    // Brand/filler qualifiers do not describe page content ("calculator net age",
    // "time now uk"); they would invent section work that helps nobody.
    if (extra.some((t) => NOISE_EXTRA.has(t))) continue;
    const text = pageText(p);
    const answered = extra.every((t) => text.includes(t));
    // Score: words the page already shares are good; words the phrase adds are a
    // small cost (that is the section to write); words the page carries that the
    // phrase never mentions are a bigger cost (wrong-topic risk). Guides lose to
    // tools because a tool page is where the calculator intent belongs.
    const shared = p.tokens.filter((t) => kt.includes(t)).length;
    const unexplained = p.tokens.slice(1).filter((t) => !kt.includes(t)).length;
    const score = shared * 10 - extra.length * 2 - unexplained * 4 - (/^\/(guides|blog)\//.test(p.path) ? 10 : 0);
    const candidate = { ...p, score, extra, match: answered ? 'covered' : 'section-gap' };
    if (!variant || score > variant.score || (score === variant.score && candidate.match === 'section-gap')) {
      variant = candidate;
    }
  }
  return exact || variant;
}

// ------------------------------------------------------------------- loading
function read(name) {
  const p = path.join(DL, name);
  if (!fs.existsSync(p)) return null;
  return parseCsv(fs.readFileSync(p, 'utf8'));
}
const num = (v) => Number(String(v || '0').replace(/[$,]/g, '')) || 0;

const pages = loadPages();
const pageByUrl = new Map(pages.map((p) => [p.url, p]));

// keyword -> aggregated competitor evidence
const kwMap = new Map();
const addKw = (kw, src, row) => {
  // Collapse repeated whitespace: the exports contain rows that look identical
  // but differ by a double space, which would double-count volume.
  const key = kw.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!key) return;
  let e = kwMap.get(key);
  if (!e) {
    e = { keyword: kw.trim(), volume: 0, cpc: 0, kd: 0, competitors: {}, bestPosition: null, bestUrl: null };
    kwMap.set(key, e);
  }
  e.volume = Math.max(e.volume, num(row.Volume));
  e.cpc = Math.max(e.cpc, num(row.CPC));
  const kd = num(row['SEO Difficulty']);
  if (kd) e.kd = kd;
  const pos = num(row.Position);
  if (pos) {
    e.competitors[src] = Math.min(e.competitors[src] || 999, pos);
    if (e.bestPosition === null || pos < e.bestPosition) {
      e.bestPosition = pos;
      e.bestUrl = row['Ranking URL'] || null;
    }
  }
};

const sourceStats = {};
for (const [src, file] of SOURCES) {
  const rows = read(file);
  sourceStats[src] = rows ? rows.length : 0;
  if (!rows) continue;
  for (const r of rows) addKw(r.Keyword, src, r);
}

const headRows = read(HEAD_FILE) || [];
const extras = [];
for (const r of headRows) {
  const kw = r.Keyword;
  if (!kw) continue;
  const e = kwMap.get(kw.toLowerCase()) || { keyword: kw, volume: num(r.Volume), cpc: num(r.CPC), kd: num(r['SEO Difficulty']), competitors: {}, bestPosition: null, bestUrl: null };
  e.volume = Math.max(e.volume, num(r.Volume));
  e.cpc = Math.max(e.cpc, num(r.CPC));
  kwMap.set(kw.toLowerCase(), e);
  extras.push({ keyword: kw, volume: num(r.Volume), cpc: num(r.CPC), kd: num(r['SEO Difficulty']), paidDifficulty: num(r['Paid Difficulty']) });
}

const siteRows = read(SITE_FILE) || [];
const siteSuggestions = siteRows.map((r) => ({
  keyword: r.Keyword,
  volume: num(r.Volume),
  cpc: num(r.CPC),
  kd: num(r['SEO Difficulty']),
  paidDifficulty: num(r['Paid Difficulty']),
  covered: !!matchPage(r.Keyword, pages),
}));

// ------------------------------------------------------ PKR cluster (site-level)
// The "CalcProMaster Suggested Keywords" export is UberSuggest's own read on what
// this domain can rank for. It is 100% Pakistan-rupee conversion, and its volumes
// are an order of magnitude above the competitor exports — a different (and much
// larger) query pool, so it is counted separately rather than mixed in.
const PKR_SOURCE = [
  [/\b(usd|us dollar|usd dollar|dollar|americans?|america)\b/, 'usd'],
  [/\b(eur|euro|euros)\b/, 'eur'],
  [/\b(gbp|pound|pounds|sterling|british)\b/, 'gbp'],
  [/\b(aed|dirham|dirhams|emirati)\b/, 'aed'],
  [/\b(sar|riyal|riyals|rial|saudi)\b/, 'sar'],
  [/\b(cad)\b/, 'cad'],
  [/\b(aud)\b/, 'aud'],
  [/\b(inr|indian rupee)\b/, 'inr'],
];
const pkrPairs = new Map();
for (const row of siteSuggestions) {
  const kw = row.keyword.toLowerCase();
  if (!/\b(pak|pakistan|pkr|rupee|rupees|rs)\b/.test(kw)) continue;
  const src = PKR_SOURCE.find(([re]) => re.test(kw));
  if (!src) continue;
  const code = src[1];
  if (code === 'inr') continue; // INR→PKR is a cross-rate, not the national pair
  const key = code + '-to-pkr';
  if (!pkrPairs.has(key)) pkrPairs.set(key, { pair: key, phrasings: 0, maxVolume: 0, minKd: 99, topKeyword: null });
  const P = pkrPairs.get(key);
  P.phrasings++;
  if (row.volume > P.maxVolume) { P.maxVolume = row.volume; P.topKeyword = row.keyword; }
  if (row.kd && row.kd < P.minKd) P.minKd = row.kd;
}
const pkrPlan = [...pkrPairs.values()].sort((a, b) => b.maxVolume - a.maxVolume);
const pkrVolume = pkrPlan.reduce((s, p) => s + p.maxVolume, 0);

// --------------------------------------------------------------- classification
const covered = [];
const missing = [];
const sectionGaps = [];
const offIntent = [];
for (const e of kwMap.values()) {
  if (!e.volume && !e.bestPosition) continue;
  const page = matchPage(e.keyword, pages);
  const rec = {
    keyword: e.keyword,
    volume: e.volume,
    cpc: Math.round(e.cpc * 100) / 100,
    kd: e.kd,
    bestPosition: e.bestPosition,
    rivals: Object.entries(e.competitors).map(([s, p]) => s + '@' + p),
  };
  // Off-intent wins over a weak page match: "time in pakistan" is a world clock
  // and "scientific casio" is hardware, so neither justifies editing a page.
  const off = isOffIntent(e.keyword) && !(page && page.match === 'exact');
  if (off) offIntent.push(rec);
  else if (page && page.match === 'section-gap') sectionGaps.push({ ...rec, page: page.path, missingWords: page.extra });
  else if (page) covered.push({ ...rec, page: page.path, match: page.match });
  else missing.push(rec);
}

// Cluster the missing intents so the report recommends pages, not 800 one-offs.
function clusterOf(kw) {
  const t = keyTokens(kw).filter((x) => !GENERIC.has(x));
  return t[0] || 'other';
}
const clusters = new Map();
for (const m of missing) {
  const c = clusterOf(m.keyword);
  if (!clusters.has(c)) clusters.set(c, { cluster: c, keywords: 0, volume: 0, top: [] });
  const cl = clusters.get(c);
  cl.keywords++;
  cl.volume += m.volume;
  cl.top.push(m);
}
for (const cl of clusters.values()) {
  cl.top.sort((a, b) => b.volume - a.volume || a.kd - b.kd);
  cl.top = cl.top.slice(0, 6);
}

// Verticals we serve but have no page for — the only missing clusters worth building.
const buildable = [...clusters.values()]
  .filter((cl) => SITE_VERTICALS.has(cl.cluster) || SITE_VERTICALS.has(stem(cl.cluster)))
  .sort((a, b) => b.volume - a.volume);

// Pages we already own that a competitor proves demand for, ranked by volume.
const optimizable = covered
  .filter((c) => c.volume >= 2000)
  .sort((a, b) => b.volume - a.volume)
  .slice(0, 60);

// High-volume phrases whose head term we already own. These must NOT become new
// URLs — that duplicates the page. They become a section/H2 on the existing URL.
const variants = covered
  .filter((c) => c.match === 'covered' && c.volume >= 2000)
  .sort((a, b) => b.volume - a.volume)
  .slice(0, 80);
const exactCount = covered.filter((c) => c.match === 'exact').length;

// Existing page, qualifier absent from the page's own text: a section/H2 job, not
// a new URL. Sorted by the volume the qualifier phrase carries.
const sectionGapTop = sectionGaps
  .filter((c) => c.volume >= 500)
  .sort((a, b) => b.volume - a.volume)
  .slice(0, 80);

// ------------------------------------------------- programmatic pair analysis
// Unit and currency queries follow an "A to B" shape that one generic hub page
// cannot rank for. rapidtables proves it: 152 pair URLs absorb 661 pair queries.
// This block measures the same shape across every source so the build decision is
// backed by volume, not by a hunch about "more pages being better".
const FAMILIES = {
  length: ['cm', 'centimetre', 'centimeter', 'mm', 'millimetre', 'millimeter', 'm', 'meter', 'metre', 'km', 'kilometer', 'inch', 'inches', 'in', 'ft', 'foot', 'feet', 'yard', 'yd', 'mile', 'miles', 'nm', 'micron'],
  weight: ['kg', 'kilogram', 'kilo', 'g', 'gram', 'lb', 'lbs', 'pound', 'pounds', 'oz', 'ounce', 'stone', 'ton', 'tonne', 'mg'],
  temperature: ['celsius', 'fahrenheit', 'kelvin', 'c', 'f', 'k'],
  volume: ['ml', 'milliliter', 'l', 'liter', 'litre', 'gallon', 'quart', 'pint', 'cup', 'tbsp', 'tsp', 'fluid', 'oz', 'm3'],
  area: ['sqft', 'sq', 'square', 'acre', 'hectare', 'm2', 'km2', 'sqm', 'sqyd'],
  speed: ['mph', 'kph', 'kmh', 'm/s', 'knot', 'knots', 'mach'],
  data: ['kb', 'mb', 'gb', 'tb', 'byte', 'bit', 'mbit', 'gbit', 'kbps', 'mbps'],
  time: ['second', 'minute', 'hour', 'day', 'week', 'month', 'year', 'ms'],
  energy: ['joule', 'calorie', 'kcal', 'kwh', 'wh', 'btu', 'kj'],
  pressure: ['psi', 'bar', 'pascal', 'kpa', 'mpa', 'atm', 'torr'],
  angle: ['degree', 'radian', 'gradian'],
  currency: ['usd', 'dollar', 'pkr', 'rupee', 'inr', 'eur', 'euro', 'gbp', 'pound', 'aed', 'dirham', 'sar', 'riyal', 'cad', 'aud', 'jpy', 'yen', 'cny', 'rmb', 'bdt', 'taka'],
};
const familyOf = (t) => {
  for (const [f, list] of Object.entries(FAMILIES)) if (list.includes(t)) return f;
  return null;
};
const PAIR_RE = /^([a-z0-9. ]{1,22}?)\s+(?:to|in|into|en)\s+([a-z0-9. ]{1,22})$/;
const pairFamilies = {};
// Unit spellings → the code used in URLs. "centimetres to the inch" and
// "cm to inches" must land on one page, so both collapse to cm-to-in.
const UNIT_CODE = {
  cm: 'cm', centimetre: 'cm', centimeter: 'cm', centimetres: 'cm', centimeters: 'cm',
  mm: 'mm', millimetre: 'mm', millimeter: 'mm', millimetres: 'mm', millimeters: 'mm',
  m: 'm', meter: 'm', metre: 'm', meters: 'm', metres: 'm',
  km: 'km', kilometer: 'km', kilometre: 'km', kilometers: 'km', kilometres: 'km',
  inch: 'in', inches: 'in', in: 'in', '"': 'in',
  ft: 'ft', foot: 'ft', feet: 'ft', "'": 'ft',
  yard: 'yd', yards: 'yd', yd: 'yd',
  mile: 'mi', miles: 'mi', mi: 'mi',
  kg: 'kg', kilogram: 'kg', kilograms: 'kg', kilo: 'kg', kilos: 'kg',
  g: 'g', gram: 'g', grams: 'g', mg: 'mg', milligram: 'mg', milligrams: 'mg',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  oz: 'oz', ounce: 'oz', ounces: 'oz', stone: 'st', stones: 'st',
  ton: 't', tons: 't', tonne: 't', tonnes: 't',
  celsius: 'c', centigrade: 'c', c: 'c', fahrenheit: 'f', f: 'f', kelvin: 'k', k: 'k',
  ml: 'ml', milliliter: 'ml', millilitre: 'ml', milliliters: 'ml', l: 'l', liter: 'l', litre: 'l', liters: 'l', litres: 'l',
  gallon: 'gal', gallons: 'gal', quart: 'qt', quarts: 'qt', pint: 'pt', pints: 'pt',
  cup: 'cup', cups: 'cup', tbsp: 'tbsp', tsp: 'tsp',
  sqft: 'sqft', sq: 'sqft', square: 'sqft', sqm: 'sqm', m2: 'sqm', km2: 'sqkm', acre: 'acre', acres: 'acre', hectare: 'ha', hectares: 'ha',
  mph: 'mph', kph: 'kph', kmh: 'kph', knot: 'kn', knots: 'kn', mach: 'mach',
  kb: 'kb', mb: 'mb', gb: 'gb', tb: 'tb', byte: 'b', bytes: 'b', bit: 'bit', bits: 'bit',
  second: 's', seconds: 's', minute: 'min', minutes: 'min', hour: 'h', hours: 'h',
  day: 'day', days: 'day', week: 'wk', weeks: 'wk', month: 'mo', months: 'mo', year: 'yr', years: 'yr', ms: 'ms',
  usd: 'usd', dollar: 'usd', dollars: 'usd', pkr: 'pkr', rupee: 'pkr', rupees: 'pkr',
  inr: 'inr', eur: 'eur', euro: 'eur', euros: 'eur', gbp: 'gbp',
  aed: 'aed', dirham: 'aed', dirhams: 'aed', sar: 'sar', riyal: 'sar', riyals: 'sar',
  cad: 'cad', aud: 'aud', jpy: 'jpy', yen: 'jpy', cny: 'cny', rmb: 'cny', bdt: 'bdt', taka: 'bdt',
};
const UNIT_FAMILY_OF = (code) => {
  for (const [f, list] of Object.entries(FAMILIES)) {
    if (list.some((u) => UNIT_CODE[u] === code)) return f;
  }
  return null;
};
const pairKeywords = [];
const pairMap = new Map();
for (const e of kwMap.values()) {
  const kw = e.keyword.toLowerCase().trim();
  const m = kw.match(PAIR_RE);
  if (!m) continue;
  const a = m[1].replace(/\b(how many|convert|converting|value of)\b/g, '').trim().split(/\s+/);
  const b = m[2].trim().split(/\s+/);
  const fa = familyOf(a[a.length - 1]);
  const fb = familyOf(b[0]);
  const fam = fa && fa === fb ? fa : (fa === 'currency' || fb === 'currency' ? 'currency' : null);
  if (!fam) continue;
  // Currency is a separate track (live rates, PKR-first, see the pkr block): its
  // pairs cannot ship from the same offline generator as centimetres and pounds.
  if (fam === 'currency') continue;
  const from = UNIT_CODE[a[a.length - 1]];
  const to = UNIT_CODE[b[0]];
  if (from && to && from !== to && UNIT_FAMILY_OF(from) === UNIT_FAMILY_OF(to)) {
    const key = from + '-to-' + to;
    if (!pairMap.has(key)) pairMap.set(key, { family: fam, pair: key, from, to, keywords: 0, volume: 0, maxVolume: 0, minKd: 99, rivalUrl: null, topKeyword: null });
    const P = pairMap.get(key);
    P.keywords++;
    P.volume += e.volume;
    // UberSuggest repeats the same cluster volume on every phrasing ("cm to
    // inch", "cm to an inch", "centimetres to the inch" all report 74,000).
    // Summing them 10×-es the demand, so the plan ranks on the single largest
    // phrasing and keeps the phrasing count as a separate signal.
    if (e.volume > P.maxVolume) { P.maxVolume = e.volume; P.topKeyword = e.keyword; }
    if (e.kd && e.kd < P.minKd) P.minKd = e.kd;
    if (!P.rivalUrl && e.bestUrl) P.rivalUrl = e.bestUrl;
  }
  if (!pairFamilies[fam]) pairFamilies[fam] = { family: fam, keywords: 0, volume: 0, minKd: 99, samples: [] };
  const F = pairFamilies[fam];
  F.keywords++;
  F.volume += e.volume;
  if (e.kd && e.kd < F.minKd) F.minKd = e.kd;
  if (F.samples.length < 5) F.samples.push(e.keyword + ' (' + e.volume.toLocaleString() + ', kd ' + (e.kd || '?') + ')');
  pairKeywords.push({ keyword: e.keyword, volume: e.volume, kd: e.kd, family: fam, rival: e.bestPosition, rivalUrl: e.bestUrl });
}
pairKeywords.sort((a, b) => b.volume - a.volume);
const pairSummary = Object.values(pairFamilies)
  .filter((f) => f.family !== 'currency') // currency = live rates, tracked in the pkr block
  .sort((a, b) => b.volume - a.volume);
const pairPlan = [...pairMap.values()].sort((a, b) => b.maxVolume - a.maxVolume);
const pairVolume = pairPlan.reduce((s, p) => s + p.maxVolume, 0);

// ------------------------------------------------- coverage vs each competitor
// "How much of the leader's top-10 keyword set do we already answer?" — a
// sharper question than raw page count, and it is measured on their own rows.
const coverageByRival = {};
for (const [src, file] of SOURCES) {
  const rows = read(file);
  if (!rows) continue;
  const top = rows.filter((r) => num(r.Position) > 0 && num(r.Position) <= 10 && num(r.Volume) >= 1000);
  let exact = 0, section = 0, gap = 0;
  for (const r of top) {
    const page = matchPage(r.Keyword, pages);
    if (page && page.match === 'section-gap') section++;
    else if (page) exact++;
    else gap++;
  }
  coverageByRival[src] = {
    top10Keywords: top.length,
    top10Volume: top.reduce((s, r) => s + num(r.Volume), 0),
    exact, section, gap,
    answeredPct: top.length ? Math.round(((exact + section) / top.length) * 100) : 0,
  };
}

// ------------------------------------------------------------- backlink layer
function hostOf(u) { try { return new URL(u.startsWith('http') ? u : 'https://' + u).hostname.replace(/^www\./, ''); } catch { return null; } }
const backlinks = (read(BACKLINK_FILE) || []).map((r) => ({
  target: r.Backlink,
  host: hostOf(r.Backlink),
  da: num(r['Domain Authority']),
  pa: num(r['Page Authority']),
}));
const refDomains = (read(REFDOMAIN_FILE) || []).map((r) => ({
  domain: r['Reffering Domain'],
  da: num(r['Domain Authority']),
}));

// Outreach reality check: shorteners, forum threads, random CMS pages and
// scraper mirrors are not link targets. Score what a human could actually pitch:
// an editorial page on a real publication / .edu / .gov / resource list.
const JUNK_HOST = /^(bit\.ly|goo\.gl|tinyurl\.com|cutt\.ly|is\.gd|ow\.ly|tiny\.cc|linktr\.ee|youtu\.be|imgur\.com|dropbox\.com|docs\.google\.com|groups\.google\.com|sites\.google\.com|facebook\.com|twitter\.com|x\.com|pinterest\.com|reddit\.com|quora\.com|answers\.yahoo\.com|answers\.com|justanswer\.com|moodle\.org|canvas\.|instructure\.com|symbaloo\.com|site123\.me|carrd\.co|jimdosite\.com|mystrikingly\.com|webflow\.io|netlify\.app|vercel\.app|pages\.dev|web\.app|workers\.dev|home\.blog|wordpress\.com|blogspot\.com|geocities\.ws|angelfire\.com|neocities\.org|storify\.com|smore\.com|jotform\.com|typeform\.com|link\.|click\.|safelinks|ipfs\.io|translate\.|search\.|www\.search)/;
const JUNK_PATH = /\/(tag|tags|category|categories|search|feed|rss|login|signin|cart|checkout|profile|user|users|members|forum|thread|topic|discussion|comment|comments|reply|archive|author)\b|\?|\/page\/|\/p\//i;
const editorial = [];
for (const b of backlinks) {
  if (!b.host || b.da < 60) continue;
  if (JUNK_HOST.test(b.host)) continue;
  if (JUNK_PATH.test(b.target)) continue;
  if (/\b(forum|thread|topic|discussion|question|answers?)\b/i.test(b.target)) continue;
  editorial.push(b);
}
const outreach = editorial
  .sort((a, b) => b.da - a.da || b.pa - a.pa)
  .slice(0, 40);
const outreachHosts = new Set(outreach.map((b) => b.host));

// ------------------------------------------------------------------- write out
const report = {
  generated: new Date().toISOString(),
  inputs: sourceStats,
  pages: pages.length,
  keywords: kwMap.size,
  covered: covered.length,
  coveredExact: exactCount,
  coveredVariant: covered.length - exactCount,
  sectionGaps: sectionGaps.length,
  // Decision buckets. Head terms (100k+) are owned by calculator.net and
  // Google's own widget; the tail is where a 1,285-page site can actually rank.
  buckets: {
    missingActionable: missing.filter((m) => m.kd > 0 && m.kd <= 40 && m.volume >= 1000)
      .sort((a, b) => b.volume - a.volume).slice(0, 80),
    missingHead: missing.filter((m) => m.volume >= 100000).sort((a, b) => b.volume - a.volume).slice(0, 25),
    missingLowCompetitionHighVolume: missing.filter((m) => m.kd > 0 && m.kd <= 25 && m.volume >= 5000)
      .sort((a, b) => b.volume - a.volume).slice(0, 40),
    sectionGapTop,
  },
  missing: missing.length,
  offIntent: offIntent.length,
  totals: {
    missingVolume: missing.reduce((s, m) => s + m.volume, 0),
    coveredVolume: covered.reduce((s, m) => s + m.volume, 0),
    offIntentVolume: offIntent.reduce((s, m) => s + m.volume, 0),
  },
  siteSuggestions,
  pkr: { plan: pkrPlan, volume: pkrVolume, keywordCount: siteSuggestions.length },
  pairs: { families: pairSummary, plan: pairPlan.slice(0, 120), planVolume: pairVolume, top: pairKeywords.slice(0, 120) },
  coverageByRival,
  buildableClusters: buildable.slice(0, 40),
  missingTop: missing.sort((a, b) => b.volume - a.volume).slice(0, 150),
  optimizable,
  variants,
  backlinks: {
    rows: backlinks.length,
    refDomains: refDomains.length,
    editorialCount: editorial.length,
    outreach,
    topRefDomains: refDomains.sort((a, b) => b.da - a.da).slice(0, 40),
  },
};
fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n');

console.log('sources:', JSON.stringify(sourceStats));
console.log('live pages:', pages.length, '| keywords:', kwMap.size);
console.log('covered:', covered.length, '(exact', exactCount, '+ answered-variant', covered.length - exactCount, ') | section-gaps:', sectionGaps.length, '| missing:', missing.length, '| off-intent:', offIntent.length);
console.log('top section gaps (page exists, qualifier not on the page):');
for (const v of sectionGapTop.slice(0, 12)) console.log('  ', v.page.padEnd(34), String(v.volume).padStart(8), 'kd', String(v.kd).padStart(2), v.keyword, '→ add', v.missingWords.join('+'));
console.log('missing volume:', report.totals.missingVolume.toLocaleString());
console.log('buildable clusters:', buildable.length);
for (const c of buildable.slice(0, 18)) {
  console.log('  ', c.cluster.padEnd(16), String(c.keywords).padStart(4), 'kws', String(c.volume).padStart(9), 'vol |', c.top.slice(0, 2).map((t) => t.keyword + ' (' + t.volume + ', kd ' + t.kd + ')').join('; '));
}
console.log('coverage of each competitor\'s top-10 set:');
for (const [src, c] of Object.entries(coverageByRival)) {
  console.log('  ', src.padEnd(22), 'top10', String(c.top10Keywords).padStart(4), '| answered', c.answeredPct + '%', '| exact', String(c.exact).padStart(4), 'section', String(c.section).padStart(4), 'gap', String(c.gap).padStart(4));
}
console.log('pair families (programmatic candidates):');
for (const f of pairSummary) console.log('  ', f.family.padEnd(12), String(f.keywords).padStart(4), 'kws', String(f.volume).padStart(9), 'vol, min kd', f.minKd);
console.log('editorial backlink targets:', editorial.length, 'of', backlinks.length, '| unique hosts', outreachHosts.size);
// Pair plan CSV — the build list a generator can consume directly.
const csvPath = path.join(ROOT, 'data', 'keyword-gap', 'ubersuggest-pair-plan.csv');
fs.mkdirSync(path.dirname(csvPath), { recursive: true });
const csvRows = ['family,pair_slug,phrasings,top_keyword,monthly_volume,min_kd,rival_url'];
for (const p of pairPlan) {
  csvRows.push([p.family, p.pair, p.keywords, '"' + (p.topKeyword || '') + '"', p.maxVolume, p.minKd === 99 ? '' : p.minKd, p.rivalUrl || ''].join(','));
}
fs.writeFileSync(csvPath, csvRows.join('\n') + '\n');
console.log('PKR pairs (site-level):');
for (const p of pkrPlan) console.log('  ', p.pair.padEnd(12), String(p.maxVolume).padStart(9), 'vol kd', String(p.minKd).padStart(2), '|', p.topKeyword);
console.log('  total', pkrVolume.toLocaleString(), 'across', pkrPlan.length, 'pairs from', siteSuggestions.length, 'phrasings');
console.log('pair plan:', pairPlan.length, 'pairs |', pairVolume.toLocaleString(), 'volume (largest phrasing per pair)');
console.log('pair plan CSV:', path.relative(ROOT, csvPath));
console.log('wrote', path.relative(ROOT, OUT_JSON));
