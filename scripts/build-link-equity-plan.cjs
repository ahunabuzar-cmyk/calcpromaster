#!/usr/bin/env node
// ============================================================
// CalcProMaster — link-equity plan
// ------------------------------------------------------------
// Crawl-link gate sirf itna guarantee karta hai ki har not-indexed page ko
// KISI indexed page se ek inlink mile. Lekin jo page impress kar raha hai aur
// click nahi de raha, usay "kisi" page ka link faida nahi deta — usay apne hi
// category ke **strongest** indexed pages ka link chahiye.
//
// Ye script:
//   1. deploy/ se asli internal link graph nikaalta hai (konsa page kisse link karta hai).
//   2. Wo targets chunta hai jo impressions le rahe hain, clicks nahi de rahe, aur
//      position 11-50 par hain (jahan ek push ka matlab hai).
//   3. Har target ke liye 3 sources suggest karta hai — same category, sabse zyada
//      impressions wale indexed pages, jo already link nahi kar rahe.
//   4. Anchor text target ki apni best query se banata hai.
//
// Reads : deploy/**/*.html (link graph) · data/query-opportunity.json (targets)
//         data/gsc-page-impressions.json (source strength)
// Writes: docs/LINK-EQUITY-PLAN.md · data/link-equity-plan.json
// Usage : node scripts/build-link-equity-plan.cjs
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const DOC = path.join(ROOT, 'docs', 'LINK-EQUITY-PLAN.md');
const OUT = path.join(ROOT, 'data', 'link-equity-plan.json');

const HREF_RE = /<a\b[^>]*\bhref="([^"]+)"/gi;

// ---------- pure helpers (unit-tested) ----------

