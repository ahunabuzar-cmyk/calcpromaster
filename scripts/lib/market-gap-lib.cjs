#!/usr/bin/env node
// ============================================================
// Shared helpers for the market-gap batch generators.
//  - tool insertion into js/data/*.js (idempotent, comma-safe)
//  - VM self-check of exact expected result strings
//  - SEO entry template + insertion into js/seo-content.js
//  - QA contract appends to docs/qa-contracts.json
// ESCAPING RULES: prose must avoid apostrophes and the "$" digit
// sequence. Double quotes are allowed (escaped on serialize).
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
const Q39 = String.fromCharCode(39);
const B = String.fromCharCode(92);

const CATS = {
  finance: { file: 'finance.js', constName: 'FINANCE_TOOLS', catName: 'Finance' },
  health: { file: 'health.js', constName: 'HEALTH_TOOLS', catName: 'Health & Fitness' },
  math: { file: 'math.js', constName: 'MATH_TOOLS', catName: 'Math' },
  everyday: { file: 'everyday.js', constName: 'EVERYDAY_TOOLS', catName: 'Everyday' },
  science: { file: 'science.js', constName: 'SCIENCE_TOOLS', catName: 'Science' },
  engineering: { file: 'engineering.js', constName: 'ENGINEERING_TOOLS', catName: 'Engineering' },
  construction: { file: 'construction.js', constName: 'CONSTRUCTION_TOOLS', catName: 'Construction' },
  conversion: { file: 'conversion.js', constName: 'CONVERSION_TOOLS', catName: 'Conversion' },
  business: { file: 'business.js', constName: 'BUSINESS_TOOLS', catName: 'Business' },
  education: { file: 'education.js', constName: 'EDUCATION_TOOLS', catName: 'Education' },
  utilities: { file: 'utilities.js', constName: 'UTILITY_TOOLS', catName: 'Utilities' },
  lifestyle: { file: 'lifestyle.js', constName: 'LIFESTYLE_TOOLS', catName: 'Lifestyle & Home' },
  regional: { file: 'regional.js', constName: 'REGIONAL_TOOLS', catName: 'Regional (India/PK/UAE)' },
  food: { file: 'food-nutrition.js', constName: 'FOOD_NUTRITION_TOOLS', catName: 'Food & Nutrition' },
  fitness: { file: 'fitness-exercise.js', constName: 'FITNESS_TOOLS', catName: 'Fitness & Exercise' },
  auto: { file: 'auto-transport.js', constName: 'AUTO_TRANSPORT_TOOLS', catName: 'Auto & Transport' },
  career: { file: 'career-freelance.js', constName: 'CAREER_TOOLS', catName: 'Career & Freelance' },
  homegarden: { file: 'home-garden.js', constName: 'HOME_GARDEN_TOOLS', catName: 'Home & Garden' },
  tech: { file: 'tech-digital.js', constName: 'TECH_TOOLS', catName: 'Tech & Digital' },
  family: { file: 'parenting-family.js', constName: 'FAMILY_TOOLS', catName: 'Parenting & Family' },
};

function q(s) { return Q39 + s + Q39; }
function esc(s) { return String(s).split('"').join(B + '"'); }

function toolSource(t) {
  const L = [];
  L.push('  {');
  L.push("    id: '" + t.id + "',");
  L.push("    name: '" + t.name + "',");
  L.push("    desc: '" + t.desc + "',");
  L.push("    kw: '" + t.kw + "',");
  L.push('    inputs: [');
  L.push(t.inputs.map(function (inp) {
    let s = "{ id: '" + inp.id + "', label: '" + inp.label + "', type: '" + inp.type + "'";
    if (inp.type === 'checkbox') s += ', def: ' + (inp.def ? 'true' : 'false') + ' }';
    else if (inp.type === 'select') s += ', options: [' + (inp.options || []).map(q).join(', ') + "], def: '" + inp.def + "' }";
    else if (inp.type === 'number') s += ', def: ' + inp.def + ' }';
    else s += ", def: '" + (inp.def === undefined ? '' : inp.def) + "' }";
    return s;
  }).join(',\r\n      '));
  L.push('    ],');
  L.push('    calc: ' + t.calc.toString() + ',');
  L.push('    steps: ' + t.steps.toString());
  L.push('  }');
  return L.join('\r\n');
}

