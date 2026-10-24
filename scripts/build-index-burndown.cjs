#!/usr/bin/env node
// ============================================================
// CalcProMaster — Index burn-down
// ------------------------------------------------------------
// "784 pages not indexed" ek number hai, plan nahi. Ye script us number ko
// teen hisson mein todta hai:
//
//   1. Jo pages index hone layak hi nahi (redirect / noindex / canonical) —
//      inko ginti mein rakhna sirf kaam ko bara dikhata hai.
//   2. Jo asli queue hai (unknown → discovered → crawled → indexed).
//   3. Jo rate asal mein measure hui (same URLs, do dates ke darmiyan) — na ke
//      koi assumption.
//
// Us ke baad: har hafte ka target, aur observed rate par finish hone ki tareekh.
//
// Reads : data/gsc-inspect*.json  (dated URL-inspection snapshots)
//         data/gsc-coverage-fresh.json
// Writes: docs/INDEX-BURNDOWN.md · data/index-burndown.json
// Usage : node scripts/build-index-burndown.cjs
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

// The churn maths lives with the panel: both reports print the same two-way
// table, so a shared definition is the only way they cannot drift apart.
const { churnOf, churnAlert, emitChurnAlert } = require('./build-index-panel.cjs');

const ROOT = path.join(__dirname, '..');
const DOC = path.join(ROOT, 'docs', 'INDEX-BURNDOWN.md');
const OUT = path.join(ROOT, 'data', 'index-burndown.json');

// Google's index pipeline, in order. A page only moves right on this ladder.
const RANK = new Map([
  ['URL is unknown to Google', 0],
  ['Discovered - currently not indexed', 1],
  ['Crawled - currently not indexed', 2],
  ['Submitted and indexed', 3],
]);
// States that are NOT a queue position: these URLs are duplicates, host
// variants or deliberately excluded. They will not be indexed as-is, so
// counting them as "waiting" invents work that does not exist.
const NOT_A_CANDIDATE = /redirect|noindex|canonical tag|duplicate/i;

const rankOf = (coverage) => {
  if (NOT_A_CANDIDATE.test(String(coverage || ''))) return null;
  const r = RANK.get(String(coverage));
  return typeof r === 'number' ? r : null;
};

// ---------- pure helpers (unit-tested) ----------

function tally(results) {
  const t = {};
  for (const r of results || []) t[r.coverage] = (t[r.coverage] || 0) + 1;
  return t;
}

// Split a snapshot into "waiting on Google" vs "will never be indexed as-is".
function splitSet(results) {
  const out = { total: 0, candidates: 0, indexed: 0, notCandidates: 0, waiting: 0, notCandidateReasons: {} };
  for (const r of results || []) {
    out.total++;
    const rank = rankOf(r.coverage);
    if (rank === null) {
      out.notCandidates++;
      out.notCandidateReasons[r.coverage] = (out.notCandidateReasons[r.coverage] || 0) + 1;
      continue;
    }
    out.candidates++;
    if (rank >= 3) out.indexed++;
    else out.waiting++;
  }
  return out;
}

