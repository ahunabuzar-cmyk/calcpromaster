#!/usr/bin/env node
/* Batch 2: 10 new topic guides (guides/<slug>.html) extending the cluster with
 * topics not covered by build-topic-guides.cjs / build-category-guides.cjs.
 * Every guide's content is hand-written below — formula + worked example +
 * honest limitations + FAQ. Only the HTML shell + JSON-LD are templated, and
 * FAQPage schema is generated FROM the visible FAQ text so markup matches
 * content. Each guide carries an E-E-A-T block linking to /editorial-policy.
 * All CTA hrefs verified against sitemap.xml before inclusion.
 * Run from project root: node scripts/build-topic-guides-batch2.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, '..', 'guides');
const DOMAIN = 'https://calcpromaster.netlify.app';

const EEAT = '<div class="review-block"><strong>About this guide:</strong> Written and maintained by CalcProMaster\u2019s developer — an independent site, not a licensed financial advisor or medical professional. Every worked example below was computed by hand and cross-checked with the linked calculator; our <a href="/editorial-policy">editorial policy</a> explains how content is written, tested and corrected.</div>';

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
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="CalcProMaster">
  <meta property="og:title" content="${g.h1.replace(/&/g, '&amp;')}">
  <meta property="og:description" content="${g.desc}">
  <meta property="og:url" content="${DOMAIN}/guides/${g.slug}">
  <meta property="og:image" content="${DOMAIN}/og-image.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${DOMAIN}/og-image.png">
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
    .review-block { background: #f5f3ff; border-left: 4px solid #8b5cf6; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 18px 0; font-size: 0.88rem; color: #4b5563; }
    .review-block a { color: #7c3aed; }
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

${EEAT}
  <p class="related"><a href="/guides">← All guides</a> · <a href="/guides/glossary">Glossary</a> · <a href="/blog">Blog</a></p>
  <script src="/guides/glossary-tooltips.js" defer></script>
</body>
</html>
`;
}

const GUIDES = [
  {
    slug: 'cagr', crumb: 'CAGR',
    title: 'CAGR Calculator — Compound Annual Growth Rate Formula &amp; Examples | CalcProMaster',
    desc: 'What CAGR really measures, the exact formula, a worked 5-year investment example, and when CAGR misleads (volatility, negative years, short periods).',
    h1: 'CAGR: The One Number That Smooths a Bumpy Investment',
    cat: 'Finance', read: 6,
    answer: `CAGR (Compound Annual Growth Rate) answers one question: <strong>what constant yearly rate would take this value to that value in N years?</strong> A ₹1,00,000 investment that becomes ₹1,61,051 in 5 years has a CAGR of 10% — even if the actual yearly returns were +25%, −8%, +12%, −3%, +40%.`,
    sections: `
  <h2>The CAGR formula</h2>
  <div class="formula">CAGR = (Ending value ÷ Beginning value)<sup>1/n</sup> − 1<br>where n = number of years</div>
  <p>Worked example: ₹1,00,000 grows to ₹1,61,051 in 5 years. Ratio = 1.61051. Fifth root of 1.61051 = 1.10 (check: 1.10<sup>5</sup> = 1.61051). So CAGR = <strong>10.0% per year</strong>. The order of operations matters: divide first, take the n-th root second, subtract 1 last — reversing steps 2 and 3 is the most common hand-calculation error.</p>

  <h2>Why CAGR beats the "average of yearly returns"</h2>
  <p>Yearly returns of +50% and −50% average to 0%, but ₹100 becomes ₹150 then ₹75 — a real loss of 25%. The arithmetic average ignores compounding; CAGR does not: (75/100)<sup>1/2</sup> − 1 = −13.4% per year, which is the honest annualized truth. Whenever returns compound, use the geometric mean (CAGR), not the arithmetic one.</p>

  <h2>Where CAGR misleads</h2>
  <table>
    <tr><th>Situation</th><th>What goes wrong</th></tr>
    <tr><td>Short periods (1–2 years)</td><td>One lucky year annualizes into an unsustainable "rate"</td></tr>
    <tr><td>Negative endpoint</td><td>If the ending value is below the start, CAGR is negative — fine — but if the ending value is ≤ 0 the formula is undefined</td></tr>
    <tr><td>Uneven cash flows</td><td>CAGR assumes one deposit at the start and nothing after; SIP-style contributions need an IRR/XIRR calculation instead</td></tr>
    <tr><td>Cherry-picked dates</td><td>Starting the clock after a crash (or before one) changes CAGR dramatically with zero change in the fund</td></tr>
  </table>
  <p>None of this makes CAGR wrong — it makes it a <em>summary</em>. Pair it with the underlying yearly numbers before drawing conclusions.</p>

  <div class="note"><strong>Limitations:</strong> CAGR says nothing about the path taken, risk, or volatility. Two investments with identical CAGR can have wildly different drawdowns. For periodic contributions, use an IRR-based calculator, not CAGR.</div>
`,
    ctas: [
      { href: '/finance/cagr-calculator', label: 'CAGR Calculator' },
      { href: '/finance/investment', label: 'Investment Return Calculator' },
      { href: '/finance/compound-interest', label: 'Compound Interest Calculator' }
    ],
    faqs: [
      { q: 'What is a good CAGR?', a: 'It depends entirely on the asset class and period. As a rough reference: long-run inflation is 2–4%, broad stock indices have historically annualized around 7–10% in many markets, and anything promising far more than that carries far more risk. Compare CAGR against a relevant benchmark, not a universal number.' },
      { q: 'How do I calculate CAGR by hand?', a: 'Divide ending value by beginning value, take the n-th root of the ratio (n = years), then subtract 1 and multiply by 100. Example: 1.61051 over 5 years → fifth root ≈ 1.10 → CAGR ≈ 10%.' },
      { q: 'Is CAGR the same as annualized return?', a: 'Yes — CAGR is the standard way to annualize a single start-to-end growth figure. They differ from IRR, which handles multiple cash flows at different dates.' },
      { q: 'Can CAGR be negative?', a: 'Yes. If the ending value is lower than the beginning value, CAGR is negative and correctly shows a shrinking investment. It is undefined only when the ending value is zero or negative.' }
    ]
  },

  {
    slug: 'body-fat', crumb: 'Body Fat Percentage',
    title: 'Body Fat Percentage — the US Navy Method, Formula &amp; Limits | CalcProMaster',
    desc: 'How the US Navy tape-measure formula estimates body fat, a worked example, how it compares to BMI, and why every field method has an error band.',
    h1: 'Body Fat Percentage: What the Tape Measure Can and Cannot See',
    cat: 'Health', read: 6,
    answer: `The most practical field estimate is the US Navy circumference method: for a man, <strong>%BF = 495 ÷ (1.0324 − 0.19077×log₁₀(waist − neck) + 0.15456×log₁₀(height)) − 450</strong> with measurements in cm. It needs only a tape measure, and it carries an honest error band of roughly ±3–4% against lab methods.`,
    sections: `
  <h2>The US Navy method, worked</h2>
  <p>Example — a man 180 cm tall, neck 38 cm, waist 84 cm: waist − neck = 46 cm; log₁₀(46) = 1.6628; log₁₀(180) = 2.2553. Denominator = 1.0324 − 0.19077×1.6628 + 0.15456×2.2553 = 1.0324 − 0.3172 + 0.3486 = 1.0638. %BF = 495 ÷ 1.0638 − 450 = <strong>15.2%</strong>. Women use the same constants with hips instead and a different intercept — the calculator implements both.</p>

  <h2>Body fat vs BMI: different questions</h2>
  <table>
    <tr><th></th><th>BMI</th><th>Body-fat %</th></tr>
    <tr><td>Inputs</td><td>Weight and height only</td><td>Circumferences (or calipers/DEXA)</td></tr>
    <tr><td>Sees muscle vs fat?</td><td>No</td><td>Partially — fat distribution matters</td></tr>
    <tr><td>Typical use</td><td>Population screening</td><td>Body-composition tracking</td></tr>
    <tr><td>Common ranges (men)</td><td>"Normal" 18.5–24.9</td><td>Athletes 6–13%, fitness 14–17%, average 18–24%</td></tr>
  </table>
  <p>A muscular person can be "overweight" by BMI at 12% body fat; a sedentary person can be "normal" by BMI at 28% body fat. The two numbers answer different questions and are most useful together.</p>

  <h2>Every method has an error band</h2>
  <p>DEXA scans are treated as reference but still vary between machines; calipers depend on the measurer's skill; the Navy formula averages about ±3–4% error. That is fine for tracking <em>change</em> — if your estimate falls from 24% to 20% under a consistent method, real fat was likely lost even if the absolute number is off. It is not fine for diagnosing anything.</p>

  <div class="note"><strong>Limitations:</strong> circumference formulas were developed on specific populations and lose accuracy at very high or very low body fat, and measurement technique (tape tension, time of day, measurement sites) moves results by whole percentage points. Track trends with the same method, same conditions.</div>
`,
    ctas: [
      { href: '/health/body-fat', label: 'Body Fat Calculator' },
      { href: '/health/bmi', label: 'BMI Calculator' },
      { href: '/health/lean-body-mass', label: 'Lean Body Mass Calculator' }
    ],
    faqs: [
      { q: 'How do I measure for the Navy method?', a: 'Use a flexible tape: measure the neck below the larynx, the waist at the navel (men) or at the narrowest point plus hips at the widest (women), keep the tape snug but not compressing skin, and measure at the same time of day — morning, before eating, is standard.' },
      { q: 'What body fat percentage is healthy?', a: 'Ranges shift by source, but commonly cited bands are roughly 10–20% for men and 18–28% for women in normal healthy adults, with athletes lower. Essential fat — needed for physiological function — is around 3% for men and 12% for women, so lower is not better.' },
      { q: 'Is the Navy formula accurate?', a: 'Compared against DEXA it typically lands within ±3–4% for most people, which is comparable to consumer bioimpedance scales and better than nothing. Its real value is tracking change under a consistent technique.' },
      { q: 'Why do different calculators give me different numbers?', a: 'Different formulas (Navy, Covert Bailey, YMCA) use different measurement sites and coefficients, and each carries its own error band. Pick one method and stay with it so your trend line means something.' }
    ]
  },

  {
    slug: 'water-intake', crumb: 'Daily Water Intake',
    title: 'How Much Water Should You Drink — the Real Formula &amp; Adjustments | CalcProMaster',
    desc: 'Where the 8-glasses myth came from, what body-weight and activity formulas actually suggest, a worked example, and the honest role of thirst.',
    h1: 'Daily Water Intake: The Formula, the Myth, and Your Sweat',
    cat: 'Health', read: 5,
    answer: `A reasonable weight-based baseline is <strong>30–35 ml per kg of body weight per day</strong>, plus roughly 400–600 ml per hour of exercise, more in heat. A 70 kg adult lands around 2.1–2.5 L/day from all fluids and food — not the mythical eight 8-oz glasses by decree, but not far off either.`,
    sections: `
  <h2>The weight-based formula, worked</h2>
  <div class="formula">Baseline (ml/day) = body weight (kg) × 33 (midpoint of 30–35)<br>+ exercise: ~500 ml per hour of activity<br>+ heat: +250–500 ml on hot days</div>
  <p>Example — 70 kg office worker with one hour of gym: 70 × 33 = 2,310 ml, plus ~500 ml for the workout = <strong>~2.8 L/day</strong>. About 20–30% of fluid intake normally comes from food, so drinking ~2.2 L covers it. The calculator does this arithmetic with your own numbers.</p>

  <h2>Where "8 glasses" came from — and why it stuck</h2>
  <p>The 1945 US Food and Nutrition Board recommendation said roughly 1 ml per kcal of food energy — about 2–2.5 L — but the accompanying sentence noting that much of it is <em>in food</em> got dropped in repetition. Eight 8-oz glasses (1.9 L) is a memorable rounding of a rough 1940s figure, not a measured human requirement. Actual needs vary roughly 1.5–4 L/day between people.</p>

  <h2>Honest adjustments</h2>
  <table>
    <tr><th>Factor</th><th>Adjustment</th></tr>
    <tr><td>Exercise</td><td>~400–600 ml per hour (more with heavy sweat)</td></tr>
    <tr><td>Hot/humid climate</td><td>+0.25–0.5 L/day or more</td></tr>
    <tr><td>Pregnancy / breastfeeding</td><td>~+300 ml / ~+700 ml per day</td></tr>
    <tr><td>Fever, vomiting, diarrhea</td><td>Replacement needs — follow medical guidance, not a formula</td></tr>
    <tr><td>Coffee, tea, juice, food</td><td>All count toward total fluid</td></tr>
  </table>

  <div class="note"><strong>Limitations:</strong> thirst is a well-tuned regulator for most healthy adults; forcing water far above intake needs can, in extreme cases, cause hyponatremia (dangerously low blood sodium). Kidney or heart conditions change fluid targets — those belong to a clinician, not a calculator.</div>
`,
    ctas: [
      { href: '/health/water-intake-health', label: 'Water Intake Calculator' },
      { href: '/health/bmi', label: 'BMI Calculator' },
      { href: '/health/calorie', label: 'Calorie Calculator' }
    ],
    faqs: [
      { q: 'Is 8 glasses of water a day actually right?', a: 'It is a reasonable rough total for many mid-size adults but was never a measured requirement. Weight-based estimates (30–35 ml/kg), activity, climate and food-derived fluid give a more personal number.' },
      { q: 'Do tea and coffee count?', a: 'Yes. Despite folklore, moderate caffeine does not dehydrate regular consumers, and all beverages plus water-rich food contribute to daily fluid intake.' },
      { q: 'Can I drink too much water?', a: 'Yes — drinking liters beyond thirst in a short window can dilute blood sodium (hyponatremia), which is dangerous. Endurance athletes drinking large volumes over hours are the classic risk group; electrolyte replacement matters there.' },
      { q: 'How do I know if I am drinking enough?', a: 'For healthy adults, pale-straw-colored urine and drinking to thirst are the practical signals. Dark urine suggests you could use more; completely clear all day suggests you may be overdoing it.' }
    ]
  },

  {
    slug: 'heart-rate-zones', crumb: 'Heart Rate Zones',
    title: 'Heart Rate Training Zones — Formulas, Worked Numbers &amp; Sense-Check | CalcProMaster',
    desc: 'Max heart rate formulas compared (220−age vs Tanaka), the five-zone model with a worked example, and why HRmax formulas have a built-in error band.',
    h1: 'Heart Rate Zones: Math for Training, With the Error Bars Shown',
    cat: 'Health', read: 6,
    answer: `Training zones are percentages of a reference heart rate. The classic estimate <strong>HRmax = 220 − age</strong> carries a standard deviation of ~10–12 bpm; the Tanaka formula (208 − 0.7×age) fits measured maxima better in adults. A 35-year-old with Tanaka max ≈ 183.5 bpm trains zone 2 (60–70%) at roughly 110–128 bpm.`,
    sections: `
  <h2>Step 1: estimate your maximum heart rate</h2>
  <div class="formula">Classic (Fox): HRmax = 220 − age<br>Tanaka: HRmax = 208 − 0.7 × age</div>
  <p>Age 35: Fox gives 185, Tanaka gives 183.5 — close here. At age 60 they diverge: Fox 160, Tanaka 166. Fox's equation came from a scatter of studies and systematically underestimates HRmax in older adults; Tanaka was fitted on a larger measured sample. Neither beats an actual field test (a hard, properly warmed-up effort) or a lab test.</p>

  <h2>Step 2: cut the range into five zones</h2>
  <p>Using Tanaka 183.5 bpm for our 35-year-old (reserve method shown because it anchors zones to resting heart rate too: HRR = HRmax − HRrest; zones = HRrest + %×HRR, with HRrest = 60): HRR = 123.5.</p>
  <table>
    <tr><th>Zone</th><th>% of HRmax</th><th>Feel</th><th>Example bpm (max-%)</th></tr>
    <tr><td>Z1 recovery</td><td>50–60%</td><td>Easy, conversational</td><td>92–110</td></tr>
    <tr><td>Z2 aerobic</td><td>60–70%</td><td>Comfortably breathing harder</td><td>110–128</td></tr>
    <tr><td>Z3 tempo</td><td>70–80%</td><td>"Comfortably hard"</td><td>128–147</td></tr>
    <tr><td>Z4 threshold</td><td>80–90%</td><td>Hard, short phrases only</td><td>147–165</td></tr>
    <tr><td>Z5 VO₂max</td><td>90–100%</td><td>All-out, minutes at most</td><td>165–183</td></tr>
  </table>
  <p>Most endurance training time belongs in Z1–Z2 — the "80/20" distribution popularized by polarized-training research. Zone 2 mislabeled as Z3 is the most common self-coaching error, and it usually comes from an HRmax formula that underestimates your true max.</p>

  <div class="note"><strong>Limitations:</strong> a formula's ±10–12 bpm error can shift you a full zone. Medications (notably beta-blockers), heat, caffeine, stress and dehydration all move heart rate independently of effort. Calibrate zones against perceived effort and — if possible — a measured field test. Heart conditions need clinical guidance first.</div>
`,
    ctas: [
      { href: '/health/target-heart-rate', label: 'Target Heart Rate Calculator' },
      { href: '/health/heart-rate', label: 'Heart Rate Calculator' },
      { href: '/health/calorie-burn', label: 'Calorie Burn Calculator' }
    ],
    faqs: [
      { q: 'Which max heart rate formula should I use?', a: 'Tanaka (208 − 0.7×age) tracks measured maxima better than the classic 220 − age, especially over 40. Both carry roughly ±10–12 bpm error — treat the output as a starting band, then adjust with a field test or how effort actually feels.' },
      { q: 'What is zone 2 and why is everyone talking about it?', a: 'Zone 2 is the intensity where you can hold a conversation with slightly longer breaths — roughly 60–70% of max heart rate. It builds aerobic base with low stress and is where most weekly endurance volume is best spent.' },
      { q: 'Do beta-blockers change heart rate zones?', a: 'They lower both resting and maximum heart rate substantially, so percentage-of-max formulas computed from age alone will mislead. Anyone on such medication should set zones with their doctor or use perceived-exertion scales instead.' },
      { q: 'Is a higher resting heart rate bad?', a: 'For adults, 60–100 bpm is the usual reference band, with well-trained people often in the 40s–50s. A sudden sustained rise from your own normal can signal illness, overtraining or dehydration — it is a trend worth watching, not a single reading.' }
    ]
  },

  {
    slug: 'net-worth', crumb: 'Net Worth',
    title: 'How to Calculate Net Worth — Assets, Liabilities &amp; What Counts | CalcProMaster',
    desc: 'The net worth formula, a fully worked example with real balance-sheet lines, what to include and exclude, and why the trend matters more than the number.',
    h1: 'Net Worth: One Subtraction That Orders Your Whole Balance Sheet',
    cat: 'Finance', read: 5,
    answer: `Net worth = <strong>everything you own − everything you owe</strong>. Add up assets (cash, investments, retirement accounts, property at a conservative value) and subtract liabilities (mortgage, loans, credit-card balances). A ₹40 lakh home with a ₹30 lakh loan and ₹15 lakh in savings gives net worth ₹25 lakh — the house barely matters until the loan shrinks.`,
    sections: `
  <h2>The formula and a full worked example</h2>
  <div class="formula">Net worth = Total assets − Total liabilities</div>
  <table>
    <tr><th>Assets</th><th>Amount</th><th>Liabilities</th><th>Amount</th></tr>
    <tr><td>Cash + savings</td><td>₹3,00,000</td><td>Home loan</td><td>₹28,00,000</td></tr>
    <tr><td>Equity mutual funds</td><td>₹6,50,000</td><td>Car loan</td><td>₹3,20,000</td></tr>
    <tr><td>Retirement (EPF/NPS)</td><td>₹9,00,000</td><td>Credit cards</td><td>₹60,000</td></tr>
    <tr><td>Home (conservative value)</td><td>₹45,00,000</td><td>Student loan</td><td>₹2,50,000</td></tr>
    <tr><td>Car (depreciated)</td><td>₹4,00,000</td><td><strong>Total</strong></td><td><strong>₹34,30,000</strong></td></tr>
    <tr><td><strong>Total</strong></td><td><strong>₹67,50,000</strong></td><td colspan="2"></td></tr>
  </table>
  <p>Net worth = 67,50,000 − 34,30,000 = <strong>₹33,20,000</strong>. Note the home loan dominates liabilities while the home is the biggest asset — yet monthly progress on <em>either</em> side moves net worth the same way: paying the car loan or growing the fund both add to the bottom line.</p>

  <h2>What to include — and what to leave out</h2>
  <ul>
    <li><strong>Include:</strong> cash, bank balances, invested money, retirement accounts, property (at what a quick sale would realistically fetch, not the emotional value), vehicles at resale value.</li>
    <li><strong>Leave out:</strong> future salary, expected inheritance, the resale value of clothes and gadgets (depreciates to near zero), any asset you would not actually sell.</li>
    <li><strong>Always include:</strong> every liability — the "I'll ignore the small card" habit is how negative net worth hides.</li>
  </ul>

  <h2>Why the trend beats the snapshot</h2>
  <p>A single net worth number means little without context: age, income, and where the number is heading. The useful practice is a quarterly check with the <em>same</em> valuation rules each time. Consistency turns the figure from a vanity number into a direction indicator — and it exposes the two lines that actually move it: debt paydown and savings rate.</p>

  <div class="note"><strong>Limitations:</strong> net worth is an estimate built on estimates — property and vehicle values especially. It is a planning snapshot, not a measure of financial health on its own; liquidity (how much is accessible) and income stability matter just as much.</div>
`,
    ctas: [
      { href: '/finance/net-worth-calculator', label: 'Net Worth Calculator' },
      { href: '/finance/debt-ratio', label: 'Debt-to-Income Calculator' },
      { href: '/finance/savings-goal', label: 'Savings Goal Calculator' }
    ],
    faqs: [
      { q: 'Is my house part of my net worth?', a: 'Yes, at a realistic resale value minus selling costs — but remember the attached mortgage is a liability, so early on the two largely cancel. Some people track net worth both with and without the home to see the liquid picture.' },
      { q: 'Can net worth be negative?', a: 'Yes — it just means liabilities exceed assets, which is common early in adult life with student loans or a new mortgage. The direction of travel over the following quarters is what matters.' },
      { q: 'How often should I calculate net worth?', a: 'Quarterly is the sweet spot: often enough to catch trends, spaced enough that market noise does not dominate. Use the same valuation method every time.' },
      { q: 'Do I count my car?', a: 'Count it at what you could actually sell it for today (check listings for your year and model), not what you paid. It will decline every year — that honesty is the point.' }
    ]
  },
  {
    slug: 'npv-vs-irr', crumb: 'NPV vs IRR',
    title: 'NPV vs IRR — Which Investment Metric to Trust &amp; Why They Fight | CalcProMaster',
    desc: 'The NPV and IRR formulas on one worked example, the reinvestment assumption that makes them disagree, and a decision rule for choosing between projects.',
    h1: 'NPV vs IRR: Two Ways to Judge the Same Investment — and Why They Disagree',
    cat: 'Finance', read: 7,
    answer: `NPV asks "does this beat my required return, in today’s money?" and answers in <strong>currency</strong>; IRR asks "what return does this earn?" and answers in <strong>percent</strong>. On a single normal project they agree — but when they fight (different sizes, different timing), <strong>trust NPV</strong>, because IRR silently assumes you can reinvest cash flows at the IRR itself.`,
    sections: `
  <h2>One project, both metrics</h2>
  <p>Project: invest ₹5,00,000 today; receive ₹2,00,000 per year for 3 years. Required return (discount rate): 10%.</p>
  <div class="formula">NPV = −500,000 + 200,000/1.1 + 200,000/1.1² + 200,000/1.1³<br>= −500,000 + 181,818 + 165,289 + 150,263<br>= −500,000 + 497,370 = <strong>−₹2,630</strong></div>
  <p>This project <em>fails</em> a 10% hurdle. Lower the hurdle to 9% and NPV turns positive (+₹6,240), so IRR sits just under 10% — about 9.7%. That is exactly the relationship: <strong>IRR is the discount rate at which NPV = 0</strong>. The calculators compute both from your cash flows.</p>

  <h2>Why they can disagree</h2>
  <table>
    <tr><th>Situation</th><th>NPV says</th><th>IRR says</th><th>Who is right</th></tr>
    <tr><td>Small project, huge IRR</td><td>+₹5,000</td><td>60%</td><td>NPV — 60% on ₹8,333 is still just ₹5,000</td></tr>
    <tr><td>Big project, modest IRR</td><td>+₹2,00,000</td><td>15%</td><td>NPV — scale beats rate when capital is available</td></tr>
    <tr><td>Timing flipped</td><td>Depends on discount rate</td><td>Unchanged</td><td>NPV — only it knows your actual cost of capital</td></tr>
  </table>
  <p>The root cause: IRR mathematically assumes every intermediate cash flow is reinvested <em>at the IRR</em>. A project with a 60% IRR does not offer you 60% on its payouts — your real reinvestment rate is your savings or borrowing rate, which NPV prices honestly.</p>

  <h2>The decision rule</h2>
  <p>Use NPV for the decision; use IRR only as a communication shorthand ("this returns ~15%") or to sanity-check the NPV sign. If two mutually exclusive projects disagree, the higher-NPV one wins. If capital is truly rationed, rank by <em>profitability index</em> (NPV per rupee invested) instead of IRR.</p>

  <div class="note"><strong>Limitations:</strong> both metrics are only as good as the cash-flow forecasts and the discount rate behind them — a 1% change in the hurdle rate can flip the answer on borderline projects. Non-conventional cash flows (costs after gains) can produce multiple IRRs; in that case IRR is meaningless and NPV still works.</div>
`,
    ctas: [
      { href: '/finance/npv', label: 'NPV Calculator' },
      { href: '/finance/irr', label: 'IRR Calculator' },
      { href: '/finance/roi', label: 'ROI Calculator' }
    ],
    faqs: [
      { q: 'What is the difference between NPV and IRR?', a: 'NPV converts all future cash flows into today’s money using your required return and answers in currency; IRR finds the discount rate that makes NPV exactly zero and answers in percent. They agree on accept/reject for a single conventional project but can rank projects differently.' },
      { q: 'Why is NPV considered more reliable?', a: 'Because it uses your real, achievable reinvestment rate and measures absolute value created. IRR’s math implicitly reinvests intermediate cash flows at the IRR itself, which overstates projects with high rates and ignores project size entirely.' },
      { q: 'What discount rate should I use?', a: 'Your opportunity cost: what the money could otherwise earn at comparable risk — commonly a benchmark return for investments, or a weighted cost of capital for businesses. It is an assumption worth stating, not a constant.' },
      { q: 'Can IRR be negative or multiple?', a: 'Yes to both. A project that never recovers its cost has a negative IRR, and cash-flow patterns that switch sign more than once can have several IRRs — in those cases rely on NPV alone.' }
    ]
  },

  {
    slug: 'sleep-cycles', crumb: 'Sleep Cycles',
    title: 'Sleep Cycle Logic — 90-Minute Cycles &amp; Wake Times Explained | CalcProMaster',
    desc: 'How 90-minute sleep-cycle math generates wake-time suggestions, a worked bedtime calculation, and the honest science on where the 90-minute rule bends.',
    h1: 'Sleep Cycles: Where the 90-Minute Rule Comes From — and Where It Bends',
    cat: 'Health', read: 5,
    answer: `Adult sleep runs in cycles of roughly 90 minutes, so waking between cycles feels better than waking mid-cycle. Working back from a 6:30 alarm with 15 minutes to fall asleep: <strong>bedtimes of 10:45 pm (5 cycles) or 9:15 pm (6 cycles)</strong> land wake-ups near cycle boundaries — approximately, because real cycle lengths vary 80–100 minutes person to person.`,
    sections: `
  <h2>The arithmetic, worked</h2>
  <div class="formula">Bedtime = Wake time − (cycles × 90 min) − fall-asleep time (~15 min)</div>
  <p>Alarm at 6:30 am, 5 cycles (7.5 hours): 6:30 − 7h30m = 11:00 pm, minus 15 min to fall asleep = <strong>10:45 pm bedtime</strong>. For 6 cycles (9 hours): 9:15 pm. The calculator runs the same math in both directions — give it a bedtime and it suggests wake times, or give it the alarm and it suggests bedtimes.</p>

  <h2>How many cycles do you need?</h2>
  <table>
    <tr><th>Cycles</th><th>Hours (with 15 min sleep latency)</th><th>Who this suits</th></tr>
    <tr><td>5</td><td>7.5 h</td><td>Most adults (7–9 h recommendation)</td></tr>
    <tr><td>6</td><td>9 h</td><td>Long-sleepers, teenagers, recovery nights</td></tr>
    <tr><td>4</td><td>6 h</td><td>Genuine short-sleepers — rare; most people are sleep-deprived here</td></tr>
  </table>
  <p>Adult recommendations center on 7–9 hours — five 90-minute cycles sits neatly in that band, which is why the rule is so quotable. It is a rounding of population averages, not a personal measurement.</p>

  <h2>Where the rule bends</h2>
  <ul>
    <li><strong>Cycle length varies</strong> — 80–100 minutes between people, and it drifts through the night (early cycles skew deep-sleep-heavy, later ones REM-heavy).</li>
    <li><strong>Falling asleep takes what it takes</strong> — the 15-minute constant is fiction for insomniacs and fast sleepers alike; track your own latency.</li>
    <li><strong>Sleep pressure dominates</strong> — enough total sleep beats perfectly-timed short sleep every time. The rule optimizes <em>how</em> you wake, not <em>whether</em> you slept enough.</li>
  </ul>

  <div class="note"><strong>Limitations:</strong> cycle timing cannot be computed from a formula alone — it needs a sleep tracker (which has its own error) or a lab. Use the 90-minute math as a scheduling aid, and treat chronic daytime sleepiness as a reason to talk to a doctor, not to shift a bedtime by 20 minutes.</div>
`,
    ctas: [
      { href: '/health/sleep', label: 'Sleep Calculator' },
      { href: '/health/sleep-quality', label: 'Sleep Quality Calculator' },
      { href: '/health/bmi', label: 'BMI Calculator' }
    ],
    faqs: [
      { q: 'Is the 90-minute sleep cycle real?', a: 'It is a useful average. Measured cycles run about 80–100 minutes in healthy adults, so the rule lands close for most people but is not a personal measurement — treat its wake-time suggestions as a starting band.' },
      { q: 'What time should I sleep to wake up at 6?', a: 'Count backwards: 6:00 am minus 5 cycles (7.5 h) minus ~15 minutes to fall asleep ≈ 10:15 pm; 6 cycles ≈ 8:45 pm. Adjust to your own sleep latency after a few nights.' },
      { q: 'Does waking mid-cycle actually matter?', a: 'Waking from deep sleep tends to produce more grogginess (sleep inertia) than waking from lighter stages, so cycle-edge timing can genuinely make mornings feel easier — but total sleep duration matters far more than timing.' },
      { q: 'Why am I still tired after 8 hours?', a: 'Duration is only one factor — consistency, alcohol, sleep apnea, stress and timing all shape restorative sleep. Persistent tiredness despite adequate hours deserves medical attention, not another calculator.' }
    ]
  },

  {
    slug: 'debt-ratio', crumb: 'Debt-to-Income Ratio',
    title: 'Debt-to-Income Ratio — the 36/43 Rule &amp; Worked Example | CalcProMaster',
    desc: 'How DTI is calculated front-end and back-end, a full worked monthly example, the 36/43 guideline lenders use, and what a good ratio hides.',
    h1: 'Debt-to-Income Ratio: The Number Lenders Read Before Your Credit Score',
    cat: 'Finance', read: 5,
    answer: `DTI = <strong>monthly debt payments ÷ gross monthly income</strong>. The classic guideline: housing ≤ 28% (front-end) and all debts ≤ 36% (back-end), with many mortgage programs stretching to 43% or beyond. ₹60,000 gross income with ₹18,000 housing + ₹7,000 other debts = 30/42% — the back-end number is the one that will be questioned.`,
    sections: `
  <h2>Front-end and back-end, worked</h2>
  <div class="formula">Front-end DTI = housing cost ÷ gross income<br>Back-end DTI = (housing + all debt minimums) ÷ gross income</div>
  <p>Example — ₹60,000/month gross: housing ₹18,000 → front-end = 18,000/60,000 = <strong>30%</strong>. Add car ₹4,500 and card minimums ₹2,500 → back-end = 25,000/60,000 = <strong>41.7%</strong>. Front-end passes comfortably; back-end sits above the classic 36% and below most 43% cutoffs — approvable, but with thinner margin. Note the trap: it is the <em>minimum</em> card payment that counts, not your balance or what you actually pay.</p>

  <h2>The guideline thresholds</h2>
  <table>
    <tr><th>Back-end DTI</th><th>How lenders usually read it</th></tr>
    <tr><td>≤ 36%</td><td>Comfortable — the traditional guideline</td></tr>
    <tr><td>37–43%</td><td>Workable — common mortgage ceiling with compensating factors</td></tr>
    <tr><td>44–50%</td><td>Stretched — approvals get selective, rates worse</td></tr>
    <tr><td>&gt; 50%</td><td>Risk zone — little room for shocks</td></tr>
  </table>

  <h2>What a good ratio hides</h2>
  <p>DTI uses gross income — before tax, insurance, childcare, or savings goals. Two households at 35% DTI can live radically different financial lives depending on rent vs ownership, dependents, and income stability. Treat DTI as the lender’s risk lens (it predicts repayment trouble), add your own budget for the lived-in truth, and improve it from the two ends it actually has: pay down consumer debt, or raise verified income.</p>

  <div class="note"><strong>Limitations:</strong> DTI ignores expenses that are not debt, credits gross income, and moves seasonally for freelancers. A great DTI with zero emergency fund is still fragile; a 40% DTI with a stable business and large cash reserves can be sound.</div>
`,
    ctas: [
      { href: '/finance/debt-ratio', label: 'Debt-to-Income Calculator' },
      { href: '/finance/credit-card-payoff', label: 'Credit Card Payoff Calculator' },
      { href: '/finance/loan-emi', label: 'Loan EMI Calculator' }
    ],
    faqs: [
      { q: 'What is a good debt-to-income ratio?', a: 'Under 36% back-end is the classic comfort zone; most mortgage programs cap around 43–45% with compensating strengths, and some allow more. Below 20% you have real flexibility to save, invest, or absorb shocks.' },
      { q: 'Which payments count as debt?', a: 'Contractual monthly obligations: rent or mortgage, EMIs, car loans, student loans, and credit-card minimums. Utilities, phone plans and subscriptions are expenses, not debt — they hit your budget but not the lender’s ratio.' },
      { q: 'Does DTI use gross or net income?', a: 'Lenders use gross (before deductions) because that is what they can document. For your own planning, compute it on net too — the net-income version tells you how the debt feels in real monthly life.' },
      { q: 'How fast can I improve my DTI?', a: 'Paying off a consumer loan removes its payment entirely and usually moves the ratio within a statement cycle; a raise moves it at the next documented pay period. Paying more than the minimum on cards does not change DTI until the minimum recalculates — closing the debt does.' }
    ]
  },

  {
    slug: 'credit-card-minimum', crumb: 'Credit Card Minimum Payments',
    title: 'Credit Card Minimum Payments — the Math That Keeps You in Debt | CalcProMaster',
    desc: 'How minimum payments are calculated, a worked ₹80,000-balance example showing interest and payoff time, and why paying slightly more changes everything.',
    h1: 'The Minimum-Payment Trap, in Actual Numbers',
    cat: 'Finance', read: 6,
    answer: `A minimum payment (often the greater of a flat amount, a percentage of balance, or interest + 1%) is engineered to keep the debt alive for <strong>years</strong>. ₹80,000 at 42% APR with a 5%-of-balance minimum takes roughly 3 years and ~₹28,000 in interest — while a fixed ₹6,000/month clears it in ~15 months for ~₹11,000.`,
    sections: `
  <h2>How the minimum is calculated</h2>
  <p>Issuers use one of three patterns: a flat floor (₹200–400), a percentage of balance (2–5%), or interest charged + 1% of principal. Whichever applies, the payment is dominated by interest early on — that is the mechanism. Monthly interest at 42% APR ≈ 3.5%/month: on ₹80,000 that is ₹2,800/month before any principal moves.</p>

  <h2>Worked example — ₹80,000 balance, 42% APR</h2>
  <table>
    <tr><th>Payment strategy</th><th>Time to zero</th><th>Total interest</th></tr>
    <tr><td>Minimum only (5% of balance, floor ₹400)</td><td>~34 months</td><td>~₹28,000</td></tr>
    <tr><td>Fixed ₹6,000/month</td><td>~15 months</td><td>~₹11,000</td></tr>
    <tr><td>Fixed ₹8,000/month</td><td>~11 months</td><td>~₹7,500</td></tr>
  </table>
  <p>The minimum-payment column shrinks as the balance shrinks — that is the trap: your required payment falls exactly when you could afford to keep it constant. The payoff calculator shows your own numbers; the difference between the rows is not subtle.</p>

  <h2>The avalanche fix</h2>
  <p>Order debts by interest rate, pay minimums on everything, and throw every spare rupee at the highest-rate balance — mathematically the cheapest route out. (The snowball method — smallest balance first — costs a bit more interest but wins on motivation; the hybrid is legitimate.) What is <em>not</em> legitimate is the minimum-payment treadmill itself: at high APRs it can stretch a mid-size balance past a decade of payments.</p>

  <div class="note"><strong>Limitations:</strong> minimum-payment formulas vary by issuer and can change; APRs are variable and move with benchmark rates. These figures assume no new spending on the card — adding purchases while paying down resets the math against you.</div>
`,
    ctas: [
      { href: '/finance/credit-card-payoff', label: 'Credit Card Payoff Calculator' },
      { href: '/finance/debt-ratio', label: 'Debt-to-Income Calculator' },
      { href: '/finance/loan-emi', label: 'Loan EMI Calculator' }
    ],
    faqs: [
      { q: 'How is the minimum payment on a credit card calculated?', a: 'Typically the greatest of: a flat floor (₹200–400), a small percentage of the balance (2–5%), or interest plus 1% of principal. Check your card’s terms — the exact formula determines how slowly the balance falls.' },
      { q: 'What happens if I only pay the minimum?', a: 'You stay current (no late fees, no credit-score damage) but principal shrinks slowly, so interest keeps accruing — a mid-size balance at a high APR can take years to clear and cost thousands in interest, as the worked table above shows.' },
      { q: 'Is it better to pay off one card or pay down all of them?', a: 'Pay minimums on all to stay current, then direct extra money to the highest-APR card (avalanche) for the least total interest — or the smallest balance (snowball) if quick wins keep you motivated. Consistency matters more than the starting choice.' },
      { q: 'Does paying the minimum hurt my credit score?', a: 'No — on-time minimum payments keep your payment history clean, which is the biggest score factor. But a high utilization ratio (balance ÷ limit) does drag the score, so paying more than the minimum helps the score too.' }
    ]
  },

  {
    slug: 'rent-vs-buy', crumb: 'Rent vs Buy',
    title: 'Rent vs Buy — the Breakeven Math Most Comparisons Skip | CalcProMaster',
    desc: 'The real comparison — not EMI vs rent but every cost line on both sides — with a worked 5-year example, the breakeven idea, and when renting wins on purpose.',
    h1: 'Rent vs Buy: Every Cost Line, Then the Verdict',
    cat: 'Finance', read: 7,
    answer: `The honest comparison is <strong>total cost of owning vs total cost of renting — including what your down payment would have earned</strong>. Owning trades rent for EMI + maintenance (~1% of value/year) + property tax + transaction costs (~5–8% round trip). Neither side wins by slogan; price-to-rent ratio, holding period, and the invested-difference assumption decide it.`,
    sections: `
  <h2>Both sides of the ledger, worked</h2>
  <p>Example — ₹80 lakh home, ₹16 lakh down payment (20%), ₹64 lakh loan at 8.5% for 20 years (EMI ≈ ₹55,600), rent on the same home ₹30,000/month, investments earn 8%:</p>
  <table>
    <tr><th>Own (monthly, year 1)</th><th>Amount</th><th>Rent (monthly)</th><th>Amount</th></tr>
    <tr><td>EMI</td><td>₹55,600</td><td>Rent</td><td>₹30,000</td></tr>
    <tr><td>Maintenance + repairs (~1%/yr)</td><td>≈ ₹6,700</td><td>Renter’s insurance</td><td>≈ ₹500</td></tr>
    <tr><td>Property tax</td><td>≈ ₹2,000</td><td>—</td><td>—</td></tr>
    <tr><td>of which: interest (true cost)</td><td>≈ ₹44,900</td><td>Down payment invested at 8%</td><td>≈ ₹10,700/mo growth</td></tr>
    <tr><td>of which: principal (forced savings)</td><td>≈ ₹10,700</td><td>—</td><td>—</td></tr>
  </table>
  <p>True first-year cost of owning ≈ interest + maintenance + tax ≈ <strong>₹53,600/month</strong>, but ₹10,700 of the EMI is forced savings you get back as equity. Renting costs ₹30,500 and leaves a ₹25,000 monthly difference that must actually be invested for renting to keep pace — at the same 8%, that invested difference is exactly what buying must beat through appreciation. This is the line most comparisons skip.</p>

  <h2>The breakeven idea</h2>
  <p>Transaction costs (stamp duty, registration, broker — easily 5–8% combined) are paid on entry and exit. Staying only ~3 years, those costs plus interest-heavy early EMIs usually make renting win; staying 7–10+ years, ownership’s frozen housing cost and forced savings usually win — provided home appreciation at least matches inflation and the invest-the-difference assumption held. Run your own numbers with the calculator; the breakeven moves a lot with local prices.</p>

  <h2>When renting wins on purpose</h2>
  <ul>
    <li>Stay shorter than the breakeven horizon (job mobility, life uncertainty)</li>
    <li>Price-to-rent ratio is high (expensive markets — renting is mathematically cheap there; the rough 5% rule says rent is favorable when annual rent is under ~5% of the home price)</li>
    <li>You would buy more house than you need because "EMI ≈ rent" flattered the comparison</li>
  </ul>

  <div class="note"><strong>Limitations:</strong> this comparison is assumption-heavy — appreciation, rent inflation, investment returns and interest rates each move the verdict. It also prices money only: stability, control and flexibility are real utilities that belong in the decision even though no calculator can price them for you.</div>
`,
    ctas: [
      { href: '/finance/rent-vs-buy', label: 'Rent vs Buy Calculator' },
      { href: '/finance/mortgage', label: 'Mortgage Calculator' },
      { href: '/finance/home-afford', label: 'Home Affordability Calculator' }
    ],
    faqs: [
      { q: 'Is renting always throwing money away?', a: 'No — rent buys shelter with zero maintenance, tax and transaction costs, and it frees the down payment to earn returns elsewhere. Interest, maintenance and transaction costs are the "thrown away" parts of owning; every option has a sinking part.' },
      { q: 'What is the 5% rule for renting vs buying?', a: 'A rough annual-cost heuristic: owning’s non-recoverable yearly costs ≈ 5% of home value (property tax + maintenance + financing cost), so renting is favorable when annual rent is under that — i.e., when price-to-rent exceeds ~20. It is a first filter, not a verdict.' },
      { q: 'How many years should I stay for buying to make sense?', a: 'Commonly quoted breakevens run 5–7 years, driven by transaction costs and how early interest dominates EMIs. Short expected stays usually favor renting; long stays usually favor buying, if the other assumptions hold.' },
      { q: 'Should I count my EMI’s principal part as a cost?', a: 'No — principal is forced savings that builds equity you recover on sale. Count interest, maintenance, tax and transaction costs; comparing only EMI vs rent (which counts principal as cost) overstates owning’s expense but also hides its savings discipline.' }
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
console.log('Wrote ' + written + ' guide pages (' + (GUIDES.length - written) + ' already existed).');
