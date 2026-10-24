// Temporary audit (delete after use): which built pages have no canonical tag, and
// which built pages are absent from the generated sitemap (indexable but unlisted).
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', 'deploy');
const SKIP = new Set(['js', 'assets', 'og', 'images', 'fonts', 'icons', 'icons-tools', 'node_modules']);

function pages(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name)) pages(p, out); }
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const files = pages(ROOT);
const noCanon = [];
const all = [];
for (const f of files) {
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  const url = rel === 'index.html' ? '/'
    : rel.endsWith('/index.html') ? '/' + rel.replace(/index\.html$/, '')
    : '/' + rel.replace(/\.html$/, '');
  const html = fs.readFileSync(f, 'utf8');
  const has = /rel=["']canonical["']/i.test(html);
  const noindex = /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
  all.push({ url, noindex });
  if (!has) noCanon.push({ url, bytes: html.length });
}
console.log('built html pages', files.length, '| without canonical', noCanon.length);
for (const p of noCanon) console.log('  ', p.url, p.bytes + 'b');

const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const inSm = new Set([...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim().replace('https://calcpromaster.com', '')));
const missing = all.filter(p => !inSm.has(p.url) && !inSm.has(p.url.replace(/\/$/, '')) && !inSm.has(p.url + '/'))
  .map(p => p.url + (p.noindex ? ' [noindex]' : ' [INDEXABLE]'));
console.log('\nbuilt pages not in sitemap', missing.length);
const buckets = {};
for (const u of missing) { const k = u.split('/')[1] || '/'; buckets[k] = (buckets[k] || 0) + 1; }
console.log('by section', JSON.stringify(buckets));
console.log('sample', missing.slice(0, 15).join(' '));
