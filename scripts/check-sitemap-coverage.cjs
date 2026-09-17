// Verify every sitemap URL resolves to a real static file in deploy/ AND that
// the hard-404 catch-all cannot break any legitimate route.
// Gates:
//   1. Sitemap coverage — every <loc> exists as a deploy file (index.html or
//      a clean-URL rewrite page).
//   2. Redirects contract — deploy/_redirects carries the whitelisted
//      extensionless rewrites (from scripts/route-whitelist.cjs), the final
//      /* /404.html 404 catch-all, and no soft-404 catch-all.
//   3. Whitelist safety — every whitelisted prefix is either a sitemap
//      segment, a known app route, or an i18n locale, and every one-segment
//      sitemap URL is covered by a real file or a prefix rule.
//   4. Locale sync — the whitelist locales equal the non-'en' TRANSLATIONS
//      keys in js/i18n.js (drift fails the build).
//   5. .htaccess parity — the Apache fallback mirrors the same prefix list.
'use strict';
const fs = require('fs');
const path = require('path');
const { CATEGORIES, APP_ROUTES, LOCALES, PREFIXES } = require('./route-whitelist.cjs');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const errors = [];
const warn = (m) => errors.push(m);

// ---------- 1) Sitemap coverage ----------
const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

// Root files that exist as deploy/<name> rather than <name>/index.html
const ROOT_FILES = new Set(['robots.txt', 'sitemap.xml', 'llms.txt', 'ads.txt', 'manifest.json', 'og-image.png', 'og-image.html', 'icon.svg', '0e1100ec6bc9d4c2c6037d993fc2ba55.txt', '404.html', 'auto-404.html']);
// Clean routes served by Netlify rewrite rules (deploy/<name>.html, status 200).
// Nested static pages (guides/) are listed with their subpath so the checker
// looks for deploy/guides/<name>.html.
const REWRITE_PAGES = ['about', 'privacy', 'terms', 'contact', 'disclaimer-general', 'disclaimer-finance', 'disclaimer-health', 'guides/percentage', 'guides/emi', 'guides/age', 'guides/bmi', 'guides/compound-interest', 'guides/mortgage', 'guides/zakat', 'guides/income-tax', 'guides/currency-conversion', 'guides/discount', 'guides/tip', 'guides/gst-sales-tax', 'guides/glossary', 'guides/inflation', 'guides/salary', 'guides/retirement', 'guides/calories', 'guides/debt-payoff', 'guides/random-numbers', 'guides/concrete', 'guides/unit-conversion', 'guides/gpa', 'guides/break-even', 'guides/passwords', 'guides/baby-cost', 'guides/ideal-weight', 'guides/bmr', 'guides/profit-margin', 'guides/ohms-law', 'guides/gear-ratio', 'guides/fuel-cost', 'guides/hourly-rate', 'guides/paint-coverage', 'guides/macro-calculator', 'guides/sip', 'guides/fd-ppf-sip', 'guides/ev-vs-petrol', 'guides/wedding-budget', 'guides/freelance-rate-card', 'guides/screen-time', 'guides/electricity-bill', 'guides/business-days', 'guides/grade-needed', 'guides/room-area', 'guides/ac-size', 'guides/protein-intake', 'guides/loans-mortgages', 'guides/tax-salary', 'guides/health-fitness', 'guides/math-statistics', 'guides/business', 'guides/construction', 'guides/science', 'guides/engineering', 'guides/auto', 'guides/career', 'guides/homegarden', 'guides/family', 'guides/food', 'guides/lifestyle', 'guides/regional', 'guides/everyday', 'guides/utilities', 'blog', 'blog/stacked-discounts', 'blog/how-emi-works', 'blog/bmi-honest-look', 'blog/rule-of-72', 'blog/concrete-patio-math', 'blog/ev-vs-petrol-tco'];

