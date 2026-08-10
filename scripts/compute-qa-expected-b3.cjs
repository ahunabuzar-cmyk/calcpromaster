// ============================================================
// Batch 3 — INDEPENDENT expected values (textbook formulas)
// Tax: verified 2026 bracket tables (IRS Rev Proc 2025-32, HMRC
// 2026-27, CRA 2026, ATO 2026-27) — NOT the app's stale tables.
// ============================================================

// ---- Batch 3: health/fitness ----
// 1. Body Fat (Navy, male): 86.010*log10(waist-neck) - 70.041*log10(height) + 36.76
const bfMale = 86.010 * Math.log10(85 - 38) - 70.041 * Math.log10(170) + 36.76;
console.log('body-fat male (70/85/38/170):', bfMale.toFixed(1));

// 2. Water intake: weight*0.033 + activity/30*0.35
console.log('water-intake 70kg/30min:', (70 * 0.033 + 30 / 30 * 0.35).toFixed(1));

// 3. Macros: protein = calories*30%/4
console.log('macros protein 2000/30%:', (2000 * 30 / 100 / 4).toFixed(0));

// 4. Heart rate zones: max=220-age, fatburn=0.6*max
console.log('heart-rate max 30yr:', 220 - 30);

// 5. Target HR (Karvonen): zone moderate 50-70%: resting + reserve*pct
const maxHR = 220 - 30, rest = 70, reserve = maxHR - rest;
console.log('target-HR moderate:', Math.round(rest + reserve * 0.5) + '-' + Math.round(rest + reserve * 0.7));

// 6. Lean body mass: weight*(1-bodyfat/100)
console.log('LBM 70/20%:', (70 * (1 - 20 / 100)).toFixed(1));

// 7. BSA Mosteller: sqrt(height*weight/3600)
console.log('BSA 170/70:', Math.sqrt(170 * 70 / 3600).toFixed(2));

// 8. GFR MDRD male: 186*cr^-1.154*age^-0.203
const gfr = 186 * Math.pow(1.0, -1.154) * Math.pow(50, -0.203) * 1;
console.log('GFR 1.0/50/male:', gfr.toFixed(0));

// 9. Calorie burn: MET*weight*(min/60)
console.log('calorie-burn 8MET/70/30:', (8 * 70 * (30 / 60)).toFixed(0));

// 10. Sleep: wake 07:00, cycles [90,180,270,360,450] minus 15
const wake = 7 * 60;
console.log('sleep bedtimes:', [90, 180, 270, 360, 450].map(c => { let t = wake - c - 15; if (t < 0) t += 1440; return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }).join(', '));

// 11. 1RM (Epley/Brzycki/Lander avg): 80kg x5
const epley = 80 * (1 + 5 / 30);
const brzycki = 80 * 36 / (37 - 5);
const lander = 80 * 100 / (101.3 - 2.67123 * 5);
console.log('1RM avg 80x5:', Math.round((epley + brzycki + lander) / 3));

// 12. Training max 90%: 100 -> 90
console.log('training max 100:', Math.round(100 * 0.9));

// 13. Weight loss: weeks = (80-70)/(500*7/7700)
const kgPerWeek = 500 * 7 / 7700;
console.log('weight-loss weeks:', Math.round((80 - 70) / kgPerWeek));

// 14. Running pace: 10km 55min -> 5:30/km
const pace = 55 / 10;
console.log('pace 10km/55min:', Math.floor(pace) + ':' + Math.round((pace - Math.floor(pace)) * 60).toString().padStart(2, '0') + ' /km', 'speed:', (10 / (55 / 60)).toFixed(1));

// 15. Max HR avg (Fox/Tanaka/Gulati): 30yr
const fox = 220 - 30, tanaka = 208 - 0.7 * 30, gulati = 206 - 0.88 * 30;
console.log('max-hr avg 30yr:', Math.round((fox + tanaka + gulati) / 3));

// 16. VO2max resting-HR method male: 15.3*(220-age)/restHr
console.log('vo2max rest-HR male 65/30:', (15.3 * (220 - 30) / 65).toFixed(1));

// 17. Steps to distance: stride=height*0.415, km=steps*stride/100000
const stride = 170 * 0.415;
console.log('steps 10000/170cm:', (10000 * stride / 100000).toFixed(2), 'km');

// 18. Sports calories basketball 6MET/70/60
console.log('sports bball 70/60:', Math.round(6 * 70 * 60 / 60));

