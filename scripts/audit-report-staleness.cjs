#!/usr/bin/env node
// ============================================================
// CalcProMaster — published-artifact staleness gate
// ------------------------------------------------------------
// Har report ek data file se banta hai. Agar data file report se NAYI hai, to
// report jhoot bol rahi hai — chup-chaap purane number dikha rahi hai. Ye gate
// wahi pakadta hai aur exit 1 deta hai, taake weekly refresh "sab pass" na kahe
// jab ek report regenerate karna reh gaya ho.
//
// Rule: har artifact ka mtime uske har source ke mtime se >= hona chahiye.
// (Chhota tolerance hai kyunki ek hi second mein likhi files ka order milisekond
// par depend karta hai.)
//
// Usage: node scripts/audit-report-staleness.cjs [--tolerance-seconds N] [--json]
// Exit : 0 = sab taaza · 1 = koi artifact purana
//
// runGate() exported hai taake build-deploy.js ise apne process mein chala kar
// exit code dekh sake (gate requires par khud se exit nahi karti — warna isay
// require karne wala unit test bhi ud jata).
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MVP = path.join(ROOT, '.git'); // (unused marker for clarity)

// report → woh files jinse wo banti hai. Naya generator banate waqt yahan entry
// add karo, warna gate us artifact ko track hi nahi karega.
const REPORTS = [
  { report: 'data/growth-model.json', sources: ['data/gsc-query-page.json', 'data/gsc-coverage-fresh.json', 'data/gsc-queries-raw.txt'] },
  { report: 'docs/GROWTH-MODEL.md', sources: ['data/growth-model.json'] },
  { report: 'data/run-rate-stall.json', sources: ['data/gsc-coverage-export-*/Chart.csv', 'data/gsc-coverage-fresh.json'] },
  { report: 'docs/RUN-RATE-STALL.md', sources: ['data/run-rate-stall.json'] },
  { report: 'data/index-burndown.json', sources: ['data/gsc-inspect-notindexed.json', 'data/index-panel-history.json'] },
  { report: 'docs/INDEX-PANEL.md', sources: ['data/index-panel.json', 'data/index-panel-history.json'] },
  { report: 'docs/INDEX-BURNDOWN.md', sources: ['data/index-burndown.json'] },
  { report: 'data/index-velocity.json', sources: ['data/index-panel-history.json'] },
  { report: 'docs/INDEX-VELOCITY.md', sources: ['data/index-velocity.json'] },
  // Per-URL index-regression alert: built from every GSC snapshot it compares,
  // so a new snapshot must be followed by a re-run (the findings are transitions
  // — a stale report would hide today's).
  { report: 'data/index-regressions.json', sources: ['data/index-panel-history.json', 'data/gsc-inspect-notindexed.json'] },
  { report: 'docs/INDEX-REGRESSIONS.md', sources: ['data/index-regressions.json'] },
  { report: 'data/query-reach.json', sources: ['data/gsc-query-page.json', 'data/run-rate-stall.json'] },
  { report: 'docs/QUERY-REACH.md', sources: ['data/query-reach.json'] },
  // Deliverable B — keyword research table. Built from the same query→page join,
  // so a refreshed join must be followed by a regenerated table (and its doc).
  { report: 'data/keyword-research.csv', sources: ['data/gsc-query-page.json', 'scripts/build-keyword-research-table.cjs'] },
  { report: 'docs/KEYWORD-RESEARCH.md', sources: ['data/keyword-research.csv'] },
  { report: 'data/top10-push-list.json', sources: ['data/query-opportunity.json', 'js/seo-content.js'] },
  { report: 'docs/TOP10-PUSH-LIST.md', sources: ['data/top10-push-list.json'] },
  { report: 'data/link-equity-plan.json', sources: ['data/query-opportunity.json', 'data/gsc-page-impressions.json', 'data/gsc-inspect-notindexed.json'] },
  { report: 'docs/LINK-EQUITY-PLAN.md', sources: ['data/link-equity-plan.json'] },
  { report: 'data/seo-changelog.json', sources: ['js/seo-content.js'] },
  { report: 'docs/CHANGELOG.md', sources: ['data/seo-changelog.json'] },
  { report: 'changelog.html', sources: ['data/seo-changelog.json'] },
  { report: 'stats.html', sources: ['data/growth-model.json', 'data/gsc-coverage-fresh.json', 'data/index-burndown.json', 'data/run-rate-stall.json'] },
  { report: 'docs/QUERY-ACTION-PLAN.md', sources: ['data/query-action-plan.json'] },
  // UberSuggest export triage: the whole point is that its verdicts are recomputed
  // from the raw exports plus the current GSC dump. A new export or a new GSC pull
  // makes the numbers stale, so the gate has to know about it.
  //
  // deploy/sitemap.xml is deliberately NOT a mtime source: it is a BUILD OUTPUT
  // that build-deploy.js rewrites seconds before this gate runs, so comparing
  // mtimes made this entry fail on every single clean build ("regenerate" was
  // never enough — the next build re-touched the source). The triage only cares
  // WHICH urls ship, which it records as `sitemapUrls`; sitemapCount below
  // compares that number with the current build instead of the file clock.
  { report: 'data/ubersuggest-triage-2026-10-18.json', sources: ['data/ubersuggest-2026-10-18/*.csv', 'data/gsc-query-page.json'], sitemapCount: true },
  { report: 'docs/UBERSUGGEST-TRIAGE-2026-10-18.md', sources: ['data/ubersuggest-triage-2026-10-18.json'] },
];

