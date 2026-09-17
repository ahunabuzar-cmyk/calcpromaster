// Lighthouse audit on representative pages (local deploy server)
const fs = require('fs');
const path = require('path');
const lighthouse = require('lighthouse').default;
const chromeLauncher = require('chrome-launcher');

const BASE = 'http://localhost:3100';
const PAGES = [
  ['home', '/'],
  ['finance/loan-emi', '/finance/loan-emi'],
  ['math/percentage-calculator', '/math/percentage-calculator'],
  ['health/bmi-calculator', '/health/bmi-calculator'],
  ['science/kinetic-energy', '/science/kinetic-energy'],
  ['engineering/beam-deflection', '/engineering/beam-deflection'],
  ['construction/concrete-calculator', '/construction/concrete-calculator'],
  ['conversion/temperature-converter', '/conversion/temperature-converter'],
  ['fitness/calorie-burned', '/fitness/calorie-burned'],
  ['business/profit-margin', '/business/profit-margin'],
];

const CATS = ['performance', 'accessibility', 'best-practices', 'seo'];

(async () => {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  const results = [];
  try {
    for (const [label, route] of PAGES) {
      const url = BASE + route;
      const runnerResult = await lighthouse(url, {
        port: chrome.port,
        output: 'json',
        onlyCategories: CATS,
        logLevel: 'error',
        formFactor: 'desktop',
        screenEmulation: { disabled: true },
      });
      const lhr = runnerResult.lhr;
      const cats = {};
      for (const c of CATS) cats[c] = Math.round(lhr.categories[c].score * 100);
      const perf = lhr.audits;
      results.push({
        label,
        cats,
        metrics: {
          LCP: perf['largest-contentful-paint'] && perf['largest-contentful-paint'].displayValue,
          CLS: perf['cumulative-layout-shift'] && perf['cumulative-layout-shift'].displayValue,
          TBT: perf['total-blocking-time'] && perf['total-blocking-time'].displayValue,
          FCP: perf['first-contentful-paint'] && perf['first-contentful-paint'].displayValue,
        },
      });
      console.log(
        `${label.padEnd(28)} P:${cats.performance} A:${cats.accessibility} BP:${cats['best-practices']} SEO:${cats.seo}  LCP:${results.at(-1).metrics.LCP} CLS:${results.at(-1).metrics.CLS} TBT:${results.at(-1).metrics.TBT}`
      );
    }
  } finally {
    try { await chrome.kill(); } catch (e) { /* Windows temp cleanup quirk */ }
  }
  fs.writeFileSync(path.join(__dirname, '..', 'test-results', 'lighthouse-summary.json'), JSON.stringify(results, null, 2));
  console.log('\nSaved test-results/lighthouse-summary.json');
})().catch((e) => { console.error(e); process.exit(1); });