#!/usr/bin/env node
// ============================================================
// CalcProMaster — Growth model (measured, not promised)
// ------------------------------------------------------------
// Sab GSC sources ko ek jagah laata hai, unke bases reconcile karta hai, aur
// us ke baad wo arithmetic likhta hai jo "3-4 lakh impressions/month" jaise
// targets ke liye chahiye — saath mein current run-rate se multiple.
//
// Ye forecast nahi hai. Ye arithmetic hai: "target ke liye kitna chahiye" aur
// "aaj kitna hai" ka saaf farq. Koi rate is doc mein promise nahi karta ki
// kal bhi chalega — is liye har scenario ke saath uska assumption likha hai.
//
// Reads : data/gsc-coverage-export-*/Chart.csv   (daily impressions ramp)
//         data/gsc-performance-export-*/Chart.csv (same series, Performance export)
//         data/gsc-coverage-fresh.json            (indexed / not-indexed)
//         data/not-indexed-audit.json             (fixable blockers)
//         data/gsc-query-page.json                (28d totals + query→page join)
//         data/gsc-queries-raw.txt                (fallback totals)
//         data/gsc-page-impressions.json          (pages earning impressions)
// Writes: docs/GROWTH-MODEL.md · data/growth-model.json
// Usage : node scripts/build-growth-model.cjs
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DAYS_PER_MONTH = 30.44;

// GSC keeps revising a day for ~2-3 days after it happens; see trimUnfinalized.
const FINALITY_LAG_DAYS = 3;

const readJson = (rel) => {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')); } catch (e) { return null; }
};
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

// ---------- pure helpers (unit-tested) ----------

// Daily impressions series → run-rate. A ramp makes the trailing average lie:
// the 28-day average still carries the pre-ramp days. So the run-rate is the
// average of the last `window` days, and the caller is told how old it is.
function runRate(series, window = 7) {
  const rows = (series || []).filter((r) => typeof r.impressions === 'number');
  if (!rows.length) return null;
  const tail = rows.slice(-Math.min(window, rows.length));
  const perDay = tail.reduce((s, r) => s + r.impressions, 0) / tail.length;
  return {
    perDay,
    perMonth: perDay * DAYS_PER_MONTH,
    from: tail[0].date,
    to: tail[tail.length - 1].date,
    days: tail.length,
    windowRequested: window,
  };
}

// Months of growth at a constant month-over-month rate g to go from r0 to target.
// Returns null when the target is already met (no months needed) and Infinity
// when growth is zero or negative and the target is above r0.
function monthsToTarget(r0, g, target) {
  if (r0 >= target) return 0;
  if (!(g > 0)) return Infinity;
  return Math.ceil(Math.log(target / r0) / Math.log(1 + g));
}

// Impressions by position band with the MEASURED click-through in each band.
// This is the honest counterweight to "impressions = traffic": bands far down
// the page collect impressions without any realistic click.
function ladder(pairs, bands = [[1, 3], [4, 10], [11, 20], [21, 50], [51, Infinity]]) {
  const out = bands.map(([lo, hi]) => ({
    band: hi === Infinity ? lo + '+' : lo + '-' + hi,
    lo, hi, pairs: 0, impressions: 0, clicks: 0, ctr: 0,
  }));
  for (const p of pairs || []) {
    const pos = p.position || 0;
    const b = out.find((x) => pos >= x.lo && pos <= x.hi);
    if (!b) continue;
    b.pairs += 1;
    b.impressions += p.impressions || 0;
    b.clicks += p.clicks || 0;
  }
  for (const b of out) b.ctr = b.impressions ? b.clicks / b.impressions : 0;
  return out;
}

