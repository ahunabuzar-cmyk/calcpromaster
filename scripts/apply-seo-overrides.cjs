#!/usr/bin/env node
// ============================================================
// CalcProMaster — Apply SEO overrides + repair generated copy
// ------------------------------------------------------------
// Why this exists
// ---------------
// The 28-day GSC query→page join (data/gsc-query-page.json) showed
// pages sitting on page 1 (position 5-10) with ZERO clicks, and the
// cause is visible in the generated copy itself: the snippet engine
// emitted broken, template-shaped English such as
//
//   "Free Child Height Predictor: enter the Father and Mother and get
//    a predict adult height of 175 cm (69 in)."
//   "Free Tuition Cost Calculator: ... get a total cost degree of $64,000."
//   "What does the undefined do?"          ← placeholder never filled
//
// Nobody clicks those. This script does two things:
//
//   1. UNDEFINED REPAIR — the placeholder bug leaked "the undefined"
//      into 175 sentences (aeo blocks + FAQ questions). The five shapes
//      are fixed to well-formed English, name-free, so the fix is
//      context-independent and cannot mislabel a tool.
//   2. CTR OVERRIDES — hand-written title, meta description and
//      answer-first opening for the pages that have real impressions
//      but no clicks. Every number in the new copy is computed from
//      that tool's own formula (documented per entry below), never
//      invented, and every override is written against the query that
//      the GSC join says actually brings the impressions.
//
// Writes js/seo-content.js surgically (value-by-value string replace,
// so the 8 MB generated file keeps its formatting). Run
// `node scripts/split-seo.cjs` afterwards to refresh js/seo/*.js.
//
// Usage: node scripts/apply-seo-overrides.cjs [--check]
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'js', 'seo-content.js');
const CHECK = process.argv.includes('--check');

// ---------- 1. placeholder repair (all five shapes, name-free) ----------
// Every rule must PRESERVE the FAQ question shape it rewrites, because
// tests/unit/seo-qa.test.js requires each tool to keep its metric / inputs /
// result / free questions ("How is the ...", "What do I need to use ...",
// "What does the result from ...", "... really free?"). Making these
// name-free shapes ("What does the result show?") reads fine but breaks that
// contract, so the placeholder is replaced in place instead.
const UNDEFINED_FIXES = [
  [/What does the undefined do\?/g, 'What does this calculator do?'],
  [/How is the undefined calculated\?/g, 'How is the result calculated?'],
  [/What do I need to use the undefined\?/g, 'What do I need to use it?'],
  [/What does the result from the undefined show\?/g, 'What does the result from this calculator show?'],
  [/Is the undefined really free\?/g, 'Is it really free?'],
  [/the undefined/g, 'this calculator']
];

// The first pass of this repair (before the QA contract was accounted for)
// flattened the result question to a name-free shape. 35 of 1,282 tools took
// that route while 1,247 kept "What does the result from X show?", and
// tests/unit/seo-qa.test.js requires the "from" shape on every tool — so the
// already-shipped short shape is restored here. Matching the JSON question key
// exactly keeps this off body copy that merely mentions the phrase.
const SHAPE_RESTORES = [
  ['"q":"What does the result show?"', '"q":"What does the result from this calculator show?"'],
  // 698 of 1,282 tools ask the reader about "the tool" — the same placeholder
  // species as "the undefined", just from a different generator pass. The rest
  // of the site says "this calculator", so the questions are normalised to match
  // while keeping the shapes tests/unit/seo-qa.test.js requires.
  ['What does the tool calculate?', 'What does this calculator do?'],
  ['What does the result from the tool mean?', 'What does the result from this calculator mean?'],
  // 675 of 1,282 tools — the single largest placeholder class on the site, and
  // one uniform shape: the AEO heading asked about "the page calculator".
  ['<h2>What does the page calculator do?</h2>', '<h2>What does this calculator do?</h2>']
];

function repairUndefined(text) {
  let out = text;
  for (const [re, to] of UNDEFINED_FIXES) out = out.replace(re, to);
  for (const [from, to] of SHAPE_RESTORES) out = out.split(from).join(to);
  return out;
}