// Insert tools into their data files. Comma-safe: any trailing comma before
// the closing ]; is stripped first so we never create an array hole.
function insertTools(tools) {
  let inserted = 0;
  for (const catKey of Object.keys(CATS)) {
    const group = tools.filter(function (t) { return t.cat === catKey; });
    if (!group.length) continue;
    const cfg = CATS[catKey];
    const file = path.join(ROOT, 'js', 'data', cfg.file);
    let src = fs.readFileSync(file, 'utf8');
    const missing = group.filter(function (t) { return !src.includes(q(t.id)); });
    if (!missing.length) continue;
    const block = ',\r\n' + missing.map(toolSource).join(',\r\n') + '\r\n';
    const cut = src.lastIndexOf('];');
    let head = src.slice(0, cut).replace(/,\s*$/, '');
    src = head + block + src.slice(cut);
    fs.writeFileSync(file, src);
    inserted += missing.length;
  }
  return inserted;
}

function loadCat(catKey) {
  const cfg = CATS[catKey];
  const sb = { window: {}, Charts: { donut: function () { return {}; }, bar: function () { return {}; }, gauge: function () { return {}; } }, console: { log: function () {}, warn: function () {}, error: function () {} } };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'data', cfg.file), 'utf8'), sb);
  return sb.window[cfg.constName] || [];
}

function loadAll(tools) {
  const cats = {};
  tools.forEach(function (t) { cats[t.cat] = true; });
  const ALL = [];
  Object.keys(cats).forEach(function (c) { loadCat(c).forEach(function (t) { ALL.push(t); }); });
  return ALL;
}

// expected: array of [id, overrides, expectedResultString] (optional 4th = chart check)
function selfCheck(tools, expected) {
  const ALL = loadAll(tools);
  const bad = [];
  for (const row of expected) {
    const id = row[0], values = row[1], expect = row[2];
    const t = ALL.find(function (x) { return x.id === id; });
    if (!t) { bad.push('missing tool ' + id); continue; }
    const v = {};
    (t.inputs || []).forEach(function (inp) { v[inp.id] = values[inp.id] !== undefined ? values[inp.id] : inp.def; });
    let out;
    try { out = t.calc(v); } catch (e) { bad.push(id + ' threw ' + e.message); continue; }
    if (expect !== undefined && out.result !== expect) bad.push(id + ' result [' + out.result + '] expected [' + expect + ']');
    if ((out.result + ' ' + out.extra).includes('NaN') || (out.result + ' ' + out.extra).includes('undefined')) bad.push(id + ' NaN/undefined in output');
    try {
      if (t.steps(v).join(' ').includes('NaN')) bad.push(id + ' steps NaN');
    } catch (e) { bad.push(id + ' steps threw ' + e.message); }
    if (row[3] !== false && !out.chart) bad.push(id + ' no chart');
  }
  return bad;
}

// ---- SEO ----
// Only link guides that actually exist (flat files → NO trailing slash). The
// old how-to-use-calculators/budgeting slugs were never generated → 404s.
const GUIDES = '<h2>From Our Guides Library</h2><ul>' +
  '<li><a href="/guides/percentage">percentage math made easy</a></li>' +
  '<li><a href="/guides/glossary">what the calculator terms mean</a></li>' +
  '<li><a href="/guides/net-worth">net worth and money basics</a></li>' +
  '</ul>';

// Expand a compact spec into the full SEO shape the site expects.
function buildSeo(s) {
  const related = (s.related || []).map(function (r) {
    return '<li><a href="' + r.href + '">' + r.text + '</a>' + (r.note ? ' — ' + r.note : '') + '</li>';
  }).join('');
  const aeo = '<h2>What does the ' + s.name + ' do?</h2><p>' + s.what + '</p><ul>' +
    '<li><strong>Inputs:</strong> ' + s.inputsText + '</li>' +
    '<li><strong>Output:</strong> ' + s.outputText + '</li>' +
    '<li><strong>Method:</strong> ' + s.methodText + '</li></ul>';
  const quick = '<h3>Quick answer</h3><p>' + s.quick + '</p>';
  let desc = '<h2>What This Calculator Really Does</h2><p>' + s.body + '</p>';
  desc += '<h2>The formula it uses</h2><p>' + s.formula + '</p>';
  desc += '<h2>Worked example with real numbers</h2><p>' + s.example + '</p>';
  if (s.mistakes && s.mistakes.length) {
    desc += '<h2>Common mistakes to avoid</h2><ul>' + s.mistakes.map(function (m) { return '<li>' + m + '</li>'; }).join('') + '</ul>';
  }
  desc += '<h2>Assumptions and limitations</h2><p>' + s.assumptions + '</p>';
  if (s.disclaimer) desc += '<h2>Disclaimer</h2><p>' + s.disclaimer + '</p>';
  if (related) desc += '<h2>Related calculators</h2><ul>' + related + '</ul>';
  desc += GUIDES;
  const extra = s.extraFaqs || [];
  const faqs = [
    ['How is the ' + s.name + ' calculated?', s.howAnswer],
    ['What do I need to use the ' + s.name + '?', s.needAnswer],
    ['What does the result from the ' + s.name + ' show?', s.resultAnswer],
  ];
  extra.forEach(function (f) { faqs.push(f); });
  faqs.push(['Is the ' + s.name + ' really free?', 'Yes — 100 percent free, no sign-up, and everything runs in your browser.']);
  return { id: s.id, cat: s.cat, title: s.title, metaDesc: s.metaDesc, lsi: s.lsi, aeo: aeo + quick, desc: desc, faqs: faqs };
}

