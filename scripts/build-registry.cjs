#!/usr/bin/env node
// ============================================================
// CalcProMaster — Master Calculator Registry Builder
// ------------------------------------------------------------
// Single source of truth derived from js/data/*.js. Produces
// docs/calculator-registry.json with one record per tool:
//   id, name, category, catName, route, inputs, features,
//   status (existing-in-HEAD vs new), duplicate status.
// The registry count must equal the count the app serves.
// ============================================================
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'js', 'data');
const OUT = path.join(ROOT, 'docs', 'calculator-registry.json');

const CAT_KEYS = {
  'finance.js': ['finance', 'Finance'],
  'health.js': ['health', 'Health & Fitness'],
  'math.js': ['math', 'Math'],
  'everyday.js': ['everyday', 'Everyday Life'],
  'science.js': ['science', 'Science'],
  'engineering.js': ['engineering', 'Engineering'],
  'construction.js': ['construction', 'Construction'],
  'conversion.js': ['conversion', 'Unit Conversion'],
  'business.js': ['business', 'Business'],
  'education.js': ['education', 'Education'],
  'utilities.js': ['utilities', 'Utilities'],
  'lifestyle.js': ['lifestyle', 'Lifestyle'],
  'regional.js': ['regional', 'Regional (India/PK/UAE)'],
  'food-nutrition.js': ['food', 'Food & Nutrition'],
  'fitness-exercise.js': ['fitness', 'Fitness & Exercise'],
  'auto-transport.js': ['auto', 'Auto & Transport'],
  'career-freelance.js': ['career', 'Career & Freelance'],
  'home-garden.js': ['homegarden', 'Home & Garden'],
  'tech-digital.js': ['tech', 'Tech & Digital'],
  'parenting-family.js': ['family', 'Parenting & Family'],
};

function headHasId(file, id) {
  try {
    const head = execFileSync('git', ['show', 'HEAD:js/data/' + file], { cwd: ROOT, encoding: 'utf8' });
    return new RegExp('id\\s*:\\s*["\']' + id + '["\']').test(head);
  } catch (e) { return false; }
}

const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.js') && !f.endsWith('.test.js')).sort();
const tools = [];
const byCat = {};
const idSeen = new Set();
const dups = [];
const nameMap = new Map();

for (const file of files) {
  const [cat, catName] = CAT_KEYS[file] || [file.replace('.js', ''), file.replace('.js', '')];
  const arr = require(path.join(DATA_DIR, file));
  if (!Array.isArray(arr)) { console.error('SKIP (not array): ' + file); continue; }
  byCat[cat] = byCat[cat] || { name: catName, tools: [] };
  for (const t of arr) {
    if (idSeen.has(t.id)) dups.push(t.id);
    idSeen.add(t.id);
    const rec = {
      id: t.id,
      name: t.name,
      slug: '/' + cat + '/' + t.id,
      category: cat,
      catName,
      desc: t.desc || '',
      keywords: t.kw || '',
      inputs: (t.inputs || []).map(i => ({ id: i.id, label: i.label, type: i.type, def: i.def !== undefined ? i.def : null })),
      features: {
        steps: typeof t.steps === 'function',
        reverse: !!t.reverse,
        custom: t.custom || null,
        async: t.async === true,
        advanced: !!t.advanced,
      },
      status: headHasId(file, t.id) ? 'existing' : 'new',
      duplicate: 'unique',
    };
    // name-level collision flag (same normalized name, different id anywhere)
    const norm = t.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (nameMap.has(norm)) { rec.duplicate = 'name-collision'; nameMap.get(norm).duplicate = 'name-collision'; }
    nameMap.set(norm, rec);
    byCat[cat].tools.push(rec);
    tools.push(rec);
  }
}

const summary = {
  generated: new Date().toISOString(),
  total: tools.length,
  existing: tools.filter(t => t.status === 'existing').length,
  new: tools.filter(t => t.status === 'new').length,
  duplicateIds: dups,
  nameCollisions: tools.filter(t => t.duplicate === 'name-collision').length,
  categories: Object.keys(byCat).map(cat => ({
    key: cat,
    name: byCat[cat].name,
    total: byCat[cat].tools.length,
    existing: byCat[cat].tools.filter(t => t.status === 'existing').length,
    new: byCat[cat].tools.filter(t => t.status === 'new').length,
  })),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ summary, byCategory: byCat, tools }, null, 1), 'utf8');
console.log('✓ wrote ' + OUT);
console.log('Total: ' + summary.total + ' | existing: ' + summary.existing + ' | new: ' + summary.new + ' | dup ids: ' + dups.length + ' | name collisions: ' + summary.nameCollisions);