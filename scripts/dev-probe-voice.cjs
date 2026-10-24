// Temporary probe: does the per-input mic wiring actually drive recognition?
const { spawn } = require('child_process');
const { chromium } = require('playwright');

(async () => {
  const server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: '3198', ROOT: 'deploy' }, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 2500));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.text().includes('[voiceStatus]')) console.log('CONSOLE', m.text()); });

  await page.addInitScript(() => {
    class MockRec {
      constructor() { window.__rec = this; this.started = 0; }
      start() { this.started++; if (this.onstart) this.onstart(); }
      stop() { if (this.onend) this.onend(); }
    }
    Object.defineProperty(window, 'SpeechRecognition', { value: MockRec, configurable: true });
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: MockRec, configurable: true });
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.resolve({ getTracks: () => [{ stop() {} }] }) }, configurable: true });
    Object.defineProperty(navigator, 'permissions', { value: undefined, configurable: true });
  });

  await page.goto('http://127.0.0.1:3198/finance/loan-emi', { waitUntil: 'load' });
  await page.waitForSelector('form#calc-form');
  await page.waitForTimeout(1200);

  const mic = page.locator('.voice-input-btn:not(.voice-dictate-btn)').first();
  console.log('mics:', await page.locator('.voice-input-btn:not(.voice-dictate-btn)').count());
  console.log('dictate btn:', await page.locator('#voice-dictate-btn').count());
  console.log('lang picker:', await page.locator('#voice-lang').count());

  await mic.click();
  await page.waitForTimeout(400);
  const afterClick = await page.evaluate(() => ({
    started: window.__rec ? window.__rec.started : null,
    lang: window.__rec ? window.__rec.lang : null,
  }));
  console.log('after click:', JSON.stringify(afterClick));

  await page.evaluate(() => {
    window.__rec.onresult({ results: [[{ transcript: 'five lakh rupees' }, { transcript: '5 lakh' }]] });
  });
  await page.waitForTimeout(300);
  const value = await page.evaluate(() => {
    const el = document.querySelector('form#calc-form input[type="number"]');
    return el ? el.value : null;
  });
  console.log('first input value after result:', JSON.stringify(value));
  const statusAfterOk = await page.evaluate(() => {
    const s = document.getElementById('voice-status');
    return s ? { hidden: s.hidden, cls: s.className, text: s.textContent } : null;
  });
  console.log('status after ok:', JSON.stringify(statusAfterOk));

  // Now the failure path real users hit: the hosted speech service is unreachable.
  await page.evaluate(() => {
    window.__VS_DEBUG = true;
    window.__toastCapture = [];
    const orig = App.showToast.bind(App);
    App.showToast = (m) => { window.__toastCapture.push(String(m)); orig(m); };
    try { window.__rec.onerror({ error: 'network' }); } catch (e) { window.__toastCapture.push('THREW ' + e.message); }
  });
  await page.waitForTimeout(200);
  const statusAfterErr = await page.evaluate(() => {
    const s = document.getElementById('voice-status');
    return s ? { hidden: s.hidden, cls: s.className, text: s.textContent, buttons: Array.from(s.querySelectorAll('button')).map((b) => b.textContent) } : null;
  });
  console.log('status after network error:', JSON.stringify(statusAfterErr));
  console.log('toasts:', JSON.stringify(await page.evaluate(() => window.__toastCapture)));
  console.log('status nodes:', await page.evaluate(() => document.querySelectorAll('#voice-status').length));
  console.log('errors:', errors.slice(0, 5));
  await browser.close();
  server.kill();
})().catch((e) => { console.error(e); process.exit(1); });
