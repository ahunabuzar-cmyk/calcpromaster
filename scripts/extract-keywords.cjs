#!/usr/bin/env node
/* Extract every SEO-targeted keyword from the deploy tree:
 * - page URL (from directory path)
 * - <title> (the primary SEO target)
 * - meta description (secondary keyword surface)
 * - <h1> (on-page anchor)
 * - tool.kw — the curated keyword string from the calculator data module
 *   (embedded in each page as `kw:"..."` inside window.__CALC_DATA__)
 * Output: docs/KEYWORD-TARGETS.md source data as JSON lines to stdout. */
const fs = require('fs');
const path = require('path');

const DEPLOY = path.join(__dirname, '..', 'deploy');
const rows = [];

// tool.kw lives in the embedded payload as kw:"a|b|c" (double or single quotes)
function extractKw(html) {
  const m = html.match(/kw\s*:\s*"([^"]+)"/);
  if (m) return m[1];
  const m2 = html.match(/kw\s*:\s*'([^']+)'/);
  return m2 ? m2[1] : '';
}

function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
  for (const ent of entries) {
    if (ent.name === 'node_modules' || ent.name === '.git') continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) { walk(full); continue; }
    if (!ent.name.endsWith('.html')) continue;
    const rel = path.relative(DEPLOY, full).replace(/\\/g, '/');
    // Page URL = directory path (clean URLs); skip pure component files
    const url = '/' + rel.replace(/(^|\/)index\.html$/, '').replace(/\.html$/, '');
    const html = fs.readFileSync(full, 'utf8');
    const noindex = /name="robots" content="[^"]*noindex/.test(html);
    if (noindex) continue; // variant pages are noindex — not keyword targets
    const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
    const meta = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
    const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || '';
    const strip = (s) => s
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&gt;/g, '>').replace(/&lt;/g, '<')
      .replace(/&#39;|&apos;|&#8217;/g, "'").replace(/&quot;|&#8221;/g, '"')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ').trim();
    rows.push({
      url: url === '/index.html' ? '/' : (url === '' ? '/' : url),
      title: strip(title),
      meta: strip(meta),
      h1: strip(h1).slice(0, 90),
      kw: extractKw(html)
    });
  }
}

walk(DEPLOY);

// Emit as JSON lines (one page per line) — grouped summary written separately
const out = rows.map(r => JSON.stringify(r)).join('\n');
fs.writeFileSync(path.join(__dirname, '.keywords.jsonl'), out + '\n', 'utf8');
console.log('pages extracted:', rows.length);
const withKw = rows.filter(r => r.kw);
console.log('pages with tool.kw:', withKw.length);
const kwCount = new Set();
for (const r of withKw) r.kw.split('|').forEach(k => kwCount.add(k.trim().toLowerCase()));
console.log('unique tool.kw phrases:', kwCount.size);
