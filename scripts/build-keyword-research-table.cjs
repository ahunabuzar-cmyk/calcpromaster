#!/usr/bin/env node
/* ============================================================
 * Deliverable B — keyword research table (Phase 2)
 * ------------------------------------------------------------
 * Har requested field ka apna column hai, aur har cell batata hai ke
 * value kahan se aayi — ya kyun khaali hai. Jo cheez naap nahi paayi gayi
 * us par "Not available" likha jata hai; koi number invent nahi hota.
 *
 * COLUMNS (brief ki field list, wahi order):
 *   1  keyword                        8  cpc
 *   2  primary_topic                  9  serp_dominant_page_types
 *   3  search_intent                 10  search_result_features
 *   4  country                       11  competing_urls
 *   5  language                      12  current_calcpro_url
 *   6  monthly_search_volume         13  recommended_target_url
 *   7  keyword_difficulty            14  related_keyword_cluster
 *                                    15  evidence_source_date
 *                                    +   confidence_level, missing_data
 *   measured evidence columns (GSC): impressions / clicks / CTR / avg position
 *   + row_type (measured | targeted)
 *
 * SOURCES (sab repo ke andar, sab real):
 *   · data/gsc-query-page.json  — GSC query→page export (28 din) — MEASURED
 *   · js/data/*.js              — curated `kw` phrases per tool — TARGETED, not measured
 *   · docs/SERP-OPPORTUNITY-REPORT.md — Phase 3 probe observations (dates + URLs read)
 *   · scripts/keyword-difficulty.cjs  — structural difficulty MODEL (not a provider score)
 *
 * JO NAHI HAI (aur kyun):
 *   · monthly search volume, CPC, backlink/competitor metrics — koi keyword
 *     provider is environment se connected nahi hai
 *   · country / device dimension — GSC export site-level hai
 *   · competitor metrics (DR/DA, referring domains) — Ahrefs/Semrush nahi hai
 *
 * Run:  node scripts/build-keyword-research-table.cjs [--min 3]
 * ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { tier, score, volumeProxy } = require('./keyword-difficulty.cjs');

const ROOT = path.join(__dirname, '..');
const GSC_FILE = path.join(ROOT, 'data', 'gsc-query-page.json');
const REACH_FILE = path.join(ROOT, 'data', 'query-reach.json');
const PAGES_FILE = path.join(__dirname, '.keywords.jsonl');
const DATA_DIR = path.join(ROOT, 'js', 'data');
const CSV_OUT = path.join(ROOT, 'data', 'keyword-research.csv');
const MD_OUT = path.join(ROOT, 'docs', 'KEYWORD-RESEARCH.md');

const NA = 'Not available';
const PROBE_DATE = '2026-10-12';

const argv = process.argv.slice(2);
const minIdx = argv.indexOf('--min');
const MIN_IMPRESSIONS = minIdx >= 0 ? Number(argv[minIdx + 1]) : 3;

/* ---------- helpers ---------- */
const norm = (u) => {
  const s = String(u || '').replace(/^https?:\/\/[^/]+/i, '');
  if (!s || s === '/') return '/';
  return s.replace(/\/+$/, '');
};
const csvCell = (v) => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const fmtPct = (n) => (n === undefined || n === null ? NA : (Number(n) * 100).toFixed(2) + '%');
const fmtPos = (n) => (n === undefined || n === null ? NA : Number(n).toFixed(1));

/* ---------- intent rules (code mein likhe hue — koi AI verdict nahi) ---------- */
const INTENT_RULES = [
  { intent: 'informational-question', re: /^(how|what|why|when|where|which|who|is|are|does|do|can|should|will|much|many|long)\b/i },
  { intent: 'commercial-comparison', re: /\b(vs|versus|compare|comparison|best|top \d+|cheapest|alternative)\b/i },
  { intent: 'transactional-tool', re: /\b(calculator|calculate|converter|convert|estimate|generator|tool)\b/i },
  { intent: 'informational-definition', re: /\b(meaning|definition|formula|example|explained)\b/i },
];
function deriveIntent(kw) {
  const s = String(kw || '').trim();
  for (const r of INTENT_RULES) if (r.re.test(s)) return r.intent;
  return 'unclassified';
}

