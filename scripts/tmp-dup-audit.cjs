// Temporary audit (delete after use): for every live sitemap URL and every duplicate
// path Google still reports, check that the twin form (slash vs non-slash) 301/308s
// to the canonical one instead of answering 200 with the same content.
const fs = require('fs');
const path = require('path');

const ORIGIN = 'https://calcpromaster.com';
const rows = fs.readFileSync(path.join(__dirname, '..', 'tmp-gsc', 'Pages.csv'), 'utf8').trim().split(/\r?\n/).slice(1)
  .map(l => { const c = l.split(','); return { url: c[0], imp: +c[2] }; })
  .filter(r => r.url && r.url.startsWith(ORIGIN));

async function head(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0 (compatible; CalcProAudit/1.0)' } });
    return { status: res.status, location: res.headers.get('location') };
  } catch (e) { return { status: 0, error: e.message }; }
  finally { clearTimeout(t); }
}

async function main() {
  const sm = await fetch(ORIGIN + '/sitemap.xml').then(r => r.text());
  const sitemapUrls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
  const uniq = new Set(sitemapUrls);
  console.log('sitemap entries', sitemapUrls.length, 'unique', uniq.size, 'duplicates-in-sitemap', sitemapUrls.length - uniq.size);

  // 1) every sitemap URL + its twin
  const checks = [];
  for (const u of uniq) {
    const twin = u.endsWith('/') ? u.replace(/\/$/, '') : u + '/';
    checks.push({ canonical: u, twin });
  }
  const results = [];
  let i = 0;
  async function worker() {
    while (i < checks.length) {
      const k = i++;
      const { canonical, twin } = checks[k];
      const [c, t] = [await head(canonical), await head(twin)];
      results[k] = { canonical, twin, cStatus: c.status, tStatus: t.status, tLoc: t.location };
      if ((k + 1) % 200 === 0) console.log('  checked', k + 1, '/', checks.length);
    }
  }
  await Promise.all(Array.from({ length: 10 }, worker));

  const selfNot200 = results.filter(r => r.cStatus !== 200);
  const twinServes200 = results.filter(r => r.tStatus === 200);
  const twinBroken = results.filter(r => r.tStatus !== 200 && r.tStatus !== 301 && r.tStatus !== 308 && r.tStatus !== 302 && r.tStatus !== 307);

  console.log('\ncanonical URLs not 200:', selfNot200.length);
  for (const r of selfNot200.slice(0, 10)) console.log('  ', r.cStatus, r.canonical);
  console.log('twins that still answer 200 (real duplicates):', twinServes200.length);
  for (const r of twinServes200.slice(0, 15)) console.log('  ', r.twin);
  console.log('twins with unexpected status (neither 200 nor 3xx):', twinBroken.length);
  for (const r of twinBroken.slice(0, 10)) console.log('  ', r.tStatus, r.twin);

  // 2) the duplicate paths Google still reports
  const g = {};
  for (const r of rows) {
    const p = new URL(r.url).pathname;
    const key = p.replace(/\/$/, '');
    g[key] = g[key] || new Set();
    g[key].add(p);
  }
  const dupPaths = Object.entries(g).filter(([, v]) => v.size > 1).map(([k]) => k);
  console.log('\nGSC duplicate paths', dupPaths.length);
  const dupResults = [];
  let j = 0;
  async function worker2() {
    while (j < dupPaths.length) {
      const k = j++;
      const base = ORIGIN + dupPaths[k];
      const [a, b] = [await head(base), await head(base + '/')];
      dupResults[k] = { base: dupPaths[k], bare: a.status, slash: b.status, slashLoc: b.location };
    }
  }
  await Promise.all(Array.from({ length: 10 }, worker2));
  const stillBoth = dupResults.filter(r => r.bare === 200 && r.slash === 200);
  console.log('GSC dup paths where BOTH forms still 200:', stillBoth.length);
  for (const r of stillBoth.slice(0, 20)) console.log('  ', r.base);

  fs.writeFileSync(path.join(__dirname, '..', 'tmp-dup-audit.json'), JSON.stringify({ results, dupResults }, null, 1));
}
main();
