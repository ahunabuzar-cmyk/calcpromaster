#!/usr/bin/env node
// Temporary: intercept app.js and log every renderHome() call stack + CLS.
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const logs = [];
  page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await page.route('**/js/app.js*', async (route) => {
    const res = await route.fetch();
    let body = await res.text();
    body = body.replace(/function renderHome\(\)\s*\{/, 'function renderHome() {\n    try{console.log("RH@"+Math.round(performance.now())+"\\n"+new Error().stack.split("\\n").slice(1,6).join("\\n"));}catch(e){}\n');
    await route.fulfill({ response: res, body });
  });
  await page.route('**/*', async (route) => {
    if (/\/js\/app\.js/.test(route.request().url())) return route.fallback();
    await new Promise((r) => setTimeout(r, 60));
    await route.continue();
  });
  await page.addInitScript(() => {
    window.__shifts = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        window.__shifts.push({ t: Math.round(e.startTime), v: e.value, src: (e.sources || []).map((s) => ({ tag: s.node ? (s.node.id ? '#' + s.node.id : s.node.tagName) : 'REMOVED', prevTop: s.previousRect && Math.round(s.previousRect.top), prevH: s.previousRect && Math.round(s.previousRect.height) })) });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('http://localhost:3217/', { waitUntil: 'load' });
  await page.waitForTimeout(12000);
  const shifts = await page.evaluate(() => window.__shifts);
  console.log('=== CONSOLE ===');
  console.log(logs.join('\n').slice(0, 4000));
  console.log('=== SHIFTS ===');
  console.log(JSON.stringify(shifts, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
