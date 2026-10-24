#!/usr/bin/env node
// Market-gap batch 2 — pet cost tools (Part 1 item 3), Hajj cost estimator
// (Part 1 item 4), and creator-economy rate tools (Part 1 item 6 / Part 2
// items 27-30). Deterministic models with documented formulas and worked
// examples. Idempotent; same two-part pattern as batch 1.
// ESCAPING SAFETY: NO "$" followed by a digit, NO backslash, NO apostrophes.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const B = String.fromCharCode(92);
const Q39 = String.fromCharCode(39);

const CATS = {
  lifestyle: { file: 'lifestyle.js', constName: 'LIFESTYLE_TOOLS', catName: 'Lifestyle & Home' },
  health: { file: 'health.js', constName: 'HEALTH_TOOLS', catName: 'Health & Fitness' },
  finance: { file: 'finance.js', constName: 'FINANCE_TOOLS', catName: 'Finance' },
  business: { file: 'business.js', constName: 'BUSINESS_TOOLS', catName: 'Business' }
};

const TOOLS = [
  {
    id: 'pet-insurance-cost', cat: 'lifestyle',
    name: 'Pet Insurance Cost Calculator',
    desc: 'Free pet insurance cost estimator: monthly and annual premium from species, age, size and the level of cover you choose.',
    kw: 'pet insurance cost calculator, dog insurance estimate, cat insurance calculator, pet premium estimate',
    inputs: [
      { id: 'species', label: 'Pet', type: 'select', options: ['Dog', 'Cat'], def: 'Dog' },
      { id: 'age', label: 'Age (years)', type: 'number', def: 3 },
      { id: 'size', label: 'Size', type: 'select', options: ['Small', 'Medium', 'Large'], def: 'Medium' },
      { id: 'coverage', label: 'Coverage', type: 'select', options: ['Accident only', 'Comprehensive'], def: 'Comprehensive' }
    ],
    calc: function (v) {
      var base = v.species === 'Dog' ? (v.coverage === 'Accident only' ? 22 : 48) : (v.coverage === 'Accident only' ? 15 : 32);
      var ageF = v.age <= 2 ? 0.9 : v.age <= 7 ? 1.0 : 1.4;
      var sizeF = v.size === 'Small' ? 0.9 : v.size === 'Large' ? 1.25 : 1.0;
      var prem = base * ageF * sizeF;
      return {
        result: 'Estimated premium: ' + prem.toFixed(2) + ' per month',
        chart: Charts.donut([prem, prem * 11], ['This month', 'Rest of year']),
        extra: 'Annual premium: ' + (prem * 12).toFixed(0) + ' | Base ' + base + ' x age factor ' + ageF + ' x size factor ' + sizeF + ' | Indicative only, actual quotes depend on breed and insurer'
      };
    },
    steps: function (v) {
      var base = v.species === 'Dog' ? (v.coverage === 'Accident only' ? 22 : 48) : (v.coverage === 'Accident only' ? 15 : 32);
      var ageF = v.age <= 2 ? 0.9 : v.age <= 7 ? 1.0 : 1.4;
      var sizeF = v.size === 'Small' ? 0.9 : v.size === 'Large' ? 1.25 : 1.0;
      var prem = base * ageF * sizeF;
      return [
        'Step 1: Start from a base premium for a ' + v.species + ' on ' + v.coverage + ' cover = ' + base + ' a month.',
        'Step 2: Apply the age factor. Pets under 2 are cheaper and pets over 7 cost more: factor ' + ageF + '.',
        'Step 3: Apply the size factor for a ' + v.size + ' ' + v.species + ': ' + sizeF + '.',
        'Step 4: Monthly premium = ' + base + ' x ' + ageF + ' x ' + sizeF + ' = ' + prem.toFixed(2) + '.',
        'Step 5: Annual premium = ' + prem.toFixed(2) + ' x 12 = ' + (prem * 12).toFixed(0) + '.',
        'Step 6: Compare at least three quotes — breed, region and excess change the real price a lot.'
      ];
    }
  },
  {
    id: 'pet-medication-dose', cat: 'health',
    name: 'Pet Medication Dosage Calculator',
    desc: 'Free pet medicine dose calculator: converts a weight-based mg per kg dose into the millilitres to draw, for common vet-prescribed drugs.',
    kw: 'pet medication dosage calculator, dog dose calculator mg kg, cat medicine dose, pet medicine ml calculator',
    inputs: [
      { id: 'weight', label: 'Pet weight (kg)', type: 'number', def: 10 },
      { id: 'drug', label: 'Medication', type: 'select', options: ['Meloxicam', 'Metronidazole', 'Amoxicillin', 'Gabapentin'], def: 'Metronidazole' }
    ],
    calc: function (v) {
      var T = { 'Meloxicam': [0.1, 1.5], 'Metronidazole': [10, 50], 'Amoxicillin': [10, 50], 'Gabapentin': [10, 50] };
      var row = T[v.drug];
      var mg = v.weight * row[0];
      var ml = mg / row[1];
      return {
        result: 'Dose: ' + mg.toFixed(1) + ' mg (' + ml.toFixed(2) + ' mL)',
        chart: Charts.bar([mg, ml], ['Milligrams', 'Millilitres']),
        extra: 'At ' + row[0] + ' mg per kg and ' + row[1] + ' mg per mL | VET-PRESCRIBED ONLY: confirm every dose with your veterinarian before giving any medicine'
      };
    },
    steps: function (v) {
      var T = { 'Meloxicam': [0.1, 1.5], 'Metronidazole': [10, 50], 'Amoxicillin': [10, 50], 'Gabapentin': [10, 50] };
      var row = T[v.drug];
      var mg = v.weight * row[0];
      var ml = mg / row[1];
      return [
        'Step 1: Look up the standard dose for ' + v.drug + ': ' + row[0] + ' mg per kg of body weight.',
        'Step 2: Dose in milligrams = ' + v.weight + ' kg x ' + row[0] + ' mg per kg = ' + mg.toFixed(1) + ' mg.',
        'Step 3: Look up the liquid concentration: ' + row[1] + ' mg per mL.',
        'Step 4: Volume to draw = ' + mg.toFixed(1) + ' mg / ' + row[1] + ' mg per mL = ' + ml.toFixed(2) + ' mL.',
        'Step 5: This is a reference figure only. Your vet sets the real dose, the frequency and any adjustment for kidney or liver health.',
        'Step 6: Never give human medicine to a pet without veterinary instruction — several common drugs are toxic to cats and dogs.'
      ];
    }
  },
  {
    id: 'pet-boarding-cost', cat: 'lifestyle',
    name: 'Pet Boarding Cost Calculator',
    desc: 'Free pet boarding cost calculator: total kennel or sitter cost from night rate, number of pets, length of stay and any extras.',
    kw: 'pet boarding cost calculator, kennel cost calculator, cat boarding price, dog sitting cost',
    inputs: [
      { id: 'days', label: 'Nights', type: 'number', def: 5 },
      { id: 'rate', label: 'Nightly rate per pet', type: 'number', def: 35 },
      { id: 'pets', label: 'Number of pets', type: 'number', def: 1 },
      { id: 'extras', label: 'Extras (grooming, meds)', type: 'number', def: 25 }
    ],
    calc: function (v) {
      var boarding = v.days * v.rate * v.pets;
      var total = boarding + v.extras;
      return {
        result: 'Boarding cost: ' + total.toFixed(0),
        chart: Charts.donut([boarding, v.extras], ['Boarding', 'Extras']),
        extra: 'Boarding ' + v.days + ' x ' + v.rate + ' x ' + v.pets + ' pets = ' + boarding.toFixed(0) + ' | Extras ' + v.extras.toFixed(0) + ' | Many kennels give a second-pet discount'
      };
    },
    steps: function (v) {
      var boarding = v.days * v.rate * v.pets;
      var total = boarding + v.extras;
      return [
        'Step 1: Boarding for one pet = ' + v.days + ' nights x ' + v.rate + ' a night = ' + (v.days * v.rate).toFixed(0) + '.',
        'Step 2: Multiply by the number of pets: ' + (v.days * v.rate).toFixed(0) + ' x ' + v.pets + ' = ' + boarding.toFixed(0) + '.',
        'Step 3: Add extras such as grooming or medication: +' + v.extras.toFixed(0) + '.',
        'Step 4: Total = ' + boarding.toFixed(0) + ' + ' + v.extras.toFixed(0) + ' = ' + total.toFixed(0) + '.',
        'Step 5: Ask about multi-pet discounts, which are often 20 to 50 percent off the second pet.'
      ];
    }
  },
  {
    id: 'hajj-cost', cat: 'finance',
    name: 'Hajj Cost Calculator',
    desc: 'Free Hajj cost estimator: total pilgrimage budget from the package price, number of travellers and travel extras.',
    kw: 'hajj cost calculator, hajj budget estimator, umrah package cost, pilgrimage cost calculator',
    inputs: [
      { id: 'pkg', label: 'Package per person', type: 'number', def: 7000 },
      { id: 'people', label: 'Travellers', type: 'number', def: 1 },
      { id: 'extras', label: 'Travel extras (flights, visa)', type: 'number', def: 1500 }
    ],
    calc: function (v) {
      var packageTotal = v.pkg * v.people;
      var total = packageTotal + v.extras;
      return {
        result: 'Total Hajj cost: ' + total.toFixed(0),
        chart: Charts.donut([packageTotal, v.extras], ['Package', 'Extras']),
        extra: 'Package ' + v.pkg + ' x ' + v.people + ' = ' + packageTotal.toFixed(0) + ' | Extras ' + v.extras.toFixed(0) + ' | Add spending money, Qurbani and gifts separately'
      };
    },
    steps: function (v) {
      var packageTotal = v.pkg * v.people;
      var total = packageTotal + v.extras;
      return [
        'Step 1: Package cost = ' + v.pkg + ' per person x ' + v.people + ' travellers = ' + packageTotal.toFixed(0) + '.',
        'Step 2: Add travel extras such as flights, visa and insurance = ' + v.extras.toFixed(0) + '.',
        'Step 3: Total = ' + packageTotal.toFixed(0) + ' + ' + v.extras.toFixed(0) + ' = ' + total.toFixed(0) + '.',
        'Step 4: Budget separately for spending money, Qurbani, gifts and any medical costs.',
        'Step 5: Prices vary widely by country, package tier and distance from the Haram, so treat this as a planning baseline.'
      ];
    }
  },
  {
    id: 'sponsorship-rate', cat: 'business',
    name: 'Influencer Sponsorship Rate Calculator',
    desc: 'Free influencer sponsorship rate calculator: an estimated paid-post price from follower count, engagement rate and platform CPM.',
    kw: 'influencer rate calculator, sponsorship rate calculator, how much to charge sponsored post, creator pricing calculator',
    inputs: [
      { id: 'followers', label: 'Followers', type: 'number', def: 50000 },
      { id: 'engagement', label: 'Engagement rate (percent)', type: 'number', def: 3 },
      { id: 'platform', label: 'Platform', type: 'select', options: ['Instagram', 'TikTok', 'YouTube'], def: 'Instagram' },
      { id: 'cpm', label: 'Rate per 1000 followers', type: 'number', def: 25 }
    ],
    calc: function (v) {
      var base = v.followers / 1000 * v.cpm;
      var adj = v.engagement / 3;
      var est = base * adj;
      return {
        result: 'Estimated rate per post: ' + est.toFixed(0),
        chart: Charts.bar([est * 0.7, est, est * 1.5], ['Low', 'Mid', 'High']),
        extra: 'Range ' + (est * 0.7).toFixed(0) + ' to ' + (est * 1.5).toFixed(0) + ' | Base ' + base.toFixed(0) + ' x engagement factor ' + adj.toFixed(2) + ' | ' + v.platform + ' rates vary with niche and usage rights'
      };
    },
    steps: function (v) {
      var base = v.followers / 1000 * v.cpm;
      var adj = v.engagement / 3;
      var est = base * adj;
      return [
        'Step 1: Base value = followers / 1000 x rate per 1000 = ' + v.followers + ' / 1000 x ' + v.cpm + ' = ' + base.toFixed(0) + '.',
        'Step 2: Adjust for engagement. A 3 percent rate is the baseline, so the factor is ' + v.engagement + ' / 3 = ' + adj.toFixed(2) + '.',
        'Step 3: Estimated rate = ' + base.toFixed(0) + ' x ' + adj.toFixed(2) + ' = ' + est.toFixed(0) + ' per post.',
        'Step 4: Quote a range of ' + (est * 0.7).toFixed(0) + ' to ' + (est * 1.5).toFixed(0) + ' to leave room for negotiation.',
        'Step 5: Add a premium for exclusive usage, whitelisting, or a multi-post package, and never trade free product for a rate this calculation says you are worth.'
      ];
    }
  },
  {
    id: 'brand-deal-value', cat: 'business',
    name: 'Brand Deal Value Calculator',
    desc: 'Free brand deal value calculator: estimate a multi-post sponsorship package price from followers, engagement and number of deliverables.',
    kw: 'brand deal calculator, sponsored package price, influencer campaign cost, creator deal calculator',
    inputs: [
      { id: 'followers', label: 'Followers', type: 'number', def: 50000 },
      { id: 'engagement', label: 'Engagement rate (percent)', type: 'number', def: 3 },
      { id: 'posts', label: 'Deliverables (posts)', type: 'number', def: 3 },
      { id: 'cpm', label: 'Rate per 1000 followers', type: 'number', def: 25 }
    ],
    calc: function (v) {
      var per = v.followers / 1000 * v.cpm * (v.engagement / 3);
      var total = per * v.posts;
      var bundle = total * 0.9;
      return {
        result: 'Estimated deal value: ' + total.toFixed(0),
        chart: Charts.bar([per, total, bundle], ['Per post', 'Total', 'Bundle (10% off)']),
        extra: 'Per post ' + per.toFixed(0) + ' x ' + v.posts + ' deliverables = ' + total.toFixed(0) + ' | Typical multi-post bundle discount lands near ' + bundle.toFixed(0)
      };
    },
    steps: function (v) {
      var per = v.followers / 1000 * v.cpm * (v.engagement / 3);
      var total = per * v.posts;
      return [
        'Step 1: Value per post = followers / 1000 x rate x engagement factor = ' + per.toFixed(0) + '.',
        'Step 2: Multiply by the number of deliverables: ' + per.toFixed(0) + ' x ' + v.posts + ' = ' + total.toFixed(0) + '.',
        'Step 3: A multi-post bundle is usually pitched 10 to 20 percent below the straight sum, so a fair bundle is about ' + (total * 0.9).toFixed(0) + '.',
        'Step 4: Price usage rights and exclusivity separately — they are not free.',
        'Step 5: Ask for a deposit and clear deliverables before you commit to a launch date.'
      ];
    }
  },
  {
    id: 'podcast-ad-rate', cat: 'business',
    name: 'Podcast Ad Rate Calculator',
    desc: 'Free podcast advertising rate calculator: estimated ad price per episode from downloads, CPM and number of ad spots.',
    kw: 'podcast ad rate calculator, podcast sponsorship cost, cpm podcast calculator, how much do podcasts charge',
    inputs: [
      { id: 'downloads', label: 'Downloads per episode', type: 'number', def: 5000 },
      { id: 'cpm', label: 'CPM', type: 'number', def: 18 },
      { id: 'spots', label: 'Ad spots per episode', type: 'number', def: 2 }
    ],
    calc: function (v) {
      var perSpot = v.downloads / 1000 * v.cpm;
      var total = perSpot * v.spots;
      return {
        result: 'Ad rate: ' + total.toFixed(0) + ' per episode',
        chart: Charts.donut([total, perSpot], ['Per episode', 'Per spot']),
        extra: perSpot.toFixed(0) + ' per spot x ' + v.spots + ' spots | CPM ' + v.cpm + ' | Host-read ads command a higher CPM than programmatic'
      };
    },
    steps: function (v) {
      var perSpot = v.downloads / 1000 * v.cpm;
      var total = perSpot * v.spots;
      return [
        'Step 1: Rate per spot = downloads / 1000 x CPM = ' + v.downloads + ' / 1000 x ' + v.cpm + ' = ' + perSpot.toFixed(0) + '.',
        'Step 2: Podcast CPMs commonly run from about 15 for programmatic to 30 or more for a host-read endorsement.',
        'Step 3: Multiply by the number of spots: ' + perSpot.toFixed(0) + ' x ' + v.spots + ' = ' + total.toFixed(0) + ' per episode.',
        'Step 4: For a multi-episode campaign, price a package rather than a single episode and offer a mid-roll premium.',
        'Step 5: Downloads for older episodes keep earning, so a back-catalogue bundle can be the most valuable thing you sell.'
      ];
    }
  },
  {
    id: 'newsletter-sponsorship-rate', cat: 'business',
    name: 'Newsletter Sponsorship Rate Calculator',
    desc: 'Free newsletter sponsorship rate calculator: suggested per-issue price from subscriber count, open rate and newsletter CPM.',
    kw: 'newsletter sponsorship rate, newsletter ad pricing, cpm newsletter calculator, how much to charge newsletter ad',
    inputs: [
      { id: 'subs', label: 'Subscribers', type: 'number', def: 10000 },
      { id: 'openRate', label: 'Open rate (percent)', type: 'number', def: 35 },
      { id: 'cpm', label: 'CPM (per 1000 opens)', type: 'number', def: 30 }
    ],
    calc: function (v) {
      var opens = v.subs * v.openRate / 100;
      var rate = opens / 1000 * v.cpm;
      return {
        result: 'Suggested rate: ' + rate.toFixed(0) + ' per issue',
        chart: Charts.donut([rate, opens], ['Rate', 'Opens']),
        extra: 'Estimated opens ' + opens.toFixed(0) + ' x ' + (v.cpm / 1000).toFixed(3) + ' per open = ' + rate.toFixed(0) + ' | Priced like a primary placement; a classified slot can go for a third of that'
      };
    },
    steps: function (v) {
      var opens = v.subs * v.openRate / 100;
      var rate = opens / 1000 * v.cpm;
      return [
        'Step 1: Estimate real opens = subscribers x open rate = ' + v.subs + ' x ' + v.openRate + ' percent = ' + opens.toFixed(0) + '.',
        'Step 2: Newsletter CPMs are quoted per 1000 opens and typically run from 20 to 50 or more for a niche audience.',
        'Step 3: Suggested rate = ' + opens.toFixed(0) + ' / 1000 x ' + v.cpm + ' = ' + rate.toFixed(0) + ' per issue.',
        'Step 4: A primary placement earns the full rate; a classified or secondary slot is usually a third to a half.',
        'Step 5: Sell a four-issue run for a discount rather than one-offs, and always disclose sponsored content clearly.'
      ];
    }
  }
];

