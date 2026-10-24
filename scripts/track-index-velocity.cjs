#!/usr/bin/env node
// ============================================================
// CalcProMaster — Index velocity (daily)
// ------------------------------------------------------------
// INDEX-PANEL.md batata hai ke panel ke kitne snapshots hain, aur
// INDEX-BURNDOWN.md poore backlog ki rate nikalta hai. Dono se ye sawal jawab
// nahi hota: **roz ka number kya hai, aur ruk gaya hai ya chal raha hai?**
//
// Ek 30-din ka average hafte ki speed chhupa leta hai, aur "abhi do snapshots
// nahi" koi verdict nahi. Ye script panel ki daily history se:
//   1. per-day series banati hai (har din kitne index hue, queue kitni bachi),
//   2. trailing window ki velocity (3d + 7d) nikaltee hai — window ke dono sire
//      compare hotay hain, is liye beech mein index hua page ek dafa ginta hai,
//   3. saaf verdict deti hai: insufficient-history / stalled / losing-ground / moving,
//   4. usi rate par queue kab khatam hogi — ya saaf kehti hai ke rate itni chhoti
//      hai ke projection bemani hai.
//
// Churn ka hisaab yahan dobara nahi likha: `build-index-panel.cjs` ke churnOf /
// churnAlert import hote hain, is liye panel, burn-down aur velocity ek hi
// definition use karte hain — teen reportein alag alag number nahi bana saktin.
//
// Reads : data/index-panel-history.json  (daily panel snapshots)
// Writes: docs/INDEX-VELOCITY.md · data/index-velocity.json
// Usage : node scripts/track-index-velocity.cjs [--window 7]
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const { rankOf, movementPair, churnOf, churnAlert, emitChurnAlert } = require('./build-index-panel.cjs');
const { collectChurnAlerts } = require('./build-index-burndown.cjs');

const ROOT = path.join(__dirname, '..');
const HISTORY = path.join(ROOT, 'data', 'index-panel-history.json');
const DOC = path.join(ROOT, 'docs', 'INDEX-VELOCITY.md');
const OUT = path.join(ROOT, 'data', 'index-velocity.json');

// Ek raat ka delta × 7 burst hota hai, rate nahi. Rate ke liye kam az kam 3 din
// chahiye — yahi usool burn-down bhi use karta hai (MIN_RATE_DAYS).
const MIN_RATE_DAYS = 3;
// Do saal se aage ka "date" bemani hai (sample-scaled), is liye wo horizon se
// bahar report hoti hai, aisi tarikh nahi jo yakeen dilaye.
const HORIZON_CAP_DAYS = 730;

const STATUS = {
  insufficientHistory: 'insufficient-history',
  stalled: 'stalled',
  losingGround: 'losing-ground',
  moving: 'moving',
};

// ---------- pure helpers (unit-tested) ----------

