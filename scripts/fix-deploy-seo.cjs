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
  return cut.replace(/[\s,\-—:;]+$/, '');
};

function injectOg(html, { title, desc, url }) {
  let out = html;
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
  if (!/name=["']twitter:image["']/.test(out)) {
    out = out.replace('</title>', '</title>\n  <meta name="twitter:image" content="https://calcpromaster.com/og-image.png">');
  }
  return out;
}

function processFile(p, relUrl) {
  let s = fs.readFileSync(p, 'utf8');
  const orig = s;
  let t = decode((s.match(/<title>([^<]*)<\/title>/) || [])[1] || relUrl);
  let d = decode((s.match(/<meta name="description" content="([^"]*)">/) || [])[1] || t);
  const canon = (s.match(/rel="canonical" href="([^"]*)"/) || [])[1] || 'https://calcpromaster.com' + relUrl;
  // 0. clip overlong title (>65) and description (>158 display chars)
  if (t.length > 65) {
    const clipped = clipWords(t, 65);
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
  s = injectOg(s, { title: t, desc: d, url: canon });
  if (s !== orig) { fs.writeFileSync(p, s, 'utf8'); return 1; }
  return 0;
}

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
