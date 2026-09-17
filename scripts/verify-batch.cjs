#!/usr/bin/env node
// Verify independently-computed expected values against the shipped tools.
// Prints tool output for each case so mismatches can be investigated.
const path = require('path');
const ROOT = path.join(__dirname, '..');
global.window = global;
global.Charts = { bar: () => '', donut: () => '', gauge: () => '', line: () => '', spark: () => '', heatmap: () => '', area: () => '' };
global.Security = { sanitizeHtml: (s) => String(s), sanitizeJsString: (s) => String(s), sanitizeOutput: (s) => String(s), cryptoRandomInt: (min) => min || 0 };

const CASES = [
  // [cat, id, inputs, expected, label]
  ['math', 'geometric-seq', { a: 2, r: 3, n: 5 }, 242, 'Sₙ=2(3⁵−1)/2'],
  ['math', 'arithmetic-seq', { a: 3, d: 5, n: 10 }, 255, 'Sₙ=10(3+48)/2'],
  ['math', 'binomial-prob', { n: 10, k: 3, p: 0.3 }, 26.68, 'C(10,3)0.3³0.7⁷'],
  ['math', 'polar-rect', { mode: 'p2r', x: 5, y: 30 }, 4.3301, 'x=r·cosθ'],
  ['math', 'cubic-equation', { a: 1, b: 0, c: -9, d: -27 }, 3.97, 'x³−9x−27 root'],
  ['science', 'kepler-third', { a: 1.524, m1: 1 }, 1.881, 'T=a^1.5 Mars'],
  ['science', 'radioactive-decay', { n0: 1000, halfLife: 5730, time: 11460 }, 250, '2 half-lives'],
  ['science', 'speed-of-sound', { temp: 20, medium: 'air' }, 343.4, '331.3+0.606·20'],
  ['engineering', 'beam-deflection', { load: 10, length: 5, ei: 10000 }, 0.0081, '5PL⁴/384EI m'],
  ['engineering', 'steel-weight', { type: 'plate', a: 1000, b: 500, c: 10 }, 39.25, '0.005m³·7850'],
  ['engineering', 'structural-load', { dead: 100, live: 50, wind: 30 }, 200, '1.2D+1.6L governs'],
  ['science', 'power-electrical', { mode: 'vi', a: 120, b: 10 }, 1200, 'P=VI'],
  ['finance', 'rule-of-72', { rate: 7 }, 10.3, '72/7'],
  ['finance', 'dividend-yield', { annualDiv: 3.5, price: 75 }, 4.67, '3.5/75'],
  ['finance', 'cd-calculator', { deposit: 10000, rate: 4.5, years: 5, compound: 12 }, 12517.8, 'monthly comp'],
  ['finance', 'annuity-payout', { fund: 500000, rate: 6, years: 25 }, 39113, 'PMT=Pr/(1-(1+r)^-n)'],
  ['finance', 'bond-price', { face: 1000, coupon: 5, yield: 4, years: 10 }, 1081.11, 'PV coupons+face'],
  ['everyday', 'work-hours-weekly', { days: 5, hours: 8 }, 40, '5×8'],
  ['everyday', 'days-between', { from: '2026-01-01', to: '2026-06-15' }, 165, '151+14'],
  ['everyday', 'savings-goal-date', { goal: 10000, current: 2000, monthly: 500 }, 16, '8000/500'],
  ['everyday', 'budget-allocator', { income: 5000, housing: 30, food: 15, transport: 10, savings: 20, other: 25 }, 5000, '100% of income'],
  ['health', 'calorie-deficit', { deficit: 500, weeks: 12 }, 5.5, '42000/7700 kg'],
  ['health', 'sleep-debt', { need: 8, actual: 6, days: 5 }, 10, '(8−6)×5'],
  ['food-nutrition', 'carb-calculator', { calories: 2200, pct: 50 }, 275, '2200·50%/4'],
  ['food-nutrition', 'fiber-need', { calories: 2000 }, 28, '14g/1000kcal'],
  ['food-nutrition', 'rice-water', { cups: 2, type: 'white' }, 4, '2×2'],
  ['food-nutrition', 'egg-boil', { size: 'large', style: 'medium' }, 8, 'large medium 8min'],
  ['fitness-exercise', 'cycling-speed', { distance: 40, speed: 25 }, 96, '40/25·60'],
  ['fitness-exercise', 'cadence-calc', { cadence: 90, wheel: 27, gear: 70 }, 30.2, 'π·70in·90rpm'],
  ['fitness-exercise', 'swim-pace', { time: 25, distance: 1500 }, 100, '25·60/1500·100'],
  ['business', 'markup-margin', { cost: 50, sell: 75 }, 33.3, '25/75'],
  ['business', 'working-capital', { assets: 200000, liabilities: 120000 }, 80000, 'CA−CL'],
  ['business', 'cash-flow-statement', { operating: 80000, investing: -30000, financing: 10000 }, 60000, 'net CF'],
  ['business', 'revenue-per-employee', { revenue: 2000000, employees: 25 }, 80000, '2M/25'],
  ['business', 'cac-payback', { cac: 500, margin: 100 }, 5, '500/100'],
  // ---- batch 2: conversion / education / construction / business / auto / regional / lifestyle / food / everyday / tech ----
  ['conversion', 'bit-rate-conv', { value: 100, from: 'mbps', to: 'kbps' }, 100000, '100Mbps in kbps'],
  ['conversion', 'luminance-conv', { value: 500, from: 'lux', to: 'fc' }, 46.45, '500 lux in fc'],
  ['conversion', 'molarity-conv', { value: 0.5, from: 'M', to: 'mM' }, 500, '0.5 M in mM'],
  ['conversion', 'flow-rate-conv', { value: 10, from: 'lpm', to: 'm3h' }, 0.6, '10 L/min in m³/h'],
  ['education', 'attendance-rate', { attended: 42, total: 48 }, 87.5, '42/48 %'],
  ['education', 'study-hours', { credits: 15, perCredit: 3 }, 45, '15×3 h/wk'],
  ['education', 'tuition-cost', { perCredit: 500, credits: 120, fees: 1000, years: 4 }, 64000, '60000+4000'],
  ['education', 'gpa-target', { currentGPA: 3.2, creditsDone: 60, creditsNow: 15, targetGPA: 3.5 }, 4.7, '(262.5−192)/15'],
  ['construction', 'concrete-bags', { length: 10, width: 8, depth: 4, bagSize: 60 }, 60, 'ceil(26.67/0.45)'],
  ['construction', 'block-wall', { length: 30, height: 8 }, 214, 'ceil(240/1.125)'],
  ['construction', 'rebar-calc', { length: 20, width: 12, spacing: 12 }, 512, '13×20+21×12'],
  ['construction', 'footing-size', { load: 100, soil: 3 }, 5.77, '√(100/3)'],
  ['business', 'gross-margin', { revenue: 100000, cogs: 60000 }, 40, '(100k−60k)/100k'],
  ['business', 'goal-seek-price', { cost: 40, target: 40 }, 66.67, '40/0.6'],
  ['business', 'subscription-ltv', { arpu: 25, churn: 5, margin: 80 }, 400, '25×20×0.8'],
  ['business', 'business-valuation', { revenue: 1000000, ebitda: 150000, revMult: 1.5, ebitdaMult: 5 }, 1125000, '(1.5M+0.75M)/2'],
  ['auto-transport', 'fuel-tank-range', { tankSize: 45, efficiency: 16, reserve: 10 }, 648, '40.5L×16'],
  ['auto-transport', 'tow-capacity', { gcwr: 5000, truck: 2200, passengers: 400 }, 2400, '5000−2600'],
  ['auto-transport', 'cargo-volume', { length: 1.5, width: 1.1, height: 0.8 }, 46.6, '1320L/28.317'],
  ['auto-transport', 'toll-cost', { tolls: 4, avgToll: 3.5, trips: 20 }, 280, '14×20'],
  ['regional', 'esic-calculator', { salary: 25000 }, 188, '25000×0.0075'],
  ['regional', 'tds-calculator', { income: 1200000, deductions: 150000 }, 132600, 'slab 30% + 4% cess on tax'],
  ['regional', 'hra-exemption', { basic: 480000, hra: 144000, rent: 180000, metro: 'other' }, 132000, 'min(144k,132k,192k)'],
  ['lifestyle', 'date-night-cost', { dinner: 60, entertainment: 40, transport: 15, perMonth: 4 }, 460, '115×4'],
  ['lifestyle', 'takeout-budget', { order: 25, week: 3 }, 324.75, '75×4.33'],
  ['lifestyle', 'home-insurance', { homeValue: 350000, rate: 3.5 }, 1225, '350×3.5'],
  ['lifestyle', 'renters-insurance', { value: 30000, rate: 180 }, 190, '180+5000×0.002'],
  ['food-nutrition', 'calorie-per-meal', { calories: 2200, meals: 3, snacks: 1 }, 733, '2200/3'],
  ['food-nutrition', 'smoothie-calories', { fruit: 1.5, milk: 1, banana: 1, extras: 100 }, 415, '90+120+105+100'],
  ['food-nutrition', 'protein-per-dollar', { price: 5.99, grams: 500, proteinPer100g: 25 }, 20.9, '125/5.99'],
  ['everyday', 'compound-savings', { principal: 1000, monthly: 200, rate: 7, years: 10 }, 36628, 'FV annuity'],
  ['tech-digital', 'aspect-ratio', { ratioW: 16, ratioH: 9, width: 1920 }, 1080, '1920×9/16'],
  ['tech-digital', 'color-contrast', { fg: '#333333', bg: '#ffffff' }, 12.63, 'WCAG #333/#fff'],
];