// ---------- 2. CTR overrides ----------
// Each entry: title, metaDesc, and the answer-first block (heading + lead +
// quick answer). Numbers in `quickAnswer` are computed from the tool's own
// calc function, noted in the comment above each entry. The query that drives
// the page's impressions (from data/query-opportunity.json) is quoted too.
const CTR_OVERRIDES = {
  // ------------------------------------------------------------------
  // Unit-conversion pages (Q3: their target phrase shared no word with the
  // tool name, and the generated copy described the *result* using a raw unit
  // string — "works out the between length", "returns the time units",
  // "shows the cannot directly convert"). Every number below is the tool's own
  // conversion at its own default input, taken from js/data/conversion.js.
  // ------------------------------------------------------------------
  // 1 m -> 3.2808 ft. Phrase: "meters to feet and inches converter".
  'length': {
    title: 'Length Converter: Meters to Feet and Inches',
    metaDesc: 'Convert between metres, feet, inches, centimetres and kilometres. 1 metre is 3.2808 feet, and every step of the conversion is shown.',
    heading: 'Meters to feet and inches, and back',
    lead: 'A length conversion is one multiplication by a fixed factor, and the factors are definitions rather than approximations: 1 metre is 3.28084 feet, 1 foot is 12 inches and 1 inch is 2.54 centimetres. Keep one unit throughout and convert once at the end, because converting back and forth is where rounding drift creeps in.',
    quickAnswer: '1 metre converts to 3.2808 feet, which is 3 feet 3.4 inches. Going the other way, 1 foot is 0.3048 metres, so 10 feet is 3.048 m and 100 cm is just over 39 inches.',
    aeoFixes: [
      ['the between length, plus the intermediate steps behind it.', 'the length in the unit you selected, with the conversion factor and the steps behind it.'],
      ['Length Converter computes the between length directly from your inputs — the Value feed the formula.', 'Length Converter converts directly from your input — the value and the two units you pick feed the formula.'],
      // LSI tag, then long-form desc + FAQ answers (which reuse the same label).
      ['between length formula', 'length conversion formula'],
      ['between length', 'converted length']
    ]
  },
  // 1 bar -> 14.5038 psi. Phrase: "pascal bar psi".
  'pressure-conv': {
    title: 'Pressure Converter: Pascal, Bar, PSI and kPa',
    metaDesc: 'Convert pressure between pascal, bar, psi, kPa and atmosphere. 1 bar is 14.5038 psi and 1 psi is 6.895 kPa, with the working shown.',
    heading: 'Pascal, bar and psi in one converter',
    lead: 'Pressure units come from different measurement systems, so a conversion is one fixed factor: 1 bar is 100,000 pascal, 1 psi is 6,894.76 pascal, and the standard atmosphere is 101,325 pascal. Bar and psi are the two you meet most often — tyre pressure is quoted in psi, while gas and weather pressure come in bar or millibar.',
    quickAnswer: '1 bar converts to 14.5038 psi and 100,000 pascal, which is 100 kPa. The reverse is 32 psi ≈ 2.21 bar. Gauge pressure and absolute pressure differ by one atmosphere, so check which one the figure means.',
    aeoFixes: [
      ['the between pressure, plus the intermediate steps behind it.', 'the pressure in the unit you selected, with the factor and the steps behind it.'],
      ['Pressure Converter computes the between pressure directly from your inputs — the Value feed the formula.', 'Pressure Converter converts directly from your input — the value and the two units you pick feed the formula.'],
      ['between pressure formula', 'pressure conversion formula'],
      ['between pressure', 'converted pressure']
    ]
  },
  // 100 °C -> 212 °F, 373.15 K. Phrases: "celsius to fahrenheit", "temp conversion", "kelvin converter".
  'temperature': {
    title: 'Celsius to Fahrenheit Converter (and Kelvin)',
    metaDesc: 'Convert Celsius to Fahrenheit and Kelvin, and back. 100 °C is 212 °F and 0 °C is 273.15 K, with the offset and the factor explained.',
    heading: 'Celsius to Fahrenheit, Fahrenheit to Celsius, and Kelvin',
    lead: 'Temperature scales need an offset as well as a factor, which is why temperature conversion catches people out where other units do not. Celsius to Fahrenheit is °C × 9/5 + 32, and Fahrenheit to Celsius reverses it: (°F − 32) × 5/9. Kelvin takes the Celsius value and adds 273.15, because zero Kelvin is absolute zero rather than the freezing point of water.',
    quickAnswer: '100 °C converts to 212 °F, because 100 × 9/5 is 180 and 180 + 32 is 212. The same 100 °C is 373.15 K. Water freezes at 0 °C, 32 °F and 273.15 K, which is the fastest way to check any conversion.',
    aeoFixes: [
      ['the between celsius, plus the intermediate steps behind it.', 'the temperature in the scale you selected, with the formula behind it.'],
      ['Temperature Converter computes the between celsius directly from your inputs — the Temperature Value feed the formula.', 'Temperature Converter converts directly from your input — the temperature and the two scales you pick feed the formula.'],
      ['between celsius formula', 'celsius to fahrenheit formula'],
      ['between celsius', 'converted temperature']
    ]
  },
  // 3,600 s -> 1 h. Phrase: "hours minutes seconds".
  'time-conv': {
    title: 'Time Converter: Hours, Minutes and Seconds',
    metaDesc: 'Convert between seconds, minutes, hours and days. 3,600 seconds is 1 hour and 90 minutes is 1.5 hours, with each step of the working shown.',
    heading: 'Hours, minutes and seconds, converted',
    lead: 'Time units are all multiples of 60 or 24, so a conversion is one division or multiplication by a fixed factor: 60 seconds in a minute, 60 minutes in an hour and 24 hours in a day. The usual mistake is the direction of the factor, so decide the target unit before you start.',
    quickAnswer: '3,600 seconds is 1 hour, and 90 minutes is 1.5 hours or 5,400 seconds. Two days is 48 hours, which is 172,800 seconds — the factors are exact, so only the displayed rounding changes the figure.',
    aeoFixes: [
      ['the time units.', 'the duration in the unit you selected.'],
      ['Time Converter computes the time units directly from your inputs — the Value feed the formula.', 'Time Converter converts directly from your input — the duration and the two units you pick feed the formula.'],
      ['time units formula', 'time conversion formula'],
      ['the time units', 'the converted time']
    ]
  },
  // 1 cup -> 240 ml. Phrases: "cups to ml", "tbsp to tsp".
  'cooking-conv': {
    title: 'Cups to ml and tbsp to tsp: Cooking Converter',
    metaDesc: 'Convert cups to millilitres, tablespoons to teaspoons and ounces to grams. 1 US cup is about 240 ml and 1 tbsp is exactly 3 tsp.',
    heading: 'Cups to ml, tbsp to tsp, and the rest',
    lead: 'Cooking conversions are not all exact. A tablespoon is exactly 3 teaspoons, but a US cup is 236.6 ml by definition and is rounded to 240 ml in most recipes, while a metric cup is 250 ml. Volume also only converts cleanly for liquids and pourable solids, because a cup of flour and a cup of sugar weigh different amounts.',
    quickAnswer: '1 US cup is about 240 ml, 1 tablespoon is 15 ml and 1 teaspoon is 5 ml, so 1 tbsp is exactly 3 tsp. A UK or Australian tablespoon is 20 ml instead — for anything precise, weigh the ingredient in grams.',
    aeoFixes: [
      ['the cooking measurements.', 'the measurement in the unit you selected.'],
      ['Cooking Measurement Converter computes the cooking measurements directly from your inputs — the Amount feed the formula.', 'Cooking Measurement Converter converts directly from your input — the amount and the two units you pick feed the formula.'],
      ['cooking measurements formula', 'cooking conversion formula'],
      ['the cooking measurements', 'the converted measurement']
    ]
  },
  // US women's 10 -> EU 40. Phrase: "US to EU".
  'clothing-size': {
    title: 'Clothing Size Converter: US to EU, UK and IT',
    metaDesc: "Convert clothing sizes between US, EU, UK and international equivalents — a US women's 10 is about EU 40, with the comparison in one place.",
    heading: 'US to EU clothing sizes, and back',
    lead: "Clothing sizes are not a numeric conversion: each system numbers the same body differently, and women's and men's ranges use separate scales. A US women's 10 maps to roughly EU 40 and UK 12, so the useful output is a comparison row rather than a formula. Brand charts differ, especially between US and Italian sizing.",
    quickAnswer: "A US women's size 10 is about EU 40, UK 12 and IT 44. Men's sizing runs on a different scale: a 40 inch chest is around EU 50. Check the specific brand's chart before ordering, because sizing varies between labels.",
    aeoFixes: [
      ['the international clothing.', 'the equivalent size in the system you selected.'],
      ['Clothing Size Converter computes the international clothing directly from your inputs — the US Size feed the formula.', 'Clothing Size Converter looks the equivalent size up from your input — the US size and clothing type you pick feed the lookup.'],
      ['international clothing formula', 'clothing size conversion formula'],
      ['the international clothing', 'the equivalent size']
    ]
  },
  // 100 Nm -> 73.76 lb-ft. Phrase: "Nm to lb-ft".
  'torque-conv': {
    title: 'Torque Converter: Nm to lb-ft and Other Units',
    metaDesc: 'Convert torque between newton-metres, pound-feet and kgf-m. 100 Nm is about 73.8 lb-ft, with the factor and the working shown.',
    heading: 'Nm to lb-ft, and back',
    lead: 'Torque conversion is a single factor: 1 newton-metre is about 0.7376 pound-feet, and 1 pound-foot is about 1.3558 newton-metres. Torque and power are different quantities, so a figure in newton-metres never becomes horsepower without an engine speed, and kgf-m sits a further factor away from both.',
    quickAnswer: '100 Nm converts to about 73.8 lb-ft, because 100 × 0.7376 = 73.76. The reverse is 100 lb-ft ≈ 135.6 Nm. Setting the torque wrench in the unit the manual quotes avoids translating the figure twice.',
    aeoFixes: [
      ['the torque units.', 'the torque in the unit you selected.'],
      ['Torque Converter computes the torque units directly from your inputs — the Torque Value feed the formula.', 'Torque Converter converts directly from your input — the torque and the two units you pick feed the formula.'],
      ['torque units formula', 'torque conversion formula'],
      ['the torque units', 'the converted torque']
    ]
  },
  // 100 kW -> 134.1 hp. Phrase: "watts to horsepower".
  'power-conv': {
    title: 'Watts to Horsepower Converter: W, kW and hp',
    metaDesc: 'Convert power between watts, kilowatts and horsepower. 100 kW is about 134 hp, and 1 hp is 745.7 watts, with each step shown.',
    heading: 'Watts to horsepower, kW to hp',
    lead: 'Power conversion looks like one factor, but there are two horsepower definitions. Mechanical horsepower is 745.7 watts while metric horsepower (PS) is 735.5 watts, about 1.4% smaller. A kilowatt is 1,000 watts, so kW to hp means multiplying by 1,000 and then dividing by whichever horsepower the specification means.',
    quickAnswer: '100 kW converts to about 134 mechanical horsepower, because 100 × 1,000 ÷ 745.7 = 134.1. The same 100 kW reads as roughly 136 metric horsepower. Carmakers quote both, so check which one a rating uses.',
    aeoFixes: [
      ['the power units.', 'the power in the unit you selected.'],
      ['Power Converter computes the power units directly from your inputs — the Power Value feed the formula.', 'Power Converter converts directly from your input — the power and the two units you pick feed the formula.'],
      ['power units formula', 'power conversion formula'],
      ['the power units', 'the converted power']
    ]
  },
  // Default input is V -> A, which the tool itself refuses. Phrase: "volts amps watts".
  'voltage-conv': {
    title: 'Volts, Amps and Watts Converter: What Converts',
    metaDesc: "See what converts between volts, amps and watts, and what needs Ohm's law instead — voltage and current are different quantities and cannot be swapped directly.",
    heading: 'Volts, amps and watts: what actually converts',
    lead: "Volts, amps and watts are not interchangeable, so no converter can turn 10 volts into an amperage without knowing the resistance. What converts cleanly is scale within one quantity: volts to millivolts, amps to milliamps, watts to kilowatts. To relate the three quantities you need Ohm's law (V = I × R) or the power law (P = V × I).",
    quickAnswer: "Volts to millivolts multiplies by 1,000, and amps to milliamps does the same. Volts to amps is not a conversion: 12 V across 6 Ω draws 2 A, which is Ohm's law, not a change of unit. This page converts within compatible electrical units and explains the case when they are not.",
    aeoFixes: [
      ['the cannot directly convert.', 'the converted value, with a clear explanation when the two units measure different quantities.'],
      ['Electrical Unit Converter computes the cannot directly convert directly from your inputs — the Value feed the formula.', 'Electrical Unit Converter converts within compatible electrical units — the value and the two units you pick feed the formula.'],
      ['cannot directly convert formula', 'electrical unit conversion formula'],
      ['the cannot directly convert', 'the converted value'],
      ['cannot directly convert', 'converted result']
    ]
  },
  // 1,000 kg/m3 -> 1 g/cm3. Phrase: "kg/m3 to g/cm3".
  'density-conv': {
    title: 'Density Converter: kg/m3 to g/cm3 and g/mL',
    metaDesc: 'Convert density between kg/m3, g/cm3, g/mL and lb/ft3. 1,000 kg/m3 is exactly 1 g/cm3, and the factor is applied to every step.',
    heading: 'kg/m3 to g/cm3, and why they are equal',
    lead: 'A density conversion divides by 1,000 going from kg/m3 to g/cm3, because a cubic metre holds a million cubic centimetres while a kilogram is a thousand grams. Water near 4 °C is the reference point: 1,000 kg/m3, 1 g/cm3 or 1 g/mL, depending on which notation the source uses.',
    quickAnswer: '1,000 kg/m3 converts to exactly 1 g/cm3, and 1 g/cm3 is the same as 1 g/mL. Steel at 7,850 kg/m3 is 7.85 g/cm3, which matters when a supplier quotes g/cm3 and your calculation is in SI units.',
    aeoFixes: [
      ['the density units.', 'the density in the unit you selected.'],
      ['Density Converter computes the density units directly from your inputs — the Density Value feed the formula.', 'Density Converter converts directly from your input — the density and the two units you pick feed the formula.'],
      ['density units formula', 'density conversion formula'],
      ['the density units', 'the converted density']
    ]
  },

  // 202 impressions, 0 clicks, avg pos 8 vs "baby height predictor" /
  // "child height predictor based on parents" / "boy height predictor".
  // Formula: mp = (father + mother) / 2; boys +6.5, girls -6.5.
  // 180 + 165 → mp 172.5 → boy 179 cm (70 in), girl 166 cm (65 in).
  'child-height': {
    title: 'Child Height Predictor: How Tall Will My Child Be?',
    metaDesc: "Enter both parents' heights and get your child's predicted adult height in cm and inches using the mid-parental method, as a range rather than a promise.",
    heading: 'Child height predictor: how tall will my child be?',
    lead: "The mid-parental method averages both parents' heights, adds 6.5 cm for a boy or subtracts 6.5 cm for a girl, and halves the total. It gives one central estimate: genetics sets a range around it, around 8-10 cm wide, and factors like nutrition and the timing of puberty decide where inside that range a child actually lands.",
    quickAnswer: 'A father of 180 cm and a mother of 165 cm average 172.5 cm, so the prediction is about 179 cm (70 in) for a boy and 166 cm (65 in) for a girl. Read either figure as the midpoint of a range, not a fixed outcome.'
  },
  // 106 impressions, 0 clicks, 26 queries led by "baby weight percentile
  // calculator" (20 impressions, pos 7) and "calculate baby weight percentile"
  // (pos 1.3). The tool compares weight with a reference average for 3/6/9/12
  // months (boys 6.4/7.9/8.9/9.6 kg, girls 5.8/7.3/8.3/9.0) and returns the
  // percentage difference - it is NOT a full growth-chart percentile, so the
  // copy says so instead of overclaiming.
  'baby-weight-gain': {
    title: 'Baby Weight Percentile: Is My Baby on Track for Their Age?',
    metaDesc: "Compare your baby's weight with the average for their age and see the percentage above or below it, plus why a single number is not the whole growth picture.",
    heading: 'Baby weight percentile: is my baby on track?',
    lead: "This compares your baby's weight with a reference average for their age and reports the difference as a percentage: above the average, below it, or roughly on it. A single reading is a snapshot, not a verdict — growth is judged by the trend across months, and a weight a little under or over the average is common and often normal.",
    quickAnswer: 'A 3-month-old boy at 7.0 kg is about 9% above the 6.4 kg reference average for that age; the same 7.0 kg for a girl is about 21% above the 5.8 kg average, because the reference for girls is lower. Track the line over time rather than reacting to one figure.'
  },
  // 88 impressions, 0 clicks, avg pos 8 (queries all below GSC's reporting
  // threshold). Formula: slides x minutes per slide.
  'presentation-time': {
    title: 'Presentation Time Calculator: How Long Will My Slides Take?',
    metaDesc: 'Enter your slide count and minutes per slide to get the speaking time, with a buffer for overruns so a talk fits the slot it was given.',
    heading: 'How long will my presentation take?',
    lead: 'Speaking time is slide count multiplied by the minutes each slide takes, including the pauses and questions you actually spend. Presenters typically run 10-20% over their estimate, so plan the buffer into the total rather than discovering it live.',
    quickAnswer: 'Ten slides at three minutes each is 30 minutes of speaking. Add roughly 10% for overruns, so a 30-minute slot should hold about nine slides at that pace.'
  },
  // 35 impressions, 0 clicks, avg pos 5.7. Formula: perCredit x credits +
  // fees x years. Example: 120 credits at $500 = $60,000 tuition.
  // 159 impressions, position 5.1 (page 1), 0 clicks in the 28-day export —
  // the snippet needed the searched noun ("college tuition") in front.
  'tuition-cost': {
    title: 'College Tuition Cost Calculator: Cost of a Degree',
    metaDesc: 'Add up cost per credit, total credits and yearly fees to see the full price of a degree, not just the headline tuition figure.',
    heading: 'What will a degree actually cost?',
    lead: 'The full price of a degree is tuition plus the fees that recur every year, which are easy to leave out when comparing programmes. Tuition is cost per credit multiplied by the credits you need to graduate; fees multiply by the number of years you take to finish.',
    quickAnswer: 'A programme charging $500 per credit needs 120 credits, so tuition alone is $60,000. Adding $2,000 of annual fees across four years brings the total to $68,000 — the fee line is 12% of the bill.'
  },
  // 48 impressions, 0 clicks. Real query (45 impressions, pos 8.7) is the
  // quiz-style "if you spend $3 on coffee per school/work day, how much are you
  // spending per year? under $100 / $100-$250 / $250-$750 / more than $750".
  // Formula: cups x price x days per week x 52. $3 x 5 days = $15/week = $780/yr.
  'coffee-cost': {
    title: 'Coffee Cost Calculator: What Your Daily Cup Costs Per Year',
    metaDesc: 'Work out what a coffee habit costs per month and per year from cups per day, price per cup and days a week. A $3 cup five days a week is about $780 a year.',
    heading: 'What does your coffee habit cost per year?',
    lead: 'The calculation is cups per day multiplied by price per cup, multiplied by days per week, then by 52 weeks. It is small numbers repeated often, which is why the annual figure usually surprises people more than the weekly one.',
    quickAnswer: 'One $3 cup on each of five work days costs $15 a week, $780 a year and about $65 a month — which puts it in the "$250 to $750" band rather than under $100. Two $5 cups on the same schedule is $2,600 a year.'
  },
  // 23 impressions, 0 clicks, avg pos 7.3 vs "gutter calculator" (17 impr, pos
  // 8) and "gutter downspout calculator" (pos 4.8). Formula: sections =
  // perimeter / section length, downspouts = at least one per 10 m.
  'gutter': {
    title: 'Gutter Calculator: Sections, Length and Downspouts You Need',
    metaDesc: 'Enter the roof perimeter, run length and corners to get the gutter sections and downspouts to order, ready to price against a quote.',
    heading: 'How much gutter and how many downspouts do you need?',
    lead: 'Gutter is ordered in fixed lengths, so the useful answer is how many whole sections the roof perimeter needs and how many downspouts drain it. Run length per section comes from the gutter you plan to buy, and corners are counted separately because they are bought as fittings.',
    quickAnswer: 'A 40 m perimeter with 2.5 m sections needs 16 sections, and at one downspout per 10 m that is 4 downspouts. Adding two corners brings the fittings list to 16 sections, 4 downspouts and 2 corners.'
  },
  // 23 impressions, 0 clicks, avg pos 9.9. Query: "how much wrapping paper do
  // i need". Formula: area = 2 x (w + h) x (l + 2h).
  'gift-wrap': {
    title: 'How Much Wrapping Paper Do I Need? Box Size Calculator',
    metaDesc: 'Enter the box length, width and height to get the paper area you need for the wrap, with the overlap included so the paper actually covers the box.',
    heading: 'How much wrapping paper do I need?',
    lead: 'Wrapping paper has to cover the four sides of the box plus the overlap that folds underneath and tucks at the ends. That is why a paper area is always larger than the box surface alone, and why a box that looks small can still need a third of a square metre.',
    quickAnswer: 'A 30 x 20 x 10 cm box needs about 0.30 sq m of paper with the overlap built in. Buy the next size sheet up for an awkward shape or a deep fold, since running out mid-wrap means starting over.'
  },
  // 13 impressions, 0 clicks, avg pos 7.1. Formula: sheets =
  // ceil(area / sheet size x 1.1) - the 10% waste allowance is built in.
  'drywall': {
    title: 'Drywall Calculator: How Many Sheets You Need (With Waste)',
    metaDesc: 'Enter the wall area and your sheet size to get the number of drywall sheets to buy, with a 10% waste allowance already included for cuts and mistakes.',
    heading: 'How many sheets of drywall do I need?',
    lead: 'Sheet count is wall area divided by sheet area, then rounded up and padded, because every cut produces offcuts you cannot reuse and a half-finished wall costs another trip. This calculator builds in 10% for cuts and breakage.',
    quickAnswer: 'Fifty square metres of wall with 3 sq m sheets needs 17 sheets by area, and 19 once the 10% waste allowance is added. Round up again if the room has many openings to work around.'
  },
  // 13 impressions, 0 clicks, avg pos 9.3. Formula: per day = weight x 150 ml;
  // per feeding = per day / feedings.
  'baby-feeding': {
    title: 'Baby Feeding Schedule by Age and Weight: ml Per Feeding',
    metaDesc: 'Estimate how much formula or expressed milk a baby needs per day and per feed from their weight and number of feeds, with the daily total shown.',
    heading: 'How much should my baby feed, and how often?',
    lead: 'The common guide is about 150 ml per kilogram of body weight per day, split across the number of feeds. So the daily total follows weight, and the amount per feed falls as the number of feeds rises — which is why a heavier baby on more feeds can still take a familiar bottle size.',
    quickAnswer: 'A 5 kg baby needs roughly 750 ml a day: about 125 ml per feed at six feeds a day, or 94 ml at eight. These are estimates — follow your health visitor or paediatrician over any calculator, especially in the first weeks.'
  },
  // 12 impressions, 0 clicks, avg pos 3.4 (best position on the site, still no
  // clicks). Formula: days = zones x 1 east, zones x 0.6 west.
  // Zero-click row: "jet lag recovery time formula" (32 impr, pos 5.8) was not
  // stated — "Days to Adjust" is recovery time, so the term belongs in the title.
  'jet-lag': {
    title: 'Jet Lag Calculator: Recovery Time, East vs West',
    metaDesc: 'Enter the number of time zones crossed and the direction of travel to estimate how many days your body clock needs to adjust, east versus west.',
    heading: 'How long will jet lag last?',
    lead: 'The body clock adjusts faster when you travel west, because the day lengthens and delaying sleep is easier than advancing it. Time zones crossed set the size of the disruption, and the direction decides how quickly it unwinds.',
    quickAnswer: 'Crossing 6 time zones takes about 6 days going east but only about 3.6 days going west. Morning light at the destination and a consistent bedtime are what actually move the clock.'
  },
  // 9 impressions, 0 clicks, avg pos 7.1. Formula: family size x days x a
  // destination/level daily cost. Beach mid-range $350 x 4 people x 5 days.
  'vacation-with-kids': {
    title: 'Family Vacation Cost Calculator: Budget by Days and Level',
    metaDesc: 'Estimate what a family holiday costs from the destination, family size, number of days and budget level, with a per-person daily figure to compare options.',
    heading: 'What will a family holiday cost?',
    lead: 'A family trip multiplies three things: the daily cost for the destination and comfort level, the number of people, and the number of days. The per-person daily figure is the useful number to carry between destinations, because it is what changes when you switch from a campsite to a beach resort.',
    quickAnswer: 'Four people, five days, mid-range beach at about $350 per person per day comes to roughly $7,000. The same trip camping at $175 per person per day is about $3,500 — the level of the trip moves the total more than the destination.'
  },
  // 261 impressions, 0 clicks, avg pos 7.8 — the largest zero-click page on the
  // site. Query: "mifflin st jeor calculator" (34 impr, pos 2.6). The remaining
  // impressions are Google matching the page's own body text (see the
  // "+mifflin st jeor equation women 10 weight 6.25 height 5 age 161 source%"
  // strings in the join). Formula: 10w + 6.25h − 5·age + 5 (men) / − 161 (women).
  // Defaults: 70 kg, 170 cm, 30 y → 1617.5 (men), 1451.5 (women).
  // 1,108 impressions at position 6.4 with **0 clicks** (28-day page export) —
  // the top impression page on the site. This id is owned by the CTR table, so
  // the title change lives here rather than in TITLE_OVERRIDES: two tables
  // writing the same title is how a rewrite silently reverts.
  'bmr-mifflin': {
    title: 'BMR Calculator (Mifflin-St Jeor): Daily Calories',
    metaDesc: 'Enter weight, height, age and sex to get your basal metabolic rate from the Mifflin-St Jeor equation, the one dietitians use most for healthy adults.',
    heading: 'Mifflin-St Jeor BMR: your daily calorie baseline',
    lead: 'BMR is the energy you would burn lying still all day, and Mifflin-St Jeor is the equation the Academy of Nutrition and Dietetics rates most accurate for healthy adults. It is 10 × weight in kilograms, plus 6.25 × height in centimetres, minus 5 × age, then plus 5 for men or minus 161 for women.',
    quickAnswer: 'A 70 kg, 170 cm, 30-year-old man: (10 × 70) + (6.25 × 170) − (5 × 30) + 5 = 700 + 1,062.5 − 150 + 5, about 1,618 kcal a day. The same figures for a woman give about 1,452 kcal, because the female version subtracts 161 instead of adding 5. Multiply by 1.2–1.9 for real daily needs.'
  },
  // 65 impressions, 0 clicks, avg pos 9.5. Query: "last menstrual period
  // calculator" (56 impr, pos 5.3). Formula: due date = LMP + 280 days.
  // Zero-click row: "last menstrual period calculator" (67 impr, pos 9.3) had no
  // "menstrual" in the title, though LMP is the only input the tool takes.
  'pregnancy': {
    title: 'Pregnancy Due Date Calculator: Last Menstrual Period',
    metaDesc: "Enter the first day of your last menstrual period to get your estimated due date, 40 weeks later by Naegele's rule, with the reasoning spelled out.",
    heading: 'Due date from your last period',
    lead: "Pregnancy dating starts from the first day of your last menstrual period rather than from conception, because that is the date people actually know. Naegele's rule adds 280 days — 40 weeks — to that day to give the estimated due date, and it is the same method clinicians use in the first appointment.",
    quickAnswer: 'A last period starting on 1 January gives an estimated due date of 8 October, because 1 January plus 280 days lands there. Only about 4% of babies arrive on the exact date; most come within two weeks either side, so read the date as the centre of a window.'
  },
  // 54 impressions, 0 clicks, avg pos 9.2. Query: "deck stain calculator"
  // (30 impr, pos 2.0) plus "sealant calculator". Formula: gallons =
  // ceil(area x coats / 250 / 0.9) — 250 sq ft per gallon per coat, 10% waste.
  'deck-stain': {
    title: 'Deck Stain Calculator: Gallons of Stain or Sealant',
    metaDesc: 'Enter the deck length, width and number of coats to get the gallons of stain or sealant to buy, at about 250 sq ft per gallon per coat.',
    heading: 'How much stain does your deck need?',
    lead: 'Stain and sealant are sold by the gallon and bought against a projected coverage, so the useful answer is a whole number of containers rather than a neat area. Coverage runs about 250 square feet per gallon per coat, and most decks want two coats because the first soaks in unevenly. Treat the figure as a minimum and round up.',
    quickAnswer: 'A 20 × 12 ft deck is 240 sq ft. Two coats need 480 sq ft of coverage, which at 250 sq ft per gallon is 1.92 gallons — 3 gallons once the 10% allowance for missed boards and brush loss is added. Buy it all in one order, because a second batch can differ in shade.'
  },
  // 8 impressions, 0 clicks, avg pos 5.5. Formula: co2 = electricity x 0.5 +
  // gas x 2.3 + driving km x 0.2, in kg per month.
  'carbon': {
    title: 'Carbon Footprint Calculator: Home Energy, Gas and Driving',
    metaDesc: 'Estimate your monthly CO2e from electricity, gas and driving, with each source shown separately so you can see which one dominates your footprint.',
    heading: 'What is my carbon footprint per month?',
    lead: 'A household footprint is the sum of a few measurable things: electricity in kilowatt-hours, gas in litres or therms, and distance driven. Showing them separately matters more than the total, because the biggest line is the only one worth changing first.',
    quickAnswer: '300 kWh of electricity is about 150 kg CO2e, 100 litres of gas about 230 kg, and 800 km of driving about 160 kg — roughly 540 kg a month, with heating fuel the largest share in this example.'
  },

  // ---- pages still carrying the raw engine template -------------------------
  // These were never reached by the earlier override pass, so they shipped the
  // generator's default copy: `Free <name>: enter the <inputs> and get the
  // <result> instantly, with every step of the math shown…`, and in several
  // cases a title that is a truncated label list ("Moon Phase Calculator: Date",
  // "URL Encoder / Decoder: Encode"). Found by scripts/build-query-action-plan.cjs
  // (section "Copy that is still the raw engine template", 27 pages). The click
  // upside is small — the report models 3.6 clicks / 28d for the whole set — so
  // this is a quality fix, not a traffic play: each title now says what the page
  // gives you instead of listing its input fields.
  'tip': {
    title: 'Tip Calculator: Tip Amount, Total and Split per Person',
    metaDesc: 'Work out the tip on any bill and split it between people. Enter the bill, the tip percentage and the number of people to get each share.',
    heading: 'How much should I tip?',
    lead: 'A tip is a percentage of the bill, and the only decisions are which percentage and whether to split it. Enter the bill, choose the percentage and the number of people; the page shows the tip, the total and each person\'s share, so the arithmetic never has to be redone at the table.',
    quickAnswer: 'A 15% tip on a $60 bill is $9.00, making the total $69.00, and split four ways that is $17.25 each.'
  },
  'safe-withdrawal': {
    title: 'Safe Withdrawal Rate Calculator: Retire on Your Savings',
    metaDesc: 'Find the withdrawal rate a portfolio can sustain: enter your savings, the annual withdrawal and the return you expect to see the rate and the years it lasts.',
    heading: 'What withdrawal rate is safe?',
    lead: 'The safe withdrawal rate is the share of a portfolio you can take each year without running it down over a long retirement. It depends on the balance, the annual withdrawal and the return you expect, and the page reports the rate and how the balance evolves so the trade-off is visible instead of guessed at.',
    quickAnswer: 'Taking $40,000 a year from a $1,000,000 portfolio is a 4% withdrawal rate — the figure the 4% rule is named after.'
  },
  'bullet-drop': {
    title: 'Bullet Drop Calculator: Trajectory, Flight Time, Energy',
    metaDesc: 'Estimate bullet drop over distance from muzzle velocity, ballistic coefficient and sight height, with the time of flight and the remaining energy.',
    heading: 'How far does a bullet drop?',
    lead: 'Bullet drop is how far the projectile falls below the sight line over a given distance. The page works it out from muzzle velocity, ballistic coefficient, sight height and zero distance, and reports the drop at each range together with the time of flight and the energy left.',
    quickAnswer: 'Drop grows with distance and with a slower muzzle velocity: doubling the range multiplies the drop roughly by four, which is why the zero distance matters so much.'
  },
  'sweat-rate': {
    title: 'Sweat Rate Calculator: Fluid Loss per Hour of Exercise',
    metaDesc: 'Work out how much fluid you lose per hour of training from your pre- and post-exercise weight, the fluid you drank and the length of the session.',
    heading: 'How much fluid do I lose when I train?',
    lead: 'Sweat rate is the fluid you lose per hour of exercise. It is estimated by weighing yourself before and after a session and adding back what you drank, then dividing by the time you trained. Enter those figures and the page returns the hourly rate and the fluid to replace.',
    quickAnswer: 'Losing 1 kg over a two-hour session is about a litre, so roughly 500 ml per hour, with whatever you drank added back in.'
  },
  'rain-barrel': {
    title: 'Rain Barrel Calculator: Roof Area to Gallons Harvested',
    metaDesc: 'Work out how much rainwater a roof can harvest. Enter the roof area, the rainfall and the collection efficiency to size the barrel you actually need.',
    heading: 'How much rainwater can my roof collect?',
    lead: 'A roof harvests its footprint area multiplied by the rainfall, discounted by how much water actually reaches the barrel. Enter the roof area, the rainfall and the collection efficiency to see the litres or gallons available, and the barrel size that makes sense for it.',
    quickAnswer: '1 mm of rain on 100 m² of roof is 100 litres, and at 80% efficiency about 80 litres ends up in the barrel.'
  },
  'sibling-age-gap': {
    title: 'Sibling Age Gap Calculator: Months Between Children',
    metaDesc: 'Work out the age gap between two children in years, months and days from their birth dates, with the school years they will share.',
    heading: 'What is the age gap between siblings?',
    lead: 'An age gap is the exact difference between two birth dates, expressed in years, months and days. Enter both dates and the page reports the gap, plus the school years the children will share, which is usually the number parents actually care about.',
    quickAnswer: 'A child born in March 2022 and a sibling born in September 2024 are 2 years and 6 months apart.'
  },
  'url-encoder': {
    title: 'URL Encoder / Decoder: Percent Encoding Online',
    metaDesc: 'Encode or decode a URL or query string with percent-encoding. Paste the text, get the escaped result, and copy it straight back into your code.',
    heading: 'What does URL encoding change?',
    lead: 'URL encoding replaces the characters a URL cannot carry — spaces, ampersands, question marks, non-ASCII letters — with a percent sign and two hexadecimal digits. Paste text to encode it, or paste encoded text to read it back, and copy the result into your code.',
    quickAnswer: 'A space becomes %20 and an ampersand becomes %26; in a query string a plus sign is also read as a space.'
  },
  'moon-phase': {
    title: "Moon Phase Calculator: Tonight's Phase and Illumination",
    metaDesc: 'Find the moon phase for any date, plus the illumination percentage and the days to the next new or full moon, worked out from the lunar cycle.',
    heading: 'What phase is the moon tonight?',
    lead: 'The moon runs a 29.53-day cycle from new moon to new moon, and any date can be placed on it. The page reports the phase name, the illuminated fraction and the days to the next new or full moon, calculated from the cycle rather than read off a table.',
    quickAnswer: 'A full moon is 100% illuminated around day 14 or 15 of the cycle, and a new moon is 0% and rises with the sun.'
  },
  'laundry-cost': {
    title: 'Laundry Cost Calculator: Cost per Load and per Year',
    metaDesc: 'Work out what washing costs: enter loads per week, washer and dryer energy, water and detergent prices to get the cost per load and per year.',
    heading: 'What does a load of washing cost?',
    lead: 'The cost of a load is the energy the washer and dryer use plus water and detergent. Enter loads per week and the unit prices, and the page returns the cost per load, per week and per year — the figure that decides whether the routine is worth changing.',
    quickAnswer: 'A 1 kWh wash at $0.20 per kWh costs 20 cents, a 2.5 kWh dryer cycle about 50 cents, so a load is roughly 70 cents before water and detergent.'
  },
  'completing-square': {
    title: 'Completing the Square Calculator: Steps to Vertex Form',
    metaDesc: 'Turn a quadratic into vertex form by completing the square, with every step shown and the vertex and discriminant reported at the end.',
    heading: 'How do you complete the square?',
    lead: 'Completing the square rewrites a quadratic as a perfect square plus a constant, which is what makes the vertex and the roots readable. Enter the coefficients and the page shows each step, then reports the vertex form, the vertex itself and the discriminant.',
    quickAnswer: 'For x² + bx + c, adding and subtracting (b/2)² gives (x + b/2)² + c − b²/4, so the vertex sits at x = −b/2.'
  },
  'plagiarism-check': {
    title: 'Citation Checker: Word Count and Citation Density',
    metaDesc: "Check a paper's word count against its citation count to see the citations per 1,000 words, with the range most markers expect.",
    heading: 'Is my citation density too low?',
    lead: 'Citation density is the number of citations per 1,000 words. Markers use it as a rough sign that a paper engages with the literature: too few and the argument looks unsupported, too many and the text reads as a list. Enter the word count and the citations to see where the paper sits.',
    quickAnswer: 'A 3,000-word paper with 30 citations sits at 10 citations per 1,000 words, inside the 5-15 range most markers expect for an essay.'
  },
  'cap-rate-conv': {
    title: 'Cap Rate to Value Calculator: NOI and Property Value',
    metaDesc: 'Convert a cap rate into a property value from the net operating income, or work back from the price to the cap rate, with the formula shown.',
    heading: 'How do you turn a cap rate into a value?',
    lead: 'A cap rate is the net operating income divided by the property price, so the same relationship runs backwards: divide the income by the cap rate and you have the value. Enter either pair of figures and the page shows the conversion and the formula behind it.',
    quickAnswer: '$50,000 of net operating income at a 5% cap rate implies a property value of $1,000,000.'
  },
  'financial-need': {
    title: 'Financial Need Calculator: Cost of Attendance vs EFC',
    metaDesc: "Work out a student's financial need from the cost of attendance and the expected family contribution, with the gap an aid office looks at.",
    heading: 'How is financial need calculated?',
    lead: 'Financial need is the cost of attendance minus the expected family contribution: the gap a student has to cover from grants, loans and work. Enter both figures and the page reports the need and shows how each number drives it.',
    quickAnswer: 'A $40,000 cost of attendance with a $12,000 expected family contribution leaves $28,000 of need to fund.'
  },
  'carpool-savings': {
    title: 'Carpool Savings Calculator: Fuel, Tolls, Parking Split',
    metaDesc: 'Work out what carpooling saves: enter the weekly commute cost, the number of riders and the days shared to get the saving per person per month.',
    heading: 'How much does carpooling save?',
    lead: 'Carpooling cuts the per-person cost of a commute because fuel, tolls and parking are shared. Enter the weekly cost of the trip, the number of riders and how many days you travel together; the page reports the saving per person per week, per month and per year.',
    quickAnswer: 'A $60-a-week commute shared by three riders costs each of them $20, a saving of $40 a week or about $173 a month.'
  },
  'cidr-convert': {
    title: 'CIDR to Subnet Mask Calculator: Hosts and Broadcast',
    metaDesc: 'Convert CIDR notation into a subnet mask, the network and broadcast address, and the usable host range, for IPv4 prefixes.',
    heading: 'What does a CIDR prefix mean?',
    lead: 'CIDR notation states how many leading bits of an address are the network, so /24 means 24 network bits and 8 host bits. The page converts a prefix into the subnet mask, the network and broadcast address and the usable host range, for IPv4.',
    quickAnswer: '/24 is 255.255.255.0: 256 addresses with 254 usable hosts, while /30 leaves two usable addresses for a point-to-point link.'
  },
  'debt-consolidation': {
    title: 'Debt Consolidation Calculator: One Payment vs Many',
    metaDesc: 'Compare a single consolidation loan with your current debts: enter the balances, rates and terms to see the monthly payment and the total interest.',
    heading: 'Does consolidating debt actually save money?',
    lead: 'Consolidation replaces several balances with one loan. The monthly payment usually falls, but the total interest only falls when the new rate and term are better. Enter the balances, their rates and the consolidation offer, and the page compares both, payment by payment.',
    quickAnswer: 'Rolling $10,000 at 22% into a loan at 9% over four years cuts the monthly payment sharply, but the total interest depends on the term you accept.'
  },
  'data-center-pue': {
    title: 'Data Center PUE Calculator: Power Usage Effectiveness',
    metaDesc: 'Work out the power usage effectiveness of a data centre from the total facility power and the IT load, with the overhead split that drives it.',
    heading: 'What is a good PUE?',
    lead: 'Power usage effectiveness is the total power a facility draws divided by the power the IT equipment actually uses, so 1.0 would be perfect and real facilities sit above it. The page splits the overhead — cooling, losses, lighting — so the number can be acted on.',
    quickAnswer: 'A facility drawing 1,500 kW with 1,000 kW of IT load runs at a PUE of 1.5; the 500 kW gap is the overhead worth attacking.'
  },
  'cac-payback': {
    title: 'CAC Payback Period Calculator: Months to Recover CAC',
    metaDesc: 'Work out how many months it takes to recover customer acquisition cost from the gross margin each customer brings in, step by step.',
    heading: 'How long does it take to earn back CAC?',
    lead: 'CAC payback divides the customer acquisition cost by the gross margin a customer generates each month: it answers how many months pass before the customer has paid for themselves. Enter the CAC, the monthly revenue per customer and the gross margin to see it.',
    quickAnswer: 'A $300 CAC on a $50-a-month customer at 80% gross margin pays back in about 7.5 months.'
  },
  'college-cost-planner': {
    title: 'College Cost Planner: 4-Year Tuition, Room and Board',
    metaDesc: 'Add up four years of tuition, room, board and fees with an inflation rate applied, to see what a degree will cost by graduation.',
    heading: 'What will four years of college really cost?',
    lead: 'A four-year cost is tuition plus room, board and fees, repeated each year and usually inflated. Enter the annual figures and an inflation rate and the page totals the four years, so the headline price is not mistaken for the final bill.',
    quickAnswer: '$25,000 a year with 5% inflation comes to about $107,750 over four years rather than $100,000.'
  },
  'grade-needed': {
    title: 'Final Grade Calculator: Score Needed to Hit Your Target',
    metaDesc: 'Work out the score you need on the final exam to reach your target grade, from your current grade, the exam weight and the grade you want.',
    heading: 'What score do I need on the final?',
    lead: 'The score you need depends on your current grade, the weight the final carries and the grade you are aiming for. Enter those three figures and the page returns the percentage the final has to score and says plainly whether the target is still reachable.',
    quickAnswer: 'With 85% so far and a final worth 30%, a 90% target needs 101.7% on the exam; make the final worth 40% and it needs 97.5%.'
  },
  'beam-deflection': {
    title: 'Beam Deflection Calculator: Simply Supported Beam',
    metaDesc: 'Work out the maximum deflection of a simply supported beam from the load and span, and the modulus and moment of inertia of the section.',
    heading: 'How much does a beam deflect?',
    lead: 'Deflection is how far a beam bends under load, and for a simply supported span it depends on the load, the span and the stiffness of the section (its modulus and moment of inertia). Enter those and the page returns the maximum deflection, usually read against a span limit.',
    quickAnswer: 'Deflection grows with the cube of the span, so doubling a span multiplies the sag by eight for the same load and section.'
  },
  'childcare-cost': {
    title: 'Childcare Cost Comparison: Daycare vs Nanny per Year',
    metaDesc: 'Compare daycare, a nanny and a childminder on annual cost from the weekly rate, the number of children and the days you need covered.',
    heading: 'Is daycare cheaper than a nanny?',
    lead: 'The comparison turns on a rate per child per week set against a nanny\'s flat fee: daycare usually wins for one child part-time, a nanny for several children full-time. Enter the rates and the days you need and the page reports both on a yearly basis.',
    quickAnswer: 'Daycare at $250 a week is about $13,000 a year; a nanny at $700 a week is about $36,400, so the nanny only pays off across several children.'
  },
  'appreciation-forecast': {
    title: 'Property Appreciation Calculator: Future Value by Year',
    metaDesc: "Project a property's value forward from the current price and an annual appreciation rate, with the value and gain shown for each year.",
    heading: 'What will my property be worth?',
    lead: 'A property forecast compounds the current value by an annual appreciation rate. Enter the price, the rate and the number of years, and the page shows the value and the gain for each year, which is usually more useful than a single end figure.',
    quickAnswer: '$400,000 growing at 3% a year is about $412,000 after one year and roughly $537,600 after ten.'
  },
  'australia-income-tax': {
    title: 'Australia Income Tax Calculator: Salary and Take-Home',
    metaDesc: 'Work out Australian income tax, the Medicare levy and take-home pay from your salary, with the brackets and thresholds set out clearly.',
    heading: 'How much tax comes out of an Australian salary?',
    lead: 'Australian income tax is progressive: each bracket is taxed at its own rate on the part of the income that falls inside it, and the Medicare levy is added on top. Enter the salary and the page sets out the tax, the levy and the take-home pay.',
    quickAnswer: 'Tax is charged bracket by bracket — the lowest band is tax-free and each band above it has its own rate — with the 2% Medicare levy added on top of the tax.'
  },
  'cash-on-cash': {
    title: 'Cash-on-Cash Return Calculator: Rental Property ROI',
    metaDesc: 'Work out the cash-on-cash return on a rental from the annual pre-tax cash flow and the cash you actually invested, with the formula shown.',
    heading: 'What is a cash-on-cash return?',
    lead: 'Cash-on-cash return divides the annual pre-tax cash flow by the cash you actually put into the deal, so a leveraged property is judged on the equity rather than the price. Enter both figures and the page reports the return alongside the assumptions behind the cash flow.',
    quickAnswer: '$12,000 of annual cash flow on $150,000 of invested cash is an 8% cash-on-cash return.'
  },
  'coupon-payment': {
    title: 'Bond Coupon Payment Calculator: Annual and Semi-Annual',
    metaDesc: 'Work out the coupon payment on a bond from its face value, coupon rate and payment frequency, with the annual total alongside it.',
    heading: 'How much is a bond coupon?',
    lead: 'A coupon payment is the face value multiplied by the coupon rate, divided by the number of payments made each year. Enter the face value, the rate and the frequency to see each payment and the annual total beside it.',
    quickAnswer: 'A $1,000 bond with a 5% coupon pays $50 a year, or $25 twice a year on a semi-annual schedule.'
  },
  'haircut-annual': {
    title: 'Haircut Cost Calculator: What a Year of Cuts Costs',
    metaDesc: 'Work out the yearly cost of haircuts from the price per visit, how often you go and the tip percentage, with the monthly figure alongside.',
    heading: 'What does a year of haircuts cost?',
    lead: 'The yearly cost is the price per visit multiplied by how often you go, plus the tip. Enter those and the page reports the monthly and yearly totals, which is the number that makes a cheaper-but-more-frequent option comparable.',
    quickAnswer: 'A $25 cut every four weeks with a 20% tip is about $390 a year.'
  },

  // ---- from docs/TOP10-PUSH-LIST.md (node scripts/build-top10-push-list.cjs) ----
  // The first group is not a ranking experiment: the generator left these titles
  // ending on a raw input label ("Statistics Calculator: Data") or a mangled
  // initialism ("...: Whtr"), and the leads said things like "works out the
  // body water via". User-visible defects, fixed at the source.
  'statistics': {
    title: 'Statistics Calculator: Mean, Median & Standard Deviation',
    metaDesc: 'Paste a data set and get the mean, median and standard deviation in one pass, with the count and sum shown and every step of the working laid out.',
    heading: 'Mean, median and standard deviation from a data set',
    lead: 'Paste any list of numbers, separated by commas or spaces, and the page returns the mean, median and standard deviation together. The count and sum are printed beside them so the figures can be checked against your own working rather than taken on trust.',
    quickAnswer: 'Paste the numbers and read off the mean, median and standard deviation in one pass.'
  },
  'mean-median-mode': {
    title: 'Mean Median Mode Calculator: Averages From One Data Set',
    metaDesc: 'Work out the mean, median and mode of a list of numbers together, with the sorted data shown. The defaults give a mean of 5.00, median 4.5 and mode 4.',
    heading: 'Mean, median and mode of a list of numbers',
    lead: 'All three averages come from the same list, which is the point of showing them together: when the mean sits above the median the data is skewed, and the mode shows which value repeats most. The sorted list is printed so the median can be checked by eye.',
    quickAnswer: 'The defaults give a mean of 5.00, a median of 4.5 and a mode of 4 from the same list.'
  },
  'variance-sd': {
    title: 'Variance & Standard Deviation Calculator: Data Set',
    metaDesc: 'Calculate the variance and standard deviation of a data set as a population or a sample, with the mean, every squared deviation and each step shown.',
    heading: 'Variance and standard deviation, population or sample',
    lead: 'Enter the data and choose population or sample; the page returns the variance, its square root as the standard deviation, and the mean both are built from. Every squared deviation is listed so the spread can be traced back to the values that caused it.',
    quickAnswer: 'Population or sample variance and standard deviation, with the mean and every squared deviation listed.'
  },
  'harmonic-mean': {
    title: 'Harmonic Mean Calculator: Data Set & Reciprocals',
    metaDesc: 'Find the harmonic mean of a data set by the reciprocal method, with every reciprocal and the final division shown. The defaults give 3.4286.',
    heading: 'Harmonic mean of a data set',
    lead: 'The harmonic mean is the average for rates and ratios, such as average speed or the price-to-earnings multiple of equal-sized holdings, because it weights small values more heavily than the arithmetic mean does. The page sums the reciprocals and divides by the count.',
    quickAnswer: 'Harmonic mean = n divided by the sum of 1/x; the defaults give 3.4286.'
  },
  'standard-error': {
    title: 'Standard Error of the Mean (SEM): Formula and Example',
    metaDesc: 'Work out the standard error of the mean from a data set, with the standard deviation, the sample size and the final division all shown step by step.',
    heading: 'Standard error of the mean from a data set',
    lead: 'The standard error of the mean says how far a sample mean would move if the sample were drawn again. It is the standard deviation divided by the square root of the sample size, so a larger sample is the only way to shrink it.',
    quickAnswer: 'SEM = standard deviation divided by the square root of n; the defaults give 1.1547.'
  },
  'coefficient-of-variation': {
    title: 'Coefficient of Variation Calculator: Relative Spread',
    metaDesc: 'Work out the coefficient of variation from a data set, the standard deviation as a share of the mean, so the spread of two data sets can be compared.',
    heading: 'Coefficient of variation from a data set',
    lead: 'Dividing the standard deviation by the mean makes spread unit-free, which is what the coefficient of variation is for: it is the figure to compare when two data sets sit on different scales or have very different averages.',
    quickAnswer: 'CV = standard deviation divided by the mean, as a percentage; the defaults give 20.20%.'
  },
  'quartile': {
    title: 'Quartile & IQR Calculator: Q1, Q2, Q3 and the Range',
    metaDesc: 'Find Q1, Q2, Q3 and the interquartile range from a data set, with the sorted list and the position each quartile lands on shown step by step.',
    heading: 'Quartiles and the interquartile range',
    lead: 'The interquartile range is the middle half of a data set, Q3 minus Q1, and it ignores the extreme values that pull a plain range around. The page sorts the data, locates each quartile by position and shows the subtraction.',
    quickAnswer: 'IQR = Q3 minus Q1; the defaults give Q1 = 3 and Q3 = 11.'
  },
  'password-gen': {
    title: 'Password Generator: Strong Random Passwords',
    metaDesc: 'Generate a strong random password at the length you choose, with symbols and numbers optional. Everything runs in the browser and nothing is sent anywhere.',
    heading: 'Generate a strong random password',
    lead: 'The password is built in the browser from a random source, so the result never leaves the device or crosses the network. Set the length and choose whether symbols and numbers are allowed; length is the cheapest way to add strength.',
    quickAnswer: 'Choose the length and character set and the password is generated locally, with nothing sent anywhere.'
  },
  'waist-height-ratio': {
    title: 'Waist-to-Height Ratio Calculator (WHtR): Waist & Height',
    metaDesc: 'Work out the waist-to-height ratio from a waist and height in centimetres, with the 0.5 cut-off explained. The page defaults give WHtR = 0.47.',
    heading: 'Waist-to-height ratio (WHtR) from waist and height',
    lead: 'Divide the waist measurement by height in the same units and the result is the waist-to-height ratio, a single number that tracks central fat without needing a scale. Guidance commonly treats 0.5 as the line to stay under, and the defaults here give WHtR = 0.47.',
    quickAnswer: 'WHtR = waist divided by height. Stay under 0.5; the page defaults give 0.47.'
  },
  'clean-dirty-price': {
    title: 'Clean vs Dirty Bond Price: Clean Price & Accrued Interest',
    metaDesc: 'Work out the clean price of a bond from its dirty (full) price and the accrued interest, with the defaults giving $1,016.50 and the subtraction shown.',
    heading: 'Clean price from the dirty price of a bond',
    lead: 'The dirty price of a bond is what a buyer actually pays; the clean price is what quote screens show. This page subtracts accrued interest from the dirty price you enter, so you can tell which of the two numbers a screen is quoting.',
    quickAnswer: 'Clean price = dirty price minus accrued interest; on the defaults that is $1,016.50.'
  },

  // Second group: the page already ranks, and the query's own word is genuinely
  // missing from the copy. Each added term is a real alias for the page (KSA,
  // IBW, TBW, Light), not a keyword from a different intent.
  'saudi-take-home-salary': {
    title: 'Saudi Arabia (KSA) Take-Home Salary Calculator: Net Pay',
    metaDesc: 'Work out Saudi net pay from gross salary, with GOSI contributions, zero income tax and a monthly take-home breakdown for expats and nationals.',
    heading: 'Saudi Arabia (KSA) take-home pay after GOSI',
    lead: 'Gross salary in Saudi Arabia is not what reaches the bank: GOSI contributions come off first, at 2% for expats and 9.75% plus 2% for nationals, while personal income tax stays at zero. The defaults produce SAR 11,760 net on a SAR 12,000 expat salary.',
    quickAnswer: 'An expat on SAR 12,000 takes home SAR 11,760 after the 2% GOSI share; a national on the same salary nets SAR 10,590.'
  },
  'ideal-body-weight': {
    title: 'Ideal Body Weight (IBW) Calculator: Devine Formula',
    metaDesc: 'Estimate ideal body weight (IBW) from height with the Devine formula, shown beside the healthy weight range and every step of the working.',
    heading: 'Ideal body weight (IBW) from height',
    lead: 'Ideal body weight is a reference figure rather than a target: the Devine formula was written for drug dosing and returns one weight for a given height. It is shown here next to the healthy range, which is the wider band worth reading first.',
    quickAnswer: 'IBW from the Devine formula for your height; the defaults give 65.9 kg.'
  },
  'total-body-water': {
    title: 'Total Body Water (TBW) Calculator: Weight & Height',
    metaDesc: 'Estimate total body water in litres from weight, height, age and sex, with the share of body weight and every step of the working shown.',
    heading: 'Total body water (TBW) in litres',
    lead: 'Total body water is the volume all of the body fluids sit in, and it scales with body size, age and sex. The figure sits behind hydration and drug-distribution calculations, so it is reported here both in litres and as a share of body weight.',
    quickAnswer: 'TBW in litres from weight, height, age and sex; the defaults give 41.0 L.'
  },
  'light-bulb-save': {
    title: 'LED Light Bulb Savings Calculator: Watts & Annual Saving',
    metaDesc: 'Compare the bulbs you run now with LEDs: running cost per year and the saving, from wattage, hours used and your electricity rate.',
    heading: 'LED light bulb savings and running cost',
    lead: 'Enter the wattage of the bulbs in place and of the LEDs replacing them, plus the hours they run and the price of electricity, and the page returns the annual running cost and the saving. The defaults save $111.69 a year across the bulbs entered.',
    quickAnswer: 'Annual running cost and saving from switching to LEDs; the defaults save $111.69 a year.'
  },
  // ------------------------------------------------------------------
  // Two tools added 2026-10-13 whose generated copy read as garble. Both have
  // single-letter inputs (a/b/c/d) or a "Draw 0.1 mL (10 units)" result, so the
  // engine's input-list and metric extraction emitted "the proportion a/b c/d"
  // and "a peptide concentration of Draw 0.1 mL (10 units)". These overrides set
  // the title, meta and answer-first block by hand and repair the sentences the
  // heading/lead/quick-answer slots do not cover.
  // ------------------------------------------------------------------
  // 3/4 = 9/d → d = 12 (cross product: 3 × 12 = 4 × 9 = 36).
  'proportion': {
    title: 'Proportion Calculator: Solve a/b = c/d for the Unknown',
    metaDesc: 'Proportion Calculator solves a ÷ b = c ÷ d for whichever term is missing, using cross multiplication and showing each step of the working.',
    heading: 'Solve a/b = c/d for the missing term',
    lead: 'A proportion is two ratios set equal: a ÷ b = c ÷ d. Cross multiplication turns that into a × d = b × c, so any one missing term is a single division away. The answer is unique and finite only while the value you divide by is non-zero — a zero denominator leaves the proportion with no single solution.',
    quickAnswer: 'With a = 3, b = 4 and c = 9, cross multiplication gives 3 × d = 4 × 9, so d = 36 ÷ 3 = 12. The check is 3 ÷ 4 = 0.75 and 9 ÷ 12 = 0.75, so both ratios match exactly.',
    aeoFixes: [
      ['<strong>Inputs:</strong> a, b, and c.', '<strong>Inputs:</strong> a, b, c and d, plus which of them is unknown.'],
      ['the a, b, and c feed the formula', 'all four values feed the formula'],
      ['The a, b, and c it asks for', 'The four values it asks for'],
      ['the proportion a/b c/d formula', 'the proportion formula'],
      ['enters the proportion a/b c/d', 'enters the calculation'],
      ['movement in the proportion a/b c/d shows', 'movement in the result shows'],
      ['a proportion a/b c/d of', 'a proportion of'],
      ['proportion a/b c/d formula', 'proportion formula'],
      ['the proportion a/b c/d', 'the missing term'],
      ['proportion a/b c/d', 'proportion'],
      ['the a, b, and c', 'the four values']
    ]
  },
  // 5 mg in 2 mL → 2.5 mg/mL; 250 µg → 0.1 mL → 10 units on U-100.
  'peptide-reconstitution': {
    title: 'Peptide Reconstitution Calculator: Concentration & Units',
    metaDesc: 'Work out peptide concentration from the vial amount and diluent volume, then the volume and syringe units for an amount per dose. Arithmetic only.',
    heading: 'Peptide concentration, draw volume and syringe units',
    lead: 'Dissolving a known mass of peptide in a known volume of diluent gives a concentration: mass ÷ volume. From there a requested amount is one division to find the volume, and the syringe scale turns that volume into the unit marks on the barrel. A syringe unit is a volume mark, never a mass — this page does the arithmetic and does not state or endorse any dose.',
    quickAnswer: '5 mg dissolved in 2 mL is 2.5 mg/mL, which is 2500 µg/mL. A 250 µg amount is 0.25 mg, so 0.25 ÷ 2.5 mg per mL gives 0.1 mL — 10 units on a U-100 syringe.',
    aeoFixes: [
      ['the page defaults produce a peptide concentration of Draw 0.1 mL (10 units).', 'the defaults — 5 mg in 2 mL — give 2.5 mg/mL, a draw volume of 0.1 mL and 10 units on a U-100 scale.'],
      ['<strong>Output:</strong> the peptide concentration, plus the intermediate steps behind it.', '<strong>Output:</strong> the concentration, the volume to draw and the equivalent syringe units, plus the steps behind each one.'],
      ['returns a peptide concentration of Draw 0.1 mL (10 units).', 'returns 2.5 mg/mL and a draw volume of 0.1 mL, which is 10 units on the U-100 scale.'],
      ['the peptide concentration from the Vial amount', 'the concentration, the draw volume and the syringe units from the vial amount'],
      ['computes the peptide concentration directly from your inputs', 'computes the concentration, the draw volume and the syringe units directly from your inputs'],
      ['movement in the peptide concentration', 'movement in the draw volume'],
      ['get the peptide concentration instantly', 'get the concentration and the draw volume instantly'],
      ['works out the peptide concentration', 'works out the concentration'],
      ['the peptide concentration', 'the concentration']
    ]
  },
  // ------------------------------------------------------------------
  // 2026-10-13 indexing-audit fixes. Two pages failed the deploy-wide SEO
  // gate: /lifestyle/pet-food-cost/ over the 70-char title limit (the
  // generator had appended every input label, and each "&" becomes "&amp;"
  // in the served HTML) and /tech/json-formatter/ over the 165-char meta
  // limit (the default JSON example, with its quotes entity-encoded). Both
  // rewrites drop the entity-inflating characters. Defaults taken from
  // js/data/lifestyle.js and js/data/tech-digital.js.
  // ------------------------------------------------------------------
  // 50 + 15 + 30 + 20 = $115/mo → $1,380/yr → $17,940 over a 13-year dog.
  'pet-food-cost': {
    title: 'Pet Food Cost Calculator: Monthly Food and Vet Costs',
    metaDesc: 'Add up food, treats, vet care and supplies to see what a pet really costs each month, then the yearly and lifetime totals. Free, and nothing is uploaded.',
    heading: 'What a pet costs each month',
    lead: 'A pet budget is four recurring lines: food, treats, veterinary care and medication, and general supplies. Add them for the monthly cost, multiply by twelve for the year, and by the pet\u2019s expected lifespan for the lifetime figure that makes adoption decisions honest.',
    quickAnswer: 'With the defaults — food $50, treats $15, vet and meds $30 and supplies $20 — the total is $115.00 a month, which is $1,380.00 a year. Across a 13-year dog lifespan that comes to about $17,940.'
  },
  // Default {"name":"CalcPro","tools":548} at 2 spaces → 4 indented lines.
  'json-formatter': {
    title: 'JSON Formatter: Pretty-Print, Minify and Validate',
    metaDesc: 'Paste JSON to pretty-print, minify or validate it in your browser. You get clean indented output and any parse error named — nothing is uploaded.',
    heading: 'Pretty-print, minify and validate JSON',
    lead: 'A formatter parses your text as JSON and re-serializes it with the indent you choose, so the structure becomes readable; minifying strips that whitespace again. If the text does not parse, the error message names where it failed instead of returning a broken document.',
    quickAnswer: 'The default {"name":"CalcPro","tools":548} pretty-prints to four indented lines with a 2-space indent, and the same value minifies back to a single line. Switch the indent to 4 spaces or a tab to change the output.'
  },
  // ------------------------------------------------------------------
  // Position 8-20 answer-section pass (data/top10-push-list.json, band 8-20).
  // These four pages rank on page 2 for a query that asks a QUESTION
  // ("how is dew point calculated", "auto fare meaning", "keyword density
  // formula", "how is a leap year calculated") while the answer-first block
  // opened with the generator's "What does the X do?" heading and a restatement
  // of the defaults. The heading, lead and quick answer now answer the question
  // that brings the impressions; every number is the tool's own output at its
  // own defaults, so nothing here is invented.
  // ------------------------------------------------------------------
  'dew-point': {
    title: 'Dew Point Calculator: When Will Condensation Form?',
    metaDesc: 'Enter air temperature and relative humidity to get the dew point with the Magnus formula. At 30 °C and 70% humidity it is 23.9 °C, where condensation starts.',
    heading: 'How is dew point calculated?',
    lead: 'Dew point is the temperature the air must cool to before water vapour begins to condense. It comes from two inputs — air temperature and relative humidity — run through the Magnus formula, not from a lookup table.',
    quickAnswer: 'At 30 °C and 70% relative humidity the dew point is 23.9 °C: once a surface drops to that temperature, condensation starts on it.'
  },
  'auto-fare': {
    title: 'Auto Fare Meaning: Base Fare Plus Per-km Rate',
    metaDesc: 'An auto fare is a fixed base charge plus a rate for every kilometre. Enter distance, base fare and per-km rate to get the total, with the arithmetic shown.',
    heading: 'What does auto fare mean?',
    lead: 'An auto-rickshaw fare is a base charge plus a per-kilometre rate: you pay the base whatever the distance, then the rate for each kilometre travelled, so the total rises in a straight line as the trip gets longer.',
    quickAnswer: 'With a base fare of 25 and 12 per km, a 5 km trip costs 25 + 5 × 12 = 85.'
  },
  'keyword-density': {
    title: 'Keyword Density Formula: Occurrences ÷ Words × 100',
    metaDesc: 'Density is keyword occurrences divided by total words, times 100. Paste text and a keyword to get the percentage and the 1-3% range usually cited.',
    heading: 'Keyword density formula',
    lead: 'Keyword density is the number of times a keyword appears, divided by the total number of words, multiplied by 100. Punctuation is not counted as a word, and the tool reports the occurrence count and word count it used.',
    quickAnswer: 'Three occurrences in a six-word sample is 3 ÷ 6 × 100 = 50%, far above the 1-3% range usually cited for prose.'
  },
  'leap-year': {
    title: 'How Is a Leap Year Calculated? The ÷4 Rule',
    metaDesc: 'A year is a leap year if it divides by 4, except century years, which must divide by 400. Enter a year to see the rule applied step by step.',
    heading: 'How is a leap year calculated?',
    lead: 'A year is a leap year when it divides evenly by 4 — unless it is a century year, which is a leap year only when it also divides evenly by 400. That extra clause is why 1900 was not a leap year and 2000 was.',
    quickAnswer: '2028 ÷ 4 = 507 exactly, and 2028 is not a century year, so it is a leap year with 366 days and a 29 February.'
  }
};

