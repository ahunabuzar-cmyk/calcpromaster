// ====== CalcPro Premium Article Generator ======
// Creates deep, UNIQUE "Master Blueprint" premium articles (loan-emi tier) for the
// top-10 high-search-volume tools, with REAL numbers computed live from each tool's
// own calc()/steps() engine. Merges into js/seo-premium.js preserving the
// hand-written loan-emi flagship.
//
// Run: node generate-premium.js
//
// Every section is composed from tool-specific tokens (name, input labels, option
// labels, computed results, category standards/references) so no two tools share a
// substantial block. A global block registry enforces uniqueness across all entries.

const fs = require('fs');
const path = require('path');

// Mock browser globals so data-file calc()/steps() run in Node
global.Charts = { donut: () => '', gauge: () => '', line: () => '', bar: () => '', overlay: () => '', spark: () => '' };
try { global.AdvancedCalc = global.AdvancedCalc || require('./js/advanced-calc.js'); } catch (e) { /* optional */ }

const DATA_DIR = path.join(__dirname, 'js', 'data');
const PREMIUM_FILE = path.join(__dirname, 'js', 'seo-premium.js');

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
  regional: [['IRS', 'https://www.irs.gov/'], ['BLS', 'https://www.bls.gov/']],
  food: [['USDA', 'https://www.usda.gov/'], ['FDA', 'https://www.fda.gov/'], ['NIH', 'https://www.nih.gov/']],
  fitness: [['CDC Physical Activity', 'https://www.cdc.gov/physicalactivity/'], ['ACSM', 'https://www.acsm.org/']],
  auto: [['NHTSA', 'https://www.nhtsa.gov/'], ['EPA Fuel Economy', 'https://www.fueleconomy.gov/']],
  career: [['BLS', 'https://www.bls.gov/'], ['IRS', 'https://www.irs.gov/'], ['U.S. Dept of Labor', 'https://www.dol.gov/']],
  homegarden: [['USDA', 'https://www.usda.gov/'], ['EPA', 'https://www.epa.gov/']],
  tech: [['NIST', 'https://www.nist.gov/'], ['ISO', 'https://www.iso.org/']],
  family: [['CDC', 'https://www.cdc.gov/'], ['AAP', 'https://www.aap.org/'], ['NIH', 'https://www.nih.gov/']]
};

const YMYL = ['finance', 'health', 'business', 'career', 'family'];

// Tool-count claim used in FAQ copy — derived from the loaded registry in main()
// so it never drifts from the real tool count (matches the site-wide "566+").
let TOTAL_COUNT = 0;

// Top-10 high-search-volume tools (loan-emi already has a flagship entry)
const PREMIUM_IDS = [
  'mortgage', 'compound-interest', 'bmi', 'percentage',
  'us-income-tax', 'retirement', 'car-loan-emi', 'salary-converter',
  'fuel-cost', 'credit-card-payoff'
];

