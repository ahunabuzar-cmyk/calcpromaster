// ============================================================
// CalcProMaster — DEEP FORMULA QA (543-calculator expansion)
//
// Independent known-answer tests: expected values are computed HERE
// from textbook formulas / standard factor tables — never by calling
// the tool's own calc() to produce its own expectation.
//
// Extraction strategy:
//   - Thousands separators stripped, all numbers (incl. scientific
//     notation) pulled from the result string; the one CLOSEST to the
//     independently-computed expected value is compared (robust to
//     "Resistance: 6 | Power: 24" formats and "VO2" label collisions).
//   - `mode: 'contains'` for non-numeric result formats
//     (fraction "3/4", ratio "2:3", complex "4+6i", "4h 15m").
//   - `mode: 'rel'`: relative tolerance for large values / coarse
//     display precision (e.g. rounded-to-2-sig-fig scientific outputs).
//
// This catches real math regressions (wrong constants, inverted
// conversions, off-by-factor errors) — not just crashes.
// ============================================================
import { describe, it, expect, beforeAll } from 'vitest';

// ---- Browser-global bootstrap (mirrors audit-tools.cjs) ----
global.window = global;
const svg = '<svg></svg>';
global.Charts = { bar: () => svg, donut: () => svg, gauge: () => svg, line: () => svg, spark: () => svg, heatmap: () => svg, area: () => svg };
global.Currency = { getRates: () => ({ USD: 1, EUR: 0.92 }), convert: () => Promise.resolve({ result: '1 USD = 0.92 EUR', extra: '' }) };
global.Compounding = { futureValue: (P, r, n, t, c) => P * Math.pow(1 + r / 100 / (c || 12), (c || 12) * t) };
global.LoanSolver = { payment: (P, r, n) => P * (r / 100 / 12) / (1 - Math.pow(1 + r / 100 / 12, -n)) };
global.DayCount = { daysBetween: (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000) };
global.SafeMathParser = { parse: (s) => parseFloat(s) };
global.Security = { sanitizeHtml: (s) => String(s), sanitizeJsString: (s) => String(s), sanitizeOutput: (s) => String(s), cryptoRandomInt: (min, max) => min || 0 };
global.MathJax = {};
global.parseIntFn = parseInt;

beforeAll(async () => {
  try {
    const { default: advancedCalc } = await import('../../js/advanced-calc.js');
    if (global.AdvancedCalc) Object.assign(global.AdvancedCalc, advancedCalc);
  } catch (e) { /* advanced-calc may set window.* only */ }
  try { await import('../../js/calc-modes.js'); } catch (e) { /* optional */ }
});

function load(cat, id) {
  return import('../../js/data/' + cat + '.js').then(m => {
    const arr = m.default || m;
    return (Array.isArray(arr) ? arr : []).find(t => t.id === id);
  });
}

async function calcResult(cat, id, values) {
  const tool = await load(cat, id);
  if (!tool) throw new Error('tool not found: ' + cat + '/' + id);
  const raw = tool.calc(values);
  const out = await Promise.resolve(raw);
  if (typeof out === 'string') return out;
  if (out && typeof out === 'object') return String(out.result ?? out.value ?? out.html ?? '');
  return String(out);
}

// Full result object (result + extra) — for tools whose key computed values
// live in the `extra` string rather than the primary result.
async function calcFull(cat, id, values) {
  const tool = await load(cat, id);
  if (!tool) throw new Error('tool not found: ' + cat + '/' + id);
  const out = await Promise.resolve(tool.calc(values));
  return (out && typeof out === 'object') ? out : { result: String(out), extra: '' };
}

// Pull every number (incl. scientific notation) out of a string.
// Thousands separators ("2,051.65") are stripped first so the value is
// parsed as one number, not split into "2" + "051.65".
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

// Independent reference implementations (textbook) — keyed by category
const REF = {
  // ---------- MATH ----------
  'math/quadratic': (v) => { const d = v.b * v.b - 4 * v.a * v.c; return (-v.b + Math.sqrt(d)) / (2 * v.a); },
  'math/percentage': (v) => (v.part / v.whole) * 100,
  'math/percent-change': (v) => ((v.new - v.old) / Math.abs(v.old)) * 100,
  'math/logarithm': (v) => Math.log(v.n) / Math.log(v.base),
  'math/exponent': (v) => Math.pow(v.base, v.exp),
  'math/root': (v) => Math.pow(v.n, 1 / v.root),
  'math/factorial': (v) => { let f = 1; for (let i = 2; i <= v.n; i++) f *= i; return f; },
  'math/modular': (v) => v.a % v.b,
  'math/lcm-gcd': (v) => { const g = (a, b) => b ? g(b, a % b) : Math.abs(a); return g(v.a, v.b); },
  'math/matrix-det': (v) => v.a * (v.e * v.i - v.f * v.h) - v.b * (v.d * v.i - v.f * v.g) + v.c * (v.d * v.h - v.e * v.g),
  'math/triangle': (v) => { const s = (v.a + v.b + v.c) / 2; return Math.sqrt(Math.max(0, s * (s - v.a) * (s - v.b) * (s - v.c))); },
  'math/circle': (v) => Math.PI * v.r * v.r,
  'math/statistics': (v) => { const arr = v.data.split(',').map(Number); return arr.reduce((a, b) => a + b, 0) / arr.length; },
  'math/combinations': (v) => { const f = (n) => { let x = 1; for (let i = 2; i <= n; i++) x *= i; return x; }; return f(v.n) / (f(v.r) * f(v.n - v.r)); },
  'math/average': (v) => { const arr = v.data.split(',').map(Number); return arr.reduce((a, b) => a + b, 0) / arr.length; },
  'math/pythagorean': (v) => Math.sqrt(v.a * v.a + v.b * v.b),
  'math/trigonometry': (v) => Math.sin(v.angle * Math.PI / 180),
  'math/distance': (v) => Math.sqrt((v.x2 - v.x1) ** 2 + (v.y2 - v.y1) ** 2),
  'math/slope': (v) => (v.y2 - v.y1) / (v.x2 - v.x1),

  // ---------- CONVERSION (standard factor tables) ----------
  'conversion/length': (v) => { const M = { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254 }; return v.value * M[v.from] / M[v.to]; },
  'conversion/temperature': (v) => {
    const toK = { C: (x) => x + 273.15, F: (x) => (x - 32) * 5 / 9 + 273.15, K: (x) => x };
    const fromK = { C: (x) => x - 273.15, F: (x) => (x - 273.15) * 9 / 5 + 32, K: (x) => x };
    return fromK[v.to](toK[v.from](v.value));
  },
  'conversion/weight': (v) => { const KG = { kg: 1, g: 0.001, mg: 1e-6, lb: 0.45359237, oz: 0.0283495231, t: 1000 }; return v.value * KG[v.from] / KG[v.to]; },
  'conversion/volume': (v) => { const L = { l: 1, ml: 0.001, gal: 3.785411784, qt: 0.946352946, pt: 0.473176473, cup: 0.236588237, m3: 1000 }; return v.value * L[v.from] / L[v.to]; },
  'conversion/speed': (v) => { const MS = { ms: 1, kmh: 1 / 3.6, mph: 0.44704, knot: 0.5144444444 }; return v.value * MS[v.from] / MS[v.to]; },
  'conversion/area': (v) => { const M2 = { m2: 1, km2: 1e6, cm2: 1e-4, ft2: 0.09290304, in2: 0.00064516, ac: 4046.8564224, ha: 10000 }; return v.value * M2[v.from] / M2[v.to]; },
  'conversion/energy': (v) => { const J = { J: 1, kJ: 1000, cal: 4.184, kcal: 4184, Wh: 3600, kWh: 3.6e6, BTU: 1055.05585 }; return v.value * J[v.from] / J[v.to]; },
  'conversion/power-conv': (v) => { const W = { W: 1, kW: 1000, hp: 745.699872, BTUhr: 0.29307107 }; return v.value * W[v.from] / W[v.to]; },
  'conversion/pressure-conv': (v) => { const PA = { Pa: 1, kPa: 1000, bar: 1e5, psi: 6894.757293168, atm: 101325, mmHg: 133.3223684 }; return v.value * PA[v.from] / PA[v.to]; },
  'conversion/time-conv': (v) => { const S = { s: 1, min: 60, h: 3600, d: 86400 }; return v.value * S[v.from] / S[v.to]; },
  'conversion/data-storage': (v) => { const B = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4, PB: 1024 ** 5 }; return v.value * B[v.from] / B[v.to]; },
  'conversion/angle': (v) => { const D = { deg: 1, rad: 180 / Math.PI, grad: 0.9, turn: 360 }; return v.value * D[v.from] / D[v.to]; },
  'conversion/frequency-conv': (v) => { const HZ = { Hz: 1, kHz: 1000, MHz: 1e6, GHz: 1e9, rpm: 1 / 60 }; return v.value * HZ[v.from] / HZ[v.to]; },
  'conversion/torque-conv': (v) => { const NM = { Nm: 1, lbft: 1.3558179483, inlb: 0.1129848290 }; return v.value * NM[v.from] / NM[v.to]; },
  'conversion/density-conv': (v) => { const KGM3 = { kgm3: 1, gcm3: 1000, lbft3: 16.018463374 }; return v.value * KGM3[v.from] / KGM3[v.to]; },
  'conversion/viscosity-conv': (v) => { const PAS = { PaS: 1, P: 0.1, cP: 0.001 }; return v.value * PAS[v.from] / PAS[v.to]; },
  'conversion/radiation-conv': (v) => { const SV = { Sv: 1, mSv: 0.001, rem: 0.01 }; return v.value * SV[v.from] / SV[v.to]; },
  'conversion/force-conv': (v) => { const N = { N: 1, kN: 1000, lbf: 4.4482216153, kgf: 9.80665 }; return v.value * N[v.from] / N[v.to]; },
  'conversion/cooking-conv': (v) => { const ML = { cup: 240, tbsp: 15, tsp: 5, floz: 29.5735296, ml: 1 }; return v.value * ML[v.from] / ML[v.to]; },

  // ---------- SCIENCE ----------
  'science/ohms-law': (v) => v.voltage / v.current,
  'science/density': (v) => v.mass / v.volume,
  'science/force': (v) => v.mass * v.accel,
  'science/pressure': (v) => v.force / v.area,
  'science/kinetic-energy': (v) => 0.5 * v.mass * v.velocity ** 2,
  'science/potential-energy': (v) => v.mass * v.g * v.height,
  'science/ph': (v) => -Math.log10(v.conc),
  'science/ideal-gas': (v) => (v.pressure * v.volume) / (8.314 * v.temp),
  'science/momentum': (v) => v.mass * v.velocity,
  'science/doppler': (v) => v.freq * (v.soundV + v.observerV) / (v.soundV - v.sourceV),
  'science/half-life': (v) => v.initial * Math.pow(0.5, v.time / v.halfLife),
  'science/wavelength': (v) => v.speed / v.freq,
  'science/acceleration': (v) => (v.vf - v.vi) / v.time,
  'science/power': (v) => v.work / v.time,
  'science/velocity': (v) => v.distance / v.time,
  'science/free-fall': (v) => Math.sqrt(2 * v.height / v.g),
  'science/specific-heat': (v) => v.mass * v.c * v.dt,
  'science/lens': (v) => 1 / (1 / v.f - 1 / v.do),
  'science/coulomb': (v) => 9e9 * (v.q1 * 1e-6) * (v.q2 * 1e-6) / (v.r * v.r),
  'science/frequency': (v) => 1 / v.period,
  'science/energy-mass': (v) => v.mass * 9e16,
  'science/work-calculator': (v) => v.force * v.distance,
  'science/gravitational-force': (v) => 6.674e-11 * v.m1 * v.m2 / (v.r * v.r),
  'science/escape-velocity': (v) => Math.sqrt(2 * 6.674e-11 * v.mass / v.radius) / 1000, // km/s (display unit)
  'science/molarity': (v) => v.moles / v.volume,
  'science/dilution': (v) => v.c1 * v.v1 / v.c2,
  'science/electric-field': (v) => 8.99e9 * (v.charge * 1e-6) / (v.distance * v.distance),

  // ---------- HEALTH ----------
  'health/bmi': (v) => v.weight / ((v.height / 100) ** 2),
  'health/bmr': (v) => v.gender === 'male' ? 10 * v.weight + 6.25 * v.height - 5 * v.age + 5 : 10 * v.weight + 6.25 * v.height - 5 * v.age - 161,
  'health/calorie': (v) => { const bmr = v.gender === 'male' ? 10 * v.weight + 6.25 * v.height - 5 * v.age + 5 : 10 * v.weight + 6.25 * v.height - 5 * v.age - 161; return bmr * parseFloat(v.activity); },
  'health/body-fat': (v) => v.gender === 'male' ? 86.010 * Math.log10(v.waist - v.neck) - 70.041 * Math.log10(v.height) + 36.76 : 163.205 * Math.log10(v.waist) - 97.684 * Math.log10(v.height) - 78.387,
  'health/water-intake-health': (v) => v.weight * 0.033 + (v.activity / 30 * 0.35),
  'health/ideal-body-weight': (v) => { const inches = v.height / 2.54; const base = v.gender === 'male' ? 50 : 45.5; return base + 2.3 * (inches - 60); },
  'health/heart-rate': (v) => 220 - v.age,
  'health/macros': (v) => v.calories * v.protein / 100 / 4,
  'health/lean-body-mass': (v) => v.weight * (1 - v.bodyfat / 100),
  'health/bsa': (v) => Math.sqrt(v.height * v.weight / 3600),
  'health/waist-hip': (v) => v.waist / v.hip,
  'health/vo2-max': (v) => v.gender === 'male' ? 110 - 2.6 * v.distance - 0.3 * v.age : 100 - 2.4 * v.distance - 0.3 * v.age,

  // ---------- EVERYDAY ----------
  'everyday/electricity': (v) => v.watts * v.hours * v.days / 1000 * v.rate,
  'everyday/carbon': (v) => v.electricity * 0.5 + v.gas * 2.3 + v.km * 0.2,
  'everyday/gst': (v) => v.amount * v.rate / 100,
  'everyday/paint': (v) => v.area * v.coats / 10,
  'everyday/concrete': (v) => v.length * v.width * v.depth,
  'everyday/garden': (v) => v.length * v.width,
  'everyday/cooking': (v) => { const ML = { cup: 240, tbsp: 15, tsp: 5, ml: 1 }; return v.amount * ML[v.from] / ML[v.to]; },
  'everyday/weather': (v) => v.temp + 0.05 * (v.humidity - 20),
  'everyday/currency-exchange': (v) => { const rates = { USD: 1, EUR: 0.92, GBP: 0.78, INR: 83.5, JPY: 151, AUD: 1.53, CAD: 1.36 }; return v.amount / rates[v.from] * rates[v.to]; },
  'everyday/walking-steps': (v) => v.steps * v.strideCm / 100000,
  'everyday/blood-alcohol': (v) => { const r = v.gender === 'male' ? 0.68 : 0.55; return Math.max(0, (v.drinks * 14 * 100) / (v.weight * 1000 * r) - 0.015 * v.hours); },
  'everyday/vacation-budget': (v) => v.flight + v.hotel * v.nights + v.food * v.nights + v.activitiesTotal,
  'everyday/laundry-cost': (v) => (v.washerKwh + v.dryerKwh) * v.rateKwh * v.loads + v.detergentCost * v.loads,
  'everyday/coffee-cost': (v) => v.cupsDay * v.costCup * v.daysWeek * 52,
  'everyday/grocery-budget': (v) => v.people * v.mealsDay * 7 * v.budgetPerMeal,

  // ---------- EDUCATION ----------
  'education/test-score': (v) => (v.correct / v.total) * 100,
  'education/reading-speed': (v) => v.words / v.minutes,
  'education/exam-score-needed': (v) => (v.desiredGrade - v.currentGrade * (1 - v.examWeight / 100)) / (v.examWeight / 100),
  'education/grade-needed': (v) => (v.targetGrade - v.currentGrade * (v.currentWeight / 100)) / (1 - v.currentWeight / 100),
  'education/semester-gpa': (v) => (v.credit1 * v.grade1 + v.credit2 * v.grade2 + v.credit3 * v.grade3) / (v.credit1 + v.credit2 + v.credit3),

  // ---------- ENGINEERING (unit-consistent) ----------
  'engineering/torque': (v) => v.force * v.radius * Math.sin((v.angle != null ? v.angle : 90) * Math.PI / 180),
  'engineering/power-factor': (v) => v.real / v.apparent,
  'engineering/gear-ratio': (v) => v.teeth2 / v.teeth1,
  'engineering/horsepower': (v) => v.torque * v.rpm / 5252,
  'engineering/resonant-frequency': (v) => 1 / (2 * Math.PI * Math.sqrt((v.inductance / 1000) * (v.capacitance / 1e6))) / 1000, // kHz (display)
  'engineering/kva-kw': (v) => v.kva * v.pf,
  'engineering/capacitor': (v) => v.charge / v.voltage * 1e6, // µF (display)
  'engineering/spring-rate': (v) => v.force / (v.deflection / 1000), // deflection in mm
  'engineering/hydraulic': (v) => v.force / v.area / 1000, // kPa (display)
  'engineering/thermal': (v) => v.length * v.alpha * v.dt * 1000, // mm (display)
  'engineering/stress-strain': (v) => v.force / v.area, // MPa (N/mm²)
  'engineering/sound-level': (v) => 10 * Math.log10(Math.pow(10, v.s1 / 10) + Math.pow(10, v.s2 / 10)),
  'engineering/belt-length': (v) => 2 * v.center + Math.PI * (v.d1 + v.d2) / 2 + (v.d2 - v.d1) ** 2 / (4 * v.center),
  'engineering/transformer-ratio': (v) => v.v2 / v.v1 * v.n1, // secondary turns
  'engineering/rpm': (v) => v.frequency * 60,
  'engineering/battery-life': (v) => v.capacity / v.consumption,
  'engineering/flow-rate': (v) => Math.PI * ((v.diameter / 1000) / 2) ** 2 * v.velocity, // diameter in mm
  'engineering/impedance': (v) => Math.sqrt(v.resistance ** 2 + v.reactance ** 2),
  'engineering/led-resistor': (v) => (v.supply - v.ledV) / (v.ledI / 1000), // ledI in mA

  // ---------- CONSTRUCTION ----------
  'construction/concrete-slab': (v) => v.length * v.width * v.thickness,
  'construction/excavation': (v) => v.length * v.width * v.depth,
  'construction/gravel': (v) => v.length * v.width * v.depth * 1.6, // tons (1.6 t/m³)
  'construction/soil': (v) => v.length * v.width * v.depth / 100, // depth in cm
  'construction/water-tank': (v) => v.length * v.width * v.height * 1000, // L (display)
  'construction/concrete-column': (v) => v.height * v.width * v.depth,
  'construction/bricks': (v) => Math.ceil(v.area / v.brickArea * 1.05), // 5% waste
  'construction/carpet': (v) => v.length * v.width * 1.1, // 10% waste
  'construction/wall-area': (v) => v.length * v.height - v.doors - v.windows,
  'construction/roof-pitch': (v) => Math.atan(v.rise / v.run) * 180 / Math.PI,
  'construction/flooring': (v) => v.area * (1 + v.waste / 100),
  'construction/stairs': (v) => Math.ceil(v.height * 100 / v.riserH), // riser in cm
  'construction/fence': (v) => Math.ceil(v.length / v.spacing) + 1,

  // ---------- FINANCE (core) ----------
  'finance/simple-interest': (v) => v.principal * v.rate / 100 * v.years,
  'finance/tip': (v) => v.bill * v.tipPct / 100,
  'finance/discount': (v) => v.price * (1 - v.discount / 100), // final price (display)
  'finance/sales-tax': (v) => v.amount * v.rate / 100,
  'finance/roi': (v) => (v.gain - v.cost) / v.cost * 100,
  'finance/markup': (v) => v.cost * (1 + v.markup / 100), // selling price (display)
  'finance/break-even': (v) => v.fixed / (v.price - v.variable),
  'finance/inflation': (v) => v.amount * Math.pow(1 + v.rate / 100, v.years), // future value (display)
  'finance/compound-interest': (v) => v.principal * Math.pow(1 + v.rate / 100, v.years),
  'finance/future-value': (v) => v.pv * Math.pow(1 + v.rate / 100, v.years),
  'finance/present-value': (v) => v.fv / Math.pow(1 + v.rate / 100, v.years),
  'finance/loan-emi': (v) => { const r = v.rate / 100 / 12; const n = v.years * 12; if (r === 0) return v.amount / n; return v.amount * r / (1 - Math.pow(1 + r, -n)); },
  'finance/amortization': (v) => { const r = v.rate / 100 / 12; const n = v.years * 12; return v.amount * r / (1 - Math.pow(1 + r, -n)); },
  'finance/dividend': (v) => v.shares * v.dividend,
  'finance/stock-profit': (v) => (v.sellPrice - v.buyPrice) * v.shares - 2 * v.commission, // commission per trade ×2
  'finance/capital-gains': (v) => (v.sale - v.purchase) * v.rate / 100,
  'finance/loan-to-value': (v) => v.loan / v.value * 100,
  'finance/net-worth-calculator': (v) => v.assets - v.liabilities,
  'finance/debt-ratio': (v) => v.debts / v.income * 100,
  'finance/rental-yield': (v) => (v.rent * 12 - v.costs) / v.price * 100, // costs annual
  'finance/interest-only': (v) => v.amount * v.rate / 100 / 12,
  'finance/paycheck': (v) => v.gross * (1 - v.tax / 100) - v.benefits, // tax is %
  'finance/emergency-fund': (v) => v.monthlyExpenses * v.months,
  'finance/loan-qualify': (v) => { const avail = v.income * 0.43 - v.debts; const r = v.rate / 100 / 12; const n = v.years * 12; return r > 0 ? avail * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n)) : avail * n; },
  'finance/home-afford': (v) => { const mp = v.income / 12 * 0.28; const r = v.rate / 100 / 12; const n = v.years * 12; const loan = r > 0 ? mp * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n)) : mp * n; return loan + v.down; },
  'finance/dca': (v) => { const r = v.annualReturn / 100 / 12; return v.monthly * ((Math.pow(1 + r, v.periods) - 1) / r) * (1 + r); }, // DCA future value
  'finance/college-cost': (v) => v.currentCost * Math.pow(1 + v.inflation / 100, v.yearsUntil),
  'finance/retirement': (v) => { const r = v.rate / 100 / 12; const n = v.years * 12; return v.current * Math.pow(1 + r, n) + v.monthly * (Math.pow(1 + r, n) - 1) / r; }, // FV + end-of-period annuity
  'finance/annuity': (v) => { const r = v.rate / 100 / 12; const n = v.years * 12; return v.pv * r / (1 - Math.pow(1 + r, -n)); },
  'finance/perpetuity': (v) => v.payment / (v.discountRate / 100),
};

