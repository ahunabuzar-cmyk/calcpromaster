#!/usr/bin/env node
// ============================================================
// CalcProMaster — index panel (asli measured indexing rate)
// ------------------------------------------------------------
// Problem: burn-down ka rate pehle un batch-2 pairs se aata tha jo ittefaqan
// overlap karte the (20 URLs, 3 din). Wo number observation hai, forecast nahi.
//
// Ye script ek FIXED panel banata hai — 100 URLs jo not-indexed queue se
// deterministic taur par chune jate hain (poore queue par phaile hue, kisi ek
// category par jama nahi) — aur har hafte wahi 100 URLs dobara inspect karta hai.
// Do snapshots = speed, aur wo speed ek hi sample par measure hoti hai.
//
// `--all` us sample ko poore queue tak bara kar deta hai: 585 (ya jitne bhi)
// waiting URLs har run mein inspect hote hain, is liye rate 100-URL sample ke
// bajaye poore backlog par measure hoti hai. Daily run + full queue = poore set
// ka roz ka snapshot, jisse "current speed" (trailing window) nikal aati hai —
// 30-din ka average aaj ki raftaar chhupa deta hai.
//
// Usage:
//   node scripts/build-index-panel.cjs                 # panel banao (agar nahi hai) aur rate report karo
//   node scripts/build-index-panel.cjs --inspect       # GSC API se panel refresh (6 parallel, retry + cooldown)
//   node scripts/build-index-panel.cjs --inspect --all # poora not-indexed queue inspect karo (daily job)
//   node scripts/build-index-panel.cjs --rebuild       # panel dobara chuno (queue badla ho to)
//   node scripts/build-index-panel.cjs --size 100
//   ...--inspect --concurrency 10 --limit 50           # chhote batch, tez run (resumable)
//   ...--window 14                                     # "current speed" ka trailing window (default 7 din)
// Writes: data/index-panel.json · data/index-panel-history.json · docs/INDEX-PANEL.md
//         (during --inspect: data/index-panel-progress.json checkpoint, resumable)
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PANEL = path.join(ROOT, 'data', 'index-panel.json');
const HISTORY = path.join(ROOT, 'data', 'index-panel-history.json');
// Mid-run checkpoint: 100 inspections take minutes, so an interrupted run must be
// resumable instead of throwing away every API call it already made.
const PROGRESS = path.join(ROOT, 'data', 'index-panel-progress.json');
const DOC = path.join(ROOT, 'docs', 'INDEX-PANEL.md');

const RANK = new Map([
  ['URL is unknown to Google', 0],
  ['Discovered - currently not indexed', 1],
  ['Crawled - currently not indexed', 2],
  ['Submitted and indexed', 3],
]);
const NOT_A_CANDIDATE = /redirect|noindex|canonical tag|duplicate/i;

const rankOf = (coverage) => {
  if (NOT_A_CANDIDATE.test(String(coverage || ''))) return null;
  const r = RANK.get(String(coverage));
  return typeof r === 'number' ? r : null;
};

// ---------- pure helpers (unit-tested) ----------

// Deterministic spread: sort, then take an even stride so the panel is not all
// from one category (which is what an alphabetical head-slice would give).
function selectPanel(urls, size) {
  const list = [...new Set((urls || []).filter((u) => typeof u === 'string'))].sort();
  if (!list.length || size <= 0) return [];
  if (list.length <= size) return list;
  const stride = list.length / size;
  const out = [];
  for (let i = 0; i < size; i++) out.push(list[Math.floor(i * stride)]);
  return [...new Set(out)];
}

// Full-queue ("--all") selection: the panel IS the backlog, so a run measures
// every waiting URL instead of a stride sample. The merge is monotone — a URL
// already in the panel is never dropped, even after it gets indexed — because a
// sample that quietly sheds its positives is how a burn-down flatters itself.
function mergeFullQueue(existing, queue, controls) {
  const seen = new Set();
  const out = [];
  for (const u of [...(existing || []), ...(queue || []), ...(controls || [])]) {
    if (typeof u !== 'string' || !u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

// URLs still to inspect: everything the checkpoint has not already answered.
function pendingUrls(urls, checked) {
  const done = checked && typeof checked === 'object' ? checked : {};
  return (urls || []).filter((u) => !Object.prototype.hasOwnProperty.call(done, u));
}

function readCoverage() {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'gsc-inspect-notindexed.json'), 'utf8'));
    return (j.results || []).map((r) => ({ url: r.url, coverage: r.coverage }));
  } catch (e) { return []; }
}