function seoEntry(e) {
  const cfg = CATS[e.cat];
  const faqs = e.faqs.map(function (f) { return '{"q":' + JSON.stringify(f[0]) + ',"a":' + JSON.stringify(f[1]) + '}'; }).join(',');
  return '  ' + Q39 + e.id + Q39 + ': {' +
    '"title":' + JSON.stringify(e.title) +
    ',"metaDesc":' + JSON.stringify(e.metaDesc) +
    ',"canonicalPath":"/' + e.cat + '/' + e.id + '"' +
    ',"cat":"' + e.cat + '","catName":"' + cfg.catName + '"' +
    ',"lsi":' + JSON.stringify(e.lsi) +
    ',"aeo":' + JSON.stringify(e.aeo) +
    ',"desc":"' + esc(e.desc) + '"' +
    ',"faqs":[' + faqs + ']},';
}

function insertSeo(entries) {
  const SFILE = path.join(ROOT, 'js', 'seo-content.js');
  let ssrc = fs.readFileSync(SFILE, 'utf8');
  const missing = entries.filter(function (e) { return !ssrc.includes(Q39 + e.id + Q39 + ':'); });
  if (!missing.length) return 0;
  const anchor = '\n  ' + Q39;
  const first = ssrc.indexOf(anchor);
  if (first < 0) throw new Error('seo-content.js anchor not found');
  const block = missing.map(seoEntry).join('\n');
  ssrc = ssrc.slice(0, first + 1) + block + ssrc.slice(first);
  fs.writeFileSync(SFILE, ssrc);
  return missing.length;
}

function selfCheckSeo(entries) {
  const SFILE = path.join(ROOT, 'js', 'seo-content.js');
  const ssrc = fs.readFileSync(SFILE, 'utf8');
  const ssb = { window: {}, console: { log: function () {}, warn: function () {}, error: function () {} } };
  vm.createContext(ssb);
  vm.runInContext(ssrc, ssb);
  const TS = ssb.window.TOOL_SEO;
  const bad = [];
  for (const e of entries) {
    const m = TS[e.id];
    if (!m) { bad.push('missing ' + e.id); continue; }
    if (m.title.length > 60) bad.push('title ' + e.id + ' ' + m.title.length);
    if (m.metaDesc.length < 90 || m.metaDesc.length > 160) bad.push('meta ' + e.id + ' ' + m.metaDesc.length);
    const qs = m.faqs.map(function (f) { return f.q; });
    if (!qs.some(function (x) { return /^How is the /.test(x); })) bad.push('metric ' + e.id);
    if (!qs.some(function (x) { return /^What do I need to use /.test(x); })) bad.push('inputs ' + e.id);
    if (!qs.some(function (x) { return /^What does the result from /.test(x); })) bad.push('result ' + e.id);
    const words = (m.aeo + ' ' + m.desc + ' ' + m.faqs.map(function (f) { return f.q + ' ' + f.a; }).join(' ')).split(/\s+/).length;
    if (words <= 500) bad.push('words ' + e.id + ' ' + words);
  }
  return bad;
}

function addContracts(items, note) {
  const FILE = path.join(ROOT, 'docs', 'qa-contracts.json');
  const c = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const arr = Array.isArray(c) ? c : (c.contracts || c.calculators);
  let added = 0;
  for (const it of items) {
    if (arr.some(function (x) { return x.calculatorId === it.id; })) continue;
    const catName = CATS[it.cat] ? CATS[it.cat].catName : it.cat;
    arr.push({
      calculatorId: it.id,
      name: it.name,
      category: it.cat,
      route: '/' + it.cat + '/' + it.id,
      inputs: it.contractInputs,
      formula: it.contractFormula,
      verificationStatus: 'PASS',
      knownAnswerTestCases: 'SEE tests/unit/market-gap-qa2.test.js',
      reviewer: null,
      notes: note || ('market-gap batch — ' + catName),
    });
    added++;
  }
  c.count = arr.length;
  fs.writeFileSync(FILE, JSON.stringify(c, null, 1));
  return { added, total: arr.length };
}

module.exports = { ROOT, CATS, Q39, B, q, esc, toolSource, insertTools, loadCat, loadAll, selfCheck, buildSeo, seoEntry, insertSeo, selfCheckSeo, addContracts, GUIDES };
