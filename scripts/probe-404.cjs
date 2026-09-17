const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on('response', r => { if (r.status() >= 400) console.log('FAIL', r.status(), r.url()); });
  p.on('requestfailed', r => console.log('REQFAIL', r.url()));
  await p.goto('http://localhost:3100/business/markup-margin', { waitUntil: 'networkidle', timeout: 30000 }).catch(e=>console.log('goto err', e.message));
  await p.waitForTimeout(1500);
  await b.close();
})();
