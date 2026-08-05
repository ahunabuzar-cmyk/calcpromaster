#!/usr/bin/env node
// ====== CalcProMaster Automated Sitemap Generator ======
// Reads js/data/*.js tool registries + static pages and regenerates sitemap.xml
// with all category/tool routes. Zero dependencies — pure Node.
//
// Usage:
//   node generate-sitemap.js            # writes sitemap.xml (English URLs)
//   node generate-sitemap.js --i18n     # also emits 19 localized <xhtml:link> alternates
//
// Run at deploy time (package.json: "build": "node generate-sitemap.js") so the
// sitemap never drifts from the actual tool registry.
const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://calcpromaster.netlify.app';
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'js', 'data');
const OUT = path.join(ROOT, 'sitemap.xml');

// Static pages (slug, changefreq, priority)
const STATIC_PAGES = [
  ['', 'weekly', '1.0'],
  ['about', 'monthly', '0.5'],
  ['privacy', 'monthly', '0.5'],
  ['terms', 'monthly', '0.5'],
  ['cookies', 'monthly', '0.5'],
  ['contact', 'monthly', '0.5'],
  ['disclaimer-general', 'monthly', '0.5'],
  ['disclaimer-finance', 'monthly', '0.5'],
  ['disclaimer-health', 'monthly', '0.5'],
  ['favorites', 'monthly', '0.5'],
  ['history', 'monthly', '0.5'],
  ['compare', 'monthly', '0.5']
];

// Supported i18n locales (must match js/i18n.js getAvailableLocales)
const LOCALES = ['en', 'es', 'hi', 'ur', 'fr', 'de', 'pt', 'ar', 'ru', 'ja', 'zh', 'ko', 'it', 'nl', 'tr', 'id', 'vi', 'th', 'bn'];

const today = new Date().toISOString().slice(0, 10);

