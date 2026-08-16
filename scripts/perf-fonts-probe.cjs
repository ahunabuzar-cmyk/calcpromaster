// Read-only probe: self-hosted fonts applied? LCP/CLS entries + font request timing.
const { chromium } = require('playwright-core');

(async () => {
  const url = process.env.PROBE_URL || 'http://localhost:3100/';
  const chromePath = process.env.CHROME_PATH ||
    'C:/Users/ok/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });

  await page.addInitScript(() => {
    window.__probe = { lcp: [], cls: 0, longTasks: [] };
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          window.__probe.lcp.push({ t: Math.round(e.startTime), size: Math.round(e.size), id: e.element ? (e.element.id || e.element.className || e.element.tagName) : '?' });
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          window.__probe.cls += e.value || 0;
          window.__probe.clsEvents = window.__probe.clsEvents || [];
          const s = (e.sources && e.sources[0]) ? { tag: e.sources[0].node ? e.sources[0].node.tagName : '?', id: e.sources[0].node ? (e.sources[0].node.id || (e.sources[0].node.className || '').toString().slice(0, 40)) : '?', prev: Math.round(e.sources[0].previousRect && e.sources[0].previousRect.top || 0), cur: Math.round(e.sources[0].currentRect && e.sources[0].currentRect.top || 0) } : null;
          window.__probe.clsEvents.push({ t: Math.round(e.startTime), v: +(e.value || 0).toFixed(4), src: s });
        }
      }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__probe.longTasks.push({ s: Math.round(e.startTime), d: Math.round(e.duration) });
      }).observe({ type: 'longtask', buffered: true });
    } catch (e) {}
  });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1200);

  const out = await page.evaluate(() => {
    const fonts = performance.getEntriesByType('resource').filter(r => /woff2|fonts\./i.test(r.name)).map(r => ({
      name: r.name.split('/').pop().slice(0, 40),
      start: Math.round(r.startTime),
      dur: Math.round(r.duration)
    }));
    return {
      probe: window.__probe,
      fonts,
      sgReady: document.fonts.check('700 16px "Space Grotesk"'),
      interReady: document.fonts.check('400 16px "Inter"'),
      fontsStatus: document.fonts.status,
      h1Font: getComputedStyle(document.querySelector('h1') || document.body).fontFamily.slice(0, 60),
      h1Text: (document.querySelector('h1') || {}).textContent ? document.querySelector('h1').textContent.trim().slice(0, 50) : null
    };
  });

  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch(e => { console.error('PROBE-FAIL', e.message); process.exit(1); });
