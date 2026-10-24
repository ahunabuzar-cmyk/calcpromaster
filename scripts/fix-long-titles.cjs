#!/usr/bin/env node
// ============================================================
// CalcProMaster — Shorten over-length SERP titles (≤60 chars)
// ------------------------------------------------------------
// The title-length gate allows 30–60 chars. Real SERP titles are
// truncated around ~600px (≈55–60 Latin chars), so anything past 60
// wastes the tail. This script rewrites ONLY the indexable source
// pages that exceed 60 chars (decoded length, matching the gate):
//   - project/guides/*.html   (guide + guide-hub pages)
//   - project/blog/*.html     (blog posts)
//   - project/embed/index.html, project/geometry-lab.html
//
// It edits <title> and any og:title / twitter:title that mirrored it.
// The <h1> (often already shorter, e.g. the guide hubs) is left alone.
//
// Idempotent: re-running after a fix is a no-op. Fails if any proposed
// title lands outside 30–60.
//
// NOTE: the 16 noindex long-tail variant pages (e.g.
// /finance/mortgage/15-years-300000-california/) keep their longer
// titles on purpose — they are noindex and never appear in the SERP.
//
// Run: node scripts/fix-long-titles.cjs
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MIN = 30, MAX = 60;

// relPath (from project root) -> new decoded title (30–60 chars)
const MAP = {
  // ---- guides (37) ----
  'guides/baby-cost.html': 'Baby Cost Calculator — First-Year Budget & Worked Example',
  'guides/inflation.html': 'How Inflation Is Calculated — CPI & Purchasing Power',
  'guides/percentage.html': 'How to Calculate Percentage — Formula & Examples',
  'guides/science.html': 'Science Guides — Physics & Chemistry Fundamentals',
  'guides/break-even.html': 'Break-Even Analysis — Formula & Margin of Safety',
  'guides/cagr.html': 'CAGR Calculator — Compound Annual Growth Rate',
  'guides/concrete.html': 'How to Calculate Concrete — Slabs, Footings & Bags',
  'guides/everyday.html': 'Everyday Calculations Guides — Dates, Bills & Daily Math',
  'guides/homegarden.html': 'Home & Garden Guides — Rooms, Materials & Sizing',
  'guides/income-tax.html': 'How Income Tax Is Calculated — Brackets & Marginal Rates',
  'guides/passwords.html': 'Password Security — Entropy, Crack Time & Strength',
  'guides/water-intake.html': 'How Much Water Should You Drink — the Real Formula',
  'guides/wedding-budget.html': 'Wedding Budget Planner — Category Splits & Guest Count',
  'guides/ac-size.html': 'AC Size Calculator — BTU, Tonnage & Oversizing Trap',
  'guides/career.html': 'Career & Freelance Guides — Salary, Rates & Negotiation',
  'guides/engineering.html': 'Engineering Guides — Electrical, Mechanical & Structural',
  'guides/ev-vs-petrol.html': 'EV vs Petrol Running Cost — Per-KM Formula & Example',
  'guides/family.html': 'Family & Parenting Guides — Children & Budgets',
  'guides/gst-sales-tax.html': 'GST & Sales Tax Explained — Adding & Removing Tax',
  'guides/regional.html': 'Regional Finance Guides — FD, RD, PPF & SIP (India)',
  'guides/salary.html': 'Gross Salary vs Take-Home Pay — How to Calculate',
  'guides/bmi.html': 'How to Calculate BMI — Formula, Ranges & Meaning',
  'guides/compound-interest.html': 'How to Calculate Compound Interest — Formula & Examples',
  'guides/credit-card-minimum.html': 'Credit Card Minimum Payments — The Debt Math',
  'guides/discount.html': 'How to Calculate a Discount — Percent Off & Stacked',
  'guides/ideal-weight.html': 'Ideal Weight Calculator — Devine Formula & BMI Range',
  'guides/math-statistics.html': 'Math & Statistics Guides — Percentages & Randomness',
  'guides/net-worth.html': 'How to Calculate Net Worth — Assets & Liabilities',
  'guides/npv-vs-irr.html': 'NPV vs IRR — Which Investment Metric to Trust',
  'guides/ohms-law.html': "Ohm's Law Calculator — V = IR Formula & Power",
  'guides/profit-margin.html': 'Profit Margin Calculator — Margin vs Markup',
  'guides/fuel-cost.html': 'Fuel Cost Calculator — Trip Cost & Efficiency',
  'guides/grade-needed.html': 'Grade Needed on Final — The Weighted-Grade Formula',
  'guides/hourly-rate.html': 'Freelance Hourly Rate Calculator — Billable-Hours Formula',
  'guides/retirement.html': 'How Much to Retire — The Retirement Number Explained',
  'guides/screen-time.html': 'Screen Time Calculator — Weekly & Yearly Hours',
  'guides/utilities.html': 'Utilities & Developer Tools Guides — Text & Security',
  // ---- blog (4) ----
  'blog/concrete-patio-math.html': 'The 4-Inch Mistake — Why Concrete Orders Go Wrong',
  'blog/rule-of-72.html': 'The Rule of 72 — Where Doubling-Time Math Bends',
  'blog/ev-vs-petrol-tco.html': 'EV vs Petrol — The 5-Year Math Nobody Finishes',
  'blog/stacked-discounts.html': '"Extra 20% Off" Is Less Than You Think — Stacked Discounts',
  // ---- misc indexable (2) ----
  'embed/index.html': 'Free Calculator Widgets — Embed on Your Website',
  'geometry-lab.html': 'Interactive Geometry Lab — Drag Points & Measure',
};

const decode = (s) => String(s)
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0*39;/g, "'").replace(/&apos;/g, "'")
  .replace(/&#x27;/gi, "'").replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const enc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const encAttr = (s) => enc(s).replace(/"/g, '&quot;');

let changed = 0, skipped = 0;
const problems = [];

for (const [rel, next] of Object.entries(MAP)) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { problems.push(rel + ' :: file missing'); continue; }
  if (next.length < MIN || next.length > MAX) problems.push(rel + ' :: new title len ' + next.length + ' out of ' + MIN + '-' + MAX);

  let s = fs.readFileSync(p, 'utf8');
  const m = s.match(/<title>([\s\S]*?)<\/title>/i);
  if (!m) { problems.push(rel + ' :: no <title>'); continue; }
  const oldDec = decode(m[1]).trim();

  if (oldDec === next) { skipped++; continue; }

  // 1. rewrite <title>
  s = s.replace(/(<title>)[\s\S]*?(<\/title>)/i, (all, a, b) => a + enc(next) + b);
  // 2. rewrite og:title / twitter:title that mirrored the old title exactly
  s = s.replace(/<meta[^>]*(?:og:title|twitter:title)[^>]*>/gi, (tag) =>
    tag.replace(/content="([^"]*)"/i, (mm, c) => decode(c).trim() === oldDec ? 'content="' + encAttr(next) + '"' : mm));

  fs.writeFileSync(p, s, 'utf8');
  changed++;
  console.log(String(oldDec.length).padStart(2) + ' -> ' + String(next.length).padStart(2) + '  ' + rel + '  :: ' + next);
}

console.log('\nchanged: ' + changed + '   already-ok: ' + skipped + '   total in map: ' + Object.keys(MAP).length);
if (problems.length) { console.error('\nPROBLEMS:'); problems.forEach((x) => console.error('  ' + x)); process.exit(1); }
console.log('OK');
