#!/usr/bin/env node
// Adds SEO entries for the 5 regional batch-2 tools to js/seo-content.js.
// Idempotent per-id: only inserts entries that are missing.
// Run AFTER add-regional-tools-batch2.cjs, then: node scripts/split-seo.cjs
//
// ESCAPING: this source contains NO literal backslash and NO double-quote
// characters. Everything is built with String.fromCharCode(92) (backslash)
// and single-quoted JS literals, so no file-sync layer can mangle it.
// Verified ground truth: healthy entries carry value-level href=\ ... \">
'use strict';
const fs = require('fs');
const FILE = require('path').join(__dirname, '..', 'js', 'seo-content.js');
const B = String.fromCharCode(92); // one backslash
const NL = String.fromCharCode(10);
let src = fs.readFileSync(FILE, 'utf8');

function q(s) { return s.split('"').join(B + '"'); } // escape double quotes for a JS string literal

function entry(id, title, metaDesc, lsi, aeoH2, aeoQuick, descHtml, faqs) {
  return '  ' + String.fromCharCode(39) + id + String.fromCharCode(39) + ': {' +
    '"title":' + JSON.stringify(title) +
    ',"metaDesc":' + JSON.stringify(metaDesc) +
    ',"canonicalPath":"/regional/' + id + '"' +
    ',"cat":"regional","catName":"Regional"' +
    ',"lsi":' + JSON.stringify(lsi) +
    ',"aeo":' + JSON.stringify(aeoH2 + aeoQuick) +
    ',"desc":"' + q(descHtml) + '"' +
    ',"faqs":' + JSON.stringify(faqs.map(f => ({ q: f[0], a: f[1] }))) + '},';
}

// guide links: value must be href=\"path\">  (one backslash each side)
const OPEN = 'href=' + B + '"';
const CLOSE = B + '">';
const GUIDES_LINKS = '<h2>From Our Guides Library</h2><ul>' +
  '<li><a ' + OPEN + '/guides/tax-salary/' + CLOSE + 'how salary tax is calculated</a></li>' +
  '<li><a ' + OPEN + '/guides/salary/' + CLOSE + 'salary structures explained</a></li>' +
  '<li><a ' + OPEN + '/guides/currency-conversion/' + CLOSE + 'currency conversion, fees included</a></li>' +
  '</ul>';

const blocks = [];

// ---------- AUSTRALIA ----------
blocks.push(entry('australia-take-home-salary',
  'Australia Take-Home Salary Calculator: After Tax, Medicare & Super',
  'Calculate Australian take-home pay instantly — 2025-26 income tax brackets, 2% Medicare levy and employer super itemised on a A$95,000 salary example.',
  ['australia take home salary calculator', 'salary after tax australia', 'medicare levy calculator', 'take home pay australia'],
  '<h2>What does the Australia Take-Home Salary Calculator do?</h2><p>It converts a gross Australian salary into monthly take-home pay, applying the 2025-26 income tax brackets (16/30/37/45%), the 2% Medicare levy, and showing the employer superannuation contribution separately — because super is paid on top of salary, not out of it.</p><ul><li><strong>Inputs:</strong> annual salary, super percentage.</li><li><strong>Output:</strong> monthly and annual take-home with each deduction itemised.</li><li><strong>Method:</strong> 2025-26 resident rates, evaluated entirely in your browser.</li></ul>',
  '<h3>Quick answer</h3><p>A A$95,000 salary leaves about A$79,272 a year (roughly A$6,606 per month) after tax and Medicare, with A$10,925 employer super paid additionally into your fund. Change any input and the steps re-derive the answer instantly.</p>',
  '<h2>What This Calculator Really Does</h2><p>The Australia Take-Home Salary Calculator turns a gross annual salary into the number that actually reaches your bank account. It applies the A$18,200 tax-free threshold, the 16%/30%/37%/45% brackets, and the 2% Medicare levy — then lists every subtraction as a numbered step you can verify by hand.</p><h2>The 2025-26 rates it applies</h2><ul><li><strong>Tax-free threshold:</strong> A$18,200.</li><li><strong>Income tax:</strong> 16% to A$45,000, 30% to A$135,000, 37% to A$190,000, 45% above.</li><li><strong>Medicare levy:</strong> 2% of taxable income (low-income reductions not modelled).</li><li><strong>Super:</strong> employer contribution (11.5% in 2025-26) is shown separately — it is additional to your salary, not deducted from it.</li></ul><h2>Worked example with real numbers</h2><p>Salary A$95,000: taxable income is A$76,800; income tax is A$13,828; Medicare is A$1,900; annual take-home lands at <strong>about A$79,272 — roughly A$6,606 per month</strong> — plus A$10,925 super. Change any input and the whole chain re-derives instantly.</p><h2>Reading the result</h2><p>The main panel leads with monthly take-home; the donut chart shows how the gross splits between tax, Medicare, super and your pay. HECS/HELP repayments and private health insurance rebates are not modelled — treat the output as the baseline and reconcile against your payslip where they apply.</p>' + GUIDES_LINKS,
  [['How is Australian take-home pay calculated?', 'Gross salary minus the A$18,200 tax-free allowance, then 16-45% bracket tax, then the 2% Medicare levy, divided by 12. The steps panel lists each subtraction with exact figures so the arithmetic can be verified by hand.'],
   ['Does the A$95,000 example include super?', 'Super (11.5% in 2025-26) is paid by your employer on top of salary, so it appears as a separate slice in the chart rather than a deduction. Salary-packaged super is not modelled.'],
   ['Are HECS/HELP repayments included?', 'No — student loan repayments are levied through the tax system at income-dependent rates and are not subtracted here. Add them manually if they apply to you.'],
   ['Is it accurate for non-residents?', 'Non-residents pay different rates (30% from the first dollar) and no Medicare levy — this calculator models resident rates, so non-resident results will differ.'],
   ['Is the Australia Take-Home Salary Calculator really free?', 'Yes — 100% free with no limits and no account required. Everything runs in your browser, nothing is uploaded, and the page works offline after the first visit.']]));