function q(s) { return Q39 + s + Q39; }
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
    if (inp.type === 'number') s += ', def: ' + inp.def + ' }';
    else s += ', options: [' + inp.options.map(q).join(', ') + "], def: '" + inp.def + "' }";
    return s;
  }).join(',\r\n      '));
  L.push('    ],');
  L.push('    calc: ' + t.calc.toString() + ',');
  L.push('    steps: ' + t.steps.toString());
  L.push('  }');
  return L.join('\r\n');
}

let inserted = 0;
for (const catKey of Object.keys(CATS)) {
  const cfg = CATS[catKey];
  const tools = TOOLS.filter(t => t.cat === catKey);
  const file = path.join(ROOT, 'js', 'data', cfg.file);
  let src = fs.readFileSync(file, 'utf8');
  const missing = tools.filter(t => !src.includes("'" + t.id + "'"));
  if (missing.length) {
    const block = ',\r\n' + missing.map(toolSource).join(',\r\n') + '\n';
    const cut = src.lastIndexOf('];');
    src = src.slice(0, cut) + block + src.slice(cut);
    fs.writeFileSync(file, src);
    inserted += missing.length;
  }
}
console.log('tool blocks inserted:', inserted, 'of', TOOLS.length);

const ALL = [];
for (const catKey of Object.keys(CATS)) {
  const sb = { window: {}, Charts: { donut: function () { return {}; }, bar: function () { return {}; }, gauge: function () { return {}; } }, console: { log: function () {}, warn: function () {}, error: function () {} } };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'data', CATS[catKey].file), 'utf8'), sb);
  (sb.window[CATS[catKey].constName] || []).forEach(function (t) { ALL.push(t); });
}
const EXPECTED = [
  ['pet-insurance-cost', {}, 'Estimated premium: 48.00 per month'],
  ['pet-medication-dose', {}, 'Dose: 100.0 mg (2.00 mL)'],
  ['pet-boarding-cost', {}, 'Boarding cost: 200'],
  ['hajj-cost', {}, 'Total Hajj cost: 8500'],
  ['sponsorship-rate', {}, 'Estimated rate per post: 1250'],
  ['brand-deal-value', {}, 'Estimated deal value: 3750'],
  ['podcast-ad-rate', {}, 'Ad rate: 180 per episode'],
  ['newsletter-sponsorship-rate', {}, 'Suggested rate: 105 per issue']
];
const bad = [];
for (const [id, values, expect] of EXPECTED) {
  const t = ALL.find(function (x) { return x.id === id; });
  if (!t) { bad.push('missing tool ' + id); continue; }
  const v = {};
  t.inputs.forEach(function (inp) { v[inp.id] = values[inp.id] !== undefined ? values[inp.id] : inp.def; });
  const out = t.calc(v);
  if (out.result !== expect) bad.push(id + ' result ' + out.result + ' expected ' + expect);
  if ((out.result + ' ' + out.extra).includes('NaN')) bad.push(id + ' NaN');
  if (t.steps(v).join(' ').includes('NaN')) bad.push(id + ' steps NaN');
  if (!out.chart) bad.push(id + ' no chart');
}
if (bad.length) { console.error('tool self-check FAILED:\n  ' + bad.join('\n  ')); process.exit(1); }
console.log('tool self-check: PASS (8 tools, exact expected values)');