/* ---------- Phase 3 probe map — only what the probe actually observed ---------- */
const SERP = {
  '/lifestyle/home-insurance': {
    cluster: 'home insurance cost',
    dominant: 'insurer lead-form pages (Progressive, Liberty Mutual, Allstate) + cost-data publishers (NerdWallet, Matic)',
    features: 'PAA: "How much is homeowners insurance for a $500,000 house?" / "$400,000" / "$350,000" / "$200,000"; AI Overview, ads, sitelinks UNVERIFIED (no rendered SERP captured)',
    competitors: [
      'https://www.nerdwallet.com/insurance/homeowners/home-insurance-calculator',
      'https://matic.com/home-insurance-calculator/',
      'https://www.usnews.com/insurance/homeowners-insurance/calculator',
      'https://www.progressive.com/homeowners/insurance-coverages/calculator/',
    ],
    confidence: 'LOW',
    note: 'most competitor pages blocked the fetch; probe date inconsistent — re-run before acting. See docs/SERP-OPPORTUNITY-REPORT.md §1',
  },
  '/guides/business-days': {
    cluster: 'business days / deadline arithmetic',
    dominant: 'calculator tools + explainer articles (timetrex, hivedesk, howmanybusinessdays, gigacalculator, timeanddate)',
    features: 'PAA: "How do you calculate business days?" / "How long is 3 to 7 business days?" / "How long is 5 business days from today?" / "What is 3 business days in days?"; AI Overview, ads, sitelinks UNVERIFIED',
    competitors: [
      'https://www.hivedesk.com/calculators/business-days-calculator',
      'https://howmanybusinessdays.com/',
      'https://www.gigacalculator.com/calculators/working-days-calculator.php',
      'https://www.timetrex.com/resources/us-business-day-date-calculator',
      'https://howlongagogo.com/business-days/3-business-days-from-today',
      'https://www.atomixlogistics.com/blog/business-days-for-shipping',
    ],
    confidence: 'MEDIUM-HIGH',
    note: '4 competitor pages read in full. See docs/SERP-OPPORTUNITY-REPORT.md §2',
  },
  '/finance/apy-calculator': {
    cluster: 'APY / savings yield',
    dominant: 'bank & fintech calculators (marketing surfaces) + bank explainer articles; "APY vs APR" has NO calculator in the observed set',
    features: 'PAA: "What is 5% APY on $1000 monthly?" / "How much money will I earn on $10,000 with a 4% APY?" / "Which bank gives 7% interest on savings accounts?" / "Is 4% APY good for savings?"; AI Overview, bank ads, calculator widget UNVERIFIED',
    competitors: [
      'https://www.axosbank.com/tools/calculators/apy-calculator',
      'https://www.bankrate.com/banking/savings/simple-savings-calculator/',
      'https://www.ally.com/stories/save/apy-vs-apr-what-is-apr-what-is-apy/',
      'https://www.fidelity.com/learning-center/smart-money/apr-vs-apy',
      'https://us.cibc.com/en/personal/cibc-insights/apy-vs-apr-differences.html',
    ],
    confidence: 'MEDIUM',
    note: 'several bank calculators returned 403/405 to the fetcher. See docs/SERP-OPPORTUNITY-REPORT.md §3',
  },
  '/health/bmr-mifflin': {
    cluster: 'BMR / resting energy',
    dominant: 'calculator pages + health-authority articles (calculator.net, garnethealth, myfitnesspal, clevelandclinic, healthline)',
    features: 'PAA: "What is a good BMR for a 50 year old woman?" / "What is my BMR if I have hypothyroidism?" / "Is burning 700 active calories a day enough?" / "How many calories a day to lose 2 lbs a week?" / "Can I just eat my BMR to lose weight?"; AI Overview, ads, video UNVERIFIED',
    competitors: [
      'https://www.calculator.net/bmr-calculator.html',
      'https://www.garnethealth.org/news/basal-metabolic-rate-calculator',
      'https://www.myfitnesspal.com/tools/bmr-calculator',
      'https://my.clevelandclinic.org/health/body/basal-metabolic-rate-bmr',
      'https://www.nasm.org/resources/calorie-calculator',
    ],
    confidence: 'MEDIUM-HIGH',
    note: '4 competitor pages read in full; 3 of the PAA questions are clinical and are deliberately NOT answered with advice. See docs/SERP-OPPORTUNITY-REPORT.md §4',
  },
};

/* ---------- load page rows (titles) — generated, may be absent ---------- */
let pagesByUrl = new Map();
let pagesAvailable = false;
if (fs.existsSync(PAGES_FILE)) {
  try {
    for (const line of fs.readFileSync(PAGES_FILE, 'utf8').trim().split('\n')) {
      if (!line.trim()) continue;
      const p = JSON.parse(line);
      pagesByUrl.set(norm(p.url), p);
    }
    pagesAvailable = pagesByUrl.size > 0;
  } catch (e) {
    pagesByUrl = new Map();
    pagesAvailable = false;
  }
}
const basenameMap = new Map();
for (const [url] of pagesByUrl) {
  const base = url.split('/').filter(Boolean).pop();
  if (base && !basenameMap.has(base)) basenameMap.set(base, url);
}

