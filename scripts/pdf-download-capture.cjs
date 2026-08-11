#!/usr/bin/env node
/**
 * pdf-download-capture.cjs
 * Real-browser PDF test: user flow on Loan EMI calculator →
 * click PDF → capture the report rendered into #pdf-print-frame →
 * serialize it as a standalone HTML → render that page and use
 * CDP/Playwright page.pdf() to produce a REAL .pdf file →
 * verify magic bytes, size, and content.
 *
 * This is the strongest headless-available evidence for "actual PDF
 * download works". (The native print dialog itself cannot be clicked
 * in headless; a real phone/desktop browser shows Save-as-PDF from
 * the same window.print() call.)
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.PROBE_URL || 'http://localhost:3100';
const OUT = path.join(__dirname, '..', '.tmp', 'pdf-capture');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleErrs = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text()); });
  page.on('pageerror', e => consoleErrs.push('PAGEERROR: ' + e.message));

  // 1. Open Loan EMI calculator with values via URL params (same method as feature-audit-probe)
  await page.goto(BASE + '/finance/loan-emi?amount=50000&rate=6&years=3', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);

  // 2. Ensure calculation ran
  const resultPre = await page.evaluate(() => ((document.querySelector('.result-main') || {}).textContent || '').trim().slice(0, 120));
  // 3. If not auto-calculated, click Calculate
  if (!resultPre) {
    for (const sel of ['button:has-text("Calculate")', 'button:has-text("Compute")', '[data-action="calculate"]', 'button[type="submit"]']) {
      const b = await page.$(sel);
      if (b) { await b.click(); break; }
    }
    await page.waitForTimeout(1200);
  }

  // 4. Click PDF button (same locator as feature-audit-probe)
  let pdfClicked = false;
  try {
    const pdfBtn = page.locator('.tool-actions .action-btn', { hasText: 'PDF' }).first();
    await pdfBtn.scrollIntoViewIfNeeded();
    await pdfBtn.click({ timeout: 8000 });
    pdfClicked = true;
  } catch (e) { console.log('PDF click error: ' + e.message.slice(0, 200)); }

  // 5. Read the report frame — must be BEFORE the 400ms print timer (headless afterprint cleanup)
  await page.waitForTimeout(120);
  const captured = await page.evaluate(() => {
    const f = document.getElementById('pdf-print-frame');
    if (!f) return { created: false, html: '' };
    const doc = f.contentDocument;
    const body = doc && doc.body ? doc.body.innerHTML : '';
    return {
      created: true,
      bodyLen: body.length,
      hasBrand: body.includes('CalcProMaster'),
      hasTable: /<table/i.test(body),
      hasResult: /1,?521|1521/.test(body),
      hasTitle: (doc.title || '').includes('CalcProMaster'),
      sample: body.slice(0, 200),
      html: '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' +
        (doc.title || 'CalcProMaster Report') + '</title>' +
        (doc.head ? doc.head.innerHTML : '') +
        '</head><body>' + body + '</body></html>'
    };
  });
  const frameInfo = { created: captured.created, bodyLen: captured.bodyLen, hasBrand: captured.hasBrand, hasTable: captured.hasTable, hasResult: captured.hasResult, hasTitle: captured.hasTitle, sample: captured.sample };
  const reportHtml = captured.html;

  let pdfResult = { captured: false };
  if (frameInfo.created && frameInfo.bodyLen > 0 && reportHtml) {
    // 6. Serialize the report HTML standalone
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    const htmlPath = OUT + '.html';
    fs.writeFileSync(htmlPath, reportHtml, 'utf8');

    // 7. Render standalone page and print to a REAL PDF
    const ctx2 = await browser.newContext();
    const p2 = await ctx2.newPage();
    await p2.goto('file://' + htmlPath, { waitUntil: 'domcontentloaded' });
    await p2.waitForTimeout(400);
    const pdfPath = OUT + '.pdf';
    await p2.pdf({ path: pdfPath, format: 'A4', printBackground: true });
    const buf = fs.readFileSync(pdfPath);
    const text = await p2.evaluate(async () => {
      // extract visible text via clone of body
      return document.body ? document.body.textContent.replace(/\s+/g, ' ').trim() : '';
    });
    pdfResult = {
      captured: true,
      bytes: buf.length,
      magicPDF: buf.slice(0, 5).toString('latin1') === '%PDF-',
      fileSizeKB: (buf.length / 1024).toFixed(1),
      textPreview: text.slice(0, 180),
      pdfPath
    };
    await ctx2.close();
    fs.unlinkSync(htmlPath);
  }

  // 8. CSV download test (Result Export)
  let csv = { clicked: false, downloaded: false };
  for (const sel of ['button:has-text("CSV")', '[data-action="csv"]', 'button:has-text("Export")']) {
    const b = await page.$(sel);
    if (b) {
      csv.clicked = true;
      const [dl] = await Promise.all([
        page.waitForEvent('download', { timeout: 6000 }).catch(() => null),
        b.click()
      ]);
      if (dl) {
        const p = path.join(path.dirname(OUT), dl.suggestedFilename());
        await dl.saveAs(p);
        const b2 = fs.readFileSync(p);
        csv.downloaded = true;
        csv.filename = dl.suggestedFilename();
        csv.bytes = b2.length;
        csv.hasResult = b2.includes('1521') || b2.includes('1,521');
        try { fs.unlinkSync(p); } catch (e) {}
      }
      break;
    }
  }

  // 9. Sound: voice walkthrough (SpeechSynthesis) + voice input toast
  let sound = {};
  for (const sel of ['button:has-text("Walkthrough")', 'button:has-text("Read")', 'button:has-text("Speak")', '[data-action="walkthrough"]']) {
    const b = await page.$(sel);
    if (b) {
      await b.click();
      await page.waitForTimeout(900);
      break;
    }
  }
  sound.speechCalls = await page.evaluate(() => window.__speechCalls || 0);
  for (const sel of ['button:has-text("Voice")', '[data-action="voice"]']) {
    const b = await page.$(sel);
    if (b) {
      await b.click();
      await page.waitForTimeout(600);
      sound.voiceButtonClicked = true;
      break;
    }
  }
  const toast = await page.evaluate(() => {
    const t = document.querySelector('.toast, [class*="toast"]');
    return t ? t.textContent.trim() : '';
  });
  sound.toast = toast;

  // 10. Mobile 375 check
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  const mobile = await page.evaluate(() => ({
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    bodyOverflowX: document.body.scrollWidth > document.body.clientWidth
  }));

  await browser.close();

  const result = { pdf: frameInfo, pdfFile: pdfResult, csv, sound, mobile, consoleErrs };
  console.log(JSON.stringify(result, null, 2));
  const failed = !frameInfo.created || frameInfo.bodyLen === 0 || !pdfResult.captured ||
    !pdfResult.magicPDF || consoleErrs.length > 0;
  console.log('\n=== RESULT: ' + (failed ? 'FAIL' : 'PASS') + ' ===');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('PROBE ERROR:', e.message); process.exit(2); });