// Extra panel URLs that are NOT in the queue: pages we expect to stay indexed, as
// a control. If the control drops out of the index, the panel is measuring
// something other than our own queue.
function controlUrls(n = 5) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'gsc-inspect-notindexed.json'), 'utf8'));
    return (j.results || []).filter((r) => rankOf(r.coverage) === 3).map((r) => r.url).slice(0, n);
  } catch (e) { return []; }
}

// How one snapshot splits across the crawl pipeline. Without this the report is
// empty until the second week, which reads as "nothing measured".
function tallyPanel(checked) {
  const byState = {};
  let queued = 0, indexed = 0, total = 0;
  for (const coverage of Object.values(checked || {})) {
    total++;
    byState[coverage] = (byState[coverage] || 0) + 1;
    const rank = rankOf(coverage);
    if (rank === null) continue;
    if (rank >= 3) indexed++; else queued++;
  }
  return { byState, queued, indexed, total };
}

// Run `worker` over items with at most `limit` in flight. Resolves to one result
// per item, in input order, so the caller always knows which URL failed.
// JS is single-threaded, so the workers can safely share a progress object.
async function mapPool(items, limit, worker) {
  const list = [...(items || [])];
  const out = new Array(list.length);
  const width = Math.max(1, Math.min(Math.floor(Number(limit) || 1), list.length || 1));
  let next = 0;
  const runner = async () => {
    for (;;) {
      const i = next++;
      if (i >= list.length) return;
      try { out[i] = { item: list[i], value: await worker(list[i], i) }; }
      catch (e) { out[i] = { item: list[i], error: e }; }
    }
  };
  await Promise.all(Array.from({ length: width }, runner));
  return out;
}

// Movement between two snapshots, over the URLs both checked.
function movementPair(before, after) {
  const days = Math.round((Date.parse(after.date) - Date.parse(before.date)) / 864e5);
  let common = 0, stages = 0, slipped = 0, becameIndexed = 0, leftUnknown = 0;
  const afterChecked = after.checked || {};
  for (const [url, cov] of Object.entries(before.checked || {})) {
    if (!(url in afterChecked)) continue;
    common++;
    const rb = rankOf(cov), ra = rankOf(afterChecked[url]);
    if (rb === null || ra === null) continue;
    if (ra > rb) stages += ra - rb;
    // Backwards moves count here, not as negative progress: "Discovered" is not a
    // banked state unless the report says how often it is lost.
    else if (ra < rb) slipped += rb - ra;
    if (rb < 3 && ra >= 3) becameIndexed++;
    if (rb === 0 && ra > 0) leftUnknown++;
  }
  return { from: before.date, to: after.date, days, common, stages, slipped, netStages: stages - slipped, becameIndexed, leftUnknown };
}

// Movement between consecutive snapshots (the long-span headline), plus the
// trailing window. Daily snapshots make the window the number that matters: a
// 30-day average hides this week's speed, and only this week's speed says
// anything about when the queue actually clears.
function panelRate(history, opts = {}) {
  const windowDays = Number.isFinite(opts.windowDays) && opts.windowDays > 0 ? opts.windowDays : 7;
  const snaps = (history || []).filter((s) => s && s.date && s.checked).slice()
    .sort((a, b) => a.date.localeCompare(b.date));
  const pairs = [];
  for (let i = 1; i < snaps.length; i++) {
    const p = movementPair(snaps[i - 1], snaps[i]);
    if (p.days > 0) pairs.push(p);
  }
  const span = pairs.reduce((a, b) => (a && a.days > b.days ? a : b), null);

  // Current speed: first snapshot inside the window vs the latest one. Comparing
  // the window's ends (not summing single-day steps) also means a page that got
  // indexed mid-window is counted once, not once per step.
  const latest = snaps[snaps.length - 1] || null;
  let recent = null;
  if (latest) {
    const cut = Date.parse(latest.date) - windowDays * 864e5;
    const inWindow = snaps.filter((s) => Date.parse(s.date) >= cut);
    if (inWindow.length >= 2) {
      const p = movementPair(inWindow[0], inWindow[inWindow.length - 1]);
      if (p.days > 0) {
        recent = {
          ...p,
          windowDays,
          indexedPerWeek: (p.becameIndexed / p.days) * 7,
          stagesPerWeek: (p.stages / p.days) * 7,
        };
      }
    }
  }

  return { pairs, span, indexedPerWeek: span ? (span.becameIndexed / span.days) * 7 : null, recent };
}

// ---------- main ----------

