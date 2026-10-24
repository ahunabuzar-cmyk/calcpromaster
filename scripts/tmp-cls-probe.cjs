#!/usr/bin/env node
// Temporary CLS forensics: records every layout-shift entry with source nodes,
// prior/current rects, plus the DOM insertions that caused them.
'use strict';
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.route('**/*', async (route) => { await new Promise((r) => setTimeout(r, 120)); await route.continue(); });
  await page.addInitScript(() => {
    window.__errors = [];
    window.addEventListener('error', (e) => window.__errors.push(String(e.message)));
    window.addEventListener('unhandledrejection', (e) => window.__errors.push('rejection: ' + String(e.reason)));
    window.__shifts = [];
    window.__mut = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        if (!e.hadRecentInput) {
          window.__shifts.push({
            t: Math.round(e.startTime),
            v: e.value,
            sources: (e.sources || []).map((s) => ({
              tag: s.node ? (s.node.id ? '#' + s.node.id : s.node.tagName + '.' + (s.node.className || '')) : 'REMOVED',
              prev: s.previousRect ? [Math.round(s.previousRect.top), Math.round(s.previousRect.height)] : null,
              cur: s.currentRect ? [Math.round(s.currentRect.top), Math.round(s.currentRect.height)] : null,
            })),
          });
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
    new MutationObserver((recs) => {
      for (const r of recs) {
        for (const n of r.addedNodes) {
          if (n.nodeType !== 1) continue;
          const h = n.getBoundingClientRect ? Math.round(n.getBoundingClientRect().height) : 0;
          window.__mut.push({ t: Math.round(performance.now()), op: 'add', sel: (n.id ? '#' + n.id : n.tagName + '.' + (n.className || '')), h });
        }
        for (const n of r.removedNodes) {
          if (n.nodeType !== 1) continue;
          window.__mut.push({ t: Math.round(performance.now()), op: 'del', sel: (n.id ? '#' + n.id : n.tagName + '.' + (n.className || '')) });
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  });
  await page.goto(process.env.TARGET || 'http://localhost:3217/', { waitUntil: 'load' });
  await page.waitForTimeout(20000);
  const out = await page.evaluate(() => ({
    shifts: window.__shifts,
    mut: window.__mut.filter((m) => /MAIN|DIV|SECTION|H[1-6]|P|CANVAS/.test(m.sel)).slice(-60),
    metrics: {
      cod: (() => { const el = document.querySelector('.calc-of-day-card'); return el ? Math.round(el.getBoundingClientRect().height) : null; })(),
      tip: (() => { const el = document.getElementById('daily-tip-widget'); return el ? Math.round(el.getBoundingClientRect().height) : null; })(),
      hero: Math.round(document.querySelector('.hero').getBoundingClientRect().height),
      mainTop: Math.round(document.getElementById('mainContent').getBoundingClientRect().top),
    },
    errors: window.__errors || [],
  }));
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
