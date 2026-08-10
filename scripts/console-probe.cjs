// Temporary probe: capture all console errors + failed/4xx/5xx responses
// for a given URL, from the LOCAL network. Run: node scripts/console-probe.cjs
const { chromium } = require('playwright');
const TARGET = process.argv[2] || 'https://calcpromaster.netlify.app/finance/loan-emi?amount=100000&rate=8.5&years=5';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const consoleErrs = [];
  const badResponses = [];
  p.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text()); });
  p.on('response', (r) => {
    if (r.status() >= 400) badResponses.push(r.status() + ' ' + r.url());
  });
  p.on('requestfailed', (r) => {
    const f = r.failure();
    badResponses.push('FAILED ' + r.url() + ' → ' + (f && f.errorText));
  });
  await p.goto(TARGET, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(8000);
  console.log('URL:', TARGET);
  console.log('CONSOLE ERRORS:', JSON.stringify(consoleErrs, null, 1));
  console.log('BAD/FAILED RESPONSES:', JSON.stringify(badResponses, null, 1));
  await b.close();
})();