// docs/SEO-MOVEMENT-<date>.md is dated: the newest one is the live report, and it
// is rebuilt from the raw GSC dump.
function datedMovementReport() {
  const dir = path.join(ROOT, 'docs');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter((f) => /^SEO-MOVEMENT-\d{4}-\d{2}-\d{2}\.md$/.test(f)).sort();
  return files.length ? 'docs/' + files[files.length - 1] : null;
}

// ---------- pure helpers (unit-tested) ----------

const stat = (rel) => {
  const p = path.join(ROOT, rel);
  try { return { file: rel, exists: true, mtime: fs.statSync(p).mtimeMs }; }
  catch (e) { return { file: rel, exists: false, mtime: null }; }
};

// Glob-ish source support: 'data/gsc-coverage-export-*/Chart.csv' → newest match.
// statFn is injectable so the staleness rule can be unit-tested without touching
// real files (production callers use the default).
function resolveSource(pattern, statFn = stat) {
  if (!pattern.includes('*')) return statFn(pattern);
  const [dirPart, ...rest] = pattern.split('/');
  const tail = rest.pop();
  const dir = path.join(ROOT, dirPart);
  if (!fs.existsSync(dir)) return { file: pattern, exists: false, mtime: null };
  const prefix = rest.length ? rest[0].replace(/\/$/, '') : '';
  let newest = { file: pattern, exists: false, mtime: null };
  for (const entry of fs.readdirSync(dir)) {
    if (prefix && !entry.startsWith(prefix.replace('*', ''))) continue;
    const s = statFn(dirPart + '/' + entry + '/' + tail);
    if (s.exists && (newest.mtime === null || s.mtime > newest.mtime)) newest = s;
  }
  return newest;
}

// Sitemap URL count recorded inside a report, and the count in the current build.
// Returns null when either side is unreadable (so the check simply abstains).
function sitemapUrlCount(rel) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    const n = Number(j && j.sitemapUrls);
    return Number.isFinite(n) ? n : null;
  } catch (e) { return null; }
}
function builtSitemapUrlCount() {
  try {
    const xml = fs.readFileSync(path.join(ROOT, 'deploy', 'sitemap.xml'), 'utf8');
    const m = xml.match(/<loc>/g);
    return m ? m.length : null;
  } catch (e) { return null; }
}

