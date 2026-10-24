#!/usr/bin/env node
// ============================================================
// CalcProMaster — Crawl plan for "Discovered / Unknown" pages
// ------------------------------------------------------------
// GSC bata raha hai ki 631 pages "Discovered - currently not indexed" hain
// (aur hamare live sweep mein 585 pages Discovered+Unknown nikle). Discovery
// missing nahi hai — audit ke mutabik in sab ke 3+ internal inlinks hain —
// matlab asli rukawat CRAWL BUDGET aur page value hai, na ki link graph.
//
// Ye script us kism ka plan banati hai jo actually chalta hai:
//   1. deploy/ ke saare pages se internal link graph banati hai (target ke
//      inbound links — site-wide nav nahi, sirf asli <a href>),
//   2. har crawl-pending URL ko GSC impressions + inlink count se score karti
//      hai aur priority tiers (P1/P2/P3) mein baant ti hai,
//   3. data/crawl-plan.json + docs/CRAWL-PLAN-DISCOVERED.md likhti hai:
//      exact URL lists — Request-Indexing queue, internal-link boost queue,
//      per-category breakdown, aur crawl-waste shopping list.
//
// Input : data/gsc-inspect-notindexed.json    (live URL-Inspection set)
//         data/gsc-page-impressions.json      (optional — priority)
//         deploy/**/index.html                (internal link graph)
// Output: data/crawl-plan.json · docs/CRAWL-PLAN-DISCOVERED.md
// Usage : node scripts/build-crawl-plan.cjs [--json]
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const INSPECT = path.join(ROOT, 'data', 'gsc-inspect-notindexed.json');
const IMPRESSIONS = path.join(ROOT, 'data', 'gsc-page-impressions.json');
const OUT_JSON = path.join(ROOT, 'data', 'crawl-plan.json');
const OUT_MD = path.join(ROOT, 'docs', 'CRAWL-PLAN-DISCOVERED.md');

const JSON_OUT = process.argv.includes('--json');

// ---------- pure helpers (unit-tested) ----------

// A tool-page URL like /finance/apy-calculator/ — not a nav/legal/asset link.
function isToolPath(href) {
  const h = String(href || '').split('#')[0].split('?')[0];
  return /^\/[a-z0-9-]+\/[a-z0-9-]+\/?$/.test(h) && !/\.(html|xml|txt|png|jpg|svg)$/i.test(h);
}

function normPath(u) {
  // Fragment/query pehle hatao — warna '/finance/c/#faq' aur '/finance/c/'
  // do alag keys ban jate hain aur inlink count kam ho jata hai.
  const raw = String(u || '').split('#')[0].split('?')[0].replace(/^https?:\/\/[^/]+/, '');
  return raw === '' ? '/' : raw.replace(/\/+$/, '') + (raw.includes('.') ? '' : '/');
}

function categoryOf(u) {
  const m = normPath(u).match(/^\/([a-z0-9-]+)\//);
  return m ? m[1] : 'root';
}

// Map of { pagePath: htmlText } → { targetPath: { inlinks, sources: [] } }
function buildLinkGraph(pages, sourceLimit) {
  const cap = sourceLimit > 0 ? sourceLimit : 8;
  const graph = {};
  for (const [pagePath, html] of Object.entries(pages)) {
    const seen = new Set();
    const re = /href="([^"]+)"/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      if (!isToolPath(m[1])) continue;
      const t = normPath(m[1]);
      if (t === pagePath || seen.has(t)) continue;
      seen.add(t);
      const e = (graph[t] = graph[t] || { inlinks: 0, sources: [] });
      e.inlinks++;
      if (e.sources.length < cap) e.sources.push(pagePath);
    }
  }
  return graph;
}

const CRAWL_PENDING = (coverage) =>
  /^Discovered/i.test(coverage) || /^URL is unknown/i.test(coverage);

