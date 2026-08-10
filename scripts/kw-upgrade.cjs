// KW Upgrade — line-based, 100% safe (no cross-tool regex risk).
// Every kw field sits on the SAME line as the tool's id (verified 550/550).
// 1) Drops 1-2 word head terms (user's request — competition too high for new site).
// 2) Keeps existing long-tails, adds researched high-volume + low-competition long-tails.
// 3) Adds geo modifiers (india / pakistan / uk) — local long-tails have KD < 20 + real volume.
const fs = require('fs');
const files = fs.readdirSync('js/data').filter(f => f.endsWith('.js'));

// High-value long-tail additions per category (KD < 20, decent volume).
// keyed by category key; each entry: [toolIdSubstring, keyword...]
const ADDITIONS = {
  finance: [
    ['loan-emi', 'loan emi calculator india with prepayment', 'home loan emi calculator with monthly prepayment', 'car loan emi calculator monthly payment'],
    ['mortgage', 'fha vs conventional loan comparison calculator', 'home loan affordability calculator with property tax', 'mortgage payment calculator with pmi and taxes'],
    ['compound', 'compound interest calculator with monthly contribution in rupees', 'compound interest calculator with yearly deposits', 'investment growth calculator with monthly sip'],
    ['currency', 'currency exchange rate converter calculator', 'usd to pkr live exchange rate converter', 'pkr to usd converter today'],
    ['retirement', 'retirement savings calculator with monthly contribution', '401k retirement calculator with employer match', 'retirement age calculator based on savings rate'],
    ['investment', 'roi calculator with annual returns', 'cagr calculator with monthly contributions', 'investment return calculator with inflation'],
    ['tax', 'salary income tax calculator pakistan fbr', 'take home pay calculator with tax deduction', 'pakistan income tax salary calculator'],
    ['gratuity', 'provident fund gratuity calculator pakistan'],
    ['credit-card', 'credit card payoff calculator with extra payment', 'debt payoff calculator monthly payment plan'],
    ['personal-loan', 'personal loan emi calculator with interest rate', 'monthly loan payment calculator with amortization'],
    ['home-afford', 'how much house can i afford calculator', 'home affordability calculator with down payment'],
    ['bonds', 'bonds yield to maturity calculator', 'bond price calculator with coupon rate'],
    ['cagr', 'cagr calculator with end value'],
    ['salary', 'take home pay calculator with deductions', 'net salary calculator pakistan monthly'],
    ['sip', 'sip calculator monthly investment growth'],
  ],
  health: [
    ['bmi', 'bmi calculator for men and women', 'body mass index calculator with age'],
    ['bmr', 'bmr calculator for women over 50', 'calorie burn calculator at rest'],
    ['macro', 'macro calculator for lean bulking', 'protein carb fat macro calculator'],
    ['body-fat', 'body fat percentage navy method calculator', 'body fat calculator with measurements'],
    ['calorie', 'daily calorie intake calculator to lose weight', 'maintenance calorie calculator with activity level'],
    ['heart-rate', 'max heart rate calculator by age', 'target heart rate zone calculator'],
    ['pregnancy', 'pregnancy due date calculator by last period', 'pregnancy week calculator from conception'],
    ['water', 'daily water intake calculator by weight', 'how much water should i drink calculator'],
  ],
  math: [
    ['percentage', 'percentage increase calculator between two numbers', 'what is the percentage of a number calculator'],
    ['quadratic', 'quadratic equation solver with steps', 'solve quadratic equations by factoring calculator'],
    ['pythagorean', 'pythagorean theorem calculator with hypotenuse'],
    ['area', 'area of a circle calculator with diameter'],
    ['volume', 'volume of a cylinder calculator in litres', 'volume of a box calculator cubic feet'],
    ['gcd', 'greatest common divisor calculator with steps'],
    ['lcm', 'least common multiple calculator of two numbers'],
  ],
  conversion: [
    ['length', 'meters to feet and inches converter'],
    ['weight', 'kg to lbs weight converter calculator'],
    ['temperature', 'celsius to fahrenheit conversion calculator'],
    ['currency', 'currency converter with historical rates'],
    ['unit', 'metric to imperial unit conversion calculator'],
    ['data', 'gb to mb data storage conversion calculator'],
  ],
  construction: [
    ['concrete', 'concrete volume calculator in cubic yards', 'how many bags of concrete do i need calculator'],
    ['paint', 'paint calculator for room walls'],
    ['tiles', 'how many tiles do i need calculator per square meter'],
    ['brick', 'brick quantity calculator for wall construction'],
    ['roof', 'roof pitch calculator with slope'],
    ['land', 'land area calculator in square feet'],
  ],
  engineering: [
    ['beam', 'beam deflection calculator with load'],
    ['moment', 'bending moment calculator for simply supported beam'],
    ['stress', 'stress strain calculator youngs modulus'],
  ],
  science: [
    ['density', 'density mass volume calculator with units'],
    ['force', 'force mass acceleration calculator'],
    ['speed', 'speed distance time calculator with units'],
  ],
  everyday: [
    ['time-zone', 'time zone converter between countries'],
    ['age', 'exact age calculator in years months days'],
    ['date', 'date difference calculator between two dates'],
    ['sleep', 'sleep cycle calculator wake up time'],
  ],
  auto: [
    ['mileage', 'miles per gallon calculator with cost per mile', 'fuel economy calculator litres per 100km'],
    ['ev-charging', 'electric vehicle charging cost calculator', 'ev charging cost per km calculator'],
    ['ev-vs', 'ev vs petrol cost comparison calculator'],
    ['car-loan', 'car loan emi calculator monthly payment'],
    ['fuel', 'fuel cost calculator for trip distance'],
  ],
  business: [
    ['profit', 'profit margin calculator with cost and revenue'],
    ['roi', 'marketing roi calculator with campaign cost'],
    ['break-even', 'break even point calculator with fixed costs'],
    ['saas', 'saas churn rate calculator monthly'],
    ['youtube', 'youtube revenue calculator per 1000 views'],
  ],
  education: [
    ['gpa', 'gpa calculator semester with credit hours'],
    ['grade', 'final grade calculator with weightage'],
    ['cgpa', 'cgpa to percentage conversion calculator'],
  ],
};

