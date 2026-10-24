#!/usr/bin/env node
// ============================================================
// CalcProMaster — premium intro rewrite (build step, idempotent)
// ------------------------------------------------------------
// The nine flagship pages carried four identical intro paragraphs
// ("<Tool> turns a small set of inputs — …"), which was the largest editorial
// duplicate block on the site: 9-10 shared sentences on every one of them.
//
// This step replaces that block, on the built pages only, with a hand-written
// intro whose every paragraph is specific to the tool: what decision it
// supports, which inputs actually move the answer, and where the number stops
// being trustworthy. The quick-answer box and the rest of the article are left
// untouched.
//
//   node scripts/apply-premium-intros.cjs           # rewrite deploy/
//   node scripts/apply-premium-intros.cjs --check   # exit 1 if any intro is stale
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const CHECK = process.argv.includes('--check');
const MARK = '<h2>What This Calculator Really Does</h2>';

const INTROS = {
  '/finance/mortgage/': `
<h2>What This Calculator Really Does</h2>
<p>The monthly payment is the smallest part of a mortgage decision. What decides whether a home is affordable is the same payment read three ways: how much of it buys the house, how much buys the interest, and how long you are locked into that split. This page answers all three from one set of inputs — home price, down payment, rate and term — and lets you flip the solve direction when you already know the number you can afford.</p>
<p>Use the down payment field as a real constraint, not a formality. Below 20% most US lenders add mortgage insurance, which is a cost the payment formula does not include; above 20% the loan is smaller and the same rate costs less every month. Changing only that field is the fastest way to see why the size of the deposit matters more than a tenth of a point on the rate.</p>
<p>Term is the other lever, and it moves the two totals in opposite directions. Stretching 240,000 from 15 years to 30 at the same rate cuts the monthly figure sharply and roughly doubles the interest paid over the life of the loan. The calculator shows both totals beside the payment so the trade is visible rather than theoretical — and the solve-for-Term mode shows how a larger payment shortens the schedule instead.</p>
<p>The result is principal-and-interest only. Property tax, homeowners insurance, HOA dues and any mortgage insurance sit outside the formula, so a lender's escrow quote will be higher. Treat this as the loan layer: get that right first, then add the carrying costs that vary by address.</p>`.trim(),

  '/auto/car-loan-emi/': `
<h2>What This Calculator Really Does</h2>
<p>A car loan is quoted as a monthly payment because that is the number a buyer can compare against a budget. The loan itself is four numbers: the amount financed, the annual rate, the term in months, and the total interest those three produce. This page shows all four, so a dealer's "only 495 a month" can be checked against what the car actually costs by the time the last payment clears.</p>
<p>The amount financed is rarely the sticker price. Sales tax, registration, dealer fees and any negative equity rolled over from a trade-in are added to the balance before interest starts; a cash discount or a down payment reduces it. Entering the true financed amount instead of the price is the single change that makes the estimate match the contract.</p>
<p>Term is where the monthly figure gets flattering. Stretching a 25,000 balance from 48 to 72 months lowers the payment while raising the total interest, and it keeps the borrower underwater on the car for longer. The total-interest line is the honest comparison between two offers; the payment line is not.</p>
<p>The arithmetic assumes a fixed rate and on-time payments, which is what a standard installment loan is. It does not model promotional "no interest if paid in full" structures, balloon payments, or add-on products folded into the balance. Those need the lender's own disclosure — but the loan math here will still tell you what the base financing costs.</p>`.trim(),

  '/auto/fuel-cost/': `
<h2>What This Calculator Really Does</h2>
<p>Fuel cost is distance divided by consumption, multiplied by price — three numbers that are easy to state and easy to get wrong. This page takes the trip distance, the vehicle's mileage and the pump price, then returns both the money and the litres burned, so the answer can be checked at the pump rather than trusted.</p>
<p>The consumption figure deserves more attention than the other two. A dashboard average is usually optimistic; the reliable method is to fill the tank, note the kilometres, refill, and divide litres used by distance travelled, then convert to km per litre. Using the trip computer's best-ever number understates every real journey, especially with air conditioning, roof racks, short cold-start trips or under-inflated tyres.</p>
<p>Price per litre varies by station and by day, so the useful comparison is not one fill but the same trip at two prices. The toll and parking field exists because those costs behave like fuel for a commuter: they are per journey, they do not shrink with better mileage, and leaving them out makes driving look cheaper than it is.</p>
<p>Units are the usual source of a wrong answer. The fields expect distance in kilometres, mileage in km per litre and price per litre; a US driver working in miles and gallons should convert first, or the litres line will be meaningless. The result is an operating cost for the trip, not a full cost of ownership — depreciation, insurance, servicing and tyres are separate line items.</p>`.trim(),

  '/career/salary-converter/': `
<h2>What This Calculator Really Does</h2>
<p>An annual salary and an hourly rate are the same money measured on different clocks. This converter moves between them — and between monthly and weekly figures — using the standard full-time year of 2,080 hours, so an offer quoted one way can be compared with a job quoted the other.</p>
<p>2,080 hours is 40 hours for 52 weeks. It is a convention, not a promise: two weeks of unpaid leave, a week of sick days or regular unpaid overtime all reduce the real hourly equivalent. If the role is paid hourly with guaranteed overtime, the annual figure should include those hours rather than assuming a flat 40-hour week.</p>
<p>The bigger gap is between employment and contracting. A contractor's rate has to cover the employer contributions, paid holidays, equipment and downtime that an employee receives on top of salary, which is why the same work typically prices 25-40% higher on a day rate. This page converts the arithmetic; the premium is a negotiation input, not something the calculator can decide for you.</p>
<p>Currency is deliberately not converted here. An annual figure in one country and an hourly figure in another need an exchange rate and a cost-of-living adjustment before they mean anything side by side — use the currency converter for the first step, then compare like with like.</p>`.trim(),

  '/finance/credit-card-payoff/': `
<h2>What This Calculator Really Does</h2>
<p>A credit card balance has no fixed term. The card issuer sets a minimum payment, usually a small percentage of the balance plus that month's interest, and the debt lasts as long as you keep paying it. This page takes the balance, the APR and the payment you can actually make, and returns how many months it takes to clear — plus the interest paid along the way.</p>
<p>The mechanism is daily interest. The APR is divided by 365 and applied to the balance for each day it is outstanding, which is why a payment made early in the cycle saves more than the same payment made late. The calculator works in monthly periods, so it matches a statement cycle closely but not to the cent against an issuer's daily accrual.</p>
<p>Minimum payments are the trap the tool is built to expose. A minimum that is 2-3% of the balance falls as the balance falls, so the repayment slows down exactly when it should speed up; on a typical card the schedule can run for years and the interest can approach the original balance. Entering a fixed payment instead shows how much a slightly larger, unchanging amount cuts both the term and the cost.</p>
<p>It assumes the rate stays put and no new spending is added. A promotional APR, a balance transfer fee or a missed payment that resets the rate will change the answer, so re-run with the rate you will actually be charged once any introductory period ends. The month count is a planning estimate, not a payoff quote.</p>`.trim(),

  '/finance/retirement/': `
<h2>What This Calculator Really Does</h2>
<p>A retirement projection is a compound-growth calculation with a withdrawal phase attached. This page takes your current savings, the amount you add, the return you expect and the years until and through retirement, then shows the fund at retirement and what it can support — the two numbers that decide whether the plan holds.</p>
<p>The inputs are where projections go wrong. A return assumption above roughly 7% nominal for a balanced portfolio is optimistic over a full career; a contribution that never rises with inflation quietly shrinks in real terms. Entering today's contribution and today's spending is fine, as long as the comparison between them is made in the same, un-inflated money.</p>
<p>The withdrawal phase adds sequence risk, which a single average return cannot show. Two portfolios with identical average returns can end very differently if the bad years arrive early in retirement, because withdrawals then lock in losses. Treat the fund figure as a midpoint and test a lower return or a higher withdrawal to see how much margin the plan actually has.</p>
<p>Taxes, fees and inflation sit outside the arithmetic unless you build them in. A 1% annual fee compounds into a materially smaller fund over 30 years, and withdrawals from tax-deferred accounts are taxed as income. Use the projection to size the gap between saving and spending, then confirm the tax and fee details with the account provider.</p>`.trim(),

  '/finance/us-income-tax/': `
<h2>What This Calculator Really Does</h2>
<p>The rate on your last dollar is not the rate on your whole income. US federal income tax is bracketed: each slice of taxable income is taxed at its own rate, so the effective rate is always lower than the marginal rate. This page applies the brackets to your filing status, income and deductions and returns the federal tax, the effective rate, and the income left after it.</p>
<p>Taxable income is not gross salary. The standard deduction (or itemised deductions if they are larger) comes off first, and pre-tax contributions such as a traditional 401(k) or HSA reduce it further. Changing the deduction field moves the answer more than most people expect, which is why the same salary can produce different federal tax for two households.</p>
<p>Federal income tax is also not the whole paycheck. Social Security and Medicare are separate payroll taxes with their own caps and rates, and most states add an income tax on top. The result here is the federal layer only — useful for bracket planning and for checking a withholding estimate, not for predicting take-home pay.</p>
<p>Credits are the other half of the story. The child tax credit, education credits and the earned income credit are subtracted after the tax is computed, so a household with credits can owe far less than the bracket math suggests. Add them from your return rather than assuming this figure is final.</p>`.trim(),

  '/health/bmi/': `
<h2>What This Calculator Really Does</h2>
<p>BMI is a screening ratio: weight in kilograms divided by height in metres squared. It exists because it is cheap, consistent and good at describing populations. That is also its limit — it does not know what the weight is made of, where it sits, or how old the person is, so this page shows the number and the category while being explicit about what neither can tell you.</p>
<p>The adult cut-offs most guidelines use are 18.5, 25 and 30, with a healthy range between the first two. Some health bodies apply lower thresholds for people of South Asian descent, because cardiometabolic risk rises at a lower BMI; children and teenagers are assessed on age- and sex-specific percentile charts, not these fixed bands. Applying adult cut-offs to a child is a common and misleading mistake.</p>
<p>Muscle is denser than fat. A trained athlete can carry a BMI in the "overweight" band with low body fat, and an older adult can sit in the "normal" band with low muscle mass and high visceral fat. Waist circumference, waist-to-height ratio and a body-fat estimate each answer a question BMI cannot, which is why clinics use them together.</p>
<p>Read the result as a trend rather than a verdict. A single reading moves with hydration, time of day and recent meals; the direction over months is more informative than any one number. This is not a diagnosis, and it is not a substitute for a clinician who can look at the whole picture.</p>`.trim(),

  '/math/percentage/': `
<h2>What This Calculator Really Does</h2>
<p>A percentage is a ratio written out of 100, and almost every percentage mistake comes from losing track of the base. This page handles the four questions that cover most real uses: what is X% of Y, what percentage is X of Y, what is the percentage change from one number to another, and what number is left after adding or removing a percentage.</p>
<p>The distinction that causes the most confusion is percent versus percentage point. A rate that moves from 4% to 6% has risen by two percentage points, but by 50% in relative terms. Both statements are true and they answer different questions, so the phrasing matters when the number is going into a report or a contract.</p>
<p>Percentage changes are not symmetric. A 20% fall followed by a 20% rise does not return to the starting value, because the second percentage applies to the smaller base; the result is 4% below where it began. The same asymmetry explains why stacked discounts are smaller than they look: 20% off and then another 20% off is 36% off, not 40%.</p>
<p>Reverse questions need the same care. If a price including 20% tax is 120, the pre-tax amount is 100, not 96 — dividing by 1.2, not subtracting 20%. Enter the known values and let the tool pick the right operation; the steps below each result show which base was used.</p>`.trim()
};

