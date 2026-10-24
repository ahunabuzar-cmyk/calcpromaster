#!/usr/bin/env node
/* REGENERATES docs/topical-map.md — entity-first topical map (EXACT original format).
   Data: docs/calculator-registry.json (js/data/*.js source of truth). */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs', 'calculator-registry.json'), 'utf8'));
const tools = reg.tools || reg;

// Registry category keys -> display names + icon-emoji style headings used on the site
const DISPLAY = {
  finance: 'Finance', health: 'Health', math: 'Math', everyday: 'Everyday Life',
  science: 'Science', engineering: 'Engineering', construction: 'Construction',
  conversion: 'Unit Conversion', business: 'Business', education: 'Education',
  utilities: 'Utilities', lifestyle: 'Lifestyle', regional: 'Regional',
  food: 'Food & Nutrition', fitness: 'Fitness', auto: 'Auto & Transport',
  career: 'Career & Freelance', homegarden: 'Home & Garden', tech: 'Tech & Digital',
  family: 'Family & Parenting'
};

// Sample ids per category (first N by position — deterministic)
function sampleIds(list, n) {
  return list.slice(0, n).map(t => t.id).join(', ');
}

// Related clusters per major category (id chains that interlink)
const CLUSTERS = {
  finance: 'Related cluster: loan-emi ↔ amortization ↔ mortgage ↔ refinance ↔ apr.',
  health: 'Cluster: bmi ↔ body-fat ↔ ideal-weight ↔ bmr ↔ calorie.'
};

// Supporting content notes per category (from site structure)
const SUPPORT = {
  finance: 'Supporting: amortization schedules, APR-vs-interest-rate explainer, loan-comparison FAQs.',
  health: null, math: null, everyday: null, science: null, engineering: null,
  construction: null, conversion: null, business: null, education: null,
  utilities: null, lifestyle: null, regional: null, food: null, fitness: null,
  auto: null, career: null, homegarden: null, tech: null, family: null
};

const byCat = {};
for (const t of tools) (byCat[t.category] = byCat[t.category] || []).push(t);
const cats = Object.keys(byCat).sort((a, b) => byCat[b].length - byCat[a].length);
const total = tools.length;

const M = [];
M.push('# CalcProMaster — Topical Map');
M.push('');
M.push('Entity-first hierarchy: Main Topic → Category → Calculator → supporting content → related tools. One page per intent; every calculator sits in exactly one category; category pages act as hubs. Source of truth: js/data/*.js registry (' + total + ' calculators, ' + cats.length + ' categories).');
M.push('');
M.push('## Structure (' + cats.length + ' categories · ' + total + ' calculators)');
M.push('');
for (const cat of cats) {
  const list = byCat[cat];
  const name = DISPLAY[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1));
  let line = '- **' + name + ' (' + list.length + ')** — ' + sampleIds(list, 8);
  if (list.length > 8) line += '...';
  M.push(line);
  if (SUPPORT[cat]) M.push('  ' + SUPPORT[cat]);
  if (CLUSTERS[cat]) M.push('  ' + CLUSTERS[cat]);
}
M.push('');

const out = path.join(ROOT, 'docs', 'topical-map.md');
fs.writeFileSync(out, M.join('\n'));
console.log('WROTE', out, '-', total, 'tools,', cats.length, 'categories');