function allNums(s) {
  const out = [];
  const clean = String(s).replace(/,/g, '');
  const re = /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
  let m;
  while ((m = re.exec(clean)) !== null) {
    const v = parseFloat(m[0]);
    if (Number.isFinite(v)) out.push(v);
  }
  return out;
}

(async () => {
  for (const [cat, id, values, expected, label] of CASES) {
    try {
      const arr = require(path.join(ROOT, 'js', 'data', cat + '.js'));
      const tool = (Array.isArray(arr) ? arr : []).find(t => t.id === id);
      if (!tool) { console.log('MISSING TOOL', cat, id); continue; }
      let raw = tool.calc(values);
      const out = await Promise.resolve(raw);
      const str = typeof out === 'string' ? out : String(out.result ?? out.value ?? '');
      const nums = allNums(str);
      const best = nums.reduce((a, b) => Math.abs(b - expected) < Math.abs(a - expected) ? b : a, nums[0]);
      const ok = nums.some(n => Math.abs(n - expected) <= Math.max(0.05, Math.abs(expected) * 0.02));
      console.log((ok ? 'OK  ' : 'DIFF'), cat + '/' + id, '| exp:', expected, '| got:', best, '| raw:', str.slice(0, 70));
    } catch (e) {
      console.log('ERR ', cat + '/' + id, e.message.slice(0, 60));
    }
  }
})();