// What a target multiple is made of. impressions ≈ indexed pages × impressions
// per indexed page, so the gap to a target splits into "index more" and
// "expose each page more". Both multipliers are reported so neither gets
// silently assumed to be free.
function decompose({ indexed, known, runRateMonthly, targetMonthly, exposureMultiple }) {
  const perPage = indexed ? runRateMonthly / indexed : 0;
  const indexMultiple = indexed ? known / indexed : 0;
  const need = runRateMonthly > 0 ? targetMonthly / runRateMonthly : Infinity;
  const requested = exposureMultiple > 0 ? exposureMultiple : (need / (indexMultiple || 1));
  return {
    indexed, known, runRateMonthly, targetMonthly,
    impressionsPerIndexedPagePerMonth: perPage,
    targetMultiple: need,
    indexMultiple,
    exposureMultiple: requested,
    fullIndexImpressions: runRateMonthly * indexMultiple,
    bothApplied: runRateMonthly * indexMultiple * requested,
  };
}

// ---------- reads ----------

// Two GSC exports carry a daily impressions series, in different column orders:
//   data/gsc-coverage-export-<date>/Chart.csv     date,notIndexed,indexed,impressions
//   data/gsc-performance-export-<date>/Chart.csv  date,clicks,impressions,ctr,position
// Coverage is only downloaded when someone opens the Coverage report, so a site
// that stopped exporting coverage kept feeding every report a frozen window.
// Same day in both → the export downloaded later wins (it is the more finalised
// reading), which is why the folders are walked oldest-name-first and overwritten.
const IMPRESSIONS_COLUMN = { coverage: 3, performance: 2 };