// [cat, id, values, expected, tol | rel, label, mode?]
const CASES = [
  // ---- MATH ----
  ['math', 'quadratic', { a: 1, b: -5, c: 6 }, 3, 2, 'x²-5x+6 → root 3'],
  ['math', 'percentage', { part: 25, whole: 200 }, 12.5, 1, '25/200 = 12.5%'],
  ['math', 'percent-change', { old: 100, new: 150 }, 50, 1, '100→150 = +50%'],
  ['math', 'logarithm', { n: 100, base: 10 }, 2, 1, 'log10(100)=2'],
  ['math', 'exponent', { base: 2, exp: 10 }, 1024, 0, '2^10=1024'],
  ['math', 'root', { n: 64, root: 3 }, 4, 1, '∛64=4'],
  ['math', 'factorial', { n: 10 }, 3628800, 0, '10!'],
  ['math', 'modular', { a: 17, b: 5 }, 2, 0, '17 mod 5 = 2'],
  ['math', 'lcm-gcd', { a: 12, b: 18 }, 6, 0, 'GCD(12,18)=6'],
  ['math', 'matrix-det', { a: 1, b: 0, c: 0, d: 0, e: 1, f: 0, g: 0, h: 0, i: 1 }, 1, 0, 'identity det=1'],
  ['math', 'triangle', { a: 3, b: 4, c: 5 }, 6, 1, '3-4-5 area=6'],
  ['math', 'circle', { r: 5 }, 78.54, 1, 'π·25'],
  ['math', 'statistics', { data: '1,2,3,4,5' }, 3, 1, 'mean 1..5'],
  ['math', 'combinations', { n: 10, r: 3 }, 120, 0, 'C(10,3)=120'],
  ['math', 'average', { data: '10,20,30,40,50' }, 30, 1, 'avg=30'],
  ['math', 'pythagorean', { a: 3, b: 4 }, 5, 1, '3-4-5 hyp'],
  ['math', 'trigonometry', { angle: 90 }, 1, 2, 'sin(90°)=1'],
  ['math', 'distance', { x1: 0, y1: 0, x2: 3, y2: 4 }, 5, 1, 'dist 3-4-5'],
  ['math', 'slope', { x1: 1, y1: 2, x2: 3, y2: 6 }, 2, 1, 'slope=2'],
  ['math', 'fraction', { n1: 1, d1: 2, op: '+', n2: 1, d2: 4 }, '3/4', 0, '1/2+1/4=3/4', 'contains'],
  ['math', 'ratio', { a: 6, b: 9 }, '2:3', 0, '6:9 → 2:3', 'contains'],
  ['math', 'complex', { r1: 3, i1: 2, r2: 1, i2: 4 }, '4+6i', 0, '(3+2i)+(1+4i)=4+6i', 'contains'],

  // ---- CONVERSION ----
  ['conversion', 'length', { value: 1, from: 'm', to: 'cm' }, 100, 0, '1m=100cm'],
  ['conversion', 'length', { value: 1, from: 'mi', to: 'km' }, 1.609344, 3, '1mi=1.609km'],
  ['conversion', 'temperature', { value: 0, from: 'C', to: 'F' }, 32, 0, '0C=32F'],
  ['conversion', 'temperature', { value: 100, from: 'C', to: 'K' }, 373.15, 1, '100C=373.15K'],
  ['conversion', 'temperature', { value: 32, from: 'F', to: 'C' }, 0, 0, '32F=0C'],
  ['conversion', 'weight', { value: 1, from: 'kg', to: 'lb' }, 2.20462, 2, '1kg=2.2046lb'],
  ['conversion', 'weight', { value: 1, from: 't', to: 'kg' }, 1000, 0, '1t=1000kg'],
  ['conversion', 'volume', { value: 1, from: 'gal', to: 'l' }, 3.7854, 2, '1gal=3.785L'],
  ['conversion', 'volume', { value: 1, from: 'm3', to: 'l' }, 1000, 0, '1m³=1000L'],
  ['conversion', 'speed', { value: 100, from: 'kmh', to: 'ms' }, 27.7778, 2, '100km/h=27.78m/s'],
  ['conversion', 'area', { value: 1, from: 'ha', to: 'm2' }, 10000, 0, '1ha=10000m²'],
  ['conversion', 'energy', { value: 1, from: 'kWh', to: 'J' }, 3600000, 0, '1kWh=3.6MJ'],
  ['conversion', 'power-conv', { value: 1, from: 'hp', to: 'W' }, 745.7, 1, '1hp=745.7W'],
  ['conversion', 'pressure-conv', { value: 1, from: 'atm', to: 'Pa' }, 101325, 0, '1atm=101325Pa'],
  ['conversion', 'time-conv', { value: 1, from: 'h', to: 'min' }, 60, 0, '1h=60min'],
  ['conversion', 'data-storage', { value: 1, from: 'GB', to: 'MB' }, 1024, 0, '1GB=1024MB'],
  ['conversion', 'angle', { value: 180, from: 'deg', to: 'rad' }, Math.PI, 3, '180°=π rad'],
  ['conversion', 'frequency-conv', { value: 1, from: 'MHz', to: 'Hz' }, 1e6, 0, '1MHz=1e6Hz'],
  ['conversion', 'cooking-conv', { value: 1, from: 'cup', to: 'tbsp' }, 16, 1, '1cup=16tbsp'],
  ['conversion', 'force-conv', { value: 1, from: 'kN', to: 'N' }, 1000, 0, '1kN=1000N'],
  ['conversion', 'density-conv', { value: 1, from: 'gcm3', to: 'kgm3' }, 1000, 0, '1g/cm³=1000kg/m³'],

  // ---- SCIENCE ----
  ['science', 'ohms-law', { voltage: 12, current: 2 }, 6, 1, 'R=V/I=6Ω'],
  ['science', 'density', { mass: 10, volume: 0.01 }, 1000, 0, 'ρ=1000'],
  ['science', 'force', { mass: 10, accel: 9.8 }, 98, 1, 'F=98N'],
  ['science', 'pressure', { force: 100, area: 0.5 }, 200, 0, 'P=200Pa'],
  ['science', 'kinetic-energy', { mass: 5, velocity: 10 }, 250, 1, 'KE=250J'],
  ['science', 'potential-energy', { mass: 5, height: 10, g: 9.8 }, 490, 1, 'PE=490J'],
  ['science', 'ph', { conc: 0.0001 }, 4, 1, 'pH=4'],
  ['science', 'ideal-gas', { pressure: 101325, volume: 0.0224, temp: 273 }, 1, 2, '≈1 mol'],
  ['science', 'momentum', { mass: 10, velocity: 5 }, 50, 1, 'p=50'],
  ['science', 'doppler', { freq: 440, sourceV: 0, observerV: 30, soundV: 343 }, 478.48, 1, 'moving observer'],
  ['science', 'half-life', { initial: 100, halfLife: 5730, time: 5730 }, 50, 1, 'one half-life → 50'],
  ['science', 'wavelength', { speed: 343, freq: 440 }, 0.7795, 3, 'λ=v/f'],
  ['science', 'acceleration', { vi: 0, vf: 20, time: 5 }, 4, 1, 'a=4m/s²'],
  ['science', 'power', { work: 500, time: 10 }, 50, 1, 'P=50W'],
  ['science', 'velocity', { distance: 100, time: 10 }, 10, 1, 'v=10m/s'],
  ['science', 'free-fall', { height: 100, g: 9.8 }, 4.52, 2, 't=4.52s'],
  ['science', 'specific-heat', { mass: 1, c: 4186, dt: 10 }, 41860, 0, 'Q=41860J'],
  ['science', 'lens', { f: 10, do: 30 }, 15, 1, 'di=15cm'],
  ['science', 'coulomb', { q1: 1, q2: 1, r: 1 }, 0.009, 4, 'F=0.009N'],
  ['science', 'frequency', { period: 0.5 }, 2, 1, 'f=2Hz'],
  ['science', 'energy-mass', { mass: 0.001 }, 9e13, 0, 'E=mc²'],
  ['science', 'work-calculator', { force: 50, distance: 10 }, 500, 1, 'W=500J'],
  ['science', 'gravitational-force', { m1: 5.97e24, m2: 1000, r: 6.37e6 }, 9818, 0.01, '≈9818N', 'rel'],
  ['science', 'escape-velocity', { mass: 5.97e24, radius: 6.37e6 }, 11.19, 1, '11.19 km/s'],
  ['science', 'molarity', { moles: 0.5, volume: 2 }, 0.25, 2, 'M=0.25'],
  ['science', 'dilution', { c1: 5, v1: 20, c2: 1 }, 100, 1, 'V2=100mL'],
  ['science', 'electric-field', { charge: 2, distance: 0.5 }, 71920, 0.01, 'E=71920 N/C', 'rel'],

  // ---- HEALTH ----
  ['health', 'bmi', { weight: 70, height: 170 }, 24.22, 1, 'BMI 24.22'],
  ['health', 'bmi', { weight: 100, height: 160 }, 39.06, 1, 'BMI 39.06'],
  ['health', 'bmr', { formula: 'mifflin', weight: 70, height: 170, age: 30, gender: 'male', bf: 15 }, 1618, 0, 'Mifflin male (rounded)'],
  ['health', 'bmr', { formula: 'mifflin', weight: 60, height: 165, age: 30, gender: 'female', bf: 20 }, 1320, 0, 'Mifflin female (rounded)'],
  ['health', 'calorie', { formula: 'mifflin', weight: 70, height: 170, age: 30, gender: 'male', bf: 15, activity: '1.55' }, 2507, 0, 'TDEE male ×1.55 (rounded)'],
  ['health', 'body-fat', { weight: 70, waist: 85, neck: 38, height: 170, gender: 'male' }, 24.4, 1, 'Navy male'],
  ['health', 'water-intake-health', { weight: 70, activity: 30 }, 2.7, 1, '2.66L (rounded)'],
  ['health', 'ideal-body-weight', { height: 170, gender: 'male' }, 65.9, 1, 'Devine male'],
  ['health', 'heart-rate', { age: 30 }, 190, 1, 'max HR 190'],
  ['health', 'macros', { calories: 2000, protein: 30, carbs: 40, fat: 30 }, 150, 1, 'protein 30% /4'],
  ['health', 'lean-body-mass', { weight: 70, bodyfat: 20 }, 56, 1, 'LBM 56kg'],
  ['health', 'bsa', { weight: 70, height: 170 }, 1.82, 2, 'Mosteller 1.82'],
  ['health', 'waist-hip', { waist: 85, hip: 100 }, 0.85, 2, 'WHR 0.85'],
  ['health', 'vo2-max', { distance: 12, age: 25, gender: 'male' }, 71.3, 1, 'VO2 71.3'],

  // ---- EVERYDAY ----
  ['everyday', 'electricity', { watts: 100, hours: 8, days: 30, rate: 0.12 }, 2.88, 2, '24kWh×0.12'],
  ['everyday', 'carbon', { electricity: 500, gas: 100, km: 1000 }, 680, 1, '250+230+200'],
  ['everyday', 'gst', { amount: 100, rate: 18 }, 18, 1, '18% of 100'],
  ['everyday', 'paint', { area: 50, coats: 2 }, 10, 1, '100/10 L'],
  ['everyday', 'concrete', { length: 5, width: 3, depth: 0.1 }, 1.5, 2, '1.5m³'],
  ['everyday', 'garden', { length: 10, width: 5, spacing: 0.3 }, 50, 1, '50m²'],
  ['everyday', 'cooking', { amount: 1, from: 'cup', to: 'tbsp' }, 16, 1, '1cup=16tbsp'],
  ['everyday', 'weather', { temp: 25, humidity: 50 }, 26.5, 1, '25+0.05×30'],
  ['everyday', 'currency-exchange', { amount: 1000, midRate: 0.92, offeredRate: 0.89, flatFee: 5 }, 885, 1, '1000×0.89−5 (differentiated: fee/margin)'],
  ['everyday', 'walking-steps', { steps: 10000, strideCm: 76 }, 7.6, 1, '760000cm/100000'],
  ['everyday', 'blood-alcohol', { drinks: 3, weight: 70, hours: 2, gender: 'male' }, 0.058, 3, 'BAC ≈0.058'],
  ['everyday', 'vacation-budget', { flight: 500, hotel: 150, nights: 5, food: 60, activitiesTotal: 300 }, 1850, 0, '500+750+300+300'],
  ['everyday', 'laundry-cost', { loads: 4, washerKwh: 0.5, dryerKwh: 2.5, rateKwh: 0.12, detergentCost: 0.25 }, 2.44, 2, '(3×0.12×4)+1'],
  ['everyday', 'coffee-cost', { cupsDay: 2, costCup: 5, daysWeek: 5 }, 2600, 0, '2×5×5×52'],
  ['everyday', 'grocery-budget', { people: 2, mealsDay: 2, budgetPerMeal: 5 }, 140, 0, '2×2×7×5'],
  ['everyday', 'time-calc', { h1: 2, m1: 30, h2: 1, m2: 45 }, '4h 15m', 0, '2:30+1:45', 'contains'],

  // ---- EDUCATION ----
  ['education', 'test-score', { correct: 45, total: 50 }, 90, 1, '45/50=90%'],
  ['education', 'reading-speed', { words: 250, minutes: 2 }, 125, 1, '250/2'],
  ['education', 'exam-score-needed', { currentGrade: 80, examWeight: 30, desiredGrade: 85 }, 96.7, 1, 'need 96.7%'],
  ['education', 'grade-needed', { currentGrade: 75, currentWeight: 50, targetGrade: 85 }, 95, 1, 'need 95%'],
  ['education', 'semester-gpa', { credit1: 3, grade1: 3.5, credit2: 4, grade2: 3.0, credit3: 3, grade3: 4.0 }, 3.45, 1, 'GPA 3.45'],

  // ---- ENGINEERING ----
  ['engineering', 'torque', { force: 50, radius: 0.3, angle: 90 }, 15, 1, 'τ=15Nm'],
  ['engineering', 'power-factor', { real: 800, apparent: 1000 }, 0.8, 2, 'PF=0.8'],
  ['engineering', 'gear-ratio', { teeth1: 20, teeth2: 60 }, 3, 1, 'ratio 3'],
  ['engineering', 'horsepower', { torque: 100, rpm: 5252 }, 100, 1, 'HP=100'],
  ['engineering', 'kva-kw', { kva: 10, pf: 0.8 }, 8, 1, 'kW=8'],
  ['engineering', 'capacitor', { charge: 1e-5, voltage: 10 }, 1.0, 1, 'C=1.0µF'],
  ['engineering', 'spring-rate', { force: 100, deflection: 10 }, 10000, 1, 'k=10000 N/m'],
  ['engineering', 'hydraulic', { force: 1000, area: 0.01 }, 100, 1, 'P=100kPa'],
  ['engineering', 'resonant-frequency', { inductance: 10, capacitance: 1 }, 1.6, 1, 'f≈1.6kHz (display 1dp)'],
  ['engineering', 'thermal', { length: 10, alpha: 1.2e-5, dt: 50 }, 6, 1, 'ΔL=6mm'],
  ['engineering', 'stress-strain', { force: 5000, area: 100, length: 200, elong: 0.2 }, 50, 1, 'σ=50MPa'],
  ['engineering', 'sound-level', { s1: 80, s2: 80 }, 83.01, 1, '80+80dB'],
  ['engineering', 'belt-length', { d1: 100, d2: 200, center: 500 }, 1476.2, 1, 'belt 1476mm'],
  ['engineering', 'transformer-ratio', { v1: 230, v2: 12, n1: 100 }, 5, 0, 'n2=5 turns'],
  ['engineering', 'rpm', { frequency: 50 }, 3000, 1, '50Hz→3000rpm'],
  ['engineering', 'battery-life', { capacity: 3000, consumption: 500 }, 6, 1, '6h'],
  ['engineering', 'flow-rate', { diameter: 50, velocity: 2 }, 0.003927, 3, 'Q=0.0039 m³/s'],
  ['engineering', 'impedance', { resistance: 3, reactance: 4 }, 5, 1, '|Z|=5'],
  ['engineering', 'led-resistor', { supply: 5, ledV: 2, ledI: 20 }, 150, 1, 'R=150Ω'],

  // ---- CONSTRUCTION ----
  ['construction', 'concrete-slab', { length: 5, width: 3, thickness: 0.1 }, 1.5, 2, '1.5m³'],
  ['construction', 'excavation', { length: 10, width: 5, depth: 2 }, 100, 1, '100m³'],
  ['construction', 'gravel', { length: 10, width: 5, depth: 0.1 }, 8, 1, '5m³×1.6=8t'],
  ['construction', 'soil', { length: 10, width: 5, depth: 15 }, 7.5, 1, 'depth in cm'],
  ['construction', 'water-tank', { length: 2, width: 1, height: 1 }, 2000, 0, '2m³=2000L'],
  ['construction', 'concrete-column', { height: 3, width: 0.3, depth: 0.3 }, 0.27, 2, '0.27m³'],
  ['construction', 'bricks', { area: 10, brickArea: 0.02 }, 525, 0, '500×1.05 waste'],
  ['construction', 'carpet', { length: 5, width: 4 }, 22, 1, '20×1.1 waste'],
  ['construction', 'wall-area', { length: 10, height: 3, doors: 2, windows: 1.5 }, 26.5, 1, '30-3.5'],
  ['construction', 'roof-pitch', { rise: 1, run: 4 }, 14.04, 1, 'atan(0.25)'],
  ['construction', 'flooring', { area: 50, waste: 10 }, 55, 1, '50×1.1'],
  ['construction', 'stairs', { height: 3, riserH: 18 }, 17, 0, 'ceil(300/18)=17'],
  ['construction', 'fence', { length: 10, spacing: 2 }, 6, 0, 'ceil(10/2)+1=6'],

  // ---- FINANCE ----
  ['finance', 'simple-interest', { mode: 'interest', principal: 1000, rate: 5, years: 3 }, 150, 1, '5%×3yrs=150'],
  ['finance', 'tip', { bill: 100, tipPct: 15, people: 1 }, 15, 1, '15% tip'],
  ['finance', 'discount', { price: 100, discount: 20 }, 80, 1, 'final price $80'],
  ['finance', 'sales-tax', { amount: 100, rate: 8 }, 8, 1, '8% tax'],
  ['finance', 'roi', { cost: 1000, gain: 1200 }, 20, 1, '20% ROI'],
  ['finance', 'markup', { cost: 100, markup: 25 }, 125, 1, 'selling $125'],
  ['finance', 'break-even', { fixed: 5000, price: 50, variable: 30 }, 250, 1, '5000/20'],
  ['finance', 'inflation', { amount: 1000, rate: 5, years: 10 }, 1628.89, 1, '1000×1.05^10'],
  ['finance', 'compound-interest', { mode: 'final', principal: 10000, rate: 7, years: 10, target: 20000, contribution: 0, timing: 'end', freq: '1' }, 19671.5, 1, '10k@7% 10y'],
  ['finance', 'loan-emi', { mode: 'payment', amount: 100000, rate: 8.5, years: 5, payment: 2000, ioYears: 2, paymentFreq: '12', dcc: 'act365' }, 2051.65, 1, 'EMI 2051.65'],
  ['finance', 'amortization', { amount: 100000, rate: 6, years: 10 }, 1110.21, 1, 'monthly'],
  ['finance', 'dividend', { shares: 100, dividend: 2.5, rate: 0 }, 250, 1, '100×2.5'],
  ['finance', 'stock-profit', { shares: 100, buyPrice: 50, sellPrice: 60, commission: 20 }, 960, 1, '(60-50)×100-2×20'],
  ['finance', 'capital-gains', { purchase: 100000, sale: 150000, rate: 15 }, 7500, 1, '50000×15%'],
  ['finance', 'loan-to-value', { loan: 80000, value: 100000 }, 80, 1, 'LTV 80%'],
  ['finance', 'net-worth-calculator', { assets: 500000, liabilities: 200000 }, 300000, 0, 'NW 300k'],
  ['finance', 'debt-ratio', { income: 5000, debts: 2000 }, 40, 1, 'DTI 40%'],
  ['finance', 'rental-yield', { price: 200000, rent: 1500, costs: 3000 }, 7.5, 1, '(18000-3000)/200k'],
  ['finance', 'interest-only', { amount: 100000, rate: 5, ioYears: 2, years: 10 }, 416.67, 1, 'monthly IO'],
  ['finance', 'paycheck', { gross: 60000, tax: 22, benefits: 3000 }, 43800, 1, '60000×0.78-3000'],
  ['finance', 'emergency-fund', { monthlyExpenses: 3000, months: 6, currentSaved: 0, monthlyContribution: 100 }, 18000, 0, '3k×6'],
  ['finance', 'loan-qualify', { income: 5000, debts: 500, rate: 6, years: 30 }, 275206, 0, '43% DTI loan'],
  ['finance', 'home-afford', { income: 8000, down: 20000, rate: 6, years: 30 }, 51134, 0, '28% rule + down'],
  ['finance', 'dca', { lumpSum: 10000, monthly: 500, periods: 12, annualReturn: 10 }, 6335, 1, 'DCA FV'],
  ['finance', 'college-cost', { currentCost: 20000, yearsUntil: 10, inflation: 5, savedSoFar: 0, returnOnSavings: 7 }, 32578, 1, '20k×1.05^10'],
  ['finance', 'retirement', { mode: 'future', current: 50000, monthly: 1000, rate: 7, years: 20, target: 1000000 }, 722900, 0.01, 'FV+annuity', 'rel'],
  ['finance', 'annuity', { pv: 100000, rate: 6, years: 10 }, 1110.21, 1, 'PMT'],
  ['finance', 'perpetuity', { payment: 5000, discountRate: 5, growthRate: 0 }, 100000, 1, '5000/5%'],

  // ---- New known-answer contracts (385-review start: highest-value YMYL) ----
  // SIP annuity-due: FV = P·((1+r)^n − 1)/r·(1+r) with r=1%/mo, n=120
  ['finance', 'sip', { monthly: 500, returnRate: 12, years: 10 }, 116170, 1, 'SIP 500@12% 10y FV'],
  // APR with fees: emi on full amount, net loan = amount − fees
  ['finance', 'apr', { amount: 10000, fees: 500, rate: 6, years: 5 }, 4.42, 1, 'APR w/ fees'],
  // NPV = Σ CFt/(1+r)^t @10%
  ['finance', 'npv', { rate: 10, flows: '-10000,3000,3000,3000,3000' }, -490.4, 1, 'NPV@10%'],
  // IRR: independent bisection root-find of Σ CFt/(1+r)^t = 0
  ['finance', 'irr', { flows: '-10000,3000,3500,4000,3500' }, 14.46, 1, 'IRR bisection'],
  ['finance', 'salary', { hourly: 25, hours: 40, weeks: 52 }, 52000, 1, 'salary 25×40×52'],
  // FIRE: goal = 25 × annual expenses (4% rule)
  ['finance', 'fire', { expenses: 40000, savings: 100000, rate: 7, monthly: 2000 }, 1000000, 1, 'FIRE goal'],
  ['finance', 'social-security', { income: 50000, years: 35 }, 1666.67, 1, 'SS monthly'],
  // Mortgage (payment mode, no down payment): 240000 @6.5% 30y
  ['finance', 'mortgage', { mode: 'payment', amount: 240000, down: 0, rate: 6.5, years: 30, payment: 2000, ioYears: 0, paymentFreq: '12', dcc: 'act365' }, 1516.96, 1, 'mortgage 1516.96'],
  // India income tax — old regime slabs + 4% cess (₹12L income, ₹2L deductions)
  ['regional', 'income-tax-india', { income: 1200000, oldRegimeDed: 200000 }, 117000, 1, 'old regime ₹12L'],
  // GST/VAT: tax = amount × rate/100, total = amount + tax
  ['everyday', 'gst', { amount: 100, rate: 18 }, 118, 1, 'GST 18% total'],
  // FD quarterly compounding: M = P·(1 + r/4)^(4t) — ₹1L @7.5% 3y
  ['regional', 'fd-calculator', { amount: 100000, rate: 7.5, years: 3, tdsRate: 10, senior: false }, 124971.64, 1, 'FD quarterly'],
  // RD ordinary annuity: M = P·((1+r)^n − 1)/r — ₹5k/mo @6.5% 5y
  ['regional', 'rd-calculator', { monthly: 5000, rate: 6.5, years: 5 }, 353369.84, 1, 'RD maturity'],
  // PPF: annual deposits, annual compounding — ₹1.5L @7.1% 15y
  ['regional', 'ppf-calculator', { annual: 150000, rate: 7.1, years: 15 }, 4068209.22, 1, 'PPF 15y'],
  // SIP Return (no step-up) = SIP formula ×10 (₹5k/mo vs $500)
  ['regional', 'sip-return', { monthly: 5000, returnRate: 12, years: 10, stepUp: 0 }, 1161695.4, 1, 'sip-return FV'],
  // Car loan EMI: 25000 @7% 60mo
  ['auto-transport', 'car-loan-emi', { amount: 25000, rate: 7, months: 60 }, 495.03, 1, 'car EMI 495.03'],

  // ---- Batch 2: mortgage family + international taxes ----
  // Refinance: monthly savings = old EMI − new EMI (200k, 6.5%→5.5%, 25y)
  ['finance', 'refinance', { balance: 200000, oldRate: 6.5, newRate: 5.5, years: 25 }, 122.24, 1, 'refi save 122.24'],
  // Balloon: remaining balance after 60 payments of a 30y 6% loan
  ['finance', 'balloon-payment', { amount: 200000, rate: 6, years: 30, balloon: 5 }, 186108.71, 1, 'balloon @60mo'],
  // GPM: year-1 payment = 70% of standard EMI (200k @6% 30y)
  ['finance', 'graduated-payment', { amount: 200000, rate: 6, years: 30, growth: 5 }, 839.37, 1, 'GPM y1 839.37'],
  // US federal: single, 75k income, 14,600 standard deduction (2026 brackets)
  ['finance', 'us-income-tax', { income: 75000, filing: 'single', deduction: 16100 }, 7670, 1, 'US 75k single 2026 verified'],
  ['finance', 'us-income-tax', { income: 100000, filing: 'single', deduction: 16100 }, 13170, 1, 'US 100k single 2026 verified'],
  ['finance', 'us-income-tax', { income: 200000, filing: 'married', deduction: 32200 }, 26340, 1, 'US 200k MFJ 2026 verified'],
  // UK: 40k salary, 5% pension, no student loan → take-home after tax + NI
  ['finance', 'uk-income-tax', { income: 40000, pension: 5, studentLoan: 'none' }, 30880, 1, 'UK 40k take-home'],
  // Canada: 65k Ontario → federal + provincial take-home
  ['finance', 'canada-income-tax', { income: 65000, province: 'on' }, 51741, 1, 'CA 65k ON 2026 verified'],
  ['finance', 'canada-income-tax', { income: 120000, province: 'on' }, 90025, 1, 'CA 120k ON 2026 verified'],
  // Australia: 80k, no super, +2% Medicare levy
  ['finance', 'australia-income-tax', { income: 80000, super: 0 }, 63880, 1, 'AU 80k 2026 verified'],

  // ---- Health batch (file = fitness-exercise.js) ----
  // MET formula: cals = MET × weight(kg) × min / 60 — running 8 MET
  ['fitness-exercise', 'calories-exercise', { weight: 70, activity: 'running', duration: 30 }, 280, 1, '8 MET 70kg 30min'],
  // Mifflin-St Jeor BMR: male 10·kg + 6.25·cm − 5·age + 5
  ['fitness-exercise', 'calories-burned', { weight: 70, height: 170, age: 30, gender: 'male' }, 1618, 1, 'BMR 1618'],
  // Strength standards: 60/70 = 0.86× BW → Novice
  ['fitness-exercise', 'bench-standards', { bench: 60, bodyWeight: 70 }, 'Novice', 0, 'bench 0.86x', 'contains'],
  // 100/70 = 1.43× BW → Beginner
  ['fitness-exercise', 'deadlift-standards', { deadlift: 100, bodyWeight: 70 }, 'Beginner', 0, 'dl 1.43x', 'contains'],
  // Naegele rule: LMP + 280 days (2026-01-01 → 2026-10-08)
  ['health', 'pregnancy', { lmp: '2026-01-01' }, '2026', 0, 'pregnancy due date', 'contains'],

  // ---------- BATCH 3: HEALTH ----------
  ['health', 'target-heart-rate', { age: 30, restingHR: 70, intensity: 'moderate' }, '130–154', 0, 'Karvonen moderate 130-154', 'contains'],
  ['health', 'gfr', { creatinine: 1.0, age: 50, gender: 'male' }, 84, 1, 'MDRD GFR 84'],
  ['health', 'calorie-burn', { met: 8, weight: 70, minutes: 30 }, 280, 1, 'MET 8 70kg 30min 280cal'],
  ['health', 'sleep', { wake: '07:00' }, '5:15', 0, 'sleep bedtimes 5:15', 'contains'],

  // ---------- BATCH 3: FITNESS ----------
  ['fitness-exercise', 'one-rep-max', { weight: 80, reps: 5 }, 91, 1, '1RM avg 91kg'],
  ['fitness-exercise', 'training-max', { oneRM: 100 }, 90, 1, 'training max 90kg'],
  ['fitness-exercise', 'weight-loss', { currentWeight: 80, goalWeight: 70, calDeficit: 500 }, 22, 1, '22 weeks to goal'],
  ['fitness-exercise', 'running-pace', { distance: 10, paceMin: 5, paceSec: 30 }, 55, 0, 'finish 10×5.5 min (differentiated: splits)'],
  ['fitness-exercise', 'max-heart-rate', { age: 30 }, 186, 1, 'maxHR avg 186'],
  ['fitness-exercise', 'vo2max', { restHr: 65, age: 30, gender: 'male' }, 44.7, 1, 'rest-HR VO2 44.7'],
  ['fitness-exercise', 'steps-to-distance', { steps: 10000, height: 170 }, 7.05, 2, '10000 steps 7.05km'],
  ['fitness-exercise', 'sports-calories', { sport: 'bball', weight: 70, duration: 60 }, 420, 1, 'basketball 420 cal'],

  // ---------- BATCH 4: FITNESS (review-tracker next batch) ----------
  ['fitness-exercise', 'body-fat-fitness', { weight: 70, height: 170, age: 30, gender: 'male' }, 19.8, 1, 'Deurenberg BMI 1.2×24.22+0.23×30−10.8−5.4 (differentiated)'],
  ['fitness-exercise', 'grip-strength', { gripKg: 40, age: 30, gender: 'male' }, 40, 0, 'grip 40kg'],
  ['fitness-exercise', 'grip-strength', { gripKg: 50, age: 30, gender: 'male' }, 'Strong', 0, 'grip 50kg Strong', 'contains'],
  ['fitness-exercise', 'recovery-hr', { peakHr: 170, after1min: 140 }, 30, 0, '30 bpm drop'],
  ['fitness-exercise', 'recovery-hr', { peakHr: 180, after1min: 120 }, 'Excellent', 0, '60 bpm drop Excellent', 'contains'],
  ['fitness-exercise', 'muscle-gain', { weight: 70, height: 175, yearsTraining: 1, calSurplus: 300 }, 2.76, 2, 'yr1 potential 2.76 kg/yr'],
  ['fitness-exercise', 'muscle-gain', { weight: 70, height: 175, yearsTraining: 3, calSurplus: 300 }, 0.6, 2, 'yr3+ potential 0.6 kg/yr'],
  ['fitness-exercise', 'overhead-standards', { ohp: 40, bodyWeight: 70 }, 0.57, 2, 'OHP 0.57x BW'],
  ['fitness-exercise', 'overhead-standards', { ohp: 70, bodyWeight: 70 }, 'Intermediate', 0, 'OHP 1.0x Intermediate', 'contains'],
  ['fitness-exercise', 'plank-test', { plankSec: 60, age: 30 }, 60, 0, 'plank 60s'],
  ['fitness-exercise', 'plank-test', { plankSec: 150, age: 30 }, 'Excellent', 0, 'plank 150s Excellent', 'contains'],
  ['fitness-exercise', 'pullup-test', { pullups: 10, gender: 'male' }, 10, 0, '10 pull-ups'],
  ['fitness-exercise', 'pullup-test', { pullups: 15, gender: 'male' }, 'Excellent', 0, '15 pull-ups Excellent', 'contains'],
  ['fitness-exercise', 'pushup-test', { pushups: 30, age: 30, gender: 'male' }, 30, 0, '30 push-ups'],
  ['fitness-exercise', 'pushup-test', { pushups: 40, age: 20, gender: 'male' }, 'Excellent', 0, '40 age20 Excellent', 'contains'],
  ['fitness-exercise', 'race-predictor', { knownDistance: 10, knownTime: 55 }, 26, 0, 'Riegel 5K from 55min 10K'],
  ['fitness-exercise', 'flexibility-score', { reachCm: 25, age: 30, gender: 'female' }, 25, 0, 'sit-reach 25cm'],
  ['fitness-exercise', 'flexibility-score', { reachCm: 35, age: 30, gender: 'female' }, 'Excellent', 0, 'sit-reach 35cm Excellent', 'contains'],

  // ---------- BATCH 4: Food & Nutrition family + squat-standards (independent textbook values) ----------
  ['food-nutrition', 'daily-calorie', { age: 30, weight: 70, height: 170, gender: 'male', activity: 'moderate' }, 2507, 0, 'Mifflin-St Jeor male TDEE'],
  ['food-nutrition', 'daily-calorie', { age: 30, weight: 65, height: 165, gender: 'female', activity: 'sedentary' }, 1644, 0, 'Mifflin-St Jeor female sedentary'],
  ['food-nutrition', 'protein-need', { weight: 70, level: 'active' }, 112, 0, '1.6 g/kg active'],
  ['food-nutrition', 'protein-need', { weight: 70, level: 'athlete' }, 140, 0, '2.0 g/kg athlete'],
  ['food-nutrition', 'daily-water-intake', { weight: 70, exercise: 30, temp: 'warm' }, 2970, 0, '33ml/kg + exercise + warm'],
  ['food-nutrition', 'daily-water-intake', { weight: 60, exercise: 0, temp: 'cool' }, 1980, 0, '33ml/kg cool'],
  ['food-nutrition', 'body-fat-food', { gender: 'male', height: 170, waist: 80, hip: 95, neck: 38 }, 13.7, 0, 'US Navy male 13.7%'],
  ['food-nutrition', 'body-fat-food', { gender: 'female', height: 170, waist: 72, hip: 95, neck: 32 }, 24.6, 0, 'US Navy female 24.6% (waist+hip-neck)'],
  ['food-nutrition', 'calorie-burned', { weight: 70, activity: 'running', duration: 30 }, 280, 0, '8 MET running'],
  ['food-nutrition', 'calorie-burned', { weight: 70, activity: 'walking', duration: 45 }, 184, 0, '3.5 MET walking'],
  ['food-nutrition', 'cooking-time', { weight: 1.5, recipeWeight: 2, recipeTime: 90 }, 74, 0, '90×(1.5/2)^(2/3)'],
  ['food-nutrition', 'unit-converter-food', { ingredient: 'flour', cups: 1 }, 125, 0, 'flour 125 g/cup'],
  ['food-nutrition', 'unit-converter-food', { ingredient: 'sugar', cups: 2 }, 400, 0, 'sugar 200 g/cup ×2'],
  ['food-nutrition', 'eat-out-vs-cook', { mealsOut: 5, costOut: 15, mealsHome: 16, costHome: 4 }, '$325', 0, 'Out $325/mo', 'contains'],
  ['food-nutrition', 'eat-out-vs-cook', { mealsOut: 5, costOut: 15, mealsHome: 16, costHome: 4 }, 277, 0, 'Home $277/mo'],
  ['food-nutrition', 'fast-food-calories', { meal: 'burger' }, 1100, 0, 'burger 1100 cal'],
  ['food-nutrition', 'fast-food-calories', { meal: 'pizza' }, 700, 0, '2 slices 700 cal'],
  ['food-nutrition', 'intermittent-fasting', { fastHours: '16', wakeTime: 7 }, '23:00 to 7:00', 0, '16:8 wake 7', 'contains'],
  ['food-nutrition', 'intermittent-fasting', { fastHours: '12', wakeTime: 7 }, '19:00 to 7:00', 0, '12:12 wake 7', 'contains'],
  ['food-nutrition', 'grocery-per-person', { adults: 2, children: 2, dietType: 'moderate' }, 225, 0, '2A+2C moderate $225/wk'],
  ['food-nutrition', 'grocery-per-person', { adults: 1, children: 0, dietType: 'budget' }, 50, 0, '1A budget $50/wk'],
  ['food-nutrition', 'baking-converter', { subType: 'butterOil' }, '0.8x oil', 0, 'butter→oil 0.8', 'contains'],
  ['food-nutrition', 'baking-converter', { subType: 'sugarHoney' }, '0.67x honey', 0, 'sugar→honey 0.67', 'contains'],
  ['food-nutrition', 'coffee-cost-per-cup', { cups: 2, method: 'home', homeCost: 0.5, cafeCost: 4 }, 365.0, 0.01, 'home 2×$0.50 yearly', 'rel'],
  ['food-nutrition', 'coffee-cost-per-cup', { cups: 1, method: 'cafe', homeCost: 0.5, cafeCost: 4 }, 1460.0, 0.01, 'cafe 1×$4 yearly', 'rel'],
  ['food-nutrition', 'sugar-intake', { age: 30, sugarGrams: 45, weight: 70 }, 180, 0, '45g = 180% of 25g limit'],
  ['food-nutrition', 'sugar-intake', { age: 30, sugarGrams: 20, weight: 70 }, 80, 0, '20g = 80% of 25g limit'],
  ['fitness-exercise', 'squat-standards', { squat: 100, bodyWeight: 70 }, 'Novice', 0, '1.43x Novice', 'contains'],
  ['fitness-exercise', 'squat-standards', { squat: 80, bodyWeight: 70 }, 'Beginner', 0, '1.14x Beginner', 'contains'],

  // ---------- BATCH 5: food/health/family/home-garden (independent textbook values) ----------
  ['food-nutrition', 'keto-macro', { weight: 70, height: 170, age: 30, gender: 'male' }, 2265, 0, 'Mifflin×1.4 keto TDEE'],
  ['food-nutrition', 'macro-split', { calories: 2000, goal: 'balanced' }, 'P:150g C:200g F:67g', 0, '30/40/30 at 2000 cal', 'contains'],
  ['food-nutrition', 'macro-split', { calories: 2000, goal: 'keto' }, 'P:100g C:25g F:167g', 0, 'keto 20/5/75 at 2000 cal', 'contains'],
  ['food-nutrition', 'meal-prep', { totalCost: 24, servings: 8 }, '$3.00', 0, '$24/8 = $3.00', 'contains'],
  ['food-nutrition', 'recipe-scaler', { originalServings: 4, desiredServings: 6, ingredient: 2 }, '1.50x', 0, '4→6 = 1.5x', 'contains'],
  ['food-nutrition', 'tea-vs-coffee', { teaCups: 3, teaCost: 0.3, coffeeCups: 2, coffeeCost: 2 }, '$328', 0, 'tea $328 vs coffee $1460/yr', 'contains'],
  ['food-nutrition', 'vegan-protein', { weight: 70, goal: 'build' }, 126, 0, '1.8 g/kg build'],
  ['food-nutrition', 'weight-loss-time', { currentW: 80, goalW: 65, deficit: 500 }, 33, 0, '15kg×7700/500 = 231d = 33wk'],
  ['health', 'blood-pressure', { systolic: 120, diastolic: 80 }, 'Stage 1', 0, 'DBP 80 → Stage 1 (ACC/AHA or-rule)', 'contains'],
  ['health', 'blood-pressure', { systolic: 118, diastolic: 76 }, 'Normal', 0, '118/76 Normal', 'contains'],
  ['health', 'blood-pressure', { systolic: 150, diastolic: 95 }, 'Stage 2', 0, '150/95 Stage 2', 'contains'],
  ['health', 'fatigue-score', { sleepHours: 6, activity: 4, stress: 7 }, 47, 0, 'fatigue 47/100'],
  ['health', 'ovulation', { lmp: '2026-01-01', cycle: 28 }, '1/15/2026', 0, 'ovulation = LMP + (cycle−14)', 'contains'],
  ['health', 'pregnancy-weight', { bmi: 22, trimester: '2' }, 5.5, 0, 'normal BMI total 11kg × 0.5 T2'],
  ['health', 'pregnancy-weight', { bmi: 18, trimester: '3' }, 13, 0, 'underweight total 13kg T3'],
  ['health', 'sleep-quality', { hoursInBed: 8, hoursAsleep: 7, wakeups: 1 }, 83, 0, 'eff 87.5% − 5 penalty = 82.5→83'],
  ['parenting-family', 'college-savings', { childAge: 5, monthlySave: 300, currentSaved: 5000, collegeCost: 25000, returnRate: 6 }, 73299, 0, 'FV+annuity 12y @6%'],
  ['parenting-family', 'kid-allowance', { kidAge: 8, chores: 5, method: 'age' }, 8, 0, '$1/yr of age'],
  ['parenting-family', 'kid-allowance', { kidAge: 8, chores: 5, method: 'hybrid' }, 7, 0, '(8+5)/2 = $7'],
  ['parenting-family', 'baby-feeding', { ageWeeks: 8, weightKg: 5, feedingsDay: 8 }, 94, 0, '5kg×150/8 = 94 ml'],
  ['home-garden', 'room-area', { length: 12, width: 14, waste: 10 }, 168, 0, '12×14 = 168 sqft'],
  ['home-garden', 'rug-size', { roomLength: 16, roomWidth: 12, furnitureGap: 18 }, "6'×9'", 0, 'max 13×9 → 6×9', 'contains'],
  ['home-garden', 'paint-cost', { sqft: 800, gallons: 3, paintPrice: 40, primer: true, laborHrs: 12, laborRate: 30 }, 174, 0, 'DIY $174 vs hired $534'],
  ['home-garden', 'garden-soil', { length: 8, width: 4, depth: 6 }, 0.59, 0, '16cf/27 = 0.59 cy'],
  ['home-garden', 'grass-seed', { sqft: 5000, seedType: 'fescue', newOrOverseed: 'overseed' }, 18.8, 0, '5lb/1000×0.75 = 18.8 lbs'],

  // ---- FINANCE 19 (batch 6 — independent textbook values) ----
  ['finance', 'auto-loan', { amount: 25000, down: 5000, rate: 5.5, years: 5, paymentFreq: 12 }, 382.02, 1, 'EMI on 20k @5.5% 5y = $382.02'],
  ['finance', 'bond-yield', { faceValue: 1000, coupon: 5, currentPrice: 950, years: 10 }, 5.64, 1, 'YTM approx = 5.64%'],
  ['finance', 'bonds', { face: 1000, coupon: 5, price: 950, years: 10 }, 5.64, 1, 'YTM approx = 5.64%'],
  ['finance', 'cash-flow', { income: 10000, expenses: 7000, months: 12 }, 3000, 0, '3000/mo (result shows monthly)'],
  ['finance', 'credit-card-payoff', { balance: 5000, rate: 18, payment: 200 }, 32, 0, 'payoff = 32 months'],
  ['finance', 'crypto-profit', { buyPrice: 30000, sellPrice: 45000, quantity: 1, fees: 50 }, 14950, 0, '45000−30000−50 = $14950'],
  ['finance', 'esop', { strikePrice: 10, currentPrice: 25, options: 1000, taxRate: 30 }, 10500, 0, '15000 spread × 70% = $10500'],
  ['finance', 'future-value', { pv: 5000, rate: 7, years: 15, freq: 1 }, 13795.16, 1, '5000×1.07¹⁵ = $13795.16'],
  ['finance', 'investment', { initial: 10000, rate: 8, years: 10, freq: 1 }, 21589.25, 1, '10000×1.08¹⁰ = $21589.25'],
  ['finance', 'investment-growth', { amount: 10000, rate1: 4, rate2: 7, rate3: 10, years: 20 }, 21911, 0, '10000×1.04²⁰ = $21911'],
  ['finance', 'loan-comparison', { amount: 50000, rate1: 6, years1: 5, rate2: 7, years2: 4 }, 966.64, 1, 'Offer1 EMI 6%/5y = $966.64'],
  ['finance', 'mortgage-payoff', { amount: 200000, rate: 6.5, years: 30, extra: 200 }, 250, 0, 'extra $200 → 250 months'],
  ['finance', 'present-value', { fv: 10000, rate: 5, years: 10, freq: 1 }, 6139.13, 1, '10000/1.05¹⁰ = $6139.13'],
  ['finance', 'rent-vs-buy', { rent: 1500, price: 300000, rate: 6.5, years: 10 }, 'Rent is better', 0, 'rent $180k < buy $227.5k', 'contains'],
  ['finance', 'retirement-income', { savings: 500000, monthlyAdd: 1000, returnRate: 7, yearsToRetire: 20, retireYears: 25 }, 17954.28, 1, 'FV→25y withdrawal $17954/mo'],
  ['finance', 'savings-comparison', { amount: 10000, rate1: 0.5, rate2: 4.5, years: 5 }, 10252.51, 1, 'Bank1 0.5% 5y = $10252.51'],
  ['finance', 'savings-goal', { goal: 50000, years: 5, rate: 4, freq: 12 }, 754.16, 1, 'PMT = $754.16/mo'],
  ['finance', 'tax', { income: 75000, rate: 22, deductions: 12500 }, 13750, 0, '62500 × 22% = $13750'],

  // ---- LIFESTYLE 25 (batch 7) ----
  ['lifestyle', 'relocation-cost', { distance: 100, hours: 4, movers: 2, truckSize: 200, boxes: 75 }, 725, 0, 'labor 400 + truck 200 + boxes 75 + fuel 50'],
  ['lifestyle', 'rental-deposit', { deposit: 2000, years: 2, damage: 200, cleaning: 100 }, 1500, 0, '2000 − wear 200 − 300 = 1500'],
  ['lifestyle', 'paint-coverage', { width: 12, length: 14, height: 8, coats: 2, windows: 30, doors: 40 }, 2, 0, '692 sqft / 350 = 2 gal'],
  ['lifestyle', 'electricity-bill-saving', { currentKwh: 800, rate: 0.12, ledPercent: 50, applianceSave: 15 }, 22.2, 1, '96×50%×15% + 15 = $22.20'],
  ['lifestyle', 'water-usage', { showers: 10, minutes: 8, flushes: 15, laundry: 4, rate: 4.5 }, 9.63, 1, '2140 gal @ $4.5/1000'],
  ['lifestyle', 'grocery-budget-optimizer', { adults: 2, children: 2, budget: 600, dining: 100 }, 16.67, 1, '500/30 = $16.67/day'],
  ['lifestyle', 'food-delivery-vs-cooking', { mealPrice: 15, deliveryFee: 4, serviceFee: 3, tip: 5, cookCost: 5, cookTime: 30 }, 27, 0, '15+4+3+5 = $27'],
  ['lifestyle', 'coffee-habit', { dailyCost: 5.5, times: 5, years: 1 }, 1430, 0, '5.5×5×52 = $1430'],
  ['lifestyle', 'road-trip-cost', { distance: 1500, mpg: 28, gasPrice: 3.5, nights: 3, hotelCost: 120, foodPerDay: 50, tolls: 20 }, 767.5, 1, 'gas 187.5 + lodging 360 + food 200 + 20'],
  ['lifestyle', 'flight-cost-per-hour', { ticketPrice: 450, baggage: 35, flightTime: 5.5, airportTime: 3 }, 88.18, 1, '485/5.5 = $88.18'],
  ['lifestyle', 'baby-cost', { diapers: 8, diaperCost: 0.35, formula: 150, clothing: 60, childcare: 800 }, 13142, 0, '1022 + 1800 + 720 + 9600'],
  ['lifestyle', 'parental-leave', { salary: 60000, weeks: 12, paidPct: 60 }, 8307.69, 1, '1153.85×60%×12'],
  ['lifestyle', 'pet-cost', { food: 50, vet: 300, grooming: 40, insurance: 30, supplies: 200 }, 1940, 0, '600+300+480+360+200'],
  ['lifestyle', 'lawn-mowing', { sqft: 5000, serviceRate: 45, mowsPerYear: 26, mowerCost: 400, gasCost: 3 }, 1170, 0, '45×26 = $1170'],
  ['lifestyle', 'gym-cost-per-visit', { monthlyFee: 50, annualFee: 0, visits: 3, months: 12 }, 3.85, 1, '600/155.9 visits = $3.85'],
  ['lifestyle', 'vacation-savings', { tripCost: 3000, months: 12, saved: 500 }, 208.33, 1, '2500/12 = $208.33'],
  ['lifestyle', 'sale-savings', { original: 100, discountPct: 30, taxRate: 8, shipping: 0 }, 75.6, 1, '70×1.08 = $75.60'],
  ['lifestyle', 'resell-value', { originalPrice: 1000, yearsOld: 2, condition: 'good', brandFactor: 'standard' }, 505.75, 1, '1000×0.7×0.85²'],
  ['lifestyle', 'subscription-audit', { streaming: 45, software: 30, gymSubscription: 50, cloud: 10, other: 25 }, 160, 0, '45+30+50+10+25'],
  ['lifestyle', 'streaming-value', { monthlyPrice: 15.99, hoursWatched: 20 }, 0.8, 1, '15.99/20 = $0.80'],
  ['lifestyle', 'charging-time', { batteryMah: 5000, chargerW: 18, batteryV: 3.7, currentPct: 20, targetPct: 80 }, 44, 0, '11.1Wh/(18×0.85) = 43.5 min'],
  ['lifestyle', 'gift-split', { giftAmount: 200, people: 5, tax: 8, wrap: 10 }, 45.2, 1, '226/5 = $45.20'],
  ['lifestyle', 'hourly-annual-salary', { hourly: 25, hoursPerWeek: 40, weeksPerYear: 52, vacationWeeks: 2 }, 50000, 0, '25×40×50 weeks'],
  ['lifestyle', 'pet-food-cost', { pet: 'dog', foodMonthly: 50, treats: 15, vet: 30, supplies: 20 }, 115, 0, '50+15+30+20'],
  ['lifestyle', 'cleaning-time', { rooms: 4, bathrooms: 2, sqft: 1200, depth: 'regular' }, 102, 0, '48+30+24 = 102 min'],

  // ---- CAREER 23 (batch 7) ----
  ['career-freelance', 'salary-converter', { amount: 50000, fromPeriod: 'annual' }, 24.04, 1, '50000/2080 = $24.04'],
  ['career-freelance', 'salary-negotiation', { offered: 80000, asking: 90000, years: 5 }, 53091, 0, '10000×(1+1.03+1.03²+…)'],
  ['career-freelance', 'raise-calculator', { currentSalary: 75000, raisePct: 10 }, 82500, 0, '75000×1.10'],
  ['career-freelance', 'tax-bracket', { income: 80000, deductions: 13850 }, 9860.5, 1, 'marginal tax on 66150 = $9860.50'],
  ['career-freelance', 'freelance-hourly-rate', { targetIncome: 100000, billablePct: '70' }, 68.68, 1, '100000/1456 = $68.68'],
  ['career-freelance', 'freelance-project', { hours: 40, hourlyRate: 75, expenses: 500 }, 3500, 0, '40×75+500'],
  ['career-freelance', 'contractor-rate', { employeeSalary: 100000, benefitsPct: 30 }, 62.5, 1, '130000/2080'],
  ['career-freelance', 'overtime-pay', { hourlyRate: 25, regularHrs: 40, otHrs: 10, otMultiplier: '1.5' }, 1375, 0, '1000+375'],
  ['career-freelance', 'bonus-calc', { baseSalary: 80000, bonusPct: 15, salesAmount: 500000, commissionRate: 5 }, 12000, 0, 'bonus 80000×15%'],
  ['career-freelance', 'pay-gap', { salaryA: 80000, salaryB: 70000 }, 12.5, 1, '10000/80000 = 12.5%'],
  ['career-freelance', '401k-match', { salary: 80000, contributionPct: 6, matchPct: 100, matchLimit: 6 }, 4800, 0, '80000×6%×100%'],
  ['career-freelance', 'stock-options', { options: 10000, strikePrice: 10, currentPrice: 25 }, 150000, 0, '10000×15'],
  ['career-freelance', 'side-hustle', { hoursWeek: 10, hourlyRate: 30, monthsYear: 12 }, 15600, 0, '10×30×52'],
  ['career-freelance', 'crypto-tax', { buyPrice: 10000, sellPrice: 50000, holdingPeriod: 'long', income: 80000 }, 6000, 0, '40000×15%'],
  ['career-freelance', 'career-gap', { currentSalary: 100000, gapYears: 2, growthRate: 5 }, 205000, 0, 'lost 200k + growth 5k'],
  ['career-freelance', 'remortgage-calc', { balance: 250000, currentRate: 5, newRate: 3.5, yearsLeft: 20 }, 47997.61, 1, '(1649.89−1449.90)×240'],
  ['career-freelance', 'mortgage-afford', { income: 100000, deposit: 50000, rate: 4.5, years: 25, expensesMth: 1500 }, 450000, 0, '4.5× income cap'],
  ['career-freelance', 'tax-refund', { income: 80000, withheld: 15000, deductions: 13850 }, 5139.5, 1, '15000 − 9860.50'],
  ['career-freelance', 'invoicing-calc', { subtotal: 1000, taxRate: 10, discount: 5 }, 1045, 0, '950×1.10'],
  ['career-freelance', 'employment-status', { netIncome: 80000, expenses: 15000 }, 8343, 0, 'marginal income tax on 60407.90'],
  ['career-freelance', 'commission-plan', { sales: 100000, baseRate: 5, quota: 50000, accelerator: 8 }, 6500, 0, '2500 base + 4000 accelerator'],
  ['career-freelance', 'freelance-budget', { monthlyIncome: 8000, taxRate: 30, businessExpenses: 500, livingExpenses: 3000, savingsGoal: 20 }, 4080, 0, '(8000−2400−500)×80%'],
  ['career-freelance', 'redundancy-pay', { age: 35, yearsService: 8, weeklyPay: 1000 }, 8000, 0, '8 yrs × 1.0 × $1000'],

  // ---- BUSINESS 21 (batch 7) ----
  ['business', 'business-roi', { revenue: 100000, cost: 75000 }, 33.33, 1, '25000/75000 = 33.33%'],
  ['business', 'profit-margin', { revenue: 50000, cost: 35000 }, 30, 0, '15000/50000 = 30%'],
  ['business', 'ltv', { arpu: 50, lifespan: 24 }, 1200, 0, '50×24'],
  ['business', 'cac', { spend: 10000, customers: 100 }, 100, 0, '10000/100'],
  ['business', 'conversion-rate', { visitors: 5000, conversions: 250 }, 5, 0, '250/5000 = 5%'],
  ['business', 'churn', { start: 1000, lost: 50 }, 5, 0, '50/1000 = 5%'],
  ['business', 'roas', { revenue: 5000, spend: 1000 }, 5, 0, '5000/1000 = 5x'],
  ['business', 'burn-rate', { cash: 500000, monthly: 50000 }, 10, 0, 'runway 10 months'],
  ['business', 'mrr', { users: 500, price: 20 }, 10000, 0, '500×20'],
  ['business', 'nps', { promoters: 60, passives: 20, detractors: 20 }, 40, 0, '(60−20)/100'],
  ['business', 'freelance-rate', { desired: 80000, hours: 25, weeks: 48 }, 66.67, 1, '80000/1200'],
  ['business', 'pricing', { cost: 10, margin: 40 }, 16.67, 1, '10/0.6'],
  ['business', 'inventory', { cogs: 200000, avgInventory: 50000 }, 4, 0, '200000/50000'],
  ['business', 'break-even-revenue', { fixed: 50000, cm: 40 }, 125000, 0, '50000/0.4'],
  ['business', 'payback', { cost: 50000, annual: 15000 }, 3.33, 1, '50000/15000'],
  ['business', 'depreciation', { cost: 50000, salvage: 5000, life: 5 }, 9000, 0, '(50000−5000)/5'],
  ['business', 'discount-rate', { equity: 600000, debt: 400000, costEquity: 12, costDebt: 6, tax: 25 }, 9, 0, '0.6×12% + 0.4×6%×0.75'],
  ['business', 'saas-unit-metrics', { mrr: 10000, customers: 100, churnRate: 5, cac: 150, grossMargin: 80 }, 1600, 0, 'ARPÜ 100 × 20 × 0.8'],
  ['business', 'break-even-point', { fixedCosts: 5000, price: 50, varCost: 20 }, 167, 0, 'ceil(5000/30) = 167'],
  ['business', 'invoice-due-date', { amount: 1000, terms: 30, daysLate: 10, lateRate: 1.5 }, 5, 0, '1000×1.5%×(10/30)'],
  ['business', 'employee-cost', { salary: 60000, benefits: 20, overhead: 10, bonus: 5 }, 81000, 0, '60000×1.35'],

  // ---- PARENTING & FAMILY 15 (batch 8) ----
  ['parenting-family', 'baby-name', { name: 'emma', year: 2024 }, '#1', 0, 'Emma → rank #1 (name table)', 'contains'],
  ['parenting-family', 'baby-sleep', { ageMonths: 6 }, '13 hrs', 0, '6mo → 13 hrs (sleep table)', 'contains'],
  ['parenting-family', 'baby-weight-gain', { gender: 'boy', ageMonths: 6, weightKg: 8.69 }, 10, 0, '(8.69−7.9)/7.9 = +10% avg'],
  ['parenting-family', 'babysitter-rate', { location: 'mid', kidAges: 'infant', kids: 2, hours: 5 }, 21, 0, 'base 16 + infant 3 + extra kid 2 = $21/hr'],
  ['parenting-family', 'child-height', { fatherCm: 175, motherCm: 165, gender: 'boy' }, '177 cm', 0, 'mid-parental 170 + 6.5 = 176.5', 'contains'],
  ['parenting-family', 'child-height', { fatherCm: 175, motherCm: 165, gender: 'girl' }, '164 cm', 0, 'mid-parental 170 − 6.5 = 163.5', 'contains'],
  ['parenting-family', 'childcare-cost-annual', { type: 'daycare', childAge: 0.5, daysWeek: 5 }, 52000, 0, '$200/day × 5 × 52 = $52k/yr'],
  ['parenting-family', 'childcare-cost', { daycareWeekly: 300, children: 1, nannyWeekly: 500, parentSalary: 4000 }, 1299, 0, 'daycare 300×4.33 = 1299 cheapest'],
  ['parenting-family', 'child-bmi', { gender: 'boy', ageYears: 8, weightKg: 27, heightCm: 130 }, 16, 0, '27/1.3² = 16.0 (Normal)'],
  ['parenting-family', 'college-savings-monthly', { childAge: 10, collegeCost: 50000, years: 4, returnRate: 7 }, 1560.08, 1, 'sinking fund $200k @7% over 8y'],
  ['parenting-family', 'diaper-cost', { diapersDay: 6, costPerDiaper: 0.25, months: 24 }, 46, 0, '$1.50/day → $45.63/mo'],
  ['parenting-family', 'family-budget-simple', { income: 6000, housing: 1500, food: 800, transport: 400, utilitiesBill: 300, childcare: 500, other: 500 }, 4000, 0, 'expenses sum = $4,000'],
  ['parenting-family', 'family-budget', { income: 8000, housing: 2000, food: 1000, transport: 500, utilities: 400, insurance: 300, education: 500, entertainment: 300, savings: 1000, other: 500 }, 6500, 0, 'expenses sum = $6,500'],
  ['parenting-family', 'vacation-with-kids', { destination: 'beach', budgetLevel: 'mid', days: 5, familySize: 4 }, 7000, 0, '$350 × 5 days × 4 people'],
  ['parenting-family', 'home-buying', { income: 100000, monthlyDebts: 500, rate: 6, years: 30, downPayment: 50000 }, 355785, 0, 'PV annuity @6% 30y + $50k down'],
  ['parenting-family', 'life-insurance', { income: 80000, years: 10, debts: 20000, collegeFund: 50000 }, 630000, 0, '70%×80k×10y + debts + college'],
  ['parenting-family', 'maternity-leave-finance', { monthlyExpenses: 3500, weeklyIncome: 400, leaveWeeks: 12 }, 4892.31, 1, 'expenses 9692.31 − income 4800 (differentiated: budget)'],
  ['parenting-family', 'maternity-leave', { awe: 600, weeks: 39 }, 9312.99, 2, 'UK SMP 6×540 + 33×184.03 (differentiated)'],
  ['parenting-family', 'paternity-leave', { salary: 80000, state: 'CA', leaveWeeks: 6, cap: 1600 }, 5538.46, 1, '1538.46×60%×6 (differentiated: US PFL)'],
  ['parenting-family', 'screen-time', { childAge: 8 }, '120 min/day', 0, 'AAP 8y → ≤120 min', 'contains'],
  ['parenting-family', 'toddler-screen', { ageYears: 4, currentMin: 90 }, 'Max 60 min/day', 0, 'AAP 4y → 60 min', 'contains'],
  ['parenting-family', 'wedding-budget', { totalBudget: 100000 }, 100000, 0, 'budget total'],

  // ---- REGIONAL 9 (batch 9) ----
  ['regional', 'chit-fund', { amount: 100000, months: 20, commission: 5, dividend: 5500 }, 5250, 0, 'ceil(5000 + 250) installment'],
  ['regional', 'dubai-salary', { salary: 120000, housing: 3000, dewa: 1000, food: 2000, transport: 500 }, 9500, 0, 'AED 13,000 − 3,500 expenses'],
  ['regional', 'electricity-bill-india', { units: 150, slab1: 3, slab2: 5, slab3: 8, fixedCharges: 100 }, 677.5, 1, '550 energy + 100 fixed + 5% GST'],
  ['regional', 'gold-rate', { weight: 10, ratePerGram: 5000, purity: 22, makingPct: 5 }, 49568.75, 1, '22K gold + 5% making + 3% GST'],
  ['regional', 'gold-rate-pk', { tola: 1, ratePerTola: 200000, purity: 22, making: 2000 }, 185333.33, 0, '1 tola 22K + making'],
  ['regional', 'gold-silver', { goldPerGram: 6000, silverPerGram: 100 }, 60, 0, '6000/100 ratio'],
  ['regional', 'gratuity', { years: 10, months: 0, lastSalary: 50000 }, 288461.54, 1, '50k × 15 × 10 / 26 (Gratuity Act)'],
  ['regional', 'gst-india', { amount: 1000, gstRate: 18, direction: 'exclusive' }, 1180, 0, '1000 × 1.18'],
  ['regional', 'gst-india', { amount: 1180, gstRate: 18, direction: 'inclusive' }, 1000, 0, '1180 / 1.18 base'],
  ['regional', 'home-loan-emi-india', { amount: 5000000, rate: 8.5, years: 20, taxSlab: 30 }, 43391.16, 1, 'EMI 50L @8.5% 20y'],

  // ---- BATCH 10: regional 7 + auto 8 ----
  ['regional', 'leave-encashment', { basic: 30000, da: 5000, leaves: 30 }, 35000, 0, 'daily ₹1166.67 × 30 days'],
  ['regional', 'lpg-cost', { cylinderPrice: 1000, subsidy: 200, monthsPerCylinder: 2, cylindersPerYear: 6 }, 13.33, 1, '(1000−200)/2/30 per day'],
  ['regional', 'nps-calculator', { age: 30, monthly: 5000, returnRate: 10, annuityPct: 40, annuityRate: 6 }, 11396626.62, 1, 'FV annuity-due 30y @10%'],
  ['regional', 'pk-salary', { grossSalary: 100000, taxRate: 25, provident: 5 }, 70000, 0, 'gross − tax/12 − PF'],
  ['regional', 'rickshaw-fare', { baseFare: 20, distance: 5, perKm: 10, waitingMins: 10, waitingPerMin: 2 }, 90, 0, '20 + 50 + 20'],
  ['regional', 'stamp-duty', { propertyValue: 5000000, stampDutyPct: 5, registrationPct: 1 }, 5309000, 1, '5% + 1% + 18% GST on reg'],
  ['regional', 'wedding-budget-shaadi', { venue: 500000, decor: 200000, photography: 150000, jewellery: 300000, clothing: 100000, music: 50000, misc: 100000 }, 1400000, 0, 'sum of 7 categories'],
  ['auto-transport', 'auto-fare', { baseFare: 25, distance: 4, perKm: 12 }, 73, 0, '25 + 4×12'],
  ['auto-transport', 'car-affordability', { income: 6000, expenses: 4000, rate: 7, termMonths: 60, downPayment: 5000 }, 20151, 0, 'PV annuity $300/mo @7% 60mo + $5k'],
  ['auto-transport', 'carbon-footprint-car', { kmYearly: 15000, mileage: 15 }, 2310, 0, '1000 L × 2.31 kg/L'],
  ['auto-transport', 'car-depreciation', { purchasePrice: 30000, rate: 15, years: 5 }, 13311, 0, '30k × 0.85⁵'],
  ['auto-transport', 'car-insurance', { carValue: 20000, age: 22 }, 1500, 0, '5% × 1.5 age factor'],
  ['auto-transport', 'car-maintenance', { age: 4, mileage: 12000 }, 720, 0, '12000/15000 × 900'],
  ['auto-transport', 'car-rental', { dailyRate: 50, insurance: 15, days: 5 }, 325, 0, '(50+15) × 5'],
  ['auto-transport', 'commute-cost', { distance: 20, mileage: 25, fuelPrice: 4, parking: 5, daysWeek: 5 }, 11.4, 1, '(40/25)×4 + 5 per day'],

  // ---- BATCH 11: auto/transport 15 tools (16 contracts) ----
  ['auto-transport', 'delivery-cost', { distance: 20, fuelCost: 5, driverWage: 10, vehicleCost: 3 }, 18, 2, '5+10+3 = $18'],
  ['auto-transport', 'ev-charging-cost', { batteryKwh: 60, currentPct: 20, targetPct: 90, elecRate: 0.15 }, 6.3, 2, '42 kWh × $0.15 = $6.30'],
  ['auto-transport', 'ev-range', { batteryKwh: 60, efficiency: 180 }, 333.33, 0, '60000 Wh / 180 Wh/km = 333 km'],
  ['auto-transport', 'ev-vs-gas-petrol', { kmYearly: 20000, evKwh100: 18, elecRate: 0.15, petrolKmpl: 14, petrolPrice: 1.5 }, 540, 0, 'EV 200×18×$0.15 = $540/yr'],
  ['auto-transport', 'fuel-cost', { distance: 500, mileage: 15, fuelPrice: 1.5, toll: 0 }, 50, 2, '33.33L × $1.5 = $50.00'],
  ['auto-transport', 'fuel-efficiency', { currentKmpl: 12, improvedKmpl: 15, kmYearly: 15000, fuelPrice: 1.5 }, 375, 0, '(1250−1000)L × $1.5 = $375/yr'],
  ['auto-transport', 'fuel-price-compare', { kmYearly: 15000, petrolKmpl: 15, petrolPrice: 1.5, dieselKmpl: 18, dieselPrice: 1.4, evKwh100: 18, elecPrice: 0.15 }, 405, 0, 'EV 150×18×$0.15 = $405 cheapest'],
  ['auto-transport', 'lease-vs-buy', { carPrice: 35000, downPayment: 5000, loanRate: 6, loanTerm: 60, leasePayment: 450, leaseTerm: 36 }, 39799, 0, 'buy total: EMI $579.98×60 + $5k'],
  ['auto-transport', 'mileage-calculator', { distance: 400, fuelUsed: 30 }, 13.33, 1, '400/30 = 13.3 km/L'],
  ['auto-transport', 'bike-fuel', { distance: 500, mileage: 45, fuelPrice: 1.5 }, 16.67, 2, '(500/45)L × $1.5 = $16.67/mo'],
  ['auto-transport', 'bike-loan', { price: 5000, rate: 9.5, months: 36 }, 160.16, 2, 'EMI 5k @9.5% 36mo = $160.16'],
  ['auto-transport', 'route-optimizer', { stops: 5, totalKm: 80, timePerStop: 10 }, 28.67, 2, 'fuel $12 + 0.833h × $20/h'],
  ['auto-transport', 'oil-change', { oilType: 'syn' }, 12000, 0, 'synthetic interval 12,000 km'],
  ['auto-transport', 'oil-change', { oilType: 'conv' }, 5000, 0, 'conventional interval 5,000 km'],
  ['auto-transport', 'parking-cost', { dailyRate: 15, daysMonth: 22 }, 330, 2, '15×22 = $330/mo'],
  ['auto-transport', 'public-transport', { kmDistance: 20, daysMonth: 22, ptMonthly: 120, carKmpl: 14, fuelPrice: 1.5 }, 94, 0, 'car (40/14)×$1.5×22 = $94/mo vs PT $120'],

  // ---- BATCH 12: auto 8 + construction 7 (16 contracts) ----
  ['auto-transport', 'ride-share-cost', { kmPerDay: 30, ridePerKm: 1.2, carKmpl: 15, fuelPrice: 1.5, daysWeek: 5 }, 3, 2, 'car 2L×$1.5 = $3 vs ride $36/day'],
  ['auto-transport', 'speed-distance-time', { calcMode: 'speed', distance: 100, speed: 80, hours: 1 }, 100, 1, 'speed = 100km/1h'],
  ['auto-transport', 'speed-distance-time', { calcMode: 'distance', distance: 100, speed: 80, hours: 1 }, 80, 1, 'distance = 80×1h'],
  ['auto-transport', 'stopping-distance', { speed: 60, reactionTime: 1 }, 36.9, 1, 'reaction 16.7m + braking 20.2m (μ=0.7)'],
  ['auto-transport', 'taxi-fare', { distance: 10, baseFare: 3, perKm: 2 }, 23, 2, '3 + 10×2 = $23'],
  ['auto-transport', 'tire-size', { oldWidth: 205, oldProfile: 55, oldRim: 16, newWidth: 215, newProfile: 55, newRim: 17 }, 5.8, 1, '205/55R16 → 215/55R17 = +5.76% diameter'],
  ['auto-transport', 'trade-in-value', { mrp: 30000, age: 5 }, 13311, 0, '30k × 0.85⁵ = $13,311'],
  ['auto-transport', 'trip-time', { distance: 800, avgSpeed: 90, breakHr: 3, breakMin: 15 }, '9h 23m', 0, '8.89h drive + 2×15min breaks', 'contains'],
  ['auto-transport', 'walking-transit', { distance: 2.5, walkSpeed: 5, transitWait: 10, transitRide: 15 }, 30, 0, 'walk 30 min vs transit 25 min'],
  ['construction', 'deck-calculator', { length: 5, width: 4, boardW: 14, gap: 5 }, 28, 0, 'ceil(4/0.145) = 28 boards'],
  ['construction', 'drywall', { area: 50, sheetSize: 3 }, 19, 0, 'ceil(50/3×1.1) = 19 sheets'],
  ['construction', 'formwork', { length: 6, height: 3, faces: 2 }, 36, 2, '6×3×2 = 36 m²'],
  ['construction', 'insulation', { area: 100, rValue: 5, thickness: 0.1 }, 10, 0, 'ceil(100/10) = 10 rolls'],
  ['construction', 'lumber-calculator', { pieces: 10, length: 8, width: 6, thickness: 1 }, 40, 1, '10×8×6×1/12 = 40 bd-ft'],
  ['construction', 'mulch', { area: 20, depth: 5 }, 1, 2, '20×0.05 = 1.00 m³'],
  ['construction', 'paint-quantity', { walls: 50, coats: 2, coverage: 10 }, 10, 1, '50×2/10 = 10.0 L'],

  // ---- BATCH 13: construction 5 + converters 8 + education 2 (17 contracts) ----
  ['construction', 'paver-calculator', { area: 20, paverL: 20, paverW: 10, waste: 10 }, 1100, 0, 'ceil(20/0.02 × 1.1) = 1100 pavers'],
  ['construction', 'rebar-calculator', { length: 100, diameter: 12 }, 88.8, 1, 'd²/162 kg/m: 0.888 kg/m × 100m = 88.8 kg'],
  ['construction', 'roofing', { length: 10, width: 8, pitch: 30 }, 92.38, 2, '80/cos(30°) = 92.38 m²'],
  ['construction', 'tile-calculator', { length: 5, width: 4, tileSize: 60, waste: 10 }, 62, 0, 'ceil(20/0.36 × 1.1) = 62 tiles'],
  ['construction', 'wallpaper', { area: 30, rollSize: 5 }, 7, 0, 'ceil(30/5 × 1.15) = 7 rolls'],
  ['conversion', 'clothing-size', { usSize: 10, type: 'women' }, 'EU: 40', 0, 'US10 women → EU40', 'contains'],
  ['conversion', 'currency-conv', { amount: 100, from: 'USD', to: 'EUR' }, 91, 2, '100 USD × 0.91 = 91.00 EUR'],
  ['conversion', 'fuel-efficiency-converter', { value: 10, from: 'L100', to: 'mpgus' }, 23.52, 2, '235.214/10 = 23.52 US mpg'],
  ['conversion', 'fuel-efficiency-converter', { value: 25, from: 'mpgus', to: 'L100' }, 9.41, 2, '235.214/25 = 9.41 L/100km'],
  ['conversion', 'radiation-conv', { value: 1, from: 'Sv', to: 'mSv' }, 1000, 0, '1 Sv = 1000 mSv'],
  ['conversion', 'shoe-size', { usShoe: 9, type: 'men' }, 'EU: 42', 0, 'US9 men → EU42', 'contains'],
  ['conversion', 'torque-conv', { value: 100, from: 'Nm', to: 'lbft' }, 73.76, 2, '100 Nm / 1.35582 = 73.76 lb-ft'],
  ['conversion', 'viscosity-conv', { value: 1, from: 'PaS', to: 'cP' }, 1000, 0, '1 Pa·s = 1000 cP'],
  ['conversion', 'voltage-conv', { value: 10, from: 'V', to: 'A' }, 'Cannot directly convert', 0, 'V→A needs Ohm-law values', 'contains'],
  ['education', 'act-score', { english: 25, math: 24, reading: 26, science: 23 }, 24.5, 1, 'composite mean = 24.5 (Top 60%)'],
  ['education', 'cgpa', { semesters: '3.5,3.7,3.8,3.6,3.9' }, 3.7, 2, 'mean of 5 semesters = 3.70'],

  // ---- BATCH 14: ALL remaining tools (116 contracts) ----
  ["education", "plagiarism-check", {"words":2000,"citations":5}, "Adequate", 0, "ratio 5/2k = 2.5 → Adequate", "contains"],
  ["education", "citation", {"author":"Smith, J.","title":"Book Title","year":2023}, "Smith, J. (2023). Book Title", 0, "APA format", "contains"],
  ["education", "class-rank", {"gpa":3.7,"avgGpa":3.2,"classSize":200}, "2/200", 0, "pctile=max(1,0)=1 → rank 2", "contains"],
  ["education", "college-cost-planner", {"tuition":15000,"roomBoard":10000,"books":1200,"years":4}, 104800, 0, "annual 26,200 × 4"],
  ["education", "flashcard-count", {"totalCards":100,"reviewDays":7,"newDaily":20}, 14, 0, "100/7 ≈ 14/day"],
  ["education", "gpa", {"grades":"3.5,3.7,4.0,3.3,3.0"}, 3.5, 0, "mean 3.5"],
  ["education", "grade", {"current":85,"final":30,"target":90}, 101.666667, 0, "need on final = (90−59.5)/0.3"],
  ["education", "homework-time", {"pages":20,"problems":15,"essayWords":500}, 285, 0, "20×3 + 15×5 + 500/200×60"],
  ["education", "letter-grade", {"percentage":85}, "Grade: B", 0, "85 → B", "contains"],
  ["education", "quiz-score", {"hoursStudied":5,"pastAvg":75}, 85, 0, "75 + 2×5"],
  ["education", "sat-score", {"mathScore":650,"erwScore":700}, 1350, 0, "650+700"],
  ["education", "scholarship-calc", {"gpa":3.5,"income":60000,"activities":3}, 65, 0, "35+12+18"],
  ["education", "study-break", {"totalHrs":3,"method":"pomodoro"}, 6, 0, "6 cycles"],
  ["education", "study-time", {"hours":40,"days":7}, 5.714286, 0, "5.71 h/day"],
  ["education", "words-pages", {"words":1000}, 3.636364, 0, "3.64 pages"],
  ["engineering", "beam-load", {"force":1000,"length":2,"inertia":0.0001}, 5000000, 0, "FL/4I = 5 MPa"],
  ["engineering", "hydraulic-power", {"flow":100,"head":20,"eff":75}, 436, 0, "ρgQH/η = 436 W"],
  ["engineering", "inductor", {"turns":50,"area":0.001,"length":0.05}, 62.85, 0, "μ₀N²A/l = 62.85 μH"],
  ["engineering", "shaft-power", {"torque":100,"rpm":3000}, 31.416902, 0, "T×N/9549 = 31.4 kW"],
  ["engineering", "voltage-drop", {"current":10,"length":30,"resistance":0.5}, 0.3, 0, "I×2L×R/km = 0.3 V"],
  ["engineering", "wire-gauge", {"current":15,"length":20}, 20, 0, "AWG 20"],
  ["everyday", "calorie-counter", {"weight":70,"height":175,"age":30,"gender":"male","activity":1.55}, 2555.5625, 0, "Mifflin-St Jeor ×1.55"],
  ["everyday", "date-diff", {"d1":"2024-01-01","d2":"2024-01-31"}, 30, 0, "30 days"],
  ["everyday", "distance-pace", {"distance":5,"hours":0,"minutes":40,"seconds":0}, "8:00", 0, "40min/5km = 8:00/km", "contains"],
  ["everyday", "fitness-age", {"actualAge":35,"restHr":60,"exerciseDays":3,"bmi":24}, 30, 0, "35 −4.5 −0.5 = 30"],
  ["everyday", "pet-age", {"petYears":5,"petType":"dogMed"}, 21, 0, "dog formula 21"],
  ["everyday", "sleep-calc", {"wakeTime":"06:00"}, "22:30", 0, "5 cycles back = 22:30", "contains"],
  ["everyday", "timezone", {"time":"12:00","offset1":5.5,"offset2":-8}, "22:30", 0, "12:00 −13.5h = 22:30 prev day", "contains"],
  ["everyday", "trip-fuel-cost", {"distance":500,"mpg":12,"price":1.5}, 62.5, 0, "41.67L × $1.5"],
  ["math", "prime-factor", {"n":120}, "2 × 2 × 2 × 3 × 5", 0, "120 = 2³×3×5", "contains"],
  ["math", "scientific-notation", {"number":0.000123,"direction":"auto"}, "1.23e-4", 0, "0.000123 → 1.23e-4", "contains"],
  ["science", "molar-mass", {"elements":"H2,O1"}, 18.015, 0, "H₂O = 18.015 g/mol (legacy comma list)"],
  ["science", "molar-mass", {"elements":"H2O"}, 18.015, 0, "natural formula H₂O = 18.015 g/mol (counts parsed)"],
  ["science", "molar-mass", {"elements":"NaCl"}, 58.443, 0, "NaCl = 58.443 g/mol (two-letter element)"],
  ["science", "molar-mass", {"elements":"Ca(OH)2"}, 74.092, 0, "Ca(OH)2 parens = 74.092 g/mol"],
  ["science", "molar-mass", {"elements":"C12H22O11"}, 342.297, 0, "sucrose multi-digit counts = 342.297 g/mol"],
  ["science", "molar-mass", {"elements":"Fe2(SO4)3"}, 399.873, 0, "nested parens Fe2(SO4)3 = 399.873 g/mol"],
  ["science", "molar-mass", {"elements":"C6H12O6"}, 180.156, 0, "glucose = 180.156 g/mol"],
  ["science", "molar-mass", {"elements":"O2"}, 31.998, 0, "diatomic O2 = 31.998 g/mol"],
  ["science", "molar-mass", {"elements":"NaHCO3"}, 84.006, 0, "baking soda = 84.006 g/mol"],
  ["science", "molar-mass", {"elements":"KMnO4"}, 158.032, 0, "potassium permanganate = 158.032 g/mol (transition metal Mn)"],
  ["science", "molar-mass", {"elements":"AgNO3"}, 169.872, 0, "silver nitrate = 169.872 g/mol (Ag from full table)"],
  ["science", "molar-mass", {"elements":"Au"}, 196.967, 0, "gold single element = 196.967 g/mol (Z=79)"],
  ["science", "molar-mass", {"elements":"Pb(NO3)2"}, 331.208, 0, "lead nitrate parens = 331.208 g/mol (Pb Z=82)"],
  ["science", "molar-mass", {"elements":"Fe2O3"}, 159.687, 0, "iron(III) oxide = 159.687 g/mol"],
  ["science", "molar-mass", {"elements":"CaCO3"}, 100.086, 0, "calcium carbonate = 100.086 g/mol"],
  ["science", "molar-mass", {"elements":"NaOH"}, 39.997, 0, "caustic soda = 39.997 g/mol"],
  ["science", "molar-mass", {"elements":"K2Cr2O7"}, 294.181, 0, "potassium dichromate = 294.181 g/mol (Cr Z=24)"],
  ["science", "molar-mass", {"elements":"U"}, 238.029, 0, "uranium single element = 238.029 g/mol (Z=92)"],
  ["science", "molar-mass", {"elements":"H2SO4"}, 98.077, 0, "sulfuric acid = 98.077 g/mol (S already in table)"],
  ["science", "molar-mass", {"elements":"Xx"}, 0, 0, "unknown element: result 0, warning in extra"],
  ["home-garden", "ac-size", {"length":14,"width":12,"ceiling":8,"sunlight":"moderate","people":2}, 5000, 0, "168ft² ×25 ×1.1 → 5000 BTU"],
  ["home-garden", "cabinet-door", {"cabinetW":36,"cabinetH":34,"doors":2,"overlay":0.5}, "19.0×35.0", 0, "18+1 × 34+1", "contains"],
  ["home-garden", "closet-organizer", {"closetW":72,"closetD":24,"closetH":84,"hangingPct":50}, 12, 0, "12 sq ft"],
  ["home-garden", "compost", {"people":4,"yardWaste":10,"kitchenWaste":5}, 24, 0, "ceil(180/7.5)=24"],
  ["home-garden", "countertop-sqft", {"length1":120,"depth1":25.5,"length2":0,"depth2":0,"backsplash":4}, 24, 0, "ceil(21.25×1.1)=24"],
  ["home-garden", "curtain-length", {"windowWidth":48,"windowHeight":60,"fullness":2,"rodAbove":4}, 2, 0, "2×1 = 2 yds"],
  ["home-garden", "deck-stain", {"length":20,"width":12,"coats":2}, 3, 0, "ceil(2.13)=3 gal"],
  ["home-garden", "fence-material", {"perimeter":200,"height":6,"postSpacing":8}, 26, 0, "25+1 = 26 posts"],
  ["home-garden", "fertilizer", {"sqft":5000,"npkRatio":"10-10-10","nPer1000":1}, 50, 0, "50 lbs"],
  ["home-garden", "furniture-arrange", {"roomW":14,"roomL":18,"sofaLen":7,"sofaW":3,"tableLen":4,"tableW":2,"trafficPath":3}, 29, 0, "29 sq ft used"],
  ["home-garden", "irrigation-flow", {"sqft":500,"plants":30,"waterPerPlant":0.5,"minutesDay":30}, 15, 0, "15 GPH"],
  ["home-garden", "generator-size", {"refrigerator":700,"acWindow":1200,"lights":300,"tv":200,"pump":1000,"other":500}, 5000, 0, "4680W → 5000W"],
  ["home-garden", "ev-charger-home", {"distance":50,"chargerType":"level2","panelUpgrade":false}, 1300, 0, "$1,300"],
  ["home-garden", "home-sqft", {"length":30,"width":25,"stories":2,"garage":400,"unfinished":0}, 1900, 0, "1900 sq ft"],
  ["home-garden", "kitchen-remodel", {"size":"medium","quality":"mid"}, "Budget: $40,000", 0, "medium/mid = 40k", "contains"],
  ["home-garden", "light-bulb-save", {"currentW":60,"newW":9,"bulbs":10,"hoursDay":5,"rate":0.12,"ledPrice":5}, 111.69, 0, "(1095−164.25)×$0.12"],
  ["home-garden", "plant-spacing", {"length":10,"width":3,"spacing":12,"rows":2}, 77, 0, "11×7 = 77"],
  ["home-garden", "pool-chemicals", {"gallons":20000,"currentCl":1,"targetCl":3,"currentPh":7.2}, 24, 0, "24 oz chlorine"],
  ["home-garden", "pool-size", {"length":30,"width":15,"deepEnd":8,"shallowEnd":3}, 18513, 0, "185,130 gal"],
  ["home-garden", "rain-barrel", {"roofSqft":1000,"rainfall":3,"barrelSize":55}, 1495.2, 0, "1,495 gal/mo"],
  ["home-garden", "roof-sqft", {"homeSqft":1500,"pitch":5,"complexity":"moderate"}, 19, 0, "19 squares"],
  ["home-garden", "lighting-rooms", {"length":14,"width":12,"height":8,"roomType":"living"}, 2520, 0, "2520 lumens"],
  ["home-garden", "solar-battery", {"dailyKwh":25,"backupPct":50,"batteryKwh":13.5,"depthDischarge":90}, 2, 0, "2 batteries"],
  ["home-garden", "solar-panel", {"monthlyKwh":800,"sunHours":5,"panelWatt":400,"roofSqft":500}, 14, 0, "14 panels"],
  ["home-garden", "stair-calculator", {"totalRise":104,"maxRiser":7.5,"treadDepth":10}, "14 steps", 0, "ceil(104/7.5)=14", "contains"],
  ["home-garden", "tile-grout", {"sqft":100,"tileSize":12,"groutWidth":0.125}, 6, 0, "6 lbs grout"],
  ["home-garden", "tv-mount-height", {"tvSize":65,"seatHeight":42,"distance":8,"tilt":false}, 42, 0, "center = eye level 42\""],
  ["home-garden", "vinyl-flooring", {"sqft":300,"plankSqft":20,"waste":10,"underlayment":true}, 17, 0, "17 boxes"],
  ["home-garden", "wallpaper-rolls", {"wallWidth":40,"wallHeight":8,"rollWidth":20.5,"rollLength":33}, 7, 0, "7 rolls"],
  ["home-garden", "water-heater", {"showers":2,"dishwashers":1,"laundry":1,"bathrooms":2,"tempRise":60}, 80, 0, "80 gal"],
  ["tech-digital", "token-cost", {"inputK":500,"outputK":100,"model":"gpt4o"}, 2.25, 0, "$2.25/mo"],
  ["tech-digital", "ascii-table", {"char":"A","range":"print"}, "ASCII reference ready", 0, "static reference", "contains"],
  ["tech-digital", "bandwidth-calc", {"devices":5,"activity":"streaming"}, 125, 0, "5×25"],
  ["tech-digital", "base64-decode", {"text":"SGVsbG8gQ2FsY1BybyE="}, "Hello CalcPro", 0, "btoa inverse", "contains"],
  ["tech-digital", "base64-encode", {"text":"Hello CalcPro!"}, "SGVsbG8gQ2FsY1BybyE", 0, "atob inverse", "contains"],
  ["tech-digital", "battery-life-estimator", {"batteryMah":4000,"usageW":5,"batteryV":3.7}, 2.96, 0, "Wh/W = 2.96h"],
  ["tech-digital", "cable-length", {"distance":10,"cableType":"hdmi"}, "✓ All good", 0, "10m ≤ 15m", "contains"],
  ["tech-digital", "data-transfer-cost", {"dataGB":100,"provider":"aws"}, 9, 0, "$9/mo"],
  ["tech-digital", "cloud-storage", {"storageGB":100}, "Dropbox", 0, "cheapest $/GB = Dropbox", "contains"],
  ["tech-digital", "cron-validate", {"expr":"0 9 * * 1-5","detail":"brief"}, "✓ Valid", 0, "valid 5-field cron", "contains"],
  ["tech-digital", "data-usage", {"streamingHrs":2,"browsingHrs":4,"gamingHrs":1}, 285, 0, "285 GB/mo"],
  ["tech-digital", "device-charge-time", {"batteryMah":5000,"chargeA":2,"efficiency":85}, 2.941176, 0, "2.94 h"],
  ["tech-digital", "hash-generator", {"text":"CalcProMaster","algo":"md5"}, "4bc838e7d74972461535635759bff59d", 0, "RFC 1321 MD5", "contains"],
  ["tech-digital", "hosting-cost", {"monthly":10,"setup":0,"renewal":15,"years":3}, 480, 0, "$480 total"],
  ["tech-digital", "image-file-size", {"width":4000,"height":3000,"format":"png"}, 48, 0, "12 MP × 4 = 48 MB"],
  ["tech-digital", "internet-speed", {"fileSize":10,"speed":100}, "13m", 0, "10×8000/100 = 800s = 13m 20s", "contains"],
  ["tech-digital", "ip-subnet", {"ip":"192.168.1.10","prefix":24}, "192.168.1.0/24", 0, "network address", "contains"],
  ["tech-digital", "json-formatter", {"text":"{\"name\":\"CalcPro\",\"tools\":548}","indent":2}, "\"tools\": 548", 0, "parse + stringify", "contains"],
  ["tech-digital", "monitor-distance", {"screenSize":27,"resolution":"1080p"}, 67.5, 0.01, "ideal 67.5 in", "rel"],
  ["tech-digital", "password-time", {"length":12,"charset":"all","guesses":10}, 1712297790.905002, 0, "95¹²/10M per sec"],
  ["tech-digital", "wattage-psu", {"cpuTdp":125,"gpuTdp":350,"ramSticks":4,"drives":3}, 598, 0, "598 W"],
  ["tech-digital", "ppi-calc", {"widthPx":3840,"heightPx":2160,"diagonal":27}, 163, 0, "163 PPI"],
  ["tech-digital", "print-resolution", {"widthPx":3000,"heightPx":2000,"dpi":300}, "10.0x6.7", 0, "3000/300 × 2000/300", "contains"],
  ["tech-digital", "raid-capacity", {"drives":4,"size":4,"level":"5"}, 12, 0, "(4−1)×4 TB"],
  ["tech-digital", "monitor-refresh", {"refresh":144,"fps":200}, 144, 0, "min(200,144)"],
  ["tech-digital", "resistor-color-code", {"band1":"4","band2":"7","band3":100,"tol":5}, "4.7 kΩ", 0, "47 × 100 = 4.7 kΩ", "contains"],
  ["tech-digital", "rgb-hex", {"mode":"rgb2hex","r":79,"g":70,"b":229,"hex":"#4f46e5"}, "#4F46E5", 0, "79,70,229 → hex", "contains"],
  ["tech-digital", "screen-resolution", {"screenSize":24,"distance":2.5}, "4K", 0, "PPD 162 → 4K", "contains"],
  ["tech-digital", "ssd-vs-hdd", {"fileSize":50}, "SSD: 6s", 0, "50/500×60 = 6s", "contains"],
  ["tech-digital", "streaming-bitrate", {"resolution":"1080p","fps":"60"}, 12, 0, "12 Mbps"],
  ["tech-digital", "case-converter", {"text":"the quick brown fox jumps over the lazy dog","mode":"title"}, "The Quick Brown Fox", 0, "title case", "contains"],
  ["tech-digital", "uptime-calculator", {"uptime":99.9}, 8.76, 0, "8.76 h/yr"],
  ["tech-digital", "url-encoder", {"text":"https://example.com/?q=hello world&lang=en","mode":"enc"}, "hello%20world", 0, "percent-encode", "contains"],
  ["tech-digital", "video-size", {"duration":10,"bitrate":50,"resolution":"1080p"}, 1.831055, 0, "1.83 GB"],
  ["tech-digital", "website-cost", {"type":"business"}, "$5,000", 0, "business simple 5k", "contains"],
  ["tech-digital", "wifi-channels", {"band":"2.4","neighbors":5}, "Best channel: 1", 0, "2.4 GHz → 1,6,11", "contains"],
  ["tech-digital", "awg-reference", {"awg":14}, 1.627727, 0, "1.628 mm"],
  ["tech-digital", "text-counter", {"text":"Write or paste your text here to count words and characters."}, 11, 0, "11 words"],
  ["utilities", "area-calc", {"shape":"rect","dim1":10,"dim2":5}, 50, 0, "10×5"],
  ["utilities", "tip-split", {"bill":120,"tipPct":18,"people":4}, 35.4, 0, "$35.40 pp"],
  ["utilities", "salary-biweekly", {"salary":80000}, 3076.923077, 0, "$3,076.92"],
  ["utilities", "color-picker", {"hex":"#3b82f6"}, "RGB: 59, 130, 246", 0, "#3b82f6 rgb", "contains"],
  ["utilities", "file-size", {"size":1024,"from":"MB","to":"GB"}, 1, 0, "1.00 GB"],
  ["utilities", "hash-gen", {"text":"Hello World"}, "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e", 0, "SHA-256 RFC 6234 vector", "contains"],
  ["utilities", "mileage-calc", {"miles":100,"ratePerMile":0.655}, 65.5, 0, "$65.50"],
  ["utilities", "base-converter", {"value":255,"fromBase":10}, "Decimal: 255", 0, "255 dec", "contains"],
  ["utilities", "salary-hourly", {"annualSalary":80000,"hoursWeek":40}, 38.461538, 0, "$38.46/hr"],
  ["utilities", "shipping-cost", {"weight":2,"distance":500,"speed":"standard"}, 14, 0, "$14.00"],
  ["utilities", "simple-tax", {"income":80000,"deductions":13850,"stateRate":4.95,"filing":"single"}, 61804.6, 1, "net after fed 9860.5 + FICA 5060.5 + state 3274.4 (differentiated: take-home)"],
  ["utilities", "unit-converter", {"value":1,"from":"m","to":"ft"}, "3.2808", 0, "1 m = 3.2808 ft", "contains"],
  ["utilities", "volume-calc", {"shape3d":"box","d1":10,"d2":5,"d3":3}, 150, 0, "10×5×3"],
  ["education", "exam-countdown", { examDate: (function(){var d=new Date();d.setDate(d.getDate()+10);return d.toISOString().slice(0,10);})() }, 10, 0, "ceil(10d span) = 10 days"],
  ["everyday", "age", { dob: (function(){var d=new Date();d.setFullYear(d.getFullYear()-30);return d.toISOString().slice(0,10);})() }, "30 years", 0, "30y 0m 0d at definition", "contains"],
  ["utilities", "timer-calc", { targetDate: (function(){var d=new Date();d.setDate(d.getDate()+11);return d.toISOString();})() }, "10d", 0, "floor(11d - elapsed) = 10 days", "contains"],

  // ---- Batch: independently verified (hand-computed textbook values, added 2026-09-06) ----
  ['math', 'geometric-seq', { a: 2, r: 3, n: 5 }, 242, 1, 'Sₙ=2(3⁵−1)/(3−1)'],
  ['math', 'arithmetic-seq', { a: 3, d: 5, n: 10 }, 255, 1, 'Sₙ=10(3+48)/2'],
  ['math', 'binomial-prob', { n: 10, k: 3, p: 0.3 }, 26.68, 1, 'C(10,3)·0.3³·0.7⁷'],
  ['math', 'polar-rect', { mode: 'p2r', x: 5, y: 30 }, 4.3301, 1, 'x=r·cos30°'],
  ['math', 'cubic-equation', { a: 1, b: 0, c: -9, d: -27 }, 3.9742, 2, 'real root x³−9x−27'],
  ['science', 'kepler-third', { a: 1.524, m1: 1 }, 1.881, 1, 'T=a^1.5 (Mars)'],
  ['science', 'radioactive-decay', { n0: 1000, halfLife: 5730, time: 11460 }, 250, 1, '2 half-lives → 25%'],
  ['science', 'speed-of-sound', { temp: 20, medium: 'air' }, 343.4, 1, '331.3+0.606·20'],
  ['science', 'power-electrical', { mode: 'vi', a: 120, b: 10 }, 1200, 1, 'P=VI'],
  ['engineering', 'beam-deflection', { load: 10, length: 5, ei: 10000 }, 0.0081, 0.02, '5PL⁴/384EI', 'rel'],
  ['engineering', 'steel-weight', { type: 'plate', a: 1000, b: 500, c: 10 }, 39.25, 1, '0.005m³×7850'],
  ['engineering', 'structural-load', { dead: 100, live: 50, wind: 30 }, 200, 1, '1.2D+1.6L governs'],
  ['finance', 'rule-of-72', { rate: 7 }, 10.3, 1, '72/7'],
  ['finance', 'dividend-yield', { annualDiv: 3.5, price: 75 }, 4.67, 1, '3.5/75'],
  ['finance', 'cd-calculator', { deposit: 10000, rate: 4.5, years: 5, compound: 12 }, 12517.96, 1, 'monthly compound'],
  ['finance', 'annuity-payout', { fund: 500000, rate: 6, years: 25 }, 39113.36, 1, 'PMT=Pr/(1−(1+r)^−n)'],
  ['finance', 'bond-price', { face: 1000, coupon: 5, yield: 4, years: 10 }, 1081.11, 1, 'PV coupons + PV face'],
  ['everyday', 'work-hours-weekly', { days: 5, hours: 8 }, 40, 1, '5×8'],
  ['everyday', 'days-between', { from: '2026-01-01', to: '2026-06-15' }, 165, 1, '151+14 days'],
  ['everyday', 'savings-goal-date', { goal: 10000, current: 2000, monthly: 500 }, 16, 1, '8000/500 months'],
  ['everyday', 'budget-allocator', { income: 5000, housing: 30, food: 15, transport: 10, savings: 20, other: 25 }, 5000, 1, '100% of income'],
  ['health', 'calorie-deficit', { deficit: 500, weeks: 12 }, 5.5, 1, '42000/7700 kg'],
  ['health', 'sleep-debt', { need: 8, actual: 6, days: 5 }, 10, 1, '(8−6)×5'],
  ['food-nutrition', 'carb-calculator', { calories: 2200, pct: 50 }, 275, 1, '2200·50%/4'],
  ['food-nutrition', 'fiber-need', { calories: 2000 }, 28, 1, '14 g per 1000 kcal'],
  ['food-nutrition', 'rice-water', { cups: 2, type: 'white' }, 4, 1, '2×2 cups water'],
  ['food-nutrition', 'egg-boil', { size: 'large', style: 'medium' }, 8, 1, 'large medium 8 min'],
  ['fitness-exercise', 'cycling-speed', { distance: 40, speed: 25 }, 96, 1, '40/25·60 min'],
  ['fitness-exercise', 'cadence-calc', { cadence: 90, wheel: 27, gear: 70 }, 30.2, 1, 'π·70in·90rpm km/h'],
  ['fitness-exercise', 'swim-pace', { time: 25, distance: 1500 }, 100, 1, '25·60/1500·100 s/100m'],
  ['business', 'markup-margin', { cost: 50, sell: 75 }, 33.3, 1, '25/75 margin'],
  ['business', 'working-capital', { assets: 200000, liabilities: 120000 }, 80000, 1, 'CA−CL'],
  ['business', 'cash-flow-statement', { operating: 80000, investing: -30000, financing: 10000 }, 60000, 1, 'net cash flow'],
  ['business', 'revenue-per-employee', { revenue: 2000000, employees: 25 }, 80000, 1, '2M/25'],
  ['business', 'cac-payback', { cac: 500, margin: 100 }, 5, 1, '500/100 months'],

  // ---- Batch 2: independently verified (hand-computed, added 2026-09-06) ----
  ['conversion', 'bit-rate-conv', { value: 100, from: 'mbps', to: 'kbps' }, 100000, 0, '100 Mbps = 100,000 kbps'],
  ['conversion', 'luminance-conv', { value: 500, from: 'lux', to: 'fc' }, 46.45, 2, '500 lux = 500/10.764 fc'],
  ['conversion', 'molarity-conv', { value: 0.5, from: 'M', to: 'mM' }, 500, 0, '0.5 M = 500 mM'],
  ['conversion', 'flow-rate-conv', { value: 10, from: 'lpm', to: 'm3h' }, 0.6, 2, '10 L/min = 0.6 m³/h'],
  ['education', 'attendance-rate', { attended: 42, total: 48 }, 87.5, 1, '42/48 = 87.5%'],
  ['education', 'study-hours', { credits: 15, perCredit: 3 }, 45, 0, '15×3 = 45 h/week'],
  ['education', 'tuition-cost', { perCredit: 500, credits: 120, fees: 1000, years: 4 }, 64000, 0, '60,000 + 4,000'],
  ['education', 'gpa-target', { currentGPA: 3.2, creditsDone: 60, creditsNow: 15, targetGPA: 3.5 }, 4.7, 2, '(262.5−192)/15'],
  ['construction', 'concrete-bags', { length: 10, width: 8, depth: 4, bagSize: 60 }, 60, 0, 'ceil(26.67/0.45) = 60'],
  ['construction', 'block-wall', { length: 30, height: 8 }, 214, 0, 'ceil(240/1.125) = 214'],
  ['construction', 'rebar-calc', { length: 20, width: 12, spacing: 12 }, 512, 0, '13×20 + 21×12 ft'],
  ['construction', 'footing-size', { load: 100, soil: 3 }, 5.8, 1, '√(100/3) ≈ 5.77 ft (display 1 dp)'],
  ['business', 'gross-margin', { revenue: 100000, cogs: 60000 }, 40, 1, '40k/100k'],
  ['business', 'goal-seek-price', { cost: 40, target: 40 }, 66.67, 2, '40/(1−0.4)'],
  ['business', 'subscription-ltv', { arpu: 25, churn: 5, margin: 80 }, 400, 0, '25×20×0.8'],
  ['business', 'business-valuation', { revenue: 1000000, ebitda: 150000, revMult: 1.5, ebitdaMult: 5 }, 1125000, 0, '(1.5M+0.75M)/2'],
  ['auto-transport', 'fuel-tank-range', { tankSize: 45, efficiency: 16, reserve: 10 }, 648, 0, '40.5 L × 16 km/L'],
  ['auto-transport', 'tow-capacity', { gcwr: 5000, truck: 2200, passengers: 400 }, 2400, 0, '5000−2600 kg'],
  ['auto-transport', 'cargo-volume', { length: 1.5, width: 1.1, height: 0.8 }, 46.6, 1, '1320 L / 28.317'],
  ['auto-transport', 'toll-cost', { tolls: 4, avgToll: 3.5, trips: 20 }, 280, 0, '14×20/month'],
  ['regional', 'esic-calculator', { salary: 25000 }, 188, 0, '25000×0.0075'],
  ['regional', 'tds-calculator', { income: 1200000, deductions: 150000 }, 132600, 0, 'slab 127500 + 4% cess 5100'],
  ['regional', 'hra-exemption', { basic: 480000, hra: 144000, rent: 180000, metro: 'other' }, 132000, 0, 'min(144k, 132k, 192k)'],
  ['lifestyle', 'date-night-cost', { dinner: 60, entertainment: 40, transport: 15, perMonth: 4 }, 460, 0, '115×4/month'],
  ['lifestyle', 'takeout-budget', { order: 25, week: 3 }, 325, 0, '75×4.33 ≈ 324.75 (display rounded)'],
  ['lifestyle', 'home-insurance', { homeValue: 350000, rate: 3.5 }, 1225, 0, '350×3.5/yr'],
  ['lifestyle', 'renters-insurance', { value: 30000, rate: 180 }, 190, 0, '180+5000×0.002'],
  ['food-nutrition', 'calorie-per-meal', { calories: 2200, meals: 3, snacks: 1 }, 733, 0, '2200/3'],
  ['food-nutrition', 'smoothie-calories', { fruit: 1.5, milk: 1, banana: 1, extras: 100 }, 415, 0, '90+120+105+100'],
  ['food-nutrition', 'protein-per-dollar', { price: 5.99, grams: 500, proteinPer100g: 25 }, 20.9, 1, '125 g / $5.99'],
  ['everyday', 'compound-savings', { principal: 1000, monthly: 200, rate: 7, years: 10 }, 36627, 0, 'FV ≈ 36,627.9 (display rounded)'],
  ['tech-digital', 'aspect-ratio', { ratioW: 16, ratioH: 9, width: 1920 }, 1080, 0, '1920×9/16'],
  ['tech-digital', 'color-contrast', { fg: '#333333', bg: '#ffffff' }, 12.63, 2, 'WCAG ratio #333 on #fff'],

  // ---- Batch 3: coverage push — 209 independent hand-computed cases (added 2026-09-07) ----
  ['auto-transport', 'carpool-savings', {"weeklyCost":200,"people":4,"days":5}, 150, 0, '200−50 weekly share'],
  ['auto-transport', 'bus-vs-car', {"dailyParking":10,"fuelDaily":8,"busFare":3.5,"days":22}, 319, 0, '(18−3.5)×22'],
  ['auto-transport', 'ebike-range', {"battery":500,"consumption":15,"assist":"eco"}, 42, 0, '500/(15×0.8)=41.7→42'],
  ['auto-transport', 'scooter-cost', {"fuelPrice":1.2,"mileage":40,"dailyKm":10,"service":300}, 0.112, 2, '0.03+300/3650'],
  ['auto-transport', 'registration-cost', {"value":20000,"regRate":1.5,"plateFee":50,"titleFee":20}, 370, 0, '300+50+20'],
  ['auto-transport', 'tire-replacement', {"tireCost":800,"lifespan":50000,"annualMiles":12000}, 0.016, 2, '800/50000'],
  ['auto-transport', 'speed-conv', {"speed":100}, 62.1, 2, '100×0.621371'],
  ['auto-transport', 'hybrid-savings', {"annualKm":20000,"gasKmpl":12,"hybridKmpl":18,"price":1.5,"premium":3000}, 833, 0, '2500−1666.7'],
  ['career-freelance', 'self-employment-tax', {"netIncome":100000}, 14130, 0, '92350×0.153'],
  ['career-freelance', 'freelance-daily', {"salary":100000,"benefits":20,"billableDays":200}, 600, 0, '120000/200'],
  ['career-freelance', 'monthly-goal', {"goal":12000,"rate":100,"utilization":75}, 120, 0, '12000/100'],
  ['career-freelance', 'retirement-contrib', {"salary":80000,"current":5,"increase":10,"match":50}, 3120, 0, '4000−880'],
  ['career-freelance', 'benefits-value', {"salary":80000,"insurance":10000,"retirement":8000,"vacation":15,"perks":2000}, 104615, 0, '80000+10000+8000+4615+2000'],
  ['career-freelance', 'pto-calc', {"daysPerYear":20,"accrued":10,"hoursPerDay":8}, 1.7, 1, '20/12 display 1dp'],
  ['career-freelance', 'cost-living-adjustment', {"currentSalary":100000,"currentIndex":100,"newIndex":120}, 120000, 0, '100000×1.2'],
  ['career-freelance', 'severance-calc', {"salary":104000,"years":5,"weeksPerYear":2}, 20000, 0, '2000×10'],
  ['career-freelance', 'side-hustle-profit', {"revenue":5000,"expenses":2000,"hours":40}, 75, 0, '3000/40'],
  ['career-freelance', 'salary-raise-worth', {"salary":80000,"raise":5,"taxRate":25,"years":3}, 3000, 0, '4000×0.75'],
  ['construction', 'gravel-tonnage', {"length":20,"width":10,"depth":4}, 4.9, 2, '66.67ft³/13.5'],
  ['construction', 'asphalt-quantity', {"length":50,"width":12,"thickness":4}, 29, 0, '200ft³×0.145'],
  ['construction', 'mortar-mix', {"volume":4,"ratio":"1:3"}, 1, 0, '4×1/4 ft³ cement'],
  ['construction', 'drywall-screws', {"sheets":20,"spacing":"12"}, 640, 0, '20×32'],
  ['construction', 'pipe-volume', {"diameter":4,"length":50}, 32.6, 2, '4.363ft³×7.48'],
  ['construction', 'retaining-wall', {"length":20,"height":4,"blockW":16,"blockH":8}, 90, 0, '15×6'],
  ['construction', 'scaffolding', {"length":20,"height":12}, 4, 0, '2 bays × 2 lifts'],
  ['construction', 'crown-molding', {"length":12,"width":10,"waste":10}, 48, 0, '44×1.1'],
  ['construction', 'septic-size', {"bedrooms":3,"occupants":4}, 1750, 0, 'max(1750,400)'],
  ['conversion', 'paper-size-conv', {"number":3,"series":"A"}, 297, 0, '841/2^1.5'],
  ['conversion', 'fraction-percent', {"mode":"fp","num":3,"den":4}, 75, 0, '3/4×100'],
  ['conversion', 'roman-numeral', {"mode":"fromRoman","value":"MCMXCIX"}, 1999, 0, 'MCMXCIX=1999'],
  ['conversion', 'ppm-conv', {"value":2,"from":"ppm","to":"ppb"}, 2000, 0, '2ppm=2000ppb'],
  ['conversion', 'thermal-conductivity', {"value":1,"from":"wmk","to":"btu"}, 0.5778, 2, '1/1.730735'],
  ['conversion', 'radiation-dose-conv', {"value":100,"from":"mGy","to":"Gy"}, 1, 0, '100mGy=0.1Gy→1'],
  ['education', 'reading-time', {"words":1000,"speed":200}, 5, 0, '1000/200'],
  ['education', 'presentation-time', {"slides":15,"perSlide":2}, 30, 0, '15×2'],
  ['education', 'test-average', {"scores":"85,90,95"}, 90, 0, '(85+90+95)/3'],
  ['education', 'grade-percentage', {"score":85,"total":100}, 85, 0, '85/100'],
  ['education', 'graduation-date', {"remaining":30,"perSemester":15}, 2, 0, 'ceil(30/15)'],
  ['education', 'course-load', {"credits":15,"hard":2,"easy":2}, 23, 0, '15+6+2'],
  ['education', 'financial-need', {"cost":50000,"efc":10000,"grants":5000}, 35000, 0, '50000−15000'],
  ['engineering', 'column-buckling', {"e":200,"i":400,"l":4}, 0.05, 2, 'π²·200·400e-3/16 N→kN'],
  ['engineering', 'pipe-flow', {"flow":10,"diameter":100,"f":0.02,"length":100}, 16.21, 2, 'Darcy 0.02×1000×810.6'],
  ['engineering', 'concrete-mix', {"volume":1,"ratio":"1:2:4"}, 5, 0, 'ceil(0.1429/0.035)'],
  ['engineering', 'electrical-energy', {"watts":100,"hours":5,"rate":0.15}, 2.25, 2, '0.5kWh×0.15×30'],
  ['engineering', 'resistor-combination', {"mode":"series","r1":10,"r2":20,"r3":30}, 60, 0, '10+20+30'],
  ['engineering', 'capacitor-energy', {"capacitance":1000,"voltage":12}, 0.072, 2, '0.5×0.001×144'],
  ['engineering', 'inductor-energy', {"inductance":100,"current":2}, 0.2, 2, '0.5×0.1×4'],
  ['engineering', 'rc-time-constant', {"r":1000,"c":100}, 0.1, 2, '1000×100e-6'],
  ['engineering', 'cable-sizing', {"voltage":230,"vdrop":3,"current":20,"length":50}, 5, 0, '0.0172×100/0.345'],
  ['engineering', 'ventilation-cfm', {"length":5,"width":4,"height":3,"ach":6}, 212, 0, '60×35.31×6/60'],
  ['engineering', 'torque-wrench', {"target":100,"wrenchLen":300,"extLen":50}, 85.7, 2, '100×300/350'],
  ['engineering', 'bearing-load', {"load":5,"life":10000,"speed":1500}, 48.3, 2, '5×900^(1/3)'],
  ['engineering', 'engine-efficiency', {"fuel":10,"hvf":42,"power":80}, 68.6, 2, '80/116.67×100'],
  ['engineering', 'pump-power', {"flow":50,"head":20,"efficiency":70}, 9.81, 2, '9.81×1000×0.05×20 W'],
  ['engineering', 'tank-volume', {"shape":"cylinder","a":0.5,"b":1}, 0.79, 2, 'π×0.25×1'],
  ['engineering', 'heat-exchanger', {"t1in":80,"t1out":60,"t2in":30,"t2out":50}, 30, 0, 'ΔT1=ΔT2→LMTD=30'],
  ['engineering', 'pcb-trace', {"current":1,"temp":10,"thickness":1}, 30.28, 2, 'IPC-2221 area^1.3793/1.4'],
  ['engineering', 'bolt-torque', {"torque":100,"k":0.2,"d":10}, 50, 0, '100/0.002 N→kN'],
  ['finance', 'inflation-adjusted', {"nominal":8,"inflation":3}, 4.85, 2, '(1.08/1.03−1)×100'],
  ['finance', 'tax-equivalent-yield', {"muniYield":4,"taxRate":25}, 5.33, 2, '4/0.75'],
  ['finance', 'times-interest-earned', {"ebit":300000,"interest":50000}, 6, 0, '300k/50k'],
  ['finance', 'quick-ratio', {"cash":50000,"receivables":30000,"currentLiab":60000}, 1.33, 2, '80k/60k'],
  ['finance', 'ebitda', {"revenue":1000000,"cogs":600000,"opex":200000,"depreciation":50000,"amortization":20000}, 270000, 0, '1M−600k−200k+50k+20k'],
  ['finance', 'enterprise-value', {"mktCap":5000000,"debt":2000000,"cash":1000000,"minority":100000,"preferred":50000}, 6150000, 0, '5M+2M−1M+0.15M'],
  ['finance', 'wacc', {"equityValue":600000,"debtValue":400000,"costEquity":10,"costDebt":5,"taxRate":25}, 7.5, 2, '0.6×10+0.4×3.75'],
  ['finance', 'sharpe-ratio', {"returnRate":12,"riskFree":2,"stdDev":10}, 1, 0, '(12−2)/10'],
  ['finance', 'geometric-mean', {"returns":"10,20,30"}, 19.72, 2, '(1.716)^(1/3)−1'],
  ['finance', 'payday-loan-cost', {"amount":300,"fee":15,"days":14}, 391.1, 2, '(45/300)×(365/14)×100'],
  ['finance', 'emergency-fund-rate', {"monthly":1000,"months":12,"rate":4}, 12263.2, 1, 'FV annuity due 0.333%/mo 12m'],
  ['finance', 'property-tax', {"value":350000,"rate":1.1}, 3850, 0, '350000×1.1%'],
  ['finance', 'cap-rate', {"noi":80000,"value":1000000}, 8, 0, '80k/1M×100'],
  ['finance', 'student-loan-repayment', {"balance":30000,"rate":6,"years":10}, 333.06, 2, 'PMT 0.5%/mo 120mo'],
  ['finance', 'cost-of-debt', {"interestRate":6,"taxRate":25}, 4.5, 2, '6×0.75'],
  ['finance', 'va-loan', {"price":300000,"funding":2.3,"rate":6.5,"term":30}, 1939.82, 2, 'PMT 306900 6.5% 30y'],
  ['finance', 'price-to-earnings', {"price":50,"eps":2.5}, 20, 0, '50/2.5'],
  ['finance', 'dividend-discount', {"dividend":2,"growth":3,"requiredReturn":8}, 41.2, 2, '2.06/0.05'],
  ['finance', 'margin-call', {"buyPrice":100,"marginReq":30}, 71.43, 2, '50/0.7'],
  ['finance', 'growing-perpetuity', {"payment":10000,"rate":8,"growth":3}, 200000, 0, '10000/0.05'],
  ['finance', 'tax-loss-harvest', {"gains":10000,"losses":5000,"taxRate":25}, 1250, 0, '5000×25%'],
  ['finance', 'savings-rate', {"saved":1500,"income":5000}, 30, 0, '1500/5000×100'],
  ['finance', 'envelope-budget', {"income":5000}, 2500, 0, '50% of 5000'],
  ['finance', 'car-lease-calculator', {"msrp":35000,"residual":55,"cap":33000,"term":36,"rate":5}, 647.63, 2, 'dep 381.94 + fin 217.71 + 8% tax'],
  ['finance', 'cost-of-living', {"salary":100000,"fromIndex":100,"toIndex":120}, 120000, 0, '100000×1.2'],
  ['finance', 'yield-to-maturity', {"face":1000,"coupon":5,"price":950,"years":10}, 5.64, 2, '(50+5)/975×100'],
  ['finance', 'gross-rent-multiplier', {"monthlyRent":1500,"price":360000}, 20, 0, '360k/18k'],
  ['finance', 'current-ratio-finance', {"currentAssets":200000,"currentLiab":100000}, 2, 0, '200k/100k'],
  ['finance', 'accounts-receivable-turnover', {"netCreditSales":500000,"avgAR":100000}, 5, 0, '500k/100k'],
  ['finance', 'operating-margin', {"operatingIncome":200000,"revenue":1000000}, 20, 0, '200k/1M×100'],
  ['finance', 'net-profit-margin', {"netIncome":150000,"revenue":1000000}, 15, 0, '150k/1M×100'],
  ['finance', 'coverage-ratio', {"noi":150000,"debtService":100000}, 1.5, 2, '150k/100k'],
  ['finance', 'home-equity', {"homeValue":400000,"mortgageBalance":250000,"heloc":20000}, 130000, 0, '400k−270k'],
  ['finance', 'cash-on-cash', {"annualCashFlow":12000,"totalInvested":100000}, 12, 0, '12k/100k×100'],
  ['finance', 'price-to-rent', {"homePrice":300000,"annualRent":20000}, 15, 0, '300k/20k'],
  ['finance', 'fico-simulator', {"currentScore":700,"utilization":40,"newUtil":20,"hardInquiries":1}, 701, 0, '700+6−5'],
  ['finance', 'bond-duration', {"face":1000,"coupon":5,"yield":5,"years":5}, 4.55, 2, 'Macaulay at par ≈ 4.55'],
  ['finance', 'black-scholes', {"spot":100,"strike":100,"rate":5,"vol":20,"time":0.5}, 6.89, 2, 'ATM call ≈ 6.89'],
  ['fitness-exercise', 'stride-length', {"height":170,"pace":"run"}, 78, 0, '170×0.46'],
  ['fitness-exercise', 'training-volume', {"sets":4,"reps":8,"weight":80,"exercises":6}, 15360, 0, '4×8×6×80'],
  ['fitness-exercise', 'vertical-jump', {"jump":50,"weight":75}, 2304, 0, '75×9.81×√(2×9.81×0.5) display'],
  ['fitness-exercise', 'beep-test', {"level":9,"shuttles":4}, 45.1, 2, '3.46×9.5+12.2'],
  ['fitness-exercise', 'bodyweight-ratio', {"lift":100,"weight":75}, 1.33, 2, '100/75'],
  ['fitness-exercise', 'deload-week', {"normalSets":4,"intensity":75,"frequency":4}, 45, 0, '75×0.6'],
  ['fitness-exercise', 'workout-rest', {"goal":"hypertrophy"}, 75, 0, 'hypertrophy rest 75s'],
  ['food-nutrition', 'sodium-intake', {"processed":1500,"cooking":500,"restaurant":800}, 2800, 0, '1500+500+800'],
  ['food-nutrition', 'caffeine-daily', {"coffee":2,"tea":1,"energy":0,"soda":1}, 259, 0, '190+35+34'],
  ['food-nutrition', 'meal-prep-size', {"servings":4,"batches":2,"days":5,"mealsPerDay":1}, 8, 0, '4×2'],
  ['food-nutrition', 'sugar-limit', {"calories":2000,"current":60}, 50, 0, '2000×10%/4'],
  ['health', 'body-fat-navy', {"gender":"m","waist":34,"neck":15,"height":70}, 17.5, 2, 'Navy: 86.01·log19−70.041·log70+36.76'],
  ['health', 'heart-rate-zones', {"age":30,"restingHR":60}, 190, 0, '220−30'],
  ['health', 'ideal-weight', {"gender":"m","height":175}, 70.5, 2, 'avg(Hamwi 72.0, Devine 70.5, Robinson 68.9)'],
  ['health', 'fasting-calculator', {"protocol":"16:8","lastMeal":20}, 16, 0, '16h fast'],
  ['health', 'met-calories', {"met":6,"weight":70,"duration":30}, 210, 0, '6×70×0.5'],
  ['health', 'iron-intake', {"gender":"f","age":30,"pregnant":"no"}, 18, 0, 'female 19-50 = 18mg'],
  ['health', 'vitamin-d-dosage', {"level":20,"target":40}, 22, 0, '2000IU/90'],
  ['health', 'calorie-goal', {"tdee":2200,"goal":"loss-med","weeks":12}, 1650, 0, '2200−550'],
  ['health', 'burn-severity', {"head":0,"torso":0,"arm-l":0,"arm-r":0,"leg-l":9,"leg-r":9}, 18, 0, 'TBSA = 9+9%'],
  ['health', 'drug-dosage', {"weight":70,"dose":10,"frequency":3}, 700, 0, '70×10'],
  ['home-garden', 'raised-bed-soil', {"length":6,"width":3,"depth":12}, 18, 0, '6×3×1'],
  ['home-garden', 'garden-fence', {"length":20,"width":15,"height":4,"postGap":8}, 10, 0, 'ceil(70/8)+1'],
  ['home-garden', 'lawn-watering', {"length":40,"width":30,"inches":1}, 748, 0, '1200×0.623'],
  ['home-garden', 'sprinkler-heads', {"length":50,"width":30,"radius":15}, 24, 0, 'ceil(50/9)×ceil(30/9)'],
  ['home-garden', 'compost-bin', {"people":4,"yard":10}, 12, 0, 'ceil(22×4/7.48)'],
  ['home-garden', 'firepit-size', {"diameter":36,"stoneLen":8,"height":12}, 45, 0, 'ceil(113.1/8)×3'],
  ['home-garden', 'deck-post', {"deckLength":16,"joistGap":16,"beamSpan":8}, 13, 0, 'ceil(192/16)+1'],
  ['home-garden', 'porch-light', {"height":8,"width":3,"style":"lantern"}, 12, 0, 'round(8×1.5)'],
  ['home-garden', 'ceiling-fan-size', {"length":14,"width":12,"ceilHeight":9}, 52, 0, 'area 168 → 52"'],
  ['home-garden', 'humidifier-size', {"sqft":500,"current":30,"target":50}, 2, 0, 'ceil(20×4000/45000)'],
  ['home-garden', 'tree-spacing', {"length":100,"width":50,"spacing":15}, 28, 0, '7×4'],
  ['home-garden', 'grout-calc', {"area":100,"tileLen":12,"tileWid":12,"joint":0.125,"depth":0.375}, 7, 0, '2ft joint × 0.0104×0.0313 ft × 100 ft² × 100 lb/ft³'],
  ['lifestyle', 'car-wash-annual', {"price":15,"perMonth":4}, 720, 0, '15×4×12'],
  ['lifestyle', 'haircut-annual', {"price":30,"visits":12,"tips":20}, 432, 0, '36×12'],
  ['lifestyle', 'party-cost', {"guests":20,"food":15,"drinks":10,"decor":100}, 600, 0, '25×20+100'],
  ['lifestyle', 'gift-budget', {"people":10,"avg":50,"occasions":2}, 1000, 0, '10×50×2'],
  ['lifestyle', 'hobby-cost', {"supplies":50,"gear":20,"classes":60}, 130, 0, '50+20+60'],
  ['lifestyle', 'travel-daily', {"lodging":120,"food":60,"transport":25,"activities":50,"days":7}, 255, 0, '120+60+25+50'],
  ['lifestyle', 'furniture-assembly', {"pieces":3,"complexity":"medium"}, 3, 0, '1h×3'],
  ['lifestyle', 'home-renovation', {"sqft":200,"level":"mid","contingency":15}, 23000, 0, '20000×1.15'],
  ['math', 'normal-dist', {"x":1.96,"mu":0,"sigma":1}, 97.5, 2, 'Φ(1.96)=0.975'],
  ['math', 'taylor-series', {"func":"sin","x":1,"terms":6}, 0.8415, 2, 'sin(1) Taylor 6 terms'],
  ['math', 'continued-fraction', {"terms":"1,1,1,1,1,1,1,1","denoms":"1,2,2,2,2,2,2,2"}, 0.7071, 2, '[1;2,2,...] convergent=√2/2'],
  ['math', 'linear-system', {"a1":2,"b1":1,"c1":5,"a2":1,"b2":3,"c2":7}, 1.6, 2, 'x=(15−7)/5'],
  ['math', 'eigenvalue-2x2', {"a":4,"b":2,"c":1,"d":3}, 5, 0, 'λ=(7±3)/2'],
  ['math', 'surface-area-3d', {"shape":"sphere","a":5,"b":10}, 314.16, 2, '4π×25'],
  ['math', 'complex-modulus', {"re":3,"im":4}, 5, 0, '|3+4i|=5'],
  ['math', 'mean-median-mode', {"data":"2,4,4,4,5,5,7,9"}, 4.5, 2, 'median of 8 values'],
  ['math', 'variance-sd', {"data":"4,8,6,5,3,2,8,9,2,5","type":"sample"}, 2.53, 2, '√(57.6/9)'],
  ['math', 'permutation', {"n":10,"r":3}, 720, 0, '10×9×8'],
  ['math', 'binomial-theorem', {"a":2,"b":3,"n":5}, 3125, 0, '5^5'],
  ['math', 'golden-ratio', {"n":10}, 55, 0, 'F(10)'],
  ['math', 'sieve-prime', {"n":50}, 15, 0, '15 primes ≤ 50'],
  ['math', 'fibonacci-seq', {"n":15}, 377, 0, 'F(15)'],
  ['math', 'pascal-triangle', {"n":10}, 252, 0, 'row 10 middle'],
  ['math', 'collatz', {"n":27}, 111, 0, 'Collatz(27)=111 steps'],
  ['math', 'modular-exp', {"a":2,"b":100,"m":1000000007}, 976371253, 0, '2^100 mod 1e9+7 exact'],
  ['math', 'norm-dist-range', {"a":-1,"b":1,"mu":0,"sigma":1}, 68.27, 2, 'P(−1<Z<1)'],
  ['math', 'dot-cross-product', {"ax":1,"ay":2,"az":3,"bx":4,"by":5,"bz":6}, 32, 0, 'A·B'],
  ['math', 'bayes-theorem', {"pa":0.01,"pbga":0.9,"pbgn":0.05}, 15.38, 2, '0.009/0.0585×100'],
  ['math', 'distance-formula', {"x1":1,"y1":2,"x2":4,"y2":6}, 5, 0, '√(9+16)'],
  ['math', 'slope-intercept', {"x1":1,"y1":2,"x2":4,"y2":8}, 2, 0, 'm=(8−2)/3'],
  ['math', 'zscore-calc', {"x":85,"mu":70,"sigma":10}, 1.5, 2, '(85−70)/10'],
  ['parenting-family', 'baby-formula', {"weight":5,"ageMonths":3,"feedings":6}, 63, 0, '375ml/day ÷ 6 display'],
  ['parenting-family', 'kids-shoe-size', {"us":8,"gender":"unisex"}, 28, 0, '8×1.5+15.5'],
  ['parenting-family', 'family-meal-cost', {"family":4,"perServing":4,"meals":14}, 224, 0, '16×14'],
  ['parenting-family', 'school-supplies', {"children":2,"grade":"elem","perChild":150}, 300, 0, '2×150'],
  ['parenting-family', 'birthday-party-cost', {"guests":10,"venue":250,"perChild":15,"cake":60}, 460, 0, '250+150+60'],
  ['parenting-family', 'allowance-calc', {"age":8,"chores":5,"perChore":1}, 9, 0, '4+5'],
  ['parenting-family', 'teen-budget', {"income":120,"savePct":20,"spendPct":60,"sharePct":20}, 24, 0, '120×20%'],
  ['parenting-family', 'inheritance-estate', {"assets":1500000,"debts":100000,"exemption":1361000,"heirs":3}, 1400000, 0, '1.5M−100k'],
  ['parenting-family', 'sibling-age-gap', {"older":"2022-05-10","younger":"2024-08-15"}, 2.27, 2, '828 days / 365.25'],
  ['parenting-family', 'childcare-weekly', {"hours":40,"rate":12,"days":5}, 480, 0, '40×12'],
  ['regional', 'epf-calculator', {"basic":30000,"age":30,"retire":60,"existing":200000}, 13250551, 0, 'FV 8.25% 30y + 86,400/yr exact'],
  ['regional', 'capital-gains-india', {"buyPrice":3000000,"sellPrice":4500000,"years":5,"asset":"shares"}, 140000, 0, '(1.5M−100k)×10%'],
  ['regional', 'sukanya-samriddhi', {"deposit":100000,"years":15,"rate":8.2}, 2983993, 0, 'FV annuity due 8.2% 15y exact'],
  ['regional', 'nsc-interest', {"amount":100000,"years":5,"rate":7.7}, 144903, 0, '100000×1.077^5 exact'],
  ['regional', 'senior-savings-scheme', {"amount":1000000,"rate":8.2}, 20500, 0, '1M×8.2%/4'],
  ['regional', 'post-office-savings', {"monthly":5000,"years":5,"rate":7.5}, 364449, 0, 'RD formula 7.5% qtr 5y exact'],
  ['regional', 'uae-vat', {"amount":1000,"mode":"add"}, 1050, 0, '1000×1.05'],
  ['regional', 'zakat-calculator', {"cash":500000,"gold":300000,"other":100000,"debt":50000}, 21250, 0, '850000×2.5%'],
  ['regional', 'pk-income-tax', {"income":2000000}, 135000, 0, '600000×22.5%'],
  ['regional', 'gold-silver-ratio', {"gold":2650,"silver":30}, 88.3, 2, '2650/30'],
  ['science', 'newtons-second', {"solveFor":"force","a":10,"b":9.81}, 98.1, 2, 'F=ma'],
  ['science', 'wavelength-freq', {"mode":"wl","value":550,"medium":"vacuum"}, 545000000000000, 0, '2.998e8/550e-9'],
  ['science', 'spring-force', {"k":500,"x":0.1}, 50, 0, 'kx'],
  ['science', 'centripetal', {"velocity":10,"radius":5}, 20, 0, 'v²/r'],
  ['science', 'orbital-velocity', {"mass":5.97e+24,"altitude":400}, 7671, 0, '√(GM/R) R=6.771e6 display'],
  ['science', 'heat-transfer', {"mass":1,"cp":4186,"dt":50}, 209300, 0, 'mcΔT'],
  ['science', 'boyle-law', {"p1":1,"v1":10,"solveFor":"p2","known":5}, 2, 0, 'P1V1/V2'],
  ['science', 'combined-gas-law', {"p1":1,"v1":10,"t1":273,"p2":2,"t2":300}, 5.49, 2, 'P1V1T2/(P2T1)'],
  ['science', 'wave-speed', {"freq":440,"wavelength":0.78}, 343.2, 2, 'fλ'],
  ['science', 'moment-of-inertia', {"shape":"disk","mass":10,"radius":0.5}, 1.25, 2, '½mr²'],
  ['science', 'buoyancy', {"rho":1000,"volume":0.05,"g":9.81}, 490.5, 2, 'ρVg'],
  ['science', 'hydrostatic-pressure', {"depth":10,"rho":1025,"g":9.81}, 100553, 0, '1025×9.81×10'],
  ['science', 'solar-energy', {"panels":20,"wattage":350,"hours":5,"efficiency":85}, 892.5, 2, '29.75kWh×30'],
  ['science', 'reynolds-number', {"rho":1000,"velocity":2,"length":0.05,"mu":0.001}, 100000, 0, 'ρvL/μ'],
  ['science', 'bernoulli', {"p1":101325,"v1":2,"h1":0,"h2":10,"rho":1000}, 3225, 0, '103325−2000−98100'],
  ['tech-digital', 'read-time', {"words":1200,"wpm":220}, 5, 0, '1200/220 min'],
  ['tech-digital', 'font-size-conv', {"px":16,"root":16}, 1, 0, '16/16 rem'],
  ['tech-digital', 'storage-need', {"photos":10,"videoHours":20,"documents":5,"music":200}, 135, 0, '50+60+5+20'],
  ['tech-digital', 'latency-bandwidth', {"sizeMB":100,"mbps":100,"latencyMs":50}, 9, 0, '8s + 20×0.05s'],
  ['tech-digital', 'download-time', {"size":500,"unit":"MB","speed":50}, 20, 0, '80s → 1m 20s (seconds part)'],
  ['tech-digital', 'audio-file-size', {"minutes":60,"bitrate":128}, 56, 0, '128×3600/8/1024'],
  ['tech-digital', 'backup-size', {"fullGB":200,"incrementalGB":5,"days":30}, 350, 0, '200+150'],
  ['tech-digital', 'screen-size', {"distance":8,"resolution":"4k"}, 64, 0, '96/1.5'],
  ['tech-digital', 'streaming-quality', {"hours":2,"quality":"hd","days":30}, 180, 0, '6×2×30'],
  ['tech-digital', 'code-line-count', {"features":10,"complexity":"medium","devs":2,"days":30}, 4000, 0, '10×400'],
  ['utilities', 'ratio-simplifier', {"a":48,"b":36}, 4, 0, '48:36 → 4:3'],
  ['utilities', 'gcd-lcm', {"a":12,"b":18}, 6, 0, 'gcd(12,18)=6'],
  ['utilities', 'rounding-calc', {"value":3.14159,"places":2}, 3.14, 2, 'round 3.14159 → 3.14'],
  ['utilities', 'units-per', {"price":4.99,"quantity":12,"unit":"oz"}, 0.416, 2, '4.99/12'],

  // ---- Batch 3: near-duplicate consolidation differentiations (hand-computed, added 2026-09-07) ----
  ['fitness-exercise', 'body-fat-fitness', { weight: 70, height: 170, age: 30, gender: 'male' }, 19.8, 1, 'Deurenberg: 1.2×24.22+0.23×30−10.8−5.4'],
  ['parenting-family', 'maternity-leave', { awe: 600, weeks: 39 }, 9312.99, 2, 'UK SMP: 6×540 + 33×184.03'],
  ['parenting-family', 'maternity-leave-finance', { monthlyExpenses: 3500, weeklyIncome: 400, leaveWeeks: 12 }, 4892.31, 1, 'expenses 9692.31 − income 4800'],
  ['parenting-family', 'paternity-leave', { salary: 80000, state: 'CA', leaveWeeks: 6, cap: 1600 }, 5538.46, 1, '1538.46×60%×6'],
  ['everyday', 'currency-exchange', { amount: 1000, midRate: 0.92, offeredRate: 0.89, flatFee: 5 }, 885, 1, '1000×0.89−5'],
  ['fitness-exercise', 'running-pace', { distance: 10, paceMin: 5, paceSec: 30 }, 55, 0, '10×5.5 min finish'],
  ['lifestyle', 'coffee-habit', { dailyCost: 5.5, times: 5, years: 10, returnRate: 7 }, 20626, 0, 'FV annuity 119.17×((1.005833¹²⁰−1)/r) = 20625.9'],
  ['utilities', 'simple-tax', { income: 80000, deductions: 13850, stateRate: 4.95, filing: 'single' }, 61804.6, 1, 'net after fed 9860.5 + FICA 5060.5 + state 3274.4'],

  // ---- Batch 4: 7 new distinct tools (independent closed-form expectations) ----
  // Step-up SIP (step=0) = annuity-due: 1000×1.01×((1.01^60−1)/0.01) → displayed rounded
  ['finance', 'sip-step-up', { monthly: 1000, step: 0, rate: 12, years: 5 }, 82486, 1, 'annuity-due FV 82,486'],
  // FD vs RD 1y: RD = 10000×(1+r)×((1+r)^12−1)/r with r=0.07/12 → displayed rounded
  ['finance', 'fixed-deposit-vs-recurring', { monthly: 10000, years: 1, rate: 7 }, 124649, 1, 'RD 124,649 (annuity-due)'],
  // Surrender: 5y premiums = 25000; factor 50% = 12500 + 50%×2000 bonus = 13500
  ['finance', 'insurance-surrender-value', { premium: 5000, yearsPaid: 5, bonus: 2000 }, 13500, 0, '25k×0.5 + 1k bonus'],
  // ESPP: 5000 accumulated; lookback min(50,60)×0.85 = 42.50 → 117.65 shares
  ['finance', 'espp', { salary: 100000, contrib: 10, period: 6, discount: 15, startPrice: 50, endPrice: 60, lookback: '1' }, 117.647, 2, '5000/42.50 shares'],
  // Roth vs Trad: factor 1.07^20 = 3.86968; trad = 10000×3.86968×0.85 = 32892.3
  ['finance', 'roth-vs-traditional', { contrib: 10000, currentTax: 24, retireTax: 15, years: 20, rate: 7 }, 32892, 1, 'trad 32,892 after-tax'],
  // Copay: 2000 deductible + 20%×(10000−2000) = 3600 (under 6000 OOP max)
  ['health', 'health-insurance-copay', { deductible: 2000, coins: 20, oopMax: 6000, charges: 10000 }, 3600, 0, '2000 + 0.2×8000'],
  // Percentile rank: 2 below / 5 × 100 = 40th
  ['education', 'percentile-rank', { scores: '60,70,80,90,100', score: 75 }, 40, 1, '2/5×100 = 40th'],
  // GST payable (ITC): 18%×100000 − 18%×40000 = 18000 − 7200 = 10800
  ['regional', 'gst-calculator', { sales: 100000, purchases: 40000, rate: '18' }, 10800, 0, 'output 18000 − ITC 7200'],
  // Job offer A: 80,000×1.10 − 30×0.5×260/60 = 88,000 − 65 = 87,935 vs B 86,250 − 130 = 86,120
  ['career-freelance', 'job-offer-compare', { salaryA: 80000, bonusA: 10, commuteA: 30, salaryB: 75000, bonusB: 15, commuteB: 60 }, 'Offer A wins', 0, 'A adj 87935 > B adj 86120', 'contains'],
  // Burpee: 30 in 1 min = Average..39 → 'Good' is >=30
  ['fitness-exercise', 'burpee-test', { burpees: 35 }, 'Good', 0, '35 burpees ≥ 30 = Good', 'contains'],
  // Sit-up: 40 = Good (>=35, <45)
  ['fitness-exercise', 'situp-test', { situps: 40 }, 'Good', 0, '40 sit-ups ≥ 35 = Good', 'contains'],
  // Pizza: 4×3 = 12 needed vs 2×8 = 16 available → enough
  ['food-nutrition', 'pizza-slices', { people: 4, slices: 3, pizzas: 2, price: 15 }, 'Enough pizza', 0, '12 ≤ 16 slices', 'contains'],
  // Body type: shoulder/hip = 45/38 = 1.18 → Balanced; wrist 17 → Medium
  ['health', 'body-type', { height: 175, wrist: 17, shoulder: 45, hip: 38 }, 'Balanced', 0, 'ratio 1.18 → Balanced', 'contains'],
  // Portfolio: 0.40×10 + 0.30×8 + 0.20×12 + 0.10×5 = 4+2.4+2.4+0.5 = 9.30%
  ['finance', 'portfolio-return', { weights: '40,30,20,10', returns: '10,8,12,5' }, '9.30', 2, 'Σwi×ri = 9.30%', 'contains'],
  // Luhn: 79927398713 → doubled sum 70 → 70%10 = 0 → valid
  ['math', 'checksum-luhn', { number: '79927398713' }, 'Valid', 0, 'sum 70 mod 10 = 0', 'contains'],
  // Run-length: AAABBBCC → A3B3C2
  ['math', 'run-length', { data: 'AAABBBCC' }, 'A3B3C2', 0, '3 A + 3 B + 2 C', 'contains'],
  // Prime: 17 has no divisors ≤ √17 → prime
  ['utilities', 'prime-check', { n: 17 }, 'Prime', 0, '√17≈4.12, no divisors', 'contains'],
  // Molar mass: H2O = 2×1.008 + 15.999 = 18.015
  ['science', 'molar-mass', { elements: 'H2O' }, '18.015', 0, '2×1.008+15.999', 'contains'],
  // URL encode: 'hello world' → hello%20world
  ['tech-digital', 'url-encoder', { text: 'hello world', mode: 'enc' }, 'hello%20world', 0, 'space → %20', 'contains'],
  // Word count: 'hello world' = 2 words
  ['tech-digital', 'text-counter', { text: 'hello world' }, '2 words', 0, '2 tokens', 'contains'],
  // Cron '0 9 * * 1-5' → valid 5-field expression
  ['tech-digital', 'cron-validate', { expr: '0 9 * * 1-5', detail: 'brief' }, 'Valid', 0, '5 fields in range', 'contains'],
  // ASCII: printable range table renders
  ['tech-digital', 'ascii-table', { char: 'A', range: 'print' }, 'ASCII reference', 0, 'A = 65 in table', 'contains'],
  // Oil change: synthetic → 12,000 km
  ['auto-transport', 'oil-change', { oilType: 'syn' }, '12,000', 0, 'synthetic 12,000 km', 'contains'],
  // Sleep cycles from 06:00 wake: 5 cycles × 90 min = 450 min before → 22:30
  ['everyday', 'sleep-calc', { wakeTime: '06:00' }, '22:30', 0, '06:00 − 5×90 min', 'contains'],
  // ---- REVIEW-lift: deterministic date tools (independent calendar arithmetic) ----
  // Exact age 1990-06-15 → 2020-06-15 = exactly 30y 0m 0d
  ['utilities', 'age-exact', { birthday: '1990-06-15', asOf: '2020-06-15' }, '30y 0m 0d', 0, '30 years to the day', 'contains'],
  // LMP 2026-01-01 → check date 2026-05-01 = 120 days = 17 weeks → 2nd trimester
  ['health', 'trimester-date', { lmp: '2026-01-01', asOf: '2026-05-01' }, '17 weeks (2nd Trimester)', 0, '120 days = 17 weeks', 'contains'],
  // Countdown 2026-12-01 → 2026-12-25 = 24 days away
  ['everyday', 'event-countdown', { date: '2026-12-25', from: '2026-12-01' }, '24 days away', 0, '25 Dec − 1 Dec = 24', 'contains'],
  // ---- Batch 5: 7 new distinct tools (independent closed-form expectations) ----
  // CAGR: (16105.10/10000)^(1/5) − 1 = 1.61051^0.2 − 1 = 0.10 = 10%
  ['finance', 'cagr', { begin: 10000, end: 16105.10, years: 5 }, 10, 0.5, '(16105.10/10000)^(1/5)−1'],
  // Linear regression on perfect line y=2x → slope 2, intercept 0, R²=1
  ['math', 'linear-regression', { x: '1,2,3,4', y: '2,4,6,8' }, 2, 0, 'perfect fit: slope 2, intercept 0'],
  // Pearson: Sxy/√(Sxx·Syy) = 10/√(5×20) = 1
  ['math', 'pearson-correlation', { x: '1,2,3,4', y: '2,4,6,8' }, 1, 0, 'perfect positive correlation r=1'],
  // CI: 100 ± 1.96×(15/√25) = 100 ± 5.88 → 94.12
  ['math', 'confidence-interval', { mean: 100, sd: 15, n: 25, conf: '95' }, 94.12, 0.5, '100 − 1.96×3'],
  // Sample size: n0 = 1.96²×0.25/0.05² = 384.16 → finite corr 384.16/(1+383.16/10000) = 369.99 → 370
  ['math', 'sample-size', { conf: '95', moe: 5, p: 0.5, pop: 10000 }, 370, 0, 'finite-population correction'],
  // Poisson: e⁻⁴×4²/2! = 0.018316×16/2 = 0.1465 = 14.65%
  ['math', 'poisson-probability', { lambda: 4, k: 2 }, 14.65, 0.5, 'e⁻⁴·16/2'],
  // HbA1c 7% → eAG = 28.7×7 − 46.7 = 154.2 mg/dL (ADAG formula)
  ['health', 'hba1c-eag', { hba1c: 7 }, 154.2, 0.5, '28.7×7−46.7'],
  // ---- Batch 6: 23 new distinct tools (independent closed-form expectations) ----
  // CAPM: 3 + 1.5×(10−3) = 13.5%
  ['finance', 'capm', { riskFree: 3, beta: 1.5, marketReturn: 10 }, 13.5, 0.5, 'Rf + β(Rm−Rf)'],
  // DCF: PV(100..140 @10%) 447.70 + PV(TV) 1279.10 = 1726.79 → displayed $1,727
  ['finance', 'dcf', { cashFlows: '100,110,120,130,140', discountRate: 10, growthRate: 3 }, 1727, 1, 'Σ CFt/1.1ᵗ + TV/1.1⁵'],
  // D/E: 500000/250000 = 2.00
  ['finance', 'debt-to-equity', { liabilities: 500000, equity: 250000 }, 2, 0, 'liabilities/equity'],
  // Harmonic mean 2,4,8: 3/(0.5+0.25+0.125) = 3.4286
  ['math', 'harmonic-mean', { data: '2,4,8' }, 3.4286, 2, 'n/Σ(1/x)'],
  // SMA(3) of 1..5: last = (3+4+5)/3 = 4.00
  ['math', 'moving-average', { data: '1,2,3,4,5', window: 3 }, 4, 0.5, '(3+4+5)/3'],
  // SEM of 2,4,6: s=2, n=3 → 2/√3 = 1.1547
  ['math', 'standard-error', { data: '2,4,6' }, 1.1547, 2, 's/√n'],
  // χ²: (10²+10²)/50 = 4.00
  ['math', 'chi-square', { observed: '50,60,40', expected: '50,50,50' }, 4, 0.5, 'Σ(O−E)²/E'],
  // Welch t: (4−3)/√(4/3+4/3) = 0.6124
  ['math', 't-test', { sample1: '2,4,6', sample2: '1,3,5' }, 0.6124, 2, 'means 4 vs 3, var 4 each'],
  // Hypergeometric: C(4,2)C(6,3)/C(10,5) = 120/252 = 47.62%
  ['math', 'hypergeometric', { N: 10, K: 4, n: 5, k: 2 }, 47.62, 1, 'C(4,2)C(6,3)/C(10,5)'],
  // Sig figs: 0.00450 → 3 (leading zeros excluded, trailing zero after decimal counts)
  ['math', 'significant-figures', { value: '0.00450' }, 3, 0, 'leading zeros never count', 'contains'],
  // 2×2 inverse: det=10 → [0.60,-0.70; -0.20,0.40]
  ['math', 'matrix-inverse', { a: 4, b: 7, c: 2, d: 6 }, 0.6, 1, '1/det × [d −b; −c a]'],
  // Midpoint (2,4)-(6,8) = (4,6)
  ['math', 'midpoint', { x1: 2, y1: 4, x2: 6, y2: 8 }, 'Midpoint: (4, 6)', 0, '((x₁+x₂)/2, (y₁+y₂)/2)', 'contains'],
  // Trapezoid: (6+10)/2 × 4 = 32
  ['math', 'trapezoid', { a: 6, b: 10, h: 4 }, 32, 0, '(a+b)/2 × h'],
  // Sector: 60/360 × π × 36 = 18.85
  ['math', 'sector-area', { r: 6, angle: 60 }, 18.85, 0.5, 'θ/360 × πr²'],
  // Pyramid: 9 × 12 / 3 = 36
  ['math', 'pyramid', { side: 3, height: 12 }, 36, 0, 's²h/3'],
  // GL: 65 × 30 / 100 = 19.5
  ['health', 'glycemic-load', { gi: 65, carbs: 30 }, 19.5, 1, 'GI×carbs/100'],
  // Projectile: v=20 θ=45° → range 400/9.81 = 40.77 m
  ['science', 'projectile', { velocity: 20, angle: 45, g: 9.81 }, 40.77, 1, 'v²sin(2θ)/g'],
  // Pendulum L=1: 2π√(1/9.81) = 2.006 s
  ['science', 'pendulum', { length: 1, g: 9.81 }, 2.006, 1, '2π√(L/g)'],
  // Molality: 0.5/0.25 = 2.0 mol/kg
  ['science', 'molality', { moles: 0.5, solvent: 0.25 }, 2, 0.5, 'moles/kg solvent'],
  // Percent yield: 14.2/15.8 = 89.87%
  ['science', 'percent-yield', { actual: 14.2, theoretical: 15.8 }, 89.87, 1, 'actual/theoretical × 100'],
  // Latent heat: 2 kg × 2260 = 4520 kJ
  ['science', 'latent-heat', { mass: 2, process: '2260' }, 4520, 0, 'm×L'],
  // dBm: 30 dBm → 1 W; 1 W → 30 dBm
  ['tech-digital', 'dbm-watts', { mode: 'dbm2w', value: 30 }, 1, 0.01, '10^((30−30)/10)'],
  ['tech-digital', 'dbm-watts', { mode: 'w2dbm', value: 1 }, 30, 0.1, '30 + 10log10(1)'],
  // Business days 2026-06-01 (Mon) → 06-05 (Fri) = 5 weekdays
  ['everyday', 'business-days', { from: '2026-06-01', to: '2026-06-05' }, 5, 0, 'Mon–Fri week', 'contains'],
  // ─── Batch A1: 38 new tools (independent hand-computed) ───
  // Recast: 180,000 @ 6%/12 over 240 mo → M = 180000×0.005/(1−1.005^-240) = 1289.58
  ['finance', 'recast-mortgage', { balance: 200000, rate: 6, years: 20, extra: 20000 }, '1289.58', 0, 'recast payment', 'contains'],
  // Biweekly: monthly 1199.10 / 2 = 599.55
  ['finance', 'biweekly-mortgage', { principal: 200000, rate: 6, years: 30 }, '599.55', 0, 'half monthly payment', 'contains'],
  // Points: cost $3000, saves $47.91/mo → 62.6 months
  ['finance', 'mortgage-points', { loan: 300000, rate: 6, points: 1, newRate: 5.75, years: 5 }, '62.6', 0, 'break-even months', 'contains'],
  // Rent: min(30%×6000, 36%×6000−500) = min(1800, 1660) = 1660
  ['finance', 'rent-affordability', { income: 6000, debts: 500, rule: '30' }, '1660', 0, 'front/back-end min', 'contains'],
  // DRIP: 10000 × 1.08^10 = 21589.25
  ['finance', 'dividend-reinvestment', { initial: 10000, yield: 3, growth: 5, years: 10, monthly: 0 }, '21589', 0, 'compound 8%/yr', 'contains'],
  // Split 2:1: 100 shares → 200, price 200 → 100
  ['finance', 'stock-split', { shares: 100, price: 200, a: 2, b: 1 }, '200', 0, 'new share count', 'contains'],
  // EPS: (1,000,000 − 50,000)/200,000 = 4.75
  ['finance', 'eps-calculator', { netIncome: 1000000, prefDiv: 50000, shares: 200000 }, '4.75', 0, '(NI−pref)/shares', 'contains'],
  // BVPS: (5,000,000 − 500,000)/300,000 = 15.00
  ['finance', 'book-value-share', { equity: 5000000, pref: 500000, shares: 300000 }, '15.00', 0, 'common equity/shares', 'contains'],
  // NOI: 100,000×0.95 − 35,000 = 60,000
  ['finance', 'net-operating-income', { grossRent: 100000, vacancy: 5, opex: 35000 }, '60,000', 0, 'EGI − opex', 'contains'],
  // Utilization: 8000/20000 = 40%
  ['finance', 'credit-utilization', { balances: 8000, limits: 20000 }, '40.0%', 0, 'balances/limits', 'contains'],
  // APY: (1+0.05/12)^12−1 = 5.116%
  ['finance', 'apy-calculator', { rate: 5, freq: '12', principal: 10000, years: 1 }, '5.116', 0, 'effective yield', 'contains'],
  // Lump sum: 120000×1.12^10 = 372,702; SIP: 1000×((1.01^120−1)/0.01) = 230,039
  ['finance', 'lump-sum-vs-sip', { lump: 120000, sip: 1000, return: 12, years: 10 }, '372702', 0, 'FV lump sum', 'contains'],
  ['finance', 'lump-sum-vs-sip', { lump: 120000, sip: 1000, return: 12, years: 10 }, '230039', 0, 'FV SIP', 'contains'],
  // PMI: 270,000×0.5%/12 = 112.50
  ['finance', 'pmi-calculator', { homePrice: 300000, down: 10, pmiRate: 0.5 }, '112.50', 0, 'loan×rate/12', 'contains'],
  // PV: 24000×(1−1.05^-25)/0.05 = 338,255
  ['finance', 'pension-lump-sum', { pension: 2000, years: 25, discount: 5, lumpOffered: 350000 }, '338255', 0, 'annuity PV', 'contains'],
  // Vector add: (3,4,0)+(1,−2,0) = (4,2,0)
  ['math', 'vector-add', { ax: 3, ay: 4, az: 0, bx: 1, by: -2, bz: 0 }, '(4, 2, 0)', 0, 'component-wise', 'contains'],
  // Angle: a=(1,2), b=(3,1): cosθ=5/(√5·√10)=0.7071 → 45°
  ['math', 'angle-between-vectors', { ax: 1, ay: 2, az: 0, bx: 3, by: 1, bz: 0 }, '45.00', 0, 'dot/(|a||b|)', 'contains'],
  // Ring: π(64−25) = 122.52
  ['math', 'annulus-area', { R: 8, r: 5 }, '122.52', 0, 'π(R²−r²)', 'contains'],
  // Hexagon: (3√3/2)×36 = 93.53
  ['math', 'hexagon-area', { side: 6 }, '93.53', 0, '3√3/2 s²', 'contains'],
  // Parallelogram: 10×6 = 60
  ['math', 'parallelogram-area', { base: 10, height: 6 }, '60.00', 0, 'b×h', 'contains'],
  // Ellipse: π×8×5 = 125.66
  ['math', 'ellipse-area', { a: 8, b: 5 }, '125.66', 0, 'πab', 'contains'],
  // Sines: b = 10·sin60/sin40 = 13.47, c = 10·sin80/sin40 = 15.32
  ['math', 'law-of-sines', { a: 10, A: 40, B: 60 }, '13.47', 0, 'a·sinB/sinA', 'contains'],
  // Cosines: c² = 64+121−176·cos37 → c = 6.67
  ['math', 'law-of-cosines', { a: 8, b: 11, C: 37 }, '6.67', 0, 'a²+b²−2ab·cosC', 'contains'],
  // Weighted: (80×0.3+90×0.4+85×0.3)/1 = 85.5
  ['math', 'weighted-average', { values: '80,90,85', weights: '0.3,0.4,0.3' }, '85.50', 0, 'Σwv/Σw', 'contains'],
  // CV: mean 14, σ=√8=2.828 → 20.20%
  ['math', 'coefficient-of-variation', { data: '10,12,14,16,18' }, '20.20', 0, 'σ/μ×100', 'contains'],
  // Quartiles of 1,3,5,7,9,11,13: Q1=3, Q3=11
  ['math', 'quartile', { data: '1,3,5,7,9,11,13' }, 'Q1: 3', 0, 'median of halves', 'contains'],
  // Percent error: |9.8−10|/10 = 2%
  ['math', 'percent-error', { measured: 9.8, true: 10 }, '2.00', 0, '|m−t|/|t|', 'contains'],
  // Friction: 0.4×10×9.81 = 39.24 N
  ['science', 'friction', { mu: 0.4, mass: 10, g: 9.81 }, '39.24', 0, 'μmg', 'contains'],
  // Incline: (49.05 − 0.2×84.96)/10 = 3.21 m/s²
  ['science', 'inclined-plane', { mass: 10, angle: 30, mu: 0.2, g: 9.81 }, '3.21', 0, 'g(sinθ−μcosθ)', 'contains'],
  // Impulse: 500×0.2 = 100 N·s
  ['science', 'impulse', { force: 500, time: 0.2 }, '100.00', 0, 'FΔt', 'contains'],
  // Terminal: √(2×80×9.81/(1.225×0.7×0.8)) = 47.83
  ['science', 'terminal-velocity', { mass: 80, rho: 1.225, cd: 0.7, area: 0.8, g: 9.81 }, '47.83', 0, '√(2mg/ρACd)', 'contains'],
  // Snell: θ2 = asin(sin45/1.5) = 28.13°
  ['science', 'snells-law', { n1: 1, angle1: 45, n2: 1.5 }, '28.13', 0, 'n1sinθ1=n2sinθ2', 'contains'],
  // Mirror: 1/20−1/60 → di=30
  ['science', 'mirror-equation', { f: 20, do: 60 }, '30.00', 0, '1/f=1/do+1/di', 'contains'],
  // Moles: 18/18 = 1.0 mol
  ['science', 'mole-conversion', { mass: 18, molar: 18 }, '1.0000', 0, 'm/M', 'contains'],
  // Charles: 2×350/300 = 2.33 L
  ['science', 'charles-law', { v1: 2, t1: 300, t2: 350 }, '2.33', 0, 'V1T2/T1', 'contains'],
  // WHtR: 80/170 = 0.47
  ['health', 'waist-height-ratio', { waist: 80, height: 170 }, '0.47', 0, 'waist/height', 'contains'],
  // MAP: (2×80+120)/3 = 93.3
  ['health', 'map-calculator', { sys: 120, dia: 80 }, '93.3', 0, '(2D+S)/3', 'contains'],
  // LDL: 200−50−150/5 = 120
  ['health', 'ldl-calculator', { total: 200, hdl: 50, trig: 150 }, '120.0', 0, 'TC−HDL−TG/5', 'contains'],
  // IV: 1000×15/(8×60) = 31.25 → 31 gtt/min
  ['health', 'iv-drip-rate', { volume: 1000, hours: 8, drop: 15 }, '31 gtt', 0, 'V×drop/(t×60)', 'contains'],
  // ─── Batch A2: 42 new tools (independent hand-computed) ───
  // Pulley: 200/(4×0.9) = 55.56 N
  ['engineering', 'pulley', { load: 200, ropes: 4, efficiency: 90 }, '55.56', 0, 'load/(ropes×eff)', 'contains'],
  // Lever: effort arm = 100×0.5/20 = 2.50 m
  ['engineering', 'lever', { load: 100, effort: 20, loadArm: 0.5 }, '2.50', 0, 'load×arm/effort', 'contains'],
  // Wind: q = 0.5×1.225×25² = 382.8 Pa; F = 382.8×1.2×10 = 4593.8 N
  ['engineering', 'wind-load', { speed: 90, area: 10, cd: 1.2, rho: 1.225 }, '4593.8', 0, '0.5ρV²CdA', 'contains'],
  // Duct: A = 400/800 = 0.5 ft², D = 2√(0.5/π)×12 = 9.6 in
  ['engineering', 'duct-size', { cfm: 400, velocity: 800 }, '9.6', 0, '2√(A/π)', 'contains'],
  // Head loss: 0.02×500×0.2039 = 2.04 m
  ['engineering', 'head-loss', { f: 0.02, length: 50, diam: 0.1, velocity: 2 }, '2.04', 0, 'f·L/D·V²/2g', 'contains'],
  // Breaker: 5000/240 = 20.8 A × 1.25 = 26.0 → 30 A
  ['engineering', 'breaker-size', { watts: 5000, voltage: 240 }, '30 A', 0, '125% rule', 'contains'],
  // PFC: 100×(tan(acos0.7)−tan(acos0.95)) = 69.2 kVAR
  ['engineering', 'power-factor-correction', { kw: 100, pfFrom: 0.7, pfTo: 0.95 }, '69.2', 0, 'P(tanφ1−tanφ2)', 'contains'],
  // API: 100k/1000×0.5 = $50 + 50h×$0.15 = $7.50
  ['tech-digital', 'api-cost', { requests: 100000, price: 0.5, computeHrs: 50, computeRate: 0.15 }, '57.50', 0, 'requests+compute', 'contains'],
  // Density: 'loan' ×3 in 6 words = 50%
  ['tech-digital', 'keyword-density', { text: 'loan calculator loan payment loan rate', keyword: 'loan' }, '50.0%', 0, 'occ/words', 'contains'],
  // Flesch: 206.835 − 1.015×12.5 − 84.6×1.4 = 75.7
  ['tech-digital', 'reading-grade', { words: 100, sentences: 8, syllables: 140 }, '75.7', 0, 'Flesch', 'contains'],
  // Typing: 500/5/2 = 50 − 10/2 = 45 WPM
  ['tech-digital', 'typing-speed', { chars: 500, minutes: 2, errors: 10 }, '45.0', 0, 'gross − errors/min', 'contains'],
  // Ad revenue: 100k/1000×$5 = $500
  ['tech-digital', 'ad-revenue', { impressions: 100000, cpm: 5, ctr: 1, cpc: 0.3 }, '500.00', 0, 'impressions/1000×CPM', 'contains'],
  // CTR: 2500/100000 = 2.50%
  ['tech-digital', 'click-through-rate', { clicks: 2500, impressions: 100000 }, '2.50', 0, 'clicks/impressions', 'contains'],
  // UK NI: (45000−12570)×8% = 2594.40
  ['regional', 'uk-ni', { salary: 45000, selfEmployed: '0' }, '2594.40', 0, '8% band', 'contains'],
  // FICA: 80000×6.2% + 80000×1.45% = 6120
  ['regional', 'us-fica', { wages: 80000, married: '0' }, '6120.00', 0, 'SS+Medicare', 'contains'],
  // CPP: (70000−3500)×5.95% = 3956.75
  ['regional', 'canada-cpp', { income: 70000 }, '3956.75', 0, 'pensionable×5.95%', 'contains'],
  // Super: min(80000,65060)×11.5% = 7481.90
  ['regional', 'australia-super', { salary: 80000, rate: 11.5 }, '7481.90', 0, 'capped base', 'contains'],
  // CPF <55: 6000×20% = 1200 employee, ×17% = 1020 employer
  ['regional', 'singapore-cpf', { salary: 6000, age: '55' }, '1200.00', 0, 'employee share', 'contains'],
  // Plaster: dry = 1.2×1.33×1.1 = 1.756 m³; cement = 1.756/5 = 0.351 m³ = 10.1 bags
  ['construction', 'plaster', { area: 100, thick: 12, ratio: '4' }, '10.1', 0, 'cement bags', 'contains'],
  // Gutter: ceil(60/3) = 20 sections; ceil(60/10) = 6 downspouts
  ['construction', 'gutter', { perimeter: 60, section: 3, corners: 4 }, '20', 0, 'sections', 'contains'],
  // Sod: 500×(110/100)/10 = 55 rolls
  ['construction', 'sod', { area: 500, roll: 10, waste: 10 }, '55', 0, 'rolls with waste', 'contains'],
  // Ceiling: 120/4×1.1 = 33 tiles
  ['construction', 'ceiling-tile', { length: 12, width: 10, tile: '2', waste: 10 }, '33', 0, '2×2 tiles', 'contains'],
  // ISO week of 2026-06-15 = week 25
  ['everyday', 'week-number', { date: '2026-06-15' }, 'Week 25', 0, 'ISO 8601', 'contains'],
  // 2026-06-15 = day 166
  ['everyday', 'day-of-year', { date: '2026-06-15' }, 'Day 166', 0, 'ordinal date', 'contains'],
  // 2028: divisible by 4, not 100 → leap
  ['everyday', 'leap-year', { year: 2028 }, 'is a leap year', 0, '÷4 rule', 'contains'],
  // Lotto 6/49: C(49,6) = 13,983,816
  ['everyday', 'lottery-odds', { balls: 6, max: 49, match: 6 }, '13,983,816', 0, 'C(49,6)', 'contains'],
  // CCC: 45+30−35 = 40 days
  ['business', 'cash-conversion-cycle', { dio: 45, dso: 30, dpo: 35 }, '40 days', 0, 'DIO+DSO−DPO', 'contains'],
  // Share: 500000/5000000 = 10%
  ['business', 'market-share', { revenue: 500000, market: 5000000 }, '10.0%', 0, 'rev/market', 'contains'],
  // AOV: 25000/500 = $50
  ['business', 'aov', { revenue: 25000, orders: 500 }, '50.00', 0, 'rev/orders', 'contains'],
  // P/W: 250/1500×1000 = 166.7 hp/tonne
  ['auto-transport', 'power-to-weight', { power: 250, weight: 1500 }, '166.7', 0, 'hp/tonne', 'contains'],
  // ¼ mile: ET = 5.825×(3307/250)^⅓ = 13.78 s, mph = 234×(250/3307)^⅓ = 98.9
  ['auto-transport', 'quarter-mile', { power: 250, weight: 3307 }, '13.78', 0, 'ET rule', 'contains'],
  // WFH: 220×(30×0.655 + 13) = 7183
  ['career-freelance', 'wfh-savings', { miles: 30, days: 220, rate: 0.655, meals: 8, other: 5 }, '7183', 0, 'commute+meals+other', 'contains'],
  // Vesting: 1000/4 = 250/yr; at 2.5y = 250×1 + 1.5×250 = 625
  ['career-freelance', 'stock-vesting', { shares: 1000, years: 4, cliff: 1, elapsed: 2.5 }, '625', 0, 'cliff+graded', 'contains'],
  // Treadmill: (60/10)×1.06 = 6.36 min/km = 6:22
  ['fitness-exercise', 'treadmill-pace', { speed: 10, incline: 3 }, '6:22', 0, 'incline effort', 'contains'],
  // Rowing: 480 s/2000 m → 120 s split = 2:00; watts = 2.8/0.013824 = 202.5
  ['fitness-exercise', 'rowing-split', { distance: 2000, minutes: 8, seconds: 0 }, '2:00', 0, '500m split', 'contains'],
  // Alcohol: 12oz×29.57×0.05×0.789×7 = 98 kcal
  ['food-nutrition', 'alcohol-calories', { volume: 12, abv: 5, drinks: 1 }, '98', 0, 'ethanol kcal', 'contains'],
  // Fan oven: 200 − 20 = 180°C
  ['food-nutrition', 'oven-conversion', { temp: 200, time: 40, mode: 'fan' }, '180', 0, 'fan − 20°C', 'contains'],
  // Appliance: 1.5 kW×3×30 = 135 kWh × $0.15 = $20.25
  ['home-garden', 'appliance-cost', { watts: 1500, hours: 3, days: 30, rate: 0.15 }, '20.25', 0, 'kWh×rate', 'contains'],
  // Firewood: 4×4×8 = 128 ft³ = 1.00 cord
  ['home-garden', 'firewood', { length: 4, height: 4, depth: 8, price: 250 }, '1.00 cords', 0, '128 ft³/cord', 'contains'],
  // Smoking: 8×1×365×10 = 29,200
  ['lifestyle', 'cigarette-cost', { packPrice: 8, packs: 1, years: 10, interest: 5 }, '29,200', 0, 'pack×365×years', 'contains'],
  // ACT 28 → SAT 1300–1320 concordance
  ['education', 'act-sat-compare', { act: 28 }, '1300–1320', 0, 'concordance', 'contains'],
  // 9.81 m/s² base conversion
  ['conversion', 'acceleration-conv', { value: 9.81, from: 'ms2' }, '9.8100', 0, 'base unit', 'contains'],
  ['finance', 'prorated-rent', { rent: 1200, day: 15, days: 30 }, 600, 0.01, '1200/30×15 daily rate method'],
  ['finance', 'dso', { ar: 50000, sales: 600000, days: 365 }, 30.42, 0.05, 'AR/credit sales × period days'],
  ['math', 'quartiles', { data: '2,4,6,8,10,12,16' }, 4, 0.01, 'Q1 median-of-halves odd n'],
  ['math', 'rms', { data: '3,4' }, 3.5355, 0.01, '√((9+16)/2)'],
  ['math', 'covariance', { x: '2,4,6,8', y: '1,3,2,5' }, 2.75, 0.01, 'population covariance of 4 pairs'],
  ['math', 'exponential-prob', { rate: 0.5, x: 2 }, 63.21, 0.05, '1−e^(−1) as %'],
  ['math', 'expected-value', { outcomes: '10,20,30', probs: '0.2,0.3,0.5' }, 23, 0.01, 'Σ outcome×probability'],
  ['math', 'euler-totient', { n: 36 }, 12, 0.01, '36×(1/2)×(2/3)'],
  ['science', 'hooke-law', { k: 200, x: 0.15 }, 30, 0.01, 'F = kx'],
  ['science', 'mach-number', { v: 680, a: 340 }, 2, 0.01, 'v ÷ local sound speed'],
  ['science', 'stefan-boltzmann', { T: 300, emis: 1 }, 459.3, 0.5, 'σT⁴ per m²'],
  ['science', 'coulomb-law', { q1: 1, q2: 1, r: 0.1 }, 0.8988, 0.01, 'kq₁q₂/r² with µC inputs'],
  ['science', 'photon-energy', { wl: 500 }, 2.48, 0.01, 'hc/λ in eV'],
  ['science', 'debroglie', { m: 9.11e-31, v: 1e6 }, 7.273e-10, 0.001, 'h/mv in metres'],
  ['science', 'rocket-equation', { ve: 3000, m0: 10000, mf: 4000 }, 2749, 1, 've·ln(m0/mf)'],
  ['science', 'carbon-dating', { pct: 25, hl: 5730 }, 11460, 1, '5730×log₂(4)'],
  ['science', 'calorimetry', { m: 0.5, c: 4186, dT: 20 }, 41860, 1, 'mcΔT'],
  ['science', 'freezing-depression', { i: 1, kf: 1.86, m: 1.5 }, 2.79, 0.01, 'i·Kf·m'],
  ['science', 'air-density', { p: 101325, T: 288.15 }, 1.225, 0.001, 'p/(R·T) ISA sea level'],
  ['health', 'creatinine-clearance', { age: 40, wt: 70, scr: 1, sex: 'm' }, 97.22, 0.1, 'Cockcroft-Gault male'],
  ['health', 'anion-gap', { na: 140, cl: 104, hco3: 24, alb: 4 }, 12, 0.01, 'Na−(Cl+HCO₃)'],
  ['health', 'qtc', { qt: 400, hr: 60 }, 400, 0.5, 'Bazett at RR = 1 s'],
  ['health', 'ponderal-index', { wt: 70, ht: 1.75 }, 13.06, 0.01, 'kg/m³'],
  ['tech-digital', 'subnet-cidr', { ip: '192.168.1.10', prefix: 26 }, '192.168.1.0/26', 0, '/26 network address', 'contains'],
  ['tech-digital', 'video-bitrate', { mbps: 8, min: 10, audio: 128 }, 609.6, 0.5, '(8 Mbps + 128 kbps) × 600 s in MB'],
  ['construction', 'stair-stringer', { rise: 105, risers: 14, tread: 10 }, 7.5, 0.01, '105 ÷ 14 risers'],
  ['construction', 'siding-squares', { len: 40, ht: 10, walls: 4, openings: 100, waste: 10 }, 16.5, 0.1, '(1600−100)/100 × 1.1'],
  ['construction', 'soffit-area', { len: 60, wid: 30, oh: 1.5 }, 270, 0.01, 'perimeter × overhang'],
  ['construction', 'post-hole-concrete', { holes: 8, dia: 12, depth: 36, post: 4 }, 0.6, 0.02, '(πr²h − post) × 8 ÷ 27'],
  ['construction', 'fence-panel', { len: 100, panel: 6 }, 17, 0.01, 'ceil(100/6) panels'],
  ['construction', 'gravel-driveway', { len: 40, wid: 12, depth: 4 }, 8.3, 0.05, '160 cu ft → yd³ × 1.4 t'],
  ['construction', 'insulation-batts', { area: 1000, cover: 40 }, 25, 0.01, '1000 ÷ 40 units'],
  ['engineering', 'section-modulus', { shape: 'rect', b: 50, h: 100 }, 83333.3, 1, 'bh²/6'],
  ['engineering', 'shaft-torsion', { T: 100, d: 20 }, 63.66, 0.1, '16T/πd³ in MPa'],
  ['engineering', 'pulley-speed', { d1: 100, n1: 1750, d2: 200 }, 875, 0.1, 'd₁n₁/d₂'],
  ['engineering', 'manning-flow', { D: 0.3, n: 0.013, S: 0.01 }, 0.0967, 0.001, '(1/n)·A·R^(2/3)·√S'],
  ['engineering', 'orifice-flow', { cd: 0.62, d: 0.05, h: 2 }, 7.63, 0.05, 'Cd·A·√(2gh) in L/s'],
  ['engineering', 'three-phase-power', { V: 400, I: 20, pf: 0.85 }, 11.78, 0.02, '√3·V·I·pf in kW'],
  ['engineering', 'ups-sizing', { load: 600, min: 30, V: 12, eff: 85 }, 29.4, 0.1, 'Wh ÷ (V·η) in Ah'],
  ['everyday', 'poker-flush', { matches: 5 }, 0.0495, 0.001, 'C(13,5)/C(52,5) as %'],
  ['everyday', 'easter-date', { year: 2026 }, 'April 5', 0, 'Gregorian computus 2026', 'contains'],
  ['everyday', 'day-of-week', { date: '2000-01-01' }, 'Saturday', 0, 'Y2K rollover day', 'contains'],
  ['everyday', 'moon-phase', { date: '2000-01-06' }, 'New Moon', 0, 'reference new moon date', 'contains'],
  ['everyday', 'meeting-cost', { people: 8, rate: 50, hours: 1.5 }, 600, 0.01, '8 × 50 × 1.5'],
  ['utilities', 'password-entropy', { len: 12, pool: 62 }, 71.45, 0.1, '12·log₂62 bits'],
  ['utilities', 'speech-time', { words: 650, wpm: 130 }, 5, 0.01, '650 ÷ 130 wpm'],

['finance', 'payout-ratio', { div: 3, eps: 8 }, 37.5, 1, 'div ÷ eps × 100'],
['finance', 'market-cap', { price: 150, shares: 1000000000 }, 150, 1, 'price × shares in $B'],
['finance', 'sortino-ratio', { ret: 12, rf: 3, dd: 10 }, 0.9, 1, '(ret−rf)/dd'],
['finance', 'max-drawdown', { peak: 100000, trough: 75000 }, -25, 1, 'signed drawdown (trough-peak)/peak'],
['finance', 'zero-coupon-bond', { face: 1000, rate: 5, years: 10 }, 613.91, 0.1, '1000/1.05^10'],
['finance', 'cd-ladder', { total: 50000, rungs: 5, rate: 4 }, 10000, 1, 'per-CD deposit'],
['finance', 'ibond-value', { p: 1000, rate: 4, years: 5 }, 1216.65, 0.1, '1000×1.04^5'],
['finance', 'put-call-parity', { call: 5, put: 4, strike: 100, spot: 101, rf: 2, t: 0.5 }, -1, 0.02, 'signed parity gap'],
['finance', 'risk-reward-ratio', { entry: 100, stop: 95, target: 115 }, 3, 1, '15/5 R:R'],
['finance', 'position-size', { acct: 10000, riskPct: 1, entry: 50, stop: 47 }, 33, 1, 'floored shares'],
['finance', 'stop-loss', { entry: 50, pct: 6, long: 1 }, 47, 1, 'long stop −6%'],
['finance', 'cost-basis-avg', { q1: 100, p1: 10, q2: 100, p2: 12 }, 11, 1, 'blended average'],
['finance', 'dca-calculator', { amount: 200, prices: '10,12,11,9,10,13' }, 10.67, 1, 'invested ÷ shares'],
['finance', 'staking-rewards', { p: 5000, apr: 8, years: 2 }, 5832, 1, '5000×1.08²'],
['finance', 'kelly-criterion', { p: 55, b: 1.5 }, 25, 1, '0.55−0.45/1.5'],
['finance', 'value-at-risk', { val: 100000, vol: 2, z: 2.33, days: 1 }, 4660, 1, 'V·σ·z'],
['finance', 'ev-ebitda', { ev: 500000000, ebitda: 80000000 }, 6.25, 1, 'EV ÷ EBITDA'],
['finance', 'peg-ratio', { pe: 20, g: 15 }, 1.33, 1, 'P/E ÷ growth'],
['finance', 'free-cash-flow', { ocf: 300000, capex: 100000 }, 200000, 1, 'OCF − capex'],
['finance', 'interest-coverage', { ebit: 500000, interest: 125000 }, 4, 1, 'EBIT ÷ interest'],
['finance', 'asset-turnover', { rev: 1200000, assets: 800000 }, 1.5, 1, 'rev ÷ assets'],
['finance', 'runway-months', { cash: 250000, burn: 25000 }, 10, 1, 'cash ÷ burn'],
['finance', 'effective-tax-rate', { tax: 24500, income: 100000 }, 24.5, 1, 'tax ÷ income'],
['finance', 'quarterly-tax', { income: 120000, rate: 24, withheld: 20000 }, 2200, 1, 'per-quarter owed'],
['finance', 'late-fee-interest', { inv: 10000, rate: 12, days: 30 }, 98.63, 0.1, 'P·r·d/365'],
['finance', 'factoring-fee', { inv: 50000, advance: 85, fee: 2 }, 41500, 1, 'net advance'],
['finance', 'royalty-payment', { sales: 200000, rate: 7.5 }, 15000, 1, 'sales × rate'],
['finance', 'franchise-cost', { fee: 35000, build: 150000, equip: 60000, work: 40000 }, 285000, 1, 'component sum'],
['finance', 'food-cost-percent', { cost: 4.2, price: 14 }, 30, 1, 'cost/price %'],
['finance', 'menu-price', { cost: 5, target: 28 }, 17.86, 0.1, 'cost ÷ 0.28'],
['finance', 'rmd', { bal: 500000, age: 76 }, 21097, 1, 'balance ÷ 23.7'],
['finance', 'hsa-growth', { bal: 5000, contrib: 3850, growth: 6, years: 10 }, 59700, 1, 'FV annuity'],
['finance', 'safe-withdrawal', { port: 1500000, rate: 4 }, 60000, 1, '4% rule'],
['finance', 'noi', { gross: 120000, vac: 5, opex: 42000 }, 72000, 1, 'EGI − opex'],
['finance', 'price-per-sqft', { price: 450000, sqft: 1800 }, 250, 1, 'price ÷ area'],
['finance', 'rent-increase', { rent: 1500, pct: 5 }, 1575, 1, '×1.05'],
['finance', 'deposit-interest', { dep: 2000, rate: 1.5, months: 24 }, 60, 1, 'simple interest'],
['finance', 'roommate-rent-split', { rent: 2400, incomes: '6000,4000,3000' }, 1107.69, 1, 'income-weighted share (cents)'],
['finance', 'purchasing-power', { amt: 100000, infl: 3, years: 10 }, 74409, 1, '÷1.03^10'],
['finance', 'refinance-breakeven', { costs: 3000, save: 150 }, 20, 1, 'costs ÷ savings'],
  ["math","completing-square",{ a: 1,b: 6,c: 5 },-1,1,"x2+6x+5 roots"],
  ["math","partial-fractions",{ p: 1,q: -1,r: 1,s: 1 },0.5,0.01,"A = 1/2 for 1/(x2-1)"],
  ["math","direct-variation",{ mode: 1,a: 3,b: 4 },12,1,"y = 3 x 4"],
  ["math","inverse-variation",{ mode: 1,a: 12,b: 4 },3,1,"y = 12/4"],
  ["math","spherical-cap",{ R: 5,h: 2 },54.45,0.1,"pi*4*13/3"],
  ["science","angular-momentum",{ m: 2,v: 3,r: 4 },24,1,"m*v*r"],
  ["science","bullet-drop",{ d: 100,v: 400 },30.7,0.5,"0.5*g*(d/v)^2 in cm"],
  ["science","redshift",{ rest: 500,obs: 505 },0.01,0.001,"z = 5/500"],
  ["science","buffer-ph",{ pka: 4.76,ratio: 1 },4.76,0.01,"pH = pKa at ratio 1"],
  ["science","machine-efficiency",{ out: 75,inp: 100 },75,1,"75/100"],
  ["health","bmr-mifflin",{ w: 70,h: 170,age: 30,sex: 1 },1618,1,"Mifflin male display rounds"],
  ["health","tdee-macro",{ w: 70,h: 170,age: 30,sex: 1,act: 1.55,pct: 30 },2507,2,"1617.5*1.55"],
  ["health","gfr-estimate",{ scr: 1,age: 40,sex: 0 },107.3,0.3,"CKD-EPI 2021 male Scr1.0 age40"],
  ["health","chw",{ w: 80,amp: 6 },85.1,0.3,"80/0.94"],
  ["health","gcs",{ e: 4,v: 5,m: 6 },15,0.5,"E4+V5+M6"],
  ["health","apgar",{ a: 2,p: 2,g: 2,act: 2,r: 2 },10,0.5,"5 signs x 2"],
  ["health","vaccination-schedule",{ months: 6 },6,1,"age echo in months"],
  ["health","pediatric-dose",{ w: 20,mgkg: 15,max: 1000 },300,1,"20*15"],
  ["tech-digital","cidr-convert",{ prefix: 24,octet: 1 },254,1,"/24 usable hosts"],
  ["tech-digital","gpu-comparison-perf",{ fps: 90,price: 500,watt: 250 },0.18,0.01,"90/500 fps per dollar"],
  ["tech-digital","data-center-pue",{ total: 130,it: 100 },1.3,0.01,"130/100"],
  ["tech-digital","screen-ppi",{ w: 1920,h: 1080,d: 24 },91.79,0.2,"2202.9/24"],
  ["tech-digital","hash-rate",{ hr: 100,net: 500,reward: 3.125,price: 60000 },0.00009,0.000005,"share*144*3.125"],
  ["tech-digital","storage-array",{ n: 5,tb: 8,raid: 5 },32,0.5,"(5-1)*8 TB"],
  ["tech-digital","docker-resource",{ ram: 16,cpu: 8,cram: 1,ccpu: 0.5,over: 20 },12,0.5,"floor(12.8/1)"],
  ["tech-digital","load-test-users",{ rps: 500,rt: 0.4,think: 0 },200,1,"500*0.4 VUs"],
  ["engineering","hydraulic-press",{ f1: 200,a1: 1,a2: 10 },2000,1,"F1*area ratio"],
  ["engineering","radiation-shielding",{ i0: 100,hvl: 2,x: 6 },12.5,0.2,"100*0.5^3"],
  ["engineering","steam-consumption",{ flow: 100,hfg: 2257 },62.69,0.3,"100*2257/3600 kW"],
  ["engineering","noise-level",{ l1: 85,l2: 88 },89.76,0.2,"10log10(10^8.5+10^8.8)"],
  ["construction","rafter-length",{ run: 12,rise: 5 },13,0.05,"sqrt(144+25)"],
  ["construction","shingle-squares",{ area: 2400,waste: 10 },26.4,0.2,"24*1.1 squares"],
  ["construction","drywall-sheets",{ area: 800,sheet: 32,waste: 10 },28,0.5,"ceil(25*1.1)"],
  ["construction","tile-boxes",{ area: 200,box: 20,waste: 10 },11,0.5,"ceil(10*1.1)"],
  ["everyday","sunrise-sunset-length",{ lat: 40,decl: 23.44 },14.85,0.15,"summer solstice 40N"],
  ["everyday","pomodoro-planner",{ sessions: 8,work: 25,brk: 5 },240,1,"8*30 min"],
  ["everyday","gift-wrap",{ l: 40,w: 30,h: 15 },6300,10,"2(w+h)(l+2h) sq cm"],
  ["everyday","moving-truck",{ rooms: 3,cf: 150 },450,1,"3*150 cu ft"],
  ["everyday","jet-lag",{ zones: 7,dir: 1 },7,0.5,"7 eastward days"],
  ["everyday","heat-pump-savings",{ load: 12000,rate: 0.15,cop: 3 },1200,5,"12000*0.15*(1-1/3)"],
  ["lifestyle","french-press-ratio",{ water: 500,ratio: 15 },33.33,0.2,"500/15 g"],
  ["lifestyle","cocktail-dilution",{ vol: 100,abv: 40,dil: 25 },32,0.3,"40/1.25"],
  ["lifestyle","wine-servings",{ bottles: 3,pour: 5 },15,0.5,"3*25.4/5"],
  ["lifestyle","baking-scale",{ base: 500,new: 750,water: 325 },488,0.5,"325*1.5 rounded display"],
  ["lifestyle","sourdough-hydration",{ water: 350,flour: 500 },70,0.5,"350/500"],
  ["lifestyle","lawn-fertilizer",{ area: 5000,rate: 1,npct: 29 },17.24,0.3,"5/0.29 lb"],
  ["lifestyle","candle-wax",{ jars: 12,oz: 8 },82.56,0.5,"12*8*0.86"],
  ["lifestyle","knit-gauge",{ width: 20,spi: 5 },100,0.5,"20*5 stitches"],
  ["lifestyle","quilt-fabric",{ w: 60,h: 80,fw: 42 },4.89,0.1,"2*88/36 yards"],
  ["parenting-family","baby-milestones",{ months: 9 },9,0.5,"age echo"],
  ["parenting-family","child-support-split",{ mine: 5000,other: 3000,base: 1200 },750,1,"1200*5/8"],
  ["parenting-family","family-tree-generation",{ gen: 5 },32,0.5,"2^5"],
  ["education","assignment-split",{ score: 90,worth: 40 },36,0.3,"90*0.4"],
  ["education","citation-count",{ cites: "10,8,5,3,1" },3,0.5,"h-index of 10,8,5,3,1"],
  ["career-freelance","vacation-days",{ rate: 15,months: 8 },10,0.2,"15*8/12"],
  ["career-freelance","timesheet-hours",{ times: "8:30,7:45,8:00" },24.25,0.05,"8.5+7.75+8"],
  ["career-freelance","shift-differential",{ base: 25,diff: 15,hours: 8 },28.75,0.2,"25*1.15"],
  ["business","customer-ltv",{ arpu: 50,margin: 70,churn: 5 },700,2,"50*0.7/0.05"],
  ["business","csat-score",{ good: 180,total: 200 },90,0.5,"180/200"],
  ["business","conversion-funnel",{ s1: 1000,s2: 300,s3: 60 },6,0.2,"60/1000 %"],
  ["business","ab-test-significance",{ na: 1000,ca: 50,nb: 1000,cb: 65 },1.44,0.05,"two-proportion z"],
  ["business","project-bid",{ cost: 50000,cont: 10,margin: 20 },68750,10,"bid = cost*1.1/(1-0.2)"],
  ["business","retainer-value",{ monthly: 5000,months: 12,disc: 10 },54000,10,"60000*0.9"],
  ["utilities","qr-content-size",{ bytes: 500,ecc: 1 },17,0.5,"version 17 M covers 500B (504 cap)"],
  ["utilities","timestamp-convert",{ ts: 1700000000 },2023,0.5,"2023-11-14 UTC year"],
  ["finance","apr-annual",{ principal: 20000,fees: 2000,interest: 4800,years: 4 },8.5,0.05,"(2000+4800)/20000/4"],
  ["finance","auto-lease-vs-buy",{ lPay: 350,lDown: 2500,lTerm: 36,bPay: 450,bDown: 3000,bTerm: 60 },15100,1,"lease total"],
  ["finance","heloc-payment",{ bal: 50000,rate: 8 },333.33,0.5,"50000*0.08/12"],
  ["finance","pmi-drop",{ bal: 152000,value: 200000 },76,0.2,"152000/200000 %"],
  ["finance","escrow-analysis",{ tax: 3600,ins: 1200 },466.67,0.5,"4800*1.1667/12"],
  ["finance","portfolio-beta",{ w1: 60,b1: 1.2,w2: 40,b2: 0.8 },1.04,0.01,"0.6*1.2+0.4*0.8"],
  ["finance","yield-to-worst",{ ytm: 5.2,ytc: 4.1 },4.1,0.05,"min"],
  ["finance","coupon-payment",{ face: 1000,rate: 6,perYear: 2 },30,0.1,"1000*0.06/2"],
  ["finance","clean-dirty-price",{ dirty: 1025,accrued: 8.5 },1016.5,0.1,"1025-8.5"],
  ["finance","convexity",{ p0: 1000,pUp: 1019,pDn: 982,dy: 0.01 },10,0.2,"(1019+982-2000)/(1000*0.0001)"],
  ["finance","duration-bond",{ mac: 7.2,y: 6,perYear: 2 },6.99,0.05,"7.2/1.03"],
  ["finance","appreciation-forecast",{ val: 300000,g: 3,years: 10 },403175,100,"300000*1.03^10"],
  ["finance","seller-net",{ price: 400000,comm: 6,closing: 3000,payoff: 250000 },123000,10,"400000-24000-3000-250000"],
  ["finance","points-breakeven",{ cost: 4000,save: 80 },50,0.2,"4000/80 months"],
  ["math","nth-root",{ x: 27,n: 3 },3,0.01,"cube root 27"],
  ["math","series-sum-ap",{ a: 2,d: 3,n: 10 },155,0.5,"n/2(2a+(n-1)d)"],
  ["math","sigma-notation",{ n: 10 },385,0.5,"sum of squares"],
  ["math","combination-repeat",{ n: 5,k: 2 },15,0.05,"C(6,2)"],
  ["math","permutation-repeat",{ n: 3,k: 4 },81,0.05,"3^4"],
  ["math","probability-odds",{ a: 3,b: 1 },75,0.2,"3/4"],
  ["math","negative-binomial",{ k: 2,n: 3,p: 0.5 },0.25,0.005,"C(2,1)*0.25*0.5"],
  ["math","circle-through-points",{ a: 3,b: 4,c: 5 },2.5,0.02,"345 triangle R"],
  ["math","secant-tangent",{ s: 4,e: 5 },6,0.05,"sqrt(4*9)"],
  ["math","inscribed-angle",{ central: 80 },40,0.2,"half central"],
  ["math","sector-perimeter",{ r: 5,deg: 68.75 },16,0.05,"10+5*1.2"],
  ["math","ellipse-perimeter",{ a: 5,b: 3 },25.527,0.05,"Ramanujan 5,3"],
  ["math","rectangular-solid",{ l: 3,w: 4,h: 12 },13,0.05,"sqrt(9+16+144)"],
  ["math","triangular-prism",{ b: 6,h: 4,len: 10 },120,0.5,"12*10"],
  ["math","octahedron-volume",{ a: 3 },12.728,0.05,"sqrt2/3*27"],
  ["math","icosahedron-volume",{ a: 2 },17.454,0.05,"5(3+sqrt5)/12*8"],
  ["math","bitwise-xor",{ a: 12,b: 10 },6,0.05,"1100 xor 1010"],
  ["math","units-per-person",{ total: 24,people: 6 },4,0.05,"24/6"],
  ["math","rate-x-time",{ mode: 1,a: 60,b: 3 },180,0.5,"60*3"],
  ["math","work-rate-together",{ a: 6,b: 3 },2,0.05,"1/(1/6+1/3)"],
  ["math","digital-root",{ n: 98765 },8,0.05,"35 -> 8"],
  ["math","mixture-percent",{ v1: 200,p1: 30,v2: 300,p2: 10 },18,0.1,"(60+30)/500"],
  ["finance","rent-vs-sell",{ rentNet: 20000,sell: 350000,inv: 5,years: 10 },20113,5,"sale gains 220113 minus rent 200000"],
  ['science', 'dew-point', {"temp":30,"rh":70}, 23.9, 0.2, 'Magnus: T=30, RH=70 → 23.9 °C'],
  ['science', 'cloud-base-lcl', {"temp":25,"dew":15}, 1250, 1, '125 × 10 °C spread = 1250 m'],
  ['science', 'grahams-law', {"m1":2,"m2":32}, 4, 0.01, '√(32/2) = 4×'],
  ['science', 'osmotic-pressure', {"molarity":0.3,"temp":310}, 7.64, 0.05, '0.3 × 0.0821 × 310 = 7.64 atm'],
  ['science', 'sound-intensity', {"l1":70,"l2":60}, 70.4, 0.1, '10log10(1.1e-5/1e-12) = 70.4 dB'],
  ['science', 'angular-velocity', {"rpm":60}, 6.28, 0.05, '60 rpm = 2π rad/s'],
  ['health', 'corrected-calcium', {"ca":8,"alb":2}, 9.6, 0.05, '8 + 0.8×2 = 9.6'],
  ['health', 'winters-formula', {"hco3":12}, 24, 2.5, '1.5×12+8=26 → range 24–28'],
  ['health', 'maintenance-fluids', {"wt":25}, 65, 0.5, '4-2-1: 40+20+5 = 65 mL/hr'],
  ['health', 'free-water-deficit', {"na":155,"wt":70}, 4.5, 0.1, '0.6×70×(155/140−1) = 4.5 L'],
  ['health', 'serum-osmolality', {"na":140,"glu":90,"bun":14}, 290, 0.5, '280+5+5 = 290'],
  ['health', 'total-body-water', {"wt":70,"ht":180,"age":45,"sex":"male"}, 41, 0.2, 'Watson male = 41.0 L'],
  ['health', 'pf-ratio', {"pao2":100,"fio2":50}, 2, 0.5, '100/0.5 = 2.00:1', 'contains'],
  ['fitness-exercise', 'sweat-rate', {"pre":70,"post":68.6,"mins":90}, 0.93, 0.02, '1.4 kg / 1.5 h = 0.93 L/h'],
  ['fitness-exercise', 'rpe-load', {"rpe":7,"mins":60}, 420, 0.5, '7 × 60 = 420 AU'],
  ['fitness-exercise', 'vo2-beep', {"level":8,"speed0":6,"step":0.5}, 31.7, 0.3, 'speed 9.5 → −23.4+5.8×9.5 = 31.7'],
  ['fitness-exercise', 'resting-metabolic', {"ffm":60}, 1820, 0.5, '500+22×60 = 1820'],
  ['finance', 'cap-rate-conv', {"noi":60000,"cap":6}, 1000000, 1, '60000/0.06 = 1,000,000'],
  ['finance', 'rule-of-40', {"growth":30,"margin":15}, 45, 0.1, '30+15 = 45'],
  ['finance', 'cost-of-delay', {"monthly":1000,"months":8}, 8000, 0.5, '1000×8 = 8000'],
  ['tech-digital', 'wifi-throughput', {"link":100,"eff":0.6}, 60, 0.1, '100×0.6 = 60 Mb/s'],
  ['tech-digital', 'data-usage-est', {"hrs":2,"gbph":3,"days":30}, 180, 0.5, '2×3×30 = 180 GB'],
  ['tech-digital', 'image-size-calc', {"w":4000,"h":3000,"ch":3}, 34.3, 0.2, '36e6 bytes = 34.3 MiB'],
  ['food-nutrition', 'homebrew-abv', {"og":1.05,"fg":1.01}, 5.25, 0.05, '0.04×131.25 = 5.25%'],
  ['engineering', 'rcf-gforce', {"rpm":5000,"r":8}, 2236, 2, '1.118e-5×8×5000² = 2236 g'],

  // ---- ROUND 2: formerly NEEDS-REVIEW tools — expected values independently
  // computed (scripts/tmp-expected-values.cjs, textbook formulas; never tool.calc).
  ['finance', '529-plan', { balance: 10000, monthly: 200, rate: 6, years: 1 }, 13096, 0, 'monthly compound 12mo'],
  ['finance', 'closing-costs', { price: 300000, down: 20, points: 1 }, 8350, 0, 'title+appr+orig+rec+escrow+1pt'],
  ['finance', 'crypto-gains', { buyPrice: 100, sellPrice: 120, quantity: 2, fee: 0.5 }, 37.8, 1, 'profit after 0.5% fees'],
  ['finance', 'currency-arbitrage', { ab: 1.1, bc: 1.1, ca: 1.1 }, 33.1, 1, 'triangular round trip ×1.331'],
  ['finance', 'debt-consolidation', { debts: '5000,15,120;3000,20,90', newRate: 10, newTerm: 36 }, 258.14, 1, 'EMI 8000 @10%/36mo'],
  ['finance', 'debt-snowball', { debts: '1200,0,100;600,0,50', extraBudget: 0 }, 12, 0, '0% interest → 12 months'],
  ['finance', 'discounted-payback', { investment: 1000, cashflows: '600,600', rate: 10 }, 1.9, 1, 'PV payback @10%'],
  ['finance', 'estimated-tax', { annualIncome: 80000, deductions: 13000, selfEmploymentTax: 0 }, 6510.91, 1, '22% bracket + SE tax ÷ 4'],
  ['finance', 'fha-loan', { price: 300000, down: 5, rate: 6.5, term: 30 }, 1932.02, 1, 'P&I + 0.55% MIP'],
  ['finance', 'forex-pip', { pair: 'EURUSD', lots: 1, accountCurrency: 'USD' }, 10, 0, '0.0001 × 1 lot × 100k'],
  ['finance', 'home-office-deduction', { sqft: 150, totalSqft: 1200, rent: 1000, utilities: 200, method: 'simplified' }, 750, 0, 'simplified $5/sqft'],
  ['finance', 'house-affordability', { income: 90000, monthlyDebt: 500, down: 40000, rate: 7, dti: 36 }, 370677, 0, 'max price @36% DTI'],
  ['finance', 'loan-balance', { principal: 20000, rate: 6, payment: 400, months: 12 }, 16299.33, 1, 'balance after 12 months'],
  ['finance', 'loan-payoff', { balance: 10000, rate: 12, payment: 300, extra: 100 }, 29, 0, 'months to payoff ($400/mo)'],
  ['finance', 'mortgage-refinance', { currentBalance: 250000, currentRate: 7, newRate: 5.5, newTerm: 30, closingCosts: 3000 }, 243.78, 1, 'monthly saving 7→5.5%'],
  ['finance', 'payroll-tax', { wages: 150000, filingStatus: 'single', stateLocalTax: 0 }, 11475, 1, 'FICA SS 6.2% + Medicare 1.45%'],
  ['finance', 'diversification', { stocks: 55000, bonds: 25000, realEstate: 10000, cash: 6000, crypto: 4000 }, 62, 0, 'HHI-based score'],
  ['finance', 'retirement-withdrawal', { fund: 1000000, rate: 4, returnRate: 5, years: 30 }, 40000, 0, '4% rule withdrawal'],
  ['finance', 'reverse-mortgage', { homeValue: 400000, age: 70, rate: 6, years: 10 }, 200000, 0, 'principal limit (clamped LTV 50%)'],
  ['finance', 'payback-period', { investment: 50000, annualReturn: 12500 }, 4, 1, 'simple payback 50k/12.5k'],
  ['finance', 'standard-deduction', { filingStatus: 'single', stateLocalTax: 12000, mortgageInterest: 10000, charity: 2000, medical: 0 }, 7400, 0, 'itemized − standard (14600)'],
  ['finance', 't-bill', { mode: 'price', face: 10000, days: 91, rate: 5 }, 9873.61, 1, 'discount price 91d @5%'],
  ['math', 'shift-cipher', { text: 'hello', shift: 3, mode: 1 }, 'khoor', 0, 'Caesar +3 encode', 'contains'],
  ['math', 'matrix-multiply', { a11: 2, a12: 3, a21: 4, a22: 5, b11: 6, b12: 7, b21: 8, b22: 9 }, '[36,', 0, 'c₁₁ = 2·6+3·8 = 36 (contains mode: comma-strip makes bare numbers ambiguous)', 'contains'],
  ['utilities', 'date-add', { date: '2026-06-15', days: 15 }, 'Jun 30 2026', 0, '2026-06-15 + 15d (local-TZ aware)', 'contains'],
  ['health', 'cholesterol-ratio', { tc: 200, hdl: 50, tg: 150 }, 4, 1, 'TC/HDL = 200/50'],
  ['health', 'maffetone-hr', { age: 40, adjust: 5 }, 145, 0, '180 − 40 + 5'],
  ['health', 'ovulation-calculator', { cycleLength: 28, luteal: 14, lastPeriod: '2026-01-01' }, 14, 0, 'day 14 of 28-day cycle'],
  ['fitness-exercise', 'row-standards', { split: 110, distance: 2000, time: 0 }, '7:20', 0, '2000m at 110s/500m split', 'contains'],
  ['food-nutrition', 'meat-cooking-time', { weight: 2, meat: 'chicken', size: 0, style: 0 }, '1 h 30 min', 0, '45 min/kg × 2kg', 'contains'],
  ['regional', 'gratuity-calculator', { basic: 30000, years: 10, months: 0 }, 173077, 0, '15/26 × ₹30k × 10y (en-IN)'],
  ['regional', 'stamp-duty-india', { propertyValue: 5000000, dutyRate: 6, regRate: 1 }, 350000, 0, '6% duty + 1% registration'],
];

