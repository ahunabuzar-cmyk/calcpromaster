#!/usr/bin/env node
// ============================================================
// CalcProMaster — Index-regression alert
// ------------------------------------------------------------
// Kyun: burn-down "net" progress batata hai, magar ek URL jo kal indexed tha
// aur aaj nahi hai wo net ke andar chhup jata hai (doosri taraf do URL index
// ho gaye to number upar dikhta hai). Duplicate-canonical wahi problem hai
// doosri shakal mein: Google apne aap ek URL ko doosre par consolidate kar
// deta hai — "Alternate page with proper canonical tag" — aur us page ki
// visibility chup-chaap khatam ho jati hai.
//
// Ye script har URL ki transition ko consecutive snapshots ke beech dekhti hai
// (data/index-panel-history.json jo daily job likhta hai, plus jo bhi
// data/gsc-inspect-batch-*.json batches mojood hain) aur sirf TEEN cheezein
// alert karti hai:
//
//   1. REGRESSION        — pehle "Submitted and indexed", ab indexed nahi.
//   2. NEW NOT-CANDIDATE — pehle candidate tha, ab redirect / noindex /
//                          alternate-canonical (index se bahar).
//   3. NEW DUPLICATE-CANONICAL — (2) ka woh case jahan Google ne page ko
//                          kisi doosre URL par consolidate kar diya.
//
// Sirf WO URL flag hote hain jo dono snapshots mein mojood hon — warna queue
// set badalne par har URL "gayab" lagti aur alert bekaar shor banta.
//
// Data/index-regressions-ledger.json already-dekhay gaye items rakhta hai
// (accepted/known), is liye ek hi regression har run par dobara alert nahi
// karti; naya item aane par exit code 1 hota hai. Isi wajah se ye CI mein
// bhi gate ki tarah chal sakta hai.
//
// Usage:
//   node scripts/check-index-regressions.cjs            # report + exit 1 on NEW findings
//   node scripts/check-index-regressions.cjs --report    # kabhi fail na karo
//   node scripts/check-index-regressions.cjs --update    # naye findings ko ledger mein le lo
//   node scripts/check-index-regressions.cjs --json
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HISTORY = path.join(ROOT, 'data', 'index-panel-history.json');
const LEDGER = path.join(ROOT, 'data', 'index-regressions-ledger.json');
const OUT = path.join(ROOT, 'data', 'index-regressions.json');
const DOC = path.join(ROOT, 'docs', 'INDEX-REGRESSIONS.md');
const DATA_DIR = path.join(ROOT, 'data');

// Google's index ladder (same ranks as build-index-burndown.cjs — one ladder,
// do reports, warna dono do alag kahaniyan sunayenge).
const RANK = new Map([
  ['URL is unknown to Google', 0],
  ['Discovered - currently not indexed', 1],
  ['Crawled - currently not indexed', 2],
  ['Submitted and indexed', 3],
]);
const INDEXED_RANK = 3;
const NOT_A_CANDIDATE = /alternate page with proper canonical tag|page with redirect|excluded by|noindex|not found \(404\)|soft 404|blocked/i;
const DUPLICATE_CANONICAL = /alternate page with proper canonical tag/i;

function rankOf(coverage) {
  const c = String(coverage || '');
  if (!c || NOT_A_CANDIDATE.test(c)) return null; // null = not an indexing candidate
  const r = RANK.get(c);
  return r === undefined ? null : r;
}

function isDuplicateCanonical(coverage) {
  return DUPLICATE_CANONICAL.test(String(coverage || ''));
}

// ---------- snapshots ----------
function historySnapshots() {
  let history = [];
  try {
    const raw = JSON.parse(fs.readFileSync(HISTORY, 'utf8'));
    history = Array.isArray(raw) ? raw : raw.snapshots || [];
  } catch (e) { /* no panel history yet */ }
  return history
    .filter((s) => s && s.date && s.checked)
    .map((s) => ({ date: s.date, source: 'index-panel-history.json', checked: s.checked }));
}

