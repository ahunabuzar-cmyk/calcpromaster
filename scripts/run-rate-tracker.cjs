#!/usr/bin/env node
// ============================================================
// CalcProMaster — Run-rate tracker + 2-week stall alert
// ------------------------------------------------------------
// Ek problem thi: koi bhi report "impressions barh rahe hain?" ka jawab 28-day
// average se deti thi, jo ramp ke doran 2-3x neeche padhta hai. Ye script
// 7-day run-rate ko har hafte history mein jama karta hai, aur jab wo do lagataar
// hafton tak na barhe to alert karta hai — saath mein ye batata hai ke rok
// **crawl** side hai ya **exposure** (ranking/title) side.
//
// Cause ka rule (data se, guess se nahi):
//   run-rate flat + indexed% barha      → crawl chal raha hai, exposure atka hai
//   run-rate flat + indexed% bhi flat   → crawl hi bottleneck hai
//
// Reads : data/gsc-coverage-export-*/Chart.csv (daily series)
//         data/gsc-coverage-fresh.json      (indexed / not-indexed)
//         data/run-rate-history.json        (khud banata hai, weekly append)
// Writes: data/run-rate-history.json · data/run-rate-stall.json · docs/RUN-RATE-STALL.md
// Usage : node scripts/run-rate-tracker.cjs
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const { runRate, readDailySeries, trimUnfinalized } = require('./build-growth-model.cjs');

const ROOT = path.join(__dirname, '..');
const HISTORY = path.join(ROOT, 'data', 'run-rate-history.json');
const STALL = path.join(ROOT, 'data', 'run-rate-stall.json');
const DOC = path.join(ROOT, 'docs', 'RUN-RATE-STALL.md');

// A week-over-week move smaller than this is noise, not growth: with hundreds of
// impressions a day the run-rate jitters by a few percent on its own.
const FLAT_TOLERANCE = 0.02; // 2%

// GSC finalises a day roughly two to three days after it happens. A run-rate that
// includes the unfinished tail is not a reading — on 19-21 Oct the chart showed
// 2, 4 and 1 impressions for days that had not been filled in yet, which alone
// pulled a 7-day average from ~560 to ~290.
const FINALITY_LAG_DAYS = 3;

// ---------- pure helpers (unit-tested) ----------

// Same date twice = the weekly job ran twice; keep one row, newest values.
function upsertSample(history, sample) {
  const list = (Array.isArray(history) ? history : [])
    .filter((s) => s && typeof s.date === 'string' && Number.isFinite(s.runRate7));
  const out = list.filter((s) => s.date !== sample.date);
  out.push(sample);
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

// Samples that are close enough to the sample before to be a week apart. Dated
// runs can be late or doubled, so "a week" is a window (5-10 days), not equality.
function weeklyChain(history) {
  const list = (Array.isArray(history) ? history : [])
    .filter((s) => s && typeof s.date === 'string' && Number.isFinite(s.runRate7))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  const chain = [];
  for (const s of list) {
    const prev = chain[chain.length - 1];
    if (!prev) { chain.push(s); continue; }
    const gap = (Date.parse(s.date) - Date.parse(prev.date)) / 864e5;
    if (gap >= 5) chain.push(s);
    else chain[chain.length - 1] = s; // same week: keep the later reading
  }
  return chain;
}

// Consecutive most-recent week-over-week moves that are flat or down.
// 0 = growing, n = n consecutive flat weeks back from the latest sample.
function flatWeekStreak(history, tolerance = FLAT_TOLERANCE) {
  const chain = weeklyChain(history);
  let streak = 0;
  for (let i = chain.length - 1; i > 0; i--) {
    const prev = chain[i - 1].runRate7;
    const now = chain[i].runRate7;
    if (!(prev > 0)) break;
    const delta = (now - prev) / prev;
    if (delta > tolerance) break;
    streak++;
  }
  return { streak, chain };
}

// Same measurement, new date. When the coverage export has not advanced, every
// weekly run re-reads the identical window; appending it would create "flat
// weeks" out of nothing and the stall detector would name a fake cause (this is
// exactly how the history sat frozen at the Sep 28 – Oct 4 window from 11 to 17
// Oct: four rows, one measurement). A stale sample is a data-pipeline failure to
// report, never a trend to judge.
function isStaleWindow(history, sample) {
  if (!sample || !sample.windowFrom || !sample.windowTo) return false;
  const list = (Array.isArray(history) ? history : [])
    .filter((s) => s && typeof s.date === 'string' && s.windowFrom && s.windowTo)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!list.length) return false;
  const last = list[list.length - 1];
  return last.windowFrom === sample.windowFrom && last.windowTo === sample.windowTo;
}