// ====== Long-tail virtual landing pages (programmatic SEO) ======
// Format: [catKey, toolId, modifier]
// Each URL is rendered 100% client-side by the modifier router in js/app.js
// (applyModifier auto-fills the tool's inputs, rewrites title/meta/canonical and
// runs the calculation, so every URL below is a real, unique landing page).
// Modifier grammar: 5-years, 12-months, 50000 (bare amount), 50k, 8.5-percent,
// florida (location). High-value finance keywords first; states = single words
// so the location parser never mangles multi-word places.
const LONGTAIL = [
  // ---- Finance (highest-volume search keywords) ----
  ['finance', 'loan-emi', '5-years-50000'],
  ['finance', 'loan-emi', '10-years-200000'],
  ['finance', 'loan-emi', '3-years-15000'],
  ['finance', 'loan-emi', '7-years-100000'],
  ['finance', 'loan-emi', '15-years-300000'],
  ['finance', 'loan-emi', '20-years-400000'],
  ['finance', 'loan-emi', '30-years-250000'],
  ['finance', 'loan-emi', '2-years-10000'],
  ['finance', 'loan-emi', '12-months-20000'],
  ['finance', 'loan-emi', '6-years-75000'],
  ['finance', 'loan-emi', '5-years-75000'],
  ['finance', 'loan-emi', '5-years-50000-florida'],
  ['finance', 'loan-emi', '10-years-200000-texas'],
  ['finance', 'loan-emi', '7-years-100000-california'],
  ['finance', 'loan-emi', '3-years-15000-arizona'],
  ['finance', 'loan-emi', '8-years-120000'],
  ['finance', 'mortgage', '30-years-200000'],
  ['finance', 'auto-loan', '5-years-30000'],
  ['finance', 'retirement', '30-years-100000'],
  ['finance', 'compound-interest', '20-years-50000'],
  ['finance', 'mortgage', '30-years-300000'],
  ['finance', 'mortgage', '15-years-250000'],
  ['finance', 'mortgage', '20-years-400000'],
  ['finance', 'mortgage', '10-years-150000'],
  ['finance', 'mortgage', '30-years-500000'],
  ['finance', 'mortgage', '25-years-350000'],
  ['finance', 'mortgage', '5-years-100000'],
  ['finance', 'mortgage', '7-years-200000'],
  ['finance', 'mortgage', '15-years-300000-california'],
  ['finance', 'mortgage', '30-years-300000-florida'],
  ['finance', 'mortgage', '15-years-250000-texas'],
  ['finance', 'mortgage', '30-years-500000-california'],
  ['finance', 'mortgage', '20-years-400000-arizona'],
  ['finance', 'mortgage', '10-years-150000-ohio'],
  ['finance', 'auto-loan', '5-years-25000'],
  ['finance', 'auto-loan', '4-years-30000'],
  ['finance', 'auto-loan', '6-years-45000'],
  ['finance', 'auto-loan', '3-years-20000'],
  ['finance', 'auto-loan', '7-years-50000'],
  ['finance', 'auto-loan', '2-years-15000'],
  ['finance', 'auto-loan', '5-years-35000'],
  ['finance', 'auto-loan', '72-months-30000'],
  ['finance', 'auto-loan', '5-years-25000-florida'],
  ['finance', 'auto-loan', '6-years-45000-texas'],
  ['finance', 'compound-interest', '10-years-50000'],
  ['finance', 'compound-interest', '20-years-10000'],
  ['finance', 'compound-interest', '5-years-100000'],
  ['finance', 'compound-interest', '15-years-75000'],
  ['finance', 'compound-interest', '25-years-25000'],
  ['finance', 'compound-interest', '30-years-5000'],
  ['finance', 'simple-interest', '3-years-50000'],
  ['finance', 'simple-interest', '5-years-100000'],
  ['finance', 'simple-interest', '10-years-75000'],
  ['finance', 'simple-interest', '2-years-25000'],
  ['finance', 'simple-interest', '7-years-150000'],
  ['finance', 'credit-card-payoff', '12-months-5000'],
  ['finance', 'credit-card-payoff', '24-months-10000'],
  ['finance', 'credit-card-payoff', '6-months-2000'],
  ['finance', 'credit-card-payoff', '36-months-15000'],
  ['finance', 'credit-card-payoff', '18-months-7500'],
  ['finance', 'retirement', '30-years-50000'],
  ['finance', 'retirement', '25-years-75000'],
  ['finance', 'retirement', '20-years-100000'],
  ['finance', 'retirement', '35-years-40000'],
  ['finance', 'retirement', '40-years-25000'],
  ['finance', 'retirement', '30-years-50000-florida'],
  ['finance', 'investment', '10-years-10000'],
  ['finance', 'investment', '20-years-50000'],
  ['finance', 'investment', '5-years-25000'],
  ['finance', 'investment', '15-years-100000'],
  ['finance', 'investment', '30-years-15000'],
  ['finance', 'investment', '10-years-10000-florida'],
  ['finance', 'savings-goal', '5-years-10000'],
  ['finance', 'savings-goal', '10-years-50000'],
  ['finance', 'savings-goal', '3-years-15000'],
  ['finance', 'savings-goal', '20-years-100000'],
  ['finance', 'savings-goal', '7-years-25000'],
  ['finance', 'savings-goal', '15-years-75000'],
  ['finance', 'tax', '50000'],
  ['finance', 'tax', '75000'],
  ['finance', 'tax', '100000'],
  ['finance', 'tax', '150000'],
  ['finance', 'tax', '60000'],
  ['finance', 'tax', '120000'],
  ['finance', 'salary', '50000'],
  ['finance', 'salary', '75000'],
  ['finance', 'salary', '100000'],
  ['finance', 'salary', '60000'],
  ['finance', 'salary', '120000'],
  ['finance', 'salary', '80000'],
  ['finance', 'annuity', '10-years-100000'],
  ['finance', 'annuity', '20-years-50000'],
  ['finance', 'annuity', '5-years-75000'],
  ['finance', 'annuity', '15-years-250000'],
  ['finance', 'annuity', '25-years-100000'],
  ['finance', 'inflation', '10-years-10000'],
  ['finance', 'inflation', '20-years-50000'],
  ['finance', 'inflation', '30-years-100000'],
  ['finance', 'inflation', '5-years-5000'],
  ['finance', 'inflation', '15-years-25000'],
  ['finance', 'rent-vs-buy', '200000'],
  ['finance', 'rent-vs-buy', '300000'],
  ['finance', 'rent-vs-buy', '150000'],
  ['finance', 'rent-vs-buy', '400000'],
  ['finance', 'home-afford', '75000'],
  ['finance', 'home-afford', '100000'],
  ['finance', 'home-afford', '60000'],
  ['finance', 'home-afford', '120000'],
  ['finance', 'home-afford', '140000'],
  ['finance', 'refinance', '5-years-200000'],
  ['finance', 'refinance', '15-years-300000'],
  ['finance', 'refinance', '10-years-250000'],
  ['finance', 'refinance', '20-years-400000'],
  ['finance', 'refinance', '10-years-300000-florida'],
  ['finance', 'loan-qualify', '50000'],
  ['finance', 'loan-qualify', '75000'],
  ['finance', 'loan-qualify', '100000'],
  ['finance', 'loan-qualify', '120000'],
  ['finance', 'paycheck', '50000'],
  ['finance', 'paycheck', '75000'],
  ['finance', 'paycheck', '100000'],
  ['finance', 'paycheck', '60000'],
  ['finance', 'amortization', '30-years-300000'],
  ['finance', 'amortization', '15-years-200000'],
  ['finance', 'amortization', '10-years-150000'],
  ['finance', 'amortization', '5-years-100000'],
  ['finance', 'amortization', '20-years-350000'],
  ['finance', 'loan-to-value', '200000'],
  ['finance', 'loan-to-value', '300000'],
  ['finance', 'loan-to-value', '400000'],
  ['finance', 'apr', '5-years-20000'],
  ['finance', 'apr', '3-years-10000'],
  ['finance', 'apr', '10-years-50000'],
  ['finance', 'fire', '25-years-50000'],
  ['finance', 'fire', '30-years-75000'],
  ['finance', 'fire', '20-years-100000'],
  ['finance', 'social-security', '50000'],
  ['finance', 'social-security', '75000'],
  ['finance', 'social-security', '100000'],
  ['finance', 'capital-gains', '50000'],
  ['finance', 'capital-gains', '100000'],
  ['finance', 'capital-gains', '150000'],
  ['finance', 'dividend', '10000'],
  ['finance', 'dividend', '50000'],
  ['finance', 'dividend', '100000'],
  ['finance', 'break-even', '10000'],
  ['finance', 'break-even', '25000'],
  ['finance', 'break-even', '50000'],
  ['finance', 'present-value', '10-years-50000'],
  ['finance', 'present-value', '5-years-100000'],
  ['finance', 'present-value', '20-years-10000'],
  ['finance', 'future-value', '10-years-50000'],
  ['finance', 'future-value', '20-years-10000'],
  ['finance', 'future-value', '5-years-100000'],
  ['finance', 'debt-ratio', '50000'],
  ['finance', 'debt-ratio', '75000'],
  ['finance', 'debt-ratio', '100000'],
  ['finance', 'cash-flow', '5000'],
  ['finance', 'cash-flow', '10000'],
  ['finance', 'cash-flow', '25000'],
  ['finance', 'net-worth-calculator', '100000'],
  ['finance', 'net-worth-calculator', '250000'],
  ['finance', 'net-worth-calculator', '500000'],
  ['finance', 'currency-converter', '500'],
  ['finance', 'currency-converter', '1000'],
  ['finance', 'currency-converter', '5000'],
  // ---- Business ----
  ['business', 'business-roi', '5-years-10000'],
  ['business', 'business-roi', '3-years-50000'],
  ['business', 'business-roi', '10-years-25000'],
  ['business', 'business-roi', '7-years-15000'],
  ['business', 'profit-margin', '10000'],
  ['business', 'profit-margin', '25000'],
  ['business', 'profit-margin', '50000'],
  ['business', 'cashflow', '5000'],
  ['business', 'cashflow', '10000'],
  ['business', 'cashflow', '25000'],
  ['business', 'cac', '10000'],
  ['business', 'cac', '50000'],
  ['business', 'cac', '100000'],
  ['business', 'burn-rate', '5000'],
  ['business', 'burn-rate', '10000'],
  ['business', 'burn-rate', '25000'],
  ['business', 'mrr', '5000'],
  ['business', 'mrr', '10000'],
  ['business', 'mrr', '50000'],
  ['business', 'freelance-rate', '50000'],
  ['business', 'freelance-rate', '75000'],
  ['business', 'freelance-rate', '100000'],
  ['business', 'freelance-rate', '80000'],
  ['business', 'depreciation', '5-years-10000'],
  ['business', 'depreciation', '7-years-25000'],
  ['business', 'depreciation', '10-years-50000'],
  // ---- Home & Garden / Education (clear amount fields) ----
  ['homegarden', 'solar-panel', '5000'],
  ['homegarden', 'solar-panel', '10000'],
  ['homegarden', 'solar-panel', '15000'],
  ['homegarden', 'generator-size', '5000'],
  ['homegarden', 'generator-size', '10000'],
  ['education', 'college-cost-planner', '10000'],
  ['education', 'college-cost-planner', '25000'],
  ['education', 'college-cost-planner', '50000']
];