let missing = [];
let covered = 0;
const firstSegments = new Set();
for (const loc of locs) {
  const p = loc.replace('https://calcpromaster.netlify.app', '');
  const clean = p.replace(/^\//, '').replace(/\/$/, '');
  firstSegments.add(clean.split('/')[0]);
  if (clean === '') { covered++; continue; } // homepage = deploy/index.html
  if (ROOT_FILES.has(clean)) {
    if (fs.existsSync(path.join(DEPLOY, clean))) covered++;
    else missing.push(p + ' (root file absent)');
    continue;
  }
  const idx = path.join(DEPLOY, clean, 'index.html');
  if (fs.existsSync(idx)) covered++;
  else if (REWRITE_PAGES.includes(clean) && fs.existsSync(path.join(DEPLOY, clean + '.html'))) covered++;
  else missing.push(p);
}

console.log('sitemap URLs:', locs.length);
console.log('covered by static files:', covered);
console.log('missing static file:', missing.length);
if (missing.length) warn('sitemap URLs without a static file:\n' + missing.slice(0, 30).join('\n'));

// ---------- 2) Redirects contract ----------
const redirectsPath = path.join(DEPLOY, '_redirects');
const redirects = fs.readFileSync(redirectsPath, 'utf8');
const rules = redirects.split('\n')
  .map(l => l.replace(/\r$/, '').trim())
  .filter(l => l && !l.startsWith('#'))
  .map(l => l.split(/\s+/));

// 2a) Final catch-all must be a HARD 404 (soft-404 fallback is gone).
const last = rules[rules.length - 1];
if (!last || last[0] !== '/*' || last[2] !== '404') {
  warn('_redirects must end with "/*  /404.html  404" (hard-404 catch-all); found: ' + (last ? last.join(' ') : 'nothing'));
}
// 2b) The old soft-404 catch-all must be gone.
const softCatch = rules.find(r => r[0] === '/*' && r[2] === '200' && r[1] === '/index.html');
if (softCatch) warn('_redirects still carries the soft-404 catch-all "/* /index.html 200"');
// 2c) Every whitelist prefix must have a /<prefix>/* /index.html 200 rewrite
// (bare /<locale> rewrites are also shipped for every locale — asserted for
// es/hi below so the form stays present without 18 near-duplicate warnings).
const rewriteFroms = new Set(rules.filter(r => r[2] === '200' && r[1] === '/index.html').map(r => r[0]));
for (const prefix of PREFIXES) {
  if (!rewriteFroms.has('/' + prefix + '/*')) {
    warn('_redirects missing SPA rewrite for whitelisted prefix: /' + prefix + '/*');
  }
}
for (const l of ['es', 'hi']) {
  if (!rewriteFroms.has('/' + l)) warn('_redirects missing bare locale rewrite: /' + l);
}
// 2d) SPA rewrites must not reference anything outside the whitelist.
const KNOWN = new Set([...PREFIXES]);
for (const from of rewriteFroms) {
  const seg = from.replace(/^\//, '').replace(/\/\*$/, '');
  if (!KNOWN.has(seg)) {
    warn('_redirects rewrites /' + seg + '/* to the SPA but it is not in scripts/route-whitelist.cjs');
  }
}

// ---------- 3) Whitelist safety ----------
// 3a) Every category prefix must be a sitemap first segment (it routes tools).
const catDir = (d) => fs.existsSync(path.join(DEPLOY, d, 'index.html'));
for (const c of CATEGORIES) {
  if (!firstSegments.has(c) && !catDir(c)) {
    warn('whitelist category "' + c + '" is neither in sitemap.xml nor prerendered in deploy/');
  }
}
for (const r of APP_ROUTES) {
  if (!firstSegments.has(r) && !catDir(r)) {
    warn('whitelist app route "' + r + '" is neither in sitemap.xml nor prerendered in deploy/');
  }
}
// 3b) Every one-segment sitemap URL must exist as a real file/dir in deploy/
// (the 404 catch-all must never eat a sitemap URL).
for (const seg of firstSegments) {
  if (!seg) continue;
  const asFile = fs.existsSync(path.join(DEPLOY, seg))
    || REWRITE_PAGES.some(r => r === seg || r.startsWith(seg + '/'));
  if (!asFile) warn('sitemap first segment "/' + seg + '" has no deploy/ file — the 404 catch-all would serve it');
}

// ---------- 4) Locale sync with js/i18n.js ----------
const i18n = fs.readFileSync(path.join(ROOT, 'js', 'i18n.js'), 'utf8');
const start = i18n.indexOf('TRANSLATIONS');
if (start < 0) {
  warn('could not find TRANSLATIONS in js/i18n.js');
} else {
  const body = i18n.slice(start, start + 4000);
  // Locale keys are 2-5 letter object keys whose block carries a `_name`
  // (every TRANSLATIONS entry has one). Scan the WHOLE file — the object is
  // far larger than any fixed window — with the "m" flag so ^ matches at
  // every line start regardless of LF/CRLF endings (i18n.js has mixed ones).
  const keys = [...i18n.matchAll(/^[\t ]{2,6}([a-z]{2,5}):[\t ]*\{[\s\S]{0,200}?_name:/gm)]
    .map(m => m[1]);
  const nonEn = keys.filter(k => k !== 'en');
  const sortedA = [...nonEn].sort();
  const sortedB = [...LOCALES].sort();
  if (sortedA.join(',') !== sortedB.join(',')) {
    warn('locale drift: js/i18n.js has [' + sortedA.join(',') + '] but scripts/route-whitelist.cjs has [' + sortedB.join(',') + ']');
  }
}

// ---------- 5) .htaccess parity ----------
const htaccessPath = path.join(ROOT, '.htaccess');
if (fs.existsSync(htaccessPath)) {
  const ht = fs.readFileSync(htaccessPath, 'utf8');
  const m = ht.match(/^[\t ]*RewriteCond %\{REQUEST_URI\} \^\ \/?.*$/m)
    || ht.match(/RewriteCond %\{REQUEST_URI\} \^\^?\/\(([^)]+)\)/);
  const groups = ht.match(/RewriteCond %\{REQUEST_URI\} \^\^?\/\(([a-z|]+)\)\(\/\|\$\)/m)
    || ht.match(/RewriteCond %\{REQUEST_URI\} \^\/\(([a-z|]+)\)\(\/\|\$\)/m);
  if (!groups) {
    warn('.htaccess whitelist RewriteCond not found (expected ^/(a|b|...)(/|$))');
  } else {
    const htPrefixes = groups[1].split('|').filter(Boolean).sort();
    const want = [...PREFIXES].sort();
    if (htPrefixes.join(',') !== want.join(',')) {
      const onlyHt = htPrefixes.filter(x => !want.includes(x));
      const onlyMod = want.filter(x => !htPrefixes.includes(x));
      warn('.htaccess prefix drift — only in .htaccess: [' + onlyHt.join(',') + ']; missing: [' + onlyMod.join(',') + ']');
    }
  }
  if (!/ErrorDocument 404 \/404\.html/.test(ht)) {
    warn('.htaccess must map 404 to /404.html (ErrorDocument 404 /404.html)');
  }
}

console.log('');
if (errors.length) {
  console.log('FAILED checks (' + errors.length + '):');
  for (const e of errors) console.log(' - ' + e);
  process.exit(1);
}
console.log('ALL CHECKS PASSED: sitemap coverage + 404-catch-all safety verified.');
process.exit(0);
