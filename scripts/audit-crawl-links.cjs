#!/usr/bin/env node
// ============================================================
// CalcProMaster — Crawl-link gate
// ------------------------------------------------------------
// Verifies the crawl-link-boost guarantee: every NOT-INDEXED page
// (GSC Discovered + Unknown) must have >= 1 inlink FROM a page Google
// has already INDEXED. A link from an indexed page is a real crawl
// signal; a link from another un-indexed page is not.
//
// Reads data/gsc-coverage-report.json + deploy/ indexable HTML, scans the
// INDEXED source pages for their internal hrefs, then checks coverage of
// every target. Exits 1 on any uncovered target (aborts the build), and
// returns cleanly when required as a module so later build steps still run.
//
// Env: CRAWL_LINK_GATE=off to skip (escape hatch for a fresh coverage pull).
// Usage: node scripts/audit-crawl-links.cjs [--json]
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const REPORT = path.join(ROOT, 'data', 'gsc-coverage-report.json');
const OUT_JSON = path.join(ROOT, 'data', 'crawl-link-gate.json');

function stripSlash(u) { return u.replace(/\/+$/, ''); }
function servedHref(u) {
  const s = stripSlash(u);
  if (s.startsWith('/guides/') || s.startsWith('/blog/')) return s;
  return s + '/';
}
function fileFor(u) {
  const s = stripSlash(u);
  if (s.startsWith('/guides/')) return path.join(DEPLOY, 'guides', s.slice(8) + '.html');
  if (s.startsWith('/blog/')) return path.join(DEPLOY, 'blog', s.slice(6) + '.html');
  const m = s.match(/^\/([a-z0-9-]+)\/([a-z0-9-]+)$/);
  if (m) return path.join(DEPLOY, m[1], m[2], 'index.html');
  return null;
}

function run() {
  const jsonOut = process.argv.includes('--json');
  const result = { ranAt: new Date().toISOString(), targets: 0, covered: 0, uncovered: [], skipped: null };

  if (process.env.CRAWL_LINK_GATE === 'off') { result.skipped = 'env'; return finish(result, jsonOut); }
  if (!fs.existsSync(REPORT)) { result.skipped = 'no-coverage-report'; return finish(result, jsonOut); }

  const rep = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
  const indexed = (rep.lists.INDEXED || []).map((r) => servedHref(r.url));
  const targets = [...(rep.lists.DISCOVERED || []), ...(rep.lists.UNKNOWN || [])]
    .map((r) => servedHref(r.url))
    .filter((u, i, a) => a.indexOf(u) === i)
    .filter((u) => { const f = fileFor(u); return f && fs.existsSync(f); });

  // Scan the INDEXED source pages for every internal href.
  const linkedFromIndexed = new Set();
  for (const u of indexed) {
    const f = fileFor(u);
    if (!f || !fs.existsSync(f)) continue;
    let html;
    try { html = fs.readFileSync(f, 'utf8'); } catch (e) { continue; }
    for (const m of html.matchAll(/href="(\/[^"#?]+)"/g)) {
      linkedFromIndexed.add(servedHref(m[1]));
    }
  }

  result.targets = targets.length;
  for (const t of targets) {
    if (linkedFromIndexed.has(t)) result.covered++;
    else result.uncovered.push(t);
  }
  return finish(result, jsonOut);
}

function finish(result, jsonOut) {
  if (result.skipped) {
    console.log('Crawl-link gate: SKIPPED (' + result.skipped + ')');
    return 0;
  }
  result.fail = result.uncovered.length > 0;
  try { fs.writeFileSync(OUT_JSON, JSON.stringify(result, null, 2)); } catch (e) { /* non-fatal */ }
  if (jsonOut) { console.log(JSON.stringify(result, null, 2)); return result.fail ? 1 : 0; }
  console.log('==========================================');
  console.log(' CRAWL-LINK GATE (indexed → not-indexed)');
  console.log('==========================================');
  console.log('targets (not indexed): ' + result.targets);
  console.log('covered by an INDEXED page: ' + result.covered);
  console.log('uncovered: ' + result.uncovered.length);
  if (result.uncovered.length) {
    console.log(result.uncovered.slice(0, 20).map((u) => '  ✗ ' + u).join('\n'));
    console.log('❌ FAIL — ' + result.uncovered.length + ' not-indexed page(s) have no indexed inlink');
    return 1;
  }
  console.log('✅ PASS — every not-indexed page has an inlink from an indexed page');
  return 0;
}

const code = run();
if (code) process.exit(code);
if (require.main === module) process.exit(0);