function findPages() {
  const out = [];
  for (const route of Object.keys(INTROS)) {
    const rel = route.replace(/^\//, '').replace(/\/$/, '');
    const p = path.join(DEPLOY, rel, 'index.html');
    if (fs.existsSync(p)) out.push({ route, p });
  }
  return out;
}

let changed = 0;
let stale = 0;
for (const { route, p } of findPages()) {
  let html = fs.readFileSync(p, 'utf8');
  const start = html.indexOf(MARK);
  // Most pages follow the intro with a quick-answer box; BMI and Percentage put
  // the answer elsewhere, so fall back to the next section heading.
  let end = html.indexOf('<div class="premium-answer">', start);
  if (end === -1) end = html.indexOf('<h2>', start + MARK.length);
  if (start === -1 || end === -1) {
    console.error('  ! ' + route + ' — intro markers not found');
    stale++;
    continue;
  }
  const current = html.slice(start, end);
  const next = INTROS[route] + '\n';
  if (current.trim() === next.trim()) continue;
  if (CHECK) { stale++; console.log('  stale: ' + route); continue; }
  html = html.slice(0, start) + next + html.slice(end);
  fs.writeFileSync(p, html, 'utf8');
  changed++;
}

if (CHECK) {
  if (stale) { console.error('✖ ' + stale + ' premium intro(s) still on the shared template — run: node scripts/apply-premium-intros.cjs'); process.exit(1); }
  console.log('✔ premium intros are page-specific');
} else {
  console.log('premium intros rewritten: ' + changed + (stale ? ' (' + stale + ' skipped)' : ''));
}