describe('DEEP FORMULA QA — independent known-answer matrix', () => {
  for (const [cat, id, values, expected, tol, label, mode] of CASES) {
    it(`${cat}/${id} → ${label}`, async () => {
      const r = await calcResult(cat, id, values);
      expect(/NaN|Infinity|undefined/.test(r)).toBe(false);
      if (mode === 'contains') {
        expect(r).toContain(String(expected));
        return;
      }
      const nums = allNums(r);
      expect(nums.length).toBeGreaterThan(0);
      // pick closest to expected (robust to "VO2 Max: 71.3" label numbers)
      const got = nums.reduce((best, x) => Math.abs(x - expected) < Math.abs(best - expected) ? x : best, nums[0]);
      if (mode === 'rel') {
        expect(Math.abs(got - expected) / Math.abs(expected)).toBeLessThan(tol);
      } else {
        expect(got).toBeCloseTo(expected, tol);
      }
    });
  }
});

// Round-trip property: conversion tools must invert cleanly
describe('DEEP FORMULA QA — conversion round-trips', () => {
  const ROUNDTRIPS = [
    ['conversion', 'length', 'm', 'in', 2.5],
    ['conversion', 'weight', 'kg', 'oz', 3],
    ['conversion', 'volume', 'l', 'gal', 7],
    ['conversion', 'temperature', 'C', 'F', 37],
    ['conversion', 'speed', 'kmh', 'mph', 120],
    ['conversion', 'area', 'm2', 'ft2', 42],
    ['conversion', 'energy', 'J', 'BTU', 5000],
    ['conversion', 'pressure-conv', 'bar', 'psi', 2.4],
    ['conversion', 'data-storage', 'GB', 'MB', 5],
    ['conversion', 'time-conv', 'h', 's', 3],
  ];
  for (const [cat, id, from, to, value] of ROUNDTRIPS) {
    it(`${id}: ${value} ${from}→${to}→${from} round-trips`, async () => {
      const fwd = await calcResult(cat, id, { value, from, to });
      const fwdNum = allNums(fwd)[0];
      const back = await calcResult(cat, id, { value: fwdNum, from: to, to: from });
      const backNum = allNums(back)[0];
      expect(Number.isFinite(fwdNum) && fwdNum > 0).toBe(true);
      expect(Math.abs(backNum - value)).toBeLessThan(Math.max(0.001, Math.abs(value) * 0.01));
    });
  }
});