// Valid snapshots, purane se naye. Jo entry adhoori ho (date ya checked nahi)
// wo hata di jati hai: us se deltas banate hi ghalat rate banti.
function cleanHistory(history) {
  return (history || [])
    .filter((s) => s && s.date && s.checked && typeof s.checked === 'object' && Object.keys(s.checked).length)
    .slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

// Ek snapshot ki state: kitne indexed, kitne waiting, aur kitne aise jo index
// hone layak hi nahi (redirect/noindex/canonical) — unheen queue mein ginna kaam
// ko bara dikhata hai.
function snapshotState(checked) {
  const t = { total: 0, indexed: 0, waiting: 0, notCandidates: 0 };
  for (const cov of Object.values(checked || {})) {
    t.total++;
    const r = rankOf(cov);
    if (r === null) { t.notCandidates++; continue; }
    if (r >= 3) t.indexed++; else t.waiting++;
  }
  return t;
}

// Per-day series: pehli row ke deltas null hain (us ke pehle kuch nahi), baaki har
// row apne pichle snapshot se compare karti hai. Yahi "roz ka number" hai.
function dailySeries(history) {
  const snaps = cleanHistory(history);
  const rows = [];
  for (let i = 0; i < snaps.length; i++) {
    const st = snapshotState(snaps[i].checked);
    const row = {
      date: snaps[i].date,
      checked: st.total,
      indexed: st.indexed,
      waiting: st.waiting,
      notCandidates: st.notCandidates,
      days: null,
      common: null,
      becameIndexed: null,
      stagesAdvanced: null,
      slippedBack: null,
      gainedBack: null,
      churnStages: null,
      netStages: null,
      leftUnknown: null,
      indexedPerDay: null,
      stagesPerDay: null,
    };
    if (i > 0) {
      const p = movementPair(snaps[i - 1], snaps[i]);
      row.days = p.days;
      row.common = p.common;
      row.becameIndexed = p.becameIndexed;
      row.stagesAdvanced = p.stages;
      row.slippedBack = p.slipped;
      row.gainedBack = p.gainedBack;
      row.churnStages = p.churnStages;
      row.netStages = p.netStages;
      row.leftUnknown = p.leftUnknown;
      row.indexedPerDay = p.days > 0 ? p.becameIndexed / p.days : null;
      row.stagesPerDay = p.days > 0 ? p.stages / p.days : null;
    }
    rows.push(row);
  }
  return rows;
}

// Trailing window ki speed: window ke pehle aur aakhri snapshot ka pair — single
// day steps ko jorhne se aane wali double-counting se bachne ke liye. Same URLs
// wala comparison hai, is liye ye assumption par nahi, measurement par hai.
function rollingVelocity(history, opts = {}) {
  const windowDays = Number.isFinite(opts.windowDays) && opts.windowDays > 0 ? opts.windowDays : 7;
  const snaps = cleanHistory(history);
  const latest = snaps[snaps.length - 1];
  if (!latest) return null;
  const cut = Date.parse(latest.date) - windowDays * 864e5;
  const inWindow = snaps.filter((s) => Date.parse(s.date) >= cut);
  if (inWindow.length < 2) return null;
  const p = movementPair(inWindow[0], inWindow[inWindow.length - 1]);
  if (!(p.days > 0)) return null;
  return {
    windowDays,
    from: p.from,
    to: p.to,
    days: p.days,
    snapshots: inWindow.length,
    common: p.common,
    becameIndexed: p.becameIndexed,
    stagesAdvanced: p.stages,
    slippedBack: p.slipped,
    leftUnknown: p.leftUnknown,
    ...churnOf({ stages: p.stages, slipped: p.slipped, urlsAdvanced: p.urlsAdvanced, urlsSlipped: p.urlsSlipped }),
    indexedPerDay: p.becameIndexed / p.days,
    indexedPerWeek: (p.becameIndexed / p.days) * 7,
    stagesPerDay: p.stages / p.days,
    stagesPerWeek: (p.stages / p.days) * 7,
  };
}

// Verdict. "stalled" ka matlab hai: window mein koi page "Submitted and indexed"
// tak nahi pahuncha — queue convert hi nahi ho rahi. Ladder par neeche girna
// alag baat hai (losing-ground), aur wo alag report hota hai.
function velocityStatus(velocity, opts = {}) {
  const minDays = Number.isFinite(opts.minDays) && opts.minDays > 0 ? opts.minDays : MIN_RATE_DAYS;
  if (!velocity) {
    return { status: STATUS.insufficientHistory, reason: 'do snapshots nahi hain — ek snapshot se speed banti hi nahi' };
  }
  if (velocity.days < minDays) {
    return {
      status: STATUS.insufficientHistory,
      reason: 'window mein sirf ' + velocity.days + ' din hain — ek raat ka delta ×7 burst hota hai, rate nahi (kam az kam ' + minDays + ' din chahiye)',
    };
  }
  if (velocity.becameIndexed === 0) {
    return {
      status: STATUS.stalled,
      reason: velocity.days + ' din mein (' + velocity.common + ' URLs) koi page index nahi hua — ladder hil bhi rahi ho to queue convert nahi ho rahi',
    };
  }
  if (velocity.netStages < 0) {
    return {
      status: STATUS.losingGround,
      reason: velocity.becameIndexed + ' page index hua magar ladder par net ' + velocity.netStages + ' — churn rate ko kha raha hai',
    };
  }
  return {
    status: STATUS.moving,
    reason: velocity.becameIndexed + ' page index hua (' + velocity.days + ' din) aur net +' + velocity.netStages,
  };
}

function addDays(dateISO, days) {
  const d = new Date(dateISO + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Queue kab khatam hogi, usi measured rate par. Zero rate par date nahi banai
// jati — "kabhi nahi" ko tarikh bana kar likhna jhoot hoga.
function projectClear(waiting, perDay, today, opts = {}) {
  const cap = Number.isFinite(opts.horizonCapDays) && opts.horizonCapDays > 0 ? opts.horizonCapDays : HORIZON_CAP_DAYS;
  if (!(perDay > 0)) return { days: null, date: null, beyondHorizon: true, reason: 'measured rate zero hai — aisi date nahi jo banti hi nahi' };
  const days = Math.ceil(waiting / perDay);
  const beyondHorizon = days > cap;
  return {
    days,
    date: beyondHorizon ? null : addDays(today, days),
    beyondHorizon,
    reason: beyondHorizon ? '2 saal se zyada — rate itni chhoti hai ke projection bemani ho jati hai' : null,
  };
}

// ---------- main ----------

function main() {
  const arg = (name, dflt) => {
    const i = process.argv.indexOf(name);
    const v = i >= 0 ? parseInt(process.argv[i + 1], 10) : NaN;
    return Number.isFinite(v) && v > 0 ? v : dflt;
  };
  const WINDOW_DAYS = arg('--window', 7);

  let history = null;
  try { history = JSON.parse(fs.readFileSync(HISTORY, 'utf8')); } catch (e) { history = null; }
  if (!Array.isArray(history) || !cleanHistory(history).length) {
    console.error('✖ koi panel snapshot nahi mila (' + path.relative(ROOT, HISTORY) + ') — pehle `node scripts/build-index-panel.cjs --inspect --all` chalao');
    process.exit(1);
  }

  const snaps = cleanHistory(history);
  const series = dailySeries(history);
  const latest = series[series.length - 1];
  const v7 = rollingVelocity(history, { windowDays: WINDOW_DAYS });
  const v3 = rollingVelocity(history, { windowDays: 3 });
  // Verdict wali window: trailing 7-din. 3-din ka number bhi dikhaya jata hai
  // kyunki wo badlav ka pehla ishara deta hai, magar verdict 7-din par hai —
  // warna ek acha din poore hafte ko theek dikha deta.
  const verdict = velocityStatus(v7, { minDays: MIN_RATE_DAYS });
  const today = new Date().toISOString().slice(0, 10);
  const daysSinceLatest = Math.round((Date.parse(today) - Date.parse(latest.date)) / 864e5);
  const projection = projectClear(latest.waiting, v7 ? v7.indexedPerDay : 0, today);
  // Churn alert har published window par: daily rows + rolling windows.
  const churnAlerts = collectChurnAlerts([...series.slice(1), v3, v7].filter(Boolean));
  const stallAlert = verdict.status === STATUS.stalled && daysSinceLatest <= 2 ? verdict : null;

  const json = {
    generatedAt: new Date().toISOString(),
    latest: latest.date,
    daysSinceLatest,
    snapshotCount: snaps.length,
    windowDays: WINDOW_DAYS,
    state: { checked: latest.checked, indexed: latest.indexed, waiting: latest.waiting, notCandidates: latest.notCandidates },
    verdict,
    velocity7d: v7,
    velocity3d: v3,
    projection,
    series,
    churnAlerts,
  };
  fs.writeFileSync(OUT, JSON.stringify(json, null, 2) + '\n');

  // ---- report ----
  const L = [];
  const n = (x) => (x === null || x === undefined || !Number.isFinite(x) ? '?' : Math.round(x).toLocaleString('en-US'));
  const f1 = (x) => (x === null || x === undefined || !Number.isFinite(x) ? '?' : (Math.round(x * 10) / 10).toString());
  const pct = (x) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : Math.round(x * 1000) / 10 + '%');

  L.push('# Index velocity — roz ki speed');
  L.push('');
  L.push('> Auto-generated by `node scripts/track-index-velocity.cjs` · **' + snaps.length + ' snapshot' + (snaps.length === 1 ? '' : 's') + '** · latest **' + latest.date + '**' + (daysSinceLatest > 0 ? ' (' + daysSinceLatest + ' din purana)' : '') + '.');
  L.push('');
  L.push('`INDEX-PANEL.md` data dikhata hai, `INDEX-BURNDOWN.md` poore backlog ka fasla — aur ye report **roz ki speed aur stall ka verdict**. Number ek hi jagah se aata hai: panel ki same-URL daily history.');
  L.push('');

  L.push('## 1. Verdict');
  L.push('');
  L.push('| | |');
  L.push('|---|---|');
  L.push('| **status** | `' + verdict.status + '` |');
  L.push('| wajah | ' + verdict.reason + ' |');
  L.push('| latest snapshot | ' + latest.date + (daysSinceLatest > 0 ? ' (' + daysSinceLatest + ' din purana)' : '') + ' |');
  L.push('| queue abhi | ' + n(latest.waiting) + ' waiting · ' + n(latest.indexed) + ' indexed · ' + n(latest.notCandidates) + ' index-layak-nahi |');
  L.push('');
  if (verdict.status === STATUS.insufficientHistory) {
    L.push('_Ye ghalti nahi hai — pehle din ki koi speed nahi hoti. Daily job har roz ek snapshot jorh rahi hai; kam az kam ' + MIN_RATE_DAYS + ' din ke baad yahan asli number aayega._');
    L.push('');
  }
  if (stallAlert) {
    L.push('> ⚠️ **Queue ruki hui hai** — ' + stallAlert.reason + '. Is hafte ka kaam: `docs/REQUEST-INDEXING-TOP40.md` se 12 URLs/din request-indexing, aur indexed pages se internal links (`node scripts/crawl-link-boost.cjs`).');
    L.push('');
  }

  L.push('## 2. Trailing velocity (measured, same URLs)');
  L.push('');
  L.push('| window | snapshots | din | common URLs | index hue | indexed/day | indexed/week | stages/day | net stages | churn |');
  L.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const [label, v] of [['last 3d', v3], ['last ' + WINDOW_DAYS + 'd', v7]]) {
    if (!v) { L.push('| ' + label + ' | — | — | — | — | — | — | — | — | — |'); continue; }
    L.push('| ' + label + ' | ' + v.snapshots + ' | ' + v.days + ' | ' + v.common + ' | ' + v.becameIndexed + ' | ' + f1(v.indexedPerDay) + ' | ' + f1(v.indexedPerWeek) + ' | ' + f1(v.stagesPerDay) + ' | ' + (v.netStages >= 0 ? '+' : '') + v.netStages + ' | ' + v.churnStages + ' |');
  }
  L.push('');
  L.push('`index hue` sirf wahi pages ginnta hai jo **"Submitted and indexed"** tak pahunche. Ladder par uper-neeche harkat (`stages`) alag column hai: `churn` = aage + peeche ka gross, aur `net` = asli direction. Jab net ≤ 0 ho aur `index hue` bhi 0 ho, tab koi bhi "stages moved" progress nahi hai.');
  L.push('');
  if (churnAlerts.length) {
    L.push('> ⚠️ **Churn alert**');
    L.push('>');
    for (const a of churnAlerts) L.push('> - ' + (a.from ? a.from + ' → ' + a.to + ': ' : '') + a.message);
    L.push('');
  }

  L.push('## 3. Roz ka series');
  L.push('');
  L.push('| date | checked | indexed | waiting | din | index hue | indexed/day | stages aage | peeche | churn | net | unknown se nikle |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of series) {
    L.push('| ' + r.date + ' | ' + r.checked + ' | ' + r.indexed + ' | ' + r.waiting + ' | ' + (r.days === null ? '—' : r.days) + ' | ' + (r.becameIndexed === null ? '—' : r.becameIndexed) + ' | ' + (r.indexedPerDay === null ? '—' : f1(r.indexedPerDay)) + ' | ' + (r.stagesAdvanced === null ? '—' : r.stagesAdvanced) + ' | ' + (r.slippedBack === null ? '—' : r.slippedBack) + ' | ' + (r.churnStages === null ? '—' : r.churnStages) + ' | ' + (r.netStages === null ? '—' : (r.netStages >= 0 ? '+' : '') + r.netStages) + ' | ' + (r.leftUnknown === null ? '—' : r.leftUnknown) + ' |');
  }
  L.push('');
  L.push('_Pehli row ke deltas `—` hain: us se pehle koi snapshot nahi tha, aur ek hi tasveer se speed nahi banti._');
  L.push('');

  L.push('## 4. Isi rate par queue kab khatam hogi');
  L.push('');
  if (projection.days === null) {
    L.push('- **Projection: ' + projection.reason + '.** Jo chal raha hai wo churn hai, queue drain nahi — is liye pehle rate banani hai (links + request-indexing + freshness), phir date.');
  } else {
    L.push('- Latest rate **' + f1(v7 ? v7.indexedPerDay : 0) + ' pages/day** (' + WINDOW_DAYS + '-din window) par ' + n(latest.waiting) + ' waiting pages clear honge **~' + projection.days + ' din** mein → **' + projection.date + '**.');
    L.push('- Ye arithmetic hai, forecast nahi: rate ' + (v7 ? v7.common + ' URLs' : 'chhote sample') + ' par measured hai. Rate barhe to date aage khiskti hai, rate gire to peeche.');
  }
  L.push('');

  L.push('## 5. Decision rules');
  L.push('');
  L.push('- **stalled** (index hue = 0) → problem crawl side hai: `npm run seo:indexing-list` se 12 URLs/din request-indexing, internal links (`npm run seo:crawl-boost`), aur recent pages ki freshness.');
  L.push('- **losing-ground** (index hue > 0 magar net < 0) → kuch pages wapas `unknown` mein gir rahe hain: `docs/DISCOVERED-FALLBACK-ANALYSIS.md` dekho — rate ke headline par bharosa mat karo, sirf net aur `index hue` par.');
  L.push('- **moving** → jo kaam chal raha hai wahi karo; yahan sabse bara lever per-page exposure hai (`docs/GROWTH-MODEL.md`).');
  L.push('- **insufficient-history** → jaldi se koi conclusion mat nikalo. Daily job ka kaam sirf snapshot jorhna hai; 3 din baad yahan rate aati hai.');
  L.push('');

  L.push('## 6. Reproduce');
  L.push('');
  L.push('```bash');
  L.push('node scripts/build-index-panel.cjs --inspect --all   # naya snapshot (GSC creds chahiye)');
  L.push('node scripts/track-index-velocity.cjs                 # velocity + verdict + projection');
  L.push('```');
  L.push('');
  fs.writeFileSync(DOC, L.join('\n'));

  console.log('index velocity: ' + snaps.length + ' snapshot(s), latest ' + latest.date
    + ' · queue ' + latest.waiting + ' · status ' + verdict.status);
  if (v7) {
    console.log('last ' + WINDOW_DAYS + 'd: ' + f1(v7.indexedPerDay) + ' pages/day indexed (' + v7.becameIndexed + ' indexed, '
      + v7.netStages + ' net stages, ' + v7.churnStages + ' churn, ' + v7.common + ' URLs)');
  } else {
    console.log('last ' + WINDOW_DAYS + 'd: rate nahi ban saki — ' + verdict.reason);
  }
  if (projection.date) console.log('projection: queue clears ~' + projection.date + ' (' + projection.days + ' days at that rate)');
  else console.log('projection: ' + projection.reason);
  for (const a of churnAlerts) emitChurnAlert(a, 'index velocity');
  if (stallAlert) {
    const line = 'index velocity: queue stalled — ' + stallAlert.reason;
    console.warn(process.env.GITHUB_ACTIONS ? '::warning::' + line : '⚠ ' + line);
  }
  console.log('report: docs/INDEX-VELOCITY.md · data/index-velocity.json');
}

module.exports = {
  STATUS, MIN_RATE_DAYS, HORIZON_CAP_DAYS,
  cleanHistory, snapshotState, dailySeries, rollingVelocity, velocityStatus, projectClear, addDays,
};

if (require.main === module) main();
