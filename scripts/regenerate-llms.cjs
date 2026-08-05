// Regenerate llms.txt category sections from ACTUAL js/data/*.js tool arrays.
// Fixes stale counts (Finance 58→62, Tech 25→40, etc.) and the 524+→566+ headline.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// data file -> llms heading name (order = display order)
const CATS = [
  ['finance.js', 'Finance'],
  ['health.js', 'Health & Fitness'],
  ['math.js', 'Math'],
  ['everyday.js', 'Everyday'],
  ['science.js', 'Science'],
  ['engineering.js', 'Engineering'],
  ['construction.js', 'Construction'],
  ['conversion.js', 'Conversion'],
  ['business.js', 'Business'],
  ['education.js', 'Education'],
  ['utilities.js', 'Utilities'],
  ['lifestyle.js', 'Lifestyle & Home'],
  ['regional.js', 'Regional (India/PK/UAE)'],
  ['food-nutrition.js', 'Food & Nutrition'],
  ['fitness-exercise.js', 'Fitness & Exercise'],
  ['auto-transport.js', 'Auto & Transport'],
  ['career-freelance.js', 'Career & Freelance'],
  ['home-garden.js', 'Home & Garden'],
  ['tech-digital.js', 'Tech & Digital'],
  ['parenting-family.js', 'Parenting & Family'],
];

const sections = [];
let total = 0;
for (const [file, heading] of CATS) {
  const mod = require(path.join(ROOT, 'js', 'data', file));
  const arr = Array.isArray(mod) ? mod : [];
  total += arr.length;
  const names = arr.map(t => t.name || t.id).filter(Boolean);
  sections.push(`### ${heading} (${arr.length} calculators)\n${names.join(', ')}`);
}

const llmsPath = path.join(ROOT, 'llms.txt');
let llms = fs.readFileSync(llmsPath, 'utf8');

// Headline counts
llms = llms.replace(/> 524\+ free online calculators/, `> ${total}+ free online calculators`);
llms = llms.replace(/\*\*524\+ calculators\*\* across 20 categories/, `**${total}+ calculators** across 20 categories`);

// Replace everything between "## Calculator Categories" and "## Static Pages"
const startMark = '## Calculator Categories';
const endMark = '## Static Pages';
const sIdx = llms.indexOf(startMark);
const eIdx = llms.indexOf(endMark);
if (sIdx === -1 || eIdx === -1 || eIdx <= sIdx) {
  console.error('Could not locate category section markers in llms.txt');
  process.exit(1);
}
const newMid = startMark + '\n' + sections.join('\n\n') + '\n\n';
llms = llms.slice(0, sIdx) + newMid + llms.slice(eIdx);

// Footer count
llms = llms.replace(/CalcPro — 524\+ free calculators/, `CalcPro — ${total}+ free calculators`);

fs.writeFileSync(llmsPath, llms);
console.log(`llms.txt regenerated — ${total} calculators across ${CATS.length} categories.`);
