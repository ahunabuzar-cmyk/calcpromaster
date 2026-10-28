'use strict';
const fs = require('fs');
const path = require('path');
const CATS = new Set(['auto', 'business', 'construction', 'conversion', 'career', 'education', 'engineering',
  'everyday', 'family', 'finance', 'fitness', 'food', 'health', 'homegarden', 'lifestyle', 'math',
  'regional', 'science', 'tech', 'utilities']);

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name === 'index.html') acc.push(p);
  }
  return acc;
}

const all = walk('deploy', []);
const urls = all.map((p) => '/' + path.relative('deploy', p).split(path.sep).join('/').replace(/index\.html$/, ''));
const vars = urls.filter((u) => {
  const s = u.split('/').filter(Boolean);
  return s.length >= 3 && CATS.has(s[0]);
});
console.log('built pages:', all.length, '| tool pages:', urls.filter((u) => {
  const s = u.split('/').filter(Boolean);
  return s.length === 2 && CATS.has(s[0]);
}).length, '| modifier variant pages:', vars.length);

let noidx = 0;
let selfcanon = 0;
let canonOther = 0;
const noidxList = [];
const selfList = [];
for (const u of vars) {
  const h = fs.readFileSync(path.join('deploy', u, 'index.html'), 'utf8');
  const robots = (h.match(/<meta[^>]*name=["']robots["'][^>]*>/i) || [''])[0];
  const canon = (h.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i) || [, ''])[1];
  const isNo = /noindex/i.test(robots);
  if (isNo) { noidx++; if (noidxList.length < 5) noidxList.push(u + '  ' + robots); }
  const self = 'https://calcpromaster.com' + u.replace(/\/$/, '');
  if (canon.replace(/\/$/, '') === self) { selfcanon++; if (selfList.length < 5) selfList.push(u + '  ' + canon); } else canonOther++;
}
console.log('modifier variants: noindex=' + noidx + ' | self-canonical=' + selfcanon + ' | canonical->other=' + canonOther);
console.log('\nnoindex samples:\n' + noidxList.join('\n'));
console.log('\nself-canonical samples:\n' + selfList.join('\n'));

// Also: any built page anywhere with noindex?
let allNo = 0;
const allNoSamples = [];
for (const p of all) {
  const h = fs.readFileSync(p, 'utf8');
  const robots = (h.match(/<meta[^>]*name=["']robots["'][^>]*>/i) || [''])[0];
  if (/noindex/i.test(robots)) { allNo++; if (allNoSamples.length < 8) allNoSamples.push(p + '  ' + robots); }
}
console.log('\nALL built pages with noindex meta: ' + allNo);
console.log(allNoSamples.join('\n'));
