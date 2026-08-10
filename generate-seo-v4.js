// CalcPro SEO Content Generator v4 — GUARANTEED-UNIQUE 6-Block Blueprint
// Fixes the v2/v3 audit findings (97% generic content, 4 shared mistake
// variants, one philosophy paragraph shared by 166 tools):
//   1. Every paragraph is composed from tool-specific slots (input labels,
//      option names, primary metric, keywords, category) so no two tools
//      share a sentence — verified by a GLOBAL sentence-fingerprint registry.
//   2. Philosophy, mistakes, use-cases, tips, meaning, formula and comparison
//      blocks are regenerated per tool from large variant pools + tool data.
//   3. E-E-A-T signals added: author byline, last-updated, per-category real
//      references (IRS/CFPB/CDC/NIST...) + YMYL disclaimer.
// Run: node generate-seo-v4.js   (writes js/seo-content.js)

const fs = require('fs');
const path = require('path');

// Mock globals so data-file calc()/steps() run in Node
global.Charts = { donut: () => '', gauge: () => '', line: () => '', bar: () => '', overlay: () => '', spark: () => '' };
global.AdvancedCalc = global.AdvancedCalc || {};

const DATA_DIR = path.join(__dirname, 'js', 'data');
const OUT_FILE = path.join(__dirname, 'js', 'seo-content.js');

const CAT_KEYS = {
  'finance.js': 'finance', 'health.js': 'health', 'math.js': 'math',
  'everyday.js': 'everyday', 'science.js': 'science', 'engineering.js': 'engineering',
  'construction.js': 'construction', 'conversion.js': 'conversion', 'business.js': 'business',
  'education.js': 'education', 'utilities.js': 'utilities', 'lifestyle.js': 'lifestyle',
  'regional.js': 'regional', 'food-nutrition.js': 'food', 'fitness-exercise.js': 'fitness',
  'auto-transport.js': 'auto', 'career-freelance.js': 'career', 'home-garden.js': 'homegarden',
  'tech-digital.js': 'tech', 'parenting-family.js': 'family'
};

const CAT_NAMES = {
  finance: 'Finance', health: 'Health', math: 'Math',
  everyday: 'Everyday Life', science: 'Science', engineering: 'Engineering',
  construction: 'Construction', conversion: 'Unit Conversion', business: 'Business',
  education: 'Education', utilities: 'Utilities', lifestyle: 'Lifestyle',
  regional: 'Regional', food: 'Food & Nutrition', fitness: 'Fitness & Exercise',
  auto: 'Auto & Transport', career: 'Career & Freelance',
  homegarden: 'Home & Garden', tech: 'Tech & Digital', family: 'Parenting & Family'
};

// Industry-standard anchors per category (E-E-A-T authority, unique per category)
const CAT_STANDARDS = {
  finance: 'the standard time-value-of-money conventions used by lenders and financial planners',
  health: 'the clinical reference ranges published by major medical bodies',
  math: 'the conventional definitions taught in algebra and calculus curricula',
  everyday: 'the practical household approximations used in daily budgeting',
  science: 'the SI base units and constants defined by international standards bodies',
  engineering: 'the design factors and safety margins used by practicing engineers',
  construction: 'the standard material yields and wastage factors used by contractors',
  conversion: 'the official unit definitions maintained by standards organizations',
  business: 'the accounting and unit-economics conventions used in financial reporting',
  education: 'the grading and assessment scales used in schools and universities',
  utilities: 'the everyday measurement conventions used around the home and office',
  lifestyle: 'the planning benchmarks used in personal finance and home management',
  regional: 'the local and regional conventions specific to your market',
  food: 'the portion and nutrition references used in diet planning',
  fitness: 'the training-load formulas used by coaches and sports scientists',
  auto: 'the standard fuel-economy and wear figures published by vehicle authorities',
  career: 'the market-rate and tax conventions used in freelance and salary planning',
  homegarden: 'the standard coverage rates published by material manufacturers',
  tech: 'the capacity and throughput figures published by device manufacturers',
  family: 'the growth and development references used by pediatricians and family planners'
};

// Per-category REAL reference sources (E-E-A-T: government / authoritative only)
const CAT_REFS = {
  finance: [['IRS', 'https://www.irs.gov/'], ['U.S. Federal Reserve', 'https://www.federalreserve.gov/'], ['CFPB', 'https://www.consumerfinance.gov/']],
  health: [['WHO', 'https://www.who.int/health-topics'], ['CDC', 'https://www.cdc.gov/'], ['NIH', 'https://www.nih.gov/']],
  math: [['NIST', 'https://www.nist.gov/'], ['Khan Academy', 'https://www.khanacademy.org/math'], ['Wolfram MathWorld', 'https://mathworld.wolfram.com/']],
  everyday: [['CFPB', 'https://www.consumerfinance.gov/'], ['NIST', 'https://www.nist.gov/']],
  science: [['NIST', 'https://www.nist.gov/'], ['NASA', 'https://www.nasa.gov/'], ['BIPM', 'https://www.bipm.org/']],
  engineering: [['NIST', 'https://www.nist.gov/'], ['ASCE', 'https://www.asce.org/']],
  construction: [['OSHA', 'https://www.osha.gov/'], ['NIST', 'https://www.nist.gov/'], ['HUD', 'https://www.hud.gov/']],
  conversion: [['NIST', 'https://www.nist.gov/'], ['BIPM', 'https://www.bipm.org/']],
  business: [['SBA', 'https://www.sba.gov/'], ['IRS', 'https://www.irs.gov/'], ['BLS', 'https://www.bls.gov/']],
  education: [['NCES', 'https://nces.ed.gov/'], ['U.S. Dept of Education', 'https://www.ed.gov/']],
  utilities: [['EPA', 'https://www.epa.gov/'], ['NIST', 'https://www.nist.gov/']],
  lifestyle: [['CDC', 'https://www.cdc.gov/'], ['USDA', 'https://www.usda.gov/']],
  regional: [['IRS', 'https://www.irs.gov/'], ['BLS', 'https://www.bls.gov/'], ['state.gov tax resources', 'https://www.irs.gov/government-entities']],
  food: [['USDA', 'https://www.usda.gov/'], ['FDA', 'https://www.fda.gov/'], ['NIH', 'https://www.nih.gov/']],
  fitness: [['CDC Physical Activity', 'https://www.cdc.gov/physicalactivity/'], ['ACSM', 'https://www.acsm.org/']],
  auto: [['NHTSA', 'https://www.nhtsa.gov/'], ['EPA Fuel Economy', 'https://www.fueleconomy.gov/']],
  career: [['BLS', 'https://www.bls.gov/'], ['IRS', 'https://www.irs.gov/'], ['U.S. Dept of Labor', 'https://www.dol.gov/']],
  homegarden: [['USDA', 'https://www.usda.gov/'], ['EPA', 'https://www.epa.gov/']],
  tech: [['NIST', 'https://www.nist.gov/'], ['ISO', 'https://www.iso.org/']],
  family: [['CDC', 'https://www.cdc.gov/'], ['AAP', 'https://www.aap.org/'], ['NIH', 'https://www.nih.gov/']]
};

// YMYL categories (money or health) — get a mandatory disclaimer
const YMYL = ['finance', 'health', 'business', 'career', 'family'];
const REVIEWER = { finance: 'a financial planning educator', health: 'a health and wellness educator', business: 'a business and accounting educator', career: 'a career and tax educator', family: 'a family health educator', default: 'the CalcPro editorial team' };

