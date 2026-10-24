#!/usr/bin/env node
// ============================================================
// CalcProMaster — Weekly indexation tracker (snapshot history + deltas)
// ------------------------------------------------------------
// Har hafte GSC Coverage ZIP ko parse karo (scripts/parse-gsc-coverage-export.cjs)
// aur ye script chalao. Ye:
//   1. current coverage snapshot ko data/indexation-history.json mein
//      append karta hai (same snapshot date = idempotent upsert, koi duplicate
//      row nahi),
//   2. pichle snapshot se week-over-week movement dikhata hai — total indexed /
//      not-indexed ke saath har issue-bucket ka delta (naya / gaya / badla),
//   3. chhota trend (last N snapshots ka % indexed) print karta hai.
//
// Input : data/gsc-coverage-fresh.json      (parse-gsc-coverage-export.cjs ka output)
//         data/indexation-history.json      (ye script khud maintain karti hai)
// Usage : node scripts/gsc-indexation-tracker.cjs [--no-write] [--json]
//                                                 [--file <fresh.json>]
//                                                 [--history <history.json>]
//                                                 [--last N]
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const argVal = (n, d) => {
  const i = process.argv.indexOf(n);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};

// ---------- pure helpers (unit-tested, no I/O) ----------

// Coverage export (normalized by parse-gsc-coverage-export.cjs) → flat snapshot.
function buildSnapshot(fresh) {
  if (!fresh || !fresh.latest) throw new Error('fresh export missing .latest');
  const indexed = Number(fresh.latest.indexed) || 0;
  const notIndexed = Number(fresh.latest.notIndexed) || 0;
  const known = indexed + notIndexed;
  const issues = {};
  for (const row of fresh.issues || []) {
    if (!row || !row.reason) continue;
    issues[row.reason] = {
      pages: Number(row.pages) || 0,
      source: row.source || 'Unknown',
      validation: row.validation || 'Not Started',
    };
  }
  return {
    date: String(fresh.latest.date),
    indexed,
    notIndexed,
    known,
    pctIndexed: known ? Math.round((1000 * indexed) / known) / 10 : 0,
    issues,
    capturedAt: new Date().toISOString(),
  };
}

// Insert (or replace, keyed by snapshot date) and keep chronological order.
function upsertSnapshot(history, snapshot) {
  const list = (Array.isArray(history) ? history : []).filter((s) => s && typeof s === 'object' && s.date);
  const i = list.findIndex((s) => s.date === snapshot.date);
  if (i >= 0) list[i] = snapshot;
  else list.push(snapshot);
  return list.sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

// previous (may be null) → current: totals + per-reason deltas.
function diffSnapshots(prev, cur) {
  const reasons = new Set([
    ...Object.keys((prev && prev.issues) || {}),
    ...Object.keys(cur.issues || {}),
  ]);
  const buckets = [...reasons].sort().map((reason) => {
    const was = (prev && prev.issues && prev.issues[reason]) || null;
    const now = (cur.issues && cur.issues[reason]) || null;
    const wasPages = was ? was.pages : 0;
    const nowPages = now ? now.pages : 0;
    return {
      reason,
      was: wasPages,
      now: nowPages,
      delta: nowPages - wasPages,
      state: !was ? 'new' : !now ? 'resolved' : nowPages === wasPages ? 'same' : nowPages > wasPages ? 'up' : 'down',
      source: (now && now.source) || (was && was.source) || 'Unknown',
    };
  });
  return {
    from: prev ? prev.date : null,
    to: cur.date,
    indexed: { was: prev ? prev.indexed : 0, now: cur.indexed, delta: cur.indexed - (prev ? prev.indexed : 0) },
    notIndexed: { was: prev ? prev.notIndexed : 0, now: cur.notIndexed, delta: cur.notIndexed - (prev ? prev.notIndexed : 0) },
    pctIndexed: { was: prev ? prev.pctIndexed : 0, now: cur.pctIndexed },
    buckets,
  };
}

// Last N snapshots as a compact trend table.
function trendRows(history, last) {
  const n = last > 0 ? last : 8;
  return history.slice(-n).map((s) => ({
    date: s.date,
    indexed: s.indexed,
    notIndexed: s.notIndexed,
    pctIndexed: s.pctIndexed,
  }));
}

function fmtDelta(d) {
  if (!d) return '±0';
  return (d > 0 ? '+' : '') + d;
}

// ---------- I/O ----------
function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fallback; }
}