// ---------- 2b. title term overrides (measured, title-only) ----------
// `npm run seo:push-list` joins the 28-day GSC query→page export to each page's
// own title and names the query term the title is missing. 54 pages at
// position ≥ 11 were missing the term their impressions actually arrive on — the
// one on-page defect with measured demand behind it, and the only thing the push
// list asks for is the term, not new copy.
//
// Why a separate table instead of CTR_OVERRIDES: a CTR entry must carry a full
// answer-first block (title, metaDesc > 70 chars, heading, lead > 120 chars,
// quickAnswer), and every number in it has to be computed from the tool's own
// formula. Inventing 41 answer blocks to change 41 titles would risk exactly the
// fabricated copy this repo refuses. These entries change the title only; the
// snippet, the aeo block and the FAQ answers stay as generated.
//
// Two rules per entry, both enforced by tests/unit/seo-overrides.test.js:
//   1. the title must contain the missing term the push list named, and
//   2. the title must stay true to the tool — so an entry is only added where
//      the term is something the tool actually takes or returns. Rows whose
//      missing token is a number, an abbreviation or a product the tool does not
//      implement are deliberately absent (see the skip list below).
const TITLE_OVERRIDES = {
  // ------------------------------------------------------------------
  // Zero-click rows from `npm run seo:zero-click`. These pages already sit on
  // page 1-2 with 0 clicks, so the snippet, not the ranking, is the lever. The
  // term added is one the page's own top query uses AND one its copy already
  // proves (the annual spend, the LMP method, the recovery-day output) — a term
  // the tool does not deliver is deliberately left out, which is why "baby"
  // (child-height), "home" (gym-cost-per-visit) and "online" (carpet) are not
  // here: those queries mean a different tool or nothing at all.
  // ------------------------------------------------------------------
  // "packs per year calculator" — 82 impressions, position 10.7. Its worked
  // example is annual spend = $8 × 1 × 365 = $2,920, so "per Year" is the
  // tool's own output, not a promise.
  'cigarette-cost': 'Smoking Cost Calculator: Cost per Year & per Pack',
  // "vacation cost calculator" — 101 impressions, position 16.3. The monthly
  // target is what the tool returns, so "Cost" belongs beside "Savings".
  // NOT here: this id also has a CTR entry, and that table is applied after this
  // one — a title in both places means the CTR text silently wins while this row
  // keeps failing `npm run seo:overrides:verify` ("title found on 0 pages").
  // The "Cost" term lives in the CTR title itself.
  // pregnancy and jet-lag are NOT here: they already own a CTR entry with an
  // answer-first block, and the CTR table writes their title. Their term fixes
  // live there, one row each, so two tables never fight over the same string.
  // "calculate annual percentage yield" — 263 impressions, position 24.6.
  'apy-calculator': 'APY Calculator: Annual Percentage Yield & Rate',
  // "cost of capital calculator" — 152 impressions, position 77.4.
  'wacc': 'WACC Calculator: Weighted Average Cost of Capital',
  // "payroll calculator" — 87 impressions, position 73.8.
  'dubai-salary': 'Dubai Salary & Payroll Calculator: Take-Home Pay',
  // "beef cooking time calculator" — 66 impressions, position 65.4. The tool
  // takes a Meat choice; beef is one of them.
  'meat-cooking-time': 'Beef Cooking Time Calculator: Minutes per kg',
  // "swiss salary calculator" — 42 impressions, position 62.1.
  'switzerland-take-home-salary': 'Swiss Salary Calculator: Switzerland Take-Home Pay',
  // "water tank size calculator" — 40 impressions, position 63.9.
  'water-tank': 'Water Tank Size Calculator: Capacity in Litres',
  // "road trip budget calculator" — 40 impressions, position 57.2.
  'road-trip-cost': 'Road Trip Budget Calculator: Fuel & Trip Cost',
  // "how much chlorine to add to pool calculator" — 37 impressions, position 67.8.
  'pool-chemicals': 'Pool Chemical Calculator: How Much Chlorine to Add',
  // "municipal bonds calculator" — 34 impressions, position 36.4.
  'tax-equivalent-yield': 'Tax Equivalent Yield Calculator: Municipal Bonds',
  // "salary after tax ontario" — 30 impressions, position 54.
  'canada-take-home-salary': 'Canada Salary After Tax: Ontario Take-Home Pay',
  // "how common is my name" — 28 impressions, position 71.4.
  'baby-name': 'Baby Name Popularity: How Common Is a Name',
  // "28 lakh home loan emi calculator" — 27 impressions, position 82.8.
  'home-loan-emi-india': 'Home Loan EMI Calculator India: Lakh & Interest',
  // "dosing calculator" — 26 impressions, position 77.8.
  'drug-dosage': 'Drug Dosage Calculator: Dosing by Weight',
  // "i savings bond calculator" — 25 impressions, position 38.5.
  'ibond-value': 'I Bond Value Calculator: Series I Savings Bond',
  // "winters formula" — 25 impressions, position 44.8. The generated title used
  // the apostrophe form ("Winter's") while the query does not, so the token miss
  // here is purely punctuation.
  'winters-formula': 'Winters Formula Calculator: Bicarbonate & PaCO2',
  // "80 business days from today" — 23 impressions, position 45.2.
  'business-days': 'Business Days Calculator: Days From Today',
  // "house painting cost calculator" — 22 impressions, position 84.7.
  'paint-cost': 'House Painting Cost Calculator: Sq Ft & Gallons',
  // "calculate driving and rest time" — 21 impressions, position 33.4.
  'trip-time': 'Driving Time Calculator: Trip Time & Rest Breaks',
  // "how many lumens do i need for each room in the house" — 19 impressions,
  // position 84.1. The push list reported "each, house" as missing; "each" is
  // narration ("per Room" already says it) and "house" is the page's actual
  // domain, so the title names it instead of the generic "Lighting Calculator".
  'lighting-rooms': 'How Many Lumens per Room: House Lighting Calculator',
  // "cpf contribution calculator" — 19 impressions, position 56.9.
  'singapore-cpf': 'Singapore CPF Contribution Calculator: Salary',
  // "linear regression solver" — 18 impressions, position 59.6.
  'linear-regression': 'Linear Regression Calculator & Solver: X, Y',
  // "how much does property tax cost" — 17 impressions, position 78.9.
  'property-tax': 'Property Tax Calculator: Cost, Value & Rate',
  // "employer super calculator" — 17 impressions, position 86.7. The tool takes
  // the Super Guarantee (the employer contribution rate).
  'australia-super': 'Australia Employer Super Calculator: Salary',
  // "goal gpa calculator" — 14 impressions, position 40.7.
  'gpa-target': 'Goal GPA Calculator: Target GPA by Credits',
  // "cost basis calculator stock" — 14 impressions, position 50.9.
  'cost-basis-avg': 'Average Cost Basis Calculator: Stock Shares',
  // "ohms law calculator" — 14 impressions, position 69.6. The generated title
  // used the apostrophe form ("Ohm's").
  'ohms-law': 'Ohms Law Calculator: Voltage, Current & Resistance',
  // "concrete calculator for fence posts" — 12 impressions, position 50.6.
  'post-hole-concrete': 'Concrete for Fence Posts: Post Hole Calculator',
  // "estimate wall square footage" — 12 impressions, position 37.2.
  'siding-squares': 'Siding Calculator: Squares & Square Footage',
  // "estimate grocery list cost" — 12 impressions, position 73.3. "cost" only:
  // the tool has no list input (people, meals/day, budget per meal), so the
  // "list" half of that query is a claim it cannot support — see NONTERM below.
  'grocery-budget': 'Grocery Cost Calculator: Weekly Budget per Person',
  // "cloud data transfer costs" — 12 impressions, position 77.
  'data-transfer-cost': 'Cloud Data Transfer Costs Calculator: Egress',
  // "load testing calculator" — 12 impressions, position 36.
  'load-test-users': 'Load Testing Calculator: Virtual Users & RPS',
  // "diesel tank calculation" — 11 impressions, position 22.8.
  'fuel-tank-range': 'Diesel Tank Range Calculator: km per Tank',
  // "box wine servings" — 10 impressions, position 13.2.
  'wine-servings': 'Wine Servings Calculator: Box & Bottles',
  // "vacation expense calculator" — 9 impressions, position 20.1.
  'vacation-budget': 'Vacation Expense Calculator: Trip Budget',
  // "how many tolls on my trip" — 8 impressions, position 53.8. The number of
  // tolls is the tool's own first input, so it is a real claim, and "How Many"
  // is how the query is actually phrased (the push list flagged "many").
  'toll-cost': 'Toll Cost Calculator: How Many Tolls per Trip',
  // "how common is my name"-style count intent is covered above; here the query
  // is "calculating reading level" — 7 impressions, position 89.1.
  'reading-grade': 'Reading Level Calculator: Readability Score',
  // "grocery bill calculator" — 6 impressions, position 63.7.
  'grocery-budget-optimizer': 'Grocery Bill Calculator: Budget Optimizer',
  // "5.64km in miles" — 5 impressions, position 61. The tool converts steps to
  // distance, so the honest phrasing is the unit, not the number.
  'steps-to-distance': 'Steps to Miles Calculator: Walk Distance',
  // "calculate fertilizer application rates" — 5 impressions, position 90.6.
  'fertilizer': 'Fertilizer Application Rates Calculator: N-P-K',
  // "rate of falling" — 5 impressions, position 81.2. The title cannot START with
  // "Free" (a shape the sitewide test bans), so the phrase sits after the subject.
  'free-fall': 'Falling Object Calculator: Free Fall Speed & Rate',
  // "how to decide how much storage you need" — 5 impressions, position 76.6. The
  // generated title ended in three raw input labels ("Photos, Video Hours &
  // Documents"); this states what the tool answers instead. "decide" is narration,
  // so the row is listed in TITLE_OVERRIDE_NONTERM rather than claimed as a term.
  'storage-need': 'Storage Needs Calculator: How Much Space You Need',
  // "project estimate for website development" — 5 impressions, position 94.
  'website-cost': 'Website Development Cost: Project Estimate',
  // Not from the push list: the one sitewide title defect it reports independent
  // of impressions. "Quartile Calculator: Data" ended in the raw input label
  // ("Data (comma separated)") instead of naming what the tool returns, which is
  // the same machine shape the P4/U rules chase elsewhere. The tool takes a data
  // set and returns Q1, median, Q3 and IQR, so the title names those.
  'quartiles': 'Quartile Calculator: Q1, Median, Q3 & IQR',

  // ------------------------------------------------------------------
  // Second pass. The rows above were found when this file listed the top 250
  // API rows; that pull was sorted by clicks, so the impression-heavy pages with
  // no clicks were not in it at all. With the full page set (see
  // scripts/gsc-export-pages.cjs) these 18 additional pages surfaced, each with
  // the same defect: the title omits the term the page's impressions arrive on.
  // ------------------------------------------------------------------
  // "parking lot cost calculator" — 106 impressions.
  'parking-cost': 'Parking Lot Cost Calculator: Daily Rate & Days',
  // "imaginary number calculator" — 24 impressions. The tool takes a real and an
  // imaginary part, so "imaginary" is literally what it computes with.
  'complex': 'Complex & Imaginary Number Calculator',
  // "investopedia cagr calculator" — 21 impressions. "investopedia" is a brand
  // and is not targeted; CAGR is the same quantity as a geometric mean return,
  // which is what this tool computes.
  'geometric-mean': 'Geometric Mean Return & CAGR Calculator',
  // "cost conversion calculator" — 11 impressions. The current title was also
  // cut off mid-label ("...: Amount to"), so this fixes both defects.
  'currency-exchange': 'Currency Conversion Cost Calculator: Exchange Fees',
  // "square equation solver" — 9 impressions; "square" is the query's word for
  // a quadratic, and the tool solves ax² + bx + c = 0.
  'quadratic': 'Square & Quadratic Equation Solver: Roots',
  // "weight loss time calculator" — 9 impressions.
  'weight-loss': 'Weight Loss Time Calculator: Pace to Goal',
  // "display resolution calculator" — 9 impressions.
  'screen-resolution': 'Screen Resolution & Display Calculator',
  // "energy bill calculator" — 8 impressions.
  'electricity': 'Electricity & Energy Bill Calculator: kWh Cost',
  // "sod square foot calculator" — 8 impressions.
  'sod': 'Sod Calculator: Square Foot Lawn Area',
  // "garden size calculator" — 8 impressions.
  'garden': 'Garden Size Calculator: Area & Spacing',
  // "529 compound interest calculator" — 8 impressions.
  '529-plan': '529 Plan Compound Interest Calculator',
  // "immunization catch up schedule calculator" — 7 impressions. The tool reads a
  // child's age and reports the doses due at that age, which is exactly the
  // catch-up question, so the title wears "Catch-Up" as well as "Schedule".
  'vaccination-schedule': 'Immunization Catch-Up Schedule Calculator: Doses Due',
  // "grass watering calculator" — 7 impressions.
  'lawn-watering': 'Lawn & Grass Watering Calculator',
  // "plank test" — 6 impressions.
  'plank-test': 'Plank Test: Hold Time Standards by Age',
  // "capital gain tax calculator india" — 5 impressions.
  'capital-gains-india': 'Capital Gains Tax Calculator India: Short & Long Term',
  // "inhand salary calculator ireland" — 5 impressions. "In-hand" is the searched
  // synonym for take-home pay, which is what the tool returns.
  'ireland-take-home-salary': 'Ireland Take-Home Salary Calculator: In-Hand Pay',
  // "frames per second monitor" — 5 impressions.
  'monitor-refresh': 'Monitor Refresh Rate & Frames per Second (FPS)',
  // B/C keyword-map rows whose owner page is right but whose title omits the
  // term the query actually uses. Only terms the tool honestly implements:
  //   timesheet-hours  — it converts clock-in/clock-out entries (time card)
  //   date-diff        — it counts days between two dates (day count)
  //   loan-qualify     — it estimates how much borrowing the income supports
  'timesheet-hours': 'Time Card Calculator: Hours, Minutes and Payroll',
  'date-diff': 'Date Difference Calculator: Day Count Between Dates',
  'loan-qualify': 'Loan Qualification Calculator: How Much Can I Borrow?',

  // ------------------------------------------------------------------
  // CTR surgery on the 14 highest-impression pages (28-day GSC page export,
  // 2026-09-16 → 2026-10-14, data/gsc-page-impressions.json).
  //
  // These are not "missing term" rows — 12 of the 14 already wore their query
  // (the push list calls them `already-targets`). What they share is the same
  // measurable symptom: thousands of impressions and **zero clicks**, because
  // the title described the tool's own inputs ("Home Value & Rate", "Values &
  // Weights", "Current Weight, Height") instead of what the searcher gets.
  // Each rewrite keeps the query term the page already ranks on and names the
  // output the tool actually returns — no new claim, no numbers invented.
  // ------------------------------------------------------------------
  // 1,012 impressions, position 75.1, 0 clicks. Returns an annual premium.
  'home-insurance': 'Home Insurance Calculator: What You\u2019ll Pay a Year',
  // 608 impressions, position 23.8, 0 clicks. Returns a monthly PMI figure.
  'pmi-calculator': 'PMI Calculator: Monthly Mortgage Insurance Cost',
  // 426 impressions, position 13.6, 0 clicks. Tool desc: "FHA mortgage with MIP".
  'fha-loan': 'FHA Loan Calculator: Monthly Payment With MIP',
  // 415 impressions, position 27, 0 clicks. Returns how long a download takes.
  'internet-speed': 'Download Time Calculator: How Long a File Takes',
  // 319 impressions, position 26.2, 0 clicks. Nominal rate + compounding → APY.
  // "percentage" stays in the title: this row's push-list term is
  // "percentage" (query "calculate annual percentage yield").
  'apy-calculator': 'APY Calculator: Annual Percentage Yield From a Rate',
  // 299 impressions, position 26.9, 1 click. Take-home pay in AED, 0% tax.
  // "payroll" stays: this row's push-list term (query "payroll calculator").
  'dubai-salary': 'Dubai Salary & Payroll Calculator: AED Take-Home Pay',
  // 238 impressions, position 37, 0 clicks. Drive count/size/level → usable TB.
  'raid-capacity': 'RAID Capacity Calculator: Usable Space After Parity',
  // 236 impressions, position 39.5, 0 clicks. Balances ÷ limits.
  'credit-utilization': 'Credit Utilization Calculator: Balance vs Limit',
  // 230 impressions, position 9.1 — the best-positioned page here. Returns
  // growth potential from training years, surplus and push-up capacity.
  'muscle-gain': 'Muscle Gain Calculator: How Much Muscle You Can Gain',
  // 203 impressions, position 11.4, 0 clicks. Returns an annual premium.
  'renters-insurance': 'Renters Insurance Calculator: Cost per Year',
  // 162 impressions, position 52, 0 clicks. kw: "weighted average grades weights".
  'weighted-average': 'Weighted Average Calculator: Grades & Weights',
  // 156 impressions, position 24.4, 0 clicks. Income and debts → affordable rent.
  'rent-affordability': 'Rent Affordability Calculator: Rent You Can Afford',

  // ------------------------------------------------------------------
  // Truncated titles. Six generated titles were 60-char-clipped mid-phrase
  // and shipped that way ("…: Variant A", "…: Number of", "…Hot In, Hot Out &
  // Cold In"). Nothing was wrong with the pages — the host title was simply
  // longer than the SERP budget. Each rewrite states the tool's own output.
  // ------------------------------------------------------------------
  // Z-score for a two-variant conversion test.
  'ab-test-significance': 'A/B Test Significance Calculator: Z-Score of Two Variants',
  // Payback on capital cost, sessions and pricing.
  'ev-charger-business-roi': 'Business EV Charger ROI: Payback on Installed Units',
  // Funding gap after scholarships, family contribution and work-study.
  'scholarship-gap': 'Scholarship Funding Gap Calculator: Cost Left per Year',
  // LMTD from four temperatures.
  'heat-exchanger': 'Heat Exchanger LMTD Calculator: Four Temperatures',
  // Compares two cities from their cost indices.
  'cost-of-living': 'Cost of Living Calculator: Compare Two Cities',
  // Monthly cash flow, annual net and gross yield across a portfolio.
  'rental-portfolio-tracker': 'Rental Portfolio Cash Flow & Yield Tracker'
};