// How far the same URLs climbed the ladder between two snapshots. This is the
// only honest rate available: it needs no assumption about the pages that were
// never measured twice.
function advanceRate(before, after) {
  const map = (snap) => {
    const m = new Map();
    for (const r of snap.results || []) m.set(r.url, r.coverage);
    return m;
  };
  const b = map(before), a = map(after);
  // Real elapsed time, not whole days: a run at 14:53 followed by one at 10:17
  // next-next morning is 1.8 days, and rounding it to 2 moves every rate.
  const days = (Date.parse(after.ranAt) - Date.parse(before.ranAt)) / 864e5;
  const fullDays = Math.round(days);
  let common = 0, stages = 0, slipped = 0, becameIndexed = 0, leftUnknown = 0;
  let urlsAdvanced = 0, urlsSlipped = 0;
  for (const [url, cov] of b) {
    if (!a.has(url)) continue;
    common++;
    const rb = rankOf(cov), ra = rankOf(a.get(url));
    if (rb === null || ra === null) continue;
    if (ra > rb) { stages += (ra - rb); urlsAdvanced++; }
    // Backwards moves are reported separately instead of being dropped: a queue
    // whose "Discovered" pages keep falling back to "unknown" is not progressing
    // at the headline rate, and hiding that is how a burn-down lies.
    else if (ra < rb) { slipped += (rb - ra); urlsSlipped++; }
    if (rb < 3 && ra >= 3) becameIndexed++;
    if (rb === 0 && ra > 0) leftUnknown++;
  }
  return {
    from: before.ranAt.slice(0, 10), to: after.ranAt.slice(0, 10), days: fullDays, elapsedDays: days,
    commonUrls: common, stagesAdvanced: stages, slippedBack: slipped,
    // Both directions, always: `gainedBack` is the advance that backslides in the
    // same window cancel out, so "stages advanced" can never be read as progress
    // on its own.
    ...churnOf({ stages, slipped, urlsAdvanced, urlsSlipped }),
    becameIndexed, leftUnknown,
    stagesPerDay: days > 0 ? stages / days : null,
    indexedPerDay: days > 0 ? becameIndexed / days : null,
  };
}

// Har wo window jise report publish karti hai (table ki rows + headline rate ka
// pair) churn ke liye check hoti hai. Jis hafte ki harkat khud ko cancel kar de,
// wahan flag uthta hai — progress ban kar nahi guzarta. Deduped, taake ek hi window
// do bar alert na kare.
function collectChurnAlerts(pairs) {
  const seen = new Set();
  const out = [];
  for (const p of pairs || []) {
    const a = churnAlert(p);
    if (!a) continue;
    const key = a.from + '→' + a.to;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
  }
  return out;
}

// Weeks needed to clear `waiting` at `perWeek`, capped so a zero rate does not
// produce Infinity in a report that has to print a number.
function weeksToClear(waiting, perWeek) {
  if (!(perWeek > 0)) return Infinity;
  return Math.ceil(waiting / perWeek);
}

function addWeeks(dateISO, weeks) {
  const d = new Date(dateISO + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

// Latest full-queue panel snapshot, shaped like the dated inspection snapshots so
// the pair maths can consume it directly. Only a full-queue panel qualifies: a
// 100-URL stride sample is exactly what this report is trying to stop leaning on.
function readPanelSnapshot() {
  try {
    const panel = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'index-panel.json'), 'utf8'));
    if (panel.mode !== 'full-queue' || !Array.isArray(panel.urls)) return null;
    const hist = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'index-panel-history.json'), 'utf8'));
    const snaps = (hist || []).filter((s) => s && s.date && s.checked)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const latest = snaps[snaps.length - 1];
    if (!latest) return null;
    const results = Object.entries(latest.checked).map(([url, coverage]) => ({ url, coverage }));
    if (!results.length) return null;
    return {
      ranAt: latest.ranAt || String(latest.date) + 'T00:00:00.000Z',
      file: 'data/index-panel-history.json#' + latest.date,
      panelMode: 'full-queue',
      panelSize: panel.size,
      results,
    };
  } catch (e) { return null; }
}

// ---------- main ----------

