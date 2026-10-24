/* ============================================================
 * rewrite-top-titles.cjs
 * ------------------------------------------------------------
 * Rewrites the <title> of the highest-impression pages so they
 * lead with the search intent + year + benefit (CTR lever).
 * Source of truth: js/seo-content.js  (then split-seo.cjs)
 *
 *   node scripts/rewrite-top-titles.cjs          # preview
 *   WRITE=1 node scripts/rewrite-top-titles.cjs  # apply
 * ============================================================ */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const TITLES = {
  // --- page-2 fastest wins (20) ---
  'pmi-calculator': 'PMI Calculator 2026: Monthly Private Mortgage Insurance Cost',
  'baby-weight-gain': 'Baby Weight Percentile Calculator: Is My Baby on Track?',
  'presentation-time': 'Presentation Time Calculator: How Long Will My Slides Take?',
  'prorated-rent': 'Prorated Rent Calculator: First-Month Rent, Day by Day',
  'margin-call': 'Margin Call Price Calculator: When Your Broker Forces a Sale',
  'closing-costs': 'Closing Costs Calculator 2026: What You Pay at Closing',
  'carpet': 'Carpet Calculator: How Much Carpet for Your Room, in Sq Ft',
  'parking-cost': 'Parking Cost Calculator: Daily, Monthly and Yearly Spend',
  'child-height': 'Child Height Predictor: How Tall Will My Child Be?',
  'fha-loan': 'FHA Loan Calculator 2026: Monthly Payment With MIP and Taxes',
  'roommate-rent-split': 'Roommate Rent Split Calculator: Fair Shares by Income',
  'coffee-cost': 'Coffee Habit Cost Calculator: What Your Daily Cup Costs',
  'vacation-with-kids': 'Family Vacation Cost Calculator: Budget for Kids in Tow',
  'jet-lag': 'Jet Lag Recovery Calculator: Days to Beat a New Time Zone',
  'safe-withdrawal': 'Safe Withdrawal Rate Calculator: How Much Can You Retire On?',
  'gutter': 'Gutter Calculator: How Many Feet of Gutter You Need',
  'poker-flush': 'Poker Flush Odds Calculator: Your Chance of a Flush, Dealt',
  'drywall': 'Drywall Calculator: How Many Sheets You Need, Per Wall',
  'gift-wrap': 'Gift Wrap Calculator: How Much Paper for Your Box',
  'apy-calculator': 'APY Calculator 2026: Annual Percentage Yield, Compounded',

  // --- page 3-4 with real impressions ---
  'pump-power': 'Pump Power Calculator: Hydraulic and Shaft Power Required',
  'insulation': 'Insulation Calculator: How Much You Need (R-Value + Batts)',
  'depreciation': 'Depreciation Calculator: Straight-Line Cost, Year by Year',
  'vacation-budget': 'Vacation Budget Calculator: What Your Trip Will Really Cost',
  'cost-of-debt': 'Cost of Debt Calculator: Your True Interest Rate, After Tax',
  'cycling-speed': 'Cycling Speed Calculator: Time and Pace for Your Route'
};

function escRe(s) { return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'); }

const FILE = path.join(ROOT, 'js', 'seo-content.js');
let src = fs.readFileSync(FILE, 'utf8');
const before = src;

let applied = 0;
const missing = [];
for (const [id, title] of Object.entries(TITLES)) {
  const re = new RegExp(
    "('" + escRe(id) + "':\\s*\\{\"title\":\")([^\"]*)(\",\"metaDesc\")"
  );
  if (!re.test(src)) { missing.push(id); continue; }
  const jsonTitle = JSON.stringify(title).slice(1, -1);
  src = src.replace(re, '$1' + jsonTitle.replace(/\$/g, '$$$$') + '$3');
  applied++;
}

const tooLong = Object.entries(TITLES).filter(([, t]) => t.length > 60).map(([k, t]) => k + ':' + t.length);
console.log('titles defined :', Object.keys(TITLES).length);
console.log('applied        :', applied);
console.log('missing        :', missing.length, missing.join(', '));
console.log('too long (>60) :', tooLong.length, tooLong.join(', '));

if (process.env.WRITE === '1') {
  if (missing.length) { console.error('ABORT: some ids not found.'); process.exit(1); }
  if (src === before) { console.log('No change.'); process.exit(0); }
  fs.writeFileSync(FILE, src);
  console.log('WRITTEN: js/seo-content.js');
} else {
  console.log('\nDry run. Re-run with WRITE=1 to apply.');
}
