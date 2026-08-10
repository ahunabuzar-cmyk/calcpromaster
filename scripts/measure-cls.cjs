#!/usr/bin/env node
/**
 * measure-cls.cjs — repeatable Core Web Vitals measurement.
 * Usage: node scripts/measure-cls.cjs [url] [runs]
 * Defaults: https://calcpromaster.netlify.app/  3 runs  (mobile 375x667, 3G-ish throttling off)
 *
 * Reports: FCP, LCP, CLS (session), largest single shift (value+time), TTFB, overflow.
 */
const { chromium } = require('playwright');

const URL = process.argv[2] || 'https://calcpromaster.netlify.app/';
const RUNS = parseInt(process.argv[3] || '3', 10);

async function measureOnce(browser, runIdx) {
  const ctx = await browser.newContext({
    viewport: { width: 375, height: 667 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    serviceWorkers: 'block', // cold network load every time — no SW cache
  });
  const page = await ctx.newPage();
  const consoleErrs = [];
  const failedReq = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 120)); });
  page.on('requestfailed', (r) => failedReq.push((r.url() || '').slice(0, 100)));

  try {
    await page.goto(URL, { waitUntil: 'load', timeout: 45000 });
  } catch (e) {
    console.log(`  [nav ${runIdx}] goto warning: ${e.message.split('\n')[0].slice(0, 120)}`);
  }

  const metrics = await page.evaluate(async () => {
    return await new Promise((resolve) => {
      const out = {
        fcp: null, lcp: null, cls: 0,
        largestShift: { value: 0, time: 0, source: '?' },
        ttfb: null, overflow: false, shifts: [],
      };
      const paint = (list) => {
        for (const e of list.getEntries()) {
          if (e.name === 'first-contentful-paint') out.fcp = e.startTime;
          if (e.name === 'largest-contentful-paint') out.lcp = e.startTime;
        }
      };
      let firstNav = true;
      const navObs = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (firstNav && e.entryType === 'navigation') {
            out.ttfb = e.responseStart;
            firstNav = false;
          }
        }
      });
      try { navObs.observe({ type: 'navigation', buffered: true }); } catch (e) {}
      try {
        const po = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            if (!e.hadRecentInput) {
              out.cls += e.value;
              out.shifts.push({ v: e.value, t: e.startTime });
              if (e.value > out.largestShift.value) {
                out.largestShift.value = e.value;
                out.largestShift.time = e.startTime;
              }
            }
          }
        });
        po.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {}
      try { new PerformanceObserver(paint).observe({ type: 'paint', buffered: true }); } catch (e) {}
      try { new PerformanceObserver(paint).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {}

      // Sample document height at intervals to spot tall-state collapse
      const heightSamples = [];
      for (const t of [500, 1000, 1500, 2000, 3000, 4000, 5000]) {
        setTimeout(() => {
          try { heightSamples.push({ t, h: document.documentElement.scrollHeight }); } catch (e) {}
        }, t);
      }

      const finish = () => {
        out.overflow = document.documentElement.scrollWidth > window.innerWidth + 1;
        // Direct read as fallback (observers sometimes miss pre-attach entries)
        try {
          const paints = performance.getEntriesByType('paint');
          for (const p of paints) if (p.name === 'first-contentful-paint' && !out.fcp) out.fcp = p.startTime;
          const lcps = performance.getEntriesByType('largest-contentful-paint');
          if (lcps.length && !out.lcp) out.lcp = lcps[lcps.length - 1].startTime;
          const navs = performance.getEntriesByType('navigation');
          if (navs.length && !out.ttfb) out.ttfb = navs[0].responseStart;
        } catch (e) {}
        setTimeout(() => {
          try {
            const h = document.documentElement.scrollHeight;
            heightSamples.push({ t: 10000, h });
          } catch (e) {}
          out.heightSamples = heightSamples;
          resolve(out);
        }, 0);
      };

      if (document.readyState === 'complete') setTimeout(finish, 9000);
      else window.addEventListener('load', () => setTimeout(finish, 9000));
      setTimeout(finish, 14000); // hard cap
    });
  });

  metrics.consoleErrs = consoleErrs;
  metrics.failedReq = failedReq.slice(0, 5);
  await ctx.close();
  return metrics;
}

(async () => {
  const browser = await chromium.launch();
  const results = [];
  for (let i = 0; i < RUNS; i++) {
    try {
      const m = await measureOnce(browser, i);
      results.push(m);
      console.log(`--- run ${i + 1} ---`);
      console.log(`TTFB ${(m.ttfb||0).toFixed(0)}ms  FCP ${(m.fcp||0).toFixed(0)}ms  LCP ${(m.lcp||0).toFixed(0)}ms  CLS ${m.cls.toFixed(3)}  overflow=${m.overflow}`);
      console.log(`largest shift: ${m.largestShift.value.toFixed(3)} @ ${m.largestShift.time.toFixed(0)}ms`);
      console.log(`heights: ${(m.heightSamples||[]).map(s => `${s.t}ms:${s.h}px`).join('  ')}`);
      const big = (m.shifts||[]).filter(s => s.v > 0.01);
      if (big.length) console.log(`shifts>0.01: ${big.map(s => `${s.v.toFixed(3)}@${s.t.toFixed(0)}ms`).join(', ')}`);
      if (m.consoleErrs && m.consoleErrs.length) console.log(`console errors: ${m.consoleErrs.join(' | ')}`);
      if (m.failedReq && m.failedReq.length) console.log(`failed requests: ${m.failedReq.join(' | ')}`);
    } catch (e) {
      console.log(`run ${i + 1} ERROR: ${e.message}`);
    }
  }
  const clsVals = results.map(r => r.cls);
  if (clsVals.length) {
    const avg = clsVals.reduce((a, b) => a + b, 0) / clsVals.length;
    const max = Math.max(...clsVals);
    console.log(`\nSUMMARY avg CLS=${avg.toFixed(3)}  max CLS=${max.toFixed(3)}  verdict=${avg < 0.1 ? 'GOOD (<0.1)' : avg < 0.25 ? 'NEEDS IMPROVEMENT (0.1-0.25)' : 'POOR (>0.25)'}`);
  }
  await browser.close();
})();
