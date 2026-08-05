// ====== FILE:// PROTOCOL TEST ======
// Opens deploy/index.html straight from disk (the exact scenario the user kept
// hitting: "requests going to file:///C:/js/...") and verifies the app now renders
// instead of getting stuck on Loading... because of the <base href="/"> drive-root
// resolution bug.
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const deployDir = path.join(process.cwd(), 'deploy', 'index.html');
  const url = 'file:///' + deployDir.split('\\').join('/').replace(/^\/+/, '');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const pageErrors = [];
  const failedRequests = [];

  page.on('pageerror', (e) => pageErrors.push('PAGEERROR: ' + e.message));
  page.on('requestfailed', (r) => {
    const f = r.failure();
    failedRequests.push(r.url() + ' -> ' + (f ? f.errorText : 'unknown'));
  });

  await page.goto(url, { waitUntil: 'load', timeout: 30000 }).catch((e) => {
    pageErrors.push('NAVIGATE: ' + e.message);
  });
  await page.waitForTimeout(5000);

  const state = await page.evaluate(() => {
    const mc = document.getElementById('mainContent');
    return {
      title: document.title,
      stuckLoading: !!(mc && mc.children.length <= 2 && /Loading/.test(mc.textContent || '')),
      mainChildren: mc ? mc.children.length : -1,
      recoveryCard: document.body.innerText.indexOf('Page took too long') !== -1,
      leakedText: document.body.innerText.indexOf('not rendered within 7s') !== -1,
      hero: !!document.querySelector('.hero'),
      categories: document.querySelectorAll('.category-card, .categories-grid > div').length,
      tools: document.querySelectorAll('.tool-card').length,
      footer: !!document.querySelector('footer')
    };
  });

  // Only report request failures for critical local assets (ignore remote CDN/fonts/apis)
  const critical = failedRequests.filter((u) =>
    /js\/(core|app|data|router|site-config)/.test(u) || /styles\.css/.test(u)
  );

  console.log(JSON.stringify({ url, state, criticalFailures: critical, totalFailures: failedRequests.length, pageErrors }, null, 2));
  await browser.close();
})();
