const { chromium } = require('playwright');
const B = 'https://calcpromaster.netlify.app';
const PAGES = ['/', '/finance/mortgage/', '/finance/loan-emi/10-years-200000/', '/health/bmi/', '/math/percentage/', '/guides/debt-payoff.html'];
(async () => {
  const b = await chromium.launch();
  const summary = { noAlt: 0, noLabel: 0, h1count: [], noLang: 0, noViewport: 0, emptyBtn: 0, overflow320: [], headings: {} };
  for (const path of PAGES) {
    const p = await b.newPage();
    await p.goto(B + path, { waitUntil: 'networkidle', timeout: 45000 });
    await p.waitForTimeout(1200);
    const r = await p.evaluate(() => {
      const out = {};
      out.noAlt = [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length;
      const inputs = [...document.querySelectorAll('input:not([type=hidden]), select, textarea')];
      out.noLabel = inputs.filter(el => {
        const id = el.id && document.querySelector('label[for="' + el.id + '"]');
        return !id && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !el.closest('label');
      }).length;
      out.h1 = document.querySelectorAll('h1').length;
      out.lang = !!document.documentElement.getAttribute('lang');
      out.viewport = !!document.querySelector('meta[name=viewport]');
      out.emptyBtn = [...document.querySelectorAll('button, a[role=button]')].filter(b => !(b.textContent || '').trim() && !b.getAttribute('aria-label') && !b.querySelector('img[alt], svg[aria-label]')).length;
      out.h2 = document.querySelectorAll('h2').length;
      return out;
    });
    await p.setViewportSize({ width: 320, height: 700 });
    await p.waitForTimeout(400);
    const ov320 = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    summary.noAlt += r.noAlt; summary.noLabel += r.noLabel; summary.emptyBtn += r.emptyBtn;
    summary.h1count.push(path + ':h1=' + r.h1 + ',h2=' + r.h2);
    if (!r.lang) summary.noLang++;
    if (!r.viewport) summary.noViewport++;
    if (ov320 > 2) summary.overflow320.push(path + ':' + ov320 + 'px');
    await p.close();
  }
  console.log(JSON.stringify(summary, null, 1));
  await b.close();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