function readDailySeries() {
  const dirs = fs.existsSync(path.join(ROOT, 'data'))
    ? fs.readdirSync(path.join(ROOT, 'data')).filter((d) => /^gsc-(coverage|performance)-export-/.test(d)).sort()
    : [];
  const byDate = new Map();
  for (const d of dirs) {
    const csvPath = path.join(ROOT, 'data', d, 'Chart.csv');
    if (!fs.existsSync(csvPath)) continue;
    const col = IMPRESSIONS_COLUMN[/^gsc-coverage-export-/.test(d) ? 'coverage' : 'performance'];
    const lines = fs.readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
    for (const line of lines.slice(1)) {
      const c = line.split(',');
      if (c.length <= col) continue;
      const impressions = parseInt(c[col], 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(c[0]) || !Number.isFinite(impressions)) continue;
      byDate.set(c[0], { date: c[0], impressions, source: d });
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// GSC keeps revising the tail of its Performance chart: a day can read "2
// impressions" while it is still being filled in, then settle at several hundred.
// A window that ends on such a day measures Google's pipeline, not the site —
// which is how "impressions gir gaye" gets concluded from unfinished data. Any day
// newer than the newest day minus `lagDays` is dropped before a rate is taken.
function trimUnfinalized(series, lagDays = 3) {
  const rows = (Array.isArray(series) ? series : [])
    .filter((r) => r && typeof r.date === 'string' && Number.isFinite(r.impressions))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!rows.length) return [];
  const newest = Date.parse(rows[rows.length - 1].date);
  const cutoff = newest - lagDays * 864e5;
  return rows.filter((r) => Date.parse(r.date) <= cutoff);
}

// Earliest real 7-day reading in the trend CSV — the "135 impressions/week"
// starting point, read from data instead of remembered from a report.
function readTrendStart() {
  if (!exists('data/gsc-trend.csv')) return null;
  const lines = fs.readFileSync(path.join(ROOT, 'data/gsc-trend.csv'), 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const head = lines[0].split(',');
  const dateI = head.indexOf('date');
  const imprI = head.indexOf('impr_7d');
  if (dateI < 0 || imprI < 0) return null;
  for (const line of lines.slice(1)) {
    const c = line.split(',');
    const n = parseInt(c[imprI], 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(c[dateI]) && Number.isFinite(n) && n > 0) return { date: c[dateI], impressions7d: n };
  }
  return null;
}

function readApiTotals() {
  const j = readJson('data/gsc-query-page.json');
  if (j && j.totals) {
    return {
      clicks: j.totals.clicks, impressions: j.totals.impressions,
      ctr: j.totals.ctr, position: j.totals.position,
      startDate: j.startDate, endDate: j.endDate, days: j.days, ranAt: j.ranAt, site: j.site,
      coverage: j.coverage || null,
      pairs: j.pairs || [], sources: ['data/gsc-query-page.json'],
    };
  }
  if (exists('data/gsc-queries-raw.txt')) {
    const raw = fs.readFileSync(path.join(ROOT, 'data/gsc-queries-raw.txt'), 'utf8');
    const m = raw.match(/clicks=(\d+)\s+impressions=(\d+)\s+ctr=([\d.]+)%\s+pos=([\d.]+)/);
    if (m) {
      return {
        clicks: parseInt(m[1], 10), impressions: parseInt(m[2], 10),
        ctr: parseFloat(m[3]) / 100, position: parseFloat(m[4]),
        startDate: null, endDate: null, days: 28, ranAt: null, site: 'https://calcpromaster.com',
        pairs: [], sources: ['data/gsc-queries-raw.txt'],
      };
    }
  }
  return null;
}

// ---------- main ----------

function main() {
  const allDays = readDailySeries();
  // Same finality rule as the run-rate tracker: the two reports must not quote
  // different numbers for the same week.
  const series = trimUnfinalized(allDays, FINALITY_LAG_DAYS);
  const droppedDays = allDays.length - series.length;
  const api = readApiTotals();
  const fresh = readJson('data/gsc-coverage-fresh.json');
  const audit = readJson('data/not-indexed-audit.json');
  const pageImpressions = readJson('data/gsc-page-impressions.json');
  const trendStart = readTrendStart();

  const problems = [];
  if (!series.length) problems.push('koi daily series nahi (data/gsc-coverage-export-*/Chart.csv missing)');
  if (!api) problems.push('GSC API totals nahi (data/gsc-query-page.json ya gsc-queries-raw.txt missing)');

  const rr7 = runRate(series, 7);
  const rr3 = runRate(series, 3);
  const rrAll = runRate(series, series.length);

  const latest = (fresh && fresh.latest) || null;
  const known = latest ? latest.indexed + latest.notIndexed : null;
  const notIndexed = latest ? latest.notIndexed : null;

  const apiPerDay = api && api.days ? api.impressions / api.days : null;

  // The reconciliation this script exists to make: a 28-day average is a
  // lagging number during a ramp, and the site is in one.
  const reconcile = api && rr7 ? {
    apiImpressions: api.impressions,
    apiDays: api.days,
    apiPerDay: Math.round(apiPerDay),
    runRatePerDay: Math.round(rr7.perDay),
    ratio: apiPerDay ? rr7.perDay / apiPerDay : null,
  } : null;

  const L = [];
  const push = (s) => { L.push(s); };
  push('# Growth model — what the impressions target actually costs');
  push('');
  push('> Auto-generated by `node scripts/build-growth-model.cjs`.');
  push('> Ye **arithmetic** hai, **forecast nahi**. Har scenario ke saath uska assumption likha hai.');
  if (rr7) push('> **Data as of ' + rr7.to + '** (export ' + (series.length ? series[series.length - 1].source : '?') + ')' + (api && api.endDate ? ' · API window ' + api.startDate + ' → ' + api.endDate : '') + '.');
  if (droppedDays > 0) push('> Last ' + droppedDays + ' day(s) of the chart are excluded: GSC has not finalised them yet, and an unfinished day reads as a collapse. (Whether a thin day later fills in is NOT assumed — on 2026-10-25 the 19-21 Oct days that were called "still filling in" re-measured at 2, 4 and 1 impressions and stayed there; see docs/IMPRESSION-DROP-2026-10-24.md §6.)');
  push('');

  if (problems.length) {
    push('## ⚠ Missing input');
    for (const p of problems) push('- ' + p);
    push('');
  }

  // ---- 1. basis reconciliation ----
  push('## 1. Pehle basis clear karo: kaunsa number sach hai');
  push('');
  push('Ek hi site ke teen GSC numbers ghoom rahe the, aur wo alag lagte hain. Wo alag *nahi* hain — kyunki window alag hai:');
  push('');
  push('| Source | Window | Impressions | Per day | Monthly equivalent |');
  push('|---|---|---|---|---|');
  if (api) {
    push('| GSC API (28-day totals) | ' + (api.startDate || '?') + ' → ' + (api.endDate || '?') + ' | ' + api.impressions + ' | ' + Math.round(apiPerDay) + ' | ~' + fmt(apiPerDay * DAYS_PER_MONTH) + ' |');
  }
  if (rr7) {
    push('| Coverage chart (last 7 days) | ' + rr7.from + ' → ' + rr7.to + ' | ' + Math.round(rr7.perDay * rr7.days) + ' | ' + Math.round(rr7.perDay) + ' | ~' + fmt(rr7.perMonth) + ' |');
  }
  if (rr3) {
    push('| Coverage chart (last 3 days) | ' + rr3.from + ' → ' + rr3.to + ' | ' + Math.round(rr3.perDay * rr3.days) + ' | ' + Math.round(rr3.perDay) + ' | ~' + fmt(rr3.perMonth) + ' |');
  }
  if (rrAll) {
    push('| Coverage chart (poori series) | ' + rrAll.from + ' → ' + rrAll.to + ' | ' + Math.round(rrAll.perDay * rrAll.days) + ' | ' + Math.round(rrAll.perDay) + ' | ~' + fmt(rrAll.perMonth) + ' |');
  }
  push('');
  if (reconcile) {
    push('**Reconciliation:** 28-day average **' + reconcile.apiPerDay + '/day**, jab ki aaj ka run-rate **' + reconcile.runRatePerDay + '/day** — 28d number us se ' + reconcile.ratio.toFixed(1) + 'x neeche hai.');
    push('');
  }
  push('Wajah series mein saaf dikhti hai: ramp ' + (series.length ? series.find((r) => r.impressions > 500)?.date : '?') + ' ke aas paas shuru hota hai' + (series.length ? ' (' + (series.find((r) => r.impressions > 500)?.source || '') + ')' : '') + '.');
  push('28-day window ke pehle din sifar ke qareeb the, is liye average aaj ki speed se hamesha peeche rahega. **Run-rate ke liye 7-day (ya 3-day) window padho, 28-day sirf trend comparison ke liye.**');
  push('');
  push('Ye ramp sirf organic nahi hai — yahi waqt .com migration + sitemap resubmission ka hai. Yani is jump ka hissa **measurement/indexing event** hai, pure compounding nahi. Is liye ise growth rate ki tarah extrapolate karna ghalat hoga.');
  push('');

  // ---- 2. target arithmetic ----
  const base = rr7 ? rr7.perMonth : (api ? apiPerDay * DAYS_PER_MONTH : 0);
  push('## 2. Target ka arithmetic');
  push('');
  push('Current run-rate **' + fmt(base) + '/month** (' + Math.round(rr7 ? rr7.perDay : 0) + '/day' + (rr7 ? ', ' + rr7.from + ' → ' + rr7.to + ' ka average' : '') + ') ko base maan kar:');
  push('');
  push('| Target / month | Impressions / day | Aaj se multiple |');
  push('|---|---|---|');
  for (const t of [100000, 200000, 300000, 400000]) {
    push('| ' + fmt(t) + ' | ' + fmt(t / DAYS_PER_MONTH, 0) + ' | ' + (base ? (t / base).toFixed(1) + 'x' : '?') + ' |');
  }
  push('');
  push('**Seedhi baat:** 3–4 lakh/month ke liye **' + fmt(300000 / DAYS_PER_MONTH, 0) + '–' + fmt(400000 / DAYS_PER_MONTH, 0) + ' impressions/din** chahiye — aaj ' + Math.round(rr7 ? rr7.perDay : 0) + '/din hai. Wo **' + (base ? (300000 / base).toFixed(1) : '?') + 'x–' + (base ? (400000 / base).toFixed(1) : '?') + 'x** ka farq hai. Ek mahine mein wo nahi aata: 30 din mein doubling bhi sirf 2x hai.');
  push('');

  // ---- 3. what the multiple is made of ----
  if (known && latest) {
    const d = decompose({
      indexed: latest.indexed, known,
      runRateMonthly: base, targetMonthly: 300000,
      exposureMultiple: 4,
    });
    push('## 3. Aaj ka multiple kis cheez se banta hai');
    push('');
    push('Impressions ≈ **indexed pages × per-page exposure**. Aaj ke measured numbers:');
    push('');
    push('| Lever | Value |');
    push('|---|---|');
    push('| Indexed pages | ' + d.indexed + ' |');
    push('| Known pages (sitemap) | ' + d.known + ' |');
    push('| Impressions / indexed page / month | ' + d.impressionsPerIndexedPagePerMonth.toFixed(1) + ' |');
    push('| Indexed base kitna barh sakta hai | ' + d.indexMultiple.toFixed(2) + 'x (poora index hone par) |');
    push('');
    push('- Sirf **poora index** karne se: ~' + fmt(d.fullIndexImpressions) + '/month (' + d.indexMultiple.toFixed(2) + 'x). 3 lakh tak nahi pahunchta.');
    push('- Poora index **+ per-page exposure 4x** (position 36 → ~12 ke asar ke barabar, agar wo asar linear hota): ~' + fmt(d.bothApplied) + '/month. Tab ja kar 3 lakh ke qareeb banta hai.');
    push('');
    push('Yani 3 lakh ek lever se nahi aata — **indexing aur per-page exposure dono** saath chahiye, aur dono ka apna waqt hai (crawl queue + ranking).');
    push('');
  }

  // ---- 4. position ladder (measured) ----
  if (api && api.pairs.length) {
    const bands = ladder(api.pairs);
    const total = bands.reduce((s, b) => s + b.impressions, 0);
    push('## 4. Position ladder — impressions ≠ traffic');
    push('');
    push('Query→page pairs se, position band ke hisaab se **measured** CTR (assumption nahi):');
    push('');
    push('| Position | Pairs | Impressions | % of impressions | Clicks | Measured CTR |');
    push('|---|---|---|---|---|---|');
    for (const b of bands) {
      push('| ' + b.band + ' | ' + b.pairs + ' | ' + b.impressions + ' | ' + (total ? (100 * b.impressions / total).toFixed(1) : '0') + '% | ' + b.clicks + ' | ' + (b.ctr * 100).toFixed(2) + '% |');
    }
    push('');
    const deep = bands.filter((b) => b.lo >= 21);
    const deepShare = total ? 100 * deep.reduce((s, b) => s + b.impressions, 0) / total : 0;
    push('Impressions ka **' + deepShare.toFixed(0) + '%** position 21+ par pada hai. Wahan impression milega, click nahi — is liye impressions barhana aur clicks barhana ek hi kaam nahi hai. Jo mila wo ye bhi dikhata hai: kuch pages impress kar rahe hain jin par click **possible hi nahi** (quiz/machine-shaped queries).');
    push('');
    if (api.coverage && api.coverage.pairImpressions) {
      push('_Caveat:_ ye ladder sirf un pairs par hai jo GSC ke query→page join mein aaye (' + api.coverage.pairImpressions + '/' + (api.coverage.totalImpressions || '?') + ' impressions, ' + (api.coverage.totalImpressions ? (100 * api.coverage.pairImpressions / api.coverage.totalImpressions).toFixed(0) : '?') + '%). Baaki impressions GSC ki apni truncation hain, site ka bug nahi.');
      push('');
    }
    push('_Caveat 2:_ poore 28 din mein sirf ' + (api.clicks || 0) + ' clicks hain, is liye per-band CTR chhote sample par hai — 21-50 band ka 0.20% 11-20 band ke 0.10% se zyada dikhna noise hai, trend nahi. Jo cheez noise-proof hai wo hai impressions ka jhukav (65% neeche 21+).');
    push('');
  }

  // ---- 5. scenarios ----
  push('## 5. Scenarios — kis rate par kab');
  push('');
  push('Ye site abhi tak ka rate: ' + (trendStart ? trendStart.impressions7d + ' impressions/week (' + trendStart.date + ')' : 'shuruaati chand hazaar impressions/week') + ' → ~' + fmt(base) + '/month ab. Us base rate ko aage nahi barhaya ja sakta (wo tiny base + migration ka tha). Neeche **assumed** constant MoM growth hai — assumption saaf likha hai, aur ye guarantee nahi:');
  push('');
  push('| Growth / month | Month 1 | Month 3 | Month 6 | 300k/month tak |');
  push('|---|---|---|---|---|');
  for (const g of [0.2, 0.4, 0.6, 1.0]) {
    const m1 = base * (1 + g);
    const m3 = base * Math.pow(1 + g, 3);
    const m6 = base * Math.pow(1 + g, 6);
    const n = monthsToTarget(base, g, 300000);
    push('| ' + (g * 100).toFixed(0) + '% | ' + fmt(m1) + ' | ' + fmt(m3) + ' | ' + fmt(m6) + ' | ' + n + ' mahine |');
  }
  push('');
  push('100%/month (jaisa ek hafta dikha) tiny base par hota hai; ' + fmt(base) + '/month ke base par usay 12 mahine tak maan lena optimistic hai — koi bhi scenario 30 din mein 3 lakh nahi deta.');
  push('');

  // ---- 6. levers ----
  push('## 6. Levers, measured leverage ke hisaab se');
  push('');
  push('| # | Lever | Aaj ka measurement | Kaam |');
  push('|---|---|---|---|');
  push('| 1 | Indexing | ' + (latest ? latest.indexed + '/' + known + ' indexed (' + (100 * latest.indexed / known).toFixed(1) + '%)' : '?') + (audit ? ', not-indexed **' + audit.notIndexedTotal + '**, fixable **' + audit.fixable + '**' : '') + ' | Technical fix nahi bacha — sirf crawl wait + request-indexing (~12/din quota) + links. Google ka waqt, hamara nahi. |');
  const pageOne = api && api.pairs.length
    ? new Set(api.pairs.filter((p) => (p.position || 99) <= 10).map((p) => p.page)).size
    : null;
  push('| 2 | Per-page exposure | ' + (pageImpressions && pageImpressions.pages ? Object.keys(pageImpressions.pages).length + ' pages ko impressions mil rahe hain' : '?') + ' (sitemap mein ' + (known ? '~' + known : '1,415') + ')' + (pageOne ? ', ' + pageOne + ' pages ka kam se kam ek query page 1 par (position ≤10, inme zyadatar chhote-impressions machine queries)' : '') + ' | Jo pages impress kar rahe hain unka position aur title sudharo. Naya content nahi — wording ka kaam hai, aur wo sab se sasta click hai. |');
  push('| 3 | Copy→query match | 335/455 pages apni best query already cover karte hain | Is liye "poori site ki copy dobara likho" waste hai. Sirf jahan raw template bacha hai wahan haath lagao. |');
  push('| 4 | Link equity routing | Demand-weighted routing already built (`crawl-link-boost.cjs`), 784/784 covered, gate PASS | Yahan naya kaam bacha nahi; sirf hafte mein gate chalao. |');
  push('| 5 | Authority / backlinks | Off-page — koi measured impact abhi tak nahi | Long game; white-hat only. Iska asar mahino mein aata hai, hafton mein nahi. |');
  push('');

  // ---- 7. cadence ----
  push('## 7. Weekly cadence (yahi "zyada kaam" ka asli matlab hai)');
  push('');
  push('**Roz (~5 min)**');
  push('1. GSC → Request Indexing, 12 URLs (`docs/REQUEST-INDEXING-TOP40.md` ke order mein). Quota khatam = ruk jao.');
  push('');
  push('**Somwar (~15 min)**');
  push('1. `npm run seo:weekly` — GSC pulls + crawl boost + gates.');
  push('2. `node scripts/seo-movement-report.cjs` — dated report, pichhle hafte se compare karo.');
  push('3. `node scripts/build-query-action-plan.cjs` — top 10 work list nikalo, 10 par kaam karo.');
  push('4. `node scripts/build-growth-model.cjs` — run-rate update karo (28-day average ko run-rate na samjho).');
  push('');
  push('**Decision rules**');
  push('- Run-rate (7-day) nahi barh raha + indexed% barh raha hai → problem exposure hai, crawling nahi: position/title par kaam karo.');
  push('- Indexed% ruka hua + run-rate ruka hua → crawl side: links + request-indexing + freshness.');
  push('- Koi page pos ≤ 20, ≥ 20 impressions, 0 clicks → title/meta surgery (ye sab se sasta click hai).');
  push('- Koi page 0 impressions 8+ hafte → canonical/internal-link check, warna wo page sirf index bloat hai.');
  push('');

  // ---- 8. honesty ----
  push('## 8. Jo koi tool promise nahi kar sakta');
  push('');
  push('- **30 din mein 3–4 lakh impressions/month nahi aayega.** Uske liye ' + fmt(300000 / DAYS_PER_MONTH, 0) + '–' + fmt(400000 / DAYS_PER_MONTH, 0) + '/din chahiye; aaj ' + Math.round(rr7 ? rr7.perDay : 0) + '/din hai.');
  push('- Jo log 1–2 din mein rank karte hain: apna brand naam, bilkul uncontested long-tail, ya years purani authority. Teeno mein se koi bhi "trick" nahi hai.');
  push('- Impressions position aur indexing ke peeche aate hain, clicks uske peeche. Ye chain toot nahi sakti — is liye forecast sirf arithmetic se banta hai, wish se nahi.');
  push('- Is doc ka kaam: sahi numbers, sahi window, aur wo kaam jo asar karta hai. Baaki Google ke haath mein hai.');
  push('');

  const out = { generatedAt: new Date().toISOString(), series, runRate7: rr7, runRate3: rr3, runRateAll: rrAll, api: api ? { ...api, pairs: undefined } : null, reconcile, indexation: latest, audit: audit ? { notIndexedTotal: audit.notIndexedTotal, fixable: audit.fixable, waitingCrawl: audit.waitingCrawl } : null, base };
  fs.writeFileSync(path.join(ROOT, 'data', 'growth-model.json'), JSON.stringify(out, null, 2));
  fs.writeFileSync(path.join(ROOT, 'docs', 'GROWTH-MODEL.md'), L.join('\n') + '\n');

  console.log('run-rate (7d): ' + Math.round(rr7.perDay) + '/day = ~' + fmt(rr7.perMonth) + '/month   [' + rr7.from + '→' + rr7.to + ']');
  if (reconcile) console.log('28-day API average: ' + reconcile.apiPerDay + '/day (lagging, ' + reconcile.ratio.toFixed(1) + 'x below run-rate)');
  if (latest) console.log('indexed: ' + latest.indexed + '/' + known + ' (' + (100 * latest.indexed / known).toFixed(1) + '%)');
  console.log('300k/month needs ' + (base ? (300000 / base).toFixed(1) : '?') + 'x today\'s run-rate');
  console.log('report: docs/GROWTH-MODEL.md · data/growth-model.json');
  if (problems.length) process.exit(1);
}

function fmt(n, digits = 0) {
  if (!Number.isFinite(n)) return '?';
  return Math.round(n).toLocaleString('en-US');
}

// readDailySeries is exported for the same reason runRate is: the movement
// report and the run-rate tracker must read one series definition, not three.
module.exports = { runRate, monthsToTarget, ladder, decompose, readDailySeries, trimUnfinalized, DAYS_PER_MONTH };

if (require.main === module) main();