// ---------- SINGAPORE ----------
blocks.push(entry('singapore-take-home-salary',
  'Singapore Take-Home Salary Calculator: After CPF (2025)',
  'Calculate Singapore take-home pay instantly — employee CPF at 20% (capped), expat no-CPF mode, and how yearly income tax fits in. Every step shown.',
  ['singapore take home salary calculator', 'cpf contribution calculator employee', 'singapore net salary expat'],
  '<h2>What does the Singapore Take-Home Salary Calculator do?</h2><p>It converts a monthly Singapore salary into take-home pay: CPF employee contribution (20% on the first S$7,400 for citizens/PRs) or zero CPF for employment-pass foreigners, with the yearly income-tax picture explained separately.</p><ul><li><strong>Inputs:</strong> monthly salary, residency status.</li><li><strong>Output:</strong> monthly take-home with CPF itemised.</li><li><strong>Method:</strong> 2025 CPF caps, evaluated entirely in your browser.</li></ul>',
  '<h3>Quick answer</h3><p>A S$6,500 salary for a citizen/PR leaves S$5,200 per month after S$1,300 CPF; the same salary for an employment-pass foreigner leaves S$6,500 because expats pay no CPF. Personal income tax (0% on the first S$20,000) is filed yearly, not deducted monthly.</p>',
  '<h2>What This Calculator Really Does</h2><p>The Singapore Take-Home Salary Calculator applies the rule that dominates Singapore payslips: CPF. Citizens and PRs contribute 20% of monthly wages up to the S$7,400 ceiling (S$1,480 maximum); foreigners on EP/S-pass contribute nothing. The calculator shows both paths side by side so expat offers and local offers can be compared honestly.</p><h2>Why Singapore is different</h2><ul><li><strong>No monthly tax withholding:</strong> personal income tax is assessed yearly after filing — the first S$20,000 is taxed at 0% and effective rates for most salaries sit in the low single digits to mid-teens.</li><li><strong>CPF is savings, not pure tax:</strong> the employee 20% lands in your own OA/SA/MA accounts, which is why the chart labels it separately from tax.</li><li><strong>Employer CPF (17%) is on top:</strong> like Australian super, it never passes through your payslip.</li></ul><h2>Worked example with real numbers</h2><p>Salary S$6,500 (citizen): CPF = 20% × S$6,500 = S$1,300; take-home = <strong>S$5,200 per month</strong>. Salary S$6,500 (foreigner): CPF = S$0; take-home = <strong>S$6,500 per month</strong>. The extra line reports annual totals so offers quoted annually can be compared with monthly ones.</p><h2>Reading the result</h2><p>The headline is monthly take-home; the extra line adds the annual figure and a reminder of the CPF cap. Bonuses attract CPF too (capped the same way) — model them by adding to the salary field. The SDL and SHG levies employers pay are not employee deductions and are excluded.</p>' + GUIDES_LINKS,
  [['How is Singapore take-home pay calculated?', 'Monthly salary minus employee CPF (20% on the first S$7,400 for citizens/PRs) equals take-home. Foreigners on employment passes pay no CPF, so their take-home equals the full salary. The steps panel shows the subtraction with exact figures.'],
   ['How much CPF is deducted from my salary?', '20% of your monthly wage up to a wage ceiling of S$7,400 — a maximum of S$1,480 per month for employees at or above the ceiling.'],
   ['Do expats pay CPF in Singapore?', 'No. Employment-pass, S-pass and work-permit holders do not contribute to CPF. Their take-home equals gross salary minus nothing (tax is filed yearly).'],
   ['Where is Singapore income tax in this result?', 'It is not deducted monthly — Singapore tax is assessed after yearly filing, with the first S$20,000 at 0%. The extra line reminds you of this so the take-home is not mistaken for tax-free income.'],
   ['Is the Singapore Take-Home Salary Calculator really free?', 'Yes — 100% free, no sign-up, runs entirely in your browser, and works offline after the first load.']]));

