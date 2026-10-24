#!/usr/bin/env node
// Market-gap batch 1 — Trade Professional tools (Part 1, item 1 of the backlog).
// The single highest-evidence gap: a paid iPad app (Pipe Calc Elite, $19.99)
// exists purely because no good free web equivalent does. Five deterministic
// trade calculators, each with a documented formula, verified worked example,
// FAQ and related links. Runs BOTH parts, idempotent:
//   1. tool blocks  -> js/data/construction.js / engineering.js (before last "];")
//   2. SEO entries  -> js/seo-content.js (before the first existing entry)
// ESCAPING SAFETY: NO literal "$" followed by a digit, NO literal backslash and
// NO apostrophes in the content strings.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const B = String.fromCharCode(92);
const Q39 = String.fromCharCode(39);

// ============================ 1. TOOLS ============================
// cat: construction | engineering
const TOOLS = [
  {
    id: 'conduit-fill',
    cat: 'construction',
    name: 'Conduit Fill Calculator',
    desc: 'Free conduit fill calculator: NEC Chapter 9 fill percentage for THHN conductors in EMT, with the 40 percent limit checked.',
    kw: 'conduit fill calculator, nec conduit fill percentage, conduit fill chart emt, how many wires in conduit',
    inputs: [
      { id: 'conduit', label: 'Conduit size (EMT)', type: 'select', options: ['1/2 in', '3/4 in', '1 in', '1-1/4 in', '1-1/2 in', '2 in'], def: '1/2 in' },
      { id: 'conductor', label: 'THHN conductor size', type: 'select', options: ['14 AWG', '12 AWG', '10 AWG', '8 AWG', '6 AWG', '4 AWG', '2 AWG'], def: '12 AWG' },
      { id: 'count', label: 'Number of conductors', type: 'number', def: 3 }
    ],
    calc: function (v) {
      var area = { '1/2 in': 0.304, '3/4 in': 0.533, '1 in': 0.864, '1-1/4 in': 1.496, '1-1/2 in': 2.036, '2 in': 3.356 };
      var ca = { '14 AWG': 0.0097, '12 AWG': 0.0133, '10 AWG': 0.0211, '8 AWG': 0.0366, '6 AWG': 0.0507, '4 AWG': 0.0824, '2 AWG': 0.1158 };
      var A = area[v.conduit];
      var a = ca[v.conductor];
      var total = v.count * a;
      var pct = total / A * 100;
      var maxN = Math.floor(0.40 * A / a);
      var pass = pct <= 40;
      return {
        result: 'Conduit fill: ' + pct.toFixed(1) + ' percent of ' + A.toFixed(3) + ' sq in',
        chart: Charts.gauge(pct, 100),
        extra: v.count + ' x ' + v.conductor + ' THHN = ' + total.toFixed(4) + ' sq in | ' + v.conduit + ' EMT internal area ' + A.toFixed(3) + ' sq in | NEC limit 40 percent (' + (0.40 * A).toFixed(4) + ' sq in, max ' + maxN + ' conductors) | ' + (pass ? 'PASS' : 'OVER LIMIT')
      };
    },
    steps: function (v) {
      var area = { '1/2 in': 0.304, '3/4 in': 0.533, '1 in': 0.864, '1-1/4 in': 1.496, '1-1/2 in': 2.036, '2 in': 3.356 };
      var ca = { '14 AWG': 0.0097, '12 AWG': 0.0133, '10 AWG': 0.0211, '8 AWG': 0.0366, '6 AWG': 0.0507, '4 AWG': 0.0824, '2 AWG': 0.1158 };
      var A = area[v.conduit];
      var a = ca[v.conductor];
      var total = v.count * a;
      var pct = total / A * 100;
      var maxN = Math.floor(0.40 * A / a);
      return [
        'Step 1: Look up the conductor cross-section. THHN ' + v.conductor + ' = ' + a + ' sq in (NEC Chapter 9, Table 5).',
        'Step 2: Total conductor area = ' + v.count + ' x ' + a + ' = ' + total.toFixed(4) + ' sq in.',
        'Step 3: Look up the conduit internal area. ' + v.conduit + ' EMT = ' + A.toFixed(3) + ' sq in (Chapter 9, Table 4).',
        'Step 4: Fill percentage = ' + total.toFixed(4) + ' / ' + A.toFixed(3) + ' = ' + pct.toFixed(1) + ' percent.',
        'Step 5: The 40 percent limit applies when there are more than two conductors: ' + (pct <= 40 ? 'the run PASSES.' : 'the run is OVER the limit.'),
        'Step 6: The largest count that still fits is ' + maxN + ' conductors of ' + v.conductor + ' in ' + v.conduit + ' EMT.'
      ];
    }
  },
  {
    id: 'rolling-offset',
    cat: 'construction',
    name: 'Rolling Offset Calculator',
    desc: 'Free pipefitter rolling offset calculator: true offset, travel and run for 45, 22.5, 30 and 60 degree fittings, with the multiplier shown.',
    kw: 'rolling offset calculator, pipefitter rolling offset, 45 degree offset travel, pipe offset multiplier',
    inputs: [
      { id: 'offset', label: 'Offset / rise (in)', type: 'number', def: 10 },
      { id: 'roll', label: 'Roll / horizontal (in)', type: 'number', def: 0 },
      { id: 'angle', label: 'Fitting angle (deg)', type: 'select', options: ['45', '22.5', '30', '60'], def: '45' }
    ],
    calc: function (v) {
      var deg = parseFloat(v.angle);
      var rad = deg * Math.PI / 180;
      var trueOffset = Math.sqrt(v.offset * v.offset + v.roll * v.roll);
      var travel = trueOffset / Math.sin(rad);
      var run = trueOffset / Math.tan(rad);
      return {
        result: 'Travel: ' + travel.toFixed(2) + ' in',
        chart: Charts.bar([travel, run, trueOffset], ['Travel', 'Run', 'True offset']),
        extra: 'True offset: ' + trueOffset.toFixed(2) + ' in | Run (advance): ' + run.toFixed(2) + ' in | Multiplier ' + (1 / Math.sin(rad)).toFixed(3) + ' at ' + deg + ' deg'
      };
    },
    steps: function (v) {
      var deg = parseFloat(v.angle);
      var rad = deg * Math.PI / 180;
      var trueOffset = Math.sqrt(v.offset * v.offset + v.roll * v.roll);
      var travel = trueOffset / Math.sin(rad);
      var run = trueOffset / Math.tan(rad);
      return [
        'Step 1: True offset combines both planes = square root of (' + v.offset + ' squared + ' + v.roll + ' squared) = ' + trueOffset.toFixed(2) + ' in.',
        'Step 2: Travel is the centre-to-centre length on the pipe = true offset / sin(' + deg + ' deg).',
        'Step 3: sin(' + deg + ' deg) = ' + Math.sin(rad).toFixed(4) + ', so the multiplier is ' + (1 / Math.sin(rad)).toFixed(3) + '.',
        'Step 4: Travel = ' + trueOffset.toFixed(2) + ' x ' + (1 / Math.sin(rad)).toFixed(3) + ' = ' + travel.toFixed(2) + ' in.',
        'Step 5: Run (the advance along the pipe to the first fitting) = true offset / tan(' + deg + ' deg) = ' + run.toFixed(2) + ' in.'
      ];
    }
  },
  {
    id: 'pipe-cutback',
    cat: 'construction',
    name: 'Pipe Cutback Calculator',
    desc: 'Free pipe cutback and fitting takeout calculator: the length to cut back for 90 and 45 degree long and short radius elbows by NPS.',
    kw: 'pipe cutback calculator, fitting takeout calculator, elbow takeout chart, pipefitter cut length',
    inputs: [
      { id: 'nps', label: 'Nominal pipe size (in)', type: 'number', def: 4 },
      { id: 'elbow', label: 'Elbow type', type: 'select', options: ['90 long radius', '45 long radius', '90 short radius'], def: '90 long radius' },
      { id: 'fittings', label: 'Number of fittings', type: 'number', def: 2 }
    ],
    calc: function (v) {
      var f = v.elbow === '90 long radius' ? 1.5 : v.elbow === '45 long radius' ? 0.625 : 1.0;
      var takeout = f * v.nps;
      var total = takeout * v.fittings;
      return {
        result: 'Cutback per fitting: ' + takeout.toFixed(3) + ' in',
        chart: Charts.bar([takeout, total], ['Per fitting', 'Total']),
        extra: 'Total cutback for ' + v.fittings + ' fittings: ' + total.toFixed(3) + ' in | Factor ' + f + ' x NPS ' + v.nps + ' | Centre-to-centre pipe length = C2C - ' + (2 * takeout).toFixed(3) + ' in per joint'
      };
    },
    steps: function (v) {
      var f = v.elbow === '90 long radius' ? 1.5 : v.elbow === '45 long radius' ? 0.625 : 1.0;
      var takeout = f * v.nps;
      var total = takeout * v.fittings;
      return [
        'Step 1: Standard takeout factors: a 90 degree long radius elbow is 1.5 x NPS, a 45 degree long radius is 0.625 x NPS, and a 90 degree short radius is 1.0 x NPS.',
        'Step 2: For ' + v.nps + ' in NPS and a ' + v.elbow + ' elbow the factor is ' + f + '.',
        'Step 3: Takeout per fitting = ' + f + ' x ' + v.nps + ' = ' + takeout.toFixed(3) + ' in (face to centreline).',
        'Step 4: Cut back ' + takeout.toFixed(3) + ' in from the end of the pipe for each fitting.',
        'Step 5: For ' + v.fittings + ' fittings the total cutback is ' + total.toFixed(3) + ' in.'
      ];
    }
  },
  {
    id: 'pipe-pressure-loss',
    cat: 'engineering',
    name: 'Pipe Pressure Loss Calculator',
    desc: 'Free pipe pressure loss calculator using the Hazen-Williams equation: head loss and PSI drop by pipe material, flow and diameter.',
    kw: 'pipe pressure loss calculator, hazen williams calculator, head loss calculator, friction loss pipe',
    inputs: [
      { id: 'flow', label: 'Flow rate (gpm)', type: 'number', def: 100 },
      { id: 'diameter', label: 'Internal diameter (in)', type: 'number', def: 4 },
      { id: 'material', label: 'Pipe material', type: 'select', options: ['PVC', 'Copper', 'Steel', 'Cast iron'], def: 'PVC' },
      { id: 'length', label: 'Pipe length (ft)', type: 'number', def: 100 }
    ],
    calc: function (v) {
      var C = v.material === 'PVC' ? 150 : v.material === 'Copper' ? 130 : v.material === 'Steel' ? 120 : 100;
      var d = v.diameter / 12;
      var R = d / 4;
      var A = Math.PI * d * d / 4;
      var Q = v.flow / 448.831;
      var V = Q / A;
      var S = Math.pow(V / (1.318 * C * Math.pow(R, 0.63)), 1 / 0.54);
      var hf = S * v.length;
      var psi = hf * 0.433;
      return {
        result: 'Head loss: ' + hf.toFixed(2) + ' ft (' + psi.toFixed(2) + ' psi)',
        chart: Charts.bar([hf, psi], ['Head (ft)', 'PSI']),
        extra: 'Velocity: ' + V.toFixed(2) + ' ft/s | Friction slope ' + (S * 100).toFixed(3) + ' ft per 100 ft | Hazen-Williams C = ' + C + ' (' + v.material + ')'
      };
    },
    steps: function (v) {
      var C = v.material === 'PVC' ? 150 : v.material === 'Copper' ? 130 : v.material === 'Steel' ? 120 : 100;
      var d = v.diameter / 12;
      var R = d / 4;
      var A = Math.PI * d * d / 4;
      var Q = v.flow / 448.831;
      var V = Q / A;
      var S = Math.pow(V / (1.318 * C * Math.pow(R, 0.63)), 1 / 0.54);
      var hf = S * v.length;
      return [
        'Step 1: Convert flow to cubic feet per second: ' + v.flow + ' gpm / 448.831 = ' + Q.toFixed(4) + ' cfs.',
        'Step 2: Internal area = pi x (' + d.toFixed(4) + ' ft) squared / 4 = ' + A.toFixed(4) + ' sq ft.',
        'Step 3: Velocity = ' + Q.toFixed(4) + ' / ' + A.toFixed(4) + ' = ' + V.toFixed(2) + ' ft/s.',
        'Step 4: Hydraulic radius R = diameter / 4 = ' + R.toFixed(4) + ' ft; Hazen-Williams C = ' + C + ' for ' + v.material + '.',
        'Step 5: Friction slope S = (V / (1.318 x C x R^0.63)) ^ (1 / 0.54) = ' + S.toFixed(6) + ' ft per ft.',
        'Step 6: Head loss = S x ' + v.length + ' ft = ' + hf.toFixed(2) + ' ft, which is ' + (hf * 0.433).toFixed(2) + ' psi.'
      ];
    }
  },
  {
    id: 'hvac-load',
    cat: 'engineering',
    name: 'HVAC Load Calculator',
    desc: 'Free simplified HVAC cooling load calculator: BTU per hour and tons of cooling from floor area, climate, insulation and windows.',
    kw: 'hvac load calculator, manual j calculator, cooling load calculator, btu per square foot air conditioner',
    inputs: [
      { id: 'area', label: 'Conditioned floor area (sq ft)', type: 'number', def: 1500 },
      { id: 'climate', label: 'Climate', type: 'select', options: ['Hot', 'Moderate', 'Cold'], def: 'Moderate' },
      { id: 'insulation', label: 'Insulation quality', type: 'select', options: ['Good', 'Average', 'Poor'], def: 'Average' },
      { id: 'windows', label: 'Number of windows', type: 'number', def: 10 }
    ],
    calc: function (v) {
      var base = v.climate === 'Hot' ? 30 : v.climate === 'Cold' ? 20 : 25;
      var fac = v.insulation === 'Good' ? 0.85 : v.insulation === 'Poor' ? 1.2 : 1.0;
      var btu = v.area * base * fac + v.windows * 1000;
      var tons = btu / 12000;
      return {
        result: 'Cooling load: ' + btu.toFixed(0) + ' BTU/h (' + tons.toFixed(1) + ' tons)',
        chart: Charts.donut([v.area * base * fac, v.windows * 1000], ['Area load', 'Window load']),
        extra: 'Equivalent ' + tons.toFixed(1) + ' tons of cooling | Base ' + base + ' BTU/sq ft (' + v.climate + ') x ' + fac + ' insulation factor | Windows add 1,000 BTU/h each | Simplified Manual-J estimate only'
      };
    },
    steps: function (v) {
      var base = v.climate === 'Hot' ? 30 : v.climate === 'Cold' ? 20 : 25;
      var fac = v.insulation === 'Good' ? 0.85 : v.insulation === 'Poor' ? 1.2 : 1.0;
      var btu = v.area * base * fac + v.windows * 1000;
      var tons = btu / 12000;
      return [
        'Step 1: Start from a base load for the climate: ' + v.climate + ' = ' + base + ' BTU per sq ft.',
        'Step 2: Adjust for insulation: ' + v.insulation + ' = factor ' + fac + '.',
        'Step 3: Area load = ' + v.area + ' x ' + base + ' x ' + fac + ' = ' + (v.area * base * fac).toFixed(0) + ' BTU/h.',
        'Step 4: Window load = ' + v.windows + ' x 1,000 = ' + (v.windows * 1000) + ' BTU/h.',
        'Step 5: Total sensible load = ' + btu.toFixed(0) + ' BTU/h.',
        'Step 6: Convert to tons = ' + btu.toFixed(0) + ' / 12,000 = ' + tons.toFixed(1) + ' tons. This is a rule-of-thumb estimate, not a full Manual-J room-by-room calculation.'
      ];
    }
  }
];

