#!/usr/bin/env node
// Fix 45 truncated "placeholder" titles in js/seo/*.js — e.g. "Area Converter: Value"
// (generator template artifact: the input-label placeholder leaked into the title).
// Idempotent: exact-match replacements; exits 1 if any replacement count != 1.
const fs = require('fs');
const path = require('path');

const SEO_DIR = path.join(__dirname, '..', 'js', 'seo');

const REPLACEMENTS = {
  // career.js
  'Salary Converter: Amount': 'Salary Converter: Annual to Hourly Pay',
  // conversion.js (25)
  'Weight Converter: Value': 'Weight Converter: kg to lbs & More',
  'Volume Converter: Value': 'Volume Converter: Liters to Gallons',
  'Area Converter: Value': 'Area Converter: sqm to sqft & Acres',
  'Speed Converter: Value': 'Speed Converter: km/h to mph',
  'Data Storage Converter: Value': 'Data Storage Converter: GB to MB & TB',
  'Angle Converter: Value': 'Angle Converter: Degrees to Radians',
  'Energy Converter: Value': 'Energy Converter: Joules to Calories',
  'Pressure Converter: Value': 'Pressure Converter: Bar to PSI & Pa',
  'Time Converter: Value': 'Time Converter: Hours, Days & Weeks',
  'Force Converter: Value': 'Force Converter: Newtons to kgf',
  'Fuel Efficiency Converter: Value': 'Fuel Efficiency: MPG to L/100km',
  'Cooking Measurement Converter: Amount': 'Cooking Measurement Converter: Cups to Grams',
  'Currency Converter (Fixed Rate): Amount': 'Currency Converter (Fixed Rate)',
  'Electrical Unit Converter: Value': 'Electrical Unit Converter: V, A, W',
  'Radiation Converter: Value': 'Radiation Converter: Sv, Gy & rem',
  'Bit Rate Converter: Value': 'Bit Rate Converter: Mbps to MB/s',
  'Luminance Converter: Value': 'Luminance Converter: cd/m² & lux',
  'Molarity Converter: Value': 'Molarity Converter: mol/L Calculator',
  'Flow Rate Converter: Value': 'Flow Rate Converter: L/min to GPM',
  'Paper Size Converter: Number': 'Paper Size Converter: A4 to Letter',
  'Roman Numeral Converter: Value': 'Roman Numeral Converter: 1–3999',
  'PPM / Concentration Converter: Value': 'PPM Converter: mg/L & Concentration',
  'Thermal Conductivity Converter: Value': 'Thermal Conductivity Converter',
  'Radiation Dose Converter: Value': 'Radiation Dose Converter: Gy & rad',
  'Acceleration Converter: Value': 'Acceleration Converter: m/s² & g',
  // education.js
  'GPA Calculator: Grades': 'GPA Calculator: Grades to 4.0 Scale',
  // engineering.js
  'RPM Calculator: Frequency': 'RPM Calculator: Speed to Frequency',
  'Concrete Mix Design: Volume': 'Concrete Mix Design: 1:2:4 Ratio',
  // everyday.js
  'Cooking Converter: Amount': 'Cooking Converter: Cups, Tbsp & mL',
  'ISO Week Number Calculator: Date': 'ISO Week Number Calculator',
  'Moon Phase Calculator: Date': 'Moon Phase Calculator: Tonight',
  // family.js
  'Baby Sleep Schedule: Age': 'Baby Sleep Schedule by Age',
  // fitness.js
  'Max Heart Rate Calculator: Age': 'Max Heart Rate Calculator (220−age)',
  'Stride Length Calculator: Height': 'Stride Length Calculator by Height',
  // food.js
  'Daily Protein Need: Weight': 'Daily Protein Need by Weight',
  'Vegan Protein Sources: Weight': 'Vegan Protein Sources & Amounts',
  'Meat Cooking Time: Weight': 'Meat Cooking Time by Weight',
  // health.js
  'Heart Rate Zone Calculator: Age': 'Heart Rate Zone Calculator by Age',
  'Iron Intake Calculator: Age': 'Iron Intake Calculator by Age & Sex',
  'MAF Heart Rate (Aerobic Base): Age': 'MAF Heart Rate (180 Formula)',
  'Maintenance Fluids Calculator (4-2-1): Weight': 'Maintenance Fluids Calculator (4-2-1)',
  // math.js
  'Prime Factorization: Number': 'Prime Factorization Calculator',
  'Scientific Notation Converter: Number': 'Scientific Notation Converter',
  'Significant Figures: Number': 'Significant Figures Calculator',
  'Digital Root Calculator: Number': 'Digital Root Calculator',
  // regional.js
  'National Pension System (NPS) Calculator: Current': 'NPS Calculator: Pension Projection',
  'GST Calculator India: Amount': 'GST Calculator India: CGST & SGST',
  'UAE VAT Calculator: Amount': 'UAE VAT Calculator: 5% VAT',
  // science.js
  'Speed of Sound: Temperature': 'Speed of Sound by Temperature',
  'Latent Heat Calculator: Mass': 'Latent Heat Calculator: Fusion & Vapor',
  // tech.js
  'Cable Length Calculator: Distance': 'Cable Length Calculator: Drop Limit',
  'dBm ↔ Watts Converter: Value': 'dBm to Watts Converter',
  // utilities.js
  'Password Generator: Length': 'Password Generator & Strength',
  'Universal Unit Converter: Value': 'Universal Unit Converter',
};

const files = fs.readdirSync(SEO_DIR).filter((f) => f.endsWith('.js'));
let applied = 0, failed = [];

for (const f of files) {
  const p = path.join(SEO_DIR, f);
  let s = fs.readFileSync(p, 'utf8');
  let changed = false;
  for (const [from, to] of Object.entries(REPLACEMENTS)) {
    // Escape regex specials, then replace "title":"<from>" occurrences (1 expected)
    const re = new RegExp('("title":")' + from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(")', 'g');
    const n = (s.match(re) || []).length;
    if (n === 0) continue; // already fixed (idempotent) or file without it
    if (n > 1) { failed.push(f + ' :: "' + from + '" found ' + n + ' times'); continue; }
    s = s.replace(re, '$1' + to.replace(/\$/g, '$$$$') + '$2');
    applied++;
    changed = true;
  }
  if (changed) fs.writeFileSync(p, s, 'utf8');
}

// Verify: no junk tails remain anywhere
const JUNK = /:\s*(Value|Amount|Age|Grades|Name|Date|Number|Time|Cost|Rate|Weight|Height|Length|Temperature|Price|Score|Hours|Years|Percent|Income|Volume|Area|Speed|Power|Pressure|Frequency|Energy|Mass|Density|Flow|Torque|Force|Voltage|Current|Resistance|Capacitance|Fuel|Calories|Protein|Carbs|Fat|Water|Sleep|Screen|Steps|Distance|Pace|Current)$/i;
let remaining = 0;
for (const f of files) {
  const s = fs.readFileSync(path.join(SEO_DIR, f), 'utf8');
  for (const m of s.matchAll(/"title":"([^"]+)"/g)) {
    if (JUNK.test(m[1])) { remaining++; console.error('  STILL JUNK: ' + f + ' :: ' + m[1]); }
  }
}

console.log('applied: ' + applied + ' replacements across ' + files.length + ' files');
console.log('junk titles remaining: ' + remaining);
if (failed.length) { console.error('FAILED (multi-match):'); failed.forEach((x) => console.error('  ' + x)); process.exit(1); }
if (remaining > 0) process.exit(1);
console.log('OK');