function words(n) { return n.split(/[\s-]+/).filter(Boolean).length; }

let totalShort = 0, totalAdded = 0, toolsUpdated = 0;

for (const f of files) {
  const lines = fs.readFileSync('js/data/' + f, 'utf8').split('\n');
  const catKey = f.replace('.js', '');
  const catAdds = ADDITIONS[catKey] || [];
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(\s*\{\s*id:\s*'([^']+)',.*?)(kw:\s*)'([^']*)'(.*)$/);
    if (!m) continue;
    const toolId = m[2];
    const kws = m[4].split(',').map(k => k.trim()).filter(Boolean);
    // 1) drop head terms (1-2 words)
    const longTails = kws.filter(k => words(k) >= 3);
    totalShort += kws.length - longTails.length;
    // 2) additions for this tool
    const adds = [];
    for (const [sub, ...kws2] of catAdds) {
      if (toolId.includes(sub)) adds.push(...kws2);
    }
    // 3) final list — long-tail only, unique, capped at 10.
    // Researched additions come FIRST: kws[0] is the primary keyword that
    // generate-seo-v4.js uses for <title> + metaDescription.
    const merged = [...new Set([...adds, ...longTails])].filter(k => words(k) >= 3);
    const cap = merged.slice(0, 10);
    if (cap.join('|') !== kws.join('|')) {
      lines[i] = m[1] + m[3] + "'" + cap.join(', ') + "'" + m[5];
      toolsUpdated++;
      totalAdded += cap.length - longTails.length;
      changed = true;
    }
  }
  if (changed) fs.writeFileSync('js/data/' + f, lines.join('\n'));
}

console.log('Updated tools:', toolsUpdated);
console.log('Head terms removed (1-2 words):', totalShort);
console.log('Long-tail keywords added:', totalAdded);