// Priority tiers + ordering for the crawl plan.
function buildPlan(results, impressions, graph) {
  const impr = (impressions && impressions.pages) || {};
  const rows = [];
  for (const r of results || []) {
    if (!CRAWL_PENDING(r.coverage)) continue;
    const p = normPath(r.url);
    const g = graph[p] || { inlinks: 0, sources: [] };
    const imp = impr[p.replace(/\/$/, '')] || impr[p] || {};
    const impressionsN = Number(imp.impressions) || 0;
    const position = Number(imp.position) || 0;
    // P1: Google already shows it for some queries (impressions) → almost there,
    //     a Request-Indexing + one more internal link usually tips it over.
    // P2: never shown, but structurally well linked (3+) → crawl-budget lever.
    // P3: weakly linked (<3 inbound tool links) → fix the graph first.
    const tier = impressionsN > 0 ? 'P1' : g.inlinks >= 3 ? 'P2' : 'P3';
    rows.push({
      url: p,
      category: categoryOf(p),
      coverage: r.coverage,
      inlinks: g.inlinks,
      topSources: g.sources.slice(0, 5),
      impressions: impressionsN,
      position,
      tier,
    });
  }
  // Order = kaam ka kram: P1 (quick wins) → P2 (crawl priority) → P3 (graph fix),
  // phir zyada impressions, phir zyada inlinks (degdi hui pages pehle), phir URL.
  const tierRank = { P1: 0, P2: 1, P3: 2 };
  rows.sort((a, b) =>
    tierRank[a.tier] - tierRank[b.tier] ||
    b.impressions - a.impressions ||
    b.inlinks - a.inlinks ||
    a.url.localeCompare(b.url)
  );
  const byCategory = {};
  for (const r of rows) {
    const c = (byCategory[r.category] = byCategory[r.category] || { total: 0, P1: 0, P2: 0, P3: 0, impressions: 0 });
    c.total++;
    c[r.tier]++;
    c.impressions += r.impressions;
  }
  return {
    generatedAt: new Date().toISOString(),
    totals: {
      crawlPending: rows.length,
      P1: rows.filter((r) => r.tier === 'P1').length,
      P2: rows.filter((r) => r.tier === 'P2').length,
      P3: rows.filter((r) => r.tier === 'P3').length,
      withImpressions: rows.filter((r) => r.impressions > 0).length,
      zeroInlink: rows.filter((r) => r.inlinks === 0).length,
    },
    byCategory,
    rows,
  };
}

// ---------- I/O ----------
function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fallback; }
}

function loadDeployPages() {
  const pages = {};
  if (!fs.existsSync(DEPLOY)) return pages;
  const SKIP = new Set(['embed']);
  (function walk(dir, urlPath) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (SKIP.has(e.name)) continue;
        walk(path.join(dir, e.name), urlPath + e.name + '/');
      } else if (e.name === 'index.html') {
        try { pages[urlPath] = fs.readFileSync(path.join(dir, e.name), 'utf8'); } catch (err) { /* skip */ }
      }
    }
  })(DEPLOY, '/');
  return pages;
}