const GUIDES = '<h2>From Our Guides Library</h2><ul>' +
  '<li><a href="/guides/percentage/">percentage math made easy</a></li>' +
  '<li><a href="/guides/how-to-use-calculators/">how to use our calculators</a></li>' +
  '<li><a href="/guides/budgeting/">budgeting basics</a></li>' +
  '</ul>';

const ENTRIES = [
  {
    id: 'pet-insurance-cost', cat: 'lifestyle',
    title: 'Pet Insurance Cost Calculator',
    metaDesc: 'Estimate your pet insurance premium from species, age, size and cover level, with the monthly and annual cost and the factors that move the price.',
    lsi: ['pet insurance cost calculator', 'dog insurance estimate', 'cat insurance calculator', 'pet premium estimate'],
    aeoH2: '<h2>What does the Pet Insurance Cost Calculator do?</h2><p>It estimates a monthly and annual pet insurance premium from the pet species, its age, its size and whether you want accident-only or comprehensive cover, using the standard price factors insurers apply.</p><ul><li><strong>Inputs:</strong> species, age, size, coverage level.</li><li><strong>Output:</strong> monthly and annual premium estimate.</li><li><strong>Method:</strong> a base premium per species and cover, adjusted for age and size.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>A three-year-old medium dog on comprehensive cover comes out near <strong>48 a month, about 576 a year</strong>. Accident-only cover costs roughly half, and premiums rise sharply once a pet passes seven years old.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>Pet insurance premiums are quoted by insurers using a handful of factors that any estimate can mirror: which animal it is, how old it is, how big it is, and how much cover you buy. Dogs cost more than cats because they are bigger and prone to more conditions. Older pets cost more because the odds of a claim rise every year. Large breeds cost more than small ones for the same reason. And comprehensive cover, which pays for illness as well as accidents, costs roughly double accident-only cover. This calculator applies those factors to a base premium so you can budget before you start collecting real quotes.</p><h2>The rules it applies</h2><ul><li><strong>Base premium:</strong> a dog on comprehensive cover about 48 a month, a cat about 32; accident-only roughly halves each figure.</li><li><strong>Age factor:</strong> 0.9 for pets under two, 1.0 from two to seven, and 1.4 above seven.</li><li><strong>Size factor:</strong> 0.9 for small, 1.0 for medium, 1.25 for large.</li><li><strong>Not modelled:</strong> breed-specific risks, your region, the excess, pre-existing conditions and the annual claim limit, all of which real quotes price in.</li></ul><h2>Worked example with real numbers</h2><p>A three-year-old medium dog on comprehensive cover. The base premium is 48, the age factor is 1.0 because the dog is between two and seven, and the size factor is 1.0, so the estimate is 48 a month. Over a year that is 576. Switching to accident-only cover would drop the base to 22 and the monthly estimate to about 22, roughly 264 a year.</p><h2>Reading the result</h2><p>Treat the number as a budget anchor, not a quote. Real premiums swing widely with breed, region and the excess you accept. A higher excess lowers the monthly premium but leaves you paying more of each bill, so compare the total annual cost across a range of excesses rather than chasing the lowest month. Accident-only cover is a reasonable compromise for a young, healthy pet if a full illness policy stretches the budget, but it will not help with the conditions that most commonly cost owners money, such as allergies, infections and tumours.</p>' + GUIDES,
    faqs: [
      ['How is the pet insurance cost estimated?', 'A base premium for the species and cover level is multiplied by an age factor and a size factor. The steps panel shows the base, both factors and the resulting monthly and annual figures.'],
      ['What do I need to use the Pet Insurance Cost Calculator?', 'The species, the age in years, the size band and the cover level. All the pricing factors are built in.'],
      ['What does the result from the Pet Insurance Cost Calculator show?', 'An estimated monthly and annual premium, split so you can see how the base, age and size each contribute to the total.'],
      ['Why does pet insurance cost more for older pets?', 'Because the chance of a claim rises every year, insurers apply a steeper factor above about seven years old. This calculator uses a factor of 1.4 for pets over seven.'],
      ['Is the Pet Insurance Cost Calculator really free?', 'Yes — 100 percent free, no sign-up, and everything runs in your browser.']
    ]
  },
  {
    id: 'pet-medication-dose', cat: 'health',
    title: 'Pet Medication Dosage Calculator',
    metaDesc: 'Convert a weight-based pet medicine dose into milligrams and millilitres for common vet-prescribed drugs. A reference aid only, not a prescription.',
    lsi: ['pet medication dosage calculator', 'dog dose calculator mg kg', 'cat medicine dose', 'pet medicine ml calculator'],
    aeoH2: '<h2>What does the Pet Medication Dosage Calculator do?</h2><p>It turns a standard weight-based dose in milligrams per kilogram into the milligrams, and then the millilitres to draw, for a few medicines veterinarians commonly prescribe.</p><ul><li><strong>Inputs:</strong> pet weight in kilograms and the medication.</li><li><strong>Output:</strong> dose in milligrams and the volume in millilitres.</li><li><strong>Method:</strong> weight times the standard mg per kg rate, divided by the liquid concentration.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>A 10 kg pet on metronidazole at 10 mg per kg needs <strong>100 mg, which is 2 mL</strong> of the 50 mg per mL liquid. This is a reference figure only: your veterinarian sets the real dose, frequency and any adjustment.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>Veterinary doses are almost always written as milligrams of drug per kilogram of body weight. Liquid medicines, however, are measured in millilitres on the syringe. Converting between the two is where pet owners most often make an error, because the concentration of the liquid matters as much as the dose. This calculator does the two-step conversion: first multiply the weight by the mg per kg rate to get the dose in milligrams, then divide by the concentration in mg per mL to get the volume to draw. It covers a few common medications so the arithmetic is transparent.</p><h2>The rules it applies</h2><ul><li><strong>Dose in mg:</strong> body weight in kg multiplied by the standard mg per kg rate for that drug.</li><li><strong>Volume in mL:</strong> the dose in milligrams divided by the concentration in mg per mL.</li><li><strong>Included drugs:</strong> meloxicam, metronidazole, amoxicillin and gabapentin, at typical liquid concentrations.</li><li><strong>Not modelled:</strong> frequency, duration, loading doses, and any reduction for kidney or liver disease, all of which a vet decides per animal.</li></ul><h2>Worked example with real numbers</h2><p>A 10 kg pet prescribed metronidazole at 10 mg per kg. The dose is 10 x 10 = 100 mg. The liquid is 50 mg per mL, so the volume is 100 / 50 = 2 mL. Change the pet to 25 kg and the same drug needs 250 mg, which is 5 mL. Change to meloxicam at only 0.1 mg per kg and the same 10 kg pet needs just 1 mg, a tiny fraction of a millilitre if the liquid is 1.5 mg per mL.</p><h2>Reading the result</h2><p>This is a reference aid, never a prescription. Several human medicines are highly toxic to pets — paracetamol and ibuprofen among them — and even a correct drug can be wrong at the wrong dose. Always confirm the drug, the dose, the frequency and the duration with your veterinarian, and use the measuring syringe that came with the medicine rather than a kitchen spoon. If your pet is vomiting, drowsy or unwell after a dose you believe was correct, contact your vet or an emergency animal hospital immediately.</p>' + GUIDES,
    faqs: [
      ['How is the pet medication dose calculated?', 'Body weight in kilograms multiplied by the drug standard mg per kg rate gives the dose in milligrams, which is divided by the liquid concentration in mg per mL to give the millilitres to draw. The steps panel shows each figure.'],
      ['What do I need to use the Pet Medication Dosage Calculator?', 'Your pet weight in kilograms and the medication name. The standard mg per kg rates and liquid concentrations are built in.'],
      ['What does the result from the Pet Medication Dosage Calculator show?', 'The dose in milligrams and the equivalent volume in millilitres, so you can measure the syringe correctly.'],
      ['Is this pet dosage calculator safe to use instead of a vet?', 'No. It is a reference aid only. Your veterinarian sets the real dose, frequency and duration, and several human medicines are toxic to pets. Never give medicine to a pet without veterinary instruction.'],
      ['Is the Pet Medication Dosage Calculator really free?', 'Yes — 100 percent free, no sign-up, and everything runs in your browser.']
    ]
  },
  {
    id: 'pet-boarding-cost', cat: 'lifestyle',
    title: 'Pet Boarding Cost Calculator',
    metaDesc: 'Work out the total cost of pet boarding or a pet sitter from the nightly rate, number of pets, length of stay and any extras such as grooming.',
    lsi: ['pet boarding cost calculator', 'kennel cost calculator', 'cat boarding price', 'dog sitting cost'],
    aeoH2: '<h2>What does the Pet Boarding Cost Calculator do?</h2><p>It adds up the cost of boarding your pets for a given number of nights, at a nightly rate per pet, plus any extras, so you know the total before you book.</p><ul><li><strong>Inputs:</strong> nights, nightly rate per pet, number of pets, extras.</li><li><strong>Output:</strong> total boarding cost and the boarding-versus-extras split.</li><li><strong>Method:</strong> nights times rate times pets, plus extras.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>Five nights for one pet at 35 a night with 25 of extras comes to <strong>200</strong>. Boarding alone is 175 and the extras add 25. Many kennels give a discount on a second pet.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>Boarding costs are simple to estimate once you separate the recurring part from the one-off part. The recurring part is the nightly rate multiplied by the number of nights and the number of pets. The one-off part is anything else: a grooming session before pickup, medication administration, a longer walk, or a peak-season surcharge. Adding the two gives the total you will actually pay. Doing this before you call around makes it easy to compare kennels that quote differently, one charging per pet and another per run.</p><h2>The rules it applies</h2><ul><li><strong>Boarding:</strong> nights multiplied by the nightly rate multiplied by the number of pets.</li><li><strong>Extras:</strong> a single figure for grooming, medication, extra walks or a surcharge.</li><li><strong>Multi-pet discounts:</strong> the maths does not apply them, but many kennels cut the second pet by 20 to 50 percent, so ask.</li><li><strong>Not modelled:</strong> vaccination requirements, holiday surcharges, and the cost of a pre-boarding vet check.</li></ul><h2>Worked example with real numbers</h2><p>Five nights for one dog at 35 a night: 5 x 35 = 175. Add 25 for a grooming session and the total is 200. If you boarded two dogs at the same rate with no discount, the boarding would be 5 x 35 x 2 = 350, so a 50 percent second-pet discount would save 87.50. Over a fortnight the discount matters even more.</p><h2>Reading the result</h2><p>Use the figure as a comparison baseline, not a final quote. The cheapest nightly rate is not always the cheapest stay once extras and requirements are added, and a kennel that insists on a vaccination check is protecting your pet, not nickel-and-diming you. Book early for school holidays, when good kennels fill up and rates climb, and confirm whether the quoted price includes food, walks and medication before you compare two options side by side.</p>' + GUIDES,
    faqs: [
      ['How is the pet boarding cost calculated?', 'Nights multiplied by the nightly rate multiplied by the number of pets, plus any extras such as grooming or medication. The steps panel shows each part.'],
      ['What do I need to use the Pet Boarding Cost Calculator?', 'The number of nights, the nightly rate per pet, how many pets and any extras. Nothing else is required.'],
      ['What does the result from the Pet Boarding Cost Calculator show?', 'The total cost, split between boarding and extras, so you can see where the money goes and compare kennels fairly.'],
      ['Do kennels offer multi-pet discounts?', 'Often yes, commonly 20 to 50 percent off the second pet. This calculator does not apply a discount automatically, so subtract the saving you are offered from the total.'],
      ['Is the Pet Boarding Cost Calculator really free?', 'Yes — 100 percent free, no sign-up, and everything runs in your browser.']
    ]
  },
  {
    id: 'hajj-cost', cat: 'finance',
    title: 'Hajj Cost Calculator: Pilgrimage Budget',
    metaDesc: 'Estimate the total cost of Hajj or Umrah from the package price, number of travellers and travel extras, so you can plan the pilgrimage budget.',
    lsi: ['hajj cost calculator', 'hajj budget estimator', 'umrah package cost', 'pilgrimage cost calculator'],
    aeoH2: '<h2>What does the Hajj Cost Calculator do?</h2><p>It gives a starting budget for Hajj or Umrah by multiplying the package price by the number of travellers and adding travel extras such as flights, visa and insurance.</p><ul><li><strong>Inputs:</strong> package cost per person, number of travellers, travel extras.</li><li><strong>Output:</strong> total pilgrimage cost and the package-versus-extras split.</li><li><strong>Method:</strong> package times travellers, plus extras.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>One traveller on a 7,000 package with 1,500 of travel extras comes to <strong>8,500</strong>. Budget separately for spending money, Qurbani and gifts, which are not part of the package.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>A Hajj or Umrah budget has two layers. The first is the package: accommodation, transport within the holy cities, and often meals, priced per person. The second is everything that sits outside the package, chiefly international flights, the visa, travel insurance, and spending money for food and gifts on the ground. Multiplying the package by the number of travellers and then adding the travel extras gives a realistic planning total rather than the headline package price alone, which is the number that misleads most first-time pilgrims.</p><h2>The rules it applies</h2><ul><li><strong>Package total:</strong> package price per person multiplied by the number of travellers.</li><li><strong>Travel extras:</strong> flights, visa, insurance and airport transfers, entered as one figure.</li><li><strong>Separately budgeted:</strong> spending money, Qurbani, gifts, medical costs and any agent commission.</li><li><strong>Not modelled:</strong> price changes by season, distance from the Haram, and the different packages offered by each country scheme.</li></ul><h2>Worked example with real numbers</h2><p>One traveller on a package of 7,000 has a package total of 7,000. Adding 1,500 of flights and visa brings the total to 8,500. For a family of three on the same package the package total becomes 21,000 and, with the same extras, 22,500. Children on some schemes share a room and cost less, so check the package rules before multiplying everyone by the full price.</p><h2>Reading the result</h2><p>Use the number as a savings target, not a quote. Package prices swing widely by country, by how close the hotel is to the Haram, and by season, and the travel extras vary even more. Set the budget now, save toward it monthly, and confirm the final price with a licensed operator before you commit. Keep a separate personal allowance for gifts and food, because those costs are easy to underestimate and are almost never included in the headline package.</p>' + GUIDES,
    faqs: [
      ['How is the Hajj cost calculated?', 'The package price per person is multiplied by the number of travellers, then travel extras such as flights and visa are added. The steps panel shows each part.'],
      ['What do I need to use the Hajj Cost Calculator?', 'The package cost per person, the number of travellers and the total travel extras. Nothing else is required.'],
      ['What does the result from the Hajj Cost Calculator show?', 'The total pilgrimage cost, split between the package and the travel extras, so you can see and plan the full budget.'],
      ['What costs are not included in a Hajj package?', 'Spending money, Qurbani, gifts, medical costs and any agent commission are usually outside the package, so budget for them separately on top of the result.'],
      ['Is the Hajj Cost Calculator really free?', 'Yes — 100 percent free, no sign-up, and everything runs in your browser.']
    ]
  },
  {
    id: 'sponsorship-rate', cat: 'business',
    title: 'Influencer Sponsorship Rate Calculator',
    metaDesc: 'Estimate a fair sponsored-post rate from follower count, engagement rate and a rate per thousand followers, with a low-to-high quote range.',
    lsi: ['influencer rate calculator', 'sponsorship rate calculator', 'how much to charge sponsored post', 'creator pricing calculator'],
    aeoH2: '<h2>What does the Influencer Sponsorship Rate Calculator do?</h2><p>It estimates a fair price for a single sponsored post from the follower count, the engagement rate and a rate per thousand followers, and returns a low-to-high range to quote from.</p><ul><li><strong>Inputs:</strong> followers, engagement rate, platform, rate per thousand followers.</li><li><strong>Output:</strong> an estimated rate and a negotiation range.</li><li><strong>Method:</strong> followers per thousand times the rate, adjusted by the engagement rate.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>50,000 followers at a 3 percent engagement rate and a rate of 25 per thousand comes to <strong>1,250 per post</strong>, with a sensible quote range of about 875 to 1,875. Higher engagement and a tighter niche justify the top of that range.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>Brands pay for attention, so a sponsorship rate should reflect both how many people follow you and how many of them actually act. The starting point is the follower count, valued per thousand, which produces a base figure. Engagement then adjusts it: a 3 percent engagement rate is treated as the baseline, so a higher rate multiplies the base up and a lower rate brings it down. The result is a fair midpoint, and discounting and marking it up by 30 and 50 percent gives you the range that every negotiation should start from.</p><h2>The rules it applies</h2><ul><li><strong>Base value:</strong> followers divided by 1,000, multiplied by the rate per thousand.</li><li><strong>Engagement adjustment:</strong> the engagement rate divided by 3, so 3 percent is neutral.</li><li><strong>Range:</strong> 70 percent of the estimate as the floor and 150 percent as the ceiling.</li><li><strong>Not modelled:</strong> niche premium, exclusivity, usage rights, whitelisting and multi-post packages, all of which raise the price.</li></ul><h2>Worked example with real numbers</h2><p>50,000 followers at 25 per thousand gives a base of 1,250. At a 3 percent engagement rate the adjustment is 1.0, so the estimate is 1,250 per post. The same account with a 6 percent engagement rate doubles the adjustment to 2.0, pushing the estimate to 2,500. When you quote, present the range of 875 to 1,875 rather than a single number, and add a premium for anything that takes the brand beyond a single organic post.</p><h2>Reading the result</h2><p>Rates are a negotiation, and this figure is your justification, not your ceiling. Niches matter: finance, health and business audiences command far higher rates than general lifestyle at the same follower count, because the audience is harder to reach and more valuable to advertisers. Always charge extra for exclusivity, for the brand reusing your content as an ad, and for whitelisting, because those rights cost you future income. Publish a rate card and hold to it rather than accepting whatever the first offer happens to be.</p>' + GUIDES,
    faqs: [
      ['How is the sponsorship rate calculated?', 'The follower count is divided by 1,000 and multiplied by the rate per thousand, then multiplied by the engagement rate divided by 3. The steps panel shows each figure and the resulting range.'],
      ['What do I need to use the Influencer Sponsorship Rate Calculator?', 'Your follower count, your engagement rate, the platform and the rate per thousand followers you want to apply. Everything else is built in.'],
      ['What does the result from the Influencer Sponsorship Rate Calculator show?', 'An estimated rate per post and a low-to-high negotiation range, plus the base value and engagement adjustment behind them.'],
      ['What engagement rate is considered good?', 'About 3 percent is treated as the baseline here. Rates well above that justify charging more, since the audience is more genuinely engaged with your content.'],
      ['Is the Influencer Sponsorship Rate Calculator really free?', 'Yes — 100 percent free, no sign-up, and everything runs in your browser.']
    ]
  },
  {
    id: 'brand-deal-value', cat: 'business',
    title: 'Brand Deal Value Calculator',
    metaDesc: 'Estimate the value of a multi-post brand deal from followers, engagement and the number of deliverables, with a fair bundle price built in.',
    lsi: ['brand deal calculator', 'sponsored package price', 'influencer campaign cost', 'creator deal calculator'],
    aeoH2: '<h2>What does the Brand Deal Value Calculator do?</h2><p>It prices a whole brand campaign rather than a single post, multiplying a per-post value by the number of deliverables and suggesting a fair bundle discount.</p><ul><li><strong>Inputs:</strong> followers, engagement rate, number of deliverables, rate per thousand followers.</li><li><strong>Output:</strong> per-post value, total deal value and a bundle price.</li><li><strong>Method:</strong> per-post value times deliverables, with a suggested 10 percent bundle discount.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>50,000 followers at 3 percent engagement, three deliverables at 25 per thousand, values the deal at <strong>3,750</strong>, with a bundle price near 3,375. Charge usage rights and exclusivity on top.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>Brands rarely buy a single post; they buy a small campaign of two or three deliverables, sometimes with options to reuse the content as an advertisement. Pricing that package starts from the per-post value and multiplies by the number of deliverables, then applies a modest bundle discount, usually 10 to 20 percent, because the brand is committing to more work up front. The calculator keeps the per-post, total and bundle figures side by side so you can see exactly what the discount is costing you and decide whether it is worth the guaranteed volume.</p><h2>The rules it applies</h2><ul><li><strong>Per-post value:</strong> followers per thousand times the rate, adjusted by engagement over 3 percent.</li><li><strong>Total:</strong> per-post value multiplied by the number of deliverables.</li><li><strong>Bundle:</strong> 10 percent below the straight total, a typical multi-post discount.</li><li><strong>Not modelled:</strong> exclusivity windows, whitelisting, usage rights and rush fees, which should be added as separate line items.</li></ul><h2>Worked example with real numbers</h2><p>50,000 followers, 3 percent engagement, a rate of 25 per thousand and three deliverables. The per-post value is 1,250, so the total is 3,750. Applying a 10 percent bundle discount gives 3,375, which is what you would present as the package price. If the brand also wants to reuse the content as a paid advertisement, quote that as an additional fee rather than folding it into the bundle.</p><h2>Reading the result</h2><p>A brand deal is not just a bigger sponsored post, so price the extras explicitly. Exclusivity, meaning you cannot work with competitors for a period, has a real cost and should carry a premium. Usage rights, where the brand runs your content as its own advertising, are often worth more than the original post. And a long approval loop or a demanding brief justifies a higher fee, because it consumes time you could spend on your own content. Present the bundle as the headline and the extras as add-ons, and you will rarely have to justify the total.</p>' + GUIDES,
    faqs: [
      ['How is the brand deal value calculated?', 'A per-post value is found from followers, the rate per thousand and engagement, then multiplied by the number of deliverables, with a suggested bundle discount applied to the total. The steps panel shows each figure.'],
      ['What do I need to use the Brand Deal Value Calculator?', 'Your follower count, engagement rate, the number of deliverables and the rate per thousand followers. Everything else is built in.'],
      ['What does the result from the Brand Deal Value Calculator show?', 'The per-post value, the total deal value across all deliverables, and a fair bundle price at a 10 percent discount.'],
      ['Should I discount a multi-post brand deal?', 'A modest 10 to 20 percent bundle discount is normal and helps win the campaign, but never bundle usage rights or exclusivity for free — price those as separate add-ons.'],
      ['Is the Brand Deal Value Calculator really free?', 'Yes — 100 percent free, no sign-up, and everything runs in your browser.']
    ]
  },
  {
    id: 'podcast-ad-rate', cat: 'business',
    title: 'Podcast Ad Rate Calculator: CPM Pricing',
    metaDesc: 'Estimate what a podcast episode can charge for advertising from downloads, CPM and the number of ad spots, with host-read guidance built in.',
    lsi: ['podcast ad rate calculator', 'podcast sponsorship cost', 'cpm podcast calculator', 'how much do podcasts charge for ads'],
    aeoH2: '<h2>What does the Podcast Ad Rate Calculator do?</h2><p>It estimates the advertising value of a podcast episode from the average downloads, a CPM and the number of ad spots, so you can price a single episode or a campaign.</p><ul><li><strong>Inputs:</strong> downloads per episode, CPM, ad spots per episode.</li><li><strong>Output:</strong> rate per spot and total per episode.</li><li><strong>Method:</strong> downloads per thousand times the CPM, multiplied by the number of spots.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>5,000 downloads an episode at a CPM of 18 gives <strong>90 per spot</strong>, or 180 for a two-spot episode. A host-read endorsement can command a CPM of 30 or more, well above programmatic rates.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>Podcast advertising is priced on reach, measured as downloads or listens, at a cost per thousand, or CPM. Multiply the downloads by the CPM, scaled per thousand, and you have the value of a single spot. A typical episode carries two or three spots, so the total is that figure times the number of spots. The one nuance the calculator highlights is that not all spots are equal: a host-read endorsement, where the presenter talks about the product naturally, sells for a materially higher CPM than an automatically inserted programmatic ad, because audiences trust the host.</p><h2>The rules it applies</h2><ul><li><strong>Rate per spot:</strong> downloads divided by 1,000, multiplied by the CPM.</li><li><strong>Per episode:</strong> rate per spot multiplied by the number of spots.</li><li><strong>Benchmarks:</strong> programmatic CPMs from about 15, host-read from about 30 upward.</li><li><strong>Not modelled:</strong> listener demographics, the age of the episode, and the premium for a mid-roll over a pre-roll.</li></ul><h2>Worked example with real numbers</h2><p>5,000 downloads an episode at an 18 CPM: 5,000 divided by 1,000 is 5, and 5 times 18 is 90 per spot. With two spots the episode earns 180, and a 20-episode series priced at the same rate is 3,600. If the host reads the ad instead of a programmatic insert, a 30 CPM would lift each spot to 150 and the episode to 300.</p><h2>Reading the result</h2><p>The formula is a fair starting point, but podcast pricing rewards two things above all: a specific, valuable audience and a host the listeners trust. A niche show with 3,000 committed listeners in a high-value field can charge more than a general show with ten times the downloads, because advertisers pay for the right ears, not the most ears. Sell multi-episode campaigns rather than single insertion orders, and remember that your back catalogue keeps earning, so a package of catalogue spots is often the most valuable inventory you own. Track which episodes convert for sponsors; proven performance is what justifies a rate above the CPM benchmark.</p>' + GUIDES,
    faqs: [
      ['How is the podcast ad rate calculated?', 'Downloads per episode are divided by 1,000 and multiplied by the CPM to get the rate per spot, then multiplied by the number of spots for the per-episode total. The steps panel shows each figure.'],
      ['What do I need to use the Podcast Ad Rate Calculator?', 'The average downloads per episode, the CPM you want to apply and the number of ad spots. Everything else is built in.'],
      ['What does the result from the Podcast Ad Rate Calculator show?', 'The rate per spot and the total per episode, so you can price a campaign across several episodes.'],
      ['What CPM should a podcast charge?', 'Programmatic ads commonly run from about 15 per thousand downloads, while host-read endorsements command 30 or more because audiences trust the host.'],
      ['Is the Podcast Ad Rate Calculator really free?', 'Yes — 100 percent free, no sign-up, and everything runs in your browser.']
    ]
  },
  {
    id: 'newsletter-sponsorship-rate', cat: 'business',
    title: 'Newsletter Sponsorship Rate Calculator',
    metaDesc: 'Estimate a fair newsletter sponsorship price per issue from subscriber count, open rate and CPM, with the number of real opens worked out.',
    lsi: ['newsletter sponsorship rate', 'newsletter ad pricing', 'cpm newsletter calculator', 'how much to charge newsletter ad'],
    aeoH2: '<h2>What does the Newsletter Sponsorship Rate Calculator do?</h2><p>It suggests a per-issue sponsorship price from the subscriber count, the open rate and the newsletter CPM, working from the number of real opens rather than raw subscribers.</p><ul><li><strong>Inputs:</strong> subscribers, open rate, CPM per thousand opens.</li><li><strong>Output:</strong> a suggested rate per issue.</li><li><strong>Method:</strong> subscribers times open rate gives opens, then opens per thousand times the CPM.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>10,000 subscribers at a 35 percent open rate is 3,500 real opens, which at a 30 CPM gives a suggested <strong>105 per issue</strong>. Sell a run of four issues and a classified slot priced at about a third of that.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>Newsletter advertising is priced on attention, not list size. What a sponsor buys is the number of people who actually open and read the email, so the first step is to convert subscribers into opens using the open rate. Only then is the CPM applied, per thousand opens. This is why a newsletter with a smaller but highly engaged list can charge more than a larger, passive one: the engaged list delivers more opens, and opens are what the CPM prices. The calculator makes that chain explicit so you can defend the rate.</p><h2>The rules it applies</h2><ul><li><strong>Real opens:</strong> subscribers multiplied by the open rate.</li><li><strong>Suggested rate:</strong> opens divided by 1,000, multiplied by the CPM.</li><li><strong>Benchmarks:</strong> newsletter CPMs commonly run from 20 to 50, higher for a tight niche.</li><li><strong>Not modelled:</strong> click rate, audience income, and the premium for a primary placement over a classified slot.</li></ul><h2>Worked example with real numbers</h2><p>10,000 subscribers at a 35 percent open rate gives 3,500 opens. At a 30 CPM, the rate is 3,500 divided by 1,000, which is 3.5, times 30, giving 105 per issue. A four-issue run at that rate is 420, and a classified slot priced at a third of the primary rate would be about 35. If the open rate climbs to 50 percent, the same list yields 5,000 opens and a rate of 150.</p><h2>Reading the result</h2><p>Open rates are the lever that moves newsletter pricing, so protect them by keeping the list clean and the content useful. Segmenting the list lets you sell a targeted slot to a sponsor whose offer fits one group, often at a higher effective CPM than a broad placement. Sell multi-issue runs rather than one-offs to build sponsor relationships, and always mark sponsored content clearly so you keep the audience trust that justifies the rate. If a sponsor asks for clicks rather than opens, price that conversion separately, since a high open rate does not guarantee a high click rate.</p>' + GUIDES,
    faqs: [
      ['How is the newsletter sponsorship rate calculated?', 'Subscribers are multiplied by the open rate to get real opens, then opens divided by 1,000 are multiplied by the CPM to give the suggested rate per issue. The steps panel shows each figure.'],
      ['What do I need to use the Newsletter Sponsorship Rate Calculator?', 'Your subscriber count, your open rate and the CPM you want to apply. Everything else is built in.'],
      ['What does the result from the Newsletter Sponsorship Rate Calculator show?', 'A suggested sponsorship rate per issue, based on estimated real opens rather than raw subscribers.'],
      ['Why do open rates matter for newsletter ad pricing?', 'Because sponsors pay for attention, and only the opens represent real readers. A higher open rate raises the number of opens and therefore the fair rate for the same list.'],
      ['Is the Newsletter Sponsorship Rate Calculator really free?', 'Yes — 100 percent free, no sign-up, and everything runs in your browser.']
    ]
  }
];

