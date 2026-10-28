'use strict';
const fs = require('fs');
const path = require('path');
const pages = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) pages.push(p);
  }
})('deploy');

const noindex = pages.filter((p) => /name=["']robots["'][^>]*noindex/i.test(fs.readFileSync(p, 'utf8')));
const CATS = new Set(['auto', 'business', 'construction', 'conversion', 'career', 'education', 'engineering',
  'everyday', 'family', 'finance', 'fitness', 'food', 'health', 'homegarden', 'lifestyle', 'math',
  'regional', 'science', 'tech', 'utilities']);

const rel = noindex.map((p) => p.split(path.sep).join('/'));
const variants = rel.filter((u) => {
  const s = u.replace(/^deploy\//, '').split('/');
  return s.length >= 4 && CATS.has(s[0]);
});
const others = rel.filter((u) => !variants.includes(u));
console.log('noindex total: ' + rel.length + '  variants: ' + variants.length + '  other: ' + others.length);
console.log(others.join('\n'));
