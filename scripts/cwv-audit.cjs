#!/usr/bin/env node
// Core Web Vitals audit — mobile AND desktop, across one URL per page template.
//
// Why a set and not just the homepage: the old measurement (scripts/cwv-lighthouse.cjs)
// only looked at `/` on mobile, so a slow template (a tool page with charts, a hub,
// a guide) could be poor for months without ever showing up. "Which URLs are poor?"
// needs a URL list, both form factors, and the Lighthouse opportunities that explain
// each number — that is what this script records.
//
//   node scripts/cwv-audit.cjs                 # all URLs × mobile + desktop
//   node scripts/cwv-audit.cjs --form mobile   # one form factor
//   node scripts/cwv-audit.cjs --url /math/    # one URL
//
// Serves the BUILT deploy/ folder over HTTP (server.js, ROOT=deploy) and drives the
// Playwright-bundled Chromium, so there is no browser install step.
//
// Field thresholds used for the verdict (Google's CWV limits, same on both devices):
//   LCP <= 2.5 s   CLS <= 0.1   TBT <= 200 ms (lab proxy for INP)   FCP <= 1.8 s

'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.CWV_PORT || 3210);
const ORIGIN = 'http://localhost:' + PORT;
const OUT = path.join(ROOT, 'data', 'cwv-audit.json');

// One URL per template. A template that is not covered here is not measured, so
// the list is deliberately one-of-each rather than a sample of many.
const TEMPLATES = [
  ['/', 'home (heaviest: hero canvas + search)'],
  ['/finance/loan-emi/', 'tool page (calculator + chart)'],
  ['/health/bmi/', 'tool page (second category)'],
  ['/math/', 'category page'],
  ['/hub/math/', 'hub page'],
  ['/guides/tip', 'editorial guide'],
];

const FORM_FACTORS = {
  mobile: {},
  desktop: { preset: 'desktop' },
};

// Lighthouse opportunities/diagnostics worth recording for every run. The value is
// the human label; the key is the Lighthouse audit id.
const AUDITS = {
  'render-blocking-resources': 'Render-blocking requests',
  'unused-javascript': 'Unused JavaScript',
  'unused-css-rules': 'Unused CSS',
  'uses-text-compression': 'No text compression',
  'uses-responsive-images': 'Oversized images',
  'uses-optimized-images': 'Unoptimized images',
  'modern-image-formats': 'Legacy image formats',
  'efficient-animated-content': 'Animated content',
  'server-response-time': 'Server response time',
  'bootup-time': 'JS bootup time',
  'mainthread-work-breakdown': 'Main-thread work',
  'third-party-summary': 'Third-party cost',
  'dom-size': 'DOM size',
  'legacy-javascript': 'Legacy JavaScript',
  'uses-long-cache-ttl': 'Cache TTL',
  'total-byte-weight': 'Total bytes',
  'network-requests': 'Requests',
  'font-display': 'Font display',
  'largest-contentful-paint-element': 'LCP element',
  'layout-shift-elements': 'CLS contributors',
  'unminified-javascript': 'Unminified JS',
  'unminified-css': 'Unminified CSS',
  'duplicated-javascript': 'Duplicated JS',
  'uses-rel-preconnect': 'Missing preconnect',
  'uses-rel-preload': 'Missing preload',
};

const THRESHOLDS = { lcp: 2500, cls: 0.1, tbt: 200, fcp: 1800 };

const argv = process.argv.slice(2);
const argVal = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
};
const onlyForm = argVal('--form');
const onlyUrl = argVal('--url');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(url, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch (e) { /* not up yet */ }
    await sleep(250);
  }
  return false;
}

// chrome-launcher deletes its temp profile on kill; on Windows that cleanup can
// throw EPERM (a handle is still open) AFTER the audit has finished and written
// its report. That is a teardown detail, not an audit failure, so it must not
// turn a completed run into exit 1.
async function killQuietly(chrome) {
  if (!chrome) return;
  try { await chrome.kill(); } catch (e) { /* temp-profile cleanup race on Windows */ }
}

const num = (lhr, id) => (lhr.audits[id] ? lhr.audits[id].numericValue : null);
const disp = (lhr, id) => (lhr.audits[id] ? lhr.audits[id].displayValue : null);

function collectOpportunities(lhr) {
  const out = [];
  for (const [id, label] of Object.entries(AUDITS)) {
    const a = lhr.audits[id];
    if (!a) continue;
    const row = {
      id,
      label,
      score: a.score,
      displayValue: a.displayValue || null,
      savingsMs: a.details && a.details.overallSavingsMs ? Math.round(a.details.overallSavingsMs) : null,
      savingsBytes: a.details && a.details.overallSavingsBytes ? a.details.overallSavingsBytes : null,
    };
    // Keep the ones that cost something or are outright failing; drop plain "passes".
    if (row.savingsMs || row.savingsBytes || (typeof a.score === 'number' && a.score < 0.9) || a.score === null) {
      out.push(row);
    }
  }
  // Biggest saving first so the fix order is obvious.
  return out.sort((x, y) => (y.savingsMs || 0) - (x.savingsMs || 0) || (y.savingsBytes || 0) - (x.savingsBytes || 0));
}

