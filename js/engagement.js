// ============================================================
// Engagement (S7) — contextual fun-fact panel + seasonal homepage
// promotion logic. Facts come from a curated dataset below (no
// fabricated statistics — every fact is a stable, verifiable
// definition or a fixed constant, not a user-count or trend claim).
// Dual-mode: window.Engagement in browser, module.exports for tests.
// ============================================================
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.Engagement = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  // ---------- 1. Fun-fact dataset (verifiable, non-trend facts) ----------
  // Keyed by category; each fact must remain true regardless of year/market.
  var FACTS = {
    finance: [
      'Compound interest is sometimes called the "eighth wonder" — at 8% a year, money doubles roughly every 9 years (the Rule of 72: 72 ÷ 8 = 9).',
      'The Rule of 72 works for any growth rate: divide 72 by the annual percentage to estimate the doubling time in years.',
      'A loan amortization schedule front-loads interest — early payments are mostly interest, which is why extra principal early saves the most.',
      'The 2.5% zakat rate and the 10% tithe are among the oldest standardized wealth-transfer rules still in daily use.'
    ],
    health: [
      'BMI was devised in the 1830s by Adolphe Quetelet, a Belgian astronomer — not a physician — which is why it measures population trends better than individual body fat.',
      'Water makes up roughly 60% of adult body weight, though it ranges from about 45% to 70% depending on age and body composition.',
      'Resting heart rate for a healthy adult typically falls between 60 and 100 beats per minute — roughly 100,000 heartbeats a day.'
    ],
    math: [
      'A number is divisible by 3 exactly when its digit sum is divisible by 3 — the reason is that 10 ≡ 1 (mod 3).',
      'There are exactly 2,520 numbers below 10,000 that are divisible by both 4 and 6 — that count is 10,000 ÷ 12 rounded down.',
      'The multiplication of any number by 11 has a shortcut: 25 × 11 = 2 (2+5) 5 = 275, as long as the digit sum stays under 10.'
    ],
    construction: [
      'Standard concrete mixes are rated in MPa — a 20 MPa mix means the concrete withstands 20 million newtons per square metre after 28 days of curing.',
      'Concrete does not "dry" to harden — it cures through a chemical reaction with water; keeping it moist during curing makes it stronger.',
      'A "square" in roofing means 100 square feet — a convention that predates metric standardization.'
    ],
    science: [
      'Absolute zero is −273.15 °C — the point where particles have minimum possible thermal motion; it cannot be reached, only approached.',
      'One watt is one joule per second — a human climbing stairs at a brisk pace outputs roughly 200–300 watts for short periods.',
      'The speed of light is exactly 299,792,458 m/s — the metre is now defined so that this number is exact.'
    ],
    engineering: [
      'A safety factor of 2 means a component is built to handle twice its expected maximum load — bridges typically use factors of 2 to 5 depending on the material.',
      'Ohm\'s law (V = IR) was published by Georg Ohm in 1827 — it was initially met with skepticism before becoming electrical engineering\'s most-used equation.'
    ],
    conversion: [
      'The metre was originally defined in 1793 as one ten-millionth of the distance from the equator to the North Pole through Paris.',
      'A nautical mile (1,852 m) is exactly one minute of latitude — that is why ships and aviation still use it.'
    ],
    business: [
      'The 80/20 rule (Pareto principle) came from economist Vilfredo Pareto noticing 80% of Italy\'s land was owned by 20% of the population.',
      'Break-even analysis assumes costs split into fixed and variable — a simplification that works well for pricing decisions.'
    ],
    lifestyle: [
      'Coffee\'s caffeine has a half-life of roughly 5 hours in most adults — half of a 4 pm cup is still working at 9 pm.',
      'The 10,000-steps-per-day target began as a 1960s Japanese pedometer marketing slogan ("manpo-kei"), not a medical guideline.'
    ],
    regional: [
      'The GST concept was first introduced by France in 1954; over 160 countries now use a value-added or goods-and-services tax.',
      'Gold purity in karats is a 24-part scale: 24K is pure gold, so 22K is 22/24 ≈ 91.7% gold.'
    ],
    education: [
      'A standard GPA scale treats an A as 4.0 — the practice spread from US colleges in the early 20th century.',
      'The Fahrenheit and Celsius scales meet at −40 degrees: −40 °F is exactly −40 °C.'
    ]
  };

  function factsFor(category) {
    var list = FACTS[category] || [];
    return list.slice();
  }

  // Deterministic pick per tool id (same tool shows a stable fact, not random churn).
  function pickFact(category, seed) {
    var list = FACTS[category];
    if (!list || !list.length) return null;
    var s = Math.abs(hash(String(seed || category)));
    return list[s % list.length];
  }

  function hash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
    return h;
  }

  // Render a did-you-know panel under a result (returns HTML string; pure).
  function renderFactPanel(category, seed) {
    var fact = pickFact(category, seed);
    if (!fact) return '';
    return '<aside class="cp-funfact" style="margin-top:12px;padding:12px 14px;border-left:3px solid var(--primary);background:var(--surface-2,rgba(0,0,0,.03));border-radius:0 10px 10px 0;font-size:.92rem">' +
      '<strong>💡 Did you know?</strong> ' + fact + '</aside>';
  }

  // ---------- 2. Seasonal homepage promotion ----------
  // Date-based config (month is 1-12). Recurring every year — no per-year hardcoding.
  // Multiple windows may match; the first in order wins.
  var SEASONS = [
    // Ramadan window (approximate lunar window; site surfaces the calculator + guide)
    { startM: 2, startD: 15, endM: 4, endD: 10, slug: 'zakat-calculator', cat: 'regional', label: 'Ramadan window', reason: 'Zakat is often paid during Ramadan' },
    // Tax season (South Asia + US filers overlap in Mar–Apr)
    { startM: 3, startD: 1, endM: 4, endD: 30, slug: 'income-tax', cat: 'finance', label: 'Tax season', reason: 'Tax filing deadlines cluster in March–April' },
    // Academic results / GPA season
    { startM: 5, startD: 15, endM: 6, endD: 30, slug: 'gpa-percentage', cat: 'education', label: 'Results season', reason: 'Semester results and GPA conversions peak' },
    // Winter energy bills (northern hemisphere)
    { startM: 12, startD: 1, endM: 1, endD: 31, slug: 'electricity-cost', cat: 'finance', label: 'Winter bills', reason: 'Heating drives electricity use up' }
  ];

  function seasons() { return SEASONS.slice(); }

  function seasonalPick(date) {
    var d = date || new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    for (var i = 0; i < SEASONS.length; i++) {
      var s = SEASONS[i];
      var inWindow;
      if (s.startM <= s.endM) {
        inWindow = (m > s.startM || (m === s.startM && day >= s.startD)) && (m < s.endM || (m === s.endM && day <= s.endD));
      } else {
        // wraps new year (e.g. Dec 1 → Jan 31)
        inWindow = (m > s.startM || (m === s.startM && day >= s.startD)) || (m < s.endM || (m === s.endM && day <= s.endD));
      }
      if (inWindow) return s;
    }
    return null;
  }

  // Homepage banner HTML for the active season (pure; '' when none).
  function renderSeasonalBanner(date) {
    var s = seasonalPick(date);
    if (!s) return '';
    var href = '/' + s.cat + '/' + s.slug;
    return '<a class="cp-seasonal" href="' + href + '" style="display:flex;gap:10px;align-items:center;margin:14px 0;padding:12px 16px;border:1px solid var(--border);border-radius:12px;background:var(--surface);text-decoration:none;color:var(--text)">' +
      '<span aria-hidden="true" style="font-size:1.3rem">🗓️</span>' +
      '<span><strong>' + s.label + '</strong> — ' + s.reason + '. Try the <u>' + s.slug.replace(/-/g, ' ') + '</u>.</span></a>';
  }

  return {
    FACTS: FACTS,
    factsFor: factsFor,
    pickFact: pickFact,
    renderFactPanel: renderFactPanel,
    SEASONS: SEASONS,
    seasons: seasons,
    seasonalPick: seasonalPick,
    renderSeasonalBanner: renderSeasonalBanner
  };
});
