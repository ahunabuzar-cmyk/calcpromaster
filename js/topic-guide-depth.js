/* ============================================================
 * Topic Guide Depth Content — shared data module
 * ------------------------------------------------------------
 * Why this exists
 * ---------------
 * scripts/thin-page-report.cjs measures every indexable page in the
 * built deploy/ tree. The two thinnest pages on the site are topic
 * guides that came out of scripts/build-topic-guides.cjs:
 *
 *   /guides/room-area   400 words   (site minimum)
 *   /guides/gear-ratio  407 words
 *
 * Both already have an FAQ, subheadings and 68-79 inlinks, so they are
 * not "bare" pages — they are short for a page that has to answer a
 * real question. This module holds the extra block each one needs, and
 * scripts/apply-topic-guide-depth.cjs injects it between markers so the
 * work survives re-running the generator.
 *
 * Why a separate module from js/guide-depth.js: that module owns the
 * 17 category guides (/guides/<cat>) and matches the
 * "<h2>Try the matching calculators</h2>" anchor. Topic guides have a
 * different shell and a different anchor, so mixing them would either
 * fail silently on one family or duplicate prose across both.
 *
 * Rules: no invented statistics, no rates that change yearly, no
 * superlatives, no word-count padding. Every number below is a worked
 * calculation whose arithmetic is checkable in the page itself.
 * ============================================================ */
