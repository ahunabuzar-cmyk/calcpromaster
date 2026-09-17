// Targeted browser probe for the 15 new/changed tools
const { chromium } = require('@playwright/test');
const routes = require('../tool-routes.json');
const targets = ['finance/sip-step-up','finance/fixed-deposit-vs-recurring','finance/insurance-surrender-value','finance/espp','finance/roth-vs-traditional','health/health-insurance-copay','education/percentile-rank','regional/gst-calculator','finance/t-bill','health/ovulation-calculator','health/cholesterol-ratio','health/nap-planner','health/maffetone-hr','regional/gratuity-calculator','regional/stamp-duty-india'];
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  let pass = 0, fail = 0;
  const consoleErrors = [];
  for (const route of targets) {
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(route + ': ' + m.text().slice(0, 120)); });
    page.on('pageerror', e => consoleErrors.push(route + ' PAGEERROR: ' + String(e).slice(0, 120)));
    try {
      await page.goto('http://localhost:3100/' + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('#calc-form', { timeout: 15000 });
      // click Calculate if present, or wait for result area
      const calcBtn = page.locator('#calc-btn, button[data-calc], .calc-btn, #calculate-btn');
      if (await calcBtn.count()) { await calcBtn.first().click(); }
      await page.waitForTimeout(600);
      const hasResult = (await page.locator('#result, .result-value, .result-area, #calc-result').count()) > 0
        || (await page.locator('#result-area').count()) > 0;
      const body = await page.locator('body').innerText();
      const hasNumbers = /[\d,]+\.?\d*/.test(body.replace(/\d{4,}/g, ''));
      const ok = hasNumbers && body.length > 300;
      if (ok) pass++; else { fail++; console.log('FAIL', route, '| result area:', hasResult); }
    } catch (e) {
      fail++; console.log('FAIL', route, '|', String(e).slice(0, 100));
    }
    await page.close();
  }
  await browser.close();
  console.log(`\n${pass}/${targets.length} passed, ${fail} failed`);
  console.log('console errors:', consoleErrors.length);
  consoleErrors.slice(0, 10).forEach(e => console.log('  ', e));
})().catch(e => { console.error('FATAL', e); process.exit(1); });
