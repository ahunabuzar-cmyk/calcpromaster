#!/usr/bin/env node
// Post-build content-quality fixer (idempotent). Run after SSG + fix-deploy-seo.
// Fixes two crawler/a11y warnings that appear across the generated site:
//
//   1. <table> without a <caption>  → insert a visually-hidden caption derived
//      from the nearest preceding heading (h2/h3) or the page H1.
//   2. <title> shorter than 30 chars → append the brand suffix so it no longer
//      reads as "title too short" in the SERP (mirrors padTitle() in
//      scripts/ssg-pages.cjs; catches the hand-written guide/blog/legal pages).
//
// Usage: node scripts/fix-crawl-quality.cjs   (operates on deploy/)
'use strict';
const fs = require('fs');
const path = require('path');

const DEPLOY = path.join(__dirname, '..', 'deploy');
if (!fs.existsSync(DEPLOY)) {
  console.error('deploy/ not found — build first.');
  process.exit(1);
}

const decode = (s) => String(s)
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'");
const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const stripTags = (s) => decode(String(s).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, '').trim());

function padTitle(t) {
  t = String(t == null ? '' : t);
  if (!t) return 'CalcProMaster — Free Online Calculators';
  if (t.length >= 30) return t;
  if (/CalcProMaster/i.test(t)) return t + ' — Free Online Calculators';
  return t + ' | CalcProMaster';
}

let capAdded = 0, titlePadded = 0, filesTouched = 0;

function nearestHeading(html, tableIdx, fallback) {
  const head = html.slice(0, tableIdx);
  const re = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let m, last = '';
  while ((m = re.exec(head))) last = stripTags(m[1]);
  return clip(last || fallback || 'Data table', 90);
}

function processFile(p) {
  const before = fs.readFileSync(p, 'utf8');
  let s = before;

  // --- 1. table captions ---
  const h1 = stripTags((s.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '');
  const re = /<table\b[^>]*>/gi;
  let out = '', lastPos = 0, m;
  while ((m = re.exec(s))) {
    const afterOpen = s.slice(m.index + m[0].length, m.index + m[0].length + 40);
    out += s.slice(lastPos, m.index) + m[0];
    lastPos = m.index + m[0].length;
    if (!/^\s*<caption\b/i.test(afterOpen)) {
      const label = nearestHeading(s, m.index, h1);
      out += '<caption class="sr-only">' + escHtml(label) + '</caption>';
      capAdded++;
    }
  }
  out += s.slice(lastPos);
  s = out;

  // --- 2. pad short titles (+ matching OG/Twitter titles) ---
  const tm = s.match(/<title>([^<]*)<\/title>/i);
  if (tm) {
    const raw = decode(tm[1]);
    const padded = padTitle(raw);
    if (padded !== raw) {
      s = s.replace(tm[0], '<title>' + escHtml(padded) + '</title>');
      const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const oldAttr = new RegExp('(property="og:title" content=")' + esc(tm[1]) + '(")', 'g');
      const oldTw = new RegExp('(name="twitter:title" content=")' + esc(tm[1]) + '(")', 'g');
      s = s.replace(oldAttr, '$1' + escHtml(padded) + '$2').replace(oldTw, '$1' + escHtml(padded) + '$2');
      titlePadded++;
    }
  }

  if (s !== before) { fs.writeFileSync(p, s, 'utf8'); filesTouched++; }
}

(function walk(dir) {
  for (const e of fs.readdirSync(dir)) {
    const p = path.join(dir, e);
    const st = fs.statSync(p);
    if (st.isDirectory()) { walk(p); continue; }
    if (e.endsWith('.html')) processFile(p);
  }
})(DEPLOY);

console.log('fix-crawl-quality: ' + filesTouched + ' file(s) · ' + capAdded + ' table caption(s) · ' + titlePadded + ' title(s) padded');
