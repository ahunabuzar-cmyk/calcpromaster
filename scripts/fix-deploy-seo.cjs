#!/usr/bin/env node
// Build-time SEO fixer, run by build-deploy.js AFTER copyTree + SSG +
// substituteDomain (operates on deploy/). Idempotent. Fixes:
//   1. Junk utility pages (qa-dashboard, og-image) get noindex meta.
//   2. guides/*.html + blog/*.html missing og:title/og:description/og:url/
//      og:image/twitter:card/twitter:image get them injected (title,
//      description, canonical se derived).
//   3. Root legal/*.html (about, privacy, terms, contact, disclaimers,
//      editorial-policy, cookies) same OG injection.
//   4. generate-static-pages.cjs footer text: 1206+ → js/seo-content.js count.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const DESC_MAX = 158;
// Freshness stamp shared by the JSON-LD block and the visible line below.
const CONTENT_DATE = process.env.BUILD_DATE || new Date().toISOString().slice(0, 10);
const CONTENT_MONTH = new Date(CONTENT_DATE + 'T00:00:00Z').toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const SITE = 'https://calcpromaster.com';

function countPlus() {
  // REAL count: require every js/data/*.js and sum tool arrays (same as
  // scripts/sync-counts.cjs registryCount()). No regex guessing.
  try {
    const dir = path.join(ROOT, 'js', 'data');
    let total = 0;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
      const mod = require(path.join(dir, f));
      if (Array.isArray(mod)) total += mod.length;
    }
    return total + '+';
  } catch (e) { return '1216+'; }
}
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const escAttr = (s) => decode(String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const clipWords = (s, max) => {
  if (!s || s.length <= max) return s;
  let cut = s.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  if (sp > max * 0.6) cut = cut.slice(0, sp);
  cut = cut.replace(/[\s,\-—:;]+$/, '');
  // A clip that lands on a conjunction leaves a dangling fragment — the live
  // /guides/bmr title ended "…Worked Example &" for weeks. Drop the connector
  // (and any separator after it) so the clipped title reads as a whole phrase.
  return cut.replace(/[\s,\-—:;]*(?:&|and|or|with|for|to)[\s,\-—:;]*$/i, '');
};

function injectOg(html, { title, desc, url, type }) {
  let out = html;
  // og:type is required by every Open Graph consumer and was the one tag the
  // injector never wrote — Ahrefs reported "Open Graph tags incomplete" on all
  // 61 injected pages for this single missing property.
  if (!/property=["']og:type["']/.test(out)) {
    out = out.replace('</title>', '</title>\n  <meta property="og:type" content="' + (type || 'website') + '">');
  }
  if (!/property=["']og:site_name["']/.test(out)) {
    out = out.replace('</title>', '</title>\n  <meta property="og:site_name" content="CalcProMaster">');
  }
  if (!/property=["']og:title["']/.test(out)) {
    out = out.replace('</title>', '</title>\n  <meta property="og:title" content="' + escAttr(title) + '">');
  }
  if (!/property=["']og:description["']/.test(out)) {
    const d = clipWords(decode(desc), DESC_MAX);
    out = out.replace('</title>', '</title>\n  <meta property="og:description" content="' + escAttr(d) + '">');
  }
  if (!/property=["']og:url["']/.test(out)) {
    out = out.replace('</title>', '</title>\n  <meta property="og:url" content="' + escAttr(url) + '">');
  }
  if (!/property=["']og:image["']/.test(out)) {
    out = out.replace('</title>', '</title>\n  <meta property="og:image" content="https://calcpromaster.com/og-image.png">');
  }
  if (!/name=["']twitter:card["']/.test(out)) {
    out = out.replace('</title>', '</title>\n  <meta name="twitter:card" content="summary_large_image">');
  }
  // A card is only "complete" with title + description too (Sitechecker flags
  // card+image alone). Insert right after twitter:card when absent.
  if (!/name=["']twitter:title["']/.test(out)) {
    const tt = escAttr(clipWords(decode(title), 70));
    // Function replacer, NOT '$1' + content: a title or description containing
    // "$1" (e.g. "15% is $12.60" → "$1") would otherwise be expanded as a
    // capture-group reference. That shipped a corrupted twitter:description on
    // /guides/tip with a whole <meta> tag nested inside the content attribute.
    out = out.replace(/(<meta name="twitter:card" content="[^"]*">)/, (m) => m + '\n  <meta name="twitter:title" content="' + tt + '">');
  }
  if (!/name=["']twitter:description["']/.test(out)) {
    const td = escAttr(clipWords(decode(desc), DESC_MAX));
    out = out.replace(/(<meta name="twitter:title" content="[^"]*">)/, (m) => m + '\n  <meta name="twitter:description" content="' + td + '">');
  }
  if (!/name=["']twitter:image["']/.test(out)) {
    out = out.replace('</title>', '</title>\n  <meta name="twitter:image" content="https://calcpromaster.com/og-image.png">');
  }
  return out;
}

function processFile(p, relUrl) {
  // Windows path.relative() returns backslashes. They used to leak into the
  // canonical/JSON-LD URL as "https://…/auto\index", which is invalid JSON
  // (\i is a bad escape) and an invalid URL — that single leak produced every
  // "schema.org validation error" row on category/blog/static pages.
  relUrl = String(relUrl).replace(/\\/g, '/');
  let s = fs.readFileSync(p, 'utf8');
  const orig = s;
  let t = decode((s.match(/<title>([^<]*)<\/title>/) || [])[1] || relUrl);
  let d = decode((s.match(/<meta name="description" content="([^"]*)">/) || [])[1] || t);
  const canon = (s.match(/rel="canonical" href="([^"]*)"/) || [])[1] || 'https://calcpromaster.com' + relUrl;
  // 0. clip overlong title (>60, matching the title-length gate) and description (>158 display chars)
  if (t.length > 60) {
    const clipped = clipWords(t, 60);
    if (clipped && clipped !== t) s = s.replace(/<title>[^<]*<\/title>/, '<title>' + escAttr(clipped) + '</title>');
  }
  if (d.length > 158) {
    const clipped = clipWords(d, 158) + '\u2026';
    if (/<meta name="description" content="[^"]*">/.test(s)) {
      s = s.replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="' + escAttr(clipped) + '">');
    }
  }
  // 1. junk noindex
  if (/qa-dashboard|og-image\.html/.test(p) && !/name="robots" content="noindex/.test(s)) {
    if (/<meta name="robots" content="[^"]*">/.test(s)) {
      s = s.replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex, follow">');
    } else {
      s = s.replace('</title>', '</title>\n  <meta name="robots" content="noindex, follow">');
    }
  }
  // 2. OG injection
  s = injectOg(s, { title: t, desc: d, url: canon, type: /^(blog|guides)[/\\]/i.test(relUrl) ? 'article' : 'website' });
  if (s !== orig) { fs.writeFileSync(p, s, 'utf8'); return 1; }
  return 0;
}

// ============================================================
// Full-head normalizer for EVERY indexable deployed page.
// ------------------------------------------------------------
// SSG pages get title/desc/canonical/keywords/dates from rewriteHead(); the
// ~100 hand-authored pages (about, legal, blog posts, guides) and the category
// landings only got some of them. An external audit measured the remainder as
// short descriptions with no CTA, no keywords meta and no machine-readable
// date. This pass closes those four gaps in ONE place so a new static page or
// category cannot be added without picking them up. Idempotent: every branch
// checks what is already there before writing.
// ============================================================
// Slug -> readable phrase ("concrete-patio-math" -> "concrete patio math"),
// skipping the index.html wrapper of directory pages.
function slugPhrase(rel) {
  const parts = rel.split(/[/\\]/).filter((x) => x && x !== 'index.html');
  const base = parts[parts.length - 1] || '';
  return base.replace(/\.html$/, '').replace(/[-_]+/g, ' ').replace(/^the /i, '').trim();
}

function deriveKeywords(title, rel) {
  const clean = decode(String(title || '')).split(/\s*(?:—|–|\||:)\s*/)[0].trim().replace(/^the\s+/i, '');
  const primary = clean.toLowerCase().replace(/[^a-z0-9\s'-]/g, '').replace(/\s+/g, ' ').trim();
  const isArticle = /^(blog|guides)[/\\]/i.test(rel);
  const isLegal = /^(about|privacy|terms|contact|cookies|editorial-policy|disclaimer)/i.test(rel);
  const list = [];
  const push = (k) => { const v = String(k || '').trim(); if (v && v.length > 2 && !list.includes(v)) list.push(v); };
  push(primary);
  if (isArticle || isLegal) {
    // An article about a 4-inch concrete mistake should not claim a
    // "the 4-inch mistake calculator" keyword — that reads like spam, and a
    // policy page is not a calculator either. Use the page's own head term plus
    // its URL phrase instead of calculator variants.
    push(slugPhrase(rel));
    if (list.length < 2) push(primary + ' explained');
  } else {
    if (/\bcalculators?\b/.test(primary)) push(primary.replace(/\bcalculators?\b\s*$/, '').trim());
    else push(primary + ' calculator');
    push('free online calculator');
    push('step by step calculator');
  }
  const out = [];
  for (const k of list) { if ((out.join(', ') + ', ' + k).length > 180) break; out.push(k); }
  return out.join(', ');
}

// Trim a cut description back to something that reads finished: drop dangling
// conjunctions/prepositions, prefer the last full sentence, else close with a
// period. Clip alone produced "...how activity. Read the full breakdown." and
// "...and the" — both live in production before this helper existed.
const DANGLING = /\s+(and|or|but|the|a|an|of|to|with|for|in|on|at|by|from|that|which|how|why|is|are|was|were|be|it|this|these|those|your|their|as|than|when|while|because|using|showing|between|into|about|such|per|via|versus|vs|if|so|then|like|including|plus|within|without|over|under|across|through|after|before|during|both|all|any|each|more|most|less|least|own|every|not|no|only|just|show|shows|explain|explains|cover|covers|include|includes|give|gives|tell|tells|make|makes|work|works|help|helps|need|needs|keep|keeps|turn|turns|set|sets|build|builds|drive|drives|save|saves)$/i;
// clipWords measures RAW characters while the SERP budget is measured on the
// ESCAPED string, where one "&" costs five characters. Shrinking by the escaped
// overflow keeps every cut inside the budget, which is what lets the CTA fit
// afterwards instead of being dropped by the fallback.
function fitEsc(v, max) {
  let out = String(v);
  for (let i = 0; i < 24 && escAttr(out).length > max && out.length > 20; i++) {
    const over = escAttr(out).length - max;
    out = clipWords(out, Math.max(20, out.length - over - 1)).replace(/[\s,;:—–\-]+$/, '');
  }
  return out;
}

function finishDesc(s, max) {
  let v = String(s).replace(/\s+/g, ' ').trim();
  if (escAttr(v).length <= max) return v;
  let cut = fitEsc(v, max - 1);
  for (let i = 0; i < 6 && DANGLING.test(cut); i++) cut = cut.replace(DANGLING, '');
  // Prefer the last COMPLETE sentence that still fits — a clipped clause such as
  // "the honest limitations of BMI as" or "example showing why childcare" reads
  // broken even though it ends in a period.
  const sentenceEnd = cut.lastIndexOf('. ');
  if (sentenceEnd >= Math.max(70, Math.round(max * 0.5))) return cut.slice(0, sentenceEnd + 1).trim();
  // Fall back to the last clause break rather than clipping inside a clause:
  // "...a worked $4,500–$20,000 example showing why childcare" is grammatical
  // nonsense, while the clause before the comma reads complete.
  // Only take the clause break when it keeps most of the budget: cutting at a
  // comma near the start turned a 168-char hub description into 63 characters.
  const comma = cut.lastIndexOf(',');
  if (comma >= Math.max(70, Math.round(max * 0.72))) cut = cut.slice(0, comma);
  const out = cut.replace(/[\s,;:—–\-]+$/, '') + '.';
  if (escAttr(out).length <= max) return out;
  return fitEsc(out, max).replace(/[\s,;:—–\-]+$/, '');
}

const CTA_RE = /\b(try|start|calculate|get|see|check|compare|use|explore|find|compute|estimate|read|learn)\b/i;

function normalizeHead(p, rel) {
  // Same Windows-path normalisation as processFile(): without it isDir is
  // false for every directory page, so the served path became "/auto\index"
  // and its canonical/WebPage url was wrong.
  rel = String(rel).replace(/\\/g, '/');
  if (/^google[0-9a-z]+\.html$/i.test(rel) || rel === '404.html') return 0;
  let s = fs.readFileSync(p, 'utf8');
  const orig = s;
  // Only indexable pages are worth normalizing; long-tail noindex variants and
  // embed widgets consolidate elsewhere and must not be touched.
  if (/name="robots" content="noindex/.test(s)) return 0;

  const isDir = rel === 'index.html' || rel.endsWith('/index.html');
  const served = isDir
    ? (rel === 'index.html' ? '/' : '/' + rel.replace(/\/index\.html$/, '/'))
    : '/' + rel.replace(/\.html$/, '');
  const canon = SITE + served;

  const rawTitle = (s.match(/<title>([^<]*)<\/title>/) || [])[1] || served;
  const title = decode(rawTitle);
  let desc = decode((s.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  if (!desc) desc = title;

  const primary = title.split(/\s*(?:—|–|\||:)\s*/)[0].trim();
  const primaryLower = primary.toLowerCase().replace(/^the\s+/, '');
  const isArticle = /^(blog|guides)[/\\]/i.test(rel);
  const isLegal = /^(about|privacy|terms|contact|cookies|editorial-policy|disclaimer)/i.test(rel);

  // 1. Description: 110-158 DISPLAY chars, ends on an action.
  //    Order matters: pad first, then reserve room for the CTA, then fit. The
  //    old order appended the CTA and clipped afterwards, so on a 155-char
  //    description the CTA itself was cut off — the audit kept reporting "no
  //    call to action" on exactly the pages that had just been given one.
  const escLen = (v) => escAttr(v).length;
  // CTA presence is decided on the ORIGINAL text. The padding sentence used to
  // contain the word "see", so a 108-char description tested as "has a CTA", got
  // padded, then the fit pass cut the pad away again and left a description with
  // no call to action at all.
  if (desc.length < 110) {
    // Informational sentence only — no action verb — so the CTA below is honest.
    desc = (desc.replace(/[\s.]+$/, '') + '. It shows the formula and every step behind the result.').trim();
  }
  // Fit FIRST, then ask whether the fitted text still has an action. The check
  // used to run on the raw text: guides/ideal-weight.html carried "how to read
  // your own result" at char 150, passed the check, and the fit then dropped that
  // clause — shipping a description with no call to action while the code thought
  // it had one.
  desc = finishDesc(desc, DESC_MAX);
  // A description can contain an action verb and still be too short to fill a
  // snippet: trimming to the first sentence left 91 characters on
  // /auto/trade-in-value. Append the CTA whenever the text is under the 100-char
  // floor the head audit enforces, not only when no verb is present.
  if (!CTA_RE.test(desc) || desc.length < 100) {
    // Articles read, policy pages are read, tools are tried — three CTAs that
    // match the page instead of one boilerplate line on 163 different pages.
    // Rotate the tail. One CTA on 1,178 pages is the boilerplate shape Google
    // rewrites; the hash keeps the choice stable across rebuilds.
    const TOOL_CTAS = [
      'Try it free, no sign-up.',
      'Start with the defaults and compare.',
      'See the result and every step.',
      'Check your own numbers in the browser.',
      'Use it free, no account needed.',
      'Explore the assumed values beside the result.'
    ];
    let h = 5381;
    for (let i = 0; i < rel.length; i++) h = ((h << 5) + h + rel.charCodeAt(i)) | 0;
    const cta = isArticle ? 'Read the full breakdown.'
      : isLegal ? 'See the full details.'
      : TOOL_CTAS[Math.abs(h) % TOOL_CTAS.length];
    // Reserve the CTA's room BEFORE fitting the body, then rebuild the whole
    // string and only fall back when the CTA genuinely cannot fit. The old
    // order appended first and re-fit afterwards, which chopped the CTA and
    // left mid-sentence fragments in the live descriptions.
    const bodyMax = Math.max(90, DESC_MAX - escLen(' ' + cta) - 1);
    let body = finishDesc(desc, bodyMax).replace(/[\s.!?]+$/, '');
    let combined = body + '. ' + cta;
    // Only extend when the pair still misses the 100-char floor the head audit
    // enforces. Doing it unconditionally replaced a clean 75-char sentence with
    // a mid-clause clip ("…with bag. Read the full breakdown.").
    if (escLen(combined) < 100) {
      body = clipWords(desc, bodyMax).replace(/[\s,;:—–\-]+$/, '').replace(/[\s.!?]+$/, '');
      combined = body + '. ' + cta;
    }
    desc = escLen(combined) <= DESC_MAX ? combined : finishDesc(combined, DESC_MAX);
  }
  // Final fit on the ESCAPED length: ' and " expand to &#39;/&quot; in the HTML,
  // which is what pushed a 155-char description over the 160-char limit.
  desc = finishDesc(desc, DESC_MAX);
  if (/<meta name="description" content="[^"]*"/.test(s)) {
    s = s.replace(/<meta name="description" content="[^"]*"/, '<meta name="description" content="' + escAttr(desc) + '"');
  }

  // 2. Per-page keywords (hand-authored pages shipped none at all).
  const kw = (s.match(/<meta name="keywords" content="([^"]*)"/) || [])[1] || '';
  if (!kw || kw.length < 10) {
    const derived = escAttr(deriveKeywords(title, rel));
    if (kw) s = s.replace(/<meta name="keywords" content="[^"]*"/, '<meta name="keywords" content="' + derived + '"');
    else s = s.replace('</title>', '</title>\n  <meta name="keywords" content="' + derived + '">');
  }

  // 2b. Social tags on EVERY indexable page, not just guides/blog/legal/hub.
  //     changelog, stats, graph, geometry-lab, compare and 404 shipped with no
  //     Open Graph or Twitter tags at all, which is what the "tags missing"
  //     rows in the crawl pointed at.
  s = injectOg(s, {
    title: title,
    desc: desc,
    url: canon,
    type: isArticle ? 'article' : 'website'
  });

  // 3. Structured data: every WebPage node must carry the properties validators
  //    require. The old code appended a bare {"@type":"WebPage","url":…} block
  //    whenever a page had no dateModified — that block has no `name`, which is
  //    what third-party crawlers counted as invalid structured-data items (and
  //    it duplicated the WebPage entity those pages already had). Normalize the
  //    nodes that exist instead: fill name/description/dateModified in place,
  //    and only inject a block when the page has no WebPage node at all.
  let hasWebPage = false;
  s = s.replace(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi, (full, json) => {
    let data;
    try { data = JSON.parse(json); } catch (e) { return full; }
    let touched = false;
    const visit = (node) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach(visit); return; }
      const types = Array.isArray(node['@type']) ? node['@type'] : (node['@type'] ? [node['@type']] : []);
      if (types.includes('WebPage')) {
        hasWebPage = true;
        if (!node.name) { node.name = title; touched = true; }
        if (!node.description && desc) { node.description = clipWords(desc, DESC_MAX); touched = true; }
        if (!node.dateModified) { node.dateModified = CONTENT_DATE; touched = true; }
        if (!node.datePublished) { node.datePublished = '2025-01-15'; touched = true; }
      }
      for (const [k, v] of Object.entries(node)) {
        if (k !== '@context' && v && typeof v === 'object') visit(v);
      }
    };
    visit(data);
    return touched ? '<script type="application/ld+json">' + JSON.stringify(data) + '</script>' : full;
  });
  if (!hasWebPage) {
    const block = '<script type="application/ld+json">' + JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description: clipWords(desc, DESC_MAX),
      url: canon,
      datePublished: '2025-01-15',
      dateModified: CONTENT_DATE,
      inLanguage: 'en'
    }) + '</script>';
    s = s.replace('</head>', block + '\n</head>');
  }

  // 4. Visible date — same wording as the SSG pages so the two never diverge.
  if (!/<time datetime=/.test(s)) {
    const stamp = '<p class="tool-reviewed">Last updated <time datetime="' + CONTENT_DATE + '">' + CONTENT_MONTH + '</time></p>';
    const main = s.lastIndexOf('</main>');
    if (main !== -1) s = s.slice(0, main) + stamp + '\n  ' + s.slice(main);
    else s = s.replace('</body>', stamp + '\n</body>');
  }

  if (s !== orig) { fs.writeFileSync(p, s, 'utf8'); return 1; }
  return 0;
}

function walkHtml(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const q = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'og' && e.name !== 'icons' && e.name !== 'fonts') walkHtml(q, out); }
    else if (e.name.endsWith('.html')) out.push(q);
  }
  return out;
}

let normalized = 0;
for (const f of walkHtml(DEPLOY, [])) {
  normalized += normalizeHead(f, path.relative(DEPLOY, f));
}
console.log('fix-deploy-seo: head normalized on ' + normalized + ' pages');

let changed = 0;
// --- guides + blog (deploy copies .html → serves via pretty URLs) ---
for (const d of ['guides', 'blog']) {
  const dir = path.join(DEPLOY, d);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.html')) continue;
    const url = '/' + d + '/' + f.replace(/\.html$/, '');
    changed += processFile(path.join(dir, f), url);
  }
}
// --- root legal pages ---
const LEGAL = ['about', 'privacy', 'terms', 'contact', 'disclaimer-general', 'disclaimer-finance', 'disclaimer-health', 'editorial-policy', 'cookies'];
for (const slug of LEGAL) {
  const p = path.join(DEPLOY, slug + '.html');
  if (fs.existsSync(p)) changed += processFile(p, '/' + slug);
}
// --- hub pages (descs from CATEGORY_META can exceed 158) ---
const hubDir = path.join(DEPLOY, 'hub');
if (fs.existsSync(hubDir)) {
  for (const cat of fs.readdirSync(hubDir)) {
    const p = path.join(hubDir, cat, 'index.html');
    if (fs.existsSync(p)) changed += processFile(p, '/hub/' + cat);
  }
}
// --- embed landing page (in sitemap; widget pages stay untouched/noindex) ---
const embedIdx = path.join(DEPLOY, 'embed', 'index.html');
if (fs.existsSync(embedIdx)) changed += processFile(embedIdx, '/embed');
console.log('fix-deploy-seo: ' + changed + ' pages updated');

// --- generate-static-pages.cjs footer count sync ---
try {
  const sp = path.join(ROOT, 'scripts', 'generate-static-pages.cjs');
  let gs = fs.readFileSync(sp, 'utf8');
  const cnt = countPlus();
  const m = gs.match(/(\d{3,4})\+ free online calculators/);
  if (m && m[1] + '+' !== cnt) {
    gs = gs.replace(/(\d{3,4})\+ free online calculators/, cnt + ' free online calculators');
    fs.writeFileSync(sp, gs, 'utf8');
    console.log('generate-static-pages footer → ' + cnt);
  }
} catch (e) { /* non-fatal */ }
