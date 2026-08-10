const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ acceptDownloads: true });
  // Stub window.print so the popup's print dialog never blocks the test.
  await ctx.addInitScript(() => {
    window.__printCalled = false;
    window.print = function () { window.__printCalled = true; };
  });
  const p = await ctx.newPage();

  async function getCSV(url) {
    await p.goto(url, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2200);
    const dl = await Promise.all([
      p.waitForEvent('download', { timeout: 8000 }).catch(() => null),
      p.evaluate(() => AdvancedFeatures.exportCurrentCSV()),
    ]);
    if (!dl[0]) return '';
    return fs.readFileSync(await dl[0].path(), 'utf8');
  }

  const csvA = await getCSV('http://localhost:3000/finance/loan-emi?amount=100000&rate=8.5&years=5');
  console.log('A csv result 2051:', csvA.includes('2051'));
  console.log('A csv amount 100000:', csvA.includes('100000'));
  console.log('A csv NOT stale B (50000):', !csvA.includes('50000'));

  const csvB = await getCSV('http://localhost:3000/finance/loan-emi?amount=50000&rate=6&years=3');
  console.log('B csv result 1521:', csvB.includes('1521'));
  console.log('B csv amount 50000:', csvB.includes('50000'));
  console.log('B csv NOT stale A (100000):', !csvB.includes('100000'));
  console.log('ISOLATION PASS:', !csvA.includes('50000') && !csvB.includes('100000'));

  // PDF report content (result B) via the hidden print iframe
  await p.goto('http://localhost:3000/finance/loan-emi?amount=50000&rate=6&years=3', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2200);
  const info = await p.evaluate(() => {
    App.exportResultAsPdf();
    const f = document.getElementById('pdf-print-frame');
    const body = f ? (((f.contentDocument || f.contentWindow.document).body || {}).textContent || '') : '';
    return {
      hasResultB: /1,521|1521/.test(body),
      hasCount543: body.includes('543+'),
      hasInputsB: body.includes('50000'),
      notStaleA: !/100000/.test(body),
      branded: body.includes('CalcProMaster'),
    };
  });
  console.log('PDF IFRAME:', JSON.stringify(info));
  await b.close();
})().catch((e) => console.log('ERR', e.message));