// ---------- QATAR ----------
blocks.push(entry('qatar-take-home-salary',
  'Qatar Take-Home Salary Calculator: 0% Income Tax Breakdown',
  'Calculate Qatar take-home pay instantly — basic vs allowances split, zero personal income tax, and the end-of-service gratuity that accrues on top. Every step shown.',
  ['qatar salary calculator', 'qatar take home pay', 'doha salary tax free calculator'],
  '<h2>What does the Qatar Take-Home Salary Calculator do?</h2><p>It splits a Doha salary into basic pay and allowances (housing, transport, education), confirms the take-home equals the gross because Qatar levies no personal income tax, and reports the end-of-service gratuity that accrues each year.</p><ul><li><strong>Inputs:</strong> monthly basic salary, monthly allowances.</li><li><strong>Output:</strong> monthly and annual take-home with the basic/allowance split charted.</li><li><strong>Method:</strong> Qatar Income Tax Law rules — 0% on personal employment income — evaluated entirely in your browser.</li></ul>',
  '<h3>Quick answer</h3><p>A QAR 9,000 basic plus QAR 2,500 allowances pays out the full QAR 11,500 per month — no income tax, no social security for expatriates. Qataris contribute 5% to the pension authority instead. Each year roughly QAR 6,300 of end-of-service gratuity accrues (21 days of basic per year of service).</p>',
  '<h2>What This Calculator Really Does</h2><p>The Qatar Take-Home Salary Calculator models the simplest payslip in the Gulf: gross equals net. It still matters, because offers in Qatar quote a basic salary plus separately-listed allowances — and the difference drives your gratuity, which accrues on the BASIC component only.</p><h2>The rules it applies</h2><ul><li><strong>Income tax:</strong> 0% — Qatar imposes no personal income tax on salaries.</li><li><strong>Expatriates:</strong> no social contributions; take-home equals gross.</li><li><strong>Qataris:</strong> 5% pension contribution (not deducted for expat offers).</li><li><strong>End-of-service gratuity:</strong> 3 weeks of basic wage per year of service — accrual shown annually so you can track it.</li></ul><h2>Worked example with real numbers</h2><p>Basic QAR 9,000 + allowances QAR 2,500 = <strong>QAR 11,500 take-home per month</strong> (QAR 138,000 a year, tax-free). Gratuity accrual: 21 days of basic ≈ <strong>QAR 6,300 per year</strong>, paid on leaving.</p><h2>Reading the result</h2><p>The donut shows the basic/allowance split — remember allowances do not build gratuity. Annual leave salary and overtime are computed on basic + allowances under Qatari labour law but are not modelled here; the output is the monthly baseline.</p>' + GUIDES_LINKS,
  [['How is take-home pay calculated in Qatar?', 'Gross (basic + allowances) minus nothing for expatriates: Qatar charges no personal income tax and expats make no social contributions. The calculator confirms the payout line by line.'],
   ['Is Qatar salary really tax-free?', 'Yes for employment income — the Income Tax Law taxes business activity at 10%, but personal salaries are untaxed. Only Qataris pay the 5% pension share.'],
   ['What is end-of-service gratuity in Qatar?', 'Three weeks of your basic wage for every year of service, paid when you leave. On a QAR 9,000 basic that is about QAR 6,300 accrued per year — allowances are excluded.'],
   ['Do allowances count toward gratuity?', 'No — Qatari labour law computes gratuity on the basic wage only. That is why the calculator charts the basic/allowance split instead of a single gross number.'],
   ['Is the Qatar Take-Home Salary Calculator really free?', 'Yes — 100% free, no sign-up, runs entirely in your browser, and works offline after the first load.']]));

