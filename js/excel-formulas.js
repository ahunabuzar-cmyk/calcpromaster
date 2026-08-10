// ====== Spreadsheet Formula Blocks (Excel / Google Sheets) — Gap 2 ======
// CalculatorSoup-style "copy-pasteable spreadsheet formula" for the highest-value
// finance tools. Office workers search for these (e.g. "PMT formula excel").
//
// Map: toolId → { formula, hint }
//   formula uses {inputId} placeholders — substituted with the user's live values
//   at render time, producing a ready-to-paste cell like =PMT(8.5/12, 60, -100000)
//   hint is a short one-line caption under the block.
//
// Kept OUTSIDE the data files (finance.js lines are huge single-line objects) so
// this stays reviewable and dual-consumable (vanilla global + CommonJS for Next).
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else if (typeof window !== 'undefined') window.ExcelFormulas = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var EXCEL_FORMULAS = {
    'loan-emi': {
      formula: '=PMT({rate}/12/100, {years}*12, -{amount})',
      hint: 'Monthly payment for a fixed-rate loan. rate = annual % (8.5 → 8.5), years = loan term.',
    },
    'mortgage': {
      formula: '=PMT({rate}/12/100, {years}*12, -({amount}-{down}))',
      hint: 'Monthly mortgage payment. Subtract your down payment from the home price first.',
    },
    'auto-loan': {
      formula: '=PMT({rate}/12/100, {years}*12, -({amount}-{down}))',
      hint: 'Monthly car-loan payment after your down payment.',
    },
    'compound-interest': {
      formula: '=FV({rate}/12/100, {years}*12, -{contribution}, -{principal})',
      hint: 'Future value with monthly compounding + regular contributions. FV(rate, nper, pmt, pv).',
    },
    'simple-interest': {
      formula: '={principal}*{rate}*{years}/100',
      hint: 'Simple interest: P × R × T / 100.',
    },
    'investment': {
      formula: '=FV({rate}/12/100, {years}*12, 0, -{initial})',
      hint: 'Future value of a lump-sum investment, compounded monthly.',
    },
    'savings-goal': {
      formula: '=PMT({rate}/12/100, {years}*12, 0, -{goal})',
      hint: 'Monthly contribution needed to reach a savings goal (PMT with pv=0, fv=-goal).',
    },
    'retirement': {
      formula: '=FV({rate}/12/100, {years}*12, -{monthly}, -{current})',
      hint: 'Retirement fund value: current savings + monthly contributions, compounded monthly.',
    },
    'credit-card-payoff': {
      formula: '=NPER({rate}/12/100, -{payment}, {balance})',
      hint: 'Months to pay off a credit card balance at a fixed monthly payment.',
    },
    'bmi': {
      formula: '={weight}/(({height}/100)^2)',
      hint: 'BMI with height in cm, weight in kg.',
    },
    'salary': {
      formula: '={hourly}*40*52',
      hint: 'Annual salary from an hourly rate (40 hrs/week × 52 weeks).',
    },
    'sip': {
      formula: '=FV({returnRate}/12/100, {years}*12, -{monthly})',
      hint: 'SIP future value: monthly investment compounded monthly at the expected return.',
    },
    'tip': {
      formula: '={bill}*{tipPct}/100',
      hint: 'Tip amount = bill × tip % / 100. Add it to the bill for the total.',
    },
    'discount': {
      formula: '={price}*{discount}/100',
      hint: 'Discount amount = price × discount % / 100. Final = price − discount.',
    },
    'markup': {
      formula: '={cost}*(1+{markup}/100)',
      hint: 'Selling price = cost × (1 + markup %). Markup is on cost, margin is on price.',
    },
    'percentage': {
      formula: '={part}/{whole}*100',
      hint: 'Percentage = part ÷ whole × 100.',
    },
    'tax': {
      formula: '=({income}-{deductions})*{rate}/100',
      hint: 'Flat-rate tax = (income − deductions) × rate %. For bracket taxes use the step-by-step breakdown.',
    },
    'present-value': {
      formula: '={fv}/(1+{rate}/100/{freq})^({years}*{freq})',
      hint: 'Present value of a future sum, discounted at the rate per period.',
    },
    'future-value': {
      formula: '={pv}*(1+{rate}/100/{freq})^({years}*{freq})',
      hint: 'Future value of a lump sum, compounded per period.',
    },
    'annuity': {
      formula: '={pv}*{rate}/100/(1-(1+{rate}/100)^(-{years}))',
      hint: 'Periodic payment from a present-value annuity (PMT formula).',
    },
    'inflation': {
      formula: '={amount}*(1+{rate}/100)^{years}',
      hint: 'Future cost = today\'s amount × (1 + inflation rate)^years.',
    },
    'break-even': {
      formula: '={fixed}/({price}-{variable})',
      hint: 'Break-even units = fixed costs ÷ (price − variable cost per unit).',
    },
    'loan-to-value': {
      formula: '={loan}/{value}*100',
      hint: 'Loan-to-value % = loan amount ÷ property value × 100.',
    },
    'rental-yield': {
      formula: '=({rent}*12-{costs})/{price}*100',
      hint: 'Annual net rental yield % = (annual rent − annual costs) ÷ price × 100.',
    },
    'gst-india': {
      formula: '={amount}*{gstRate}/100',
      hint: 'GST amount = base price × GST % / 100. Total = base + GST.',
    },
    'sip-return': {
      formula: '=FV({returnRate}/12/100, {years}*12, -{monthly})',
      hint: 'SIP maturity value, compounded monthly. Step-up raises the monthly amount yearly.',
    },
    'fd-calculator': {
      formula: '={amount}*(1+{rate}/400)^({years}*4)',
      hint: 'FD maturity with quarterly compounding: P × (1 + r/4/100)^(n×4).',
    },
    'ppf-calculator': {
      formula: '=FV({rate}/100, {years}, -{annual}, 0, 1)',
      hint: 'PPF maturity with yearly compounding of an annual contribution (type 1 = beginning of year).',
    },
    'home-loan-emi-india': {
      formula: '=PMT({rate}/12/100, {years}*12, -{amount})',
      hint: 'Home loan EMI with the Indian rate convention (annual % / 12).',
    },
  };

  function has(toolId) { return Object.prototype.hasOwnProperty.call(EXCEL_FORMULAS, toolId); }

  // Substitute {fieldId} placeholders with live values → ready-to-paste cell string.
  // Unknown/unused placeholders are left as-is (user edits them — still useful).
  function build(toolId, values) {
    var entry = EXCEL_FORMULAS[toolId];
    if (!entry) return '';
    var f = entry.formula;
    if (values) {
      Object.keys(values).forEach(function (k) {
        var v = values[k];
        if (v === undefined || v === null || v === '') return;
        var num = parseFloat(v);
        var rep = isFinite(num) ? String(num) : String(v);
        f = f.split('{' + k + '}').join(rep);
      });
    }
    return f;
  }

  return {
    EXCEL_FORMULAS: EXCEL_FORMULAS,
    has: has,
    build: build,
  };
});