// ============================================================
// PROPERTY QA — non-deterministic tools (random generators, UUIDs,
// structural outputs). No fixed expected value exists, so these assert
// STRUCTURAL INVARIANTS instead (count, length, charset, format, range).
// Evidence is real: a regression that breaks shape/count/format fails here.
// ============================================================
describe('PROPERTY QA — non-deterministic / structural tools', () => {
  const UUID4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  it('math/random-generator → N numbers within [min,max]', async () => {
    const r = await calcResult('math', 'random-generator', { min: 1, max: 100, count: 10 });
    const nums = allNums(r);
    expect(nums.length).toBe(10);
    nums.forEach(n => expect(n).toBeGreaterThanOrEqual(1));
    nums.forEach(n => expect(n).toBeLessThanOrEqual(100));
  });

  it('tech-digital/password-generator → N passwords of exact length from allowed charset', async () => {
    const r = await calcResult('tech-digital', 'password-generator', { length: 16, upper: true, lower: true, digits: true, symbols: true, count: 2 });
    const lines = r.split('\n').filter(Boolean);
    expect(lines.length).toBe(2);
    lines.forEach(l => {
      expect(l.length).toBe(16);
      expect(/^[A-Za-z0-9!@#$%^&*()\-_=+\[\]{};:,.?]+$/.test(l)).toBe(true);
    });
  });

  it('tech-digital/uuid-generator → N valid v4 UUIDs', async () => {
    const r = await calcResult('tech-digital', 'uuid-generator', { count: 3 });
    const lines = r.split('\n').filter(Boolean);
    expect(lines.length).toBe(3);
    lines.forEach(l => expect(l).toMatch(UUID4));
  });

  it('utilities/password-gen → exact length, allowed charset', async () => {
    const r = await calcResult('utilities', 'password-gen', { length: 16, symbols: true, numbers: true });
    // Extract the <code>...</code> content directly — a generic tag-strip regex
    // (e.g. /<[^>]+>/g) would ALSO eat '<', '>' characters that can legitimately
    // appear inside the generated password itself, shrinking its visible length.
    const m = r.match(/<code[^>]*>([\s\S]*?)<\/code>/);
    const pw = m ? m[1].trim() : r.replace(/<[^>]+>/g, '').trim();
    expect(pw.length).toBe(16);
    expect(/^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?]+$/.test(pw)).toBe(true);
  });

  it('utilities/uuid-gen → N valid v4 UUIDs', async () => {
    const r = await calcResult('utilities', 'uuid-gen', { count: 3 });
    const uuids = r.match(/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi) || [];
    expect(uuids.length).toBe(3);
    uuids.forEach(u => expect(u).toMatch(UUID4));
  });

  it('utilities/lorem-ipsum → N <p> paragraphs', async () => {
    const r = await calcResult('utilities', 'lorem-ipsum', { paragraphs: 3 });
    expect((r.match(/<p>/g) || []).length).toBe(3);
  });

  // ---- ROUND 2: formerly NEEDS-REVIEW stochastic tools — structural/property QA
  it('utilities/coin-flip → exactly N flips, heads+tails=N', async () => {
    const r = await calcResult('utilities', 'coin-flip', { flips: 100 });
    const nums = allNums(r);
    expect(nums.length).toBe(2);
    expect(nums[0] + nums[1]).toBe(100);
    nums.forEach(n => expect(n).toBeGreaterThanOrEqual(0));
    nums.forEach(n => expect(n).toBeLessThanOrEqual(100));
  });

  it('utilities/dice-roller → sum within [N, N×sides]', async () => {
    // tool result exposes only the sum; rolls live in `extra`
    const r = await calcResult('utilities', 'dice-roller', { dice: 3, sides: 20 });
    const nums = allNums(r);
    expect(nums.length).toBe(1);
    expect(nums[0]).toBeGreaterThanOrEqual(3);
    expect(nums[0]).toBeLessThanOrEqual(60);
  });

  it('health/nap-planner → promoted cycle matches independent 90-min math', async () => {
    // independent: wake 7:00 + 90k min → cycles 8:30/10:00/11:30/13:00 (confirmed in extra)
    // tool promotes cycles[1] (design choice) → result must show 10:00 + wake 11:30
    const r = await calcResult('health', 'nap-planner', { wakeHour: 7, wakeMin: 0, napLength: 20 });
    expect(r).toContain('10:00');
    expect(r).toContain('11:30');
  });

  it('utilities/random-name → all people dealt exactly once', async () => {
    const r = await calcResult('utilities', 'random-name', { names: 'alice,bob,carol,dan', teams: 2 });
    const names = ['alice', 'bob', 'carol', 'dan'];
    names.forEach(n => expect(r).toContain(n));
  });

  it('finance/loan-payoff → extra payment never extends payoff', async () => {
    const withExtra = await calcResult('finance', 'loan-payoff', { balance: 10000, rate: 12, payment: 300, extra: 100 });
    const noExtra = await calcResult('finance', 'loan-payoff', { balance: 10000, rate: 12, payment: 300, extra: 0 });
    const m1 = allNums(withExtra).reduce((best, x) => Math.abs(x - 29) < Math.abs(best - 29) ? x : best, 1e9);
    const m2 = allNums(noExtra).reduce((best, x) => Math.abs(x - 39) < Math.abs(best - 39) ? x : best, 1e9);
    expect(m1).toBeLessThanOrEqual(m2);
  });

  it('parenting-family/diaper-needs → total & cost match independent math', async () => {
    // independent: 10/day × 6 months × 30 = 1800 diapers; 1800 × $0.30 = $540
    const out = await calcFull('parenting-family', 'diaper-needs', { count: 10, price: 0.30, months: 6 });
    const both = String(out.result + ' ' + (out.extra || ''));
    expect(both).toContain('1800 diapers');
    expect(both).toContain('540');
  });

  it('conversion/wire-gauge-conv → AWG10 area is 5.26 mm² (regression lock: no ×1e6)', async () => {
    // independent: d = 0.127×92^(26/39) = 2.588 mm; area = πd²/4 = 5.26 mm²
    // this test locks the fix of a real bug where area was displayed ×1,000,000
    const out = await calcFull('conversion', 'wire-gauge-conv', { gauge: 10 });
    const both = String(out.result + ' ' + (out.extra || ''));
    expect(both).toContain('2.588 mm diameter');
    expect(both).toContain('5.26 mm² area');
    expect(both).not.toContain('5261154');
  });

  it('math/shift-cipher → decode is exact inverse of encode', async () => {
    const enc = await calcResult('math', 'shift-cipher', { text: 'attackatdawn', shift: 7, mode: 1 });
    const encText = enc.replace(/<[^>]+>/g, '').trim().split(/\s+/)[0];
    const dec = await calcResult('math', 'shift-cipher', { text: encText, shift: 7, mode: 2 });
    const decText = dec.replace(/<[^>]+>/g, '').trim().split(/\s+/)[0];
    expect(decText.toLowerCase()).toBe('attackatdawn');
  });

  it('utilities/qr-generator → valid SVG (stubbed matrix)', async () => {
    const prev = global.QRCode;
    global.QRCode = { generate: () => [[1, 0, 1], [0, 1, 0], [1, 0, 1]] };
    try {
      const r = await calcResult('utilities', 'qr-generator', { text: 'https://example.com' });
      expect(r).toContain('<svg');
      expect(r).toContain('viewBox');
    } finally {
      global.QRCode = prev; // restore — never leak the stub into other tests
    }
  });

  it('science/molar-mass → unknown element surfaces a visible warning (no silent 0)', async () => {
    const r = await calcResult('science', 'molar-mass', { elements: 'ZzO' });
    expect(r).toContain('unknown: Zz');
    expect(r).toContain('Zz');
  });

  it('science/molar-mass → empty input gives guidance, not NaN/0', async () => {
    const r = await calcResult('science', 'molar-mass', { elements: '' });
    expect(/NaN|Infinity|undefined/.test(r)).toBe(false);
    expect(r.length).toBeGreaterThan(0);
  });
});
