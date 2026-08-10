#!/usr/bin/env node
// ============================================================
// CalcProMaster — llms.txt Regenerator
// Builds llms.txt from the ACTUAL js/data/*.js registries so the
// AI-readable index never drifts from the live tool list (the old
// file was hand-maintained and still named removed duplicates).
//
// Usage: node scripts/generate-llms.js
// ============================================================
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'js', 'data');
const OUT = path.join(__dirname, '..', 'llms.txt');

// Category display order + name (matches js/data.js CALC_DATA keys)
const FIXED = {
  'food-nutrition.js': 'food',
  'fitness-exercise.js': 'fitness',
  'auto-transport.js': 'auto',
  'career-freelance.js': 'career',
  'home-garden.js': 'homegarden',
  'tech-digital.js': 'tech',
  'parenting-family.js': 'family'
};
const ORDER = ['finance', 'health', 'math', 'everyday', 'science', 'engineering',
  'construction', 'conversion', 'business', 'education', 'utilities', 'lifestyle',
  'regional', 'food', 'fitness', 'auto', 'career', 'homegarden', 'tech', 'family'];
const NAMES = {
  finance: 'Finance', health: 'Health & Fitness', math: 'Math', everyday: 'Everyday',
  science: 'Science', engineering: 'Engineering', construction: 'Construction',
  conversion: 'Conversion', business: 'Business', education: 'Education',
  utilities: 'Utilities', lifestyle: 'Lifestyle & Home', regional: 'Regional (India/PK/UAE)',
  food: 'Food & Nutrition', fitness: 'Fitness & Exercise', auto: 'Auto & Transport',
  career: 'Career & Freelance', homegarden: 'Home & Garden', tech: 'Tech & Digital',
  family: 'Parenting & Family'
};

const cats = {};
let total = 0;
for (const f of fs.readdirSync(DATA_DIR).filter(x => x.endsWith('.js'))) {
  const key = FIXED[f] || f.replace('.js', '');
  const tools = require(path.join(DATA_DIR, f));
  cats[key] = tools;
  total += tools.length;
}

const today = new Date().toISOString().slice(0, 10);
let out = '';
out += '# CalcProMaster\n\n';
out += '> ' + total + '+ free online calculators with step-by-step solutions, interactive charts, and smart comparison features.\n';
out += '> All tools run in your browser — no sign-up required, calculator inputs stay on your device, and analytics/advertising only run after consent. Works offline as a PWA.\n\n';
out += 'Last updated: ' + today + '\n\n';
out += '## What is CalcProMaster?\n\n';
out += 'CalcProMaster is a free, serverless calculator platform with **' + total + '+ calculators** across 20 categories. Every tool provides step-by-step solutions, interactive SVG charts, scenario comparison, and privacy-first calculation (all data stays on the device).\n\n';
out += '## Calculator Categories\n\n';

for (const key of ORDER) {
  const tools = cats[key] || [];
  if (!tools.length) continue;
  out += '### ' + NAMES[key] + ' (' + tools.length + ' calculators)\n';
  out += tools.map(t => t.name).join(', ') + '\n\n';
}

out += '## Static Pages\n\n';
out += '- About: /about\n- Privacy: /privacy\n- Terms: /terms\n- Contact: /contact\n- Favorites: /favorites\n- History: /history\n- Compare: /compare\n\n';
out += 'All URLs are crawlable clean paths (e.g. /finance/loan-emi, /health/bmi). Every calculator is a standalone indexable page with unique content. Calculations run locally in the browser.\n';

fs.writeFileSync(OUT, out);
console.log('llms.txt regenerated: ' + total + ' tools across ' + Object.keys(cats).length + ' categories');