function renderMarkdown(plan, meta) {
  const L = [];
  L.push('# Crawl plan — Discovered / Unknown pages');
  L.push('');
  L.push('**Generated:** ' + String(plan.generatedAt).slice(0, 10) + ' · by `node scripts/build-crawl-plan.cjs`');
  L.push('**Source data:** `data/gsc-inspect-notindexed.json` (' + meta.inspected + ' URLs inspected live) + `data/gsc-page-impressions.json`');
  L.push('');
  L.push('## 1. Situation');
  L.push('');
  L.push('| | Count |');
  L.push('|---|---|');
  L.push('| GSC site-wide "Discovered - currently not indexed" | **631** |');
  L.push('| Hamare live sweep ka crawl-pending set (Discovered + Unknown) | **' + plan.totals.crawlPending + '** |');
  L.push('| In mein se jinhe GSC impressions de raha hai | **' + plan.totals.withImpressions + '** |');
  L.push('| Zero inbound tool-links | ' + plan.totals.zeroInlink + ' |');
  L.push('');
  L.push('**Diagnosis:** discovery ki problem nahi hai — ' + plan.totals.zeroInlink + ' zero-inlink pages hain,');
  L.push('baaki sab 3+ internal links se reachable hain. Rukawat **crawl budget + page value** hai:');
  L.push('Google URL dekh chuka hai, par use crawl/rank karne layak priority nahi de raha.');
  L.push('Is liye plan ka pehla hissa crawl waste kam karna hai, doosra priority signals dena.');
  L.push('');
  L.push('## 2. Priority tiers');
  L.push('');
  L.push('| Tier | Kya matlab | Count | Action |');
  L.push('|---|---|---|---|');
  L.push('| **P1** | Google already impressions de raha hai — bas index nahi | **' + plan.totals.P1 + '** | GSC → Request Indexing (2 batches) |');
  L.push('| **P2** | Reachable (3+ inlinks), zero impressions | **' + plan.totals.P2 + '** | High-impression page se ek contextual link |');
  L.push('| **P3** | Weak graph (<3 inlinks) | **' + plan.totals.P3 + '** | Pehle link graph fix, phir request |');
  L.push('');
  L.push('### Per-category');
  L.push('');
  L.push('| Category | Pending | P1 | P2 | P3 | Impressions |');
  L.push('|---|---|---|---|---|---|');
  for (const [cat, c] of Object.entries(plan.byCategory).sort((a, b) => b[1].total - a[1].total)) {
    L.push('| ' + cat + ' | ' + c.total + ' | ' + c.P1 + ' | ' + c.P2 + ' | ' + c.P3 + ' | ' + c.impressions + ' |');
  }
  L.push('');
  L.push('## 3. P1 — Request Indexing (' + plan.totals.P1 + ' URLs)');
  L.push('');
  L.push('Ye wo crawl-pending pages hain jinko Google **already impressions** de raha hai — sabse aasan wins.');
  L.push('GSC URL Inspection → Request Indexing (~10–12/din, UI-only; koi public API nahi).');
  L.push('Poori site ke liye bada queue pehle se maujood hai: `docs/REQUEST-INDEXING-TOP40.md`.');
  L.push('');
  L.push('| # | URL | Category | Impr | Pos | Inlinks |');
  L.push('|---|---|---|---|---|---|');
  plan.rows.filter((r) => r.tier === 'P1').slice(0, meta.queueSize).forEach((r, i) => {
    L.push('| ' + (i + 1) + ' | `' + r.url + '` | ' + r.category + ' | ' + r.impressions + ' | ' + (r.position || '—') + ' | ' + r.inlinks + ' |');
  });
  L.push('');
  L.push('> **Note:** sirf ' + plan.totals.P1 + ' crawl-pending page ko impressions mil rahe hain. Iska matlab');
  L.push('> Request Indexing yahan **chhota lever** hai — 631 pages ka problem crawl budget + page value hai,');
  L.push('> request-indexing nahi (Google URL dekh chuka hai aur jaan-bujh kar chunk mein index kar raha hai).');
  L.push('');
  L.push('## 4. Crawl-waste shopping list (ye crawl budget kha raha hai)');
  L.push('');
  L.push('| Item | Count | Kya karein |');
  L.push('|---|---|---|');
  L.push('| noindex pages par internal links (nav/footer: `/history/`, `/favorites/`, `/compare/`, `/cookies`) | ~10,564 links | Nav se hatao — ye crawl budget bachata hai |');
  L.push('| Long-tail modifier pages (noindex, canonical → parent) | 198 files | Rehne do (deep links TODO work karte hain), par nav se link na karo |');
  L.push('| Stale "Page with redirect" signal | 86 URLs live 200 | Sirf re-crawl se clear hoga — request indexing in par waste na karo |');
  L.push('');
  L.push('## 4b. Value problem — thin junction pages (asli lever)');
  L.push('');
  L.push('"Crawled - currently not indexed" (14 pages) ka matlab Google ne page crawl kiya par index');
  L.push('karne layak nahi samjha. Us bucket ka URL list GSC ke coverage export mein nahi aata — sirf count.');
  L.push('Is liye proxy wahi hai jo measurably thin hai: site ke sab se chhote INDEXABLE pages.');
  L.push('Do page families nikle — dono ek-ek link junction hain, is liye thinness wahan do baar mehngi padti hai.');
  L.push('');
  L.push('| Page family | Pehle | Ab | Kya add hua |');
  L.push('|---|---|---|---|');
  L.push('| 20 comparison hubs `/hub/<cat>/` | catalog-heavy, editorial ~314-645 words | +249–318 words/hub | unique intro, "what you can work out" (4 points), 3 category FAQs + FAQPage schema |');
  L.push('| 17 category guides `/guides/<cat>` | 315–375 words, zero FAQ | 589+ words (avg 615) | lede, "where these answers go wrong" (4 pitfalls), 3 guide FAQs + FAQPage schema |');
  L.push('');
  L.push('Content genuinely per-page unique hai (unit tests duplicate copy reject karte hain), aur dono families');
  L.push('ke liye prerendered HTML == hydrated DOM, is liye koi cloaking/parity risk nahi.');
  L.push('');
  L.push('- Hubs: `js/category-depth.js` + `scripts/ssg-pages.cjs` (SSG + client renderer dono).');
  L.push('- Guides: `js/guide-depth.js` + `scripts/apply-guide-depth.cjs` (`--check` CI gate, idempotent).');
  L.push('- Live number: `npm run seo:thin` → `docs/THIN-PAGES-REPORT.md` (threshold + shape wise);');
  L.push('  abhi < 500 words wale saare bache hue pages "focused" shape ke hain — FAQ + multiple subheadings,');
  L.push('  zero "bare" (short aur bina FAQ) indexable pages.');
  L.push('');
  L.push('## 5. Sequence (agla 4 hafte)');
  L.push('');
  L.push('1. **Crawl waste band karo** — nav/footer se 4 noindex URLs hatao (ek template edit, har page se 4 links kam).');
  L.push('2. **Depth deploy karo** — hubs + category guides already enrich ho chuke hain; deploy karne ke baad GSC se woh URLs + top tool URLs request karo.');
  L.push('3. **P1 batch 1** — ' + plan.totals.P1 + ' URLs GSC se request karo; baaki ke liye `docs/REQUEST-INDEXING-TOP40.md`.');
  L.push('4. **P2 links** — P2 pages ko high-impression indexed pages se meaningful "related calculator" links do.');
  L.push('5. **Measure** — har hafte: `npm run seo:indexation-tracker` (movement) + `npm run seo:report` (dated report).');
  L.push('');
  L.push('> Expectation: P1 pages 1–3 hafte mein index hone chahiye (immediate chunk). Crawl-budget fixes');
  L.push('> ~4–8 hafte mein effect dikhate hain. Har hafte ka GSC Coverage ZIP chalao — movement khud pata chalegi.');
  L.push('');
  return L.join('\n');
}

