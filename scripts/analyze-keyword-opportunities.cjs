#!/usr/bin/env node
// ============================================================
// CalcProMaster — 2,000-keyword opportunity review
// ------------------------------------------------------------
// Input is a third-party export (Ubersuggest CSV or the reviewed XLSX). Raw
// volume/difficulty is NOT a plan: 14% of this list is a brand's own calculator,
// 55% sits above difficulty 40, and ~40% already has a page here. This script
// separates those out, joins the rest to the site's 1,420 built URLs and to the
// measured GSC positions, and emits a shortlist that can actually be worked.
//
// It does not invent a difficulty number and it does not predict traffic. Every
// figure is either read from the export or from GSC; the only computed value is
// the ordering score, whose formula is printed in the report.
//
// Usage:
//   node scripts/analyze-keyword-opportunities.cjs \
//     --xlsx "/c/Users/ok/Downloads/CalcProMaster_2000_Keyword_Opportunity_Review.xlsx"
//   node scripts/analyze-keyword-opportunities.cjs --csv "/path/ubersuggest.csv"
//
// Outputs:
//   docs/KEYWORD-OPPORTUNITY-2026-10-18.md
//   data/keyword-opportunity-review-2026-10-18.json
//   data/keyword-shortlist-2026-10-18.csv
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TODAY = new Date().toISOString().slice(0, 10);
const OUT_MD = path.join(ROOT, 'docs', `KEYWORD-OPPORTUNITY-${TODAY}.md`);
const OUT_JSON = path.join(ROOT, 'data', `keyword-opportunity-review-${TODAY}.json`);
const OUT_CSV = path.join(ROOT, 'data', `keyword-shortlist-${TODAY}.csv`);

const argv = process.argv;
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const XLSX = arg('--xlsx', '');
const CSV = arg('--csv', '');

const STOP = new Set('calculator calculators free online my a an the of for in to and by with on per is what how much many does do i me it that this from at or your you can should use using best top'.split(' '));
// Spaced-out abbreviations are extremely common in this export ("b m i",
// "e m i", "10 99"). Normalise them before tokenising or every one looks like
// a brand-new opportunity.
const ALIAS = [
  [/\bb m i\b/g, 'bmi'], [/\bb m r\b/g, 'bmr'], [/\bg p a\b/g, 'gpa'], [/\be m i\b/g, 'emi'],
  [/\bc g p a\b/g, 'cgpa'], [/\b10 99\b/g, '1099'], [/\bh and r block\b/g, 'h&r block'], [/\bp f t\b/g, 'pft'],
  [/\boz\b/g, 'ounce'], [/\blbs?\b/g, 'pound'], [/\bcm\b/g, 'centimeter'], [/\bmm\b/g, 'millimeter'],
  [/\bkg\b/g, 'kilogram'], [/\bmi\b/g, 'mile'], [/\bft\b/g, 'foot'],
  [/\bp f t\b/g, 'pft'], [/\bbottle neck\b/g, 'bottleneck'], [/\bsun panel\b/g, 'solar panel']
];
const SYNONYM = { teenagers: 'teen', teenager: 'teen', teens: 'teen', kids: 'child', children: 'child', calories: 'calorie', buying: 'buy', renting: 'rent', taxes: 'tax', payments: 'payment' };
// Format/demographic qualifiers do not create a new page ("gpa calculator hs"
// is the GPA page). Geography does, so state/country words are deliberately
// NOT in this set.
const QUALIFIER = new Set(['teen', 'hs', 'high', 'school', 'college', 'men', 'women', 'male', 'female', 'adult', 'kid', 'child', 'baby', '2024', '2025', '2026', 'usa', 'uk', 'india', 'canada', 'australia']);
const stem = (w) => {
  if (SYNONYM[w]) return SYNONYM[w];
  if (w.length <= 3) return w;
  return w.replace(/ies$/, 'y').replace(/ers$/, '').replace(/ing$/, '').replace(/ed$/, '').replace(/es$/, '').replace(/s$/, '');
};

// A brand query is won by the brand's own tool (XE, Zillow, ADP…). Building a
// page for it spends crawl budget and earns nothing.
const BRAND = [
  /\bxe\b/, /\bmorgan\b/, /\bdesmos\b/, /\bbankrate\b/, /\bzillow\b/, /\badp\b/,
  /nerd ?wallet/, /turbo ?tax/, /smart ?asset/, /\bmayo\b/, /\bcdc\b/, /\bnih\b/, /\birs\b/, /\bcms\b/,
  /chipotle/, /starbucks/, /subway/, /taco bell/, /\bcava\b/, /mcdonald/, /myfitnesspal/, /fitness pal/,
  /navy federal/, /capital one/, /bank of america/, /\bus bank\b/, /\bchase\b/, /wells fargo/, /rocket mortgage/,
  /lendingtree/, /edmunds/, /kelley blue book/, /\bkbb\b/, /\bfidelity\b/, /\bvanguard\b/, /\baarpp?\b/,
  /ramsey/, /empower/, /\bsofi\b/, /fannie mae/, /\bovo\b/, /cars com/, /\bnasm\b/, /myplate/, /indeed/,
  /massachusetts institute/, /bureau of labor/, /federal reserve/, /minneapolis fed/, /sallie mae/, /military com/,
  /\baaa\b/, /\bebay\b/, /internal revenue service/, /social security administration/,
  /\bti ?-?8[45]\b/, /\bti ?-?30\b/, /casio/, /texas instruments/, /ba ii plus/, /\bomni\b/, /calculator soup/,
  /\bgoogle\b/, /quick creek/, /state farm/, /geico/, /progressive/, /allstate/, /american express/,
  /discover card/, /citibank/, /\bhsbc\b/, /barclays/, /natwest/, /commbank/, /commonwealth bank/,
  /h ?& ?r block/, /h r block/, /navy fed/, /\bfedex\b/, /\busps\b/, /united states postal/, /us postal service/,
  /air force/, /\barmy\b/, /\bnavy\b/, /the forge/, /\bforza\b/, /rockstar/, /\bgag\b/,
  /\bti\b.*\b8[45]\b/, /\bba ii plus\b/, /\bba 2 plus\b/
];