// Which side is stuck. Indexing moving while the run-rate does not is an
// exposure problem; neither moving is a crawl problem.
function classifyCause({ flatWeeks, indexedPctDelta }) {
  if (flatWeeks < 2) return { cause: null, reason: 'stall detect karne ke liye kam se kam 2 flat hafte chahiye' };
  if (indexedPctDelta === null || indexedPctDelta === undefined) {
    return { cause: 'unknown', reason: 'indexed% movement ka data nahi mila' };
  }
  if (indexedPctDelta > 0.5) {
    return {
      cause: 'exposure',
      reason: 'indexed% ' + indexedPctDelta.toFixed(1) + ' points barha jab ki run-rate flat raha — Google crawl kar raha hai, pages rank nahi kar rahe. Lever: title/meta/heading aur internal anchors, naye pages nahi.'
    };
  }
  return {
    cause: 'crawl',
    reason: 'indexed% bhi flat raha (' + indexedPctDelta.toFixed(1) + ' points) — Google khud slow hai. Lever: request-indexing quota, sitemap resubmit, indexed pages se inlinks; copy badalne se is hafte farq nahi padega.'
  };
}

// ---------- main ----------

function main() {
  const allDays = readDailySeries();
  const series = trimUnfinalized(allDays, FINALITY_LAG_DAYS);
  const droppedDays = allDays.length - series.length;
  const rr7 = runRate(series, 7);
  const rr3 = runRate(series, 3);

  let fresh = null;
  try { fresh = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'gsc-coverage-fresh.json'), 'utf8')); } catch (e) { /* optional */ }
  const latest = fresh && fresh.latest ? fresh.latest : null;
  const indexedPct = latest && (latest.indexed + latest.notIndexed) > 0
    ? Math.round((100 * latest.indexed / (latest.indexed + latest.notIndexed)) * 10) / 10
    : null;

  const problems = [];
  if (!rr7) problems.push('daily series nahi mili (data/gsc-coverage-export-*/Chart.csv)');

  const today = new Date().toISOString().slice(0, 10);
  let history = [];
  try { history = JSON.parse(fs.readFileSync(HISTORY, 'utf8')); } catch (e) { history = []; }

  // Where the numbers actually came from, so a frozen export can be named
  // instead of being disguised as a flat week.
  const lastRow = series.length ? series[series.length - 1] : null;
  const rawLastRow = allDays.length ? allDays[allDays.length - 1] : null;
  const sourceExport = lastRow ? lastRow.source : null;
  const sourceLatestDate = lastRow ? lastRow.date : null; // newest day that is finalised
  const sourceRawLatestDate = rawLastRow ? rawLastRow.date : null; // newest day in the export
  const sourceAgeDays = sourceLatestDate
    ? Math.round((Date.parse(today) - Date.parse(sourceLatestDate)) / 864e5)
    : null;

  const sample = {
    date: today,
    capturedAt: new Date().toISOString(),
    runRate7: rr7 ? Math.round(rr7.perDay) : null,
    runRate7PerMonth: rr7 ? Math.round(rr7.perMonth) : null,
    windowFrom: rr7 ? rr7.from : null,
    windowTo: rr7 ? rr7.to : null,
    indexed: latest ? latest.indexed : null,
    notIndexed: latest ? latest.notIndexed : null,
    indexedPct,
    sourceExport,
    sourceLatestDate,
    droppedUnfinalizedDays: droppedDays,
  };

  const stale = rr7 ? isStaleWindow(history, sample) : false;
  const recordedSample = (Array.isArray(history) ? history : [])
    .filter((s) => s && typeof s.date === 'string' && s.windowTo === sample.windowTo)
    .sort((a, b) => a.date.localeCompare(b.date))
    .pop() || null;
  // Decide on the history the sample is joining (plus the sample itself, so a run
  // right after a flat week is judged on today's number). A stale sample is not
  // recorded and not judged: it would be the same measurement twice.
  const probe = rr7 && !stale ? upsertSample(history, sample) : weeklyChain(history);
  const projected = flatWeekStreak(probe);
  const weeksInHistory = projected.chain.length;
  const canDecide = weeksInHistory >= 3;

  const twoWeeksAgo = projected.chain.length >= 3 ? projected.chain[projected.chain.length - 3] : null;
  const indexedPctDelta = (twoWeeksAgo && indexedPct !== null && Number.isFinite(twoWeeksAgo.indexedPct))
    ? Math.round((indexedPct - twoWeeksAgo.indexedPct) * 10) / 10
    : null;

  const flatWeeks = projected.streak;
  const stalled = canDecide && flatWeeks >= 2;
  const verdict = classifyCause({ flatWeeks, indexedPctDelta });

  const status = stale
    ? 'stale-source'
    : (!canDecide ? 'insufficient-history' : (stalled ? 'stalled' : 'growing'));
  const judgedStall = !stale && stalled;

  const out = {
    ranAt: new Date().toISOString(),
    status,
    flatWeeks,
    stalled,
    weeksInHistory,
    weeksUntilDecidable: canDecide ? 0 : Math.max(0, 3 - weeksInHistory),
    runRate7: sample.runRate7,
    runRate7PerMonth: sample.runRate7PerMonth,
    indexedPct,
    indexedPctDelta,
    sourceExport,
    sourceLatestDate,
    sourceRawLatestDate,
    sourceAgeDays,
    recordedWindowSample: recordedSample ? recordedSample.date : null,
    windowTo: sample.windowTo,
    staleSource: stale,
    droppedUnfinalizedDays: droppedDays,
    cause: judgedStall ? verdict.cause : null,
    reason: stale
      ? 'window ' + (sample.windowFrom || '?') + ' → ' + (sample.windowTo || '?') + ' ka sample ' + (recordedSample ? recordedSample.date : '?') + ' ko record ho chuka hai; export ' + (sourceExport || '?') + ' me iske baad ka koi finalised din nahi aaya (raw chart ' + (sourceRawLatestDate || '?') + ' tak hai, jo GSC abhi bhar raha hai). Is liye koi naya sample record nahi hua aur koi stall verdict nahi diya.'
      : (judgedStall ? verdict.reason : (canDecide ? 'run-rate barh raha hai' : 'abhi 2 hafte ka history nahi bana')),
    history: probe,
  };

  if (!stale) fs.writeFileSync(HISTORY, JSON.stringify(probe, null, 2) + '\n');
  fs.writeFileSync(STALL, JSON.stringify({ ...out, history: undefined }, null, 2) + '\n');

  // ---- markdown ----
  const L = [];
  L.push('# Run-rate stall watch');
  L.push('');
  L.push('> Auto-generated by `node scripts/run-rate-tracker.cjs` (weekly step of `npm run seo:weekly`).');
  L.push('');
  L.push('## Aaj ka run-rate');
  L.push('');
  L.push('| | |');
  L.push('|---|---|');
  L.push('| 7-day run-rate | ' + (sample.runRate7 !== null ? sample.runRate7.toLocaleString('en-US') + '/day ≈ ' + sample.runRate7PerMonth.toLocaleString('en-US') + '/month' : '?') + ' |');
  if (rr3) L.push('| 3-day | ' + Math.round(rr3.perDay).toLocaleString('en-US') + '/day |');
  L.push('| window | ' + (sample.windowFrom || '?') + ' → ' + (sample.windowTo || '?') + ' |');
  if (droppedDays > 0) L.push('| dropped (GSC not finalised) | last ' + droppedDays + ' day(s) — raw chart ends ' + (sourceRawLatestDate || '?') + ', counted through ' + (sourceLatestDate || '?') + ' |');
  L.push('| indexed | ' + (latest ? latest.indexed + '/' + (latest.indexed + latest.notIndexed) + ' (' + indexedPct + '%)' : '?') + ' |');
  L.push('');
  L.push('## Stall status: **' + status + '**');
  L.push('');
  if (stale) {
    L.push('- ⚠ **Koi naya finalised din nahi aaya.** Window ' + (sample.windowFrom || '?') + ' → ' + (sample.windowTo || '?') + ' ka sample ' + (recordedSample ? '**' + recordedSample.date + '**' : 'pehle') + ' ko record ho chuka hai; export `' + (sourceExport || '?') + '` raw chart **' + (sourceRawLatestDate || '?') + '** tak hai aur wo din abhi GSC bhar raha hai — is liye ' + (sourceLatestDate || '?') + ' ke baad ka koi finalised din nahi hai.');
    L.push('- Is liye koi naya sample record **nahi** hua, aur koi stall/cause verdict **nahi** diya gaya. Purana number naye din ke naam par likhna hi "impressions gir gaye" wali galti paida karta hai.');
    L.push('- Fix: naya export chahiye — GSC Performance → Export (ya `npm run seo:weekly` jab token zinda ho), `data/gsc-performance-export-<date>/` me rakho, phir ye script dobara chalao.');
    L.push('- Ye number **7-day** hai. Isko 28-day average se compare mat karo: 7-day best-week aur 28-day average do alag measures hain, aur unka farq girna nahi, window ka farq hai.');
  } else if (!canDecide) {
    L.push('- History mein **' + weeksInHistory + ' hafta** hai; 2 lagataar flat hafte detect karne ke liye **3** chahiye.');
    L.push('- Yani ye alert **' + (out.weeksUntilDecidable === 1 ? '1 weekly run' : out.weeksUntilDecidable + ' weekly runs') + '** baad asli jawab dega. Abhi ke liye ye sirf run-rate record kar raha hai.');
  } else if (stalled) {
    L.push('- 7-day run-rate **' + flatWeeks + ' lagataar hafton** se flat/down hai.');
    L.push('- Sabse sambhavit wajah: **' + verdict.cause + '** — ' + verdict.reason);
  } else {
    L.push('- Run-rate barh raha hai (flat weeks: ' + flatWeeks + '). Koi action nahi.');
  }
  L.push('');
  if (projected.chain.length > 1) {
    L.push('## History (weekly observations)');
    L.push('');
    L.push('| date | 7-day run-rate | /month | indexed% |');
    L.push('|---|---|---|---|');
    for (const s of projected.chain) {
      L.push('| ' + s.date + ' | ' + s.runRate7.toLocaleString('en-US') + '/day | ' + (s.runRate7PerMonth ? s.runRate7PerMonth.toLocaleString('en-US') : '?') + ' | ' + (Number.isFinite(s.indexedPct) ? s.indexedPct + '%' : '?') + ' |');
    }
    L.push('');
  }
  L.push('## Jab stall ho to kya karo');
  L.push('');
  L.push('- **cause = crawl** → request-indexing quota (12/din), sitemap resubmit, indexed pages se inlinks. Copy badalna is hafte waste hai.');
  L.push('- **cause = exposure** → jo pages impress kar rahe hain unke title/meta/heading theek karo (`docs/QUERY-ACTION-PLAN.md` ka top).');
  L.push('- Dono case mein: 28-day average na dekho, wahi purani galti hai.');
  L.push('');
  fs.writeFileSync(DOC, L.join('\n'));

  console.log('run-rate (7d): ' + (sample.runRate7 !== null ? sample.runRate7 + '/day' : '?') + ' · status: ' + status + ' · flat weeks: ' + flatWeeks + (canDecide ? '' : ' (history ' + weeksInHistory + '/3 hafte)'));
  if (stale) console.log('⚠ STALE SOURCE: ' + (sourceExport || '?') + ' ends ' + (sourceLatestDate || '?') + ' (' + sourceAgeDays + ' din purana) — sample record nahi hua, verdict nahi diya');
  if (judgedStall) console.log('⚠ STALL → cause: ' + verdict.cause);
  console.log('report: docs/RUN-RATE-STALL.md · data/run-rate-history.json');
  if (problems.length) { problems.forEach((p) => console.error('✖ ' + p)); process.exit(1); }
}

module.exports = { upsertSample, weeklyChain, flatWeekStreak, classifyCause, isStaleWindow, FLAT_TOLERANCE };

if (require.main === module) main();