// Rows the push list flagged as missing a term, but where adding the term would be
// a claim the tool cannot support. Listed here so the omission is a decision with
// a reason, not a silent skip:
//   anion-gap            missing "agap"      — an abbreviation, not a term
//   dividend             missing "savings account" — a different product
//   wavelength           missing "broglie"   — de Broglie is not wave-speed/frequency
//   carbon-dating        missing "range"     — the tool returns remaining C-14, not a range
//   tile-grout           missing "thinset"   — a different product from grout
//   vo2max               missing "step test" — the tool takes resting HR, not a step protocol
//   squat-standards      missing "average/male" — no normative dataset behind it
//   situp-test           missing "average"    — same, no normative dataset
//   laundry-cost         missing "weight"    — the tool costs loads, not weight
//   sharpe-ratio         missing "measure"   — a synonym for calculator
//   streaming-value      missing "live"      — the tool prices a subscription, not a live stream
//   treadmill-pace       missing "many/min"  — the query asks for steps (cadence); the
//                                               tool computes pace from speed + incline,
//                                               so neither token is a real output
//   cleaning-time        missing "times"    — plural filler for "time"; "Cleaning
//                                               Times Calculator" is not English
//   percentile-rank      missing "ctrl"     — the query itself is malformed
//                                               ("how do i calculate my ctrl score?")
//   code-line-count      missing "codecalculator" — a glued query token, not a term
//   rms                  missing "find"     — narration ("how to find root mean square")
//   calorie              missing "kalori"   — a non-English spelling of calorie
const TITLE_OVERRIDE_SKIPS = [
  'anion-gap', 'dividend', 'wavelength', 'carbon-dating', 'tile-grout', 'vo2max',
  'squat-standards', 'situp-test', 'laundry-cost', 'sharpe-ratio', 'streaming-value',
  'treadmill-pace', 'cleaning-time', 'percentile-rank', 'code-line-count', 'rms', 'calorie'
];

