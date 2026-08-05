#!/usr/bin/env node
// generate-tool-og.js — creates per-tool OG images (1200x630 PNG) from og-image.html template.
// Usage: node generate-tool-og.js <tool-slug> <tool-title> [accent-color]
// Requires: playwright (already a devDependency).
// Writes to: og/tools/<slug>.png  — commit these; deploy automatically picks up via copyDir if og/ added.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function main() {
  const [, , slug, title, accent = '#4f46e5'] = process.argv;
  if (!slug || !title) {
    console.error('Usage: node generate-tool-og.js <slug> "<title>" [#hex]');
    process.exit(1);
  }
  const outDir = path.join(__dirname, 'og', 'tools');
  fs.mkdirSync(outDir, { recursive: true });

  const html = `<!doctype html><html><body style="margin:0;width:1200px;height:630px;background:linear-gradient(135deg,${accent},#7c3aed);display:flex;align-items:center;justify-content:center;font-family:system-ui;color:#fff">
  <div style="padding:80px;max-width:1000px">
    <div style="font-size:28px;opacity:.85;letter-spacing:2px">CALCPROMASTER</div>
    <div style="font-size:84px;font-weight:800;line-height:1.1;margin:.25em 0">${title}</div>
    <div style="font-size:32px;opacity:.9">Free online calculator — instant results</div>
  </div></body></html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html);
  const file = path.join(outDir, slug + '.png');
  await page.screenshot({ path: file });
  await browser.close();
  console.log('OK: ' + file);
}
main();
