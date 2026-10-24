#!/usr/bin/env node
// ============================================================
// CalcProMaster — Weekly SEO refresh (one command)
// ------------------------------------------------------------
// Har hafte ka loop, ek hi command mein. Ordering jaan-boojh kar hai: data pehle,
// phir us par bani reports, phir build — taake build ke andar chalne wali
// staleness gate ko purani report na mile.
//
//   A. Data (GSC se)
//   1. Per-page impressions                    (gsc-export-pages.cjs)
//   2. Sitemap resubmit + URL inspection batch  (gsc-batch-inspect.cjs)
//   3. Index panel: wahi 100 URLs dobara       (build-index-panel.cjs)
//   4. Query→page join                          (gsc-queries.cjs)
//   5. Machine-shaped query guard (non-fatal)   (audit-query-quality.cjs)
//
//   B. Reports (data se banti hain)
//   6. Growth model: run-rate vs 28-day avg     (build-growth-model.cjs)
//   7. Run-rate stall watch (2 flat weeks)      (run-rate-tracker.cjs)
//  7b. Query reach: per-page reach + split leak (build-query-reach.cjs)
//  7c. Keyword research table (deliverable B)   (build-keyword-research-table.cjs)
//   8. Index burn-down (panel-measured rate)    (build-index-burndown.cjs)
//   9. Public stats page + homepage figure      (build-stats-page.cjs)
//  10. SEO copy changelog (ledger + page)       (build-changelog.cjs)
//
//   C. Build + gates
//  11. Deploy rebuild (crawl-link-boost + gates)(build-deploy.js)
//  12. Crawl-link gate                          (audit-crawl-links.cjs)
//  13. Link-equity plan (built link graph se)   (build-link-equity-plan.cjs)
//  14. Host-consolidation check                 (check-host-redirects.cjs)
//  15. Staleness gate — FATAL: koi published artifact apne data se purana nahi
//
// Steps 2-4 GSC API likhte hain; unka fail hona baaki chain nahi rokti.
// Step 5 non-fatal hai (weekly report): badle hue page ka report
// data/query-quality-audit.json mein aata hai. CI ka quality job isi script ko
// gate ki tarah chalata hai — wahan regression exit 1 deti hai.
// Step 14 non-fatal; step 15 FATAL (exit 1) — refresh "sab pass" nahi keh sakta
// jab ek report apne data se purani ho. Wahi gate `npm run seo:staleness` se
// alag se bhi chalti hai aur `npm run deploy:build` ke andar bhi lagi hai.
//
// Flags:
//   --days N        GSC window (default 28)
//   --limit N       inspection batch size (default 100; sitemap resubmit hamesha hota hai)
//   --skip-inspect  GSC writes skip (impressions pull + panel refresh bhi skip)
//   --skip-build    deploy rebuild + crawl-link gate skip
//   --skip-hosts    host-redirect check skip
//   --skip-data     sirf build + local reports (offline run, koi GSC call nahi)
//
// Usage: node scripts/weekly-seo-refresh.cjs
// ============================================================
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const NODE = process.execPath;

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  const v = i >= 0 ? parseInt(process.argv[i + 1], 10) : NaN;
  return Number.isFinite(v) && v > 0 ? v : dflt;
};
const DAYS = arg('--days', 28);
const LIMIT = arg('--limit', 100);
const SKIP_INSPECT = process.argv.includes('--skip-inspect');
const SKIP_BUILD = process.argv.includes('--skip-build');
const SKIP_HOSTS = process.argv.includes('--skip-hosts');
// Offline run: build + local reports only, no GSC reads or writes.
const SKIP_DATA = process.argv.includes('--skip-data');

function step(n, title) { console.log('\n──────── [' + n + '] ' + title + ' ────────'); }
function run(script, args) {
  try {
    execFileSync(NODE, [path.join(ROOT, 'scripts', script), ...args], { cwd: ROOT, stdio: 'inherit' });
    return true;
  } catch (e) {
    console.error('  ✖ ' + script + ' failed: ' + (e.message || '').split('\n')[0]);
    return false;
  }
}

