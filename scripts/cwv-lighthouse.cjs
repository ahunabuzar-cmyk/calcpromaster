#!/usr/bin/env node
// One-off CWV measurement: spawns dev server, runs Lighthouse (mobile) on the
// homepage, writes a summary to data/cwv-baseline.json, kills everything.
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');

(async () => {
  const server = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: process.env.CWV_PORT || '3210', ROOT: process.env.CWV_ROOT || 'deploy' },
    stdio: 'ignore',
  });
  await new Promise((r) => setTimeout(r, 1500));
  try {
    process.env.CHROME_PATH = require('playwright').chromium.executablePath();
    const lighthouse = require('lighthouse').default;
    const { launch } = require('chrome-launcher');
    const chrome = await launch({ chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'] });
    const result = await lighthouse('http://localhost:3210/', {
      port: chrome.port,
      output: 'json',
      onlyCategories: ['performance'],
      logLevel: 'error',
    });
    const lhr = result.lhr;
    const v = (a) => (lhr.audits[a] ? (lhr.audits[a].displayValue || lhr.audits[a].numericValue) : null);
    const summary = {
      url: 'http://localhost:3210/ (mobile emulation)',
      perfScore: Math.round((lhr.categories.performance.score || 0) * 100),
      fcp: v('first-contentful-paint'),
      lcp: v('largest-contentful-paint'),
      tbt: v('total-blocking-time'),
      cls: v('cumulative-layout-shift'),
      si: v('speed-index'),
      tti: v('interactive'),
      totalBytes: v('total-byte-weight'),
      mainthreadWork: v('mainthread-work-breakdown'),
      bootJsTime: v('bootup-time'),
    };
    fs.writeFileSync('data/cwv-baseline.json', JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 1));
    await chrome.kill();
  } finally {
    server.kill();
  }
})().catch((e) => { console.error('CWV FAIL:', e.message); process.exit(1); });