// Entries that rewrite a defective title without quoting the missing term
// literally — the term was narration ("decide"), a count word, or a feature the
// tool does not have. They are improvements, so they stay; the term-coverage
// test in tests/unit/seo-overrides.test.js excludes them by id.
//   pool-chemicals       — the query also carries "australia", a geography the
//                          page does not vary by; "how much to add" is the honest part
//   grocery-budget       — "list" names an input the tool does not have; the page
//                          states "grocery" and "cost", which is all it computes
const TITLE_OVERRIDE_NONTERM = ['storage-need', 'pool-chemicals', 'grocery-budget'];

// ---------- 3. raw result-label repairs ----------
// The generator filled the "result noun" slot with a raw label string instead of
// prose, so 30 pages shipped copy like "get a between weight of 2.2046 lb",
// "get force units of 22.4809 lbf" and "How is the btufthf etc calculated?".
// These pages do not all need a new answer-first block — the defect is the label
// itself, which the generator repeated in the aeo, the long-form desc, the FAQ
// answers AND the lsi keyword tags. Each entry below replaces that label with a
// real noun phrase across every one of those fields, and gives the page a
// hand-written title and snippet so the search result reads like English.
//
// fix order matters: the lsi phrase is repaired first ("between weight formula"
// reads badly as "converted weight formula"), then any irregular sentence, then
// the "a "/"the " forms, then the bare label as a catch-all.
const labelFix = (tok, lsiPhrase, good, extra) => [
  [tok + ' formula', lsiPhrase],
  ...(extra || []),
  ['a ' + tok, 'the ' + good],
  ['the ' + tok, 'the ' + good],
  [tok, good]
];

const escRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A needle must never match text that already reads correctly. When the
// replacement contains the needle, the part of the replacement before the
// needle is a "already done" prefix ('converted ' in 'converted fuel economy')
// and the part after it is an "already done" suffix (' rate' in 'the hourly
// rate'). Guarding both sides makes the repair idempotent: without it a second
// run turns correct copy into "converted converted fuel economy".
const guardedSrc = (from, to) => {
  if (from instanceof RegExp) return from.source;
  const i = typeof to === 'string' ? to.indexOf(from) : -1;
  if (i < 0) return escRe(from);
  const pre = i > 0 ? to.slice(0, i) : '';
  const post = to.slice(i + from.length);
  return (pre ? '(?<!' + escRe(pre) + ')' : '') + escRe(from) + (post ? '(?!' + escRe(post) + ')' : '');
};

// Applied in ONE pass, longest needle first, so a replacement can never be
// re-scanned by a shorter needle in the same list.
const applyFixText = (s, fixes) => {
  if (!fixes || !fixes.length) return s;
  const items = fixes.map(([from, to]) => {
    const src = guardedSrc(from, to);
    // Order by the NEEDLE's own length, not by the guarded pattern's length. A
    // lookbehind guard makes a short needle's regex longer than an unguarded
    // longer needle, so sorting on src.length put 'fuel economy' ahead of
    // 'fuel economy formula' and the repair only reached its intended phrase on
    // a SECOND pass (fuel-efficiency-converter's lsi tag stayed 'converted fuel
    // economy formula' after one run and made `seo:overrides:check` fail).
    // Longest needle first is the documented contract: the lsi phrase runs
    // before the bare-label catch-all.
    const len = typeof from === 'string' ? from.length : src.length;
    return { src, to, len, test: new RegExp('^(?:' + src + ')$') };
  }).sort((a, b) => b.len - a.len);
  const combined = new RegExp(items.map((i) => i.src).join('|'), 'g');
  return s.replace(combined, (m) => {
    const hit = items.find((i) => i.test.test(m));
    return hit ? hit.to : m;
  });
};

