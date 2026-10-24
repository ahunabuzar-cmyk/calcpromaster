#!/usr/bin/env node
// Temporary diagnostic: run Lighthouse mobile against local deploy/ and dump
// the exact audit details we need to fix (CLS nodes, blocking, cache, JS/CSS, a11y).
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = process.env.LH_PORT || '3217';
const URL = `http://localhost:${PORT}/`;

(async () => {
  const server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT, ROOT: 'deploy' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', () => {});
  server.stderr.on('data', (d) => process.stderr.write('[srv] ' + d));
  await new Promise((r) => setTimeout(r, 1200));
  const lighthouse = require('lighthouse').default;
  const { launch } = require('chrome-launcher');
  process.env.CHROME_PATH = require('playwright').chromium.executablePath();
  const chrome = await launch({ chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] });
  try {
    const result = await lighthouse(URL, {
      port: chrome.port,
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices'],
      logLevel: 'error',
      formFactor: 'mobile',
      screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
      throttling: { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4, requestLatencyMs: 562.5, downloadThroughputKbps: 1474.56, uploadThroughputKbps: 675 },
    });
    const lhr = result.lhr;
    fs.writeFileSync('/tmp/lh.json', JSON.stringify(lhr));
    const a = lhr.audits;
    const val = (id) => (a[id] ? (a[id].displayValue || String(a[id].numericValue)) : 'n/a');
    console.log('SCORES', Object.fromEntries(Object.entries(lhr.categories).map(([k, c]) => [k, Math.round(c.score * 100)])));
    for (const id of ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index']) {
      console.log(id, '=', val(id));
    }
    const dump = (id, n = 12) => {
      const x = a[id];
      if (!x) return;
      console.log('\n=== ' + id + ' | score=' + x.score + ' | ' + (x.displayValue || '') + ' ===');
      if (x.details && x.details.items) {
        for (const it of x.details.items.slice(0, n)) {
          console.log(JSON.stringify(it).slice(0, 700));
        }
      }
      if (x.explanation) console.log('explanation:', x.explanation.slice(0, 400));
    };
    for (const id of [
      'layout-shift-elements',
      'uses-long-cache-ttl',
      'render-blocking-resources',
      'unminified-javascript',
      'unused-javascript',
      'unminified-css',
      'unused-css-rules',
      'mainthread-work-breakdown',
      'bootup-time',
      'long-tasks',
      'non-composited-animations',
      'heading-order',
      'identical-links-same-purpose',
      'errors-in-console',
      'csp-xss',
      'trusted-types-xss',
      'third-party-summary',
      'dom-size',
      'network-requests',
    ]) dump(id);
  } finally {
    await chrome.kill();
    server.kill();
  }
  process.exit(0);
})().catch((e) => { console.error('LH FAIL:', e); process.exit(1); });
