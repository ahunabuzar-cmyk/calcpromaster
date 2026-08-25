// CalcPro SEO Content Generator v3 — Master 6-Block Blueprint (1,200-1,800 words per tool)
// Produces per-tool: meta title (<60), meta desc (140-155), 6-block content with REAL calc
// worked examples, LSI keywords, FAQ set (5-7) for JSON-LD, breadcrumb-ready metadata.
// Run: node generate-seo-v2.js   (writes js/seo-content.js)

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

function hashStr(s) {
  var h = 0;
  for (var i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function stripTags(s) {
  return String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function capitalize(s) {
  return String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
}

function fmtNum(n) {
  if (n === null || n === undefined || isNaN(n)) return null;
  var x = Number(n);
  if (!isFinite(x)) return null;
  if (Math.abs(x) >= 1000) return x.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (Math.abs(x) < 1 && x !== 0) return x.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return String(Math.round(x * 100) / 100);
}

function loadTools() {
  var files = fs.readdirSync(DATA_DIR).filter(function (f) { return f.endsWith('.js'); });
  var all = [];
  var seen = {};
  files.forEach(function (file) {
    var catKey = CAT_KEYS[file];
    if (!catKey) return;
    var m = require(path.join(DATA_DIR, file));
    var arr = Array.isArray(m) ? m : (Object.values(m).find(function (v) { return Array.isArray(v); }) || []);
    arr.forEach(function (t) {
      if (!t || typeof t.id !== 'string') return;
      if (seen[t.id]) return;
      seen[t.id] = true;
      all.push(Object.assign({ catKey: catKey, catName: CAT_NAMES[catKey] }, t));
    });
  });
  return all;
}

function kwList(tool) {
  return String(tool.kw || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
}

function primaryMetric(tool) {
  var num = (tool.inputs || []).find(function (i) { return i.type === 'number'; });
  return num ? num.label.replace(/\s*[(\[].*$/, '').trim() : (kwList(tool)[0] || 'your values');
}

function runExample(tool) {
  try {
    if (typeof tool.calc !== 'function') return null;
    var v = {};
    (tool.inputs || []).forEach(function (i) {
      if (i.type === 'select') {
        var first = (i.opts && i.opts[0]) ? i.opts[0].v : (i.def !== undefined ? i.def : '');
        v[i.id] = (i.def !== undefined && i.def !== '') ? i.def : first;
      } else if (i.type === 'checkbox') {
        v[i.id] = i.def === true;
      } else {
        v[i.id] = (i.def !== undefined && i.def !== null && i.def !== '') ? i.def : 100;
      }
    });
    var r = tool.calc(v);
    var resultText = typeof r === 'string' ? r : (r && r.result !== undefined ? String(r.result) : JSON.stringify(r));
    resultText = stripTags(resultText);
    var steps = null;
    if (typeof tool.steps === 'function') {
      var sr = tool.steps(v);
      if (Array.isArray(sr)) steps = sr.slice(0, 3).map(stripTags);
    }
    return { values: v, resultText: resultText, steps: steps };
  } catch (e) { return null; }
}

// ---- LONG-TAIL META TITLE: [Tool Name]: [specific intent phrase] (2026), <60 chars ----
// Unlike the old templated "Free Online X (2026)", each title targets a specific
// long-tail query derived from the tool's OWN inputs/keywords (e.g. "Monthly
// Payment", "IRS Tax Brackets", "Board Feet") — so no two tools read alike.
var GENERIC_KW = ['free online tool', 'instant calculation', 'step by step math', 'browser based', 'works offline', 'no sign up', 'daily use calculator', 'standard formula', 'estimate', 'compare scenarios', 'result breakdown', 'privacy first', 'export results', 'works on mobile', 'free online', 'online calculator', 'instant result', 'free tool'];
var ACRONYMS = { irs: 'IRS', us: 'US', uk: 'UK', uae: 'UAE', au: 'AU', ca: 'CA', vat: 'VAT', bmi: 'BMI', emi: 'EMI', md5: 'MD5', sha: 'SHA', sha1: 'SHA1', sha256: 'SHA256', api: 'API', url: 'URL', rgb: 'RGB', hex: 'HEX', json: 'JSON', css: 'CSS', html: 'HTML', ip: 'IP', awg: 'AWG', roi: 'ROI', npv: 'NPV', irr: 'IRR', gst: 'GST', ppf: 'PPF', sip: 'SIP', fd: 'FD', rd: 'RD' };
function prettyPhrase(k) {
  var words = k.replace(/calculator|calc|converter|tool|generator|encoder|decoder|formatter/gi, '').trim().split(/\s+/);
  return words.map(function (w) {
    var lo = w.toLowerCase();
    if (ACRONYMS[lo]) return ACRONYMS[lo];
    return capitalize(w);
  }).join(' ');
}
function normalizeName(n) { return String(n).toLowerCase().replace(/-/g, ' ').replace(/\([^)]*\)/g, ' ').replace(/calculator|calc|converter|tool|generator/gi, ' ').replace(/\s+/g, ' ').trim(); }
function longTailPhrase(tool) {
  var kws = kwList(tool);
  var nameN = normalizeName(tool.name);
  // Priority 1: a specific 2-3 word secondary keyword (best long-tail signal)
  var best = null;
  for (var i = 1; i < kws.length; i++) {
    var k = kws[i].replace(/calculator|calc|converter|tool|generator|encoder|decoder|formatter/gi, '').trim();
    var words = k.split(/\s+/).filter(Boolean);
    var kN = normalizeName(k);
    if (words.length >= 2 && k.length >= 6 && k.length <= 30 && GENERIC_KW.indexOf(k.toLowerCase()) === -1 &&
        kN !== nameN && kN.indexOf(nameN) === -1 && nameN.indexOf(kN) === -1) { best = prettyPhrase(k); break; }
  }
  if (best) return best;
  // Priority 2: primary metric label(s) from the tool's own numeric inputs
  var labels = [];
  var used = {};
  (tool.inputs || []).forEach(function (i) {
    if (i.type !== 'number') return;
    var l = String(i.label || '').replace(/\([^)]*\)/g, '').replace(/[\/*:]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(the|your|a|an)\s+/i, '');
    if (!l || l.length < 3 || l.length > 22) return;
    var key = l.toLowerCase();
    var lN = normalizeName(l);
    // Skip labels that just echo the tool name ("Class" on Class Rank, "Pet Age" on Pet Age)
    if (lN === nameN || nameN.indexOf(lN) !== -1) return;
    if (used[key]) return;
    used[key] = true;
    labels.push(l);
  });
  if (labels.length >= 2) return labels.slice(0, labels.length - 1).join(', ') + ' & ' + labels[labels.length - 1];
  if (labels.length === 1 && normalizeName(labels[0]) !== nameN) return labels[0];
  // Priority 3: first keyword phrase. If it merely wraps the tool name
  // ("Quadratic Equation Solver With Steps"), strip the name out and keep
  // the distinctive tail ("With Steps") so the title is not repetitive.
  if (kws.length) {
    var p0 = prettyPhrase(kws[0]);
    var pN = normalizeName(p0);
    if (pN !== nameN && pN.indexOf(nameN) === -1 && nameN.indexOf(pN) === -1) return p0 || capitalize(kws[0]);
    if (pN.indexOf(nameN) !== -1 && nameN.length >= 5) {
      var tail = p0.replace(new RegExp(nameN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').replace(/^\s*(of|for|with|to|in|by|and)\s+/i, '').trim();
      if (tail.length >= 4) return tail;
    }
  }
  // Priority 4: single input label
  if (labels.length === 1) return labels[0];
  return 'Instant Result';
}
function genTitle(tool, usedTitles) {
  var name = tool.name;
  var phrase = longTailPhrase(tool);
  var t = name + ': ' + phrase + ' (2026)';
  // Trim the phrase word-by-word until the title fits under 60 chars
  if (t.length > 60) {
    var words = phrase.split(' ');
    while (words.length > 1 && t.length > 60) { words.pop(); phrase = words.join(' '); t = name + ': ' + phrase + ' (2026)'; }
    // Popping can leave a dangling connector ("A, B &"): strip trailing separators
    phrase = phrase.replace(/[\s&,;:\u2014\u2013-]+$/g, '').trim();
    t = name + ': ' + phrase + ' (2026)';
  }
  if (t.length > 60) t = name;
  // Uniqueness: alias tools (same tool present in 2 categories) get a category
  // disambiguator so no two live URLs share a title (duplicate-content risk).
  var base = t;
  while (usedTitles.has(t.toLowerCase().replace(/\s+/g, ' ').trim())) {
    var catTag = tool.catName ? ' \u2014 ' + tool.catName : '';
    t = base.replace(/ \(2026\)$/, catTag + ' (2026)');
    if (usedTitles.has(t.toLowerCase().replace(/\s+/g, ' ').trim())) t = base;
    if (t === base) break;
  }
  // Hard 60-char cap AFTER dedup. The category tag can push past the limit;
  // drop the YEAR first (keeps the disambiguator, so uniqueness survives),
  // then trim the phrase word-by-word, then hard-truncate as a last resort.
  if (t.length > 60) {
    var noYear = t.replace(/ \(2026\)$/, '');
    if (noYear.length <= 60) {
      t = noYear;
    } else {
      var words = noYear.split(' ');
      while (words.length > 1 && words.join(' ').length > 60) words.pop();
      var joined = words.join(' ').replace(/[\s&,;:\u2014\u2013-]+$/g, '').trim();
      t = joined.length > 60 ? joined.substring(0, 57).replace(/\s+\S*$/, '') + '\u2026' : joined;
    }
  }
  usedTitles.add(t.toLowerCase().replace(/\s+/g, ' ').trim());
  return t.trim();
}

// ---- Meta description: guaranteed 140-155 chars (character-precise clamp) ----
function genMetaDesc(tool) {
  var desc = stripTags(tool.desc).replace(/\s+/g, ' ').trim();
  var name = tool.name;
  // Short descs get expanded with keyword phrases so the meta hits 140-155
  if (desc.length < 60) {
    var kwFill = kwList(tool).slice(0, 3).join(', ');
    desc = desc + ' using ' + kwFill + ' \u2014 standard, verifiable math you can check step by step.';
  }
  // Varied tails (hash-picked) so every meta doesn't end with the same sentence
  var TAILS = [
    ' Instant, private, works offline. No sign-up needed.',
    ' Runs 100% in your browser \u2014 nothing is uploaded or stored.',
    ' Accurate, step-by-step results. Free forever, no account.',
    ' Works on any device, even offline after your first visit.',
    ' Private by design \u2014 your data never leaves your device.'
  ];
  var tail = TAILS[hashStr(tool.id + 'meta') % TAILS.length];
  var full = 'Free ' + name + ' \u2014 ' + desc + tail;
  if (full.length >= 140 && full.length <= 155) return full;
  if (full.length > 155) {
    // Shrink the DESC words (never cut the tail mid-sentence) until it fits
    var dwords = desc.split(' ');
    while (dwords.length > 1 && full.length > 155) {
      dwords.pop();
      desc = dwords.join(' ');
      full = 'Free ' + name + ' \u2014 ' + desc + tail;
    }
    if (full.length <= 155) return full;
    // Extremely long tool name: hard cut at a word boundary, never mid-word
    var head = full.substring(0, 152);
    var sp = head.lastIndexOf(' ');
    return head.substring(0, sp > 120 ? sp : 152).replace(/[\s,.]+$/, '');
  }
  // too short: pad until inside range
  var pads = [' Try it now, 100% free forever.', ' No account, no data collection, ever.', ' Works on any device.'];
  var i = 0;
  while (full.length < 140 && i < pads.length) {
    full += pads[i];
    i++;
  }
  return full.length <= 155 ? full : full.substring(0, 152).replace(/[\s,.]+$/, '');
}

// ---- Input-aware "How to use" steps (expanded, ~25 words each) ----
function howToSteps(tool) {
  var lis = [];
  (tool.inputs || []).slice(0, 6).forEach(function (i) {
    var label = i.label;
    if (i.type === 'select') {
      lis.push('<li><strong>Pick the ' + label.toLowerCase() + '</strong> from the dropdown. The option you choose switches the calculation mode or unit, so match it to the scenario you are modeling before entering the numbers.</li>');
    } else if (i.type === 'checkbox') {
      lis.push('<li><strong>Toggle ' + label.toLowerCase() + '</strong> on or off. Enabling it adds that factor into the formula; leaving it off keeps the calculation simpler. The result updates immediately either way.</li>');
    } else {
      lis.push('<li><strong>Enter the ' + label.toLowerCase() + '</strong>. Type the exact number and the tool recalculates on the fly \u2014 no button to press, no page reload. This value is the core input the formula operates on.</li>');
    }
  });
  lis.push('<li><strong>Read the result panel</strong>. The answer appears instantly, and the step-by-step breakdown underneath shows every stage of the math so you can verify the output yourself.</li>');
  lis.push('<li><strong>Adjust and compare</strong>. Change any input and watch the result move. Use the batch mode to run several scenarios side by side before deciding.</li>');
  return lis.join('\n');
}

// ---- "What Each Input Means" semantic explanation (adds ~20 words per input) ----
function inputMeanings(tool) {
  var items = [];
  var inputs = (tool.inputs || []);
  inputs.forEach(function (i) {
    var label = i.label;
    if (i.type === 'select') {
      items.push('<li><strong>' + label + '</strong> \u2014 choose the mode or unit that matches your situation. The default is the most common choice, but switching it changes how every other input is interpreted.</li>');
    } else if (i.type === 'checkbox') {
      items.push('<li><strong>' + label + '</strong> \u2014 an optional factor. Switch it on to include that effect in the result, or leave it off for the plain calculation.</li>');
    } else {
      items.push('<li><strong>' + label + '</strong> \u2014 the numeric value the formula uses for that part of the calculation. Keep the units consistent with the label; the result reflects exactly what you type here.</li>');
    }
  });
  if (items.length === 0) {
    return '<p>Every field on this page feeds directly into the formula. Enter a value, and the tool re-runs the math instantly \u2014 there are no hidden defaults beyond the ones shown.</p>';
  }
  return '<ul>\n' + items.join('\n') + '\n</ul>';
}

// ---- Worked example with REAL numbers ----
function workedExample(tool, ex) {
  if (!ex) {
    return '<p>Enter your own numbers and the calculator returns an exact result with a full step-by-step breakdown. Every formula used here is standard and verifiable, and nothing you type is sent anywhere.</p>';
  }
  var v = ex.values;
  var labelVals = (tool.inputs || []).slice(0, 4).map(function (i) {
    var val = v[i.id];
    var show = (i.type === 'select') ? String(val) : fmtNum(val);
    return i.label + ' of ' + (show !== null ? show : '\u2014');
  }).join(', ');
  var out = '<p><strong>Worked example:</strong> with ' + labelVals + ', this tool returns <strong>' +
    (ex.resultText && ex.resultText.length > 45 ? ex.resultText.substring(0, 45) + '\u2026' : ex.resultText) + '</strong>.</p>';
  if (ex.steps && ex.steps.length) {
    out += '<p>Here is how it gets there:</p><ul>';
    ex.steps.forEach(function (s) {
      out += '<li>' + s.replace(/^Step\s+\d+:\s*/i, '') + '</li>';
    });
    out += '</ul>';
    out += '<p>Work through the same steps with your own values and you will land on the identical result \u2014 that is the value of a calculator that shows its working instead of hiding it.</p>';
  } else {
    out += '<p>The result follows the standard ' + (tool.catName || '').toLowerCase() + ' formula. Change any input to see the math update in real time and confirm each stage of the derivation.</p>';
  }
  return out;
}

// ---- Key Facts at a Glance (hash-varied bullet set, ~60-75 words) ----
function keyFacts(tool) {
  var h = hashStr(tool.id + 'facts');
  var name = tool.name;
  var catName = tool.catName || '';
  var kws = kwList(tool);
  var nInputs = (tool.inputs || []).length;
  var facts = [
    '<li><strong>Instant and private</strong> \u2014 results appear as you type, and the math runs locally in your browser so your numbers never leave the device.</li>',
    '<li><strong>Free forever</strong> \u2014 no premium tier, no trial window, no locked features. The tool you see is the complete tool.</li>',
    '<li><strong>Works offline</strong> \u2014 after the first visit the page is cached locally and keeps calculating without an internet connection.</li>',
    '<li><strong>Transparent steps</strong> \u2014 every result comes with a step-by-step breakdown you can read, check, and repeat by hand.</li>',
    '<li><strong>' + (nInputs || 'Several') + ' inputs</strong> \u2014 the fields on this page cover the main variables for ' + (catName || 'this') + ' calculations, with sensible defaults already filled in.</li>',
    '<li><strong>Made for ' + (catName || 'daily') + ' use</strong> \u2014 ' + name + ' is one of {TOTAL}+ calculators in the CalcPro collection, all built on the same engine.</li>'
  ];
  // pick 4 distinct facts by hash
  var out = [];
  var used = {};
  var j = 0;
  while (out.length < 4 && j < 20) {
    var f = facts[(h + j * 3) % facts.length];
    j++;
    if (used[f]) continue;
    used[f] = true;
    out.push(f);
  }
  return '<ul>\n' + out.join('\n') + '\n</ul>';
}

// ---- Block pools (hash-varied per tool) ----
var INTRO_POOL = [
  '{name} does exactly one thing: {desc}. Type your numbers, read the answer, move on. No sign-up, no account, no waiting on a server \u2014 the whole calculation runs locally in your tab.',
  'Most people reach for a spreadsheet to {desc}. This page replaces that with a single focused tool that runs entirely in your browser and shows every step of the working.',
  'If you need to {desc}, {name} is the fastest way to get a precise answer. The math happens locally, so nothing you type is uploaded, logged, or shared with anyone.',
  '{name} takes the guesswork out of {desc}. Every input maps to a defined step, and the result panel shows exactly how the answer was derived, so you can trust it or verify it line by line.',
  'Stop doing {desc} by hand. {name} applies the standard formula for you, shows each step, and never sends your numbers to a server \u2014 accurate, private, and instant.'
];
var FORMULA_POOL = [
  'The {cat} formula combines your inputs in a fixed order: each value feeds a defined step, and the final output is computed from those intermediate results. The steps area below walks through every operation, using {standard}.',
  'This calculator applies the standard {cat} equation. Your inputs are normalized, substituted into the formula, and the output is rounded to a clean readable result \u2014 with the full derivation shown step by step, aligned with {standard}.',
  'At its core this is the textbook {cat} calculation: take your primary value, apply the rate or ratio inputs, then adjust for any optional factors you enabled. The breakdown underneath shows each stage and follows {standard}.'
];
var DIFF_POOL = [
  '<li><strong>Real calculations, not simulations</strong> \u2014 verified formulas with an exact, checkable result every time.</li><li><strong>Step-by-step breakdown</strong> \u2014 see how the answer is derived, not just the final number.</li><li><strong>No account needed</strong> \u2014 open the page and use it. Nothing to sign up for, ever.</li><li><strong>Bulk comparison</strong> \u2014 run several scenarios side by side in one view and compare them directly.</li><li><strong>Keyboard-friendly</strong> \u2014 tab through the inputs and hit Enter to calculate without touching the mouse.</li><li><strong>Private by design</strong> \u2014 no analytics by default, no data collection, no server uploads.</li>',
  '<li><strong>Instant results</strong> \u2014 every keystroke recalculates, so you can explore scenarios freely and see the effect immediately.</li><li><strong>Zero server dependency</strong> \u2014 the whole calculation runs in your tab, even offline after the first visit.</li><li><strong>Unlimited use</strong> \u2014 no rate limits, no daily caps, no premium tier hiding the good features.</li><li><strong>Transparent math</strong> \u2014 the steps area shows every operation so you can verify the logic yourself.</li><li><strong>Exportable</strong> \u2014 share via link with values pre-filled, or export the result as an image or CSV.</li><li><strong>Always free</strong> \u2014 no paywalls, no trials, no locked features. The page you see is the complete tool.</li>',
  '<li><strong>Client-side only</strong> \u2014 your numbers never leave your device. No uploads, no logs, no tracking.</li><li><strong>Works offline</strong> \u2014 after the first visit the tool caches locally and runs without an internet connection.</li><li><strong>Free forever</strong> \u2014 no premium tiers, no hidden charges, no usage caps of any kind.</li><li><strong>Step-by-step output</strong> \u2014 every calculator shows its working, not just the answer.</li><li><strong>Accessible</strong> \u2014 keyboard navigation, screen-reader friendly, and reduced-motion support built in.</li><li><strong>Consistent across {TOTAL}+ tools</strong> \u2014 the same clean workflow on every calculator in the collection.</li>'
];
var USECASE_POOL = [
  'You are comparing two options and need the numbers side by side before you commit money or time. You are planning ahead and want to test \u201cwhat if\u201d scenarios against different assumptions. You are checking someone else\u2019s figures and want an independent, verifiable result rather than taking their word for it. Or you are simply in a hurry and need a reliable answer without opening a spreadsheet and rebuilding the math from scratch. Any of these situations is a good reason to have {name} open in a tab, and each one takes under a minute to run.',
  'Students use {name} to check homework and, more importantly, to understand how each input moves the result \u2014 that is how the formula sticks. Professionals rely on it during client meetings for quick estimates they can defend line by line. Shoppers and planners plug in their own numbers to compare options and set realistic budgets before they commit. Even casual users reach for it when they want certainty without the effort, and the breakdown doubles as a quick refresher on how the math works.',
  'You need a fast estimate while shopping, quoting, or budgeting and do not want to trust a black-box number. You want to understand the math behind a result so you can explain it to someone else or defend it in a decision. You are teaching the concept and need a live, correct example that recalculates as you talk. Any of these is a good reason to open {name}, and all of them are free \u2014 the tool never asks for anything in return for an accurate answer.',
  '{name} fits daily life: checking a figure at the desk, on the phone between meetings, or offline on a commute. It is built for the moment you need a correct number right now, without installing anything, creating an account, or waiting for a page to reload. Open it once and it is cached for the next time you need it, which is more often than most people expect. Keep it bookmarked and the answer is always one click away.'
];
var MISTAKES_POOL = [
  '<h2>Common Mistakes to Avoid</h2><p>The most frequent error is entering values in the wrong units \u2014 check the label and the placeholder before you type. The second is treating the result as an exact quote when it is an estimate based on the inputs you gave. The third is changing one field without updating the others and then wondering why the answer moved. The step-by-step breakdown below the result is the best place to catch all three: read it once and every number on screen lines up.</p>',
  '<h2>Common Mistakes to Avoid</h2><p>People usually trip on three things with {name}: using the wrong units, mixing up which field is the main input, and assuming the answer is fixed when it only reflects the numbers entered. The output is only as good as the inputs \u2014 so if the result looks surprising, walk the breakdown backwards and check each value you typed. The tool shows every stage precisely so you can find the mistake in seconds instead of guessing.</p>',
  '<h2>Common Mistakes to Avoid</h2><p>The biggest trap is skipping the optional fields and assuming the defaults match your situation \u2014 they do not always. Another is ignoring the units shown in each label; a figure entered in the wrong unit produces a confident-looking but wrong answer. Finally, avoid rounding intermediate values by hand; the tool keeps full precision internally and only rounds the final display, so trust the result panel rather than your own mental arithmetic.</p>',
  '<h2>Common Mistakes to Avoid</h2><p>Most errors come from treating this like a guessing game: entering rough numbers and reading too much into the result. The formula only reflects what you type. Check that every field has the right unit and the right value before acting on the answer, and use the steps area to confirm the math matches your expectations. When the numbers and the breakdown agree, you can be confident in the result.</p>'
];
var TIP_POOL = [
  '<p><strong>Pro tip:</strong> run the calculation once with your best-guess values, then again with optimistic and pessimistic inputs. Comparing the three answers shows how sensitive the result is and helps you decide whether a rough estimate is good enough or worth refining.</p>',
  '<p><strong>Pro tip:</strong> use the batch mode to save your current inputs before exploring alternatives. You can test a handful of scenarios side by side and keep the one that fits, without retyping anything.</p>',
  '<p><strong>Pro tip:</strong> if the result looks off, first check the units, then the formula steps, then your inputs \u2014 in that order. Nine times out of ten the breakdown reveals exactly where the discrepancy started.</p>',
  '<p><strong>Pro tip:</strong> bookmark this page after your first visit. The tool is cached locally and works offline, so bookmarking gives you a one-tap calculator for whenever this situation comes up again.</p>'
];
var PHILOSOPHY = 'All {TOTAL}+ CalcPro tools follow the same philosophy: serve the user, not the tracker. No analytics by default, no data collection, no server uploads. Every calculator runs in your browser. The code is open and readable, so you can verify exactly what the tool does with your inputs \u2014 the same standard this page holds itself to.';
var MEANING_POOL = [
  'What should you do with the number? Treat it as a reliable estimate for planning, not as a binding quote. If the decision is important \u2014 a purchase, a loan, a health change \u2014 use this result as your starting point and confirm the fine details with the relevant professional or provider before acting.',
  'The output is only as good as the inputs, which is exactly why the steps are shown. Read the breakdown once; if every stage matches the numbers you entered, the result is trustworthy. If something looks surprising, adjust one input at a time to see which factor is driving the change.',
  'A single run answers one question; a few runs answer the real one. Calculate once with your best guess, then again with a lower and a higher value. The spread between the three results tells you how sensitive the outcome is, which is far more useful than a single number.',
  'Keep the result handy if you plan to share or revisit it \u2014 use the share link, image, or CSV export to save the exact inputs and output together. That way the calculation can be reproduced later, which matters when the numbers are part of a bigger decision.'
];

// ---- FAQ generation: 5-7 questions, 400-500 words total ----
function genFAQs(tool) {
  var h = hashStr(tool.id);
  var isYMYL = ['finance', 'health', 'business', 'career', 'family'].indexOf(tool.catKey) !== -1;
  var catLower = (tool.catName || tool.catKey).toLowerCase();
  var pk = (kwList(tool)[0] || tool.name);
  var name = tool.name;
  var metric = primaryMetric(tool);
  var numInputs = (tool.inputs || []).filter(function (i) { return i.type === 'number'; });
  var inputLabels = numInputs.slice(0, 3).map(function (i) { return i.label.toLowerCase(); }).join(', ');
  var standard = CAT_STANDARDS[tool.catKey] || 'standard mathematical practice';
  var base = [
    // One shared platform FAQ is enough; everything else below is tool-specific.
    { q: 'Is this ' + name + ' really free?', a: 'Yes. This ' + name + ' is free forever \u2014 no hidden charges, no premium tier, no usage limits, and no locked features. The tool on this page is the complete tool, not a teaser, and it will stay that way.' },
    // Tool-specific: references the actual primary metric of THIS calculator.
    { q: 'How is the ' + metric.toLowerCase() + ' calculated?', a: name + ' applies ' + standard + '. It reads the values you enter, runs the standard ' + (pk.split(' ')[0] || 'calculation') + ' formula in your browser, and shows every operation in the step-by-step breakdown under the result \u2014 so the answer is verifiable, not a black box.' },
    { q: 'What do I need to use ' + name + '?', a: 'Just ' + (inputLabels || 'the values that match your situation') + '. The page loads with sensible defaults, so you can also press calculate immediately and adjust from there. No account, no sign-up, and nothing is uploaded \u2014 the calculation runs entirely on your device.' },
    { q: 'What does the result from ' + name + ' mean?', a: 'The result is the ' + metric.toLowerCase() + ' derived from your inputs using the standard formula. Read the breakdown underneath to see each step with your actual numbers, then adjust one input at a time to see how the outcome moves \u2014 that is the fastest way to understand what drives the answer.' },
    { q: 'Do you save my data?', a: 'No. Everything runs in your browser, and that includes ' + name + '. Your inputs never reach a server, and nothing is logged or tracked by default. Local preferences such as theme, history, and pinned results stay on your own device and can be cleared at any time from your browser settings. There is no account to attach data to in the first place.' },
    { q: 'How accurate are the results?', a: name + ' uses standard mathematical formulas and keeps several decimal places internally before presenting a clean result. The step-by-step breakdown shows every operation, so you can verify the accuracy of each stage and repeat the calculation yourself if you want. Rounding follows standard conventions and only affects the final display, never the internal math.' }
  ];
  var extra = [
    { q: 'What if my input values seem unusual?', a: 'The calculator accepts the values you enter and applies the standard formula as-is. For extreme values the breakdown panel still shows each step, so you can see exactly where the number comes from and sanity-check it. If a value looks off, first verify the units you are entering, then re-check the breakdown \u2014 the steps always reveal where the math started to move.' },
    { q: 'Can I compare multiple scenarios at once?', a: 'Yes \u2014 open the batch or comparison mode and enter several sets of inputs. The tool calculates them side by side so you can compare outcomes on one screen, which is especially useful for planning, quoting, and decision-making. You can even save scenarios and revisit them later without retyping the numbers.' },
    { q: 'Does it work on my phone?', a: 'The layout adapts to any screen size and works on iOS Safari, Android Chrome, and desktop browsers. Inputs and results render identically on small screens, and the offline cache works the same way on mobile as on desktop, so the tool is just as useful on the go as it is at a desk.' },
    { q: 'Is this a substitute for professional advice?', a: 'No. This tool provides estimates for informational purposes and is not a replacement for professional judgment. For important financial, medical, legal, or structural decisions, consult a qualified professional who can assess your full situation. The calculator is a starting point for your own due diligence, not the final word.' },
    { q: 'What makes this ' + pk + ' different?', a: name + ' shows the step-by-step derivation, runs entirely in your browser, works offline after the first visit, and never collects your data. The output follows the same standard formula you would find anywhere \u2014 the transparency and the privacy are what make it different.' },
    { q: 'How do I reset the calculator?', a: 'There is a reset button in the tool header that restores every input to its default value. You can also reload the page. Any inputs you have not saved will be cleared, and the calculator returns to its initial state instantly, ready for the next calculation.' }
  ];
  // Always include the shared free FAQ + the 3 tool-specific ones (metric, inputs,
  // result meaning) \u2014 they carry per-page uniqueness. Generic extras fill the rest.
  var set = [base[0], base[1], base[2], base[3]];
  var pool = [base[4], base[5]].concat(extra);
  var need = isYMYL ? 3 : 2 + (h % 2); // 6-7 total
  var used = {};
  var i = 0;
  while (set.length < 4 + need && i < 30) {
    var pick = pool[(h >> (i + 1)) % pool.length];
    i++;
    if (used[pick.q]) continue;
    used[pick.q] = true;
    set.push(pick);
  }
  if (set.length < 6) set.push(extra[(h + 3) % extra.length]);
  return set.slice(0, 7);
}

// ---- Main desc assembly: 6-block blueprint ----
function genDescription(tool, ex) {
  var h = hashStr(tool.id + ':cat');
  var descLower = stripTags(tool.desc).toLowerCase().replace(/\s+/g, ' ').trim();
  if (descLower.length > 140) descLower = descLower.substring(0, 137).replace(/\s+\S*$/, '');
  var catLower = (tool.catName || tool.catKey).toLowerCase();
  var standard = CAT_STANDARDS[tool.catKey] || 'standard mathematical practice';
  var metric = primaryMetric(tool);
  var pk = (kwList(tool)[0] || tool.name);

  // Block 1: What This Calculator Does (AEO direct answer, 60-80 words) — rendered ABOVE the form
  var aeo = '<h2>What This Calculator Does</h2>\n<p>The ' + tool.name + ' ' + descLower + '. You enter your values, ' +
    'the tool applies the standard ' + catLower + ' formula, and you get an exact answer with every step shown. ' +
    'The calculation runs locally \u2014 nothing leaves your browser, there are no uploads, no accounts, and no ads. ' +
    'The precise mathematical goal is simple: turn your ' + metric.toLowerCase() + ' and any supporting inputs into a ' +
    'correct, verifiable ' + (pk.split(' ')[0] || 'result') + ' in under a second, following ' + standard + '.</p>' +
    '<h3>Key Facts at a Glance</h3>\n' + keyFacts(tool);

  // Block 3: How to Use It (200-250 words) + formula + worked example
  var formula = FORMULA_POOL[(h >> 3) % FORMULA_POOL.length]
    .replace(/\{cat\}/g, catLower)
    .replace(/\{standard\}/g, standard);
  var block3 = '<h2>How to Use It</h2>\n<ol>\n' + howToSteps(tool) + '\n</ol>\n' +
    '<h3>What Each Input Means</h3>\n' + inputMeanings(tool) + '\n' +
    '<h3>The Formula Behind the Result</h3>\n<p>' + formula + '</p>\n' +
    '<h3>Worked Example</h3>\n' + workedExample(tool, ex);

  // Block 4: What Makes It Different (150-200 words)
  var diffTitlePool = ['What Makes It Different', 'Why This Tool Wins', 'Key Advantages Over a Spreadsheet'];
  var block4 = '<h2>' + diffTitlePool[(h >> 5) % diffTitlePool.length] + '</h2>\n' +
    '<p>Plenty of calculators can give you a number. This ' + pk + ' is built for people who also want to trust the number: the working is always visible, the tool never phones home, and nothing is locked behind a sign-up. Compared to a spreadsheet, it saves you the formula setup; compared to a generic tool site, it gives you the derivation instead of a black box; compared to an app, it needs nothing to install.</p>\n<ul>\n' +
    DIFF_POOL[(h >> 6) % DIFF_POOL.length] + '\n</ul>';

  // Block 5: When You Might Need This + Philosophy (200-250 words)
  var useCase = USECASE_POOL[(h >> 8) % USECASE_POOL.length].replace(/\{name\}/g, tool.name);
  var mistake = MISTAKES_POOL[(h >> 10) % MISTAKES_POOL.length].replace(/\{name\}/g, tool.name);
  var tip = TIP_POOL[(h >> 12) % TIP_POOL.length];
  var meaning = MEANING_POOL[(h >> 14) % MEANING_POOL.length];
  var block5 = '<h2>When You Might Need This</h2>\n<p>' + useCase + '</p>\n' +
    mistake + '\n' + tip + '\n' +
    '<p>' + meaning + '</p>\n' +
    '<h2>The CalcPro Philosophy</h2>\n<p>' + PHILOSOPHY + '</p>';

  return { aeo: aeo, desc: [block3, block4, block5].join('\n\n') };
}

// ---- LSI keywords (10-15 semantic terms) ----
function genLSI(tool) {
  var kws = kwList(tool);
  var h = hashStr(tool.id + 'lsi');
  var extra = ['free online tool', 'instant calculation', 'step by step math', 'browser based', 'works offline', 'no sign up', 'unit conversions', 'daily use calculator', 'standard formula', 'estimate', 'compare scenarios', 'result breakdown', 'privacy first', 'export results', 'works on mobile'];
  var lsi = kws.slice(0, 5);
  var used = {};
  lsi.forEach(function (k) { used[k.toLowerCase()] = true; });
  var i = h;
  while (lsi.length < 12) {
    var e = extra[i % extra.length];
    i++;
    if (!used[e]) { used[e] = true; lsi.push(e); }
  }
  return lsi.slice(0, 14);
}

// ============ MAIN ============
var tools = loadTools();
var out = [];
out.push('// Auto-generated SEO content for all CalcPro tools \u2014 Master 6-Block Blueprint');
out.push('// Generated: ' + new Date().toISOString().slice(0, 10));
out.push('var TOOL_SEO = {');

var wordCounts = [];
var titleLong = [];
var metaBad = [];
var densityLow = [];
var densityHigh = [];
var blockLow = { b3: 0, b4: 0, b5: 0, b6: 0 };
var blockMin = { b3: 1e9, b4: 1e9, b5: 1e9, b6: 1e9 };
var blockMax = { b3: 0, b4: 0, b5: 0, b6: 0 };
function blockWords(html) {
  return stripTags(html).split(/\s+/).filter(Boolean).length;
}
var usedTitles = new Set();
tools.forEach(function (tool) {
  var ex = runExample(tool);
  var title = genTitle(tool, usedTitles);
  var metaDesc = genMetaDesc(tool);
  var parts = genDescription(tool, ex);
  var aeo = parts.aeo;
  var desc = parts.desc;
  var faqs = genFAQs(tool);
  var lsi = genLSI(tool);

  // Weave 2-3 LSI terms naturally into the content (adds a related-terms line to Block 5)
  var lsiPick = lsi.filter(function (k) {
    return desc.toLowerCase().indexOf(k.toLowerCase()) === -1;
  }).slice(0, 2);
  if (lsiPick.length > 0) {
    desc += '\n<p>People searching for this tool often pair it with ' + lsiPick.join(', ') +
      ' \u2014 all of them are covered elsewhere in the CalcPro directory, free and private like this one.</p>';
  }

  if (title.length > 60) titleLong.push(tool.id + ' (' + title.length + ')');
  if (metaDesc.length < 140 || metaDesc.length > 155) metaBad.push(tool.id + ' (' + metaDesc.length + ')');

  // Word count = AEO block + body + FAQs (the full visible page text)
  var words = stripTags(aeo).split(/\s+/).length + stripTags(desc).split(/\s+/).length + faqs.reduce(function (a, f) { return a + f.q.split(/\s+/).length + f.a.split(/\s+/).length; }, 0);
  wordCounts.push(words);

  // Per-block word budgets (blueprint: B3 200-250, B4 150-200, B5 200-250, B6 400-500)
  // B5 spans 'When You Might Need This' + 'Common Mistakes' + 'The CalcPro Philosophy' (3 h2 segments)
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
  Object.keys(blocks).forEach(function (k) {
    if (blocks[k] < blockMin[k]) blockMin[k] = blocks[k];
    if (blocks[k] > blockMax[k]) blockMax[k] = blocks[k];
  });

  // Primary-keyword density (occurrences of first keyword phrase / total words)
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
  out.push('    aeo: ' + JSON.stringify(aeo) + ',');
  out.push('    desc: ' + JSON.stringify(desc) + ',');
  out.push('    faqs: ' + JSON.stringify(faqs) + ',');
  out.push('  },');
});

out.push('};');
out.push('');
out.push('var TOOL_CATEGORY = {');
tools.forEach(function (t) {
  out.push("  '" + t.id + "': '" + t.catKey + "',");
});
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
wordCounts.sort(function (a, b) { return a - b; });
var avg = Math.round(wordCounts.reduce(function (a, b) { return a + b; }, 0) / wordCounts.length);
process.stderr.write('Words per tool -> min: ' + wordCounts[0] + ' | avg: ' + avg + ' | max: ' + wordCounts[wordCounts.length - 1] + '\n');
process.stderr.write('Below 1200: ' + wordCounts.filter(function (w) { return w < 1200; }).length + ' tools\n');
process.stderr.write('Titles >60 chars: ' + (titleLong.length ? titleLong.join(', ') : 'NONE') + '\n');
process.stderr.write('Meta outside 140-155: ' + (metaBad.length ? metaBad.join(', ') : 'NONE') + '\n');
process.stderr.write('PK density <1.0%: ' + (densityLow.length ? densityLow.slice(0, 12).join(', ') + (densityLow.length > 12 ? ' ...(+' + (densityLow.length - 12) + ')' : '') : 'NONE') + '\n');
process.stderr.write('PK density >2.5%: ' + (densityHigh.length ? densityHigh.slice(0, 12).join(', ') + (densityHigh.length > 12 ? ' ...(+' + (densityHigh.length - 12) + ')' : '') : 'NONE') + '\n');
process.stderr.write('Block budgets -> B3(200-250): min ' + blockMin.b3 + ' max ' + blockMax.b3 + ' | under: ' + blockLow.b3 + ' tools\n');
process.stderr.write('Block budgets -> B4(150-200): min ' + blockMin.b4 + ' max ' + blockMax.b4 + ' | under: ' + blockLow.b4 + ' tools\n');
process.stderr.write('Block budgets -> B5(200-250): min ' + blockMin.b5 + ' max ' + blockMax.b5 + ' | under: ' + blockLow.b5 + ' tools\n');
process.stderr.write('Block budgets -> B6(400-500): min ' + blockMin.b6 + ' max ' + blockMax.b6 + ' | under: ' + blockLow.b6 + ' tools\n');