const SFILE = path.join(ROOT, 'js', 'seo-content.js');
let ssrc = fs.readFileSync(SFILE, 'utf8');
function esc(s) { return s.split('"').join(B + '"'); }
function seoEntry(e) {
  const cfg = CATS[e.cat];
  const faqs = e.faqs.map(function (f) { return '{"q":' + JSON.stringify(f[0]) + ',"a":' + JSON.stringify(f[1]) + '}'; }).join(',');
  return '  ' + Q39 + e.id + Q39 + ': {' +
    '"title":' + JSON.stringify(e.title) +
    ',"metaDesc":' + JSON.stringify(e.metaDesc) +
    ',"canonicalPath":"/' + e.cat + '/' + e.id + '"' +
    ',"cat":"' + e.cat + '","catName":"' + cfg.catName + '"' +
    ',"lsi":' + JSON.stringify(e.lsi) +
    ',"aeo":' + JSON.stringify(e.aeoH2 + e.aeoQuick) +
    ',"desc":"' + esc(e.desc) + '"' +
    ',"faqs":[' + faqs + ']},';
}
let addedSeo = 0;
const missingSeo = ENTRIES.filter(function (e) { return !ssrc.includes(Q39 + e.id + Q39 + ':'); });
if (missingSeo.length) {
  const anchor = '\n  ' + Q39;
  const first = ssrc.indexOf(anchor);
  if (first < 0) { console.error('seo-content.js: anchor not found'); process.exit(1); }
  const block = missingSeo.map(seoEntry).join('\n');
  ssrc = ssrc.slice(0, first + 1) + block + ssrc.slice(first);
  fs.writeFileSync(SFILE, ssrc);
  addedSeo = missingSeo.length;
}
console.log('seo entries inserted:', addedSeo, 'of', ENTRIES.length);