// ---------- ABU DHABI COST OF LIVING ----------
blocks.push(entry('abuDhabi-cost-living',
  'Abu Dhabi Cost of Living Calculator: Salary vs Rent, School & Transport',
  'Estimate Abu Dhabi living costs instantly — rent, schooling, transport and utilities against your salary, with your monthly surplus and saving rate shown. Every item itemised.',
  ['abu dhabi cost of living calculator', 'uae living cost calculator expat', 'abu dhabi salary vs rent calculator'],
  '<h2>What does the Abu Dhabi Cost of Living Calculator do?</h2><p>It converts your Abu Dhabi salary into a monthly budget: annual rent and school fees divided by 12, transport and utilities added, an other-spending estimate included, and the remaining surplus reported as a saving rate.</p><ul><li><strong>Inputs:</strong> monthly salary, annual rent, annual schooling, monthly transport, monthly utilities.</li><li><strong>Output:</strong> fixed monthly total, estimated all-in cost, monthly surplus and saving rate.</li><li><strong>Method:</strong> 0% personal income tax in the UAE — salary minus spending is what you keep.</li></ul>',
  '<h3>Quick answer</h3><p>On an AED 16,000 salary: AED 4,583 rent + AED 2,000 school + AED 900 transport + AED 700 utilities ≈ AED 8,183 fixed, about AED 3,200 other spending — leaving <strong>roughly AED 4,600 surplus per month</strong> (a 29% saving rate, tax-free).</p>',
  '<h2>What This Calculator Really Does</h2><p>Cost-of-living pages list prices; this calculator turns prices into YOUR budget. It annualises the big lumpy costs (rent and school fees are usually paid yearly or termly in Abu Dhabi), adds the monthly run-rate items, and shows what is left of your salary — the number that decides whether an offer is worth taking.</p><h2>What drives Abu Dhabi budgets</h2><ul><li><strong>Rent:</strong> paid by cheques or yearly; AED 55,000 covers a decent 1–2 bed in popular expat areas.</li><li><strong>Schooling:</strong> the silent budget-killer — AED 24,000+ per child per year at mid-tier private schools.</li><li><strong>Transport:</strong> fuel is cheap; AED 900 covers a car loan + fuel or generous taxi budget.</li><li><strong>Tax:</strong> 0% personal income tax — the surplus line needs no tax adjustment.</li></ul><h2>Worked example with real numbers</h2><p>Salary AED 16,000: rent AED 55,000/yr = AED 4,583/mo; school AED 24,000/yr = AED 2,000/mo; transport AED 900; utilities AED 700 → fixed AED 8,183. Other spending estimated at 20% of salary (AED 3,200) → total AED 11,383, <strong>surplus AED 4,617/mo (29% saving rate)</strong>.</p><h2>Reading the result</h2><p>The donut shows where the salary goes; the extra line reports the saving rate. Tweak rent down or school off to model single vs family moves. Municipality fees (5% of rent) and health insurance (usually employer-paid) are not modelled separately.</p>' + GUIDES_LINKS,
  [['How much do you need to live comfortably in Abu Dhabi?', 'A single expat lives well on AED 10,000–12,000/month; a family with one child in private school typically needs AED 18,000–25,000. Enter your own numbers — rent and schooling dominate everything else.'],
   ['Is salary taxed in Abu Dhabi?', 'No — the UAE levies no personal income tax, so the surplus the calculator reports is what actually reaches your account (minus any home-country obligations).'],
   ['What does rent cost in Abu Dhabi?', 'Studio/1-bed units in popular areas run AED 35,000–60,000 a year, paid by 1–4 cheques. The calculator divides your annual figure by 12 automatically.'],
   ['How much are school fees in Abu Dhabi?', 'Mid-tier private schools charge AED 20,000–40,000 per child yearly; premium British/IB curriculum schools exceed AED 60,000. Model each child by adding to the schooling field.'],
   ['Is the Abu Dhabi Cost of Living Calculator really free?', 'Yes — 100% free with no account needed. All maths runs in your browser and nothing is uploaded anywhere.']]));

