#!/usr/bin/env node
/* ============================================================
 * CalcProMaster — build-time SEO gate
 * ------------------------------------------------------------
 * Seven SEO gates lived only in CI, after the deploy/ folder was already
 * built and uploaded as an artifact. A local `node build-deploy.js` could
 * therefore produce a folder that CI then rejected, and the two most
 * structural ones — "every sitemap URL has a real file" and "every sitemap URL
 * is index-ready" — are exactly the failures that only show up after a full
 * rebuild (a renamed slug, a dropped page, a broken canonical).
 *
 * This runner puts both in the build itself, so the build aborts instead of
 * shipping a folder that is missing pages or has unindexable ones.
 *
 *   node scripts/seo-gate.cjs        # used by build-deploy.js and CI
 * ============================================================ */
'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function run(label, script, args) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', script)].concat(args || []), {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });
  if (r.error) {
    console.error('  ✗ ' + label + ' could not run: ' + r.error.message);
    return false;
  }
  if (r.status !== 0) {
    console.error('  ✗ ' + label + ' FAILED (exit ' + r.status + ')');
    return false;
  }
  console.log('  ✓ ' + label);
  return true;
}

function main() {
  console.log('SEO gate (deploy/):');
  let ok = true;

  if (!fs.existsSync(path.join(ROOT, 'deploy', 'index.html'))) {
    console.error('  ✗ deploy/index.html missing — run node build-deploy.js first');
    process.exit(1);
  }

  // 1) Sitemap coverage + redirects contract + whitelist/.htaccess parity.
  ok = run('sitemap coverage and 404-catch-all safety', 'check-sitemap-coverage.cjs') && ok;

  // 2) Every sitemap URL index-ready (title, meta, canonical, robots, H1,
  //    word count, internal links, JSON-LD). The audit writes its own JSON; the
  //    gate reads the summary so a FAIL count of any size stops the build.
  if (run('SEO indexing audit', 'seo-indexing-audit.cjs')) {
    let report = null;
    try {
      const json = JSON.parse(fs.readFileSync(path.join(ROOT, 'seo-indexing-audit.json'), 'utf8'));
      report = json.report || json;
    } catch (e) {
      console.error('  ✗ seo-indexing-audit.json unreadable: ' + e.message);
      ok = false;
    }
    if (report) {
      const summary = report.summary || {};
      const fails = Number(summary.fail || 0);
      if (fails > 0) {
        const first = (report.failures || []).slice(0, 5);
        console.error('  ✗ ' + fails + ' sitemap URL(s) are not index-ready:');
        for (const f of first) {
          console.error('      ' + (f.url || f.loc || '?') + ' — ' + (f.reasons || f.reason || f.status || 'see JSON'));
        }
        console.error('    Detail: seo-indexing-audit.json (or seo-indexing-audit.csv)');
        ok = false;
      } else {
        console.log('  ✓ ' + (summary.total || summary.urls || 'all') + ' sitemap URLs index-ready');
      }
    }
  } else {
    ok = false;
  }

  if (!ok) {
    console.error('  ✗ SEO gate FAILED — build aborted');
    process.exit(1);
  }
  console.log('  ✓ SEO gate PASS');
}

main();
