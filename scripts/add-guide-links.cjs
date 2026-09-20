#!/usr/bin/env node
// ============================================================
// CalcProMaster — Internal-links build #2 (guides → tool pages)
// Injects a "From Our Guides Library" block (3 category-relevant
// guides, varied deterministically per tool) into each record's
// desc, right before the record end. Idempotent.
// Run: node scripts/add-guide-links.cjs
// Then: node scripts/split-seo.cjs
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'js', 'seo-content.js');
const MARK = 'From Our Guides Library';

const CAT_GUIDES = {
  finance: [['emi','how EMI math actually works'],['mortgage','mortgage payments explained step by step'],['income-tax','income tax brackets in plain language'],['compound-interest','compound interest: the full guide'],['retirement','retirement planning math'],['credit-card-minimum','why minimum credit-card payments keep you in debt'],['debt-payoff','the debt-payoff methods compared'],['net-worth','how to actually measure your net worth'],['cagr','CAGR vs absolute returns'],['sip','SIP investing, step by step'],['fd-ppf-sip','FD vs PPF vs SIP'],['loans-mortgages','the complete loan costs guide'],['tax-salary','how salary tax is calculated'],['salary','salary structures explained'],['debt-ratio','debt ratios lenders look at']],
  business: [['profit-margin','profit margin math for real decisions'],['break-even','finding your break-even point'],['npv-vs-irr','NPV vs IRR: which number to trust'],['cagr','CAGR for business growth'],['debt-ratio','debt ratios that matter'],['freelance-rate-card','setting a defensible rate card'],['hourly-rate','hourly rate math']],
  career: [['freelance-rate-card','setting a defensible freelance rate'],['hourly-rate','hourly vs project pricing'],['salary','salary structures explained'],['tax-salary','how salary tax is calculated'],['business-days','counting business days correctly']],
  construction: [['concrete','concrete volume math for slabs'],['paint-coverage','paint coverage per litre explained'],['room-area','measuring room area the right way'],['ac-size','sizing an AC unit to your room'],['gear-ratio','gear ratios for builders']],
  conversion: [['unit-conversion','unit conversion without mistakes'],['currency-conversion','currency conversion, fees included'],['fuel-cost','fuel cost per km, explained']],
  education: [['gpa','how GPA is really computed'],['grade-needed','the grade you need on the final'],['glossary','the calculators glossary'],['percentage','percentages for grade math']],
  engineering: [['ohms-law','Ohm\u2019s law, worked examples'],['gear-ratio','gear ratio calculations'],['electricity-bill','how electricity bills are computed'],['unit-conversion','unit conversion without mistakes']],
  everyday: [['tip','tip math for any bill'],['discount','discount vs markdown math'],['percentage','percentages in daily life'],['business-days','counting business days correctly'],['unit-conversion','unit conversion without mistakes']],
  family: [['baby-cost','the real first-year baby cost'],['wedding-budget','wedding budget math'],['screen-time','screen time by age group'],['sleep-cycles','sleep cycles and wake times']],
  fitness: [['bmi','what BMI can and cannot tell you'],['ideal-weight','ideal-weight formulas compared'],['protein-intake','how much protein per day'],['calories','calorie needs, computed'],['heart-rate-zones','training heart-rate zones'],['body-fat','body-fat methods compared'],['water-intake','daily water needs'],['bmr','BMR explained simply']],
  food: [['calories','calorie needs, computed'],['macro-calculator','macro splits for real goals'],['water-intake','daily water needs'],['protein-intake','how much protein per day']],
  health: [['bmi','what BMI can and cannot tell you'],['bmr','BMR explained simply'],['calories','calorie needs, computed'],['sleep-cycles','sleep cycles and wake times'],['heart-rate-zones','resting vs training heart rate'],['body-fat','body-fat methods compared']],
  homegarden: [['paint-coverage','paint coverage per litre explained'],['room-area','measuring room area the right way'],['ac-size','sizing an AC unit to your room'],['utilities','utility costs, itemized'],['electricity-bill','how electricity bills are computed']],
  lifestyle: [['screen-time','screen time by age group'],['sleep-cycles','sleep cycles and wake times'],['passwords','password strength, honestly'],['water-intake','daily water needs']],
  math: [['percentage','percentages, from basics up'],['random-numbers','how randomness is generated'],['unit-conversion','unit conversion without mistakes'],['glossary','the calculators glossary']],
  regional: [['salary','salary structures explained'],['tax-salary','how salary tax is calculated'],['currency-conversion','currency conversion, fees included'],['net-worth','how to actually measure your net worth']],
  science: [['ohms-law','Ohm\u2019s law, worked examples'],['unit-conversion','unit conversion without mistakes'],['glossary','the calculators glossary']],
  tech: [['passwords','password strength, honestly'],['screen-time','screen time by age group'],['electricity-bill','device electricity costs'],['unit-conversion','unit conversion without mistakes']],
  utilities: [['electricity-bill','how electricity bills are computed'],['utilities','utility costs, itemized'],['unit-conversion','unit conversion without mistakes'],['screen-time','screen time by age group']],
  auto: [['fuel-cost','fuel cost per km, explained'],['ev-vs-petrol','EV vs petrol: the real math'],['unit-conversion','unit conversion without mistakes']]
};

function pickGuides(cat, id, n) {
  const list = CAT_GUIDES[cat] || [];
  if (!list.length) return [];
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const out = [];
  for (let i = 0; i < Math.min(n, list.length); i++) out.push(list[(h + i) % list.length]);
  return out;
}

const lines = fs.readFileSync(FILE, 'utf8').split('\n');
let touched = 0, skipped = 0, noAnchor = 0;
const out = lines.map(line => {
  if (!/^  '[a-z0-9-]+': \{/.test(line) || !line.includes('"desc":"')) return line;
  if (line.includes(MARK)) { skipped++; return line; }
  const catM = line.match(/"cat":"([a-z-]+)"/);
  const idM = line.match(/^  '([a-z0-9-]+)':/);
  if (!catM || !idM) return line;
  const guides = pickGuides(catM[1], idM[1], 3);
  if (!guides.length) return line;
  const A = String.fromCharCode(92) + '"';
  const items = guides.map(([slug, label]) => '<li><a href=' + A + '/guides/' + slug + '/' + A + '>' + label + '</a></li>').join('');
  const block = '<h2>' + MARK + '</h2><ul>' + items + '</ul>';
  // Anchor: desc JSON-string ends with " then ,"faqs". Insert AFTER that
  // closing quote (i+1) so the block lands INSIDE the desc string.
  const anchor = '","faqs"';
  const i = line.indexOf(anchor);
  if (i < 0) { noAnchor++; return line; }
  touched++;
  return line.slice(0, i) + block + line.slice(i);
});

fs.writeFileSync(FILE, out.join('\n'));
console.log('guide-links: injected=' + touched + ' already=' + skipped + ' noAnchor=' + noAnchor);