async function run() {
  const lighthouse = (() => {
    const m = require('lighthouse');
    return m.default || m;
  })();
  const { launch } = require('chrome-launcher');

  const server = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT), ROOT: 'deploy' },
    stdio: 'ignore',
  });
  process.on('exit', () => { try { server.kill(); } catch (e) {} });

  let chrome = null;
  try {
    if (!(await waitForServer(ORIGIN + '/'))) throw new Error('deploy server did not answer on ' + ORIGIN);
    process.env.CHROME_PATH = require('playwright').chromium.executablePath();
    chrome = await launch({ chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'] });

    const urls = TEMPLATES.filter(([u]) => !onlyUrl || u === onlyUrl);
    const forms = Object.entries(FORM_FACTORS).filter(([f]) => !onlyForm || f === onlyForm);
    const results = [];

    for (const [url, label] of urls) {
      const probe = await fetch(ORIGIN + url);
      if (!probe.ok) {
        results.push({ url, label, error: 'HTTP ' + probe.status + ' — not a built page, skipped' });
        console.log('  ! ' + url + ' → HTTP ' + probe.status + ' (skipped)');
        continue;
      }
      for (const [form, flags] of forms) {
        const { lhr } = await lighthouse(ORIGIN + url, {
          port: chrome.port,
          output: 'json',
          onlyCategories: ['performance'],
          logLevel: 'error',
          ...flags,
        });
        const m = {
          lcp: num(lhr, 'largest-contentful-paint'),
          cls: num(lhr, 'cumulative-layout-shift'),
          tbt: num(lhr, 'total-blocking-time'),
          fcp: num(lhr, 'first-contentful-paint'),
          si: num(lhr, 'speed-index'),
          tti: num(lhr, 'interactive'),
        };
        const poor = [];
        if (m.lcp != null && m.lcp > THRESHOLDS.lcp) poor.push('LCP ' + Math.round(m.lcp) + 'ms');
        if (m.cls != null && m.cls > THRESHOLDS.cls) poor.push('CLS ' + m.cls.toFixed(3));
        if (m.tbt != null && m.tbt > THRESHOLDS.tbt) poor.push('TBT ' + Math.round(m.tbt) + 'ms');
        if (m.fcp != null && m.fcp > THRESHOLDS.fcp) poor.push('FCP ' + Math.round(m.fcp) + 'ms');
        const entry = {
          url,
          label,
          form,
          perfScore: Math.round((lhr.categories.performance.score || 0) * 100),
          metrics: {
            lcp: m.lcp, cls: m.cls, tbt: m.tbt, fcp: m.fcp, si: m.si, tti: m.tti,
            lcpDisplay: disp(lhr, 'largest-contentful-paint'),
            clsDisplay: disp(lhr, 'cumulative-layout-shift'),
            tbtDisplay: disp(lhr, 'total-blocking-time'),
          },
          verdict: poor.length ? 'POOR' : 'GOOD',
          poorBecause: poor,
          totalBytes: num(lhr, 'total-byte-weight'),
          requests: lhr.audits['network-requests'] ? (lhr.audits['network-requests'].details.items || []).length : null,
          opportunities: collectOpportunities(lhr),
        };
        results.push(entry);
        console.log('  ' + (poor.length ? '✗ POOR' : '✓ good') + '  ' + form.padEnd(7) + ' ' +
          String(entry.perfScore).padStart(3) + '  LCP ' + (m.lcp == null ? '-' : Math.round(m.lcp) + 'ms') +
          '  CLS ' + (m.cls == null ? '-' : m.cls.toFixed(3)) + '  TBT ' + (m.tbt == null ? '-' : Math.round(m.tbt) + 'ms') +
          '  ' + url);
      }
    }

    const ran = results.filter((r) => !r.error);
    const poor = ran.filter((r) => r.verdict === 'POOR');
    // A --form/--url run covers only part of the matrix. Merge with what is
    // already recorded, keyed on url+form, so one half-matrix run cannot wipe
    // the other half's numbers — the report is meant to hold mobile AND desktop.
    let previous = [];
    try {
      const prev = JSON.parse(fs.readFileSync(OUT, 'utf8'));
      if (prev && Array.isArray(prev.results)) previous = prev.results;
    } catch (e) { /* first run */ }
    const fresh = new Set(results.map((r) => r.form + ' ' + r.url));
    const merged = results.concat(previous.filter((r) => !fresh.has(r.form + ' ' + r.url)));
    merged.sort((a, b) => a.url.localeCompare(b.url) || a.form.localeCompare(b.form));
    const out = {
      ranAt: new Date().toISOString(),
      origin: ORIGIN,
      deployBuilt: fs.existsSync(path.join(ROOT, 'deploy', 'index.html')),
      thresholds: THRESHOLDS,
      audited: merged.filter((r) => !r.error).length,
      poorCount: merged.filter((r) => r.verdict === 'POOR').length,
      results: merged,
    };
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

    console.log('\n==========================================');
    console.log(' CWV AUDIT — ' + ran.length + ' runs, ' + poor.length + ' POOR');
    console.log('==========================================');
    for (const r of poor) console.log('  ✗ ' + r.form + ' ' + r.url + ' — ' + r.poorBecause.join(', '));
    if (!poor.length && ran.length) console.log('  ✓ every measured URL + form factor is within the CWV limits');
    console.log('\n💾 ' + path.relative(ROOT, OUT));

    await killQuietly(chrome);
    chrome = null;
    server.kill();
    if (poor.length) process.exitCode = 0; // a POOR result is the finding, not a crash
  } finally {
    await killQuietly(chrome);
    try { server.kill(); } catch (e) {}
  }
}

run().catch((e) => { console.error('CWV AUDIT FAILED:', e.message); process.exit(1); });