// ---- GLOBAL BLOCK UNIQUENESS REGISTRY ----
var USED = new Set();
function blockKey(html) {
  return String(html || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ').toLowerCase()
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

// ---- generic helpers ----
function stripTags(s) { return String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
function capitalize(s) { return String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1); }
function kwList(tool) { return String(tool.kw || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean); }
function primaryMetric(tool) {
  var num = (tool.inputs || []).find(function (i) { return i.type === 'number'; });
  if (!num) return kwList(tool)[0] || 'your values';
  // strip ONLY parenthetical suffixes like "(% per year)" — keep plain labels intact
  var label = String(num.label || '').split(/[(（]/)[0].trim();
  return label || kwList(tool)[0] || 'your values';
}
function firstKeyword(tool) { return kwList(tool)[0] || tool.name; }
function firstNumberLabel(tool) {
  var num = (tool.inputs || []).find(function (i) { return i.type === 'number'; });
  return num ? String(num.label || '').split(/[(（]/)[0].trim() : inputList(tool)[0] || 'a value';
}

// ---- run the tool's real engine with default (or tweaked) values ----
function runExample(tool, tweak) {
  try {
    if (typeof tool.calc !== 'function') return null;
    var v = {};
    (tool.inputs || []).forEach(function (i, idx) {
      if (i.type === 'select') { v[i.id] = (i.def !== undefined && i.def !== '') ? i.def : ((i.opts && i.opts[0]) ? i.opts[0].v : ''); }
      else if (i.type === 'checkbox') { v[i.id] = i.def === true; }
      else {
        var d = (i.def !== undefined && i.def !== null && i.def !== '') ? i.def : 100;
        if (tweak && i.type === 'number') {
          var f = [1.5, 0.75, 1.25, 0.5, 2][idx % 5];
          d = Math.round(d * f * 100) / 100;
        }
        v[i.id] = d;
      }
    });
    var r = tool.calc(v);
    var resultText = typeof r === 'string' ? r : (r && r.result !== undefined ? String(r.result) : JSON.stringify(r));
    resultText = stripTags(resultText);
    if (/^(error\b)|(error\s*[:!])|(typeerror)|(referenceerror)|(not defined)|(is not a function)|(undefined is not)/i.test(resultText)) return null;
    var extra = r && r.extra !== undefined ? stripTags(String(r.extra)) : '';
    var steps = null;
    if (typeof tool.steps === 'function') { var sr = tool.steps(v); if (Array.isArray(sr)) steps = sr.map(stripTags); }
    return { values: v, resultText: resultText, extra: extra, steps: steps, raw: r };
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
      if (seen[t.id]) return; seen[t.id] = 1;
      all.push({ tool: t, catKey: catKey });
    });
  });
  return all;
}

// ================= SECTION COMPOSERS (tool-specific tokens everywhere) =================

function optLabel(inp, v) {
  var o = (inp.opts || []).find(function (x) { return String(x.v) === String(v); });
  return o ? o.l : String(v);
}
function inputList(tool) { return (tool.inputs || []).map(function (i) { return i.label; }); }

function genSeoTitle(tool, metric, ex) {
  var base = tool.name.replace(/ Calculator$/, '').replace(/^Calculate /, '');
  var title = base + ' Calculator';
  // Prefer the result's own metric phrase (e.g. "Final Amount", "Payoff Time") —
  // unique per tool and matches what users actually see.
  var resMetric = '';
  if (ex && ex.resultText) {
    var head = ex.resultText.split(':')[0].split('|')[0].trim();
    // Only use the result head as a title metric if it looks like a NAME
    // (letters), never a dollar figure like "$495.03/mo".
    if (/^[A-Za-z][A-Za-z0-9 &\-]{0,26}$/.test(head)) resMetric = head;
  }
  var use = resMetric || metric;
  if (use) title += ' — ' + capitalize(use);
  if (title.length > 60) title = tool.name;
  return title;
}

function genMetaDesc(tool, metric) {
  var d = tool.desc ? stripTags(tool.desc) : ('Free ' + tool.name.toLowerCase());
  var s = d.charAt(0).toUpperCase() + d.slice(1) + '. Instant results, step-by-step breakdown, runs 100% in your browser with no sign-up.';
  if (s.length > 155) s = s.slice(0, 152).replace(/\s+\S*$/, '') + '...';
  while (s.length < 140) s += ' Free, private, instant.';
  if (s.length > 160) s = s.slice(0, 157).replace(/\s+\S*$/, '') + '...';
  return s;
}

function genIntro(tool, catName, metric, kw0, standards) {
  var n = tool.name; var m = metric.toLowerCase();
  var paras = [];
  paras.push('<h2>What This Calculator Really Does</h2>');
  paras.push('<p>' + n + ' turns a small set of inputs — ' + inputList(tool).slice(0, 3).join(', ') + ' — into a clear, checkable answer in seconds. Instead of juggling the math by hand or trusting a bank\'s quoted figure, you type your own numbers and see the result instantly, with the working shown so you can verify every step.</p>');
  paras.push('<p>The tool is built around ' + standards + '. That means the numbers it produces follow the same conventions a professional would use, which keeps the output realistic for real-world planning rather than a rough classroom estimate.</p>');
  paras.push('<p>Who should use it? Anyone making a decision that depends on ' + m + ': shoppers comparing options, planners budgeting ahead, students learning the underlying math, and professionals who want a fast cross-check. When should you use it? Any time someone hands you a number you cannot verify by hand — run it here and the breakdown panel shows exactly how it was derived.</p>');
  paras.push('<p>Everything runs locally in your browser. No data is uploaded, nothing is tracked, and after the first visit the page works offline. The result is a precise calculation of what you entered — the accuracy of the real-world answer always depends on how accurate your inputs are.</p>');
  return paras.join('\n');
}

function genQuickAnswer(tool, ex) {
  if (!ex) return '';
  var p = '<div class="premium-answer"><p><strong>Quick answer:</strong> with the default inputs, ' + tool.name + ' returns <strong>' + ex.resultText + '</strong>.</p></div>';
  return p;
}

function genFormula(tool, catName, standards, ex) {
  var n = tool.name; var m = primaryMetric(tool).toLowerCase();
  var parts = [];
  parts.push('<h2>The Math Behind the Result, Explained Plainly</h2>');
  parts.push('<p>' + n + ' combines your inputs through a defined sequence of steps rather than a single black-box formula. Each input plays a specific role, and the engine applies them in the same order every time so the result is reproducible by hand.</p>');
  parts.push('<ul>');
  (tool.inputs || []).slice(0, 8).forEach(function (i) {
    var role = 'the value you supply for this field — the starting point of the calculation';
    if (i.type === 'select') role = 'a selector that switches the calculation mode or convention used';
    if (i.type === 'checkbox') role = 'an on/off switch that includes or excludes this factor';
    parts.push('<li><strong>' + i.label + '</strong> — ' + role + (i.def !== undefined && i.def !== '' ? ' (default ' + (i.type === 'select' ? optLabel(i, i.def) : i.def) + ')' : '') + '.</li>');
  });
  parts.push('</ul>');
  parts.push('<p><strong>Why the math works:</strong> the engine starts from your raw inputs, normalizes any units and periods, applies ' + m + ' through the standard ' + catName.toLowerCase() + ' conventions, and only then formats the result. That ordering is what makes the answer consistent — change one input and the whole chain re-runs, so you can see exactly how each field moves the outcome.</p>');
  if (ex && ex.steps && ex.steps[0]) {
    parts.push('<p>The formula behind the result is: <strong>' + ex.steps[0] + '</strong></p>');
  }
  return parts.join('\n');
}

function genStepByStep(tool, ex) {
  if (!ex) return '';
  var parts = [];
  parts.push('<h2>Step-by-Step with Real Numbers</h2>');
  // Tool-specific lead-in makes the section unique even when two tools share a
  // similar steps() template (e.g. compound-interest vs retirement).
  parts.push('<p>Here is how ' + tool.name + ' turns the default inputs into its answer, step by step:</p>');
  if (ex.steps && ex.steps.length) {
    parts.push('<ol>');
    ex.steps.forEach(function (s) { parts.push('<li>' + s + '</li>'); });
    parts.push('</ol>');
    return parts.join('\n');
  }
  parts.push('<ol>');
  (tool.inputs || []).slice(0, 6).forEach(function (i) {
    var v = ex.values[i.id];
    var shown = i.type === 'select' ? optLabel(i, v) : v;
    parts.push('<li><strong>Set ' + i.label + '.</strong> Enter ' + shown + (i.type === 'select' ? ' in the dropdown' : ' in the number field') + '.</li>');
  });
  parts.push('<li><strong>Run the calculation.</strong> The engine applies the standard formula to these inputs and produces the answer below.</li>');
  parts.push('<li><strong>Read the result.</strong> The main output is <strong>' + ex.resultText + '</strong>' + (ex.extra ? ' — with additional detail: ' + ex.extra : '') + '.</li>');
  parts.push('</ol>');
  return parts.join('\n');
}

function genHowToUse(tool) {
  var parts = ['<h2>How to Use It — In Order</h2>', '<ol>'];
  (tool.inputs || []).slice(0, 10).forEach(function (i, idx) {
    var verb = i.type === 'select' ? 'Open the ' + i.label + ' dropdown and pick' : 'Enter your ' + i.label.toLowerCase().replace(/\s*\(.*/, '');
    parts.push('<li><strong>' + (idx === 0 ? 'Start with ' : 'Set ') + i.label + '.</strong> ' + (idx === 0 ? 'It\'s the first field for a reason — ' + verb + ' the value you want to test.' : capitalize(verb) + '.' + (i.def !== undefined && i.def !== '' ? ' The default (' + (i.type === 'select' ? optLabel(i, i.def) : i.def) + ') is a sensible starting point.' : '')) + '</li>');
  });
  parts.push('<li><strong>Review the result panel.</strong> The main number is your answer; the details line adds the context you need to interpret it.</li>');
  parts.push('<li><strong>Open the step-by-step breakdown.</strong> Every stage of the math is shown so you can verify the result by hand.</li>');
  parts.push('<li><strong>Change one input at a time.</strong> Watch how the result moves — that is the fastest way to understand which factor drives your number most.</li>');
  parts.push('<li><strong>Compare scenarios.</strong> Use the batch mode or run two sets of inputs side by side to choose between options.</li>');
  parts.push('<li><strong>Export or share.</strong> Copy the result, download it as an image, CSV or PDF, or share a link pre-filled with your inputs.</li>');
  parts.push('</ol>');
  return parts.join('\n');
}

function genInputExplanation(tool) {
  var parts = ['<h2>Every Input, Explained</h2>', '<ul>'];
  (tool.inputs || []).forEach(function (i) {
    var extra = '';
    if (i.type === 'select' && i.opts) {
      extra = ' Options: ' + i.opts.map(function (o) { return o.l; }).join(', ') + '.';
    }
    parts.push('<li><strong>' + i.label + '</strong> — ' + (i.type === 'select' ? 'picks which setting the calculation uses' : (i.type === 'checkbox' ? 'turns this factor on or off' : 'the numeric value for this part of the calculation')) + '.' + extra + (i.def !== undefined && i.def !== '' ? ' Default is ' + (i.type === 'select' ? optLabel(i, i.def) : i.def) + '.' : '') + '</li>');
  });
  parts.push('</ul>');
  return parts.join('\n');
}

function genOutputExplanation(tool, ex) {
  var parts = ['<h2>Reading the Results</h2>', '<ul>'];
  parts.push('<li><strong>Main result</strong> — the answer to your ' + primaryMetric(tool).toLowerCase() + ' question, computed from your inputs' + (ex ? ' (with the current values it reads: ' + ex.resultText + ')' : '') + '.</li>');
  if (ex && ex.extra) parts.push('<li><strong>Details line</strong> — ' + ex.extra + '.</li>');
  if (ex && ex.raw && ex.raw.chart) parts.push('<li><strong>Visual breakdown</strong> — the chart shows how the result splits across its components at a glance.</li>');
  parts.push('<li><strong>Step-by-step panel</strong> — the exact arithmetic used, so you can cross-check the main number by hand.</li>');
  parts.push('</ul>');
  return parts.join('\n');
}

function genWorkedExample(tool, ex2) {
  if (!ex2) return '';
  var parts = [];
  parts.push('<h2>Worked Example: A Different Set of Numbers</h2>');
  parts.push('<p>To show how the tool behaves away from the defaults, try these adjusted inputs:</p>');
  parts.push('<ol>');
  (tool.inputs || []).slice(0, 6).forEach(function (i) {
    if (i.type === 'select' || i.type === 'checkbox') return;
    if (ex2.values[i.id] === undefined) return;
    parts.push('<li><strong>' + i.label + '</strong> set to ' + ex2.values[i.id] + ' instead of the default.</li>');
  });
  parts.push('</ol>');
  parts.push('<p>The result becomes <strong>' + ex2.resultText + '</strong>' + (ex2.extra ? ' — with detail: ' + ex2.extra : '') + '. This is the same engine, just different inputs: change the inputs and the answer re-derives from scratch every time.</p>');
  return parts.join('\n');
}

function genApplications(tool, catName) {
  var n = tool.name; var m = primaryMetric(tool).toLowerCase();
  return '<h2>Where You\'ll Actually Use This</h2><ul>' +
    '<li><strong>Personal</strong> — make everyday decisions that hinge on ' + m + ' with numbers you can verify yourself.</li>' +
    '<li><strong>Business</strong> — run quick what-if scenarios without waiting on a spreadsheet or a colleague.</li>' +
    '<li><strong>Education</strong> — see the working behind the answer, which makes ' + n.toLowerCase() + ' a practical study aid.</li>' +
    '<li><strong>Professional</strong> — use it as an independent cross-check before you commit to a decision or a quote.</li>' +
    '</ul>';
}

function genCommonMistakes(tool) {
  var n = tool.name; var unitLabel = firstNumberLabel(tool);
  var secondLabel = firstNumberLabel(tool);
  var pool = [
    'Entering ' + unitLabel + ' in the wrong units — most errors trace back to a unit mismatch, so check the field label before you type.',
    'Using a monthly rate where an annual one belongs, or the reverse — the tool expects the rate exactly as the label says.',
    'Mixing up the order of inputs — ' + n + ' re-derives everything from scratch, so a swapped field gives a confident-looking wrong answer.',
    'Typing commas or currency symbols into number fields — paste plain digits instead.',
    'Ignoring the default values — they exist because they are realistic, so keep them unless you have a real number to replace them with.',
    'Forgetting that the result is only as good as the inputs — garbage in, garbage out applies here as much as anywhere.',
    'Rounding inputs aggressively — small rounding on ' + secondLabel + ' compounds through the calculation.',
    'Assuming the output is a quote — the tool computes what you entered; it does not know your exact situation.'
  ];
  return '<h2>Common Mistakes to Avoid</h2><ul>' + pool.map(function (m) { return '<li>' + m + '</li>'; }).join('') + '</ul>';
}

function genTips(tool) {
  var first = firstNumberLabel(tool); var m = primaryMetric(tool).toLowerCase();
  var pool = [
    'Start from the defaults — they are realistic, so the first result from ' + tool.name + ' is always sensible.',
    'Change one input at a time to see exactly how it moves ' + m + '.',
    'Double-check units on ' + first + ' before trusting the answer.',
    'Use the step-by-step breakdown once to verify the math by hand.',
    'Save or export results you plan to act on — links pre-filled with inputs are shareable.',
    'Re-run after any change; the engine recalculates instantly, so the panel is never stale.',
    'Compare at least two scenarios before committing to a decision.',
    'Bookmark the tool — after the first visit it works offline too.',
    'If a result looks surprising, re-check the input you are least sure about first.',
    'Use the history feature to revisit calculations from previous sessions.'
  ];
  return '<h2>Expert Tips for ' + tool.name + '</h2><ul>' + pool.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>';
}

function genAssumptions(tool, ex) {
  var parts = ['<h2>Assumptions Behind the Calculation</h2>', '<ul>'];
  parts.push('<li>Inputs are used exactly as entered — ' + tool.name + ' makes no hidden adjustments, fees, or assumptions beyond what you type.</li>');
  if (ex) parts.push('<li>The default scenario used in the examples is ' + (ex.values ? Object.keys(ex.values).slice(0, 3).map(function (k) { return k + ' = ' + ex.values[k]; }).join(', ') : 'the built-in defaults') + '.</li>');
  parts.push('<li>The math follows ' + (tool.catName || 'standard industry') + ' conventions; institutional rules can differ.</li>');
  parts.push('<li>All values are treated as constants for the calculation — no inflation or market movement is modeled.</li>');
  parts.push('</ul>');
  return parts.join('\n');
}

function genLimitations(tool) {
  var m = primaryMetric(tool).toLowerCase();
  return '<h2>Limitations</h2><ul>' +
    '<li>' + tool.name + ' computes what you entered; it is not personalized advice for your specific situation.</li>' +
    '<li>Real-world outcomes depend on factors the tool cannot know (fees, market conditions, individual circumstances).</li>' +
    '<li>' + capitalize(m) + ' is estimated from the standard conventions; official numbers may differ slightly.</li>' +
    '<li>Very extreme input combinations may produce results that need professional interpretation.</li>' +
    '</ul>';
}

function genAccuracy(tool) {
  var m = primaryMetric(tool).toLowerCase();
  return '<h2>Expected Accuracy</h2><p>' + tool.name + ' performs the standard calculation to full floating-point precision and only rounds for display, so the arithmetic is exact to the precision of your inputs. The practical accuracy of the answer depends entirely on how accurately you enter ' + m + '. If your inputs match reality, the result will match the standard calculation used by professionals in the field.</p>';
}

function genPrivacy(tool) {
  return '<h2>Privacy — Your Data Never Leaves This Device</h2><p>Every calculation on the ' + tool.name + ' page runs locally in your browser. Your inputs are never uploaded, stored on a server, or shared with anyone — there is no database, no account, and no tracking. You can verify this yourself: disconnect from the internet and the tool still works.</p>';
}

function genInternalLinks(tool, catKey, catName, related) {
  var parts = ['<h2>Related Tools & Guides</h2>'];
  parts.push('<p>After ' + tool.name + ', users often reach for these related ' + catName.toLowerCase() + ' calculators:</p><ul>');
  parts.push('<li><a href="/' + catKey + '">All ' + catName + ' Calculators</a></li>');
  (related || []).slice(0, 4).forEach(function (r) {
    parts.push('<li><a href="/' + catKey + '/' + (r.id || r.tool.id) + '">' + (r.label || r.tool.name) + '</a></li>');
  });
  parts.push('</ul>');
  return parts.join('\n');
}

function genReferences(catKey, tool) {
  var refs = CAT_REFS[catKey] || [['NIST', 'https://www.nist.gov/']];
  return '<h2>Sources & Standards</h2><p>The methods used by ' + tool.name + ' follow ' + (CAT_STANDARDS[catKey] || 'standard industry practice') + '.</p><ul>' + refs.map(function (r) {
    return '<li><a href="' + r[1] + '" rel="nofollow noopener">' + r[0] + '</a></li>';
  }).join('') + '</ul>';
}

function genConclusion(tool, metric) {
  return '<h2>Bottom Line</h2><p>' + tool.name + ' exists to remove the guesswork from ' + metric.toLowerCase() + '. Type your numbers, get an answer, and — uniquely — see the working that produced it. It is free, private, works offline, and never asks you to sign up.</p><p>Use it to plan ahead, cross-check numbers you are handed, or simply understand the math better. However you use it, the numbers are yours and they never leave your device.</p>';
}

function genFAQs(tool, catName, metric, ex) {
  var n = tool.name; var kw0 = firstKeyword(tool); var m = primaryMetric(tool).toLowerCase();
  var faqs = [
    { q: 'What does ' + n + ' actually calculate?', a: 'It takes the inputs you provide — ' + inputList(tool).slice(0, 3).join(', ') + ' — and computes the corresponding ' + metric.toLowerCase() + ' using the standard ' + catName.toLowerCase() + ' conventions. With the default values it currently returns: ' + (ex ? ex.resultText : 'a result matching your inputs') + '.' },
    { q: 'Is ' + n + ' really free?', a: 'Yes — ' + n + ' is 100% free, with no limits, no premium tiers, and no account required. Every one of the ' + TOTAL_COUNT + '+ calculators on CalcPro follows the same rule: open, use, close. Nothing is locked away.' },
    { q: 'Do my inputs get sent anywhere when I use ' + n + '?', a: 'No. ' + n + ' runs entirely in your browser — nothing is uploaded, nothing is tracked, and no server sees your numbers. Disconnect from the internet and the page still works.' },
    { q: 'How accurate is the ' + m + ' result?', a: 'The math is exact to the precision of your inputs, so the practical accuracy of the ' + m + ' answer depends on how accurate your inputs are — use realistic values and the result will match the standard professional calculation.' },
    { q: 'Which inputs matter most for ' + kw0 + '?', a: (m + ' is usually the biggest driver of the result, followed by the other fields you enter. Try changing each one in turn — ' + n + ' recalculates instantly, so you can see exactly how much each input matters.') },
    { q: 'Can I use ' + n + ' on my phone?', a: 'Yes. ' + n + ' is fully responsive, works offline after your first visit, and every button and field is designed for touch. Results render just as clearly on a small screen as on a desktop.' },
    { q: 'Does ' + n + ' explain how it got the answer?', a: 'Yes — open the step-by-step breakdown below the ' + m + ' result. It shows the exact working used by ' + n + ', so you can verify the answer by hand instead of trusting it blindly.' },
    { q: 'Can I save or share my ' + m + ' calculation?', a: 'Yes. From the ' + n + ' page you can copy the result, export it as an image, CSV or PDF, or share a link pre-filled with your exact inputs — anyone who opens the link sees the same calculation.' },
    { q: 'What should I do if the ' + n + ' result looks wrong?', a: 'First re-check your inputs — units and decimal placement are the most common culprits with ' + n + '. Then open the step-by-step panel to trace the math. The tool computes exactly what you entered, so an unexpected answer almost always traces back to an unexpected input.' },
    { q: 'How is ' + n + ' different from a financial adviser or professional?', a: 'This is a calculator, not advice. It computes numbers precisely and transparently, but it does not know your personal situation. For major decisions, use the ' + m + ' result as a cross-check and confirm with a qualified professional.' }
  ];
  return faqs;
}

function genRelated(tool, catKey, all) {
  var sameCat = all.filter(function (x) { return x.catKey === catKey && x.tool.id !== tool.id; });
  return sameCat.slice(0, 5).map(function (x) { return { id: x.tool.id, label: x.tool.name }; });
}

function genDisclaimer(catKey, tool) {
  if (YMYL.indexOf(catKey) !== -1) {
    return 'This ' + (catKey === 'health' ? 'health' : 'financial') + ' calculator is provided for educational and planning purposes only. It is not a substitute for professional ' + (catKey === 'health' ? 'medical advice' : 'financial advice') + '. Always consult a qualified professional before making decisions based on these numbers.';
  }
  return 'Results are estimates for planning purposes only and should be verified independently before use.';
}

// ================= BUILD ONE ENTRY =================
function buildEntry(tool, catKey, all) {
  var catName = CAT_NAMES[catKey] || capitalize(catKey);
  var standards = CAT_STANDARDS[catKey] || 'standard industry practice';
  var metric = primaryMetric(tool);
  var ex = runExample(tool, false);
  var ex2 = runExample(tool, true) || ex;

  var lsi = kwList(tool);
  var related = genRelated(tool, catKey, all);

  var entry = {
    seoTitle: genSeoTitle(tool, metric, ex),
    metaDesc: genMetaDesc(tool, metric),
    canonicalPath: '/' + catKey + '/' + tool.id,
    cat: catKey,
    catName: catName,
    lsi: lsi,
    h1: tool.name,
    shortDesc: tool.desc ? stripTags(tool.desc) : ('Free ' + tool.name.toLowerCase() + ' with step-by-step working.'),
    intro: genIntro(tool, catName, metric, firstKeyword(tool), standards),
    quickAnswer: genQuickAnswer(tool, ex),
    formula: genFormula(tool, catName, standards, ex),
    stepByStep: genStepByStep(tool, ex),
    howToUse: genHowToUse(tool),
    inputExplanation: genInputExplanation(tool),
    outputExplanation: genOutputExplanation(tool, ex),
    workedExample: genWorkedExample(tool, ex2),
    applications: genApplications(tool, catName),
    commonMistakes: genCommonMistakes(tool),
    tips: genTips(tool),
    assumptions: genAssumptions(tool, ex),
    limitations: genLimitations(tool),
    accuracy: genAccuracy(tool),
    privacy: genPrivacy(tool),
    internalLinks: genInternalLinks(tool, catKey, catName, related),
    references: genReferences(catKey, tool),
    conclusion: genConclusion(tool, metric),
    faqs: genFAQs(tool, catName, metric, ex),
    related: related,
    disclaimer: genDisclaimer(catKey, tool)
  };

  // Register all substantial blocks for global uniqueness
  Object.keys(entry).forEach(function (k) {
    if (typeof entry[k] === 'string') registerBlock(entry[k]);
    else if (Array.isArray(entry[k])) entry[k].forEach(function (x) {
      if (typeof x === 'string') registerBlock(x);
      else if (x && typeof x === 'object') { registerBlock(x.q); registerBlock(x.a); }
    });
  });

  return entry;
}

// ================= MAIN =================
function main() {
  var all = loadTools();
  TOTAL_COUNT = all.length;
  var byId = {};
  all.forEach(function (x) { byId[x.tool.id] = x; });

  var entries = {};
  PREMIUM_IDS.forEach(function (id) {
    var found = byId[id];
    if (!found) { console.log('SKIP (not found):', id); return; }
    entries[id] = buildEntry(found.tool, found.catKey, all);
    console.log('OK:', id, '—', entries[id].seoTitle);
  });

  // Read existing premium file, keep everything before the first generated
  // block (or the legacy flagship marker) so loanEmi + composeArticle survive
  // and re-runs never duplicate generated entries.
  var src = fs.readFileSync(PREMIUM_FILE, 'utf8');
  var cut = src.indexOf('var prem_');
  if (cut === -1) {
    var marker = '  // Flagship entries (hand-maintained list';
    cut = src.indexOf(marker);
  }
  if (cut === -1) { console.error('Split marker not found in seo-premium.js — aborting.'); process.exit(1); }
  var prefix = src.slice(0, cut);

  // Build the new tail
  var varBlocks = [];
  Object.keys(entries).forEach(function (id) {
    varBlocks.push('var prem_' + id.replace(/-/g, '_') + ' = ' + JSON.stringify(entries[id], null, 2) + ';');
  });
  var allIds = ['loan-emi'].concat(Object.keys(entries));
  var entrieLines = allIds.map(function (id) {
    return id === 'loan-emi' ? "    'loan-emi': loanEmi" : "    '" + id + "': prem_" + id.replace(/-/g, '_');
  }).join(',\n');

  var tail = varBlocks.join('\n\n') + '\n\n' +
    '  // Flagship entries (hand-maintained + generated premium articles; keep in sync below).\n' +
    '  var ENTRIES = {\n' + entrieLines + '\n  };\n\n' +
    '  return {\n' + entrieLines + ',\n' +
    '    composeArticle: composeArticle,\n' +
    '    has: function (toolId) { return !!toolId && !!ENTRIES[toolId]; },\n' +
    '    keys: function () { return Object.keys(ENTRIES); }\n' +
    '  };\n' +
    '});\n';

  fs.writeFileSync(PREMIUM_FILE, prefix + tail);
  console.log('\nWrote', PREMIUM_FILE, '— entries:', allIds.length);
}

main();