const ssb = { window: {}, console: { log: function () {}, warn: function () {}, error: function () {} } };
vm.createContext(ssb);
vm.runInContext(ssrc, ssb);
const TS = ssb.window.TOOL_SEO;
const badSeo = [];
for (const e of ENTRIES) {
  const m = TS[e.id];
  if (!m) { badSeo.push('missing ' + e.id); continue; }
  if (m.title.length > 60) badSeo.push('title ' + e.id + ' ' + m.title.length);
  if (m.metaDesc.length < 90 || m.metaDesc.length > 160) badSeo.push('meta ' + e.id + ' ' + m.metaDesc.length);
  const qs = m.faqs.map(function (f) { return f.q; });
  if (!qs.some(function (q) { return /^How is the /.test(q); })) badSeo.push('metric ' + e.id);
  if (!qs.some(function (q) { return /^What do I need to use /.test(q); })) badSeo.push('inputs ' + e.id);
  if (!qs.some(function (q) { return /^What does the result from /.test(q); })) badSeo.push('result ' + e.id);
  const words = (m.aeo + ' ' + m.desc + ' ' + m.faqs.map(function (f) { return f.q + ' ' + f.a; }).join(' ')).split(/\s+/).length;
  if (words <= 500) badSeo.push('words ' + e.id + ' ' + words);
}
if (badSeo.length) { console.error('SEO self-check FAILED:\n  ' + badSeo.join('\n  ')); process.exit(1); }
console.log('seo self-check: PASS (titles, metaDesc, FAQ patterns, word counts)');
