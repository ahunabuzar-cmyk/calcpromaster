// Patch standalone static HTML pages with canonical + description + OG + JSON-LD.
// These pages (/about, /privacy, etc.) are served as static HTML for crawlers,
// but currently lack the SEO meta the SPA pages get dynamically.
// Idempotent: skips files that already carry the canonical link.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DOMAIN = 'calcpromaster.netlify.app'; // matches js/site-config.js (owner swaps on custom domain)
const ORIGIN = 'https://' + DOMAIN;

const PAGES = [
  { file: 'about.html', slug: 'about', title: 'About CalcProMaster | CalcProMaster', desc: 'CalcProMaster is a free online platform with 1206+ calculators across finance, health, math, science, construction, conversion, education and everyday life. No sign-ups, step-by-step solutions.' },
  { file: 'contact.html', slug: 'contact', title: 'Contact CalcProMaster | CalcProMaster', desc: 'Contact CalcProMaster — send feedback, suggestions or bug reports about our 1206+ free online calculators.' },
  { file: 'cookies.html', slug: 'cookies', title: 'Cookie Policy | CalcProMaster', desc: 'Cookie Policy for CalcProMaster — how optional consent-gated analytics and advertising cookies work on our free calculator website.' },
  { file: 'disclaimer-finance.html', slug: 'disclaimer-finance', title: 'Financial Disclaimer | CalcProMaster', desc: 'Financial disclaimer for CalcProMaster calculators. Results are educational estimates, not financial advice.' },
  { file: 'disclaimer-general.html', slug: 'disclaimer-general', title: 'General Disclaimer | CalcProMaster', desc: 'General disclaimer for CalcProMaster — calculator results are provided for general informational purposes only.' },
  { file: 'disclaimer-health.html', slug: 'disclaimer-health', title: 'Health Disclaimer | CalcProMaster', desc: 'Health disclaimer for CalcProMaster calculators. Health-related results are informational estimates, not medical advice.' },
  { file: 'privacy.html', slug: 'privacy', title: 'Privacy Policy | CalcProMaster', desc: 'Privacy Policy for CalcProMaster. All calculations run in your browser; no personal data is collected on our servers.' },
  { file: 'terms.html', slug: 'terms', title: 'Terms of Service | CalcProMaster', desc: 'Terms of Service for CalcProMaster — the conditions for using our free online calculator website.' },
];

function injectHead(filePath, page) {
  let html = fs.readFileSync(filePath, 'utf8');
  if (html.includes('rel="canonical"')) { console.log('SKIP (already patched):', page.file); return false; }

  const canonical = ORIGIN + '/' + page.slug + '.html';
  // Keep the clean SPA-style URL as canonical (Netlify rewrites /about → /about.html 200)
  const canonicalUrl = ORIGIN + '/' + page.slug;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    description: page.desc,
    url: canonicalUrl,
    isPartOf: { '@type': 'WebSite', name: 'CalcProMaster', url: ORIGIN + '/' }
  };
  const block =
    '\n  <link rel="canonical" href="' + canonicalUrl + '">\n' +
    '  <meta name="description" content="' + page.desc + '">\n' +
    '  <meta property="og:type" content="website">\n' +
    '  <meta property="og:site_name" content="CalcProMaster">\n' +
    '  <meta property="og:title" content="' + page.title + '">\n' +
    '  <meta property="og:description" content="' + page.desc + '">\n' +
    '  <meta property="og:url" content="' + canonicalUrl + '">\n' +
    '  <meta property="og:image" content="' + ORIGIN + '/og-image.png">\n' +
    '  <meta name="twitter:card" content="summary_large_image">\n' +
    '  <meta name="twitter:title" content="' + page.title + '">\n' +
    '  <meta name="twitter:description" content="' + page.desc + '">\n' +
    '  <meta name="twitter:image" content="' + ORIGIN + '/og-image.png">\n' +
    '  <script type="application/ld+json">' + JSON.stringify(ld) + '</script>';

  // Insert right after the <title>…</title> line for a clean head ordering.
  const titleMatch = html.match(/<title>[^<]*<\/title>/);
  if (!titleMatch) { console.log('NO TITLE FOUND:', page.file); return false; }
  html = html.replace(titleMatch[0], titleMatch[0] + block);
  fs.writeFileSync(filePath, html, 'utf8');
  console.log('PATCHED:', page.file, '-> canonical', canonicalUrl);
  return true;
}

let changed = 0;
for (const page of PAGES) {
  const p = path.join(ROOT, page.file);
  if (!fs.existsSync(p)) { console.log('MISSING:', page.file); continue; }
  if (injectHead(p, page)) changed++;
}
console.log('\nPatched files:', changed, '/', PAGES.length);