(function (root) {
  'use strict';

  var GUIDES = {
    'room-area': {
      sections: `
  <h2>Measuring a room so the number survives the order</h2>
  <p>Measure at the widest point of each wall and convert to decimal feet before the first multiplication — 3 inches is 0.25 ft, 6 inches is 0.5 ft, 9 inches is 0.75 ft. A 14 ft 3 in wall is 14.25 ft, so 14.25 × 11.667 works while 14 × 3 × 11 does not. Measure twice, round the answer, never the inputs.</p>
  <ul>
    <li><strong>Doorways and alcoves:</strong> count the floor inside an alcove, but a door leaf's swing never changes the floor area.</li>
    <li><strong>Fireplaces and chimney breasts:</strong> subtract the floor they occupy only when no tile or board will run underneath them.</li>
    <li><strong>Bay windows:</strong> add the rectangle of the bay opening plus a triangle per angled panel (½ × base × perpendicular depth).</li>
    <li><strong>Ceiling height:</strong> irrelevant to floor area. It matters only when you order paint or wallpaper, which are priced on wall area.</li>
  </ul>

  <h2>Worked example: tape measure to tile order</h2>
  <p>A bedroom measures 14 ft 3 in by 11 ft 8 in. Convert first, then multiply: 14.25 × 11.667 = <strong>166.25 sq ft</strong>, which is 166.25 ÷ 10.764 = <strong>15.45 sq m</strong>.</p>
  <div class="table-wrap"><table>
    <tr><th>Step</th><th>Working</th><th>Result</th></tr>
    <tr><td>Convert the inches</td><td>3 ÷ 12 = 0.25 · 8 ÷ 12 = 0.667</td><td>14.25 ft × 11.667 ft</td></tr>
    <tr><td>Floor area</td><td>14.25 × 11.667</td><td>166.25 sq ft (15.45 sq m)</td></tr>
    <tr><td>Add the 10% allowance</td><td>166.25 × 1.10</td><td>182.9 sq ft</td></tr>
    <tr><td>Boxes at 15 sq ft each</td><td>182.9 ÷ 15 = 12.19</td><td>13 boxes</td></tr>
  </table></div>
  <p>Round the box count up and nothing else: 12.19 boxes means twelve full boxes plus a fifth of another, and offcuts left over from a cut pattern will not cover a whole extra box.</p>

  <h2>Four ways room area goes wrong</h2>
  <ul>
    <li><strong>Mixing units inside one multiplication.</strong> Inches and feet are not interchangeable — convert every measurement before you multiply anything.</li>
    <li><strong>Applying waste to a rounded area.</strong> Rounding 166.25 to 166 before multiplying changes the order, so keep the precise area and round only the final box count.</li>
    <li><strong>Using floor area for wall paint.</strong> Paint needs perimeter × wall height minus doors and windows; floor area tells you nothing about it.</li>
    <li><strong>Treating an L-shape as one rectangle.</strong> Split it into two rectangles and add, or the missing notch quietly gets charged to the waste allowance.</li>
  </ul>
`,
      faqs: [
        {
          q: 'Should I measure a room in feet and inches or in decimals?',
          a: 'Decimals. Divide the inches by 12 first, so 3 in becomes 0.25 ft and 8 in becomes 0.667 ft, then multiply. Treating 14 ft 3 in as 14 × 3 × 11 mixes units and produces a figure far too small to order from.'
        },
        {
          q: 'How do I work out the area of a bay window or angled alcove?',
          a: 'Split it into the rectangle of the opening plus a triangle for each angled panel, using ½ × base × perpendicular depth for the triangle. A 6 ft wide bay projecting 2 ft adds ½ × 6 × 2 = 6 sq ft for each angled side, plus the rectangle behind it.'
        },
        {
          q: 'How many tiles do I need for 166 sq ft?',
          a: 'Add 10% for a straight lay: 166.25 × 1.10 = 182.9 sq ft. At 15 sq ft per box that is 12.19 boxes, so buy 13. A diagonal layout should use 15% instead of 10%, which gives 191.2 sq ft and 13 boxes with less spare.'
        }
      ]
    },

    'gear-ratio': {
      sections: `
  <h2>Ratio table: teeth in, RPM out</h2>
  <p>The ratio sets the output speed on its own — output is input ÷ ratio. With a 1,500 rpm input the table reads:</p>
  <div class="table-wrap"><table>
    <tr><th>Driver → driven</th><th>Ratio</th><th>Output at 1,500 rpm</th></tr>
    <tr><td>20 T → 60 T</td><td>3.00</td><td>500 rpm</td></tr>
    <tr><td>20 T → 40 T</td><td>2.00</td><td>750 rpm</td></tr>
    <tr><td>30 T → 45 T</td><td>1.50</td><td>1,000 rpm</td></tr>
    <tr><td>40 T → 40 T</td><td>1.00</td><td>1,500 rpm</td></tr>
    <tr><td>40 T → 30 T</td><td>0.75</td><td>2,000 rpm</td></tr>
    <tr><td>45 T → 30 T</td><td>0.667</td><td>2,250 rpm</td></tr>
  </table></div>
  <p>A ratio below 1 always speeds the output up and a ratio above 1 always slows it down, so the same table is an overdrive chart read from the bottom up.</p>

  <h2>Working backwards to a target speed</h2>
  <div class="formula">Required ratio = input RPM ÷ target RPM<br>Driven teeth = required ratio × driver teeth — round to a whole tooth, then recompute</div>
  <p>To turn 1,500 rpm into 400 rpm the required ratio is 1,500 ÷ 400 = 3.75. One 20-tooth driver would need 75 teeth, which most single-stage housings will not hold, so split it: 20 T → 40 T gives 2.00, then 16 T → 30 T gives 1.875, and 2.00 × 1.875 = 3.75. Output is 1,500 ÷ 3.75 = 400 rpm. Teeth counts are whole numbers, so always recompute the output from the teeth you actually fit rather than trusting the target.</p>

  <h2>Where the ideal torque figure leaks away</h2>
  <p>A spur-gear mesh is roughly 98% efficient, so a nominal 2:1 stage multiplies torque by about 1.96 rather than 2. Run three stages and the efficiency multiplies out to 0.98 × 0.98 × 0.98 ≈ 0.94 — about 6% of the torque gone as heat and noise before the output shaft turns. Helical gears trade a little more loss for quieter running, and wear, lubrication and bearing drag add further on top. Gears still exchange speed for torque, but they never hand the ideal figure back.</p>
`,
      faqs: [
        {
          q: 'How do I get exactly 400 rpm from a 1,500 rpm motor?',
          a: 'The required ratio is 1,500 ÷ 400 = 3.75. One route is a 20 T → 40 T pair (2.00) followed by 16 T → 30 T (1.875), because 2.00 × 1.875 = 3.75 gives 400 rpm at the output. Whole-tooth counts rarely hit a ratio exactly, so recompute the output from the teeth you fit.'
        },
        {
          q: 'How much power is lost passing through a gear train?',
          a: 'Roughly 1–2% per spur-gear mesh: about 2% for a single 2:1 pair, and around 6% across three stages because 0.98 × 0.98 × 0.98 ≈ 0.94. Helical gears, wear and under-lubrication all lose more, and bearings and seals add a further amount.'
        }
      ]
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = { GUIDES: GUIDES };
  else root.TOPIC_GUIDE_DEPTH = { GUIDES: GUIDES };
})(typeof self !== 'undefined' ? self : this);
