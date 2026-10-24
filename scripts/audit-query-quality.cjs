#!/usr/bin/env node
// ============================================================
// CalcProMaster — machine-shaped query guard
// ------------------------------------------------------------
// Search Console reports some queries that are not searches: fragments of the
// page's own text with a %/#/+ pasted on, URL-encoded strings, bare hex colours,
// pasted equations and number-only strings. Measured on the 28-day join
// (data/gsc-query-page.json, 2026-09-09 → 2026-10-07) they were 69 query→page
// rows / 186 impressions / 0 clicks, and 171 of those impressions sat on ONE
// page (/health/bmr-mifflin, 65% of its impressions).
//
// Two reasons to watch this:
//   1. A page whose impressions are mostly machine-shaped cannot convert, so it
//      distorts every "zero-click page 1" and CTR number built from it.
//   2. It usually means a string from the page (formula, colour code, template
//      sentence) is being indexed as if it were a query worth ranking for.
//
// The classification is a heuristic on the query's SHAPE, not proof of a bot —
// some entries sit near the line ("4.5% apy on 10000" is a plausible human
// search and is deliberately not flagged). The per-page share is the signal;
// every row carries its measured impressions so the numbers can be checked.
//
// PATH FORMS: GSC reports the same page as both /health/bmr-mifflin and
// /health/bmr-mifflin/. Keying on the raw string split one page into two
// entries and halved its share, so the flag boundary landed on a coin flip.
// Paths are normalised (trailing slash dropped, root kept) before counting.
//
// LEDGER: data/query-quality-ledger.json holds accepted findings, the same
// contract as data/index-regressions-ledger.json — an entry stops alerting,
// deleting it re-arms the alert. An accepted page is NOT silenced for good: it
// re-alerts if it grows past the numbers it was accepted at (share +10pp or
// +25 machine impressions), so "accepted" cannot quietly become "ignored".
//
// Input : data/gsc-query-page.json   (write it with: npm run seo:gsc-join)
// Output: data/query-quality-audit.json  (+ console summary)
// Usage :
//   node scripts/audit-query-quality.cjs            # report, exit 1 on NEW/grown findings
//   node scripts/audit-query-quality.cjs --json     # machine-readable only
//   node scripts/audit-query-quality.cjs --update   # accept current NEW findings into the ledger
// Exit 0 when the data is absent (a checkout without the GSC export skips
// instead of failing on data it never had).
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const JOIN = path.join(ROOT, 'data', 'gsc-query-page.json');
const OUT = path.join(ROOT, 'data', 'query-quality-audit.json');
const LEDGER = path.join(ROOT, 'data', 'query-quality-ledger.json');
const JSON_ONLY = process.argv.includes('--json');
const UPDATE = process.argv.includes('--update');

// A page trips when machine-shaped queries are a real share of its impressions.
// Both numbers matter: a share alone fires on pages with 3 impressions, a volume
// alone fires on clean-but-large pages.
const MIN_MACHINE_IMPRESSIONS = 20;
const MAX_MACHINE_SHARE = 0.25;

// An accepted page re-alerts once it grows past what was accepted.
const GROWTH_SHARE = 0.1;
const GROWTH_IMPRESSIONS = 25;