console.log('\n===== VERIFIED 2026 TAX =====');

// ---- US 2026 (IRS Rev Proc 2025-32) ----
const US = { single: [[12400, 10], [50400, 12], [105700, 22], [201775, 24], [256225, 32], [640600, 35], [1e99, 37]] };
function taxBr(br, inc, ded) {
  const taxable = Math.max(0, inc - (ded || 0));
  let t = 0, p = 0;
  br.forEach(b => { if (taxable > p) { t += (Math.min(taxable, b[0]) - p) * b[1] / 100; p = b[0]; } });
  return { tax: t, taxable };
}
const us75 = taxBr(US.single, 75000, 16100);
console.log('US single 75k/16100 ded: taxable', us75.taxable, 'tax', us75.tax.toFixed(0), 'take', (75000 - us75.tax).toFixed(0));

// ---- UK 2026-27 (HMRC) ----
function ukTax(income, penPct) {
  const pen = income * (penPct || 0) / 100;
  const taxable = income - pen, pa = 12570;
  const bands = [[50270, 20], [125140, 40], [1e99, 45]];
  let tax = 0, prev = pa;
  bands.forEach(b => { if (taxable > prev) { tax += (Math.min(taxable, b[0]) - prev) * b[1] / 100; prev = b[0]; } });
  tax = Math.max(0, tax);
  let ni = 0;
  if (taxable > 12570) ni = (Math.min(taxable, 50270) - 12570) * 0.08 + (taxable > 50270 ? (taxable - 50270) * 0.02 : 0);
  return { take: taxable - tax - ni, tax, ni };
}
const uk40 = ukTax(40000, 5);
console.log('UK 40k/5%: tax', uk40.tax.toFixed(0), 'NI', uk40.ni.toFixed(0), 'take', uk40.take.toFixed(0));

// ---- Canada 2026 (CRA verified) ----
const CA_FED = [[58523, 14], [117045, 20.5], [181440, 26], [258482, 29], [1e99, 33]];
const CA_ON = [[53891, 5.05], [107785, 9.15], [150000, 11.16], [220000, 12.16], [1e99, 13.16]];
const CA_BC = [[50363, 5.6], [100728, 7.7], [115648, 10.5], [140430, 12.29], [190405, 14.7], [265545, 16.8], [1e99, 20.5]];
const CA_AB = [[61200, 8], [154259, 10], [185111, 12], [246813, 13], [370220, 14], [1e99, 15]];
const CA_QC = [[54345, 14], [108680, 19], [132245, 24], [1e99, 25.75]];
const CA_NS = [[30995, 8.79], [61991, 14.95], [97417, 16.67], [157124, 17.5], [1e99, 21]];
function taxBr2(br, inc) { let t = 0, p = 0; br.forEach(x => { if (inc > p) { t += (Math.min(inc, x[0]) - p) * x[1] / 100; p = x[0]; } }); return t; }
const ca65 = { on: taxBr2(CA_ON, 65000), fed: taxBr2(CA_FED, 65000) };
console.log('CA 65k ON: fed', ca65.fed.toFixed(0), 'prov', ca65.on.toFixed(0), 'total', (ca65.fed + ca65.on).toFixed(0), 'take', (65000 - ca65.fed - ca65.on).toFixed(0));

// ---- Australia 2026-27 (ATO: 15% band) ----
function auTax(income, superPct) {
  const inc = income - income * (superPct || 0) / 100;
  const bands = [[18200, 0], [45000, 15], [135000, 30], [190000, 37], [1e99, 45]];
  let tax = 0, p = 0;
  bands.forEach(b => { if (inc > p) { tax += (Math.min(inc, b[0]) - p) * b[1] / 100; p = b[0]; } });
  const medicare = inc * 0.02;
  return { take: inc - tax - medicare, tax, medicare };
}
const au80 = auTax(80000, 0);
console.log('AU 80k: tax', au80.tax.toFixed(0), 'medicare', au80.medicare.toFixed(0), 'take', au80.take.toFixed(0));

// Extra tax cases for QA depth
const us100 = taxBr(US.single, 100000, 16100);
console.log('US single 100k: tax', us100.tax.toFixed(0));
const ca120 = { on: taxBr2(CA_ON, 120000), fed: taxBr2(CA_FED, 120000) };
console.log('CA 120k ON: total', (ca120.fed + ca120.on).toFixed(0));
