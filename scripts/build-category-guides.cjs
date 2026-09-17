#!/usr/bin/env node
/* Builds 11 category guide hub pages (guides/<cat>.html) for categories that
 * previously had zero guide coverage (fitness is covered by health-fitness.html).
 * Content per category is hand-written below — not boilerplate.
 * Run from project root: node scripts/build-category-guides.cjs
 */
const fs = require('fs');
const ORIGIN = 'https://calcpromaster.netlify.app';

const CATS = [
  {
    slug: 'science', name: 'Science', tagline: 'Physics & chemistry fundamentals',
    intro: 'Science calculators look intimidating because textbooks bury the formula under notation. Each of these explainers strips a physical law down to its variables, shows a worked number, and tells you which units must match before the answer means anything.',
    deepDive: [
      'Start every problem by writing the formula, then listing each variable with its unit. Density = mass \u00f7 volume: 27 g of aluminium occupying 10 cm\u00b3 gives 2.7 g/cm\u00b3 \u2014 the accepted value, which is how you know the units were right. Enter that mass in kilograms while volume stays in cm\u00b3 and the result is 0.0027, silently meaningless.',
      'Two habits prevent most wrong answers. First, convert everything to the formula\u2019s base units before calculating \u2014 the unit conversion guide lists the exact factors. Second, sanity-check the magnitude: a human body is roughly 1,000 kg/m\u00b3 (we barely float), the Earth about 5,500 kg/m\u00b3, sea-level air about 1.2 kg/m\u00b3. Results far outside familiar ranges usually mean a unit slipped, not that you discovered new physics.'
    ],
    guides: [
      ['Unit Conversion Guide', '/guides/unit-conversion', 'Exact metric-imperial factors for the SI units every physics problem uses.'],
      ['Random Numbers Guide', '/guides/random-numbers', 'How pseudo-random generation works and when it matters for simulations.']
    ],
    ctas: [["Ohm's Law Calculator", '/science/ohms-law'], ['Density Calculator', '/science/density'], ['Force Calculator', '/science/force']],
    faq: [
      ['Why do my science calculator results look wrong?', 'Almost always a unit mismatch: grams fed into a kg-based formula, or kPa treated as Pa. Convert every input to the formula\u2019s base units first \u2014 the unit conversion guide shows the exact factors.'],
      ['Which base units does SI use?', 'Metre (length), kilogram (mass), second (time), ampere (current), kelvin (temperature), mole (amount), and candela (luminous intensity). Every derived unit \u2014 newtons, joules, pascals \u2014 is built from these.']
    ]
  },
  {
    slug: 'engineering', name: 'Engineering', tagline: 'Electrical, mechanical & structural math',
    intro: 'Engineering calculations punish small errors \u2014 a wrong voltage-drop figure means undersized cables, a wrong gear ratio means a drivetrain that never reaches design speed. These guides show the formula, the assumptions behind it, and a worked example you can check by hand.',
    deepDive: [
      'Every engineering formula hides assumptions, and knowing them matters more than memorizing the algebra. Voltage drop = 2 \u00d7 L \u00d7 I \u00d7 \u03c1 \u00f7 A assumes a resistive load, a conductor at operating temperature, and length L counted along both conductors \u2014 hence the 2. Ignore any of these and the number is precise but wrong.',
      'A worked check: 20 m run, 10 A load, 2.5 mm\u00b2 copper (\u03c1 \u2248 0.0175 \u03a9\u00b7mm\u00b2/m). Drop = 2 \u00d7 20 \u00d7 10 \u00d7 0.0175 \u00f7 2.5 = 2.8 V \u2014 about 1.2% of a 230 V supply, comfortably inside the 3\u20135% usually tolerated. If your real circuit shows double that, the likely culprits are temperature-derated conductors or an undersized return path, not the formula.'
    ],
    guides: [
      ['Unit Conversion Guide', '/guides/unit-conversion', 'Awg, mm\u00b2, psi, bar \u2014 converting the units engineering specs mix freely.'],
      ['Concrete Guide', '/guides/concrete', 'Load-bearing material math for structural and civil work.']
    ],
    ctas: [['Voltage Drop Calculator', '/engineering/voltage-drop'], ['Gear Ratio Calculator', '/engineering/gear-ratio'], ['Torque Calculator', '/engineering/torque']],
    faq: [
      ['How is voltage drop calculated?', 'VD = 2 \u00d7 L \u00d7 I \u00d7 R per conductor pair, where L is one-way cable length in metres, I the load current, and R the conductor resistance in ohms per metre. Keeping drop under 3% of supply voltage is the common design target for branch circuits.'],
      ['What does a gear ratio actually tell you?', 'It is driven-teeth \u00f7 driver-teeth: a 4:1 ratio cuts speed to a quarter while multiplying torque fourfold (minus friction losses). The gear ratio calculator converts ratio, RPM and torque in both directions.']
    ]
  },
  {
    slug: 'auto', name: 'Auto & Vehicle', tagline: 'Fuel, ownership & running costs',
    intro: 'The sticker price is the cheapest part of owning a car. Fuel burn, maintenance, depreciation and the lease-vs-buy decision decide what a vehicle really costs per kilometre \u2014 these guides walk the actual math.',
    deepDive: [
      'Per-kilometre fuel cost is the number every other vehicle decision hangs on: fuel cost per km = fuel price per litre \u00f7 consumption in km/L. Petrol at $1.50/L with a car doing 12 km/L costs 12.5\u00a2/km \u2014 so a 20 km daily commute costs $2.50 each way before parking or tolls.',
      'Compare that with depreciation, which dwarfs fuel on newer cars: a $25,000 car losing 15% of its value in year one costs about $3,000 \u2014 roughly $8.20 a day whether you drive or not. That asymmetry is why the lease-vs-buy and EV-comparison guides ask for your annual mileage first: high mileage favors efficient ownership, low mileage questions owning at all.'
    ],
    guides: [
      ['Unit Conversion Guide', '/guides/unit-conversion', 'MPG vs L/100km \u2014 the two fuel-economy scales and why they invert.'],
      ['Discount Guide', '/guides/discount', 'Dealer \u201cextra 20% off\u201d stacking math before you sign.']
    ],
    ctas: [['Fuel Cost Calculator', '/auto/fuel-cost'], ['Car Loan EMI Calculator', '/auto/car-loan-emi'], ['EV vs Petrol Cost', '/auto/ev-vs-gas-petrol']],
    faq: [
      ['How do I calculate cost per kilometre?', 'Fuel cost per km = price per litre \u00f7 consumption (km/L), or price \u00d7 (L/100km) \u00f7 100. Add maintenance and insurance divided by your annual kilometres for the true per-km ownership figure.'],
      ['MPG and L/100km \u2014 why can\u2019t I divide one by the other?', 'They are reciprocal scales: higher MPG is better, lower L/100km is better. L/100km = 235.215 \u00f7 MPG (US). The unit conversion guide keeps the factor handy.']
    ]
  },
  {
    slug: 'career', name: 'Career & Freelance', tagline: 'Salary, rates & negotiating power',
    intro: 'Whether you are employed or freelancing, the same questions repeat: what is my time worth, what does a raise actually compound to, and what rate keeps a freelance business alive after tax and downtime? These guides do the arithmetic honestly.',
    deepDive: [
      'Two conversions carry most career math. Hourly floor from a salary: hourly = annual \u00f7 52 \u00f7 contracted hours \u2014 $52,000 at 40 h/week is $25/h. Freelance rate from a salary: divide by billable hours (roughly 25/week after admin, marketing and downtime), not 40 \u2014 the same $52,000 needs about $42/h to net the same money.',
      'Raises compound because they reset every future percentage: a 5% raise on $50,000 is $2,500 this year, but that higher base compounds through every later 3\u20135% step \u2014 tens of thousands in cumulative difference over a decade. When negotiating, the base you lock in this year matters more than any one-off bonus, which disappears from next year\u2019s calculation entirely.'
    ],
    guides: [
      ['Gross Salary vs In-Hand Salary', '/guides/salary', 'CTC \u2260 gross \u2260 net \u2014 what each deduction actually removes.'],
      ['Break-Even Guide', '/guides/break-even', 'The freelance version: fixed costs \u00f7 margin = minimum billable revenue.'],
      ['How Income Tax Is Calculated', '/guides/income-tax', 'Marginal brackets and why a raise can\u2019t shrink your take-home.']
    ],
    ctas: [['Salary Converter', '/career/salary-converter'], ['Freelance Hourly Rate', '/career/freelance-hourly-rate'], ['Overtime Pay Calculator', '/career/overtime-pay']],
    faq: [
      ['How do I convert annual salary to hourly?', 'Annual \u00f7 paid hours. The standard baseline is \u00f72080 (40 h \u00d7 52 weeks); use your real paid weeks and weekly hours for accuracy. The salary converter handles all period pairs both ways.'],
      ['What should a freelance hourly rate include?', 'Your target net, plus taxes, plus unpaid time (admin, sales, holidays) spread over billable hours \u2014 then a margin. Charging your old salary \u00f72080 quietly prices away every non-billable hour.']
    ]
  },
  {
    slug: 'homegarden', name: 'Home & Garden', tagline: 'Rooms, materials & sizing',
    intro: 'Home projects fail on quantities: one roll of wallpaper short, an AC that never quite cools, paint bought twice. These guides show the measurement-first approach \u2014 area, factor, waste allowance \u2014 behind every room calculation.',
    deepDive: [
      'Room calculations all start the same way: get the area right, then apply the per-unit coverage factor with a waste allowance. Paint example: a 4 m \u00d7 5 m room with 2.5 m ceilings has 45 m\u00b2 of wall (perimeter 18 m \u00d7 2.5 m); at 10 m\u00b2 per litre and two coats, that\u2019s 9 litres \u2014 round up to two 5 L cans, because running out a third of the way into the second coat is a real trip.',
      'The waste allowance is not padding: wallpaper drops get trimmed (10% typical), tiles break (buy 10% extra), lawns are never perfect rectangles. Buying exactly the computed amount is how projects end with a second shopping trip for one item \u2014 and a dye lot that doesn\u2019t quite match.'
    ],
    guides: [
      ['Concrete Guide', '/guides/concrete', 'Slab and footing volume math for outdoor projects.'],
      ['Unit Conversion Guide', '/guides/unit-conversion', 'Square feet \u2194 square metres and the other household conversions.']
    ],
    ctas: [['Room Area & Flooring Calculator', '/homegarden/room-area'], ['Paint Cost Estimator', '/homegarden/paint-cost'], ['AC/BTU Size Calculator', '/homegarden/ac-size']],
    faq: [
      ['How many rolls of wallpaper do I need?', 'Wall area \u00f7 usable area per roll, then add 10\u201315% for pattern matching and offcuts. Rolls rarely yield their full square metres once you align repeats \u2014 the wallpaper rolls calculator applies the allowance for you.'],
      ['How is AC size (BTU) worked out?', 'Floor area \u00d7 a climate-and-insulation factor, roughly 20 BTU per square foot as a baseline, adjusted up for sunny rooms, kitchens and high ceilings. Oversizing cools fast but leaves air clammy \u2014 size honestly.']
    ]
  },
  {
    slug: 'family', name: 'Family & Parenting', tagline: 'Growing children, growing budgets',
    intro: 'Parenting math is emotional math: is my baby growing on schedule, how much does childcare really change the budget, what does a college fund need every month? These guides lay out the reference numbers and the honest assumptions.',
    deepDive: [
      'Family budgets work when categories are honest about variability: fixed commitments (housing, insurance), predictable variables (food, utilities, transport), irregular-but-certain (school supplies, medical), and savings treated as a bill, not a leftover. The 50/30/20 split is a starting proportion, not a rule \u2014 housing-heavy regions routinely run closer to 60/20/20.',
      'For the child-cost decisions in this section, price the specific arrangement, not the average. The worked baby-cost example shows the childcare line moving a first-year total by more than everything else combined; the college example shows $300/month at 6% becoming roughly $75,000 over 17 years \u2014 both are arithmetic you can verify line by line.'
    ],
    guides: [
      ['Calorie Guide', '/guides/calories', 'Energy needs \u2014 the Mifflin-St Jeor baseline behind child and adult estimates.'],
      ['Gross vs In-Hand Salary', '/guides/salary', 'Planning the family budget from real take-home, not CTC.']
    ],
    ctas: [['Family Monthly Budget', '/family/family-budget'], ['Children BMI Percentile', '/family/child-bmi'], ['College Savings', '/family/college-savings']],
    faq: [
      ['What is a baby weight percentile?', 'It compares your baby\u2019s weight against a reference population: the 60th percentile means heavier than 60 of 100 babies the same age and sex. The curve matters more than one reading \u2014 steady tracking along any percentile is the healthy pattern.'],
      ['How much should a family save monthly for college?', 'Target amount \u00f7 months remaining, adjusted for expected investment growth. Starting at birth roughly halves the monthly burden versus starting at age 10 \u2014 the college savings calculator compounds it precisely.']
    ]
  },
  {
    slug: 'food', name: 'Food & Nutrition', tagline: 'Calories, macros & kitchen math',
    intro: 'Nutrition advice collapses without arithmetic: how many calories your body actually needs, how protein maps to body weight, and how a recipe scales from four plates to forty without the seasoning going wrong.',
    deepDive: [
      'Nutrition math starts with TDEE: BMR \u00d7 activity multiplier. For the calculators\u2019 example adult \u2014 70 kg, 30 years, 175 cm \u2014 Mifflin-St Jeor lands near 1,650 kcal BMR; a moderate multiplier of 1.55 brings TDEE to roughly 2,550 kcal. A 500 kcal daily deficit then predicts about half a kilogram of loss per week \u2014 slowly and noisily, not linearly.',
      'Protein targets are simpler than supplement marketing suggests: 0.8 g/kg is the RDA floor for sedentary adults; 1.2\u20132.0 g/kg fits active training or ageing bodies. For an 80 kg lifter at 1.6 g/kg, that\u2019s 128 g/day \u2014 spreadable across three meals; precision beyond that earns nothing.'
    ],
    guides: [
      ['Calorie Guide', '/guides/calories', 'BMR, activity multipliers and honest deficit math.'],
      ['Unit Conversion Guide', '/guides/unit-conversion', 'Cups, grams and millilitres \u2014 kitchen conversions that go wrong.'],
      ['BMI Guide', '/guides/bmi', 'What BMI does and doesn\u2019t say about a body.']
    ],
    ctas: [['Daily Calorie Needs', '/food/daily-calorie'], ['Macro Split Calculator', '/food/macro-split'], ['Recipe Scaler', '/food/recipe-scaler']],
    faq: [
      ['How do I calculate my daily calorie needs?', 'BMR via Mifflin-St Jeor (10 \u00d7 kg weight + 6.25 \u00d7 cm height \u2212 5 \u00d7 age + sex offset), then \u00d7 an activity factor from 1.2 (sedentary) to 1.9 (very active). That maintenance figure is what you adjust up or down.'],
      ['How much protein do I need per day?', 'The RDA floor is 0.8 g per kg of body weight; 1.2\u20132.0 g/kg supports active training or older adults. The protein need calculator applies your weight and goal directly.']
    ]
  },
  {
    slug: 'lifestyle', name: 'Lifestyle & Money Habits', tagline: 'Moving, renting & everyday spending',
    intro: 'Lifestyle costs hide in repetition: the coffee habit, the delivery fee, the deposit you never fully got back. These guides turn habitual spending into annual numbers you can actually argue with.',
    deepDive: [
      'Habit costs are invisible because they repeat: a $5 workday coffee is about $1,300 a year across 260 workdays; a $12 delivery markup twice a week is another ~$1,250. The point is not that small pleasures are wrong \u2014 it\u2019s that a $1,300/year decision deserves the same scrutiny as a $1,300 one-time purchase, and usually gets none.',
      'Deposits are the reverse trap: money you already paid and may not see again. Photograph the property at move-in, record every existing flaw in writing, and the end-of-lease negotiation becomes arithmetic instead of memory. The moving-cost and deposit guides turn both into checklists with numbers attached.'
    ],
    guides: [
      ['Inflation Guide', '/guides/inflation', 'What last year\u2019s money buys this year \u2014 the habit-cost time machine.'],
      ['Debt Payoff Guide', '/guides/debt-payoff', 'Snowball vs avalanche when lifestyle spending created the debt.'],
      ['Discount Guide', '/guides/discount', 'Sale math that survives a shopping trip.']
    ],
    ctas: [['Moving Cost Calculator', '/lifestyle/relocation-cost'], ['Rental Deposit Return', '/lifestyle/rental-deposit'], ['Habit Cost & Opportunity Cost', '/lifestyle/coffee-habit']],
    faq: [
      ['How do I calculate the true cost of a daily habit?', 'Daily cost \u00d7 365, then optionally compound the same amount invested monthly at a realistic return \u2014 that second number is the opportunity cost. The habit cost calculator shows both side by side.'],
      ['What can a landlord deduct from a deposit?', 'Genuine damages beyond fair wear and tear, unpaid rent, and cleaning to return the property to move-in condition \u2014 not repainting worn paint. Photograph at move-in; the deposit calculator helps you estimate a fair return.']
    ]
  },
  {
    slug: 'regional', name: 'Regional Finance (India & South Asia)', tagline: 'FD, RD, PPF, SIP & local tax',
    intro: 'South-Asian savers juggle instruments the rest of the world doesn\u2019t use: quarterly-compounded FDs, PPF\u2019s annual ceiling, SIP instalments, TDS. These guides do the regional math with the regional rules.',
    deepDive: [
      'Regional instruments have their own compounding conventions, and using the wrong one misprices them. An Indian FD at 7% \u201cp.a.\u201d usually compounds quarterly: effective yield = (1 + 0.07/4)\u2074 \u2212 1 \u2248 7.19%. SIP returns compound monthly and depend on entry timing, which is why the same SIP shows a different XIRR for every investor.',
      'Tax treatment differs just as sharply: PPF interest is tax-free and the deposit deductible, while FD interest is taxable at slab rate. A 7% FD in the 30% bracket nets about 4.9% after tax \u2014 less than PPF\u2019s tax-free 7.1%. The regional calculators encode these rules; the guides show the arithmetic so you can verify each step.'
    ],
    guides: [
      ['Compound Interest Guide', '/guides/compound-interest', 'The compounding mechanics behind FD, RD and SIP returns.'],
      ['How Income Tax Is Calculated', '/guides/income-tax', 'Bracket logic that India\u2019s slabs also follow.'],
      ['GST & Sales Tax Explained', '/guides/gst-sales-tax', 'Forward and reverse GST \u2014 India\u2019s inclusive-pricing trap.']
    ],
    ctas: [['FD Calculator', '/regional/fd-calculator'], ['PPF Calculator', '/regional/ppf-calculator'], ['SIP Return Calculator', '/regional/sip-return']],
    faq: [
      ['How is FD maturity calculated?', 'A = P \u00d7 (1 + r/n)^(n\u00d7t) with quarterly compounding (n = 4) for most Indian bank FDs. A \u20b9100,000 FD at 7% for 5 years compounds to roughly \u20b9141,478 \u2014 the FD calculator applies your bank\u2019s exact rate and tenure.'],
      ['What is the PPF interest rule?', 'Interest accrues monthly on the lowest balance between the 5th and last day of each month, credits annually, and compounds yearly. Depositing before the 5th preserves the month\u2019s interest \u2014 the PPF calculator follows this convention.']
    ]
  },
  {
    slug: 'everyday', name: 'Everyday Calculations', tagline: 'Dates, bills & quick daily math',
    intro: 'The calculations nobody teaches: exact age in years-months-days, days between dates, an electricity bill decoded line by line, fuel split across a road trip. Small math, daily use \u2014 these guides make each one take ten seconds.',
    deepDive: [
      'Date math has exactly two traps. Age: you completed whole years on your last birthday \u2014 the formula subtracts month and day before borrowing from the year, which is why it never overcounts. Leaplings (29 February birthdays) age on 28 Feb or 1 Mar depending on convention; pick one and stay consistent.',
      'Electricity bills decode to one formula: cost = kWh \u00d7 tariff. A 1,500 W heater running 5 h/day for 30 days uses 225 kWh; at $0.15/kWh that\u2019s $33.75 \u2014 which explains most \u201cwhy is winter\u2019s bill double\u201d questions better than any theory. A photo of the meter at month start turns billing disputes into subtraction.'
    ],
    guides: [
      ['Percentage Guide', '/guides/percentage', 'The percentage change and reverse-percentage patterns bills love.'],
      ['Discount Guide', '/guides/discount', 'Stacked discounts and the \u201cextra 20% off\u201d reality.'],
      ['Tip Guide', '/guides/tip', 'Tip percentages and fair bill splitting.']
    ],
    ctas: [['Age Calculator', '/everyday/age'], ['Date Difference Calculator', '/everyday/date-diff'], ['Trip Fuel Cost Calculator', '/everyday/trip-fuel-cost']],
    faq: [
      ['How do I calculate my exact age?', 'Subtract year-month-day as a calendar operation, borrowing days from the previous month when needed \u2014 not 365.25 \u00f7 12 approximations. The age calculator handles leap years and month lengths exactly.'],
      ['How is an electricity bill calculated?', 'Units consumed (kWh) \u00d7 slab rate, where rate rises with consumption bands, plus fixed charges and duty. Reading your meter at the same date monthly keeps the slab math honest \u2014 the electricity bill calculator mirrors slab structure.']
    ]
  },
  {
    slug: 'utilities', name: 'Utilities & Developer Tools', tagline: 'Text, codes & security',
    intro: 'Utility tools deserve one explanation each: what a UUID actually guarantees, why password strength is entropy rather than length theatre, and when a hash is a fingerprint versus a password. These guides cover the concepts the tools rely on.',
    deepDive: [
      'Security utilities are honest when the limits are stated. A random UUIDv4 carries 122 random bits \u2014 collision odds across a billion UUIDs are roughly one in a quintillion, so you will never see one. Password entropy is bits = log2(pool size) \u00d7 length: 16 lowercase letters give about 75 bits; 8 characters from the full keyboard give about 52. Length wins because the formula multiplies, not adds.',
      'Hashes are for verifying data, not for storing passwords: a hash is fast by design, which is exactly what an attacker wants. That is why the password tools generate client-side with cryptographically secure randomness and never transmit anything \u2014 the tool\u2019s honesty is in what it refuses to do, not just what it computes.'
    ],
    guides: [
      ['Passwords Guide', '/guides/passwords', 'Entropy math, pool sizes and honest crack-time caveats.'],
      ['Random Numbers Guide', '/guides/random-numbers', 'Pseudo-random generation \u2014 what \u201crandom\u201d means in software.']
    ],
    ctas: [['Password Generator', '/utilities/password-gen'], ['Universal Unit Converter', '/utilities/unit-converter'], ['QR Code Generator', '/utilities/qr-generator']],
    faq: [
      ['What makes a generated password strong?', 'Entropy in bits: log\u2082(pool size) \u00d7 length. A 16-character password from a 62-character pool carries about 95 bits \u2014 far beyond offline-cracking reach. The passwords guide shows the full table.'],
      ['Are UUIDs safe as unguessable IDs?', 'Version-4 UUIDs carry 122 random bits, so guessing one is effectively impossible. But they are not secrets \u2014 anything that must resist guessing AND stay confidential still needs authentication on top.']
    ]
  }
];

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const abs = p => ORIGIN + p;

