#!/usr/bin/env node
/* Topical-mapping audit — does each page's TITLE/DESC/FAQ actually map to its
 * target keyword phrase? Read-only: writes docs/TOPICAL-MAPPING-AUDIT.md.
 *
 * Score per tool (0-100):
 *   title overlap  x0.45   (kw tokens present in <title>)
 *   desc overlap   x0.25   (kw tokens present in metaDesc/desc)
 *   faq overlap    x0.20   (kw tokens present in any FAQ question)
 *   name overlap   x0.10   (kw tokens present in the tool's H1/name)
 * Buckets: STRONG >=70, OK 45-69, WEAK <45.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const STOP = new Set(('the a an of for to in on with and or best free online calculator calculators how what is are does do i my your' +
  ' it that this from by at as per into out up down more less').split(' '));

function tokens(s) {
  return String(s || '').toLowerCase()
    .replace(/\u00b2/g, '2').replace(/\u00b3/g, '3').replace(/\u2070|\u00b9/g, '1') // superscripts: kg/m³ -> kg/m3
    .replace(/&/g, ' and ').replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/).map((t) => {
      if (t.length > 4 && t.endsWith('ing')) t = t.slice(0, -3);      // eating -> eat, cooking -> cook
      else if (t.length > 3 && t.endsWith('ed')) t = t.slice(0, -2);  // invested -> invest
      else if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) t = t.slice(0, -1); // savings -> saving
      return t;
    })
    .filter((t) => t.length >= 2 && !STOP.has(t) && !/^\d+$/.test(t)); // keep fd/rd/ph/m3/q1 (2+ chars)
}

function loadSeo() {
  const src = fs.readFileSync(path.join(ROOT, 'js', 'seo-content.js'), 'utf8');
  const ctx = { window: {}, console };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  const w = ctx.window;
  const m = w.SEO_CONTENT || w.SEO || (w.CALCSEO && w.CALCSEO.content) || null;
  if (m && typeof m === 'object') return m;
  // fall back: eval-style extraction of the object literal
  const mm = /(?:window\.)?SEO(?:_CONTENT)?\s*=\s*/.exec(src);
  if (mm) { try { return vm.runInContext('(' + src.slice(mm.index + mm[0].length).split(/\n\};?/)[0] + '})', ctx); } catch { /* keep trying */ } }
  return null;
}

function loadData() {
  const dir = path.join(ROOT, 'js', 'data');
  const out = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    try {
      const src = fs.readFileSync(path.join(dir, f), 'utf8');
      const ctx = { window: {}, console };
      vm.createContext(ctx);
      vm.runInContext(src, ctx);
      for (const v of Object.values(ctx.window)) if (Array.isArray(v)) out.push(...v.filter((t) => t && t.id));
    } catch { /* skip file */ }
  }
  return out;
}

function overlap(kwTok, text) {
  if (!kwTok.length) return 0;
  const hay = ' ' + tokens(text).join(' ') + ' ';
  let hit = 0;
  for (const t of kwTok) if (hay.includes(' ' + t + ' ')) hit++;
  return hit / kwTok.length;
}

