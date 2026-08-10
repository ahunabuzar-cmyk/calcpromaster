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
  'engineering/torque': (v) => v.force * v.radius,
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
  ['everyday', 'currency-exchange', { amount: 100, from: 'USD', to: 'EUR' }, 92, 1, '100×0.92'],
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
  ['engineering', 'torque', { force: 50, radius: 0.3 }, 15, 1, 'τ=15Nm'],
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
  ['fitness-exercise', 'running-pace', { distance: 10, hours: 0, minutes: 55, seconds: 0 }, '5:30', 0, 'pace 5:30/km', 'contains'],
  ['fitness-exercise', 'max-heart-rate', { age: 30 }, 186, 1, 'maxHR avg 186'],
  ['fitness-exercise', 'vo2max', { restHr: 65, age: 30, gender: 'male' }, 44.7, 1, 'rest-HR VO2 44.7'],
  ['fitness-exercise', 'steps-to-distance', { steps: 10000, height: 170 }, 7.05, 2, '10000 steps 7.05km'],
  ['fitness-exercise', 'sports-calories', { sport: 'bball', weight: 70, duration: 60 }, 420, 1, 'basketball 420 cal'],

  // ---------- BATCH 4: FITNESS (review-tracker next batch) ----------
  ['fitness-exercise', 'body-fat-fitness', { gender: 'male', waist: 80, neck: 38, height: 170 }, 13.7, 1, 'US Navy male 13.7%'],
  ['fitness-exercise', 'body-fat-fitness', { gender: 'female', waist: 80, hip: 95, neck: 38, height: 170 }, 25.6, 1, 'US Navy female (with hip) 25.6%'],
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
  ['parenting-family', 'maternity-leave-finance', { salary: 52000, paidPct: 60, leaveWeeks: 26 }, 15600, 0, '$1000/wk × 60% × 26wk'],
  ['parenting-family', 'maternity-leave', { salary: 5000, weeksLeave: 12, paidPct: 80 }, 11085, 0, '5000 × (12/4.33) × 0.8'],
  ['parenting-family', 'paternity-leave', { salary: 52000, paidPct: 50, leaveWeeks: 2 }, 1000, 0, '$1000/wk × 50% × 2wk'],
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
  ["utilities", "simple-tax", {"income":80000,"deductions":13850}, 9860.5, 0, "2023 single brackets $9,861"],
  ["utilities", "unit-converter", {"value":1,"from":"m","to":"ft"}, "3.2808", 0, "1 m = 3.2808 ft", "contains"],
  ["utilities", "volume-calc", {"shape3d":"box","d1":10,"d2":5,"d3":3}, 150, 0, "10×5×3"],
  ["education", "exam-countdown", { examDate: (function(){var d=new Date();d.setDate(d.getDate()+10);return d.toISOString().slice(0,10);})() }, 10, 0, "ceil(10d span) = 10 days"],
  ["everyday", "age", { dob: (function(){var d=new Date();d.setFullYear(d.getFullYear()-30);return d.toISOString().slice(0,10);})() }, "30 years", 0, "30y 0m 0d at definition", "contains"],
  ["utilities", "timer-calc", { targetDate: (function(){var d=new Date();d.setDate(d.getDate()+11);return d.toISOString();})() }, "10d", 0, "floor(11d - elapsed) = 10 days", "contains"],
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