// Not this site's product: entertainment, astrology, exam-score predictors,
// betting. Targeting them would create a page with no matching calculator.
const OFF_CORE = [
  /astrology/, /horoscope/, /zodiac/, /\bbirth chart\b/, /moon sign/, /rising sign/, /star sign/,
  /numerology/, /gematria/, /tarot/, /chinese calendar gender/,
  /\b(pokemon|pokémon|osrs|blox fruits?|adopt me|roblox|minecraft|fortnite)\b/,
  /score calculator/, /\b(ap|sat|act|ib|psat|gre|gmat)\b.*score/, /score.*\b(ap|sat|act|ib|psat)\b/,
  /lottery/, /powerball/, /mega millions/, /parlay/, /betting/, /sportsbook/, /odds calculator/,
  /fantasy/, /dynasty trade/, /calculator game/, /\bg a m e\b/, /\bssdi\b/,
  /\bap (world|english|bio|biology|history|calc|chemistry|physics)\b/, /ap score/, /sat score/, /act score/,
  /sun moon/, /moon and rising/, /relative value unit/, /gag calculator/, /gender predictor/,
  /\bchess\b/, /\b(cow|horse|dog|cat|pig|goat|chicken|livestock)\b/, /best move/
];

// A query whose head word is a unit is answered by a dimension page
// (/conversion/length/, /conversion/weight/), so it must never be called a gap.
const UNIT_DIM = {
  centimeter: 'length', millimeter: 'length', inch: 'length', foot: 'length', meter: 'length',
  kilometer: 'length', mile: 'length', yard: 'length',
  kilogram: 'weight', pound: 'weight', ounce: 'weight', gram: 'weight',
  liter: 'volume', gallon: 'volume', milliliter: 'volume', cup: 'volume',
  celsius: 'temperature', fahrenheit: 'temperature', kelvin: 'temperature'
};

const GENERIC = new Set(['', 'online', 'math', 'free', 'basic', 'scientific', 'graphing', 'graph', 'app',
  'simple', 'calculate', 'online free', 'free online', 'calculator online', 'math problem', 'calculator app',
  'electronic', 'electronic calculator']);

// Keywords that need a data source we do not have, or that carry YMYL/medical
// risk beyond arithmetic (dosing). They stay out of the "build next" list.
const REVIEW_ONLY = [/peptid/, /dosage/, /\bdose\b/, /dental implant/, /ivf/, /pregnan/, /insulin/, /chemo/, /opioid/, /social security/, /1099 tax/];

// A 2–4 letter acronym can name three unrelated tools (EIC = Earned Income
// Credit or Employer Identification; ERA = baseball or the Amendment; PFT =
// pulmonary function test or personal fitness trainer). They stay in the
// list, but in a "check the SERP first" bucket instead of "build now" —
// guessing the intent is how a site ends up with a page nobody searches for.
const AMBIGUOUS_ACRONYM = new Set(['pft', 'acft', 'eoc', 'eic', 'era', 'edc', 'stat', 'ot', 'pv', 'cd', 'sip', 'rd', 'ppf', 'ee', 'vs', 'rref']);
const ACRONYM_HINT = {
  pft: 'pulmonary function test / physical fitness test',
  acft: 'Army Combat Fitness Test',
  eoc: 'end-of-course exam / equation of a circle',
  eic: 'Earned Income Credit / employer id',
  era: 'baseball earned run average / Equal Rights Amendment',
  edc: 'everyday carry / estimated date of conception',
  stat: 'statistics / medical stat panel',
  ot: 'overtime / occupational therapy',
  pv: 'present value / photovoltaic',
  cd: 'certificate of deposit',
  sip: 'systematic investment plan',
  rd: 'recurring deposit',
  ppf: 'public provident fund',
  ee: 'savings bond series EE',
  vs: 'versus comparison',
  rref: 'reduced row echelon form'
};

// Queries that ask "how do I do X on a calculator" rather than describing a
// calculator. They do not deserve a new page.
const FUNCTION_QUERY = [/^(divide|multiply|add|subtract|solve|find|elapsed|hype|gag|ug|rock|access point|bottleneck)\b/];

function decode(s) {
  return String(s || '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n))
    .replace(/&amp;/g, '&');
}
const normalizeText = (s) => {
  let out = String(s || '').toLowerCase();
  for (const [re, to] of ALIAS) out = out.replace(re, to);
  return out.replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
};
const norm = (s) => normalizeText(s).split(' ').map(stem).join(' ');
const core = (s) => normalizeText(s).split(' ').filter((w) => w && !STOP.has(w)).map(stem);
const csvLine = (line) => {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (c === ',' && !q) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur); return out;
};
const csvCell = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';

