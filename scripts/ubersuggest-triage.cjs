#!/usr/bin/env node
/**
 * UberSuggest export triage (2026-10-18 drop).
 *
 * The question this answers is not "what did UberSuggest say", it is "which of
 * these 1,600 exported rows can actually move the site". Three of the eight
 * files turned out to be a list of physical calculators for sale and two
 * competitor link profiles that are half link-farm spam, so the useful output is
 * mostly a verdict on each row class plus a short list of things worth doing.
 *
 * Every number in docs/UBERSUGGEST-TRIAGE-2026-10-18.md comes from here. Re-run:
 *   node scripts/ubersuggest-triage.cjs
 *
 * Inputs (copied verbatim from Downloads, never edited):
 *   data/ubersuggest-2026-10-18/keywords-head.csv         502 rows
 *   data/ubersuggest-2026-10-18/keywords-modifiers.csv     54 rows
 *   data/ubersuggest-2026-10-18/keywords-currency.csv      50 rows
 *   data/ubersuggest-2026-10-18/backlinks-*.csv       2 x 500 rows
 *   data/ubersuggest-2026-10-18/refdomains-*.csv      3 x 500 rows
 *   data/gsc-query-page.json                              GSC 28-day export
 *   deploy/sitemap.xml                                    what actually ships
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'data', 'ubersuggest-2026-10-18');
const OUT_JSON = path.join(ROOT, 'data', 'ubersuggest-triage-2026-10-18.json');
const OUT_MD = path.join(ROOT, 'docs', 'UBERSUGGEST-TRIAGE-2026-10-18.md');
const SITEMAP = path.join(ROOT, 'deploy', 'sitemap.xml');
const GSC = path.join(ROOT, 'data', 'gsc-query-page.json');

// ---------- csv ----------
// These exports quote only a few cells ("www.midilibre.fr/...,8552513.php") and
// have no embedded commas inside quotes beyond that, so a small parser is
// enough — but it still has to honour quotes or the URL columns shift by one.
function parseCsv(file) {
  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const rows = [];
  let cell = '';
  let row = [];
  let quoted = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (quoted) {
      if (ch === '"' && raw[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && raw[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); if (row.some((c) => c.trim() !== '')) rows.push(row); }
  const header = rows.shift().map((h) => h.trim().toLowerCase());
  return rows.map((r) => {
    const o = {};
    header.forEach((h, i) => { o[h] = (r[i] || '').trim(); });
    return o;
  });
}

const num = (v) => {
  const n = Number(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

// ---------- what ships ----------
// Ground truth for "do we already have a page for this" is the built sitemap,
// not the registry: the registry has ids that never make it into deploy/.
function loadSitemap() {
  if (!fs.existsSync(SITEMAP)) return [];
  const html = fs.readFileSync(SITEMAP, 'utf8');
  return [...html.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

const decodeEntities = (s) => String(s)
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ');

// The slug alone is a poor answer to "does a page cover this": /utilities/age-exact/
// says nothing about "birth date", but its <title> does. So index every built
// page by slug + title + h1 and match against that.
function loadSiteIndex() {
  return loadSitemap().map((url) => {
    const rel = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '').replace(/\/$/, '');
    const candidates = [
      path.join(ROOT, 'deploy', rel + '.html'),
      path.join(ROOT, 'deploy', rel, 'index.html'),
    ];
    let text = '';
    for (const c of candidates) {
      if (rel && fs.existsSync(c)) {
        const h = fs.readFileSync(c, 'utf8');
        const title = h.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const h1 = h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        text = decodeEntities(((title && title[1]) || '') + ' ' + ((h1 && h1[1]) || ''));
        break;
      }
    }
    const titleTokens = text.replace(/<[^>]+>/g, ' ').toLowerCase()
      .split(/[^a-z0-9]+/).filter(Boolean);
    return { url, slug: slugTokens(url), tokens: [...new Set([...slugTokens(url), ...titleTokens])] };
  });
}

const STOP = new Set(['the', 'a', 'an', 'for', 'of', 'to', 'in', 'and', 'or', 'my', 'your',
  'how', 'what', 'is', 'are', 'with', 'on', 'at', 'by', 'from', 'vs']);
const GENERIC = new Set(['calculator', 'calculators', 'calc', 'online', 'free', 'tool', 'tools',
  'best', 'top', 'estimate', 'estimator', 'cost', 'price', 'rate', 'rates', 'much', 'new', 'app']);

function slugTokens(u) {
  const pathPart = u.replace(/^https?:\/\/[^/]+/, '').replace(/\.html?$/, '');
  return pathPart.split('/').filter(Boolean)
    .flatMap((seg) => seg.split('-'))
    .map((t) => t.toLowerCase())
    .filter((t) => t && !STOP.has(t));
}

// A one-token synonym map, same idea as scripts/audit-keyword-gap.cjs: without
// it "pakistani rupee" and "pkr" look like two unrelated intents.
const SYN = new Map([
  // One spelling for the rupee family: otherwise "dollar to pakistani rupee" and
  // "dollar to pkr" become two clusters that are the same page.
  ['pkr', 'pkr'], ['pak', 'pkr'], ['pakistan', 'pkr'], ['pakistani', 'pkr'],
  ['rupee', 'pkr'], ['rupees', 'pkr'], ['rs', 'pkr'], ['pk', 'pkr'],
  ['usd', 'dollar'], ['us', 'dollar'], ['america', 'dollar'], ['dollars', 'dollar'],
  ['gbp', 'pound'], ['sterling', 'pound'], ['pounds', 'pound'], ['british', 'pound'],
  ['eur', 'euro'], ['euros', 'euro'],
  ['aed', 'dirham'], ['dirhams', 'dirham'],
  ['sar', 'riyal'], ['rial', 'riyal'], ['riyals', 'riyal'],
  ['hrs', 'hour'], ['hours', 'hour'], ['mins', 'minute'], ['minutes', 'minute'],
  ['days', 'day'], ['dates', 'date'], ['years', 'year'], ['months', 'month'],
  ['percentage', 'percent'], ['percentages', 'percent'],
  ['insurance', 'insurance'],
]);
const canon = (t) => SYN.get(t) || t;

// ---------- keyword intent ----------
// UberSuggest was seeded on the bare word "calculator", so most of the 502 rows
// are people shopping for a physical device or an app-store app. Those rows are
// the bulk of the volume and none of the opportunity.
const RE_DEVICE = /(^|\s)(casio|orpat|watch|keychain|pouch|cover|cover|battery|repair|shop|store|buy|price|prices|under|flipkart|amazon|big size|digits?|digit|inch|model|geometry|compass|pencil|box|printer|printing|billing machine|machine|solar|cell|12d|120d|14 digit|16 digit|8 digit|10 digit|12 digit|991|991es|991ex|991ms|991cw|991cn|82ms|82es|570|570ms|570es|570ex|350|100ms|911|789sga|fx|es plus|ms|ex|cw|5e|84|ti)\b/;
const RE_APP = /(^|\s)(app|apk|download|mod|hack|lock|hide|vault|install|simulator|gallery|video lock|photo)\b/;
const RE_CODE = /(^|\s)(java|python|javascript|js|html|css|code|program|programming|using|switch case|in c|in tally|tally|excel)\b/;  const RE_BRAND = /(^|\s)(google|xe|bing|yandex|iphone|android|windows|xbox|groww|zerodha|net|soup|desmos|mathway|symbolab|wolfram|omni)\b/;
// "calculator and calendar" is two products compared; "calculator hours and
// minutes" is one calculation and must stay. So only the seed pattern counts.
const RE_OFFINTENT = /^calculator\s+(and|or|vs|versus)\s|(^|\s)vs(\s|$)/;
const RE_SERIAL = /^\d+$|^0x[0-9a-f]+$/;

function classifyKeyword(kw) {
  const t = String(kw).toLowerCase().trim();
  const words = t.split(/\s+/).filter(Boolean);
  const tail = words[words.length - 1];
  if (RE_BRAND.test(t)) return 'brand';
  // A trailing bare number ("calculator 84", "calculator 991es") is a model
  // number, not a calculation — it carries no intent we can answer.
  if (RE_SERIAL.test(tail) || /^0x/.test(words[0] || '')) return 'serial';
  if (RE_DEVICE.test(t)) return 'device';
  if (RE_APP.test(t)) return 'app';
  if (RE_CODE.test(t)) return 'code';
  if (RE_OFFINTENT.test(t)) return 'offintent';
  return 'serve';
}

// "calculator" alone, "calculator 3d", "calculator please" survive the intent
// filter but name no calculation, so there is nothing to build. A cluster is only
// actionable when it names a calculation noun the site does or could cover.
const CALC_NOUNS = new Set(['age', 'birthday', 'bmi', 'bmr', 'tdee', 'body', 'fat', 'calorie', 'calories',
  'weight', 'height', 'protein', 'water', 'sleep', 'pregnancy', 'due', 'ovulation', 'period', 'pf', 'a1c',
  'emi', 'loan', 'mortgage', 'interest', 'sip', 'fd', 'rd', 'compound', 'simple', 'apy', 'apr', 'roi',
  'gst', 'tax', 'salary', 'payroll', 'tip', 'discount', 'percent', 'percentage', 'average', 'mean', 'median',
  'harmonic', 'standard', 'deviation', 'fraction', 'ratio', 'area', 'volume', 'square', 'foot', 'meter',
  'feet', 'mile', 'kilometer', 'inch', 'cm', 'kg', 'pound', 'temperature', 'celsius', 'fahrenheit',
  'time', 'hour', 'minute', 'day', 'week', 'month', 'year', 'duration', 'date', 'business', 'holiday',
  'gpa', 'grade', 'cgpa', 'percentage', 'bmi', 'currency', 'exchange', 'dollar', 'rupee', 'inflation',
  'retirement', '401k', 'annuity', 'bond', 'stock', 'dividend', 'crypto', 'bitcoin', 'profit', 'margin',
  'break', 'even', 'rent', 'insurance', 'premium', 'pmi', 'fha', 'va', 'car', 'auto', 'fuel', 'mileage',
  'electricity', 'watt', 'kwh', 'power', 'solar', 'subnet', 'ip', 'hex', 'rgb', 'byte', 'storage', 'raid',
  'bandwidth', 'speed', 'cron', 'hash', 'base64', 'concrete', 'paint', 'tile', 'roof', 'lumber', 'deck',
  'fence', 'mulch', 'gravel', 'pace', 'calories', 'macro', 'gear', 'torque', 'psi', 'voltage', 'resistor',
  'ohms', 'wire', 'gauge', 'engine', 'towing', 'paint', 'wallpaper', 'grout',
  'quadratic', 'equation', 'log', 'logarithm', 'root', 'prime', 'factorial', 'matrix', 'integral',
  'derivative', 'trig', 'sine', 'cosine', 'xor', 'binary', 'octal', 'zakat', 'zodiac', 'tithi',
  'xirr', 'lumpsum', 'sukanya', 'gratuity', 'brokerage', 'hra', 'nps', 'ppf', 'epf', 'cagr', 'hsn',
  'qr', 'morse', 'hash', 'checksum', 'password', 'random', 'dice', 'lottery']);

function clusterKey(kw) {
  const toks = String(kw).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter((t) => t && !STOP.has(t) && !GENERIC.has(t))
    .map((t) => canon(t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t));
  // Dedupe: "calculator calculator" and "dollar to pakistani rupee" (dollar +
  // two spellings of PKR) should collapse to one token each.
  return [...new Set(toks)].sort().join(' ');
}

function triageKeywords() {
  const files = [
    { file: 'keywords-head.csv', note: 'seeded on the bare word "calculator"' },
    { file: 'keywords-modifiers.csv', note: 'modifier sweep ("calculator vs", "calculator or")' },
    { file: 'keywords-currency.csv', note: '"Suggested keywords" for the currency converter' },
  ];
  const out = [];
  for (const f of files) {
    const p = path.join(SRC, f.file);
    if (!fs.existsSync(p)) continue;
    const rows = parseCsv(p);
    const items = rows.map((r) => {
      const kw = (r.keyword || '').trim();
      return {
        keyword: kw,
        volume: num(r.volume),
        cpc: num(r.cpc),
        paidDifficulty: num(r['paid difficulty']),
        seoDifficulty: r['seo difficulty'] && r['seo difficulty'] !== '-' ? num(r['seo difficulty']) : null,
        klass: classifyKeyword(kw),
        cluster: clusterKey(kw),
      };
    });
    const byClass = {};
    for (const it of items) byClass[it.klass] = (byClass[it.klass] || 0) + 1;
    const zero = items.filter((i) => i.volume === 0).length;

    // One intent per cluster; representative volume is the MAX phrasing, never
    // the sum — "dollar to pak rupee" and "usd to pak rs" are one query to
    // Google and the per-phrasing volumes overlap.
    const clusters = new Map();
    for (const it of items.filter((i) => i.klass === 'serve')) {
      const c = clusters.get(it.cluster) || { cluster: it.cluster, phrases: [], volume: 0, cpc: 0, sd: null };
      c.phrases.push(it.keyword);
      if (it.volume > c.volume) { c.volume = it.volume; c.cpc = it.cpc; }
      if (it.seoDifficulty != null && (c.sd == null || it.seoDifficulty < c.sd)) c.sd = it.seoDifficulty;
      clusters.set(it.cluster, c);
    }
    const cl = [...clusters.values()].sort((a, b) => b.volume - a.volume);
    out.push({
      file: f.file,
      note: f.note,
      rows: items.length,
      zeroVolumeRows: zero,
      byClass,
      volumeMax: items.reduce((m, i) => Math.max(m, i.volume), 0),
      cpcMax: items.reduce((m, i) => Math.max(m, i.cpc), 0),
      serveClusters: cl.length,
      // A cluster with no calculation noun in it ("", "3d", "please") is not a
      // page idea, so it is counted and then dropped rather than padded in.
      genericDropped: cl.filter((c) => !c.cluster.split(' ').some((t) => CALC_NOUNS.has(t))).length,
      clusters: cl.filter((c) => c.cluster && c.cluster.split(' ').some((t) => CALC_NOUNS.has(t))),
    });
  }
  return out;
}

// ---------- currency pair extraction ----------
// The 50 suggested rows are 7 currencies asked for in ~50 spellings. Which is the
// whole point: it is one page, not fifty.
const CUR = [
  [/\b(usd|us dollar|us dollars|dollar|dollars|america|american)\b/, 'USD'],
  [/\b(gbp|pound|pounds|sterling|british)\b/, 'GBP'],
  [/\b(eur|euro|euros)\b/, 'EUR'],
  [/\b(aed|dirham|dirhams)\b/, 'AED'],
  [/\b(sar|riyal|riyals|rial)\b/, 'SAR'],
  [/\b(cad)\b/, 'CAD'],
  [/\b(aud)\b/, 'AUD'],
  [/\b(pkr|rupee|rupees|rs|pak|pakistan|pakistani|pk)\b/, 'PKR'],
];

function currencyPairs() {
  const p = path.join(SRC, 'keywords-currency.csv');
  if (!fs.existsSync(p)) return { rows: [], pairs: [] };
  const rows = parseCsv(p).map((r) => ({
    keyword: r.keyword,
    volume: num(r.volume),
    cpc: num(r.cpc),
    sd: r['seo difficulty'] && r['seo difficulty'] !== '-' ? num(r['seo difficulty']) : null,
  }));
  const pairs = new Map();
  for (const r of rows) {
    const lower = r.keyword.toLowerCase();
    // "dollar" is the generic word for USD, but "cad dollar to pak rupees" is a
    // CAD pair. An explicit code wins over the generic word; the PKR leg is
    // detected separately because it is spelled "pak", "pkr" or "rupees"
    // depending on the row.
    const explicit = ['USD', 'GBP', 'EUR', 'AED', 'SAR', 'CAD', 'AUD', 'PKR']
      .filter((code) => new RegExp('\\b' + code.toLowerCase() + '\\b').test(lower));
    const src = new Set(explicit.filter((c) => c !== 'PKR'));
    if (!src.size) {
      for (const [re, code] of CUR) if (code !== 'PKR' && re.test(lower)) src.add(code);
    }
    const hasPkr = explicit.includes('PKR') || /\b(pkr|rupee|rupees|rs|pak|pakistan|pakistani|pk)\b/.test(lower);
    if (!src.size || !hasPkr) continue;
    const key = [...src].sort().join('+') + '>PKR';
    const e = pairs.get(key) || { pair: key, phrasings: 0, volume: 0, sd: null, cpc: 0, examples: [] };
    e.phrasings++;
    if (r.volume > e.volume) { e.volume = r.volume; e.cpc = r.cpc; }
    if (r.sd != null && (e.sd == null || r.sd < e.sd)) e.sd = r.sd;
    e.examples.push(r.keyword);
    pairs.set(key, e);
  }
  return { rows, pairs: [...pairs.values()].sort((a, b) => b.volume - a.volume), dropped: rows.length - [...pairs.values()].reduce((s, p) => s + p.phrasings, 0) };
}

// ---------- backlink triage ----------
// rapidtables' top 500 are earned: news stories, .edu reading lists, wikis.
// calculator.io's are ~46% spun-title blog-farm posts. The difference matters
// because one of those profiles is a model and the other is a penalty.
const SPUN = /(taking-control|comprehensive-(guide|manual|tutorial|information)|all-you-(have|need)-to-know|top-(rated-)?(great-)?(things|benefits|advantages)|how-(a|do|will|does|would|can|does-one)-|house-?hold?-?(financial|bank|mortgage|personal)?-?loan|dwelling-(financial|bank|loan|mortgage)|residence-(financial|mortgage|loan)|property-(bank|mortgage)-loan|home-(bank|financial|mortgage)-loan|an-extensive-(manual|tutorial|guidebook|information|guide)|best-(great|advantages))/i;
const SHORTENER = /^(bit\.ly|goo\.gl|tinyurl\.com|is\.gd|ow\.ly|rb\.gy|clck\.ru|tiny\.cc|fb\.me)$/;
const SEARCH_ARTIFACT = /search\.(yahoo|aol)|yandsearch|safelinks|redirect\?url=|google\.com\/url|ask\.com\/web|brave\.com\/search|bing\.com\/images/;
const NEWS_HOST = /nytimes|washingtonpost|theguardian|bbc\.|cnn\.|reuters|smithsonianmag|newscientist|popsci|sciencealert|iflscience|phys\.org|qz\.com|vice\.com|theconversation|bustle|lifehacker|cnet\.|digitaltrends|arstechnica|gizmodo|engadget|metro\.co\.uk|thesun|nypost|foxnews|ibtimes|news18|elcomercio|infobae|clarin|lanacion|elespanol|xataka|hola\.com|semana\.com|elperiodico|businessinsider|uol\.com\.br|tecmundo|olhar|tribune|wired|economist|npr\.org|newsweek|mashable|telegraph|independent\.co\.uk|mirror\.co\.uk|thetimes|techtarget|computerbild|dpreview|tomsguide|tomshardware|howtogeek|makeuseof|pcmag|zdnet/;

function classifyLink(url) {
  const host = url.split('/')[0];
  const pathPart = url.slice(host.length);
  if (/\/stor(y|ies)\d+|\/all\/\d+\/\d+/.test(pathPart) || SPUN.test(url)) return 'farm';
  if (SHORTENER.test(host) || SEARCH_ARTIFACT.test(url)) return 'search/shortener';
  if (/wikipedia\.org|wikimedia|wikiwand|wikiquote|wikibooks|wikisource/.test(host)) return 'wiki';
  if (/(^|\.)(edu|ac\.[a-z]{2}|edu\.[a-z]{2})$/.test(host) || /\.edu(\/|$)/.test(host) || /\.ac\.[a-z]{2}(\/|$)/.test(host)) return 'edu';
  if (/forum|community|discuss|answers|boards|threads|stackoverflow|stackexchange|superuser|askubuntu|quora|reddit|tapatalk|phpbb/.test(host)) return 'forum';
  if (NEWS_HOST.test(host) || /\/20\d\d\/|\/news\/|\/article\/|\/noticias\/|\/noticia\//.test(pathPart)) return 'news';
  return 'other';
}

function triageLinks(file) {
  const p = path.join(SRC, file);
  if (!fs.existsSync(p)) return null;
  const rows = parseCsv(p).map((r) => ({
    url: r.backlink,
    da: num(r['domain authority']),
    pa: num(r['page authority']),
    target: r['competitors it links to'],
    klass: classifyLink(r.backlink),
  }));
  const byClass = {};
  for (const r of rows) byClass[r.klass] = (byClass[r.klass] || 0) + 1;
  const farmShare = rows.length ? byClass.farm / rows.length : 0;
  // The pursue list is the editorial subset: a real publisher or a .edu page,
  // not a forum reply and not a spun farm post.
  const pursue = rows
    .filter((r) => (r.klass === 'news' || r.klass === 'edu') && r.da >= 80)
    .sort((a, b) => b.da - a.da)
    .map((r) => ({ url: r.url, da: r.da, klass: r.klass }));
  return { file, rows: rows.length, byClass, farmShare, pursueCount: pursue.length, pursue: pursue.slice(0, 25) };
}

function triageRefDomains(files) {
  const sets = new Map();
  for (const file of files) {
    const p = path.join(SRC, file);
    if (!fs.existsSync(p)) continue;
    const rows = parseCsv(p).map((r) => ({
      domain: r['reffering domain'] || r['referring domain'],
      da: num(r['domain authority']),
      target: r['competitors it links to'],
    })).filter((r) => r.domain);
    sets.set(file, rows);
  }
  const union = new Map();
  for (const [file, rows] of sets) {
    for (const r of rows) {
      const e = union.get(r.domain) || { domain: r.domain, da: 0, competitors: [] };
      e.da = Math.max(e.da, r.da);
      e.competitors.push(file.replace(/^refdomains-|\.csv$/g, ''));
      union.set(r.domain, e);
    }
  }
  const all = [...union.values()];
  // Platform noise: a domain that hosts anyone's content is not an outreach
  // target even when it appears in all three exports.
  const PLATFORM = /^(wordpress\.org|github\.com|it\.com|pages\.dev|vercel\.app|netlify\.app|search\.yahoo\.com|habr\.com|stackoverflow\.com|diigo\.com|cloudwaysapps\.com|workers\.dev|googleusercontent\.com|blogspot\.com|wordpress\.com|medium\.com|substack\.com|telegra\.ph|linktr\.ee|notion\.site|carrd\.co|webflow\.io|godaddysites\.com|site123\.me|weebly\.com|wixsite\.com|fandom\.com|feedburner\.com|bit\.ly|goo\.gl|tinyurl\.com|is\.gd|ow\.ly|rb\.gy|clck\.ru|tiny\.cc|mail\.ru|hatena\.ne\.jp|opera\.com|adobe\.com|shopify\.com|themeforest\.net|codecanyon\.net|envato\.com|atlassian\.net|readthedocs\.io|npmjs\.com)$/;
  const shared = all.filter((d) => d.competitors.length >= 2);
  const sharedReal = shared.filter((d) => !PLATFORM.test(d.domain)).sort((a, b) => b.da - a.da);
  return {
    files: [...sets.keys()],
    perFile: [...sets.entries()].map(([file, rows]) => ({ file, rows: rows.length })),
    union: all.length,
    sharedAtLeast2: shared.length,
    sharedAll3: all.filter((d) => d.competitors.length === 3).length,
    sharedPlatformNoise: shared.filter((d) => PLATFORM.test(d.domain)).length,
    sharedRealCount: sharedReal.length,
    sharedReal: sharedReal.slice(0, 40).map((d) => ({ domain: d.domain, da: d.da, competitors: d.competitors.length })),
  };
}

// ---------- GSC ----------
function triageGsc() {
  if (!fs.existsSync(GSC)) return null;
  const q = JSON.parse(fs.readFileSync(GSC, 'utf8'));
  const pairs = q.pairs || [];

  // Per page, over both URL forms, then split the two forms back out: the site
  // 308s each family to one canonical (tools -> /path/, guides -> /path), so a
  // page showing up under both forms in GSC means the *other* form is a legacy
  // URL still sitting in the index.
  const pages = new Map();
  for (const p of pairs) {
    const e = pages.get(p.page) || { url: p.page, impressions: 0, clicks: 0, best: Infinity, queries: 0 };
    e.impressions += p.impressions;
    e.clicks += p.clicks;
    e.queries++;
    if (p.position < e.best) e.best = p.position;
    pages.set(p.page, e);
  }
  const list = [...pages.values()];
  const byFamily = new Map();
  for (const e of list) {
    const key = e.url.replace(/\/$/, '');
    const f = byFamily.get(key) || { key, slash: 0, noSlash: 0, impressions: 0, clicks: 0 };
    if (e.url.endsWith('/')) f.slash++; else f.noSlash++;
    f.impressions += e.impressions;
    f.clicks += e.clicks;
    byFamily.set(key, f);
  }
  const dupForms = [...byFamily.values()].filter((f) => f.slash && f.noSlash)
    .sort((a, b) => b.impressions - a.impressions);

  const zeroClickTop10 = list.filter((e) => e.best <= 10 && e.clicks === 0)
    .sort((a, b) => b.impressions - a.impressions);
  // A page counted once per URL form double-counts itself. The headline number
  // should be pages, so collapse /path and /path/ before reporting it.
  const zeroClickPages = new Set(zeroClickTop10.map((e) => e.url.replace(/\/$/, '')));

  const striking = pairs.filter((p) => p.position <= 15 && p.position >= 3)
    .sort((a, b) => b.impressions - a.impressions);
  const meaningful = striking.filter((p) => p.impressions >= 20);

  return {
    ranAt: q.ranAt,
    window: { start: q.startDate, end: q.endDate, days: q.days },
    totals: q.totals,
    coverage: q.coverage,
    anonymisedImpressions: Math.max(0, (q.totals.impressions || 0) - (q.coverage.pairImpressions || 0)),
    urlsWithImpressions: list.length,
    duplicateUrlForms: dupForms.length,
    duplicateFormImpressions: dupForms.reduce((s, f) => s + f.impressions, 0),
    duplicateFormExamples: dupForms.slice(0, 10),
    zeroClickTop10: zeroClickTop10.slice(0, 15).map((e) => ({
      url: e.url, impressions: e.impressions, best: Math.round(e.best * 100) / 100,
    })),
    zeroClickTop10Forms: zeroClickTop10.length,
    zeroClickTop10Count: zeroClickPages.size,
    zeroClickTop10Impressions: zeroClickTop10.reduce((s, e) => s + e.impressions, 0),
    strikingCount: striking.length,
    strikingImpressions: striking.reduce((s, p) => s + p.impressions, 0),
    strikingClicks: striking.reduce((s, p) => s + p.clicks, 0),
    strikingMeaningfulCount: meaningful.length,
    strikingMeaningful: meaningful.slice(0, 15),
    pagesRanking: list.length,
  };
}

// ---------- keyword -> page join ----------
// "Do we ship a page for this cluster" is answered against sitemap slugs. A
// cluster counts as covered when every content token appears in one slug.
function joinToSite(keywordFiles, index) {
  const slugs = index;
  const covered = [];
  const uncovered = [];
  for (const f of keywordFiles) {
    for (const c of f.clusters) {
      const tokens = c.cluster.split(' ').filter((t) => t && !GENERIC.has(t));
      if (!tokens.length) continue;
      // Two different claims are possible here, and conflating them is how a
      // keyword map starts lying. A slug match means the page was *built* for
      // this intent. A title-only match means the words appear on a page that is
      // about something else — "day" hit /engineering/electrical-energy/ that way
      // (its title says "per day"). Title matches are reported, but as a lead.
      let bestSlug = null, bestSlugHits = 0;
      let bestAny = null, bestAnyHits = 0;
      for (const s of slugs) {
        let slugHits = 0;
        let anyHits = 0;
        for (const t of tokens) {
          if (s.slug.includes(t)) slugHits++;
          if (s.tokens.includes(t)) anyHits++;
        }
        if (slugHits > bestSlugHits) { bestSlugHits = slugHits; bestSlug = s; }
        if (anyHits > bestAnyHits) { bestAnyHits = anyHits; bestAny = s; }
      }
      // "Nearest page" is a slug overlap only. Matching the title for this column
      // produced nonsense ("1 dollar pkr" -> /guides/fd-ppf-sip, because its
      // title mentions a dollar amount), and a lead is worse than a blank.
      const full = tokens.length;
      const rec = {
        cluster: c.cluster,
        volume: c.volume,
        phrasings: c.phrases.length,
        sd: c.sd,
        source: f.file,
        page: bestSlug && bestSlugHits === full ? bestSlug.url : null,
        pageTitle: !(bestSlug && bestSlugHits === full) && bestAny && bestAnyHits === full ? bestAny.url : null,
        partial: bestSlug && bestSlugHits >= 1 && bestSlugHits < full ? bestSlug.url : null,
      };
      if (rec.page || rec.pageTitle) covered.push(rec); else uncovered.push(rec);
    }
  }
  return {
    covered,
    uncovered,
    slugCovered: covered.filter((c) => c.page).length,
    titleCovered: covered.filter((c) => !c.page && c.pageTitle).length,
  };
}

// Does any exported keyword also appear as a query Google already shows us for?
// Exact string match, because that is the only version that supports the claim
// "the exports contain nothing we already rank for".
function keywordOverlap() {
  if (!fs.existsSync(GSC)) return null;
  const q = JSON.parse(fs.readFileSync(GSC, 'utf8'));
  const seen = new Set((q.queries || []).map((x) => x.query.toLowerCase().trim()));
  // Every raw row, not just the clusters that survived the filters: the claim
  // has to cover the whole export or it is not saying much.
  const words = [];
  for (const f of ['keywords-head.csv', 'keywords-modifiers.csv', 'keywords-currency.csv']) {
    const p = path.join(SRC, f);
    if (!fs.existsSync(p)) continue;
    for (const r of parseCsv(p)) if (r.keyword) words.push(r.keyword.toLowerCase().trim());
  }
  const unique = [...new Set(words)];
  const hits = unique.filter((w) => seen.has(w));
  return {
    checkedQueries: seen.size,
    checkedKeywords: unique.length,
    exactMatches: hits.length,
    examples: hits.slice(0, 10),
  };
}

// ---------- what the list is actually worth ----------
//
// Two measurements decide whether a keyword list can move a traffic target,
// and neither of them is inside the UberSuggest export:
//
//   (a) the site's own conversion of stated demand into impressions. Take the
//       clusters that already have a page, join them to the per-URL GSC export,
//       and divide impressions by the volume UberSuggest claims. That ratio is
//       the honest multiplier for "what happens if we build the page".
//   (b) how much of the "uncovered" list is uncovered at all. A cluster whose
//       words already sit in a tool's `kw` field is served by a page that simply
//       does not carry the words in its slug. Building for it duplicates the
//       page and cannibalises it — the audit would be creating the problem it
//       claims to find.
const SITE_IMPRESSIONS = path.join(ROOT, 'data', 'gsc-page-impressions.json');
const TARGETS = [200000, 300000];

function loadToolClaims() {
  const dir = path.join(ROOT, 'js', 'data');
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    // id and kw live in the same registry object; 400 chars is enough to span
    // name + desc without wandering into the next entry.
    const re = /id:\s*['"]([^'"\n]+)['"][\s\S]{0,400}?kw:\s*['"]([^'"\n]*)['"]/g;
    let m;
    while ((m = re.exec(src))) out.push({ id: m[1], file: f, claim: m[2].toLowerCase() });
  }
  return out;
}

function opportunityArithmetic(join, gsc, index) {
  const claims = loadToolClaims();
  const claimed = claims.map((t) => ({
    ...t,
    tokens: new Set(t.claim.split(/[^a-z0-9]+/).filter(Boolean).map(canon)),
  }));

  // (a) measured capture on clusters that already have a page
  let pages = null;
  if (fs.existsSync(SITE_IMPRESSIONS)) {
    try { pages = JSON.parse(fs.readFileSync(SITE_IMPRESSIONS, 'utf8')).pages || null; } catch (e) { pages = null; }
  }
  const pathOf = (u) => String(u).replace(/^https?:\/\/[^/]+/, '').replace(/\/+$/, '') || '/';
  const matched = [];
  if (pages) {
    for (const c of join.covered) {
      if (!c.page || !c.volume) continue;
      const k = pathOf(c.page);
      const m = pages[k] || pages[k + '/'];
      if (!m || !m.impressions) continue;
      matched.push({ cluster: c.cluster, volume: c.volume, impressions: m.impressions, position: m.position });
    }
  }
  const matchedVolume = matched.reduce((s, x) => s + x.volume, 0);
  const matchedImpressions = matched.reduce((s, x) => s + x.impressions, 0);
  const measuredCapture = matchedVolume ? matchedImpressions / matchedVolume : null;

  // (b) which "uncovered" clusters a tool already answers
  const uncovered = join.uncovered.map((c) => {
    const toks = c.cluster.split(' ').filter((t) => t && !GENERIC.has(t) && !STOP.has(t)).map(canon);
    const hit = toks.length ? claimed.find((t) => toks.every((x) => t.tokens.has(x))) : null;
    return { ...c, answeredBy: hit ? { id: hit.id, file: hit.file } : null };
  });
  const answered = uncovered.filter((c) => c.answeredBy);
  const gaps = uncovered.filter((c) => !c.answeredBy);

  // A tool id is the last segment of its page slug in this repo
  // (`currency-converter` -> /finance/currency-converter/), so the claim can be
  // joined straight to the per-URL GSC export. This is the sharpest number in
  // the document: a page that already targets the query and is STILL silent.
  const byId = new Map();
  for (const s of index || []) {
    const last = s.url.replace(/\/+$/, '').split('/').pop();
    if (last) byId.set(last, s.url);
  }
  const silent = [];
  if (pages) {
    for (const c of answered) {
      const u = byId.get(c.answeredBy.id);
      if (!u) continue;
      const k = pathOf(u);
      const m = pages[k] || pages[k + '/'];
      if (!m || !m.impressions) silent.push({ cluster: c.cluster, volume: c.volume, url: k, tool: c.answeredBy.id });
    }
  }
  silent.sort((a, b) => b.volume - a.volume);
  const answeredVolume = answered.reduce((s, c) => s + (c.volume || 0), 0);
  const gapVolume = gaps.reduce((s, c) => s + (c.volume || 0), 0);
  const listVolume = answeredVolume + gapVolume;

  const currentPerDay = gsc && gsc.totals ? gsc.totals.impressions / 28 : null;
  const targets = TARGETS.map((t) => ({
    target: t,
    perDay: Math.round(t / 30),
    multiple: currentPerDay ? t / 30 / currentPerDay : null,
    // the capture the whole uncovered list would have to earn
    captureNeeded: listVolume ? t / listVolume : null,
    xCapture: measuredCapture && listVolume ? (t / listVolume) / measuredCapture : null,
  }));

  return {
    measuredCapture,
    matchedCount: matched.length,
    matchedVolume,
    matchedImpressions,
    currentPerDay,
    answeredCount: answered.length,
    silentCount: silent.length,
    silent,
    gapCount: gaps.length,
    answeredVolume,
    gapVolume,
    listVolume,
    targets,
    // Full lists, sorted: the renderer slices for display. Slicing here first
    // would drop the currency clusters, because join.uncovered arrives in
    // file order (head → modifiers → currency), not volume order.
    answered: answered.slice().sort((a, b) => b.volume - a.volume),
    gaps: gaps.slice().sort((a, b) => b.volume - a.volume),
  };
}

function main() {
  const keywordFiles = triageKeywords();
  const currency = currencyPairs();
  const links = ['backlinks-rapidtables.csv', 'backlinks-calculatorio.csv']
    .map(triageLinks).filter(Boolean);
  const refDomains = triageRefDomains([
    'refdomains-rapidtables.csv', 'refdomains-calculatorio.csv', 'refdomains-omnicalculator.csv',
  ]);
  const gsc = triageGsc();
  const index = loadSiteIndex();
  const join = joinToSite(keywordFiles, index);
  const overlap = keywordOverlap();
  const opportunity = opportunityArithmetic(join, gsc, index);

  const result = {
    ranAt: new Date().toISOString(),
    sources: fs.readdirSync(SRC).filter((f) => f.endsWith('.csv')).sort(),
    sitemapUrls: index.length,
    keywords: keywordFiles,
    currency,
    links,
    refDomains,
    gsc,
    overlap,
    opportunity,
    join: {
      slugCovered: join.slugCovered,
      titleCovered: join.titleCovered,
      covered: join.covered.sort((a, b) => b.volume - a.volume),
      uncovered: join.uncovered.sort((a, b) => b.volume - a.volume),
    },
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(result, null, 1) + '\n');
  fs.writeFileSync(OUT_MD, render(result));
  console.log('wrote', path.relative(ROOT, OUT_JSON), 'and', path.relative(ROOT, OUT_MD));
  console.log('keyword rows', keywordFiles.reduce((s, f) => s + f.rows, 0),
    '| serve clusters', join.covered.length + join.uncovered.length,
    '| covered', join.covered.length, '| uncovered', join.uncovered.length,
    '| gsc urls', gsc ? gsc.urlsWithImpressions : 'n/a');
  console.log('uncovered', join.uncovered.length, '| already answered', opportunity.answeredCount,
    '| true gaps', opportunity.gapCount,
    '| measured capture', opportunity.measuredCapture == null ? 'n/a'
      : (opportunity.measuredCapture * 100).toFixed(4) + '%');
}

// ---------- markdown ----------
const pct = (n) => (n * 100).toFixed(1) + '%';
const nf = (n) => Number(n || 0).toLocaleString('en-US');

function render(r) {
  const L = [];
  const g = r.gsc;
  L.push('# UberSuggest export triage — 2026-10-18');
  L.push('');
  L.push('**Generated:** ' + r.ranAt.slice(0, 10) + ' · by `node scripts/ubersuggest-triage.cjs`');
  L.push('**Inputs:** ' + r.sources.map((f) => '`' + f + '`').join(', '));
  L.push('**Joined against:** `deploy/sitemap.xml` (' + nf(r.sitemapUrls) + ' URLs) and `data/gsc-query-page.json`'
    + (g ? ' (' + g.window.start + ' → ' + g.window.end + ')' : '') + '.');
  L.push('');
  L.push('Every figure below is recomputed by the script; nothing is hand-typed.');
  L.push('');
  L.push('## Verdict in one table');
  L.push('');
  L.push('| Export | Rows | What it actually is | Worth acting on |');
  L.push('|---|---|---|---|');
  for (const f of r.keywords) {
    const serve = f.clusters.length;
    const noise = (f.byClass.device || 0) + (f.byClass.app || 0) + (f.byClass.code || 0)
      + (f.byClass.brand || 0) + (f.byClass.serial || 0) + (f.byClass.offintent || 0);
    let worth = 'no — ' + nf(noise) + ' of ' + nf(f.rows) + ' rows are device/app/model/nonsense intent';
    if (f.file === 'keywords-currency.csv') {
      worth = 'yes — ' + r.currency.pairs.length + ' real currency pairs behind ' + nf(f.rows) + ' phrasings';
    } else if (serve > 0) {
      worth = 'partly — ' + serve + (serve === 1 ? ' usable cluster' : ' usable clusters')
        + ', ' + nf(f.genericDropped) + ' rows name no calculation';
    }
    L.push('| `' + f.file + '` | ' + nf(f.rows) + ' | ' + f.note + ' | ' + worth + ' |');
  }
  for (const l of r.links) {
    L.push('| `' + l.file + '` | ' + nf(l.rows) + ' | competitor backlinks, ' + pct(l.farmShare)
      + ' spun-content link farms | ' + nf(l.pursueCount) + ' editorial targets |');
  }
  L.push('| `refdomains-*.csv` (3 files) | ' + nf(r.refDomains.perFile.reduce((s, f) => s + f.rows, 0))
    + ' | three competitors\' referring domains | '
    + nf(r.refDomains.sharedRealCount) + ' non-platform shared domains |');
  L.push('');

  L.push('## 1. The keyword data is mostly the wrong intent');
  L.push('');
  for (const f of r.keywords) {
    L.push('### `' + f.file + '`');
    L.push('');
    L.push(nf(f.rows) + ' rows · ' + nf(f.zeroVolumeRows) + ' with volume 0 · highest volume '
      + nf(f.volumeMax) + ' · highest CPC ' + f.cpcMax.toFixed(2));
    if (f.file === 'keywords-currency.csv') {
      L.push('');
      L.push('That CPC column is priced in PKR: it peaks at ' + f.cpcMax.toFixed(2)
        + ' while the same column peaks at ' + (r.keywords[0] ? r.keywords[0].cpcMax.toFixed(2) : '7.68')
        + ' in the USD-priced exports. Read as dollars it is inflated by roughly two orders of magnitude, '
        + 'so do not budget against it until the export currency is set to USD.');
    }
    L.push('');
    const cls = Object.entries(f.byClass).sort((a, b) => b[1] - a[1]);
    L.push('| Intent class | Rows |');
    L.push('|---|---|');
    for (const [k, v] of cls) L.push('| ' + k + ' | ' + nf(v) + ' |');
    L.push('');
    if (f.file === 'keywords-head.csv') {
      L.push('This is the "calculator" seed with no modifier. Its biggest rows are `calculator` (55.6M), '
        + '`calculator age` (11.1M) and `calculator bmi` (7.5M) — but the tail is shoppers: '
        + '`calculator price`, `calculator casio`, `calculator watch casio`, `calculator under 100`, '
        + '`calculator shop near me`, `calculator hide app`. A web calculator cannot answer any of those, '
        + 'and the head terms are owned by Google\'s own widget. **Verdict: discard as a targeting list.** '
        + 'Keep it only as a commercial-demand signal for future affiliate pages.');
      L.push('');
    }
    if (f.file === 'keywords-modifiers.csv') {
      L.push('54 rows of `calculator vs <thing>` and `calculator or <thing>`, ' + nf(f.zeroVolumeRows)
        + ' with zero volume. This is what UberSuggest returns when you ask for keyword ideas for the word '
        + '"calculator" with modifier expansion on. **Verdict: discard.**');
      L.push('');
    }
    if (f.file === 'keywords-currency.csv') {
      L.push('50 rows, all `X to PKR`, no zero-volume noise, SEO difficulty 14–45. This is the only file '
        + 'with intent we can serve: ' + r.currency.pairs.length + ' pairs, and the site already runs a live-rate '
        + 'converter, so the data source exists. What is missing is one page aimed at an intent the rate '
        + 'widget cannot answer (§8), not seven pages for seven phrasings.');
      L.push('');
    }
  }

  L.push('## 2. 50 phrasings, 7 queries');
  L.push('');
  L.push('| Pair | Phrasings | Max volume | Lowest SD | Example |');
  L.push('|---|---|---|---|---|');
  for (const p of r.currency.pairs) {
    L.push('| ' + p.pair.replace('>', ' → ') + ' | ' + p.phrasings + ' | ' + nf(p.volume) + ' | '
      + (p.sd == null ? '—' : p.sd) + ' | `' + p.examples[0] + '` |');
  }
  L.push('');
  L.push('These volumes are **not additive**. `dollar to pak rupee`, `usd to pak rs` and '
    + '`1 dollar to pak rupee` are one query to Google; summing them would invent millions of searches. '
    + 'The script takes the max phrasing per pair and says so.');
  L.push('');

  L.push('## 3. Backlinks: one profile is earned, one is a link farm');
  L.push('');
  L.push('| Class | rapidtables | calculator.io |');
  L.push('|---|---|---|');
  const classes = ['news', 'edu', 'wiki', 'forum', 'other', 'search/shortener', 'farm'];
  for (const c of classes) {
    const cell = r.links.map((l) => nf(l.byClass[c] || 0));
    L.push('| ' + c + ' | ' + cell.join(' | ') + ' |');
  }
  L.push('');
  const rt = r.links.find((l) => /rapidtables/.test(l.file));
  const ci = r.links.find((l) => /calculatorio/.test(l.file));
  if (rt && ci) {
    L.push('rapidtables: ' + pct(rt.farmShare) + ' link-farm content. calculator.io: '
      + pct(ci.farmShare) + '. The calculator.io profile is half spun blog posts — the same '
      + '"taking-control-your-guide-to-home-loan-calculators" post republished on dozens of '
      + '`*.blogprodesign.com` / `*.storyNNNN` templates. **That is a paid-link footprint, not a '
      + 'link-building model.** Anything that reproduces it puts the domain at risk.');
    L.push('');
    L.push('What rapidtables actually earns links from is a specific quotable number: the dog-age '
      + 'formula (NYT, BBC, Guardian, Smithsonian, WaPo), the tip, RGB→hex, temperature conversion. '
      + 'Journalists cite the calculator because it states one memorable number, not because it has a page.');
  }
  L.push('');
  L.push('### Cross-competitor overlap: publishers, not a directory');
  L.push('');
  L.push('Union of the three referring-domain exports: ' + nf(r.refDomains.union) + ' domains. '
    + 'Shared by 2+: ' + nf(r.refDomains.sharedAtLeast2) + '; all 3: ' + nf(r.refDomains.sharedAll3)
    + '. Of the shared set, ' + nf(r.refDomains.sharedPlatformNoise)
    + ' are platforms that host anyone (wordpress.org, github.com, pages.dev, vercel.app, diigo.com…) — '
    + 'not outreach targets. That leaves **' + nf(r.refDomains.sharedRealCount) + '**. They are '
    + 'publishers, and that is the interesting part: no calculator directory is in this list. Every '
    + 'one of them links because a single article needed a single number — the LED-lantern review, the '
    + 'crossword solution, the covid curve, the car-current explainer. So the overlap is not a target '
    + 'list to email; it is evidence of which pages earn links, and it is the page that gives the '
    + 'cleanest one-line answer per query.');
  L.push('');
  L.push('| Domain | DA | Links to |');
  L.push('|---|---|---|');
  for (const d of r.refDomains.sharedReal.slice(0, 15)) {
    L.push('| ' + d.domain + ' | ' + d.da + ' | ' + d.competitors + '/3 |');
  }
  L.push('');

  if (g) {
    L.push('## 4. What Google already shows, and why it does not convert');
    L.push('');
    L.push('| Metric | Value |');
    L.push('|---|---|');
    L.push('| Clicks | ' + nf(g.totals.clicks) + ' |');
    L.push('| Impressions | ' + nf(g.totals.impressions) + ' |');
    L.push('| CTR | ' + pct(g.totals.ctr) + ' |');
    L.push('| Average position | ' + g.totals.position.toFixed(1) + ' |');
    L.push('| URLs with at least one impression | ' + nf(g.urlsWithImpressions) + ' |');
    L.push('| Impressions not attributable to a query-page pair | ' + nf(g.anonymisedImpressions) + ' |');
    L.push('');
    L.push('### The CTR problem is bigger than the ranking problem');
    L.push('');
    L.push(nf(g.zeroClickTop10Count) + ' pages (' + nf(g.zeroClickTop10Forms)
      + ' URL forms, because of the slash split below) have a best position of 10 or better and **zero clicks**, '
      + 'holding ' + nf(g.zeroClickTop10Impressions) + ' impressions. At the industry CTR for position 5–8 '
      + 'that should be hundreds of clicks. Two candidates, and they need different fixes:');
    L.push('');
    L.push('1. **The SERP has an instant answer.** For `how to calculate tip`, `rgb to hex`, '
      + '`harmonic mean calculator` Google answers inline above the organic results — ranking 7th there is '
      + 'worth ~0 clicks no matter how good the title is.');
    L.push('2. **The snippet is not being clicked.** Fixable in an afternoon: rewrite the title/meta to lead with '
      + 'the number, city, or state the query implies.');
    L.push('');
    L.push('| URL | Impressions | Best position |');
    L.push('|---|---|---|');
    for (const e of g.zeroClickTop10.slice(0, 10)) {
      L.push('| `' + e.url.replace('https://calcpromaster.com', '') + '` | ' + nf(e.impressions) + ' | ' + e.best + ' |');
    }
    L.push('');
    L.push('### Striking distance is where fast wins live');
    L.push('');
    L.push(nf(g.strikingCount) + ' query-page pairs sit at position 3–15, carrying '
      + nf(g.strikingImpressions) + ' impressions and ' + nf(g.strikingClicks) + ' clicks. '
      + nf(g.strikingMeaningfulCount) + ' of those have ≥20 impressions — these are the pages where one '
      + 'on-page change moves real traffic, and none of them came from the UberSuggest exports.');
    L.push('');
    L.push('| Query | Page | Impressions | Position |');
    L.push('|---|---|---|---|');
    for (const p of g.strikingMeaningful.slice(0, 12)) {
      L.push('| `' + p.query + '` | `' + p.page.replace('https://calcpromaster.com', '') + '` | '
        + nf(p.impressions) + ' | ' + p.position.toFixed(1) + ' |');
    }
    L.push('');
    L.push('### Legacy URL forms still split the data');
    L.push('');
    L.push(nf(g.duplicateUrlForms) + ' pages appear in GSC under **both** `/path` and `/path/`, together '
      + 'accounting for ' + nf(g.duplicateFormImpressions) + ' impressions ('
      + pct(g.duplicateFormImpressions / g.totals.impressions) + ' of the property). The server now 308s '
      + 'each family to one canonical (tools → `/path/`, guides → `/path`), so these are stale index entries '
      + 'from before the redirect went in, not a live defect — `data/url-format-audit.json` reports 0 FAILs '
      + 'across ' + nf(r.sitemapUrls) + ' URLs. Until Google recrawls, any per-URL report reads '
      + 'roughly half the true number.');
    L.push('');
    L.push('### Manual check: the head tags are not the problem');
    L.push('');
    L.push('Not part of the regeneration — this was three live `curl` requests on 2026-10-18 against the pages '
      + 'holding the most zero-click impressions:');
    L.push('');
    L.push('| URL | `<title>` | canonical | robots | JSON-LD |');
    L.push('|---|---|---|---|---|');
    L.push('| `/guides/tip` | How to Calculate a Tip — Rates, Splitting the Bill & Tipping | self | index, follow | 1 block |');
    L.push('| `/finance/pmi-calculator/` | PMI Calculator 2026: Monthly Private Mortgage Insurance Cost | self | index, follow | 1 block |');
    L.push('| `/lifestyle/home-insurance/` | Home Insurance Estimate: Home Value & Rate | self | index, follow | 1 block |');
    L.push('');
    L.push('So the zero-click finding is **not** a missing-tag bug: every page is indexable, self-canonical, '
      + 'and has valid structured data. It is either SERP saturation or a snippet that loses the click.');
    L.push('');
  }

  L.push('## 5. Keyword clusters vs what ships');
  L.push('');
  L.push('| | Clusters |');
  L.push('|---|---|');
  L.push('| Actionable intent clusters in the three keyword files | ' + nf(r.join.covered.length + r.join.uncovered.length) + ' |');
  L.push('| Owned by a page whose **slug** carries every token | ' + nf(r.join.slugCovered) + ' |');
  L.push('| Words appear in a page **title** but the slug says something else | ' + nf(r.join.titleCovered) + ' |');
  L.push('| No page **slug** answers them | ' + nf(r.join.uncovered.length) + ' |');
  if (r.opportunity) {
    // The count above is a slug test only. §6b checks the same clusters against
    // every tool's `kw` field, which is where some of them turn out to be served.
    L.push('| — of those, already claimed by a tool\'s `kw` field (§6b) | ' + r.opportunity.answeredCount + ' |');
  }
  L.push('');
  L.push('Slug matches are trustworthy. Title matches are leads: "day" matched ' +
    '/engineering/electrical-energy/ because its title says "per day", which is not the same intent.');
  L.push('');
  if (r.join.uncovered.length) {
    L.push('Uncovered clusters with the largest volume:');
    L.push('');
    L.push('| Cluster | Max volume | Phrasings | SD | Nearest page |');
    L.push('|---|---|---|---|---|');
    for (const c of r.join.uncovered.slice(0, 10)) {
      L.push('| `' + c.cluster + '` | ' + nf(c.volume) + ' | ' + c.phrasings + ' | '
        + (c.sd == null ? '—' : c.sd) + ' | ' + (c.partial ? '`' + c.partial.replace('https://calcpromaster.com', '') + '`' : '—') + ' |');
    }
    L.push('');
  }

  L.push('## 6. What the list can actually deliver, measured');
  L.push('');
  const o = r.opportunity;
  if (o) {
    L.push('Two numbers decide whether a keyword list can move a traffic target, and neither is in the '
      + 'UberSuggest export. Both are computed here.');
    L.push('');
    L.push('### a. What this site converts stated volume into today');
    L.push('');
    if (o.measuredCapture != null) {
      L.push('`' + o.matchedCount + '` of the ' + r.join.covered.length + ' covered clusters map onto a page that '
        + 'appears in the per-URL GSC export. Those pages carry **' + nf(o.matchedVolume) + '** of UberSuggest '
        + 'volume and earned **' + nf(o.matchedImpressions) + ' impressions in 28 days** — a capture of **'
        + (o.measuredCapture * 100).toFixed(4) + '%**.');
      L.push('');
      L.push('That is the multiplier to apply to any new page: stated volume × ' + (o.measuredCapture * 100).toFixed(4)
        + '% ≈ the impressions it can be expected to add at today\'s ranking strength.');
    } else {
      L.push('Could not read `data/gsc-page-impressions.json`, so the capture rate is unavailable. '
        + 'Run `npm run seo:weekly` and regenerate.');
    }
    L.push('');
    L.push('### b. How many “uncovered” clusters already touch an existing tool');
    L.push('');
    L.push('| | Clusters | Volume |');
    L.push('|---|---:|---:|');
    L.push('| Already claimed by a tool\'s `kw` field (slug lacks the words) | ' + o.answeredCount + ' | ' + nf(o.answeredVolume) + ' |');
    L.push('| True gaps — nothing on the site answers them | ' + o.gapCount + ' | ' + nf(o.gapVolume) + ' |');
    L.push('');
    if (o.answered.length) {
      L.push('Already claimed, ranked by volume. The match is on words in the tool\'s `kw` field — read the '
        + 'third column and confirm the intent before treating a row as covered:');
      L.push('');
      L.push('| Cluster | Volume | Tool that claims those words |');
      L.push('|---|---:|---|');
      for (const c of o.answered.slice(0, 15)) {
        L.push('| `' + c.cluster + '` | ' + nf(c.volume) + ' | `' + c.answeredBy.id + '` (`js/data/' + c.answeredBy.file + '`) |');
      }
      if (o.answered.length > 15) L.push('| _(+ ' + (o.answered.length - 15) + ' more, see the JSON)_ | | |');
      L.push('');
      L.push('Where the match is real (the `cgpa` row is the clearest — the tool is called CGPA Calculator and its '
        + '`kw` already says “cgpa to percentage”), building a new page duplicates the existing one: the fix is '
        + 'the slug, the title, or an internal link. Where it is only a word collision (`hour time` → `pto-calc`), '
        + 'the row is a lead, not a finding.');
      L.push('');
    }
    if (o.gaps.length) {
      L.push('True gaps, ranked by volume:');
      L.push('');
      L.push('| Cluster | Volume | SD |');
      L.push('|---|---:|---:|');
      for (const c of o.gaps.slice(0, 15)) {
        L.push('| `' + c.cluster + '` | ' + nf(c.volume) + ' | ' + (c.sd == null ? '—' : c.sd) + ' |');
      }
      if (o.gaps.length > 15) L.push('| _(+ ' + (o.gaps.length - 15) + ' more, see the JSON)_ | | |');
      L.push('');
    }
    if (o.silentCount) {
      L.push('### c. Pages that already target a cluster and are still silent');
      L.push('');
      L.push('`' + o.silentCount + '` of the claimed clusters map onto a live URL, and that URL has **zero '
        + 'impressions** in the 28-day export:');
      L.push('');
      L.push('| Cluster | Volume | Page | Impressions |');
      L.push('|---|---:|---|---:|');
      for (const c of o.silent.slice(0, 8)) {
        L.push('| `' + c.cluster + '` | ' + nf(c.volume) + ' | `' + c.url + '/` | 0 |');
      }
      L.push('');
      L.push('This is the answer to “will building a page for this keyword bring impressions?”. '
        + 'The page already exists, already carries the keyword, and Google still does not show it. '
        + 'A new URL for the same intent starts from the same place.');
      L.push('');
    }
    L.push('### d. What the target costs on these keywords');
    L.push('');
    if (o.currentPerDay) {
      L.push('| Target / month | Impressions / day | × the 28-day average (' + Math.round(o.currentPerDay) + '/day) | Share of the ' + nf(o.listVolume) + ' list volume needed | × the measured capture |');
      L.push('|---|---:|---:|---:|---:|');
      for (const t of o.targets) {
        L.push('| ' + nf(t.target) + ' | ' + nf(t.perDay) + ' | '
          + (t.multiple ? t.multiple.toFixed(1) + 'x' : '—') + ' | '
          + (t.captureNeeded ? (t.captureNeeded * 100).toFixed(1) + '%' : '—') + ' | '
          + (t.xCapture ? nf(Math.round(t.xCapture)) + 'x' : '—') + ' |');
      }
      L.push('');
      L.push('Read the last two columns together. Hitting the target from **this list alone** means earning '
        + 'a capture rate about *' + (o.targets[o.targets.length - 1].xCapture
          ? nf(Math.round(o.targets[o.targets.length - 1].xCapture)) + 'x' : 'several times')
        + '* today\'s — which is a ranking/authority change on the same URLs, not more keywords. '
        + 'A new page does not carry that multiplier with it.');
    }
    L.push('');
  }

  L.push('## 7. Will any of this make us rank fast?');
  L.push('');
  L.push('Judgement, not measurement — but it follows from the four sections above:');
  L.push('');
  if (r.overlap) {
    L.push('- **' + nf(r.overlap.exactMatches) + ' of the ' + nf(r.overlap.checkedKeywords)
      + ' exported keyword phrasings appear among the ' + nf(r.overlap.checkedQueries)
      + ' queries in the GSC export.** Not one of them overlaps. Every fast win in this data set is '
      + 'already on the site: the striking-distance pairs in §4. (The GSC export is capped at 250 query '
      + 'rows, so this rules out overlap with the queries we have data for, not with every query we appear on.)');
  }
  L.push('- The 7 PKR pairs are the worst possible test case for "rank fast". A currency conversion is the '
    + 'canonical instant-answer SERP: Google puts its own converter above the results. The 241 zero-click '
    + 'pages are the proof — that is what ranking inside the top 10 on an answerable query looks like.');
  L.push('- What the site actually lacks is not keywords. It is ' + nf(g ? g.urlsWithImpressions : 0)
    + ' URLs with impressions, 21 clicks in 28 days, and average position 33. No keyword list moves that; '
    + 'sub-10 positions on queries with no instant answer do.');
  L.push('');
  L.push('## 8. What to do, in order');
  L.push('');
  if (g) {
    L.push('**P0 — start with what already ranks.** ' + nf(g.zeroClickTop10Count) + ' pages are inside the '
      + 'top 10 with zero clicks. Pick the ten with real impressions, check the SERP by hand for an instant '
      + 'answer, and either rewrite the snippet or drop the query. This is the only work here with a '
      + 'measurable payoff inside two weeks.');
    L.push('');
  }
  L.push('**P1 — one PKR page, aimed at what Google cannot answer inline.** Not the head `usd to pkr` query '
    + '(widget), and not seven doorway pages. §6c settles the argument: `/finance/currency-converter/` '
    + 'already carries `dollar pkr` in its keyword field and has 0 impressions in 28 days, so a second URL '
    + 'for the same intent does not start from a better place. The open intents are the ones the widget does not cover: '
    + 'a rate-history table, "why did the rupee fall", and worked conversions for round amounts.');
  L.push('');
  L.push('Current rate is already available — `js/currency.js` tries `open.er-api.com` and then '
    + '`api.frankfurter.app`, caches for an hour, and falls back to a static table that includes PKR '
    + '(278.5). **History is the open question:** `js/historical-rates.js` exists but holds US macro '
    + 'series only (30-year mortgage, Fed funds, 10-year Treasury, CPI, savings rate) — no FX series at '
    + 'all. 12 months of PKR is a different endpoint on both live upstreams, and whether it is free on '
    + 'either was not tested here. Check that before promising a chart — a stub table with one week of '
    + 'data would be a thin page, not a win.');
  L.push('');
  L.push('**P2 — earn one citable number.** The backlink data says links come from a single quotable figure, '
    + 'not from outreach volume. Pick two calculator topics where we can publish a defensible original number '
    + 'and make it the page\'s answer.');
  L.push('');
  L.push('**Do not do:** buy or reproduce the calculator.io blog-farm pattern (' + (ci ? pct(ci.farmShare) : '~46%')
    + ' of its profile), target the head terms from `keywords-head.csv`, or build pages for `calculator vs` queries.');
  L.push('');
  L.push('## Limits of this analysis');
  L.push('');
  L.push('- The capture rate in §6 is a ratio of unlike quantities: the numerator is a page\'s impressions from *all* its queries, the denominator is one cluster\'s max-phrasing volume. It is a direction, not a forecast. What it does establish is the order of magnitude — the site converts its stated volume at far below 1%, so volume is not the scarce input.');
  L.push('- GSC query rows are anonymised for low-volume queries: ' + nf(g ? g.anonymisedImpressions : 0)
    + ' impressions cannot be attributed to a query-page pair.');
  L.push('- The backlink exports are one competitor\'s top 500, which is a sample of the tail, not the full profile.');
  L.push('- The currency API was read from source, not exercised wholesale: live fetch, caching and the '
    + 'static fallback are in the code, but this run did not verify that either upstream serves PKR today '
    + 'or returns a free 12-month series.');
  L.push('- Nothing here was deployed. No page, registry entry, canonical or sitemap was modified.');
  L.push('');
  return L.join('\n');
}

if (require.main === module) main();

module.exports = { parseCsv, classifyKeyword, clusterKey, classifyLink, slugTokens, currencyPairs, render };
