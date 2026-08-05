// Generate og-image.png (1200x630 social share card) from og-image.html
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const htmlPath = path.join(__dirname, 'og-image.html').replace(/\\/g, '/');
  const outPath = path.join(__dirname, 'og-image.png');
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome' }); // system Chrome (already installed)
  } catch (e) {
    browser = await chromium.launch(); // fallback: playwright-managed chromium
  }
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto('file:///' + htmlPath);
  await page.screenshot({ path: outPath, type: 'png' });
  await browser.close();
  console.log('og-image.png generated ->', outPath);
})().catch((e) => { console.error('FAIL:', e.message.split('\n')[0]); process.exit(1); });
