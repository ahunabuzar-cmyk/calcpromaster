// SEO Content Generator v2 for CalcPro — produces unique, human-like content per tool
// Run: node generate-seo.js > js/seo-content.js

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'js', 'data');
const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.js'));

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

const CAT_ICONS = {
  finance: '\uD83D\uDCB0', health: '\u2764\uFE0F', math: '\u2797',
  everyday: '\uD83C\uDFE0', science: '\uD83D\uDD2C', engineering: '\u2699\uFE0F',
  construction: '\uD83C\uDFD7\uFE0F', conversion: '\uD83D\uDD04', business: '\uD83D\uDCCA',
  education: '\uD83C\uDF93', utilities: '\uD83D\uDD27', lifestyle: '\uD83C\uDFE1',
  regional: '\uD83C\uDF0D', food: '\uD83C\uDF54', fitness: '\uD83C\uDFCB\uFE0F',
  auto: '\uD83D\uDE97', career: '\uD83D\uDCBC', homegarden: '\uD83C\uDF3F',
  tech: '\uD83D\uDDA5\uFE0F', family: '\uD83D\uDC6A'
};

// Hash a string to a number for pseudo-random selection
function hashStr(s) {
  var h = 0;
  for (var i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// Extract tools with full data: id, name, desc, kw, inputs, steps
function extractTools(filePath) {
  var content = fs.readFileSync(filePath, 'utf8');
  var tools = [];
  var re = /(?:\[|,)\s*\n\s*\{\s*id:\s*'([^']+)'\s*,\s*name:\s*'((?:[^'\\]|\\.)*)'\s*,\s*desc:\s*'((?:[^'\\]|\\.)*)'\s*,\s*kw:\s*'((?:[^'\\]|\\.)*)'/g;
  var seen = {};
  var m;
  while ((m = re.exec(content)) !== null) {
    var id = m[1];
    if (!seen[id]) {
      seen[id] = true;
      // Try to extract inputs
      var inputs = [];
      var inputRe = new RegExp("id:\\s*'" + id + "'[\\s\\S]*?inputs:\\s*\\[([\\s\\S]*?)\\]");
      var im = content.match(inputRe);
      if (im) {
        var inputObjRe = /\{id:\s*'([^']+)'\s*,label:\s*'([^']+)'\s*,type:\s*'([^']+)'/g;
        var i2;
        while ((i2 = inputObjRe.exec(im[1])) !== null) {
          inputs.push({ id: i2[1], label: i2[2], type: i2[3] });
        }
      }
      // Try to extract steps
      var steps = [];
      var stepRe = new RegExp("id:\\s*'" + id + "'[\\s\\S]*?steps:\\s*function[^}]*return\\s*\\[([\\s\\S]*?)\\]", 'g');
      var sm = stepRe.exec(content);
      if (sm) {
        var stepStrRe = /'([^']*)'/g;
        var s2;
        while ((s2 = stepStrRe.exec(sm[1])) !== null) steps.push(s2[1]);
      }
      tools.push({ id, name: m[2], desc: m[3], kw: m[4], inputs, steps });
    }
  }
  return tools;
}

// ---- Content Temlates (varied per tool hash) ----

function pickTemplates(toolId) {
  var h = hashStr(toolId);
  return {
    introIdx: h % 6,
    featureIdx: (h >> 2) % 5,
    closingIdx: (h >> 4) % 4,
    useCaseIdx: (h >> 6) % 4,
    hasDetails: (h % 3) > 0
  };
}

function genTitle(tool) {
  var kws = (tool.kw || '').split(',').map(s => s.trim()).filter(Boolean);
  var pk = kws[0] || tool.name;
  var title = tool.name + ' — Free ' + pk.toUpperCase().charAt(0) + pk.slice(1);
  if (title.length > 60) title = tool.name + ' — Free Online Calculator';
  if (title.length > 60) title = tool.name + ' — Free Calc';
  return title.substring(0, 60).replace(/—\s*$/, '').trim();
}

function genMetaDesc(tool) {
  var kws = (tool.kw || '').split(',').map(s => s.trim()).filter(Boolean);
  var kw = kws[0] || tool.name;
  var meta = tool.name + ': ' + tool.desc + ' Free, instant, no sign-up.';
  if (meta.length <= 155) return meta;
  meta = tool.name + ': ' + tool.desc.substring(0, 140) + ' Free.';
  if (meta.length > 155) meta = 'Free ' + kw + ' — ' + tool.desc.substring(0, 120);
  return meta.substring(0, 155);
}

function genDescription(tool, catKey, tmp) {
  var catName = CAT_NAMES[catKey] || catKey;
  var icon = CAT_ICONS[catKey] || '\uD83D\uDD22';
  var kws = (tool.kw || '').split(',').map(s => s.trim()).filter(Boolean);
  var pk = kws[0] || tool.name;
  var inputs = tool.inputs || [];
  var numInputs = inputs.filter(i => i.type === 'number');
  var selectInputs = inputs.filter(i => i.type === 'select');
  var steps = tool.steps || [];
  
  var parts = [];
  
  // ---- SECTION 1: What & Why (varies by introIdx) ----
  var introTemplates = [
    `<p>${tool.name} solves a specific problem: ${tool.desc.toLowerCase()}. Instead of reaching for a spreadsheet or doing mental math, you get an instant answer. The calculation runs locally — nothing leaves your browser. No uploads, no accounts, no ads.</p>`,
    `<p>${tool.name} is built for one thing: ${tool.desc.toLowerCase()}. Fast, accurate, and completely free. Type in your numbers, get your answer. That's it. No sign-up walls, no premium upsells, no data collection.</p>`,
    `<p>${tool.name} handles a task most people deal with: ${tool.desc.toLowerCase()}. Manual calculation takes time and invites mistakes. This tool does it in seconds, client-side, with clear results you can verify.</p>`,
    `<p>${tool.name} cuts through the busywork of ${tool.desc.toLowerCase()}. Every field is optional where it makes sense. Change any value and recalculate instantly. The result panel updates with the full breakdown.</p>`,
    `<p>${tool.name} is a no-fuss way to ${tool.desc.toLowerCase()}. Open the page, enter your numbers, and read the answer. No registration. No email required. No tracking scripts injecting themselves into your session.</p>`,
    `<p>Most ${catName.toLowerCase()} calculators make you jump through hoops. ${tool.name} does the opposite: ${tool.desc.toLowerCase()}. One page, three seconds, done. Everything runs in your browser tab.</p>`
  ];
  var introIdx = tool.id.length % 6;
  // Use steps to make intro more specific
  if (steps.length > 0) {
    var stepStr = steps.slice(0, 2).map(s => s.replace(/^Step\s+\d+:\s*/i, '').toLowerCase()).join(' Then ');
    parts.push(`<h2>What This Calculator Does</h2>\n<p>The ${tool.name} ${tool.desc.toLowerCase()}. You enter your numbers, and it applies standard formulas to return a clear result. The full calculation runs in your browser — no data sent anywhere.</p>\n<p>Using it is straightforward: ${stepStr}. That's the entire flow. Adjust any input afterward and the result updates in real time.</p>`);
  } else {
    parts.push(`<h2>What This Calculator Does</h2>\n${introTemplates[introIdx]}`);
  }
  
  // ---- SECTION 2: How to use (with specific inputs) ----
  if (inputs.length > 0) {
    parts.push('<h2>How to Use It</h2>\n<ol>');
    inputs.slice(0, 5).forEach(inp => {
      if (inp.type === 'number') {
        parts.push(`<li><strong>Enter the ${inp.label.toLowerCase()}</strong> — the main numeric value for this calculation. Adjust as needed and see the result change.</li>`);
      } else if (inp.type === 'select') {
        parts.push(`<li><strong>Choose the ${inp.label.toLowerCase()}</strong> from the dropdown. This selects the right calculation mode or unit for your scenario.</li>`);
      } else if (inp.type === 'checkbox') {
        parts.push(`<li><strong>Toggle ${inp.label.toLowerCase()}</strong> on or off depending on your situation.</li>`);
      } else {
        parts.push(`<li><strong>Fill in the ${inp.label.toLowerCase()}</strong>. This value controls how the formula applies to your numbers.</li>`);
      }
    });
    if (numInputs.length >= 2) {
      parts.push('<li><strong>Review the result</strong> — the answer appears instantly in the result panel. Use the step-by-step breakdown to verify each part of the calculation.</li>');
    } else {
      parts.push('<li><strong>Read your result</strong> — the calculated value displays immediately, with context and explanation underneath.</li>');
    }
    parts.push('</ol>');
  } else {
    parts.push('<h2>How to Use It</h2>\n<p>This tool works interactively. Enter the required values in the input fields and click Calculate. The result appears with a full breakdown of the formula and each step.</p>');
  }
  
  // ---- SECTION 3: Key Features (varies by tool) ----
  var features = [
    `<h2>Key Features</h2>\n<ul><li><strong>100% free</strong> — no premium tiers, no hidden charges, no usage caps. Every feature is available to everyone.</li><li><strong>Client-side only</strong> — your data stays on your device. No server uploads, no logs, no tracking.</li><li><strong>Works offline</strong> — after the first visit, the tool works without an internet connection.</li><li><strong>Instant recalc</strong> — change any input and the result updates immediately.</li><li><strong>Exportable results</strong> — share via link, copy to clipboard, or export as image.</li></ul>`,
    `<h2>Why Use This Tool</h2>\n<ul><li><strong>Saves time</strong> — manual ${catName.toLowerCase()} calculations take minutes. This tool does it in under a second.</li><li><strong>No bloat</strong> — pure JavaScript, nothing else. No frameworks, no trackers, no analytics by default.</li><li><strong>Accurate every time</strong> — standard formulas, no rounding errors, verified output.</li><li><strong>Works everywhere</strong> — desktop, tablet, phone. Same clean interface on any screen size.</li><li><strong>Privacy first</strong> — zero data collection. Your inputs and results belong to you.</li></ul>`,
    `<h2>What Makes It Different</h2>\n<ul><li><strong>Real calculations, not simulations</strong> — every result uses verified mathematical formulas.</li><li><strong>Step-by-step breakdown</strong> — see how the answer was derived, not just the final number.</li><li><strong>No account needed</strong> — open and use. No sign-up, no email, no password.</li><li><strong>Bulk comparison</strong> — use the batch mode to compare multiple scenarios side by side.</li><li><strong>Keyboard-friendly</strong> — tab through inputs, hit Enter to calculate. No mouse required for power users.</li></ul>`,
    `<h2>Core Advantages</h2>\n<ul><li><strong>Instant — type, click, done</strong>. No page reloads, no waiting.</li><li><strong>Zero server dependency</strong> — the tool works even if the internet drops mid-session.</li><li><strong>Unlimited use</strong> — calculate as many times as you want. No rate limits, no daily caps.</li><li><strong>Transparent math</strong> — the steps area shows every operation so you can verify the logic.</li><li><strong>Accessible</strong> — works with screen readers, supports keyboard navigation, respects reduced motion preferences.</li></ul>`,
    `<h2>Built for Real Use</h2>\n<ul><li><strong>Ships as a single page</strong> — no multi-step wizards. Everything you need is right there.</li><li><strong>Dark mode</strong> — toggle between light and dark themes without losing your inputs.</li><li><strong>Presets</strong> — save common input combinations and load them with one click.</li><li><strong>Goal seek</strong> — work backwards: tell the tool what result you want and it finds the input you need.</li><li><strong>Voice input</strong> — on supported browsers, speak the numbers instead of typing them.</li></ul>`
  ];
  var featIdx = (hashStr(tool.id) >> 2) % features.length;
  parts.push(features[featIdx]);
  
  // ---- SECTION 4: Real-world use cases ----
  var useCases = [
    `<h2>Real-World Examples</h2>\n<p>Students use ${tool.name} to check their homework and understand how different inputs affect the outcome. Professionals rely on it during client meetings for quick estimates. Homeowners plug in their own numbers to plan budgets and compare options. The ${pk} formula is a standard reference, and this tool makes it accessible to anyone.</p>`,
    `<h2>When You Might Need This</h2>\n<p>You are comparing offers and need to see the numbers side by side. You are planning ahead and want to test different scenarios. You are learning how ${catName.toLowerCase()} math works and want a tool that shows each step. You are in a hurry and need a reliable answer without opening a spreadsheet.</p>`,
    `<h2>Common Situations</h2>\n<p>${tool.name} comes in handy when you are evaluating options and need a quick comparison. Instead of guessing or approximating, you get precise numbers. Teachers use it to demonstrate concepts. Freelancers use it to price projects. Buyers use it to understand loan terms. The use cases cut across professions and daily life.</p>`,
    `<h2>Who Uses This Tool</h2>\n<p>Students studying ${catName.toLowerCase()} concepts. Analysts running numbers before presentations. Engineers checking theoretical values against practical limits. Shoppers comparing product costs. Nearly anyone who needs a fast, accurate calculation without installing software or creating an account.</p>`
  ];
  var ucIdx = (hashStr(tool.id + 'uc') >> 6) % useCases.length;
  parts.push(useCases[ucIdx]);
  
  // ---- SECTION 5: Why CalcPro (closing, varies) ----
  var closings = [
    `<p>CalcPro hosts 500+ free calculators across 20 categories — from finance and health to unit conversion and everyday math. Every calculator is pure vanilla JavaScript. Nothing is sent to a server. No data is collected. No ads interrupt your workflow. All tools work offline after the first visit and are free forever.</p>`,
    `<p>${tool.name} is part of a larger collection — over 500 tools spanning 20 categories. Every calculator on CalcPro is built the same way: client-side, framework-free, no tracking. The goal is simple: give you a fast, accurate answer without collecting your data or asking you to sign up.</p>`,
    `<p>All 500+ CalcPro tools follow the same philosophy: serve the user, not the tracker. No analytics by default, no data collection, no server uploads. Every calculator runs in your browser. The code is open and readable. You can verify exactly what the tool does with your inputs.</p>`,
    `<p>CalcPro is an independent project with 500+ calculators across finance, health, math, science, business, construction, conversion, education, everyday life, and more. No venture capital. No exit strategy. Just useful tools that work offline and respect your privacy.</p>`
  ];
  var closeIdx = (hashStr(tool.id + 'end') >> 4) % closings.length;
  parts.push(closings[closeIdx]);
  
  return parts.join('\n');
}

function genFAQs(tool, catKey) {
  var catName = CAT_NAMES[catKey] || catKey;
  var kws = (tool.kw || '').split(',').map(s => s.trim()).filter(Boolean);
  var pk = kws[0] || tool.name;
  var h = hashStr(tool.id);
  
  var faqs = [];
  
  // Always have 3-4 FAQs, varied per tool
  var baseFAQs = [
    { q: 'Is this ' + tool.name + ' really free?', a: 'Yes. No hidden charges, no premium features locked away, no usage limits. Every calculator on CalcPro is free forever.' },
    { q: 'Does it work offline?', a: 'After the first visit, the tool caches locally and works without an internet connection. Great for spotty connections or saving data.' },
    { q: 'Do you save my data?', a: 'No. Everything runs in your browser. Your inputs never reach a server. Local preferences (like dark mode) stay on your device.' },
    { q: 'How accurate are the results?', a: 'The tool uses standard mathematical formulas. Results are precise to several decimal places. Rounding follows standard conventions.' }
  ];
  
  // Replace some FAQs with tool-specific ones based on hash
  var extraFAQs = [
    { q: 'Can I use ' + pk + ' on my phone?', a: 'Yes. The layout adapts to any screen size. Works on iOS Safari, Android Chrome, and desktop browsers.' },
    { q: 'What inputs do I need for ' + tool.name + '?', a: 'The fields are labeled clearly on the page. Most require numeric values. Optional fields are marked so you can skip them.' },
    { q: 'Can I print or share the result?', a: 'Yes. Use the Print button for a clean report. Share via link with pre-filled values. Or export the result as an image.' },
    { q: 'Do I need to create an account?', a: 'No account required. Open the page and use it immediately. No sign-up, no email, no password.' },
    { q: 'Can I compare different scenarios?', a: 'Yes. Use the built-in batch mode to compare multiple sets of inputs side by side. Pin results to compare across different calculators.' }
  ];
  
  // Pick 4 FAQs: pick some from base, some from extra based on hash
  var faqSelection = [];
  var basePick = (h % 2 === 0) ? [0, 1, 2] : [0, 2, 3];
  basePick.forEach(function(idx) { faqSelection.push(baseFAQs[idx]); });
  var extraIdx = h % extraFAQs.length;
  faqSelection.push(extraFAQs[extraIdx]);
  
  return faqSelection;
}

// == MAIN ==
var output = [];
output.push('// Auto-generated SEO content for all CalcPro tools');
output.push('// Generated: ' + new Date().toISOString().slice(0, 10));
output.push('var TOOL_SEO = {');

var allTools = [];
var dupeCheck = {};

files.forEach(function(file) {
  var filePath = path.join(DATA_DIR, file);
  var catKey = CAT_KEYS[file];
  if (!catKey) return;
  
  var tools = extractTools(filePath);
  
  tools.forEach(function(tool) {
    if (dupeCheck[tool.id]) {
      process.stderr.write('WARN: Duplicate tool ID: ' + tool.id + '\n');
      return;
    }
    dupeCheck[tool.id] = true;
    
    var title = genTitle(tool);
    var metaDesc = genMetaDesc(tool);
    var desc = genDescription(tool, catKey);
    var faqs = genFAQs(tool, catKey);
    
    output.push("  '" + tool.id + "': {");
    output.push("    title: " + JSON.stringify(title) + ",");
    output.push("    metaDesc: " + JSON.stringify(metaDesc) + ",");
    output.push("    desc: " + JSON.stringify(desc) + ",");
    output.push("    faqs: " + JSON.stringify(faqs) + ",");
    output.push("  },");
    
    allTools.push({ id: tool.id, catKey: catKey });
  });
});

output.push('};');
output.push('');
output.push('var TOOL_CATEGORY = {');
allTools.forEach(function(t) {
  output.push("  '" + t.id + "': '" + t.catKey + "',");
});
output.push('};');
output.push('');
output.push('if (typeof window !== "undefined") {');
output.push('  window.TOOL_SEO = TOOL_SEO;');
output.push('  window.TOOL_CATEGORY = TOOL_CATEGORY;');
output.push('}');
output.push('');
output.push('// Total tools: ' + allTools.length);

console.log(output.join('\n'));
process.stderr.write('Generated SEO content for ' + allTools.length + ' unique tools\n');
