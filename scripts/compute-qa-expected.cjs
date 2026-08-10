// Independent textbook derivations for formula-QA contracts.
// Every value is derived from the standard formula, NEVER from app calc().
function fmt(x) { return Number(x.toPrecision(12)).toFixed(2); }
function calcPmt(P, ratePct, years) {
  const r = ratePct / 100 / 12, n = years * 12;
  return P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

// ---- Batch 1 (already in suite) ----
const r = 0.12 / 12, n = 120;
console.log('SIP FV (0dp):', (500 * ((Math.pow(1 + r, n) - 1) / r) * (1 + r)).toFixed(0));
console.log('FD maturity:', fmt(100000 * Math.pow(1 + 0.075 / 4, 12)));
const rr = 0.065 / 12, nrd = 60;
console.log('RD maturity:', fmt(5000 * ((Math.pow(1 + rr, nrd) - 1) / rr)));
let bal = 0; for (let y = 1; y <= 15; y++) { bal += 150000; bal *= 1.071; }
console.log('PPF maturity:', fmt(bal));
const emi = calcPmt(10000, 6, 5);
console.log('APR:', (((emi * 60 - 9500) / 9500 / 5) * 100).toFixed(2));
const flows = [-10000, 3000, 3000, 3000, 3000];
console.log('NPV:', fmt(flows.reduce((s, f, t) => s + f / Math.pow(1.10, t), 0)));
const cf = [-10000, 3000, 3500, 4000, 3500];
const npvAt = x => cf.reduce((s, f, t) => s + f / Math.pow(1 + x, t), 0);
let lo = -0.99, hi = 10; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; npvAt(m) > 0 ? lo = m : hi = m; }
console.log('IRR:', ((lo + hi) / 2 * 100).toFixed(2));
console.log('Salary annual:', fmt(25 * 40 * 52), 'monthly:', fmt(25 * 40 * 52 / 12));
console.log('FIRE goal:', fmt(40000 * 25));
console.log('SS monthly:', fmt(50000 * 0.4 / 12));
console.log('Mortgage payment:', calcPmt(240000, 6.5, 30).toFixed(2));
console.log('Car loan EMI:', calcPmt(25000, 7, 5).toFixed(2));

// ---- Batch 2: mortgage family + international taxes ----
const oldEmi = calcPmt(200000, 6.5, 25), newEmi = calcPmt(200000, 5.5, 25);
console.log('Refinance savings/mo:', (oldEmi - newEmi).toFixed(2), 'old:', oldEmi.toFixed(2), 'new:', newEmi.toFixed(2));
const rB = 0.06 / 12, nB = 360;
const emiB = 200000 * rB * Math.pow(1 + rB, nB) / (Math.pow(1 + rB, nB) - 1);
const bal60 = 200000 * Math.pow(1 + rB, 60) - emiB * (Math.pow(1 + rB, 60) - 1) / rB;
console.log('Balloon emi:', emiB.toFixed(2), 'balance@60mo:', bal60.toFixed(2));
const startG = emiB * 0.7, endG = startG * Math.pow(1.05, 5);
console.log('GPM year1:', startG.toFixed(2), 'year6+:', endG.toFixed(2));
console.log('US tax (75k single, 14600 ded):', (11600 * 0.10 + (47150 - 11600) * 0.12 + (75000 - 14600 - 47150) * 0.22).toFixed(0));
const taxableUK = 38000, taxUK = (taxableUK - 12570) * 0.20, niUK = (taxableUK - 12570) * 0.08;
console.log('UK take-home:', (taxableUK - taxUK - niUK).toFixed(0), 'tax:', taxUK.toFixed(0), 'NI:', niUK.toFixed(1));
const fed = 55867 * 0.15 + (65000 - 55867) * 0.205, onT = 51446 * 0.0505 + (65000 - 51446) * 0.0915;
console.log('CA take-home:', (65000 - fed - onT).toFixed(0), 'fed:', fed.toFixed(2), 'ON:', onT.toFixed(2));
const auTax = (45000 - 18200) * 0.16 + (80000 - 45000) * 0.30;
console.log('AU take-home:', (80000 - auTax - 1600).toFixed(0), 'tax:', auTax.toFixed(0));

// ---- Health batch ----
console.log('Exercise cal (8 MET 70kg 30min):', Math.round(8 * 70 * 30 / 60));
console.log('BMR male 70/170/30:', Math.round(10 * 70 + 6.25 * 170 - 5 * 30 + 5));
console.log('Bench 60/70:', (60 / 70).toFixed(2), 60 / 70 >= 0.8 ? 'Novice' : '?');
console.log('Deadlift 100/70:', (100 / 70).toFixed(2), 100 / 70 >= 1.0 ? 'Beginner' : '?');