// Compare one report against its sources.
function evaluate(entry, toleranceMs = 2000, statFn = stat) {
  const report = statFn(entry.report);
  if (!report.exists) return { report: entry.report, status: 'missing', newestSource: null, missingSources: [] };
  let newest = null;
  const missingSources = [];
  for (const pattern of entry.sources) {
    const s = resolveSource(pattern, statFn);
    if (!s.exists) { missingSources.push(pattern); continue; }
    if (!newest || s.mtime > newest.mtime) newest = s;
  }
  if (!newest) return { report: entry.report, status: 'no-sources', newestSource: null, missingSources };
  const stale = newest.mtime > report.mtime + toleranceMs;
  // Optional semantic guard: the set of shipped URLs changed, so the verdicts
  // computed against the old set are wrong even if the file clock looks fine.
  if (entry.sitemapCount) {
    const recorded = sitemapUrlCount(entry.report);
    const current = builtSitemapUrlCount();
    if (recorded !== null && current !== null && recorded !== current) {
      return {
        report: entry.report, status: 'stale', newestSource: 'deploy/sitemap.xml',
        newestSourceAgeSeconds: null, missingSources,
        reason: 'records ' + recorded + ' sitemap URLs, build ships ' + current + ' → regenerate with its builder',
      };
    }
  }
  return {
    report: entry.report,
    status: stale ? 'stale' : 'fresh',
    newestSource: newest.file,
    newestSourceAgeSeconds: Math.round((report.mtime - newest.mtime) / 1000),
    missingSources,
  };
}

// ---------- main ----------

function runGate() {
  const arg = (name, dflt) => {
    const i = process.argv.indexOf(name);
    const v = i >= 0 ? parseInt(process.argv[i + 1], 10) : NaN;
    return Number.isFinite(v) ? v : dflt;
  };
  const toleranceMs = arg('--tolerance-seconds', 2) * 1000;
  const asJson = process.argv.includes('--json');

  const entries = REPORTS.slice();
  const movement = datedMovementReport();
  if (movement) entries.push({ report: movement, sources: ['data/gsc-queries-raw.txt', 'data/gsc-coverage-fresh.json'] });

  const rows = entries.map((e) => evaluate(e, toleranceMs));
  const stale = rows.filter((r) => r.status === 'stale');
  const missing = rows.filter((r) => r.status === 'missing');

  if (asJson) {
    console.log(JSON.stringify({ ranAt: new Date().toISOString(), toleranceSeconds: toleranceMs / 1000, rows }, null, 2));
  } else {
    console.log('REPORT STALENESS GATE');
    for (const r of rows) {
      const tag = r.status === 'fresh' ? 'ok   ' : r.status === 'stale' ? 'STALE' : r.status === 'missing' ? 'MISS ' : 'SKIP ';
      const detail = r.status === 'stale'
        ? (r.reason || 'newer source: ' + r.newestSource + ' (' + (-r.newestSourceAgeSeconds) + 's newer) → regenerate with its builder')
        : r.status === 'fresh' ? 'source: ' + (r.newestSource || '—') : r.status === 'missing' ? 'artifact not built yet' : 'no sources found';
      console.log('  ' + tag + ' ' + r.report.padEnd(34) + detail);
    }
    console.log('---');
  }

  if (stale.length) {
    console.error('FAILED: ' + stale.length + ' published artifact(s) older than their data. Regenerate them (npm run seo:weekly) before shipping.');
    return 1;
  }
  console.log('✅ every published artifact is at least as new as its data' + (missing.length ? ' (' + missing.length + ' not built yet)' : ''));
  return rows.length ? 0 : 1;
}

module.exports = { evaluate, resolveSource, stat, runGate, REPORTS };

if (require.main === module) process.exit(runGate());
