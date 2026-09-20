const lighthouse = require('lighthouse').default;
const chromeLauncher = require('chrome-launcher');
(async () => {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'] });
  const opts = { port: chrome.port, onlyCategories: ['seo'], output: 'json' };
  const r = await lighthouse('http://localhost:3100/math/percentage-calculator', opts);
  const a = r.lhr.audits;
  for (const [k, v] of Object.entries(a)) {
    if (v.score !== null && v.score < 1) console.log('FAIL:', k, '-', v.title, '-', (v.displayValue || ''));
  }
  // also failing perf opportunities for perf fix plan
  await chrome.kill();
})().catch(e => { console.error(e.message); process.exit(1); });
