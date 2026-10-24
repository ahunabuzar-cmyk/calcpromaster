// Temporary probe: why does the smart row not render on the built site?
const { spawn } = require('child_process');
const { chromium } = require('playwright');

(async () => {
  const server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: '3199', ROOT: 'deploy' }, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await page.goto('http://127.0.0.1:3199/', { waitUntil: 'load' });
  await page.fill('#home-search', 'emi on 5 lakh for 20 years at 8.5%');
  await page.waitForTimeout(1500);
  const state = await page.evaluate(() => {
    const box = document.getElementById('home-search');
    const res = document.getElementById('homeSearchResults');
    return {
      hasSmartSearch: !!window.SmartSearch,
      parse: window.SmartSearch ? window.SmartSearch.parse(box.value) : null,
      appHomeSearch: typeof (window.App && window.App.homeSearch),
      html: res ? res.innerHTML.slice(0, 400) : null,
      items: res ? res.querySelectorAll('.search-item').length : null,
      smart: res ? res.querySelectorAll('.search-smart').length : null,
      display: res ? res.style.display : null,
    };
  });
  console.log(JSON.stringify(state, null, 2));
  console.log('LOGS:', logs.slice(0, 15).join('\n'));
  await browser.close();
  server.kill();
})().catch((e) => { console.error(e); process.exit(1); });
