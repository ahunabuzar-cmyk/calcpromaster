// ============================================================
// FEATURE AUDIT PROBE — real-browser verification of PDF / CSV /
// Voice (mic input) / Voice walkthrough (speech output) buttons
// against the LIVE site (or local artifact via PROBE_URL).
// Evidence-only: never asserts, always dumps findings as JSON.
// ============================================================
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.PROBE_URL || 'https://calcpromaster.netlify.app';
const results = { base: BASE };

(async () => {
  const browser = await chromium.launch();

  // ================= CONTEXT 1: DESKTOP =================
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [], pageErrors = [], failedReqs = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 220)); });
  page.on('pageerror', e => pageErrors.push(String(e).slice(0, 300)));
  page.on('requestfailed', r => failedReqs.push((r.failure() || {}).errorText + ' :: ' + r.url().slice(0, 110)));

  await page.addInitScript(() => {
    window.__probe = { pdf: null, printCalled: false, speech: [], sr: null };
    const origOpen = window.open;
    window.open = function (url, name) {
      let html = '';
      const fakeDoc = {
        write: (s) => { html += s; window.__probe.pdf.html += s; },
        close: () => {}, open: () => {}, title: '',
        createElement: (t) => { try { return document.createElement(t); } catch (e) { return null; } },
        head: null, body: null, getElementById: () => null, querySelector: () => null,
      };
      const fakeWin = {
        document: fakeDoc, focus: () => {}, close: () => {}, alert: () => {},
        print: () => { window.__probe.printCalled = true; },
        location: { href: '' }, setTimeout: () => {}, addEventListener: () => {}, removeEventListener: () => {},
      };
      window.__probe.pdf = { url: url || '', name: name || '', html: '' };
      return fakeWin;
    };
    if (window.speechSynthesis) {
      const origSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
      window.speechSynthesis.speak = function (u) {
        window.__probe.speech.push({ text: String((u && u.text) || '').slice(0, 140), lang: (u && u.lang) || '' });
        return origSpeak(u);
      };
    }
    window.__probe.sr = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    window.__probe.tts = !!window.speechSynthesis;
  });

  // ---------- loan-emi (finance) ----------
  await page.goto(BASE + '/finance/loan-emi?amount=50000&rate=6&years=3', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  results.loanEmi = {
    title: await page.title(),
    result: await page.evaluate(() => ((document.querySelector('.result-main') || {}).textContent || '(none)').trim().slice(0, 120)),
    actionButtons: await page.evaluate(() =>
      Array.from(document.querySelectorAll('.tool-actions .action-btn')).map(b => ({
        text: b.textContent.trim().slice(0, 18), visible: !!(b.offsetParent),
        w: Math.round(b.getBoundingClientRect().width),
      }))),
    zrVoiceArea: await page.evaluate(() => {
      const el = document.getElementById('zr-voice-area');
      return el ? el.innerHTML.replace(/\s+/g, ' ').slice(0, 1600) : '(no #zr-voice-area)';
    }),
    zrFeatureBar: await page.evaluate(() => {
      const el = document.getElementById('zr-feature-bar');
      return el ? el.textContent.replace(/\s+/g, ' ').trim().slice(0, 200) : '(none)';
    }),
  };

  // ---------- PDF: REAL click → read the hidden print iframe ----------
  try {
    const pdfBtn = page.locator('.tool-actions .action-btn', { hasText: 'PDF' }).first();
    await pdfBtn.scrollIntoViewIfNeeded();
    await pdfBtn.click({ timeout: 8000 });
    await page.waitForTimeout(900);
  } catch (e) { results.pdfClickError = String(e).slice(0, 250); }
  results.pdf = await page.evaluate(() => {
    const f = document.getElementById('pdf-print-frame');
    if (!f) return { frame: 'NOT CREATED' };
    const d = f.contentDocument || f.contentWindow.document;
    return {
      frame: 'created',
      title: d.title,
      bodyLen: d.body ? d.body.textContent.length : 0,
      bodyPreview: d.body ? d.body.textContent.replace(/\s+/g, ' ').slice(0, 260) : '',
      hasTable: !!d.querySelector('table'),
      hasBrand: !!(d.body && d.body.textContent.indexOf('CalcProMaster') >= 0),
      printNote: 'contentWindow.print() fires inside the 400ms timer (headless cannot intercept the native dialog)',
    };
  });

  // ---------- CSV: REAL click + download ----------
  try {
    const csvBtn = page.locator('.tool-actions .action-btn', { hasText: 'CSV' }).first();
    await csvBtn.scrollIntoViewIfNeeded();
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 8000 }),
      csvBtn.click(),
    ]);
    const dlPath = path.join(__dirname, '..', 'tmp-probe-download.csv');
    await download.saveAs(dlPath);
    const content = fs.readFileSync(dlPath, 'utf8');
    results.csv = {
      suggestedFilename: download.suggestedFilename(),
      sizeBytes: content.length,
      content: content.slice(0, 700),
    };
    fs.unlinkSync(dlPath);
  } catch (e) { results.csv = { error: String(e).slice(0, 300) }; }

  // ---------- percentage (small-input tool → 🎤 Voice button expected) ----------
  await page.goto(BASE + '/math/percentage?value=150&percent=20', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  results.percentage = {
    actionButtons: await page.evaluate(() =>
      Array.from(document.querySelectorAll('.tool-actions .action-btn')).map(b => b.textContent.trim().slice(0, 16))),
    ttsSupport: await page.evaluate(() => window.__probe.tts),
    srSupport: await page.evaluate(() => window.__probe.sr),
  };
  const voiceBtn = page.locator('.tool-actions .action-btn', { hasText: 'Voice' }).first();
  if (await voiceBtn.count()) {
    await voiceBtn.scrollIntoViewIfNeeded().catch(() => {});
    await voiceBtn.click({ timeout: 5000 }).catch(e => (results.voiceClickError = String(e).slice(0, 200)));
    await page.waitForTimeout(700);
    results.voiceToast = await page.evaluate(() => ((document.getElementById('toast') || {}).textContent || '').trim());
  } else {
    results.voiceBtn = 'NOT FOUND';
  }

  // ---------- Sound OUTPUT: ZR voice walkthrough on loan-emi ----------
  await page.goto(BASE + '/finance/loan-emi?amount=50000&rate=6&years=3', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  results.voiceAreaButtons = await page.evaluate(() => {
    const area = document.getElementById('zr-voice-area');
    if (!area) return [];
    return Array.from(area.querySelectorAll('button')).map(b => b.textContent.trim().slice(0, 40));
  });
  let clickedSound = false, soundClickErr = null;
  for (const label of ['▶ Play', 'Play', 'Speak', '🔊', '🔊 Play', 'Start']) {
    try {
      const b = page.locator('#zr-voice-area button', { hasText: label }).first();
      if (await b.count()) {
        await b.scrollIntoViewIfNeeded().catch(() => {});
        await b.click({ timeout: 5000 });
        clickedSound = true;
        break;
      }
    } catch (e) { soundClickErr = String(e).slice(0, 200); }
  }
  await page.waitForTimeout(1200);
  results.sound = {
    clicked: clickedSound,
    clickError: soundClickErr,
    speechCalls: await page.evaluate(() => window.__probe.speech),
    printCalled: await page.evaluate(() => window.__probe.printCalled),
  };

  results.consoleErrors = consoleErrors.slice(0, 25);
  results.pageErrors = pageErrors.slice(0, 10);
  results.failedRequests = failedReqs.filter(r => !/google|googletag|doubleclick|adsbygoogle|frankfurter|er-api|gstatic/.test(r)).slice(0, 12);
  await ctx.close();

  // ================= CONTEXT 2: MOBILE 375 =================
  const mctx = await browser.newContext({ viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true, acceptDownloads: true });
  const mp = await mctx.newPage();
  const mErr = [];
  mp.on('console', m => { if (m.type() === 'error') mErr.push(m.text().slice(0, 150)); });
  await mp.addInitScript(() => {
    window.__probe = { pdf: null, printCalled: false };
    window.open = function (url, name) {
      let html = '';
      const fakeDoc = { write: (s) => { html += s; window.__probe.pdf.html += s; }, close: () => {}, title: '' };
      window.__probe.pdf = { url: url || '', name: name || '', html: '' };
      return { document: fakeDoc, focus: () => {}, print: () => { window.__probe.printCalled = true; }, close: () => {} };
    };
  });
  await mp.goto(BASE + '/finance/loan-emi?amount=50000&rate=6&years=3', { waitUntil: 'domcontentloaded' });
  await mp.waitForTimeout(2600);
  results.mobile375 = {
    overflow: await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
    actionButtons: await mp.evaluate(() =>
      Array.from(document.querySelectorAll('.tool-actions .action-btn')).map(b => ({
        text: b.textContent.trim().slice(0, 14), visible: !!(b.offsetParent),
        w: Math.round(b.getBoundingClientRect().width),
      }))),
    copyBtnVisible: await mp.evaluate(() => { const b = document.getElementById('copy-result-btn'); return b ? !!(b.offsetParent) : false; }),
    consoleErrors: mErr.slice(0, 10),
  };
  // mobile PDF click → hidden print iframe
  try {
    const pb = mp.locator('.tool-actions .action-btn', { hasText: 'PDF' }).first();
    await pb.scrollIntoViewIfNeeded();
    await pb.click({ timeout: 8000 });
    await mp.waitForTimeout(900);
    results.mobilePdf = await mp.evaluate(() => {
      const f = document.getElementById('pdf-print-frame');
      if (!f) return { frame: 'NOT CREATED' };
      const d = f.contentDocument || f.contentWindow.document;
      return { frame: 'created', bodyLen: d.body ? d.body.textContent.length : 0, hasResult: !!(d.body && d.body.textContent.indexOf('1,521') >= 0) };
    });
  } catch (e) { results.mobilePdf = { clickError: String(e).slice(0, 200) }; }
  await mctx.close();

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})().catch(e => { console.error('PROBE FAILED: ' + e); process.exit(1); });