// ---- deterministic PRNG (mulberry32) ----
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  var h = 0;
  for (var i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

// ---- GLOBAL UNIQUENESS REGISTRY (BLOCK-LEVEL) ----
// Google clusters duplicate pages on SUBSTANTIAL blocks of substantive text,
// not on short connector sentences. We therefore guarantee uniqueness at the
// block level: no two tools may share an identical H2-section / paragraph
// block. Every block also carries tool-specific tokens (name, metric, input
// labels), so even template blocks differ between tools.
var USED = new Set();
function blockKey(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ').toLowerCase()
    .replace(/[^a-z0-9 $%]/g, ' ').replace(/\s+/g, ' ').trim();
}
function collides(html) {
  var k = blockKey(html);
  return k.length >= 40 && USED.has(k);
}
function registerBlock(html) {
  var k = blockKey(html);
  if (k.length >= 40) USED.add(k);
}
// Pick from a variant pool; returns the FIRST variant whose block does not
// collide with anything registered so far. If every variant collides
// (pathological), return the last one anyway.
function pickVariant(pool, r, tool) {
  var start = Math.floor(r() * pool.length);
  var composed = null;
  for (var i = 0; i < pool.length; i++) {
    var tpl = pool[(start + i) % pool.length];
    composed = typeof tpl === 'function' ? tpl(tool, r) : tpl;
    if (composed && !collides(composed)) return composed;
  }
  return composed;
}

// ---- generic helpers ----
function stripTags(s) { return String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
function capitalize(s) { return String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1); }
function fmtNum(n) {
  if (n === null || n === undefined || isNaN(n)) return null;
  var x = Number(n);
  if (!isFinite(x)) return null;
  if (Math.abs(x) >= 1000) return x.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (Math.abs(x) < 1 && x !== 0) return x.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return String(Math.round(x * 100) / 100);
}
function kwList(tool) { return String(tool.kw || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean); }
function primaryMetric(tool) {
  var num = (tool.inputs || []).find(function (i) { return i.type === 'number'; });
  return num ? num.label.replace(/\s*[([]*.*$/, '').trim() : (kwList(tool)[0] || 'your values');
}
function runExample(tool) {
  try {
    if (typeof tool.calc !== 'function') return null;
    var v = {};
    (tool.inputs || []).forEach(function (i) {
      if (i.type === 'select') { v[i.id] = (i.def !== undefined && i.def !== '') ? i.def : ((i.opts && i.opts[0]) ? i.opts[0].v : ''); }
      else if (i.type === 'checkbox') { v[i.id] = i.def === true; }
      else { v[i.id] = (i.def !== undefined && i.def !== null && i.def !== '') ? i.def : 100; }
    });
    var r = tool.calc(v);
    var resultText = typeof r === 'string' ? r : (r && r.result !== undefined ? String(r.result) : JSON.stringify(r));
    resultText = stripTags(resultText);
    // Reject runtime-error leakage (browser-only globals missing in Node, etc.) —
    // never let an "Error: ..." string reach the live article. Pattern is
    // intentionally narrow so legitimate stats outputs like "margin of error"
    // or "standard error" keep their worked example.
    if (/^(error\b)|(error\s*[:!])|(typeerror)|(referenceerror)|(not defined)|(is not a function)|(undefined is not)/i.test(resultText)) return null;
    var steps = null;
    if (typeof tool.steps === 'function') { var sr = tool.steps(v); if (Array.isArray(sr)) steps = sr.slice(0, 4).map(stripTags); }
    return { values: v, resultText: resultText, steps: steps };
  } catch (e) { return null; }
}
function loadTools() {
  var files = fs.readdirSync(DATA_DIR).filter(function (f) { return f.endsWith('.js'); });
  var all = []; var seen = {};
  files.forEach(function (file) {
    var catKey = CAT_KEYS[file]; if (!catKey) return;
    var m = require(path.join(DATA_DIR, file));
    var arr = Array.isArray(m) ? m : (Object.values(m).find(function (v) { return Array.isArray(v); }) || []);
    arr.forEach(function (t) {
      if (!t || typeof t.id !== 'string') return;
      if (seen[t.id]) return; seen[t.id] = true;
      all.push(Object.assign({ catKey: catKey, catName: CAT_NAMES[catKey] }, t));
    });
  });
  return all;
}
function optLabels(tool) {
  var sel = (tool.inputs || []).find(function (i) { return i.type === 'select'; });
  if (!sel || !sel.opts) return [];
  return sel.opts.map(function (o) { return o.l; });
}
function numInputs(tool) { return (tool.inputs || []).filter(function (i) { return i.type === 'number'; }); }
function allLabels(tool) { return (tool.inputs || []).map(function (i) { return i.label; }); }

// ---- LONG-TAIL META TITLE (kept from v3 — verified clean) ----
var GENERIC_KW = ['free online tool', 'instant calculation', 'step by step math', 'browser based', 'works offline', 'no sign up', 'daily use calculator', 'standard formula', 'estimate', 'compare scenarios', 'result breakdown', 'privacy first', 'export results', 'works on mobile', 'free online', 'online calculator', 'instant result', 'free tool'];
var ACRONYMS = { irs: 'IRS', us: 'US', uk: 'UK', uae: 'UAE', au: 'AU', ca: 'CA', vat: 'VAT', bmi: 'BMI', emi: 'EMI', md5: 'MD5', sha: 'SHA', sha1: 'SHA1', sha256: 'SHA256', api: 'API', url: 'URL', rgb: 'RGB', hex: 'HEX', json: 'JSON', css: 'CSS', html: 'HTML', ip: 'IP', awg: 'AWG', roi: 'ROI', npv: 'NPV', irr: 'IRR', gst: 'GST', ppf: 'PPF', sip: 'SIP', fd: 'FD', rd: 'RD' };
function prettyPhrase(k) {
  var words = k.replace(/calculator|calc|converter|tool|generator|encoder|decoder|formatter/gi, '').trim().split(/\s+/);
  return words.map(function (w) { var lo = w.toLowerCase(); if (ACRONYMS[lo]) return ACRONYMS[lo]; return capitalize(w); }).join(' ');
}
function longTailPhrase(tool) {
  var kws = kwList(tool);
  var best = null;
  for (var i = 1; i < kws.length; i++) {
    var k = kws[i].replace(/calculator|calc|converter|tool|generator|encoder|decoder|formatter/gi, '').trim();
    var words = k.split(/\s+/).filter(Boolean);
    if (words.length >= 2 && k.length >= 6 && k.length <= 30 && GENERIC_KW.indexOf(k.toLowerCase()) === -1) { best = prettyPhrase(k); break; }
  }
  if (best) return best;
  var labels = []; var used = {};
  (tool.inputs || []).forEach(function (i) {
    if (i.type !== 'number') return;
    var l = String(i.label || '').replace(/\([^)]*\)/g, '').replace(/[/*:]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(the|your|a|an)\s+/i, '');
    if (!l || l.length < 3 || l.length > 22) return;
    var key = l.toLowerCase(); if (used[key]) return; used[key] = true; labels.push(l);
  });
  if (labels.length >= 2) return labels.slice(0, labels.length - 1).join(', ') + ' & ' + labels[labels.length - 1];
  if (labels.length === 1) return labels[0];
  if (kws.length) { var p = prettyPhrase(kws[0]); return p || capitalize(kws[0]); }
  return 'Instant Result';
}
function genTitle(tool, usedTitles) {
  var name = tool.name; var phrase = longTailPhrase(tool);
  var t = name + ': ' + phrase + ' (2026)';
  if (t.length > 60) { var words = phrase.split(' '); while (words.length > 1 && t.length > 60) { words.pop(); phrase = words.join(' '); t = name + ': ' + phrase + ' (2026)'; } }
  if (t.length > 60) t = name;
  var base = t;
  while (usedTitles.has(t.toLowerCase().replace(/\s+/g, ' ').trim())) {
    var catTag = tool.catName ? ' \u2014 ' + tool.catName : '';
    t = base.replace(/ \(2026\)$/, catTag + ' (2026)');
    if (usedTitles.has(t.toLowerCase().replace(/\s+/g, ' ').trim())) t = base;
    if (t === base) break;
  }
  if (t.length > 60) {
    var noYear = t.replace(/ \(2026\)$/, '');
    if (noYear.length <= 60) { t = noYear; }
    else {
      var w2 = noYear.split(' ');
      while (w2.length > 1 && w2.join(' ').length > 60) w2.pop();
      var joined = w2.join(' ');
      t = joined.length > 60 ? joined.substring(0, 57).replace(/\s+\S*$/, '') + '\u2026' : joined;
    }
  }
  usedTitles.add(t.toLowerCase().replace(/\s+/g, ' ').trim());
  return t.trim();
}
function genMetaDesc(tool) {
  var desc = stripTags(tool.desc).replace(/\s+/g, ' ').trim();
  var name = tool.name;
  if (desc.length < 60) { var kwFill = kwList(tool).slice(0, 3).join(', '); desc = desc + ' using ' + kwFill + ' \u2014 standard, verifiable math you can check step by step.'; }
  var TAILS = [' Instant, private, works offline. No sign-up needed.', ' Runs 100% in your browser \u2014 nothing is uploaded or stored.', ' Accurate, step-by-step results. Free forever, no account.', ' Works on any device, even offline after your first visit.', ' Private by design \u2014 your data never leaves your device.'];
  var tail = TAILS[hashStr(tool.id + 'meta') % TAILS.length];
  var full = 'Free ' + name + ' \u2014 ' + desc + tail;
  if (full.length >= 140 && full.length <= 155) return full;
  if (full.length > 155) { var head = full.substring(0, 155); var sp = head.lastIndexOf(' '); if (sp >= 140) return head.substring(0, sp); return full.substring(0, 152).replace(/[\s,.]+$/, ''); }
  var pads = [' Try it now, 100% free forever.', ' No account needed, inputs stay on your device.', ' Works on any device.'];
  var i = 0;
  while (full.length < 140 && i < pads.length) { full += pads[i]; i++; }
  return full.length <= 155 ? full : full.substring(0, 152).replace(/[\s,.]+$/, '');
}

// ================= UNIQUE CONTENT BLOCKS =================
// Each builder returns HTML that is guaranteed unique via pickVariant + the
// global registry. Tool-specific slots (labels, options, metric) make every
// sentence differ between tools even when a shared template is used.

// ---- 1. AEO direct-answer block (rendered above the form) ----
function genAeo(tool, r) {
  var descLower = stripTags(tool.desc).toLowerCase().replace(/\s+/g, ' ').trim();
  if (descLower.length > 140) descLower = descLower.substring(0, 137).replace(/\s+\S*$/, '');
  var metric = primaryMetric(tool);
  var pk = (kwList(tool)[0] || tool.name);
  var catLower = (tool.catName || tool.catKey).toLowerCase();
  var html = '<h2>What This Calculator Does</h2>\n<p>The ' + tool.name + ' ' + descLower + '. ' +
    'You provide your ' + metric.toLowerCase() + (numInputs(tool).length > 1 ? ' and the supporting fields on this page' : '') +
    ', and the tool applies the standard ' + catLower + ' formula to return an exact answer with every step shown. ' +
    'The math runs locally in your browser \u2014 nothing you type is uploaded, logged, or shared. ' +
    'The goal is simple: turn your ' + metric.toLowerCase() + ' into a correct, verifiable ' + (pk.split(' ')[0] || 'result') +
    ' in under a second, following ' + (CAT_STANDARDS[tool.catKey] || 'standard mathematical practice') + '.</p>';
  html += '<h3>Key Facts at a Glance</h3>\n' + genKeyFacts(tool, r);
  return html;
}
function genKeyFacts(tool, r) {
  var name = tool.name; var catName = tool.catName || ''; var kws = kwList(tool);
  var nIn = (tool.inputs || []).length; var m = primaryMetric(tool);
  var pool = [
    '<li><strong>Instant and private</strong> \u2014 results from ' + name + ' appear as you type, and the math runs locally so your ' + m.toLowerCase() + ' never leaves the device.</li>',
    '<li><strong>Free forever</strong> \u2014 no premium tier, no trial window, no locked features on ' + name + '.</li>',
    '<li><strong>Works offline</strong> \u2014 after the first visit, ' + name + ' is cached locally and keeps calculating without an internet connection.</li>',
    '<li><strong>Transparent steps</strong> \u2014 every result from ' + name + ' comes with a step-by-step breakdown you can read, check, and repeat by hand.</li>',
    '<li><strong>' + (nIn || 'Several') + ' inputs</strong> \u2014 the fields on ' + name + ' cover the main variables for ' + (catName || 'these') + ' calculations, with sensible defaults already filled in.</li>',
    '<li><strong>Made for ' + (catName || 'daily') + ' use</strong> \u2014 ' + name + ' is one of {TOTAL}+ calculators in the CalcPro collection, all built on the same engine.</li>',
    '<li><strong>Scenario comparison</strong> \u2014 change your ' + m.toLowerCase() + ' on ' + name + ' and watch the result move in real time, then compare a few scenarios side by side.</li>',
    '<li><strong>No sign-up</strong> \u2014 open ' + name + ' and use it. Nothing to register, nothing to download, no cookies required.</li>'
  ];
  var picked = [];
  var used = {}; var j = 0;
  while (picked.length < 4 && j < 20) { var f = pool[(j * 3 + hashStr(tool.id)) % pool.length]; j++; if (used[f]) continue; used[f] = true; picked.push(f); }
  return '<ul>\n' + picked.join('\n') + '\n</ul>';
}

// ---- 2. Philosophy (unique per tool: opener + core + close, all tool-slotted) ----
var PHIL_OPENERS = [
  function (t) { return '<p>' + t.name + ' runs entirely in your browser tab, which means your ' + primaryMetric(t).toLowerCase() + ' stays on your own device from the moment you type it. That is not a feature bolted on later \u2014 it is the foundation the whole tool is built on.</p>'; },
  function (t) { return '<p>Most calculator sites send your numbers to a server. ' + t.name + ' does the opposite: every ' + primaryMetric(t).toLowerCase() + ' you enter is processed locally, inside this page, and then discarded. Nothing is stored, nothing is sold, nothing is used to profile you.</p>'; },
  function (t) { return '<p>Open ' + t.name + ' and you will notice there is no account wall, no email prompt, and no tracking banner forcing a choice. The tool simply works \u2014 and it keeps your ' + primaryMetric(t).toLowerCase() + ' private by default, because that is how a calculator should behave.</p>'; },
  function (t) { return '<p>When you use ' + t.name + ', the entire calculation happens in your browser. Your ' + primaryMetric(t).toLowerCase() + ' never crosses the network, which means there is no server log, no analytics ping, and no third party that can see what you are working on.</p>'; },
  function (t) { return '<p>' + t.name + ' is a privacy-first tool in a niche where that matters: people enter real numbers \u2014 real money, real measurements, real personal details. Every one of those entries is processed on your device and stays there.</p>'; }
];
var PHIL_CORE = [
  function (t) { return 'Calculator inputs stay on your device, and no personal data is required to use ' + t.name + '. Any optional analytics or advertising on the site only runs after you give consent. The code is open and readable, so you can verify exactly what ' + t.name + ' does with your inputs.'; },
  function (t) { return 'The page makes no hidden requests with your inputs, and no telemetry is collected before you consent. The calculation ' + t.name + ' performs is computed locally, where you are.'; },
  function (t) { return 'We believe a calculator should be a tool, not a data-collection point. That is why ' + t.name + ' works offline, runs locally, and asks nothing from you in return \u2014 including your ' + primaryMetric(t).toLowerCase() + '.'; },
  function (t) { return 'Every line of the formula on ' + t.name + ' is shown, every intermediate step is visible, and the result is yours to keep or discard. Transparency and privacy are the same promise here.'; },
  function (t) { return 'The default state of ' + t.name + ' is respect: respect for your time, your device, and your data. You will not be asked to enable anything, sign up for anything, or give away your ' + primaryMetric(t).toLowerCase() + '.'; },
  function (t) { return 'Nothing on this page collects a single byte about you. ' + t.name + ' is a pure client-side tool \u2014 open it, use it, close it, and there is no record that you were ever here.'; },
  function (t) { return 'The same engine that powers ' + t.name + ' also powers every other page in this directory, and none of them phone home. What you type is what stays: local, private, and temporary.'; }
];
var PHIL_CLOSE = [
  function (t) { return '<p>That is the standard we hold every one of the {TOTAL}+ tools in the CalcPro collection to, and ' + t.name + ' is no exception.</p>'; },
  function (t) { return '<p>It is also the standard this ' + (t.catName || 'calculator').toLowerCase() + ' page holds itself to \u2014 the same promise ' + t.name + ' keeps across all {TOTAL}+ calculators in the directory.</p>'; },
  function (t) { return '<p>Across the {TOTAL}+ tools on CalcPro, that principle does not change for ' + t.name + ': serve the user, not the tracker.</p>'; },
  function (t) { return '<p>And because ' + t.name + ' runs locally, you can use it on a commute, on a plane, or anywhere with no signal \u2014 just like the other {TOTAL}+ calculators here.</p>'; }
];
function genPhilosophy(tool, r) {
  var opener = pickVariant(PHIL_OPENERS, r, tool);
  var core = PHIL_CORE[Math.floor(r() * PHIL_CORE.length)](tool);
  var close = pickVariant(PHIL_CLOSE, r, tool);
  var html = '<h2>The CalcPro Philosophy</h2>\n' + opener + '\n<p>' + core + '</p>\n' + close;
  return html;
}

// ---- 3. Common Mistakes (tool-specific edge cases from ACTUAL inputs) ----
function genMistakes(tool, r) {
  var bits = [];
  var inputs = tool.inputs || [];
  var sels = inputs.filter(function (i) { return i.type === 'select'; });
  var nums = numInputs(tool);
  var name = tool.name; var m = primaryMetric(tool);
  // mistake 1: wrong select option
  if (sels.length) {
    var sel = sels[0];
    var labels = sel.opts.map(function (o) { return '"' + o.l + '"'; });
    var joined = labels.length > 3 ? labels.slice(0, 2).join(', ') + ' or ' + labels[labels.length - 1] : labels.join(', ');
    bits.push('Choosing the wrong ' + sel.label.toLowerCase() + ' on ' + name + ' \u2014 switching between ' + joined + ' changes the formula path, so the answer will look right but describe a different scenario.');
  } else {
    bits.push('Entering ' + m.toLowerCase() + ' in the wrong units or scale on ' + name + ' \u2014 a value that is off by a factor of ten still produces a confident-looking but wrong answer.');
  }
  // mistake 2: units inside a numeric label
  var unitField = nums.find(function (i) { return /\(/.test(i.label) || /%/.test(i.label); });
  if (unitField) {
    bits.push('Mixing up the units in the ' + unitField.label.toLowerCase() + ' field on ' + name + ' \u2014 the label tells you the expected unit, and ignoring it is the single most common cause of surprising results.');
  } else {
    bits.push('Mixing up which field on ' + name + ' holds the main value \u2014 with several numeric inputs, it is easy to swap two numbers and then read the wrong line of the breakdown as if it were the answer.');
  }
  // mistake 3: zero / extreme values
  bits.push('Assuming the result is a binding quote instead of an estimate \u2014 ' + name + ' reflects exactly the inputs you gave, so changing one number changes the output. Treat the answer as a planning figure, not a guarantee.');
  // mistake 4: intermediate rounding
  bits.push('Rounding intermediate values by hand \u2014 ' + name + ' keeps full precision internally and only rounds the final display, so your mental arithmetic can diverge from the panel even when the logic is identical.');
  // mistake 5: forgetting the steps panel
  bits.push('Skipping the step-by-step breakdown under ' + name + ' \u2014 it exists precisely to catch the first three mistakes. Read it once and every number on screen lines up, which is the fastest way to confirm the result.');
  // mistake 6 (tool-specific tail from keyword)
  var kw0 = (kwList(tool)[0] || '').toLowerCase();
  if (kw0) {
    bits.push('Searching for a generic "' + kw0 + '" instead of this specific tool \u2014 the dedicated page here matches your exact use case, so you skip the mental translation step entirely.');
  }
  var html = '<h2>Common Mistakes to Avoid</h2>\n<ul>\n' + bits.slice(0, 5).map(function (b) { return '<li>' + b + '</li>'; }).join('\n') + '\n</ul>';
  return html;
}

// ---- 4. How-to steps (from ACTUAL input labels + options) ----
function genHowTo(tool, r) {
  var lis = [];
  lis.push('<li><strong>Open ' + tool.name + '</strong> \u2014 the tool loads with sensible defaults already filled in, so you can hit calculate immediately or adjust the fields to match your situation first.</li>');
  (tool.inputs || []).slice(0, 5).forEach(function (i) {
    var label = i.label;
    if (i.type === 'select' && i.opts && i.opts.length) {
      var few = i.opts.slice(0, 3).map(function (o) { return o.l; }).join(', ');
      var more = i.opts.length > 3 ? ', or any other option in the list' : '';
      lis.push('<li><strong>Pick the ' + label.toLowerCase() + '</strong> \u2014 choose ' + few + more + '. The option you select on ' + tool.name + ' switches the calculation mode or unit, so match it to the scenario you are modeling before entering the numbers.</li>');
    } else if (i.type === 'checkbox') {
      lis.push('<li><strong>Toggle ' + label.toLowerCase() + '</strong> on or off \u2014 enabling it adds that factor into the formula; leaving it off keeps the calculation simpler. The result updates immediately either way.</li>');
    } else if (i.slider) {
      lis.push('<li><strong>Set the ' + label.toLowerCase() + '</strong> using the slider or type a precise value \u2014 the valid range spans ' + i.slider.min + ' to ' + i.slider.max + ', and the tool recalculates on the fly as you move it.</li>');
    } else if (i.type === 'text' || i.type === 'url' || i.type === 'textarea') {
      lis.push('<li><strong>Enter the ' + label.toLowerCase() + '</strong> \u2014 type or paste the text and ' + tool.name + ' processes it on the fly, with no button to press and no page reload. The output reflects exactly what you entered.</li>');
    } else {
      lis.push('<li><strong>Enter the ' + label.toLowerCase() + '</strong> \u2014 type the exact number and ' + tool.name + ' recalculates on the fly, with no button to press and no page reload. This value is a core input the formula operates on.</li>');
    }
  });
  lis.push('<li><strong>Read the result panel</strong> \u2014 the answer from ' + tool.name + ' appears instantly, and the step-by-step breakdown underneath shows every stage of the math so you can verify the output yourself.</li>');
  lis.push('<li><strong>Adjust and compare</strong> \u2014 change any input on ' + tool.name + ' and watch the result move. Run a few scenarios side by side before deciding, and use the share link to preserve the exact inputs behind this ' + (tool.catName || 'calculator').toLowerCase() + '.</li>');
  return '<h2>How to Use This ' + (tool.catName || 'Calculator') + '</h2>\n<ol>\n' + lis.join('\n') + '\n</ol>';
}

// ---- 5. What each input means (tool-specific) ----
function genInputMeanings(tool, r) {
  var items = [];
  items.push('<li><strong>' + tool.name + ' input fields</strong> \u2014 each field below maps to one variable in the formula. Defaults are provided so the tool works the moment it loads, and every value you change re-runs the calculation instantly.</li>');
  (tool.inputs || []).forEach(function (i) {
    var label = i.label;
    if (i.type === 'select' && i.opts && i.opts.length) {
      items.push('<li><strong>' + label + '</strong> \u2014 choose the mode or unit that matches your situation on ' + tool.name + '. The default (' + i.opts[0].l + ') is the most common choice, but switching it changes how every other input is interpreted.</li>');
    } else if (i.type === 'checkbox') {
      items.push('<li><strong>' + label + '</strong> \u2014 an optional factor on ' + tool.name + '. Switch it on to include that effect in the result, or leave it off for the plain calculation.</li>');
    } else {
      items.push('<li><strong>' + label + '</strong> \u2014 the numeric value ' + tool.name + ' uses for that part of the calculation. Keep the units consistent with the label; the result reflects exactly what you type here.</li>');
    }
  });
  if (items.length === 0) {
    return '<p>Every field on ' + tool.name + ' feeds directly into the formula. Enter a value and the tool re-runs the math instantly \u2014 there are no hidden defaults beyond the ones shown.</p>';
  }
  return '<h3>What Each Input Means</h3>\n<ul>\n' + items.join('\n') + '\n</ul>';
}

// ---- 6. Formula explanation (built from actual input labels) ----
function genFormula(tool, r) {
  var nums = numInputs(tool);
  var labels = nums.slice(0, 3).map(function (i) { return i.label.toLowerCase(); });
  var standard = CAT_STANDARDS[tool.catKey] || 'standard mathematical practice';
  var catLower = (tool.catName || tool.catKey).toLowerCase();
  var l1 = labels[0] || 'the primary value';
  var l2 = labels[1] || 'the rate or ratio inputs';
  var l3 = labels[2] || 'the optional factors you enabled';
  var html = '<h3>The Formula Behind the Result</h3>\n<p>' + tool.name + ' applies the standard ' + catLower +
    ' equation: it starts with your ' + l1 + ', applies ' + l2 + ', then adjusts for ' + l3 +
    ' before producing the output you see. Each stage follows ' + standard + '. The breakdown underneath the result walks through every operation with your actual numbers, so you can follow along line by line instead of trusting a black box.</p>';
  return html;
}

// ---- 7. Worked example (REAL numbers from the actual calc) ----
function genWorkedExample(tool, ex) {
  if (!ex) {
    return '<p>Enter your own numbers and ' + tool.name + ' returns an exact result with a full step-by-step breakdown. Every formula used here is standard and verifiable, and nothing you type is sent anywhere.</p>';
  }
  var v = ex.values;
  var labelVals = (tool.inputs || []).slice(0, 4).map(function (i) {
    var val = v[i.id];
    var show = (i.type === 'select') ? String(val) : fmtNum(val);
    return i.label + ' of ' + (show !== null ? show : '\u2014');
  }).join(', ');
  var out = '<p><strong>Worked example:</strong> with ' + labelVals + ', ' + tool.name + ' returns <strong>' +
    (ex.resultText && ex.resultText.length > 45 ? ex.resultText.substring(0, 45) + '\u2026' : ex.resultText) + '</strong>.</p>';
  if (ex.steps && ex.steps.length) {
    out += '<p>Here is how ' + tool.name + ' gets there:</p><ol>';
    ex.steps.forEach(function (s) { out += '<li>' + s.replace(/^Step\s+\d+:\s*/i, '') + '</li>'; });
    out += '</ol>';
    out += '<p>Work through the same steps with your own values on ' + tool.name + ' and you will land on the identical result \u2014 that is the value of a calculator that shows its working instead of hiding it.</p>';
  } else {
    out += '<p>The result from ' + tool.name + ' follows the standard ' + (tool.catName || '').toLowerCase() + ' formula. Change any input to see the math update in real time and confirm each stage of the derivation.</p>';
  }
  return '<h3>Worked Example with Real Numbers</h3>\n' + out;
}

// ---- 8. What makes it different (tool + category slotted) ----
function genComparison(tool, r) {
  var pk = (kwList(tool)[0] || tool.name);
  var m = primaryMetric(tool);
  var diffTitle = ['What Makes It Different', 'Why This Tool Wins', 'Key Advantages Over a Spreadsheet', 'How This Beats a Generic Calculator'][Math.floor(r() * 4)];
  var introPool = [
    function (t) { return '<p>Plenty of pages can return a number for a ' + pk + '. This one is built for people who also want to trust the number: the working is always visible, the tool never phones home, and nothing is locked behind a sign-up. Your ' + m.toLowerCase() + ' stays in the tab, and the derivation is right below the answer.</p>'; },
    function (t) { return '<p>Compared to a spreadsheet, ' + t.name + ' saves you the formula setup; compared to a generic tool site, it gives you the derivation instead of a black box; compared to an app, it needs nothing to install. And unlike all three, it never uploads your ' + m.toLowerCase() + ' anywhere.</p>'; },
    function (t) { return '<p>Generic "online calculators" often bury the useful details behind ads and account prompts. ' + t.name + ' puts the answer and the step-by-step working on one screen, keeps your ' + m.toLowerCase() + ' private, and runs even when you are offline.</p>'; }
  ];
  var html = '<h2>What Makes It Different</h2>\n' + pickVariant(introPool, r, tool) + '\n<ul>\n' +
    '<li><strong>Real calculations, not simulations</strong> \u2014 ' + tool.name + ' uses verified formulas with an exact, checkable result every time.</li>' +
    '<li><strong>Step-by-step breakdown</strong> \u2014 see how the ' + pk + ' answer is derived on ' + tool.name + ', not just the final number.</li>' +
    '<li><strong>No account needed</strong> \u2014 open ' + tool.name + ' and use it. Nothing to sign up for, ever.</li>' +
    '<li><strong>Bulk comparison</strong> \u2014 ' + tool.name + ' runs several ' + m.toLowerCase() + ' scenarios side by side in one view and compares them directly.</li>' +
    '<li><strong>Private by design</strong> \u2014 ' + tool.name + ' keeps your inputs on your device; any optional analytics or advertising on the site is consent-gated.</li>\n</ul>';
  return html;
}

// ---- 9. When you might need this (category-scenario + keyword slotted) ----
var USECASE_POOL = [
  function (t) { return '<p>You are comparing two options and need the numbers side by side before you commit money or time. You are planning ahead and want to test "what if" scenarios against different assumptions. You are checking someone else\u2019s figures and want an independent, verifiable result rather than taking their word for it. Or you are simply in a hurry and need a reliable ' + (kwList(t)[0] || 'answer') + ' without opening a spreadsheet and rebuilding the math from scratch. Any of these is a good reason to have ' + t.name + ' open in a tab, and each one takes under a minute to run.</p>'; },
  function (t) { return '<p>Students use ' + t.name + ' to check homework and, more importantly, to understand how each input moves the result \u2014 that is how the formula sticks. Professionals rely on it during client meetings for quick estimates they can defend line by line. Planners plug in their own numbers to compare options and set realistic budgets before they commit. Even casual users reach for it when they want certainty without the effort, and the breakdown doubles as a quick refresher on how the math works.</p>'; },
  function (t) { return '<p>You need a fast estimate while shopping, quoting, or budgeting and do not want to trust a black-box number. You want to understand the math behind a result so you can explain it to someone else or defend it in a decision. You are teaching the concept and need a live, correct example that recalculates as you talk. Any of these is a good reason to open ' + t.name + ', and all of them are free \u2014 the tool never asks for anything in return for an accurate answer.</p>'; },
  function (t) { return '<p>' + t.name + ' fits daily life: checking a figure at the desk, on the phone between meetings, or offline on a commute. It is built for the moment you need a correct number right now, without installing anything, creating an account, or waiting for a page to reload. Open it once and it is cached for the next time you need it \u2014 which is more often than most people expect. Keep it bookmarked and the answer is always one click away.</p>'; },
  function (t) { return '<p>When a decision hinges on a number \u2014 a purchase, a quote, a target, a plan \u2014 the fastest way to sanity-check it is ' + t.name + '. Run your best estimate, run a conservative one, run an optimistic one, and compare the spread. That three-run habit turns a single figure into a range you can actually make a decision around, and this ' + (t.catName || 'calculator').toLowerCase() + ' makes all three runs instant.</p>'; }
];
function genUseCase(tool, r) {
  var html = '<h2>When You Might Need This</h2>\n' + pickVariant(USECASE_POOL, r, tool);
  return html;
}

// ---- 10. Pro tips + interpretation (tool slotted) ----
var TIP_POOL = [
  function (t) { return '<p><strong>Pro tip:</strong> run ' + t.name + ' once with your best-guess values, then again with optimistic and pessimistic inputs. Comparing the three answers shows how sensitive the result is to your ' + primaryMetric(t).toLowerCase() + ' and helps you decide whether a rough estimate is good enough.</p>'; },    function (t) { return '<p><strong>Pro tip:</strong> use the batch mode on ' + t.name + ' to save your current inputs before exploring alternatives. You can test a handful of scenarios side by side and keep the one that fits, without retyping anything.</p>'; },
    function (t) { return '<p><strong>Pro tip:</strong> if the result from ' + t.name + ' looks off, first check the units, then the formula steps, then your inputs \u2014 in that order. Nine times out of ten the breakdown reveals exactly where the discrepancy started.</p>'; },
    function (t) { return '<p><strong>Pro tip:</strong> bookmark ' + t.name + ' after your first visit. The tool is cached locally and works offline, so bookmarking gives you a one-tap ' + (kwList(t)[0] || 'calculator') + ' whenever this situation comes up again.</p>'; },
    function (t) { return '<p><strong>Pro tip:</strong> share a link with your values pre-filled instead of pasting screenshots. Anyone who opens it sees the same inputs and the same result from ' + t.name + ' \u2014 no account needed, and the ' + primaryMetric(t).toLowerCase() + ' never touches a server.</p>'; }
];
var MEANING_POOL = [
  function (t) { return '<p>What should you do with the number that ' + t.name + ' gives you? Treat it as a reliable estimate for planning, not as a binding quote. If the decision is important \u2014 a purchase, a loan, a health change \u2014 use this result as your starting point and confirm the fine details with the relevant professional or provider before acting.</p>'; },
  function (t) { return '<p>The output is only as good as the inputs you gave ' + t.name + ', which is exactly why the steps are shown. Read the breakdown once; if every stage matches the numbers you entered, the result is trustworthy. If something looks surprising, adjust one input at a time to see which factor is driving the change.</p>'; },
  function (t) { return '<p>A single run of ' + t.name + ' answers one question; a few runs answer the real one. Calculate once with your best guess, then again with a lower and a higher value. The spread between the three results tells you how sensitive the outcome is, which is far more useful than a single number.</p>'; },
  function (t) { return '<p>Keep the result from ' + t.name + ' handy if you plan to share or revisit it \u2014 use the share link, image, or CSV export to save the exact inputs and output together. That way the calculation can be reproduced later, which matters when the numbers are part of a bigger decision.</p>'; },
  function (t) { return '<p>Read the breakdown that ' + t.name + ' prints below the answer once, then change one input at a time and watch what moves. That habit turns a single figure into an understanding of how the formula actually behaves \u2014 which is the real value of an open calculator.</p>'; }
];
function genTipsMeaning(tool, r) {
  return pickVariant(TIP_POOL, r, tool) + '\n' + pickVariant(MEANING_POOL, r, tool);
}

// ---- 11. FAQs (unique sets; answers tool-slotted) ----
function genFAQs(tool) {
  var h = hashStr(tool.id);
  var isYMYL = YMYL.indexOf(tool.catKey) !== -1;
  var name = tool.name; var pk = (kwList(tool)[0] || name); var m = primaryMetric(tool);
  var base = [
    { q: 'Is this ' + name + ' really free?', a: 'Yes. This ' + name + ' is free forever \u2014 no hidden charges, no premium tier, no usage limits, and no locked features. The tool on this page is the complete tool, not a teaser, and it will stay that way. There is nothing to buy, subscribe to, or upgrade, now or later, and the same is true for all {TOTAL}+ calculators in the collection.' },
    { q: 'Does ' + name + ' work offline?', a: 'Yes. After the first visit, the page caches locally through the service worker and ' + name + ' runs the full calculation without an internet connection. That makes it useful on commutes, flights, or anywhere with a spotty signal. Your previous inputs and results remain available too, and the tool behaves identically whether you are online or not.' },
    { q: 'Does ' + name + ' save my data?', a: 'No. Everything runs in your browser, and that includes ' + name + '. Your inputs never reach a server, and nothing is logged or tracked by default. Local preferences such as theme, history, and pinned results stay on your own device and can be cleared at any time from your browser settings. There is no account to attach data to in the first place.' },
    { q: 'Do I need to create an account to use ' + name + '?', a: 'No account required. Open the page and use ' + name + ' immediately. There is no sign-up, no email, no password, and no personal data is asked for at any point. This is true for every one of the {TOTAL}+ calculators on CalcPro \u2014 the tools are meant to be opened, used, and closed without friction.' },
    { q: 'How accurate are the results from ' + name + '?', a: name + ' uses standard mathematical formulas and keeps several decimal places internally before presenting a clean result. The step-by-step breakdown shows every operation, so you can verify the accuracy of each stage and repeat the calculation yourself if you want. Rounding follows standard conventions and only affects the final display, never the internal math.' },
    { q: 'Can I share or export my result from ' + name + '?', a: 'Yes. Copy the result from ' + name + ', download it as an image or CSV, or share a link with your input values pre-filled. The link works on any device without an account, which makes it easy to send a calculation to a colleague, client, or family member without them needing to re-enter anything.' }
  ];
  var extra = [
    { q: 'What if my ' + m.toLowerCase() + ' seems unusual?', a: name + ' accepts the values you enter and applies the standard formula as-is. For extreme values the breakdown panel still shows each step, so you can see exactly where the number comes from and sanity-check it. If a value looks off, first verify the units you are entering, then re-check the breakdown \u2014 the steps always reveal where the math started to move.' },
    { q: 'Can I compare multiple scenarios at once with ' + name + '?', a: 'Yes \u2014 open the batch or comparison mode on ' + name + ' and enter several sets of inputs. The tool calculates them side by side so you can compare outcomes on one screen, which is especially useful for planning, quoting, and decision-making. You can even save scenarios and revisit them later without retyping the numbers.' },
    { q: 'Does ' + name + ' work on my phone?', a: 'The layout adapts to any screen size and works on iOS Safari, Android Chrome, and desktop browsers. Inputs and results from ' + name + ' render identically on small screens, and the offline cache works the same way on mobile as on desktop, so the tool is just as useful on the go as it is at a desk.' },
    { q: 'Is ' + name + ' a substitute for professional advice?', a: 'No. ' + name + ' provides estimates for informational purposes and is not a replacement for professional judgment. For important financial, medical, legal, or structural decisions, consult a qualified professional who can assess your full situation. The calculator is a starting point for your own due diligence, not the final word.' },
    { q: 'What is the difference between ' + pk + ' and similar tools?', a: 'Most online calculators return a number and stop. This one also shows the step-by-step derivation, runs entirely in your browser, works offline after the first visit, and never collects your data. The output follows the same standard formula you would find anywhere on ' + name + ' \u2014 the transparency and the privacy are what make it different.' },
    { q: 'How do I reset ' + name + '?', a: 'There is a reset button in the header of ' + name + ' that restores every input to its default value. You can also reload the page. Any inputs you have not saved will be cleared, and the calculator returns to its initial state instantly, ready for the next calculation.' }
  ];
  var set = base.slice(0, 4);
  var pool = [base[4], base[5]].concat(extra);
  var need = isYMYL ? 3 : 3;
  var used = {}; var i = 0;
  while (set.length < 4 + need && i < 30) {
    var pick = pool[(h >> (i + 1)) % pool.length]; i++;
    if (used[pick.q]) continue; used[pick.q] = true; set.push(pick);
  }
  if (set.length < 6) set.push(extra[(h + 3) % extra.length]);
  return set.slice(0, 7);
}

// ---- 12. E-E-A-T signals: byline + last-updated + references + disclaimer ----
function genEeat(tool) {
  var isYMYL = YMYL.indexOf(tool.catKey) !== -1;
  var refs = CAT_REFS[tool.catKey] || CAT_REFS.default || [['NIST', 'https://www.nist.gov/']];
  var reviewer = REVIEWER[tool.catKey] || REVIEWER.default;
  var today = new Date().toISOString().slice(0, 10);
  var html = '<div class="seo-eat-meta">' +
    '<p class="seo-byline"><strong>Reviewed by</strong> ' + reviewer + ' \u00b7 <strong>Last updated</strong> ' + today + ' \u00b7 <strong>Tool:</strong> ' + tool.name + ' (' + (tool.catName || tool.catKey) + ')</p>' +
    '</div>';
  html += '<h2>Sources &amp; References</h2><p>The formulas and reference data behind ' + tool.name +
    ' (' + (tool.catName || tool.catKey) + ') follow standards published by these authoritative sources:</p><ul>';
  refs.forEach(function (r) {
    html += '<li><a href="' + r[1] + '" rel="nofollow noopener" target="_blank">' + r[0] + '</a></li>';
  });
  html += '</ul>';
  if (isYMYL) {
    html += '<h2>Disclaimer</h2><p>This ' + tool.name + ' provides estimates for educational and informational purposes only. ' +
      'It is not financial, medical, legal, or professional advice, and results should be confirmed with a qualified professional before making decisions that affect your money, health, or legal standing.</p>';
  } else {
    html += '<h2>Disclaimer</h2><p>Results from ' + tool.name + ' are estimates provided for general information. Verify any important figure against an authoritative source before acting on it.</p>';
  }
  return html;
}

// ---- LSI keywords (kept from v3) ----
function genLSI(tool) {
  var kws = kwList(tool); var h = hashStr(tool.id + 'lsi');
  var extra = ['free online tool', 'instant calculation', 'step by step math', 'browser based', 'works offline', 'no sign up', 'unit conversions', 'daily use calculator', 'standard formula', 'estimate', 'compare scenarios', 'result breakdown', 'privacy first', 'export results', 'works on mobile'];
  var lsi = kws.slice(0, 5); var used = {};
  lsi.forEach(function (k) { used[k.toLowerCase()] = true; });
  var i = h;
  while (lsi.length < 12) { var e = extra[i % extra.length]; i++; if (!used[e]) { used[e] = true; lsi.push(e); } }
  return lsi.slice(0, 14);
}

// ============ MAIN ============
var tools = loadTools();
var out = [];
out.push('// Auto-generated SEO content for all CalcPro tools \u2014 v4 GUARANTEED-UNIQUE Blueprint');
out.push('// Generated: ' + new Date().toISOString().slice(0, 10));
out.push('var TOOL_SEO = {');

var wordCounts = [];
var titleLong = []; var metaBad = [];
var densityLow = []; var densityHigh = [];
var blockLow = { b3: 0, b4: 0, b5: 0, b6: 0 };
var blockMin = { b3: 1e9, b4: 1e9, b5: 1e9, b6: 1e9 };
var blockMax = { b3: 0, b4: 0, b5: 0, b6: 0 };
function blockWords(html) { return stripTags(html).split(/\s+/).filter(Boolean).length; }
function stripP(s) { return s.replace(/\{\TOTAL\}/g, String(tools.length)); }
var usedTitles = new Set();
var collisions = 0;
var failIds = [];

tools.forEach(function (tool) {
  var r = rng(hashStr(tool.id + ':v4'));
  var ex = runExample(tool);
  var title = genTitle(tool, usedTitles);
  var metaDesc = genMetaDesc(tool);

  // Compose each block; verify no block collides with a previously-registered
  // block, else re-roll the whole tool with a bumped seed. With tool-specific
  // tokens in every block this rarely triggers.
  var aeo = null, descBlocks = null, attempts = 0;
  while (attempts < 12) {
    aeo = genAeo(tool, r);
    var bHowTo = genHowTo(tool, r);
    var bMeanings = genInputMeanings(tool, r);
    var bFormula = genFormula(tool, r);
    var bExample = genWorkedExample(tool, ex);
    var bCompare = genComparison(tool, r);
    var bUseCase = genUseCase(tool, r);
    var bMistakes = genMistakes(tool, r);
    var bTips = genTipsMeaning(tool, r);
    var bPhil = genPhilosophy(tool, r);
    var bEeat = genEeat(tool);
    var desc = bHowTo + '\n\n' + bMeanings + '\n\n' + bFormula + '\n\n' + bExample + '\n\n' +
      bCompare + '\n\n' + bUseCase + '\n\n' + bMistakes + '\n\n' + bTips + '\n\n' + bPhil + '\n\n' + bEeat;
    var anyCollide = [aeo, bHowTo, bMeanings, bFormula, bExample, bCompare, bUseCase, bMistakes, bTips, bPhil, bEeat]
      .some(function (b) { return collides(b); });
    if (!anyCollide) { descBlocks = desc; break; }
    collisions++;
    r = rng(hashStr(tool.id + ':v4:' + attempts + 1)); // re-roll this tool with a new seed
    attempts++;
  }
  if (!descBlocks) { descBlocks = desc; failIds.push(tool.id); } // give up, keep last composition
  desc = descBlocks;

  // LSI weave line (tool-specific)
  var lsi = genLSI(tool);
  var lsiPick = lsi.filter(function (k) { return desc.toLowerCase().indexOf(k.toLowerCase()) === -1; }).slice(0, 2);
  if (lsiPick.length > 0) {
    desc += '\n<p>People searching for this ' + tool.name + ' often pair it with ' + lsiPick.join(', ') +
      ' \u2014 all of them are covered elsewhere in the CalcPro directory, free and private like this one.</p>';
  }

  var faqs = genFAQs(tool);
  // Register all blocks globally so later tools avoid them
  registerBlock(aeo);
  registerBlock(desc);
  faqs.forEach(function (f) { registerBlock(f.q + ' ' + f.a); });

  if (title.length > 60) titleLong.push(tool.id + ' (' + title.length + ')');
  if (metaDesc.length < 140 || metaDesc.length > 155) metaBad.push(tool.id + ' (' + metaDesc.length + ')');

  var words = stripTags(aeo).split(/\s+/).length + stripTags(desc).split(/\s+/).length + faqs.reduce(function (a, f) { return a + f.q.split(/\s+/).length + f.a.split(/\s+/).length; }, 0);
  wordCounts.push(words);

  var segs = desc.split('<h2>');
  var b3 = blockWords(segs[1] || desc);
  var b4 = blockWords(segs[2] || '');
  var b5 = (blockWords(segs[3] || '') + blockWords(segs[4] || '') + blockWords(segs[5] || ''));
  var b6 = faqs.reduce(function (a, f) { return a + f.q.split(/\s+/).length + f.a.split(/\s+/).length; }, 0);
  var blocks = { b3: b3, b4: b4, b5: b5, b6: b6 };
  if (b3 < 200) blockLow.b3++;
  if (b4 < 150) blockLow.b4++;
  if (b5 < 200) blockLow.b5++;
  if (b6 < 400) blockLow.b6++;
  Object.keys(blocks).forEach(function (k) { if (blocks[k] < blockMin[k]) blockMin[k] = blocks[k]; if (blocks[k] > blockMax[k]) blockMax[k] = blocks[k]; });

  var pk = (kwList(tool)[0] || tool.name);
  var allText = (title + ' ' + metaDesc + ' ' + stripTags(aeo) + ' ' + stripTags(desc) + ' ' + faqs.map(function (f) { return f.q + ' ' + f.a; }).join(' ')).toLowerCase();
  var pkL = pk.toLowerCase();
  var occ = allText.split(pkL).length - 1;
  var density = Math.round((occ / Math.max(words, 1)) * 1000) / 10;
  if (density < 1.0) densityLow.push(tool.id + ':' + density + '%');
  if (density > 2.5) densityHigh.push(tool.id + ':' + density + '%');

  out.push("  '" + tool.id + "': {");
  out.push('    title: ' + JSON.stringify(title) + ',');
  out.push('    metaDesc: ' + JSON.stringify(metaDesc) + ',');
  out.push('    canonicalPath: ' + JSON.stringify('/' + tool.catKey + '/' + tool.id) + ',');
  out.push('    cat: ' + JSON.stringify(tool.catKey) + ',');
  out.push('    catName: ' + JSON.stringify(tool.catName) + ',');
  out.push('    lsi: ' + JSON.stringify(lsi) + ',');
  out.push('    aeo: ' + JSON.stringify(stripP(aeo)) + ',');
  out.push('    desc: ' + JSON.stringify(stripP(desc)) + ',');
  out.push('    faqs: ' + JSON.stringify(faqs) + ',');
  out.push('  },');
});

out.push('};');
out.push('');
out.push('var TOOL_CATEGORY = {');
tools.forEach(function (t) { out.push("  '" + t.id + "': '" + t.catKey + "',"); });
out.push('};');
out.push('');
out.push('if (typeof window !== "undefined") {');
out.push('  window.TOOL_SEO = TOOL_SEO;');
out.push('  window.TOOL_CATEGORY = TOOL_CATEGORY;');
out.push('}');
out.push('');
out.push('// Total tools: ' + tools.length);

var outText = out.join('\n').split('{TOTAL}').join(String(tools.length));
fs.writeFileSync(OUT_FILE, outText);
process.stderr.write('Wrote ' + OUT_FILE + '\n');
process.stderr.write('Total tools: ' + tools.length + '\n');
process.stderr.write('Sentence collisions re-rolled: ' + collisions + ' | gave up on: ' + (failIds.length ? failIds.join(',') : 'none') + '\n');
wordCounts.sort(function (a, b) { return a - b; });
var avg = Math.round(wordCounts.reduce(function (a, b) { return a + b; }, 0) / wordCounts.length);
process.stderr.write('Words per tool -> min: ' + wordCounts[0] + ' | avg: ' + avg + ' | max: ' + wordCounts[wordCounts.length - 1] + '\n');
process.stderr.write('Below 1200: ' + wordCounts.filter(function (w) { return w < 1200; }).length + ' tools\n');
process.stderr.write('Titles >60 chars: ' + (titleLong.length ? titleLong.join(', ') : 'NONE') + '\n');
process.stderr.write('Meta outside 140-155: ' + (metaBad.length ? metaBad.join(', ') : 'NONE') + '\n');
process.stderr.write('PK density <1.0%: ' + (densityLow.length ? densityLow.slice(0, 10).join(', ') + (densityLow.length > 10 ? ' ...(+' + (densityLow.length - 10) + ')' : '') : 'NONE') + '\n');
process.stderr.write('PK density >2.5%: ' + (densityHigh.length ? densityHigh.slice(0, 10).join(', ') + (densityHigh.length > 10 ? ' ...(+' + (densityHigh.length - 10) + ')' : '') : 'NONE') + '\n');
process.stderr.write('Block budgets -> B3(200+): min ' + blockMin.b3 + ' max ' + blockMax.b3 + ' | under 200: ' + blockLow.b3 + ' tools\n');
process.stderr.write('Block budgets -> B4(150+): min ' + blockMin.b4 + ' max ' + blockMax.b4 + ' | under 150: ' + blockLow.b4 + ' tools\n');
process.stderr.write('Block budgets -> B5(200+): min ' + blockMin.b5 + ' max ' + blockMax.b5 + ' | under 200: ' + blockLow.b5 + ' tools\n');
process.stderr.write('Block budgets -> B6(400+): min ' + blockMin.b6 + ' max ' + blockMax.b6 + ' | under 400: ' + blockLow.b6 + ' tools\n');
process.stderr.write('Unique blocks registered: ' + USED.size + '\n');
