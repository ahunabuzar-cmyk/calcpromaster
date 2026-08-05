// audit-duplicate-content.js — deep analysis of repeated patterns in current SEO content
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync('./js/seo-content.js', 'utf8');
const m = src.match(/var TOOL_SEO = (\{[\s\S]*?\});/);
const seo = eval('(' + m[1] + ')');
const ids = Object.keys(seo);

// 1. Load tool data for cross-referencing
global.Charts = { donut: () => '', gauge: () => '', line: () => '', bar: () => '', overlay: () => '', spark: () => '' };
let tools = {};
fs.readdirSync(path.join(process.cwd(), 'js', 'data')).filter(f => f.endsWith('.js')).forEach(f => {
  const arr = require(path.join(process.cwd(), 'js', 'data', f));
  if (Array.isArray(arr)) arr.forEach(t => tools[t.id] = t);
});

// 2. Find ALL repeated N-word phrases (N ≥ 6) across tool descs
console.log('=== ANALYZING ALL 566 TOOL DESCS ===');
console.log('Tools in data:', Object.keys(tools).length, '| SEO entries:', ids.length);

// Check for input-specific vs generic content
let totalInputSpecific = 0, totalGeneric = 0;
ids.forEach(id => {
  const e = seo[id];
  const t = tools[id];
  if (!e || !e.desc) return;
  const inputNames = (t && t.inputs || []).map(i => i.id.toLowerCase());
  const labelNames = (t && t.inputs || []).map(i => (i.label || '').toLowerCase());
  const allNames = [...inputNames, ...labelNames];
  const descLower = e.desc.toLowerCase();
  // Count words that are NOT an input name or label
  const words = descLower.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(w => w.length > 3);
  const specific = words.filter(w => allNames.some(n => w.indexOf(n) !== -1));
  totalInputSpecific += specific.length;
  totalGeneric += words.length - specific.length;
});
console.log('Input-specific words (unique):', totalInputSpecific, '| Generic words (shared):', totalGeneric);
console.log('Generic ratio:', (totalGeneric / (totalInputSpecific + totalGeneric) * 100).toFixed(1) + '%');

// 3. Find the most common generic H2 block headings
const headings = {};
ids.forEach(id => {
  const d = seo[id] && seo[id].desc || '';
  d.split('<h2>').slice(1).forEach(h2 => {
    const head = h2.split('</h2>')[0].replace(/<[^>]+>/g, '').trim();
    if (!head) return;
    const k = head.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    if (!headings[k]) headings[k] = { count: 0, examples: [] };
    headings[k].count++;
    if (headings[k].examples.length < 3) headings[k].examples.push(id);
  });
});
console.log('\n=== H2 HEADING FREQUENCY ===');
Object.entries(headings).sort((a, b) => b[1].count - a[1].count).slice(0, 15).forEach(([h, info]) => {
  console.log(info.count + 'x: "' + info.examples[0].slice(0,30) + '..." => ' + h.slice(0, 60));
});

// 4. Philosophy paragraph — how many different versions?
const philosophies = new Map();
ids.forEach(id => {
  const d = seo[id] && seo[id].desc || '';
  const match = d.match(/CalcPro (Philosophy|Master)/);
  if (match) {
    const para = d.substring(Math.max(0, d.indexOf('CalcPro') - 30), d.indexOf('CalcPro') + 300).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const hash = para.slice(0, 80);
    if (!philosophies.has(hash)) philosophies.set(hash, []);
    philosophies.get(hash).push(id);
  }
});
console.log('\n=== PHILOSOPHY PARAGRAPH UNIQUENESS ===');
console.log('Unique philosophy variants:', philosophies.size);
const largeVariants = [...philosophies.entries()].filter(([h, t]) => t.length > 100).sort((a, b) => b[1].length - a[1].length);
console.log('Variants shared by 100+ tools:', largeVariants.length);
largeVariants.slice(0, 3).forEach(([h, t]) => {
  console.log('  ' + t.length + ' tools share: "' + h.slice(0, 80) + '..."');
});

// 5. Common Mistakes — how many unique variants?
const mistakes = new Map();
ids.forEach(id => {
  const d = seo[id] && seo[id].desc || '';
  const m = d.match(/Common Mistakes[\s\S]*?<\/p>/);
  if (m) {
    const hash = m[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50);
    if (!mistakes.has(hash)) mistakes.set(hash, []);
    mistakes.get(hash).push(id);
  }
});
const uniqueMistakes = [...new Set(ids.map(id => {
  const d = seo[id] && seo[id].desc || '';
  const m = d.match(/Common Mistakes[\s\S]*?<\/p>/);
  return m ? m[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50) : 'NO_MISTAKES';
}))];
console.log('\n=== COMMON MISTAKES UNIQUENESS ===');
console.log('Unique mistake texts:', uniqueMistakes.length, '(out of', ids.length, 'tools)');

// 6. FAQ — how many unique Q&A sets?
const faqSets = new Map();
ids.forEach(id => {
  const faqs = seo[id] && seo[id].faqs || [];
  if (faqs.length) {
    const hash = faqs.map(f => f.q.slice(0, 20)).join('|');
    if (!faqSets.has(hash)) faqSets.set(hash, []);
    faqSets.get(hash).push(id);
  }
});
const uniqueFaqSets = faqSets.size;
const sharedFaqSets = [...faqSets.entries()].filter(([h, t]) => t.length > 5).length;
console.log('\n=== FAQ SET UNIQUENESS ===');
console.log('Unique FAQ sets:', uniqueFaqSets, '| Shared by 5+ tools:', sharedFaqSets);

console.log('\n=== RECOMMENDATIONS ===');
console.log('1. Philosophy paragraph: generate UNIQUE per-tool from tool name/category/use case');
console.log('2. Common Mistakes: generate from tool-specific edge cases');
console.log('3. How-to steps: generate from unique input types (no more template text)');
console.log('4. FAQ: 2 of 7 questions can be unique per tool; rest from pool');
console.log('5. Comparison block: tool-specific advantages mention exact use cases');