const LABEL_REPAIRS = {
  // title: 30-60 chars (the build gate). metaDesc: 70-185 chars, answer-first,
  // every factor below is a definition, not an estimate.
  'weight': {
    title: 'Weight Converter: kg to lbs and Other Units',
    metaDesc: 'Convert weight between kilograms, pounds, ounces and grams. 1 kilogram is 2.20462 pounds, and the factor and the working are shown at each step.',
    fix: labelFix('between weight', 'weight conversion formula', 'converted weight')
  },
  'volume': {
    title: 'Volume Converter: Litres to Gallons and More',
    metaDesc: 'Convert volume between litres, millilitres, US gallons and fluid ounces. 1 litre is 0.2642 US gallons, with each conversion step shown.',
    fix: labelFix('between volume', 'volume conversion formula', 'converted volume')
  },
  'area': {
    title: 'Area Converter: m² to ft² and Other Units',
    metaDesc: 'Convert area between square metres, square feet, acres and hectares. 1 square metre is 10.7639 square feet, with the factor shown.',
    fix: labelFix('between area', 'area conversion formula', 'converted area')
  },
  'speed': {
    title: 'Speed Converter: km/h to mph and m/s',
    metaDesc: 'Convert speed between km/h, mph, m/s and knots. 100 km/h is 62.14 mph, and 1 mph is about 1.609 km/h going the other way.',
    fix: labelFix('between speed', 'speed conversion formula', 'converted speed')
  },
  'data-storage': {
    title: 'Data Storage Converter: GB to MB, KB and Bytes',
    metaDesc: 'Convert data sizes between bytes, kilobytes, megabytes and gigabytes. 1 gigabyte is 1,024 megabytes on the binary scale most systems report.',
    fix: labelFix('between data', 'data size conversion formula', 'converted data size')
  },
  'angle': {
    title: 'Angle Converter: Degrees to Radians and Gradians',
    metaDesc: 'Convert angles between degrees, radians, gradians and turns. 90 degrees is 1.5708 radians, and a full turn is 360 degrees or 2π radians.',
    fix: labelFix('between angle', 'angle conversion formula', 'converted angle')
  },
  'energy': {
    title: 'Energy Converter: Joules, kWh, Calories and BTU',
    metaDesc: 'Convert energy between joules, kilojoules, kilowatt-hours, calories and BTU. 1 kWh is 3.6 million joules, or about 3,412 BTU.',
    fix: labelFix('between energy', 'energy conversion formula', 'converted energy')
  },
  'frequency-conv': {
    title: 'Frequency Converter: Hz, kHz, MHz and GHz',
    metaDesc: 'Convert frequency between hertz, kilohertz, megahertz and gigahertz. 1 MHz is 1,000,000 Hz, and 1 GHz is 1,000 MHz.',
    fix: labelFix('between frequency', 'frequency conversion formula', 'converted frequency')
  },
  'force-conv': {
    title: 'Force Converter: Newtons to lbf and kgf',
    metaDesc: 'Convert force between newtons, kilonewtons, pound-force and kilogram-force. 100 newtons is 22.48 lbf, because 1 N is 0.224809 lbf.',
    fix: labelFix('force units', 'force conversion formula', 'converted force')
  },
  'fuel-efficiency-converter': {
    title: 'Fuel Efficiency Converter: L/100km to MPG',
    metaDesc: 'Convert fuel economy between litres per 100 km, miles per gallon (US and UK) and km per litre. 10 L/100 km is about 23.5 mpg US.',
    // 'mpgus' is the generator's own bare unit code, left in the body copy.
    fix: labelFix('fuel economy', 'fuel efficiency conversion formula', 'converted fuel economy', [['mpgus', 'mpg (US)']])
  },
  'radiation-conv': {
    title: 'Radiation Converter: Sv, mSv, Gy and rem',
    metaDesc: 'Convert radiation between sieverts, millisieverts, grays and rem. 1 sievert is 1,000 millisieverts, with absorbed and equivalent dose kept apart.',
    fix: labelFix('radiation measurement', 'radiation conversion formula', 'converted radiation value')
  },
  'bit-rate-conv': {
    title: 'Bit Rate Converter: Mbps to kbps and Gbps',
    metaDesc: 'Convert data transfer rates between bits, kilobits, megabits and gigabits per second. 1 megabit per second is 1,000 kilobits per second.',
    fix: labelFix('data rates', 'bit rate conversion formula', 'converted data rate')
  },
  'luminance-conv': {
    title: 'Luminance Converter: Lux to Foot-candles',
    metaDesc: 'Convert light levels between lux and foot-candles. 1 foot-candle is 10.7639 lux, so 500 lux is about 46.5 foot-candles.',
    fix: labelFix('between lux', 'luminance conversion formula', 'converted luminance')
  },
  'molarity-conv': {
    title: 'Molarity Converter: Molar to Millimolar',
    metaDesc: 'Convert concentration between molar, millimolar and micromolar. 1 molar is 1,000 millimolar, and the same factor applies at every step.',
    fix: labelFix('concentration between', 'molarity conversion formula', 'converted concentration')
  },
  'flow-rate-conv': {
    title: 'Flow Rate Converter: L/s to m³/h and GPM',
    metaDesc: 'Convert flow rate between litres per second, cubic metres per hour and gallons per minute. 1 litre per second is 3.6 m³/h.',
    fix: labelFix('between l/s', 'flow rate conversion formula', 'converted flow rate', [
      ['get between l/s', 'get the converted flow rate']
    ])
  },
  'roman-numeral': {
    title: 'Roman Numeral Converter: Numbers to Roman Numerals',
    metaDesc: 'Convert between numbers and Roman numerals. 1,000 is M, 500 is D, 4 is IV and 9 is IX, with the subtractive rules applied in order.',
    fix: labelFix('between arabic', 'roman numeral conversion formula', 'roman numeral')
  },
  'ppm-conv': {
    title: 'PPM Converter: ppm to ppb and Percent',
    metaDesc: 'Convert concentration between ppm, ppb, percent and parts per thousand. 1 ppm is 1,000 ppb, and 10,000 ppm is 1 percent.',
    fix: labelFix('between ppm', 'concentration conversion formula', 'converted concentration')
  },
  'thermal-conductivity': {
    title: 'Thermal Conductivity Converter: W/m·K to BTU',
    metaDesc: 'Convert thermal conductivity between W/(m·K), BTU/(ft·h·°F) and kcal/(h·m·°C). 1 W/(m·K) is about 0.578 BTU/(ft·h·°F).',
    fix: labelFix('btufthf etc', 'thermal conductivity conversion formula', 'converted conductivity')
  },
  'radiation-dose-conv': {
    title: 'Radiation Dose Converter: Gray to Rad',
    metaDesc: 'Convert absorbed radiation dose between gray, rad, sievert and rem. 1 gray is 100 rad, and 1 sievert is 100 rem.',
    fix: labelFix('between gray', 'radiation dose conversion formula', 'converted dose')
  },
  'acceleration-conv': {
    title: 'Acceleration Converter: m/s² to g-force',
    metaDesc: 'Convert acceleration between m/s², g-force, ft/s² and Gal. 1 g is 9.80665 m/s², so 9.81 m/s² is very close to one g.',
    // Explicit pairs only: a bare 'm/s²' catch-all would corrupt the real unit
    // in "9.8100 m/s²", so the broken label is matched only in its label slots.
    fix: [
      ['m/s² formula', 'acceleration conversion formula'],
      ['get a m/s² of', 'get an acceleration of'],
      ['produce a m/s² of', 'produce an acceleration of'],
      ['a m/s²', 'an acceleration'],
      ['the m/s²', 'the acceleration']
    ]
  },
  'dbm-watts': {
    title: 'dBm to Watts Converter: dBm ↔ W and mW',
    metaDesc: 'Convert between dBm and watts. 30 dBm is 1 watt and 0 dBm is 1 milliwatt, on the logarithmic scale used for radio and audio power.',
    fix: labelFix('between dbm', 'dBm conversion formula', 'converted power')
  },
  'unit-converter': {
    title: 'Universal Unit Converter: Length, Mass and More',
    metaDesc: 'Convert between length, mass, volume, temperature and more in one place. 1 m is 3.2808 ft and 1 kg is 2.2046 lb, with each factor shown.',
    fix: labelFix('between any', 'unit conversion formula', 'converted value')
  },
  'fraction-percent': {
    title: 'Fraction to Percent to Decimal Converter',
    metaDesc: 'Convert between fractions, decimals and percentages. 3/4 is 0.75 and 75%, and the tool shows the numerator and denominator behind it.',
    fix: labelFix('between fraction', 'fraction conversion formula', 'converted value')
  },
  'scientific-notation': {
    title: 'Scientific Notation Converter: Decimal to Scientific',
    metaDesc: 'Convert between decimal and scientific notation. 0.000123 is 1.23 × 10⁻⁴, and the converter keeps the significant figures you enter.',
    fix: labelFix('between decimal', 'scientific notation conversion formula', 'converted number')
  },
  'polar-rect': {
    title: 'Polar ↔ Rectangular Coordinates Converter',
    metaDesc: 'Convert between polar and rectangular coordinates. A polar point of r = 5 at 30° is x = 4.3301 and y = 2.5 in rectangular form.',
    fix: labelFix('between polar', 'polar conversion formula', 'converted coordinates')
  },
  'annulus-area': {
    title: 'Annulus (Ring) Area Calculator: Outer Radius & Inner Radius',
    metaDesc: 'Find the area of a ring (annulus) from its outer and inner radius. An outer radius of 8 and an inner radius of 5 give about 122.52 square units.',
    fix: labelFix('area between two', 'annulus area formula', 'ring area')
  },
  'wavelength-freq': {
    title: 'Wavelength ↔ Frequency: Light & Wave Physics',
    metaDesc: 'Convert between wavelength and frequency using c = 3 × 10⁸ m/s. A 550 nm wave of light is about 5.45 × 10¹⁴ Hz.',
    fix: labelFix('between wavelength', 'wavelength conversion formula', 'converted wavelength')
  },
  'mole-conversion': {
    title: 'Mole Conversion Calculator: Mass & Molar Mass',
    metaDesc: 'Convert between mass, moles and molar mass using moles = mass ÷ molar mass. 18 g of water at 18 g/mol is 1 mole, with each step shown.',
    fix: labelFix('between mass', 'mole conversion formula', 'converted amount', [
      ['get between mass', 'get the converted amount']
    ])
  },
  'currency-converter': {
    title: 'Currency Converter — USD to PKR Exchange Rates',
    metaDesc: 'Convert between currencies using live exchange rates covering 150+ pairs, from USD to PKR, EUR, GBP and more.',
    fix: labelFix('between 150+', 'currency conversion formula', 'converted amount')
  },
  // Same species, found by widening the audit from ": Value" to every raw input
  // label appended to a title (": Amount", ": Number"). Three of these have a
  // clean body and only needed the title; the rest carried the label into the
  // body too.
  'salary-converter': {
    title: 'Salary Converter: Hourly, Monthly and Annual Pay',
    metaDesc: 'Convert a salary between hourly, monthly and annual figures. $50,000 a year is about $4,167 a month and $24.04 an hour at 40 hours a week.',
    fix: [
      ['hourly formula', 'salary conversion formula'],
      ['a hourly', 'an hourly rate'],
      ['the hourly', 'the hourly rate']
    ]
  },
  'currency-conv': {
    title: 'Currency Converter: Fixed Exchange Rate Calculator',
    metaDesc: 'Convert between currencies at a fixed exchange rate you set. Enter an amount and the rate to get the converted figure with the working shown.',
    fix: labelFix('currencies fixed', 'fixed-rate currency conversion formula', 'converted amount')
  },
  'paper-size-conv': {
    title: 'Paper Size Converter: A4, A5, B5 Dimensions',
    metaDesc: 'Convert between A, B and C series paper sizes. A4 is 210 × 297 mm and A5 is half that at 148 × 210 mm, with each step shown.',
    fix: labelFix('a/b-series paper sizes', 'paper size conversion formula', 'paper dimensions')
  },
  'cooking': {
    title: 'Cooking Converter: Cups, ml, tbsp and tsp',
    metaDesc: 'Convert cooking measurements between cups, millilitres, tablespoons and teaspoons. 1 US cup is about 240 ml and 1 tbsp is exactly 3 tsp.',
    fix: labelFix('cooking measurements', 'cooking conversion formula', 'converted measurement')
  },
  'prime-factor': {
    title: 'Prime Factorization Calculator: Factor Any Number',
    metaDesc: 'Break any whole number into its prime factors. 360 is 2 × 2 × 2 × 3 × 3 × 5, and the tool shows each division of the working.',
    fix: []
  },
  'significant-figures': {
    title: 'Significant Figures Calculator: Rounding and Sig Figs',
    metaDesc: 'Round a number to a chosen number of significant figures. 0.004567 to two significant figures is 0.0046, with the counting rule shown.',
    fix: []
  },
  'digital-root': {
    title: 'Digital Root Calculator: Repeated Digit Sum',
    metaDesc: 'Find the digital root of a number by repeatedly summing its digits. The digital root of 9,876 is 3, since 9+8+7+6 = 30 and 3+0 = 3.',
    fix: []
  },
  'gst-india': {
    title: 'GST Calculator India: Add or Remove GST',
    metaDesc: 'Add or remove GST at any rate. ₹10,000 plus 18% GST is ₹11,800, and the tool shows the base, the tax and the total separately.',
    fix: labelFix('gst amount', 'GST calculation formula', 'GST amount')
  },
  'uae-vat': {
    title: 'UAE VAT Calculator: Add or Remove 5% VAT',
    metaDesc: 'Add or remove 5% VAT. AED 1,000 plus 5% VAT is AED 1,050, and the tool shows the base amount and the tax separately.',
    // 'add' is a real English word, so every pair is explicit (the single
    // 'the add' needle only fires after the longer, specific needles).
    fix: [
      ['add formula', 'VAT amount formula'],
      ['a add of', 'the VAT amount of'],
      ['a add that', 'a VAT amount that'],
      ['a verified add', 'the VAT amount'],
      ['works out the add from', 'works out the VAT amount from'],
      ['what is the add?', 'what is the VAT amount?'],
      ['How is the add calculated?', 'How is the VAT amount calculated?'],
      ['recalculates the add instantly', 'recalculates the VAT amount instantly'],
      ['is the add for your exact inputs', 'is the VAT amount for your exact inputs'],
      ['double-checking the add', 'double-checking the VAT amount'],
      ['the add', 'the VAT amount']
    ]
  },
  'maintenance-fluids': {
    title: 'Maintenance Fluids Calculator (4-2-1 Rule)',
    metaDesc: 'Calculate paediatric maintenance fluids with the 4-2-1 rule: 4 ml/kg/hr for the first 10 kg, 2 for the next 10 kg and 1 for each kg after that.',
    fix: labelFix('hourly pediatric maintenance', 'maintenance fluids 4-2-1 formula', 'hourly maintenance rate')
  },
  'vector-add': {
    title: 'Vector Addition Calculator: Sum of Two Vectors',
    metaDesc: 'Add two vectors component by component to get their sum. Enter the x, y and z components of each vector and the result is shown step by step.',
    // 'add' is a common word, so the pairs are explicit.
    fix: [
      ['a verified add', 'the vector sum'],
      ['a add of', 'the vector sum of'],
      ['add formula', 'vector sum formula'],
      ['works out the add from', 'works out the vector sum from'],
      ['the add', 'the vector sum']
    ]
  },
  'date-add': {
    title: 'Date Add/Subtract: Start Date & Days',
    metaDesc: 'Add or subtract days from a date. Starting from 15 January 2026 and adding 90 days gives 15 April 2026, with the day count shown.',
    fix: [
      ['a add of', 'the resulting date of'],
      ['add formula', 'date calculation formula'],
      ['works out the add from', 'works out the resulting date from'],
      ['the add', 'the resulting date']
    ]
  },
  'salary-hourly': {
    title: 'Salary to Hourly Converter: Annual Salary & Hours/Week',
    metaDesc: 'Convert an annual salary into an hourly rate. $80,000 a year at 40 hours a week for 52 weeks is about $38.46 an hour.',
    fix: [['a hourly rate', 'an hourly rate']]
  },
  'freelance-rate': {
    // Title and snippet were already clean; only the body label was wrong
    // ("... returns is a hourly rate of ...").
    fix: [['a hourly rate', 'an hourly rate']]
  },
  'protein-need': {
    title: 'Daily Protein Intake Calculator: Grams per Day',
    metaDesc: 'Work out a daily protein target in grams from your body weight and activity level, with the grams-per-kilogram rule shown.',
    fix: [['a optimal protein intake', 'an optimal protein intake']]
  },
  'vegan-protein': {
    title: 'Vegan Protein Sources: How Much You Need',
    metaDesc: 'How much protein a plant-based diet needs, and which foods supply it. Enter your weight to get a daily gram target with the sources listed.',
    fix: []
  },
  // Title comes from TITLE_OVERRIDES (the GSC push list asked for "beef"); this
  // entry only pins the snippet, which is already hand-written.
  'meat-cooking-time': {
    metaDesc: 'Calculate roasting time from the weight of the joint and the minutes per kilogram. Enter both and the total cooking time is shown.',
    fix: []
  },
  // ------------------------------------------------------------------
  // CTR snippet pass — top-20 INDEXED pages by 28-day GSC impressions that
  // still had no hand-written snippet (data/gsc-page-impressions.json,
  // window 2026-09-16 → 2026-10-14, checked against data/gsc-coverage-report.json
  // 2026-10-17). Titles were readable but flat; the generated meta descriptions
  // were template output ("Free X: enter the A and get a B. Every step shown")
  // which is the exact shape Google rewrites rather than shows. These entries
  // set title + metaDesc only — the answer-first block stays as generated — so
  // `fix` is deliberately empty and only the two snippet fields change.
  // Every number is the tool's own output at its own default input:
  //   carbon-dating 25% of 5,730 yr → 11,460 yr · charging-time 5,000 mAh
  //   20→80% on 18 W at 85% → 43.5 min · solar-energy 20×350 W×5 h×85% →
  //   29.75 kWh/day · wire-gauge 14 AWG → 1.628 mm, 2.08 mm² · prorated-rent
  //   $1,200×15/30 → $600 · dew-point 30 °C/70% → 23.9 °C · dividend-yield
  //   3.50/75 → 4.67% · steel-weight 1000×500×10 mm × 7,850 kg/m³ → 39.25 kg
  //   · eps (1,000,000−50,000)/200,000 → $4.75 · trade-in 30,000×0.85⁵ →
  //   $13,311 · wallpaper 10% waste · sit-up bands are the tool's own rating
  //   thresholds · resistor 4-band brown/black/red/gold → 1 kΩ ±5%.
  // ------------------------------------------------------------------
  'carbon-dating': {
    title: 'Carbon Dating Calculator: How Old Is Your Sample?',
    metaDesc: 'Enter the share of carbon-14 remaining to get the sample age. C-14 has a 5,730-year half-life, and the decay maths is shown step by step.',
    fix: []
  },
  'charging-time': {
    title: 'Phone Charging Time Calculator: Minutes to Full',
    metaDesc: 'Enter battery capacity, charger wattage and the charge range to get the time. A 5,000 mAh phone going from 20% to 80% on 18 W takes about 44 minutes.',
    fix: []
  },
  'rgb-hex': {
    title: 'RGB to Hex Converter: Pick a Colour, Copy the Code',
    metaDesc: 'Convert RGB values to a hex code and back. Enter 79, 70 and 229 to get #4F46E5, with each channel hex pair explained along the way.',
    // Keeps the earlier body-copy repair ("between rgb" in the generated FAQ).
    fix: labelFix('between rgb', 'RGB to hex conversion formula', 'converted colour')
  },
  'wire-gauge-conv': {
    title: 'AWG to mm Converter: Wire Gauge Diameter and Area',
    metaDesc: 'Convert American Wire Gauge to diameter in millimetres and cross-section in mm². 14 AWG is 1.628 mm across and 2.08 mm², with the formula shown.',
    fix: []
  },
  'solar-energy': {
    title: 'Solar Panel Output Calculator: kWh per Day and Month',
    metaDesc: 'Enter panel count, wattage, peak sun hours and system efficiency to see daily, monthly and yearly kWh. Twenty 350 W panels at 5 sun hours give 29.8 kWh a day.',
    fix: []
  },
  'ip-subnet': {
    title: 'IP Subnet Calculator: Network, Broadcast and Hosts',
    metaDesc: 'Enter an IPv4 address and prefix length to get the network address, broadcast address, usable host range and mask. 192.168.1.10/24 sits in 192.168.1.0.',
    fix: []
  },
  'prorated-rent': {
    title: 'Prorated Rent Calculator: Pay Only for Days Used',
    metaDesc: 'Work out rent for part of a month from monthly rent, days occupied and days in the month. Staying 15 of 30 days at $1,200 means $600, shown step by step.',
    fix: []
  },
  'trigonometry': {
    title: 'Trigonometry Calculator: Sin, Cos and Tan of an Angle',
    metaDesc: 'Enter an angle in degrees to get its sine, cosine and tangent. At 45 degrees sin and cos are both 0.7071 and tan is 1, with the radian conversion shown first.',
    fix: []
  },
  'wallpaper-rolls': {
    title: 'Wallpaper Roll Calculator: How Many Rolls to Buy',
    metaDesc: 'Enter total wall width, ceiling height, roll width and roll length to get how many rolls the room needs, with a 10% allowance for matching and cuts.',
    fix: []
  },
  'vinyl-flooring': {
    title: 'Vinyl Plank Calculator: Boxes and Planks You Need',
    metaDesc: 'Enter room area, coverage per box and a waste allowance to get the boxes and planks needed, with the covered area and underlayment estimate alongside.',
    fix: []
  },
  'dividend-yield': {
    title: 'Dividend Yield Calculator: Income for Every Dollar',
    metaDesc: 'Divide the annual dividend per share by the share price to get yield. A $3.50 payout on a $75 stock is 4.67%, and the tool shows the quarterly amount too.',
    fix: []
  },
  'vacation-savings': {
    title: 'Vacation Savings Calculator: Cost & Monthly Target',
    metaDesc: 'Enter trip cost, what you have already saved and the months left to get the monthly and weekly amount to set aside. Adjust the date to see the plan change.',
    fix: []
  },
  'steel-weight': {
    title: 'Steel Weight Calculator: Plate, Bar and Tube Weight',
    metaDesc: 'Pick a shape and enter its dimensions to get the weight at 7,850 kg/m³. A 1000 × 500 × 10 mm plate comes to 39.25 kg, with the volume shown first.',
    fix: []
  },
  'eps-calculator': {
    title: 'EPS Calculator: Earnings Per Share From Net Income',
    metaDesc: 'Subtract preferred dividends from net income and divide by common shares outstanding. $1,000,000 less $50,000 across 200,000 shares is $4.75 per share.',
    fix: []
  },
  'trade-in-value': {
    title: 'Car Trade-In Value Calculator: What It Is Worth Now',
    metaDesc: 'Enter the original price and the vehicle age to estimate trade-in value after depreciation. A $30,000 car at five years is about $13,311, a guide not an offer.',
    fix: []
  },
  'situp-test': {
    title: 'Sit-Up Test Calculator: Score Your Core Endurance',
    metaDesc: 'Enter how many sit-ups you can do in one minute to see the rating: 45 or more is excellent, 35 to 44 good, 25 to 34 average, and under 25 needs work.',
    fix: []
  },
  'moment-of-inertia': {
    title: 'Moment of Inertia Calculator: Disk, Ring and Rod',
    metaDesc: 'Get rotational inertia for a solid disk, hollow ring, solid sphere or rod from mass and radius or length, with the formula used for that shape written out.',
    fix: []
  },
  'resistor-color-code': {
    title: 'Resistor Color Code Calculator: Read 4-Band Values',
    metaDesc: 'Pick the four band colours to read the resistor value and tolerance. Brown, black, red and gold is 1 kΩ ±5%, and the tool decodes the bands in order.',
    fix: []
  },
  'closing-costs': {
    title: 'Closing Costs Calculator: What to Budget at Closing',
    metaDesc: 'Estimate closing costs from home price, down payment, mortgage rate and discount points, including title, appraisal and escrow. A planning figure, not a quote.',
    fix: []
  },
  // Two more raw-label titles the top-100 audit kept flagging (2026-10-18).
  // UK rates are the tool's own 2025-26 England/rUK bands; NPS is the tool's
  // corpus + annuity split at age 60.
  'uk-take-home-salary': {
    title: 'UK Take-Home Pay Calculator: Salary After Tax',
    metaDesc: 'Enter a gross salary, pension percentage and student loan plan to see monthly take-home pay after income tax and National Insurance at 2025-26 England rates.',
    fix: []
  },
  'nps-calculator': {
    title: 'NPS Calculator: Corpus and Monthly Pension at 60',
    metaDesc: 'Estimate the National Pension System corpus from monthly contribution, expected return and annuity share, then the monthly pension the annuity could pay.',
    fix: []
  }
};

