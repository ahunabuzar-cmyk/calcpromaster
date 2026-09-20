// ============================================================
// Smart Search Engine (S0 + S3#24) — ONE shared scoring core used by:
//   - nav search dropdown (every page)
//   - home / 404-page live search
//   - Ctrl+K command palette
//   - natural-language query routing
//
// Dual-mode: window.SmartSearch in the browser, module.exports for tests.
// Pure logic — no DOM access, no I18n, no Security dependency.
//
// Pipeline: normalize → tokenize → strip stopwords → per-tool score
//   (title / keywords / category / description + fuzzy token match +
//   curated NL intent patterns) → stable sort by (score desc, name asc).
//
// The catalog is built by the deploy build from all-tool-ids.json
// (the registry snapshot) — NOT from CALC_DATA, so results are
// available before the lazy category data loads.
// ============================================================
const SmartSearch = (function () {
  'use strict';

  // Multi-word intents: full phrase must appear in the query.
  const NL_INTENTS = [
    { re: /how much (house|home).{0,12}(afford|cost)/i, ids: ['finance/home-afford', 'finance/mortgage'] },
    { re: /(take[- ]?home|net) (pay|salary)/i, ids: ['finance/salary', 'finance/paycheck'] },
    { re: /(car|auto|vehicle).{0,8}(loan|financ)/i, ids: ['auto-transport/car-loan-emi', 'finance/auto-loan'] },
    { re: /emi.{0,20}(car|vehicle)/i, ids: ['auto-transport/car-loan-emi'] },
    { re: /(monthly|loan).{0,6}(payment|installment|instalment|emi)/i, ids: ['finance/loan-emi', 'finance/amortization'] },
    { re: /calculate.{0,12}emi/i, ids: ['finance/loan-emi'] },
    { re: /(home|house).{0,8}loan/i, ids: ['finance/mortgage', 'finance/loan-emi'] },
    { re: /(weight|fat).{0,10}(loss|reduce|lose)/i, ids: ['fitness-exercise/weight-loss', 'food-nutrition/weight-loss-time', 'health/bmi'] },
    { re: /(body mass index|am i (overweight|obese|fat))|bmi\b/i, ids: ['health/bmi'] },
    { re: /(how many calories|calorie.{0,12}(need|intake|daily))/i, ids: ['health/calorie', 'food-nutrition/daily-calorie'] },
    { re: /(baby|child).{0,8}(due|born|birth)|when.{0,14}(baby|child)/i, ids: ['health/pregnancy', 'health/trimester-date'] },
    { re: /(gpa|grade point).{0,10}(calculat|percent)/i, ids: ['education/gpa', 'education/grade'] },
    { re: /(tip|gratuity).{0,10}(bill|restaurant|amount|calculate)/i, ids: ['finance/tip'] },
    { re: /(split|divide).{0,10}bill/i, ids: ['finance/tip', 'math/percentage'] },
    { re: /(income|payroll).{0,8}tax.{0,12}(pakistan|india|uk|usa|us|canada|australia)/i, ids: ['regional/income-tax-india', 'finance/us-income-tax', 'finance/uk-income-tax', 'finance/canada-income-tax'] },
    { re: /(zakat|fitrana)/i, ids: ['regional/zakat-calculator'] },
    { re: /(compound|simple).{0,6}interest/i, ids: ['finance/compound-interest', 'finance/simple-interest'] },
    { re: /(retire|retirement).{0,14}(save|plan|fund|need)/i, ids: ['finance/retirement'] },
    { re: /(currency|dollar|euro|rupee|pound|dirham).{0,12}(convert|rate|exchange)/i, ids: ['finance/currency-converter'] },
    { re: /(mortgage|house loan).{0,12}(payment|monthly)/i, ids: ['finance/mortgage', 'finance/loan-emi'] },
    { re: /(discount|sale price|off).{0,10}(percent|calculate|%)/i, ids: ['finance/discount', 'math/percentage'] },
    { re: /(concrete|cement).{0,12}(slab|bag|volume|need)/i, ids: ['construction/concrete-slab', 'construction/gravel'] },
    { re: /(paint).{0,12}(room|wall|cover|gallon|litre|liter)/i, ids: ['lifestyle/paint-coverage', 'construction/wall-area'] },
    { re: /(ohm|voltage|current|resistance).{0,16}(law|calculat)/i, ids: ['science/ohms-law', 'engineering/voltage-drop'] },
    { re: /(age).{0,12}(calculat|how old)/i, ids: ['everyday/age', 'everyday/date-diff'] },
    { re: /(days between|difference between (two )?dates|date difference)/i, ids: ['everyday/date-diff'] },
    { re: /(save|saving).{0,14}(goal|target|plan)/i, ids: ['finance/savings-goal', 'finance/compound-interest'] },
    { re: /(sip|mutual fund).{0,10}(return|invest)/i, ids: ['finance/sip', 'regional/sip-return'] },
    { re: /(fuel|petrol|gas|mileage).{0,12}(cost|price|economy)/i, ids: ['auto-transport/fuel-cost', 'auto-transport/fuel-price-compare'] },
    { re: /(speed|distance).{0,8}time/i, ids: ['auto-transport/speed-distance-time'] },
    { re: /(water).{0,12}(intake|drink|daily)/i, ids: ['food-nutrition/daily-water-intake'] },
    { re: /(unit|convert).{0,12}(kg|pound|cm|inch|meter|feet|celsius|fahrenheit)/i, ids: ['conversion/length', 'conversion/weight', 'conversion/volume'] },
    { re: /(internet|download).{0,10}(speed|bandwidth|time)/i, ids: ['tech-digital/internet-speed'] },
    { re: /(freelance|consultant).{0,10}(hourly|rate|charge)/i, ids: ['career-freelance/freelance-hourly-rate'] },
    { re: /(screenshot|image).{0,12}(size|resolution|file)/i, ids: ['tech-digital/video-size', 'tech-digital/data-usage'] }
  ];

  // Single-word synonyms → tool ids (curated; no auto-generated lists).
  const SYNONYMS = {
    emi: ['finance/loan-emi', 'auto-transport/car-loan-emi'],
    mortgage: ['finance/mortgage', 'finance/loan-emi', 'finance/amortization', 'finance/home-afford'],
    installment: ['finance/loan-emi', 'finance/amortization'],
    instalment: ['finance/loan-emi', 'finance/amortization'],
    salary: ['finance/salary', 'finance/paycheck', 'career-freelance/salary-converter'],
    paycheck: ['finance/paycheck', 'finance/salary'],
    wage: ['finance/salary', 'career-freelance/freelance-hourly-rate'],
    takhome: ['finance/salary', 'finance/paycheck'],
    morgage: ['finance/mortgage', 'finance/loan-emi', 'finance/home-afford'],
    morgagee: ['finance/mortgage'],
    house: ['finance/home-afford', 'finance/mortgage', 'home-garden/room-area'],
    home: ['finance/home-afford', 'finance/mortgage'],
    afford: ['finance/home-afford'],
    affordability: ['finance/home-afford'],
    loan: ['finance/loan-emi', 'finance/auto-loan', 'finance/mortgage', 'finance/loan-to-value'],
    interest: ['finance/compound-interest', 'finance/simple-interest', 'finance/interest-only', 'finance/apr'],
    tax: ['finance/us-income-tax', 'regional/income-tax-india', 'finance/sales-tax', 'career-freelance/tax-bracket'],
    vat: ['regional/uae-vat', 'finance/sales-tax'],
    gst: ['regional/gst-calculator', 'finance/sales-tax'],
    bmi: ['health/bmi', 'health/body-fat', 'health/ideal-weight'],
    bmr: ['health/bmr'],
    calorie: ['health/calorie', 'food-nutrition/daily-calorie'],
    calories: ['health/calorie', 'food-nutrition/daily-calorie'],
    fat: ['health/body-fat', 'health/bmi'],
    weight: ['conversion/weight', 'health/ideal-weight', 'health/bmi'],
    height: ['health/ideal-weight', 'parenting-family/child-height', 'health/waist-height-ratio'],
    ovulation: ['health/ovulation'],
    pregnancy: ['health/pregnancy', 'health/trimester-date'],
    gpa: ['education/gpa', 'education/cgpa', 'education/grade'],
    grade: ['education/grade', 'education/gpa'],
    percentage: ['math/percentage', 'math/percent-change'],
    percent: ['math/percentage'],
    discount: ['finance/discount', 'finance/sales-tax', 'finance/markup'],
    tip: ['finance/tip'],
    gratuity: ['finance/tip'],
    currency: ['finance/currency-converter'],
    exchange: ['finance/currency-converter'],
    convert: ['utilities/unit-converter', 'conversion/length', 'conversion/weight', 'conversion/volume'],
    length: ['conversion/length'],
    distance: ['conversion/length', 'auto-transport/speed-distance-time'],
    temperature: ['conversion/temperature'],
    celsius: ['conversion/temperature'],
    fahrenheit: ['conversion/temperature'],
    age: ['everyday/age'],
    date: ['everyday/date-diff', 'everyday/time-calc'],
    time: ['everyday/time-calc', 'auto-transport/speed-distance-time'],
    fuel: ['auto-transport/fuel-cost'],
    petrol: ['auto-transport/fuel-cost'],
    mileage: ['auto-transport/fuel-cost', 'everyday/trip-fuel-cost'],
    concrete: ['construction/concrete-slab', 'construction/gravel'],
    cement: ['construction/concrete-slab'],
    paint: ['lifestyle/paint-coverage', 'construction/wall-area'],
    tile: ['construction/tile-calculator', 'construction/tile-boxes', 'home-garden/grout-calc'],
    roof: ['construction/roofing'],
    ohm: ['science/ohms-law'],
    voltage: ['science/ohms-law', 'engineering/voltage-drop'],
    resistor: ['engineering/led-resistor'],
    torque: ['engineering/torque'],
    gear: ['engineering/gear-ratio'],
    sip: ['finance/sip', 'regional/sip-return'],
    ppf: ['regional/ppf-calculator'],
    retirement: ['finance/retirement'],
    invest: ['finance/compound-interest', 'finance/roi', 'business/business-roi'],
    roi: ['finance/roi', 'business/business-roi'],
    cagr: ['finance/cagr'],
    inflation: ['finance/inflation'],
    profit: ['business/profit-margin', 'finance/net-profit-margin'],
    margin: ['business/profit-margin'],
    breakeven: ['finance/break-even', 'business/break-even-point', 'business/break-even-revenue'],
    depreciation: ['business/depreciation'],
    invoice: ['career-freelance/invoicing-calc', 'business/invoice-due-date', 'finance/factoring-fee'],
    zakat: ['regional/zakat-calculator'],
    fitrana: ['regional/zakat-calculator'],
    water: ['food-nutrition/daily-water-intake', 'construction/water-tank'],
    sleep: ['health/sleep'],
    steps: ['fitness-exercise/steps-to-distance'],
    pace: ['fitness-exercise/running-pace'],
    marathon: ['fitness-exercise/race-predictor'],
    baby: ['parenting-family/baby-weight-gain', 'parenting-family/baby-feeding'],
    diaper: ['parenting-family/baby-feeding'],
    wifi: ['tech-digital/wifi-channels'],
    internet: ['tech-digital/internet-speed', 'tech-digital/bandwidth-calc'],
    bandwidth: ['tech-digital/bandwidth-calc'],
    password: ['utilities/password-gen'],
    qr: ['utilities/qr-generator'],
    hash: ['utilities/hash-gen'],
    color: ['utilities/color-picker'],
    scientific: ['math/scientific'],
    quadratic: ['math/quadratic'],
    triangle: ['math/triangle'],
    fraction: ['math/fraction'],
    ratio: ['math/ratio'],
    prime: ['utilities/prime-check', 'math/prime-factor', 'math/sieve-prime'],
    factorial: ['math/factorial'],
    lcm: ['math/lcm-gcd', 'utilities/gcd-lcm'],
    gcd: ['math/lcm-gcd', 'utilities/gcd-lcm'],
    vector: ['math/vector-add', 'math/angle-between-vectors'],
    matrix: ['math/matrix-det', 'math/matrix-multiply', 'math/matrix-inverse'],
    loan: undefined,
    loans: ['finance/loan-emi', 'finance/auto-loan', 'finance/mortgage']
  };
  delete SYNONYMS.loan; // handled by multi-token scoring + NL intents

  const STOPWORDS = new Set(['a', 'an', 'the', 'for', 'my', 'of', 'in', 'on', 'to', 'is',
    'are', 'do', 'does', 'i', 'me', 'can', 'how', 'much', 'many', 'what', 'calculate',
    'calculator', 'calc', 'compute', 'need', 'want', 'please', 'with', 'and', 'or',
    'from', 'at', 'be', 'it', 'this', 'that', 'should', 'would', 'if']);

  function normalize(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9%₹$€£₨ ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function tokens(q) {
    return normalize(q).split(' ').filter(Boolean).filter(w => !STOPWORDS.has(w));
  }

  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let row0 = new Array(n + 1), row1 = new Array(n + 1);
    for (let j = 0; j <= n; j++) row0[j] = j;
    for (let i = 1; i <= m; i++) {
      row1[0] = i;
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        row1[j] = Math.min(row0[j] + 1, row1[j - 1] + 1, row0[j - 1] + cost);
      }
      const tmp = row0; row0 = row1; row1 = tmp;
    }
    return row0[n];
  }

  function buildCatalog(rows) {
    const cat = {};
    for (const r of rows) {
      if (!r || !r.id || !(r.name || r.n)) continue;
      // Accept both registry rows ({name,desc,kw}) and generated catalog rows
      // ({n,d,k} from scripts/gen-tool-catalog.cjs). Key by FULL id ('cat/id') —
      // the same format NL_INTENTS and SYNONYMS reference.
      const fullId = r.id.indexOf('/') !== -1 ? r.id : (r.cat ? r.cat + '/' + r.id : r.id);
      cat[fullId] = {
        // Bare id (no category prefix) so callers build URLs as cat + '/' + id.
        id: r.id.indexOf('/') !== -1 ? r.id.slice(r.id.indexOf('/') + 1) : r.id,
        name: r.name || r.n,
        desc: r.desc || r.d || '',
        kw: r.kw || r.k || '',
        cat: r.cat || (fullId.indexOf('/') !== -1 ? fullId.slice(0, fullId.indexOf('/')) : '')
      };
    }
    return cat;
  }

  function scoreTool(tool, toks, raw) {
    const name = tool.name.toLowerCase();
    const nameId = tool.id.replace(/-/g, ' ');
    const kw = (tool.kw || '').toLowerCase();
    const desc = (tool.desc || '').toLowerCase();
    const cat = (tool.cat || '').toLowerCase();
    let score = 0;

    // Exact / prefix / substring title match (strongest signals)
    if (name === raw) score = Math.max(score, 100);
    else if (name.indexOf(raw) === 0) score = Math.max(score, 90);
    else if (name.includes(raw)) score = Math.max(score, 80);
    if (nameId === raw) score = Math.max(score, 95);
    else if (nameId.includes(raw)) score = Math.max(score, 70);

    for (const w of toks) {
      if (name.includes(w)) score = Math.max(score, 76);
      if (nameId.includes(w)) score = Math.max(score, 72);
      if (kw.includes(w)) score = Math.max(score, 62);
      if (cat.includes(w)) score = Math.max(score, 44);
      if (desc.includes(w)) score = Math.max(score, 38);
      // Fuzzy per name token (≥4 chars, tolerate 1–2 typos)
      for (const nt of name.split(/[^a-z0-9]+/)) {
        if (nt.length < 4 || Math.abs(nt.length - w.length) > 2) continue;
        const d = lev(nt, w);
        if (d <= 1) {
          score = Math.max(score, 46);
          // One-typo query that corrects to a known synonym ("percemtage" →
          // "percentage") rides the synonym lift for better ranking.
          if (SYNONYMS[nt]) score = Math.max(score, 66);
        }
        else if (d <= 2 && nt.length >= 5) score = Math.max(score, 34);
      }
    }
    return score;
  }

  function search(query, catalog, opts) {
    opts = opts || {};
    const limit = opts.limit || 8;
    const cat = catalog;
    const raw = normalize(query);
    if (!raw) return [];
    const toks = tokens(query);
    // All-stopword queries ('calculator', 'how much') would otherwise substring-
    // match every "… Calculator" title via `raw` — return nothing instead.
    if (!toks.length) return [];
    const out = new Map();

    const add = (key, score, why) => {
      const t = cat[key];
      if (!t) return;
      const cur = out.get(key);
      if (!cur || score > cur.score) out.set(key, { id: t.id, name: t.name, desc: t.desc, cat: t.cat, score, why: why || cur && cur.why || 'match' });
    };

    // 1. NL intents (highest confidence — full-phrase patterns)
    for (const intent of NL_INTENTS) {
      if (intent.re.test(query)) {
        intent.ids.forEach((id, i) => add(id, 96 - i * 2, 'intent'));
      }
    }
    // 2. Synonym lifts
    for (const w of toks) {
      const syn = SYNONYMS[w];
      if (syn) syn.forEach((id, i) => add(id, 88 - i * 3, 'synonym'));
    }
    // 3. Textual scoring across the catalog
    if (cat && toks.length) {
      for (const key in cat) {
        const s = scoreTool(cat[key], toks, raw);
        if (s > 0) add(key, s, 'text');
      }
    }

    let list = [...out.values()];
    // 4. Category-boost: if the query names a category, its tools rank above equals
    const catNames = { finance: 1, health: 1, math: 1, science: 1, engineering: 1, construction: 1,
      business: 1, education: 1, conversion: 1, everyday: 1, utilities: 1, lifestyle: 1,
      'food-nutrition': 1, 'fitness-exercise': 1, 'auto-transport': 1, 'home-garden': 1,
      'parenting-family': 1, 'tech-digital': 1, 'career-freelance': 1, regional: 1 };
    for (const w of toks) {
      if (catNames[w]) {
        for (const r of list) if (r.cat === w) r.score += 6;
      }
    }
    list.sort((a, b) => b.score - a.score
      || (a.id.length - b.id.length)      // shorter id = more canonical/general tool
      || (a.name.length - b.name.length)
      || a.name.localeCompare(b.name));
    return list.slice(0, limit);
  }

  return { search, buildCatalog, normalize, tokens, _lev: lev, NL_INTENTS, SYNONYMS, STOPWORDS };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SmartSearch;
if (typeof window !== 'undefined') window.SmartSearch = SmartSearch;