// Served form: a directory route keeps its trailing slash, a flat .html file does
// not. Everything is compared in this one form.
function normalizeRoute(href) {
  const clean = String(href).split(/[?#]/)[0];
  if (!clean.startsWith('/') || clean.startsWith('//')) return null;
  if (clean === '/' || clean === '') return '/';
  return clean;
}

// Which internal routes a page links to.
function linksFrom(html) {
  const out = new Set();
  let m;
  HREF_RE.lastIndex = 0;
  while ((m = HREF_RE.exec(html)) !== null) {
    const r = normalizeRoute(m[1]);
    if (r && r !== '/') out.add(r.endsWith('/') ? r : r + '/');
  }
  return out;
}

// Anchor text from the target's own best query: a user reading the sentence should
// see the words they would have searched.
function anchorFor(query, title) {
  const base = String(query || '').trim() || String(title || '').split(':')[0].trim();
  if (!base) return 'calculator';
  const words = base.replace(/\s+/g, ' ').split(' ');
  if (words.length <= 5) return base;
  return words.slice(0, 5).join('');
}

// Sources for one target: same category first, strongest first, never one that
// already links to the target, and never one that is itself still waiting to be
// indexed (a page Google has not indexed passes on little).
function pickSources(target, candidates, alreadyLinking, limit = 3, blocked = new Set()) {
  const cat = String(target.path).replace(/^\//, '').split('/')[0];
  const scored = (candidates || [])
    .filter((c) => c.path !== target.path && !alreadyLinking.has(c.path) && !blocked.has(c.path))
    .map((c) => ({
      ...c,
      sameCategory: String(c.path).replace(/^\//, '').split('/')[0] === cat,
    }))
    .filter((c) => c.sameCategory)
    .sort((a, b) => (b.impressions || 0) - (a.impressions || 0));
  return scored.slice(0, limit);
}

function walkHtml(dir, acc) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkHtml(p, acc);
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

// ---------- main ----------

function main() {
  if (!fs.existsSync(DEPLOY)) {
    console.error('✖ deploy/ nahi mila — pehle `npm run deploy:build` chalao (link graph wahin se aata hai)');
    process.exit(1);
  }
  const oppPath = path.join(ROOT, 'data', 'query-opportunity.json');
  if (!fs.existsSync(oppPath)) {
    console.error('✖ data/query-opportunity.json missing — run: node scripts/build-query-opportunity.cjs');
    process.exit(1);
  }
  const opp = JSON.parse(fs.readFileSync(oppPath, 'utf8'));

  // Pages still in the not-indexed queue must never be offered as a source: the
  // whole point is to borrow authority from a page Google has actually indexed.
  const { rankOf } = require('./build-index-panel.cjs');
  const notIndexed = new Set();
  try {
    const insp = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'gsc-inspect-notindexed.json'), 'utf8'));
    for (const r of insp.results || []) {
      const rank = rankOf(r.coverage);
      if (rank !== null && rank < 3) {
        notIndexed.add(String(r.url).replace(/^https?:\/\/[^/]+/, '').replace(/\/$/, '') + '/');
      }
    }
  } catch (e) { /* no snapshot yet: nothing to exclude */ }
  const impressions = (() => {
    try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'gsc-page-impressions.json'), 'utf8')).pages || {}; }
    catch (e) { return {}; }
  })();

  // ---- link graph ----
  const pages = walkHtml(DEPLOY, []);
  const graph = new Map(); // pageUrl -> Set(routes)
  const inbound = new Map(); // route -> Set(pageUrl)
  for (const file of pages) {
    const rel = path.relative(DEPLOY, file).split(path.sep).join('/');
    const pageUrl = rel === 'index.html' ? '/'
      : rel.endsWith('/index.html') ? '/' + rel.slice(0, -'index.html'.length)
        : '/' + rel.replace(/\.html$/, '');
    const links = linksFrom(fs.readFileSync(file, 'utf8'));
    graph.set(pageUrl, links);
    for (const r of links) {
      if (!inbound.has(r)) inbound.set(r, new Set());
      inbound.get(r).add(pageUrl);
    }
  }

  // ---- source pool: indexed pages with real demand ----
  const sources = Object.entries(impressions)
    .map(([p, v]) => ({ path: p.endsWith('/') ? p : p + '/', impressions: v.impressions || 0, position: v.position || 0 }))
    .filter((s) => s.impressions >= 10)
    .sort((a, b) => b.impressions - a.impressions);

  // ---- targets: impressions, no clicks, winnable position ----
  const targets = (opp.rows || [])
    .filter((r) => !/^\/(guides|blog|compare)\b/.test(String(r.path)))
    .filter((r) => (r.impressions || 0) > 0 && (r.clicks || 0) === 0)
    .filter((r) => r.position >= 11 && r.position <= 50)
    .map((r) => {
      const p = String(r.path).endsWith('/') ? String(r.path) : String(r.path) + '/';
      const queries = (r.queries || []).slice().sort((a, b) => (b.impressions || 0) - (a.impressions || 0));
      const already = inbound.get(p) || new Set();
      const picked = pickSources({ path: p }, sources, already, 3, notIndexed);
      return {
        path: p,
        impressions: r.impressions || 0,
        clicks: r.clicks || 0,
        position: Math.round((r.position || 0) * 10) / 10,
        bestQuery: queries[0] ? queries[0].query : '',
        existingInlinks: already.size,
        existingFrom: [...already].slice(0, 5),
        suggestions: picked.map((s) => ({ path: s.path, impressions: s.impressions, anchor: anchorFor(queries[0] ? queries[0].query : '', '') })),
      };
    })
    .sort((a, b) => b.impressions - a.impressions);

  const usablePool = sources.filter((s) => !notIndexed.has(s.path));
  fs.writeFileSync(OUT, JSON.stringify({
    generatedAt: new Date().toISOString(),
    pagesScanned: pages.length,
    sourcePool: sources.length,
    sourcePoolIndexed: usablePool.length,
    notIndexedExcluded: sources.length - usablePool.length,
    targets: targets.length,
    plan: targets,
  }, null, 2) + '\n');

  // ---- report ----
  const L = [];
  L.push('# Link-equity plan');
  L.push('');
  L.push('> Auto-generated by `node scripts/build-link-equity-plan.cjs` from the built `deploy/` link graph.');
  L.push('');
  L.push('Crawl-link gate har page ko *kisi* indexed page se link de deta hai. Lekin jo page impress kar raha hai aur click nahi de raha, usay **strong** page ka link chahiye — is liye yahan har target ke liye same category ke sabse zyada-impressions wale indexed pages suggest kiye gaye hain jo abhi usay link nahi karte.');
  L.push('');
  L.push('| | |');
  L.push('|---|---|');
  L.push('| pages scanned | ' + pages.length + ' |');
  L.push('| source pool (indexed, ≥10 impressions) | ' + usablePool.length + ' |');
  L.push('| withheld from the pool (still not indexed) | ' + (sources.length - usablePool.length) + ' |');
  L.push('| targets (impressions, 0 clicks, pos 11-50) | ' + targets.length + ' |');
  L.push('');
  L.push('## Top targets aur unke liye best sources');
  L.push('');
  for (const t of targets.slice(0, 25)) {
    L.push('### `' + t.path + '` — pos ' + t.position + ', ' + t.impressions + ' impressions, 0 clicks');
    L.push('');
    L.push('- best query: **' + (t.bestQuery || '—') + '**');
    L.push('- existing inlinks: ' + t.existingInlinks + (t.existingFrom.length ? ' (e.g. `' + t.existingFrom.slice(0, 3).join('`, `') + '`)' : ''));
    if (t.suggestions.length) {
      L.push('- suggested sources:');
      for (const s of t.suggestions) L.push('  - `' + s.path + '` (' + s.impressions + ' impressions) — anchor: “' + s.anchor + '”');
    } else {
      L.push('- suggested sources: _same category mein koi bara source available nahi_');
    }
    L.push('');
  }
  L.push('## Kaise istemal karein');
  L.push('');
  L.push('1. Source page ka content kholo aur ek natural jagah par target ka link daalo (related-tools footer ya prose ke andar — dono crawlable hain).');
  L.push('2. Anchor text wahi rakho jo yahan diya hai: wo target ki apni query se bana hai, is liye reader ko wahi words dikhte hain jo usne search kiye the.');
  L.push('3. Ek hafte mein 10-15 links kaafi hain. Sab ek saath karne se ek hi page par 100 links thoos diye jayenge, jo anchor dilution hai.');
  L.push('4. Change karne ke baad `npm run seo:weekly` chalao — plan khud refresh hoga (link graph build ke baad banta hai).');
  L.push('');
  fs.writeFileSync(DOC, L.join('\n'));

  console.log('pages scanned: ' + pages.length + ' · source pool: ' + usablePool.length + ' (withheld ' + (sources.length - usablePool.length) + ' not-indexed) · targets: ' + targets.length);
  console.log('top target: ' + (targets[0] ? targets[0].path + ' (' + targets[0].impressions + ' impr, ' + targets[0].suggestions.length + ' suggestions)' : '—'));
  console.log('report: docs/LINK-EQUITY-PLAN.md · data/link-equity-plan.json');
}

module.exports = { normalizeRoute, linksFrom, anchorFor, pickSources };

if (require.main === module) main();
