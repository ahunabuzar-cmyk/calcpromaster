const { chromium } = require('playwright');
const B = 'https://calcpromaster.netlify.app';
const PAGES = ['/', '/finance/mortgage/', '/health/bmi/', '/guides/debt-payoff.html', '/compare'];
(async () => {
  const b = await chromium.launch();
  for (const path of PAGES) {
    const p = await b.newPage();
    await p.goto(B + path, { waitUntil: 'networkidle', timeout: 45000 });
    await p.waitForTimeout(800);
    const bad = await p.evaluate(() => {
      return [...document.querySelectorAll('input:not([type=hidden]), select, textarea')].filter(el => {
        const id = el.id && document.querySelector('label[for="' + el.id + '"]');
        return !id && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !el.closest('label');
      }).map(el => ({ tag: el.tagName, type: el.type || '', ph: el.placeholder || '', name: el.name || '', id: el.id || '' }));
    });
    if (bad.length) console.log(path, JSON.stringify(bad));
    await p.close();
  }
  // overflow element on guides page
  const p = await b.newPage();
  await p.setViewportSize({ width: 320, height: 700 });
  await p.goto(B + '/guides/debt-payoff.html', { waitUntil: 'networkidle', timeout: 45000 });
  const off = await p.evaluate(() => {
    const w = document.documentElement.clientWidth;
    return [...document.querySelectorAll('*')].filter(el => el.getBoundingClientRect().right > w + 2 && el.getBoundingClientRect().width > 10).slice(0, 3).map(el => el.tagName + '.' + (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').toString().split(' ')[0]);
  });
  console.log('guides overflow els:', JSON.stringify(off));
  await b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