function batchSnapshots() {
  const out = [];
  for (const f of fs.readdirSync(DATA_DIR)) {
    // Per-URL inspection dumps with a `results[].coverage` array. The resumable
    // checkpoint (gsc-inspect-all-progress.json) is deliberately excluded: it is
    // a partial run, so treating it as a snapshot would invent transitions.
    if (!/^gsc-inspect(-batch.*|-notindexed|-\d{4}-\d{2}-\d{2})?\.json$/.test(f)) continue;
    let j;
    try { j = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')); } catch (e) { continue; }
    const results = (j && j.results) || [];
    if (!results.length) continue;
    const checked = {};
    for (const r of results) {
      if (r && r.url && r.coverage) checked[r.url] = r.coverage;
    }
    if (!Object.keys(checked).length) continue;
    const date = (j.ranAt || '').slice(0, 10) || f.replace(/[^0-9-]/g, '').slice(0, 10);
    out.push({ date, source: f, checked });
  }
  return out;
}

// Chronological, deduped by (date, source). A batch that adds URLs for a date
// the panel already snapshotted stays as its own point — the transitions are
// per-URL anyway, so extra coverage only ever adds information.
function allSnapshots() {
  const snaps = [...historySnapshots(), ...batchSnapshots()];
  snaps.sort((a, b) => String(a.date).localeCompare(String(b.date)) || a.source.localeCompare(b.source));
  return snaps;
}

// ---------- transitions ----------
function detect(snaps) {
  const regressions = [];
  const notCandidates = [];
  const duplicates = [];
  const seen = new Set();
  let compared = 0;

  for (let i = 1; i < snaps.length; i++) {
    const prev = snaps[i - 1];
    const cur = snaps[i];
    if (!prev || !cur) continue;
    const key = prev.date + '→' + cur.date;
    for (const url of Object.keys(cur.checked)) {
      if (!(url in prev.checked)) continue; // URL not comparable across these sets
      compared++;
      const before = prev.checked[url];
      const after = cur.checked[url];
      if (before === after) continue;
      const beforeRank = rankOf(before);
      const afterRank = rankOf(after);
      const item = {
        url,
        from: before,
        to: after,
        window: key,
        prevSnapshot: prev.source + '#' + prev.date,
        curSnapshot: cur.source + '#' + cur.date,
      };
      const id = url + '|' + before + '→' + after;
      if (seen.has(id)) continue;

      if (beforeRank === INDEXED_RANK && !isDuplicateCanonical(after) && afterRank !== INDEXED_RANK) {
        seen.add(id);
        regressions.push({ ...item, kind: 'index-regression' });
      } else if (beforeRank !== null && afterRank === null) {
        seen.add(id);
        if (isDuplicateCanonical(after)) {
          duplicates.push({ ...item, kind: 'duplicate-canonical' });
        } else {
          notCandidates.push({ ...item, kind: 'new-not-candidate' });
        }
      }
    }
  }
  return { regressions, notCandidates, duplicates, compared };
}

// Current-state view: what the NEWEST snapshot says about non-candidates.
// A transition only exists when the same URL appears in two snapshots, and a
// targeted batch inspection (like data/gsc-inspect-batch-<date>.json) usually
// covers URLs the queue snapshots never held — so without this section the
// duplicate-canonical situation that started it all would stay invisible.
function currentNonCandidates(snaps) {
  const newest = snaps[snaps.length - 1];
  if (!newest) return { snapshot: null, items: [] };
  const items = [];
  for (const [url, coverage] of Object.entries(newest.checked)) {
    if (rankOf(coverage) !== null) continue;
    items.push({
      url,
      from: '—',
      to: coverage,
      kind: isDuplicateCanonical(coverage) ? 'duplicate-canonical' : 'not-candidate',
      window: 'current state @ ' + newest.date,
      curSnapshot: newest.source + '#' + newest.date,
    });
  }
  return { snapshot: { date: newest.date, source: newest.source }, items };
}

function ledgerKey(item) {
  return item.url + '::' + item.kind + '::' + item.to;
}

function readLedger() {
  try {
    const j = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
    return Array.isArray(j.known) ? j.known : [];
  } catch (e) { return []; }
}

function writeLedger(items) {
  const body = {
    updatedAt: new Date().toISOString(),
    note: 'Accepted/known index findings. A finding listed here stops alerting; remove an entry to start alerting on it again.',
    known: items,
  };
  fs.writeFileSync(LEDGER, JSON.stringify(body, null, 2) + '\n');
}

function renderDoc(res, snaps) {
  const L = [];
  L.push('# Index-regression alert — per-URL transitions');
  L.push('');
  L.push('_Generated ' + res.ranAt + ' by `scripts/check-index-regressions.cjs`._');
  L.push('');
  L.push('The burn-down reports net progress; this report is the per-URL view of the');
  L.push('same snapshots, so a page that fell out of the index (or was consolidated');
  L.push('away as an alternate canonical) cannot hide behind the total.');
  L.push('');
  L.push('| snapshot | source | URLs with a status |');
  L.push('|---|---|---|');
  for (const s of snaps) L.push('| ' + s.date + ' | `' + s.source + '` | ' + Object.keys(s.checked).length + ' |');
  L.push('');
  L.push('## New findings this run (not in the ledger)');
  L.push('');
  const block = (title, items) => {
    L.push('### ' + title + ' — ' + items.length);
    L.push('');
    if (!items.length) {
      L.push('_None._');
      L.push('');
      return;
    }
    L.push('| URL | was | now | window |');
    L.push('|---|---|---|---|');
    for (const it of items) L.push('| `' + it.url + '` | ' + it.from + ' | ' + it.to + ' | ' + it.window + ' |');
    L.push('');
  };
  block('1. Regression — was indexed, no longer indexed', res.newRegressions);
  block('2. New not-candidate — left the indexing queue (redirect / noindex / other)', res.newNotCandidates);
  block('3. New duplicate canonical — Google consolidated this URL into another', res.newDuplicateCanonicals);
  L.push('### 4. Current state — non-candidates in the newest snapshot (' +
    (res.current.snapshot ? res.current.snapshot.source + '#' + res.current.snapshot.date : 'none') + ')');
  L.push('');
  if (!res.newCurrent.length) {
    L.push('_No new non-candidate URLs in the newest snapshot._');
    L.push('');
  } else {
    L.push('| URL | coverage now | note |');
    L.push('|---|---|---|');
    for (const it of res.newCurrent) L.push('| `' + it.url + '` | ' + it.to + ' | ' + (it.kind === 'duplicate-canonical' ? 'Google consolidated this URL — decide the owner' : 'left the index queue') + ' |');
    L.push('');
  }
  L.push('_Current-state rows are not transitions: they say what the newest snapshot');
  L.push('shows right now, which is what makes a targeted batch inspection useful._');
  L.push('');
  L.push('## Totals');
  L.push('');
  L.push('| measure | value |');
  L.push('|---|---|');
  L.push('| transitions scanned | ' + res.scanned + ' |');
  L.push('| regressions found (all windows) | ' + res.all.regressions.length + ' |');
  L.push('| new not-candidates found | ' + res.all.notCandidates.length + ' |');
  L.push('| duplicate-canonical findings | ' + res.all.duplicates.length + ' |');
  L.push('| non-candidates in newest snapshot | ' + res.current.items.length + ' |');
  L.push('| known (in ledger, not alerting) | ' + res.known.length + ' |');
  L.push('| NEW this run | ' + res.newCount + ' |');
  L.push('');
  L.push('## What to do with a finding');
  L.push('');
  L.push('- **Regression on a `/hub/<cat>/` or `/<cat>/` URL** — check the category/hub');
  L.push('  duplication gate first (`npm run check:category-dup`); Google consolidating a');
  L.push('  category pair is exactly what `docs/DUPLICATE-HUBS-FIX.md` removed.');
  L.push('- **Duplicate canonical** — decide which URL should own the intent, then fix the');
  L.push('  losing page (canonical/redirect/merge). Never redirect blindly: brief rule 7');
  L.push('  needs a documented migration plan (`docs/QUERY-REACH.md` for the page map).');
  L.push('- **Accept the finding** (known, low priority) — `node scripts/check-index-regressions.cjs --update`');
  L.push('  adds it to `data/index-regressions-ledger.json`; it then stops alerting.');
  L.push('');
  L.push('_A GSC snapshot can lag reality, so a single transition is a prompt to look, not');
  L.push('a verdict. Two consecutive snapshots agreeing is evidence; one is a hint._');
  L.push('');
  return L.join('\n');
}

function run() {
  const jsonOut = process.argv.includes('--json');
  const reportOnly = process.argv.includes('--report');
  const update = process.argv.includes('--update');

  const snaps = allSnapshots();
  if (snaps.length < 2) {
    console.log('  index-regression alert: ' + snaps.length + ' snapshot(s) — comparison needs 2.');
    console.log('  (the daily panel job writes data/index-panel-history.json; run `npm run seo:panel:all` to add one)');
    return 0;
  }

  const all = detect(snaps);
  const ledger = readLedger();
  const knownKeys = new Set(ledger.map(ledgerKey));
  const fresh = (arr) => arr.filter((it) => !knownKeys.has(ledgerKey(it)));

  const newRegressions = fresh(all.regressions);
  const newNotCandidates = fresh(all.notCandidates);
  const newDuplicateCanonicals = fresh(all.duplicates);

  const current = currentNonCandidates(snaps);
  const newCurrent = current.items.filter((it) => !knownKeys.has(ledgerKey(it)));

  const res = {
    ranAt: new Date().toISOString(),
    snapshots: snaps.map((s) => ({ date: s.date, source: s.source, urls: Object.keys(s.checked).length })),
    scanned: all.compared,
    all,
    current,
    known: ledger,
    newRegressions,
    newNotCandidates,
    newDuplicateCanonicals,
    newCurrent,
    newCount: newRegressions.length + newNotCandidates.length + newDuplicateCanonicals.length + newCurrent.length,
  };

  fs.writeFileSync(OUT, JSON.stringify(res, null, 2) + '\n');
  fs.writeFileSync(DOC, renderDoc(res, snaps));

  if (update && res.newCount) {
    const merged = [...ledger, ...[...newRegressions, ...newNotCandidates, ...newDuplicateCanonicals, ...newCurrent].map((it) => ({
      url: it.url, kind: it.kind, to: it.to, window: it.window, addedAt: new Date().toISOString(),
    }))];
    writeLedger(merged);
    console.log('  ledger updated: +' + newCount + ' known finding(s) → data/index-regressions-ledger.json');
  }

  if (jsonOut) {
    console.log(JSON.stringify(res, null, 2));
  } else {
    console.log('  snapshots: ' + snaps.map((s) => s.date + '(' + Object.keys(s.checked).length + ')').join(' → '));
    console.log('  regressions (all windows): ' + all.regressions.length +
      ' · not-candidates: ' + all.notCandidates.length +
      ' · duplicate-canonical: ' + all.duplicates.length);
    for (const r of newRegressions) console.log('  ⚠ REGRESSION  ' + r.url + '  [' + r.from + ' → ' + r.to + ']');
    for (const r of newNotCandidates) console.log('  ⚠ NOT-CANDIDATE  ' + r.url + '  [' + r.from + ' → ' + r.to + ']');
    for (const r of newDuplicateCanonicals) console.log('  ⚠ DUP-CANONICAL  ' + r.url + '  [' + r.from + ' → ' + r.to + ']');
    for (const r of newCurrent) console.log('  ⚠ CURRENT        ' + r.url + '  [' + r.to + ']');
    if (res.newCount) {
      console.log('  ✗ ' + res.newCount + ' NEW finding(s) — see docs/INDEX-REGRESSIONS.md');
      console.log('  accept: node scripts/check-index-regressions.cjs --update');
    } else {
      console.log('  ✓ no new regressions or duplicate-canonical findings');
    }
    console.log('  report: docs/INDEX-REGRESSIONS.md · data/index-regressions.json');
  }

  if (reportOnly) return 0;
  return res.newCount ? 1 : 0;
}

if (require.main === module) process.exit(run());
module.exports = { run, detect, rankOf, isDuplicateCanonical, allSnapshots };