function main() {
  const files = fs.readdirSync(path.join(ROOT, 'data')).filter((f) => /^gsc-inspect.*\.json$/.test(f));
  const snaps = [];
  for (const f of files) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', f), 'utf8'));
      if (Array.isArray(j.results) && j.results.length && j.ranAt) snaps.push({ ...j, file: f });
    } catch (e) { /* not a snapshot */ }
  }
  // The full-queue panel is a dated snapshot too, and a better comparison point
  // than an ad-hoc batch: same URLs, whole backlog, no sampling. It joins the
  // pair list so the rate can be measured on the queue instead of on whichever
  // 20-URL batch happened to be inspected twice.
  const panelSnap = readPanelSnapshot();
  if (panelSnap) snaps.push(panelSnap);
  snaps.sort((a, b) => a.ranAt.localeCompare(b.ranAt));

  if (!snaps.length) {
    console.error('✖ koi inspection snapshot nahi mila (data/gsc-inspect*.json) — `node scripts/gsc-inspect-list.cjs` chalao');
    process.exit(1);
  }

  // Accounting stays on the newest full dump: it is the only source that can tell
  // "will never be indexed as-is" (redirect / noindex / canonical) apart from
  // "waiting", and collapsing that distinction is how "784" became a fake to-do
  // list in the first place.
  const dumps = snaps.filter((s) => !s.panelMode);
  const latest = dumps[dumps.length - 1] || snaps[snaps.length - 1];
  const state = splitSet(latest.results);
  const live = panelSnap
    ? { date: panelSnap.ranAt.slice(0, 10), source: panelSnap.file, panelSize: panelSnap.panelSize, ...splitSet(panelSnap.results) }
    : null;

  // Rates between consecutive snapshots, over the URLs they share. Every pair is
  // kept with the reason it can or cannot be used as a rate — a pair of docs
  // with no shared URLs measures nothing, and hiding that would make the one
  // usable sample look like a sitewide measurement.
  const allPairs = [];
  for (let i = 1; i < snaps.length; i++) {
    const r = advanceRate(snaps[i - 1], snaps[i]);
    // A snapshot 2,000x bigger than the previous one (the full not-indexed set)
    // shares URLs with a small batch only by accident; those pairs are noise.
    const comparable = snaps[i - 1].results.length <= snaps[i].results.length * 2
      && snaps[i].results.length <= snaps[i - 1].results.length * 2;
    r.usable = r.commonUrls > 0 && r.days > 0 && comparable;
    if (!r.usable) {
      r.skipReason = !comparable ? 'URL sets comparable nahi (alag size)'
        : (r.commonUrls === 0 ? 'koi common URL nahi — alag batch' : 'same-day snapshot');
    }
    allPairs.push(r);
  }
  const ratePairs = allPairs.filter((r) => r.usable);
  // Best available rate: the longest span (least noisy).
  const longest = ratePairs.slice().sort((a, b) => b.days - a.days)[0] || null;
  const sampleNote = longest ? longest.commonUrls + ' URLs' : null;

  // Preferred source: the fixed weekly panel, which inspects the SAME URLs every
  // week, so the rate comes from one stable sample instead of whichever batches
  // happened to overlap. The ad-hoc pairs stay as a fallback for the early weeks.
  let panel = null;
  try {
    const { panelRate } = require('./build-index-panel.cjs');
    const hist = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'index-panel-history.json'), 'utf8'));
    const pr = panelRate(hist, { windowDays: 7 });
    // A basis shorter than MIN_RATE_DAYS is not a rate: one overnight delta
    // multiplied by 7 is a burst, and publishing it as "pages/week" would make a
    // single night look like a trend. Until the panel has enough days, the rate
    // falls back to the ad-hoc pairs below (which is why they are kept).
    const MIN_RATE_DAYS = 3;
    const used = pr.recent && pr.recent.days >= MIN_RATE_DAYS ? 'window'
      : (pr.span && pr.span.days >= MIN_RATE_DAYS ? 'span' : null);
    const spanRate = pr.span && Number.isFinite(pr.indexedPerWeek) ? pr.indexedPerWeek : null;
    const indexRate = used === 'window' ? pr.recent.indexedPerWeek : (used === 'span' ? spanRate : null);
    if (Number.isFinite(indexRate)) {
      panel = {
        ...pr,
        used,
        size: hist[0] ? Object.keys(hist[0].checked).length : null,
        indexedPerWeek: indexRate,
        stagesPerWeek: used === 'window'
          ? pr.recent.stagesPerWeek
          : (pr.span ? (pr.span.stages / pr.span.days) * 7 : null),
      };
    }
  } catch (e) { /* panel not built yet */ }

  const RATE_PER_WEEK_INDEXED = panel
    ? panel.indexedPerWeek
    : (longest && longest.indexedPerDay !== null ? longest.indexedPerDay * 7 : null);
  const RATE_PER_WEEK_STAGES = panel && Number.isFinite(panel.stagesPerWeek)
    ? panel.stagesPerWeek
    : (longest && longest.stagesPerDay !== null ? longest.stagesPerDay * 7 : null);
  // Headline rate ka pair (panel window) pehle: agar wahi churn hai to alert usi par
  // sabse zyada matlab rakhta hai, kyunki projection usi number ko multiply karti hai.
  const churnAlerts = collectChurnAlerts([
    ...(panel && panel.recent ? [panel.recent] : []),
    ...ratePairs,
  ]);
  const rateSource = panel
    ? (panel.used === 'window'
      ? 'full-queue panel — trailing ' + panel.recent.days + 'd window (' + panel.recent.from + ' → ' + panel.recent.to + ', ' + panel.recent.common + ' URLs)'
      : 'fixed panel (' + (panel.span ? panel.span.common + ' URLs, ' + panel.span.days + 'd span' : panel.size + ' URLs, single pair)'))
    : (longest ? 'same-URL inspection pairs (' + longest.commonUrls + ' URLs, ' + longest.days + 'd span)' : 'none');

  // Our own ceiling: GSC allows ~12 Request-Indexing submissions per day.
  const QUOTA_PER_WEEK = 12 * 7;
  const today = new Date().toISOString().slice(0, 10);

  // Beyond two years the sample-scaled date stops meaning anything, so it is
  // reported as "2 saal+" instead of a precise-looking day in 2031.
  const HORIZON_CAP_WEEKS = 104;
  const scenarios = [
    { key: 'observed', label: 'Observed (measured, same URLs)', perWeek: RATE_PER_WEEK_INDEXED, sampled: true },
    { key: 'half', label: 'Half the observed rate (conservative)', perWeek: RATE_PER_WEEK_INDEXED !== null ? RATE_PER_WEEK_INDEXED / 2 : null, sampled: true },
    { key: 'quota', label: 'GSC request-indexing ceiling (12/day)', perWeek: QUOTA_PER_WEEK, sampled: false },
  ].filter((s) => s.perWeek !== null)
    .map((s) => {
      const weeks = weeksToClear(state.waiting, s.perWeek);
      return {
        ...s,
        weeks,
        beyondHorizon: weeks > HORIZON_CAP_WEEKS,
        doneBy: Number.isFinite(weeks) && weeks <= HORIZON_CAP_WEEKS ? addWeeks(today, weeks) : null,
      };
    });

  const horizons = [8, 12, 26, 52].map((weeks) => ({
    weeks, perWeek: Math.ceil(state.waiting / weeks), perDay: Math.ceil((state.waiting / weeks) / 7),
  }));

  const json = {
    generatedAt: new Date().toISOString(),
    snapshotDate: latest.ranAt.slice(0, 10),
    snapshotSource: latest.file,
    state,
    liveState: live,
    snapshots: snaps.map((s) => ({ date: s.ranAt.slice(0, 10), file: s.file, urls: s.results.length, ...splitSet(s.results) })),
    ratePairs: allPairs,
    longestSpan: longest,
    sampleNote,
    measuredIndexedPerWeek: RATE_PER_WEEK_INDEXED,
    measuredRateSource: rateSource,
    churnAlerts,
    panelSpan: panel ? panel.span : null,
    measuredStagesPerWeek: RATE_PER_WEEK_STAGES,
    quotaPerWeek: QUOTA_PER_WEEK,
    scenarios,
    horizons,
  };
  fs.writeFileSync(OUT, JSON.stringify(json, null, 2) + '\n');

  // ---- report ----
  const L = [];
  const n = (x) => (x === null || x === undefined || !Number.isFinite(x) ? '?' : Math.round(x).toLocaleString('en-US'));
  const f1 = (x) => (x === null || x === undefined || !Number.isFinite(x) ? '?' : (Math.round(x * 10) / 10).toString());
  L.push('# Index burn-down — 784 ka sahi hisaab');
  L.push('');
  L.push('> Auto-generated by `node scripts/build-index-burndown.cjs` · snapshot **' + json.snapshotDate + '** (' + latest.file + ').');
  L.push('');
  L.push('## 1. Pehle number saaf karo');
  L.push('');
  L.push('| | pages |');
  L.push('|---|---|');
  L.push('| Snapshot mein total URLs | ' + n(state.total) + ' |');
  L.push('| **Index hone layak nahi (redirect / noindex / canonical / duplicate)** | **' + n(state.notCandidates) + '** |');
  L.push('| Asli queue (Google ke intezaar mein) | ' + n(state.waiting) + ' |');
  L.push('| Already indexed | ' + n(state.indexed) + ' |');
  L.push('');
  L.push('Non-candidates ka breakdown: ' + Object.entries(state.notCandidateReasons).map(([k, v]) => '`' + k + '` ' + v).join(' · ') + '.');
  L.push('');
  L.push('**Isi liye "784" ko 784 kaam samajhna ghalat hai.** ' + n(state.notCandidates) + ' in mein se aise pages hain jo maintain rakhne ke liye jaan-boojh kar index se bahar hain (host variants aur duplicate). Asli queue **' + n(state.waiting) + '** pages ki hai.');
  L.push('');
  if (live) {
    L.push('## 1b. Aaj ka state — poora queue (panel, sample nahi)');
    L.push('');
    L.push('| | pages |');
    L.push('|---|---|');
    L.push('| panel mein total URLs | ' + n(live.total) + ' |');
    L.push('| **abhi bhi waiting** | **' + n(live.waiting) + '** |');
    L.push('| index ho chuke | ' + n(live.indexed) + ' |');
    L.push('');
    L.push('Crawl-state breakdown: ' + Object.entries(tally(live.results)).sort((a, b) => b[1] - a[1]).map(([k, v]) => '`' + k + '` ' + v).join(' · ') + '.');
    L.push('');
    L.push('Upar wala ' + n(state.total) + '-URL dump ' + json.snapshotDate + ' ka hai; ye row **' + live.date + '** ke inspection se hai aur poore waiting backlog ko cover karti hai — koi stride sample nahi. Rate bhi ab isi poore queue par build hoti hai, 20-URL batch par nahi.');
    L.push('');
  }
  L.push('## 2. Measured rate (assumption nahi)');
  L.push('');
  if (longest) {
    L.push('Jab **wahi URLs** do dates par inspect hue, tab unka index-ladder par movement:');
    L.push('');
    // Both directions, next to each other: a ladder move that goes both ways in
    // one window is churn, and the only honest headline from it is `net`.
    L.push('| from | to | days | common URLs | stages advanced | slipped back | gained back | churn | net | URLs aage | URLs peeche | became indexed | left "unknown" | indexed/day |');
    L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const r of ratePairs) {
      L.push('| ' + r.from + ' | ' + r.to + ' | ' + r.days + ' | ' + r.commonUrls + ' | ' + r.stagesAdvanced + ' | ' + r.slippedBack + ' | ' + r.gainedBack + ' | ' + r.churnStages + ' | ' + (r.netStages >= 0 ? '+' : '') + r.netStages + ' | ' + r.urlsAdvanced + ' | ' + r.urlsSlipped + ' | ' + r.becameIndexed + ' | ' + r.leftUnknown + ' | ' + f1(r.indexedPerDay) + ' |');
    }
    L.push('');
    L.push('`gained back` = min(advanced, slipped) — jitni movement isi window mein wapas cancel ho gayi. `churn` = advanced + slipped (gross movement). Jab **churn net se kaafi bara ho**, tab "stages advanced" ko progress na padho — sirf **net** aur `became indexed` dekho.');
    L.push('');
    // Alert table ke turant baad: rate ka number padhne se pehle pata ho ke wo churn hai.
    if (churnAlerts.length) {
      L.push('> ⚠️ **Churn alert — ye rate progress nahi hai**');
      L.push('>');
      for (const a of churnAlerts) L.push('> - ' + (a.from ? a.from + ' → ' + a.to + ': ' : '') + a.message);
      L.push('');
    }
    L.push('- Sabse lamba span: **' + longest.from + ' → ' + longest.to + '** (' + longest.days + ' din, ' + longest.commonUrls + ' URLs).');
    const widest = ratePairs.slice().sort((a, b) => b.commonUrls - a.commonUrls)[0];
    if (widest) {
      L.push('- Sabse **bara sample** (aur isi liye sabse bharosay-wala): ' + widest.from + ' → ' + widest.to + ' — ' + widest.commonUrls + ' URLs, ' + f1(widest.elapsedDays) + ' din mein **' + widest.stagesAdvanced + ' stages aage, ' + widest.slippedBack + ' peeche**. Yani ' + widest.urlsAdvanced + ' URLs upar gaye aur **' + widest.urlsSlipped + ' neeche** — gross ' + widest.churnStages + ' stages, jismein **' + widest.gainedBack + ' wapas cancel** ho gaye (net ' + (widest.netStages >= 0 ? '+' : '') + widest.netStages + '), aur ' + widest.becameIndexed + ' index hue.');
      L.push('- Is liye is sample ka headline **"' + widest.stagesAdvanced + ' stages aage" nahi hai** — woh churn ka adha hissa hai. Jo number progress batata hai woh **net ' + (widest.netStages >= 0 ? '+' : '') + widest.netStages + '** aur **' + widest.becameIndexed + ' became indexed** hai. (Detail: `docs/DISCOVERED-FALLBACK-ANALYSIS.md` — ' + widest.urlsSlipped + ' backslides mein se zyadatar "Discovered ➜ unknown" the, aur page-side kuch nahi badla.)');
      L.push('- Usmein **' + widest.leftUnknown + '** pages "unknown" se nikal kar "discovered" tak pahunchi — magar poore queue ki ginti dekho: "unknown" kam nahi hua. Yani "discovered" bank hua progress nahi hai; kuch pages wapas "unknown" mein gir jate hain. Isi liye neeche wala projection queue ke *unknown* hissay par hai, staged par nahi.');
    }
    L.push('- Us par measured: **' + f1(RATE_PER_WEEK_INDEXED) + ' pages/week** indexed hue (' + f1(RATE_PER_WEEK_STAGES) + ' ladder-stages/week).');
    L.push('- Source: **' + rateSource + '**.');
    L.push('');
    L.push('_Caveat:_ rate ka source **' + rateSource + '** hai. Panel wahi URLs har run mein check karta hai (aur `--all` ke saath poora queue), is liye wo sabse saaf measurement hai; ad-hoc pairs sirf tab use hote hain jab panel ke 2 snapshots nahi hue. Trailing window ko 3 din chahiye — ek raat ka delta × 7 burst hota hai, rate nahi, is liye pehle 2 din headline purane span se aati hai.');
  } else {
    L.push('_Ek hi snapshot mila — rate measure nahi ho saki. Agli inspection ke baad ye table bhar jayega._');
  }
  L.push('');
  L.push('## 3. Har hafte ka target (jo aap control karte hain)');
  L.push('');
  L.push('| horizon | pages/week chahiye | pages/day | GSC request quota (84/week) se |');
  L.push('|---|---|---|---|');
  for (const h of horizons) {
    L.push('| ' + h.weeks + ' hafte | ' + h.perWeek + ' | ' + h.perDay + ' | ' + (h.perWeek <= QUOTA_PER_WEEK ? 'andar' : 'quota ke bahar — links/freshness se hi hoga') + ' |');
  }
  L.push('');
  L.push('## 4. Observed rate par projection (savdhani ke saath padho)');
  L.push('');
  L.push('Asli queue **' + n(state.waiting) + '** pages. Neeche har scenario ka apna rate likha hai — number chhupa nahi hai:');
  L.push('');
  L.push('| scenario | pages/week | hafte | mukammal ~ |');
  L.push('|---|---|---|---|');
  for (const s of scenarios) {
    L.push('| ' + s.label + ' | ' + f1(s.perWeek) + ' | ' + (Number.isFinite(s.weeks) ? s.weeks : '—') + (s.beyondHorizon ? '+' : '') + ' | ' + (s.doneBy || (s.beyondHorizon ? '2 saal+' : '—')) + ' |');
  }
  if (!scenarios.length) L.push('| _rate measure nahi hui_ | — | — | — |');
  L.push('');
  L.push('> **Observed-rate rows sample-scaled hain, forecast nahi.** Rate ' + (longest ? longest.commonUrls + ' URLs' : 'chhote sample') + ' se aayi hai, aur wo bhi hub pages ka sample hai jismein zyadatar already indexed the. ' + n(state.waiting) + ' pages par usay seedha multiply karna mathematical hai, realistic nahi — asli speed ke liye poore set ka do-snapshot comparison chahiye, jo har hafte ban raha hai.');
  L.push('');
  // Pairs that could not be used, printed so the sample size is never hidden.
  const unusable = allPairs.filter((r) => !r.usable);
  if (unusable.length) {
    L.push('_Jo snapshot pairs rate ke liye use nahi ho sake:_ ' + unusable.map((r) => r.from + '→' + r.to + ' (' + r.skipReason + ')').join(' · ') + '.');
    L.push('');
  }
  L.push('## 5. Iska matlab kya hai');
  L.push('');
  L.push('- **Published pages par koi technical blocker nahi hai** (`fixable: 0`). Yani is burn-down ka control sirf do cheezon par hai: Google ka crawl rate, aur hamare indexed pages se inlinks/request-indexing.');
  L.push('- Jo pages "unknown to Google" hain — wahi asli progress hai. "Unknown" ghatna matlab Google ne page ko **jaan liya** (index queue mein aa gaya). Index hona us ke baad hota hai, aur wahi slow step hai.');
  L.push('- Poore ' + n(state.waiting) + ' pages ka kaam **hafte-mahine ka hai, 30 din ka nahi**. Is liye impressions ka target bhi slow-horizon wala hai (`docs/GROWTH-MODEL.md`).');
  L.push('- Har hafte naya snapshot lene se ye rate asli forecast ban jata hai. Ek snapshot = ek tasveer; do snapshots = speed.');
  L.push('');
  fs.writeFileSync(DOC, L.join('\n'));

  console.log('snapshot ' + json.snapshotDate + ' (' + latest.file + '): total ' + state.total
    + ' · waiting ' + state.waiting + ' · not-candidates ' + state.notCandidates + ' · indexed ' + state.indexed);
  if (longest) console.log('measured rate: ' + f1(RATE_PER_WEEK_INDEXED) + ' pages/week indexed (' + longest.commonUrls + ' URLs, ' + longest.days + 'd)');
  for (const a of churnAlerts) emitChurnAlert(a, 'index burn-down');
  if (scenarios[0] && Number.isFinite(scenarios[0].weeks)) {
    console.log('queue clears in ~' + scenarios[0].weeks + ' weeks at that rate (' + (scenarios[0].doneBy || '2 saal se zyada — sample-scaled, forecast nahi') + ')');
  }
  console.log('report: docs/INDEX-BURNDOWN.md · data/index-burndown.json');
}

module.exports = { rankOf, splitSet, advanceRate, collectChurnAlerts, weeksToClear, addWeeks, readPanelSnapshot, NOT_A_CANDIDATE };

if (require.main === module) main();