function main() {
  const FRESH = path.join(ROOT, argVal('--file', path.join('data', 'gsc-coverage-fresh.json')));
  const HIST = path.join(ROOT, argVal('--history', path.join('data', 'indexation-history.json')));
  const LAST = Number(argVal('--last', '8')) || 8;
  const NO_WRITE = process.argv.includes('--no-write');
  const JSON_OUT = process.argv.includes('--json');

  const fresh = readJson(FRESH, null);
  if (!fresh) {
    console.error('✖ ' + path.relative(ROOT, FRESH) + ' nahi mila/parse nahi hua.');
    console.error('  Pehle GSC Coverage ZIP kholo, phir: node scripts/parse-gsc-coverage-export.cjs --dir <folder>');
    process.exit(1);
  }

  const snapshot = buildSnapshot(fresh);
  const history = readJson(HIST, []);
  const before = history.find((s) => s && s.date === snapshot.date) || null;
  const prev = [...history].reverse().find((s) => s && s.date < snapshot.date) || null;
  const next = upsertSnapshot(history, snapshot);
  const diff = diffSnapshots(prev, snapshot);
  const trend = trendRows(next, LAST);

  if (!NO_WRITE) {
    fs.mkdirSync(path.dirname(HIST), { recursive: true });
    fs.writeFileSync(HIST, JSON.stringify(next, null, 2));
  }

  if (JSON_OUT) {
    console.log(JSON.stringify({ snapshot, replaced: !!before, previous: prev, diff, trend, historyFile: path.relative(ROOT, HIST) }, null, 2));
    return;
  }

  console.log('==========================================');
  console.log(' WEEKLY INDEXATION TRACKER');
  console.log('==========================================');
  console.log('snapshot : ' + snapshot.date + (before ? '  (existing row updated in place)' : '  (new row added)'));
  console.log('previous : ' + (prev ? prev.date : '— (pehla snapshot)'));
  console.log('');
  console.log('  Indexed      : ' + String(diff.indexed.now).padStart(6) + '   (' + fmtDelta(diff.indexed.delta) + ' vs prev)');
  console.log('  Not indexed  : ' + String(diff.notIndexed.now).padStart(6) + '   (' + fmtDelta(diff.notIndexed.delta) + ' vs prev)');
  console.log('  % indexed    : ' + String(diff.pctIndexed.now).padStart(6) + '   (' + (diff.pctIndexed.was ? (diff.pctIndexed.now - diff.pctIndexed.was).toFixed(1) : '—') + ' pts)');
  console.log('');
  console.log('  Issue buckets (delta vs ' + (diff.from || '— first snapshot') + '):');
  for (const b of diff.buckets) {
    const flag = b.state === 'up' ? '▲' : b.state === 'down' ? '▼' : b.state === 'new' ? '＋' : b.state === 'resolved' ? '✓' : '·';
    console.log('   ' + flag + ' ' + String(b.now).padStart(5) + '  ' + (b.delta ? '(' + fmtDelta(b.delta) + ')' : '     ') + '  ' + b.reason + '  [' + b.source + ']');
  }
  console.log('');
  console.log('  Trend (last ' + trend.length + '):');
  for (const t of trend) {
    console.log('   ' + t.date + '  indexed ' + String(t.indexed).padStart(5) + '  not ' + String(t.notIndexed).padStart(5) + '  ' + t.pctIndexed + '%');
  }
  console.log('');
  console.log((NO_WRITE ? 'ℹ (--no-write) ' : '💾 ') + path.relative(ROOT, HIST));
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('FAIL', e.message); process.exit(1); }
}

module.exports = { buildSnapshot, upsertSnapshot, diffSnapshots, trendRows };