function extractToolIds(filePath) {
  // Tool objects in data files look like:  { id: 'loan-emi', name: '...', desc: ...
  // (input field objects use `label:` and live nested inside `inputs: [...]`, so a
  // top-level `id:` immediately followed by `name:` uniquely identifies a tool).
  const src = fs.readFileSync(filePath, 'utf8');
  const ids = [];
  // Tools may use single OR double quotes for id (both styles exist in the data files),
  // and `name:` always immediately follows the tool's `id:` (input fields use `label:`).
  const re = /\{\s*id:\s*['"]([^'"]+)['"],\s*name:/g;
  let m;
  while ((m = re.exec(src)) !== null) ids.push(m[1]);
  return ids;
}

function main() {
  const withI18n = process.argv.includes('--i18n');
  const urls = [];

  // Static pages
  STATIC_PAGES.forEach(([slug, freq, prio]) => {
    urls.push({ loc: DOMAIN + '/' + slug, freq: freq, prio: prio });
  });

  // Categories + tools (each data file = one category, key = filename minus .js,
  // with the same normalization used in js/data.js CALC_DATA)
  const FIXED_KEYS = {
    'food-nutrition.js': 'food',
    'fitness-exercise.js': 'fitness',
    'auto-transport.js': 'auto',
    'career-freelance.js': 'career',
    'home-garden.js': 'homegarden',
    'tech-digital.js': 'tech',
    'parenting-family.js': 'family'
  };

  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.js') && f !== 'data.js');
  let totalTools = 0;

  files.forEach(file => {
    const catKey = FIXED_KEYS[file] || file.replace('.js', '');
    const ids = extractToolIds(path.join(DATA_DIR, file));
    if (ids.length === 0) return;
    totalTools += ids.length;
    urls.push({ loc: DOMAIN + '/' + catKey, freq: 'weekly', prio: '0.8' });
    ids.forEach(id => {
      urls.push({ loc: DOMAIN + '/' + catKey + '/' + id, freq: 'monthly', prio: '0.9' });
    });
  });

  // Long-tail virtual landing pages (programmatic SEO)
  // Each one is a real, unique URL that the modifier router in js/app.js
  // renders with auto-filled inputs + unique title/meta/canonical.
  LONGTAIL.forEach(([catKey, toolId, modifier]) => {
    urls.push({
      loc: DOMAIN + '/' + catKey + '/' + toolId + '/' + modifier,
      freq: 'monthly',
      prio: '0.6'
    });
  });

  // Build XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
  if (withI18n) xml += ' xmlns:xhtml="http://www.w3.org/1999/xhtml"';
  xml += '>\n';
  urls.forEach(u => {
    xml += '  <url>\n';
    xml += '    <loc>' + u.loc + '</loc>\n';
    xml += '    <lastmod>' + today + '</lastmod>\n';
    xml += '    <changefreq>' + u.freq + '</changefreq>\n';
    xml += '    <priority>' + u.prio + '</priority>\n';
    if (withI18n) {
      // One hreflang alternate per locale (English URL stays canonical/unprefixed)
      const basePath = u.loc.replace(DOMAIN, '');
      LOCALES.forEach(loc => {
        xml += '    <xhtml:link rel="alternate" hreflang="' + loc + '" href="' + DOMAIN + (loc === 'en' ? basePath : '/' + loc + basePath) + '"/>\n';
      });
    }
    xml += '  </url>\n';
  });
  xml += '</urlset>\n';

  fs.writeFileSync(OUT, xml, 'utf8');
  console.log('sitemap.xml regenerated: ' + urls.length + ' URLs (' + totalTools + ' tools across ' + files.length + ' categories)' + (withI18n ? ' + i18n alternates' : ''));
}

main();
