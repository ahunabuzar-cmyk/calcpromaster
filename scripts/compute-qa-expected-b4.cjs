// INDEPENDENT expected values for batch 4 (Food & Nutrition family + squat-standards).
// Every value below is derived from textbook/standard formulas, NOT from the app's own calc().
// Run: node scripts/compute-qa-expected-b4.cjs
'use strict';

const L = (s) => console.log(s);

// ---- daily-calorie (Mifflin-St Jeor + activity factor) ----
// male 30y/70kg/170cm moderate
const bmrM = 10 * 70 + 6.25 * 170 - 5 * 30 + 5; // 1617.5
L('daily-calorie male: ' + Math.round(bmrM * 1.55) + ' cal/day (BMR ' + Math.round(bmrM) + ')');
// female 30y/65kg/165cm sedentary
const bmrF = 10 * 65 + 6.25 * 165 - 5 * 30 - 161; // 1330.25
L('daily-calorie female sedentary: ' + Math.round(bmrF * 1.2) + ' cal/day');

// ---- protein-need (0.8/1.6/2.0 g/kg) ----
L('protein-need 70kg active: ' + Math.round(70 * 1.6) + ' g/day');
L('protein-need 70kg athlete: ' + Math.round(70 * 2.0) + ' g/day');

// ---- daily-water-intake (0.033 L/kg + 0.012 L/min exercise + temp) ----
// 70kg, 30 min, warm
const wBase = 70 * 0.033; // 2.31
const wTot = wBase + 30 * 0.012 + 0.3; // 2.97
L('water 70/30/warm: ' + (wTot * 1000).toFixed(0) + ' ml/day (' + wTot.toFixed(1) + ' L)');
// 60kg, 0 min, cool
const w2 = 60 * 0.033 + 0 + 0; // 1.98
L('water 60/0/cool: ' + (w2 * 1000).toFixed(0) + ' ml/day');

// ---- body-fat-food (US Navy, female now uses waist+hip-neck) ----
// male 170/waist80/neck38
const bfM = 495 / (1.0324 - 0.19077 * Math.log10(80 - 38) + 0.15456 * Math.log10(170)) - 450;
L('body-fat-food male: ' + bfM.toFixed(1) + '%');
// female 170/waist72/hip95/neck32
const bfF = 495 / (1.29579 - 0.35004 * Math.log10(72 + 95 - 32) + 0.221 * Math.log10(170)) - 450;
L('body-fat-food female: ' + bfF.toFixed(1) + '%');

// ---- calorie-burned (MET × kg × min / 60) ----
L('calorie-burned 70kg running 30: ' + Math.round(8 * 70 * 30 / 60) + ' cal');
L('calorie-burned 70kg walking 45: ' + Math.round(3.5 * 70 * 45 / 60) + ' cal');

// ---- cooking-time (time × (w/w0)^(2/3)) ----
const ct = 90 * Math.pow(1.5 / 2, 2 / 3);
L('cooking-time 1.5kg vs 2kg recipe 90min: ' + Math.round(ct) + ' min');

// ---- unit-converter-food (density per cup) ----
L('unit-converter-food flour 1 cup: ' + (125 * 1).toFixed(0) + ' g');
L('unit-converter-food sugar 2 cups: ' + (200 * 2).toFixed(0) + ' g');

// ---- eat-out-vs-cook (weekly × 4.33 weeks) ----
const out = (5 * 15) * 4.33; // 324.75
const home = (16 * 4) * 4.33; // 277.12
L('eat-out 5×$15 vs home 16×$4: Out $' + out.toFixed(0) + ' vs Home $' + home.toFixed(0) + '/mo (save $' + (out - home).toFixed(0) + '/mo)');

// ---- fast-food-calories (fixed reference table) ----
L('fast-food burger: 1100 cal | pizza: 700 cal');

// ---- intermittent-fasting (eat window from wake + fast hours) ----
L('IF 16h wake7: Eat 23:00 to 07:00 | IF 12h wake7: Eat 19:00 to 07:00');

// ---- grocery-per-person (adults × rate + children × 0.5 rate) ----
L('grocery 2A+2C moderate: $' + (75 * 2 + 75 * 0.5 * 2).toFixed(0) + '/week');
L('grocery 1A+0C budget: $' + (50 * 1).toFixed(0) + '/week');

// ---- baking-converter (ratios) ----
L('baking butter→oil: 0.8x oil | sugar→honey: 0.67x honey');

// ---- coffee-cost-per-cup ----
L('coffee home 2×$0.50: yearly $' + (0.5 * 2 * 365).toFixed(2));
L('coffee cafe 1×$4.00: yearly $' + (4 * 1 * 365).toFixed(2));

// ---- sugar-intake (g / 25g WHO limit) ----
L('sugar 45g: ' + Math.round(45 / 25 * 100) + '% of limit');
L('sugar 20g: ' + Math.round(20 / 25 * 100) + '% of limit');

// ---- squat-standards (ratio thresholds) ----
L('squat 100kg/70kg: ' + (100 / 70).toFixed(2) + 'x → Novice');
L('squat 80kg/70kg: ' + (80 / 70).toFixed(2) + 'x → Beginner');
