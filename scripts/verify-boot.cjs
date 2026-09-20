const { chromium } = require('playwright');
(async () => {
  const B = 'http://localhost:3100';
  const browser = await chromium.launch();
  const errors = [];
  const page = await browser.newPage();
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  // 1. Direct tool visit
  await page.goto(B + '/finance/loan-emi', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const intro = await page.locator('.tool-intro').first().textContent().catch(() => '');
  const explain = await page.locator('#explain-area .explain-card').count();
  const form = await page.locator('form input, #calc-form input, input[type="number"]').count();
  console.log('loan-emi: intro=' + (intro || '').slice(0, 60) + ' | explainCards=' + explain + ' | inputs=' + form);

  // 2. SPA nav to another finance tool
  await page.goto(B + '/finance/amortization', { waitUntil: 'load' });
  await page.waitForTimeout(800);
  const intro2 = await page.locator('.tool-intro').first().textContent().catch(() => '');
  console.log('amortization: intro=' + (intro2 || '').slice(0, 60));

  // 3. Homepage spotlight renders
  await page.goto(B + '/', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const spotlight = await page.locator('#calculator-of-day, .cod-card, [id*="day"]').count();
  console.log('home: spotlightEls=' + spotlight);

  // 4. No runtime premium/intros boot script tags on load
  const scripts = await page.evaluate(() => Array.from(document.querySelectorAll('script[src]')).map(s => s.getAttribute('src')));
  const premiumBoot = scripts.filter(s => /seo-premium/.test(s));
  console.log('premium script tags at boot: ' + premiumBoot.length);
  console.log('JS errors: ' + (errors.length ? errors.join(' || ') : 'none'));
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
