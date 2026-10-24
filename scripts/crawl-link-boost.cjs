#!/usr/bin/env node
// ============================================================
// CalcProMaster — Crawl-link boost (post-build, idempotent, relevance-based)
// ------------------------------------------------------------
// Google ~375 pages index karta hai, ~784 "Discovered / Unknown" pade hain.
// Discovery missing nahi (sab ke >2 inlinks hain) — inlinks un pages se aa
// rahe hain jinhe Google khud index nahi karta. Iss script ka kaam: har
// NOT-INDEXED page ko ek **INDEXED** page se link karna, aur source chunte
// waqt:
//   1. RELEVANCE  — jis source ke title/topic mein target se zyada words
//                   match hote hain (same-category ke andar) use prefer karo
//   2. PRIORITY   — jis source ko GSC real impressions deta hai use prefer karo
//                   (data/gsc-page-impressions.json; optional)
//   3. BALANCE    — per-source cap + "already linked" skip
//
// White-hat: sirf related calculators ka ek chhota block, jo asli user
// click karega — koi hidden/stuffed link nahi.
// Idempotent: har run apna purana block hata kar naya likhta hai.
//
// Input:  data/gsc-coverage-report.json          (INDEXED / DISCOVERED+UNKNOWN)
//         data/gsc-page-impressions.json         (optional — source priority)
// Output: deploy pages mein block + data/crawl-link-boost.json
// Usage:  node scripts/crawl-link-boost.cjs
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const REPORT = path.join(ROOT, 'data', 'gsc-coverage-report.json');
const IMPRESSIONS = path.join(ROOT, 'data', 'gsc-page-impressions.json');
const OUT_JSON = path.join(ROOT, 'data', 'crawl-link-boost.json');
const MAX_LINKS_PER_SOURCE = 12;
const MARK_START = '<!-- crawl-boost:start -->';
const MARK_END = '<!-- crawl-boost:end -->';

const CAT_NAME = {
  finance: 'Finance', health: 'Health', math: 'Math', everyday: 'Everyday', science: 'Science',
  engineering: 'Engineering', construction: 'Construction', conversion: 'Conversion', business: 'Business',
  education: 'Education', utilities: 'Utilities', lifestyle: 'Lifestyle', regional: 'Regional',
  food: 'Food & Nutrition', fitness: 'Fitness', auto: 'Auto & Transport', career: 'Career',
  homegarden: 'Home & Garden', tech: 'Tech & Digital', family: 'Family',
};

const STOP = new Set(['calculator', 'calculators', 'the', 'and', 'for', 'with', 'your', 'how', 'what', 'online', 'free', 'best', 'using', 'based', 'guide', 'find']);

// ---------- url helpers ----------
function stripSlash(u) { return u.replace(/\/+$/, ''); }
function servedHref(u) {
  const s = stripSlash(u);
  if (s.startsWith('/guides/') || s.startsWith('/blog/')) return s;
  return s + '/';
}
function fileFor(u) {
  const s = stripSlash(u);
  if (s.startsWith('/guides/')) return path.join(DEPLOY, 'guides', s.slice(8) + '.html');
  if (s.startsWith('/blog/')) return path.join(DEPLOY, 'blog', s.slice(6) + '.html');
  const m = s.match(/^\/([a-z0-9-]+)\/([a-z0-9-]+)$/);
  if (m) return path.join(DEPLOY, m[1], m[2], 'index.html');
  return null;
}
function categoryOf(u) {
  const s = stripSlash(u);
  if (s.startsWith('/guides/') || s.startsWith('/blog/')) return 'content';
  const m = s.match(/^\/([a-z0-9-]+)\//);
  return m ? m[1] : 'content';
}
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function h1Of(html) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return null;
  const text = m[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&mdash;/g, '—').replace(/\s+/g, ' ').trim();
  return text || null;
}
function labelOfHtml(html) {
  const t = h1Of(html);
  if (!t) return null;
  return t.length > 60 ? t.slice(0, 57).trimEnd() + '…' : t;
}
function tokensOf(text) {
  const out = new Set();
  for (const w of String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(/\s+/)) {
    if (w.length > 2 && !STOP.has(w)) out.add(w);
  }
  return out;
}
function similarity(a, b) {
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n;
}
function stripExisting(html) {
  const s = MARK_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const e = MARK_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(new RegExp(s + '[\\s\\S]*?' + e, 'g'), '');
}

