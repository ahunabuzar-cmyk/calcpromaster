// Measure LCP element, long tasks, forced reflow warnings on a page (read-only probe).
const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const url = process.env.PROBE_URL || 'http://localhost:3100/';
  const chromePath = process.env.CHROME_PATH ||
    'C:/Users/ok/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  const warnings = [];
  const longTasks = [];
  let lcp = null;
  let lcpEntries = [];

  page.on('console', (msg) => {
    const t = msg.text();
    if (/reflow|layout thrash|long task|Intervention/i.test(t)) warnings.push(t.slice(0, 200));
  });

  await page.addInitScript(() => {
    window.__lcpEntries = [];
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          window.__lcpEntries.push({
            time: Math.round(e.startTime),
            size: Math.round(e.size),
            id: e.element ? (e.element.id || e.element.className || e.element.tagName) : '?'
          });
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          window.__longTasks = window.__longTasks || [];
          window.__longTasks.push({ start: Math.round(e.startTime), dur: Math.round(e.duration) });
        }
      }).observe({ type: 'longtask', buffered: true });
    } catch (e) {}
  });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1500);
  lcpEntries = await page.evaluate(() => window.__lcpEntries || []);
  longTasks.push(...(await page.evaluate(() => window.__longTasks || [])));
  const lcpEl = await page.evaluate(() => {
    try {
      const entries = performance.getEntriesByType('largest-contentful-paint');
      const e = entries[entries.length - 1];
      if (!e || !e.element) return null;
      const el = e.element;
      return { tag: el.tagName, id: el.id, cls: (el.className || '').toString().slice(0, 60), text: (el.textContent || '').trim().slice(0, 60) };
    } catch (err) { return null; }
  });

  console.log(JSON.stringify({
    lcpEntries,
    lcpFinalElement: lcpEl,
    longTasks: longTasks.slice(0, 12),
    warnings: warnings.slice(0, 8)
  }, null, 1));

  await browser.close();
})();
