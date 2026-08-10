// INDEPENDENT expected values for batch 5 (keto-macro, macro-split, meal-prep, recipe-scaler,
// tea-vs-coffee, vegan-protein, weight-loss-time, blood-pressure, fatigue-score, ovulation,
// pregnancy-weight, sleep-quality, college-savings, kid-allowance, baby-feeding,
// room-area, rug-size, paint-cost, garden-soil, grass-seed).
// Derived from textbook/standard formulas — NOT the app's own calc().
'use strict';
const L = (s) => console.log(s);

// ---- keto-macro (Mifflin-St Jeor × 1.4, keto split 75/20/5) ----
const bmr = 10 * 70 + 6.25 * 170 - 5 * 30 + 5; // 1617.5
const tdee = bmr * 1.4; // 2264.5
L('keto-macro: ' + Math.round(tdee) + ' cal/day | F:' + Math.round(tdee * 0.75 / 9) + 'g P:' + Math.round(tdee * 0.2 / 4) + 'g C:' + Math.round(tdee * 0.05 / 4) + 'g');

// ---- macro-split (balanced 30/40/30 at 2000 cal) ----
L('macro-split 2000 balanced: P:' + Math.round(2000 * 0.3 / 4) + 'g C:' + Math.round(2000 * 0.4 / 4) + 'g F:' + Math.round(2000 * 0.3 / 9) + 'g');

// ---- meal-prep ----
L('meal-prep $24/8: $' + (24 / 8).toFixed(2) + '/serving');

// ---- recipe-scaler ----
L('recipe-scaler 4→6: ' + (6 / 4).toFixed(2) + 'x');

// ---- tea-vs-coffee ----
const teaY = 3 * 0.3 * 365; // 328.5
const coffeeY = 2 * 2 * 365; // 1460
L('tea-vs-coffee: Tea $' + teaY.toFixed(0) + ' vs Coffee $' + coffeeY.toFixed(0) + '/yr (diff $' + (coffeeY - teaY).toFixed(0) + ')');

// ---- vegan-protein ----
L('vegan-protein 70kg build: ' + Math.round(70 * 1.8) + ' g/day');

// ---- weight-loss-time ----
const totalCal = (80 - 65) * 7700; // 115500
const days = Math.ceil(totalCal / 500); // 231
L('weight-loss-time 80→65 @500: ' + Math.round(days / 7) + ' weeks (' + days + ' days)');

// ---- blood-pressure (ACC/AHA) ----
const bpCat = (s, d) => { let c = 'Normal'; if (s >= 180 || d >= 120) c = 'Hypertensive Crisis'; else if (s >= 140 || d >= 90) c = 'Hypertension Stage 2'; else if (s >= 130 || d >= 80) c = 'Hypertension Stage 1'; else if (s >= 120) c = 'Elevated'; return c; };
L('BP 120/80 → ' + bpCat(120, 80) + ' | 150/95 → ' + bpCat(150, 95) + ' | 118/76 → ' + bpCat(118, 76));

// ---- fatigue-score ----
const fscore = Math.max(0, Math.min(100, (Math.min(10, 6 / 0.8) * 10) - 7 * 10 + 4 * 3 + 30));
L('fatigue 6h/act4/stress7: ' + fscore.toFixed(0) + '/100');

// ---- ovulation ----
const lmp = new Date('2026-01-01'); lmp.setDate(lmp.getDate() + 28 - 14);
L('ovulation LMP 2026-01-01 cycle28: ' + lmp.toLocaleDateString());

// ---- pregnancy-weight ----
L('preg BMI22 T2: ' + (11 * 0.5).toFixed(1) + ' kg | BMI18 T3: ' + (13).toFixed(1) + ' kg');

// ---- sleep-quality ----
const eff = Math.min(100, 7 / 8 * 100); // 87.5
const sq = Math.max(0, eff - Math.min(20, 1 * 5)); // 82.5
L('sleep-quality 8h/7h/1wake: score ' + sq.toFixed(0) + '/100 eff ' + eff.toFixed(0) + '%');

// ---- college-savings (FV + annuity, 6%, 12y) ----
const yrs = 12, r = 0.06 / 12, n = yrs * 12;
const fv = 5000 * Math.pow(1 + r, n) + 300 * (Math.pow(1 + r, n) - 1) / r;
const cost = 25000 * Math.pow(1.05, yrs) * 4;
L('529 age5 $300/mo: saved $' + Math.round(fv).toLocaleString() + ' cost $' + Math.round(cost).toLocaleString() + ' coverage ' + (fv / cost * 100).toFixed(0) + '%');

// ---- kid-allowance ----
L('allowance age8 chore: $8/wk | age8: $8/wk | hybrid: $' + ((8 + 5) / 2).toFixed(0) + '/wk');

// ---- baby-feeding ----
L('baby 5kg/8 feeds: ' + Math.round(5 * 150 / 8) + ' ml/feeding (750 ml/day)');

// ---- room-area ----
L('room 12x14 @10%: ' + (12 * 14) + ' sqft, w/waste ' + Math.round(12 * 14 * 1.1) + ' sqft');

// ---- rug-size ----
L('rug 16x12 gap18\": max 13x9 → 6x9');

// ---- paint-cost ----
const pc = 3 * 40, pr = 3 * 0.75 * 40 * 0.6, labor = 12 * 30;
L('paint 3gal $40 primer: DIY $' + (pc + pr).toFixed(0) + ' Hired $' + (pc + pr + labor).toFixed(0) + ' save $' + (labor).toFixed(0));

// ---- garden-soil ----
const cf = 8 * 4 * (6 / 12); // 16
L('soil 8x4x6\": ' + (cf / 27).toFixed(2) + ' cy | ' + cf.toFixed(1) + ' cf | bags ' + Math.ceil(cf / 1.5) + ' | ' + Math.round(cf * 40) + ' lbs');

// ---- grass-seed ----
const seed = (5000 / 1000) * 5 * 0.75; // 18.75
L('grass 5000sqft fescue overseed: ' + seed.toFixed(1) + ' lbs, bags ' + Math.ceil(seed / 20));