// ---------- JAPAN ----------
blocks.push(entry('japan-take-home-salary',
  'Japan Take-Home Salary Calculator: Tax, Resident Tax & Shakai Hoken',
  'Calculate Japan take-home pay instantly — national income tax, 10% resident tax and shakai hoken (social insurance) itemised on a ¥6,000,000 salary example. Every step shown.',
  ['japan take home salary calculator', 'japan net salary after tax', 'shakai hoken calculator english'],
  '<h2>What does the Japan Take-Home Salary Calculator do?</h2><p>It converts an annual Japanese gross salary into monthly take-home: employment-income deduction, national income tax brackets (5–23%), the ~10% flat resident tax, and the ~14.66% employee share of shakai hoken (health, pension, unemployment).</p><ul><li><strong>Inputs:</strong> annual gross salary.</li><li><strong>Output:</strong> monthly and annual take-home with each deduction itemised.</li><li><strong>Method:</strong> 2025 national rates and standard deduction estimates, evaluated entirely in your browser.</li></ul>',
  '<h3>Quick answer</h3><p>A ¥6,000,000 salary nets about ¥4,262,000 a year — about <strong>¥355,000 per month</strong> — after ~¥557,000 income tax, ~¥302,000 resident tax and ~¥880,000 shakai hoken. Change the salary and every step re-derives instantly.</p>',
  '<h2>What This Calculator Really Does</h2><p>Japanese payslips confuse expats because three separate systems bite at once: national income tax (progressive, withheld monthly), resident tax (set by your city, paid the FOLLOWING year), and shakai hoken (social insurance shared with your employer). The calculator walks each one in order so the final take-home is explainable line by line.</p><h2>The systems it models</h2><ul><li><strong>Employment income deduction:</strong> roughly ¥480,000 plus 10% of salary — subtracted before tax.</li><li><strong>National income tax:</strong> 5% to ¥1.95M taxable, 10% to ¥3.3M, 20% to ¥6.95M, 23% above (2025 brackets).</li><li><strong>Resident tax:</strong> ~10% flat (6% municipal + 4% prefectural), levied on LAST income from June.</li><li><strong>Shakai hoken:</strong> ~14.66% employee share (health 5%, pension 9.15%, unemployment 0.5%) up to the standard monthly remuneration caps.</li></ul><h2>Worked example with real numbers</h2><p>Salary ¥6,000,000: employment deduction ≈ ¥1,080,000 → income after deduction ≈ ¥4,920,000. Income tax ≈ ¥557,000; resident tax ≈ ¥302,000; shakai hoken ≈ ¥880,000 → <strong>annual net ≈ ¥4,262,000 (¥355,000/month)</strong>.</p><h2>Reading the result</h2><p>The donut splits your gross across the four systems; the extra line reports the annual net. Year-end adjustment (nenmatsu chosei) refunds small over-withholdings in December — the calculator shows the statutory amounts, not your exact withholding. Bonuses attract their own withholding tables and are not modelled.</p>' + GUIDES_LINKS,
  [['How is take-home pay calculated in Japan?', 'Gross salary minus the employment-income deduction gives taxable income; national income tax (5–23% brackets) is withheld monthly, resident tax (~10%) is paid the following year, and shakai hoken (~14.66% employee share) comes off each payslip. The steps panel itemises all four.'],
   ['What is shakai hoken in Japan?', 'Social insurance: health insurance (~5%), employees pension (~9.15%) and unemployment insurance (~0.5%) — about 14.66% of your standard monthly remuneration, matched roughly equally by your employer.'],
   ['Why is resident tax separate from income tax?', 'Resident tax belongs to your city and prefecture (~10% combined) and is billed a year in arrears from June. New arrivals enjoy a nearly tax-free first year — the calculator still includes it for steady-state accuracy.'],
   ['How much tax do foreigners pay in Japan?', 'The same national and resident taxes as everyone after roughly 6+ months of residence. Non-residents face different rules on bonuses and stock comp — this calculator models resident employment income.'],
   ['Is the Japan Take-Home Salary Calculator really free?', 'Yes — 100% free, no sign-up, runs entirely in your browser, and works offline after the first load.']]));

// ---------- insert only missing ids (before the first existing entry line) ----------
let inserted = 0;
const anchor = NL + '  ' + String.fromCharCode(39);
const first = src.indexOf(anchor);
if (first < 0) { console.error('insertion anchor not found'); process.exit(1); }
const missing = [];
for (const b of blocks) {
  const id = b.match(/([a-zA-Z0-9-]+)': \{/)[1];
  if (src.includes(String.fromCharCode(39) + id + String.fromCharCode(39) + ':')) continue;
  missing.push(b);
}
if (missing.length) {
  src = src.slice(0, first + 1) + missing.join(NL) + src.slice(first);
  fs.writeFileSync(FILE, src);
}
console.log('regional-seo-batch2: inserted', missing.length, 'of 5');
