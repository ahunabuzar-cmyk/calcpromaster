#!/usr/bin/env node
/* Weak-title fixer — rewrites the 40 worst topical-mapping titles from
 * input-label style ("CAGR Calculator: Beginning Value, Ending Value & Years")
 * to keyword-bearing style ("CAGR Calculator — Compound Annual Growth Rate").
 *
 * Idempotent: skips IDs already using the new title. Guards: ≤60 chars,
 * unique titles after rewrite, no dangling connectors.
 * Run: node scripts/fix-weak-titles.cjs && node scripts/split-seo.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'js', 'seo-content.js');
let src = fs.readFileSync(FILE, 'utf8');

// id -> new title (all ≤60 chars, manually crafted to carry the kw core nouns
// without keyword stuffing; input-specific labels move to desc/FAQ where they belong)
const TITLES = {
  'density-conv': 'Density Converter — kg/m³ to g/cm³ & More Units',
  'investment-growth': 'Investment Growth Calculator: CAGR + Monthly Contributions',
  'bmr': 'BMR Calculator — Basal Metabolic Rate & Daily Burn',
  'lcm-gcd': 'LCM & GCD Calculator — Greatest Common Divisor Steps',
  'salary': 'Salary Calculator — Hourly to Net Pay With Deductions',
  'cagr': 'CAGR Calculator — Compound Annual Growth Rate',
  'wacc': 'WACC Calculator — Weighted Average Cost of Capital',
  'apy-calculator': 'APY Calculator — Annual Percentage Yield & Compound',
  'pmi-calculator': 'PMI Calculator — Private Mortgage Insurance Monthly',
  'home-afford': 'Home Affordability Calculator — How Much House Can I Afford',
  'pf-ratio': 'P/F Ratio Calculator — PaO₂/FiO₂ Oxygenation & ARDS',
  'length': 'Length Converter — Meters to Feet & Inches',
  'npv': 'NPV Calculator — Net Present Value of Cash Flows',
  'tdee-macro': 'TDEE & Macro Calculator — Protein, Carb & Fat Split',
  'ppf-calculator': 'PPF Calculator — Public Provident Fund Returns',
  'macros': 'Macro Calculator — Protein, Carb & Fat for Lean Bulk',
  'concrete-slab': 'Concrete Slab Calculator — Volume, Bags & Cubic Yards',
  'mortgage': 'Mortgage Calculator — Payment With PMI & Taxes',
  'compound-interest': 'Compound Interest Calculator — Monthly Contribution',
  'currency-converter': 'Currency Converter — USD to PKR Exchange Rates',
  'linear-regression': 'Linear Regression Calculator — Slope, Intercept & R²',
  'quartiles': 'Quartile Calculator — Q1 Q3 & Interquartile Range (IQR)',
  'docker-resource': 'Container Density Calculator — Docker RAM, CPU & Pods',
  'conversion-funnel': 'Conversion Funnel Calculator — Step Drop-Off Rates',
  'timesheet-hours': 'Timesheet Decimal Hours Calculator — HH:MM to Payroll',
  'escrow-analysis': 'Escrow Calculator — Property Tax, Insurance & Cushion',
  'angular-velocity': 'Angular Velocity Calculator — RPM to Rad/s',
  'cargo-volume': 'Cargo Volume Calculator — Trunk & Van Cubic Feet',
  'cgpa': 'CGPA to Percentage Calculator — Semester GPAs',
  'retirement': 'Retirement Calculator — Savings With Monthly Contribution',
  'rent-increase': 'Rent Increase Calculator — Percentage & Annual Raise',
  'auto-lease-vs-buy': 'Lease vs Buy Calculator — Car Total Cost Comparison',
  'portfolio-beta': 'Portfolio Beta Calculator — Weighted Market Sensitivity',
  'candle-wax': 'Candle Wax Calculator — Jars, Ounces & Soy Batch',
  'winters-formula': "Winter's Formula Calculator — PCO₂ Compensation",
  'sigma-notation': 'Sum of Squares Calculator — Sigma Notation & Series',
  'circle-through-points': 'Circumradius & Circumcircle Calculator for Triangles',
  'gravel-driveway': 'Gravel Driveway Calculator — Tons & Cubic Yards',
  'royalty-payment': 'Royalty Calculator — Percentage of Sales & Licensing',
  'apr-annual': 'Loan APR Calculator — True Cost With Fees & Points',
  'diaper-needs': 'Diaper Calculator — Daily Cost & Newborn Stock',
  'sip-step-up': 'Step-Up SIP Calculator — Annual Increase Percent',
  'eat-out-vs-cook': 'Eat Out vs Cook Calculator — Which Saves More?',
};

let changed = 0, skipped = 0, missing = 0;
const seen = new Map();

for (const [id, newTitle] of Object.entries(TITLES)) {
  if (newTitle.length > 60) { console.error('TOO LONG (>60):', id, newTitle.length); process.exit(1); }
  if (seen.has(newTitle)) { console.error('DUPLICATE within map:', newTitle); process.exit(1); }
  seen.set(newTitle, id);

  // Match the record's opening: '<id>': {"title":"...","metaDesc":...
  const re = new RegExp("('" + id.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + "'\\s*:\\s*\\{\"title\":\")(.*?)(\",\\s*\"metaDesc\")");
  const m = re.exec(src);
  if (!m) { console.error('NOT FOUND:', id); missing++; continue; }
  if (m[2] === newTitle) { skipped++; continue; }
  src = src.slice(0, m.index) + m[1] + newTitle + m[3] + src.slice(m.index + m[0].length);
  changed++;
}

// Uniqueness guard across the WHOLE file after edits
const allTitles = [...src.matchAll(/\{"title":"(.*?)","metaDesc"/g)].map((m) => m[1]);
const dupes = allTitles.filter((t, i) => allTitles.indexOf(t) !== i);
if (dupes.length) { console.error('DUPLICATE TITLES after edit:', [...new Set(dupes)].slice(0, 5)); process.exit(1); }

fs.writeFileSync(FILE, src);
console.log('changed:', changed, '| already-ok:', skipped, '| missing:', missing, '| total titles:', allTitles.length);