(async () => {
  const seo = loadSeo();
  if (!seo) { console.error('could not load seo-content records'); process.exit(1); }
  const tools = loadData();
  const byId = new Map(tools.map((t) => [t.id, t]));

  const rows = [];
  for (const [id, r] of Object.entries(seo)) {
    const tool = byId.get(id);
    // kw phrases live on the DATA record (tool.kw), not the SEO record
    const kw = tool && Array.isArray(tool.kw) ? tool.kw[0] : (tool && tool.kw) || '';
    const kwTok = tokens(kw);
    const name = tool ? (tool.name || '') : id;
    const title = r.title || '';
    const desc = r.metaDesc || r.desc || '';
    const faqs = (r.faqs || []).map((f) => f.q || f.question || '').join(' ');
    const score = Math.round(100 * (0.45 * overlap(kwTok, title) + 0.25 * overlap(kwTok, desc) +
      0.20 * overlap(kwTok, faqs) + 0.10 * overlap(kwTok, name)));
    rows.push({ id, kw, title, score, kwTok: kwTok.length, cat: tool ? tool.cat : '?' });
  }

  const strong = rows.filter((r) => r.score >= 70);
  const ok = rows.filter((r) => r.score >= 45 && r.score < 70);
  const weak = rows.filter((r) => r.score < 45).sort((a, b) => a.score - b.score);

  // Topic clusters: group by primary kw token
  const clusters = {};
  for (const r of rows) {
    const t = (tokens(r.kw)[0] || '').toLowerCase();
    if (!t) continue;
    (clusters[t] = clusters[t] || []).push(r.id);
  }
  const topClusters = Object.entries(clusters).filter(([, v]) => v.length >= 5)
    .sort((a, b) => b[1].length - a[1].length).slice(0, 15);

  // Duplicate-title check inside clusters (cannibalization already 0, but titles should differ)
  const titleDupes = {};
  for (const r of rows) { const k = (r.title || '').toLowerCase().trim(); if (k) (titleDupes[k] = titleDupes[k] || []).push(r.id); }
  const dupeTitles = Object.entries(titleDupes).filter(([, v]) => v.length > 1);

  const md = [];
  md.push('# Topical Mapping Audit — kw ↔ title ↔ content');
  md.push('');
  md.push('Generated: ' + new Date().toISOString());
  md.push('');
  md.push('Method: for every tool record, its primary keyword phrase is tokenized (stopwords removed) and token-overlap is measured against title (45%), meta description (25%), FAQ questions (20%) and tool name/H1 (10%).');
  md.push('');
  md.push('## Summary');
  md.push('');
  md.push('| Bucket | Tools | Share | Meaning |');
  md.push('|---|---|---|---|');
  md.push('| STRONG (≥70) | ' + strong.length + ' | ' + Math.round(100 * strong.length / rows.length) + '% | title+desc+FAQ map tightly to the kw |');
  md.push('| OK (45–69) | ' + ok.length + ' | ' + Math.round(100 * ok.length / rows.length) + '% | partial mapping — usually FAQ or desc misses |');
  md.push('| WEAK (<45) | ' + weak.length + ' | ' + Math.round(100 * weak.length / rows.length) + '% | page content does not clearly target its kw |');
  md.push('| **Total** | **' + rows.length + '** | 100% | |');
  md.push('');
  md.push('## Topical clusters (topics with ≥5 dedicated tools = topical-authority depth)');
  md.push('');
  md.push('| Topic | Tools | Example IDs |');
  md.push('|---|---|---|');
  for (const [t, ids] of topClusters) md.push('| ' + t + ' | ' + ids.length + ' | ' + ids.slice(0, 3).join(', ') + ' |');
  md.push('');
  md.push('## Duplicate titles (should be 0 — cannibalization guard)');
  md.push('');
  md.push(dupeTitles.length ? dupeTitles.slice(0, 10).map(([t, ids]) => '- "' + t + '" → ' + ids.join(', ')).join('\n') : 'None — every tool has a unique title. ✅');
  md.push('');
  md.push('## WEAK-mapping pages (worst 40 — kw does not appear in title/desc/FAQ enough)');
  md.push('');
  md.push('| Tool | Primary kw | Score | Title |');
  md.push('|---|---|---|---|');
  for (const r of weak.slice(0, 40)) md.push('| ' + r.id + ' | ' + r.kw + ' | ' + r.score + ' | ' + String(r.title).slice(0, 55) + ' |');
  md.push('');
  md.push('## Interpretation');
  md.push('');
  md.push('- WEAK pages are usually tools whose kw phrase uses different wording than the page (e.g. kw "steel weight" vs title "Metal Weight Calculator"). Google still ranks them on semantic similarity, but tightening the title to include the kw\'s core noun is a quick win for the worst ones.');
  md.push('- Clusters with ≥5 tools (listed above) are genuine topical-authority hubs — internal linking between same-cluster tools (already ~3 links/tool from the guide-link build) reinforces them.');
  md.push('- This audit is diagnostic: it does NOT edit data. Fixes should be made in js/seo-content.js records (or via scripts/fix-keyword-phrases.cjs for kw-side issues).');

  fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'docs', 'TOPICAL-MAPPING-AUDIT.md'), md.join('\n'));
  console.log('rows:', rows.length, '| strong:', strong.length, 'ok:', ok.length, 'weak:', weak.length);
  console.log('clusters>=5:', topClusters.length, '| dupe titles:', dupeTitles.length);
  console.log('worst 5:', weak.slice(0, 5).map((r) => r.id + '(' + r.score + ')').join(' '));
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
