#!/usr/bin/env node
/* Builds 21 topic guide pages (guides/<slug>.html) for the remaining Tier-3 and
 * Tier-4 roadmap items. Every guide's content is hand-written below — not
 * boilerplate; only the HTML shell + JSON-LD are templated, and FAQPage schema
 * is generated FROM the visible FAQ text so markup always matches content.
 * All CTA slugs verified against deploy/ directory layout before inclusion.
 * Run from project root: node scripts/build-topic-guides.cjs
 */
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', 'guides');
const DOMAIN = 'https://calcpromaster.netlify.app';

/* ---------- shared shell ---------- */
function head(g) {
  const faqLd = g.faqs.length ? `,
    "mainEntity": {
      "@type": "FAQPage",
      "mainEntity": [
${g.faqs.map(f => `        { "@type": "Question", "name": ${JSON.stringify(f.q)}, "acceptedAnswer": { "@type": "Answer", "text": ${JSON.stringify(f.a.replace(/<[^>]*>/g, ''))} } }`).join(',\n')}
      ]
    }` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${g.title}</title>
  <meta name="description" content="${g.desc}">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="#4f46e5">
  <link rel="canonical" href="${DOMAIN}/guides/${g.slug}">
  <link rel="icon" type="image/svg+xml" href="/icon.svg">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": ${JSON.stringify(g.title.replace(/&amp;/g, '&'))},
    "description": ${JSON.stringify(g.desc)},
    "url": "${DOMAIN}/guides/${g.slug}",
    "inLanguage": "en",
    "isPartOf": { "@type": "WebSite", "name": "CalcProMaster", "url": "${DOMAIN}/" },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "${DOMAIN}/" },
        { "@type": "ListItem", "position": 2, "name": "Guides", "item": "${DOMAIN}/guides" },
        { "@type": "ListItem", "position": 3, "name": ${JSON.stringify(g.crumb)}, "item": "${DOMAIN}/guides/${g.slug}" }
      ]
    }${faqLd}
  }
  </script>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.7; max-width: 760px; margin: 0 auto; padding: 16px; color: #1f2937; }
    .crumb { font-size: 0.85rem; color: #6b7280; margin-bottom: 8px; }
    .crumb a { color: #4f46e5; text-decoration: none; }
    h1 { font-size: 1.65rem; line-height: 1.3; margin: 8px 0 4px; }
    h2 { font-size: 1.25rem; margin-top: 2rem; border-top: 1px solid #e5e7eb; padding-top: 1.2rem; }
    h3 { font-size: 1.05rem; margin-top: 1.4rem; }
    .answer { background: #eef2ff; border-left: 4px solid #4f46e5; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; }
    .formula { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; font-family: ui-monospace, monospace; font-size: 0.95rem; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 0.92rem; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; }
    th { background: #f9fafb; }
    .cta { display: inline-block; background: #4f46e5; color: #fff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 8px 0; }
    .related a { color: #4f46e5; }
    .updated { color: #6b7280; font-size: 0.85rem; }
    .note { background: #fefce8; border-left: 4px solid #ca8a04; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; }
  </style>
</head>
<body>
  <p class="crumb"><a href="/">Home</a> › <a href="/guides">Guides</a> › ${g.crumb}</p>
  <h1>${g.h1}</h1>
  <p class="updated">${g.cat} · ${g.read} min read · Last updated September 2026</p>

  <div class="answer">
    <strong>Quick answer:</strong> ${g.answer}
  </div>
`;
}

function foot(g) {
  const ctas = g.ctas.map(c => `    <a href="${c.href}" class="cta">${c.label}</a>`).join('\n');
  const faqs = g.faqs.map(f => `  <h3>${f.q}</h3>\n  <p>${f.a}</p>`).join('\n');
  return `
  <h2>Try the calculators</h2>
  <p class="related">
${ctas}
  </p>

  <h2>Frequently asked questions</h2>
${faqs}

  <p class="related"><a href="/guides">← All guides</a> · <a href="/guides/glossary">Glossary</a> · <a href="/blog">Blog</a></p>
  <script src="/guides/glossary-tooltips.js" defer></script>
</body>
</html>
`;
}

/* ---------- guides ---------- */
const GUIDES = [

/* ===== TIER 3 ===== */
{
  slug: 'ideal-weight', crumb: 'Ideal Weight',
  title: 'Ideal Weight Calculator — Devine Formula, BMI Range &amp; Why They Disagree | CalcProMaster',
  desc: 'How ideal weight is actually estimated: the Devine formula, the healthy-BMI weight range, why the two numbers differ, and how to read your own result honestly.',
  h1: "Ideal Weight: What the Formulas Do — and Don't — Tell You",
  cat: 'Health', read: 6,
  answer: `"Ideal weight" is not one number. The classic Devine formula gives a single kilogram figure from height alone, while the healthy-BMI method gives a <strong>range</strong>. For someone 1.75 m tall, Devine (male) says about 70.7 kg while the BMI range is 56.7–76.3 kg — both can be true, because they answer different questions.`,
  sections: `
  <h2>The Devine formula (the classic single number)</h2>
  <div class="formula">Men: 50 kg + 2.3 kg per inch over 5 ft<br>Women: 45.5 kg + 2.3 kg per inch over 5 ft</div>
  <p>Built in 1974 to dose medication, not to set fitness goals. Example: a 5′10″ (70-inch) man: 50 + 2.3 × 10 = <strong>73.0 kg</strong>; a 5′10″ woman: 45.5 + 23 = <strong>68.5 kg</strong>. It ignores muscle, age and frame entirely — that is a feature for drug dosing and a limitation for everything else.</p>

  <h2>The healthy-BMI range (a range, honestly)</h2>
  <div class="formula">Healthy weight range = 18.5 × height² to 24.9 × height² (kg)</div>
  <p>At 1.75 m: 18.5 × 3.0625 = <strong>56.7 kg</strong> up to 24.9 × 3.0625 = <strong>76.3 kg</strong> — a 20-kilogram-wide band. The BMI range is broader than Devine precisely because bodies vary more than a dosing formula can express.</p>

  <h2>Why the two disagree — and which to use</h2>
  <table>
    <tr><th>Method</th><th>5′10″ male</th><th>Answers the question</th></tr>
    <tr><td>Devine</td><td>73.0 kg</td><td>"What does a population-average body of this height weigh?"</td></tr>
    <tr><td>Healthy BMI</td><td>56.7–76.3 kg</td><td>"What range is statistically associated with lower health risk?"</td></tr>
  </table>
  <p>Use the range for context, not a target to hit exactly. A muscular 78 kg person at 1.75 m sits above the BMI band but is not unhealthy; a sedentary 70 kg person inside it may carry more risk than the number suggests. Pair the result with the <a href="/health/bmi">BMI Calculator</a> and — more informatively — a waist measurement or body-fat estimate.</p>

  <div class="note"><strong>Limitations:</strong> no height-only formula can see muscle mass, bone frame, age or fat distribution. Treat any "ideal weight" output as a conversation starter with real data, not a verdict.</div>
`,
  ctas: [
    { href: '/health/ideal-weight', label: 'Ideal Weight Calculator' },
    { href: '/health/bmi', label: 'BMI Calculator' },
    { href: '/health/body-fat', label: 'Body Fat Calculator' }
  ],
  faqs: [
    { q: 'What is the ideal weight for my height?', a: 'There is no single number. The healthy-BMI range for your height (18.5–24.9 × height in meters squared) is the most defensible reference band — for 1.75 m that is about 56.7–76.3 kg — and formulas like Devine give a narrower population average inside or near it.' },
    { q: 'How do I calculate ideal weight by hand?', a: 'Devine: men, 50 kg + 2.3 kg per inch over 5 feet; women, 45.5 kg + 2.3 kg per inch over 5 feet. For the BMI range, multiply your height in meters by itself, then by 18.5 and by 24.9.' },
    { q: 'Is ideal weight the same as healthy weight?', a: 'Not exactly. Ideal-weight formulas give one point estimate from height alone; healthy weight is better expressed as the BMI-associated range, which is wider because muscle, frame and body composition vary.' },
    { q: 'Why does the calculator show a range instead of one number?', a: 'Because a range is the honest output. Bodies at the same height legitimately differ by 15–20 kg while remaining healthy; a single kilogram figure implies precision the underlying data does not support.' }
  ]
},

{
  slug: 'bmr', crumb: 'BMR (Basal Metabolic Rate)',
  title: 'BMR Calculator — Mifflin-St Jeor Formula, Worked Example &amp; Multipliers | CalcProMaster',
  desc: 'How BMR is calculated: the Mifflin-St Jeor formula line by line, a worked example, why formulas disagree, and how activity multipliers turn BMR into daily calorie needs.',
  h1: 'BMR: The Formula Behind Your Resting Calorie Burn',
  cat: 'Health', read: 6,
  answer: `BMR is the energy your body burns at complete rest. The standard estimate is Mifflin-St Jeor: for an 80 kg, 180 cm, 30-year-old man it gives <strong>1,780 kcal/day</strong> — before any activity. Multiply by an activity factor (1.2–1.9) to get total daily needs.`,
  sections: `
  <h2>The Mifflin-St Jeor formula</h2>
  <div class="formula">Men: 10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5<br>Women: 10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161</div>
  <p>Worked example — 80 kg, 180 cm, 30-year-old male: 10 × 80 = 800; 6.25 × 180 = 1,125; 5 × 30 = 150. So 800 + 1,125 − 150 + 5 = <strong>1,780 kcal/day</strong>.</p>

  <h2>From BMR to daily needs (TDEE)</h2>
  <table>
    <tr><th>Activity level</th><th>Multiplier</th><th>Same man's TDEE</th></tr>
    <tr><td>Sedentary (desk job)</td><td>× 1.2</td><td>2,136 kcal</td></tr>
    <tr><td>Lightly active</td><td>× 1.375</td><td>2,448 kcal</td></tr>
    <tr><td>Moderately active</td><td>× 1.55</td><td>2,759 kcal</td></tr>
    <tr><td>Very active</td><td>× 1.725</td><td>3,071 kcal</td></tr>
  </table>
  <p>The multiplier you pick moves the answer more than any formula choice — a sedentary vs very-active pick spans 900+ kcal. Calibrate honestly: most desk workers are 1.2–1.375 even with gym visits.</p>

  <h2>Why BMR formulas disagree</h2>
  <p>The older Harris-Benedict equation gives <strong>1,854 kcal</strong> for the same man — 74 kcal higher than Mifflin. Neither is "wrong": both are population regressions with real scatter (roughly ±200 kcal for any individual). Mifflin is preferred today because it tracks measured values somewhat better in modern populations.</p>

  <div class="note"><strong>Limitations:</strong> formulas estimate population averages; measured calorimetry can differ substantially, and illness, medication and muscle mass all shift real BMR. Use the estimate as a starting point and adjust against 2–3 weeks of real-world weight data.</div>
`,
  ctas: [
    { href: '/health/bmr', label: 'BMR Calculator' },
    { href: '/health/bmr-mifflin', label: 'Mifflin-St Jeor BMR' },
    { href: '/health/tdee-macro', label: 'TDEE & Macro Calculator' }
  ],
  faqs: [
    { q: 'How is BMR calculated?', a: 'The standard Mifflin-St Jeor formula: 10 × weight in kg + 6.25 × height in cm − 5 × age, plus 5 for men or minus 161 for women. For an 80 kg, 180 cm, 30-year-old man that is 1,780 kcal/day.' },
    { q: 'What is a good BMR for my age?', a: 'BMR declines roughly 5 kcal per year of age in the formula (the −5 × age term). Typical adult values fall between about 1,200 and 1,900 kcal/day depending on size, sex and age — there is no single "good" number.' },
    { q: 'Should I eat my BMR to lose weight?', a: 'No. BMR is your burn at complete rest; total daily needs (BMR × activity factor) are the relevant baseline. Eating at or below BMR while active creates an unnecessarily aggressive deficit for most people.' },
    { q: 'Why do BMR and TDEE calculators give different numbers?', a: 'Different equations (Mifflin vs Harris-Benedict) and different activity multipliers. The multiplier choice usually moves the total more than the equation does — pick your activity level honestly.' }
  ]
},

{
  slug: 'profit-margin', crumb: 'Profit Margin',
  title: 'Profit Margin Calculator — Margin vs Markup, Formulas &amp; Worked Example | CalcProMaster',
  desc: 'Gross vs net margin formulas with a worked example, the margin-vs-markup mix-up that costs businesses money, and how to price from a target margin correctly.',
  h1: 'Profit Margin: The Formulas and the Markup Trap',
  cat: 'Business', read: 6,
  answer: `Profit margin is profit as a share of <strong>revenue</strong>. On $50,000 revenue with $30,000 cost of goods, gross margin is <strong>40%</strong>. Margin and markup are not the same: a 40% margin equals a 66.7% markup — mixing them up underprices everything you sell.`,
  sections: `
  <h2>The margin formulas</h2>
  <div class="formula">Gross margin % = (Revenue − COGS) ÷ Revenue × 100<br>Net margin % = (Revenue − COGS − Operating costs) ÷ Revenue × 100</div>
  <p>Worked example: revenue $50,000, goods cost $30,000, operating costs $12,000. Gross margin = 20,000 ÷ 50,000 = <strong>40%</strong>. Net margin = 8,000 ÷ 50,000 = <strong>16%</strong>. Both describe the same business — they answer different questions.</p>

  <h2>Margin vs markup (the expensive mix-up)</h2>
  <div class="formula">Margin = profit ÷ price · Markup = profit ÷ cost</div>
  <p>To earn a 40% margin on a $30,000 cost, price = cost ÷ (1 − 0.40) = <strong>$50,000</strong>. Someone who instead applies "40% markup" prices at 30,000 × 1.40 = $42,000 and unknowingly earns only a 28.6% margin. On thin-margin retail this single confusion is the difference between a profitable and a losing price list.</p>
  <table>
    <tr><th>Target margin</th><th>Equal markup</th></tr>
    <tr><td>20%</td><td>25.0%</td></tr>
    <tr><td>30%</td><td>42.9%</td></tr>
    <tr><td>40%</td><td>66.7%</td></tr>
    <tr><td>50%</td><td>100%</td></tr>
  </table>

  <h2>Reading margins honestly</h2>
  <p>Gross margin shows whether the product itself is priced sanely; net margin shows whether the business survives payroll, rent and software. A 40% gross / 16% net business is normal. Compare against your own industry's typical band rather than a universal number — software, groceries and construction live at completely different margin levels.</p>
`,
  ctas: [
    { href: '/business/profit-margin', label: 'Profit Margin Calculator' },
    { href: '/finance/roi', label: 'ROI Calculator' },
    { href: '/guides/break-even', label: 'Break-Even Guide' }
  ],
  faqs: [
    { q: 'How do I calculate profit margin?', a: 'Divide profit by revenue and multiply by 100. Gross margin uses revenue minus cost of goods; net margin subtracts operating costs too. Example: $50,000 revenue, $30,000 COGS → 40% gross margin.' },
    { q: 'What is the difference between margin and markup?', a: 'Margin is profit divided by price; markup is profit divided by cost. A 40% margin equals a 66.7% markup. Setting prices by markup when you meant margin systematically underprices your products.' },
    { q: 'How do I price for a target margin?', a: 'Price = cost ÷ (1 − target margin). For a 40% margin on $30,000 of cost: 30,000 ÷ 0.6 = $50,000. Check the result with the margin formula — it should return exactly your target.' },
    { q: 'What is a good profit margin?', a: 'It depends entirely on industry. Compare against sector norms: margins that are healthy in software would be impossible in grocery retail and vice versa. Trend over time matters more than any absolute number.' }
  ]
},

{
  slug: 'ohms-law', crumb: "Ohm's Law",
  title: "Ohm's Law Calculator — V = IR Formula, Worked Examples &amp; Power | CalcProMaster",
  desc: "Ohm's law explained with worked examples: V = IR, the triangle trick, series and parallel circuits, and how electrical power ties in (P = VI).",
  h1: "Ohm's Law: V = IR, With Numbers That Actually Compute",
  cat: 'Science', read: 5,
  answer: `Ohm's law links voltage, current and resistance: <strong>V = I × R</strong>. A 12 V source across a 4 Ω resistor drives 3 A of current and dissipates 36 W of power — three formulas cover nearly every basic circuit question.`,
  sections: `
  <h2>The three forms</h2>
  <div class="formula">V = I × R &nbsp;·&nbsp; I = V ÷ R &nbsp;·&nbsp; R = V ÷ I</div>
  <p>Worked example: 12 V battery, 4 Ω resistor. Current I = 12 ÷ 4 = <strong>3 A</strong>. Power P = V × I = 12 × 3 = <strong>36 W</strong> — the resistor turns 36 joules per second into heat, which is why resistor power ratings matter.</p>

  <h2>Series and parallel (where intuition breaks)</h2>
  <p><strong>Series:</strong> resistances add. Two 5 Ω resistors in series = 10 Ω, so the same 12 V drives only 12 ÷ 10 = <strong>1.2 A</strong>.</p>
  <p><strong>Parallel:</strong> 1/R = 1/R₁ + 1/R₂. Two 5 Ω in parallel = 2.5 Ω, so 12 ÷ 2.5 = <strong>4.8 A</strong> — parallel paths increase total current because each path sees the full voltage.</p>
  <table>
    <tr><th>Configuration</th><th>Total R</th><th>Current at 12 V</th><th>Power</th></tr>
    <tr><td>Single 4 Ω</td><td>4 Ω</td><td>3.0 A</td><td>36 W</td></tr>
    <tr><td>Two 5 Ω in series</td><td>10 Ω</td><td>1.2 A</td><td>14.4 W</td></tr>
    <tr><td>Two 5 Ω in parallel</td><td>2.5 Ω</td><td>4.8 A</td><td>57.6 W</td></tr>
  </table>

  <h2>Practical uses</h2>
  <p>Choosing an LED series resistor (supply voltage minus LED drop, divided by desired current), checking whether a wire gauge can carry a motor's inrush current, or verifying a power-supply spec. The <a href="/science/ohms-law">Ohm's Law Calculator</a> solves any missing variable; the <a href="/tech/resistor-color-code">Resistor Color Code</a> tool decodes the bands on the part itself.</p>

  <div class="note"><strong>Limitations:</strong> Ohm's law strictly applies to ohmic (linear) devices at constant temperature. Diodes, filaments and semiconductors do not obey it linearly — real filament resistance rises sharply as the bulb warms up.</div>
`,
  ctas: [
    { href: '/science/ohms-law', label: "Ohm's Law Calculator" },
    { href: '/tech/resistor-color-code', label: 'Resistor Color Code' },
    { href: '/guides/science', label: 'Science Guides' }
  ],
  faqs: [
    { q: "What is Ohm's law in simple words?", a: 'Current through a resistor equals voltage across it divided by its resistance. Double the voltage and current doubles; double the resistance and current halves.' },
    { q: 'How do I calculate current from voltage and resistance?', a: 'Divide voltage by resistance: I = V ÷ R. A 12 V supply across 4 Ω gives 3 amperes.' },
    { q: 'How do I calculate power with Ohm\u2019s law?', a: 'P = V × I, which also equals I²R or V²/R. On the 12 V, 3 A example: 36 watts of heat.' },
    { q: 'Why does parallel resistance come out lower than either resistor?', a: 'Each parallel path carries current independently at the full voltage, so total current adds while voltage stays the same — which means the effective resistance must be lower. Two equal resistors in parallel give exactly half the resistance.' }
  ]
},

{
  slug: 'gear-ratio', crumb: 'Gear Ratio',
  title: 'Gear Ratio Calculator — Formula, RPM &amp; Torque Trade-off | CalcProMaster',
  desc: 'How gear ratios work: the driving/driven formula, an RPM worked example, the torque trade-off, and how to chain multiple gear stages.',
  h1: 'Gear Ratio: Speed for Torque, With the Math',
  cat: 'Engineering', read: 5,
  answer: `A gear ratio is driven teeth ÷ driver teeth. A 20-tooth driver spinning at 1,500 rpm feeding a 40-tooth gear gives ratio 2:1 — output drops to <strong>750 rpm</strong> while torque doubles (minus friction losses). Gears trade speed for torque, never create both.`,
  sections: `
  <h2>The core formulas</h2>
  <div class="formula">Ratio = driven teeth ÷ driver teeth<br>Output RPM = input RPM ÷ ratio<br>Ideal torque multiplication = ratio</div>
  <p>Worked example: 20 T pinion at 1,500 rpm → 40 T gear. Ratio = 40 ÷ 20 = 2:1. Output = 1,500 ÷ 2 = <strong>750 rpm</strong>. The output shaft turns half as fast with (ideally) twice the torque — power stays constant, which is the whole point.</p>

  <h2>Chaining stages</h2>
  <p>Multi-stage ratios multiply: a 20:40 stage then a 20:30 stage then a 20:25 stage gives 0.5 × 0.667 × 0.8 = <strong>0.267</strong> — a 3.75:1 overall reduction. Input 1,500 rpm → 400 rpm out. Each mesh adds friction losses (typically a few percent), so real output torque is slightly under the ideal figure.</p>

  <h2>Reading a ratio in the real world</h2>
  <p><strong>Ratios below 1</strong> (overdrive, e.g. 0.8:1) raise output speed and cut torque — that is your car's highway gear. <strong>Ratios above 1</strong> (reduction) are climbing gears and gearboxes. Bicycle gearing, conveyor speeds and drill chucks all follow the same two-formula logic; the <a href="/engineering/gear-ratio">Gear Ratio Calculator</a> handles the arithmetic for any teeth counts.</p>
`,
  ctas: [
    { href: '/engineering/gear-ratio', label: 'Gear Ratio Calculator' },
    { href: '/guides/engineering', label: 'Engineering Guides' }
  ],
  faqs: [
    { q: 'How do I calculate gear ratio?', a: 'Divide the driven gear\u2019s tooth count by the driver\u2019s. A 20-tooth driver turning a 40-tooth gear is a 2:1 reduction — output speed halves.' },
    { q: 'Does a higher gear ratio mean more speed or more torque?', a: 'More torque, less speed, when the ratio is above 1 (reduction). Below 1 it is an overdrive: more speed, less torque. Power stays roughly constant either way.' },
    { q: 'How do multiple gear stages combine?', a: 'Multiply the stage ratios. Stages of 0.5, 0.667 and 0.8 combine to 0.267 — an overall 3.75:1 reduction.' },
    { q: 'Why is real output torque lower than the ideal number?', a: 'Friction. Every gear mesh loses a few percent to sliding contact and lubrication drag, so a 2:1 stage multiplies torque by slightly less than 2.' }
  ]
},

{
  slug: 'fuel-cost', crumb: 'Fuel Cost',
  title: 'Fuel Cost Calculator — Trip Cost Formula &amp; Efficiency Savings | CalcProMaster',
  desc: 'The fuel cost formula (distance ÷ efficiency × price), a worked 15,000 km example, and what a small efficiency difference saves over a year.',
  h1: 'Fuel Cost: The Three-Variable Formula',
  cat: 'Auto', read: 5,
  answer: `Trip fuel cost = distance ÷ efficiency × fuel price. Driving 15,000 km a year at 15 km/L with fuel at 100/L costs <strong>100,000 in fuel</strong>; improving to 18 km/L cuts that to 83,333 — a 16,667 annual saving from one maintenance-and-driving-habits change.`,
  sections: `
  <h2>The formula</h2>
  <div class="formula">Fuel needed = distance ÷ efficiency<br>Cost = fuel needed × price per unit</div>
  <p>Worked example: 15,000 km at 15 km/L needs 1,000 L; at 100 per litre that is <strong>100,000</strong> for the year. In US units: 12,000 miles at 25 mpg needs 480 gallons; at $3.50/gal that is <strong>$1,680</strong>.</p>

  <h2>What efficiency changes are worth</h2>
  <table>
    <tr><th>Efficiency</th><th>Fuel for 15,000 km</th><th>Cost @ 100/L</th></tr>
    <tr><td>12 km/L</td><td>1,250 L</td><td>125,000</td></tr>
    <tr><td>15 km/L</td><td>1,000 L</td><td>100,000</td></tr>
    <tr><td>18 km/L</td><td>833 L</td><td>83,333</td></tr>
  </table>
  <p>The jump from 12 to 15 saves 25,000 a year; 15 to 18 saves 16,667. Efficiency improvements have diminishing returns — which is why the biggest lever is usually total distance driven, not the last km/L.</p>

  <h2>Where real-world numbers drift</h2>
  <p>Manufacturer figures are lab-cycle numbers; city driving, short trips, roof racks and cold starts commonly cost 10–25% vs the brochure. Measure your own consumption over two or three full tanks (fill to the same point, note litres and km), then use <em>your</em> figure in the <a href="/auto/fuel-cost">Fuel Cost Calculator</a> — and the <a href="/auto/fuel-efficiency">efficiency converter</a> if you need to move between km/L, mpg and L/100km.</p>
`,
  ctas: [
    { href: '/auto/fuel-cost', label: 'Fuel Cost Calculator' },
    { href: '/auto/fuel-efficiency', label: 'Efficiency Converter' },
    { href: '/guides/auto', label: 'Auto Guides' }
  ],
  faqs: [
    { q: 'How do I calculate the fuel cost of a trip?', a: 'Distance ÷ efficiency × fuel price. A 500 km trip at 15 km/L with fuel at 100/L: 500 ÷ 15 = 33.3 L × 100 = 3,333.' },
    { q: 'How much does driving 15,000 km a year cost in fuel?', a: 'At 15 km/L and 100 per litre: 15,000 ÷ 15 × 100 = 100,000 per year. Substitute your own efficiency and fuel price for your real number.' },
    { q: 'Is L/100km better than km/L?', a: 'L/100km is linear: halving consumption halves the figure, which makes savings easier to reason about. km/L grows without bound. Either works if you run the formula consistently.' },
    { q: 'Why does my real fuel cost exceed the calculation?', a: 'Measured consumption is usually worse than brochure figures: idling, short trips, traffic and load all reduce efficiency. Meter your own tanks and use that number.' }
  ]
},

{
  slug: 'hourly-rate', crumb: 'Freelance Hourly Rate',
  title: 'Freelance Hourly Rate Calculator — The Billable-Hours Formula | CalcProMaster',
  desc: 'How to set a freelance rate that survives reality: target income ÷ billable hours, the 60% utilization rule, and a worked rate calculation.',
  h1: 'Freelance Rates: Income ÷ Billable Hours (Not ÷ 2,080)',
  cat: 'Career', read: 6,
  answer: `The beginner mistake is dividing a salary by 2,080 hours. Freelancers only bill a fraction of their time: at 60% utilization that is about <strong>1,152 billable hours</strong> a year. A 1,500,000 income target ÷ 1,152 = roughly <strong>1,302/hour</strong> — double the naive salaried-equivalent of 577.`,
  sections: `
  <h2>The formula</h2>
  <div class="formula">Rate = (Target income + business costs) ÷ (working hours × utilization)</div>
  <p>Worked example: you want 1,500,000 a year after a 1,200,000 salary-equivalent plus 300,000 for insurance, software, taxes and dead time. Working 1,920 hours a year (48 weeks × 40) at 60% billable = 1,152 hours. Rate = 1,500,000 ÷ 1,152 ≈ <strong>1,302</strong>.</p>

  <h2>Why 60% utilization</h2>
  <p>Sales calls, proposals, invoicing, learning and admin are real work that generates no invoice. Early-career freelancers often overestimate billable share (70–80%) and underprice as a result; 55–65% is the honest planning band once a client pipeline exists. Newer freelancers with empty pipelines should bill <em>higher</em> rates, not lower — every hour is scarce.</p>

  <h2>The salaried comparison, done right</h2>
  <table>
    <tr><th>Basis</th><th>Math</th><th>Equivalent</th></tr>
    <tr><td>Naive (salary ÷ 2,080)</td><td>1,200,000 ÷ 2,080</td><td>577/hr</td></tr>
    <tr><td>Reality (target ÷ billable)</td><td>1,500,000 ÷ 1,152</td><td>1,302/hr</td></tr>
  </table>
  <p>Freelance rates at "salary equivalence" quietly donate your benefits, taxes and unbilled hours to clients. The <a href="/career/freelance-hourly-rate">Freelance Hourly Rate Calculator</a> runs the full computation with your own inputs; the <a href="/career/contractor-rate">Contractor vs Employee</a> tool compares total packages side by side.</p>
`,
  ctas: [
    { href: '/career/freelance-hourly-rate', label: 'Freelance Hourly Rate' },
    { href: '/career/contractor-rate', label: 'Contractor vs Employee' },
    { href: '/lifestyle/hourly-annual-salary', label: 'Hourly ↔ Annual' }
  ],
  faqs: [
    { q: 'How do I calculate my freelance hourly rate?', a: 'Add your target income to business costs, then divide by billable hours: working hours × utilization. Example: 1,500,000 ÷ 1,152 (60% of 1,920 hours) ≈ 1,302 per hour.' },
    { q: 'What percentage of a freelancer\u2019s hours are billable?', a: 'Plan on 55–65% once you have steady clients; proposals, admin and sales consume the rest. Newer freelancers effectively have fewer billable hours, which argues for higher rates, not lower.' },
    { q: 'Why is my freelance rate so much higher than my old salary rate?', a: 'A salary hides taxes, benefits, paid leave and all the hours that never get billed. Dividing salary by 2,080 ignores all of it — your rate must cover those costs plus profit.' },
    { q: 'Should I charge hourly or per project?', a: 'Hourly is the honest starting point; per-project pricing shifts efficiency gains to you but requires experience estimating scope. Compute your hourly minimum first either way — never quote below it.' }
  ]
},

{
  slug: 'paint-coverage', crumb: 'Paint Coverage',
  title: 'Paint Coverage Calculator — Wall Area, Coats &amp; Litres Needed | CalcProMaster',
  desc: 'How much paint you actually need: wall area minus openings, the two-coat rule, spread-rate math, and a worked room example.',
  h1: 'Paint Coverage: Area × Coats ÷ Spread Rate',
  cat: 'Home & Garden', read: 5,
  answer: `Paint needed = wall area × coats ÷ spread rate. A 12×15 ft room with 9 ft ceilings, one door and two windows has about <strong>441 sq ft of wall</strong>; two coats at 350 sq ft/gal needs <strong>2.52 gallons</strong> — buy the 3-gallon round number.`,
  sections: `
  <h2>The formula</h2>
  <div class="formula">Wall area = perimeter × height − (doors + windows)<br>Paint = wall area × coats ÷ spread rate</div>
  <p>Worked example: 12×15 ft room, 9 ft ceilings. Perimeter = 2 × (12 + 15) = 54 ft; gross wall = 54 × 9 = 486 sq ft. Subtract one door (21) and two windows (24) → <strong>441 sq ft</strong>. Two coats at a typical 350 sq ft per gallon: 441 × 2 ÷ 350 = <strong>2.52 gallons</strong>.</p>

  <h2>Adjusting for reality</h2>
  <table>
    <tr><th>Condition</th><th>Adjustment</th></tr>
    <tr><td>Rough or unpainted plaster</td><td>+10–20% paint (higher absorption)</td></tr>
    <tr><td>Dramatic color change</td><td>Extra coat or tinted primer</td></tr>
    <tr><td>Dark → light</td><td>Tinted primer instead of 3rd coat</td></tr>
    <tr><td>Airless sprayer</td><td>+25% (overspray loss)</td></tr>
  </table>
  <p>Ceilings add area separately (floor area × coats) and trim needs its own calculation by linear feet. The <a href="/everyday/paint">Paint Cost Estimator</a> computes area, coats and price together; the <a href="/homegarden/room-area">Room Area tool</a> handles irregular floor plans first.</p>

  <div class="note"><strong>Tip:</strong> buy the full round-up in one batch — paint from different production lots can vary slightly in tint, and matching a later lot is harder than storing a spare litre.</div>
`,
  ctas: [
    { href: '/everyday/paint', label: 'Paint Cost Estimator' },
    { href: '/homegarden/room-area', label: 'Room Area Calculator' },
    { href: '/guides/homegarden', label: 'Home & Garden Guides' }
  ],
  faqs: [
    { q: 'How much paint do I need for one room?', a: 'Perimeter × height minus doors and windows, times the number of coats, divided by the spread rate (usually ~350 sq ft per gallon). A 12×15 ft room with 9 ft ceilings and two coats needs about 2.5 gallons.' },
    { q: 'Do I really need two coats?', a: 'One coat of a quality paint over a similar color often looks fine; two coats give even coverage and durability. Over a dramatic color change, use a tinted primer plus two coats.' },
    { q: 'How much area does one gallon cover?', a: 'Typically 350–400 sq ft per coat on smooth interior walls. Rough surfaces, deep colors and sprayers reduce it — plan on the low end when in doubt.' },
    { q: 'Should doors and windows be subtracted?', a: 'Yes. A door is about 21 sq ft and a typical window about 12 — subtracting them keeps the estimate honest without materially changing the buy decision on small rooms.' }
  ]
},

{
  slug: 'macro-calculator', crumb: 'Macro Split',
  title: 'Macro Calculator — Protein, Carb &amp; Fat Grams From Calories | CalcProMaster',
  desc: 'How to convert daily calories into protein, carb and fat grams: the 4-4-9 calorie rule, a worked 2,400 kcal example, and how to sanity-check any macro split.',
  h1: 'Macros: Calories → Grams With the 4-4-9 Rule',
  cat: 'Food & Nutrition', read: 5,
  answer: `Protein and carbs carry 4 kcal per gram, fat carries 9. A 2,400 kcal day split 30/40/30 is <strong>180 g protein, 240 g carbs, 80 g fat</strong> — the percentages are the input, the grams are what you actually eat.`,
  sections: `
  <h2>The rule</h2>
  <div class="formula">Protein g = (calories × P%) ÷ 4<br>Carb g = (calories × C%) ÷ 4<br>Fat g = (calories × F%) ÷ 9</div>
  <p>Worked example — 2,400 kcal, 30% protein / 40% carbs / 30% fat: protein 2,400 × 0.30 ÷ 4 = <strong>180 g</strong>; carbs 2,400 × 0.40 ÷ 4 = <strong>240 g</strong>; fat 2,400 × 0.30 ÷ 9 = <strong>80 g</strong>. Check: 180×4 + 240×4 + 80×9 = 720 + 960 + 720 = 2,400 ✓.</p>

  <h2>Common splits and what they emphasize</h2>
  <table>
    <tr><th>Split (P/C/F)</th><th>2,400 kcal → grams</th><th>Character</th></tr>
    <tr><td>30/40/30</td><td>180 / 240 / 80</td><td>Balanced default</td></tr>
    <tr><td>35/20/45</td><td>210 / 120 / 120</td><td>Lower-carb</td></tr>
    <tr><td>20/5/75</td><td>120 / 30 / 200</td><td>Keto-style</td></tr>
  </table>

  <h2>Sanity checks before trusting a split</h2>
  <p>Protein below ~1.2 g/kg of body weight under-supports muscle retention on a deficit; fat below ~0.5 g/kg can affect hormone function over long stretches; carbs fueling hard training below ~3 g/kg makes heavy sessions feel flat. If a fashionable split violates these bands for your body weight, treat it skeptically. Set your calorie target first (see the <a href="/guides/calories">TDEE guide</a>), then split it — the <a href="/health/tdee-macro">TDEE & Macro Calculator</a> does both steps; <a href="/food/macro-split">Macro Split</a> and <a href="/food/protein-need">Daily Protein Need</a> cover the individual pieces.</p>

  <div class="note"><strong>This is arithmetic, not a diet prescription.</strong> Medical conditions, pregnancy and eating-disorder history all change appropriate targets — use professionals for those conversations.</div>
`,
  ctas: [
    { href: '/health/tdee-macro', label: 'TDEE & Macro Calculator' },
    { href: '/food/macro-split', label: 'Macro Split Calculator' },
    { href: '/food/protein-need', label: 'Daily Protein Need' }
  ],
  faqs: [
    { q: 'How do I calculate macros from calories?', a: 'Assign percentages to protein, carbs and fat, then divide: protein and carb grams = (calories × share) ÷ 4; fat grams = (calories × share) ÷ 9. Example: 2,400 kcal at 30/40/30 → 180 g protein, 240 g carbs, 80 g fat.' },
    { q: 'What is the 4-4-9 rule?', a: 'The energy densities: 4 kcal per gram of protein, 4 per gram of carbohydrate, 9 per gram of fat. It is how nutrition labels convert grams to calories and how macro percentages become gram targets.' },
    { q: 'What macro split should I use?', a: 'Start from a balanced 30/40/30 and adjust one variable at a time against your training and appetite. Keep protein at 1.2–2.2 g/kg body weight and fat above 0.5 g/kg regardless of style.' },
    { q: 'Do macro grams or percentages matter more?', a: 'Percentages are the input; grams are the actionable output. Nobody weighs "30%" — you weigh 180 g of protein. Always convert the split into gram targets for your calorie level.' }
  ]
},

{
  slug: 'sip', crumb: 'SIP Returns',
  title: 'SIP Calculator — The Future-Value Formula &amp; Compounding | CalcProMaster',
  desc: 'How SIP returns are computed: the future-value-of-annuity formula, worked ₹5,000/month examples at 5 and 10 years, and why the last years do most of the work.',
  h1: 'SIP Math: Where ₹5,000 a Month Actually Goes',
  cat: 'Regional Finance', read: 6,
  answer: `A SIP is a monthly annuity: FV = P × [(1+i)ⁿ − 1] ÷ i × (1+i). At 12% annual (1% monthly), ₹5,000/month grows to <strong>₹4,12,432 in 5 years</strong> (₹3,00,000 invested) and <strong>₹11,61,695 in 10 years</strong> (₹6,00,000 invested) — the second decade earns more than the first.`,
  sections: `
  <h2>The formula</h2>
  <div class="formula">FV = P × [(1+i)ⁿ − 1] ÷ i × (1+i)</div>
  <p>Where P is the monthly amount, i the monthly rate (annual ÷ 12) and n the number of months. Worked example: P = 5,000, i = 0.01 (12%/12), n = 60. (1.01⁶⁰ − 1) ÷ 0.01 = 81.670; × 1.01 = 82.486; × 5,000 = <strong>₹4,12,432</strong>. Invested principal: 5,000 × 60 = ₹3,00,000 — so ₹1,12,432 is growth.</p>

  <h2>Why duration dominates</h2>
  <table>
    <tr><th>Duration</th><th>Invested</th><th>Value @12%</th><th>Growth</th></tr>
    <tr><td>5 years</td><td>₹3,00,000</td><td>₹4,12,432</td><td>₹1,12,432</td></tr>
    <tr><td>10 years</td><td>₹6,00,000</td><td>₹11,61,695</td><td>₹5,61,695</td></tr>
  </table>
  <p>Doubling the time invested 2× the money but produced <strong>5×</strong> the growth. Compounding is back-loaded: the final years contribute most of the gain, which is why interrupting a SIP at year 7 costs far more than the 7 years of deposits suggest.</p>

  <h2>Assumptions to keep honest</h2>
  <p>The 12% figure is an assumed constant annual return — real equity funds deliver it as a volatile path (−35% years happen), and the formula's smooth curve is a simplification, not a promise. Inflation also shrinks real value: ₹11.6 lakh in 10 years buys roughly what ₹6–7 lakh buys today at 5–6% inflation. Run your own numbers in the <a href="/finance/sip">SIP Calculator</a>; the <a href="/finance/sip-step-up">Step-up SIP</a> version models the annual increase most salaried investors actually do.</p>
`,
  ctas: [
    { href: '/finance/sip', label: 'SIP Calculator' },
    { href: '/finance/sip-step-up', label: 'Step-up SIP' },
    { href: '/finance/currency-converter', label: 'Currency Converter' }
  ],
  faqs: [
    { q: 'How is SIP return calculated?', a: 'As the future value of a monthly annuity: FV = P × [(1+i)ⁿ − 1] ÷ i × (1+i), with i as the monthly rate. ₹5,000/month at 12% for 5 years ≈ ₹4,12,432 against ₹3,00,000 invested.' },
    { q: 'What will ₹5,000 a month for 10 years become?', a: 'At a constant 12% annual return: about ₹11,61,695 against ₹6,00,000 invested. The real figure depends on actual market returns, which arrive as a volatile path rather than a smooth 12%.' },
    { q: 'Is a 12% SIP return guaranteed?', a: 'No. It is a planning assumption based on long-run equity history. Treat outputs as illustrations, and judge a SIP on 7–10+ year horizons where volatility averages out more.' },
    { q: 'What is a step-up SIP?', a: 'One where the monthly amount rises each year, typically with your salary. Because later deposits are larger, step-up SIPs end substantially higher than flat SIPs at the same duration.' }
  ]
},

/* ===== TIER 4 ===== */
{
  slug: 'fd-ppf-sip', crumb: 'FD vs PPF vs SIP',
  title: 'FD vs PPF vs SIP — Same ₹1 Lakh, Three Outcomes (Worked Comparison) | CalcProMaster',
  desc: 'A worked ₹100,000 comparison across fixed deposit, PPF and monthly SIP: exact maturity values, the liquidity trade-offs, and which goal each instrument fits.',
  h1: 'FD vs PPF vs SIP: One Sum, Three Very Different Machines',
  cat: 'Regional Finance', read: 7,
  answer: `₹100,000 for 5 years: an FD at 6.5% quarterly compounding gives <strong>₹1,38,042</strong>; PPF at 7.1% annual gives <strong>₹1,40,912</strong>; a SIP of the same total at 12% assumed equity returns gives about <strong>₹4,12,432 on ₹3,00,000 invested</strong> — but with real volatility and no guarantee. The right choice depends on the goal's date, not on which number is biggest.`,
  sections: `
  <h2>The same ₹1 lakh, computed three ways</h2>
  <table>
    <tr><th>Instrument</th><th>Assumption</th><th>5-year outcome</th><th>Liquidity</th></tr>
    <tr><td>Fixed deposit</td><td>6.5% compounded quarterly</td><td>₹1,38,042</td><td>Breakable (penalty)</td></tr>
    <tr><td>PPF</td><td>7.1% compounded annually</td><td>₹1,40,912</td><td>Locked 15 yrs (partial rules)</td></tr>
    <tr><td>SIP (equity fund)</td><td>12% assumed, volatile</td><td>₹4,12,432 on ₹60k/yr invested</td><td>Open-ended</td></tr>
  </table>
  <p>The FD and PPF figures are contract-like: the rate is the deal. The SIP figure is a <em>model</em> of a volatile path — the same period could land materially lower. That difference in certainty, not the headline rate, is what separates the three.</p>

  <h2>Tax treatment changes the ranking</h2>
  <p>FD interest is taxed as income at your slab, so a 30%-bracket investor keeps ~4.55% net on a 6.5% FD. PPF is exempt-exempt-exempt — its 7.1% is fully kept. Equity SIP gains held over a year attract long-term capital-gains tax only on redemption above the annual exemption. Net-of-tax, PPF often beats the FD despite similar headline rates.</p>

  <h2>Match the instrument to the goal</h2>
  <ul>
    <li><strong>Money needed within 3 years</strong> (emergency fund, car deposit): FD or similar debt — certainty is the product.</li>
    <li><strong>Long-horizon, tax-sensitive, fixed-income share</strong> (retirement bond sleeve): PPF — rate plus EEE status.</li>
    <li><strong>7–10+ year growth goals</strong>: SIP into diversified equity — higher expected return, tolerated volatility, no guarantee.</li>
  </ul>
  <p>Run your own comparisons in the <a href="/regional/fd-calculator">FD Calculator</a>, the <a href="/regional/ppf-calculator">PPF Calculator</a> and the <a href="/finance/sip">SIP Calculator</a> — then decide per goal, not per portfolio.</p>

  <div class="note"><strong>This is education, not investment advice.</strong> Rates change, tax rules change, and equity outcomes vary. Verify current rates with the issuing institutions before acting.</div>
`,
  ctas: [
    { href: '/regional/fd-calculator', label: 'FD Calculator' },
    { href: '/regional/ppf-calculator', label: 'PPF Calculator' },
    { href: '/finance/sip', label: 'SIP Calculator' }
  ],
  faqs: [
    { q: 'Which gives better returns: FD, PPF or SIP?', a: 'At 5 years on ₹100,000: FD at 6.5% ≈ ₹1,38,042, PPF at 7.1% ≈ ₹1,40,912, and a ₹20,000/year SIP at 12% assumed ≈ ₹4,12,432 on ₹300,000 invested. But the SIP number is a volatile-market model, not a promise — expected return and certainty are different things.' },
    { q: 'Is PPF better than FD?', a: 'For long-horizon money, usually yes: slightly higher typical rate, fully exempt returns, but a 15-year lock-in. For money you may need sooner, the FD\u2019s liquidity wins.' },
    { q: 'How is SIP different from FD and PPF?', a: 'FD and PPF are debt contracts with fixed rates; a SIP is a method of investing in market assets whose returns fluctuate. Higher expected return comes with real downside years.' },
    { q: 'How are these three taxed?', a: 'FD interest is taxed at your income slab. PPF is fully exempt. Equity fund gains held over a year are long-term capital gains, taxed on redemption above the annual exemption — timing is under your control.' }
  ]
},

{
  slug: 'ev-vs-petrol', crumb: 'EV vs Petrol Cost',
  title: 'EV vs Petrol Running Cost — The Per-KM Formula &amp; Worked Example | CalcProMaster',
  desc: 'How to compare EV and petrol running costs honestly: the per-km formula, a worked 15,000 km example, and the purchase-price and charging factors people forget.',
  h1: 'EV vs Petrol: The Per-Kilometer Math',
  cat: 'Auto', read: 6,
  answer: `Running cost per km = energy per km × energy price. An EV using 15 kWh/100km at 8/unit costs <strong>1.20/km</strong>; a petrol car at 15 km/L and 100/L costs <strong>6.67/km</strong>. Over 15,000 km a year: 18,000 vs 100,000 — an 82,000 annual running-cost gap before purchase price and depreciation.`,
  sections: `
  <h2>The formula (both sides)</h2>
  <div class="formula">EV: cost/km = kWh per km × electricity price<br>Petrol: cost/km = fuel price ÷ efficiency</div>
  <p>Worked example: EV at 15 kWh/100 km (0.15 kWh/km) × 8/unit = <strong>1.20/km</strong>. Petrol at 15 km/L and 100/L = 100 ÷ 15 = <strong>6.67/km</strong>. At 15,000 km/year: EV 18,000 vs petrol 100,000 → <strong>82,000/year saved</strong> on energy alone.</p>

  <h2>What the simple math leaves out</h2>
  <table>
    <tr><th>Factor</th><th>Effect on the comparison</th></tr>
    <tr><td>Purchase premium</td><td>EVs often cost more upfront — part of the 82,000 saving repays that gap</td></tr>
    <tr><td>Charging access</td><td>Home charging at domestic rates is the cheap case; public fast charging can cost 2–3× more per kWh</td></tr>
    <tr><td>Maintenance</td><td>EVs cut oil changes and brake wear; tyres and insurance are comparable</td></tr>
    <tr><td>Battery & resale</td><td>Degradation uncertainty affects resale value both ways</td></tr>
    <tr><td>Annual distance</td><td>The saving scales linearly — 5,000 km/yr shrinks it to ~27,000</td></tr>
  </table>

  <h2>The honest bottom line</h2>
  <p>High-mileage drivers with home charging see the fastest payback on the purchase premium; low-mileage drivers relying on public fast charging may never close it. Compute your own case with the <a href="/auto/ev-charging-cost">EV Charging Cost</a> and <a href="/auto/fuel-cost">Fuel Cost</a> calculators — and the <a href="/auto/ev-vs-gas-petrol">EV vs Petrol comparison</a> puts both sides in one output.</p>
`,
  ctas: [
    { href: '/auto/ev-vs-gas-petrol', label: 'EV vs Petrol Calculator' },
    { href: '/auto/ev-charging-cost', label: 'EV Charging Cost' },
    { href: '/auto/fuel-cost', label: 'Fuel Cost Calculator' }
  ],
  faqs: [
    { q: 'Is an EV cheaper to run than a petrol car?', a: 'On energy alone, almost always: 1.20/km at domestic charging rates vs 6.67/km for a 15 km/L petrol car at 100/L. Whether the total wins depends on purchase premium, charging access and how many km you drive.' },
    { q: 'How do I calculate EV cost per km?', a: 'Multiply energy use per km by your electricity price. 15 kWh/100 km = 0.15 kWh/km; at 8 per unit that is 1.20 per km.' },
    { q: 'How much can I save per year with an EV?', a: 'At 15,000 km/year in the worked example: 18,000 charging vs 100,000 in petrol — 82,000. Scale linearly with your distance and local prices.' },
    { q: 'Does fast charging change the math?', a: 'Yes — public DC fast charging typically costs 2–3× domestic rates per kWh, pushing EV cost/km toward 2.5–3.5. Frequent fast-charge users should model that rate, not the home rate.' }
  ]
},

{
  slug: 'wedding-budget', crumb: 'Wedding Budget',
  title: 'Wedding Budget Planner — Category Splits &amp; the Guest-Count Lever | CalcProMaster',
  desc: 'How to build a wedding budget that holds: the four budgeting approaches, a worked category split, and why guest count dominates every other decision.',
  h1: 'Wedding Budgets: Split the Total, Then Guard It',
  cat: 'Family', read: 6,
  answer: `A workable wedding budget is a total divided into category shares <em>before</em> booking anything. On a 500,000 budget, a typical split puts <strong>200,000 (40%) into venue-and-catering</strong>, 125,000 (25%) into attire-and-jewellery, and so on — and the single lever that moves every category is the guest count.`,
  sections: `
  <h2>A worked category split</h2>
  <table>
    <tr><th>Category</th><th>Share</th><th>On 500,000</th></tr>
    <tr><td>Venue + catering</td><td>40%</td><td>200,000</td></tr>
    <tr><td>Attire + jewellery</td><td>25%</td><td>125,000</td></tr>
    <tr><td>Photography + media</td><td>10%</td><td>50,000</td></tr>
    <tr><td>Decor + flowers</td><td>8%</td><td>40,000</td></tr>
    <tr><td>Contingency buffer</td><td>7%</td><td>35,000</td></tr>
    <tr><td>Everything else</td><td>10%</td><td>50,000</td></tr>
  </table>
  <p>Shares vary by culture and city — the point is committing to shares <em>first</em>, so each vendor negotiation happens inside a fixed envelope instead of a blank check.</p>

  <h2>The guest-count lever</h2>
  <p>Per-plate catering plus per-guest seating, favors and space requirements mean venue costs scale nearly linearly with the guest list: 40% of budget at 150 guests is a different restaurant than the same 40% at 300. Deciding the list before touring venues is the highest-leverage planning act in the whole process.</p>

  <h2>The buffer is not optional</h2>
  <p>Final wedding bills typically exceed intentions by 5–15% (guest count creep, add-ons discovered mid-planning). The 7% line above absorbs that. Track committed spend against each envelope as you book — the <a href="/family/wedding-budget">Wedding Budget Planner</a> computes the splits and tracks totals; the <a href="/family/family-budget">Family Budget</a> tool handles the months-after reality.</p>
`,
  ctas: [
    { href: '/family/wedding-budget', label: 'Wedding Budget Planner' },
    { href: '/regional/wedding-budget-shaadi', label: 'Shaadi Budget Planner' },
    { href: '/family/family-budget', label: 'Family Budget' }
  ],
  faqs: [
    { q: 'How do I split a wedding budget?', a: 'Fix the total, assign percentage shares per category before booking, and hold a buffer. A common starting split: 40% venue/catering, 25% attire/jewellery, 10% photography, 8% decor, 7% contingency, 10% everything else.' },
    { q: 'What percentage should go to venue and catering?', a: 'Typically the largest single share — around 40% — because per-guest costs multiply across the whole list. Cultural and city norms vary; the share matters more as a commitment device than as a universal number.' },
    { q: 'Why do wedding budgets always overrun?', a: 'Guest-count creep, mid-planning add-ons and optimism about "small" categories. Planning a 7% buffer and tracking committed spend against envelopes is the practical defense.' },
    { q: 'How does guest count affect the budget?', a: 'Nearly linearly for catering, seating, favors and space. Halving the list frees roughly half the venue-and-catering envelope — which is why deciding the list before touring venues is the highest-leverage step.' }
  ]
},

{
  slug: 'freelance-rate-card', crumb: 'Freelance Rate Card',
  title: 'Rate Card Guide — Hourly, Project &amp; Retainer Pricing for Freelancers | CalcProMaster',
  desc: 'How to build a freelance rate card: the hourly floor, project pricing from scope, retainer math, and when each pricing mode makes sense.',
  h1: 'The Freelance Rate Card: Hourly Floor, Project Layer, Retainer Top',
  cat: 'Career', read: 6,
  answer: `A rate card is three numbers, not one: an <strong>hourly floor</strong> (income target ÷ billable hours — never quote below it), a <strong>project price</strong> (floor × honest scope estimate × risk buffer), and a <strong>retainer</strong> (guaranteed monthly hours at a small discount for the guarantee).`,
  sections: `
  <h2>Layer 1: the hourly floor</h2>
  <div class="formula">Floor = (target income + business costs) ÷ (working hours × utilization)</div>
  <p>Example: 1,500,000 target ÷ 1,152 billable hours (60% of 1,920) ≈ <strong>1,302/hour floor</strong>. Every other pricing mode must clear this number when converted back to hours — otherwise you are subsidizing clients.</p>

  <h2>Layer 2: project pricing</h2>
  <p>Project price = floor × estimated hours × risk factor. A 30-hour task with medium ambiguity at 1.25 risk: 1,302 × 30 × 1.25 ≈ <strong>48,825</strong>. The risk factor is honest insurance for scope drift, not padding — without it, every underestimate comes out of your pocket. Projects reward efficiency: finish in 24 hours and you keep the difference.</p>

  <h2>Layer 3: retainers</h2>
  <p>A retainer sells guaranteed capacity: 20 hours/month at a 10% discount for the commitment = 1,302 × 20 × 0.9 ≈ <strong>23,436/month</strong>. Retainers trade a discount for income predictability — worth it when the client is stable, expensive when they are chaotic.</p>
  <table>
    <tr><th>Mode</th><th>Best when</th><th>Risk sits with</th></tr>
    <tr><td>Hourly</td><td>Scope is genuinely unclear</td><td>Client</td></tr>
    <tr><td>Project</td><td>Scope is definable</td><td>You (mitigate with risk factor)</td></tr>
    <tr><td>Retainer</td><td>Steady ongoing need</td><td>Shared</td></tr>
  </table>
  <p>Compute your floor with the <a href="/career/freelance-hourly-rate">Freelance Hourly Rate</a> tool, project quotes with <a href="/career/freelance-project">Project Fee</a>, and monthly income scenarios with <a href="/career/monthly-goal">Freelance Monthly Goal</a>.</p>
`,
  ctas: [
    { href: '/career/freelance-hourly-rate', label: 'Hourly Rate Calculator' },
    { href: '/career/freelance-project', label: 'Project Fee Calculator' },
    { href: '/career/monthly-goal', label: 'Monthly Goal Planner' }
  ],
  faqs: [
    { q: 'What is a freelance rate card?', a: 'A published set of prices — typically an hourly floor, project packages and a retainer option — computed from your income target ÷ billable hours, so every quote covers your real costs and target.' },
    { q: 'How do I calculate my minimum hourly rate?', a: '(Target income + business costs) ÷ (working hours × utilization). At 60% utilization on 1,920 working hours, a 1,500,000 target implies roughly a 1,302/hour floor.' },
    { q: 'How do I price a project from my hourly rate?', a: 'Hourly floor × honest scope estimate × risk buffer (1.15–1.4 for ambiguity). The buffer is what keeps scope drift profitable instead of voluntary.' },
    { q: 'Should freelancers offer retainers?', a: 'When the client is stable and the work is recurring: yes — a modest discount for guaranteed monthly hours buys predictability. With chaotic clients, hourly is safer.' }
  ]
},

{
  slug: 'screen-time', crumb: 'Screen Time',
  title: 'Screen Time Calculator — Weekly Hours, Yearly Days &amp; What the Numbers Mean | CalcProMaster',
  desc: 'How screen-time math works: daily hours to weekly and yearly totals, the "days of life" framing, and how to set limits that actually hold.',
  h1: 'Screen Time: The Compounding Cost of Small Daily Hours',
  cat: 'Family', read: 5,
  answer: `Screen time compounds quietly: <strong>3 hours a day is 1,095 hours a year — about 45.6 full 24-hour days</strong>. The arithmetic is trivial; the honest work is comparing that total against what you would choose to spend it on.`,
  sections: `
  <h2>The math</h2>
  <div class="formula">Yearly hours = daily hours × 365<br>"Days" = yearly hours ÷ 24 (calendar days if awake hours only)</div>
  <p>Worked example: 3 h/day → 1,095 h/year. As full days: 45.6. Counting only waking hours (16 h/day), the same total occupies <strong>68 wake-days</strong> — over two waking months of a year spent looking at screens.</p>
  <table>
    <tr><th>Daily hours</th><th>Per year</th><th>As full days</th><th>As wake-days (16h)</th></tr>
    <tr><td>1 h</td><td>365 h</td><td>15.2</td><td>22.8</td></tr>
    <tr><td>3 h</td><td>1,095 h</td><td>45.6</td><td>68.4</td></tr>
    <tr><td>5 h</td><td>1,825 h</td><td>76.0</td><td>114.1</td></tr>
    <tr><td>7 h</td><td>2,555 h</td><td>106.5</td><td>159.7</td></tr>
  </table>

  <h2>Using the numbers without the guilt spiral</h2>
  <p>The framing is a measurement, not a verdict — work screens and leisure screens are different categories, and a 40-hour work week of computer time is not the same problem as 40 hours of doom-scrolling. What the math does support: shrinking the <em>unintentional</em> share. Cutting 3 h to 2 h reclaims 365 hours a year — about 15 full days — without any willpower heroics beyond one daily hour.</p>

  <p>For children, guidelines are age-banded and genuinely different (younger is stricter); the <a href="/family/screen-time">Screen Time Limits</a> calculator and <a href="/family/toddler-screen">Toddler Screen</a> tool apply the age-specific bands.</p>
`,
  ctas: [
    { href: '/family/screen-time', label: 'Screen Time Limits' },
    { href: '/family/toddler-screen', label: 'Toddler Screen Time' },
    { href: '/everyday/date-diff', label: 'Date Difference' }
  ],
  faqs: [
    { q: 'How much screen time is normal per day?', a: 'Averages for connected adults run 3–5 hours of leisure screen time on top of work use. "Normal" is descriptive, not prescriptive — the useful question is whether your total matches your priorities.' },
    { q: 'How many days of my life do I spend on screens?', a: 'At 3 hours daily: 1,095 hours a year ≈ 45.6 full days, or about 68 waking-day equivalents. Over 40 adult years that compounds to roughly 5 years of time.' },
    { q: 'What is a healthy screen-time limit?', a: 'For adults there is no official number; the practical test is whether sleep, movement and relationships are getting their hours. For children, official guidance is age-banded and stricter for younger kids.' },
    { q: 'How do I calculate my yearly screen time?', a: 'Daily hours × 365. Three hours a day is 1,095 hours a year; divide by 16 waking hours to see it as 68 wake-days.' }
  ]
},

{
  slug: 'electricity-bill', crumb: 'Electricity Bill',
  title: 'Electricity Bill Calculator — kWh Formula &amp; Appliance Costs | CalcProMaster',
  desc: 'How electricity bills are built: the kWh formula, a worked appliance example, tiered slab pricing, and which appliances actually drive the bill.',
  h1: 'Your Electricity Bill, Decoded: Watts × Hours × Rate',
  cat: 'Everyday', read: 6,
  answer: `Every line on the bill comes from one formula: <strong>kWh = watts × hours ÷ 1,000</strong>, then cost = kWh × rate. A 300 W fridge running 8 h/day uses 72 kWh a month — 576 at 8/unit. The 1.5 kW AC at 8 h/day uses 360 kWh — 2,880. One appliance dwarfs the other; the bill follows.`,
  sections: `
  <h2>The formula</h2>
  <div class="formula">kWh = watts × hours ÷ 1,000<br>Cost = kWh × price per unit</div>
  <p>Worked example — a 300 W fridge compressor actually runs ~8 h/day: 300 × 8 ÷ 1,000 = 2.4 kWh/day → 72 kWh/month → <strong>576/month at 8 per unit</strong>. A 1.5 kW AC at 8 h/day: 1.5 × 8 × 30 = 360 kWh → <strong>2,880/month</strong>. Same formula, five-fold difference — appliance wattage × runtime is where bills are decided.</p>

  <h2>Tiered slabs change the marginal cost</h2>
  <p>Many utilities price in slabs: the first 100 kWh cheap, the next band pricier, and so on. Your <em>average</em> rate is not the rate for the next kWh — crossing into a higher slab makes every additional AC hour more expensive than your bill average suggests. Check your bill's slab structure before estimating savings; shaving consumption below a slab boundary saves at the higher marginal rate.</p>

  <h2>Finding the big consumers</h2>
  <p>Wattage × runtime ranks them honestly: ACs, water heaters and dryers dominate; fridges run constantly but at low power; phone chargers and idle electronics are rounding errors despite folklore. Measure suspects with the appliance's nameplate wattage and your usage pattern in the <a href="/everyday/electricity">Electricity Bill Calculator</a> — and compare appliance upgrades with the <a href="/homegarden/appliance-cost">Appliance Running Cost</a> tool.</p>
`,
  ctas: [
    { href: '/everyday/electricity', label: 'Electricity Bill Calculator' },
    { href: '/homegarden/appliance-cost', label: 'Appliance Running Cost' },
    { href: '/guides/everyday', label: 'Everyday Guides' }
  ],
  faqs: [
    { q: 'How do I calculate my electricity bill?', a: 'For each appliance: watts × daily hours ÷ 1,000 = daily kWh. Multiply by 30 for monthly kWh, sum across appliances, then multiply by your rate (respecting slab tiers if your utility uses them).' },
    { q: 'How much does it cost to run an AC?', a: 'Wattage × hours × days × rate. A 1.5 kW split AC at 8 h/day and 8/unit: 1.5 × 8 × 30 = 360 kWh → 2,880 a month. Higher rates or longer runtimes scale it linearly.' },
    { q: 'What uses the most electricity in a home?', a: 'Usually heating and cooling (AC, heaters), water heating and dryers — high wattage times long runtime. Always-on low-wattage devices like fridges matter, but chargers and idle electronics barely register.' },
    { q: 'Why is my bill higher than my kWh math?', a: 'Slab pricing (later units cost more), fixed charges, taxes and fuel-adjustment surcharges sit on top of the energy line. Check the bill\u2019s non-energy lines before blaming the appliances.' }
  ]
},

{
  slug: 'business-days', crumb: 'Business Days',
  title: 'Business Days Calculator — Workday Math, Deadlines &amp; the Complication List | CalcProMaster',
  desc: 'How business-day math works: counting workdays between dates, adding days to a deadline, the weekday-only formula, and the complications (holidays, half days) that break naive counts.',
  h1: 'Business Days: The Math of Deadlines',
  cat: 'Everyday', read: 5,
  answer: `A 30-day calendar month contains about <strong>22 business days</strong> (30 minus 8 weekend days). Everything in project planning — lead times, SLA clocks, invoice terms — runs on this compressed calendar, and naive calendar math overestimates available work time by ~30%.`,
  sections: `
  <h2>Counting business days between two dates</h2>
  <div class="formula">Business days = calendar days − weekend days − holidays</div>
  <p>Worked example: September 2026 has 30 days containing exactly 8 weekend days (4 Saturdays + 4 Sundays) → <strong>22 business days</strong>. Subtract a public holiday and the month delivers 21. A "one month" deadline is a 5–10% shorter clock than it feels.</p>

  <h2>Adding days to a deadline</h2>
  <p>To find a date 10 business days from a Friday: 10 workdays ≈ 2 calendar weeks, but start-day and direction matter — landing on a Saturday rolls to Monday, and a holiday inside the window pushes further. This is exactly the arithmetic the <a href="/everyday/date-diff">Date Difference Calculator</a> handles, including which days count as workdays.</p>

  <h2>Where naive counts break</h2>
  <table>
    <tr><th>Complication</th><th>Effect</th></tr>
    <tr><td>Public holidays</td><td>Each removes a full workday — a heavy month can lose 3–4</td></tr>
    <tr><td>Direction of counting</td><td>10 days "from" vs "within" differ by a day or more</td></tr>
    <tr><td>Regional workweeks</td><td>Fri–Sat weekends shift everything vs Sat–Sun</td></tr>
    <tr><td>Half-day conventions</td><td>Some industries count them, some don't</td></tr>
  </table>
  <p>For contracts, verify which convention governs: "business days" is a defined term whose definition varies by jurisdiction and agreement.</p>
`,
  ctas: [
    { href: '/everyday/date-diff', label: 'Date Difference Calculator' },
    { href: '/everyday/age', label: 'Age Calculator' },
    { href: '/guides/everyday', label: 'Everyday Guides' }
  ],
  faqs: [
    { q: 'How many business days are in a month?', a: 'Typically 20–23. A 30-day month with 8 weekend days has 22; subtract public holidays from there.' },
    { q: 'How do I calculate business days between two dates?', a: 'Count the calendar days, subtract weekend days, subtract holidays. The Date Difference Calculator does this automatically, including weekend definitions.' },
    { q: 'What date is 10 business days from today?', a: 'Roughly two calendar weeks later, adjusted for holidays and weekend landings. Use the calculator for the exact date — start-day effects make mental math unreliable.' },
    { q: 'Do all countries have the same business week?', a: 'No. Most of the world runs Monday–Friday, but several Middle Eastern countries use Sunday–Thursday or Friday–Saturday weekends. Always confirm which convention a deadline uses.' }
  ]
},

{
  slug: 'grade-needed', crumb: 'Grade Needed',
  title: 'Grade Needed on Final Calculator — The Weighted-Grade Formula | CalcProMaster',
  desc: 'The weighted-grade formula that tells you exactly what to score on the final, a worked example, and the honest reality check when the required grade is above 100%.',
  h1: 'What Do I Need on the Final? The Weighted-Grade Formula',
  cat: 'Education', read: 5,
  answer: `Required final score = (target grade − current% × final's weight as decimal) ÷ weight. Current 78% with the final worth 20% and a target of 80: (80 − 62.4) ÷ 0.2 = <strong>88% needed</strong> on the final. The formula also honestly tells you when a target is out of reach.`,
  sections: `
  <h2>The formula</h2>
  <div class="formula">Final needed % = (Target − Current × (1 − w)) ÷ w</div>
  <p>Where w is the final's weight as a decimal. Worked example: current 78%, final worth 20% (w = 0.2), target 80%. (80 − 78 × 0.8) ÷ 0.2 = (80 − 62.4) ÷ 0.2 = <strong>88%</strong>. Heavier finals move the requirement less than intuition suggests — a 40%-weight final for the same 80% target needs only (80 − 46.8) ÷ 0.4 = <strong>83%</strong>.</p>

  <h2>Reading impossible answers</h2>
  <p>If the formula returns more than 100, the target is mathematically unreachable — better to know at study-plan time than at results time. Example: 60% current, 30%-weight final, 85% target: (85 − 42) ÷ 0.3 = <strong>143%</strong> → impossible; the honest ceiling is 60 × 0.7 + 100 × 0.3 = 72%. Recalculate targets with the <a href="/education/grade">Grade Calculator</a> after each marked assessment — the requirement changes every time current% moves.</p>

  <h2>Common mistakes</h2>
  <ul>
    <li>Using current % <em>without</em> subtracting the final's weight from its coverage (the × (1 − w) term).</li>
    <li>Treating all assessments as equally weighted when the syllabus says otherwise.</li>
    <li>Forgetting bonus marks that shift the effective current %.</li>
  </ul>
`,
  ctas: [
    { href: '/education/grade', label: 'Grade Calculator' },
    { href: '/education/gpa', label: 'GPA Calculator' },
    { href: '/guides/gpa', label: 'GPA Guide' }
  ],
  faqs: [
    { q: 'How do I calculate what I need on the final exam?', a: '(Target − Current × (1 − weight)) ÷ weight, with the final\u2019s weight as a decimal. 78% current, 20%-weight final, 80% target → 88% needed.' },
    { q: 'What if the grade I need is over 100%?', a: 'The target is mathematically impossible. Your realistic ceiling is current × (1 − w) + 100 × w — recompute an achievable target and put the study hours where they move other courses.' },
    { q: 'Does a heavier final make the needed score higher or lower?', a: 'Usually lower, surprisingly: a bigger weight means your current grade influences less of the outcome, so the final needs less over-performance to hit the same target.' },
    { q: 'Should I calculate this before or after each exam?', a: 'Both. Before the final it sets the study target; after every marked assessment the requirement changes, so recompute rather than relying on an old number.' }
  ]
},

{
  slug: 'room-area', crumb: 'Room Area',
  title: 'Room Area Calculator — Irregular Shapes, Waste % &amp; Material Orders | CalcProMaster',
  desc: 'How to calculate room area for any floor plan: rectangles, L-shapes and circles, the waste-percentage rule, and how area converts into material orders.',
  h1: 'Room Area: Rectangles, L-Shapes and the Waste Rule',
  cat: 'Home & Garden', read: 5,
  answer: `Rectangles are length × width; anything else decomposes into rectangles (or circles for rugs). A 12×15 ft room is <strong>180 sq ft</strong>; an 80 sq ft rug covers <strong>44.4%</strong> of it. Material orders then add a waste allowance — 10% is the honest default.`,
  sections: `
  <h2>The shapes that cover real floors</h2>
  <div class="formula">Rectangle: L × W · Circle: π r² · L-shape: split into two rectangles, add</div>
  <p>Worked example: a 12 × 15 ft room = <strong>180 sq ft</strong>. A rug of 80 sq ft covers 80 ÷ 180 = <strong>44.4%</strong> of the floor. An L-shaped living room is just two rectangles: 12×15 plus 8×6 = 180 + 48 = 228 sq ft. Measure to the finished wall surface, not the skirting.</p>

  <h2>From area to material order (the waste %)</h2>
  <table>
    <tr><th>Material</th><th>Waste allowance</th><th>Why</th></tr>
    <tr><td>Tile (straight lay)</td><td>+10%</td><td>Cuts, breakage, future repairs</td></tr>
    <tr><td>Tile (diagonal)</td><td>+15%</td><td>More edge cuts</td></tr>
    <tr><td>Wood flooring</td><td>+7–10%</td><td>Board-length staggering</td></tr>
    <tr><td>Carpet (broadloom)</td><td>+10–20%</td><td>Seam placement, nap direction</td></tr>
  </table>
  <p>Ordering exactly 180 sq ft of tile for a 180 sq ft floor is how projects end one box short. The <a href="/homegarden/room-area">Room Area & Flooring Calculator</a> adds waste automatically; <a href="/conversion/area">Area Converter</a> handles sq ft ↔ sq m, and <a href="/everyday/paint">Paint Estimator</a> does the same math vertically for walls.</p>
`,
  ctas: [
    { href: '/homegarden/room-area', label: 'Room Area Calculator' },
    { href: '/conversion/area', label: 'Area Converter' },
    { href: '/everyday/paint', label: 'Paint Estimator' }
  ],
  faqs: [
    { q: 'How do I calculate the area of a room?', a: 'Multiply length by width for rectangles. L-shaped rooms split into two rectangles and add. A 12×15 ft room is 180 sq ft.' },
    { q: 'How do I calculate area of an irregular room?', a: 'Decompose into rectangles (and circles for curves), compute each, then add. Sketch the floor plan with dimensions — five minutes of measuring beats guessing.' },
    { q: 'How much extra material should I order?', a: '10% waste is the standard default: 7–10% for wood, 10–15% for tile (more if diagonal), 10–20% for carpet. Diagonal layouts and pattern repeats push higher.' },
    { q: 'How do I convert square feet to square meters?', a: 'Divide sq ft by 10.764. A 180 sq ft room is about 16.7 sq m. The Area Converter does all direction conversions precisely.' }
  ]
},

{
  slug: 'ac-size', crumb: 'AC Sizing (BTU)',
  title: 'AC Size Calculator — BTU Formula, Tonnage &amp; the Oversizing Trap | CalcProMaster',
  desc: 'How to size an air conditioner correctly: the BTU-per-sq-ft formula, sun and occupancy adjustments, tonnage conversion, and why bigger is not colder.',
  h1: 'AC Sizing: BTU Math and Why Oversized Units Underperform',
  cat: 'Home & Garden', read: 6,
  answer: `Start from roughly 20 BTU per sq ft (hot climates run up to ~80 for uninsulated top floors): a 150 sq ft room in a hot climate needs about <strong>12,000 BTU — a 1-ton unit</strong>. Bigger is not colder: oversized ACs short-cycle, cool unevenly and leave air clammy.`,
  sections: `
  <h2>The sizing formula</h2>
  <div class="formula">Base BTU = area (sq ft) × 20 · Hot climate / poor insulation: up to × 80<br>Tons = BTU ÷ 12,000</div>
  <p>Worked example: 150 sq ft bedroom, hot climate, decent insulation: 150 × 80 = 12,000 BTU → <strong>1.0 ton</strong>. The same room in a temperate climate with good insulation might need only 150 × 20 = 3,000 BTU — climate and insulation swing the answer 4×, which is why "one rule" sizing misleads.</p>

  <h2>Adjustments that matter</h2>
  <table>
    <tr><th>Factor</th><th>Adjustment</th></tr>
    <tr><td>Sunny room</td><td>+10%</td></tr>
    <tr><td>Shaded room</td><td>−10%</td></tr>
    <tr><td>Kitchen</td><td>+4,000 BTU (appliance heat)</td></tr>
    <tr><td>Each regular occupant beyond 2</td><td>+600 BTU</td></tr>
    <tr><td>High ceiling / open plan</td><td>Size by volume, not floor area</td></tr>
  </table>

  <h2>Why oversizing fails</h2>
  <p>An oversized unit drops temperature fast, satisfies the thermostat in minutes, and shuts off — before it has dehumidified the air. Result: cold-but-clammy rooms, more on/off cycling (wear + higher peaks), and worse comfort than the "smaller" correct unit. The <a href="/homegarden/ac-size">AC/BTU Size Calculator</a> applies all adjustments; the <a href="/everyday/electricity">Electricity Bill Calculator</a> estimates what your chosen tonnage costs to run.</p>
`,
  ctas: [
    { href: '/homegarden/ac-size', label: 'AC/BTU Size Calculator' },
    { href: '/everyday/electricity', label: 'Electricity Bill Calculator' },
    { href: '/guides/homegarden', label: 'Home & Garden Guides' }
  ],
  faqs: [
    { q: 'How many BTU do I need per square foot?', a: 'Start at 20 BTU/sq ft for temperate, well-insulated rooms; hot climates with average insulation run 60–80 BTU/sq ft. Adjust ±10% for sun exposure and add for kitchens and extra occupants.' },
    { q: 'What size AC for a 150 sq ft room?', a: 'About 12,000 BTU (1 ton) in a hot climate: 150 × 80 = 12,000. Cooler climates with good insulation may need far less — run the full formula with your conditions.' },
    { q: 'Is a bigger AC better?', a: 'No. Oversized units short-cycle: they cool quickly, shut off before dehumidifying, and deliver cold-but-clammy air with more wear. Correct sizing beats bigger.' },
    { q: 'How do I convert BTU to tons?', a: 'Divide BTU by 12,000. 12,000 BTU = 1 ton, 18,000 = 1.5 tons, 24,000 = 2 tons.' }
  ]
},

{
  slug: 'protein-intake', crumb: 'Protein Intake',
  title: 'Protein Intake Calculator — g/kg Targets &amp; Food Equivalents | CalcProMaster',
  desc: 'How to calculate daily protein need: the g/kg bands by activity, a worked 70 kg example with real-food equivalents, and how to distribute grams across the day.',
  h1: 'Protein Need: Grams per Kilogram, Then Real Food',
  cat: 'Food & Nutrition', read: 5,
  answer: `Protein need = body weight (kg) × activity factor: 0.8 g/kg sedentary, ~1.6 g/kg active, up to 2.0+ for heavy training. A <strong>70 kg active person needs about 112 g/day</strong> — roughly 361 g of chicken breast or 18 eggs' worth (don't eat 18 eggs; distribute across foods).`,
  sections: `
  <h2>The bands</h2>
  <div class="formula">Protein (g) = weight (kg) × factor</div>
  <table>
    <tr><th>Profile</th><th>g/kg</th><th>70 kg person</th></tr>
    <tr><td>Sedentary</td><td>0.8</td><td>56 g</td></tr>
    <tr><td>Active / fitness</td><td>1.6</td><td>112 g</td></tr>
    <tr><td>Athlete / muscle gain</td><td>2.0</td><td>140 g</td></tr>
  </table>
  <p>Worked example: 70 kg × 1.6 = <strong>112 g/day</strong>. In food: chicken breast ≈ 31 g/100 g → 361 g; eggs ≈ 6.3 g each → ~18; lentils ≈ 9 g per cooked cup → 12 cups (why plant-based eaters combine sources — the <a href="/food/vegan-protein">Vegan Protein</a> tool does that math).</p>

  <h2>Distribution beats totals (slightly)</h2>
  <p>Muscle protein synthesis responds per-meal; roughly 20–40 g per meal across 3–4 meals uses the day's total more effectively than one dinner-sized load. 112 g across four meals = 28 g each — a palm of chicken, a cup of dal plus yogurt, or a shake.</p>

  <div class="note"><strong>Context:</strong> healthy kidneys handle high-protein diets fine, but pre-existing kidney disease changes targets — medical conditions deserve professional guidance, not calculator outputs.</div>
`,
  ctas: [
    { href: '/food/protein-need', label: 'Daily Protein Need' },
    { href: '/food/protein-per-dollar', label: 'Protein per Dollar' },
    { href: '/food/vegan-protein', label: 'Vegan Protein Sources' }
  ],
  faqs: [
    { q: 'How much protein do I need per day?', a: 'Weight × activity factor: 0.8 g/kg sedentary, ~1.6 g/kg active, ~2.0 g/kg for heavy training. A 70 kg active person needs about 112 g/day.' },
    { q: 'Is too much protein harmful?', a: 'For healthy people, intakes up to ~2 g/kg are well studied and safe. Existing kidney disease is the standard exception — those targets belong to a clinician.' },
    { q: 'Can I eat all my protein in one meal?', a: 'You can, but spreading 20–40 g across 3–4 meals uses it more efficiently for muscle maintenance and satiety.' },
    { q: 'What food equals 100 g of protein?', a: 'About 320 g of chicken breast, 16 eggs, or a mix: 200 g Greek yogurt (20 g) + 100 g lentils (9 g) + 150 g paneer (27 g) + 2 eggs (13 g) + whey scoop (25 g). The Protein per Dollar tool compares costs too.' }
  ]
}
];

/* ---------- write ---------- */
fs.mkdirSync(OUT, { recursive: true });
let written = 0;
for (const g of GUIDES) {
  const html = head(g) + g.sections + foot(g);
  const target = path.join(OUT, g.slug + '.html');
  if (fs.existsSync(target)) { console.log('SKIP (exists): ' + g.slug); continue; }
  fs.writeFileSync(target, html);
  written++;
}
console.log(`\nWrote ${written} guide pages (${GUIDES.length - written} already existed).`);