// ---------- 1. read the export ----------
function readXlsx(file) {
  const xml = execSync(`unzip -p "${file}" xl/worksheets/sheet1.xml`, { maxBuffer: 30 * 1024 * 1024 }).toString();
  const rows = [...xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((m) => {
    const cells = {};
    const cre = /<c r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g;
    let c;
    while ((c = cre.exec(m[1]))) {
      const body = c[3] || '';
      const inline = [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join('');
      const v = body.match(/<v>([\s\S]*?)<\/v>/);
      cells[c[1]] = /inlineStr/.test(c[2]) ? decode(inline) : v ? decode(v[1]) : '';
    }
    return cells;
  });
  const header = rows[0] || {};
  const cols = Object.keys(header);
  return rows.slice(1).map((r) => Object.fromEntries(cols.map((k) => [header[k], r[k]])));
}
function readCsv(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  const head = csvLine(lines[0]);
  return lines.slice(1).map((l) => { const a = csvLine(l); return Object.fromEntries(head.map((h, i) => [h, a[i] ?? ''])); });
}

let raw;
if (XLSX) raw = readXlsx(path.resolve(XLSX));
else if (CSV) raw = readCsv(path.resolve(CSV));
else { console.error('Give --xlsx <file> or --csv <file>.'); process.exit(1); }

const sourceFile = XLSX || CSV;
const rows = raw.map((r) => ({
  keyword: String(r.Keyword || r.keyword || '').trim(),
  volume: Number(r['Search Volume'] || r.search_volume || 0) || 0,
  difficulty: Number(r['Search Difficulty'] || r.difficulty || 0) || 0,
  cpc: String(r.CPC || ''),
  intent: String(r['Search Intent'] || r.intent || ''),
  bucket: String(r['Intent bucket'] || ''),
  providedPriority: String(r['Suggested priority'] || ''),
  providedScore: Number(r['Opportunity score'] || 0) || 0
})).filter((r) => r.keyword);

// ---------- 2. page index (built site + generated titles) ----------
const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'seo-content.js'), 'utf8'), sandbox);
const TOOL_SEO = sandbox.window.TOOL_SEO || {};
const pages = [];
for (const [id, e] of Object.entries(TOOL_SEO)) {
  pages.push({ id, url: '/' + id + '/', tokens: new Set(core(e.title + ' ' + id.replace(/-/g, ' '))) });
}
const sitemapPath = path.join(ROOT, 'deploy', 'sitemap.xml');
if (fs.existsSync(sitemapPath)) {
  for (const m of fs.readFileSync(sitemapPath, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const p = m[1].replace('https://calcpromaster.com', '').replace(/\/$/, '');
    const parts = p.split('/').filter(Boolean);
    if (parts.length !== 2) continue;
    const id = parts[1];
    if (TOOL_SEO[id]) continue;
    pages.push({ id, url: p + '/', tokens: new Set(core(id.replace(/-/g, ' '))) });
  }
}
const byId = new Map(pages.map((p) => [p.id, p]));

// Coverage is a three-way answer, not a boolean:
//   EXACT        every non-qualifier token is on one page → no new page
//   LIKELY       ≥half the tokens are on one page → inspect that page first
//   VARIANT_RISK some token is on some page, but not enough to name one → inspect
//   NONE         no page on the site uses ANY of these words → a genuine gap
// The gap test is deliberately strict: it must survive "but the silver page
// mentions it!" before it is allowed into the build list.
function matchPage(keyword) {
  const c = core(keyword);
  if (!c.length) return { state: 'NONE', page: null };
  const exact = pages.find((p) => p.id === c.join('-'));
  if (exact) return { state: 'EXACT', page: exact };
  const nonQ = c.filter((t) => !QUALIFIER.has(t));
  // A unit word (cm, oz, lbs) is answered by its dimension page, so the query
  // side is mapped onto the dimension token before matching.
  const words = (nonQ.length ? nonQ : c).map((t) => UNIT_DIM[t] || t);
  let likely = null; let bestRatio = 0; let sharedAnywhere = 0;
  for (const p of pages) {
    const matched = words.filter((t) => p.tokens.has(t)).length;
    if (!matched) continue;
    sharedAnywhere += matched;
    const ratio = matched / words.length;
    if (ratio > bestRatio) { bestRatio = ratio; likely = p; }
  }
  if (bestRatio === 1) return { state: 'EXACT', page: likely };
  if (bestRatio >= 0.5) return { state: 'LIKELY', page: likely };
  if (sharedAnywhere) return { state: 'VARIANT_RISK', page: null };
  return { state: 'NONE', page: null };
}

// ---------- 3. measured GSC positions (what already ranks) ----------
const measured = new Map();
const researchPath = path.join(ROOT, 'data', 'keyword-research.csv');
if (fs.existsSync(researchPath)) {
  const lines = fs.readFileSync(researchPath, 'utf8').split(/\r?\n/).filter(Boolean);
  const head = csvLine(lines[0]);
  for (const l of lines.slice(1)) {
    const a = csvLine(l);
    const r = Object.fromEntries(head.map((h, i) => [h, a[i] ?? '']));
    if (!r.keyword || !r.gsc_avg_position || r.gsc_avg_position === 'Not available') continue;
    measured.set(normalizeText(r.keyword), {
      position: +r.gsc_avg_position,
      impressions: +r.gsc_impressions_28d || 0,
      clicks: +r.gsc_clicks_28d || 0,
      url: r.recommended_target_url || ''
    });
  }
}

// ---------- 4. classify ----------
const tierOf = (d) => d <= 15 ? 'easy (0–15)' : d <= 25 ? 'moderate (16–25)' : d <= 40 ? 'hard (26–40)' : 'very hard (41+)';
const posBucket = (p) => p <= 3 ? 'top 3' : p <= 10 ? 'top 10' : p <= 20 ? '11–20' : p <= 50 ? '21–50' : '50+';

const classified = rows.map((r) => {
  const n = normalizeText(r.keyword);
  const c = core(r.keyword);
  let type = 'TOOL';
  if (BRAND.some((re) => re.test(n))) type = 'BRAND';
  else if (OFF_CORE.some((re) => re.test(n))) type = 'OFF_CORE';
  else if (FUNCTION_QUERY.some((re) => re.test(n))) type = 'FUNCTION_QUERY';
  else if (!c.length || GENERIC.has(n) || GENERIC.has(c.join(' '))) type = 'GENERIC';
  const match = type === 'TOOL' ? matchPage(r.keyword) : { state: 'NONE', page: null };
  const page = match.page;
  const gsc = measured.get(n) || null;
  const review = REVIEW_ONLY.some((re) => re.test(n));
  const winnable = type === 'TOOL' && match.state === 'NONE' && r.difficulty <= 25 && r.volume >= 1000 && !review;
  const needsSerp = winnable && c.length === 1 && AMBIGUOUS_ACRONYM.has(c[0]);
  const hint = needsSerp ? ACRONYM_HINT[c[0]] || 'acronym with more than one meaning' : '';
  return { ...r, type, coverage: match.state, targetPage: page ? page.url : null, gscPosition: gsc ? gsc.position : null, gscImpressions: gsc ? gsc.impressions : null, reviewOnly: review, winnableNew: winnable, needsSerp, hint, tier: tierOf(r.difficulty) };
});

const counts = {
  total: classified.length,
  byType: {},
  byTier: {},
  covered: classified.filter((r) => r.coverage === 'EXACT').length,
  variants: classified.filter((r) => r.coverage === 'LIKELY').length,
  variantRisk: classified.filter((r) => r.coverage === 'VARIANT_RISK').length,
  winnableNew: classified.filter((r) => r.winnableNew).length,
  reviewOnly: classified.filter((r) => r.reviewOnly).length
};
for (const r of classified) {
  counts.byType[r.type] = (counts.byType[r.type] || 0) + 1;
  counts.byTier[r.tier] = (counts.byTier[r.tier] || 0) + 1;
}

// ---------- 5. measured-position analysis ----------
const posRows = [...measured.entries()].map(([k, v]) => ({ keyword: k, ...v }));
const posBuckets = { 'top 3': 0, 'top 10': 0, '11–20': 0, '21–50': 0, '50+': 0 };
for (const r of posRows) posBuckets[posBucket(r.position)]++;
const wordBuckets = {};
for (const r of posRows) {
  const w = r.keyword.split(' ').length;
  const b = w <= 2 ? '1–2 words' : w === 3 ? '3 words' : w === 4 ? '4 words' : '5+ words';
  wordBuckets[b] = wordBuckets[b] || { n: 0, top10: 0, deep: 0 };
  wordBuckets[b].n++;
  if (r.position <= 10) wordBuckets[b].top10++;
  if (r.position > 50) wordBuckets[b].deep++;
}
// ---------- 5b. what happened to the keywords already targeted ----------
// The earlier rounds picked 107 keywords out of data/keyword-volume-difficulty.csv.
// This joins them to the raw GSC query→page export, so "did we rank?" is
// answered by Google's own query list instead of by whether a page exists.
function readTargeted() {
  const mapPath = path.join(ROOT, 'data', 'keyword-implementation-map.json');
  const gscPath = path.join(ROOT, 'data', 'gsc-query-page.json');
  if (!fs.existsSync(mapPath) || !fs.existsSync(gscPath)) return null;
  const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  const gsc = JSON.parse(fs.readFileSync(gscPath, 'utf8'));
  const nq = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const qmap = new Map();
  for (const p of gsc.pairs || []) {
    const e = qmap.get(p.query) || { impressions: 0, clicks: 0, position: Infinity };
    e.impressions += p.impressions || 0;
    e.clicks += p.clicks || 0;
    e.position = Math.min(e.position, p.position || Infinity);
    qmap.set(p.query, e);
  }
  const all = [...qmap.entries()].map(([k, v]) => ({ q: nq(k), ...v }));
  const rowsT = [];
  for (const d of map.decisions || []) {
    const toks = nq(d.keyword).split(' ').filter(Boolean);
    const hits = all.filter((x) => toks.every((t) => x.q.includes(t)));
    const best = hits.slice().sort((a, b) => a.position - b.position)[0] || null;
    rowsT.push({
      keyword: d.keyword,
      priority: d.priority,
      verdict: d.verdict,
      matchedQuery: best ? best.q : null,
      position: best ? best.position : null,
      impressions: hits.reduce((s, x) => s + x.impressions, 0)
    });
  }
  const visible = rowsT.filter((r) => r.position != null);
  const buckets = { 'top 10': 0, '11–20': 0, '21–50': 0, '50+': 0 };
  for (const r of visible) {
    if (r.position <= 10) buckets['top 10']++;
    else if (r.position <= 20) buckets['11–20']++;
    else if (r.position <= 50) buckets['21–50']++;
    else buckets['50+']++;
  }
  // The row_type=targeted block in keyword-research.csv is a different kind of
  // target: title strings written by a generator. Worth separating, because
  // "free online X Calculator" is not a phrase anyone types.
  let titleStrings = null;
  const researchPath2 = path.join(ROOT, 'data', 'keyword-research.csv');
  if (fs.existsSync(researchPath2)) {
    const lines = fs.readFileSync(researchPath2, 'utf8').split(/\r?\n/).filter(Boolean);
    const head = csvLine(lines[0]);
    const t = lines.slice(1).map((l) => Object.fromEntries(head.map((h, i) => [h, csvLine(l)[i] ?? ''])))
      .filter((r) => r.row_type === 'targeted');
    titleStrings = {
      total: t.length,
      synthetic: t.filter((r) => /^free online /i.test(r.keyword)).length,
      measured: t.filter((r) => r.gsc_avg_position && r.gsc_avg_position !== 'Not available').length
    };
  }
  let indexStats = null;
  const covPath = path.join(ROOT, 'data', 'gsc-coverage-report.json');
  if (fs.existsSync(covPath)) {
    const cov = JSON.parse(fs.readFileSync(covPath, 'utf8'));
    if (cov.tally) indexStats = { checked: cov.uniqueUrls || 0, indexed: cov.tally.INDEXED || 0, discovered: cov.tally.DISCOVERED || 0 };
  }
  const easyTargets = (map.decisions || []).filter((d) => (d.difficulty || 0) <= 15).length;
  return {
    total: rowsT.length,
    easyTargets,
    indexStats,
    titleStrings,
    queriesInExport: qmap.size,
    startDate: gsc.startDate,
    endDate: gsc.endDate,
    siteImpressions: gsc.totals ? gsc.totals.impressions : null,
    siteClicks: gsc.totals ? gsc.totals.clicks : null,
    visible: visible.length,
    invisible: rowsT.length - visible.length,
    buckets,
    rows: visible.sort((a, b) => a.position - b.position)
  };
}
const targeted = readTargeted();

const optimize = posRows
  .filter((r) => r.position > 3 && r.position <= 30)
  .sort((a, b) => b.impressions - a.impressions)
  .slice(0, 60)
  .map((r) => ({ ...r, action: 'OPTIMIZE', score: Math.round(r.impressions * (31 - r.position) / 10) }));

// ---------- 6. shortlist ----------
// Two rows that reduce to the same core words are one page, not two
// ("p f t calculator" / "pft calculator"). Keep the best-scoring one.
const seenCore = new Set();
const dedupe = (list) => {
  const seen = new Set();
  return list.filter((r) => {
    // Order-insensitive, so "handicap calculator for golf" and "how to golf
    // handicap calculator" collapse to one page suggestion.
    const k = [...new Set(core(r.keyword))].sort().join('-');
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};
const scored = classified
  .filter((r) => r.winnableNew)
  .map((r) => ({ ...r, action: r.needsSerp ? 'NEW-SERP' : 'NEW', score: Math.round(Math.sqrt(r.volume) * Math.max(1, 26 - r.difficulty) / 5) }))
  .sort((a, b) => b.score - a.score);
const newRows = dedupe(scored.filter((r) => !r.needsSerp)).slice(0, 60);
const serpRows = dedupe(scored.filter((r) => r.needsSerp));
void seenCore;

const shortlist = [
  ...optimize.map((r) => ({ action: r.action, keyword: r.keyword, volume: '', difficulty: '', intent: '', bucket: '', gscPosition: r.position.toFixed(1), impressions: r.impressions, target: r.url, score: r.score, reason: 'already ranking just outside the top 3 — title/internal-link push' })),
  ...newRows.map((r) => ({ action: r.action, keyword: r.keyword, volume: r.volume, difficulty: r.difficulty, intent: r.intent, bucket: r.bucket, gscPosition: '', impressions: '', target: '', score: r.score, reason: 'no page carries the head noun; low difficulty and real demand' })),
  ...serpRows.map((r) => ({ action: r.action, keyword: r.keyword, volume: r.volume, difficulty: r.difficulty, intent: r.intent, bucket: r.bucket, gscPosition: '', impressions: '', target: '', score: r.score, reason: 'single acronym — SERP must decide the intent before a page is built' }))
];

const csv = ['action,keyword,volume,difficulty,intent,bucket,gsc_position,gsc_impressions,target,score,reason'];
for (const r of shortlist) csv.push([r.action, r.keyword, r.volume, r.difficulty, r.intent, r.bucket, r.gscPosition, r.impressions, r.target, r.score, r.reason].map(csvCell).join(','));
fs.writeFileSync(OUT_CSV, csv.join('\n') + '\n');

// ---------- 7. report ----------
const pct = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : '—';
const L = [];
L.push('# 2,000-keyword opportunity review — ' + TODAY);
L.push('');
L.push('> Source: `' + path.basename(sourceFile) + '` (' + classified.length + ' rows) · built pages read from `deploy/sitemap.xml` · positions read from `data/keyword-research.csv` (GSC 2026-09-16 → 2026-10-14).');
L.push('> Auto-generated by `node scripts/analyze-keyword-opportunities.cjs`. No difficulty number is invented; all are the export\'s own `Search Difficulty`.');
L.push('');
L.push('## 1. Seedha jawab');
L.push('');
L.push('**Nahi — 2,000 mein se 2,000 par rank nahi kar sakte, aur koshish karna nuksan hai.** Teen filters lagane ke baad **' + counts.winnableNew + ' rows** bachti hain: **' + newRows.length + ' saaf-intent page ideas** (build kar sakte hain) + **' + serpRows.length + ' acronym** (pehle SERP dekho, phir build). Baaki list ka kaam alag hai:');
L.push('');
L.push('| Kyun nahi | Keywords | Share |');
L.push('|---|---|---|');
L.push('| Brand/navigational (XE, Zillow, ADP, IRS, TI-84…) — brand ka apna tool jeetta hai | ' + (counts.byType.BRAND || 0) + ' | ' + pct(counts.byType.BRAND || 0, counts.total) + ' |');
L.push('| Difficulty 41+ — 90 din mein realistic nahi | ' + (counts.byTier['very hard (41+)'] || 0) + ' | ' + pct(counts.byTier['very hard (41+)'] || 0, counts.total) + ' |');
L.push('| Page pehle se maujood (exact + variant) — ye naya page nahi, **optimize** ka kaam hai | ' + (counts.covered + counts.variants) + ' (' + counts.covered + ' exact + ' + counts.variants + ' variant) | ' + pct(counts.covered + counts.variants, counts.total) + ' |');
L.push('| Head noun hai, qualifiers match nahi (variant-risk) — pehle inspect karo | ' + counts.variantRisk + ' | ' + pct(counts.variantRisk, counts.total) + ' |');
L.push('| Off-core intent (astrology, games, exam-score, betting) | ' + (counts.byType.OFF_CORE || 0) + ' | ' + pct(counts.byType.OFF_CORE || 0, counts.total) + ' |');
L.push('| Generic head terms ("calculator", "online calculator") | ' + (counts.byType.GENERIC || 0) + ' | ' + pct(counts.byType.GENERIC || 0, counts.total) + ' |');
L.push('');
L.push('Ye categories overlap karti hain, is liye share ka jod 100% nahi hoga. **' + counts.winnableNew + ' winnable-new** = TOOL intent + head noun ka koi page nahi (na exact, na likely-variant) + difficulty ≤25 + volume ≥1,000 + brand/medical-risk nahi.');
L.push('');
L.push('Coverage check kaise hua: har keyword ke core words site ke built pages ke tokens se match kiye gaye (URL + title). Exact = saare non-qualifier words ka page maujood; LIKELY = aadhe se zyada match (existing page ka qualifier); VARIANT_RISK = head noun kahin maujood hai par qualifiers match nahi karte (inspect karo, andha naya page mat banao); NONE = head noun ka koi page hi nahi — sirf yahi "naya page" ke candidate hain.');
L.push('');
L.push('## 2. File ka structure (jo export khud kehta hai)');
L.push('');
L.push('| Category (our classification) | Keywords |');
L.push('|---|---|');
for (const [b, n] of Object.entries(counts.byType).sort((a, b) => b[1] - a[1])) L.push('| ' + b + ' | ' + n + ' |');
L.push('');
L.push('| Coverage | Keywords |');
L.push('|---|---|');
L.push('| EXACT — page already exists | ' + counts.covered + ' |');
L.push('| LIKELY — existing page variant, verify before building | ' + counts.variants + ' |');
L.push('| VARIANT_RISK — head noun exists, qualifiers do not match | ' + counts.variantRisk + ' |');
L.push('| NONE — no page carries the head noun (true gap) | ' + (counts.total - counts.covered - counts.variants - counts.variantRisk) + ' |');
L.push('');
L.push('| Difficulty tier | Keywords |');
L.push('|---|---|');
for (const [t, n] of Object.entries(counts.byTier).sort((a, b) => b[1] - a[1])) L.push('| ' + t + ' | ' + n + ' |');
L.push('');
L.push('Export ka apna "Suggested priority" column isi list ko 979 rows par "priority/high-priority" bolta hai. Usme **' + classified.filter((r) => /priority/i.test(r.providedPriority) && r.type === 'BRAND').length + ' brand queries** aur **' + classified.filter((r) => /priority/i.test(r.providedPriority) && r.targetPage).length + ' already-covered pages** hain — is liye us column ko plan ki tarah nahi use karna chahiye.');
L.push('');
L.push('## 3. Pehle jo target kiya tha — us par rank hua ya nahi?');
L.push('');
L.push('Site ke apne ' + posRows.length + ' measured keywords par GSC position (koi estimate nahi):');
L.push('');
L.push('| Position | Keywords | Share |');
L.push('|---|---|---|');
for (const [b, n] of Object.entries(posBuckets)) L.push('| ' + b + ' | ' + n + ' | ' + pct(n, posRows.length) + ' |');
L.push('');
L.push('**Matlab:** ' + (posBuckets['top 3'] + posBuckets['top 10']) + '/' + posRows.length + ' (' + pct(posBuckets['top 3'] + posBuckets['top 10'], posRows.length) + ') top 10 mein hain, lekin **' + posBuckets['50+'] + ' (' + pct(posBuckets['50+'], posRows.length) + ') 50 se neeche** hain. "Rank kar sakte hain?" ka jawab keyword ki length se saaf milta hai:');
L.push('');
L.push('| Query length | Keywords | Top 10 | 50+ |');
L.push('|---|---|---|---|');
for (const [b, v] of Object.entries(wordBuckets).sort((a, b) => a[0].localeCompare(b[0]))) L.push('| ' + b + ' | ' + v.n + ' | ' + v.top10 + ' (' + pct(v.top10, v.n) + ') | ' + v.deep + ' (' + pct(v.deep, v.n) + ') |');
L.push('');
L.push('Yani **long-tail (4+ words) hi winnable hai**, 1–2 word head terms nahi. Ye exactly wahi pattern hai jo naye domain par expected hai — aur isi liye 550k-volume "grading calculator for finals" jaisi rows ko ignore karna hai.');
L.push('');
if (targeted) {
  L.push('## 3b. Pehle jo 107 keywords target kiye the — un par rank hua?');
  L.push('');
  L.push('`data/keyword-implementation-map.json` ke 107 targeted keywords ko GSC ke raw query list se match kiya (query mein keyword ke saare words hone chahiye — loose match, is liye asli number isse thoda kam ho sakta hai). Export: ' + targeted.startDate + ' → ' + targeted.endDate + ', **' + targeted.queriesInExport + ' distinct queries**, site total **' + (targeted.siteImpressions || 0).toLocaleString() + ' impressions / ' + (targeted.siteClicks || 0) + ' clicks**.');
  L.push('');
  L.push('| Kya hua | Targeted keywords |');
  L.push('|---|---|');
  L.push('| GSC export mein koi matching query hi nahi (practically zero visibility) | **' + targeted.invisible + ' / ' + targeted.total + '** |');
  L.push('| Koi query mili — top 10 | ' + targeted.buckets['top 10'] + ' |');
  L.push('| Koi query mili — 11–20 | ' + targeted.buckets['11–20'] + ' |');
  L.push('| Koi query mili — 21–50 | ' + targeted.buckets['21–50'] + ' |');
  L.push('| Koi query mili — 50+ | ' + targeted.buckets['50+'] + ' |');
  L.push('');
  if (targeted.rows.length) {
    L.push('| Targeted keyword | Jo query actually mili | Pos | 28d impr |');
    L.push('|---|---|---|---|');
    for (const r of targeted.rows.slice(0, 12)) L.push('| ' + r.keyword + ' | ' + (r.matchedQuery || '—') + ' | ' + r.position.toFixed(1) + ' | ' + r.impressions + ' |');
    L.push('');
  }
  L.push('**Seedha matlab:** target karna = rank karna nahi. 107 mein se **' + targeted.invisible + '** ke liye 28 din ke export mein ek bhi matching query nahi hai. Jo ' + targeted.visible + ' visible hain wo bhi exact keyword nahi, uske lambe variant hain — matlab page maujood hai, authority nahi.');
  L.push('');
  if (targeted.titleStrings) {
    L.push('Alag se: `data/keyword-research.csv` ke **' + targeted.titleStrings.total + ' "targeted" rows** mein se **' + targeted.titleStrings.synthetic + '** "free online X Calculator" jaise generator ke banaye title strings hain (koi inhe type nahi karta), aur un **' + targeted.titleStrings.total + ' mein se ' + targeted.titleStrings.measured + '** ke paas GSC position hai. Sabak: target **query phrasing** karo, title-case string nahi.');
    L.push('');
  }
  L.push('Isi liye "pehle target kiya, ab rank kyun nahi" ka jawab difficulty nahi hai: un **' + targeted.total + ' mein se ' + targeted.easyTargets + ' ki difficulty ≤15** thi. Asli rukawat ye hai:');
  L.push('');
  L.push('1. **Indexation.** ' + (targeted.indexStats ? targeted.indexStats.checked.toLocaleString() + ' URLs check kiye, sirf **' + targeted.indexStats.indexed.toLocaleString() + ' indexed** (' + pct(targeted.indexStats.indexed, targeted.indexStats.checked) + '), ' + targeted.indexStats.discovered.toLocaleString() + ' "discovered — not indexed"' : 'bahut se pages index nahi hue') + '. Jo page index nahi, us par rank ka sawaal hi nahi.');
  L.push('2. **Authority.** Naya domain, aur ' + targeted.invisible + '/' + targeted.total + ' target par Google 28 din mein koi query hi nahi dikha raha. Ye content ki kami nahi, trust/crawl priority ki kami hai.');
  L.push('3. **Crawl budget ka batwara.** 107 naye pages + 1,415 URLs = Google ke paas seemit attention. Har naye thin page se baaki pages ki crawl priority kam hoti hai.');
  L.push('');
  L.push('Naya keyword add karna in teenon ko theek nahi karta. Is liye order ulta hai: pehle jo already page 11–30 par hain unhe top 10 mein dhakelo (kam pages, zyada signal), phir limited naye pages banao.');
  L.push('');
}
L.push('## 4. Fastest wins — pehle se ranking, sirf top 3 mein dhakelna');
L.push('');
L.push('Ye 60 rows **already page 1–3 par** hain (position 4–30) aur unke paas impressions bhi hain. Naya page banane se pehle yahi push karo: title mein query term, FAQ mein exact sawaal, aur 2–3 indexed pages se internal link.');
L.push('');
L.push('| Keyword | Pos | 28d impr | Target |');
L.push('|---|---|---|---|');
for (const r of optimize.slice(0, 20)) L.push('| ' + r.keyword + ' | ' + r.position.toFixed(1) + ' | ' + r.impressions + ' | `' + (r.url || '—') + '` |');
L.push('');
L.push('## 5. Naye pages (difficulty ≤25, head noun ka koi page nahi)');
L.push('');
L.push('Do buckets, kyunki inme se kuch par page banana guesswork hoga:');
L.push('');
L.push('**5a. Build now — ' + newRows.length + ' page ideas.** Intent saaf hai (sand, paving, plywood, topsoil, golf handicap, antiderivative…). Head noun ka site par koi page nahi, difficulty ≤25.');
L.push('');
L.push('Ordering score = `round(sqrt(volume) × max(1, 26 − difficulty) / 5)`. Sirf ordering ke liye hai; traffic forecast nahi.');
L.push('');
L.push('| # | Keyword | Volume | Difficulty | Score |');
L.push('|---|---|---|---|---|');
newRows.forEach((r, i) => L.push('| ' + (i + 1) + ' | ' + r.keyword + ' | ' + r.volume.toLocaleString() + ' | ' + r.difficulty + ' | ' + r.score + ' |'));
L.push('');
if (serpRows.length) {
  L.push('**5b. SERP check pehle — ' + serpRows.length + ' acronym queries.** Ye low-difficulty hain par inka matlab ek nahi hai. 5 minute SERP dekhne se pata chalega ki Google kaun sa tool dikha raha hai; tab tak page nahi banana.');
  L.push('');
  L.push('| Keyword | Volume | Difficulty | Possible meanings |');
  L.push('|---|---|---|---|');
  for (const r of serpRows) L.push('| ' + r.keyword + ' | ' + r.volume.toLocaleString() + ' | ' + r.difficulty + ' | ' + (r.hint || '—') + ' |');
  L.push('');
}
L.push('## 6. Ranking ke liye kya sahi hai (90-day order)');
L.push('');
L.push('1. **Pehle 20 optimize** — §4 ki list se wahi pages jinke titles query term se match nahi karte. Naya page banane se pehle maujooda page ko query ke hisaab se theek karo; duplicate page banane se dono rank kharab hote hain.');
L.push('2. **Phir 8–10 naye long-tail pages** — §5a se, difficulty ≤20, volume 5k+, aur sirf wahan jahan existing calculator ka formula already maujood ho (naya calculator invent karna alag project hai). §5b wale acronym tab tak hold par rakho.');
L.push('3. **Internal links** — har naye/optimized page ko 3 indexed pages se link karo (`npm run seo:crawl-boost` ke bahar, contextual).');
L.push('4. **SERP check** — build se pehle 5 minute: top 5 results kaun hain? Agar top 5 mein brand tool + 2 government pages hain, wo keyword chhod do chahe difficulty 10 ho.');
L.push('5. **Brand/generic/off-core ko chhod do** — 2,000 list ka ' + ((counts.byType.BRAND || 0) + (counts.byType.GENERIC || 0) + (counts.byType.OFF_CORE || 0)) + ' rows isi category mein hai. Inko "opportunity" samajhna time waste hai.');
L.push('');
L.push('## 7. Honest limits');
L.push('');
L.push('- `Search Difficulty` third-party estimate hai, Google ka metric nahi. SERP dekhne ka substitute nahi.');
L.push('- GSC position 28-day average hai; ' + posRows.length + ' measured keywords mein se kai ke paas 0 clicks hain — position ka matlab ranking hai, traffic nahi.');  L.push('- Jo 2,000 rows already covered hain unka GSC position sirf tab pata hai jab wo keyword measured list mein ho; warna "covered but unmeasured" hai.');
  L.push('- §3b ka "koi query nahi" ka matlab **export mein nahi mila** hai. `data/gsc-query-page.json` top ' + (targeted ? targeted.queriesInExport : 0) + ' queries ka slice hai, poori query universe nahi — is liye ye "practically zero visibility" hai, "zero impressions" ka mathematical proof nahi.');
L.push('- Attached file **2,000 rows** hai, 9 lakh nahi. 9 lakh wala export alag hai; ye script usi CSV par `--csv` se chal jayegi (rows 2,000 se zyada ho to bhi). 9 lakh rows par har row ka page-match chalao to runtime bhi badhega aur output ka matlab bhi nahi badlega — pehle head-noun filter lagao.');
L.push('');
L.push('## 8. Files');
L.push('');
L.push('- `data/' + path.basename(OUT_CSV) + '` — ' + shortlist.length + '-row working shortlist (' + optimize.length + ' optimize + ' + newRows.length + ' new + ' + serpRows.length + ' new-SERP-check).');
L.push('- `data/' + path.basename(OUT_JSON) + '` — har row ka classification, page match, GSC join.');
L.push('');
fs.writeFileSync(OUT_MD, L.join('\n'));

fs.writeFileSync(OUT_JSON, JSON.stringify({
  ranAt: new Date().toISOString(),
  sourceFile: path.basename(sourceFile),
  totals: counts,
  measured: { total: posRows.length, posBuckets, wordBuckets },
  shortlist: shortlist.length,
  rows: classified
}, null, 2));

console.log('=== Keyword opportunity review ===');
console.log('rows: ' + classified.length + '  ·  covered: ' + counts.covered + '  ·  winnable new: ' + counts.winnableNew);
console.log('types: ' + JSON.stringify(counts.byType));
console.log('tiers: ' + JSON.stringify(counts.byTier));
console.log('measured top10: ' + (posBuckets['top 3'] + posBuckets['top 10']) + '/' + posRows.length + '  ·  50+: ' + posBuckets['50+']);
console.log('shortlist: ' + shortlist.length + ' rows (' + optimize.length + ' optimize + ' + newRows.length + ' new + ' + serpRows.length + ' new-SERP)');
if (targeted) console.log('previously targeted: ' + targeted.visible + '/' + targeted.total + ' have any GSC query · invisible: ' + targeted.invisible);
console.log('💾 ' + path.relative(ROOT, OUT_MD) + ' + ' + path.relative(ROOT, OUT_CSV) + ' + ' + path.relative(ROOT, OUT_JSON));