// Each rule names the machine shape it catches. Order matters only for the
// reported reason, not for the verdict.
const MACHINE_RULES = [
  [/^[+\-%#]/, 'starts with an appended +, -, % or # fragment'],
  [/%[0-9a-fA-F]{2}/, 'URL-encoded bytes (%2b, %20 …)'],
  [/^#?[0-9a-fA-F]{6}$/, 'bare six-digit hex colour'],
  // \p{L} and not A-Za-z: the first version of this rule flagged the Hebrew,
  // Russian, Japanese and Arabic queries in the join ("מחשבון גליקמי",
  // "расчет заработной платы в дубае") as machine-shaped. They are real humans
  // searching in their own script.
  [/^[^\p{L}]*$/u, 'no letters in any script (digits/punctuation only)'],
  [/\bsource%$/, 'formula-fragment tail ("…161 source%")']
];
// Deliberately NOT a rule: pasted equations ("e=mc2 calculator", "P1V1=P2V2").
// They look machine-ish but are plausible human searches, and in this join the
// shape caught nothing, so a rule for it would only add false positives.

function reasonFor(query) {
  const q = String(query || '').trim();
  if (!q) return 'empty query';
  for (const [re, why] of MACHINE_RULES) if (re.test(q)) return why;
  return '';
}
const isMachineQuery = (query) => reasonFor(query) !== '';

// Strip origin and the trailing slash. Root stays "/". Without this the two
// forms of one page are counted as two pages (see PATH FORMS above).
function normPath(u) {
  const p = String(u || '').replace(/^https?:\/\/[^/]+/, '');
  if (p.length > 1 && p.endsWith('/')) return p.slice(0, -1);
  return p || '/';
}

function audit(join) {
  const perPage = new Map();
  let machineRows = 0, machineImpressions = 0, machineClicks = 0, totalImpressions = 0;
  for (const p of join.pairs || []) {
    const page = normPath(p.page);
    const impressions = p.impressions || 0;
    totalImpressions += impressions;
    if (!perPage.has(page)) perPage.set(page, { path: page, paths: [], impressions: 0, clicks: 0, machineImpressions: 0, machineQueries: [] });
    const e = perPage.get(page);
    // Keep the raw forms the join used, so a slash split stays visible instead
    // of being silently merged away.
    const raw = String(p.page || '');
    if (!e.paths.includes(raw)) e.paths.push(raw);
    e.impressions += impressions;
    e.clicks += p.clicks || 0;
    const why = reasonFor(p.query);
    if (why) {
      machineRows++;
      machineImpressions += impressions;
      machineClicks += p.clicks || 0;
      e.machineImpressions += impressions;
      e.machineQueries.push({ query: p.query, impressions, position: p.position, why });
    }
  }
  const flagged = [];
  for (const e of perPage.values()) {
    e.share = e.impressions ? e.machineImpressions / e.impressions : 0;
    e.machineQueries.sort((a, b) => b.impressions - a.impressions);
    if (e.machineImpressions >= MIN_MACHINE_IMPRESSIONS && e.share >= MAX_MACHINE_SHARE) flagged.push(e);
  }
  flagged.sort((a, b) => b.machineImpressions - a.machineImpressions);
  return {
    ranAt: new Date().toISOString(),
    window: { days: join.days, startDate: join.startDate, endDate: join.endDate },
    thresholds: { minMachineImpressions: MIN_MACHINE_IMPRESSIONS, maxMachineShare: MAX_MACHINE_SHARE },
    rules: MACHINE_RULES.map(([re, why]) => ({ pattern: String(re), reason: why })),
    summary: {
      pagesInJoin: perPage.size,
      pairRows: (join.pairs || []).length,
      impressionsInJoin: totalImpressions,
      machineRows,
      machineImpressions,
      machineClicks,
      machineShareOfJoin: totalImpressions ? Number((machineImpressions / totalImpressions).toFixed(4)) : 0,
      flaggedPages: flagged.length
    },
    flagged
  };
}

// ---- ledger -------------------------------------------------
function loadLedger() {
  if (!fs.existsSync(LEDGER)) return [];
  try {
    const j = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
    return Array.isArray(j.known) ? j.known : [];
  } catch {
    // A corrupt ledger must not silence the guard.
    return [];
  }
}

function writeLedger(known) {
  const body = {
    updatedAt: new Date().toISOString(),
    note: 'Accepted machine-shaped-query findings. An entry here stops alerting; delete it to start alerting again. An entry also re-alerts once the page grows past the numbers it was accepted at (share +' + GROWTH_SHARE + ' or +' + GROWTH_IMPRESSIONS + ' machine impressions). Every entry carries its own reason in `note`.',
    known
  };
  fs.writeFileSync(LEDGER, JSON.stringify(body, null, 2) + '\n');
}

// 'known' | 'grown' | 'new'. Ordering of the checks matters: growth wins, so an
// accepted page that got worse is reported, not excused.
function classify(page, known) {
  const k = known.find((e) => e.path === page.path);
  if (!k) return 'new';
  const share = typeof k.share === 'number' ? k.share : 0;
  const impressions = typeof k.machineImpressions === 'number' ? k.machineImpressions : 0;
  if (page.share >= share + GROWTH_SHARE || page.machineImpressions >= impressions + GROWTH_IMPRESSIONS) return 'grown';
  return 'known';
}

// Split a report's flagged pages into accepted (in the ledger) and the ones that
// should make CI red. Pure, so the tests can drive it with a fake ledger.
function classifyFindings(report, known) {
  const knownPages = [];
  const actionable = [];
  for (const p of report.flagged) {
    const status = classify(p, known);
    if (status === 'known') knownPages.push({ ...p, status });
    else actionable.push({ ...p, status });
  }
  return { knownPages, actionable };
}

if (require.main === module) {
  if (!fs.existsSync(JOIN)) {
    console.log('⏭ query-quality guard skipped — no ' + path.relative(ROOT, JOIN)
      + ' (write it with: npm run seo:gsc-join). Not a failure.');
    process.exit(0);
  }
  const report = audit(JSON.parse(fs.readFileSync(JOIN, 'utf8')));
  const known = loadLedger();
  const { knownPages, actionable } = classifyFindings(report, known);

  report.known = knownPages;
  report.newFindings = actionable;
  report.summary.knownPages = knownPages.length;
  report.summary.newPages = actionable.length;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  // Also refresh the text report the way the other guards do, so the finding is
  // readable without opening the JSON.
  fs.writeFileSync(path.join(ROOT, 'docs', 'QUERY-QUALITY.md'), renderDoc(report));

  if (UPDATE) {
    const merged = known.slice();
    let added = 0;
    for (const p of actionable) {
      if (merged.some((e) => e.path === p.path)) continue;
      merged.push({
        path: p.path,
        share: Number(p.share.toFixed(4)),
        machineImpressions: p.machineImpressions,
        impressions: p.impressions,
        clicks: p.clicks,
        window: report.window.startDate + ' → ' + report.window.endDate,
        addedAt: new Date().toISOString(),
        note: 'TODO: write why this page is accepted (or fix it and delete this entry).'
      });
      added++;
    }
    writeLedger(merged);
    console.log('  ledger updated: +' + added + ' accepted finding(s) → ' + path.relative(ROOT, LEDGER));
    process.exit(0);
  }

  if (!JSON_ONLY) {
    const s = report.summary;
    console.log('==========================================');
    console.log(' MACHINE-SHAPED QUERY GUARD');
    console.log('==========================================');
    console.log('window          : ' + s.pairRows + ' query→page rows over ' + report.window.days + ' days');
    console.log('machine-shaped  : ' + s.machineRows + ' rows, ' + s.machineImpressions + ' impressions ('
      + (s.machineShareOfJoin * 100).toFixed(1) + '% of the join), ' + s.machineClicks + ' clicks');
    console.log('threshold       : ≥' + report.thresholds.minMachineImpressions + ' machine impressions AND ≥'
      + (report.thresholds.maxMachineShare * 100) + '% of the page');
    console.log('');
    if (!report.flagged.length) console.log('✔ no page is traffic-shaped by machine queries');
    for (const p of knownPages) {
      console.log('• ' + p.path + ' — ' + p.machineImpressions + '/' + p.impressions + ' impressions ('
        + (p.share * 100).toFixed(0) + '%) machine-shaped, accepted in the ledger');
    }
    for (const p of actionable) {
      console.log((p.status === 'grown' ? '✖ GREW: ' : '✖ NEW: ') + p.path + ' — ' + p.machineImpressions + '/' + p.impressions
        + ' impressions (' + (p.share * 100).toFixed(0) + '%) look machine-shaped');
      for (const q of p.machineQueries.slice(0, 3)) console.log('     · ' + JSON.stringify(q.query.slice(0, 70)) + '  (' + q.why + ')');
    }
    console.log('');
    console.log(report.flagged.length + ' flagged page(s) — ' + knownPages.length + ' accepted, ' + actionable.length + ' need a look'
      + '  →  data/query-quality-audit.json');
  }
  process.exit(actionable.length ? 1 : 0);
}

// ---- text report --------------------------------------------
function renderDoc(report) {
  const s = report.summary;
  const L = [];
  L.push('# Machine-shaped query guard');
  L.push('');
  L.push('_Generated by `scripts/audit-query-quality.cjs` from '
    + '`data/gsc-query-page.json` (window ' + report.window.startDate + ' → ' + report.window.endDate + '). Do not edit by hand._');
  L.push('');
  L.push('A page is flagged when machine-shaped queries are both numerous (≥'
    + report.thresholds.minMachineImpressions + ' impressions) and a real share of it (≥'
    + (report.thresholds.maxMachineShare * 100) + '%). The shape rules are heuristics, so every row below carries its measured impressions and the rule that caught it.');
  L.push('');
  L.push('| metric | value |');
  L.push('|---|---|');
  L.push('| query→page rows | ' + s.pairRows + ' |');
  L.push('| machine-shaped rows | ' + s.machineRows + ' |');
  L.push('| machine-shaped impressions | ' + s.machineImpressions + ' (' + (s.machineShareOfJoin * 100).toFixed(1) + '% of the join) |');
  L.push('| machine-shaped clicks | ' + s.machineClicks + ' |');
  L.push('| flagged pages | ' + s.flaggedPages + ' |');
  L.push('| accepted in the ledger | ' + (s.knownPages || 0) + ' |');
  L.push('| needing a look | ' + (s.newPages || 0) + ' |');
  L.push('');
  const section = (title, pages, blurb) => {
    L.push('## ' + title);
    L.push('');
    L.push(blurb);
    L.push('');
    if (!pages.length) { L.push('_None._'); L.push(''); return; }
    for (const p of pages) {
      L.push('### ' + p.path);
      L.push('');
      L.push('- ' + p.machineImpressions + ' of ' + p.impressions + ' impressions (' + (p.share * 100).toFixed(1) + '%), '
        + p.clicks + ' clicks — status: **' + p.status + '**');
      if (p.paths && p.paths.length > 1) L.push('- GSC reported this page under both forms: `' + p.paths.join('`, `') + '`');
      L.push('- top machine-shaped queries:');
      for (const q of p.machineQueries.slice(0, 5)) {
        L.push('  - `' + q.query.slice(0, 90) + '` — ' + q.impressions + ' impressions, position '
          + (q.position != null ? Number(q.position).toFixed(1) : '—') + ' (' + q.why + ')');
      }
      L.push('');
    }
  };
  section('Needing a look', report.newFindings || [], 'These trip the threshold and are not in the ledger — CI fails on them.');
  section('Accepted (in the ledger)', report.known || [], 'Known findings. Each one re-alerts if it grows past the numbers it was accepted at.');
  return L.join('\n') + '\n';
}

module.exports = {
  audit, reasonFor, isMachineQuery, normPath, classify, classifyFindings,
  MACHINE_RULES, MIN_MACHINE_IMPRESSIONS, MAX_MACHINE_SHARE, GROWTH_SHARE, GROWTH_IMPRESSIONS
};