async function main() {
  const arg = (name, dflt) => {
    const i = process.argv.indexOf(name);
    const v = i >= 0 ? parseInt(process.argv[i + 1], 10) : NaN;
    return Number.isFinite(v) && v > 0 ? v : dflt;
  };
  const SIZE = arg('--size', 100);
  const DO_INSPECT = process.argv.includes('--inspect');
  const REBUILD = process.argv.includes('--rebuild');
  // --all: panel = poora queue (sample nahi). Ek dafa banaane ke baad mode sticky
  // hai, warna agle run (jo --all ke baghair ho) chupke se 100-URL sample par
  // wapas chala jata aur purana snapshot naye se compare karna bekaar ho jata.
  const ALL = process.argv.includes('--all');
  const WINDOW_DAYS = arg('--window', 7);
  // How many panels to inspect this run (0 = all still pending), and how many
  // inspections to keep in flight. 6 concurrent keeps us far under the URL
  // Inspection quota (~600/min) while cutting a 100-URL run from ~10 min to ~1-2.
  const LIMIT = arg('--limit', 0);
  const CONCURRENCY = Math.min(arg('--concurrency', 6), 20);

  let panel = null;
  try { panel = JSON.parse(fs.readFileSync(PANEL, 'utf8')); } catch (e) { panel = null; }

  const wantFullQueue = ALL || !!(panel && panel.mode === 'full-queue');
  if (!panel || REBUILD || wantFullQueue) {
    const queue = readCoverage().filter((r) => rankOf(r.coverage) !== null && rankOf(r.coverage) < 3).map((r) => r.url);
    const controls = controlUrls(5);
    const urls = wantFullQueue
      ? mergeFullQueue(panel ? panel.urls : [], queue, controls)
      : selectPanel(queue, Math.max(1, SIZE - controls.length)).concat(controls);
    if (!urls.length) {
      console.error('✖ panel banane ke liye queue nahi mili (data/gsc-inspect-notindexed.json khaali?)');
      process.exit(1);
    }
    if (!panel || REBUILD) {
      panel = {
        createdAt: new Date().toISOString().slice(0, 10),
        mode: wantFullQueue ? 'full-queue' : 'sample',
        size: urls.length,
        queueAtSelection: queue.length,
        controlUrls: controls.length,
        urls,
      };
      console.log('panel banaya: ' + urls.length + ' URLs (queue ' + queue.length + ' se, '
        + (wantFullQueue ? 'poora queue --all' : 'deterministic stride') + ')');
    } else {
      // Full-queue panel sirf barhta hai: naye queue URLs shamil hote hain,
      // koi URL girta nahi — is liye har snapshot poori tarah comparable rehta hai.
      const added = urls.length - panel.urls.length;
      panel = { ...panel, mode: 'full-queue', size: urls.length, queueAtSelection: queue.length, controlUrls: panel.controlUrls || 0, urls };
      if (added) console.log('full-queue panel: ' + added + ' naye queue URLs shamil (ab ' + urls.length + ')');
    }
    fs.writeFileSync(PANEL, JSON.stringify(panel, null, 2) + '\n');
  } else {
    console.log('panel: ' + panel.size + ' URLs, banaya ' + panel.createdAt);
  }

  let history = [];
  try { history = JSON.parse(fs.readFileSync(HISTORY, 'utf8')); } catch (e) { history = []; }

  if (DO_INSPECT) {
    const { token, inspectUrl, withRetry } = require('./lib/gsc-inspect.cjs');
    const site = (() => {
      try {
        const cfg = fs.readFileSync(path.join(ROOT, 'js', 'site-config.js'), 'utf8');
        const m = cfg.match(/domain:\s*'([^']+)'/);
        return m ? 'https://' + m[1] + '/' : null;
      } catch (e) { return null; }
    })();
    if (!site) { console.error('✖ site URL nahi mila (js/site-config.js domain)'); process.exit(2); }

    const date = new Date().toISOString().slice(0, 10);
    // Resume today's checkpoint if one exists; a panicked run keeps its progress.
    let progress = null;
    try { progress = JSON.parse(fs.readFileSync(PROGRESS, 'utf8')); } catch (e) { progress = null; }
    if (!progress || progress.date !== date || progress.panelCreatedAt !== panel.createdAt) {
      progress = { date, panelCreatedAt: panel.createdAt, checked: {}, failures: 0 };
    }
    const todo = pendingUrls(panel.urls, progress.checked);
    if (todo.length !== panel.urls.length) {
      console.log('resuming: ' + (panel.urls.length - todo.length) + ' URLs already checked today, ' + todo.length + ' left');
    }

    const tok = await token();
    const batch = LIMIT > 0 ? todo.slice(0, LIMIT) : todo;
    const saveProgress = () => fs.writeFileSync(PROGRESS, JSON.stringify(progress, null, 2) + '\n');

    // When Google throttles one request, hold the whole pool back for a moment
    // instead of hammering it: that is what turns a 429 into a rate-limit spiral.
    let cooldownUntil = 0;
    const startedAt = Date.now();
    let finished = 0;

    await mapPool(batch, CONCURRENCY, async (url) => {
      const pause = cooldownUntil - Date.now();
      if (pause > 0) await new Promise((r) => setTimeout(r, pause));
      try {
        const r = await withRetry(() => inspectUrl(site, url, tok), {
          attempts: 4,
          onRetry: (info) => {
            const throttled = Number(info.error && info.error.status) === 429;
            if (throttled) cooldownUntil = Math.max(cooldownUntil, Date.now() + 5000);
            console.error('  ↻ ' + url + ' attempt ' + info.attempt + ' failed (' + info.error.message.slice(0, 60) + ') — retry in ' + info.wait + 'ms' + (throttled ? ' · pool cooldown 5s' : ''));
          },
        });
        progress.checked[url] = r.coverage;
      } catch (e) {
        // Not recorded, so the next run retries this URL rather than shipping a hole.
        progress.failures++;
        console.error('  ✖ ' + url + ' — ' + e.message);
      }
      finished++;
      // Checkpoint after every URL: a killed run resumes here instead of re-billing
      // the API for work it already did.
      saveProgress();
      if (finished % 10 === 0 || finished === batch.length) {
        const secs = Math.max(1, (Date.now() - startedAt) / 1000);
        console.log('  … ' + finished + '/' + batch.length + ' · ' + Math.round((finished / secs) * 60) + ' URLs/min');
      }
      return url;
    });

    const secs = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    console.log('throughput: ' + batch.length + ' URLs in ' + secs + 's (' + Math.round((batch.length / secs) * 60) + ' URLs/min, concurrency ' + CONCURRENCY + ')');

    // A partial run must NOT be written as a snapshot: the rate is computed over
    // the URLs both snapshots hold, so a half-filled panel would silently shrink
    // the sample. Keep the checkpoint and let the next run finish it.
    const left = pendingUrls(panel.urls, progress.checked).length;
    if (left > 0) {
      console.log('partial: ' + left + ' URLs abhi baaki hain — checkpoint save ho gaya, dobara `--inspect` chalao (wahi URLs skip ho jayengi).');
    } else {
      history = history.filter((s) => s.date !== date);
      // ranAt (not just the date) because consumers compute elapsed days between
      // snapshots: a date alone makes an evening run and a next-morning run look
      // like the same instant, and the burn-down would divide by the wrong span.
      history.push({ date, ranAt: new Date().toISOString(), checked: progress.checked, failures: progress.failures });
      history.sort((a, b) => a.date.localeCompare(b.date));
      fs.writeFileSync(HISTORY, JSON.stringify(history, null, 2) + '\n');
      // Only drop the checkpoint once the snapshot is safely in the history file.
      try { fs.unlinkSync(PROGRESS); } catch (e) { /* nothing to clean */ }
      console.log('inspection: ' + Object.keys(progress.checked).length + '/' + panel.urls.length + ' URLs (' + progress.failures + ' fail) → history ' + date);
    }
  }

  const rate = panelRate(history, { windowDays: WINDOW_DAYS });
  const L = [];
  const n = (x, d = 1) => (Number.isFinite(x) ? (Math.round(x * 10 ** d) / 10 ** d).toLocaleString('en-US') : '—');
  L.push('# Index panel — measured crawl speed');
  L.push('');
  L.push('> Auto-generated by `node scripts/build-index-panel.cjs`.');
  L.push('');
  L.push('Ek **fixed panel** jo har run mein wahi URLs inspect karta hai, taake speed ek hi sample par measure ho — ad-hoc batch pairs par nahi. `--all` ke saath panel poore queue tak phailta hai, aur daily run se "current speed" (trailing ' + WINDOW_DAYS + '-din window) bhi milti hai.');
  L.push('');
  L.push('| | |');
  L.push('|---|---|');
  L.push('| panel mode | ' + (panel.mode === 'full-queue' ? '**poora queue** (`--all`) — sample nahi' : 'fixed sample (stride)') + ' |');
  L.push('| panel size | ' + panel.size + ' URLs' + (panel.controlUrls ? ' (' + panel.controlUrls + ' already-indexed control pages included)' : '') + ' |');
  L.push('| chuna gaya | ' + panel.createdAt + ' (us waqt queue ' + panel.queueAtSelection + ') |');
  L.push('| snapshots | ' + history.length + ' |');
  L.push('| **measured rate (longest span)** | **' + (rate.indexedPerWeek === null ? 'abhi do snapshots nahi hain' : n(rate.indexedPerWeek) + ' pages/week indexed') + '** |');
  L.push('| **current speed (last ' + WINDOW_DAYS + 'd)** | ' + (rate.recent
    ? '**' + n(rate.recent.indexedPerWeek) + ' pages/week** indexed · ' + n(rate.recent.stagesPerWeek) + ' ladder-stages/week (' + rate.recent.slipped + ' slipped back, net ' + (rate.recent.netStages >= 0 ? '+' : '') + rate.recent.netStages + ') — ' + rate.recent.from + ' → ' + rate.recent.to + ' (' + rate.recent.days + 'd, ' + rate.recent.common + ' URLs)'
    : 'abhi is window mein doosra snapshot nahi hai') + ' |');
  L.push('');
  if (rate.pairs.length) {
    L.push('| from | to | days | common URLs | stages advanced | slipped back | net | became indexed | left "unknown" |');
    L.push('|---|---|---|---|---|---|---|---|---|');
    for (const p of rate.pairs) L.push('| ' + p.from + ' | ' + p.to + ' | ' + p.days + ' | ' + p.common + ' | ' + p.stages + ' | ' + p.slipped + ' | ' + (p.netStages >= 0 ? '+' : '') + p.netStages + ' | ' + p.becameIndexed + ' | ' + p.leftUnknown + ' |');
    L.push('');
  } else {
    L.push('_Pehla snapshot hai. Agle run ke baad yahan real speed aayegi_ — daily job (`.github/workflows/seo-panel-daily.yml`) ise khud chala deta hai, aur `npm run seo:weekly` bhi.');
    L.push('');
  }

  // Latest snapshot on its own: what the panel looked like, even before a rate exists.
  const latestSnap = history.length ? history[history.length - 1] : null;
  if (latestSnap) {
    const t = tallyPanel(latestSnap.checked);
    L.push('## Latest snapshot — ' + latestSnap.date);
    L.push('');
    L.push('| crawl state | URLs |');
    L.push('|---|---|');
    for (const row of Object.entries(t.byState).sort((a, b) => b[1] - a[1])) L.push('| ' + row[0] + ' | ' + row[1] + ' |');
    L.push('');
    L.push('Panel mein se **' + t.queued + '/' + t.total + '** pages abhi bhi queue mein hain (baaki ' + t.indexed + ' index ho chuke). Control pages (already-indexed) isi panel mein hain: agar koi control gir jaye to samajh lo panel kisi aur cheez ko measure kar raha hai.');
    L.push('');
    if (panel.mode === 'full-queue') {
      L.push('Yeh snapshot **poore queue** ka hai (selection ke waqt ' + (panel.queueAtSelection || 0) + ' waiting URLs the), sample ka nahi — is liye "' + t.queued + ' queue mein" ko seedha backlog ki halat samjho, extrapolation nahi.');
      L.push('');
    }
  }
  fs.writeFileSync(DOC, L.join('\n'));

  if (history.length) {
    const t = tallyPanel(history[history.length - 1].checked);
    console.log('latest snapshot (' + history[history.length - 1].date + '): ' + t.queued + '/' + t.total + ' still queued, ' + t.indexed + ' indexed');
  }
  console.log('measured rate: ' + (rate.indexedPerWeek === null ? 'n/a (history ' + history.length + ' snapshot)' : n(rate.indexedPerWeek) + ' pages/week'));
  if (rate.recent) {
    console.log('current speed: ' + n(rate.recent.indexedPerWeek) + ' pages/week indexed (' + n(rate.recent.stagesPerWeek) + ' stages/week) — ' + rate.recent.from + '→' + rate.recent.to + ', ' + rate.recent.common + ' URLs');
  }
  if (panel.mode === 'full-queue') console.log('scope: poora queue (' + panel.size + ' URLs incl. ' + (panel.controlUrls || 0) + ' controls)');
  console.log('report: docs/INDEX-PANEL.md');
  if (history.length && !process.argv.includes('--inspect')) {
    console.log('note: --inspect ke bina purani history par report banti hai.');
  }
}

module.exports = { selectPanel, mergeFullQueue, panelRate, movementPair, tallyPanel, rankOf, pendingUrls, mapPool, NOT_A_CANDIDATE };

if (require.main === module) main().catch((e) => { console.error('index panel failed:', e.message); process.exit(1); });
