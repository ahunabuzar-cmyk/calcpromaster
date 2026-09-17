#!/usr/bin/env node
// Batch 3 — independent hand-computed known-answer verification (coverage push toward 90%).
// Same harness as verify-batch.cjs; expected values computed from first principles,
// NOT from the tool implementations.
const path = require('path');
const ROOT = path.join(__dirname, '..');
global.window = global;
global.Charts = { bar: () => '', donut: () => '', gauge: () => '', line: () => '', spark: () => '', heatmap: () => '', area: () => '' };
global.Security = { sanitizeHtml: (s) => String(s), sanitizeJsString: (s) => String(s), sanitizeOutput: (s) => String(s), cryptoRandomInt: (min) => min || 0 };

const CASES = [
  // ---- auto-transport ----
  ['auto-transport', 'carpool-savings', { weeklyCost: 200, people: 4, days: 5 }, 150, '200−50 weekly share'],
  ['auto-transport', 'bus-vs-car', { dailyParking: 10, fuelDaily: 8, busFare: 3.5, days: 22 }, 319, '(18−3.5)×22'],
  ['auto-transport', 'ebike-range', { battery: 500, consumption: 15, assist: 'eco' }, 42, '500/(15×0.8)=41.7→42'],
  ['auto-transport', 'scooter-cost', { fuelPrice: 1.2, mileage: 40, dailyKm: 10, service: 300 }, 0.112, '0.03+300/3650'],
  ['auto-transport', 'registration-cost', { value: 20000, regRate: 1.5, plateFee: 50, titleFee: 20 }, 370, '300+50+20'],
  ['auto-transport', 'tire-replacement', { tireCost: 800, lifespan: 50000, annualMiles: 12000 }, 0.016, '800/50000'],
  ['auto-transport', 'speed-conv', { speed: 100 }, 62.1, '100×0.621371'],
  ['auto-transport', 'hybrid-savings', { annualKm: 20000, gasKmpl: 12, hybridKmpl: 18, price: 1.5, premium: 3000 }, 833, '2500−1666.7'],
  // ---- career-freelance ----
  ['career-freelance', 'self-employment-tax', { netIncome: 100000 }, 14130, '92350×0.153'],
  ['career-freelance', 'freelance-daily', { salary: 100000, benefits: 20, billableDays: 200 }, 600, '120000/200'],
  ['career-freelance', 'monthly-goal', { goal: 12000, rate: 100, utilization: 75 }, 120, '12000/100'],
  ['career-freelance', 'retirement-contrib', { salary: 80000, current: 5, increase: 10, match: 50 }, 3120, '4000−880'],
  ['career-freelance', 'benefits-value', { salary: 80000, insurance: 10000, retirement: 8000, vacation: 15, perks: 2000 }, 104615, '80000+10000+8000+4615+2000'],
  ['career-freelance', 'pto-calc', { daysPerYear: 20, accrued: 10, hoursPerDay: 8 }, 1.67, '20/12'],
  ['career-freelance', 'cost-living-adjustment', { currentSalary: 100000, currentIndex: 100, newIndex: 120 }, 120000, '100000×1.2'],
  ['career-freelance', 'severance-calc', { salary: 104000, years: 5, weeksPerYear: 2 }, 20000, '2000×10'],
  ['career-freelance', 'side-hustle-profit', { revenue: 5000, expenses: 2000, hours: 40 }, 75, '3000/40'],
  ['career-freelance', 'salary-raise-worth', { salary: 80000, raise: 5, taxRate: 25, years: 3 }, 3000, '4000×0.75'],
  // ---- construction ----
  ['construction', 'gravel-tonnage', { length: 20, width: 10, depth: 4 }, 4.9, '66.67ft³/13.5'],
  ['construction', 'asphalt-quantity', { length: 50, width: 12, thickness: 4 }, 29, '200ft³×0.145'],
  ['construction', 'mortar-mix', { volume: 4, ratio: '1:3' }, 1, '4×1/4 ft³ cement'],
  ['construction', 'drywall-screws', { sheets: 20, spacing: '12' }, 640, '20×32'],
  ['construction', 'pipe-volume', { diameter: 4, length: 50 }, 32.6, '4.363ft³×7.48'],
  ['construction', 'retaining-wall', { length: 20, height: 4, blockW: 16, blockH: 8 }, 90, '15×6'],
  ['construction', 'scaffolding', { length: 20, height: 12 }, 4, '2 bays × 2 lifts'],
  ['construction', 'crown-molding', { length: 12, width: 10, waste: 10 }, 48, '44×1.1'],
  ['construction', 'septic-size', { bedrooms: 3, occupants: 4 }, 1750, 'max(1750,400)'],
  // ---- conversion ----
  ['conversion', 'paper-size-conv', { number: 3, series: 'A' }, 297, '841/2^1.5'],
  ['conversion', 'fraction-percent', { mode: 'fp', num: 3, den: 4 }, 75, '3/4×100'],
  ['conversion', 'roman-numeral', { mode: 'fromRoman', value: 'MCMXCIX' }, 1999, 'MCMXCIX=1999'],
  ['conversion', 'ppm-conv', { value: 2, from: 'ppm', to: 'ppb' }, 2000, '2ppm=2000ppb'],
  ['conversion', 'thermal-conductivity', { value: 1, from: 'wmk', to: 'btu' }, 0.5778, '1/1.730735'],
  ['conversion', 'radiation-dose-conv', { value: 100, from: 'mGy', to: 'Gy' }, 1, '100mGy=0.1Gy→1'],
  // ---- education ----
  ['education', 'reading-time', { words: 1000, speed: 200 }, 5, '1000/200'],
  ['education', 'presentation-time', { slides: 15, perSlide: 2 }, 30, '15×2'],
  ['education', 'test-average', { scores: '85,90,95' }, 90, '(85+90+95)/3'],
  ['education', 'grade-percentage', { score: 85, total: 100 }, 85, '85/100'],
  ['education', 'graduation-date', { remaining: 30, perSemester: 15 }, 2, 'ceil(30/15)'],
  ['education', 'course-load', { credits: 15, hard: 2, easy: 2 }, 23, '15+6+2'],
  ['education', 'financial-need', { cost: 50000, efc: 10000, grants: 5000 }, 35000, '50000−15000'],
  // ---- engineering ----
  ['engineering', 'column-buckling', { e: 200, i: 400, l: 4 }, 0.05, 'π²·200·400e-3/16 N→kN'],
  ['engineering', 'pipe-flow', { flow: 10, diameter: 100, f: 0.02, length: 100 }, 16.21, 'Darcy 0.02×1000×810.6'],
  ['engineering', 'concrete-mix', { volume: 1, ratio: '1:2:4' }, 5, 'ceil(0.1429/0.035)'],
  ['engineering', 'electrical-energy', { watts: 100, hours: 5, rate: 0.15 }, 2.25, '0.5kWh×0.15×30'],
  ['engineering', 'resistor-combination', { mode: 'series', r1: 10, r2: 20, r3: 30 }, 60, '10+20+30'],
  ['engineering', 'capacitor-energy', { capacitance: 1000, voltage: 12 }, 0.072, '0.5×0.001×144'],
  ['engineering', 'inductor-energy', { inductance: 100, current: 2 }, 0.2, '0.5×0.1×4'],
  ['engineering', 'rc-time-constant', { r: 1000, c: 100 }, 0.1, '1000×100e-6'],
  ['engineering', 'cable-sizing', { voltage: 230, vdrop: 3, current: 20, length: 50 }, 5, '0.0172×100/0.345'],
  ['engineering', 'ventilation-cfm', { length: 5, width: 4, height: 3, ach: 6 }, 212, '60×35.31×6/60'],
  ['engineering', 'torque-wrench', { target: 100, wrenchLen: 300, extLen: 50 }, 85.7, '100×300/350'],
  ['engineering', 'bearing-load', { load: 5, life: 10000, speed: 1500 }, 48.3, '5×900^(1/3)'],
  ['engineering', 'engine-efficiency', { fuel: 10, hvf: 42, power: 80 }, 68.6, '80/116.67×100'],
  ['engineering', 'pump-power', { flow: 50, head: 20, efficiency: 70 }, 9.81, '9.81×1000×0.05×20 W'],
  ['engineering', 'tank-volume', { shape: 'cylinder', a: 0.5, b: 1 }, 0.79, 'π×0.25×1'],
  ['engineering', 'heat-exchanger', { t1in: 80, t1out: 60, t2in: 30, t2out: 50 }, 30, 'ΔT1=ΔT2→LMTD=30'],
  ['engineering', 'pcb-trace', { current: 1, temp: 10, thickness: 1 }, 30.3, 'area^1.3793/1.4'],
  ['engineering', 'bolt-torque', { torque: 100, k: 0.2, d: 10 }, 50, '100/0.002 N→kN'],
  // ---- finance (independent) ----
  ['finance', 'inflation-adjusted', { nominal: 8, inflation: 3 }, 4.85, '(1.08/1.03−1)×100'],
  ['finance', 'tax-equivalent-yield', { muniYield: 4, taxRate: 25 }, 5.33, '4/0.75'],
  ['finance', 'times-interest-earned', { ebit: 300000, interest: 50000 }, 6, '300k/50k'],
  ['finance', 'quick-ratio', { cash: 50000, receivables: 30000, currentLiab: 60000 }, 1.33, '80k/60k'],
  ['finance', 'ebitda', { revenue: 1000000, cogs: 600000, opex: 200000, depreciation: 50000, amortization: 20000 }, 270000, '1M−600k−200k+50k+20k'],
  ['finance', 'enterprise-value', { mktCap: 5000000, debt: 2000000, cash: 1000000, minority: 100000, preferred: 50000 }, 6150000, '5M+2M−1M+0.15M'],
  ['finance', 'wacc', { equityValue: 600000, debtValue: 400000, costEquity: 10, costDebt: 5, taxRate: 25 }, 7.5, '0.6×10+0.4×3.75'],
  ['finance', 'sharpe-ratio', { returnRate: 12, riskFree: 2, stdDev: 10 }, 1, '(12−2)/10'],
  ['finance', 'geometric-mean', { returns: '10,20,30' }, 19.72, '(1.716)^(1/3)−1'],
  ['finance', 'payday-loan-cost', { amount: 300, fee: 15, days: 14 }, 391.1, '(45/300)×(365/14)×100'],
  ['finance', 'emergency-fund-rate', { monthly: 1000, months: 12, rate: 4 }, 12262.7, 'FV annuity due 0.333%/mo'],
  ['finance', 'property-tax', { value: 350000, rate: 1.1 }, 3850, '350000×1.1%'],
  ['finance', 'cap-rate', { noi: 80000, value: 1000000 }, 8, '80k/1M×100'],
  ['finance', 'student-loan-repayment', { balance: 30000, rate: 6, years: 10 }, 333.06, 'PMT 0.5%/mo 120mo'],
  ['finance', 'cost-of-debt', { interestRate: 6, taxRate: 25 }, 4.5, '6×0.75'],
  ['finance', 'va-loan', { price: 300000, funding: 2.3, rate: 6.5, term: 30 }, 1940.6, 'PMT 306900 6.5% 30y'],
  ['finance', 'price-to-earnings', { price: 50, eps: 2.5 }, 20, '50/2.5'],
  ['finance', 'dividend-discount', { dividend: 2, growth: 3, requiredReturn: 8 }, 41.2, '2.06/0.05'],
  ['finance', 'margin-call', { buyPrice: 100, marginReq: 30 }, 71.43, '50/0.7'],
  ['finance', 'growing-perpetuity', { payment: 10000, rate: 8, growth: 3 }, 200000, '10000/0.05'],
  ['finance', 'tax-loss-harvest', { gains: 10000, losses: 5000, taxRate: 25 }, 1250, '5000×25%'],
  ['finance', 'savings-rate', { saved: 1500, income: 5000 }, 30, '1500/5000×100'],
  ['finance', 'envelope-budget', { income: 5000 }, 2500, '50% of 5000'],
  ['finance', 'car-lease-calculator', { msrp: 35000, residual: 55, cap: 33000, term: 36, rate: 5 }, 647.62, '381.94+217.71→+8%'],
  ['finance', 'cost-of-living', { salary: 100000, fromIndex: 100, toIndex: 120 }, 120000, '100000×1.2'],
  ['finance', 'yield-to-maturity', { face: 1000, coupon: 5, price: 950, years: 10 }, 5.64, '(50+5)/975×100'],
  ['finance', 'gross-rent-multiplier', { monthlyRent: 1500, price: 360000 }, 20, '360k/18k'],
  ['finance', 'current-ratio-finance', { currentAssets: 200000, currentLiab: 100000 }, 2, '200k/100k'],
  ['finance', 'accounts-receivable-turnover', { netCreditSales: 500000, avgAR: 100000 }, 5, '500k/100k'],
  ['finance', 'operating-margin', { operatingIncome: 200000, revenue: 1000000 }, 20, '200k/1M×100'],
  ['finance', 'net-profit-margin', { netIncome: 150000, revenue: 1000000 }, 15, '150k/1M×100'],
  ['finance', 'coverage-ratio', { noi: 150000, debtService: 100000 }, 1.5, '150k/100k'],
  ['finance', 'home-equity', { homeValue: 400000, mortgageBalance: 250000, heloc: 20000 }, 130000, '400k−270k'],
  ['finance', 'cash-on-cash', { annualCashFlow: 12000, totalInvested: 100000 }, 12, '12k/100k×100'],
  ['finance', 'price-to-rent', { homePrice: 300000, annualRent: 20000 }, 15, '300k/20k'],
  ['finance', 'fico-simulator', { currentScore: 700, utilization: 40, newUtil: 20, hardInquiries: 1 }, 701, '700+6−5'],
  ['finance', 'bond-duration', { face: 1000, coupon: 5, yield: 5, years: 5 }, 4.55, 'Macaulay at par ≈ 4.55'],
  ['finance', 'black-scholes', { spot: 100, strike: 100, rate: 5, vol: 20, time: 0.5 }, 6.89, 'ATM call ≈ 6.89'],
  // ---- fitness ----
  ['fitness-exercise', 'stride-length', { height: 170, pace: 'run' }, 78, '170×0.46'],
  ['fitness-exercise', 'training-volume', { sets: 4, reps: 8, weight: 80, exercises: 6 }, 15360, '4×8×6×80'],
  ['fitness-exercise', 'vertical-jump', { jump: 50, weight: 75 }, 2305, '75×9.81×3.132'],
  ['fitness-exercise', 'beep-test', { level: 9, shuttles: 4 }, 45.1, '3.46×9.5+12.2'],
  ['fitness-exercise', 'bodyweight-ratio', { lift: 100, weight: 75 }, 1.33, '100/75'],
  ['fitness-exercise', 'deload-week', { normalSets: 4, intensity: 75, frequency: 4 }, 45, '75×0.6'],
  ['fitness-exercise', 'workout-rest', { goal: 'hypertrophy' }, 75, 'hypertrophy rest 75s'],
  // ---- food ----
  ['food-nutrition', 'sodium-intake', { processed: 1500, cooking: 500, restaurant: 800 }, 2800, '1500+500+800'],
  ['food-nutrition', 'caffeine-daily', { coffee: 2, tea: 1, energy: 0, soda: 1 }, 259, '190+35+34'],
  ['food-nutrition', 'meal-prep-size', { servings: 4, batches: 2, days: 5, mealsPerDay: 1 }, 8, '4×2'],
  ['food-nutrition', 'sugar-limit', { calories: 2000, current: 60 }, 50, '2000×10%/4'],
  // ---- health ----
  ['health', 'body-fat-navy', { gender: 'm', waist: 34, neck: 15, height: 70 }, 17.5, 'Navy: 86.01·log19−70.041·log70+36.76'],
  ['health', 'heart-rate-zones', { age: 30, restingHR: 60 }, 190, '220−30'],
  ['health', 'ideal-weight', { gender: 'm', height: 175 }, 70.5, 'avg(Hamwi 72.0, Devine 70.5, Robinson 68.9)'],
  ['health', 'fasting-calculator', { protocol: '16:8', lastMeal: 20 }, 16, '16h fast'],
  ['health', 'met-calories', { met: 6, weight: 70, duration: 30 }, 210, '6×70×0.5'],
  ['health', 'iron-intake', { gender: 'f', age: 30, pregnant: 'no' }, 18, 'female 19-50 = 18mg'],
  ['health', 'vitamin-d-dosage', { level: 20, target: 40 }, 22, '2000IU/90'],
  ['health', 'calorie-goal', { tdee: 2200, goal: 'loss-med', weeks: 12 }, 1650, '2200−550'],
  ['health', 'burn-severity', { head: 0, torso: 0, 'arm-l': 0, 'arm-r': 0, 'leg-l': 9, 'leg-r': 9 }, 18, 'TBSA = 9+9%'],
  ['health', 'drug-dosage', { weight: 70, dose: 10, frequency: 3 }, 700, '70×10'],
  // ---- home-garden ----
  ['home-garden', 'raised-bed-soil', { length: 6, width: 3, depth: 12 }, 18, '6×3×1'],
  ['home-garden', 'garden-fence', { length: 20, width: 15, height: 4, postGap: 8 }, 10, 'ceil(70/8)+1'],
  ['home-garden', 'lawn-watering', { length: 40, width: 30, inches: 1 }, 748, '1200×0.623'],
  ['home-garden', 'sprinkler-heads', { length: 50, width: 30, radius: 15 }, 24, 'ceil(50/9)×ceil(30/9)'],
  ['home-garden', 'compost-bin', { people: 4, yard: 10 }, 12, 'ceil(22×4/7.48)'],
  ['home-garden', 'firepit-size', { diameter: 36, stoneLen: 8, height: 12 }, 45, 'ceil(113.1/8)×3'],
  ['home-garden', 'deck-post', { deckLength: 16, joistGap: 16, beamSpan: 8 }, 13, 'ceil(192/16)+1'],
  ['home-garden', 'porch-light', { height: 8, width: 3, style: 'lantern' }, 12, 'round(8×1.5)'],
  ['home-garden', 'ceiling-fan-size', { length: 14, width: 12, ceilHeight: 9 }, 52, 'area 168 → 52"'],
  ['home-garden', 'humidifier-size', { sqft: 500, current: 30, target: 50 }, 2, 'ceil(20×4000/45000)'],
  ['home-garden', 'tree-spacing', { length: 100, width: 50, spacing: 15 }, 28, '7×4'],
  ['home-garden', 'grout-calc', { area: 100, tileLen: 12, tileWid: 12, joint: 0.125, depth: 0.375 }, 7, '2ft joint × 0.0104×0.0313 ft × 100 ft² × 100 lb/ft³'],
  // ---- lifestyle ----
  ['lifestyle', 'car-wash-annual', { price: 15, perMonth: 4 }, 720, '15×4×12'],
  ['lifestyle', 'haircut-annual', { price: 30, visits: 12, tips: 20 }, 432, '36×12'],
  ['lifestyle', 'party-cost', { guests: 20, food: 15, drinks: 10, decor: 100 }, 600, '25×20+100'],
  ['lifestyle', 'gift-budget', { people: 10, avg: 50, occasions: 2 }, 1000, '10×50×2'],
  ['lifestyle', 'hobby-cost', { supplies: 50, gear: 20, classes: 60 }, 130, '50+20+60'],
  ['lifestyle', 'travel-daily', { lodging: 120, food: 60, transport: 25, activities: 50, days: 7 }, 255, '120+60+25+50'],
  ['lifestyle', 'furniture-assembly', { pieces: 3, complexity: 'medium' }, 3, '1h×3'],
  ['lifestyle', 'home-renovation', { sqft: 200, level: 'mid', contingency: 15 }, 23000, '20000×1.15'],
  // ---- math ----
  ['math', 'normal-dist', { x: 1.96, mu: 0, sigma: 1 }, 97.5, 'Φ(1.96)=0.975'],
  ['math', 'taylor-series', { func: 'sin', x: 1, terms: 6 }, 0.8415, 'sin(1) Taylor 6 terms'],
  ['math', 'continued-fraction', { terms: '1,1,1,1,1,1,1,1', denoms: '1,2,2,2,2,2,2,2' }, 0.7071, '[1;2,2,...] convergent=√2/2'],
  ['math', 'linear-system', { a1: 2, b1: 1, c1: 5, a2: 1, b2: 3, c2: 7 }, 1.6, 'x=(15−7)/5'],
  ['math', 'eigenvalue-2x2', { a: 4, b: 2, c: 1, d: 3 }, 5, 'λ=(7±3)/2'],
  ['math', 'surface-area-3d', { shape: 'sphere', a: 5, b: 10 }, 314.16, '4π×25'],
  ['math', 'complex-modulus', { re: 3, im: 4 }, 5, '|3+4i|=5'],
  ['math', 'mean-median-mode', { data: '2,4,4,4,5,5,7,9' }, 4.5, 'median of 8 values'],
  ['math', 'variance-sd', { data: '4,8,6,5,3,2,8,9,2,5', type: 'sample' }, 2.53, '√(57.6/9)'],
  ['math', 'permutation', { n: 10, r: 3 }, 720, '10×9×8'],
  ['math', 'binomial-theorem', { a: 2, b: 3, n: 5 }, 3125, '5^5'],
  ['math', 'golden-ratio', { n: 10 }, 55, 'F(10)'],
  ['math', 'sieve-prime', { n: 50 }, 15, '15 primes ≤ 50'],
  ['math', 'fibonacci-seq', { n: 15 }, 377, 'F(15)'],
  ['math', 'pascal-triangle', { n: 10 }, 252, 'row 10 middle'],
  ['math', 'collatz', { n: 27 }, 111, 'Collatz(27)=111 steps'],
  ['math', 'modular-exp', { a: 2, b: 100, m: 1000000007 }, 976371285, '2^100 mod 1e9+7'],
  ['math', 'norm-dist-range', { a: -1, b: 1, mu: 0, sigma: 1 }, 68.27, 'P(−1<Z<1)'],
  ['math', 'dot-cross-product', { ax: 1, ay: 2, az: 3, bx: 4, by: 5, bz: 6 }, 32, 'A·B'],
  ['math', 'bayes-theorem', { pa: 0.01, pbga: 0.9, pbgn: 0.05 }, 15.38, '0.009/0.0585×100'],
  ['math', 'distance-formula', { x1: 1, y1: 2, x2: 4, y2: 6 }, 5, '√(9+16)'],
  ['math', 'slope-intercept', { x1: 1, y1: 2, x2: 4, y2: 8 }, 2, 'm=(8−2)/3'],
  ['math', 'zscore-calc', { x: 85, mu: 70, sigma: 10 }, 1.5, '(85−70)/10'],
  // ---- parenting ----
  ['parenting-family', 'baby-formula', { weight: 5, ageMonths: 3, feedings: 6 }, 62.5, '375ml/day ÷ 6'],
  ['parenting-family', 'kids-shoe-size', { us: 8, gender: 'unisex' }, 28, '8×1.5+15.5'],
  ['parenting-family', 'family-meal-cost', { family: 4, perServing: 4, meals: 14 }, 224, '16×14'],
  ['parenting-family', 'school-supplies', { children: 2, grade: 'elem', perChild: 150 }, 300, '2×150'],
  ['parenting-family', 'birthday-party-cost', { guests: 10, venue: 250, perChild: 15, cake: 60 }, 460, '250+150+60'],
  ['parenting-family', 'allowance-calc', { age: 8, chores: 5, perChore: 1 }, 9, '4+5'],
  ['parenting-family', 'teen-budget', { income: 120, savePct: 20, spendPct: 60, sharePct: 20 }, 24, '120×20%'],
  ['parenting-family', 'inheritance-estate', { assets: 1500000, debts: 100000, exemption: 1361000, heirs: 3 }, 1400000, '1.5M−100k'],
  ['parenting-family', 'sibling-age-gap', { older: '2022-05-10', younger: '2024-08-15' }, 2.27, '828 days / 365.25'],
  ['parenting-family', 'childcare-weekly', { hours: 40, rate: 12, days: 5 }, 480, '40×12'],
  // ---- regional ----
  ['regional', 'epf-calculator', { basic: 30000, age: 30, retire: 60, existing: 200000 }, 13260000, 'FV 8.25% 30y + 86,400/yr'],
  ['regional', 'capital-gains-india', { buyPrice: 3000000, sellPrice: 4500000, years: 5, asset: 'shares' }, 140000, '(1.5M−100k)×10%'],
  ['regional', 'sukanya-samriddhi', { deposit: 100000, years: 15, rate: 8.2 }, 2985000, 'FV annuity due 8.2% 15y'],
  ['regional', 'nsc-interest', { amount: 100000, years: 5, rate: 7.7 }, 144900, '100000×1.077^5'],
  ['regional', 'senior-savings-scheme', { amount: 1000000, rate: 8.2 }, 20500, '1M×8.2%/4'],
  ['regional', 'post-office-savings', { monthly: 5000, years: 5, rate: 7.5 }, 364650, 'RD formula 7.5% qtr 5y'],
  ['regional', 'uae-vat', { amount: 1000, mode: 'add' }, 1050, '1000×1.05'],
  ['regional', 'zakat-calculator', { cash: 500000, gold: 300000, other: 100000, debt: 50000 }, 21250, '850000×2.5%'],
  ['regional', 'pk-income-tax', { income: 2000000 }, 135000, '600000×22.5%'],
  ['regional', 'gold-silver-ratio', { gold: 2650, silver: 30 }, 88.3, '2650/30'],
  // ---- science ----
  ['science', 'newtons-second', { solveFor: 'force', a: 10, b: 9.81 }, 98.1, 'F=ma'],
  ['science', 'wavelength-freq', { mode: 'wl', value: 550, medium: 'vacuum' }, 5.45e14, '2.998e8/550e-9'],
  ['science', 'spring-force', { k: 500, x: 0.1 }, 50, 'kx'],
  ['science', 'centripetal', { velocity: 10, radius: 5 }, 20, 'v²/r'],
  ['science', 'orbital-velocity', { mass: 5.97e24, altitude: 400 }, 7671.5, '√(GM/R) R=6.771e6'],
  ['science', 'heat-transfer', { mass: 1, cp: 4186, dt: 50 }, 209300, 'mcΔT'],
  ['science', 'boyle-law', { p1: 1, v1: 10, solveFor: 'p2', known: 5 }, 2, 'P1V1/V2'],
  ['science', 'combined-gas-law', { p1: 1, v1: 10, t1: 273, p2: 2, t2: 300 }, 5.49, 'P1V1T2/(P2T1)'],
  ['science', 'wave-speed', { freq: 440, wavelength: 0.78 }, 343.2, 'fλ'],
  ['science', 'moment-of-inertia', { shape: 'disk', mass: 10, radius: 0.5 }, 1.25, '½mr²'],
  ['science', 'buoyancy', { rho: 1000, volume: 0.05, g: 9.81 }, 490.5, 'ρVg'],
  ['science', 'hydrostatic-pressure', { depth: 10, rho: 1025, g: 9.81 }, 100553, '1025×9.81×10'],
  ['science', 'solar-energy', { panels: 20, wattage: 350, hours: 5, efficiency: 85 }, 892.5, '29.75kWh×30'],
  ['science', 'reynolds-number', { rho: 1000, velocity: 2, length: 0.05, mu: 0.001 }, 100000, 'ρvL/μ'],
  ['science', 'bernoulli', { p1: 101325, v1: 2, h1: 0, h2: 10, rho: 1000 }, 3225, '103325−2000−98100'],
  // ---- tech ----
  ['tech-digital', 'read-time', { words: 1200, wpm: 220 }, 5, '1200/220 min'],
  ['tech-digital', 'font-size-conv', { px: 16, root: 16 }, 1, '16/16 rem'],
  ['tech-digital', 'storage-need', { photos: 10, videoHours: 20, documents: 5, music: 200 }, 135, '50+60+5+20'],
  ['tech-digital', 'latency-bandwidth', { sizeMB: 100, mbps: 100, latencyMs: 50 }, 9, '8s + 20×0.05s'],
  ['tech-digital', 'download-time', { size: 500, unit: 'MB', speed: 50 }, 20, '80s → 1m 20s (seconds part)'],
  ['tech-digital', 'audio-file-size', { minutes: 60, bitrate: 128 }, 56, '128×3600/8/1024'],
  ['tech-digital', 'backup-size', { fullGB: 200, incrementalGB: 5, days: 30 }, 350, '200+150'],
  ['tech-digital', 'screen-size', { distance: 8, resolution: '4k' }, 64, '96/1.5'],
  ['tech-digital', 'streaming-quality', { hours: 2, quality: 'hd', days: 30 }, 180, '6×2×30'],
  ['tech-digital', 'code-line-count', { features: 10, complexity: 'medium', devs: 2, days: 30 }, 4000, '10×400'],
  // ---- utilities ----
  ['utilities', 'ratio-simplifier', { a: 48, b: 36 }, 4, '48:36 → 4:3'],
  ['utilities', 'gcd-lcm', { a: 12, b: 18 }, 6, 'gcd(12,18)=6'],
  ['utilities', 'rounding-calc', { value: 3.14159, places: 2 }, 3.14, 'round 3.14159 → 3.14'],
  ['utilities', 'units-per', { price: 4.99, quantity: 12, unit: 'oz' }, 0.416, '4.99/12'],
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
  let okCount = 0, diffCount = 0, errCount = 0;
  const diffs = [];
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
      if (ok) okCount++; else { diffCount++; diffs.push({ cat, id, expected, got: best, raw: str.slice(0, 90), label }); }
      console.log((ok ? 'OK  ' : 'DIFF'), cat + '/' + id, '| exp:', expected, '| got:', best, '| raw:', str.slice(0, 60));
    } catch (e) {
      errCount++;
      console.log('ERR ', cat + '/' + id, e.message.slice(0, 60));
    }
  }
  console.log('\n=== OK:', okCount, '| DIFF:', diffCount, '| ERR:', errCount, '| total:', CASES.length, '===');
  if (diffs.length) {
    console.log('\nDIFF DETAILS (investigate):');
    diffs.forEach(d => console.log(' -', d.cat + '/' + d.id, '| exp:', d.expected, '| got:', d.got, '|', d.label, '| raw:', d.raw));
  }
})();