let ok = 0;
for (const c of CATS) {
  const url = abs('/guides/' + c.slug);
  const itemList = c.guides.map((g, i) =>
    '        { "@type": "ListItem", "position": ' + (i + 1) + ', "name": "' + g[0].replace(/&/g, '&amp;') + '", "url": "' + abs(g[1]) + '" }').join(',\n');
  const faqJson = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: c.faq.map(f => ({
      '@type': 'Question', 'name': f[0],
      acceptedAnswer: { '@type': 'Answer', 'text': f[1] }
    }))
  };
  const guideCards = c.guides.map(g =>
    '  <div class="cat-card">\n    <h2><a href="' + g[1] + '">' + esc(g[0]) + '</a></h2>\n    <p>' + esc(g[2]) + '</p>\n  </div>\n').join('\n');
  const ctas = c.ctas.map(t => '<a href="' + t[1] + '" class="cta">' + esc(t[0]) + '</a>').join('\n    ');
  const faqHtml = c.faq.map(f => '  <h2>' + esc(f[0]) + '</h2>\n  <p>' + esc(f[1]) + '</p>').join('\n\n');

  const html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>' + esc(c.name) + ' Guides \u2014 ' + esc(c.tagline) + ' | CalcProMaster</title>\n  <meta name="description" content="' + esc(c.intro.slice(0, 155)) + '">\n  <meta name="robots" content="index, follow">\n  <meta name="theme-color" content="#4f46e5">\n  <link rel="canonical" href="' + url + '">\n  <link rel="icon" type="image/svg+xml" href="/icon.svg">\n  <script type="application/ld+json">\n  {\n    "@context": "https://schema.org",\n    "@type": "CollectionPage",\n    "name": "' + esc(c.name) + ' Guides",\n    "description": "' + esc(c.intro.slice(0, 155)) + '",\n    "url": "' + url + '",\n    "isPartOf": { "@type": "WebSite", "name": "CalcProMaster", "url": "' + ORIGIN + '/" },\n    "breadcrumb": {\n      "@type": "BreadcrumbList",\n      "itemListElement": [\n        { "@type": "ListItem", "position": 1, "name": "Home", "item": "' + ORIGIN + '/" },\n        { "@type": "ListItem", "position": 2, "name": "Guides", "item": "' + ORIGIN + '/guides" },\n        { "@type": "ListItem", "position": 3, "name": "' + esc(c.name) + '", "item": "' + url + '" }\n      ]\n    },\n    "mainEntity": {\n      "@type": "ItemList",\n      "itemListElement": [\n' + itemList + '\n      ]\n    }\n  }\n  </script>\n  <script type="application/ld+json">\n  ' + JSON.stringify(faqJson, null, 2).replace(/\n/g, '\n  ') + '\n  </script>\n  <style>\n    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.7; max-width: 760px; margin: 0 auto; padding: 16px; color: #1f2937; }\n    .crumb { font-size: 0.85rem; color: #6b7280; margin-bottom: 8px; }\n    .crumb a { color: #4f46e5; text-decoration: none; }\n    h1 { font-size: 1.65rem; line-height: 1.3; margin: 8px 0 4px; }\n    h2 { font-size: 1.25rem; margin-top: 2rem; border-top: 1px solid #e5e7eb; padding-top: 1.2rem; }\n    .cat-card { display: block; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 18px; margin: 12px 0; text-decoration: none; color: inherit; }\n    .cat-card h2 { border: 0; margin: 0 0 6px; padding: 0; font-size: 1.1rem; color: #4f46e5; }\n    .cat-card p { margin: 0; color: #4b5563; font-size: 0.95rem; }\n    .cta { display: inline-block; background: #4f46e5; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 8px 0; }\n    .updated { color: #6b7280; font-size: 0.85rem; }\n  </style>\n</head>\n<body>\n  <p class="crumb"><a href="/">Home</a> \u203a <a href="/guides">Guides</a> \u203a ' + esc(c.name) + '</p>\n  <h1>' + esc(c.name) + ' Guides</h1>\n  <p class="updated">Part of the CalcProMaster guides library \u00b7 ' + esc(c.tagline) + '</p>\n\n  <p>' + esc(c.intro) + '</p>\n\n  <h2>How the math works</h2>\n' + c.deepDive.map(p => '  <p>' + esc(p) + '</p>').join('\n') + '\n\n' + guideCards + '\n' + faqHtml + '\n\n  <h2>Try the matching calculators</h2>\n  <p>\n    ' + ctas + '\n  </p>\n\n  <p><a href="/guides">\u2190 All guides</a> \u00b7 <a href="/guides/glossary">Glossary</a></p>\n  <script src="/guides/glossary-tooltips.js" defer></script>\n</body>\n</html>\n';

  fs.writeFileSync('guides/' + c.slug + '.html', html);
  ok++;
  console.log('built guides/' + c.slug + '.html');
}
console.log('done: ' + ok + ' category guide pages');
