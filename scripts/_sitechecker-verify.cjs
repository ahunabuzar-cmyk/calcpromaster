#!/usr/bin/env node
// Throwaway: verify Sitechecker report claims against deploy/ HTML files.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'deploy');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');

const agg = {
  total: files.length,
  canonicalMissing: [], canonicalNeSelf: [], noindex: [],
  ogMissing: [], twitterMissing: [], descMissing: [], descTooLong: [],
  titleShort: [], titleLong: [], lorem: [], tableNoCaption: [],
  styleAttr: [], h1Count2plus: [], noLists: [], noStrong: [], noParagraphs: [],
};
// href pattern sample
let hrefSlash = 0, hrefNoSlash = 0, hrefHash = 0, hrefOnclick = 0;
const sampleHrefFiles = files.filter((f) => rel(f).split('/').length <= 2).slice(0, 60);

for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const url = '/' + rel(f).replace(/index\.html$/, '').replace(/\.html$/, '');
  const canon = (html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/) || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/) || [])[1];
  if (!canon) agg.canonicalMissing.push(url);
  else if (!canon.replace(/\/$/, '').endsWith(url.replace(/\/$/, ''))) agg.canonicalNeSelf.push(url + ' -> ' + canon);
  if (/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html)) agg.noindex.push(url);
  if (!/property=["']og:title["']/.test(html)) agg.ogMissing.push(url);
  if (!/name=["']twitter:card["']/.test(html)) agg.twitterMissing.push(url);
  const desc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/) || [])[1];
  if (!desc) agg.descMissing.push(url);
  else if (desc.length > 165) agg.descTooLong.push(url + ' (' + desc.length + ')');
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  if (title.length && title.length < 25) agg.titleShort.push(url + ' (' + title.length + ') "' + title + '"');
  if (title.length > 65) agg.titleLong.push(url + ' (' + title.length + ')');
  if (/lorem\s*ipsum/i.test(html)) agg.lorem.push(url);
  if (/<table[\s>]/.test(html) && !/<caption[\s>]/.test(html)) agg.tableNoCaption.push(url);
  const nStyle = (html.match(/style=["']/g) || []).length;
  if (nStyle > 0) agg.styleAttr.push(url + ' (' + nStyle + ')');
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s > 1) agg.h1Count2plus.push(url + ' (' + h1s + ')');
  if (!/<(ul|ol)[\s>]/.test(html)) agg.noLists.push(url);
  if (!/<strong[\s>]/.test(html)) agg.noStrong.push(url);
  if (!/<p[\s>]/.test(html)) agg.noParagraphs.push(url);
}

// href forms from a sample
for (const f of sampleHrefFiles) {
  const html = fs.readFileSync(f, 'utf8');
  hrefSlash += (html.match(/href=["']\/[a-z0-9-]+\/[a-z0-9-]+\/?["']/g) || []).filter((m) => m.endsWith('/"')).length;
  hrefNoSlash += (html.match(/href=["']\/[a-z0-9-]+\/[a-z0-9-]+["']/g) || []).length;
  hrefHash += (html.match(/href=["']#["']/g) || []).length;
  hrefOnclick += (html.match(/onclick=["'][^"']*location/i) || []).length;
}

// sitemap cross-check: which sitemap URLs canonical to another URL
const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/^https?:\/\/[^/]+/, '').replace(/\/$/, ''));
const canonMap = new Map();
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const canon = (html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/) || [])[1];
  if (canon) {
    const u = '/' + rel(f).replace(/index\.html$/, '').replace(/\.html$/, '');
    canonMap.set(u.replace(/\/$/, ''), canon.replace(/^https?:\/\/[^/]+/, '').replace(/\/$/, ''));
  }
}
const smCanonized = locs.filter((u) => canonMap.has(u) && canonMap.get(u) !== u);

const show = (name, arr, n = 8) => {
  console.log('\n== ' + name + ': ' + arr.length + ' ==');
  arr.slice(0, n).forEach((x) => console.log('  ' + x));
};
show('canonical MISSING', agg.canonicalMissing);
show('canonical != self', agg.canonicalNeSelf, 12);
show('noindex pages', agg.noindex, 10);
show('og:title MISSING', agg.ogMissing, 14);
show('twitter:card MISSING', agg.twitterMissing, 6);
show('description MISSING', agg.descMissing);
show('description >165', agg.descTooLong, 10);
show('title <25 chars', agg.titleShort, 16);
show('title >65', agg.titleLong, 6);
show('LOREM IPSUM', agg.lorem, 4);
show('table w/o caption', agg.tableNoCaption, 6);
show('h1 >1', agg.h1Count2plus, 6);
show('no ul/ol lists', agg.noLists, 8);
show('no <strong>', agg.noStrong, 4);
show('no <p>', agg.noParagraphs);
console.log('\n== href sample ==\nslash-hrefs: ' + hrefSlash + '  no-slash: ' + hrefNoSlash + '  "#": ' + hrefHash + '  onclick-location: ' + hrefOnclick);
console.log('style-attr files: ' + agg.styleAttr.length + '  (first: ' + (agg.styleAttr[0] || '-') + ')');
console.log('\n== sitemap canonicalized: ' + smCanonized.length + ' ==');
smCanonized.slice(0, 50).forEach((u) => console.log('  ' + u + ' -> ' + canonMap.get(u)));
