/* Full crawl audit of deploy/ — Step 40 verification.
   Checks every prerendered page for: title, meta description, canonical
   (self-referencing), robots noindex, H1, JSON-LD schema, body word count.
   Exit code 1 if any BLOCKER class fails. */
const fs = require('fs');
const path = require('path');

const DEPLOY = path.join(__dirname, '..', 'deploy');
const pages = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === 'index.html') pages.push(p);
  }
}
walk(DEPLOY);

const rel = (p) => '/' + path.relative(DEPLOY, p).replace(/\\/g, '/').replace(/\/index\.html$/, '').replace(/^\/?$/, '');
const stats = { pages: pages.length, noTitle: [], noMeta: [], noCanonical: [], noH1: [], noSchema: [], noindexList: [], canonicalMismatch: [], thin: [], dupTitles: {}, dupMetas: {} };

for (const p of pages) {
  const html = fs.readFileSync(p, 'utf8');
  const url = rel(p);
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
  const meta = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  const canon = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];
  const noindex = /<meta name="robots" content="[^"]*noindex[^"]*"/.test(html);
  const h1 = /<h1[ >]/.test(html);
  const schema = /application\/ld\+json/.test(html);
  // crude visible word count: strip scripts/styles/tags
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = body.split(' ').filter(w => w.length > 1).length;

  if (!title || !title.trim()) stats.noTitle.push(url);
  if (!meta || meta.length < 50) stats.noMeta.push(url);
  if (!canon) stats.noCanonical.push(url);
  else {
    const expected = 'https://calcpromaster.netlify.app' + (url === '/' ? '' : url);
    if (!canon.startsWith('https://calcpromaster.netlify.app')) stats.canonicalMismatch.push(url + ' → ' + canon);
    else if (!noindex && canon.replace(/\/$/, '') !== expected.replace(/\/$/, '')) stats.canonicalMismatch.push(url + ' → ' + canon);
  }
  if (!h1) stats.noH1.push(url);
  if (!schema) stats.noSchema.push(url);
  if (noindex) stats.noindexList.push(url);
  if (!noindex && words < 120) stats.thin.push(url + ' (' + words + 'w)');
  if (title) (stats.dupTitles[title] = stats.dupTitles[title] || []).push(url);
  if (meta) (stats.dupMetas[meta] = stats.dupMetas[meta] || []).push(url);
}

const dupT = Object.entries(stats.dupTitles).filter(([, v]) => v.length > 1);
const dupM = Object.entries(stats.dupMetas).filter(([, v]) => v.length > 1);

console.log('pages crawled:', stats.pages);
console.log('missing title:', stats.noTitle.length, stats.noTitle.slice(0, 5));
console.log('missing/short meta:', stats.noMeta.length, stats.noMeta.slice(0, 5));
console.log('missing canonical:', stats.noCanonical.length, stats.noCanonical.slice(0, 5));
console.log('canonical mismatch:', stats.canonicalMismatch.length, stats.canonicalMismatch.slice(0, 5));
console.log('missing H1:', stats.noH1.length, stats.noH1.slice(0, 5));
console.log('missing schema:', stats.noSchema.length, stats.noSchema.slice(0, 5));
console.log('noindex pages:', stats.noindexList.length, stats.noindexList.join(', '));
console.log('thin (<120 words, indexable):', stats.thin.length, stats.thin.slice(0, 8));
console.log('duplicate titles:', dupT.length, dupT.slice(0, 3).map(([k, v]) => k + ' ×' + v.length));
console.log('duplicate metas:', dupM.length, dupM.slice(0, 3).map(([k, v]) => k.slice(0, 50) + '… ×' + v.length));

const blockers = stats.noTitle.length + stats.noMeta.length + stats.noCanonical.length + stats.noH1.length + dupT.length + dupM.length;
console.log(blockers === 0 ? 'AUDIT PASS' : 'AUDIT: ' + blockers + ' blocker instances');
process.exit(blockers === 0 ? 0 : 1);
