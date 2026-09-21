// Precise LCP element + CLS sources under mobile throttling (Playwright + CDP)
const { spawn } = require('child_process');
const { chromium } = require('playwright');

(async () => {
  const server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: process.env.CWV_PORT || '3212', ROOT: process.env.CWV_ROOT || 'deploy' }, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 1200));
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({
      viewport: { width: 412, height: 823 },
      userAgent: 'Mozilla/5.0 (Linux; Android 11; moto g power) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
    });
    const page = await ctx.newPage();
    // Throttle like Lighthouse mobile: 4x CPU, slow 4G
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8,
    });
    await page.addInitScript(() => {
      window.__metrics = { lcp: null, shifts: [], fcp: null };
      new PerformanceObserver((l) => {
        const e = l.getEntries().pop();
        window.__metrics.lcp = { t: Math.round(e.startTime), tag: e.element ? e.element.tagName + '.' + (e.element.className || '') : '?', text: e.element ? (e.element.textContent || '').trim().slice(0, 60) : '' };
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          if (!e.hadRecentInput) {
            const src = e.sources && e.sources[0] && e.sources[0].node;
            window.__metrics.shifts.push({
              v: Math.round(e.value * 1000) / 1000,
              node: src ? src.tagName + '.' + String(src.className || '').slice(0, 40) : '?',
              text: src ? (src.textContent || '').trim().slice(0, 40) : '',
            });
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__metrics.fcp = Math.round(e.startTime);
      }).observe({ type: 'paint', buffered: true });
    });
    await page.goto('http://localhost:3212/', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(9000); // let lazy/late stuff settle
    const m = await page.evaluate(() => window.__metrics);
    console.log('FCP:', m.fcp, 'ms');
    console.log('LCP:', JSON.stringify(m.lcp));
    const total = m.shifts.reduce((s, x) => s + x.v, 0);
    console.log('CLS total (approx):', Math.round(total * 1000) / 1000);
    const seen = new Map();
    for (const s of m.shifts) {
      const k = s.node + '|' + s.text;
      seen.set(k, (seen.get(k) || 0) + s.v);
    }
    [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).forEach(([k, v]) => {
      const [node, text] = k.split('|');
      console.log('  shift', Math.round(v * 1000) / 1000, node, JSON.stringify(text.slice(0, 40)));
    });
  } finally {
    await browser.close();
    server.kill();
  }
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