function main() {
  if (!fs.existsSync(REPORT)) {
    console.error('✖ data/gsc-coverage-report.json nahi mila — pehle gsc-aggregate-coverage.cjs chalao.');
    process.exit(1);
  }
  const rep = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
  const indexedUrls = (rep.lists.INDEXED || []).map((r) => r.url);
  const targetUrls = [...(rep.lists.DISCOVERED || []), ...(rep.lists.UNKNOWN || [])].map((r) => r.url);

  // Optional impressions map (source priority). Keyed by normalized path.
  let impr = {};
  if (fs.existsSync(IMPRESSIONS)) {
    try { impr = JSON.parse(fs.readFileSync(IMPRESSIONS, 'utf8')).pages || {}; } catch (e) { impr = {}; }
  }

  function toRecords(urls) {
    const out = [];
    for (const u of urls) {
      const file = fileFor(u);
      if (!file || !fs.existsSync(file)) continue;
      out.push({ url: u, href: servedHref(u), file, cat: categoryOf(u) });
    }
    return out;
  }
  const seenS = new Set();
  const sources = toRecords(indexedUrls).filter((s) => { if (seenS.has(s.href)) return false; seenS.add(s.href); return true; });
  const seenT = new Set();
  const targets = toRecords(targetUrls).filter((t) => { if (seenT.has(t.href)) return false; seenT.add(t.href); return true; });

  // Load source HTML once; derive label/tokens/impressions/capacity.
  const srcHtml = new Map();
  for (const s of sources) {
    s.html = stripExisting(fs.readFileSync(s.file, 'utf8'));
    srcHtml.set(s.file, s.html);
    s.label = labelOfHtml(s.html) || stripSlash(s.href).split('/').pop();
    s.tokens = tokensOf(s.label);
    s.impr = (impr[stripSlash(s.href)] || {}).impressions || 0;
    s.count = 0;
    s.links = [];
  }
  for (const t of targets) {
    const html = fs.readFileSync(t.file, 'utf8');
    t.label = labelOfHtml(html) || stripSlash(t.href).split('/').pop();
    t.tokens = tokensOf(t.label);
  }

  const leftovers = [];
  let added = 0, simHits = 0;

  function tryPlace(src, tgt, heading) {
    if (srcHtml.get(src.file).includes('href="' + tgt.href + '"')) return 'already';
    if (src.links.some((l) => l.href === tgt.href)) return 'already';
    if (src.count >= MAX_LINKS_PER_SOURCE) return 'full';
    src.links.push({ href: tgt.href, label: tgt.label, heading });
    src.count++;
    added++;
    return 'ok';
  }

  // Rank a pool for a target: relevance first, then source impressions, then balance.
  function distribute(list, pool, headingFn) {
    if (!pool.length) { for (const t of list) leftovers.push(t); return; }
    for (const tgt of list) {
      // Precompute scores once per target.
      const scored = pool.map((s) => {
        const sim = similarity(tgt.tokens, s.tokens);
        return { s, sim, score: sim * 1000 + Math.min(s.impr, 400) - s.count * 45 };
      }).sort((a, b) => b.score - a.score || a.s.href.localeCompare(b.s.href));
      let done = false;
      for (const c of scored) {
        const r = tryPlace(c.s, tgt, headingFn(tgt));
        if (r === 'ok') { if (c.sim > 0) simHits++; done = true; break; }
        if (r === 'already') { done = true; break; }
        // 'full' → try next candidate
      }
      if (!done) leftovers.push(tgt);
    }
  }

  const srcByCat = {};
  for (const s of sources) (srcByCat[s.cat] = srcByCat[s.cat] || []).push(s);
  const globalPool = sources.slice().sort((a, b) => (b.impr - a.impr) || a.href.localeCompare(b.href));

  const toolTargets = targets.filter((t) => t.cat !== 'content');
  const contentTargets = targets.filter((t) => t.cat === 'content');
  const byCatTargets = {};
  for (const t of toolTargets) (byCatTargets[t.cat] = byCatTargets[t.cat] || []).push(t);

  const catReport = {};
  for (const cat of Object.keys(byCatTargets).sort()) {
    const list = byCatTargets[cat];
    const heading = () => 'More ' + (CAT_NAME[cat] || cat) + ' Calculators';
    const pool = srcByCat[cat];
    if (pool && pool.length) {
      distribute(list, pool, heading);
      catReport[cat] = { targets: list.length, sources: pool.length, pool: 'same-category' };
    } else {
      distribute(list, globalPool, heading);
      catReport[cat] = { targets: list.length, sources: globalPool.length, pool: 'global-fallback' };
    }
  }
  distribute(contentTargets, globalPool, (t) => (t.href.startsWith('/blog/') ? 'Related reading' : 'Related guides'));

  // ---------- write ----------
  let pagesTouched = 0;
  for (const s of sources) {
    if (!s.links.length) continue;
    const groups = new Map();
    for (const l of s.links) {
      if (!groups.has(l.heading)) groups.set(l.heading, []);
      groups.get(l.heading).push(l);
    }
    let block = MARK_START + '\n';
    for (const [heading, items] of groups) {
      block += '<div class="related-section crawl-boost"><h3>' + esc(heading) + '</h3><div class="related-grid">';
      for (const it of items) block += '<a class="related-card" href="' + it.href + '">' + esc(it.label) + '</a>';
      block += '</div></div>\n';
    }
    block += MARK_END;

    const html = srcHtml.get(s.file);
    let out;
    if (html.includes('</main>')) out = html.replace('</main>', block + '\n</main>');
    else if (html.includes('</body>')) out = html.replace('</body>', block + '\n</body>');
    else { console.warn('  ! no anchor in ' + s.file + ' — skipped'); continue; }
    fs.writeFileSync(s.file, out);
    pagesTouched++;
  }

  const hasImpr = fs.existsSync(IMPRESSIONS);
  const report = {
    ranAt: new Date().toISOString(),
    sources: sources.length,
    targets: targets.length,
    linksAdded: added,
    relevanceMatched: simHits,
    pagesTouched,
    leftoverTargets: leftovers.length,
    maxLinksPerSource: MAX_LINKS_PER_SOURCE,
    impressionsFile: hasImpr ? path.basename(IMPRESSIONS) : null,
    byCategory: catReport,
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));

  console.log('=== Crawl-link boost (relevance-based) ===');
  console.log('Sources (INDEXED):      ' + sources.length + (hasImpr ? '  (impressions priority: yes)' : '  (impressions priority: no)'));
  console.log('Targets (not indexed):  ' + targets.length);
  console.log('Links added:            ' + added);
  console.log('  relevance-matched:    ' + simHits + ' (' + Math.round((simHits / Math.max(added, 1)) * 100) + '%)');
  console.log('Source pages touched:   ' + pagesTouched);
  console.log('Leftover targets:       ' + leftovers.length + (leftovers.length ? ' → ' + leftovers.slice(0, 5).map((t) => t.href).join(', ') : ''));
  console.log('💾 data/crawl-link-boost.json');
}
main();