// ---------- application ----------

function rewriteAeo(aeo, o) {
  if (!aeo || !o.heading) return aeo;
  // Replacements are passed as FUNCTIONS, never as replacement strings: the
  // copy contains dollar amounts ($15, $175, $500...), and a replacement string
  // makes String.replace read "$15" as backreference 1 followed by "5" — which
  // silently mangled quick answers into "<h3>Quick answer</h3>\n5 a week".
  let out = aeo.replace(/<h2>[^<]*<\/h2>/, () => '<h2>' + o.heading + '</h2>');
  out = out.replace(/<p>[\s\S]*?<\/p>/, () => '<p>' + o.lead + '</p>');
  if (o.quickAnswer && /<h3>\s*Quick answer\s*<\/h3>/.test(out)) {
    out = out.replace(
      /(<h3>\s*Quick answer\s*<\/h3>\s*)<p>[\s\S]*?<\/p>/,
      (m, prefix) => prefix + '<p>' + o.quickAnswer + '</p>'
    );
  }
  // Per-page repairs for the fragments the heading/lead/quick-answer slots do
  // not cover: the "Output:" list item and the closing sentence, which the
  // generator filled from a raw result string ("the between length",
  // "the time units") instead of from real prose.
  for (const [from, to] of o.aeoFixes || []) out = out.split(from).join(to);
  return out;
}

// Replace the first occurrence of a JSON-encoded value in the generated file.
// Returns { text, replaced } so callers can report anything that did not land.
function replaceValue(text, oldValue, newValue) {
  const needle = JSON.stringify(oldValue);
  const i = text.indexOf(needle);
  if (i < 0) return { text, replaced: false };
  return { text: text.slice(0, i) + JSON.stringify(newValue) + text.slice(i + needle.length), replaced: true };
}

function main() {
  const original = fs.readFileSync(SRC, 'utf8');
  // Read the object model from whichever source the needles are matched against.
  // repairUndefined() below rewrites the text, and every replacement is then
  // located *in that rewritten text*. Reading TOOL_SEO from `original` instead
  // made each entry repairUndefined had touched unreachable: protein-need's `aeo`
  // no longer contained its pre-repair needle, so its label repair was skipped,
  // the run reported "did not apply cleanly" and exited before writing the file.
  // That took the whole v5 → overrides → split regen chain down with it.
  const evalSeo = (src) => {
    const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox);
    return sandbox.window.TOOL_SEO || {};
  };

  let text = repairUndefined(original);
  const TOOL_SEO = evalSeo(text);
  const undefinedBefore = (original.match(/the undefined/g) || []).length;
  const undefinedAfter = (text.match(/the undefined/g) || []).length;

  const report = [];
  for (const [id, o] of Object.entries(CTR_OVERRIDES)) {
    const e = TOOL_SEO[id];
    if (!e) { report.push({ id, error: 'no SEO entry' }); continue; }
    const before = { title: e.title, metaDesc: e.metaDesc };
    let changed = { title: false, metaDesc: false, aeo: false };

    if (o.title && o.title !== e.title) {
      const r = replaceValue(text, e.title, o.title); text = r.text; changed.title = r.replaced;
    }
    if (o.metaDesc && o.metaDesc !== e.metaDesc) {
      const r = replaceValue(text, e.metaDesc, o.metaDesc); text = r.text; changed.metaDesc = r.replaced;
    }
    if (o.heading && e.aeo) {
      const next = rewriteAeo(e.aeo, o);
      if (next !== e.aeo) {
        const r = replaceValue(text, e.aeo, next); text = r.text; changed.aeo = r.replaced;
      }
    }
    // The broken fragments the generator emitted ("the between length",
    // "shows the cannot directly convert") are not confined to the aeo block:
    // they also sit in the long-form `desc` body and in the FAQ answers, which
    // are rendered too. Fixes are applied to every field so no copy of the
    // broken phrase survives anywhere in that tool's entry.
    if (o.aeoFixes && o.aeoFixes.length) {
      // Same single-pass, guarded application as the label repairs.
      const apply = (s) => applyFixText(s, o.aeoFixes);
      for (const field of ['aeo', 'desc']) {
        const old = e[field];
        if (!old) continue;
        const next = apply(old);
        if (next !== old) { const r = replaceValue(text, old, next); text = r.text; changed[field] = r.replaced; }
      }
      // The same broken label was also baked into the lsi keyword tags
      // ("between length formula"), which drive keyword targeting rather than
      // visible copy — but a garbage phrase there is still a defect.
      if (Array.isArray(e.lsi)) {
        for (const k of e.lsi) {
          const nk = apply(k);
          if (nk !== k) { const r = replaceValue(text, k, nk); text = r.text; }
        }
      }
      if (Array.isArray(e.faqs)) {
        for (const f of e.faqs) {
          const nq = apply(f.q), na = apply(f.a);
          if (nq !== f.q) { const r = replaceValue(text, f.q, nq); text = r.text; }
          if (na !== f.a) { const r = replaceValue(text, f.a, na); text = r.text; }
        }
      }
    }
    report.push({ id, changed, oldTitle: before.title, oldMeta: before.metaDesc, title: o.title, metaDesc: o.metaDesc });
  }

  // ---------- 2b. title term overrides ----------
  // Applied after the CTR entries so a page that has both keeps the hand-written
  // CTR title (that one was written against its own query, with the answer-first
  // block to match). Located through the live object model, then replaced in the
  // text — the same surgical, value-by-value path the CTR entries use.
  const titleReport = [];
  for (const [id, title] of Object.entries(TITLE_OVERRIDES)) {
    const e = TOOL_SEO[id];
    if (!e) { titleReport.push({ id, error: 'no SEO entry' }); continue; }
    const current = e.title;
    if (current === title) { titleReport.push({ id, current, title, changed: false, already: true }); continue; }
    if (title.length < 30 || title.length > 60) { titleReport.push({ id, current, title, error: 'title outside the 30-60 build gate (' + title.length + ')' }); continue; }
    const r = replaceValue(text, current, title);
    text = r.text;
    titleReport.push({ id, current, title, changed: r.replaced });
  }
  const titleFailed = titleReport.filter((r) => r.error || (!r.changed && !r.already));
  if (titleFailed.length && !CHECK) {
    console.error('✖ title overrides that did not apply cleanly:');
    for (const f of titleFailed) console.error('   ' + JSON.stringify(f));
    process.exit(1);
  }

  // ---------- raw result-label repairs (line-scoped) ----------
  // Each entry is a single line of the generated file, and every replacement is
  // located inside that line. A whole-file search would let a short, shared
  // needle rewrite the wrong tool: 273 lsi tags are used by more than one tool
  // (three tools share "add formula"), and a cross-tool swap is invisible until
  // someone reads the generated copy.
  const lines = text.split('\n');
  const lineOf = {};
  lines.forEach((l, i) => { const m = l.match(/^\s*'([^']+)':\s*\{/); if (m) lineOf[m[1]] = i; });
  const labelReport = [];
  for (const [id, o] of Object.entries(LABEL_REPAIRS)) {
    const e = TOOL_SEO[id];
    if (!e) { labelReport.push({ id, error: 'no SEO entry' }); continue; }
    const li = lineOf[id];
    if (li === undefined) { labelReport.push({ id, error: 'entry line not found' }); continue; }
    const changed = { title: false, metaDesc: false, fields: 0 };
    // Idempotent: ask whether the fix would actually change any field it rewrites.
    // A needle merely being present is not enough — the guarded needles are
    // designed to leave already-correct copy alone ("the hourly rate").
    const needsFix = (o.fix || []).length > 0 && (
      ['aeo', 'desc'].some((f) => e[f] && applyFixText(e[f], o.fix) !== e[f])
      || (e.lsi || []).some((k) => applyFixText(k, o.fix) !== k)
      || (e.faqs || []).some((f) => applyFixText(f.q, o.fix) !== f.q || applyFixText(f.a, o.fix) !== f.a)
    );
    // A page with a TITLE_OVERRIDES entry owns its own title: without this guard
    // both passes write the title, the second one searches for a needle the first
    // already replaced, and the run aborts with "did not apply cleanly".
    const titleOverridden = Object.prototype.hasOwnProperty.call(TITLE_OVERRIDES, id);
    const expectTitle = !titleOverridden && !!(o.title && o.title !== e.title);
    const expectMeta = !!(o.metaDesc && o.metaDesc !== e.metaDesc);
    let line = lines[li];
    const put = (oldVal, newVal) => { const r = replaceValue(line, oldVal, newVal); line = r.text; return r.replaced; };
    if (expectTitle) changed.title = put(e.title, o.title);
    if (expectMeta) changed.metaDesc = put(e.metaDesc, o.metaDesc);
    const apply = (s) => applyFixText(s, o.fix);
    for (const field of ['aeo', 'desc']) {
      const old = e[field];
      if (!old) continue;
      const next = apply(old);
      if (next !== old && put(old, next)) changed.fields++;
    }
    if (Array.isArray(e.lsi)) {
      // Replace the whole array with ONE needle. Repairing key-by-key searched the
      // line for each repaired phrase and could hit the same phrase where it also
      // appears earlier in the line (inside aeo/desc), leaving the lsi tag itself
      // unrepaired — fuel-efficiency-converter then needed a second override pass
      // before `seo:overrides:check` went green. The array literal is unambiguous.
      const nextLsi = e.lsi.map(apply);
      // replaceValue() JSON-encodes both sides itself, so the raw arrays go in
      // (stringifying here produced a quoted string that never matched the file).
      if (nextLsi.some((v, i) => v !== e.lsi[i]) && put(e.lsi, nextLsi)) changed.fields++;
    }
    if (Array.isArray(e.faqs)) {
      for (const f of e.faqs) {
        const nq = apply(f.q), na = apply(f.a);
        if (nq !== f.q && put(f.q, nq)) changed.fields++;
        if (na !== f.a && put(f.a, na)) changed.fields++;
      }
    }
    lines[li] = line;
    labelReport.push({ id, changed, needsFix, expectTitle, expectMeta, oldTitle: e.title, oldMeta: e.metaDesc, title: o.title, metaDesc: o.metaDesc });
  }
  text = lines.join('\n');

  // A field counts as done when it changed OR when the generated copy already
  // matched the written override (some titles were already good; the snippet
  // and answer-first block were the broken parts).
  const failed = report.filter((r) => r.error
    || (!r.changed.title && r.title !== r.oldTitle)
    || (!r.changed.metaDesc && r.metaDesc !== r.oldMeta));
  // A label repair is done when the snippet landed AND at least one repeated
  // copy of the broken label was actually rewritten somewhere in the entry.
  const labelFailed = labelReport.filter((r) => r.error
    || (r.expectTitle && !r.changed.title)
    || (r.expectMeta && !r.changed.metaDesc)
    || (r.needsFix && r.changed.fields < 1));
  if ((failed.length || labelFailed.length) && !CHECK) {
    console.error('✖ overrides that did not apply cleanly:');
    for (const f of failed) console.error('   ' + JSON.stringify(f));
    for (const f of labelFailed) console.error('   ' + JSON.stringify(f));
    process.exit(1);
  }

  if (CHECK) {
    const drifted = text !== original;
    if (drifted) {
      // Name the drift instead of just reporting it: a bare "stale" message sent
      // the operator to regenerate the whole file without saying which override
      // or repair had gone missing, so a single lost entry looked like a
      // wholesale regeneration.
      const a = original.split('\n'), b = text.split('\n');
      const diffs = [];
      for (let i = 0; i < Math.max(a.length, b.length) && diffs.length < 5; i++) {
        if (a[i] !== b[i]) {
          const id = (a[i] || b[i] || '').match(/^\s*'([^']+)':/);
          diffs.push('line ' + (i + 1) + (id ? ' (' + id[1] + ')' : '') + '\n     file: ' + String(a[i]).slice(0, 160) + '\n     want: ' + String(b[i]).slice(0, 160));
        }
      }
      console.error('✖ js/seo-content.js is stale — run: node scripts/apply-seo-overrides.cjs && node scripts/split-seo.cjs');
      for (const d of diffs) console.error('   ' + d);
      process.exit(1);
    }
    console.log('✔ seo content up to date (' + Object.keys(CTR_OVERRIDES).length + ' CTR overrides, '
      + Object.keys(TITLE_OVERRIDES).length + ' title term overrides, '
      + Object.keys(LABEL_REPAIRS).length + ' label repairs, 0 undefined placeholders)');
    return;
  }

  fs.writeFileSync(SRC, text);
  console.log('==========================================');
  console.log(' SEO OVERRIDES — page-1 zero-click fix');
  console.log('==========================================');
  console.log('undefined placeholders : ' + undefinedBefore + ' → ' + undefinedAfter);
  console.log('CTR overrides applied  : ' + report.filter((r) => r.changed && r.changed.title).length + '/' + Object.keys(CTR_OVERRIDES).length);
  console.log('title term overrides   : ' + titleReport.filter((r) => r.changed || r.already).length + '/' + Object.keys(TITLE_OVERRIDES).length);
  console.log('label repairs applied  : ' + labelReport.filter((r) => r.changed && (r.changed.fields >= 1 || !r.needsFix)).length + '/' + Object.keys(LABEL_REPAIRS).length);
  console.log('');
  for (const r of report) {
    console.log('  ' + (r.error ? '✖ ' : '✔ ') + r.id);
    if (r.title) console.log('      ' + r.title);
  }
  console.log('');
  console.log('--- title term overrides (from the GSC push list) ---');
  for (const r of titleReport) {
    console.log('  ' + (r.error ? '✖ ' : '✔ ') + r.id + (r.already ? '  (already)' : ''));
    if (r.title) console.log('      ' + r.title);
  }
  console.log('');
  console.log('--- raw result-label repairs ---');
  for (const r of labelReport) {
    console.log('  ' + (r.error ? '✖ ' : '✔ ') + r.id + '  (' + (r.changed ? r.changed.fields : 0) + ' field(s) rewritten)');
    if (r.title) console.log('      ' + r.title);
  }
  console.log('');
  console.log('next: node scripts/split-seo.cjs && npm run deploy:build');
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('FAIL', e.message); process.exit(1); }
}

module.exports = { UNDEFINED_FIXES, SHAPE_RESTORES, CTR_OVERRIDES, TITLE_OVERRIDES, TITLE_OVERRIDE_SKIPS, TITLE_OVERRIDE_NONTERM, LABEL_REPAIRS, labelFix, applyFixText, repairUndefined, rewriteAeo, replaceValue };
