#!/usr/bin/env node
// Dev-only: which live pages carry the least <main> text?
// The third-party audit reports "pages with a low word count" against the
// content area, not the full <body> (nav + footer inflate the body count by
// ~20 words). This fetches the N shortest pages from the saved live audit and
// counts only <main>. It is a probe, not a gate.
'use strict';
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'data', 'live-page-audit.json');
const TOP = Number(process.argv[2] || 30);
const THRESHOLD = Number(process.argv[3] || 300);

const strip = (h) => h
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
  .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z#0-9]+;/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const words = (s) => strip(s).split(' ').filter(Boolean).length;

async function main() {
  const r = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const indexable = r.pages.filter((p) => !p.error && !(p.robots && /noindex/i.test(p.robots)));
  const shortest = indexable.slice().sort((a, b) => a.words - b.words).slice(0, TOP);

  const rows = [];
  for (const p of shortest) {
    const res = await fetch(p.url, { signal: AbortSignal.timeout(20000) });
    const html = await res.text();
    const m = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    rows.push({ url: p.url, body: p.words, main: m ? words(m[1]) : 0 });
  }
  rows.sort((a, b) => a.main - b.main);
  const under = rows.filter((x) => x.main < THRESHOLD);
  console.log('pages under ' + THRESHOLD + ' main-content words:', under.length, '(of the ' + TOP + ' shortest by body words)');
  for (const x of under) console.log('  main ' + String(x.main).padStart(5) + ' | body ' + String(x.body).padStart(5) + ' | ' + x.url);
  console.log('\nnext 8 for context:');
  for (const x of rows.slice(under.length, under.length + 8)) console.log('  main ' + String(x.main).padStart(5) + ' | body ' + String(x.body).padStart(5) + ' | ' + x.url);
}

main().catch((e) => { console.error(e); process.exit(1); });