(async () => {
  const started = Date.now();
  console.log('🔄 Weekly SEO refresh — ' + new Date().toISOString());

  // ---------- A. Data ----------

  if (SKIP_DATA) {
    step(1, 'GSC per-page impressions — SKIPPED (--skip-data)');
    step(2, 'Sitemap resubmit + inspection — SKIPPED (--skip-data)');
    step(3, 'Index panel refresh — SKIPPED (--skip-data)');
    step(4, 'GSC query→page join — SKIPPED (--skip-data)');
  } else {
    step(1, 'GSC per-page impressions (' + DAYS + 'd)');
    run('gsc-export-pages.cjs', ['--days', String(DAYS)]);

    if (!SKIP_INSPECT) {
      step(2, 'Sitemap resubmit + URL inspection (' + LIMIT + ' URLs)');
      const stamp = new Date().toISOString().slice(0, 10);
      run('gsc-batch-inspect.cjs', ['--limit', String(LIMIT), '--out', 'data/gsc-inspect-batch-' + stamp + '.json']);

      // The measured indexing rate comes from this panel, not from whatever
      // ad-hoc batch happened to overlap: same tracked URLs, every run. The daily
      // job (seo-panel-daily.yml) re-inspects the whole queue every morning; this
      // step is the weekly safety net and re-inspects the same panel, which is
      // resumable and skips whatever today's run already checked.
      step(3, 'Index panel refresh (same tracked URLs)');
      run('build-index-panel.cjs', ['--inspect']);
    } else {
      step(2, 'Sitemap resubmit + inspection — SKIPPED (--skip-inspect)');
      step(3, 'Index panel refresh — SKIPPED (--skip-inspect)');
    }

    // Query→page join. This is the input the opportunity planner and the
    // machine-shaped query guard both read, so refresh it here (same 28-day
    // window as the per-page pull) instead of letting the guard only ever skip.
    step(4, 'GSC query→page join');
    run('gsc-queries.cjs', ['--days', String(DAYS)]);
  }

  step(5, 'Machine-shaped query guard');
  const queryQualityOk = run('audit-query-quality.cjs', []);
  if (!queryQualityOk) {
    console.error('  ⚠  A page is being shaped by machine-generated queries — see data/query-quality-audit.json. Not fatal here; the CI quality job gates it too.');
  }

  // ---------- B. Reports ----------

  // Run-rate vs the 28-day average. A ramp makes the 28-day average lie, so the
  // growth report exists to stop the older number being read as today's speed.
  step(6, 'Growth model (run-rate vs 28-day average)');
  const growthOk = run('build-growth-model.cjs', []);
  if (!growthOk) console.error('  ⚠  Growth model failed — data files check karo (docs/GROWTH-MODEL.md purana reh gaya).');

  // Run-rate history + 2-week stall alert. First few runs say
  // "insufficient-history" — that is the honest answer, not a failure.
  step(7, 'Run-rate stall watch');
  const stallOk = run('run-rate-tracker.cjs', []);
  if (!stallOk) console.error('  ⚠  Run-rate tracker failed — docs/RUN-RATE-STALL.md purana reh gaya.');

  // Query reach: per-page distinct queries, URL-variant split leak, aur target
  // gap. Ye run-rate ke BAAD chalta hai taake usi run-rate ko base bana kar
  // 200k/300k ka multiple de — warna ye report aur GROWTH-MODEL.md takra jate.
  step('7b', 'Query reach (per-page reach + variant-split leak + target gap)');
  const reachOk = run('build-query-reach.cjs', []);
  if (!reachOk) console.error('  ⚠  Query reach failed — docs/QUERY-REACH.md purana reh gaya.');

  // Keyword research table (deliverable B): wahi measured query→page join, par
  // field-by-field export ke saath — jo cheez naap nahi paayi wo "Not available"
  // rehti hai. Isi join par bana hai, is liye 4 ke BAAD chalta hai.
  step('7c', 'Keyword research table (measured + targeted, csv)')
  const kwTableOk = run('build-keyword-research-table.cjs', []);
  if (!kwTableOk) console.error('  ⚠  Keyword research table failed — data/keyword-research.csv purana reh gaya.');

  // Burn-down reads the panel history for its measured rate, so it must come
  // after the panel refresh above.
  step(8, 'Index burn-down (panel-measured rate)');
  const burnOk = run('build-index-burndown.cjs', []);
  if (!burnOk) console.error('  ⚠  Burn-down failed — docs/INDEX-BURNDOWN.md purana reh gaya.');

  // These two read the same panel history as the burn-down, so they belong in the
  // same step group. Without them the final staleness gate failed on every run
  // ("data/index-velocity.json newer source: data/index-panel-history.json"): the
  // refresh advanced the source and left the dependents behind, so "npm run
  // seo:weekly" could never report success. Fixed here rather than by teaching the
  // gate to ignore them.
  step('8b', 'Index velocity + regression check (panel history)');
  const velocityOk = run('track-index-velocity.cjs', []);
  if (!velocityOk) console.error('  ⚠  Index velocity failed — docs/INDEX-VELOCITY.md purana reh gaya.');
  const regressionsOk = run('check-index-regressions.cjs', []);
  if (!regressionsOk) console.error('  ⚠  Index regression check failed — docs/INDEX-REGRESSIONS.md purana reh gaya.');

  // Public stats page + the homepage figure, both from the same files, so the
  // published numbers and the internal reports can never drift apart.
  step(9, 'Public stats page (+ homepage run-rate figure)');
  const statsOk = run('build-stats-page.cjs', []);
  if (!statsOk) console.error('  ⚠  stats.html purana reh gaya.');

  // Dated record of every title/meta/copy change, so a movement can always be
  // traced to an edit. Append-only: old entries are never rewritten.
  step(10, 'SEO copy changelog');
  const changelogOk = run('build-changelog.cjs', []);
  if (!changelogOk) console.error('  ⚠  Changelog failed — changelog.html / docs/CHANGELOG.md purana reh gaya.');

  // ---------- C. Build + gates ----------

  if (!SKIP_BUILD) {
    step(11, 'Rebuild deploy/ (crawl-link-boost + gates)');
    try {
      execFileSync(NODE, [path.join(ROOT, 'build-deploy.js')], { cwd: ROOT, stdio: 'inherit' });
    } catch (e) {
      console.error('  ✖ build-deploy.js failed');
    }
    step(12, 'Crawl-link gate');
    run('audit-crawl-links.cjs', []);
  } else {
    step(11, 'Rebuild — SKIPPED (--skip-build)');
    step(12, 'Crawl-link gate — SKIPPED (--skip-build)');
  }

  // The top-10 push list measures each page's title against the queries that page
  // actually receives, so it must run after every title change in the pipeline and
  // before the staleness gate — otherwise a title edit makes it stale on the spot
  // (its source is js/seo-content.js).
  step('12b', 'Top-10 push list (measured title gaps)');
  const pushOk = run('build-top10-push-list.cjs', []);
  if (!pushOk) console.error('  ⚠  Push list failed — docs/TOP10-PUSH-LIST.md purana reh gaya.');

  // Link-equity plan needs the built deploy/ link graph, so it runs after step 11.
  step(13, 'Link-equity plan');
  const equityOk = run('build-link-equity-plan.cjs', []);
  if (!equityOk) console.error('  ⚠  Link-equity plan failed — docs/LINK-EQUITY-PLAN.md purana reh gaya.');

  // Host consolidation (non-fatal): apex 200, www + pages.dev 301 -> apex.
  if (!SKIP_HOSTS && !SKIP_DATA) {
    step(14, 'Host-consolidation regression check');
    const hostsOk = run('check-host-redirects.cjs', []);
    if (!hostsOk) console.error('  ⚠  Host check FAILED — www/pages.dev might be serving 200 again. Dekh lo.');
  } else {
    step(14, 'Host-consolidation check — SKIPPED');
  }

  // Last thing: prove that nothing we just rebuilt is older than its data. If a
  // report is stale, the refresh FAILS rather than reporting success.
  step(15, 'Published-artifact staleness gate');
  const freshOk = run('audit-report-staleness.cjs', []);
  if (!freshOk) console.error('  ✖  A published artifact is older than its data source — regenerate it (see list above).');

  const secs = Math.round((Date.now() - started) / 1000);
  console.log('\n' + (freshOk ? '✅' : '❌') + ' Weekly SEO refresh done in ' + secs + 's' + (freshOk ? '.' : ' (with stale artifacts).'));
  console.log('   Reports: data/gsc-page-impressions.json · data/gsc-query-page.json · data/query-quality-audit.json · data/crawl-link-boost.json · data/crawl-link-gate.json · docs/GROWTH-MODEL.md · docs/INDEX-PANEL.md · docs/INDEX-BURNDOWN.md · docs/LINK-EQUITY-PLAN.md · docs/CHANGELOG.md');
  console.log('   Host check: node scripts/check-host-redirects.cjs (npm run seo:hosts)');
  if (!freshOk) process.exitCode = 1;
})();