/* ---------- load curated phrases per tool (js/data/*.js) ---------- */
const tools = []; // { cat, id, name, url, phrases[] }
if (fs.existsSync(DATA_DIR)) {
  const sandbox = { process, require, module: { exports: {} }, console: { log() {}, warn() {}, error() {} } };
  vm.createContext(sandbox);
  for (const file of fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.js')).sort()) {
    const cat = file.replace(/\.js$/, '');
    let arr;
    try {
      sandbox.module = { exports: {} };
      vm.runInContext(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'), sandbox, { filename: file });
      arr = sandbox.module.exports;
    } catch (e) { continue; }
    if (!Array.isArray(arr)) continue;
    for (const t of arr) {
      if (!t || !t.id || !t.name) continue;
      const direct = '/' + cat + '/' + t.id;
      const url = pagesByUrl.has(direct) ? direct : (basenameMap.get(t.id) || direct);
      const phrases = String(t.kw || '').split(',').map((s) => s.trim()).filter(Boolean);
      tools.push({ cat, id: t.id, name: t.name, url, phrases, file });
    }
  }
}

/* ---------- load the measured GSC join ---------- */
const gsc = JSON.parse(fs.readFileSync(GSC_FILE, 'utf8'));
const gscWindow = `${gsc.startDate} → ${gsc.endDate} (${gsc.days} days)`;

// one row per query: the page that actually received the most impressions for it
const byQuery = new Map();
for (const p of gsc.pairs || []) {
  const key = String(p.query || '').trim().toLowerCase();
  if (!key) continue;
  const cur = byQuery.get(key);
  if (!cur || p.impressions > cur.impressions) byQuery.set(key, p);
}

const measured = [...byQuery.values()]
  .filter((p) => Number(p.impressions) >= MIN_IMPRESSIONS)
  .sort((a, b) => b.impressions - a.impressions);

/* ---------- priority pages (measured reach) + probed pages ---------- */
const reach = fs.existsSync(REACH_FILE) ? JSON.parse(fs.readFileSync(REACH_FILE, 'utf8')) : {};
const priority = new Set();
for (const p of reach.topPages || []) priority.add(norm(p.path));
for (const p of reach.backlog || []) priority.add(norm(p.path));
for (const u of Object.keys(SERP)) priority.add(u);

const MSG_SITE_LEVEL = 'GSC export is site-level — it carries no country or device dimension (a country-split export is required)';
const MSG_NO_PROVIDER = 'No keyword provider connected (Keyword Planner / Ahrefs / Semrush)';

function topicFor(url, toolMap) {
  const t = toolMap.get(url);
  if (t) return t.name + ' (' + t.cat + ')';
  const page = pagesByUrl.get(url);
  if (page && page.title) return page.title.replace(/\s*\|\s*CalcProMaster.*$/, '');
  const seg = url.split('/').filter(Boolean);
  return seg.length > 1 ? seg[0] + ' · ' + seg[seg.length - 1] : (seg[0] || 'homepage');
}

const toolByUrl = new Map();
for (const t of tools) if (!toolByUrl.has(t.url)) toolByUrl.set(t.url, t);

const SERP_COLS = (url) => {
  const s = SERP[url];
  if (!s) {
    return {
      dominant: 'Not probed yet',
      features: 'Not probed yet',
      competitors: NA,
      cluster: url.split('/').filter(Boolean)[0] || 'root',
      probeNote: 'Phase 3 SERP probe covers 4 clusters only — see docs/SERP-OPPORTUNITY-REPORT.md §6',
      probeConfidence: NA,
    };
  }
  return {
    dominant: s.dominant,
    features: s.features,
    competitors: s.competitors.join(' | '),
    cluster: s.cluster,
    probeNote: s.note,
    probeConfidence: s.confidence,
  };
};

/* ---------- rows ---------- */
const HEADER = [
  'row_type', 'keyword', 'primary_topic', 'search_intent', 'country', 'language',
  'monthly_search_volume', 'keyword_difficulty', 'cpc',
  'serp_dominant_page_types', 'search_result_features', 'competing_urls',
  'current_calcpro_url', 'recommended_target_url', 'related_keyword_cluster',
  'evidence_source_date', 'confidence_level', 'missing_data',
  'gsc_impressions_28d', 'gsc_clicks_28d', 'gsc_ctr', 'gsc_avg_position',
];

const rows = [];

for (const p of measured) {
  const url = norm(p.page);
  const s = SERP_COLS(url);
  const t = tier(p.query);
  const sc = score(p.query);
  rows.push([
    'measured',
    p.query,
    topicFor(url, toolByUrl),
    deriveIntent(p.query),
    NA + ' — ' + MSG_SITE_LEVEL,
    'en (query text is English; export carries no language dimension)',
    NA + ' — ' + MSG_NO_PROVIDER,
    `${t}/${sc} — repo structural MODEL (scripts/keyword-difficulty.cjs); the provider's own KD scale is ${NA}`,
    NA + ' — ' + MSG_NO_PROVIDER,
    s.dominant,
    s.features,
    s.competitors,
    url,
    url,
    s.cluster,
    `Google Search Console query→page export ${gscWindow}, pulled ${gsc.ranAt}; SERP probe ${PROBE_DATE}`,
    s.probeConfidence === NA
      ? 'measured (GSC); SERP probe pending for this cluster'
      : `measured (GSC) + SERP probe (probe confidence: ${s.probeConfidence})`,
    [MSG_NO_PROVIDER, MSG_SITE_LEVEL, s.probeNote].join(' · '),
    Number(p.impressions),
    Number(p.clicks),
    fmtPct(p.ctr),
    fmtPos(p.position),
  ]);
}

// targeted (curated) phrases for the priority pages only — the full curated list
// lives in docs/KEYWORD-TARGETS.md; here we attach the ones whose pages we touch.
let targetedCount = 0;
for (const t of tools) {
  if (!priority.has(t.url) || !t.phrases.length) continue;
  for (const kw of t.phrases) {
    const s = SERP_COLS(t.url);
    targetedCount += 1;
    rows.push([
      'targeted',
      kw,
      topicFor(t.url, toolByUrl),
      deriveIntent(kw),
      NA + ' — ' + MSG_SITE_LEVEL,
      'en (site default; per-page hreflang not present)',
      NA + ' — ' + MSG_NO_PROVIDER + '; modelled demand class below',
      `${tier(kw)}/${score(kw)} — repo structural MODEL (scripts/keyword-difficulty.cjs); modelled demand class: ${volumeProxy(kw)}; provider KD scale ${NA}`,
      NA + ' — ' + MSG_NO_PROVIDER,
      s.dominant,
      s.features,
      s.competitors,
      t.url,
      t.url,
      s.cluster,
      `js/data/${t.file} curated \`kw\` field (source-controlled, not a measurement); SERP probe ${PROBE_DATE}`,
      'targeted-not-measured (no GSC impressions yet, or below the ' + MIN_IMPRESSIONS + '-impression floor)',
      [MSG_NO_PROVIDER, 'No measured impressions for this phrase in the window', s.probeNote].join(' · '),
      // measured columns stay EMPTY rather than omitted, so every row in the
      // spreadsheet has the same width and no column can shift when it is opened.
      '', '', '', '',
    ]);
  }
}

/* ---------- write CSV ---------- */
const csv = [HEADER.join(',')]
  .concat(rows.map((r) => r.map(csvCell).join(',')))
  .join('\n') + '\n';
fs.writeFileSync(CSV_OUT, csv, 'utf8');

/* ---------- write the readable companion ---------- */
const probed = Object.keys(SERP).filter((u) => priority.has(u));
const top = rows.filter((r) => r[0] === 'measured').slice(0, 50);
const L = [];
const push = (s = '') => L.push(s);
const mdCell = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');

push('# Keyword research table — CalcProMaster (Phase 2 / deliverable B)');
push('');
push(`_Generated ${PROBE_DATE} by \`node scripts/build-keyword-research-table.cjs\`. Machine-generated — nothing hand-added._`);
push('');
push('**Spreadsheet:** `data/keyword-research.csv` — ' + rows.length.toLocaleString('en-US') + ' rows × ' + HEADER.length + ' columns.');
push('');
push('## 0. Honesty box — what is measured, modelled, and unavailable');
push('');
push('| Class | Columns | Source |');
push('|---|---|---|');
push('| **Measured** | `gsc_impressions_28d`, `gsc_clicks_28d`, `gsc_ctr`, `gsc_avg_position`, `current_calcpro_url` | Google Search Console query→page export, ' + gscWindow + ' (pulled ' + gsc.ranAt + '); ' + (gsc.coverage ? (gsc.coverage.pairImpressions).toLocaleString('en-US') + ' of ' + (gsc.coverage.totalImpressions).toLocaleString('en-US') + ' impressions joined' : 'coverage not recorded') + ' |');
push('| **Observed (SERP)** | `serp_dominant_page_types`, `search_result_features`, `competing_urls` | Phase 3 probe of 4 clusters — pages actually fetched and read. See `docs/SERP-OPPORTUNITY-REPORT.md` |');
push('| **Modelled** | `keyword_difficulty` | `scripts/keyword-difficulty.cjs` structural model. It is **not** a provider KD score and must not be compared to one. |');
push('| **Targeted, not measured** | rows with `row_type = targeted` | curated `kw` phrases in `js/data/*.js` — what the site was built to rank for, with zero impressions as evidence |');
push('| **Not available** | `monthly_search_volume`, `cpc`, provider KD, backlink/competitor metrics, country & device splits | no keyword provider and no country-dimension export is connected to this environment |');
push('');
push('Search volume and CPC are **not estimated** in any cell: an estimate that looks like a measurement is worse than a blank.');
push('');
push('## 1. Row counts');
push('');
push('| | Rows |');
push('|---|---|');
push('| measured queries (≥' + MIN_IMPRESSIONS + ' impressions in the window) | ' + measured.length.toLocaleString('en-US') + ' |');
push('| targeted phrases on priority pages | ' + targetedCount.toLocaleString('en-US') + ' |');
push('| **total** | **' + rows.length.toLocaleString('en-US') + '** |');
push('');
push('The full curated target list (2,500+ phrases across 1,201 tool pages) is not repeated here — it is `docs/KEYWORD-TARGETS.md`. This table carries the phrases for the pages we are actually working on.');
push('');
push('## 2. Probed clusters (Phase 3 coverage)');
push('');
push('| Cluster | CalcProMaster page | Dominant page types on the SERP | Probe confidence |');
push('|---|---|---|---|');
for (const u of probed) {
  const s = SERP[u];
  push('| ' + mdCell(s.cluster) + ' | `' + u + '` | ' + mdCell(s.dominant) + ' | ' + s.confidence + ' |');
}
push('');
push('4 of the site\u2019s priority pages have real SERP observations; every other row says `Not probed yet` on purpose. A probe is manual by design — no scraping, no SERP API abuse.');
push('');
push('## 3. Top 50 measured queries (by impressions in the window)');
push('');
push('| # | keyword | intent | impressions | clicks | CTR | avg pos | current URL |');
push('|---|---|---|---|---|---|---|---|');
top.forEach((r, i) => {
  push('| ' + (i + 1) + ' | ' + mdCell(r[1]) + ' | ' + mdCell(r[3]) + ' | ' + r[18] + ' | ' + r[19] + ' | ' + r[20] + ' | ' + r[21] + ' | `' + r[12] + '` |');
});
push('');
push('Intent is derived by the pattern rules written in `scripts/build-keyword-research-table.cjs` (`INTENT_RULES`) — the rule that fired is inspectable, no model verdict is hidden in the data.');
push('');
push('## 4. What the table cannot answer yet');
push('');
push('| Missing input | Column it unlocks | How to get it |');
push('|---|---|---|');
push('| Real volume + provider KD + CPC | `monthly_search_volume`, `cpc`, provider KD scale | Google Keyword Planner or an Ahrefs/Semrush export → `data/` |');
push('| Country + device split | `country` | GSC export with the `country` dimension |');
push('| Rendered SERP (AI Overview, ads, sitelinks) | `search_result_features` | A rendered-browser probe pass, cluster by cluster |');
push('| Competitor authority metrics | `competing_urls` (strength) | A backlink provider; today only the URLs themselves are recorded |');
push('');
push('## 5. Reproduce');
push('');
push('```bash');
push('node scripts/build-keyword-research-table.cjs            # ≥3 impressions');
push('node scripts/build-keyword-research-table.cjs --min 1    # every query with any impression');
push('```');
push('');
push('The measured half depends on `data/gsc-query-page.json`, refreshed with `node scripts/gsc-queries.cjs --days 28` (needs GSC credentials).');
push('');

fs.writeFileSync(MD_OUT, L.join('\n'), 'utf8');

console.log(`keyword research table → ${path.relative(ROOT, CSV_OUT)} (${rows.length} rows)`);
console.log(`                       → ${path.relative(ROOT, MD_OUT)}`);
console.log(`  measured ${measured.length} · targeted ${targetedCount} · probed clusters ${probed.length}`);
if (!pagesAvailable) console.log('  note: scripts/.keywords.jsonl missing — titles fell back to tool names/URL segments');