const CATS = {
  construction: { file: 'construction.js', constName: 'CONSTRUCTION_TOOLS', catName: 'Construction' },
  engineering: { file: 'engineering.js', constName: 'ENGINEERING_TOOLS', catName: 'Engineering' }
};

function q(s) { return Q39 + s + Q39; }
function toolSource(t) {
  const L = [];
  L.push("  {");
  L.push("    id: '" + t.id + "',");
  L.push("    name: '" + t.name + "',");
  L.push("    desc: '" + t.desc + "',");
  L.push("    kw: '" + t.kw + "',");
  L.push("    inputs: [");
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

// ---- tools self-check (VM, fresh context per file) ----
const ALL = [];
for (const catKey of Object.keys(CATS)) {
  const sb = { window: {}, Charts: { donut: function () { return {}; }, bar: function () { return {}; }, gauge: function () { return {}; } }, console: { log: function () {}, warn: function () {}, error: function () {} } };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'data', CATS[catKey].file), 'utf8'), sb);
  const arr = sb.window[CATS[catKey].constName] || [];
  arr.forEach(function (t) { ALL.push(t); });
}
const EXPECTED = [
  ['conduit-fill', {}, 'Conduit fill: 13.1 percent of 0.304 sq in'],
  ['rolling-offset', {}, 'Travel: 14.14 in'],
  ['pipe-cutback', {}, 'Cutback per fitting: 6.000 in'],
  ['pipe-pressure-loss', {}, 'Head loss: 0.58 ft (0.25 psi)'],
  ['hvac-load', {}, 'Cooling load: 47500 BTU/h (4.0 tons)']
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
console.log('tool self-check: PASS (5 tools, exact expected values)');

// ============================ 2. SEO ENTRIES ============================
const GUIDES = '<h2>From Our Guides Library</h2><ul>' +
  '<li><a href="/guides/percentage/">percentage math made easy</a></li>' +
  '<li><a href="/guides/unit-conversion/">unit conversion, step by step</a></li>' +
  '<li><a href="/guides/how-to-use-calculators/">how to use our calculators</a></li>' +
  '</ul>';

const ENTRIES = [
  {
    id: 'conduit-fill', cat: 'construction',
    title: 'Conduit Fill Calculator: NEC Fill Percent',
    metaDesc: 'Work out conduit fill percentage for THHN wire in EMT using the NEC Chapter 9 areas, and check the 40 percent limit and maximum wire count.',
    lsi: ['conduit fill calculator', 'nec conduit fill percentage', 'how many wires in conduit', 'thhn conduit fill chart'],
    aeoH2: '<h2>What does the Conduit Fill Calculator do?</h2><p>It totals the cross-sectional area of the conductors you plan to pull, divides it by the internal area of the EMT conduit, and returns the fill percentage and whether it passes the National Electrical Code 40 percent limit.</p><ul><li><strong>Inputs:</strong> conduit trade size, THHN conductor size, number of conductors.</li><li><strong>Output:</strong> fill percentage, the pass or fail verdict, and the maximum conductor count.</li><li><strong>Method:</strong> NEC Chapter 9 Table 4 (conduit areas) and Table 5 (conductor areas).</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>Three 12 AWG THHN conductors in 1/2 inch EMT fill about <strong>13.1 percent</strong> of the 0.304 square inch internal area. The 40 percent limit is reached at 9 conductors of 12 AWG in that same conduit, so three is comfortably safe.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>Conduit fill is the proportion of a conduit interior taken up by conductors. The code does not care about how many wires are in a conduit as an abstract number; it cares about the fraction of the internal cross-section they occupy. Why? Heat. Current in a conductor produces heat, and the more of the interior that is filled with current-carrying copper and its insulation, the harder it is for that heat to escape. A conduit that holds too much conductor area overheats, degrades insulation and shortens the life of the wiring. The National Electrical Code therefore caps fill at 53 percent for a single conductor, 31 percent for two, and 40 percent for three or more. This calculator applies the three-or-more rule, which covers almost every real installation.</p><h2>The rules it applies</h2><ul><li><strong>Conductor areas:</strong> the NEC Chapter 9 Table 5 area for THHN copper, sized from 14 AWG through 2 AWG.</li><li><strong>Conduit areas:</strong> the internal area of electrical metallic tubing (EMT) from 1/2 inch to 2 inch, from Table 4.</li><li><strong>Limit:</strong> 40 percent of the conduit internal area for runs with three or more conductors.</li><li><strong>Not modelled:</strong> box fill, conduit bending, ampacity derating for more than three current-carrying conductors, and the use of a bare equipment ground.</li></ul><h2>Worked example with real numbers</h2><p>Three 12 AWG THHN conductors: each has a cross-section of 0.0133 square inches, so the total is 3 x 0.0133 = 0.0399 square inches. A 1/2 inch EMT conduit has an internal area of 0.304 square inches. Fill = 0.0399 / 0.304 = 13.1 percent, well under the 40 percent cap. The same conduit could hold 9 conductors of 12 AWG before touching the limit.</p><h2>Reading the result</h2><p>The gauge shows the filled portion against the free space, but the number that matters is whether it stays under 40 percent. When a run is over the limit, the fix is almost always the next conduit size up rather than thinner wire, because the area of the conduit grows much faster than the area of the conductors. Remember that adding more than three current-carrying conductors also triggers ampacity derating under Table 310.15, so a run that is electrically legal on fill can still need larger wire for heat.</p>' + GUIDES,
    faqs: [
      ['How is the conduit fill percentage calculated?', 'Total conductor area divided by the conduit internal area, expressed as a percentage. The calculator multiplies the THHN conductor area from NEC Chapter 9 Table 5 by the number of conductors, then divides by the EMT internal area from Table 4.'],
      ['What do I need to use the Conduit Fill Calculator?', 'The conduit trade size, the THHN conductor size and the number of conductors you intend to pull. All the NEC area tables are built in.'],
      ['What does the result from the Conduit Fill Calculator show?', 'The fill percentage, whether it passes the 40 percent NEC limit, and the maximum number of conductors of that size that will fit.'],
      ['What is the NEC conduit fill limit?', '40 percent for three or more conductors, 31 percent for two conductors, and 53 percent for a single conductor. This calculator uses the 40 percent rule, which covers most installations.'],
      ['Is the Conduit Fill Calculator really free?', 'Yes — 100 percent free, no sign-up, and everything runs in your browser.']
    ]
  },
  {
    id: 'rolling-offset', cat: 'construction',
    title: 'Rolling Offset Calculator: Travel & Run',
    metaDesc: 'Calculate a pipefitter rolling offset: true offset, travel length and run for 45, 22.5, 30 and 60 degree fittings, with the multiplier shown.',
    lsi: ['rolling offset calculator', 'pipefitter rolling offset', '45 degree offset multiplier', 'pipe travel length calculator'],
    aeoH2: '<h2>What does the Rolling Offset Calculator do?</h2><p>It solves a pipefitter rolling offset: given how far the pipe must rise and how far it must move sideways, it returns the true offset, the travel (the centre-to-centre length of pipe between the two fittings) and the run along each leg.</p><ul><li><strong>Inputs:</strong> offset or rise, roll or horizontal movement, and the fitting angle.</li><li><strong>Output:</strong> travel, run and true offset, with the fitting multiplier.</li><li><strong>Method:</strong> Pythagorean combination of the two planes, then division by the sine and tangent of the fitting angle.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>With a 10 inch offset, no roll and 45 degree fittings, the travel is <strong>14.14 inches</strong> and the run is also about 14.14 inches. The familiar 45 degree multiplier of 1.414 is just 1 divided by the sine of 45 degrees.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>A rolling offset is a bend that moves a pipe in two directions at once: up or down (the offset) and left or right (the roll). Because the two movements happen in different planes, they do not simply add up. Instead you combine them as the two legs of a right triangle to get the true offset, which is the actual straight-line distance the pipe must travel in space. Once you have the true offset, the fittings determine how much pipe length that represents. The angle of the fittings sets a fixed multiplier, and the travel is the true offset multiplied by it. The same geometry gives the run, the distance from the fitting back to where the offset begins.</p><h2>The rules it applies</h2><ul><li><strong>True offset:</strong> the square root of the offset squared plus the roll squared.</li><li><strong>Travel:</strong> true offset divided by the sine of the fitting angle, which equals the true offset times the standard multiplier.</li><li><strong>Run:</strong> true offset divided by the tangent of the fitting angle.</li><li><strong>Multipliers:</strong> 45 degrees gives 1.414, 22.5 gives 2.613, 30 gives 2.000, and 60 gives 1.155.</li><li><strong>Not modelled:</strong> fitting takeout, weld gaps and the wall thickness of the pipe itself.</li></ul><h2>Worked example with real numbers</h2><p>Offset 10 inches, roll 0 inches, 45 degree fittings. True offset = the square root of (100 + 0) = 10 inches. Travel = 10 / sin(45) = 10 x 1.414 = 14.14 inches, and the run is also 14.14 inches because tangent and sine are equal at 45 degrees. If you then rolled the same joint 10 inches sideways, the true offset would become 14.14 and the travel would rise to 20 inches.</p><h2>Reading the result</h2><p>The travel is the length along the sloped section of pipe; the run is how far the bend reaches along each straight leg. On the job you measure centre to centre and then subtract the fitting takeout to find the cut length, so pair this result with the pipe cutback figure for the fittings you are using. Steeper fittings shrink the travel but increase the force the offset puts on the anchors, so 22.5 degree fittings are used when space allows and 60 degree only in tight corners.</p>' + GUIDES,
    faqs: [
      ['How is the travel length in a rolling offset calculated?', 'Combine the offset and the roll as a right triangle to get the true offset, then divide by the sine of the fitting angle to get the travel and by the tangent to get the run. The steps panel shows each figure.'],
      ['What do I need to use the Rolling Offset Calculator?', 'The offset or rise, the roll or horizontal movement, and the fitting angle. The standard 45, 22.5, 30 and 60 degree multipliers are built in.'],
      ['What does the result from the Rolling Offset Calculator show?', 'The travel (centre-to-centre pipe length), the run along each leg, and the true offset that combines both planes.'],
      ['What is the multiplier for a 45 degree offset?', 'About 1.414. It is 1 divided by the sine of 45 degrees, and it converts a true offset into the travel length of the sloped pipe.'],
      ['Is the Rolling Offset Calculator really free?', 'Yes — 100 percent free, no sign-up, and everything runs in your browser.']
    ]
  },
  {
    id: 'pipe-cutback', cat: 'construction',
    title: 'Pipe Cutback Calculator: Fitting Takeout',
    metaDesc: 'Calculate pipe cutback and elbow takeout by nominal pipe size for 90 and 45 degree long and short radius fittings, so your cut length is right.',
    lsi: ['pipe cutback calculator', 'elbow takeout calculator', 'fitting takeout chart', 'pipe cut length calculator'],
    aeoH2: '<h2>What does the Pipe Cutback Calculator do?</h2><p>It returns the takeout, also called cutback, for 90 and 45 degree long radius elbows and 90 degree short radius elbows at any nominal pipe size, and the total cutback when a run has several fittings.</p><ul><li><strong>Inputs:</strong> nominal pipe size, elbow type, number of fittings.</li><li><strong>Output:</strong> takeout per fitting and total cutback.</li><li><strong>Method:</strong> the standard takeout factors of 1.5, 0.625 and 1.0 times NPS.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>A 4 inch 90 degree long radius elbow has a takeout of <strong>6 inches</strong>. For two such fittings the total cutback is 12 inches. The factors are 1.5 x NPS for a 90 long radius elbow, 0.625 x NPS for a 45 long radius, and 1.0 x NPS for a 90 short radius.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>When you measure a pipe run centre to centre, the pipe you actually cut is shorter than that measurement because the fittings themselves consume some length. That consumed length is the takeout, sometimes called the cutback or the fitting allowance. For a standard long radius elbow the takeout is a simple multiple of the nominal pipe size, a rule that holds across the common sizes and saves you looking up a fitting catalogue. Getting the takeout wrong is one of the most common causes of a pipe run that comes up short or fouls an anchor, so it is worth calculating rather than guessing.</p><h2>The rules it applies</h2><ul><li><strong>90 degree long radius:</strong> takeout = 1.5 x nominal pipe size.</li><li><strong>45 degree long radius:</strong> takeout = 0.625 x nominal pipe size.</li><li><strong>90 degree short radius:</strong> takeout = 1.0 x nominal pipe size.</li><li><strong>Cut length:</strong> centre-to-centre distance minus the takeout for each fitting on that spool.</li><li><strong>Not modelled:</strong> weld gaps, the fitting wall thickness and out-of-round pipe.</li></ul><h2>Worked example with real numbers</h2><p>Take 4 inch nominal pipe with 90 degree long radius elbows. The factor is 1.5, so the takeout is 1.5 x 4 = 6 inches per fitting. If a spool has two such elbows between two anchors that are 40 inches centre to centre, you subtract 2 x 6 = 12 inches and cut the pipe to 28 inches. Cut it 12 inches too long and the run will not fit; this is why the takeout is subtracted before the first cut.</p><h2>Reading the result</h2><p>The takeout is measured from the end of the fitting to its centreline, so the centre-to-centre length of a spool is the sum of the pipe cut length and one takeout at each end. Short radius elbows take out less length but turn more sharply, which increases pressure loss, so choose fitting type with the flow in mind as well as the geometry. On large sizes, verify the takeout against the actual fitting manufacturer data sheet before cutting, because the simple NPS factors are accurate for standard ASME B16.9 fittings but can drift on specials.</p>' + GUIDES,
    faqs: [
      ['How is the pipe cutback calculated?', 'Multiply the nominal pipe size by the takeout factor for the fitting: 1.5 for a 90 degree long radius elbow, 0.625 for a 45 degree long radius, and 1.0 for a 90 degree short radius, then subtract that from the centre-to-centre length.'],
      ['What do I need to use the Pipe Cutback Calculator?', 'The nominal pipe size, the elbow type and how many fittings are involved. The standard takeout factors are built in.'],
      ['What does the result from the Pipe Cutback Calculator show?', 'The takeout per fitting and the total cutback for the run, so you know how much shorter than centre-to-centre to cut the pipe.'],
      ['What is the takeout for a 90 degree long radius elbow?', 'One and a half times the nominal pipe size. A 4 inch 90 degree long radius elbow, for example, has a 6 inch takeout.'],
      ['Is the Pipe Cutback Calculator really free?', 'Yes — 100 percent free, no sign-up, and everything runs in your browser.']
    ]
  },
  {
    id: 'pipe-pressure-loss', cat: 'engineering',
    title: 'Pipe Pressure Loss Calculator (Hazen-Williams)',
    metaDesc: 'Calculate head loss and pressure drop in a pipe with the Hazen-Williams equation, by flow, diameter, material and length, in feet and psi.',
    lsi: ['pipe pressure loss calculator', 'hazen williams calculator', 'head loss calculator', 'friction loss pipe'],
    aeoH2: '<h2>What does the Pipe Pressure Loss Calculator do?</h2><p>It computes the friction head loss and pressure drop along a straight pipe using the Hazen-Williams equation, taking the flow rate, internal diameter, pipe material and length, and returning the loss in feet of head and psi.</p><ul><li><strong>Inputs:</strong> flow rate, internal diameter, pipe material, pipe length.</li><li><strong>Output:</strong> head loss in feet and psi, plus velocity and friction slope.</li><li><strong>Method:</strong> the Hazen-Williams empirical equation with standard C factors.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>100 gallons per minute through 100 feet of 4 inch PVC loses about <strong>0.58 feet of head, or 0.25 psi</strong>, at a velocity of 2.55 feet per second. Smoother pipe holds a higher C factor and loses less head; older, rougher pipe loses more.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>Water moving through a pipe rubs against the pipe wall, and that friction converts pressure into heat and turbulence, so the pressure falls from one end of the pipe to the other. The Hazen-Williams equation is the standard empirical way to predict that fall for water at ordinary temperatures. It needs only the flow rate, the internal diameter and a roughness coefficient C that describes how smooth the pipe is. The result is usually quoted as head loss, the height of water that would produce the same pressure, because head is easier to work with than psi in pump and gravity systems.</p><h2>The rules it applies</h2><ul><li><strong>C factors:</strong> PVC 150, copper 130, steel 120, cast iron 100. Higher is smoother.</li><li><strong>Velocity:</strong> flow in cubic feet per second divided by the internal area, in feet per second.</li><li><strong>Hydraulic radius:</strong> internal diameter divided by four for a pipe flowing full.</li><li><strong>Head to pressure:</strong> one foot of water equals 0.433 psi.</li><li><strong>Not modelled:</strong> fittings and valves (add equivalent length), elevation change, and very high velocities where the flow becomes fully turbulent.</li></ul><h2>Worked example with real numbers</h2><p>100 gpm through 100 feet of 4 inch PVC with C = 150. Flow is 0.2228 cubic feet per second and the internal area is 0.0873 square feet, so the velocity is 2.55 feet per second. The hydraulic radius is 0.0833 feet and the friction slope works out at about 0.0058 feet per foot, giving a head loss of 0.58 feet over the 100 foot run. Converted to pressure that is 0.25 psi.</p><h2>Reading the result</h2><p>Keep the velocity in a sensible band, usually 2 to 5 feet per second for supply piping and up to 8 for some services; above that, noise and erosion accelerate and the head loss climbs steeply because it depends on velocity raised to a power. The single biggest lever is diameter: doubling the pipe diameter cuts the head loss by roughly a factor of thirty for the same flow, which is why undersized mains are the usual cause of a weak far-end tap. Remember to add the equivalent length of elbows, tees and valves to the straight length before trusting the total, and allow for elevation if the pipe rises.</p>' + GUIDES,
    faqs: [
      ['How is the pipe pressure loss calculated?', 'With the Hazen-Williams equation: the velocity is found from the flow and internal area, the friction slope from velocity, diameter and the C factor, and the head loss is the slope times the length. The steps panel shows each figure.'],
      ['What do I need to use the Pipe Pressure Loss Calculator?', 'The flow rate in gallons per minute, the internal diameter, the pipe material and the length. The standard Hazen-Williams C factors are built in.'],
      ['What does the result from the Pipe Pressure Loss Calculator show?', 'The head loss in feet and psi, plus the velocity and the friction slope per 100 feet, so you can size the pipe.'],
      ['What C factor does PVC have in Hazen-Williams?', '150, the smoothest of the common materials. Copper is about 130, steel about 120 and older cast iron about 100, so the same pipe loses more head as it ages or changes material.'],
      ['Is the Pipe Pressure Loss Calculator really free?', 'Yes — 100 percent free, no sign-up, and everything runs in your browser.']
    ]
  },
  {
    id: 'hvac-load', cat: 'engineering',
    title: 'HVAC Load Calculator: BTU & Tons of Cooling',
    metaDesc: 'Estimate the cooling load for a home in BTU per hour and tons from floor area, climate, insulation and window count, as a quick sizing aid.',
    lsi: ['hvac load calculator', 'manual j calculator', 'cooling load calculator', 'btu per square foot air conditioner'],
    aeoH2: '<h2>What does the HVAC Load Calculator do?</h2><p>It gives a quick cooling load estimate in BTU per hour and tons of refrigeration from the conditioned floor area, the climate, the insulation quality and the number of windows, as a first pass before a full Manual-J calculation.</p><ul><li><strong>Inputs:</strong> conditioned floor area, climate, insulation quality, window count.</li><li><strong>Output:</strong> total cooling load in BTU per hour and tons.</li><li><strong>Method:</strong> a base load per square foot, adjusted for insulation, plus a window load allowance.</li></ul>',
    aeoQuick: '<h3>Quick answer</h3><p>A 1,500 square foot home in a moderate climate with average insulation and ten windows comes out near <strong>47,500 BTU per hour, about 4.0 tons</strong> of cooling. Colder climates and better insulation lower the figure; a hot climate or poor insulation raises it.</p>',
    desc: '<h2>What This Calculator Really Does</h2><p>An air conditioner has to remove the heat that flows into a home through its surfaces and the heat generated inside it. Sizing the equipment means estimating that total heat gain, called the cooling load, in BTU per hour. The professional method is Manual-J, which measures each wall, window and appliance. This calculator is the quick estimate that contractors and homeowners use to sanity check a number before the detailed work: a base of 20 to 30 BTU per square foot depending on climate, adjusted up or down for insulation, plus a flat allowance for each window because glass admits far more heat than an insulated wall.</p><h2>The rules it applies</h2><ul><li><strong>Base load:</strong> 30 BTU per square foot in a hot climate, 25 in a moderate one, and 20 in a cold one.</li><li><strong>Insulation adjustment:</strong> good insulation multiplies by 0.85, average by 1.0, and poor insulation by 1.2.</li><li><strong>Window allowance:</strong> 1,000 BTU per hour added for each window, a rough figure that stands in for solar gain.</li><li><strong>Tons:</strong> one ton of cooling equals 12,000 BTU per hour.</li><li><strong>Not modelled:</strong> ceiling height, orientation, appliance and occupant heat, duct losses and ventilation. Use a full Manual-J for a purchase decision.</li></ul><h2>Worked example with real numbers</h2><p>A 1,500 square foot home, moderate climate, average insulation and ten windows. The area load is 1,500 x 25 x 1.0 = 37,500 BTU per hour. The window load is 10 x 1,000 = 10,000 BTU per hour. Total = 47,500 BTU per hour, which is 47,500 / 12,000 = 4.0 tons of cooling. Improving the insulation to good would knock the area load down to about 31,875 and the total to roughly 41,875, just under 3.5 tons.</p><h2>Reading the result</h2><p>Treat the number as a starting bracket, not a specification. Oversizing an air conditioner is a real mistake: it cools the air quickly but does not run long enough to remove humidity, leaving a cold and clammy house, and it cycles more often, which wears the compressor. Undersizing means it never reaches the setpoint on the hottest days. If your figure sits near a size boundary, or the home has large west-facing glass, high ceilings or an uninsulated attic, pay for a proper room-by-room Manual-J before buying. Improving insulation and shading is usually cheaper than the larger unit it replaces.</p>' + GUIDES,
    faqs: [
      ['How is the HVAC cooling load calculated?', 'The conditioned floor area is multiplied by a climate base load and an insulation factor, then a flat allowance is added for each window, giving BTU per hour that is divided by 12,000 to get tons. The steps panel shows each figure.'],
      ['What do I need to use the HVAC Load Calculator?', 'The conditioned floor area, your climate, the insulation quality and the number of windows. The base loads and factors are built in.'],
      ['What does the result from the HVAC Load Calculator show?', 'The total cooling load in BTU per hour and the equivalent tons of refrigeration, split between the area load and the window load.'],
      ['How many BTU per square foot do I need?', 'Roughly 20 in a cold climate, 25 in a moderate one and 30 in a hot one, before adjusting for insulation. These are quick sizing rules, not a Manual-J result.'],
      ['Is the HVAC Load Calculator really free?', 'Yes — 100 percent free, no sign-up, and everything runs in your browser.']
    ]
  }
];

// Insert SEO entries into js/seo-content.js (only missing ids)
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

// ---- SEO self-check ----
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