function main() {
  const insp = readJson(INSPECT, null);
  if (!insp || !insp.results) {
    console.error('✖ data/gsc-inspect-notindexed.json nahi mila — pehle `npm run seo:inspect-list` chalao.');
    process.exit(1);
  }
  const impressions = readJson(IMPRESSIONS, null);
  const pages = loadDeployPages();
  if (!Object.keys(pages).length) {
    console.error('✖ deploy/ khaali hai — pehle `node build-deploy.js` chalao (link graph usi se bane ga).');
    process.exit(1);
  }
  const graph = buildLinkGraph(pages, 8);
  const plan = buildPlan(insp.results, impressions, graph);
  const QUEUE_SIZE = 40;
  const md = renderMarkdown(plan, { inspected: insp.results.length, queueSize: QUEUE_SIZE });

  fs.writeFileSync(OUT_JSON, JSON.stringify(plan, null, 2));
  fs.writeFileSync(OUT_MD, md);

  if (JSON_OUT) {
    console.log(JSON.stringify(plan.totals, null, 2));
    return;
  }
  console.log('==========================================');
  console.log(' CRAWL PLAN — Discovered / Unknown pages');
  console.log('==========================================');
  console.log('pages scanned    : ' + Object.keys(pages).length);
  console.log('crawl-pending    : ' + plan.totals.crawlPending);
  console.log('  P1 (impr>0)    : ' + plan.totals.P1);
  console.log('  P2 (linked)    : ' + plan.totals.P2);
  console.log('  P3 (weak graph): ' + plan.totals.P3);
  console.log('  zero-inlink    : ' + plan.totals.zeroInlink);
  console.log('');
  console.log('Top 5 priority:');
  for (const r of plan.rows.slice(0, 5)) {
    console.log('  ' + r.tier + '  ' + r.url + '  (impr ' + r.impressions + ', inlinks ' + r.inlinks + ')');
  }
  console.log('');
  console.log('💾 data/crawl-plan.json · docs/CRAWL-PLAN-DISCOVERED.md');
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('FAIL', e.message); process.exit(1); }
}

module.exports = { isToolPath, normPath, categoryOf, buildLinkGraph, buildPlan, CRAWL_PENDING };
