#!/usr/bin/env node
/* ============================================================
 * CalcProMaster — contextual "Related guides" blocks
 * ------------------------------------------------------------
 * Every guide already links to its own calculators, but the guides almost never
 * linked to EACH OTHER, so a reader who landed on /guides/bmr had no path to
 * the body-fat or calorie guides — and Google had few in-body links between
 * topically adjacent pages.
 *
 * This adds one <ul class="related"> of 4 sibling guides, chosen from hand-made
 * topic clusters (not "most recent"), inserted just above the FAQ section so it
 * reads as a next-step block rather than a footer. Anchor text is the sibling's
 * own H1 (trimmed at its subtitle), so every link is descriptive.
 *
 * Idempotent: a guide that already has the block is skipped.
 *
 * Usage:
 *   node scripts/apply-related-guides.cjs --dry-run
 *   node scripts/apply-related-guides.cjs
 * ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GUIDES = path.join(ROOT, 'guides');
const DRY = process.argv.includes('--dry-run');
const PER_GUIDE = 4;

// Topic clusters: a guide links to the next four in its own cluster (wrapping).
// Ordering inside a cluster is deliberate — neighbouring entries are the ones a
// reader is most likely to want next.
const CLUSTERS = {
  loans: ['emi', 'mortgage', 'loans-mortgages', 'debt-payoff', 'debt-ratio', 'credit-card-minimum', 'rent-vs-buy'],
  invest: ['compound-interest', 'cagr', 'sip', 'fd-ppf-sip', 'retirement', 'npv-vs-irr', 'net-worth', 'inflation'],
  earning: ['salary', 'tax-salary', 'income-tax', 'gst-sales-tax', 'hourly-rate', 'freelance-rate-card', 'business-days', 'profit-margin', 'business', 'career'],
  money: ['percentage', 'discount', 'tip', 'break-even', 'wedding-budget', 'currency-conversion', 'unit-conversion', 'zakat'],
  health: ['bmi', 'bmr', 'body-fat', 'ideal-weight', 'calories', 'macro-calculator', 'protein-intake', 'health-fitness'],
  wellness: ['water-intake', 'sleep-cycles', 'heart-rate-zones', 'screen-time', 'age', 'lifestyle'],
  home: ['concrete', 'paint-coverage', 'room-area', 'ac-size', 'electricity-bill', 'utilities', 'homegarden', 'construction'],
  auto: ['fuel-cost', 'ev-vs-petrol', 'gear-ratio', 'auto', 'engineering'],
  study: ['gpa', 'grade-needed', 'math-statistics', 'random-numbers', 'science'],
  family: ['baby-cost', 'family', 'food', 'everyday'],
};
// Guides that sit between clusters, or are hub-ish, get an explicit list.
const EXTRA = {
  passwords: ['random-numbers', 'unit-conversion', 'currency-conversion', 'gpa'],
  'ohms-law': ['gear-ratio', 'engineering', 'unit-conversion', 'science'],
  regional: ['currency-conversion', 'zakat', 'gst-sales-tax', 'salary'],
};

function clusterOf(slug) {
  for (const [name, list] of Object.entries(CLUSTERS)) if (list.includes(slug)) return { name, list };
  return null;
}

function h1Of(html) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!m) return '';
  let t = m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  // Trim the subtitle: "BMR: The Formula Behind Your Resting Burn" → "BMR".
  const cut = t.search(/\s[—|]\s|:\s/);
  if (cut > 2) t = t.slice(0, cut);
  return t.replace(/&amp;/g, '&').trim();
}

const files = fs.readdirSync(GUIDES).filter((f) => f.endsWith('.html'));
const slugs = files.map((f) => f.replace(/\.html$/, '')).filter((s) => s !== 'index');
const titles = {};
for (const s of slugs) {
  if (s === 'glossary') continue;
  try { titles[s] = h1Of(fs.readFileSync(path.join(GUIDES, s + '.html'), 'utf8')); } catch (e) { titles[s] = ''; }
}

const MARK = '<!-- related-guides -->';

let changed = 0;
let skipped = 0;
const unmapped = [];

for (const s of slugs) {
  if (s === 'index' || s === 'glossary') continue;
  const file = path.join(GUIDES, s + '.html');
  let html = fs.readFileSync(file, 'utf8');
  // Regenerate rather than skip: a previous run could have placed the block
  // inside another generator's marked region, where that generator would delete
  // it on its next pass (the 17 category hubs did exactly that).
  if (html.indexOf(MARK) > -1) {
    html = html.replace(new RegExp('\\n?[ \\t]*' + MARK + '[\\s\\S]*?<\\/ul>\\s*\\n?', 'g'), '\n');
  }
  const cluster = clusterOf(s);
  const picks = [];
  if (EXTRA[s]) {
    for (const other of EXTRA[s]) if (titles[other] && picks.length < PER_GUIDE) picks.push(other);
  } else if (cluster && cluster.list.length >= 2) {
    const idx = cluster.list.indexOf(s);
    for (let i = 1; i < cluster.list.length && picks.length < PER_GUIDE; i++) {
      const other = cluster.list[(idx + i) % cluster.list.length];
      if (other === s) continue;
      if (!titles[other]) continue;
      if (!fs.existsSync(path.join(GUIDES, other + '.html'))) continue;
      picks.push(other);
    }
  }
  if (!picks.length) { unmapped.push(s); skipped++; continue; }
  const items = picks.map((p) => '    <li><a href="/guides/' + p + '">' + titles[p] + '</a></li>').join('\n');
  const block = '\n  ' + MARK + '\n  <h2>Related guides</h2>\n  <ul class="related related-guides">\n' + items + '\n  </ul>\n';
  const faqAt = html.search(/<h2[^>]*>\s*(Frequently asked questions|FAQ)\s*<\/h2>/i);
  // On the category hubs the FAQ heading is INSIDE scripts/apply-guide-depth.cjs's
  // marked block, which that script rewrites wholesale. Anchoring above the
  // depth marker keeps this block out of its reach.
  const depthAt = html.search(/<!-- guide-depth:start -->/i);
  const anchor = depthAt > -1 && (faqAt === -1 || depthAt < faqAt) ? depthAt : faqAt;
  if (anchor > -1) {
    const lineStart = html.lastIndexOf('\n', anchor - 1) + 1;
    html = html.slice(0, lineStart) + block + '\n' + html.slice(lineStart);
  } else html = html.replace(/<\/main>/i, block + '</main>');
  if (!DRY) fs.writeFileSync(file, html);
  changed++;
  if (DRY) console.log('· ' + s + ' → ' + picks.join(', '));
}

console.log('\nRelated-guides ' + (DRY ? 'preview' : 'pass') + ': ' + changed + ' guide(s)' + (DRY ? ' would change' : ' updated') + ', ' + skipped + ' skipped');
if (unmapped.length) console.log('   no cluster: ' + unmapped.join(', '));
