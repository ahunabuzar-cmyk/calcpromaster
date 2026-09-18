// Payment frequency and day-count convention options shared across finance tools
const PAYMENT_FREQ_OPTS = [
  {v:'12',l:'Monthly (12/yr)'},
  {v:'4',l:'Quarterly (4/yr)'},
  {v:'2',l:'Semi-Annually (2/yr)'},
  {v:'1',l:'Annually (1/yr)'},
  {v:'26',l:'Bi-Weekly (26/yr)'},
  {v:'52',l:'Weekly (52/yr)'}
];
const DCC_OPTS = [
  {v:'act365',l:'Actual/365'},
  {v:'act360',l:'Actual/360'},
  {v:'30_360',l:'30/360'}
];
const COMPOUND_FREQ_OPTS = [
  {v:'1',l:'Annually (1/yr)'},
  {v:'2',l:'Semi-Annually (2/yr)'},
  {v:'4',l:'Quarterly (4/yr)'},
  {v:'12',l:'Monthly (12/yr)'},
  {v:'52',l:'Weekly (52/yr)'},
  {v:'365',l:'Daily (365/yr)'}
];

// Calc helper functions for periodic rate, frequency labels, and DCC labels
function perPeriodRate(rate, ppy, dcc) {
  return rate / 100 / ppy;
}
function freqLabel(ppy) {
  return {1:'yearly',2:'semi-annually',4:'quarterly',12:'monthly',26:'bi-weekly',52:'weekly'}[ppy] || 'period';
}
function getDccLabel(dcc) {
  return {'act365':'Actual/365','act360':'Actual/360','30_360':'30/360'}[dcc] || dcc;
}

// ---- Financial helper functions (fixes corrupt function(){}.method() patterns) ----
// EMI/loan helpers — r is the PERIODIC rate (already divided), n = number of periods
function calcEMI(P, r, n) {
  if (r === 0) return P / n;
  const f = Math.pow(1 + r, n);
  return P * r * f / (f - 1);
}
function calcPrincipal(pmt, r, n) {
  if (r === 0) return pmt * n;
  const f = Math.pow(1 + r, n);
  return pmt * (f - 1) / (r * f);
}
function calcRate(P, pmt, n) {
  // Newton-Raphson solve for periodic rate r in: pmt = P * r * (1+r)^n / ((1+r)^n - 1)
  // Hardened against divergence: clamped step, non-finite guards → never returns NaN/Infinity.
  if (pmt <= 0 || n <= 0 || P <= 0) return 0;
  if (pmt <= P / n) return 0; // payment too low — no positive rate
  if (pmt >= P) return 1;      // payment ≥ principal means even 100%/period is too low — clamp
  let r = 0.01;
  for (let i = 0; i < 100; i++) {
    const f = Math.pow(1 + r, n);
    if (!isFinite(f)) { r = (r + 1) / 2; continue; } // overflow — step back toward 0
    const g = P * r * f / (f - 1) - pmt;
    const fp = Math.pow(1 + r, n - 1);
    // derivative of r*(1+r)^n/((1+r)^n - 1) wrt r
    const dg = P * (fp * (r * n + 1 + r) * (f - 1) - r * f * n * fp) / ((f - 1) * (f - 1));
    if (!isFinite(dg) || Math.abs(dg) < 1e-12) break;
    const r2 = r - g / dg;
    if (!isFinite(r2)) { r = (r + 1) / 2; continue; }
    if (r2 < 0) { r = r / 2; continue; }
    if (r2 > 1) { r = (r + 1) / 2; continue; } // clamp to ≤100%/period
    if (Math.abs(r2 - r) < 1e-12) { r = r2; break; }
    r = r2;
  }
  return isFinite(r) ? r : 0;
}
function calcTerm(P, r, pmt) {
  if (r === 0) return P / pmt;
  if (pmt <= P * r) return Infinity;
  return Math.log(pmt / (pmt - P * r)) / Math.log(1 + r);
}
// Compound interest helpers — rate is ANNUAL PERCENT (e.g. 8.5), freq = compounding periods per year
function compFutureValue(P, rAnnual, tYears, freq) {
  const n = freq === 'continuous' ? 0 : (parseFloat(freq) || 12);
  if (n === 0) return P * Math.exp(rAnnual * tYears / 100);
  return P * Math.pow(1 + rAnnual / (n * 100), n * tYears);
}
function compPrincipal(target, rAnnual, tYears, freq) {
  const n = freq === 'continuous' ? 0 : (parseFloat(freq) || 12);
  if (n === 0) return target / Math.exp(rAnnual * tYears / 100);
  return target / Math.pow(1 + rAnnual / (n * 100), n * tYears);
}
function compRate(P, target, tYears, freq) {
  if (P <= 0 || tYears <= 0) return 0;
  const n = freq === 'continuous' ? 0 : (parseFloat(freq) || 12);
  if (n === 0) return (Math.log(target / P) / tYears) * 100;
  return n * 100 * (Math.pow(target / P, 1 / (n * tYears)) - 1);
}
function compTime(P, target, rAnnual, freq) {
  if (P <= 0 || target <= P) return 0;
  const n = freq === 'continuous' ? 0 : (parseFloat(freq) || 12);
  if (n === 0) return Math.log(target / P) / (rAnnual / 100);
  return Math.log(target / P) / (n * Math.log(1 + rAnnual / (n * 100)));
}
function compIsContinuous(freq) {
  return String(freq) === 'continuous';
}
function compContributionsFV(contrib, rAnnual, tYears, freq, begin) {
  if (!contrib) return 0;
  const n = freq === 'continuous' ? 0 : (parseFloat(freq) || 12);
  if (n === 0) {
    // continuous annuity approximation
    const r = rAnnual / 100;
    const fv = contrib * (Math.exp(r * tYears) - 1) / r;
    return begin ? fv * Math.exp(r) : fv;
  }
  const i = rAnnual / (n * 100);
  const m = n * tYears;
  const fv = contrib * ((Math.pow(1 + i, m) - 1) / i);
  return begin ? fv * (1 + i) : fv;
}

// Finance calculators with step-by-step solutions (41)
const FINANCE_TOOLS = [
  { id: 'loan-emi', name: 'Loan EMI Calculator', desc: 'Solve for payment, loan amount, rate or term — with interest-only mode & day-count convention', kw: 'loan emi calculator india with prepayment, home loan emi calculator with monthly prepayment, car loan emi calculator monthly payment, day count convention',
    inputs: [
      {id:'mode',label:'Solve For',type:'select',opts:[{v:'payment',l:'Payment'},{v:'amount',l:'Loan Amount'},{v:'rate',l:'Interest Rate'},{v:'term',l:'Loan Term'},{v:'interest-only',l:'Interest-Only'}],def:'payment'},
      {id:'amount',label:'Loan Amount',type:'number',def:100000,slider:{min:1000,max:1000000,step:5000}},
      {id:'rate',label:'Interest Rate (% per year)',type:'number',def:8.5,slider:{min:0,max:25,step:0.5}},
      {id:'years',label:'Loan Term (years)',type:'number',def:5,slider:{min:1,max:40,step:1}},
      {id:'payment',label:'Payment per Period (for solve modes)',type:'number',def:2000,slider:{min:100,max:100000,step:100}},
      {id:'ioYears',label:'Interest-Only Period (years)',type:'number',def:2,slider:{min:0,max:20,step:1}},
      {id:'paymentFreq',label:'Payment Frequency',type:'select',opts:PAYMENT_FREQ_OPTS,def:'12'},
      {id:'dcc',label:'Day-Count Convention',type:'select',opts:DCC_OPTS,def:'act365'}
    ],
    calc: function(v) {
      const ppy = parseInt(v.paymentFreq) || 12;
      const mode = v.mode || 'payment';
      const r = perPeriodRate(v.rate, ppy, v.dcc || 'act365');
      const n = v.years * ppy;
      const per = freqLabel(ppy);
      const dccLabel = getDccLabel(v.dcc || 'act365');
      const money = (x) => '$' + Number(x).toLocaleString(undefined,{maximumFractionDigits:2});

      // Interest-Only Mode
      if (mode === 'interest-only') {
        const ioPayment = v.amount * r;
        const ioYears = Math.min(v.ioYears || 2, v.years);
        const ioPeriods = ioYears * ppy;
        const remainingYears = v.years - ioYears;
        const remainingPeriods = remainingYears * ppy;
        
        // After IO period, fully amortizing payment
        const principalAfterIO = v.amount; // no principal paid during IO
        let amortPayment = 0;
        if (remainingPeriods > 0) {
          amortPayment = calcEMI(principalAfterIO, r, remainingPeriods);
        }
        
        const totalIO = ioPayment * ioPeriods;
        const totalAmort = amortPayment * remainingPeriods;
        const totalPay = totalIO + totalAmort;
        const totalInt = totalPay - v.amount;
        
        return {
          result: 'IO Period: ' + money(ioPayment) + '/' + per,
          chart: Charts.bar([v.amount, totalInt], ['Principal','Total Interest']),
          extra: 'Interest-Only: ' + ioYears + ' yrs @ ' + money(ioPayment) + '/' + per + ' | Then: ' + money(amortPayment) + '/' + per + ' for ' + remainingYears.toFixed(1) + ' yrs | DCC: ' + dccLabel
        };
      }

      if (mode === 'amount') {
        const P = calcPrincipal(v.payment, r, n);
        const totalPay = v.payment * n; const totalInt = totalPay - P;
        return { result: 'Loan Amount: ' + money(P), chart: Charts.bar([P, totalInt], ['Principal','Interest']), extra: 'At ' + money(v.payment) + '/' + per + ' for ' + v.years + ' yrs · Total Interest: ' + money(totalInt) + ' | DCC: ' + dccLabel };
      }
      if (mode === 'rate') {
        const rp = calcRate(v.amount, v.payment, n);
        const annual = rp * ppy * 100;
        const totalPay = v.payment * n; const totalInt = totalPay - v.amount;
        return { result: 'Interest Rate: ' + annual.toFixed(3) + '% per year', chart: Charts.bar([v.amount, totalInt], ['Principal','Interest']), extra: 'Needed to repay ' + money(v.amount) + ' at ' + money(v.payment) + '/' + per + ' | DCC: ' + dccLabel };
      }
      if (mode === 'term') {
        const nSolved = calcTerm(v.amount, r, v.payment);
        if (!isFinite(nSolved)) return { result: 'Payment too low — loan never pays off', extra: 'Increase the payment above the periodic interest.' };
        const yrs = nSolved / ppy;
        const totalPay = v.payment * nSolved; const totalInt = totalPay - v.amount;
        return { result: 'Loan Term: ' + yrs.toFixed(2) + ' years', chart: Charts.bar([v.amount, totalInt], ['Principal','Interest']), extra: Math.ceil(nSolved) + ' payments of ' + money(v.payment) + '/' + per + ' · Total Interest: ' + money(totalInt) + ' | DCC: ' + dccLabel };
      }
      // default: solve for payment
      const emi = calcEMI(v.amount, r, n);
      const totalPay = emi * n; const totalInt = totalPay - v.amount;
      return { result: 'Payment: ' + money(emi) + ' / ' + per, chart: Charts.bar([v.amount, totalInt], ['Principal','Interest']), extra: 'Total Payment: ' + money(totalPay) + ' | Total Interest: ' + money(totalInt) + ' | DCC: ' + dccLabel };
    },
    steps: function(v) {
      const ppy = parseInt(v.paymentFreq) || 12; const mode = v.mode || 'payment';
      const r = perPeriodRate(v.rate, ppy, v.dcc || 'act365');
      const n = v.years*ppy; const per = freqLabel(ppy);
      const dccLabel = getDccLabel(v.dcc || 'act365');
      
      if (mode === 'interest-only') {
        const ioPayment = v.amount * r;
        const ioYears = Math.min(v.ioYears || 2, v.years);
        const remainingYears = v.years - ioYears;
        const remainingPeriods = remainingYears * ppy;
        const amortPayment = remainingPeriods > 0 ? calcEMI(v.amount, r, remainingPeriods) : 0;
        return ['Interest-Only Payment Schedule',
          'Step 1: Rate per period (' + dccLabel + ') = ' + (r*100).toFixed(4) + '%',
          'Step 2: Interest-Only payment = $' + v.amount + ' × ' + (r*100).toFixed(4) + '% = $' + ioPayment.toFixed(2) + '/' + per,
          'Step 3: IO period: ' + ioYears + ' years paying interest only',
          'Step 4: After IO: ' + remainingYears.toFixed(1) + ' years @ $' + amortPayment.toFixed(2) + '/' + per];
      }
      if (mode === 'amount') { const P=calcPrincipal(v.payment,r,n); return ['Solving for Loan Amount (DCC: '+dccLabel+')','Step 1: Rate per '+per+' = '+(r*100).toFixed(4)+'%','Step 2: Periods n = '+v.years+'×'+ppy+' = '+n,'Step 3: P = PMT × ((1+r)^n − 1) / (r×(1+r)^n)','Step 4: P = $'+P.toFixed(2)]; }
      if (mode === 'rate') { const rp=calcRate(v.amount,v.payment,n); return ['Solving for Interest Rate (numerical)','Step 1: Periods n = '+v.years+'×'+ppy+' = '+n,'Step 2: Rate per '+per+' ≈ '+(rp*100).toFixed(5)+'% (DCC: '+dccLabel+')','Step 3: Annual rate ≈ '+(rp*ppy*100).toFixed(3)+'%']; }
      if (mode === 'term') { const ns=calcTerm(v.amount,r,v.payment); return ['Solving for Loan Term (DCC: '+dccLabel+')','Step 1: Rate per '+per+' = '+(r*100).toFixed(4)+'%','Step 2: n = ln(PMT / (PMT − P×r)) / ln(1+r)','Step 3: n = '+(isFinite(ns)?ns.toFixed(2)+' periods = '+(ns/ppy).toFixed(2)+' years':'∞ (payment too low)')]; }
      const emi=calcEMI(v.amount,r,n); return ['Solving for Payment (DCC: '+dccLabel+')','Step 1: Rate per '+per+' = '+v.rate+'% → '+(r*100).toFixed(4)+'% ('+dccLabel+')','Step 2: Periods n = '+v.years+'×'+ppy+' = '+n,'Step 3: PMT = P×r×(1+r)^n / ((1+r)^n − 1)','Step 4: PMT = $'+emi.toFixed(2)+' per '+per]; },
    // Reverse calc (goal-seek): target = the monthly payment, with mode forced to 'payment'.
    // amount → analytical (LoanSolver.principal); rate/years → numeric via the loan formula
    // (exact DCC handling by reusing the same per-period rate the forward calc uses).
    reverse: {
      fixed: { mode: 'payment' },
      target: function(r) { const m = String(r.result || '').match(/Payment:\s*\$?(-?[\d,]+(?:\.\d+)?)/); return m ? parseFloat(m[1].replace(/,/g, '')) : NaN; },
      solveFor: { amount: 1, rate: 1, years: 1 },
      variables: {
        amount: { analytical: function(o, target) {
          const ppy = parseInt(o.paymentFreq) || 12;
          const r = o.rate / 100 / ppy;
          const n = o.years * ppy;
          return LoanSolver.principal(target, r, n);
        } },
        rate: { fn: function(x, o) {
          const ppy = parseInt(o.paymentFreq) || 12;
          const r = x / 100 / ppy;
          const n = o.years * ppy;
          return LoanSolver.payment(o.amount, r, n);
        }, domain: [0, 100] },
        years: { fn: function(x, o) {
          const ppy = parseInt(o.paymentFreq) || 12;
          const r = o.rate / 100 / ppy;
          const n = x * ppy;
          return LoanSolver.payment(o.amount, r, n);
        }, domain: [0.01, 100] }
      }
    } },
  { id: 'mortgage', name: 'Mortgage Calculator', desc: 'Mortgage — solve for payment, home price, rate or term — with interest-only mode & DCC', kw: 'fha vs conventional loan comparison calculator, home loan affordability calculator with property tax, mortgage payment calculator with pmi and taxes',
    inputs: [
      {id:'mode',label:'Solve For',type:'select',opts:[{v:'payment',l:'Payment'},{v:'amount',l:'Home Price'},{v:'rate',l:'Interest Rate'},{v:'term',l:'Loan Term'},{v:'interest-only',l:'Interest-Only'}],def:'payment'},
      {id:'amount',label:'Home Price',type:'number',def:300000,slider:{min:50000,max:2000000,step:10000}},
      {id:'down',label:'Down Payment',type:'number',def:60000,slider:{min:0,max:500000,step:5000}},
      {id:'rate',label:'Interest Rate (% per year)',type:'number',def:6.5,slider:{min:0,max:20,step:0.25}},
      {id:'years',label:'Loan Term (years)',type:'number',def:30,slider:{min:1,max:40,step:1}},
      {id:'payment',label:'Monthly Payment (for solve modes)',type:'number',def:2000},
      {id:'ioYears',label:'Interest-Only Period (years)',type:'number',def:5},
      {id:'paymentFreq',label:'Payment Frequency',type:'select',opts:PAYMENT_FREQ_OPTS,def:'12'},
      {id:'dcc',label:'Day-Count Convention',type:'select',opts:DCC_OPTS,def:'act365'}
    ],
    calc: function(v) {
      const ppy = parseInt(v.paymentFreq) || 12;
      const mode = v.mode || 'payment';
      const downPmt = v.down || 0;
      const P = v.amount - downPmt;
      const r = perPeriodRate(v.rate, ppy, v.dcc || 'act365');
      const per = freqLabel(ppy);
      const dccLabel = getDccLabel(v.dcc || 'act365');
      const money = (x) => '$' + Number(x).toLocaleString(undefined,{maximumFractionDigits:2});

      // Interest-Only Mode
      if (mode === 'interest-only') {
        const ioPayment = P * r;
        const ioYears = Math.min(v.ioYears || 5, v.years);
        const remainingYears = v.years - ioYears;
        const remainingPeriods = remainingYears * ppy;
        const amortPayment = remainingPeriods > 0 ? calcEMI(P, r, remainingPeriods) : 0;
        const totalIO = ioPayment * ioYears * ppy;
        const totalAmort = amortPayment * remainingPeriods;
        const totalPay = totalIO + totalAmort;
        const totalInt = totalPay - P;
        return { result: 'IO Period: ' + money(ioPayment) + '/' + per, chart: Charts.bar([P, totalInt], ['Loan','Total Interest']), extra: 'IO: ' + ioYears + ' yrs @ ' + money(ioPayment) + '/' + per + ' | Then: ' + money(amortPayment) + '/' + per + ' for ' + remainingYears.toFixed(1) + ' yrs | DCC: ' + dccLabel };
      }

      if (mode === 'amount') {
        const n = v.years * ppy;
        const maxLoan = calcPrincipal(v.payment, r, n);
        const homePrice = maxLoan + downPmt;
        const totalPay = v.payment * n;
        const totalInt = totalPay - maxLoan;
        return { result: 'Max Home Price: ' + money(homePrice), chart: Charts.bar([maxLoan, totalInt], ['Loan','Interest']), extra: 'Loan: ' + money(maxLoan) + ' | Down: ' + money(downPmt) + ' | At ' + money(v.payment) + '/' + per + ' | DCC: ' + dccLabel };
      }
      if (mode === 'rate') {
        const n = v.years * ppy;
        const rp = calcRate(P, v.payment, n);
        const annual = rp * ppy * 100;
        const totalPay = v.payment * n;
        const totalInt = totalPay - P;
        return { result: 'Interest Rate: ' + annual.toFixed(3) + '% per year', chart: Charts.bar([P, totalInt], ['Loan','Interest']), extra: 'Home: ' + money(v.amount) + ' | To afford ' + money(v.payment) + '/' + per + ' | DCC: ' + dccLabel };
      }
      if (mode === 'term') {
        const nSolved = calcTerm(P, r, v.payment);
        if (!isFinite(nSolved)) return { result: 'Payment too low — loan never pays off', extra: 'Increase the payment above the periodic interest.' };
        const yrs = nSolved / ppy;
        const totalPay = v.payment * nSolved;
        const totalInt = totalPay - P;
        return { result: 'Loan Term: ' + yrs.toFixed(2) + ' years', chart: Charts.bar([P, totalInt], ['Loan','Interest']), extra: Math.ceil(nSolved) + ' payments of ' + money(v.payment) + '/' + per + ' · Total Interest: ' + money(totalInt) + ' | DCC: ' + dccLabel };
      }
      // default: solve for payment
      const n = v.years * ppy;
      const emi = calcEMI(P, r, n);
      const totalPay = emi * n;
      const totalInt = totalPay - P;
      return { result: 'Payment: ' + money(emi) + ' / ' + per, chart: Charts.bar([P, totalInt], ['Loan','Interest']), extra: 'Home: ' + money(v.amount) + ' | Loan: ' + money(P) + ' | Total Interest: ' + money(totalInt) + ' | DCC: ' + dccLabel };
    },
    steps: function(v) {
      const ppy = parseInt(v.paymentFreq) || 12;
      const mode = v.mode || 'payment';
      const downPmt = v.down || 0;
      const P = v.amount - downPmt;
      const r = perPeriodRate(v.rate, ppy, v.dcc || 'act365');
      const n = v.years*ppy;
      const per = freqLabel(ppy);
      const dccLabel = getDccLabel(v.dcc || 'act365');

      if (mode === 'interest-only') {
        const ioPayment = P * r;
        const ioYears = Math.min(v.ioYears || 5, v.years);
        const remainingYears = v.years - ioYears;
        const remainingPeriods = remainingYears * ppy;
        const amortPayment = remainingPeriods > 0 ? calcEMI(P, r, remainingPeriods) : 0;
        return ['Interest-Only Mortgage (DCC: '+dccLabel+')','Step 1: Loan = $'+v.amount+' - $'+downPmt+' = $'+P,'Step 2: Rate per '+per+' = '+(r*100).toFixed(4)+'%','Step 3: IO payment = $'+P+' × '+(r*100).toFixed(4)+'% = $'+ioPayment.toFixed(2)+'/'+per+' for '+ioYears+' yrs','Step 4: After IO: $'+amortPayment.toFixed(2)+'/'+per+' for '+remainingYears.toFixed(1)+' yrs'];
      }
      if (mode === 'amount') {
        const maxLoan = calcPrincipal(v.payment, r, n);
        const homePrice = maxLoan + downPmt;
        return ['Solving for Max Home Price (DCC: '+dccLabel+')','Step 1: Rate per '+per+' = '+(r*100).toFixed(4)+'%','Step 2: Periods n = '+v.years+'×'+ppy+' = '+n,'Step 3: Max Loan = PMT × ((1+r)^n − 1) / (r×(1+r)^n)','Step 4: Max Loan = $'+maxLoan.toFixed(2),'Step 5: Home Price = Loan + Down = $'+maxLoan.toFixed(2)+' + $'+downPmt+' = $'+homePrice.toFixed(2)];
      }
      if (mode === 'rate') {
        const rp = calcRate(P, v.payment, n);
        return ['Solving for Rate (DCC: '+dccLabel+')','Step 1: Loan = $'+v.amount+' - $'+downPmt+' = $'+P,'Step 2: Find r with PMT(P,r,'+n+') = '+v.payment,'Step 3: Rate per '+per+' ≈ '+(rp*100).toFixed(5)+'%','Step 4: Annual rate ≈ '+(rp*ppy*100).toFixed(3)+'%'];
      }
      if (mode === 'term') {
        const ns = calcTerm(P, r, v.payment);
        return ['Solving for Loan Term (DCC: '+dccLabel+')','Step 1: Loan = $'+v.amount+' - $'+downPmt+' = $'+P,'Step 2: Rate per '+per+' = '+(r*100).toFixed(4)+'%','Step 3: n = '+(isFinite(ns)?ns.toFixed(2)+' periods = '+(ns/ppy).toFixed(2)+' years':'∞ (payment too low)')];
      }
      const emi = calcEMI(P, r, n);
      return ['Solving for Payment (DCC: '+dccLabel+')','Step 1: Loan = $'+v.amount+' - $'+downPmt+' = $'+P,'Step 2: Rate per '+per+' = '+(r*100).toFixed(4)+'% ('+dccLabel+')','Step 3: Periods n = '+v.years+'×'+ppy+' = '+n,'Step 4: PMT = P×r×(1+r)^n / ((1+r)^n − 1)','Step 5: PMT = $'+emi.toFixed(2)+' per '+per];
    } },
  { id: 'compound-interest', name: 'Compound Interest Calculator', desc: 'Compound growth with contributions — solve for amount, principal, rate or time', kw: 'compound interest calculator with monthly contribution in rupees, compound interest calculator with yearly deposits, investment growth calculator with monthly sip, solve for rate',
    inputs: [
      {id:'mode',label:'Solve For',type:'select',opts:[{v:'final',l:'Final Amount'},{v:'principal',l:'Starting Principal'},{v:'rate',l:'Required Rate'},{v:'time',l:'Required Time'}],def:'final'},
      {id:'principal',label:'Principal Amount',type:'number',def:10000,slider:{min:1000,max:1000000,step:1000}},
      {id:'rate',label:'Annual Rate (%)',type:'number',def:7,slider:{min:0,max:30,step:0.5}},
      {id:'years',label:'Time (years)',type:'number',def:10,slider:{min:1,max:50,step:1}},
      {id:'target',label:'Target Amount (for solve modes)',type:'number',def:20000},
      {id:'contribution',label:'Regular Contribution (per period)',type:'number',def:0},
      {id:'timing',label:'Contribution Timing',type:'select',opts:[{v:'end',l:'End of period'},{v:'begin',l:'Beginning of period'}],def:'end'},
      {id:'freq',label:'Compounding Frequency',type:'select',opts:COMPOUND_FREQ_OPTS,def:'12'}
    ],
    calc: function(v) {
      const mode = v.mode || 'final';
      const money = (x) => '$' + Number(x).toLocaleString(undefined,{maximumFractionDigits:2});
      const contLabel = compIsContinuous(v.freq) ? 'continuously' : ('×' + v.freq + '/yr');
      if (mode === 'principal') { const P = compPrincipal(v.target, v.rate, v.years, v.freq); return { result: 'Starting Principal: ' + money(P), chart: Charts.bar([P, v.target - P], ['Principal','Interest']), extra: 'To reach ' + money(v.target) + ' in ' + v.years + ' yrs at ' + v.rate + '% (' + contLabel + ')' }; }
      if (mode === 'rate') { const rt = compRate(v.principal, v.target, v.years, v.freq); return { result: 'Required Rate: ' + rt.toFixed(3) + '% per year', chart: Charts.bar([v.principal, v.target - v.principal], ['Principal','Growth']), extra: 'To grow ' + money(v.principal) + ' into ' + money(v.target) + ' in ' + v.years + ' yrs' }; }
      if (mode === 'time') { const t = compTime(v.principal, v.target, v.rate, v.freq); return { result: 'Required Time: ' + t.toFixed(2) + ' years', chart: Charts.bar([v.principal, v.target - v.principal], ['Principal','Growth']), extra: 'For ' + money(v.principal) + ' to reach ' + money(v.target) + ' at ' + v.rate + '%' }; }
      // default: final amount (with optional contributions)
      const base = compFutureValue(v.principal, v.rate, v.years, v.freq);
      const contribFV = compContributionsFV(v.contribution || 0, v.rate, v.years, v.freq, v.timing === 'begin');
      const final = base + contribFV;
      const nPts = Math.min(Math.max(Math.round(v.years), 2), 12);
      const pts = []; const labels = [];
      for (let k = 0; k <= nPts; k++) { const yy = v.years * k / nPts; pts.push(compFutureValue(v.principal, v.rate, yy, v.freq) + compContributionsFV(v.contribution || 0, v.rate, yy, v.freq, v.timing === 'begin')); labels.push('Y' + yy.toFixed(0)); }
      const contributed = (v.principal) + (v.contribution || 0) * (compIsContinuous(v.freq) ? 12 : parseFloat(v.freq)) * v.years;
      return { result: 'Final Amount: ' + money(final), chart: Charts.line(pts, labels), extra: 'Total Interest: ' + money(final - contributed) + (v.contribution > 0 ? ' | Total Contributed: ' + money(contributed) : '') + ' | Compounded ' + contLabel };
    },
    steps: function(v) {
      const mode = v.mode || 'final';
      if (mode === 'principal') { const P=compPrincipal(v.target,v.rate,v.years,v.freq); return ['Solving for Starting Principal','Formula: P = A / (1 + r/n)^(n·t)','Result: P = $'+P.toFixed(2)]; }
      if (mode === 'rate') { const rt=compRate(v.principal,v.target,v.years,v.freq); return ['Solving for Required Rate','Formula: r = n·((A/P)^(1/(n·t)) − 1)','Result: r = '+rt.toFixed(3)+'% per year']; }
      if (mode === 'time') { const t=compTime(v.principal,v.target,v.rate,v.freq); return ['Solving for Required Time','Formula: t = ln(A/P) / (n·ln(1 + r/n))','Result: t = '+t.toFixed(2)+' years']; }
      const cont = compIsContinuous(v.freq); const n = cont?'∞ (continuous)':v.freq; const r=v.rate/100; const fv=compFutureValue(v.principal,v.rate,v.years,v.freq);
      return ['Solving for Final Amount', cont?'Step 1: Continuous compounding: A = P·e^(r·t)':'Step 1: A = P(1 + r/n)^(n·t), n = '+n, 'Step 2: Growth of principal = $'+fv.toFixed(2), (v.contribution>0?'Step 3: Plus future value of contributions ('+v.timing+'-of-period)':'Step 3: No regular contributions'), 'Step 4: Interest = Final − amount contributed']; } },
  { id: 'simple-interest', name: 'Simple Interest Calculator', desc: 'Solve for interest, principal, rate or time', kw: 'simple interest calculator yearly',
    inputs: [
      {id:'mode',label:'Solve For',type:'select',opts:[{v:'interest',l:'Interest'},{v:'principal',l:'Principal'},{v:'rate',l:'Rate'},{v:'time',l:'Time'}],def:'interest'},
      {id:'principal',label:'Principal',type:'number',def:5000},
      {id:'rate',label:'Rate (% per year)',type:'number',def:5},
      {id:'years',label:'Time (years)',type:'number',def:3},
      {id:'interest',label:'Interest Amount (for solve modes)',type:'number',def:750}
    ],
    calc: function(v) {
      const mode = v.mode || 'interest';
      const money = (x) => '$' + Number(x).toLocaleString(undefined,{maximumFractionDigits:2});
      if (mode === 'principal') { const P = (v.interest * 100) / (v.rate * v.years); return { result: 'Principal: ' + money(P), chart: Charts.bar([P, v.interest], ['Principal','Interest']), extra: 'To earn ' + money(v.interest) + ' at ' + v.rate + '% over ' + v.years + ' yrs' }; }
      if (mode === 'rate') { const R = (v.interest * 100) / (v.principal * v.years); return { result: 'Rate: ' + R.toFixed(3) + '% per year', chart: Charts.bar([v.principal, v.interest], ['Principal','Interest']), extra: 'To earn ' + money(v.interest) + ' on ' + money(v.principal) }; }
      if (mode === 'time') { const T = (v.interest * 100) / (v.principal * v.rate); return { result: 'Time: ' + T.toFixed(2) + ' years', chart: Charts.bar([v.principal, v.interest], ['Principal','Interest']), extra: 'To earn ' + money(v.interest) + ' at ' + v.rate + '%' }; }
      const si = v.principal * v.rate * v.years / 100;
      return { result: 'Interest: ' + money(si), chart: Charts.bar([v.principal, si], ['Principal','Interest']), extra: 'Total: ' + money(v.principal + si) };
    },
    steps: function(v) {
      const mode = v.mode || 'interest';
      if (mode === 'principal') { const P=(v.interest*100)/(v.rate*v.years); return ['Solving for Principal','Formula: P = (SI × 100) / (R × T)','P = ('+v.interest+'×100)/('+v.rate+'×'+v.years+') = $'+P.toFixed(2)]; }
      if (mode === 'rate') { const R=(v.interest*100)/(v.principal*v.years); return ['Solving for Rate','Formula: R = (SI × 100) / (P × T)','R = '+R.toFixed(3)+'% per year']; }
      if (mode === 'time') { const T=(v.interest*100)/(v.principal*v.rate); return ['Solving for Time','Formula: T = (SI × 100) / (P × R)','T = '+T.toFixed(2)+' years']; }
      const si=v.principal*v.rate*v.years/100; return ['Solving for Interest','Formula: SI = (P × R × T) / 100','SI = ('+v.principal+'×'+v.rate+'×'+v.years+')/100 = $'+si.toFixed(2),'Total = $'+(v.principal+si).toFixed(2)]; } },
  { id: 'auto-loan', name: 'Auto Loan Calculator', desc: 'Car loan — solve for payment, term or rate — with interest-only & DCC', kw: 'auto loan calculator with sales tax',
    inputs: [
      {id:'mode',label:'Solve For',type:'select',opts:[{v:'payment',l:'Payment'},{v:'rate',l:'Interest Rate'},{v:'term',l:'Loan Term'},{v:'interest-only',l:'Interest-Only'}],def:'payment'},
      {id:'amount',label:'Vehicle Price',type:'number',def:25000},
      {id:'down',label:'Down Payment',type:'number',def:5000},
      {id:'rate',label:'Rate (% per year)',type:'number',def:5.5},
      {id:'years',label:'Term (years)',type:'number',def:5},
      {id:'payment',label:'Payment per Period (for solve modes)',type:'number',def:400},
      {id:'ioYears',label:'Interest-Only Period (years)',type:'number',def:1},
      {id:'paymentFreq',label:'Payment Frequency',type:'select',opts:PAYMENT_FREQ_OPTS,def:'12'},
      {id:'dcc',label:'Day-Count Convention',type:'select',opts:DCC_OPTS,def:'act365'}
    ],
    calc: function(v) {
      const ppy = parseInt(v.paymentFreq) || 12; const mode = v.mode || 'payment';
      const P = v.amount - v.down; 
      const r = perPeriodRate(v.rate, ppy, v.dcc || 'act365');
      const n = v.years*ppy;
      const per = freqLabel(ppy);
      const dccLabel = getDccLabel(v.dcc || 'act365');
      const money = (x) => '$' + Number(x).toLocaleString(undefined,{maximumFractionDigits:2});

      if (mode === 'interest-only') {
        const ioPayment = P * r;
        const ioYears = Math.min(v.ioYears || 1, v.years);
        const remainingYears = v.years - ioYears;
        const remainingPeriods = remainingYears * ppy;
        const amortPayment = remainingPeriods > 0 ? calcEMI(P, r, remainingPeriods) : 0;
        const totalIO = ioPayment * ioYears * ppy;
        const totalAmort = amortPayment * remainingPeriods;
        const totalPay = totalIO + totalAmort;
        const totalInt = totalPay - P;
        return { result: 'IO Period: ' + money(ioPayment) + '/' + per, chart: Charts.bar([P, totalInt], ['Principal','Total Interest']), extra: 'IO: ' + ioYears + ' yrs @ ' + money(ioPayment) + '/' + per + ' | Then: ' + money(amortPayment) + '/' + per + ' | DCC: ' + dccLabel };
      }

      if (mode === 'rate') { const rp = calcRate(P, v.payment, n); const annual = rp*ppy*100; const totalInt = v.payment*n - P; return { result: 'Interest Rate: ' + annual.toFixed(3) + '% per year', chart: Charts.bar([P, totalInt], ['Principal','Interest']), extra: 'Financing ' + money(P) + ' at ' + money(v.payment) + '/' + per + ' | DCC: ' + dccLabel }; }
      if (mode === 'term') { const ns = calcTerm(P, r, v.payment); if (!isFinite(ns)) return { result: 'Payment too low — loan never pays off' }; const totalInt = v.payment*ns - P; return { result: 'Loan Term: ' + (ns/ppy).toFixed(2) + ' years', chart: Charts.bar([P, totalInt], ['Principal','Interest']), extra: Math.ceil(ns) + ' payments of ' + money(v.payment) + '/' + per + ' | DCC: ' + dccLabel }; }
      const emi = calcEMI(P, r, n); const totalPay = emi*n; return { result: 'Payment: ' + money(emi) + ' / ' + per, chart: Charts.bar([P, totalPay - P], ['Principal','Interest']), extra: 'Loan Amount: ' + money(P) + ' | Total: ' + money(totalPay) + ' | DCC: ' + dccLabel };
    },
    steps: function(v) { 
      const ppy=parseInt(v.paymentFreq)||12; const p=v.amount-v.down; 
      const r=perPeriodRate(v.rate, ppy, v.dcc || 'act365');
      const n=v.years*ppy; const per=freqLabel(ppy);
      const dccLabel=getDccLabel(v.dcc || 'act365');
      const mode=v.mode||'payment'; 
      
      if (mode==='interest-only') {
        const ioPayment = p * r;
        const ioYears = Math.min(v.ioYears || 1, v.years);
        const remainingYears = v.years - ioYears;
        const remainingPeriods = remainingYears * ppy;
        const amortPayment = remainingPeriods > 0 ? calcEMI(p, r, remainingPeriods) : 0;
        return ['Interest-Only Auto Loan (DCC: '+dccLabel+')','Step 1: Loan = $'+v.amount+' − $'+v.down+' = $'+p,'Step 2: IO payment = $'+ioPayment.toFixed(2)+'/'+per+' for '+ioYears+' yrs','Step 3: Then: $'+amortPayment.toFixed(2)+'/'+per+' for '+remainingYears.toFixed(1)+' yrs'];
      }
      if (mode==='rate') { const rp=calcRate(p,v.payment,n); return ['Solving for Rate (DCC: '+dccLabel+')','Step 1: Loan = $'+v.amount+' − $'+v.down+' = $'+p,'Step 2: Find r with PMT(P,r,'+n+') = '+v.payment,'Step 3: Annual rate ≈ '+(rp*ppy*100).toFixed(3)+'%']; } 
      if (mode==='term') { const ns=calcTerm(p,r,v.payment); return ['Solving for Term (DCC: '+dccLabel+')','Step 1: Loan = $'+p,'Step 2: n = ln(PMT/(PMT−P×r))/ln(1+r) = '+(isFinite(ns)?(ns/ppy).toFixed(2)+' years':'∞')]; } 
      const emi=calcEMI(p,r,n); return ['Solving for Payment (DCC: '+dccLabel+')','Step 1: Loan = $'+v.amount+' − $'+v.down+' = $'+p,'Step 2: Rate per '+per+' = '+(r*100).toFixed(4)+'% ('+dccLabel+')','Step 3: PMT = $'+emi.toFixed(2)+' per '+per]; 
    } },
  { id: 'credit-card-payoff', name: 'Credit Card Payoff', desc: 'Credit card payoff — solve for payoff time, payment needed, rate, or balance', kw: 'credit card payoff calculator with extra payment, debt payoff calculator monthly payment plan, credit card payoff, solve for payment',
    inputs: [
      {id:'mode',label:'Solve For',type:'select',opts:[{v:'time',l:'Payoff Time'},{v:'payment',l:'Monthly Payment'},{v:'rate',l:'APR'},{v:'balance',l:'Max Balance'}],def:'time'},
      {id:'balance',label:'Current Balance',type:'number',def:5000},
      {id:'rate',label:'APR (%)',type:'number',def:18},
      {id:'payment',label:'Monthly Payment',type:'number',def:200},
      {id:'months',label:'Desired Payoff Time (months, for solve modes)',type:'number',def:24}
    ],
    calc: function(v) {
      const mode = v.mode || 'time';
      const money = (x) => '$' + Number(x).toLocaleString(undefined,{maximumFractionDigits:2});

      if (mode === 'payment') {
        // Solve for payment needed to pay off in desired months
        const r = v.rate/100/12;
        const n = v.months;
        const pmt = r > 0 ? v.balance * r * Math.pow(1+r, n) / (Math.pow(1+r, n) - 1) : v.balance / n;
        const total = pmt * n;
        const interest = total - v.balance;
        return { result: 'Monthly Payment: ' + money(pmt), chart: Charts.bar([v.balance, interest], ['Balance','Interest']), extra: 'Pay off in ' + v.months + ' months | Total: ' + money(total) };
      }
      if (mode === 'rate') {
        // Solve for APR given balance, payment, and months (binary search)
        const n = v.months;
        let lo = 0, hi = 1; // search 0%..100% per month
        for (let i = 0; i < 200; i++) {
          const mid = (lo + hi) / 2;
          const pmt = mid > 0 ? v.balance * mid * Math.pow(1+mid, n) / (Math.pow(1+mid, n) - 1) : v.balance / n;
          if (pmt < v.payment) lo = mid; else hi = mid;
        }
        const monthlyRate = (lo + hi) / 2;
        const apr = monthlyRate * 12 * 100;
        const total = v.payment * n;
        return { result: 'APR: ' + apr.toFixed(3) + '%', chart: Charts.bar([v.balance, total - v.balance], ['Balance','Interest']), extra: 'To pay off ' + money(v.balance) + ' at ' + money(v.payment) + '/mo in ' + v.months + ' months' };
      }
      if (mode === 'balance') {
        // Solve for max balance you can afford given payment and months
        const r = v.rate/100/12;
        const n = v.months;
        const maxBal = r > 0 ? v.payment * (Math.pow(1+r, n) - 1) / (r * Math.pow(1+r, n)) : v.payment * n;
        const total = v.payment * n;
        const interest = total - maxBal;
        return { result: 'Max Balance: ' + money(maxBal), chart: Charts.bar([maxBal, interest], ['Balance','Interest']), extra: 'Affordable at ' + money(v.payment) + '/mo for ' + v.months + ' months' };
      }
      // default: solve for time
      const r = v.rate/100/12;
      if (r > 0 && v.payment <= r * v.balance) {
        return { result: 'Payment too low', extra: 'Payment must be > ' + money(r * v.balance) + ' to cover interest' };
      }
      const months = r > 0 ? Math.ceil(-Math.log(1 - r*v.balance/v.payment)/Math.log(1+r)) : Math.ceil(v.balance/v.payment);
      const total = v.payment * months;
      const interest = total - v.balance;
      return { result: 'Payoff Time: ' + months + ' months', chart: Charts.bar([v.balance, interest], ['Balance','Interest']), extra: 'Total Paid: ' + money(total) };
    },
    steps: function(v) {
      const mode = v.mode || 'time';
      const r = v.rate/100/12;

      if (mode === 'payment') {
        const n = v.months;
        const pmt = r > 0 ? v.balance * r * Math.pow(1+r, n) / (Math.pow(1+r, n) - 1) : v.balance / n;
        return ['Solving for Monthly Payment','Formula: PMT = B × r × (1+r)^n / ((1+r)^n − 1)','Step 1: Monthly rate = '+v.rate+'%/12 = '+(r*100).toFixed(4)+'%','Step 2: Periods = '+v.months+' months','Step 3: PMT = $'+v.balance+' × '+r.toFixed(6)+' × '+(Math.pow(1+r,n).toFixed(6))+' / '+((Math.pow(1+r,n)-1).toFixed(6)),'Step 4: PMT = $'+pmt.toFixed(2)];
      }
      if (mode === 'rate') {
        return ['Solving for APR (binary search)','Formula: Find r where PMT(B,r,n) = Payment','Step 1: Binary search for monthly rate...','Step 2: Multiply by 12 to get APR','Step 3: Result shows required APR'];
      }
      if (mode === 'balance') {
        const n = v.months;
        const maxBal = r > 0 ? v.payment * (Math.pow(1+r, n) - 1) / (r * Math.pow(1+r, n)) : v.payment * n;
        return ['Solving for Max Balance','Formula: B = PMT × ((1+r)^n − 1) / (r × (1+r)^n)','Step 1: Monthly rate = '+(r*100).toFixed(4)+'%','Step 2: B = $'+v.payment+' × '+((Math.pow(1+r,n)-1).toFixed(6))+' / ('+r.toFixed(6)+' × '+(Math.pow(1+r,n).toFixed(6))+')','Step 3: B = $'+maxBal.toFixed(2)];
      }
      const months = r > 0 ? Math.ceil(-Math.log(1 - r*v.balance/v.payment)/Math.log(1+r)) : Math.ceil(v.balance/v.payment);
      return ['Solving for Payoff Time','Step 1: Monthly rate = '+v.rate+'%/12 = '+(r*100).toFixed(4)+'%','Step 2: N = -log(1 - r×B/P) / log(1+r)','Step 3: N = -log(1 - '+r.toFixed(6)+'×'+v.balance+'/'+v.payment+') / log('+(1+r).toFixed(6)+')','Step 4: N = '+months+' months','Step 5: Total paid = $'+(v.payment*months).toFixed(2)];
    } },
  { id: 'retirement', name: 'Retirement Calculator', desc: 'Retirement calculator — solve for final amount, monthly contribution, time, or required rate', kw: 'retirement savings calculator with monthly contribution, 401k retirement calculator with employer match, retirement age calculator based on savings rate, solve for contribution',
    inputs: [
      {id:'mode',label:'Solve For',type:'select',opts:[{v:'future',l:'Final Amount'},{v:'monthly',l:'Monthly Contribution'},{v:'time',l:'Years Needed'},{v:'rate',l:'Required Rate'}],def:'future'},
      {id:'current',label:'Current Savings',type:'number',def:50000},
      {id:'monthly',label:'Monthly Contribution',type:'number',def:500,slider:{min:100,max:100000,step:100}},
      {id:'rate',label:'Annual Return (%)',type:'number',def:7,slider:{min:0,max:30,step:0.5}},
      {id:'years',label:'Years to Retirement',type:'number',def:30,slider:{min:1,max:60,step:1}},
      {id:'target',label:'Target Amount (for solve modes)',type:'number',def:1000000}
    ],
    calc: function(v) {
      const mode = v.mode || 'future';
      const money = (x) => '$' + Number(x).toLocaleString(undefined,{maximumFractionDigits:2});

      if (mode === 'monthly') {
        // Solve for monthly contribution needed to reach target
        const r = v.rate/100/12;
        const n = v.years * 12;
        const fvCurrent = v.current * Math.pow(1+r, n);
        const needed = v.target - fvCurrent;
        const pmt = r > 0 ? needed * r / (Math.pow(1+r, n) - 1) : needed / n;
        const totalContrib = v.current + pmt * n;
        return { result: 'Monthly Contribution: ' + money(pmt), chart: Charts.bar([v.current, pmt * n], ['Current','Contributions']), extra: 'To reach ' + money(v.target) + ' in ' + v.years + ' years' };
      }
      if (mode === 'time') {
        // Solve for years needed to reach target
        const r = v.rate/100/12;
        // FV = current*(1+r)^n + monthly*((1+r)^n - 1)/r
        // Let A = current, P = monthly, T = target
        // T = A(1+r)^n + P((1+r)^n - 1)/r = (1+r)^n * (A + P/r) - P/r
        // (1+r)^n = (T + P/r) / (A + P/r)
        const factor = (v.target + v.monthly/r) / (v.current + v.monthly/r);
        const n = factor > 0 ? Math.log(factor) / Math.log(1+r) : Infinity;
        const years = n / 12;
        const totalContrib = v.current + v.monthly * n;
        return { result: 'Years Needed: ' + years.toFixed(2), chart: Charts.bar([v.current, v.target - v.current], ['Current','Growth']), extra: Math.ceil(n) + ' months to reach ' + money(v.target) };
      }
      if (mode === 'rate') {
        // Solve for required rate (binary search)
        const n = v.years * 12;
        let lo = 0, hi = 1;
        for (let i = 0; i < 200; i++) {
          const mid = (lo + hi) / 2;
          const fv = v.current * Math.pow(1+mid, n) + v.monthly * (Math.pow(1+mid, n) - 1) / Math.max(mid, 0.0001);
          if (fv < v.target) lo = mid; else hi = mid;
        }
        const monthlyRate = (lo + hi) / 2;
        const annualRate = monthlyRate * 12 * 100;
        return { result: 'Required Rate: ' + annualRate.toFixed(3) + '%', chart: Charts.bar([v.current, v.target - v.current], ['Current','Growth']), extra: 'To reach ' + money(v.target) + ' with ' + money(v.monthly) + '/mo contribution' };
      }
      // default: future value
      const r = v.rate/100/12;
      const n = v.years * 12;
      const fv = v.current * Math.pow(1+r, n) + v.monthly * (Math.pow(1+r, n) - 1) / r;
      const totalContrib = v.current + v.monthly * n;
      return { result: 'Retirement Fund: ' + money(fv), chart: Charts.gauge(fv/1000000, 2, {center:'M$'}), extra: 'Total Contributions: ' + money(totalContrib) + ' | Interest: ' + money(fv - totalContrib) };
    },
    steps: function(v) {
      const mode = v.mode || 'future';
      const r = v.rate/100/12;

      if (mode === 'monthly') {
        const n = v.years * 12;
        const fvCurrent = v.current * Math.pow(1+r, n);
        const needed = v.target - fvCurrent;
        const pmt = r > 0 ? needed * r / (Math.pow(1+r, n) - 1) : needed / n;
        return ['Solving for Monthly Contribution','Step 1: FV of current savings = $'+v.current+'×(1+r)^'+n+' = $'+fvCurrent.toFixed(2),'Step 2: Additional needed = $'+v.target+' - $'+fvCurrent.toFixed(2)+' = $'+needed.toFixed(2),'Step 3: PMT = $'+needed.toFixed(2)+' × '+r.toFixed(6)+' / ((1+r)^'+n+' - 1)','Step 4: PMT = $'+pmt.toFixed(2)+'/month'];
      }
      if (mode === 'time') {
        const factor = (v.target + v.monthly/r) / (v.current + v.monthly/r);
        const n = factor > 0 ? Math.log(factor) / Math.log(1+r) : Infinity;
        return ['Solving for Years Needed','Formula: n = log((T + P/r) / (A + P/r)) / log(1+r)','Step 1: Monthly rate = '+(r*100).toFixed(4)+'%','Step 2: n = log(('+v.target+' + '+v.monthly+'/'+r.toFixed(6)+') / ('+v.current+' + '+v.monthly+'/'+r.toFixed(6)+')) / log('+(1+r).toFixed(6)+')','Step 3: n = '+n.toFixed(0)+' months = '+(n/12).toFixed(2)+' years'];
      }
      if (mode === 'rate') {
        return ['Solving for Required Rate (binary search)','Formula: Find r where FV(current,r,n) + FVcontrib(monthly,r,n) = Target','Step 1: Binary search for monthly rate...','Step 2: Multiply by 12 to get annual rate'];
      }
      const n = v.years * 12;
      const fv = v.current * Math.pow(1+r, n) + v.monthly * (Math.pow(1+r, n) - 1) / r;
      return ['Solving for Final Amount','Step 1: Monthly rate = '+(r*100).toFixed(4)+'%','Step 2: FV of current savings = $'+v.current+'×(1+r)^'+n+' = $'+(v.current*Math.pow(1+r,n)).toFixed(2),'Step 3: FV of contributions = $'+v.monthly+'×[((1+r)^'+n+'-1)/r] = $'+(v.monthly*(Math.pow(1+r,n)-1)/r).toFixed(2),'Step 4: Total = $'+fv.toFixed(2)];
    } },
  { id: 'investment', name: 'Investment Calculator', desc: 'Investment calculator — solve for future value, initial investment, rate, or time', kw: 'roi calculator with annual returns, investment return calculator with inflation',
    inputs: [
      {id:'mode',label:'Solve For',type:'select',opts:[{v:'future',l:'Future Value'},{v:'initial',l:'Initial Investment'},{v:'rate',l:'Required Rate'},{v:'time',l:'Time Needed'}],def:'future'},
      {id:'initial',label:'Initial Investment',type:'number',def:10000},
      {id:'rate',label:'Annual Return (%)',type:'number',def:8},
      {id:'years',label:'Time Period (years)',type:'number',def:10},
      {id:'target',label:'Target Amount (for solve modes)',type:'number',def:20000},
      {id:'freq',label:'Compounding Frequency',type:'select',opts:COMPOUND_FREQ_OPTS,def:'1'}
    ],
    calc: function(v) {
      const mode = v.mode || 'future';
      const money = (x) => '$' + Number(x).toLocaleString(undefined,{maximumFractionDigits:2});

      if (mode === 'initial') {
        const P = compPrincipal(v.target, v.rate, v.years, v.freq);
        return { result: 'Initial Investment: ' + money(P), chart: Charts.bar([P, v.target - P], ['Initial','Growth']), extra: 'To reach ' + money(v.target) + ' in ' + v.years + ' years at ' + v.rate + '%' };
      }
      if (mode === 'rate') {
        const rt = compRate(v.initial, v.target, v.years, v.freq);
        return { result: 'Required Rate: ' + rt.toFixed(3) + '% per year', chart: Charts.bar([v.initial, v.target - v.initial], ['Initial','Growth']), extra: 'To grow ' + money(v.initial) + ' into ' + money(v.target) + ' in ' + v.years + ' years' };
      }
      if (mode === 'time') {
        const t = compTime(v.initial, v.target, v.rate, v.freq);
        return { result: 'Time Needed: ' + t.toFixed(2) + ' years', chart: Charts.bar([v.initial, v.target - v.initial], ['Initial','Growth']), extra: 'For ' + money(v.initial) + ' to reach ' + money(v.target) + ' at ' + v.rate + '%' };
      }
      // default: future value
      const fv = compFutureValue(v.initial, v.rate, v.years, v.freq);
      const profit = fv - v.initial;
      return { result: 'Future Value: ' + money(fv), chart: Charts.line([v.initial, fv*0.5, fv], ['Start','Mid','End']), extra: 'Profit: ' + money(profit) };
    },
    steps: function(v) {
      const mode = v.mode || 'future';
      if (mode === 'initial') {
        const P = compPrincipal(v.target, v.rate, v.years, v.freq);
        return ['Solving for Initial Investment','Formula: P = FV / (1 + r/n)^(n·t)','Result: P = $'+P.toFixed(2)];
      }
      if (mode === 'rate') {
        const rt = compRate(v.initial, v.target, v.years, v.freq);
        return ['Solving for Required Rate','Formula: r = n·((FV/P)^(1/(n·t)) − 1)','Result: r = '+rt.toFixed(3)+'% per year'];
      }
      if (mode === 'time') {
        const t = compTime(v.initial, v.target, v.rate, v.freq);
        return ['Solving for Time Needed','Formula: t = ln(FV/P) / (n·ln(1 + r/n))','Result: t = '+t.toFixed(2)+' years'];
      }
      const fv = compFutureValue(v.initial, v.rate, v.years, v.freq);
      return ['Solving for Future Value','Formula: FV = P(1+r/n)^(n·t)','Step 1: FV = $'+v.initial+'×(1+'+(v.rate/100)+'/'+v.freq+')^('+v.freq+'·'+v.years+')','Step 2: FV = $'+fv.toFixed(2),'Step 3: Profit = $'+(fv-v.initial).toFixed(2)];
    } },
  { id: 'savings-goal', name: 'Savings Goal Calculator', desc: 'Savings goal — solve for monthly contribution, target, time, or required rate', kw: 'solve for time',
    inputs: [
      {id:'mode',label:'Solve For',type:'select',opts:[{v:'payment',l:'Monthly Contribution'},{v:'goal',l:'Savings Goal'},{v:'time',l:'Time Needed'},{v:'rate',l:'Required Rate'}],def:'payment'},
      {id:'goal',label:'Savings Goal',type:'number',def:50000},
      {id:'years',label:'Time (years)',type:'number',def:5},
      {id:'rate',label:'Annual Return (%)',type:'number',def:4},
      {id:'monthly',label:'Monthly Contribution (for solve modes)',type:'number',def:750},
      {id:'freq',label:'Compounding Frequency',type:'select',opts:COMPOUND_FREQ_OPTS,def:'12'}
    ],
    calc: function(v) {
      const mode = v.mode || 'payment';
      const freq = parseFloat(v.freq) || 12;
      const money = (x) => '$' + Number(x).toLocaleString(undefined,{maximumFractionDigits:2});

      if (mode === 'goal') {
        // Solve for target goal given monthly contribution
        const r = v.rate/100/freq;
        const n = v.years * freq;
        const totalContrib = v.monthly * n;
        const fv = r > 0 ? v.monthly * (Math.pow(1+r, n) - 1) / r : totalContrib;
        const interest = fv - totalContrib;
        return { result: 'Savings Goal: ' + money(fv), chart: Charts.bar([totalContrib, interest], ['Contributed','Interest']), extra: 'Contributing ' + money(v.monthly) + '/month for ' + v.years + ' years at ' + v.rate + '%' };
      }
      if (mode === 'time') {
        // Solve for time needed given goal and monthly contribution
        const r = v.rate/100/freq;
        let n;
        if (r > 0) {
          // fv = PMT * ((1+r)^n - 1) / r, solve for n
          // (1+r)^n = fv * r / PMT + 1
          const factor = v.goal * r / v.monthly + 1;
          n = factor > 1 ? Math.log(factor) / Math.log(1+r) : Infinity;
        } else {
          n = v.goal / v.monthly;
        }
        const years = n / freq;
        const totalContrib = v.monthly * n;
        return { result: 'Time Needed: ' + years.toFixed(2) + ' years', chart: Charts.bar([totalContrib, v.goal - totalContrib], ['Contributed','Interest']), extra: Math.ceil(n) + ' contributions of ' + money(v.monthly) };
      }
      if (mode === 'rate') {
        // Solve for required rate given goal, monthly, and time (binary search)
        const n = v.years * freq;
        // Binary search for rate
        let lo = 0, hi = 1; // search 0%..100% per period
        for (let i = 0; i < 200; i++) {
          const mid = (lo + hi) / 2;
          const fv = v.monthly * (Math.pow(1+mid, n) - 1) / mid;
          if (fv < v.goal) lo = mid; else hi = mid;
        }
        const periodRate = (lo + hi) / 2;
        const annualRate = periodRate * freq * 100;
        return { result: 'Required Rate: ' + annualRate.toFixed(3) + '% per year', chart: Charts.bar([v.monthly * n, v.goal - v.monthly * n], ['Contributed','Interest']), extra: 'To reach ' + money(v.goal) + ' with ' + money(v.monthly) + '/month for ' + v.years + ' years' };
      }
      // default: solve for monthly contribution
      const r = v.rate/100/freq;
      const n = v.years * freq;
      const pmt = r > 0 ? v.goal * r / (Math.pow(1+r, n) - 1) : v.goal / n;
      const totalContrib = pmt * n;
      return { result: 'Monthly Saving: ' + money(pmt), chart: Charts.bar([totalContrib, v.goal - totalContrib], ['Contributed','Interest']), extra: 'Total Saved: ' + money(v.goal) + ' | Total Contributed: ' + money(totalContrib) };
    },
    steps: function(v) {
      const mode = v.mode || 'payment';
      const freq = parseFloat(v.freq) || 12;
      const r = v.rate/100/freq;
      const n = v.years * freq;

      if (mode === 'goal') {
        const fv = r > 0 ? v.monthly * (Math.pow(1+r, n) - 1) / r : v.monthly * n;
        return ['Solving for Savings Goal','Formula: FV = PMT × ((1+r)^n − 1) / r','Step 1: Rate per period = '+v.rate+'%/'+freq+' = '+(r*100).toFixed(4)+'%','Step 2: Periods = '+v.years+'×'+freq+' = '+n,'Step 3: FV = $'+v.monthly+' × ((1+'+r.toFixed(6)+')^'+n+' − 1) / '+r.toFixed(6),'Step 4: FV = $'+fv.toFixed(2)];
      }
      if (mode === 'time') {
        const factor = r > 0 ? v.goal * r / v.monthly + 1 : v.goal / v.monthly;
        const nSolved = r > 0 ? Math.log(factor) / Math.log(1+r) : v.goal / v.monthly;
        return ['Solving for Time Needed','Formula: n = ln((FV×r/PMT) + 1) / ln(1+r)','Step 1: Rate per period = '+(r*100).toFixed(4)+'%','Step 2: n = ln(('+v.goal+'×'+r.toFixed(6)+'/'+v.monthly+') + 1) / ln('+(1+r).toFixed(6)+')','Step 3: n = '+nSolved.toFixed(2)+' periods = '+(nSolved/freq).toFixed(2)+' years'];
      }
      if (mode === 'rate') {
        const nVal = v.years * freq;
        return ['Solving for Required Rate (binary search)','Formula: Find r where PMT × ((1+r)^n − 1) / r = Goal','Step 1: Periods = '+v.years+'×'+freq+' = '+nVal,'Step 2: Binary search for r...','Step 3: Result shows required annual rate'];
      }
      const pmt = r > 0 ? v.goal * r / (Math.pow(1+r, n) - 1) : v.goal / n;
      return ['Solving for Monthly Contribution','Formula: PMT = Goal × r / ((1+r)^n − 1)','Step 1: Rate per period = '+v.rate+'%/'+freq+' = '+(r*100).toFixed(4)+'%','Step 2: Periods = '+v.years+'×'+freq+' = '+n,'Step 3: PMT = $'+v.goal+' × '+r.toFixed(6)+' / '+((Math.pow(1+r,n)-1).toFixed(6)),'Step 4: PMT = $'+pmt.toFixed(2)+'/month'];
    } },
  { id: 'tax', name: 'Income Tax Calculator', desc: 'Calculate income tax with deductions', kw: 'salary income tax calculator pakistan fbr, take home pay calculator with tax deduction, pakistan income tax salary calculator',
    inputs: [{id:'income',label:'Annual Income',type:'number',def:75000},{id:'rate',label:'Tax Rate (%)',type:'number',def:22},{id:'deductions',label:'Deductions',type:'number',def:12500}],
    calc: function(v) { const a = AdvancedCalc.taxSteps(v.income, v.rate, v.deductions); return { result: 'Tax Owed: $' + a.tax.toFixed(2), chart: Charts.bar([a.taxableIncome, a.tax, a.netIncome], ['Taxable','Tax','Net']), extra: 'Net Income: $' + a.netIncome.toFixed(2) }; },
    steps: function(v) { const taxable=Math.max(0,v.income-v.deductions); const tax=taxable*v.rate/100; return ['Step 1: Taxable income = $'+v.income+' - $'+v.deductions+' = $'+taxable,'Step 2: Tax = $'+taxable+' × '+v.rate+'% = $'+tax.toFixed(2),'Step 3: Net income = $'+v.income+' - $'+tax.toFixed(2)+' = $'+(v.income-tax).toFixed(2)]; } },
  { id: 'sales-tax', name: 'Sales Tax Calculator', desc: 'Calculate sales tax on purchases', kw: 'tax on purchase',
    inputs: [{id:'amount',label:'Purchase Amount',type:'number',def:100},{id:'rate',label:'Tax Rate (%)',type:'number',def:8.25}],
    calc: function(v) { const tax = v.amount * v.rate / 100; return { result: 'Tax: $' + tax.toFixed(2), chart: Charts.donut([v.amount, tax], ['Price','Tax']), extra: 'Total: $' + (v.amount + tax).toFixed(2) }; },
    steps: function(v) { const tax=v.amount*v.rate/100; return ['Step 1: Tax = $'+v.amount+' × '+v.rate+'% = $'+tax.toFixed(2),'Step 2: Total = $'+v.amount+' + $'+tax.toFixed(2)+' = $'+(v.amount+tax).toFixed(2)]; } },
  { id: 'npv', name: 'NPV Calculator', desc: 'Net present value of cash flows', kw: 'net present value',
    inputs: [{id:'rate',label:'Discount Rate (%)',type:'number',def:10},{id:'flows',label:'Cash Flows (comma separated)',type:'text',def:'-10000,3000,3000,3000,3000'}],
    calc: function(v) { const flows = v.flows.split(',').map(Number); const r = v.rate/100; const npv = flows.reduce((s,f,t) => s + f/Math.pow(1+r,t), 0); return { result: 'NPV: $' + npv.toFixed(2), chart: Charts.bar(flows, flows.map((_,i)=>'Y'+i)), extra: npv > 0 ? 'Good investment' : 'Poor investment' }; },
    steps: function(v) { const flows=v.flows.split(',').map(Number); const r=v.rate/100; return ['Formula: NPV = Σ CFt / (1+r)^t','Step 1: Discount rate r = '+v.rate+'% = '+r,'Step 2: Discount each cash flow:','...CF0 = '+flows[0]+' / (1.1)^0 = '+flows[0],'...CF1 = '+flows[1]+' / (1.1)^1 = '+(flows[1]/1.1).toFixed(2),'Step 3: Sum all discounted flows = $'+flows.reduce((s,f,t)=>s+f/Math.pow(1+r,t),0).toFixed(2)]; } },
  { id: 'irr', name: 'IRR Calculator', desc: 'Internal rate of return', kw: 'internal rate of return',
    inputs: [{id:'flows',label:'Cash Flows (comma separated)',type:'text',def:'-10000,3000,3500,4000,3500'}],
    calc: function(v) { const flows = v.flows.split(',').map(Number); const r = AdvancedCalc.irr(flows); return { result: 'IRR: ' + (r*100).toFixed(2) + '%', chart: Charts.bar(flows, flows.map((_,i)=>'Y'+i)), extra: 'Annualized return rate' }; },
    steps: function(v) { const flows=v.flows.split(',').map(Number); const r=AdvancedCalc.irr(flows); return ['Formula: IRR is the rate where NPV = 0','Step 1: Find r such that Σ CFt/(1+r)^t = 0','Step 2: Using Newton-Raphson method...','Step 3: IRR = '+(r*100).toFixed(2)+'%']; } },
  { id: 'roi', name: 'ROI Calculator', desc: 'Return on investment', kw: 'return on investment',
    inputs: [{id:'cost',label:'Investment Cost',type:'number',def:10000},{id:'gain',label:'Current Value',type:'number',def:15000}],
    calc: function(v) { const roi = (v.gain - v.cost) / v.cost * 100; return { result: 'ROI: ' + roi.toFixed(2) + '%', chart: Charts.gauge(roi, 100), extra: 'Profit: $' + (v.gain - v.cost).toFixed(2) }; },
    steps: function(v) { const roi=(v.gain-v.cost)/v.cost*100; return ['Formula: ROI = (Gain - Cost) / Cost × 100','Step 1: Profit = $'+v.gain+' - $'+v.cost+' = $'+(v.gain-v.cost),'Step 2: ROI = $'+(v.gain-v.cost)+' / $'+v.cost+' × 100','Step 3: ROI = '+roi.toFixed(2)+'%']; } },
  { id: 'tip', name: 'Tip Calculator', desc: 'Calculate tip and split bill', kw: 'free tip calculator',
    inputs: [{id:'bill',label:'Bill Amount',type:'number',def:50,slider:{min:1,max:500,step:1}},{id:'tipPct',label:'Tip (%)',type:'number',def:15,slider:{min:0,max:50,step:0.5}},{id:'people',label:'Number of People',type:'number',def:2,slider:{min:1,max:20,step:1}}],
    calc: function(v) { const a = AdvancedCalc.tipSteps(v.bill, v.tipPct, v.people); return { result: 'Tip: $' + a.tip.toFixed(2), chart: Charts.donut([v.bill, a.tip], ['Bill','Tip']), extra: 'Per Person: $' + a.perPerson.toFixed(2) }; },
    steps: function(v) { const tip=v.bill*v.tipPct/100; const total=v.bill+tip; const pp=total/v.people; return ['Step 1: Tip = $'+v.bill+' × '+v.tipPct+'% = $'+tip.toFixed(2),'Step 2: Total = $'+v.bill+' + $'+tip.toFixed(2)+' = $'+total.toFixed(2),'Step 3: Per person = $'+total.toFixed(2)+' / '+v.people+' = $'+pp.toFixed(2)]; },
    // Reverse calc (target = tip amount): tip = bill × pct/100 → bill = tip×100/pct, pct = tip×100/bill
    reverse: { solveFor: { bill: 1, tipPct: 1 }, variables: {
      bill: { analytical: function(o, target) { return target * 100 / o.tipPct; }, domain: [0, 1e7] },
      tipPct: { analytical: function(o, target) { return target * 100 / o.bill; }, domain: [0, 100] }
    } } },
  { id: 'salary', name: 'Salary Calculator', desc: 'Calculate annual salary breakdown', kw: 'take home pay calculator with deductions, net salary calculator pakistan monthly, hourly to salary',
    inputs: [{id:'hourly',label:'Hourly Rate',type:'number',def:25},{id:'hours',label:'Hours/Week',type:'number',def:40},{id:'weeks',label:'Weeks/Year',type:'number',def:52}],
    calc: function(v) { const annual = v.hourly * v.hours * v.weeks; const monthly = annual / 12; return { result: 'Annual: $' + annual.toFixed(2), chart: Charts.bar([monthly, annual/4, annual/26, annual/52], ['Monthly','Quarterly','Biweekly','Weekly']), extra: 'Monthly: $' + monthly.toFixed(2) }; },
    steps: function(v) { const annual=v.hourly*v.hours*v.weeks; return ['Step 1: Annual = $'+v.hourly+'/hr × '+v.hours+'hrs × '+v.weeks+'weeks','Step 2: Annual = $'+annual.toFixed(2),'Step 3: Monthly = $'+(annual/12).toFixed(2),'Step 4: Weekly = $'+(annual/v.weeks).toFixed(2)]; } },
  { id: 'annuity', name: 'Annuity Calculator', desc: 'Calculate annuity payments', kw: 'future value annuity',
    inputs: [{id:'pv',label:'Present Value',type:'number',def:100000},{id:'rate',label:'Rate (%)',type:'number',def:5},{id:'years',label:'Years',type:'number',def:20}],
    reverse: { solveFor: { pv: 1, rate: 1, years: 1 }, variables: {
      pv: { analytical: function(o, target) { const r = o.rate/100/12; const n = o.years*12; return r > 0 ? target * (1 - Math.pow(1+r, -n)) / r : target * n; }, domain: [0, 1e9] },
      rate: { fn: function(x, o) { const r = x/100/12; const n = o.years*12; return r > 0 ? o.pv * r / (1 - Math.pow(1+r, -n)) : o.pv / n; }, domain: [0, 100] },
      years: { fn: function(x, o) { const r = o.rate/100/12; const n = x*12; return r > 0 ? o.pv * r / (1 - Math.pow(1+r, -n)) : o.pv / n; }, domain: [0.1, 100] }
    } },
    calc: function(v) { const r = v.rate/100/12; const pmt = r > 0 ? v.pv * r / (1 - Math.pow(1+r, -v.years*12)) : v.pv / (v.years*12); return { result: 'Monthly Payment: $' + pmt.toFixed(2), chart: Charts.line([v.pv, v.pv*0.5, 0], ['Start','Mid','End']), extra: 'Total: $' + (pmt * v.years * 12).toFixed(2) }; },
    steps: function(v) { const r=v.rate/100/12; const pmt=r>0?v.pv*r/(1-Math.pow(1+r,-v.years*12)):v.pv/(v.years*12); return ['Formula: PMT = PV × r / (1 - (1+r)^-n)','Step 1: Monthly rate = '+(r*100).toFixed(4)+'%','Step 2: PMT = $'+v.pv+'×'+r.toFixed(6)+' / (1-(1+r)^-'+(v.years*12)+')','Step 3: PMT = $'+pmt.toFixed(2)+'/month']; } },
  { id: 'inflation', name: 'Inflation Calculator', desc: 'Calculate inflation impact on purchasing power', kw: 'free inflation calculator',
    inputs: [{id:'amount',label:'Amount',type:'number',def:1000},{id:'rate',label:'Inflation Rate (%)',type:'number',def:3},{id:'years',label:'Years',type:'number',def:10}],
    reverse: { solveFor: { amount: 1, rate: 1, years: 1 }, variables: {
      amount: { analytical: function(o, target) { return target / Math.pow(1 + o.rate/100, o.years); }, domain: [0, 1e12] },
      rate: { analytical: function(o, target) { return (Math.pow(target / o.amount, 1 / Math.max(o.years, 1e-9)) - 1) * 100; }, domain: [0, 1000] },
      years: { analytical: function(o, target) { return Math.log(target / o.amount) / Math.log(1 + o.rate/100); }, domain: [0, 1000] }
    } },
    calc: function(v) { const fv = v.amount * Math.pow(1 + v.rate/100, v.years); const real = v.amount / Math.pow(1 + v.rate/100, v.years); return { result: 'Future Value: $' + fv.toFixed(2), chart: Charts.line([v.amount, fv*0.5, fv], ['Now','Mid','Future']), extra: 'Real Value: $' + real.toFixed(2) }; },
    steps: function(v) { const fv=v.amount*Math.pow(1+v.rate/100,v.years); return ['Step 1: Future value = $'+v.amount+'×(1+'+(v.rate/100)+')^'+v.years,'Step 2: FV = $'+fv.toFixed(2),'Step 3: Real purchasing power = $'+(v.amount/Math.pow(1+v.rate/100,v.years)).toFixed(2)]; } },
  { id: 'bonds', name: 'Bond Calculator', desc: 'Calculate bond yield to maturity', kw: 'bonds yield to maturity calculator, bond price calculator with coupon rate',
    inputs: [{id:'face',label:'Face Value',type:'number',def:1000},{id:'coupon',label:'Coupon Rate (%)',type:'number',def:5},{id:'price',label:'Current Price',type:'number',def:950},{id:'years',label:'Years to Maturity',type:'number',def:10}],
    calc: function(v) { const c = v.face * v.coupon/100; const ytm = (c + (v.face - v.price) / v.years) / ((v.face + v.price) / 2) * 100; return { result: 'YTM: ' + ytm.toFixed(2) + '%', chart: Charts.bar([v.price, v.face], ['Price','Face']), extra: 'Annual Coupon: $' + c.toFixed(2) }; },
    steps: function(v) { const c=v.face*v.coupon/100; const ytm=(c+(v.face-v.price)/v.years)/((v.face+v.price)/2)*100; return ['Step 1: Annual coupon = $'+v.face+'×'+v.coupon+'% = $'+c.toFixed(2),'Step 2: Annual gain = ($'+v.face+' - $'+v.price+')/'+v.years+' = $'+((v.face-v.price)/v.years).toFixed(2),'Step 3: YTM = ($'+c.toFixed(2)+' + $'+((v.face-v.price)/v.years).toFixed(2)+') / (($'+v.face+'+$'+v.price+')/2)','Step 4: YTM = '+ytm.toFixed(2)+'%']; } },
  { id: 'debt-ratio', name: 'Debt-to-Income Ratio', desc: 'Calculate DTI ratio', kw: 'debt to income',
    inputs: [{id:'income',label:'Monthly Income',type:'number',def:5000},{id:'debts',label:'Monthly Debts',type:'number',def:1500}],
    calc: function(v) { const dti = v.debts / v.income * 100; return { result: 'DTI: ' + dti.toFixed(1) + '%', chart: Charts.gauge(dti, 100), extra: dti < 36 ? 'Healthy' : 'High risk' }; },
    steps: function(v) { const dti=v.debts/v.income*100; return ['Formula: DTI = (Monthly Debts / Monthly Income) × 100','Step 1: DTI = ($'+v.debts+' / $'+v.income+') × 100','Step 2: DTI = '+dti.toFixed(1)+'%',dti<36?'Step 3: Healthy (below 36%)':'Step 3: High risk (above 36%)']; } },
  { id: 'net-worth-calculator', name: 'Net Worth Calculator', desc: 'Calculate your net worth', kw: 'net worth calculator',
    inputs: [{id:'assets',label:'Total Assets',type:'number',def:250000},{id:'liabilities',label:'Total Liabilities',type:'number',def:100000}],
    calc: function(v) { const nw = v.assets - v.liabilities; return { result: 'Net Worth: $' + nw.toFixed(2), chart: Charts.donut([v.assets, v.liabilities], ['Assets','Liabilities']), extra: nw > 0 ? 'Positive net worth' : 'Negative net worth' }; },
    steps: function(v) { const nw=v.assets-v.liabilities; return ['Formula: Net Worth = Assets - Liabilities','Step 1: Net Worth = $'+v.assets+' - $'+v.liabilities,'Step 2: Net Worth = $'+nw.toFixed(2)]; } },
  { id: 'rent-vs-buy', name: 'Rent vs Buy Calculator', desc: 'Should you rent or buy a home?', kw: 'rent vs buy',
    inputs: [{id:'rent',label:'Monthly Rent',type:'number',def:1500},{id:'price',label:'Home Price',type:'number',def:300000},{id:'rate',label:'Mortgage Rate (%)',type:'number',def:6.5},{id:'years',label:'Years',type:'number',def:10}],
    calc: function(v) { const a = AdvancedCalc.generateAmortization(v.price, v.rate, 30, 0); const buyCost = a.emi * v.years * 12; const rentCost = v.rent * 12 * v.years; return { result: buyCost < rentCost ? 'Buy is better' : 'Rent is better', chart: Charts.bar([rentCost, buyCost], ['Rent','Buy']), extra: 'Buy: $' + buyCost.toFixed(0) + ' | Rent: $' + rentCost.toFixed(0) }; },
    steps: function(v) { const a=AdvancedCalc.generateAmortization(v.price,v.rate,30,0); const buyCost=a.emi*v.years*12; const rentCost=v.rent*12*v.years; return ['Step 1: Monthly mortgage = $'+a.emi.toFixed(2),'Step 2: Buy cost over '+v.years+' years = $'+buyCost.toFixed(2),'Step 3: Rent cost over '+v.years+' years = $'+rentCost.toFixed(2),buyCost<rentCost?'Step 4: Buying saves $'+(rentCost-buyCost).toFixed(2):'Step 4: Renting saves $'+(buyCost-rentCost).toFixed(2)]; } },
  { id: 'refinance', name: 'Refinance Calculator', desc: 'Should you refinance your mortgage?', kw: 'free refinance calculator',
    inputs: [{id:'balance',label:'Current Balance',type:'number',def:200000},{id:'oldRate',label:'Current Rate (%)',type:'number',def:6.5},{id:'newRate',label:'New Rate (%)',type:'number',def:5.5},{id:'years',label:'Remaining Years',type:'number',def:25}],
    calc: function(v) { const oldEmi = AdvancedCalc.generateAmortization(v.balance, v.oldRate, v.years, 0).emi; const newEmi = AdvancedCalc.generateAmortization(v.balance, v.newRate, v.years, 0).emi; const savings = (oldEmi - newEmi) * v.years * 12; return { result: 'Monthly Savings: $' + (oldEmi - newEmi).toFixed(2), chart: Charts.bar([oldEmi, newEmi], ['Old','New']), extra: 'Total Savings: $' + savings.toFixed(2) }; },
    steps: function(v) { const old=AdvancedCalc.generateAmortization(v.balance,v.oldRate,v.years,0).emi; const nw=AdvancedCalc.generateAmortization(v.balance,v.newRate,v.years,0).emi; return ['Step 1: Old monthly = $'+old.toFixed(2),'Step 2: New monthly = $'+nw.toFixed(2),'Step 3: Monthly savings = $'+(old-nw).toFixed(2),'Step 4: Total savings = $'+((old-nw)*v.years*12).toFixed(2)]; } },
  { id: 'home-afford', name: 'Home Affordability Calculator', desc: 'How much home can you afford?', kw: 'how much house can i afford calculator, home affordability calculator with down payment, how much house',
    inputs: [{id:'income',label:'Annual Income',type:'number',def:80000},{id:'down',label:'Down Payment',type:'number',def:20000},{id:'rate',label:'Rate (%)',type:'number',def:6.5},{id:'years',label:'Term (years)',type:'number',def:30}],
    calc: function(v) { const monthlyIncome = v.income / 12; const maxPayment = monthlyIncome * 0.28; const r = v.rate/100/12; const n = v.years*12; const maxLoan = r > 0 ? maxPayment * (Math.pow(1+r,n) - 1) / (r * Math.pow(1+r,n)) : maxPayment * n; const maxPrice = maxLoan + v.down; return { result: 'Max Home Price: $' + maxPrice.toFixed(2), chart: Charts.gauge(maxPrice/1000000, 1, {center:'M$'}), extra: 'Max Loan: $' + maxLoan.toFixed(2) }; },
    steps: function(v) { const mi=v.income/12; const mp=mi*0.28; const r=v.rate/100/12; const n=v.years*12; const ml=r>0?mp*(Math.pow(1+r,n)-1)/(r*Math.pow(1+r,n)):mp*n; return ['Step 1: Max monthly payment = 28% of $'+mi.toFixed(2)+' = $'+mp.toFixed(2),'Step 2: Max loan = $'+ml.toFixed(2),'Step 3: Max home price = $'+ml.toFixed(2)+' + $'+v.down+' = $'+(ml+v.down).toFixed(2)]; } },
  { id: 'currency-converter', name: 'Currency Converter', desc: 'Convert between 150+ currencies with live rates', kw: 'currency exchange rate converter calculator, usd to pkr live exchange rate converter, pkr to usd converter today',
    inputs: [{id:'amount',label:'Amount',type:'number',def:100},{id:'from',label:'From',type:'select',opts:[]},{id:'to',label:'To',type:'select',opts:[]}],
    calc: null, async: true },
  { id: 'loan-qualify', name: 'Loan Qualification', desc: 'Check loan eligibility', kw: 'loan qualification calculator',
    inputs: [{id:'income',label:'Monthly Income',type:'number',def:5000},{id:'debts',label:'Monthly Debts',type:'number',def:500},{id:'rate',label:'Rate (%)',type:'number',def:6.5},{id:'years',label:'Term (years)',type:'number',def:30}],
    calc: function(v) { const maxDti = 0.43; const available = v.income * maxDti - v.debts; const r = v.rate/100/12; const n = v.years*12; const loan = r > 0 ? available * (Math.pow(1+r,n)-1) / (r * Math.pow(1+r,n)) : available * n; return { result: 'Max Loan: $' + loan.toFixed(2), chart: Charts.gauge(loan/500000, 1), extra: 'Max Payment: $' + available.toFixed(2) }; },
    steps: function(v) { const avail=v.income*0.43-v.debts; const r=v.rate/100/12; const n=v.years*12; const loan=r>0?avail*(Math.pow(1+r,n)-1)/(r*Math.pow(1+r,n)):avail*n; return ['Step 1: Max DTI = 43%','Step 2: Available = 43%×$'+v.income+' - $'+v.debts+' = $'+avail.toFixed(2),'Step 3: Max loan = $'+loan.toFixed(2)]; } },
  { id: 'paycheck', name: 'Paycheck Calculator', desc: 'Calculate take-home pay', kw: 'take home pay',
    inputs: [{id:'gross',label:'Gross Annual',type:'number',def:60000},{id:'tax',label:'Tax Rate (%)',type:'number',def:22},{id:'benefits',label:'Benefits/Deductions',type:'number',def:3000}],
    calc: function(v) { const net = v.gross * (1 - v.tax/100) - v.benefits; return { result: 'Annual Net: $' + net.toFixed(2), chart: Charts.donut([v.gross * v.tax/100, v.benefits, net], ['Tax','Benefits','Net']), extra: 'Monthly: $' + (net/12).toFixed(2) }; },
    steps: function(v) { const tax=v.gross*v.tax/100; const net=v.gross-tax-v.benefits; return ['Step 1: Tax = '+v.tax+'% × $'+v.gross+' = $'+tax.toFixed(2),'Step 2: Net = $'+v.gross+' - $'+tax.toFixed(2)+' - $'+v.benefits+' = $'+net.toFixed(2),'Step 3: Monthly = $'+(net/12).toFixed(2)]; } },
  { id: 'break-even', name: 'Break-Even Calculator', desc: 'Calculate break-even point', kw: 'break even analysis calculator units',
    inputs: [{id:'fixed',label:'Fixed Costs',type:'number',def:10000},{id:'price',label:'Price per Unit',type:'number',def:50},{id:'variable',label:'Variable Cost/Unit',type:'number',def:20}],
    calc: function(v) { const units = v.fixed / (v.price - v.variable); const revenue = units * v.price; return { result: 'Break-Even: ' + units.toFixed(0) + ' units', chart: Charts.bar([v.fixed, v.variable * units, v.price * units], ['Fixed','Variable','Revenue']), extra: 'Revenue: $' + revenue.toFixed(2) }; },
    steps: function(v) { const units=v.fixed/(v.price-v.variable); return ['Formula: Break-Even = Fixed Costs / (Price - Variable Cost)','Step 1: Contribution margin = $'+v.price+' - $'+v.variable+' = $'+(v.price-v.variable),'Step 2: Break-even = $'+v.fixed+' / $'+(v.price-v.variable)+' = '+units.toFixed(0)+' units']; } },
  { id: 'cash-flow', name: 'Cash Flow Calculator', desc: 'Project cash flow over time', kw: 'cash flow projection',
    inputs: [{id:'income',label:'Monthly Income',type:'number',def:10000},{id:'expenses',label:'Monthly Expenses',type:'number',def:7000},{id:'months',label:'Months',type:'number',def:12}],
    calc: function(v) { const monthly = v.income - v.expenses; const total = monthly * v.months; return { result: 'Monthly Cash Flow: $' + monthly.toFixed(2), chart: Charts.line([0, total/2, total], ['Start','Mid','End']), extra: 'Total: $' + total.toFixed(2) }; },
    steps: function(v) { const m=v.income-v.expenses; return ['Step 1: Monthly cash flow = $'+v.income+' - $'+v.expenses+' = $'+m.toFixed(2),'Step 2: Total over '+v.months+' months = $'+(m*v.months).toFixed(2)]; } },
  { id: 'markup', name: 'Markup Calculator', desc: 'Calculate price markup', kw: 'free markup calculator',
    inputs: [{id:'cost',label:'Cost',type:'number',def:20},{id:'markup',label:'Markup (%)',type:'number',def:50}],
    calc: function(v) { const price = v.cost * (1 + v.markup/100); const profit = price - v.cost; return { result: 'Selling Price: $' + price.toFixed(2), chart: Charts.donut([v.cost, profit], ['Cost','Profit']), extra: 'Profit: $' + profit.toFixed(2) }; },
    steps: function(v) { const price=v.cost*(1+v.markup/100); return ['Step 1: Markup amount = $'+v.cost+' × '+v.markup+'% = $'+(v.cost*v.markup/100).toFixed(2),'Step 2: Selling price = $'+v.cost+' + $'+(v.cost*v.markup/100).toFixed(2)+' = $'+price.toFixed(2)]; },
    // Reverse calc (target = selling price): price = cost×(1+markup/100) → cost, markup
    reverse: { solveFor: { cost: 1, markup: 1 }, variables: {
      cost: { analytical: function(o, target) { return target / (1 + o.markup / 100); }, domain: [0, 1e9] },
      markup: { analytical: function(o, target) { return (target / o.cost - 1) * 100; }, domain: [0, 10000] }
    } } },
  { id: 'discount', name: 'Discount Calculator', desc: 'Calculate sale price after discount', kw: 'free discount calculator',
    inputs: [{id:'price',label:'Original Price',type:'number',def:100},{id:'discount',label:'Discount (%)',type:'number',def:20}],
    calc: function(v) { const save = v.price * v.discount / 100; const final = v.price - save; return { result: 'Final Price: $' + final.toFixed(2), chart: Charts.donut([final, save], ['Price','Discount']), extra: 'You Save: $' + save.toFixed(2) }; },
    // Reverse calc (target = final price): final = price×(1−discount/100) → price, discount
    reverse: { solveFor: { price: 1, discount: 1 }, variables: {
      price: { analytical: function(o, target) { return target / (1 - o.discount / 100); }, domain: [0, 1e9] },
      discount: { analytical: function(o, target) { return (1 - target / o.price) * 100; }, domain: [0, 100] }
    } },
    steps: function(v) { const save=v.price*v.discount/100; return ['Step 1: Discount = $'+v.price+' × '+v.discount+'% = $'+save.toFixed(2),'Step 2: Final price = $'+v.price+' - $'+save.toFixed(2)+' = $'+(v.price-save).toFixed(2)]; } },
  { id: 'present-value', name: 'Present Value Calculator', desc: 'Present value — solve for present value, future value, discount rate, or time', kw: 'time value of money',
    inputs: [
      {id:'mode',label:'Solve For',type:'select',opts:[{v:'present',l:'Present Value'},{v:'future',l:'Future Value'},{v:'rate',l:'Discount Rate'},{v:'time',l:'Time Needed'}],def:'present'},
      {id:'fv',label:'Future Value',type:'number',def:10000},
      {id:'rate',label:'Discount Rate (%)',type:'number',def:5},
      {id:'years',label:'Years',type:'number',def:10},
      {id:'pv',label:'Present Value (for solve modes)',type:'number',def:6000},
      {id:'freq',label:'Compounding Frequency',type:'select',opts:COMPOUND_FREQ_OPTS,def:'1'}
    ],
    calc: function(v) {
      const mode = v.mode || 'present';
      const money = (x) => '$' + Number(x).toLocaleString(undefined,{maximumFractionDigits:2});

      if (mode === 'future') {
        const FV = compFutureValue(v.pv, v.rate, v.years, v.freq);
        return { result: 'Future Value: ' + money(FV), chart: Charts.line([v.pv, FV*0.5, FV], ['PV','Mid','FV']), extra: 'Growth: ' + money(FV - v.pv) };
      }
      if (mode === 'rate') {
        const rt = compRate(v.pv, v.fv, v.years, v.freq);
        return { result: 'Required Rate: ' + rt.toFixed(3) + '% per year', chart: Charts.bar([v.pv, v.fv - v.pv], ['Present','Discount']), extra: 'To discount ' + money(v.fv) + ' to ' + money(v.pv) + ' in ' + v.years + ' years' };
      }
      if (mode === 'time') {
        const t = compTime(v.pv, v.fv, v.rate, v.freq);
        return { result: 'Time Needed: ' + t.toFixed(2) + ' years', chart: Charts.bar([v.pv, v.fv - v.pv], ['Present','Discount']), extra: 'For ' + money(v.fv) + ' to discount to ' + money(v.pv) + ' at ' + v.rate + '%' };
      }
      // default: present value
      const pv = compPrincipal(v.fv, v.rate, v.years, v.freq);
      return { result: 'Present Value: ' + money(pv), chart: Charts.line([pv, v.fv*0.5, v.fv], ['PV','Mid','FV']), extra: 'Discount: ' + money(v.fv - pv) };
    },
    steps: function(v) {
      const mode = v.mode || 'present';
      if (mode === 'future') {
        const FV = compFutureValue(v.pv, v.rate, v.years, v.freq);
        return ['Solving for Future Value','Formula: FV = PV × (1 + r/n)^(n·t)','Result: FV = $'+FV.toFixed(2)];
      }
      if (mode === 'rate') {
        const rt = compRate(v.pv, v.fv, v.years, v.freq);
        return ['Solving for Discount Rate','Formula: r = n·((FV/PV)^(1/(n·t)) − 1)','Result: r = '+rt.toFixed(3)+'% per year'];
      }
      if (mode === 'time') {
        const t = compTime(v.pv, v.fv, v.rate, v.freq);
        return ['Solving for Time Needed','Formula: t = ln(FV/PV) / (n·ln(1 + r/n))','Result: t = '+t.toFixed(2)+' years'];
      }
      const pv = compPrincipal(v.fv, v.rate, v.years, v.freq);
      return ['Solving for Present Value','Formula: PV = FV / (1+r/n)^(n·t)','Step 1: PV = $'+v.fv+' / (1+'+(v.rate/100)+'/'+v.freq+')^('+v.freq+'·'+v.years+')','Step 2: PV = $'+pv.toFixed(2),'Step 3: Discount = $'+(v.fv-pv).toFixed(2)];
    } },
  { id: 'future-value', name: 'Future Value Calculator', desc: 'Future value — solve for future value, present value, rate, or time', kw: 'future value calculator lump sum',
    inputs: [
      {id:'mode',label:'Solve For',type:'select',opts:[{v:'future',l:'Future Value'},{v:'present',l:'Present Value'},{v:'rate',l:'Required Rate'},{v:'time',l:'Time Needed'}],def:'future'},
      {id:'pv',label:'Present Value',type:'number',def:5000},
      {id:'rate',label:'Rate (%)',type:'number',def:7},
      {id:'years',label:'Years',type:'number',def:15},
      {id:'fv',label:'Future Value (for solve modes)',type:'number',def:15000},
      {id:'freq',label:'Compounding Frequency',type:'select',opts:COMPOUND_FREQ_OPTS,def:'1'}
    ],
    calc: function(v) {
      const mode = v.mode || 'future';
      const money = (x) => '$' + Number(x).toLocaleString(undefined,{maximumFractionDigits:2});

      if (mode === 'present') {
        const P = compPrincipal(v.fv, v.rate, v.years, v.freq);
        return { result: 'Present Value: ' + money(P), chart: Charts.line([P, v.fv*0.5, v.fv], ['Now','Mid','Future']), extra: 'To reach ' + money(v.fv) + ' in ' + v.years + ' years at ' + v.rate + '%' };
      }
      if (mode === 'rate') {
        const rt = compRate(v.pv, v.fv, v.years, v.freq);
        return { result: 'Required Rate: ' + rt.toFixed(3) + '% per year', chart: Charts.bar([v.pv, v.fv - v.pv], ['Present','Growth']), extra: 'To grow ' + money(v.pv) + ' into ' + money(v.fv) + ' in ' + v.years + ' years' };
      }
      if (mode === 'time') {
        const t = compTime(v.pv, v.fv, v.rate, v.freq);
        return { result: 'Time Needed: ' + t.toFixed(2) + ' years', chart: Charts.bar([v.pv, v.fv - v.pv], ['Present','Growth']), extra: 'For ' + money(v.pv) + ' to reach ' + money(v.fv) + ' at ' + v.rate + '%' };
      }
      // default: future value
      const fv = compFutureValue(v.pv, v.rate, v.years, v.freq);
      return { result: 'Future Value: ' + money(fv), chart: Charts.line([v.pv, fv*0.5, fv], ['Now','Mid','Future']), extra: 'Gain: ' + money(fv - v.pv) };
    },
    steps: function(v) {
      const mode = v.mode || 'future';
      if (mode === 'present') {
        const P = compPrincipal(v.fv, v.rate, v.years, v.freq);
        return ['Solving for Present Value','Formula: PV = FV / (1 + r/n)^(n·t)','Result: PV = $'+P.toFixed(2)];
      }
      if (mode === 'rate') {
        const rt = compRate(v.pv, v.fv, v.years, v.freq);
        return ['Solving for Required Rate','Formula: r = n·((FV/PV)^(1/(n·t)) − 1)','Result: r = '+rt.toFixed(3)+'% per year'];
      }
      if (mode === 'time') {
        const t = compTime(v.pv, v.fv, v.rate, v.freq);
        return ['Solving for Time Needed','Formula: t = ln(FV/PV) / (n·ln(1 + r/n))','Result: t = '+t.toFixed(2)+' years'];
      }
      const fv = compFutureValue(v.pv, v.rate, v.years, v.freq);
      return ['Solving for Future Value','Formula: FV = PV × (1+r/n)^(n·t)','Step 1: FV = $'+v.pv+' × (1+'+(v.rate/100)+'/'+v.freq+')^('+v.freq+'·'+v.years+')','Step 2: FV = $'+fv.toFixed(2),'Step 3: Gain = $'+(fv-v.pv).toFixed(2)];
    } },
  { id: 'amortization', name: 'Amortization Schedule', desc: 'Full amortization schedule with breakdown', kw: 'amortization schedule calculator',
    inputs: [{id:'amount',label:'Loan Amount',type:'number',def:200000},{id:'rate',label:'Rate (%)',type:'number',def:6.5},{id:'years',label:'Years',type:'number',def:30}],
    calc: function(v) { const a = AdvancedCalc.generateAmortization(v.amount, v.rate, v.years, 0); const firstYear = a.schedule.slice(0, 12); return { result: 'Monthly: $' + a.emi.toFixed(2), chart: Charts.bar(firstYear.map(s=>s.principal), firstYear.map((_,i)=>'M'+(i+1))), extra: 'Total Interest: $' + a.totalInterest.toFixed(2) }; },
    steps: function(v) { return ['Step 1: Calculate monthly payment using EMI formula','Step 2: Each month: Interest = Balance × monthly rate','Step 3: Principal = EMI - Interest','Step 4: New Balance = Old Balance - Principal','Step 5: Repeat for all months']; } },
  { id: 'loan-to-value', name: 'Loan-to-Value Ratio', desc: 'Calculate LTV ratio', kw: 'loan to value',
    inputs: [{id:'loan',label:'Loan Amount',type:'number',def:240000},{id:'value',label:'Property Value',type:'number',def:300000}],
    calc: function(v) { const ltv = v.loan / v.value * 100; return { result: 'LTV: ' + ltv.toFixed(1) + '%', chart: Charts.gauge(ltv, 100), extra: ltv < 80 ? 'Good LTV' : 'High LTV - PMI needed' }; },
    steps: function(v) { const ltv=v.loan/v.value*100; return ['Formula: LTV = (Loan Amount / Property Value) × 100','Step 1: LTV = ($'+v.loan+' / $'+v.value+') × 100','Step 2: LTV = '+ltv.toFixed(1)+'%']; } },
  { id: 'apr', name: 'APR Calculator', desc: 'Calculate annual percentage rate', kw: 'annual percentage rate',
    inputs: [{id:'amount',label:'Loan Amount',type:'number',def:10000},{id:'fees',label:'Fees',type:'number',def:500},{id:'rate',label:'Nominal Rate (%)',type:'number',def:6},{id:'years',label:'Term (years)',type:'number',def:5}],
    calc: function(v) { const r = v.rate/100/12; const n = v.years*12; const emi = v.amount * r * Math.pow(1+r,n) / (Math.pow(1+r,n)-1); const netLoan = v.amount - v.fees; const apr = ((emi * n - netLoan) / netLoan / v.years) * 100; return { result: 'APR: ' + apr.toFixed(2) + '%', chart: Charts.bar([v.rate, apr], ['Nominal','APR']), extra: 'Monthly: $' + emi.toFixed(2) }; },
    steps: function(v) { return ['Step 1: Calculate monthly payment','Step 2: Net loan = $'+v.amount+' - $'+v.fees+' = $'+(v.amount-v.fees),'Step 3: APR accounts for fees in effective rate','Step 4: APR > Nominal rate due to fees']; } },
  { id: 'capital-gains', name: 'Capital Gains Tax', desc: 'Calculate capital gains tax', kw: 'capital gains tax',
    inputs: [{id:'purchase',label:'Purchase Price',type:'number',def:10000},{id:'sale',label:'Sale Price',type:'number',def:15000},{id:'rate',label:'Tax Rate (%)',type:'number',def:15}],
    calc: function(v) { const gain = v.sale - v.purchase; const tax = gain * v.rate / 100; return { result: 'Tax: $' + tax.toFixed(2), chart: Charts.donut([gain - tax, tax], ['Net Gain','Tax']), extra: 'Gain: $' + gain.toFixed(2) }; },
    steps: function(v) { const gain=v.sale-v.purchase; const tax=gain*v.rate/100; return ['Step 1: Gain = $'+v.sale+' - $'+v.purchase+' = $'+gain.toFixed(2),'Step 2: Tax = '+v.rate+'% × $'+gain.toFixed(2)+' = $'+tax.toFixed(2),'Step 3: Net gain = $'+(gain-tax).toFixed(2)]; } },
  { id: 'dividend', name: 'Dividend Calculator', desc: 'Calculate dividend income', kw: 'free dividend calculator',
    inputs: [{id:'shares',label:'Number of Shares',type:'number',def:100},{id:'dividend',label:'Dividend/Share',type:'number',def:2.5},{id:'rate',label:'Reinvest Rate (%)',type:'number',def:0}],
    calc: function(v) { const annual = v.shares * v.dividend; const withReinvest = annual * Math.pow(1 + v.rate/100, 10); return { result: 'Annual Dividend: $' + annual.toFixed(2), chart: Charts.line([annual, withReinvest*0.5, withReinvest], ['Y1','Y5','Y10']), extra: '10yr: $' + withReinvest.toFixed(2) }; },
    steps: function(v) { const annual=v.shares*v.dividend; return ['Step 1: Annual dividend = '+v.shares+' × $'+v.dividend+' = $'+annual.toFixed(2),'Step 2: With reinvestment at '+v.rate+'%, 10yr value = $'+(annual*Math.pow(1+v.rate/100,10)).toFixed(2)]; } },
  { id: 'fire', name: 'FIRE Calculator', desc: 'Financial independence number', kw: 'free fire calculator',
    inputs: [{id:'expenses',label:'Annual Expenses',type:'number',def:40000},{id:'savings',label:'Current Savings',type:'number',def:100000},{id:'rate',label:'Return (%)',type:'number',def:7},{id:'monthly',label:'Monthly Saving',type:'number',def:2000}],
    calc: function(v) { const fireNum = v.expenses * 25; const r = v.rate/100/12; const fv = v.savings * Math.pow(1+r, 12*20) + v.monthly * (Math.pow(1+r, 12*20) - 1) / r; return { result: 'FIRE Goal: $' + fireNum.toFixed(2), chart: Charts.gauge(fv/fireNum, 1, {center:'%'}), extra: 'Projected (20yr): $' + fv.toFixed(2) }; },
    steps: function(v) { const fire=v.expenses*25; return ['Step 1: FIRE number = 25 × annual expenses = 25 × $'+v.expenses+' = $'+fire.toFixed(2),'Step 2: This follows the 4% safe withdrawal rule','Step 3: Save $'+fire.toFixed(2)+' to retire']; } },
  { id: 'social-security', name: 'Social Security Calculator', desc: 'Estimate social security benefits', kw: 'social security calculator',
    inputs: [{id:'income',label:'Average Annual Income',type:'number',def:50000},{id:'years',label:'Years Worked',type:'number',def:35}],
    calc: function(v) { const benefit = v.income * 0.4 * (v.years/35); return { result: 'Monthly Benefit: $' + (benefit/12).toFixed(2), chart: Charts.bar([v.income, benefit], ['Income','Benefit']), extra: 'Annual: $' + benefit.toFixed(2) }; },
    steps: function(v) { const benefit=v.income*0.4*(v.years/35); return ['Step 1: Base benefit ≈ 40% of income','Step 2: Adjust for years worked: '+v.years+'/35','Step 3: Annual benefit = $'+benefit.toFixed(2),'Step 4: Monthly = $'+(benefit/12).toFixed(2)]; } },
  { id: 'rental-yield', name: 'Rental Yield Calculator', desc: 'Calculate rental yield', kw: 'rental yield calculator',
    inputs: [{id:'price',label:'Property Price',type:'number',def:200000},{id:'rent',label:'Monthly Rent',type:'number',def:1500},{id:'costs',label:'Annual Costs',type:'number',def:3000}],
    calc: function(v) { const annualRent = v.rent * 12; const netYield = (annualRent - v.costs) / v.price * 100; return { result: 'Net Yield: ' + netYield.toFixed(2) + '%', chart: Charts.donut([annualRent - v.costs, v.costs], ['Income','Costs']), extra: 'Gross Yield: ' + (annualRent/v.price*100).toFixed(2) + '%' }; },
    steps: function(v) { const ar=v.rent*12; const ny=(ar-v.costs)/v.price*100; return ['Step 1: Annual rent = $'+v.rent+'×12 = $'+ar.toFixed(2),'Step 2: Net income = $'+ar.toFixed(2)+' - $'+v.costs+' = $'+(ar-v.costs).toFixed(2),'Step 3: Net yield = $'+(ar-v.costs).toFixed(2)+' / $'+v.price+' × 100 = '+ny.toFixed(2)+'%']; } },
  { id: 'loan-comparison', name: 'Loan Comparison', desc: 'Compare multiple loan offers', kw: 'loan comparison calculator',
    inputs: [{id:'amount',label:'Loan Amount',type:'number',def:50000},{id:'rate1',label:'Offer 1 Rate (%)',type:'number',def:6},{id:'years1',label:'Offer 1 Term',type:'number',def:5},{id:'rate2',label:'Offer 2 Rate (%)',type:'number',def:7},{id:'years2',label:'Offer 2 Term',type:'number',def:4}],
    calc: function(v) { const a1=AdvancedCalc.generateAmortization(v.amount,v.rate1,v.years1,0); const a2=AdvancedCalc.generateAmortization(v.amount,v.rate2,v.years2,0); return { result: 'Offer 1: $'+a1.emi.toFixed(2)+'/mo | Offer 2: $'+a2.emi.toFixed(2)+'/mo', chart: Charts.bar([a1.emi, a2.emi, a1.totalPayment, a2.totalPayment], ['EMI1','EMI2','Total1','Total2']), extra: a1.totalPayment < a2.totalPayment ? 'Offer 1 saves $'+(a2.totalPayment-a1.totalPayment).toFixed(2) : 'Offer 2 saves $'+(a1.totalPayment-a2.totalPayment).toFixed(2) }; },
    steps: function(v) { const a1=AdvancedCalc.generateAmortization(v.amount,v.rate1,v.years1,0); const a2=AdvancedCalc.generateAmortization(v.amount,v.rate2,v.years2,0); return ['Step 1: Offer 1 EMI = $'+a1.emi.toFixed(2)+'/mo, Total = $'+a1.totalPayment.toFixed(2),'Step 2: Offer 2 EMI = $'+a2.emi.toFixed(2)+'/mo, Total = $'+a2.totalPayment.toFixed(2),a1.totalPayment<a2.totalPayment?'Step 3: Offer 1 is cheaper by $'+(a2.totalPayment-a1.totalPayment).toFixed(2):'Step 3: Offer 2 is cheaper by $'+(a1.totalPayment-a2.totalPayment).toFixed(2)]; } },
  { id: 'investment-growth', name: 'Investment Growth Comparison', desc: 'Compare different investment strategies', kw: 'cagr calculator with monthly contributions',
    inputs: [{id:'amount',label:'Initial Investment',type:'number',def:10000},{id:'rate1',label:'Conservative (%)',type:'number',def:4},{id:'rate2',label:'Moderate (%)',type:'number',def:7},{id:'rate3',label:'Aggressive (%)',type:'number',def:10},{id:'years',label:'Years',type:'number',def:20}],
    calc: function(v) { const f1=v.amount*Math.pow(1+v.rate1/100,v.years); const f2=v.amount*Math.pow(1+v.rate2/100,v.years); const f3=v.amount*Math.pow(1+v.rate3/100,v.years); return { result: 'Conservative: $'+f1.toFixed(0)+' | Moderate: $'+f2.toFixed(0)+' | Aggressive: $'+f3.toFixed(0), chart: Charts.bar([f1, f2, f3], ['Conservative','Moderate','Aggressive']), extra: 'Difference: $'+(f3-f1).toFixed(2) }; },
    steps: function(v) { const f1=v.amount*Math.pow(1+v.rate1/100,v.years); const f3=v.amount*Math.pow(1+v.rate3/100,v.years); return ['Step 1: Conservative ('+v.rate1+'%) = $'+f1.toFixed(2),'Step 2: Moderate ('+v.rate2+'%) = $'+(v.amount*Math.pow(1+v.rate2/100,v.years)).toFixed(2),'Step 3: Aggressive ('+v.rate3+'%) = $'+f3.toFixed(2),'Step 4: Risk premium = $'+(f3-f1).toFixed(2)]; } },
  { id: 'savings-comparison', name: 'Savings Account Comparison', desc: 'Compare savings account rates', kw: 'high yield savings',
    inputs: [{id:'amount',label:'Deposit Amount',type:'number',def:10000},{id:'rate1',label:'Bank 1 Rate (%)',type:'number',def:0.5},{id:'rate2',label:'Bank 2 Rate (%)',type:'number',def:4.5},{id:'years',label:'Years',type:'number',def:5}],
    calc: function(v) { const f1=v.amount*Math.pow(1+v.rate1/100,v.years); const f2=v.amount*Math.pow(1+v.rate2/100,v.years); return { result: 'Bank 1: $'+f1.toFixed(2)+' | Bank 2: $'+f2.toFixed(2), chart: Charts.bar([f1, f2], ['Bank 1','Bank 2']), extra: 'Bank 2 earns $'+(f2-f1).toFixed(2)+' more' }; },
    steps: function(v) { const f1=v.amount*Math.pow(1+v.rate1/100,v.years); const f2=v.amount*Math.pow(1+v.rate2/100,v.years); return ['Step 1: Bank 1 ('+v.rate1+'%) = $'+f1.toFixed(2),'Step 2: Bank 2 ('+v.rate2+'%) = $'+f2.toFixed(2),'Step 3: Difference = $'+(f2-f1).toFixed(2)+' extra in Bank 2']; } },
  { id: 'mortgage-payoff', name: 'Mortgage Payoff Calculator', desc: 'Calculate early mortgage payoff savings', kw: 'mortgage payoff calculator extra payments',
    inputs: [{id:'amount',label:'Loan Amount',type:'number',def:200000},{id:'rate',label:'Rate (%)',type:'number',def:6.5},{id:'years',label:'Original Term',type:'number',def:30},{id:'extra',label:'Extra Monthly Payment',type:'number',def:200}],
    calc: function(v) { const a=AdvancedCalc.generateAmortization(v.amount,v.rate,v.years,0); const newEmi=a.emi+v.extra; const r=v.rate/100/12; const newMonths=Math.ceil(-Math.log(1-r*v.amount/newEmi)/Math.log(1+r)); const savings=a.totalPayment-(newEmi*newMonths); return { result: 'Payoff in '+newMonths+' months (vs '+v.years*12+')', chart: Charts.bar([v.years*12, newMonths], ['Original','With Extra']), extra: 'Save $'+savings.toFixed(2)+' in interest' }; },
    steps: function(v) { const a=AdvancedCalc.generateAmortization(v.amount,v.rate,v.years,0); const newEmi=a.emi+v.extra; const r=v.rate/100/12; const nm=Math.ceil(-Math.log(1-r*v.amount/newEmi)/Math.log(1+r)); return ['Step 1: Original EMI = $'+a.emi.toFixed(2),'Step 2: New EMI with extra = $'+newEmi.toFixed(2),'Step 3: New payoff time = '+nm+' months','Step 4: Save '+(v.years*12-nm)+' months and $'+(a.totalPayment-newEmi*nm).toFixed(2)]; } },
  { id: 'graduated-payment', name: 'Graduated Payment Mortgage', desc: 'Calculate GPM payments', kw: 'increasing payment mortgage',
    inputs: [{id:'amount',label:'Loan Amount',type:'number',def:200000},{id:'rate',label:'Rate (%)',type:'number',def:6},{id:'years',label:'Term (years)',type:'number',def:30},{id:'growth',label:'Annual Growth (%)',type:'number',def:5}],
    calc: function(v) { const r=v.rate/100/12; const n=v.years*12; const baseEmi=r>0?v.amount*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1):v.amount/n; const startEmi=baseEmi*0.7; const endEmi=startEmi*Math.pow(1+v.growth/100,5); return { result: 'Year 1: $'+startEmi.toFixed(2)+'/mo | Year 6+: $'+endEmi.toFixed(2)+'/mo', chart: Charts.bar([startEmi, startEmi*1.3, startEmi*1.6, endEmi], ['Y1','Y2','Y3','Y6+']), extra: 'Standard EMI would be $'+baseEmi.toFixed(2) }; },
    steps: function(v) { return ['Step 1: Calculate standard EMI','Step 2: Start at 70% of standard EMI','Step 3: Increase '+v.growth+'% annually for 5 years','Step 4: Then fixed for remaining term']; } },
  { id: 'balloon-payment', name: 'Balloon Payment Calculator', desc: 'Calculate balloon mortgage payment', kw: 'lump sum payment',
    inputs: [{id:'amount',label:'Loan Amount',type:'number',def:200000},{id:'rate',label:'Rate (%)',type:'number',def:6},{id:'years',label:'Amortization (years)',type:'number',def:30},{id:'balloon',label:'Balloon After (years)',type:'number',def:5}],
    calc: function(v) { const a=AdvancedCalc.generateAmortization(v.amount,v.rate,v.years,0); const balAfter=a.schedule[v.balloon*12-1].balance; return { result: 'Monthly: $'+a.emi.toFixed(2)+' | Balloon: $'+balAfter.toFixed(2), chart: Charts.bar([v.amount, balAfter], ['Initial','Balloon']), extra: 'After '+v.balloon+' years, pay $'+balAfter.toFixed(2) }; },
    steps: function(v) { const a=AdvancedCalc.generateAmortization(v.amount,v.rate,v.years,0); const bal=a.schedule[v.balloon*12-1].balance; return ['Step 1: Calculate monthly payment = $'+a.emi.toFixed(2),'Step 2: After '+v.balloon+' years, remaining balance = $'+bal.toFixed(2),'Step 3: This balance must be paid as lump sum']; } },
  { id: 'interest-only', name: 'Interest-Only Mortgage', desc: 'Calculate interest-only payments', kw: 'interest only mortgage, interest only payment',
    inputs: [{id:'amount',label:'Loan Amount',type:'number',def:300000},{id:'rate',label:'Rate (%)',type:'number',def:6.5},{id:'ioYears',label:'IO Period (years)',type:'number',def:5},{id:'years',label:'Total Term (years)',type:'number',def:30}],
    calc: function(v) { const ioPayment=v.amount*v.rate/100/12; const remainingYears=v.years-v.ioYears; const a=AdvancedCalc.generateAmortization(v.amount,v.rate,remainingYears,0); return { result: 'IO Payment: $'+ioPayment.toFixed(2)+'/mo | After: $'+a.emi.toFixed(2)+'/mo', chart: Charts.bar([ioPayment, a.emi], ['IO Period','After IO']), extra: 'IO for '+v.ioYears+' years, then amortize over '+remainingYears+' years' }; },
    steps: function(v) { const io=v.amount*v.rate/100/12; const rem=v.years-v.ioYears; const a=AdvancedCalc.generateAmortization(v.amount,v.rate,rem,0); return ['Step 1: IO payment = $'+v.amount+'×'+v.rate+'%/12 = $'+io.toFixed(2)+'/mo','Step 2: After '+v.ioYears+' years, amortize over '+rem+' years','Step 3: New payment = $'+a.emi.toFixed(2)+'/mo']; } },
  { id: 'emergency-fund', name: 'Emergency Fund Calculator', desc: 'Calculate how much you need in your emergency fund', kw: 'rainy day fund',
    inputs: [{id:'monthlyExpenses',label:'Monthly Expenses ($)',type:'number',def:3000},{id:'months',label:'Months to Cover',type:'number',def:6},{id:'currentSaved',label:'Currently Saved ($)',type:'number',def:5000},{id:'monthlyContribution',label:'Monthly Contribution ($)',type:'number',def:500}],
    calc: function(v) { const target=v.monthlyExpenses*v.months; const gap=Math.max(0,target-v.currentSaved); const contrib=Math.max(0,v.monthlyContribution||0); const monthsToFill=gap>0?(contrib>0?Math.ceil(gap/contrib):-1):0; return { result: 'Target: $'+target.toLocaleString()+' | Saved: $'+v.currentSaved.toLocaleString(), chart: Charts.donut([v.currentSaved, Math.max(0,target-v.currentSaved)], ['Saved','Gap']), extra: 'Gap: $'+gap.toLocaleString()+' | '+(monthsToFill>0?monthsToFill+' months to fully fund at $'+contrib+'/mo':monthsToFill===0?'Fully funded ✓':'Add a monthly contribution to see timeline')+' | Rule: 3–6 months of expenses' }; },
    steps: function(v) { const t=v.monthlyExpenses*v.months; const g=Math.max(0,t-v.currentSaved); return ['Step 1: Target = $'+v.monthlyExpenses.toLocaleString()+' × '+v.months+' = $'+t.toLocaleString(),'Step 2: Gap = $'+t.toLocaleString()+' − $'+v.currentSaved.toLocaleString()+' = $'+g.toLocaleString(),'Step 3: Months to fill = $'+g.toLocaleString()+' / $'+v.monthlyContribution.toLocaleString()+' = '+Math.ceil(g/v.monthlyContribution)]; } },
{ id: "bond-yield", name: "Bond Yield to Maturity", desc: "Calculate bond yield to maturity and current yield", kw: "bond yield, YTM, current yield, fixed income", inputs: [{id:"faceValue",label:"Face Value ($)",type:"number",def:1000},{id:"coupon",label:"Coupon Rate (%)",type:"number",def:5},{id:"currentPrice",label:"Current Price ($)",type:"number",def:950},{id:"years",label:"Years to Maturity",type:"number",def:10}], calc: function(v) { var ac=v.faceValue*v.coupon/100; var cy=ac/v.currentPrice*100; var ap=(v.faceValue+v.currentPrice)/2; var ytm=(ac+(v.faceValue-v.currentPrice)/v.years)/ap*100; return { result: "YTM: "+ytm.toFixed(2)+"% | Current Yield: "+cy.toFixed(2)+"%", chart: Charts.bar([ytm,cy],["YTM","Current Yield"]), extra: "Annual Coupon: $"+ac.toFixed(2)+" | Maturity: $"+v.faceValue }; }, steps: function(v) { var c=v.faceValue*v.coupon/100; var cy=c/v.currentPrice*100; var ap=(v.faceValue+v.currentPrice)/2; var y=(c+(v.faceValue-v.currentPrice)/v.years)/ap*100; return ["Step 1: Coupon = $"+v.faceValue+"x"+v.coupon+"% = $"+c.toFixed(2),"Step 2: Current yield = "+cy.toFixed(2)+"%","Step 3: YTM ~ "+y.toFixed(2)+"%"]; } },
{ id: "retirement-income", name: "Retirement Income Calculator", desc: "Estimate monthly retirement income from savings", kw: "retirement income, retirement planning, 401k, IRA", inputs: [{id:"savings",label:"Current Savings ($)",type:"number",def:500000},{id:"monthlyAdd",label:"Monthly Contribution ($)",type:"number",def:1000},{id:"returnRate",label:"Expected Return (%)",type:"number",def:7},{id:"yearsToRetire",label:"Years Until Retirement",type:"number",def:20},{id:"retireYears",label:"Retirement Duration (years)",type:"number",def:25}], calc: function(v) { var r=v.returnRate/100/12; var n=v.yearsToRetire*12; var fv=v.savings*Math.pow(1+r,n)+v.monthlyAdd*(Math.pow(1+r,n)-1)/r; var wr=v.returnRate/100/12; var wn=v.retireYears*12; var mi=fv*wr*Math.pow(1+wr,wn)/(Math.pow(1+wr,wn)-1); var tc=v.savings+v.monthlyAdd*n; return { result: "Monthly Income: $"+mi.toFixed(2), chart: Charts.bar([fv,tc,fv-tc],["Total","Contributions","Growth"]), extra: "At retirement: $"+fv.toFixed(0)+" | Contributions: $"+tc.toFixed(0) }; }, steps: function(v) { var r=v.returnRate/100/12; var n=v.yearsToRetire*12; var fv=v.savings*Math.pow(1+r,n)+v.monthlyAdd*(Math.pow(1+r,n)-1)/r; return ["Step 1: N = "+n+" months","Step 2: Future value = $"+fv.toFixed(0),"Step 3: Monthly income ~ $"+(fv*(r)).toFixed(2)]; } },
{ id: "sip", name: "SIP Calculator (Systematic Investment Plan)", desc: "Calculate returns on regular mutual fund investments", kw: "sip calculator, mutual fund, systematic investment plan", inputs: [{id:"monthly",label:"Monthly Investment ($)",type:"number",def:500},{id:"returnRate",label:"Expected Annual Return (%)",type:"number",def:12},{id:"years",label:"Investment Period (years)",type:"number",def:10}], calc: function(v) { var r=v.returnRate/100/12; var n=v.years*12; var ti=v.monthly*n; var fv=v.monthly*((Math.pow(1+r,n)-1)/r)*(1+r); var ret=fv-ti; return { result: "Future Value: $"+fv.toFixed(0), chart: Charts.donut([ti,ret],["Invested","Returns"]), extra: "Invested: $"+ti.toFixed(0)+" | Returns: $"+ret.toFixed(0) }; }, steps: function(v) { var r=v.returnRate/100/12; var n=v.years*12; var ti=v.monthly*n; var fv=v.monthly*((Math.pow(1+r,n)-1)/r)*(1+r); return ["Step 1: "+v.years+" years = "+n+" months","Step 2: Total invested = $"+ti.toFixed(0),"Step 3: FV = $"+fv.toFixed(0)]; },
    // Reverse calc (target = future value): FV = M·((1+r)^n−1)/r·(1+r) → monthly analytical, rate/years numerical
    reverse: { solveFor: { monthly: 1, returnRate: 1, years: 1 }, variables: {
      monthly: { analytical: function(o, target) { var r=o.returnRate/100/12; var n=o.years*12; return target * r / ((Math.pow(1+r,n)-1) * (1+r)); }, domain: [0, 1e9] },
      returnRate: { fn: function(x, o) { var r=x/100/12; var n=o.years*12; return o.monthly*((Math.pow(1+r,n)-1)/r)*(1+r); }, domain: [0, 100] },
      years: { fn: function(x, o) { var r=o.returnRate/100/12; var n=x*12; return o.monthly*((Math.pow(1+r,n)-1)/r)*(1+r); }, domain: [0, 100] }
    } } },
{ id: "crypto-profit", name: "Crypto Profit Calculator", desc: "Calculate profit/loss on cryptocurrency investments", kw: "crypto calculator, bitcoin profit, cryptocurrency gains", inputs: [{id:"buyPrice",label:"Buy Price ($)",type:"number",def:30000},{id:"sellPrice",label:"Sell Price ($)",type:"number",def:45000},{id:"quantity",label:"Quantity (coins)",type:"number",def:1},{id:"fees",label:"Total Fees ($)",type:"number",def:50}], calc: function(v) { var i=v.buyPrice*v.quantity; var p=v.sellPrice*v.quantity; var pf=p-i-v.fees; var roi=pf/(i+v.fees)*100; return { result: (pf>=0?"Profit: $":"Loss: $")+Math.abs(pf).toFixed(2), chart: Charts.bar([i,p],["Investment","Proceeds"]), extra: "ROI: "+roi.toFixed(2)+"% | Invested: $"+i.toFixed(2) }; }, steps: function(v) { var i=v.buyPrice*v.quantity; var p=v.sellPrice*v.quantity; var pf=p-i-v.fees; var r=pf/(i+v.fees)*100; return ["Step 1: Invested = $"+i,"Step 2: Proceeds = $"+p,"Step 3: Profit = $"+(pf<0?"":"+")+pf.toFixed(2),"Step 4: ROI = "+r.toFixed(2)+"%"]; } },
{ id: "stock-profit", name: "Stock Profit Calculator", desc: "Calculate profit/loss on stock trades including commissions", kw: "stock profit, stock calculator, capital gains", inputs: [{id:"shares",label:"Number of Shares",type:"number",def:100},{id:"buyPrice",label:"Buy Price ($)",type:"number",def:50},{id:"sellPrice",label:"Sell Price ($)",type:"number",def:75},{id:"commission",label:"Commission per Trade ($)",type:"number",def:10}], calc: function(v) { var b=v.shares*v.buyPrice+v.commission; var s=v.shares*v.sellPrice-v.commission; var p=s-b; var pc=p/b*100; return { result: (p>=0?"Profit: $":"Loss: $")+Math.abs(p).toFixed(2), chart: Charts.bar([b,s],["Cost Basis","Proceeds"]), extra: "Return: "+pc.toFixed(2)+"%" }; }, steps: function(v) { var b=v.shares*v.buyPrice+v.commission; var s=v.shares*v.sellPrice-v.commission; var p=s-b; return ["Step 1: Cost = $"+b,"Step 2: Proceeds = $"+s,"Step 3: Profit = $"+(p<0?"":"+")+p.toFixed(2)]; } },
{ id: "dca", name: "DCA Calculator (Dollar Cost Average)", desc: "Show benefits of dollar-cost averaging vs lump sum", kw: "dca calculator, dollar cost averaging, lump sum vs dca", inputs: [{id:"lumpSum",label:"Lump Sum ($)",type:"number",def:12000},{id:"monthly",label:"Monthly DCA ($)",type:"number",def:1000},{id:"periods",label:"Number of Months",type:"number",def:12},{id:"annualReturn",label:"Annual Return (%)",type:"number",def:10}], calc: function(v) { var r=v.annualReturn/100/12; var lfv=v.lumpSum*Math.pow(1+r,v.periods); var dfv=v.monthly*((Math.pow(1+r,v.periods)-1)/r)*(1+r); var adv=dfv-lfv; return { result: "DCA: $"+dfv.toFixed(0)+" vs Lump: $"+lfv.toFixed(0), chart: Charts.bar([lfv,dfv],["Lump Sum","DCA"]), extra: "DCA "+(adv>0?"wins by $":"loses by $")+Math.abs(adv).toFixed(2) }; }, steps: function(v) { var r=v.annualReturn/100/12; var lfv=v.lumpSum*Math.pow(1+r,v.periods); var dfv=v.monthly*((Math.pow(1+r,v.periods)-1)/r)*(1+r); return ["Step 1: Lump sum = $"+lfv.toFixed(0),"Step 2: DCA = $"+dfv.toFixed(0)]; } },
{ id: "college-cost", name: "College Cost Calculator", desc: "Project future college costs and savings needed", kw: "college calculator, education savings, 529 plan, tuition cost", inputs: [{id:"currentCost",label:"Current Tuition ($)",type:"number",def:25000},{id:"yearsUntil",label:"Years Until College",type:"number",def:10},{id:"inflation",label:"Tuition Inflation (%)",type:"number",def:5},{id:"savedSoFar",label:"Already Saved ($)",type:"number",def:10000},{id:"returnOnSavings",label:"Return on Savings (%)",type:"number",def:6}], calc: function(v) { var fc=v.currentCost*Math.pow(1+v.inflation/100,v.yearsUntil); var fs=v.savedSoFar*Math.pow(1+v.returnOnSavings/100,v.yearsUntil); var gap=Math.max(0,fc-fs); return { result: "Future Cost: $"+fc.toFixed(0), chart: Charts.bar([fs,gap,fc],["Saved","Gap","Total"]), extra: "Gap: $"+gap.toFixed(0) }; }, steps: function(v) { var fc=v.currentCost*Math.pow(1+v.inflation/100,v.yearsUntil); return ["Step 1: Future cost = $"+fc.toFixed(0),"Step 2: Gap = future cost minus savings"]; } },
{ id: "perpetuity", name: "Perpetuity Calculator", desc: "Calculate present value of perpetual cash flows", kw: "perpetuity calculator, present value perpetuity, terminal value", inputs: [{id:"payment",label:"Payment per Period ($)",type:"number",def:1000},{id:"discountRate",label:"Discount Rate (%)",type:"number",def:8},{id:"growthRate",label:"Growth Rate (%) (0 for flat)",type:"number",def:0}], calc: function(v) { var dr=v.discountRate/100; var gr=v.growthRate/100; var pv=gr===0?v.payment/dr:v.payment/(dr-gr); return { result: "PV: $"+pv.toFixed(2), chart: Charts.gauge(Math.min(pv/10,100),100), extra: "Multiple: "+(pv/v.payment).toFixed(2)+"x" }; }, steps: function(v) { var dr=v.discountRate/100; var gr=v.growthRate/100; var pv=gr===0?v.payment/dr:v.payment/(dr-gr); return ["Formula: PV = PMT/(r-g)","Step 1: PV = $"+pv.toFixed(2)]; } },
{ id: "esop", name: "ESOP Calculator (Employee Stock Ownership)", desc: "Calculate value of employee stock options", kw: "esop calculator, employee stock options, stock options, RSU", inputs: [{id:"strikePrice",label:"Strike Price ($)",type:"number",def:10},{id:"currentPrice",label:"Current Stock Price ($)",type:"number",def:25},{id:"options",label:"Number of Options",type:"number",def:1000},{id:"taxRate",label:"Tax Rate (%)",type:"number",def:30}], calc: function(v) { var s=(v.currentPrice-v.strikePrice)*v.options; var p=s*(1-v.taxRate/100); return { result: "Net Profit: $"+p.toFixed(0), chart: Charts.bar([v.strikePrice*v.options,v.currentPrice*v.options,p],["Cost","Value","Profit"]), extra: "Spread: $"+s.toFixed(0)+" | Tax: "+v.taxRate+"%" }; }, steps: function(v) { var s=(v.currentPrice-v.strikePrice)*v.options; var p=s*(1-v.taxRate/100); return ["Step 1: Cost = $"+(v.strikePrice*v.options).toFixed(0),"Step 2: Value = $"+(v.currentPrice*v.options).toFixed(0),"Step 3: Profit = $"+p.toFixed(0)]; } },
    // ===== Global income-tax tools (Gap 7 — Good Calculators style localized taxes) =====
  // Marginal tax-bracket calculators for US / UK / Canada / Australia. Brackets are
  // the latest published rates; the disclaimer reminds users these are estimates.
  { id: 'us-income-tax', name: 'US Federal Income Tax Calculator', desc: 'Estimate US federal income tax with marginal brackets (2026)', kw: 'us income tax, federal tax calculator, irs tax brackets',
    inputs: [{id:'income',label:'Annual Income ($)',type:'number',def:75000,slider:{min:10000,max:500000,step:1000}},{id:'filing',label:'Filing Status',type:'select',opts:[{v:'single',l:'Single'},{v:'married',l:'Married Filing Jointly'},{v:'head',l:'Head of Household'}],def:'single'},{id:'deduction',label:'Standard Deduction ($)',type:'number',def:16100}],
    calc: function(v) { const brackets = {single:[[12400,10],[50400,12],[105700,22],[201775,24],[256225,32],[640600,35],[1e99,37]],married:[[24800,10],[100800,12],[211400,22],[403550,24],[512450,32],[768700,35],[1e99,37]],head:[[17700,10],[67450,12],[105700,22],[201775,24],[256200,32],[640600,35],[1e99,37]]};
      const br = brackets[v.filing] || brackets.single; const taxable = Math.max(0, v.income - (v.deduction||0));
      let tax = 0; let prev = 0; const rows = [];
      br.forEach((b, i) => { if (taxable > prev) { const amt = Math.min(taxable, b[0]) - prev; tax += amt * b[1]/100; rows.push('$' + prev.toLocaleString() + '–$' + Math.min(taxable,b[0]).toLocaleString() + ' @ ' + b[1] + '% → $' + (amt*b[1]/100).toFixed(0)); } prev = b[0]; });
      const eff = v.income > 0 ? tax/v.income*100 : 0;
      return { result: 'Federal Tax: $' + tax.toLocaleString(undefined,{maximumFractionDigits:0}), chart: Charts.bar([tax, v.income-tax], ['Tax','Take-home']), extra: 'Effective rate: ' + eff.toFixed(1) + '% | Take-home: $' + (v.income-tax).toLocaleString(undefined,{maximumFractionDigits:0}) + ' | ' + rows.join(' · ') };
    },
    steps: function(v) { return ['Step 1: Taxable income = $' + v.income.toLocaleString() + ' − $' + (v.deduction||0).toLocaleString() + ' standard deduction','Step 2: Apply ' + v.filing.replace(/([A-Z])/g,' $1').toLowerCase() + ' marginal brackets','Step 3: Sum each bracket portion × its rate = total federal tax','Step 4: Effective rate = tax ÷ gross income × 100']; } },
  { id: 'uk-income-tax', name: 'UK Income Tax Calculator', desc: 'Estimate UK income tax + National Insurance (2026)', kw: 'uk income tax calculator, take home pay uk',
    inputs: [{id:'income',label:'Annual Salary (£)',type:'number',def:40000},{id:'pension',label:'Pension Contribution (%)',type:'number',def:5},{id:'studentLoan',label:'Student Loan Plan',type:'select',opts:[{v:'none',l:'None'},{v:'plan2',l:'Plan 2 (post-2012)'},{v:'plan5',l:'Plan 5 (2023+)'}],def:'none'}],
    calc: function(v) { const pen = v.income * (v.pension||0)/100; const taxable = v.income - pen; const pa = 12570;
      const bands = [[50270,20],[125140,40],[1e99,45]]; let tax = 0; let prev = pa;
      bands.forEach(b => { if (taxable > prev) { tax += (Math.min(taxable,b[0])-prev) * b[1]/100; prev = b[0]; } });
      tax = Math.max(0, tax);
      let ni = 0; const niBand = 50270; if (taxable > 12570) ni = (Math.min(taxable,niBand)-12570)*0.08 + (taxable>niBand?(taxable-niBand)*0.02:0);
      const sl = v.studentLoan==='none' ? 0 : taxable*0.09;
      const take = taxable - tax - ni - sl;
      return { result: 'Take-home: £' + take.toLocaleString(undefined,{maximumFractionDigits:0}) + '/yr', chart: Charts.donut([take, tax, ni, sl], ['Take-home','Income tax','NI','Student loan']), extra: 'Income tax: £' + tax.toLocaleString(undefined,{maximumFractionDigits:0}) + ' | NI: £' + ni.toLocaleString(undefined,{maximumFractionDigits:0}) + ' | Student loan: £' + sl.toLocaleString(undefined,{maximumFractionDigits:0}) + ' | Monthly: £' + (take/12).toLocaleString(undefined,{maximumFractionDigits:0}) };
    },
    steps: function(v) { return ['Step 1: Pension (£' + (v.pension||0) + '%) = £' + (v.income*(v.pension||0)/100).toLocaleString(),'Step 2: Taxable = salary − pension = £' + (v.income-v.income*(v.pension||0)/100).toLocaleString(),'Step 3: 20% on £12,571–£50,270, 40% to £125,140, 45% above','Step 4: National Insurance 8% (12,571–50,270) + 2% above','Step 5: Take-home = taxable − tax − NI − student loan']; } },
  { id: 'canada-income-tax', name: 'Canada Income Tax Calculator', desc: 'Estimate Canadian federal + provincial income tax (2026)', kw: 'canada income tax, cra tax calculator, take home canada',
    inputs: [{id:'income',label:'Annual Income (CAD)',type:'number',def:65000,slider:{min:10000,max:300000,step:1000}},{id:'province',label:'Province',type:'select',opts:[{v:'on',l:'Ontario'},{v:'bc',l:'British Columbia'},{v:'ab',l:'Alberta'},{v:'qc',l:'Québec'},{v:'ns',l:'Nova Scotia'}],def:'on'}],
    calc: function(v) {      const fed = [[58523,14],[117045,20.5],[181440,26],[258482,29],[1e99,33]];
      const prov = {on:[[53891,5.05],[107785,9.15],[150000,11.16],[220000,12.16],[1e99,13.16]],bc:[[50363,5.6],[100728,7.7],[115648,10.5],[140430,12.29],[190405,14.7],[265545,16.8],[1e99,20.5]],ab:[[61200,8],[154259,10],[185111,12],[246813,13],[370220,14],[1e99,15]],qc:[[54345,14],[108680,19],[132245,24],[1e99,25.75]],ns:[[30995,8.79],[61991,14.95],[97417,16.67],[157124,17.5],[1e99,21]]};
      const tax = (b, inc) => { let t=0,p=0; b.forEach(x=>{ if(inc>p){ t+=(Math.min(inc,x[0])-p)*x[1]/100; p=x[0]; } }); return t; };
      const ft = tax(fed, v.income); const pt = tax(prov[v.province]||prov.on, v.income);
      const total = ft + pt; const take = v.income - total;
      return { result: 'Take-home: C$' + take.toLocaleString(undefined,{maximumFractionDigits:0}), chart: Charts.donut([take, ft, pt], ['Take-home','Federal','Provincial']), extra: 'Federal: C$' + ft.toLocaleString(undefined,{maximumFractionDigits:0}) + ' | Provincial (' + ({on:'ON',bc:'BC',ab:'AB',qc:'QC',ns:'NS'}[v.province]) + '): C$' + pt.toLocaleString(undefined,{maximumFractionDigits:0}) + ' | Combined: C$' + total.toLocaleString(undefined,{maximumFractionDigits:0}) }; },
    steps: function(v) { return ['Step 1: Apply 2026 federal brackets (14%–33%)','Step 2: Apply provincial brackets for ' + ({on:'Ontario',bc:'BC',ab:'Alberta',qc:'Québec',ns:'Nova Scotia'}[v.province]),'Step 3: Total tax = federal + provincial','Step 4: Take-home = income − total tax']; } },
  { id: 'australia-income-tax', name: 'Australia Income Tax Calculator', desc: 'Estimate Australian income tax + Medicare levy (2026)', kw: 'australia tax calculator, take home australia',
    inputs: [{id:'income',label:'Annual Income (AUD)',type:'number',def:80000,slider:{min:10000,max:300000,step:1000}},{id:'super',label:'Salary Sacrifice Super (%)',type:'number',def:0}],
    calc: function(v) { const inc = v.income - v.income*(v.super||0)/100;
      const bands = [[18200,0],[45000,15],[135000,30],[190000,37],[1e99,45]]; let tax=0,p=0;
      bands.forEach(b=>{ if(inc>p){ tax+=(Math.min(inc,b[0])-p)*b[1]/100; p=b[0]; } });
      const medicare = inc*0.02; const total = tax+medicare; const take = inc-total;
      return { result: 'Take-home: A$' + take.toLocaleString(undefined,{maximumFractionDigits:0}) + '/yr', chart: Charts.donut([take, tax, medicare], ['Take-home','Income tax','Medicare']), extra: 'Income tax: A$' + tax.toLocaleString(undefined,{maximumFractionDigits:0}) + ' | Medicare levy (2%): A$' + medicare.toLocaleString(undefined,{maximumFractionDigits:0}) + ' | Weekly: A$' + (take/52).toLocaleString(undefined,{maximumFractionDigits:0}) }; },
    steps: function(v) { return ['Step 1: Taxable = salary − super sacrifice = A$' + (v.income-v.income*(v.super||0)/100).toLocaleString(),'Step 2: 2026 ATO brackets: 0% to 18,200 · 15% to 45,000 · 30% to 135,000 · 37% to 190,000 · 45% above','Step 3: Add 2% Medicare levy','Step 4: Take-home = taxable − tax − Medicare']; } },

  { id: 'bond-price', name: 'Bond Price Calculator', desc: 'Calculate present value of a bond', kw: 'bond price calculator present value',
    inputs: [{id:'face',label:'Face Value',type:'number',def:1000},{id:'coupon',label:'Coupon Rate (%)',type:'number',def:5},{id:'yield',label:'Market Yield (%)',type:'number',def:4},{id:'years',label:'Years to Maturity',type:'number',def:10}],
    calc: function(v) { var couponPayment = v.face * (v.coupon/100); var y = v.yield/100; var pvCoupons = 0; for(var t=1; t<=v.years; t++) pvCoupons += couponPayment / Math.pow(1+y, t); var pvFace = v.face / Math.pow(1+y, v.years); var price = pvCoupons + pvFace; return { result: 'Bond Price: $' + price.toFixed(2), chart: Charts.donut([pvCoupons, pvFace], ['Coupons PV','Face PV']), extra: 'Premium/Discount: $' + (price - v.face).toFixed(2) + (price > v.face ? ' (Premium)' : ' (Discount)') }; },
    steps: function(v) { var cp=v.face*(v.coupon/100); var y=v.yield/100; var pvC=0; for(var t=1;t<=v.years;t++) pvC+=cp/Math.pow(1+y,t); var pvF=v.face/Math.pow(1+y,v.years); return ['Step 1: Coupon payment = $'+v.face+' × '+v.coupon+'% = $'+cp.toFixed(2),"Step 2: PV of coupons = Σ $"+cp.toFixed(2)+' / (1+'+v.yield+'%)^t for t=1..'+v.years,'Step 3: PV of face = $'+v.face+' / (1+'+v.yield+'%)^'+v.years+' = $'+pvF.toFixed(2),'Step 4: Price = $'+pvC.toFixed(2)+' + $'+pvF.toFixed(2)+' = $'+(pvC+pvF).toFixed(2)]; } },

  { id: 'cd-calculator', name: 'CD Interest Calculator', desc: 'Certificate of Deposit compound interest', kw: 'cd interest calculator certificate of deposit',
    inputs: [{id:'deposit',label:'Deposit Amount',type:'number',def:10000},{id:'rate',label:'APY (%)',type:'number',def:4.5},{id:'years',label:'Term (years)',type:'number',def:5},{id:'compound',label:'Compounding',type:'select',opts:[{v:'1',l:'Annually'},{v:'4',l:'Quarterly'},{v:'12',l:'Monthly'},{v:'365',l:'Daily'}],def:'12'}],
    calc: function(v) { var n = parseInt(v.compound); var r = v.rate/100; var amount = v.deposit * Math.pow(1 + r/n, n*v.years); var interest = amount - v.deposit; return { result: 'Maturity: $' + amount.toFixed(2), chart: Charts.donut([v.deposit, interest], ['Principal','Interest']), extra: 'Interest earned: $' + interest.toFixed(2) }; },
    steps: function(v) { var n=parseInt(v.compound); var r=v.rate/100; var a=v.deposit*Math.pow(1+r/n,n*v.years); return ['Formula: A = P(1 + r/n)^(nt)','Step 1: r/n = '+v.rate+'%/'+n+' = '+(r/n).toFixed(6),'Step 2: nt = '+n+'×'+v.years+' = '+(n*v.years),'Step 3: A = $'+v.deposit+' × (1+'+(r/n).toFixed(6)+')^'+(n*v.years),'Step 4: A = $'+a.toFixed(2)]; } },

  { id: 'annuity-payout', name: 'Annuity Payout Calculator', desc: 'Sustainable withdrawal from retirement fund', kw: 'annuity payout calculator retirement withdrawal',
    inputs: [{id:'fund',label:'Retirement Fund',type:'number',def:500000},{id:'rate',label:'Annual Return (%)',type:'number',def:6},{id:'years',label:'Payout Years',type:'number',def:25}],
    calc: function(v) { var r = v.rate/100; if(r===0) return {result:'$'+(v.fund/v.years).toFixed(2)+'/yr',chart:'',extra:'No growth'}; var pmt = v.fund * r / (1 - Math.pow(1+r, -v.years)); return { result: 'Annual: $' + pmt.toFixed(2), chart: Charts.donut([pmt*25, v.fund], ['Total Paid','Fund']), extra: 'Monthly: $' + (pmt/12).toFixed(2) }; },
    steps: function(v) { var r=v.rate/100; var pmt=v.fund*r/(1-Math.pow(1+r,-v.years)); return ['Formula: PMT = P × r / (1 - (1+r)^(-n))','Step 1: r = '+v.rate+'% = '+r,'Step 2: (1+r)^(-n) = (1+'+r+')^(-'+v.years+') = '+Math.pow(1+r,-v.years).toFixed(6),'Step 3: PMT = $'+v.fund+' × '+r+' / '+(1-Math.pow(1+r,-v.years)).toFixed(6),'Step 4: Annual = $'+pmt.toFixed(2)+' | Monthly = $'+(pmt/12).toFixed(2)]; } },

  { id: 'dividend-yield', name: 'Dividend Yield Calculator', desc: 'Calculate dividend yield and payout ratio', kw: 'dividend yield calculator',
    inputs: [{id:'annualDiv',label:'Annual Dividend ($)',type:'number',def:3.50},{id:'price',label:'Share Price ($)',type:'number',def:75}],
    calc: function(v) { var y = (v.annualDiv / v.price) * 100; return { result: 'Dividend Yield: ' + y.toFixed(2) + '%', chart: Charts.gauge(y, 10), extra: 'Quarterly: $' + (v.annualDiv/4).toFixed(2) + ' | Monthly: $' + (v.annualDiv/12).toFixed(2) }; },
    steps: function(v) { return ['Formula: Yield = Annual Dividend / Price × 100','Step 1: $'+v.annualDiv+' / $'+v.price,'Step 2: = '+(v.annualDiv/v.price).toFixed(4),'Step 3: × 100 = '+((v.annualDiv/v.price)*100).toFixed(2)+'%']; } },

  { id: 'rule-of-72', name: 'Rule of 72 Calculator', desc: 'Estimate doubling time for investments', kw: 'rule of 72 calculator investment doubling time',
    inputs: [{id:'rate',label:'Annual Return (%)',type:'number',def:7}],
    calc: function(v) { var years = 72 / v.rate; var exact = Math.log(2) / Math.log(1 + v.rate/100); return { result: 'Doubling time: ~' + years.toFixed(1) + ' years', chart: Charts.gauge(years, 30), extra: 'Exact: ' + exact.toFixed(2) + ' years | Gap: ' + Math.abs(years-exact).toFixed(2) + ' yrs' }; },
    steps: function(v) { var y=72/v.rate; var ex=Math.log(2)/Math.log(1+v.rate/100); return ['Rule of 72: Years to double ≈ 72 / rate','Step 1: 72 / '+v.rate+'% = '+y.toFixed(1)+' years','Step 2: Exact formula: ln(2)/ln(1+'+v.rate+'%)','Step 3: Exact = '+ex.toFixed(2)+' years','Step 4: Rule of 72 is accurate to ±'+Math.abs(y-ex).toFixed(2)+' years']; } },

  { id: 'loan-payoff', name: 'Loan Payoff Calculator', desc: 'Calculate months to pay off with extra payments', kw: 'loan payoff calculator extra payments',
    inputs: [{id:'balance',label:'Loan Balance',type:'number',def:25000},{id:'rate',label:'Annual Rate (%)',type:'number',def:6},{id:'payment',label:'Monthly Payment',type:'number',def:500},{id:'extra',label:'Extra Payment',type:'number',def:100}],
    calc: function(v) { var r = v.rate/100/12; var bal = v.balance; var months = 0; var totalPaid = 0; var pmt = v.payment + v.extra; while(bal > 0 && months < 600) { var interest = bal * r; var princ = Math.min(pmt - interest, bal); bal -= princ; totalPaid += pmt; months++; } var saved = 0; var bal2 = v.balance; for(var t=0; t<600 && bal2>0; t++) { var int2 = bal2*r; var princ2 = Math.min(v.payment-int2, bal2); bal2 -= princ2; saved += v.payment; } return { result: 'Payoff: ' + months + ' months', chart: Charts.donut([totalPaid-saved, saved], ['Extra paid','Interest saved']), extra: 'Total paid: $'+totalPaid.toFixed(0)+' | Interest saved: ~$'+Math.max(0,saved-totalPaid+0).toFixed(0) }; },
    steps: function(v) { var r=v.rate/100/12; var pmt=v.payment+v.extra; return ['Formula: Each month: interest = balance × r, principal = payment − interest','Step 1: Monthly rate = '+v.rate+'%/12 = '+(r*100).toFixed(4)+'%','Step 2: Total payment = $'+v.payment+' + $'+v.extra+' = $'+pmt,'Step 3: Simulate until balance = $0','Step 4: Result shows months and interest saved vs minimum payments']; } },

  { id: 'retirement-withdrawal', name: 'Retirement Withdrawal Calculator', desc: '4% rule and custom withdrawal rate', kw: 'retirement withdrawal calculator 4 percent rule',
    inputs: [{id:'fund',label:'Retirement Fund ($)',type:'number',def:1000000},{id:'rate',label:'Withdrawal Rate (%)',type:'number',def:4},{id:'returnRate',label:'Annual Return (%)',type:'number',def:6},{id:'years',label:'Retirement Years',type:'number',def:30}],
    calc: function(v) { var annual = v.fund * (v.rate/100); var r = v.returnRate/100; var balance = v.fund; var depleted = false; for(var t=0; t<v.years; t++) { balance = balance*(1+r) - annual; if(balance <= 0) { depleted = true; break; } } return { result: 'Annual withdrawal: $' + annual.toLocaleString(), chart: Charts.donut([annual, v.fund-annual], ['Annual','Remaining']), extra: depleted ? 'Fund depleted after ~'+(t+1)+' years' : 'Fund survives '+v.years+' years with $'+Math.round(balance).toLocaleString()+' left' }; },
    steps: function(v) { var a=v.fund*(v.rate/100); return ['Step 1: Annual withdrawal = $'+v.fund+' × '+v.rate+'% = $'+a.toLocaleString(),'Step 2: Monthly = $'+(a/12).toFixed(2),'Step 3: Simulate growth (return '+v.returnRate+'%) minus withdrawal over '+v.years+' years','Step 4: Check if fund lasts the full period']; } },

  { id: 'inflation-adjusted', name: 'Inflation Adjusted Return', desc: 'Calculate real return after inflation', kw: 'inflation adjusted return calculator real return',
    inputs: [{id:'nominal',label:'Nominal Return (%)',type:'number',def:8},{id:'inflation',label:'Inflation Rate (%)',type:'number',def:3}],
    calc: function(v) { var real = ((1 + v.nominal/100) / (1 + v.inflation/100) - 1) * 100; var approx = v.nominal - v.inflation; return { result: 'Real return: ' + real.toFixed(2) + '%', chart: Charts.bar([v.nominal, approx, real], ['Nominal','Approx','Exact']), extra: 'Approx (nominal−inflation): ' + approx.toFixed(2) + '%' }; },
    steps: function(v) { var real=((1+v.nominal/100)/(1+v.inflation/100)-1)*100; return ['Formula: Real = ((1 + nominal) / (1 + inflation)) - 1','Step 1: 1 + nominal = '+(1+v.nominal/100),'Step 2: 1 + inflation = '+(1+v.inflation/100),'Step 3: Real = ('+(1+v.nominal/100)+' / '+(1+v.inflation/100)+') - 1','Step 4: Real return = '+real.toFixed(2)+'%']; } },

  { id: 'tax-equivalent-yield', name: 'Tax Equivalent Yield', desc: 'Compare muni bonds to taxable bonds', kw: 'tax equivalent yield calculator municipal bond',
    inputs: [{id:'muniYield',label:'Municipal Bond Yield (%)',type:'number',def:3},{id:'taxRate',label:'Your Tax Rate (%)',type:'number',def:24}],
    calc: function(v) { var tey = v.muniYield / (1 - v.taxRate/100); return { result: 'Tax-Equivalent Yield: ' + tey.toFixed(2) + '%', chart: Charts.bar([v.muniYield, tey], ['Muni','Tax-Equiv']), extra: 'Break-even taxable rate: ' + v.muniYield.toFixed(2) + '%' }; },
    steps: function(v) { var tey=v.muniYield/(1-v.taxRate/100); return ['Formula: TEY = Muni Yield / (1 − Tax Rate)','Step 1: 1 − '+v.taxRate+'% = '+(1-v.taxRate/100).toFixed(4),'Step 2: TEY = '+v.muniYield+'% / '+(1-v.taxRate/100).toFixed(4),'Step 3: TEY = '+tey.toFixed(2)+'%','Step 4: A taxable bond must yield ≥ '+tey.toFixed(2)+'% to match']; } },

  { id: '529-plan', name: '529 Plan Calculator', desc: 'Education savings growth projections', kw: '529 plan calculator education savings',
    inputs: [{id:'balance',label:'Current Balance',type:'number',def:10000},{id:'monthly',label:'Monthly Contribution',type:'number',def:300},{id:'rate',label:'Annual Return (%)',type:'number',def:7},{id:'years',label:'Years Until College',type:'number',def:10}],
    calc: function(v) { var r = v.rate/100/12; var total = v.balance; for(var m=0; m<v.years*12; m++) total = (total + v.monthly) * (1+r); var contrib = v.balance + v.monthly * v.years * 12; var growth = total - contrib; return { result: 'Projected: $' + Math.round(total).toLocaleString(), chart: Charts.donut([contrib, growth], ['Contributions','Growth']), extra: 'Contributions: $'+contrib.toLocaleString()+' | Growth: $'+Math.round(growth).toLocaleString() }; },
    steps: function(v) { return ['Step 1: Starting balance $'+v.balance.toLocaleString(),'Step 2: Add $'+v.monthly+'/month for '+v.years*12+' months','Step 3: Compound monthly at '+v.rate+'%/12','Step 4: Projected balance at college start']; } },

  { id: 'times-interest-earned', name: 'Times Interest Earned', desc: 'Ability to pay interest expenses', kw: 'times interest earned ratio calculator',
    inputs: [{id:'ebit',label:'EBIT ($)',type:'number',def:200000},{id:'interest',label:'Interest Expense ($)',type:'number',def:30000}],
    calc: function(v) { var tie = v.ebit / v.interest; var rating = tie >= 3 ? 'Strong' : tie >= 1.5 ? 'Adequate' : 'Weak'; return { result: 'TIE: ' + tie.toFixed(2) + 'x', chart: Charts.gauge(tie, 10), extra: 'Rating: ' + rating + ' | Coverage: ' + tie.toFixed(1) + 'x interest' }; },
    steps: function(v) { return ['Formula: TIE = EBIT / Interest Expense','Step 1: $'+v.ebit.toLocaleString()+' / $'+v.interest.toLocaleString(),'Step 2: TIE = '+(v.ebit/v.interest).toFixed(2)+'x',v.ebit/v.interest>=3?'Result: Strong (≥3x)':'Result: '+((v.ebit/v.interest>=1.5)?'Adequate':'Weak')]; } },

  { id: 'quick-ratio', name: 'Quick Ratio Calculator', desc: 'Acid-test ratio for liquidity', kw: 'quick ratio calculator acid test ratio',
    inputs: [{id:'cash',label:'Cash & Equivalents',type:'number',def:50000},{id:'receivables',label:'Accounts Receivable',type:'number',def:30000},{id:'currentLiab',label:'Current Liabilities',type:'number',def:100000}],
    calc: function(v) { var qr = (v.cash + v.receivables) / v.currentLiab; var rating = qr >= 1 ? 'Healthy' : qr >= 0.5 ? 'Marginal' : 'Concerning'; return { result: 'Quick Ratio: ' + qr.toFixed(2), chart: Charts.gauge(qr, 3), extra: 'Rating: ' + rating }; },
    steps: function(v) { var qr=(v.cash+v.receivables)/v.currentLiab; return ['Formula: Quick Ratio = (Cash + Receivables) / Current Liabilities','Step 1: Quick assets = $'+v.cash.toLocaleString()+' + $'+v.receivables.toLocaleString()+' = $'+(v.cash+v.receivables).toLocaleString(),'Step 2: $'+(v.cash+v.receivables).toLocaleString()+' / $'+v.currentLiab.toLocaleString(),'Step 3: Quick Ratio = '+qr.toFixed(2)]; } },

  { id: 'ebitda', name: 'EBITDA Calculator', desc: 'Earnings before interest, taxes, depreciation', kw: 'ebitda calculator',
    inputs: [{id:'revenue',label:'Revenue',type:'number',def:2000000},{id:'cogs',label:'COGS',type:'number',def:800000},{id:'opex',label:'Operating Expenses',type:'number',def:500000},{id:'depreciation',label:'Depreciation',type:'number',def:100000},{id:'amortization',label:'Amortization',type:'number',def:20000}],
    calc: function(v) { var ebitda = v.revenue - v.cogs - v.opex + v.depreciation + v.amortization; var margin = (ebitda / v.revenue) * 100; return { result: 'EBITDA: $' + ebitda.toLocaleString(), chart: Charts.donut([v.cogs, v.opex, ebitda], ['COGS','OpEx','EBITDA']), extra: 'Margin: ' + margin.toFixed(1) + '%' }; },
    steps: function(v) { var e=v.revenue-v.cogs-v.opex+v.depreciation+v.amortization; return ['Formula: EBITDA = Revenue − COGS − OpEx + Depreciation + Amortization','Step 1: $'+v.revenue.toLocaleString()+' − $'+v.cogs.toLocaleString()+' − $'+v.opex.toLocaleString(),'Step 2: + $'+v.depreciation.toLocaleString()+' + $'+v.amortization.toLocaleString(),'Step 3: EBITDA = $'+e.toLocaleString()]; } },

  { id: 'enterprise-value', name: 'Enterprise Value Calculator', desc: 'Total value of a company', kw: 'enterprise value calculator ev',
    inputs: [{id:'mktCap',label:'Market Cap ($)',type:'number',def:5000000},{id:'debt',label:'Total Debt ($)',type:'number',def:1000000},{id:'cash',label:'Cash & Equivalents ($)',type:'number',def:500000},{id:'minority',label:'Minority Interest ($)',type:'number',def:0},{id:'preferred',label:'Preferred Equity ($)',type:'number',def:0}],
    calc: function(v) { var ev = v.mktCap + v.debt - v.cash + v.minority + v.preferred; return { result: 'Enterprise Value: $' + ev.toLocaleString(), chart: Charts.bar([v.mktCap, v.debt, v.cash, ev], ['Mkt Cap','Debt','Cash','EV']), extra: 'EV/EBITDA context depends on EBITDA' }; },
    steps: function(v) { var ev=v.mktCap+v.debt-v.cash+v.minority+v.preferred; return ['Formula: EV = Market Cap + Debt − Cash + Minority + Preferred','Step 1: $'+v.mktCap.toLocaleString()+' + $'+v.debt.toLocaleString(),'Step 2: − $'+v.cash.toLocaleString()+' + $'+v.minority+' + $'+v.preferred,'Step 3: EV = $'+ev.toLocaleString()]; } },

  { id: 'wacc', name: 'WACC Calculator', desc: 'Weighted Average Cost of Capital', kw: 'wacc calculator weighted average cost of capital',
    inputs: [{id:'equityValue',label:'Market Value of Equity ($)',type:'number',def:5000000},{id:'debtValue',label:'Market Value of Debt ($)',type:'number',def:2000000},{id:'costEquity',label:'Cost of Equity (%)',type:'number',def:12},{id:'costDebt',label:'Cost of Debt (%)',type:'number',def:5},{id:'taxRate',label:'Tax Rate (%)',type:'number',def:25}],
    calc: function(v) { var total = v.equityValue + v.debtValue; var wE = v.equityValue / total; var wD = v.debtValue / total; var wacc = wE * v.costEquity + wD * v.costDebt * (1 - v.taxRate/100); return { result: 'WACC: ' + wacc.toFixed(2) + '%', chart: Charts.donut([wE*100, wD*100], ['Equity '+(wE*100).toFixed(0)+'%','Debt '+(wD*100).toFixed(0)+'%']), extra: 'After-tax cost of debt: ' + (v.costDebt*(1-v.taxRate/100)).toFixed(2) + '%' }; },
    steps: function(v) { var t=v.equityValue+v.debtValue; var wE=v.equityValue/t; var wD=v.debtValue/t; var wacc=wE*v.costEquity+wD*v.costDebt*(1-v.taxRate/100); return ['Step 1: Total value = $'+v.equityValue.toLocaleString()+' + $'+v.debtValue.toLocaleString()+' = $'+t.toLocaleString(),'Step 2: wE = '+(wE*100).toFixed(1)+'%, wD = '+(wD*100).toFixed(1)+'%','Step 3: After-tax debt cost = '+v.costDebt+'% × (1−'+v.taxRate+'%) = '+(v.costDebt*(1-v.taxRate/100)).toFixed(2)+'%','Step 4: WACC = '+wE.toFixed(4)+' × '+v.costEquity+'% + '+wD.toFixed(4)+' × '+(v.costDebt*(1-v.taxRate/100)).toFixed(2)+'%','Step 5: WACC = '+wacc.toFixed(2)+'%']; } },

  { id: 'sharpe-ratio', name: 'Sharpe Ratio Calculator', desc: 'Risk-adjusted return metric', kw: 'sharpe ratio calculator risk adjusted return',
    inputs: [{id:'returnRate',label:'Portfolio Return (%)',type:'number',def:12},{id:'riskFree',label:'Risk-Free Rate (%)',type:'number',def:4},{id:'stdDev',label:'Portfolio Std Dev (%)',type:'number',def:15}],
    calc: function(v) { var sharpe = (v.returnRate - v.riskFree) / v.stdDev; var rating = sharpe >= 1 ? 'Good' : sharpe >= 0.5 ? 'Adequate' : 'Poor'; return { result: 'Sharpe Ratio: ' + sharpe.toFixed(3), chart: Charts.gauge(sharpe, 3), extra: 'Excess return per unit risk: ' + rating }; },
    steps: function(v) { var s=(v.returnRate-v.riskFree)/v.stdDev; return ['Formula: Sharpe = (Rp − Rf) / σp','Step 1: Excess return = '+v.returnRate+'% − '+v.riskFree+'% = '+(v.returnRate-v.riskFree)+'%','Step 2: '+(v.returnRate-v.riskFree)+'% / '+v.stdDev+'%','Step 3: Sharpe = '+s.toFixed(3)]; } },

  { id: 'geometric-mean', name: 'Geometric Mean Return', desc: 'Compound annual growth rate of returns', kw: 'geometric mean return calculator cagr',
    inputs: [{id:'returns',label:'Annual Returns (comma sep %)',type:'text',def:'10,-5,15,8,-3,12'}],
    calc: function(v) { var arr = v.returns.split(',').map(Number); var product = 1; arr.forEach(function(r) { product *= (1 + r/100); }); var geoMean = (Math.pow(product, 1/arr.length) - 1) * 100; var arithMean = arr.reduce(function(a,b){return a+b;},0) / arr.length; return { result: 'Geometric Mean: ' + geoMean.toFixed(2) + '%', chart: Charts.bar([arithMean, geoMean], ['Arithmetic','Geometric']), extra: 'Arithmetic mean: ' + arithMean.toFixed(2) + '%' }; },
    steps: function(v) { var arr=v.returns.split(',').map(Number); var p=1; arr.forEach(function(r){p*=(1+r/100);}); var g=(Math.pow(p,1/arr.length)-1)*100; return ['Step 1: Product = '+(arr.map(function(r){return '(1+'+r+'%)';}).join(' × ')),'Step 2: Product = '+p.toFixed(6),'Step 3: Geometric mean = product^(1/n) − 1','Step 4: = '+p.toFixed(6)+'^(1/'+arr.length+') − 1 = '+g.toFixed(2)+'%']; } },

  { id: 'debt-snowball', name: 'Debt Snowball Calculator', desc: 'Pay off smallest debts first strategy', kw: 'debt snowball calculator debt payoff strategy',
    inputs: [{id:'debts',label:'Debts (balance,rate,minPayment comma sep)',type:'text',def:'5000,18,200;3000,22,150;8000,6,100;2000,15,100'},{id:'extraBudget',label:'Extra Monthly Budget',type:'number',def:300}],
    calc: function(v) { var debts = v.debts.split(';').map(function(d) { var p = d.split(','); return { balance: parseFloat(p[0]), rate: parseFloat(p[1]), payment: parseFloat(p[2]) }; }); debts.sort(function(a,b){return a.balance-b.balance;}); var totalInterest = 0; var months = 0; var details = []; while(debts.some(function(d){return d.balance>0;}) && months < 600) { months++; var extra = v.extraBudget; debts.forEach(function(d) { if(d.balance <= 0) return; var int = d.balance * d.rate / 100 / 12; totalInterest += int; var pay = Math.min(d.payment + (extra > 0 ? Math.min(extra, d.balance + int) : 0), d.balance + int); d.balance = d.balance + int - pay; extra = Math.max(0, extra - Math.max(0, pay - d.payment)); }); } return { result: 'Payoff: ' + months + ' months', chart: Charts.donut([debts.reduce(function(a,d){return a+d.balance<0?a:0;},0), totalInterest], ['Remaining','Total Interest']), extra: 'Total interest: $' + totalInterest.toFixed(0) }; },
    steps: function(v) { return ['Step 1: List debts smallest balance first','Step 2: Pay minimum on all debts','Step 3: Apply extra budget to smallest balance','Step 4: When smallest paid off, roll payment to next','Step 5: Repeat until all debts are $0']; } },

  { id: 'payday-loan-cost', name: 'Payday Loan Cost Calculator', desc: 'True annualized cost of payday loans', kw: 'payday loan cost calculator true cost',
    inputs: [{id:'amount',label:'Loan Amount ($)',type:'number',def:500},{id:'fee',label:'Fee per $100 ($)',type:'number',def:15},{id:'days',label:'Days Until Payday',type:'number',def:14}],
    calc: function(v) { var totalFee = (v.amount / 100) * v.fee; var apr = (totalFee / v.amount) * (365 / v.days) * 100; return { result: 'APR: ' + apr.toFixed(1) + '%', chart: Charts.donut([v.amount, totalFee], ['Principal','Fee']), extra: 'Total repayment: $'+(v.amount+totalFee).toFixed(2)+' | Fee: $'+totalFee.toFixed(2) }; },
    steps: function(v) { var f=(v.amount/100)*v.fee; var apr=(f/v.amount)*(365/v.days)*100; return ['Step 1: Fee = ($'+v.amount+' / $100) × $'+v.fee+' = $'+f.toFixed(2),'Step 2: APR = (Fee / Principal) × (365 / Days) × 100','Step 3: = ($'+f.toFixed(2)+' / $'+v.amount+') × (365 / '+v.days+') × 100','Step 4: APR = '+apr.toFixed(1)+'%']; } },

  { id: 'emergency-fund-rate', name: 'Emergency Fund Growth', desc: 'How emergency savings grow in HYSA', kw: 'emergency fund growth high yield savings calculator',
    inputs: [{id:'monthly',label:'Monthly Deposit ($)',type:'number',def:500},{id:'rate',label:'APY (%)',type:'number',def:4.5},{id:'months',label:'Months',type:'number',def:24}],
    calc: function(v) { var r = v.rate/100/12; var total = 0; for(var m=0; m<v.months; m++) total = (total + v.monthly) * (1+r); var contrib = v.monthly * v.months; var growth = total - contrib; return { result: 'Balance: $' + total.toFixed(2), chart: Charts.donut([contrib, growth], ['Deposits','Interest']), extra: 'Contributions: $'+contrib.toLocaleString()+' | Interest: $'+growth.toFixed(2) }; },
    steps: function(v) { return ['Step 1: Deposit $'+v.monthly+'/month at '+v.rate+'% APY','Step 2: Compound monthly for '+v.months+' months','Step 3: Total deposits = $'+(v.monthly*v.months).toLocaleString(),'Step 4: Interest earned adds to balance each month']; } },

  { id: 'property-tax', name: 'Property Tax Calculator', desc: 'Annual property tax estimate', kw: 'property tax calculator annual estimate',
    inputs: [{id:'value',label:'Property Value ($)',type:'number',def:350000},{id:'rate',label:'Tax Rate (%)',type:'number',def:1.2}],
    calc: function(v) { var tax = v.value * v.rate / 100; return { result: 'Annual Tax: $' + tax.toLocaleString(undefined,{maximumFractionDigits:0}), chart: Charts.donut([v.value-tax*100/v.rate, tax], ['Property','Tax']), extra: 'Monthly: $'+(tax/12).toFixed(2)+' | Daily: $'+(tax/365).toFixed(2) }; },
    steps: function(v) { var t=v.value*v.rate/100; return ['Formula: Tax = Value × Rate','Step 1: $'+v.value.toLocaleString()+' × '+v.rate+'%','Step 2: $'+v.value.toLocaleString()+' × '+(v.rate/100),'Step 3: Annual tax = $'+t.toLocaleString(undefined,{maximumFractionDigits:0}),'Step 4: Monthly = $'+(t/12).toFixed(2)]; } },

  { id: 'closing-costs', name: 'Closing Costs Calculator', desc: 'Estimate total closing costs for home purchase', kw: 'closing costs calculator home purchase',
    inputs: [{id:'price',label:'Home Price ($)',type:'number',def:300000},{id:'down',label:'Down Payment (%)',type:'number',def:20},{id:'rate',label:'Mortgage Rate (%)',type:'number',def:6.5},{id:'points',label:'Discount Points',type:'number',def:0}],
    calc: function(v) { var loan = v.price * (1 - v.down/100); var titleIns = v.price * 0.005; var appraisal = 500; var origination = loan * 0.005; var recording = 250; var escrow = 2500; var points = loan * v.points * 0.01; var total = titleIns + appraisal + origination + recording + escrow + points; return { result: 'Closing Costs: ~$' + Math.round(total).toLocaleString(), chart: Charts.donut([total, v.price*v.down/100], ['Closing','Down Payment']), extra: (total/v.price*100).toFixed(1)+'% of price | Monthly impact: ~$'+(total/360).toFixed(0) }; },
    steps: function(v) { return ['Step 1: Title insurance ~0.5% of price','Step 2: Appraisal ~$500','Step 3: Loan origination ~0.5% of loan','Step 4: Recording + escrow deposits','Step 5: Discount points (if any) = '+v.points+' × loan amount']; } },

  { id: 'cap-rate', name: 'Cap Rate Calculator', desc: 'Capitalization rate for real estate', kw: 'cap rate calculator capitalization rate real estate',
    inputs: [{id:'noi',label:'Net Operating Income ($)',type:'number',def:24000},{id:'value',label:'Property Value ($)',type:'number',def:300000}],
    calc: function(v) { var capRate = (v.noi / v.value) * 100; return { result: 'Cap Rate: ' + capRate.toFixed(2) + '%', chart: Charts.gauge(capRate, 15), extra: 'Value from NOI: $'+Math.round(v.noi/(capRate/100)).toLocaleString() }; },
    steps: function(v) { var cr=(v.noi/v.value)*100; return ['Formula: Cap Rate = NOI / Property Value × 100','Step 1: $'+v.noi.toLocaleString()+' / $'+v.value.toLocaleString(),'Step 2: = '+(v.noi/v.value).toFixed(4),'Step 3: Cap Rate = '+cr.toFixed(2)+'%']; } },

  { id: 'student-loan-repayment', name: 'Student Loan Repayment', desc: 'Standard repayment plan calculator', kw: 'student loan repayment calculator standard plan',
    inputs: [{id:'balance',label:'Loan Balance ($)',type:'number',def:35000},{id:'rate',label:'Interest Rate (%)',type:'number',def:5.5},{id:'years',label:'Repayment Term (yrs)',type:'number',def:10}],
    calc: function(v) { var r = v.rate/100/12; var n = v.years*12; var pmt = v.balance * r * Math.pow(1+r,n) / (Math.pow(1+r,n)-1); var total = pmt * n; var interest = total - v.balance; return { result: 'Monthly: $' + pmt.toFixed(2), chart: Charts.donut([v.balance, interest], ['Principal','Interest']), extra: 'Total: $'+total.toFixed(0)+' | Interest: $'+interest.toFixed(0) }; },
    steps: function(v) { var r=v.rate/100/12; var n=v.years*12; var pmt=v.balance*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1); return ['Formula: PMT = P × r(1+r)^n / ((1+r)^n − 1)','Step 1: r = '+v.rate+'%/12 = '+r.toFixed(6),'Step 2: n = '+v.years+'×12 = '+n,'Step 3: PMT = $'+v.balance+' × '+r.toFixed(6)+' × '+(Math.pow(1+r,n)).toFixed(2)+' / '+(Math.pow(1+r,n)-1).toFixed(2),'Step 4: Monthly = $'+pmt.toFixed(2)]; } },

  { id: 'cost-of-debt', name: 'Cost of Debt Calculator', desc: 'After-tax cost of borrowing', kw: 'after tax cost of debt calculator',
    inputs: [{id:'interestRate',label:'Pre-tax Interest Rate (%)',type:'number',def:6},{id:'taxRate',label:'Tax Rate (%)',type:'number',def:25}],
    calc: function(v) { var afterTax = v.interestRate * (1 - v.taxRate/100); return { result: 'After-Tax Cost: ' + afterTax.toFixed(2) + '%', chart: Charts.bar([v.interestRate, afterTax], ['Pre-Tax','After-Tax']), extra: 'Tax shield: ' + (v.interestRate - afterTax).toFixed(2) + '%' }; },
    steps: function(v) { var a=v.interestRate*(1-v.taxRate/100); return ['Formula: After-tax cost = Rate × (1 − Tax Rate)','Step 1: 1 − '+v.taxRate+'% = '+(1-v.taxRate/100),'Step 2: '+v.interestRate+'% × '+(1-v.taxRate/100),'Step 3: After-tax cost = '+a.toFixed(2)+'%']; } },

  { id: 'fha-loan', name: 'FHA Loan Calculator', desc: 'FHA mortgage with MIP insurance', kw: 'fha loan calculator mortgage mip',
    inputs: [{id:'price',label:'Home Price ($)',type:'number',def:250000},{id:'down',label:'Down Payment (%)',type:'number',def:3.5},{id:'rate',label:'Interest Rate (%)',type:'number',def:6.5},{id:'term',label:'Loan Term (yrs)',type:'number',def:30}],
    calc: function(v) { var loan = v.price * (1 - v.down/100); var upMIP = loan * 0.0175; var r = v.rate/100/12; var n = v.term*12; var pmt = loan * r * Math.pow(1+r,n)/(Math.pow(1+r,n)-1); var monthlyMIP = loan * 0.0055 / 12; var total = pmt + monthlyMIP; return { result: 'Total Monthly: $' + total.toFixed(2), chart: Charts.donut([pmt, monthlyMIP], ['P&I','MIP']), extra: 'Upfront MIP: $'+upMIP.toFixed(0)+' | Loan: $'+loan.toLocaleString() }; },
    steps: function(v) { return ['Step 1: Loan = $'+v.price+' × (1−'+v.down+'%) = $'+(v.price*(1-v.down/100)).toLocaleString(),'Step 2: Upfront MIP = 1.75% of loan','Step 3: P&I = standard amortization at '+v.rate+'%','Step 4: Annual MIP = 0.55% ÷ 12 per month']; } },

  { id: 'va-loan', name: 'VA Loan Calculator', desc: 'VA mortgage with no down payment', kw: 'va loan calculator veteran mortgage',
    inputs: [{id:'price',label:'Home Price ($)',type:'number',def:350000},{id:'rate',label:'Interest Rate (%)',type:'number',def:6.25},{id:'term',label:'Loan Term (yrs)',type:'number',def:30},{id:'funding',label:'Funding Fee (%)',type:'number',def:2.15}],
    calc: function(v) { var loan = v.price + v.price * v.funding/100; var r = v.rate/100/12; var n = v.term*12; var pmt = loan * r * Math.pow(1+r,n)/(Math.pow(1+r,n)-1); return { result: 'Monthly: $' + pmt.toFixed(2), chart: Charts.donut([v.price, v.price*v.funding/100], ['Home','Funding Fee']), extra: 'Total loan: $'+loan.toLocaleString()+' | VA: No PMI, no down payment' }; },
    steps: function(v) { var l=v.price+v.price*v.funding/100; return ['Step 1: VA loan = $'+v.price+' + funding fee '+v.funding+'%','Step 2: Total financed = $'+l.toLocaleString(),'Step 3: Standard amortization at '+v.rate+'% for '+v.term+' years','Step 4: No PMI required (VA benefit)']; } },

  { id: 'reverse-mortgage', name: 'Reverse Mortgage Calculator', desc: 'Home equity conversion for retirees', kw: 'reverse mortgage calculator home equity',
    inputs: [{id:'homeValue',label:'Home Value ($)',type:'number',def:400000},{id:'age',label:'Borrower Age',type:'number',def:65},{id:'rate',label:'Interest Rate (%)',type:'number',def:6},{id:'years',label:'Draw Period (yrs)',type:'number',def:15}],
    calc: function(v) { var ltv = Math.min(0.5, Math.max(0.25, 0.5 - (v.age - 62) * 0.005 + 0.15)); var maxLoan = v.homeValue * ltv; var r = v.rate/100/12; var monthly = maxLoan * r * Math.pow(1+r,v.years*12) / (Math.pow(1+r,v.years*12)-1); return { result: 'Max loan: $'+maxLoan.toLocaleString(), chart: Charts.donut([maxLoan, v.homeValue-maxLoan], ['Loan','Equity Retained']), extra: 'Monthly draw: ~$'+monthly.toFixed(0)+' | LTV: '+(ltv*100).toFixed(0)+'%' }; },
    steps: function(v) { return ['Step 1: Age-based LTV factor (older = higher %)','Step 2: Max loan = home value × LTV factor','Step 3: Interest accrues on outstanding balance','Step 4: Repayment when home sold or borrower moves out']; } },

  { id: 'house-affordability', name: 'House Affordability Calculator', desc: 'Max home price based on income and debts', kw: 'house affordability calculator how much house can i afford',
    inputs: [{id:'income',label:'Annual Gross Income ($)',type:'number',def:80000},{id:'monthlyDebt',label:'Monthly Debt Payments ($)',type:'number',def:500},{id:'down',label:'Down Payment ($)',type:'number',def:40000},{id:'rate',label:'Mortgage Rate (%)',type:'number',def:6.5},{id:'dti',label:'Max DTI (%)',type:'number',def:36}],
    calc: function(v) { var maxMortgagePmt = (v.income/12) * (v.dti/100) - v.monthlyDebt; var r = v.rate/100/12; var n = 360; var maxLoan = maxMortgagePmt > 0 ? maxMortgagePmt * (Math.pow(1+r,n)-1) / (r * Math.pow(1+r,n)) : 0; var maxPrice = maxLoan + v.down; return { result: 'Max home: $' + Math.round(maxPrice).toLocaleString(), chart: Charts.donut([maxLoan, v.down], ['Loan','Down']), extra: 'Max mortgage: $'+Math.round(maxLoan).toLocaleString()+' | Payment: $'+maxMortgagePmt.toFixed(0)+'/mo' }; },
    steps: function(v) { var p=(v.income/12)*(v.dti/100)-v.monthlyDebt; return ['Step 1: Max mortgage payment = ($'+v.income.toLocaleString()+'/12) × '+v.dti+'% − $'+v.monthlyDebt,'Step 2: = $'+p.toFixed(0)+'/month','Step 3: Max loan from payment at '+v.rate+'% for 30 years','Step 4: Max price = loan + $'+v.down.toLocaleString()+' down']; } },

  { id: 'mortgage-refinance', name: 'Mortgage Refinance Calculator', desc: 'Savings from refinancing your mortgage', kw: 'mortgage refinance calculator should i refinance savings',
    inputs: [{id:'currentBalance',label:'Current Loan Balance ($)',type:'number',def:250000},{id:'currentRate',label:'Current Rate (%)',type:'number',def:6.5},{id:'newRate',label:'New Rate (%)',type:'number',def:5.5},{id:'newTerm',label:'New Term (yrs)',type:'number',def:30},{id:'closingCosts',label:'Closing Costs ($)',type:'number',def:3000}],
    calc: function(v) { var r1 = v.currentRate/100/12; var r2 = v.newRate/100/12; var n = v.newTerm*12; var pmt1 = v.currentBalance * r1 * Math.pow(1+r1,360)/(Math.pow(1+r1,360)-1); var pmt2 = v.currentBalance * r2 * Math.pow(1+r2,n)/(Math.pow(1+r2,n)-1); var saving = pmt1 - pmt2; var payback = saving > 0 ? Math.ceil(v.closingCosts / saving) : Infinity; return { result: 'Save $'+saving.toFixed(2)+'/mo', chart: Charts.bar([pmt1, pmt2], ['Current','New']), extra: 'Breakeven: '+payback+' months | Net savings over '+v.newTerm+' yrs: $'+Math.max(0,saving*n-v.closingCosts).toFixed(0) }; },
    steps: function(v) { return ['Step 1: Current payment at '+v.currentRate+'%','Step 2: New payment at '+v.newRate+'% for '+v.newTerm+' years','Step 3: Monthly savings = current − new','Step 4: Breakeven = closing costs ÷ monthly savings']; } },

  { id: 'crypto-gains', name: 'Crypto Gains Calculator', desc: 'Profit/loss on cryptocurrency trades', kw: 'crypto gains calculator cryptocurrency profit loss',
    inputs: [{id:'buyPrice',label:'Buy Price ($)',type:'number',def:30000},{id:'sellPrice',label:'Sell Price ($)',type:'number',def:45000},{id:'quantity',label:'Quantity (coins)',type:'number',def:0.5},{id:'fee',label:'Trading Fee (%)',type:'number',def:0.1}],
    calc: function(v) { var costBasis = v.buyPrice * v.quantity; var proceeds = v.sellPrice * v.quantity; var fee = (costBasis + proceeds) * v.fee / 100; var gain = proceeds - costBasis - fee; var pct = (gain / costBasis) * 100; return { result: (gain >= 0 ? 'Profit: ' : 'Loss: ') + '$' + Math.abs(gain).toFixed(2), chart: Charts.donut([costBasis, Math.max(0,gain), fee], ['Cost','Profit','Fees']), extra: 'Return: '+pct.toFixed(2)+'% | Fees: $'+fee.toFixed(2) }; },
    steps: function(v) { var c=v.buyPrice*v.quantity; var p=v.sellPrice*v.quantity; var f=(c+p)*v.fee/100; return ['Step 1: Cost basis = $'+v.buyPrice+' × '+v.quantity+' = $'+c.toFixed(2),'Step 2: Proceeds = $'+v.sellPrice+' × '+v.quantity+' = $'+p.toFixed(2),'Step 3: Fees = ($'+c.toFixed(2)+' + $'+p.toFixed(2)+') × '+v.fee+'% = $'+f.toFixed(2),'Step 4: Gain = $'+p.toFixed(2)+' − $'+c.toFixed(2)+' − $'+f.toFixed(2)+' = $'+(p-c-f).toFixed(2)]; } },

  { id: 'price-to-earnings', name: 'P/E Ratio Calculator', desc: 'Price-to-earnings ratio for stocks', kw: 'pe ratio calculator price to earnings stock',
    inputs: [{id:'price',label:'Share Price ($)',type:'number',def:150},{id:'eps',label:'Earnings Per Share ($)',type:'number',def:8}],
    calc: function(v) { var pe = v.price / v.eps; var implied = pe * v.eps; return { result: 'P/E Ratio: ' + pe.toFixed(2), chart: Charts.gauge(pe, 50), extra: 'Implied earnings value: $'+implied.toFixed(2) }; },
    steps: function(v) { return ['Formula: P/E = Price / EPS','Step 1: $'+v.price+' / $'+v.eps,'Step 2: P/E = '+(v.price/v.eps).toFixed(2),'Step 3: Interpretation: investors pay $'+(v.price/v.eps).toFixed(2)+' per $1 of earnings']; } },

  { id: 'dividend-discount', name: 'Dividend Discount Model', desc: 'Stock value from future dividends', kw: 'dividend discount model calculator ddm gordon growth',
    inputs: [{id:'dividend',label:'Annual Dividend ($)',type:'number',def:3},{id:'growth',label:'Dividend Growth (%)',type:'number',def:5},{id:'requiredReturn',label:'Required Return (%)',type:'number',def:10}],
    calc: function(v) { var g = v.growth/100; var k = v.requiredReturn/100; if(k <= g) return { result: 'Invalid: required return must exceed growth', chart: '', extra: 'Gordon model: value = D₁ / (k − g), requires k > g' }; var value = v.dividend * (1+g) / (k - g); return { result: 'Fair Value: $' + value.toFixed(2), chart: Charts.gauge(value, value*2), extra: 'D₁ = $'+(v.dividend*(1+g)).toFixed(2)+' | k−g = '+(k-g).toFixed(4) }; },
    steps: function(v) { var g=v.growth/100; var k=v.requiredReturn/100; var d1=v.dividend*(1+g); var v2=d1/(k-g); return ['Formula: V = D₁ / (k − g)','Step 1: D₁ = $'+v.dividend+' × (1+'+v.growth+'%) = $'+d1.toFixed(2),'Step 2: k − g = '+v.requiredReturn+'% − '+v.growth+'% = '+(k-g).toFixed(4),'Step 3: V = $'+d1.toFixed(2)+' / '+(k-g).toFixed(4),'Step 4: Fair value = $'+v2.toFixed(2)]; } },

  { id: 'margin-call', name: 'Margin Call Price Calculator', desc: 'Price at which margin call triggers', kw: 'margin call calculator stock price threshold',
    inputs: [{id:'buyPrice',label:'Buy Price ($)',type:'number',def:50},{id:'marginReq',label:'Maintenance Margin (%)',type:'number',def:25}],
    calc: function(v) { var callPrice = v.buyPrice * (1 - 0.5) / (1 - v.marginReq/100); return { result: 'Margin Call at: $' + callPrice.toFixed(2), chart: Charts.bar([v.buyPrice, callPrice], ['Buy Price','Call Price']), extra: 'Stock must stay above $'+callPrice.toFixed(2) }; },
    steps: function(v) { var cp=v.buyPrice*(1-0.5)/(1-v.marginReq/100); return ['Formula: P_call = P₀(1 − initial%) / (1 − maintenance%)','Step 1: Assuming 50% initial margin','Step 2: $'+v.buyPrice+' × 0.5 / '+(1-v.marginReq/100),'Step 3: Margin call at $'+cp.toFixed(2)]; } },

  { id: 'black-scholes', name: 'Black-Scholes Option Pricing', desc: 'European option price model', kw: 'black scholes option pricing calculator',
    inputs: [{id:'spot',label:'Spot Price ($)',type:'number',def:100},{id:'strike',label:'Strike Price ($)',type:'number',def:105},{id:'rate',label:'Risk-Free Rate (%)',type:'number',def:5},{id:'vol',label:'Volatility (%)',type:'number',def:20},{id:'time',label:'Time to Expiry (years)',type:'number',def:0.5}],
    calc: function(v) { var S=v.spot, K=v.strike, r=v.rate/100, sigma=v.vol/100, T=v.time; var d1=(Math.log(S/K)+(r+sigma*sigma/2)*T)/(sigma*Math.sqrt(T)); var d2=d1-sigma*Math.sqrt(T); function normcdf(x){var a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911;var sign=x<0?-1:1;x=Math.abs(x)/Math.sqrt(2);var t=1/(1+p*x);var y=1-((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);return 0.5*(1+sign*y);} var call=S*normcdf(d1)-K*Math.exp(-r*T)*normcdf(d2); var put=K*Math.exp(-r*T)*normcdf(-d2)-S*normcdf(-d1); return { result: 'Call: $'+call.toFixed(2)+' | Put: $'+put.toFixed(2), chart: Charts.bar([call, put], ['Call','Put']), extra: 'd₁='+d1.toFixed(4)+' | d₂='+d2.toFixed(4) }; },
    steps: function(v) { return ['Step 1: d₁ = (ln(S/K) + (r+σ²/2)T) / (σ√T)','Step 2: d₂ = d₁ − σ√T','Step 3: Call = S·N(d₁) − K·e^(-rT)·N(d₂)','Step 4: Put = K·e^(-rT)·N(−d₂) − S·N(−d₁)']; } },

  { id: 'bond-duration', name: 'Bond Duration Calculator', desc: 'Macaulay duration of a bond', kw: 'bond duration calculator macaulay modified duration',
    inputs: [{id:'face',label:'Face Value ($)',type:'number',def:1000},{id:'coupon',label:'Coupon Rate (%)',type:'number',def:5},{id:'yield',label:'Yield to Maturity (%)',type:'number',def:4},{id:'years',label:'Years to Maturity',type:'number',def:10}],
    calc: function(v) { var cp = v.face*(v.coupon/100); var y = v.yield/100; var price = 0; var weightedSum = 0; for(var t=1; t<=v.years; t++) { var pv = cp/Math.pow(1+y,t); price += pv; weightedSum += t * pv; } price += v.face/Math.pow(1+y,v.years); weightedSum += v.years * v.face/Math.pow(1+y,v.years); var macD = weightedSum / price; var modD = macD / (1+y); return { result: 'Macaulay: ' + macD.toFixed(2) + ' yrs', chart: Charts.bar([macD, modD], ['Macaulay','Modified']), extra: 'Modified Duration: ' + modD.toFixed(2) + ' | Price: $' + price.toFixed(2) }; },
    steps: function(v) { return ['Step 1: Calculate PV of each cash flow','Step 2: Weight each by time / price','Step 3: Macaulay Duration = sum of weighted times','Step 4: Modified Duration = MacD / (1 + yield)']; } },

  { id: 'growing-perpetuity', name: 'Growing Perpetuity Calculator', desc: 'PV of payments growing at constant rate', kw: 'growing perpetuity calculator constant growth',
    inputs: [{id:'payment',label:'Next Payment ($)',type:'number',def:10000},{id:'growth',label:'Growth Rate (%)',type:'number',def:3},{id:'rate',label:'Discount Rate (%)',type:'number',def:8}],
    calc: function(v) { var r = v.rate/100; var g = v.growth/100; if(r <= g) return { result: 'Invalid: rate must exceed growth', chart: '', extra: 'Requires discount rate > growth rate' }; var pv = v.payment / (r - g); return { result: 'PV: $' + pv.toLocaleString(), chart: Charts.gauge(pv, pv), extra: 'C/(r−g) = $'+v.payment+' / '+(r-g).toFixed(4) }; },
    steps: function(v) { var r=v.rate/100; var g=v.growth/100; return ['Formula: PV = C / (r − g)','Step 1: r = '+v.rate+'% = '+r+' | g = '+v.growth+'% = '+g,'Step 2: r − g = '+(r-g).toFixed(4),'Step 3: PV = $'+v.payment+' / '+(r-g).toFixed(4),'Step 4: PV = $'+(v.payment/(r-g)).toLocaleString()]; } },

  { id: 'tax-loss-harvest', name: 'Tax Loss Harvesting', desc: 'Offset capital gains with losses', kw: 'tax loss harvesting calculator offset gains losses',
    inputs: [{id:'gains',label:'Capital Gains ($)',type:'number',def:10000},{id:'losses',label:'Capital Losses ($)',type:'number',def:6000},{id:'taxRate',label:'Tax Rate (%)',type:'number',def:22}],
    calc: function(v) { var net = v.gains - v.losses; var taxSaved = Math.min(v.losses, v.gains) * v.taxRate / 100; var taxOwed = Math.max(0, net) * v.taxRate / 100; return { result: 'Tax saved: $'+taxSaved.toFixed(2), chart: Charts.donut([Math.max(0,net), v.losses, taxSaved], ['Net Gain','Losses Used','Tax Saved']), extra: 'Net gain: $'+net.toLocaleString()+' | Tax owed: $'+taxOwed.toFixed(2) }; },
    steps: function(v) { var n=v.gains-v.losses; return ['Step 1: Net = $'+v.gains.toLocaleString()+' − $'+v.losses.toLocaleString()+' = $'+n.toLocaleString(),'Step 2: Losses offset gains: min($'+v.losses+','+v.gains+') = $'+Math.min(v.losses,v.gains),'Step 3: Tax saved = $'+Math.min(v.losses,v.gains)+' × '+v.taxRate+'% = $'+(Math.min(v.losses,v.gains)*v.taxRate/100).toFixed(2),'Step 4: Remaining tax on $'+Math.max(0,n).toLocaleString()]; } },

  { id: 'savings-rate', name: 'Savings Rate Calculator', desc: 'What percentage of income you save', kw: 'savings rate calculator personal finance',
    inputs: [{id:'income',label:'Monthly Take-Home ($)',type:'number',def:5000},{id:'saved',label:'Amount Saved ($)',type:'number',def:1000}],
    calc: function(v) { var rate = (v.saved / v.income) * 100; var fireYears = rate >= 50 ? Math.round(17 * (1 - rate/100)) : rate > 0 ? Math.round(1.5 / (rate/100)) : Infinity; return { result: 'Savings Rate: ' + rate.toFixed(1) + '%', chart: Charts.donut([v.saved, v.income-v.saved], ['Saved','Spent']), extra: 'At this rate: ~'+fireYears+' years to financial independence (25× expenses)' }; },
    steps: function(v) { var r=(v.saved/v.income)*100; return ['Formula: Rate = Saved / Income × 100','Step 1: $'+v.saved+' / $'+v.income,'Step 2: = '+(v.saved/v.income).toFixed(4),'Step 3: Savings Rate = '+r.toFixed(1)+'%']; } },

  { id: 'envelope-budget', name: '50/30/20 Budget Calculator', desc: 'Split income into needs/wants/savings', kw: '50 30 20 budget calculator envelope method',
    inputs: [{id:'income',label:'Monthly Take-Home ($)',type:'number',def:4000}],
    calc: function(v) { var needs = v.income * 0.5; var wants = v.income * 0.3; var savings = v.income * 0.2; return { result: 'Needs: $'+needs+'/mo | Wants: $'+wants+'/mo | Save: $'+savings+'/mo', chart: Charts.donut([needs, wants, savings], ['Needs 50%','Wants 30%','Savings 20%']), extra: 'Daily: $'+(v.income/30).toFixed(2)+'/day budget' }; },
    steps: function(v) { return ['Step 1: Needs (50%) = $'+v.income+' × 0.5 = $'+(v.income*0.5).toLocaleString(),'Step 2: Wants (30%) = $'+v.income+' × 0.3 = $'+(v.income*0.3).toLocaleString(),'Step 3: Savings (20%) = $'+v.income+' × 0.2 = $'+(v.income*0.2).toLocaleString(),'Step 4: Allocate actual spending to each envelope']; } },

  { id: 'car-lease-calculator', name: 'Car Lease Payment Calculator', desc: 'Monthly lease payment estimation', kw: 'car lease payment calculator monthly lease estimate',
    inputs: [{id:'msrp',label:'MSRP ($)',type:'number',def:35000},{id:'cap',label:'Capitalized Cost ($)',type:'number',def:32000},{id:'residual',label:'Residual Value (%)',type:'number',def:55},{id:'rate',label:'Money Factor (×1000)',type:'number',def:5},{id:'term',label:'Lease Term (months)',type:'number',def:36}],
    calc: function(v) { var residualVal = v.msrp * v.residual / 100; var depreciation = (v.cap - residualVal) / v.term; var finance = (v.cap + residualVal) * v.rate / 100 / 12; var preTax = depreciation + finance; var tax = preTax * 0.08; var total = preTax + tax; return { result: 'Lease: $'+total.toFixed(2)+'/mo', chart: Charts.donut([depreciation, finance, tax], ['Depreciation','Finance','Tax']), extra: 'Due at signing: ~$'+(total*3+300).toFixed(0)+' (3 mo + fees)' }; },
    steps: function(v) { return ['Step 1: Residual = $'+v.msrp+' × '+v.residual+'% = $'+(v.msrp*v.residual/100).toFixed(0),'Step 2: Depreciation = ($'+v.cap+' − $'+(v.msrp*v.residual/100).toFixed(0)+') / '+v.term+' mo','Step 3: Finance = ($'+v.cap+' + residual) × MF / 12','Step 4: Add tax on monthly payment']; } },

  { id: 'cost-of-living', name: 'Cost of Living Calculator', desc: 'Compare costs between two cities', kw: 'cost of living calculator compare cities salary adjustment',
    inputs: [{id:'salary',label:'Current Salary ($)',type:'number',def:75000},{id:'fromIndex',label:'City A Cost Index',type:'number',def:100},{id:'toIndex',label:'City B Cost Index',type:'number',def:120}],
    calc: function(v) { var adjusted = v.salary * (v.toIndex / v.fromIndex); var diff = adjusted - v.salary; var pct = ((v.toIndex / v.fromIndex - 1) * 100); return { result: 'Equivalent: $'+Math.round(adjusted).toLocaleString(), chart: Charts.bar([v.salary, adjusted], ['Current','Equivalent']), extra: (diff >= 0 ? 'Need +$'+diff.toFixed(0)+'/yr more' : 'Saving $'+Math.abs(diff).toFixed(0)+'/yr') + ' ('+pct.toFixed(1)+'% diff)' }; },
    steps: function(v) { var a=v.salary*(v.toIndex/v.fromIndex); return ['Formula: Equivalent = Salary × (Dest Index / Source Index)','Step 1: '+v.toIndex+' / '+v.fromIndex+' = '+(v.toIndex/v.fromIndex).toFixed(4),'Step 2: $'+v.salary.toLocaleString()+' × '+(v.toIndex/v.fromIndex).toFixed(4),'Step 3: Equivalent salary = $'+Math.round(a).toLocaleString()]; } },

  { id: 'debt-consolidation', name: 'Debt Consolidation Calculator', desc: 'Compare consolidation loan to multiple debts', kw: 'debt consolidation calculator combine debts',
    inputs: [{id:'debts',label:'Current Debts (balance,rate,monthly semicolon)',type:'text',def:'5000,18.99,150;3000,22.99,100;8000,12.99,200'},{id:'newRate',label:'Consolidation Rate (%)',type:'number',def:9.99},{id:'newTerm',label:'New Term (months)',type:'number',def:48}],
    calc: function(v) { var debts = v.debts.split(';').map(function(d){var p=d.split(',');return{b:parseFloat(p[0]),r:parseFloat(p[1]),m:parseFloat(p[2])};}); var totalBal = debts.reduce(function(a,d){return a+d.b;},0); var curMonthly = debts.reduce(function(a,d){return a+d.m;},0); var r = v.newRate/100/12; var newPmt = totalBal * r * Math.pow(1+r,v.newTerm) / (Math.pow(1+r,v.newTerm)-1); var savings = curMonthly - newPmt; return { result: 'New payment: $'+newPmt.toFixed(2)+'/mo', chart: Charts.bar([curMonthly, newPmt], ['Current','Consolidated']), extra: (savings>0?'Save':'Pay more')+' $'+Math.abs(savings).toFixed(2)+'/mo | Total debt: $'+totalBal.toLocaleString() }; },
    steps: function(v) { return ['Step 1: Sum all current debts and monthly payments','Step 2: Calculate new EMI at '+v.newRate+'% for '+v.newTerm+' months','Step 3: Compare monthly payments','Step 4: Total interest comparison']; } },

  { id: 'yield-to-maturity', name: 'Yield to Maturity Calculator', desc: 'YTM approximation for bonds', kw: 'yield to maturity calculator bond ytm',
    inputs: [{id:'face',label:'Face Value ($)',type:'number',def:1000},{id:'coupon',label:'Coupon Rate (%)',type:'number',def:5},{id:'price',label:'Market Price ($)',type:'number',def:960},{id:'years',label:'Years to Maturity',type:'number',def:10}],
    calc: function(v) { var C = v.face * v.coupon/100; var ytmApprox = (C + (v.face - v.price)/v.years) / ((v.face + v.price)/2) * 100; return { result: 'YTM ≈ ' + ytmApprox.toFixed(2) + '%', chart: Charts.gauge(ytmApprox, 15), extra: 'Approximate formula (not exact iterative YTM)' }; },
    steps: function(v) { var y=(v.face*v.coupon/100+(v.face-v.price)/v.years)/((v.face+v.price)/2)*100; return ['Formula: YTM ≈ (C + (F−P)/n) / ((F+P)/2)','Step 1: C = $'+v.face+' × '+v.coupon+'% = $'+(v.face*v.coupon/100),'Step 2: (F−P)/n = ($'+v.face+'−$'+v.price+')/'+v.years+' = $'+((v.face-v.price)/v.years).toFixed(2),'Step 3: Numerator = $'+v.face*v.coupon/100+' + $'+((v.face-v.price)/v.years).toFixed(2)+' = $'+(v.face*v.coupon/100+(v.face-v.price)/v.years).toFixed(2),'Step 4: YTM ≈ '+y.toFixed(2)+'%']; } },

  { id: 'gross-rent-multiplier', name: 'Gross Rent Multiplier', desc: 'Property price divided by gross annual rent', kw: 'gross rent multiplier calculator grm real estate',
    inputs: [{id:'price',label:'Property Price ($)',type:'number',def:300000},{id:'monthlyRent',label:'Monthly Rent ($)',type:'number',def:2000}],
    calc: function(v) { var annualRent = v.monthlyRent * 12; var grm = v.price / annualRent; return { result: 'GRM: ' + grm.toFixed(2), chart: Charts.gauge(grm, 30), extra: 'Lower GRM = potentially better investment | Annual rent: $'+annualRent.toLocaleString() }; },
    steps: function(v) { var a=v.monthlyRent*12; var g=v.price/a; return ['Formula: GRM = Price / Gross Annual Rent','Step 1: Annual rent = $'+v.monthlyRent+' × 12 = $'+a.toLocaleString(),'Step 2: GRM = $'+v.price.toLocaleString()+' / $'+a.toLocaleString(),'Step 3: GRM = '+g.toFixed(2)]; } },

  { id: 'current-ratio-finance', name: 'Current Ratio Calculator', desc: 'Current assets divided by current liabilities', kw: 'current ratio calculator liquidity',
    inputs: [{id:'currentAssets',label:'Current Assets ($)',type:'number',def:200000},{id:'currentLiab',label:'Current Liabilities ($)',type:'number',def:120000}],
    calc: function(v) { var ratio = v.currentAssets / v.currentLiab; var rating = ratio >= 2 ? 'Strong' : ratio >= 1 ? 'Adequate' : 'Weak'; return { result: 'Current Ratio: ' + ratio.toFixed(2), chart: Charts.gauge(ratio, 5), extra: 'Rating: '+rating+' | Can cover liabilities '+ratio.toFixed(1)+'x' }; },
    steps: function(v) { var r=v.currentAssets/v.currentLiab; return ['Formula: Current Ratio = Current Assets / Current Liabilities','Step 1: $'+v.currentAssets.toLocaleString()+' / $'+v.currentLiab.toLocaleString(),'Step 2: Current Ratio = '+r.toFixed(2),r>=2?'Result: Strong (≥2.0)':r>=1?'Result: Adequate (1.0-2.0)':'Result: Weak (<1.0)']; } },

  { id: 'accounts-receivable-turnover', name: 'AR Turnover Ratio', desc: 'How quickly receivables are collected', kw: 'accounts receivable turnover ratio calculator',
    inputs: [{id:'netCreditSales',label:'Net Credit Sales ($)',type:'number',def:800000},{id:'avgAR',label:'Average Accounts Receivable ($)',type:'number',def:100000}],
    calc: function(v) { var turnover = v.netCreditSales / v.avgAR; var days = 365 / turnover; return { result: 'Turnover: ' + turnover.toFixed(2) + 'x', chart: Charts.bar([turnover, days], ['Turnover','Days']), extra: 'Collection period: ' + days.toFixed(0) + ' days' }; },
    steps: function(v) { var t=v.netCreditSales/v.avgAR; return ['Formula: AR Turnover = Net Credit Sales / Avg AR','Step 1: $'+v.netCreditSales.toLocaleString()+' / $'+v.avgAR.toLocaleString(),'Step 2: Turnover = '+t.toFixed(2)+'x','Step 3: Days = 365 / '+t.toFixed(2)+' = '+(365/t).toFixed(0)+' days']; } },

  { id: 'operating-margin', name: 'Operating Margin Calculator', desc: 'Operating income as percentage of revenue', kw: 'operating margin calculator',
    inputs: [{id:'revenue',label:'Revenue ($)',type:'number',def:1000000},{id:'operatingIncome',label:'Operating Income ($)',type:'number',def:150000}],
    calc: function(v) { var margin = (v.operatingIncome / v.revenue) * 100; return { result: 'Operating Margin: ' + margin.toFixed(1) + '%', chart: Charts.donut([v.operatingIncome, v.revenue-v.operatingIncome], ['Operating Income','Costs']), extra: '$'+v.operatingIncome.toLocaleString()+' from $'+v.revenue.toLocaleString() }; },
    steps: function(v) { return ['Formula: Operating Margin = Operating Income / Revenue × 100','Step 1: $'+v.operatingIncome.toLocaleString()+' / $'+v.revenue.toLocaleString(),'Step 2: = '+(v.operatingIncome/v.revenue).toFixed(4),'Step 3: × 100 = '+((v.operatingIncome/v.revenue)*100).toFixed(1)+'%']; } },

  { id: 'net-profit-margin', name: 'Net Profit Margin', desc: 'Net income as percentage of revenue', kw: 'net profit margin calculator',
    inputs: [{id:'revenue',label:'Revenue ($)',type:'number',def:1000000},{id:'netIncome',label:'Net Income ($)',type:'number',def:100000}],
    calc: function(v) { var margin = (v.netIncome / v.revenue) * 100; return { result: 'Net Margin: ' + margin.toFixed(1) + '%', chart: Charts.donut([v.netIncome, v.revenue-v.netIncome], ['Net Income','Expenses']), extra: '$0.'+Math.round(margin)+' of every $1 revenue is profit' }; },
    steps: function(v) { return ['Formula: Net Margin = Net Income / Revenue × 100','Step 1: $'+v.netIncome.toLocaleString()+' / $'+v.revenue.toLocaleString(),'Step 2: = '+(v.netIncome/v.revenue).toFixed(4),'Step 3: Net Profit Margin = '+((v.netIncome/v.revenue)*100).toFixed(1)+'%']; } },

  { id: 'coverage-ratio', name: 'Debt Coverage Ratio', desc: 'NOI divided by debt service', kw: 'debt coverage ratio calculator dscr',
    inputs: [{id:'noi',label:'Net Operating Income ($)',type:'number',def:50000},{id:'debtService',label:'Annual Debt Service ($)',type:'number',def:36000}],
    calc: function(v) { var dcr = v.noi / v.debtService; var rating = dcr >= 1.25 ? 'Strong' : dcr >= 1 ? 'Marginal' : 'Below threshold'; return { result: 'DSCR: ' + dcr.toFixed(2) + 'x', chart: Charts.gauge(dcr, 3), extra: 'Rating: '+rating+' | Coverage: '+(dcr*100).toFixed(0)+'% of debt service' }; },
    steps: function(v) { var r=v.noi/v.debtService; return ['Formula: DSCR = NOI / Annual Debt Service','Step 1: $'+v.noi.toLocaleString()+' / $'+v.debtService.toLocaleString(),'Step 2: DSCR = '+r.toFixed(2)+'x',r>=1.25?'Result: Strong (≥1.25x)':'Result: '+((r>=1)?'Marginal':'Below threshold')]; } },

  { id: 'home-equity', name: 'Home Equity Calculator', desc: 'Equity in your property', kw: 'home equity calculator how much equity do i have',
    inputs: [{id:'homeValue',label:'Current Home Value ($)',type:'number',def:350000},{id:'mortgageBalance',label:'Mortgage Balance ($)',type:'number',def:200000},{id:'heloc',label:'HELOC Balance ($)',type:'number',def:0}],
    calc: function(v) { var equity = v.homeValue - v.mortgageBalance - v.heloc; var ltv = (v.mortgageBalance + v.heloc) / v.homeValue * 100; return { result: 'Equity: $' + equity.toLocaleString(), chart: Charts.donut([v.mortgageBalance+v.heloc, equity], ['Debt','Equity']), extra: 'LTV: '+ltv.toFixed(1)+'% | Equity: '+(equity/v.homeValue*100).toFixed(1)+'% of value' }; },
    steps: function(v) { return ['Step 1: Home value = $'+v.homeValue.toLocaleString(),'Step 2: Total debt = $'+v.mortgageBalance.toLocaleString()+' + $'+v.heloc.toLocaleString(),'Step 3: Equity = value − debt','Step 4: Equity = $'+(v.homeValue-v.mortgageBalance-v.heloc).toLocaleString()]; } },

  { id: 'cash-on-cash', name: 'Cash-on-Cash Return', desc: 'Annual pre-tax cash flow / total cash invested', kw: 'cash on cash return calculator real estate investment',
    inputs: [{id:'annualCashFlow',label:'Annual Pre-Tax Cash Flow ($)',type:'number',def:12000},{id:'totalInvested',label:'Total Cash Invested ($)',type:'number',def:80000}],
    calc: function(v) { var coc = (v.annualCashFlow / v.totalInvested) * 100; return { result: 'Cash-on-Cash: ' + coc.toFixed(2) + '%', chart: Charts.gauge(coc, 20), extra: '$'+v.annualCashFlow.toLocaleString()+' return on $'+v.totalInvested.toLocaleString()+' invested' }; },
    steps: function(v) { var c=(v.annualCashFlow/v.totalInvested)*100; return ['Formula: CoC = Annual Cash Flow / Total Cash Invested × 100','Step 1: $'+v.annualCashFlow.toLocaleString()+' / $'+v.totalInvested.toLocaleString(),'Step 2: = '+(v.annualCashFlow/v.totalInvested).toFixed(4),'Step 3: Cash-on-Cash = '+c.toFixed(2)+'%']; } },

  { id: 'loan-balance', name: 'Loan Balance Calculator', desc: 'Remaining balance after payments', kw: 'loan balance calculator remaining balance',
    inputs: [{id:'principal',label:'Original Loan ($)',type:'number',def:200000},{id:'rate',label:'Annual Rate (%)',type:'number',def:6},{id:'payment',label:'Monthly Payment ($)',type:'number',def:1200},{id:'months',label:'Payments Made',type:'number',def:24}],
    calc: function(v) { var r = v.rate/100/12; var bal = v.principal; var totalInt = 0; for(var m=0; m<v.months; m++) { var int = bal*r; totalInt += int; bal = bal + int - v.payment; } return { result: 'Remaining: $' + Math.max(0,bal).toFixed(2), chart: Charts.donut([v.principal - Math.max(0,bal), Math.max(0,bal)], ['Paid Off','Remaining']), extra: 'Total interest paid: $'+totalInt.toFixed(0)+' | Principal paid: $'+(v.principal-Math.max(0,bal)).toFixed(0) }; },
    steps: function(v) { return ['Step 1: Monthly rate = '+v.rate+'%/12','Step 2: Each month: interest = balance × rate','Step 3: Principal = payment − interest','Step 4: Repeat for '+v.months+' months','Step 5: Remaining balance = calculated']; } },

  { id: 'price-to-rent', name: 'Price-to-Rent Ratio', desc: 'Compare buying vs renting in a market', kw: 'price to rent ratio calculator buy vs rent market',
    inputs: [{id:'homePrice',label:'Median Home Price ($)',type:'number',def:300000},{id:'annualRent',label:'Annual Rent ($)',type:'number',def:18000}],
    calc: function(v) { var ratio = v.homePrice / v.annualRent; var verdict = ratio < 15 ? 'Buying favored' : ratio <= 20 ? 'Neutral' : 'Renting favored'; return { result: 'Price-to-Rent: ' + ratio.toFixed(1), chart: Charts.gauge(ratio, 30), extra: verdict + ' | Months of rent = price' }; },
    steps: function(v) { var r=v.homePrice/v.annualRent; return ['Formula: Ratio = Home Price / Annual Rent','Step 1: $'+v.homePrice.toLocaleString()+' / $'+v.annualRent.toLocaleString(),'Step 2: Ratio = '+r.toFixed(1),r<15?'<15: Buying favored':r<=20?'15-20: Neutral':'>20: Renting favored']; } },

  { id: 'fico-simulator', name: 'Credit Score Simulator', desc: 'Estimate score impact from actions', kw: 'credit score simulator fico estimate impact',
    inputs: [{id:'currentScore',label:'Current Score',type:'number',def:680},{id:'utilization',label:'Credit Utilization (%)',type:'number',def:45},{id:'newUtil',label:'Target Utilization (%)',type:'number',def:10},{id:'hardInquiries',label:'Hard Inquiries (add)',type:'number',def:0}],
    calc: function(v) { var utilImpact = (v.utilization - v.newUtil) * 0.3; var inquiryImpact = v.hardInquiries * -5; var newScore = Math.min(850, Math.max(300, v.currentScore + utilImpact + inquiryImpact)); return { result: 'Estimated: ' + Math.round(newScore), chart: Charts.bar([v.currentScore, newScore], ['Current','Projected']), extra: 'Util change: '+(utilImpact>0?'+':'')+utilImpact.toFixed(0)+' pts | Inquiries: '+(inquiryImpact)+' pts' }; },
    steps: function(v) { return ['Step 1: Utilization impact ≈ (old − new) × 0.3 pts per %','Step 2: Each hard inquiry ≈ −5 points','Step 3: Other factors unchanged','Step 4: Estimated new score = current + changes']; } },

  { id: 'discounted-payback', name: 'Discounted Payback Period', desc: 'Time to recover investment at discount rate', kw: 'discounted payback period calculator',
    inputs: [{id:'investment',label:'Initial Investment ($)',type:'number',def:50000},{id:'cashflows',label:'Annual Cash Flows (comma sep)',type:'text',def:'15000,20000,25000,30000'},{id:'rate',label:'Discount Rate (%)',type:'number',def:10}],
    calc: function(v) { var flows = v.cashflows.split(',').map(Number); var cumPV = 0; var r = v.rate/100; var payback = -1; for(var i=0; i<flows.length; i++) { var pv = flows[i] / Math.pow(1+r, i+1); cumPV += pv; if(cumPV >= v.investment && payback < 0) { var prev = cumPV - pv; payback = i + (v.investment - prev) / pv; } } return { result: payback > 0 ? 'Payback: ' + payback.toFixed(1) + ' years' : 'Not recovered within period', chart: '', extra: 'Cumulative PV: $'+cumPV.toFixed(0)+' vs $'+v.investment.toLocaleString()+' invested' }; },
    steps: function(v) { return ['Step 1: Discount each cash flow at '+v.rate+'%','Step 2: Cumulate discounted cash flows','Step 3: Find when cumulative ≥ initial investment','Step 4: Interpolate exact payback year']; } },

  { id: 'portfolio-return', name: 'Portfolio Return Calculator', desc: 'Weighted return of multiple investments', kw: 'portfolio return calculator weighted average',
    inputs: [{id:'weights',label:'Weights (comma sep %)',type:'text',def:'40,30,20,10'},{id:'returns',label:'Returns (comma sep %)',type:'text',def:'10,8,12,5'}],
    calc: function(v) { var w = v.weights.split(',').map(Number); var r = v.returns.split(',').map(Number); var portReturn = 0; w.forEach(function(wi, i) { portReturn += (wi/100) * r[i]; }); return { result: 'Portfolio Return: ' + portReturn.toFixed(2) + '%', chart: Charts.bar(r.concat([portReturn]), w.map(function(_,i){return 'Asset '+(i+1);}).concat(['Portfolio'])), extra: 'Weighted average of ' + w.length + ' assets' }; },
    steps: function(v) { return ['Formula: Rp = Σ(wi × ri)','Step 1: '+v.weights.split(',').map(function(w,i){return w+'% × '+v.returns.split(',')[i]+'%';}).join(' + '),'Step 2: Sum weighted returns','Step 3: Portfolio return = sum']; } },

  { id: 'payroll-tax', name: 'Payroll Tax Calculator', desc: 'FICA + Medicare tax on wages', kw: 'payroll tax calculator fica medicare social security',
    inputs: [{id:'wages',label:'Gross Wages ($)',type:'number',def:75000}],
    calc: function(v) { var ss = Math.min(v.wages, 168600) * 0.062; var medicare = v.wages * 0.0145; var additionalMedicare = v.wages > 200000 ? (v.wages - 200000) * 0.009 : 0; var total = ss + medicare + additionalMedicare; return { result: 'Total FICA: $' + total.toFixed(2), chart: Charts.donut([ss, medicare, additionalMedicare], ['SS (6.2%)','Medicare (1.45%)','Additional']), extra: 'Employee share | Employer matches: $'+total.toFixed(2)+' additional' }; },
    steps: function(v) { var ss=Math.min(v.wages,168600)*0.062; var med=v.wages*0.0145; return ['Step 1: Social Security = min($'+v.wages.toLocaleString()+', $168,600) × 6.2%','Step 2: SS = $'+ss.toFixed(2),'Step 3: Medicare = $'+v.wages.toLocaleString()+' × 1.45% = $'+med.toFixed(2),'Step 4: Total = $'+(ss+med).toFixed(2)+' (employee share)']; } },

  { id: 'standard-deduction', name: 'Standard vs Itemized Deduction', desc: 'Which deduction method saves more tax', kw: 'standard deduction vs itemized deduction calculator 2026',
    inputs: [{id:'filingStatus',label:'Filing Status',type:'select',opts:[{v:'single',l:'Single'},{v:'married',l:'Married Filing Jointly'},{v:'head',l:'Head of Household'}],def:'single'},{id:'stateLocalTax',label:'SALT ($)',type:'number',def:8000},{id:'mortgageInterest',label:'Mortgage Interest ($)',type:'number',def:12000},{id:'charity',label:'Charitable Donations ($)',type:'number',def:3000},{id:'medical',label:'Medical (above 7.5% AGI)',type:'number',def:0}],
    calc: function(v) { var std = v.filingStatus==='married'?29200:v.filingStatus==='head'?21900:14600; var itemized = Math.min(v.stateLocalTax, 10000) + v.mortgageInterest + v.charity + v.medical; var better = itemized > std ? 'Itemize' : 'Standard'; var saving = Math.abs(itemized - std) * 0.22; return { result: better + ' (' + (itemized > std ? '+' : '') + '$'+Math.abs(itemized-std).toLocaleString()+')', chart: Charts.bar([std, itemized], ['Standard','Itemized']), extra: 'Tax benefit: ~$'+saving.toFixed(0) }; },
    steps: function(v) { var std=v.filingStatus==='married'?29200:v.filingStatus==='head'?21900:14600; return ['Step 1: Standard deduction for '+v.filingStatus+' = $'+std.toLocaleString(),'Step 2: Itemize: SALT (capped $10k) + mortgage + charity + medical','Step 3: Compare: $'+std.toLocaleString()+' vs itemized total','Step 4: Use whichever is higher']; } },

  { id: 'home-office-deduction', name: 'Home Office Deduction', desc: 'Simplified vs actual method', kw: 'home office deduction calculator simplified vs actual',
    inputs: [{id:'sqft',label:'Office Square Feet',type:'number',def:150},{id:'totalSqft',label:'Total Home Sq Ft',type:'number',def:1500},{id:'rent',label:'Monthly Rent/Mortgage ($)',type:'number',def:1500},{id:'utilities',label:'Monthly Utilities ($)',type:'number',def:200},{id:'method',label:'Method',type:'select',opts:[{v:'simplified',l:'Simplified ($5/sqft)'},{v:'actual',l:'Actual Expenses'}],def:'simplified'}],
    calc: function(v) { var pct = v.sqft / v.totalSqft; if(v.method === 'simplified') { var ded = v.sqft * 5; return { result: 'Deduction: $' + ded, chart: Charts.donut([ded, 300*12-ded], ['Deduction','Not Deducted']), extra: 'Simplified: $5/sqft × '+v.sqft+' sqft' }; } else { var annual = (v.rent + v.utilities) * 12 * pct; return { result: 'Deduction: $'+annual.toFixed(0), chart: Charts.donut([annual, (v.rent+v.utilities)*12-annual], ['Deduction','Other']), extra: 'Actual: '+pct.toFixed(1)+'% of home expenses' }; } },
    steps: function(v) { var pct=v.sqft/v.totalSqft; if(v.method==='simplified') return ['Step 1: Simplified = $5/sqft','Step 2: $5 × '+v.sqft+' sqft = $'+(v.sqft*5)]; return ['Step 1: Office % = '+v.sqft+'/'+v.totalSqft+' = '+(pct*100).toFixed(1)+'%','Step 2: Annual home costs = $'+((v.rent+v.utilities)*12).toLocaleString(),'Step 3: Deduction = '+(pct*100).toFixed(1)+'% × costs']; } },

  { id: 'estimated-tax', name: 'Estimated Tax Calculator', desc: 'Quarterly estimated tax payments', kw: 'estimated tax calculator quarterly self employed',
    inputs: [{id:'annualIncome',label:'Expected Annual Income ($)',type:'number',def:80000},{id:'deductions',label:'Deductions ($)',type:'number',def:14600},{id:'filingStatus',label:'Filing Status',type:'select',opts:[{v:'single',l:'Single'},{v:'married',l:'Married'}],def:'single'},{id:'selfEmploymentTax',label:'Self-Employment Tax ($)',type:'number',def:0}],
    calc: function(v) { var taxable = Math.max(0, v.annualIncome - v.deductions); var fedTax = taxable * 0.22; var seTax = v.selfEmploymentTax || v.annualIncome * 0.153 * 0.9235; var totalTax = fedTax + seTax; var quarterly = totalTax / 4; return { result: 'Quarterly: $'+quarterly.toFixed(2), chart: Charts.donut([fedTax, seTax], ['Federal','SE Tax']), extra: 'Total annual: $'+totalTax.toFixed(0)+' | Due: Apr 15, Jun 15, Sep 15, Jan 15' }; },
    steps: function(v) { return ['Step 1: Taxable = $'+v.annualIncome.toLocaleString()+' − $'+v.deductions.toLocaleString(),'Step 2: Federal tax (estimated bracket: 22%)','Step 3: Self-employment tax if applicable','Step 4: Total ÷ 4 quarterly payments']; } },

  { id: 'diversification', name: 'Portfolio Diversification', desc: 'How diversified is your investment mix', kw: 'portfolio diversification calculator asset allocation',
    inputs: [{id:'stocks',label:'Stocks ($)',type:'number',def:60000},{id:'bonds',label:'Bonds ($)',type:'number',def:20000},{id:'realEstate',label:'Real Estate ($)',type:'number',def:10000},{id:'cash',label:'Cash ($)',type:'number',def:5000},{id:'crypto',label:'Crypto ($)',type:'number',def:5000}],
    calc: function(v) { var total = v.stocks + v.bonds + v.realEstate + v.cash + v.crypto; var pcts = [v.stocks, v.bonds, v.realEstate, v.cash, v.crypto].map(function(x){return x/total;}); var hhi = pcts.reduce(function(a,p){return a+p*p;},0); var divScore = Math.round((1 - hhi) * 100); return { result: 'Diversification Score: ' + divScore + '/100', chart: Charts.donut(pcts, ['Stocks','Bonds','RE','Cash','Crypto']), extra: 'HHI: '+hhi.toFixed(3)+' | '+pcts.map(function(p){return (p*100).toFixed(0)+'%';}).join(' / ') }; },
    steps: function(v) { return ['Step 1: Calculate total portfolio','Step 2: Calculate weight of each asset class','Step 3: HHI = sum of squared weights','Step 4: Diversification = 1 − HHI (higher = more diversified)']; } },

  { id: 'forex-pip', name: 'Forex Pip Calculator', desc: 'Value of a pip in forex trading', kw: 'forex pip calculator value lot size',
    inputs: [{id:'pair',label:'Currency Pair',type:'select',opts:[{v:'EURUSD',l:'EUR/USD'},{v:'GBPUSD',l:'GBP/USD'},{v:'USDJPY',l:'USD/JPY'},{v:'USDCHF',l:'USD/CHF'},{v:'AUDUSD',l:'AUD/USD'}],def:'EURUSD'},{id:'lots',label:'Lot Size',type:'number',def:1},{id:'accountCurrency',label:'Account Currency',type:'select',opts:[{v:'USD',l:'USD'},{v:'EUR',l:'EUR'}],def:'USD'}],
    calc: function(v) { var pipValue = v.pair.endsWith('JPY') ? 0.01 : 0.0001; var lots = v.lots * 100000; var value = pipValue * lots; if(v.pair.startsWith('USD') && v.accountCurrency === 'USD') { /* standard */ } else if(v.pair.endsWith('USD')) { /* quote = USD, standard */ } else { value = value; } return { result: '1 pip = $' + value.toFixed(2), chart: Charts.bar([value*10, value*50, value*100], ['0.1 lot','0.5 lot','1 lot']), extra: '1 pip = '+(v.pair.endsWith('JPY')?'0.01':'0.0001')+' | 1 lot = 100,000 units' }; },
    steps: function(v) { var p=v.pair.endsWith('JPY')?0.01:0.0001; return ['Step 1: Pip size = '+(v.pair.endsWith('JPY')?'0.01':'0.0001'),'Step 2: 1 lot = 100,000 units','Step 3: Pip value = pip × lot size','Step 4: 1 pip = $'+(p*100000).toFixed(2)+' per standard lot']; } },

  { id: 'currency-arbitrage', name: 'Currency Arbitrage Detector', desc: 'Check for triangular arbitrage opportunities', kw: 'triangular arbitrage calculator currency exchange profit',
    inputs: [{id:'ab',label:'Rate A→B',type:'number',def:1.1},{id:'bc',label:'Rate B→C',type:'number',def:0.85},{id:'ca',label:'Rate C→A',type:'number',def:1.08}],
    calc: function(v) { var product = v.ab * v.bc * v.ca; var profit = (product - 1) * 100; var exists = product > 1.001; return { result: exists ? 'Arbitrage: +'+profit.toFixed(2)+'%' : 'No arbitrage ('+profit.toFixed(2)+'%)', chart: Charts.bar([100, product*100], ['Start','After Round Trip']), extra: 'Round trip: A→B→C→A = ×'+product.toFixed(4) }; },
    steps: function(v) { var p=v.ab*v.bc*v.ca; return ['Step 1: A→B at '+v.ab,'Step 2: B→C at '+v.bc,'Step 3: C→A at '+v.ca,'Step 4: Product = '+v.ab+' × '+v.bc+' × '+v.ca+' = '+p.toFixed(4),p>1?'Arbitrage opportunity!':'No opportunity (product ≤ 1)']; } },

  { id: 'payback-period', name: 'Simple Payback Period', desc: 'Years to recover initial investment', kw: 'payback period calculator investment recovery',
    inputs: [{id:'investment',label:'Initial Investment ($)',type:'number',def:50000},{id:'annualReturn',label:'Annual Cash Return ($)',type:'number',def:12000}],
    calc: function(v) { var payback = v.investment / v.annualReturn; return { result: 'Payback: ' + payback.toFixed(1) + ' years', chart: Charts.gauge(payback, 20), extra: 'Shorter = better | Simple method (ignores time value)' }; },
    steps: function(v) { var payback = v.investment / v.annualReturn; return ['Formula: Payback = Investment / Annual Return','Step 1: $'+v.investment.toLocaleString()+' / $'+v.annualReturn.toLocaleString(),'Step 2: Payback = '+payback.toFixed(1)+' years']; } },

  { id: 't-bill', name: 'T-Bill Calculator (Price & Yield)', desc: 'Treasury bill discount yield and price (US 360-day convention)', kw: 't bill calculator treasury bill price yield discount',
    inputs: [{id:'mode',label:'Calculate',type:'select',opts:[{v:'price',l:'Price from discount rate'},{v:'yield',l:'Yield from price'}],def:'price'},{id:'face',label:'Face Value ($)',type:'number',def:10000},{id:'days',label:'Days to Maturity',type:'number',def:91},{id:'rate',label:'Discount Rate %',type:'number',def:5.2},{id:'price',label:'Market Price ($)',type:'number',def:9868.44}],
    calc: function(v) { if (v.mode === 'price') { const price = v.face * (1 - v.rate/100 * v.days/360); return { result: 'Price: $' + price.toFixed(2), chart: Charts.bar([price, v.face], ['Price','Face']), extra: 'Discount: $' + (v.face-price).toFixed(2) + ' | Yield: ' + ((v.face-price)/v.face*360/v.days*100).toFixed(2) + '%' }; } const d = v.face - v.price; const yieldPct = d/v.face * 360/v.days * 100; return { result: 'Discount Yield: ' + yieldPct.toFixed(2) + '%', chart: Charts.bar([v.price, d], ['Price','Discount']), extra: 'Discount: $' + d.toFixed(2) + ' | Investment yield: ' + (d/v.price*360/v.days*100).toFixed(2) + '%' }; },
    steps: function(v) { if (v.mode === 'price') { const price = v.face * (1 - v.rate/100 * v.days/360); return ['Formula: Price = Face × (1 − rate × days/360)','Step 1: Discount = ' + v.rate/100 + ' × ' + v.days + '/360 = ' + (v.rate/100*v.days/360).toFixed(5),'Step 2: Price = $' + v.face + ' × ' + (1 - v.rate/100*v.days/360).toFixed(5) + ' = $' + price.toFixed(2)]; } const d = v.face - v.price; const yieldPct = d/v.face * 360/v.days * 100; return ['Formula: Yield = (Face − Price)/Face × 360/days','Step 1: Discount = $' + v.face + ' − $' + v.price + ' = $' + d.toFixed(2),'Step 2: Yield = ' + (d/v.face).toFixed(5) + ' × ' + (360/v.days).toFixed(2) + ' = ' + yieldPct.toFixed(2) + '%']; },
    reverse: { solveFor: { rate: 1 }, variables: { rate: { analytical: function(o, v) { return (1 - v/o.face) * 360 / o.days * 100; }, domain: [0, 20] } } } },

  { id: 'cagr', name: 'CAGR Calculator', desc: 'Compound annual growth rate of an investment', kw: 'cagr calculator compound annual growth rate investment return annualized',
    inputs: [{id:'begin',label:'Beginning Value ($)',type:'number',def:10000},{id:'end',label:'Ending Value ($)',type:'number',def:16105.10},{id:'years',label:'Years',type:'number',def:5}],
    calc: function(v){ if(v.begin<=0||v.end<0||v.years<=0) return {result:'Enter positive beginning value, ending value and years',chart:'',extra:''}; var ratio=v.end/v.begin; var cagr=(Math.pow(ratio,1/v.years)-1)*100; return{result:'CAGR: '+cagr.toFixed(2)+'%',chart:Charts.gauge(cagr,50),extra:'Growth of $1: $'+Math.pow(1+cagr/100,v.years).toFixed(4)+' | Total return: '+((ratio-1)*100).toFixed(1)+'%'};},
    steps: function(v){ var ratio=v.end/v.begin; var cagr=(Math.pow(ratio,1/v.years)-1)*100; return['Formula: CAGR = (End/Begin)^(1/years) − 1','Step 1: End/Begin = '+v.end.toLocaleString()+'/'+v.begin.toLocaleString()+' = '+ratio.toFixed(4),'Step 2: ^(1/'+v.years+') = '+Math.pow(ratio,1/v.years).toFixed(4),'Step 3: CAGR = '+Math.pow(ratio,1/v.years).toFixed(4)+' − 1 = '+(cagr/100).toFixed(4)+' = '+cagr.toFixed(2)+'% per year','CAGR smooths volatility — actual yearly returns vary'];} },

  { id: 'capm', name: 'CAPM Calculator', desc: 'Expected return via the capital asset pricing model', kw: 'capm calculator capital asset pricing model expected return beta',
    inputs: [{id:'riskFree',label:'Risk-Free Rate (%)',type:'number',def:3},{id:'beta',label:'Beta (β)',type:'number',def:1.5},{id:'marketReturn',label:'Market Return (%)',type:'number',def:10}],
    calc: function(v){ var er=v.riskFree+v.beta*(v.marketReturn-v.riskFree); return{result:'Expected Return: '+er.toFixed(2)+'%',chart:Charts.gauge(er,30),extra:'Market risk premium: '+(v.marketReturn-v.riskFree).toFixed(2)+'% × β '+v.beta};},
    steps: function(v){ var mrp=v.marketReturn-v.riskFree; var er=v.riskFree+v.beta*mrp; return['Formula: E(R) = Rf + β × (Rm − Rf)','Step 1: Market risk premium = '+v.marketReturn+'% − '+v.riskFree+'% = '+mrp.toFixed(2)+'%','Step 2: β × MRP = '+v.beta+' × '+mrp.toFixed(2)+'% = '+(v.beta*mrp).toFixed(2)+'%','Step 3: E(R) = '+v.riskFree+'% + '+(v.beta*mrp).toFixed(2)+'% = '+er.toFixed(2)+'%','β > 1 amplifies market moves; β < 1 dampens them'];} },

  { id: 'dcf', name: 'DCF Valuation Calculator', desc: 'Discounted cash flow with terminal value', kw: 'dcf calculator discounted cash flow valuation terminal value',
    inputs: [{id:'cashFlows',label:'Cash Flows (comma, years 1..n)',type:'text',def:'100,110,120,130,140'},{id:'discountRate',label:'Discount Rate (%)',type:'number',def:10},{id:'growthRate',label:'Terminal Growth (%)',type:'number',def:3}],
    calc: function(v){ var cfs=v.cashFlows.split(',').map(Number); if(!cfs.length||cfs.some(isNaN)) return{result:'Enter numeric cash flows',chart:'',extra:''}; var r=v.discountRate/100, g=v.growthRate/100; var n=cfs.length; var pv=0; for(var t=1;t<=n;t++) pv+=cfs[t-1]/Math.pow(1+r,t); var tv=cfs[n-1]*(1+g)/(r-g); var pvTv=tv/Math.pow(1+r,n); var total=pv+pvTv; return{result:'DCF Value: $'+total.toLocaleString(undefined,{maximumFractionDigits:0}),chart:Charts.donut([pv,pvTv],['PV of cash flows','PV of terminal value']),extra:'PV of CFs: $'+pv.toLocaleString(undefined,{maximumFractionDigits:0})+' | Terminal value: $'+tv.toLocaleString(undefined,{maximumFractionDigits:0})};},
    steps: function(v){ var cfs=v.cashFlows.split(',').map(Number); var r=v.discountRate/100, g=v.growthRate/100; var n=cfs.length; var pv=0; for(var t=1;t<=n;t++) pv+=cfs[t-1]/Math.pow(1+r,t); var tv=cfs[n-1]*(1+g)/(r-g); var pvTv=tv/Math.pow(1+r,n); var st=['Formula: DCF = Σ CFt/(1+r)ᵗ + TV/(1+r)ⁿ']; cfs.forEach(function(cf,i){ st.push('Year '+(i+1)+': '+cf+'/'+Math.pow(1+r,i+1).toFixed(2)+' = '+(cf/Math.pow(1+r,i+1)).toFixed(2)); }); st.push('Terminal value = CFn×(1+g)/(r−g) = '+tv.toFixed(0)); st.push('PV of TV = '+pvTv.toFixed(0)); st.push('DCF = $'+(pv+pvTv).toFixed(0)); return st;} },

  { id: 'debt-to-equity', name: 'Debt-to-Equity Ratio', desc: 'Leverage ratio: liabilities divided by shareholders equity', kw: 'debt to equity ratio calculator leverage',
    inputs: [{id:'liabilities',label:'Total Liabilities ($)',type:'number',def:500000},{id:'equity',label:'Shareholders Equity ($)',type:'number',def:250000}],
    calc: function(v){ if(v.equity<=0) return{result:'Equity must be positive',chart:'',extra:''}; var d=v.liabilities/v.equity; var band=d<1?'Low leverage':d<2?'Moderate leverage':'High leverage'; return{result:'D/E = '+d.toFixed(2),chart:Charts.gauge(d,3),extra:'Interpretation: '+band+' | Debt: '+v.liabilities.toLocaleString()+' / Equity: '+v.equity.toLocaleString()};},
    steps: function(v){ var d=v.liabilities/v.equity; return['Formula: D/E = Total Liabilities ÷ Shareholders Equity','Step 1: '+v.liabilities.toLocaleString()+' ÷ '+v.equity.toLocaleString(),'Step 2: D/E = '+d.toFixed(2),'Above ~2.0 signals high leverage in most industries'];} },

  { id: 'sip-step-up', name: 'Step-Up SIP Calculator', desc: 'SIP with annual contribution increase', kw: 'step up sip calculator annual increase systematic investment plan',
    inputs: [{id:'monthly',label:'Starting Monthly Investment ($)',type:'number',def:5000},{id:'step',label:'Annual Step-Up (%)',type:'number',def:10},{id:'rate',label:'Expected Return (%)',type:'number',def:12},{id:'years',label:'Investment Period (yrs)',type:'number',def:15}],
    calc: function(v) { var r = v.rate/100/12; var months = v.years*12; var contrib = v.monthly; var totalInv = 0; var fv = 0; for(var m=1; m<=months; m++) { if(m>1 && (m-1)%12===0) contrib = contrib * (1 + v.step/100); fv = (fv + contrib) * (1 + r); totalInv += contrib; } var growth = fv - totalInv; return { result: 'Future Value: $' + fv.toLocaleString(undefined,{maximumFractionDigits:0}), chart: Charts.donut([totalInv, growth], ['Invested','Growth']), extra: 'Total invested: $'+totalInv.toLocaleString(undefined,{maximumFractionDigits:0})+' | Growth: $'+growth.toLocaleString(undefined,{maximumFractionDigits:0}) }; },
    steps: function(v) { var r=v.rate/100/12; var months=v.years*12; var contrib=v.monthly; var totalInv=0; var fv=0; for(var m=1;m<=months;m++){ if(m>1&&(m-1)%12===0) contrib=contrib*(1+v.step/100); fv=(fv+contrib)*(1+r); totalInv+=contrib; } return ['Method: month-by-month compounding with an annual '+v.step+'% contribution increase','Step 1: Monthly rate = '+v.rate+'%/12 = '+(r*100).toFixed(4)+'%','Step 2: Contribution grows each year: $'+v.monthly.toLocaleString()+' → $'+(v.monthly*Math.pow(1+v.step/100,v.years-1)).toLocaleString(undefined,{maximumFractionDigits:0})+' by year '+v.years,'Step 3: Each month: balance = (balance + contribution) × (1 + monthly rate)','Step 4: Future value = $'+fv.toLocaleString(undefined,{maximumFractionDigits:0})]; } },

  { id: 'fixed-deposit-vs-recurring', name: 'FD vs RD Calculator', desc: 'Compare lump-sum FD vs monthly RD on the same budget', kw: 'fd vs rd calculator fixed deposit recurring deposit comparison',
    inputs: [{id:'monthly',label:'Monthly Savings ($)',type:'number',def:10000},{id:'years',label:'Tenure (yrs)',type:'number',def:3},{id:'rate',label:'Interest Rate (%)',type:'number',def:7}],
    calc: function(v) { var r = v.rate/100/12; var n = v.years*12; var rdFV = 0; for(var m=0; m<n; m++) rdFV = (rdFV + v.monthly) * (1+r); var lump = v.monthly * n; var fdFV = lump * Math.pow(1+r, n); var diff = fdFV - rdFV; return { result: 'RD: $' + rdFV.toLocaleString(undefined,{maximumFractionDigits:0}), chart: Charts.bar([rdFV, fdFV], ['RD (monthly)','FD (lump sum)']), extra: 'FD lump sum ($'+lump.toLocaleString(undefined,{maximumFractionDigits:0})+') grows to $'+fdFV.toLocaleString(undefined,{maximumFractionDigits:0})+' | FD advantage: $'+diff.toLocaleString(undefined,{maximumFractionDigits:0}) }; },
    steps: function(v) { var r=v.rate/100/12; var n=v.years*12; var rdFV=0; for(var m=0;m<n;m++) rdFV=(rdFV+v.monthly)*(1+r); var lump=v.monthly*n; var fdFV=lump*Math.pow(1+r,n); return ['Assumption: same total budget, two placements','RD: $'+v.monthly.toLocaleString()+' deposited monthly → compounded '+n+' months = $'+rdFV.toLocaleString(undefined,{maximumFractionDigits:0}),'FD: total budget $'+lump.toLocaleString(undefined,{maximumFractionDigits:0})+' deposited upfront → $'+fdFV.toLocaleString(undefined,{maximumFractionDigits:0}),'Difference: $'+(fdFV-rdFV).toLocaleString(undefined,{maximumFractionDigits:0})+' (lump sum wins because all money earns interest sooner)']; } },

  { id: 'insurance-surrender-value', name: 'Insurance Surrender Value', desc: 'Guaranteed surrender value of a life policy', kw: 'insurance surrender value calculator life policy lapsed',
    inputs: [{id:'premium',label:'Annual Premium ($)',type:'number',def:5000},{id:'yearsPaid',label:'Years Premiums Paid',type:'number',def:5},{id:'bonus',label:'Accrued Bonus ($)',type:'number',def:2000}],
    calc: function(v) { var paid = v.premium * v.yearsPaid; var factor = v.yearsPaid < 2 ? 0 : v.yearsPaid === 2 ? 0.3 : 0.5; var sv = paid * factor + v.bonus * 0.5; return { result: 'Surrender Value: $' + sv.toLocaleString(undefined,{maximumFractionDigits:0}), chart: Charts.donut([sv, paid - sv], ['Surrender','Forfeited']), extra: 'Premiums paid: $'+paid.toLocaleString(undefined,{maximumFractionDigits:0})+' | Factor: '+(factor*100)+'% | Bonus (50%): $'+(v.bonus*0.5).toLocaleString(undefined,{maximumFractionDigits:0}) }; },
    steps: function(v) { var paid=v.premium*v.yearsPaid; var factor=v.yearsPaid<2?0:v.yearsPaid===2?0.3:0.5; var sv=paid*factor+v.bonus*0.5; return ['Guaranteed surrender value (GSV) rules: <2 yrs = 0% of premiums, 2 yrs = 30%, 3+ yrs = 50%','Step 1: Premiums paid = $'+v.premium.toLocaleString()+' × '+v.yearsPaid+' = $'+paid.toLocaleString(undefined,{maximumFractionDigits:0}),'Step 2: GSV = '+factor*100+'% × $'+paid.toLocaleString(undefined,{maximumFractionDigits:0})+' = $'+(paid*factor).toLocaleString(undefined,{maximumFractionDigits:0}),'Step 3: Bonus surrender = 50% × $'+v.bonus.toLocaleString()+' = $'+(v.bonus*0.5).toLocaleString(undefined,{maximumFractionDigits:0}),'Step 4: Total surrender value = $'+sv.toLocaleString(undefined,{maximumFractionDigits:0})]; } },

  { id: 'espp', name: 'ESPP Calculator (Stock Purchase Plan)', desc: 'Employee stock purchase plan discount and gain', kw: 'espp calculator employee stock purchase plan discount lookback',
    inputs: [{id:'salary',label:'Annual Salary ($)',type:'number',def:100000},{id:'contrib',label:'Contribution per Period (%)',type:'number',def:10},{id:'period',label:'Offering Period (months)',type:'number',def:6},{id:'discount',label:'Purchase Discount (%)',type:'number',def:15},{id:'startPrice',label:'Price at Period Start ($)',type:'number',def:50},{id:'endPrice',label:'Price at Purchase Date ($)',type:'number',def:60},{id:'lookback',label:'Lookback Feature',type:'select',opts:[{v:'1',l:'Yes (use lower of start/purchase price)'},{v:'0',l:'No (use purchase-date price)'}],def:'1'}],
    calc: function(v) { var accumulated = v.salary * v.contrib/100 * v.period/12; var basePrice = (v.lookback==='1') ? Math.min(v.startPrice, v.endPrice) : v.endPrice; var purchasePrice = basePrice * (1 - v.discount/100); var shares = accumulated / purchasePrice; var value = shares * v.endPrice; var gain = value - accumulated; var gainPct = gain / accumulated * 100; return { result: 'Shares: ' + shares.toFixed(2), chart: Charts.donut([accumulated, gain], ['Contributed','Gain']), extra: 'Purchase price: $'+purchasePrice.toFixed(2)+' | Value: $'+value.toFixed(2)+' | Gain: $'+gain.toFixed(2)+' ('+gainPct.toFixed(1)+'%)' }; },
    steps: function(v) { var accumulated=v.salary*v.contrib/100*v.period/12; var basePrice=(v.lookback==='1')?Math.min(v.startPrice,v.endPrice):v.endPrice; var purchasePrice=basePrice*(1-v.discount/100); var shares=accumulated/purchasePrice; var value=shares*v.endPrice; return ['Step 1: Accumulated = $'+v.salary.toLocaleString()+' × '+v.contrib+'% × '+v.period+'/12 = $'+accumulated.toFixed(2),'Step 2: Purchase price = '+(v.lookback==='1'?'lookback min($'+v.startPrice+', $'+v.endPrice+')':'$'+v.endPrice)+' × (1−'+v.discount+'%) = $'+purchasePrice.toFixed(2),'Step 3: Shares = $'+accumulated.toFixed(2)+' / $'+purchasePrice.toFixed(2)+' = '+shares.toFixed(2),'Step 4: Value = '+shares.toFixed(2)+' × $'+v.endPrice+' = $'+value.toFixed(2),'Step 5: Gain = $'+(value-accumulated).toFixed(2)+' ('+((value-accumulated)/accumulated*100).toFixed(1)+'%)']; } },

  { id: 'roth-vs-traditional', name: 'Roth vs Traditional 401(k)', desc: 'Compare after-tax retirement outcomes', kw: 'roth vs traditional 401k ira comparison after tax',
    inputs: [{id:'contrib',label:'Annual Contribution ($)',type:'number',def:10000},{id:'currentTax',label:'Current Marginal Tax (%)',type:'number',def:24},{id:'retireTax',label:'Retirement Tax Rate (%)',type:'number',def:15},{id:'years',label:'Years to Retirement',type:'number',def:20},{id:'rate',label:'Annual Return (%)',type:'number',def:7}],
    calc: function(v) { var fvFactor = Math.pow(1 + v.rate/100, v.years); var roth = v.contrib * (1 - v.currentTax/100) * fvFactor; var trad = v.contrib * fvFactor * (1 - v.retireTax/100); var better = roth > trad ? 'Roth' : 'Traditional'; return { result: 'Better: ' + better + ' ($' + (roth > trad ? roth : trad).toLocaleString(undefined,{maximumFractionDigits:0}) + ' after-tax)', chart: Charts.bar([roth, trad], ['Roth (after-tax)','Traditional (after-tax)']), extra: 'Roth: $'+roth.toLocaleString(undefined,{maximumFractionDigits:0})+' | Traditional: $'+trad.toLocaleString(undefined,{maximumFractionDigits:0})+' | Difference: $'+Math.abs(roth-trad).toLocaleString(undefined,{maximumFractionDigits:0}) }; },
    steps: function(v) { var f=Math.pow(1+v.rate/100,v.years); var roth=v.contrib*(1-v.currentTax/100)*f; var trad=v.contrib*f*(1-v.retireTax/100); return ['Formula: Roth after-tax = C × (1 − tax now) × (1+r)^n | Traditional after-tax = C × (1+r)^n × (1 − tax later)','Step 1: Growth factor = (1+'+v.rate+'%)^'+v.years+' = '+f.toFixed(4),'Step 2: Roth = $'+v.contrib.toLocaleString()+' × '+(1-v.currentTax/100)+' × '+f.toFixed(4)+' = $'+roth.toLocaleString(undefined,{maximumFractionDigits:0}),'Step 3: Traditional = $'+v.contrib.toLocaleString()+' × '+f.toFixed(4)+' × '+(1-v.retireTax/100)+' = $'+trad.toLocaleString(undefined,{maximumFractionDigits:0}),'Step 4: '+(roth>trad?'Roth wins':'Traditional wins')+' — the deciding factor is your tax rate now vs in retirement']; } }
,

  { id: 'recast-mortgage', name: 'Mortgage Recast Calculator', desc: 'New payment after a lump-sum principal payment', kw: 'mortgage recast calculator recasting loan payment',
    inputs: [{id:'balance',label:'Current Balance ($)',type:'number',def:200000},{id:'rate',label:'Rate (%)',type:'number',def:6},{id:'years',label:'Years Remaining',type:'number',def:20},{id:'extra',label:'Lump-Sum Principal Payment ($)',type:'number',def:20000}],
    calc: function(v) { var r=v.rate/100/12; var n=Math.round(v.years*12); var newBal=Math.max(0,v.balance-v.extra); var pay=function(b){ return b*r/(1-Math.pow(1+r,-n)); }; var oldP=pay(v.balance); var newP=pay(newBal); return { result: 'New payment: $' + newP.toFixed(2) + '/mo', chart: Charts.donut([v.extra,newBal],['Lump sum','New balance']), extra: 'Old: $'+oldP.toFixed(2)+' | New balance: $'+newBal.toLocaleString()+' | Savings: $'+(oldP-newP).toFixed(2)+'/mo' }; },
    steps: function(v) { var r=v.rate/100/12; var n=Math.round(v.years*12); var newBal=Math.max(0,v.balance-v.extra); var pay=function(b){ return b*r/(1-Math.pow(1+r,-n)); }; var oldP=pay(v.balance); var newP=pay(newBal); return ['Formula: M = P·r/(1-(1+r)^-n)','Step 1: New balance = $'+v.balance.toLocaleString()+' − $'+v.extra.toLocaleString()+' = $'+newBal.toLocaleString(),'Step 2: Monthly rate = '+v.rate+'%/12 = '+(r*100).toFixed(3)+'%','Step 3: Old payment = $'+oldP.toFixed(2),'Step 4: New payment = $'+newP.toFixed(2),'Result: You save $'+(oldP-newP).toFixed(2)+' per month for the remaining '+v.years+' years']; } },

  { id: 'biweekly-mortgage', name: 'Biweekly Mortgage Calculator', desc: 'Save by paying half your mortgage every two weeks', kw: 'biweekly mortgage calculator accelerated payments savings',
    inputs: [{id:'principal',label:'Loan Amount ($)',type:'number',def:200000},{id:'rate',label:'Rate (%)',type:'number',def:6},{id:'years',label:'Loan Term (years)',type:'number',def:30}],
    calc: function(v) { var r=v.rate/100/12; var n=v.years*12; var emi=v.principal*r/(1-Math.pow(1+r,-n)); var bal=v.principal; var months=0; var totalInt=0; while(bal>0&&months<600){ var int=bal*r; totalInt+=int; var p=emi/2*26/12; bal=bal+int-p; months++; } var savedInt=emi*n-v.principal-totalInt; return { result: 'Biweekly: $' + (emi/2).toFixed(2), chart: Charts.bar([months/12, v.years], ['Biweekly','Monthly']), extra: 'Payoff: '+months+' mo ('+Math.floor(months/12)+'y '+months%12+'m) vs '+v.years+'y | Interest saved: $'+savedInt.toFixed(0) }; },
    steps: function(v) { var r=v.rate/100/12; var n=v.years*12; var emi=v.principal*r/(1-Math.pow(1+r,-n)); return ['Step 1: Monthly payment = $'+emi.toFixed(2),'Step 2: Biweekly payment = half = $'+(emi/2).toFixed(2),'Step 3: 26 biweekly payments = 13 full monthly payments per year','Step 4: The extra half payment each year attacks principal directly','Step 5: Result: faster payoff + less total interest than the standard '+v.years+'-year plan']; } },

  { id: 'mortgage-points', name: 'Mortgage Points Calculator', desc: 'Do discount points pay off? Break-even analysis', kw: 'mortgage points calculator break even discount points',
    inputs: [{id:'loan',label:'Loan Amount ($)',type:'number',def:300000},{id:'rate',label:'Base Rate (%)',type:'number',def:6},{id:'points',label:'Points (as % of loan)',type:'number',def:1},{id:'newRate',label:'Rate After Points (%)',type:'number',def:5.75},{id:'years',label:'Planned Years in Home',type:'number',def:5}],
    calc: function(v) { var cost=v.loan*v.points/100; var r1=v.rate/100/12; var r2=v.newRate/100/12; var n=360; var p1=v.loan*r1/(1-Math.pow(1+r1,-n)); var p2=v.loan*r2/(1-Math.pow(1+r2,-n)); var savePerMo=p1-p2; var breakeven=savePerMo>0?cost/savePerMo:0; var planned=v.years*12; var gain=savePerMo*planned-cost; return { result: 'Break-even: ' + breakeven.toFixed(1) + ' months', chart: Charts.gauge(Math.min(breakeven/120,1)*100,100), extra: 'Points cost: $'+cost.toLocaleString()+' | Saves: $'+savePerMo.toFixed(2)+'/mo | At '+v.years+'y: '+(gain>=0?'gain $'+gain.toFixed(0):'lose $'+(-gain).toFixed(0)) }; },
    steps: function(v) { var cost=v.loan*v.points/100; var r1=v.rate/100/12; var r2=v.newRate/100/12; var n=360; var p1=v.loan*r1/(1-Math.pow(1+r1,-n)); var p2=v.loan*r2/(1-Math.pow(1+r2,-n)); var savePerMo=p1-p2; var be=savePerMo>0?cost/savePerMo:0; return ['Step 1: Points cost = '+v.points+'% × $'+v.loan.toLocaleString()+' = $'+cost.toLocaleString(),'Step 2: Payment at '+v.rate+'% = $'+p1.toFixed(2),'Step 3: Payment at '+v.newRate+'% = $'+p2.toFixed(2),'Step 4: Monthly savings = $'+savePerMo.toFixed(2),'Step 5: Break-even = $'+cost.toLocaleString()+' / $'+savePerMo.toFixed(2)+' = '+be.toFixed(1)+' months']; } },

  { id: 'rent-affordability', name: 'Rent Affordability Calculator', desc: 'How much rent can you afford?', kw: 'rent affordability calculator how much rent can i afford 30 percent rule',
    inputs: [{id:'income',label:'Monthly Gross Income ($)',type:'number',def:6000},{id:'debts',label:'Monthly Debt Payments ($)',type:'number',def:500},{id:'rule',label:'Budget Rule',type:'select',opts:[{v:'30',l:'30% gross'},{v:'28',l:'28% housing (FHA)'},{v:'25',l:'25% conservative'}],def:'30'}],
    calc: function(v) { var pct=parseFloat(v.rule)/100; var front=v.income*pct; var back=v.income*0.36-v.debts; var rent=Math.min(front,back); return { result: 'Affordable rent: $' + rent.toFixed(0) + '/mo', chart: Charts.donut([rent, v.income-rent],['Rent','Other']), extra: 'Front-end ('+v.rule+'%): $'+front.toFixed(0)+' | Back-end (36% − debts): $'+back.toFixed(0)+' | Rent is '+((rent/v.income)*100).toFixed(0)+'% of income' }; },
    steps: function(v) { var pct=parseFloat(v.rule)/100; var front=v.income*pct; var back=v.income*0.36-v.debts; var rent=Math.min(front,back); return ['Step 1: Front-end = '+v.rule+'% × $'+v.income.toLocaleString()+' = $'+front.toFixed(0),'Step 2: Back-end = 36% × $'+v.income.toLocaleString()+' − $'+v.debts.toLocaleString()+' = $'+back.toFixed(0),'Step 3: Affordable rent = the lower of the two = $'+rent.toFixed(0),'Tip: Landlords often require gross income ≥ 3× the rent']; } },

  { id: 'dividend-reinvestment', name: 'Dividend Reinvestment Calculator', desc: 'DRIP growth with reinvested dividends', kw: 'dividend reinvestment calculator drip compounding',
    inputs: [{id:'initial',label:'Initial Investment ($)',type:'number',def:10000},{id:'yield',label:'Dividend Yield (%)',type:'number',def:3},{id:'growth',label:'Price Growth (%)',type:'number',def:5},{id:'years',label:'Years',type:'number',def:10},{id:'monthly',label:'Monthly Contribution ($)',type:'number',def:0}],
    calc: function(v) { var total=v.initial; var contrib=0; for(var y=0;y<v.years;y++){ total+=v.monthly*12; contrib+=v.monthly*12; total*=1+v.yield/100+v.growth/100; } return { result: 'Future value: $' + total.toFixed(0), chart: Charts.donut([contrib,v.initial],['Contributions','Initial']), extra: 'With dividends reinvested at '+v.yield+'% + '+v.growth+'% growth over '+v.years+'y | Contributions: $'+contrib.toFixed(0) }; },
    steps: function(v) { var total=v.initial; for(var y=0;y<v.years;y++){ total+=v.monthly*12; total*=1+v.yield/100+v.growth/100; } return ['Step 1: Annual total return = '+v.yield+'% + '+v.growth+'% = '+(v.yield+v.growth)+'%','Step 2: Each year: value += contributions, then × 1.'+(v.yield+v.growth),'Step 3: Compound for '+v.years+' years','Step 4: Final value = $'+total.toFixed(0)]; } },

  { id: 'stock-split', name: 'Stock Split Calculator', desc: 'New share count and price after a split', kw: 'stock split calculator forward reverse ratio',
    inputs: [{id:'shares',label:'Shares Owned',type:'number',def:100},{id:'price',label:'Price per Share ($)',type:'number',def:200},{id:'a',label:'Split Ratio A (e.g. 2)',type:'number',def:2},{id:'b',label:'Split Ratio B (e.g. 1)',type:'number',def:1}],
    calc: function(v) { if(v.a<=0||v.b<=0) return{result:'Split ratio must be positive',chart:'',extra:''}; var newShares=v.shares*v.a/v.b; var newPrice=v.price*v.b/v.a; return { result: 'New shares: ' + newShares, chart: Charts.bar([v.shares,newShares],['Before','After']), extra: 'New price: $'+newPrice.toFixed(2)+' | Value unchanged: $'+(v.shares*v.price).toFixed(0) }; },
    steps: function(v) { var ns=v.shares*v.a/v.b; var np=v.price*v.b/v.a; return ['Formula: New shares = old × A/B; New price = old × B/A','Step 1: New shares = '+v.shares+' × '+v.a+'/'+v.b+' = '+ns,'Step 2: New price = $'+v.price+' × '+v.b+'/'+v.a+' = $'+np.toFixed(2),'Step 3: Total value stays '+v.a+':'+v.b+' = $'+(v.shares*v.price).toFixed(0)]; } },

  { id: 'eps-calculator', name: 'Earnings Per Share Calculator', desc: 'Basic EPS from net income and share count', kw: 'earnings per share calculator eps',
    inputs: [{id:'netIncome',label:'Net Income ($)',type:'number',def:1000000},{id:'prefDiv',label:'Preferred Dividends ($)',type:'number',def:50000},{id:'shares',label:'Common Shares Outstanding',type:'number',def:200000}],
    calc: function(v) { if(v.shares<=0) return{result:'Shares must be positive',chart:'',extra:''}; var eps=(v.netIncome-v.prefDiv)/v.shares; return { result: 'EPS: $' + eps.toFixed(2), chart: Charts.gauge(Math.min(eps/10,1)*100,100), extra: 'Earnings available to common: $'+(v.netIncome-v.prefDiv).toLocaleString()+' | per share basis' }; },
    steps: function(v) { var eps=(v.netIncome-v.prefDiv)/v.shares; return ['Formula: EPS = (Net Income − Preferred Dividends) / Shares','Step 1: $'+v.netIncome.toLocaleString()+' − $'+v.prefDiv.toLocaleString()+' = $'+(v.netIncome-v.prefDiv).toLocaleString(),'Step 2: ÷ '+v.shares.toLocaleString()+' shares','Step 3: EPS = $'+eps.toFixed(2)]; } },

  { id: 'book-value-share', name: 'Book Value Per Share Calculator', desc: 'BVPS from shareholder equity', kw: 'book value per share calculator bvps',
    inputs: [{id:'equity',label:'Shareholders\' Equity ($)',type:'number',def:5000000},{id:'pref',label:'Preferred Equity ($)',type:'number',def:500000},{id:'shares',label:'Common Shares Outstanding',type:'number',def:300000}],
    calc: function(v) { if(v.shares<=0) return{result:'Shares must be positive',chart:'',extra:''}; var bvps=(v.equity-v.pref)/v.shares; return { result: 'BVPS: $' + bvps.toFixed(2), chart: Charts.gauge(Math.min(bvps/50,1)*100,100), extra: 'Common equity: $'+(v.equity-v.pref).toLocaleString()+' | Book value per common share' }; },
    steps: function(v) { var bvps=(v.equity-v.pref)/v.shares; return ['Formula: BVPS = (Total Equity − Preferred) / Common Shares','Step 1: $'+v.equity.toLocaleString()+' − $'+v.pref.toLocaleString()+' = $'+(v.equity-v.pref).toLocaleString(),'Step 2: ÷ '+v.shares.toLocaleString()+' shares','Step 3: BVPS = $'+bvps.toFixed(2)]; } },

  { id: 'net-operating-income', name: 'NOI Calculator', desc: 'Net operating income for income properties', kw: 'net operating income calculator noi real estate',
    inputs: [{id:'grossRent',label:'Gross Rental Income ($/yr)',type:'number',def:100000},{id:'vacancy',label:'Vacancy & Losses (%)',type:'number',def:5},{id:'opex',label:'Operating Expenses ($/yr)',type:'number',def:35000}],
    calc: function(v) { var egi=v.grossRent*(1-v.vacancy/100); var noi=egi-v.opex; return { result: 'NOI: $' + noi.toLocaleString() + '/yr', chart: Charts.donut([v.opex,noi],['Expenses','NOI']), extra: 'Effective gross income: $'+egi.toLocaleString()+' | Cap rate at 8% value: '+(noi/0.08).toLocaleString(undefined,{maximumFractionDigits:0}) }; },
    steps: function(v) { var egi=v.grossRent*(1-v.vacancy/100); var noi=egi-v.opex; return ['Formula: NOI = Gross Rent × (1 − vacancy) − Operating Expenses','Step 1: Effective gross = $'+v.grossRent.toLocaleString()+' × '+(1-v.vacancy/100)+' = $'+egi.toLocaleString(),'Step 2: NOI = $'+egi.toLocaleString()+' − $'+v.opex.toLocaleString(),'Step 3: NOI = $'+noi.toLocaleString()]; } },

  { id: 'credit-utilization', name: 'Credit Utilization Calculator', desc: 'Your revolving utilization ratio', kw: 'credit utilization calculator credit card ratio',
    inputs: [{id:'balances',label:'Total Card Balances ($)',type:'number',def:8000},{id:'limits',label:'Total Credit Limits ($)',type:'number',def:20000}],
    calc: function(v) { if(v.limits<=0) return{result:'Limits must be positive',chart:'',extra:''}; var util=v.balances/v.limits*100; var band=util<10?'Excellent':util<30?'Good':util<50?'Fair':'Poor — pay down balances'; return { result: 'Utilization: ' + util.toFixed(1) + '%', chart: Charts.gauge(util,100), extra: band + ' | Under 30% is the commonly recommended ceiling' }; },
    steps: function(v) { var util=v.balances/v.limits*100; return ['Formula: Utilization = Total Balances / Total Limits × 100','Step 1: $'+v.balances.toLocaleString()+' / $'+v.limits.toLocaleString(),'Step 2: = '+(v.balances/v.limits).toFixed(4),'Step 3: Utilization = '+util.toFixed(1)+'%']; } },

  { id: 'apy-calculator', name: 'APY Calculator', desc: 'Effective annual yield from a nominal rate', kw: 'apy calculator annual percentage yield compounding',
    inputs: [{id:'rate',label:'Nominal Rate (%)',type:'number',def:5},{id:'freq',label:'Compounding',type:'select',opts:[{v:'12',l:'Monthly'},{v:'4',l:'Quarterly'},{v:'2',l:'Semi-annual'},{v:'1',l:'Annual'},{v:'365',l:'Daily'}],def:'12'},{id:'principal',label:'Principal ($)',type:'number',def:10000},{id:'years',label:'Years',type:'number',def:1}],
    calc: function(v) { var m=parseInt(v.freq); var apy=Math.pow(1+v.rate/100/m,m)-1; var fv=v.principal*Math.pow(1+v.rate/100/m,m*v.years); return { result: 'APY: ' + (apy*100).toFixed(3) + '%', chart: Charts.gauge(apy*100,10), extra: 'FV of $'+v.principal.toLocaleString()+' after '+v.years+'y: $'+fv.toFixed(2)+' | Interest: $'+(fv-v.principal).toFixed(2) }; },
    steps: function(v) { var m=parseInt(v.freq); var apy=Math.pow(1+v.rate/100/m,m)-1; return ['Formula: APY = (1 + r/m)^m − 1','Step 1: r/m = '+v.rate+'%/'+m+' = '+(v.rate/100/m*100).toFixed(3)+'%','Step 2: (1 + '+(v.rate/100/m).toFixed(5)+')^'+m+' = '+(Math.pow(1+v.rate/100/m,m)).toFixed(6),'Step 3: APY = '+(apy*100).toFixed(3)+'%']; } },

  { id: 'lump-sum-vs-sip', name: 'Lump Sum vs SIP Calculator', desc: 'Compare one-time investing against monthly SIP', kw: 'lump sum vs sip calculator comparison mutual fund',
    inputs: [{id:'lump',label:'Lump Sum Amount ($)',type:'number',def:120000},{id:'sip',label:'Monthly SIP ($)',type:'number',def:1000},{id:'return',label:'Expected Annual Return (%)',type:'number',def:12},{id:'years',label:'Investment Period (years)',type:'number',def:10}],
    calc: function(v) { var r=v.return/100/12; var n=v.years*12; var fvLump=v.lump*Math.pow(1+v.return/100,v.years); var fvSip=v.sip*((Math.pow(1+r,n)-1)/r); return { result: 'Lump sum: $' + fvLump.toFixed(0) + ' | SIP: $' + fvSip.toFixed(0), chart: Charts.bar([fvLump,fvSip],['Lump sum','SIP']), extra: (fvLump>=fvSip?'Lump sum wins by $'+(fvLump-fvSip).toFixed(0):'SIP wins by $'+(fvSip-fvLump).toFixed(0))+' | SIP invested: $'+(v.sip*n).toLocaleString() }; },
    steps: function(v) { var r=v.return/100/12; var n=v.years*12; var fvLump=v.lump*Math.pow(1+v.return/100,v.years); var fvSip=v.sip*((Math.pow(1+r,n)-1)/r); return ['Step 1: FV (lump sum) = P(1+r)^t = $'+v.lump.toLocaleString()+' × '+(Math.pow(1+v.return/100,v.years)).toFixed(4)+' = $'+fvLump.toFixed(0),'Step 2: FV (SIP) = PMT × ((1+r)^n − 1)/r','Step 3: SIP monthly rate = '+v.return+'%/12 = '+(r*100).toFixed(3)+'%','Step 4: FV (SIP) = $'+fvSip.toFixed(0),'Note: Lump sum only beats SIP when invested early in the period']; } },

  { id: 'pmi-calculator', name: 'PMI Calculator', desc: 'Private mortgage insurance estimate', kw: 'pmi calculator private mortgage insurance monthly',
    inputs: [{id:'homePrice',label:'Home Price ($)',type:'number',def:300000},{id:'down',label:'Down Payment (%)',type:'number',def:10},{id:'pmiRate',label:'Annual PMI Rate (%)',type:'number',def:0.5}],
    calc: function(v) { var down=v.homePrice*v.down/100; var loan=v.homePrice-down; var ltv=loan/v.homePrice*100; var annual=loan*v.pmiRate/100; return { result: 'PMI: $' + (annual/12).toFixed(2) + '/mo', chart: Charts.donut([down,loan],['Down payment','Loan']), extra: 'Loan: $'+loan.toLocaleString()+' | LTV: '+ltv.toFixed(0)+'% | Annual: $'+annual.toFixed(0)+' | PMI typically drops at 78–80% LTV' }; },
    steps: function(v) { var down=v.homePrice*v.down/100; var loan=v.homePrice-down; var annual=loan*v.pmiRate/100; return ['Step 1: Down payment = '+v.down+'% × $'+v.homePrice.toLocaleString()+' = $'+down.toLocaleString(),'Step 2: Loan = $'+v.homePrice.toLocaleString()+' − $'+down.toLocaleString()+' = $'+loan.toLocaleString(),'Step 3: Annual PMI = '+v.pmiRate+'% × $'+loan.toLocaleString()+' = $'+annual.toFixed(0),'Step 4: Monthly PMI = $'+(annual/12).toFixed(2)]; } },

  { id: 'pension-lump-sum', name: 'Pension Lump Sum vs Annuity Calculator', desc: 'Compare a pension payout against a lump sum', kw: 'pension lump sum vs annuity calculator present value',
    inputs: [{id:'pension',label:'Monthly Pension Payment ($)',type:'number',def:2000},{id:'years',label:'Expected Payout Years',type:'number',def:25},{id:'discount',label:'Discount Rate (%)',type:'number',def:5},{id:'lumpOffered',label:'Lump Sum Offered ($)',type:'number',def:350000}],
    calc: function(v) { var r=v.discount/100; var n=v.years; var pv=v.pension*12*((1-Math.pow(1+r,-n))/r); var diff=v.lumpOffered-pv; return { result: 'PV of annuity: $' + pv.toFixed(0), chart: Charts.bar([pv,v.lumpOffered],['Annuity PV','Lump sum']), extra: (diff>=0?'Lump sum worth $'+diff.toFixed(0)+' more':'Annuity worth $'+(-diff).toFixed(0)+' more')+' | at '+v.discount+'% discount rate' }; },
    steps: function(v) { var r=v.discount/100; var n=v.years; var pv=v.pension*12*((1-Math.pow(1+r,-n))/r); return ['Formula: PV = PMT × (1 − (1+r)^-n) / r','Step 1: Annual pension = $'+v.pension.toLocaleString()+' × 12 = $'+(v.pension*12).toLocaleString(),'Step 2: PV = $'+(v.pension*12).toLocaleString()+' × (1 − 1.'+v.discount+'^'+v.years+' / '+v.discount+')','Step 3: PV of annuity = $'+pv.toFixed(0),'Step 4: Compare against lump sum of $'+v.lumpOffered.toLocaleString()]; } },

  { id: 'prorated-rent', name: 'Prorated Rent Calculator', desc: 'Fair rent owed for a partial month of occupancy', kw: 'prorated rent calculator partial month move in move out daily rent',
    inputs: [{id:'rent',label:'Monthly Rent ($)',type:'number',def:1200},{id:'day',label:'Occupied Days',type:'number',def:15},{id:'days',label:'Days in Month',type:'number',def:30}],
    calc: function(v){ if(v.rent<=0||v.day<0||v.days<=0||v.day>v.days) return{result:'Enter rent > 0 and occupied days between 0 and days in month',chart:'',extra:''}; var daily=v.rent/v.days; var owed=daily*v.day; return{result:'Prorated Rent: $'+owed.toFixed(2),chart:Charts.bar([v.rent-owed,owed],['Unused days','Occupied days']),extra:'Daily rate: $'+daily.toFixed(2)+' | '+v.day+' of '+v.days+' days ('+(v.day/v.days*100).toFixed(1)+'% of month)'};},
    steps: function(v){ var daily=v.rent/v.days; var owed=daily*v.day; return['Formula: Owed = (Monthly rent ÷ days in month) × occupied days','Step 1: Daily rate = $'+v.rent.toFixed(2)+' ÷ '+v.days+' = $'+daily.toFixed(2),'Step 2: Owed = $'+daily.toFixed(2)+' × '+v.day+' days = $'+owed.toFixed(2),'Some leases use a 30-day standard month instead of the actual day count — agree on the method in the lease'];} },

  { id: 'dso', name: 'Days Sales Outstanding (DSO)', desc: 'Average days to collect payment after a credit sale', kw: 'dso calculator days sales outstanding receivables collection period working capital',
    inputs: [{id:'ar',label:'Accounts Receivable ($)',type:'number',def:50000},{id:'sales',label:'Credit Sales ($) for the Period',type:'number',def:600000},{id:'days',label:'Period Length (days)',type:'number',def:365}],
    calc: function(v){ if(v.sales<=0||v.days<=0) return{result:'Credit sales and period length must be positive',chart:'',extra:''}; var dso=v.ar/v.sales*v.days; return{result:'DSO: '+dso.toFixed(1)+' days',chart:Charts.gauge(dso,90),extra:'Receivables turn over '+(v.days/dso).toFixed(1)+'× per period | Under about 45 days is generally healthy'};},
    steps: function(v){ var dso=v.ar/v.sales*v.days; return['Formula: DSO = (Accounts receivable ÷ credit sales) × days in period','Step 1: AR ÷ Sales = $'+v.ar.toLocaleString()+' ÷ $'+v.sales.toLocaleString()+' = '+(v.ar/v.sales).toFixed(4),'Step 2: DSO = '+(v.ar/v.sales).toFixed(4)+' × '+v.days+' = '+dso.toFixed(1)+' days','Lower DSO means faster cash conversion; compare it against your stated payment terms'];} },

  { id: 'payout-ratio', name: 'Dividend Payout Ratio Calculator', desc: 'Share of earnings paid out as dividends', kw: 'dividend payout ratio calculator dividends earnings retention', inputs: [{id:'div',label:'Dividend Per Share ($)',type:'number',def:3},{id:'eps',label:'Earnings Per Share ($)',type:'number',def:8}], calc: function(v){ if(v.eps<=0||v.div<0) return{result:'EPS must be positive',chart:'',extra:''}; var p=v.div/v.eps*100; return{result:'Payout Ratio: '+p.toFixed(1)+'%',chart:Charts.bar([p,100-p],['Paid out','Retained']),extra:'Retention ratio: '+(100-p).toFixed(1)+'% — the share of earnings reinvested in the business'};}, steps: function(v){ var p=v.div/v.eps*100; return['Formula: Payout ratio = Dividend per share ÷ EPS × 100','Step 1: $'+v.div+' ÷ $'+v.eps+' = '+(v.div/v.eps).toFixed(4),'Step 2: × 100 = '+p.toFixed(1)+'%','Below 60% is typical for mature stable payers; above 100% is unsustainable long term'];} },

  { id: 'market-cap', name: 'Market Capitalization Calculator', desc: 'Company value from share price and shares outstanding', kw: 'market cap calculator market capitalization share price shares outstanding company value', inputs: [{id:'price',label:'Share Price ($)',type:'number',def:150},{id:'shares',label:'Shares Outstanding',type:'number',def:1000000000}], calc: function(v){ if(v.price<=0||v.shares<=0) return{result:'Price and shares must be positive',chart:'',extra:''}; var mc=v.price*v.shares; var f=mc>=1e12?(mc/1e12).toFixed(2)+'T':mc>=1e9?(mc/1e9).toFixed(2)+'B':(mc/1e6).toFixed(2)+'M'; return{result:'Market Cap: $'+f,chart:Charts.gauge(Math.log10(mc),13),extra:mc.toLocaleString()+' total value — large-cap is generally $10B+, mid-cap $2–10B, small-cap below $2B'};}, steps: function(v){ var mc=v.price*v.shares; return['Formula: Market cap = Share price × Shares outstanding','Step 1: $'+v.price+' × '+v.shares.toLocaleString()+' = $'+mc.toLocaleString(),'Market cap reflects what the market currently values the whole equity at, not what the company is worth in a takeover'];} },


  { id: 'sortino-ratio', name: 'Sortino Ratio Calculator', desc: 'Return per unit of downside risk', kw: 'sortino ratio calculator downside deviation risk adjusted return investment', inputs: [{id:'ret',label:'Portfolio Return (%)',type:'number',def:12},{id:'rf',label:'Risk-Free Rate (%)',type:'number',def:3},{id:'dd',label:'Downside Deviation (%)',type:'number',def:10}], calc: function(v){ if(v.dd<=0) return{result:'Downside deviation must be positive',chart:'',extra:''}; var s=(v.ret-v.rf)/v.dd; return{result:'Sortino Ratio: '+s.toFixed(2),chart:Charts.gauge(Math.max(0,s),4),extra:'Like the Sharpe ratio but only penalises downside volatility — above 1 is generally good, above 2 is strong'};}, steps: function(v){ var s=(v.ret-v.rf)/v.dd; return['Formula: Sortino = (Return − Risk-free rate) ÷ Downside deviation','Step 1: Excess return = '+v.ret+'% − '+v.rf+'% = '+(v.ret-v.rf)+'%','Step 2: ÷ '+v.dd+'% = '+s.toFixed(2),'Only returns below the target (usually the risk-free rate) count toward the deviation, so upside volatility does not hurt the score'];} },

  { id: 'max-drawdown', name: 'Maximum Drawdown Calculator', desc: 'Largest peak-to-trough decline of an investment', kw: 'maximum drawdown calculator peak to trough decline portfolio risk', inputs: [{id:'peak',label:'Peak Value ($)',type:'number',def:100000},{id:'trough',label:'Trough Value ($)',type:'number',def:75000}], calc: function(v){ if(v.peak<=0||v.trough<=0||v.trough>v.peak) return{result:'Peak must be positive and trough must not exceed peak',chart:'',extra:''}; var dd=(v.trough-v.peak)/v.peak*100; var rec=(v.peak/v.trough-1)*100; return{result:'Max Drawdown: '+dd.toFixed(1)+'%',chart:Charts.bar([v.trough,v.peak],['Trough','Peak']),extra:'Gain needed to recover: +'+rec.toFixed(1)+'% — recovery always requires a larger percentage gain than the loss itself'};}, steps: function(v){ var dd=(v.trough-v.peak)/v.peak*100; var rec=(v.peak/v.trough-1)*100; return['Formula: Drawdown = (Trough − Peak) ÷ Peak × 100','Step 1: ('+v.trough.toLocaleString()+' − '+v.peak.toLocaleString()+') ÷ '+v.peak.toLocaleString()+' = '+(dd/100).toFixed(4),'Step 2: × 100 = '+dd.toFixed(1)+'%','Step 3: Recovery gain needed = Peak ÷ Trough − 1 = +'+rec.toFixed(1)+'%'];} },

  { id: 'zero-coupon-bond', name: 'Zero Coupon Bond Value Calculator', desc: 'Present value of a bond sold at a discount', kw: 'zero coupon bond calculator present value discount bond face value', inputs: [{id:'face',label:'Face Value ($)',type:'number',def:1000},{id:'rate',label:'Yield (%)',type:'number',def:5},{id:'years',label:'Years to Maturity',type:'number',def:10}], calc: function(v){ if(v.face<=0||v.years<0) return{result:'Face value must be positive',chart:'',extra:''}; var pv=v.face/Math.pow(1+v.rate/100,v.years); return{result:'Bond Value Today: $'+pv.toFixed(2),chart:Charts.bar([pv,v.face-pv],['Present value','Discount']),extra:'Discount: $'+(v.face-pv).toFixed(2)+' — the entire return comes from buying below face value and receiving full face at maturity'};}, steps: function(v){ var pv=v.face/Math.pow(1+v.rate/100,v.years); return['Formula: PV = Face value ÷ (1 + y)^n','Step 1: (1 + '+(v.rate/100)+')^'+v.years+' = '+Math.pow(1+v.rate/100,v.years).toFixed(4),'Step 2: $'+v.face.toLocaleString()+' ÷ '+Math.pow(1+v.rate/100,v.years).toFixed(4)+' = $'+pv.toFixed(2)];} },

  { id: 'cd-ladder', name: 'CD Ladder Calculator', desc: 'Laddered certificates of deposit for rate and liquidity', kw: 'cd ladder calculator certificates of deposit maturity strategy interest', inputs: [{id:'total',label:'Total to Invest ($)',type:'number',def:50000},{id:'rungs',label:'Number of CDs',type:'number',def:5},{id:'rate',label:'Average APY (%)',type:'number',def:4}], calc: function(v){ if(v.total<=0||v.rungs<1||v.rate<0) return{result:'Enter positive values',chart:'',extra:''}; var each=v.total/v.rungs; var interest=v.total*v.rate/100; return{result:'Per-CD Deposit: $'+each.toFixed(2),chart:Charts.bar(Array.from({length:Math.min(6,v.rungs)},function(){return each;}),Array.from({length:Math.min(6,v.rungs)},function(_,i){return 'CD'+(i+1);})),extra:'First-year interest ≈ $'+interest.toFixed(2)+' | One CD matures each cycle, giving access to '+each.toFixed(0)+' without breaking the ladder'};}, steps: function(v){ var each=v.total/v.rungs; return['Step 1: Per-CD deposit = $'+v.total.toLocaleString()+' ÷ '+v.rungs+' = $'+each.toFixed(2),'Step 2: Split across terms (e.g. 1, 2, 3, 4, 5 years)','Step 3: First-year interest ≈ $'+v.total.toLocaleString()+' × '+(v.rate/100)+' = $'+(v.total*v.rate/100).toFixed(2),'As each rung matures, reinvest at the longest term — after the first cycle every CD earns long-term rates'];} },

  { id: 'ibond-value', name: 'I Bond Value Calculator', desc: 'Growth of a Series I savings bond at its composite rate', kw: 'i bond calculator series i savings bond composite rate inflation', inputs: [{id:'p',label:'Purchase Amount ($)',type:'number',def:1000},{id:'rate',label:'Composite Rate (%)',type:'number',def:4},{id:'years',label:'Years Held',type:'number',def:5}], calc: function(v){ if(v.p<=0||v.years<0||v.rate<-5) return{result:'Enter valid values',chart:'',extra:''}; var val=v.p*Math.pow(1+v.rate/100,v.years); return{result:'Estimated Value: $'+val.toFixed(2),chart:Charts.bar([v.p,val-v.p],['Principal','Growth']),extra:'Series I bonds earn a fixed rate plus an inflation adjustment reset every 6 months; this estimate holds the composite rate constant — actual value steps semi-annually'};}, steps: function(v){ var val=v.p*Math.pow(1+v.rate/100,v.years); return['Formula: Value = P × (1 + composite rate)^years','Step 1: (1 + '+(v.rate/100)+')^'+v.years+' = '+Math.pow(1+v.rate/100,v.years).toFixed(4),'Step 2: $'+v.p+' × '+Math.pow(1+v.rate/100,v.years).toFixed(4)+' = $'+val.toFixed(2),'Bonds redeemed before 5 years forfeit the last 3 months of interest; after 5 years redemption is penalty-free'];} },

  { id: 'put-call-parity', name: 'Put-Call Parity Calculator', desc: 'Consistency check between call and put prices', kw: 'put call parity calculator options arbitrage european options', inputs: [{id:'call',label:'Call Price ($)',type:'number',def:5},{id:'put',label:'Put Price ($)',type:'number',def:4},{id:'strike',label:'Strike ($)',type:'number',def:100},{id:'spot',label:'Spot Price ($)',type:'number',def:101},{id:'rf',label:'Risk-Free Rate (%)',type:'number',def:2},{id:'t',label:'Time to Expiry (years)',type:'number',def:0.5}], calc: function(v){ if(v.strike<=0||v.spot<=0||v.t<0) return{result:'Enter valid prices',chart:'',extra:''}; var pvk=v.strike*Math.exp(-v.rf/100*v.t); var lhs=v.call-v.put, rhs=v.spot-pvk; var gap=lhs-rhs; return{result:'Parity Gap: $'+gap.toFixed(2),chart:Charts.bar([lhs,rhs],['C−P','S−PV(K)']),extra:'PV(K) = $'+pvk.toFixed(2)+' | A gap near zero means prices are consistent; a large gap signals an arbitrage opportunity or stale quotes'};}, steps: function(v){ var pvk=v.strike*Math.exp(-v.rf/100*v.t); return['Formula: C − P = S − K·e^(−rT)','Step 1: PV of strike = '+v.strike+' × e^(−'+(v.rf/100*v.t).toFixed(4)+') = '+pvk.toFixed(4),'Step 2: C − P = '+v.call+' − '+v.put+' = '+(v.call-v.put).toFixed(2),'Step 3: S − PV(K) = '+v.spot+' − '+pvk.toFixed(2)+' = '+(v.spot-pvk).toFixed(2),'Step 4: Gap = '+(v.call-v.put).toFixed(2)+' − '+(v.spot-pvk).toFixed(2)+' = '+(v.call-v.put-v.spot+pvk).toFixed(2)];} },

  { id: 'risk-reward-ratio', name: 'Risk-Reward Ratio Calculator', desc: 'Reward earned per unit of risk on a trade', kw: 'risk reward ratio calculator trading stop loss target r multiple', inputs: [{id:'entry',label:'Entry Price ($)',type:'number',def:100},{id:'stop',label:'Stop-Loss Price ($)',type:'number',def:95},{id:'target',label:'Target Price ($)',type:'number',def:115}], calc: function(v){ var risk=Math.abs(v.entry-v.stop), rew=Math.abs(v.target-v.entry); if(risk<=0) return{result:'Stop must differ from entry',chart:'',extra:''}; return{result:'Risk-Reward Ratio: 1 : '+(rew/risk).toFixed(2),chart:Charts.bar([risk,rew],['Risk','Reward']),extra:'Risk per share: $'+risk.toFixed(2)+' | Reward per share: $'+rew.toFixed(2)+' | Many traders require at least 1:2 before taking a setup'};}, steps: function(v){ var risk=Math.abs(v.entry-v.stop), rew=Math.abs(v.target-v.entry); return['Formula: R:R = (Target − Entry) ÷ (Entry − Stop)','Step 1: Risk = |'+v.entry+' − '+v.stop+'| = $'+risk.toFixed(2),'Step 2: Reward = |'+v.target+' − '+v.entry+'| = $'+rew.toFixed(2),'Step 3: Ratio = '+rew.toFixed(2)+' ÷ '+risk.toFixed(2)+' = '+(rew/risk).toFixed(2)];} },

  { id: 'position-size', name: 'Position Size Calculator', desc: 'Share count from account risk and stop distance', kw: 'position size calculator stock trading risk management shares per trade', inputs: [{id:'acct',label:'Account Size ($)',type:'number',def:10000},{id:'riskPct',label:'Risk Per Trade (%)',type:'number',def:1},{id:'entry',label:'Entry Price ($)',type:'number',def:50},{id:'stop',label:'Stop-Loss Price ($)',type:'number',def:47}], calc: function(v){ var perShare=Math.abs(v.entry-v.stop); if(perShare<=0||v.acct<=0) return{result:'Stop must differ from entry; account must be positive',chart:'',extra:''}; var riskDollars=v.acct*v.riskPct/100; var shares=Math.floor(riskDollars/perShare); return{result:'Position Size: '+shares+' shares',chart:Charts.bar([riskDollars,shares*perShare],['Risk budget','Actual risk']),extra:'Risk budget: $'+riskDollars.toFixed(2)+' | Per-share risk: $'+perShare.toFixed(2)+' | Actual dollar risk: $'+(shares*perShare).toFixed(2)};}, steps: function(v){ var perShare=Math.abs(v.entry-v.stop); var riskDollars=v.acct*v.riskPct/100; return['Formula: Shares = (Account × risk %) ÷ per-share risk','Step 1: Risk budget = $'+v.acct.toLocaleString()+' × '+(v.riskPct/100)+' = $'+riskDollars.toFixed(2),'Step 2: Per-share risk = |'+v.entry+' − '+v.stop+'| = $'+perShare.toFixed(2),'Step 3: $'+riskDollars.toFixed(2)+' ÷ $'+perShare.toFixed(2)+' = '+(riskDollars/perShare).toFixed(2)+' → floor to '+Math.floor(riskDollars/perShare)+' shares'];} },

  { id: 'stop-loss', name: 'Stop-Loss Calculator', desc: 'Exit price from a trailing or fixed stop percentage', kw: 'stop loss calculator trailing stop exit price trading risk', inputs: [{id:'entry',label:'Entry Price ($)',type:'number',def:50},{id:'pct',label:'Stop Distance (%)',type:'number',def:6},{id:'long',label:'Direction (1=long, 0=short)',type:'number',def:1}], calc: function(v){ if(v.entry<=0||v.pct<=0) return{result:'Enter positive values',chart:'',extra:''}; var stop=v.long===1?v.entry*(1-v.pct/100):v.entry*(1+v.pct/100); var loss=Math.abs(v.entry-stop); return{result:'Stop-Loss Price: $'+stop.toFixed(2),chart:Charts.bar([v.entry,stop],['Entry','Stop']),extra:(v.long===1?'Long':'Short')+' position | Max loss per share: $'+loss.toFixed(2)+' ('+v.pct+'% of entry)'};}, steps: function(v){ var stop=v.long===1?v.entry*(1-v.pct/100):v.entry*(1+v.pct/100); return['Formula: Stop = Entry × (1 − stop%) for long, × (1 + stop%) for short','Step 1: '+v.entry+' × '+(v.long===1?(1-v.pct/100):(1+v.pct/100)).toFixed(4)+' = $'+stop.toFixed(2),'A trailing stop moves up with the price (for longs) but never moves back down'];} },

  { id: 'cost-basis-avg', name: 'Average Cost Basis Calculator', desc: 'Blended cost across multiple purchases', kw: 'average cost basis calculator stock purchases investing taxes', inputs: [{id:'q1',label:'First Quantity',type:'number',def:100},{id:'p1',label:'First Price ($)',type:'number',def:10},{id:'q2',label:'Second Quantity',type:'number',def:100},{id:'p2',label:'Second Price ($)',type:'number',def:12}], calc: function(v){ var q=v.q1+v.q2; if(q<=0) return{result:'Enter quantities',chart:'',extra:''}; var cost=v.q1*v.p1+v.q2*v.p2; var avg=cost/q; return{result:'Average Cost Basis: $'+avg.toFixed(2),chart:Charts.bar([v.q1*v.p1,v.q2*v.p2],['Lot 1 cost','Lot 2 cost']),extra:'Total shares: '+q+' | Total cost: $'+cost.toFixed(2)+' — used to compute capital gains when you sell'};}, steps: function(v){ var cost=v.q1*v.p1+v.q2*v.p2; var q=v.q1+v.q2; var avg=cost/q; return['Formula: Avg = Σ(quantity × price) ÷ Σ(quantity)','Step 1: Lot costs = $'+(v.q1*v.p1).toFixed(2)+' + $'+(v.q2*v.p2).toFixed(2)+' = $'+cost.toFixed(2),'Step 2: Total shares = '+q,'Step 3: $'+cost.toFixed(2)+' ÷ '+q+' = $'+avg.toFixed(2)];} },

  { id: 'dca-calculator', name: 'Dollar Cost Average Calculator', desc: 'Average price paid across scheduled buys', kw: 'dollar cost averaging calculator dca average purchase price investing', inputs: [{id:'amount',label:'Amount Per Buy ($)',type:'number',def:200},{id:'prices',label:'Prices Paid (comma separated)',type:'text',def:'10,12,11,9,10,13'}], calc: function(v){ var ps=v.prices.split(',').map(Number); if(ps.some(isNaN)||ps.some(function(p){return p<=0;})) return{result:'Enter positive prices separated by commas',chart:'',extra:''}; var invested=v.amount*ps.length; var shares=ps.reduce(function(s,p){return s+v.amount/p;},0); var avg=invested/shares; var lump=invested/ps[0]; return{result:'Average Price: $'+avg.toFixed(2),chart:Charts.bar(ps,ps.map(function(_,i){return '#'+(i+1);})),extra:'Invested: $'+invested.toFixed(2)+' | Shares: '+shares.toFixed(3)+' | Lump-sum at first price would have averaged $'+lump.toFixed(2)};}, steps: function(v){ var ps=v.prices.split(',').map(Number); var invested=v.amount*ps.length; var shares=ps.reduce(function(s,p){return s+v.amount/p;},0); var avg=invested/shares; return['Formula: Avg price = Total invested ÷ Total shares bought','Step 1: Shares = '+ps.map(function(p){return v.amount+'÷'+p;}).join(' + ')+' = '+shares.toFixed(3),'Step 2: Total invested = $'+v.amount+' × '+ps.length+' = $'+invested.toFixed(2),'Step 3: $'+invested.toFixed(2)+' ÷ '+shares.toFixed(3)+' = $'+avg.toFixed(2)];} },

  { id: 'staking-rewards', name: 'Staking Rewards Calculator', desc: 'Compounded staking yield over time', kw: 'staking rewards calculator crypto compound apr yield', inputs: [{id:'p',label:'Staked Amount (coins)',type:'number',def:5000},{id:'apr',label:'Staking APR (%)',type:'number',def:8},{id:'years',label:'Years',type:'number',def:2}], calc: function(v){ if(v.p<=0||v.apr<0||v.years<0) return{result:'Enter valid values',chart:'',extra:''}; var val=v.p*Math.pow(1+v.apr/100,v.years); return{result:'Staked Value: '+val.toFixed(2)+' coins',chart:Charts.bar([v.p,val-v.p],['Principal','Rewards']),extra:'Rewards: '+(val-v.p).toFixed(2)+' coins ('+((val/v.p-1)*100).toFixed(1)+'% total) — assumes rewards restake automatically at the stated APR'};}, steps: function(v){ var val=v.p*Math.pow(1+v.apr/100,v.years); return['Formula: Value = P × (1 + APR)^years','Step 1: (1 + '+(v.apr/100)+')^'+v.years+' = '+Math.pow(1+v.apr/100,v.years).toFixed(4),'Step 2: '+v.p+' × '+Math.pow(1+v.apr/100,v.years).toFixed(4)+' = '+val.toFixed(2)+' coins','Staking rewards are usually paid per epoch/day; continuous compounding would yield slightly more'];} },

  { id: 'kelly-criterion', name: 'Kelly Criterion Calculator', desc: 'Optimal bet size for a positive-edge wager', kw: 'kelly criterion calculator bet sizing expected edge probability', inputs: [{id:'p',label:'Win Probability (%)',type:'number',def:55},{id:'b',label:'Win/Loss Ratio',type:'number',def:1.5}], calc: function(v){ if(v.p<=0||v.p>=100||v.b<=0) return{result:'Probability must be between 0 and 100; ratio positive',chart:'',extra:''}; var p=v.p/100; var k=p-(1-p)/v.b; if(k<=0) return{result:'Kelly fraction: 0% — no positive edge at these odds',chart:'',extra:''}; return{result:'Kelly Fraction: '+(k*100).toFixed(1)+'%',chart:Charts.gauge(k,0.5),extra:'Half-Kelly ('+(k*50).toFixed(1)+'%) is a common conservative choice — full Kelly maximises growth but with large swings'};}, steps: function(v){ var p=v.p/100; var k=p-(1-p)/v.b; return['Formula: f* = p − (1 − p) ÷ b, where b is the win/loss ratio','Step 1: p = '+(p*100).toFixed(0)+'% → 1 − p = '+((1-p)*100).toFixed(0)+'%','Step 2: (1 − p) ÷ b = '+((1-p)/v.b).toFixed(4),'Step 3: f* = '+p.toFixed(2)+' − '+((1-p)/v.b).toFixed(4)+' = '+k.toFixed(4)+' → '+(k*100).toFixed(1)+'% of bankroll'];} },

  { id: 'value-at-risk', name: 'Value at Risk (VaR) Calculator', desc: 'Potential loss at a chosen confidence level', kw: 'value at risk calculator var parametric portfolio loss confidence', inputs: [{id:'val',label:'Portfolio Value ($)',type:'number',def:100000},{id:'vol',label:'Daily Volatility (%)',type:'number',def:2},{id:'z',label:'Z-Score (2.33 = 99%)',type:'number',def:2.33},{id:'days',label:'Horizon (days)',type:'number',def:1}], calc: function(v){ if(v.val<=0||v.vol<=0||v.days<=0) return{result:'Enter positive values',chart:'',extra:''}; var var1=v.val*v.vol/100*v.z; var varN=var1*Math.sqrt(v.days); return{result:'VaR ('+v.days+'-day): $'+varN.toFixed(0),chart:Charts.bar([var1,Math.sqrt(v.days)],['1-day VaR','time scale factor']),extra:'At the '+(v.z>2.3?'99':'95')+'% confidence level, daily losses should not exceed $'+var1.toFixed(0)+' more than '+(v.z>2.3?'1':'5')+'% of the time — parametric (normal) assumption'};}, steps: function(v){ var var1=v.val*v.vol/100*v.z; var varN=var1*Math.sqrt(v.days); return['Formula: VaR = Value × σ × z × √days','Step 1: Daily $ move at z = $'+v.val.toLocaleString()+' × '+(v.vol/100)+' × '+v.z+' = $'+var1.toFixed(2),'Step 2: Scale by √'+v.days+' = '+Math.sqrt(v.days).toFixed(3)+' → $'+varN.toFixed(2),'The parametric method assumes normal returns; fat-tailed markets understate VaR'];} },

  { id: 'ev-ebitda', name: 'EV/EBITDA Calculator', desc: 'Valuation multiple based on enterprise value', kw: 'ev ebitda calculator valuation multiple enterprise value', inputs: [{id:'ev',label:'Enterprise Value ($)',type:'number',def:500000000},{id:'ebitda',label:'EBITDA ($)',type:'number',def:80000000}], calc: function(v){ if(v.ebitda<=0||v.ev<=0) return{result:'EBITDA and EV must be positive',chart:'',extra:''}; var m=v.ev/v.ebitda; return{result:'EV/EBITDA: '+m.toFixed(1)+'×',chart:Charts.gauge(m,30),extra:'EV = market cap + debt − cash. Compare within an industry: capital-intensive businesses carry lower typical multiples'};}, steps: function(v){ var m=v.ev/v.ebitda; return['Formula: EV/EBITDA = Enterprise value ÷ EBITDA','Step 1: $'+v.ev.toLocaleString()+' ÷ $'+v.ebitda.toLocaleString()+' = '+m.toFixed(2)+'×','EBITDA ignores capital structure and depreciation, so the multiple compares operating value across differently financed firms'];} },

  { id: 'peg-ratio', name: 'PEG Ratio Calculator', desc: 'P/E adjusted for expected earnings growth', kw: 'peg ratio calculator price earnings growth adjusted valuation', inputs: [{id:'pe',label:'P/E Ratio',type:'number',def:20},{id:'g',label:'Expected Growth Rate (%/yr)',type:'number',def:15}], calc: function(v){ if(v.g<=0||v.pe<=0) return{result:'P/E and growth must be positive',chart:'',extra:''}; var peg=v.pe/v.g; return{result:'PEG Ratio: '+peg.toFixed(2),chart:Charts.gauge(peg,4),extra:'Around 1.0 is traditionally considered fairly priced for its growth rate; below 1 suggests growth may be cheap, above 2 expensive'};}, steps: function(v){ var peg=v.pe/v.g; return['Formula: PEG = P/E ÷ annual EPS growth rate (%)','Step 1: '+v.pe+' ÷ '+v.g+' = '+peg.toFixed(2),'Growth rates above ~25% rarely persist — a low PEG built on an aggressive forecast is fragile'];} },

  { id: 'free-cash-flow', name: 'Free Cash Flow Calculator', desc: 'Cash left after operations and capital spending', kw: 'free cash flow calculator fcf operating cash flow capex', inputs: [{id:'ocf',label:'Operating Cash Flow ($)',type:'number',def:300000},{id:'capex',label:'Capital Expenditure ($)',type:'number',def:100000}], calc: function(v){ var f=v.ocf-v.capex; return{result:'Free Cash Flow: $'+f.toFixed(0),chart:Charts.bar([v.ocf,v.capex],['Operating CF','Capex']),extra:'FCF margin depends on revenue; negative FCF is normal for fast-growing companies but must eventually turn positive'};}, steps: function(v){ var f=v.ocf-v.capex; return['Formula: FCF = Operating cash flow − Capital expenditure','Step 1: $'+v.ocf.toLocaleString()+' − $'+v.capex.toLocaleString()+' = $'+f.toLocaleString(),'FCF is the cash genuinely available for dividends, buybacks, or debt paydown'];} },

  { id: 'interest-coverage', name: 'Interest Coverage Ratio Calculator', desc: 'Earnings available to pay interest expense', kw: 'interest coverage ratio calculator ebit debt service solvency', inputs: [{id:'ebit',label:'EBIT / Operating Income ($)',type:'number',def:500000},{id:'interest',label:'Interest Expense ($)',type:'number',def:125000}], calc: function(v){ if(v.interest<=0) return{result:'Interest must be positive',chart:'',extra:''}; var r=v.ebit/v.interest; return{result:'Interest Coverage: '+r.toFixed(2)+'×',chart:Charts.gauge(r,10),extra:'Below 1.5× signals stress; above 3× is generally comfortable. Lenders often test this covenant'};}, steps: function(v){ var r=v.ebit/v.interest; return['Formula: Coverage = EBIT ÷ Interest expense','Step 1: $'+v.ebit.toLocaleString()+' ÷ $'+v.interest.toLocaleString()+' = '+r.toFixed(2)+'×','Each 1× means EBIT covers the interest bill once — 4× means operating income could pay interest four times over'];} },

  { id: 'asset-turnover', name: 'Asset Turnover Calculator', desc: 'Revenue generated per dollar of assets', kw: 'asset turnover ratio calculator efficiency revenue assets', inputs: [{id:'rev',label:'Revenue ($)',type:'number',def:1200000},{id:'assets',label:'Total Assets ($)',type:'number',def:800000}], calc: function(v){ if(v.assets<=0) return{result:'Assets must be positive',chart:'',extra:''}; var t=v.rev/v.assets; return{result:'Asset Turnover: '+t.toFixed(2)+'×',chart:Charts.gauge(t,3),extra:'Retailers and grocers run high turnover with thin margins; utilities and telecoms run low turnover with fat margins — compare within an industry'};}, steps: function(v){ var t=v.rev/v.assets; return['Formula: Turnover = Revenue ÷ Total assets','Step 1: $'+v.rev.toLocaleString()+' ÷ $'+v.assets.toLocaleString()+' = '+t.toFixed(2)+'×','A component of the DuPont breakdown of ROE alongside margin and leverage'];} },

  { id: 'runway-months', name: 'Runway Calculator', desc: 'Months of cash left at the current burn rate', kw: 'runway calculator startup cash burn months remaining', inputs: [{id:'cash',label:'Cash on Hand ($)',type:'number',def:250000},{id:'burn',label:'Monthly Burn ($)',type:'number',def:25000}], calc: function(v){ if(v.burn<=0) return{result:'Burn must be positive (enter 0 only if cash-flow positive)',chart:'',extra:''}; var m=v.cash/v.burn; return{result:'Runway: '+m.toFixed(1)+' months',chart:Charts.gauge(m,36),extra:'Startups typically begin fundraising when runway drops below 9–12 months'};}, steps: function(v){ var m=v.cash/v.burn; return['Formula: Runway = Cash ÷ Net monthly burn','Step 1: $'+v.cash.toLocaleString()+' ÷ $'+v.burn.toLocaleString()+' = '+m.toFixed(1)+' months','Burn = expenses − revenue. Cutting burn by half doubles runway without raising a cent'];} },

  { id: 'effective-tax-rate', name: 'Effective Tax Rate Calculator', desc: 'Average tax rate on total income', kw: 'effective tax rate calculator average rate marginal vs effective', inputs: [{id:'tax',label:'Total Tax Paid ($)',type:'number',def:24500},{id:'income',label:'Total Income ($)',type:'number',def:100000}], calc: function(v){ if(v.income<=0) return{result:'Income must be positive',chart:'',extra:''}; var r=v.tax/v.income*100; return{result:'Effective Tax Rate: '+r.toFixed(2)+'%',chart:Charts.gauge(r,50),extra:'The effective rate is always below the marginal rate in a progressive system because early brackets are taxed less'};}, steps: function(v){ var r=v.tax/v.income*100; return['Formula: Effective rate = Total tax ÷ Total income × 100','Step 1: $'+v.tax.toLocaleString()+' ÷ $'+v.income.toLocaleString()+' = '+(v.tax/v.income).toFixed(4),'Step 2: × 100 = '+r.toFixed(2)+'%','Marginal rate applies to the next dollar earned; effective rate applies to what you actually paid overall'];} },

  { id: 'quarterly-tax', name: 'Quarterly Estimated Tax Calculator', desc: 'Quarterly payment for freelancers and contractors', kw: 'quarterly estimated tax calculator self employed freelancer 1099', inputs: [{id:'income',label:'Expected Annual Income ($)',type:'number',def:120000},{id:'rate',label:'Combined Tax Rate (%)',type:'number',def:24},{id:'withheld',label:'Already Withheld ($)',type:'number',def:20000}], calc: function(v){ if(v.income<=0) return{result:'Income must be positive',chart:'',extra:''}; var owed=Math.max(0,v.income*v.rate/100-v.withheld); return{result:'Per Quarter: $'+(owed/4).toFixed(2),chart:Charts.bar([v.income*v.rate/100,v.withheld],['Expected tax','Withheld']),extra:'Annual tax estimate: $'+(v.income*v.rate/100).toFixed(0)+' | Still owed: $'+owed.toFixed(2)+' | Due dates: Apr 15, Jun 15, Sep 15, Jan 15'};}, steps: function(v){ var owed=Math.max(0,v.income*v.rate/100-v.withheld); return['Step 1: Estimated annual tax = $'+v.income.toLocaleString()+' × '+(v.rate/100)+' = $'+(v.income*v.rate/100).toFixed(2),'Step 2: Minus amounts already withheld = $'+owed.toFixed(2),'Step 3: Divide by 4 → $'+(owed/4).toFixed(2)+' per quarterly payment','Underpayment beyond safe-harbor amounts can trigger a penalty at filing'];} },

  { id: 'late-fee-interest', name: 'Late Payment Interest Calculator', desc: 'Interest owed on an overdue invoice', kw: 'late payment interest calculator overdue invoice penalty daily rate', inputs: [{id:'inv',label:'Invoice Amount ($)',type:'number',def:10000},{id:'rate',label:'Annual Interest Rate (%)',type:'number',def:12},{id:'days',label:'Days Overdue',type:'number',def:30}], calc: function(v){ if(v.inv<=0||v.days<0) return{result:'Enter valid values',chart:'',extra:''}; var i=v.inv*v.rate/100*v.days/365; return{result:'Interest Due: $'+i.toFixed(2),chart:Charts.bar([v.inv,i],['Principal','Interest']),extra:'Daily rate: $'+(v.inv*v.rate/100/365).toFixed(2)+' per day — set your terms (e.g. Net 30 + 1.5%/mo) on the invoice itself'};}, steps: function(v){ var i=v.inv*v.rate/100*v.days/365; return['Formula: Interest = Principal × annual rate × days ÷ 365','Step 1: Daily rate = $'+v.inv.toLocaleString()+' × '+(v.rate/100)+' ÷ 365 = $'+(v.inv*v.rate/100/365).toFixed(4),'Step 2: × '+v.days+' days = $'+i.toFixed(2),'Some jurisdictions cap late-fee rates — check local rules before invoicing'];} },

  { id: 'factoring-fee', name: 'Invoice Factoring Calculator', desc: 'Cash received when factoring receivables', kw: 'invoice factoring calculator advance rate factor fee receivables', inputs: [{id:'inv',label:'Invoice Value ($)',type:'number',def:50000},{id:'advance',label:'Advance Rate (%)',type:'number',def:85},{id:'fee',label:'Factoring Fee (%)',type:'number',def:2}], calc: function(v){ if(v.inv<=0) return{result:'Invoice must be positive',chart:'',extra:''}; var adv=v.inv*v.advance/100; var fee=v.inv*v.fee/100; var net=adv-fee; return{result:'Net Cash Today: $'+net.toFixed(2),chart:Charts.bar([adv,fee],['Advance','Fee']),extra:'Fee cost: $'+fee.toFixed(2)+' ('+v.fee+'% of face) | Remaining $'+(v.inv-adv).toFixed(2)+' is paid when your customer settles, minus any further reserve'};}, steps: function(v){ var adv=v.inv*v.advance/100; var fee=v.inv*v.fee/100; return['Step 1: Advance = $'+v.inv.toLocaleString()+' × '+(v.advance/100)+' = $'+adv.toFixed(2),'Step 2: Fee = $'+v.inv.toLocaleString()+' × '+(v.fee/100)+' = $'+fee.toFixed(2),'Step 3: Net today = $'+adv.toFixed(2)+' − $'+fee.toFixed(2)+' = $'+(adv-fee).toFixed(2),'Annualised cost is far higher than the face fee rate because you pay it on the whole invoice for a short period'];} },

  { id: 'royalty-payment', name: 'Royalty Payment Calculator', desc: 'Royalties from a percentage of sales', kw: 'royalty calculator percentage of sales licensing author', inputs: [{id:'sales',label:'Sales Revenue ($)',type:'number',def:200000},{id:'rate',label:'Royalty Rate (%)',type:'number',def:7.5}], calc: function(v){ if(v.sales<=0) return{result:'Sales must be positive',chart:'',extra:''}; var r=v.sales*v.rate/100; return{result:'Royalty Due: $'+r.toFixed(2),chart:Charts.bar([v.sales-r,r],['Sales kept','Royalty']),extra:'Book royalties commonly run 5–15% of list or 25% of net; music and patents vary widely by contract'};}, steps: function(v){ var r=v.sales*v.rate/100; return['Formula: Royalty = Sales × royalty rate','Step 1: $'+v.sales.toLocaleString()+' × '+(v.rate/100)+' = $'+r.toFixed(2),'Confirm whether your contract defines the base as gross, net, or list price — it changes the number substantially'];} },

  { id: 'franchise-cost', name: 'Franchise Cost Calculator', desc: 'Total investment to open a franchise', kw: 'franchise cost calculator total investment franchise fee buildout', inputs: [{id:'fee',label:'Franchise Fee ($)',type:'number',def:35000},{id:'build',label:'Buildout & Leasehold ($)',type:'number',def:150000},{id:'equip',label:'Equipment & Inventory ($)',type:'number',def:60000},{id:'work',label:'Working Capital ($)',type:'number',def:40000}], calc: function(v){ var t=v.fee+v.build+v.equip+v.work; return{result:'Total Investment: $'+t.toFixed(0),chart:Charts.bar([v.fee,v.build,v.equip,v.work],['Fee','Buildout','Equipment','Working cap']),extra:'Franchisors publish a low–high range in Item 7 of the FDD — working capital for 6+ months of losses is the line most first-timers underestimate'};}, steps: function(v){ var t=v.fee+v.build+v.equip+v.work; return['Step 1: Add components: $'+[v.fee,v.build,v.equip,v.work].map(function(x){return x.toLocaleString();}).join(' + ')+' = $'+t.toLocaleString(),'Step 2: Add a 10–20% contingency for overruns → realistic range $'+(t*1.1).toLocaleString()+'–$'+(t*1.2).toLocaleString(),'The franchise fee itself is usually less than a quarter of the true cost of opening'];} },

  { id: 'food-cost-percent', name: 'Food Cost Percentage Calculator', desc: 'Menu item cost as a share of its price', kw: 'food cost percentage calculator restaurant menu pricing plate cost', inputs: [{id:'cost',label:'Plate Cost ($)',type:'number',def:4.2},{id:'price',label:'Menu Price ($)',type:'number',def:14}], calc: function(v){ if(v.price<=0) return{result:'Price must be positive',chart:'',extra:''}; var p=v.cost/v.price*100; return{result:'Food Cost: '+p.toFixed(1)+'%',chart:Charts.bar([v.cost,v.price-v.cost],['Cost','Gross margin']),extra:'Restaurants typically target 28–35% food cost; the rest covers labour, rent, and profit'};}, steps: function(v){ var p=v.cost/v.price*100; return['Formula: Food cost % = Plate cost ÷ Menu price × 100','Step 1: $'+v.cost.toFixed(2)+' ÷ $'+v.price.toFixed(2)+' = '+(v.cost/v.price).toFixed(4),'Step 2: × 100 = '+p.toFixed(1)+'%','Price every item with its true plate cost including garnish, sauce waste, and packaging for delivery'];} },

  { id: 'menu-price', name: 'Menu Pricing Calculator', desc: 'Price needed for a target food-cost percentage', kw: 'menu price calculator restaurant pricing target food cost margin', inputs: [{id:'cost',label:'Plate Cost ($)',type:'number',def:5},{id:'target',label:'Target Food Cost (%)',type:'number',def:28}], calc: function(v){ if(v.target<=0||v.target>=100) return{result:'Target must be between 0 and 100',chart:'',extra:''}; var price=v.cost/(v.target/100); return{result:'Menu Price: $'+price.toFixed(2),chart:Charts.bar([v.cost,price-v.cost],['Cost','Gross']),extra:'Round to a psychologically clean number ($17.95, not $17.86) — the formula is the floor, not the final price'};}, steps: function(v){ var price=v.cost/(v.target/100); return['Formula: Price = Plate cost ÷ target food-cost %','Step 1: $'+v.cost.toFixed(2)+' ÷ '+(v.target/100)+' = $'+price.toFixed(2),'At this price, cost is '+v.target+'% and the remaining '+(100-v.target)+'% covers labour, overhead, and profit'];} },

  { id: 'rmd', name: 'Required Minimum Distribution Calculator', desc: 'RMD amount from a retirement account balance', kw: 'rmd calculator required minimum distribution ira 401k retirement', inputs: [{id:'bal',label:'Account Balance ($ as of Dec 31)',type:'number',def:500000},{id:'age',label:'Age at Year End',type:'number',def:76}], calc: function(v){ var divs={72:27.4,73:26.5,74:25.5,75:24.6,76:23.7,77:22.9,78:22.0,79:21.1,80:20.2,81:19.4,82:18.5,83:17.7,84:16.8,85:16.0,86:15.2,87:14.4,88:13.7,89:12.9,90:12.2}; if(v.age<72) return{result:'No RMD required yet — RMDs generally begin at age 73 (SECURE 2.0)',chart:'',extra:''}; var div=divs[Math.floor(v.age)]||12.2; var rmd=v.bal/div; return{result:'RMD: $'+rmd.toFixed(2),chart:Charts.bar([rmd,v.bal-rmd],['Must withdraw','Remains invested']),extra:'Distribution period: '+div+' years | Withdraw less and the IRS charges a 25% excise tax on the shortfall (reducible to 10% if corrected promptly)'};}, steps: function(v){ var divs={72:27.4,73:26.5,74:25.5,75:24.6,76:23.7,77:22.9,78:22.0,79:21.1,80:20.2,81:19.4,82:18.5,83:17.7,84:16.8,85:16.0,86:15.2,87:14.4,88:13.7,89:12.9,90:12.2}; var div=divs[Math.floor(v.age)]||12.2; var rmd=v.bal/div; return['Formula: RMD = Prior Dec 31 balance ÷ IRS distribution period','Step 1: Divisor for age '+Math.floor(v.age)+' = '+div,'Step 2: $'+v.bal.toLocaleString()+' ÷ '+div+' = $'+rmd.toFixed(2),'Roth 401(k)s no longer require RMDs during the owner lifetime under SECURE 2.0'];} },

  { id: 'hsa-growth', name: 'HSA Growth Calculator', desc: 'Health savings account growth with annual contributions', kw: 'hsa calculator health savings account growth triple tax advantage', inputs: [{id:'bal',label:'Current Balance ($)',type:'number',def:5000},{id:'contrib',label:'Annual Contribution ($)',type:'number',def:3850},{id:'growth',label:'Expected Return (%)',type:'number',def:6},{id:'years',label:'Years',type:'number',def:10}], calc: function(v){ if(v.years<0||v.growth<0) return{result:'Enter valid values',chart:'',extra:''}; var fv=v.bal*Math.pow(1+v.growth/100,v.years); var factor=v.growth>0?(Math.pow(1+v.growth/100,v.years)-1)/(v.growth/100):v.years; var contribs=fv+0; var total=fv+v.contrib*factor; return{result:'Projected Balance: $'+total.toFixed(0),chart:Charts.bar([v.bal+v.contrib*v.years,total-v.bal-v.contrib*v.years],['Contributions only','Growth']),extra:'Growth adds $'+(total-v.bal-v.contrib*v.years).toFixed(0)+' beyond deposits — the HSA is the only triple-tax-advantaged account (deductible in, tax-free growth, tax-free medical out)'};}, steps: function(v){ var g=v.growth/100; var factor=g>0?(Math.pow(1+g,v.years)-1)/g:v.years; var total=v.bal*Math.pow(1+g,v.years)+v.contrib*factor; return['Step 1: Growth of current balance = $'+v.bal.toLocaleString()+' × (1+'+g+')^'+v.years+' = $'+(v.bal*Math.pow(1+g,v.years)).toFixed(2),'Step 2: Future value of contributions = $'+v.contrib+' × '+factor.toFixed(3)+' = $'+(v.contrib*factor).toFixed(2),'Step 3: Total = $'+total.toFixed(2),'Contribution limits change yearly — check the current IRS limit for self-only vs family coverage'];} },

  { id: 'safe-withdrawal', name: 'Safe Withdrawal Rate Calculator', desc: 'Sustainable yearly withdrawal from a portfolio', kw: 'safe withdrawal rate calculator retirement 4 percent rule portfolio', inputs: [{id:'port',label:'Portfolio Value ($)',type:'number',def:1500000},{id:'rate',label:'Withdrawal Rate (%)',type:'number',def:4}], calc: function(v){ if(v.port<=0||v.rate<=0) return{result:'Enter positive values',chart:'',extra:''}; var w=v.port*v.rate/100; return{result:'Annual Withdrawal: $'+w.toFixed(0),chart:Charts.bar([w,w/12],['Yearly','Monthly']),extra:'Monthly income: $'+(w/12).toFixed(0)+' | The 4% rule comes from historical US data — lower rates (3–3.5%) are safer for early retirees facing long horizons'};}, steps: function(v){ var w=v.port*v.rate/100; return['Formula: Withdrawal = Portfolio × rate','Step 1: $'+v.port.toLocaleString()+' × '+(v.rate/100)+' = $'+w.toLocaleString(),'Step 2: Monthly = $'+w.toLocaleString()+' ÷ 12 = $'+(w/12).toFixed(0),'Withdraw only the gain in good years and skip inflation raises in bad years to stretch the portfolio further (guardrails approach)'];} },

  { id: 'noi', name: 'Net Operating Income Calculator', desc: 'Rental income after operating expenses', kw: 'noi calculator net operating income rental property vacancy', inputs: [{id:'gross',label:'Gross Annual Rent ($)',type:'number',def:120000},{id:'vac',label:'Vacancy Rate (%)',type:'number',def:5},{id:'opex',label:'Operating Expenses ($)',type:'number',def:42000}], calc: function(v){ if(v.gross<=0) return{result:'Gross rent must be positive',chart:'',extra:''}; var eff=v.gross*(1-v.vac/100); var noi=eff-v.opex; return{result:'NOI: $'+noi.toFixed(0),chart:Charts.bar([eff,v.opex],['Effective income','Opex']),extra:'Effective gross income: $'+eff.toFixed(0)+' | NOI excludes mortgage payments — that is why cap rates work across differently financed properties'};}, steps: function(v){ var eff=v.gross*(1-v.vac/100); var noi=eff-v.opex; return['Step 1: Effective income = $'+v.gross.toLocaleString()+' × (1 − '+(v.vac/100)+') = $'+eff.toFixed(2),'Step 2: NOI = $'+eff.toFixed(0)+' − $'+v.opex.toLocaleString()+' = $'+noi.toFixed(0),'Opex includes taxes, insurance, maintenance, management, and utilities — but not the mortgage'];} },

  { id: 'price-per-sqft', name: 'Price per Square Foot Calculator', desc: 'Property cost normalized by area', kw: 'price per square foot calculator real estate comparison', inputs: [{id:'price',label:'Property Price ($)',type:'number',def:450000},{id:'sqft',label:'Area (sq ft)',type:'number',def:1800}], calc: function(v){ if(v.sqft<=0) return{result:'Area must be positive',chart:'',extra:''}; var p=v.price/v.sqft; return{result:'$'+p.toFixed(2)+' per sq ft',chart:Charts.gauge(p,1000),extra:'Compare against recent nearby sales, not city averages — lot value, condition, and layout distort the metric between neighbourhoods'};}, steps: function(v){ var p=v.price/v.sqft; return['Formula: Price per sq ft = Price ÷ Area','Step 1: $'+v.price.toLocaleString()+' ÷ '+v.sqft.toLocaleString()+' sq ft = $'+p.toFixed(2),'Normalise both properties the same way (above-grade living area, excluding garage and basement) before comparing'];} },

  { id: 'rent-increase', name: 'Rent Increase Calculator', desc: 'New rent after a percentage increase', kw: 'rent increase calculator percentage annual raise tenant', inputs: [{id:'rent',label:'Current Rent ($/mo)',type:'number',def:1500},{id:'pct',label:'Increase (%)',type:'number',def:5}], calc: function(v){ if(v.rent<=0) return{result:'Rent must be positive',chart:'',extra:''}; var nv=v.rent*(1+v.pct/100); return{result:'New Rent: $'+nv.toFixed(2),chart:Charts.bar([v.rent,nv-v.rent],['Current','Increase']),extra:'Monthly increase: $'+(nv-v.rent).toFixed(2)+' | Yearly impact: $'+((nv-v.rent)*12).toFixed(0)+' | Many jurisdictions cap annual increases (e.g. 2–10%)'};}, steps: function(v){ var nv=v.rent*(1+v.pct/100); return['Formula: New rent = Current × (1 + %)','Step 1: $'+v.rent.toLocaleString()+' × '+(1+v.pct/100).toFixed(4)+' = $'+nv.toFixed(2),'Landlords often benchmark increases to local CPI — a below-CPI increase is in effect a real rent cut'];} },

  { id: 'deposit-interest', name: 'Security Deposit Interest Calculator', desc: 'Interest owed on a held deposit', kw: 'security deposit interest calculator landlord tenant simple interest', inputs: [{id:'dep',label:'Deposit ($)',type:'number',def:2000},{id:'rate',label:'Annual Interest Rate (%)',type:'number',def:1.5},{id:'months',label:'Months Held',type:'number',def:24}], calc: function(v){ if(v.dep<=0||v.months<0) return{result:'Enter valid values',chart:'',extra:''}; var i=v.dep*v.rate/100*v.months/12; return{result:'Interest Due: $'+i.toFixed(2),chart:Charts.bar([v.dep,i],['Deposit','Interest']),extra:'Simple interest at '+v.rate+'% — several states (e.g. NJ, MN) require banks to pay prevailing rates on escrowed deposits'};}, steps: function(v){ var i=v.dep*v.rate/100*v.months/12; return['Formula: Interest = Deposit × rate × months ÷ 12','Step 1: $'+v.dep.toLocaleString()+' × '+(v.rate/100)+' × '+(v.months/12)+' years = $'+i.toFixed(2),'Total due back at move-out (if no deductions): $'+(v.dep+i).toFixed(2)];} },

  { id: 'roommate-rent-split', name: 'Roommate Rent Split Calculator', desc: 'Fair rent division proportional to income', kw: 'roommate rent split calculator fair division income proportion', inputs: [{id:'rent',label:'Total Rent ($)',type:'number',def:2400},{id:'incomes',label:'Incomes (comma separated)',type:'text',def:'6000,4000,3000'}], calc: function(v){ var inc=v.incomes.split(',').map(Number); if(inc.some(isNaN)||inc.some(function(x){return x<=0;})) return{result:'Enter positive incomes separated by commas',chart:'',extra:''}; var tot=inc.reduce(function(s,x){return s+x;},0); var shares=inc.map(function(x){return v.rent*x/tot;}); return{result:'Split: $'+shares.map(function(s){return s.toFixed(2);}).join(' / '),chart:Charts.bar(shares,inc.map(function(_,i){return 'R'+(i+1);})),extra:'Income-proportional: each pays '+inc.map(function(x){return (x/tot*100).toFixed(0)+'%';}).join(', ')+' of the rent | Equal split would be $'+(v.rent/inc.length).toFixed(2)+' each'};}, steps: function(v){ var inc=v.incomes.split(',').map(Number); var tot=inc.reduce(function(s,x){return s+x;},0); return['Formula: Share = Rent × (income ÷ total income)','Step 1: Total income = $'+tot.toLocaleString(),'Step 2: Shares = '+inc.map(function(x){return '$'+(v.rent*x/tot).toFixed(2);}).join(', '),'Check the shares sum to the rent: $'+shares_sum(v,inc)]; function shares_sum(v,inc){ return inc.reduce(function(s,x){return s+v.rent*x/tot;},0).toFixed(2); } } },

  { id: 'purchasing-power', name: 'Purchasing Power Calculator', desc: 'Real value of money after inflation', kw: 'purchasing power calculator inflation real value money', inputs: [{id:'amt',label:'Amount ($)',type:'number',def:100000},{id:'infl',label:'Inflation Rate (%)',type:'number',def:3},{id:'years',label:'Years',type:'number',def:10}], calc: function(v){ if(v.years<0||v.infl<0) return{result:'Enter valid values',chart:'',extra:''}; var real=v.amt/Math.pow(1+v.infl/100,v.years); return{result:'Real Value: $'+real.toFixed(0),chart:Charts.bar([real,v.amt-real],['Real value','Lost to inflation']),extra:'At '+v.infl+'% inflation, prices multiply by '+Math.pow(1+v.infl/100,v.years).toFixed(3)+' over '+v.years+' years — cash loses '+(100-real/v.amt*100).toFixed(1)+'% of its buying power'};}, steps: function(v){ var real=v.amt/Math.pow(1+v.infl/100,v.years); return['Formula: Real value = Amount ÷ (1 + inflation)^years','Step 1: (1 + '+(v.infl/100)+')^'+v.years+' = '+Math.pow(1+v.infl/100,v.years).toFixed(4),'Step 2: $'+v.amt.toLocaleString()+' ÷ '+Math.pow(1+v.infl/100,v.years).toFixed(4)+' = $'+real.toFixed(0),'This is why long-term cash holdings underperform even modest inflation'];} },




  { id: 'refinance-breakeven', name: 'Refinance Break-Even Calculator', desc: 'Months to recover refinancing closing costs', kw: 'refinance break even calculator closing costs monthly savings mortgage', inputs: [{id:'costs',label:'Closing Costs ($)',type:'number',def:3000},{id:'save',label:'Monthly Savings ($)',type:'number',def:150}], calc: function(v){ if(v.save<=0) return{result:'Monthly savings must be positive',chart:'',extra:''}; var m=v.costs/v.save; return{result:'Break-Even: '+m.toFixed(1)+' months',chart:Charts.gauge(m,120),extra:'Rule of thumb: refinance makes sense if you will keep the loan well past break-even ('+m.toFixed(0)+' months ≈ '+(m/12).toFixed(1)+' years)'};}, steps: function(v){ var m=v.costs/v.save; return['Formula: Break-even = Closing costs ÷ monthly savings','Step 1: $'+v.costs.toLocaleString()+' ÷ $'+v.save.toLocaleString()+' = '+m.toFixed(1)+' months','Step 2: Compare against how long you plan to stay in the home — selling before break-even means the refinance lost money','Also compare total interest over the new term, not just the monthly payment'];} },

  { id: 'apr-annual', name: 'Loan APR Calculator', desc: 'True APR including fees, not just the note rate', kw: 'apr calculator loan fees true cost annual percentage rate', inputs: [{id:'principal',label:'Loan Amount ($)',type:'number',def:20000},{id:'fees',label:'Fees & Points ($)',type:'number',def:2000},{id:'interest',label:'Total Interest Over Loan ($)',type:'number',def:4800},{id:'years',label:'Term (years)',type:'number',def:4}], calc: function(v){ if(v.principal<=0||v.years<=0) return{result:'Principal and term must be positive',chart:'',extra:''}; var apr=(v.fees+v.interest)/v.principal/v.years*100; return{result:'APR: '+apr.toFixed(2)+'%',chart:Charts.gauge(apr,25),extra:'Finance charge: $'+(v.fees+v.interest).toFixed(0)+' on $'+v.principal.toLocaleString()+' | APR bundles fees with interest, which is why it usually exceeds the quoted note rate'};}, steps: function(v){ var apr=(v.fees+v.interest)/v.principal/v.years*100; return['Formula: APR = (fees + total interest) ÷ principal ÷ years','Step 1: $'+v.fees.toLocaleString()+' + $'+v.interest.toLocaleString()+' = $'+(v.fees+v.interest).toLocaleString(),'Step 2: ÷ $'+v.principal.toLocaleString()+' = '+(v.fees+v.interest)/v.principal,'Step 3: ÷ '+v.years+' years × 100 = '+apr.toFixed(2)+'%'];} },

  { id: 'auto-lease-vs-buy', name: 'Lease vs Buy Calculator', desc: 'Total cost of leasing against financing a purchase', kw: 'lease vs buy calculator car total cost comparison', inputs: [{id:'lPay',label:'Monthly Lease ($)',type:'number',def:350},{id:'lDown',label:'Lease Down Payment ($)',type:'number',def:2500},{id:'lTerm',label:'Lease Term (months)',type:'number',def:36},{id:'bPay',label:'Monthly Loan Payment ($)',type:'number',def:450},{id:'bDown',label:'Loan Down Payment ($)',type:'number',def:3000},{id:'bTerm',label:'Loan Term (months)',type:'number',def:60}], calc: function(v){ var lt=v.lPay*v.lTerm+v.lDown, bt=v.bPay*v.bTerm+v.bDown; var cheap=lt<=bt; return{result:(cheap?'Lease':'Buy')+' costs less: $'+(cheap?lt:bt).toLocaleString()+' vs $'+(cheap?bt:lt).toLocaleString(),chart:Charts.bar([lt,bt],['Lease','Buy']),extra:'Difference: $'+Math.abs(bt-lt).toLocaleString()+' | Leasing buys the depreciation plus a rent charge; buying builds equity you keep at trade-in — compare per-month: lease $'+(lt/v.lTerm).toFixed(0)+' vs buy $'+(bt/v.bTerm).toFixed(0)};}, steps: function(v){ var lt=v.lPay*v.lTerm+v.lDown, bt=v.bPay*v.bTerm+v.bDown; return['Step 1: Lease total = $'+v.lPay+' × '+v.lTerm+' + $'+v.lDown.toLocaleString()+' = $'+lt.toLocaleString(),'Step 2: Buy total = $'+v.bPay+' × '+v.bTerm+' + $'+v.bDown.toLocaleString()+' = $'+bt.toLocaleString(),'Step 3: Cheaper path wins on cash — but equity, mileage limits, and how long you keep the car decide the real winner'];} },

  { id: 'heloc-payment', name: 'HELOC Interest-Only Payment', desc: 'Monthly payment during the draw period', kw: 'heloc payment calculator interest only home equity line', inputs: [{id:'bal',label:'Drawn Balance ($)',type:'number',def:50000},{id:'rate',label:'Rate (%)',type:'number',def:8}], calc: function(v){ if(v.bal<=0||v.rate<0) return{result:'Enter valid values',chart:'',extra:''}; var m=v.bal*v.rate/100/12; return{result:'Interest-Only Payment: $'+m.toFixed(2),chart:Charts.bar([m,v.bal],['Monthly interest','Balance']),extra:'HELOCs are variable-rate — this payment moves every time the index moves | The draw period pays interest only, so the balance does not shrink until repayment begins'};}, steps: function(v){ var m=v.bal*v.rate/100/12; return['Formula: Monthly interest = balance × rate ÷ 12','Step 1: $'+v.bal.toLocaleString()+' × '+(v.rate/100)+' = $'+(v.bal*v.rate/100).toFixed(0)+' per year','Step 2: ÷ 12 = $'+m.toFixed(2)+' per month','Paying principal above this number during the draw period saves every future month'];} },

  { id: 'pmi-drop', name: 'PMI Removal Calculator', desc: 'Current LTV and whether PMI can be cancelled', kw: 'pmi removal calculator ltv 80 percent cancel mortgage insurance', inputs: [{id:'bal',label:'Current Balance ($)',type:'number',def:152000},{id:'value',label:'Current Home Value ($)',type:'number',def:200000}], calc: function(v){ if(v.bal<=0||v.value<=0) return{result:'Enter positive values',chart:'',extra:''}; var ltv=v.bal/v.value*100; var ok=ltv<80; return{result:'LTV: '+ltv.toFixed(1)+'% — '+(ok?'below 80%, you can request PMI cancellation':'above 80%, PMI continues'),chart:Charts.bar([ltv,100-ltv],['LTV','Equity']),extra:'Under the Homeowners Protection Act lenders must cancel PMI at 78% automatically; at 80% you may request it with a clean payment history | A new appraisal that lifts value can get you there faster'};}, steps: function(v){ var ltv=v.bal/v.value*100; return['Formula: LTV = balance ÷ value × 100','Step 1: $'+v.bal.toLocaleString()+' ÷ $'+v.value.toLocaleString()+' = '+ltv.toFixed(3),'Step 2: Compare with the 80% threshold — '+(ltv<80?'you are under':'you are still over'),'Dropping PMI on a typical loan saves 0.3-1.5% of the original loan amount per year'];} },

  { id: 'escrow-analysis', name: 'Escrow Payment Calculator', desc: 'Monthly escrow with the two-month cushion', kw: 'escrow calculator property tax insurance monthly cushion', inputs: [{id:'tax',label:'Annual Property Tax ($)',type:'number',def:3600},{id:'ins',label:'Annual Insurance ($)',type:'number',def:1200}], calc: function(v){ if(v.tax<0||v.ins<0) return{result:'Enter non-negative amounts',chart:'',extra:''}; var total=v.tax+v.ins; var withCushion=total*1.1667; var m=withCushion/12; return{result:'Escrow: $'+m.toFixed(2)+'/month',chart:Charts.bar([total/12,m-total/12],['Base','Cushion']),extra:'Lenders hold a 2-month cushion by federal rule, so the deposit is about '+((withCushion/total-1)*100).toFixed(1)+'% above the raw 1/12 | Escrow analyses arrive annually — shortages are spread over 12 months, surpluses above $50 are refunded'};}, steps: function(v){ var total=v.tax+v.ins; var m=total*1.1667/12; return['Step 1: Annual total = $'+total.toLocaleString(),'Step 2: Add the 2-month cushion → $'+(total*1.1667).toLocaleString(),'Step 3: ÷ 12 = $'+m.toFixed(2)+' per month','Tax reassessments are the usual cause of payment jumps, not the insurance'];} },

  { id: 'portfolio-beta', name: 'Portfolio Beta Calculator', desc: 'Weighted market sensitivity of your holdings', kw: 'portfolio beta calculator weighted stock market sensitivity', inputs: [{id:'w1',label:'Holding 1 Weight (%)',type:'number',def:60},{id:'b1',label:'Holding 1 Beta',type:'number',def:1.2},{id:'w2',label:'Holding 2 Weight (%)',type:'number',def:40},{id:'b2',label:'Holding 2 Beta',type:'number',def:0.8}], calc: function(v){ var tot=v.w1+v.w2; if(tot<=0) return{result:'Enter weights',chart:'',extra:''}; var beta=(v.w1*v.b1+v.w2*v.b2)/tot; return{result:'Portfolio Beta: '+beta.toFixed(2),chart:Charts.gauge(beta,2),extra:'Beta 1.0 moves with the market; above 1 amplifies both directions | A 10% market drop against beta '+beta.toFixed(2)+' implies roughly a '+(beta*10).toFixed(1)+'% portfolio move'};}, steps: function(v){ var tot=v.w1+v.w2; var beta=(v.w1*v.b1+v.w2*v.b2)/tot; return['Formula: Portfolio beta = Σ(weight × beta)','Step 1: '+v.w1+'% × '+v.b1+' + '+v.w2+'% × '+v.b2+' = '+((v.w1*v.b1+v.w2*v.b2)/100).toFixed(3),'Step 2: ÷ '+tot+'% total weight = '+beta.toFixed(2),'Betas drift — recompute after big allocations or rebalances'];} },

  { id: 'yield-to-worst', name: 'Yield to Worst Calculator', desc: 'Conservative yield across call and maturity dates', kw: 'yield to worst calculator callable bond ytw ytc ytm', inputs: [{id:'ytm',label:'Yield to Maturity (%)',type:'number',def:5.2},{id:'ytc',label:'Yield to Call (%)',type:'number',def:4.1}], calc: function(v){ var w=Math.min(v.ytm,v.ytc); return{result:'Yield to Worst: '+w.toFixed(2)+'%',chart:Charts.bar([v.ytm,v.ytc,w],['YTM','YTC','YTW']),extra:'Callable bonds get redeemed when it suits the issuer — evaluate them at the lowest plausible yield, not the highest'};}, steps: function(v){ var w=Math.min(v.ytm,v.ytc); return['Step 1: Compute YTM (hold to maturity) and YTC (first call date)','Step 2: Yield to worst = the lower of every scenario = '+w.toFixed(2)+'%','Add YTC for each call date if the bond has a schedule — the floor governs the decision'];} },

  { id: 'coupon-payment', name: 'Bond Coupon Payment Calculator', desc: 'Periodic interest from face value and coupon rate', kw: 'bond coupon payment calculator semiannual interest face value', inputs: [{id:'face',label:'Face Value ($)',type:'number',def:1000},{id:'rate',label:'Annual Coupon Rate (%)',type:'number',def:6},{id:'perYear',label:'Payments per Year (1, 2, 4)',type:'number',def:2}], calc: function(v){ if(v.face<=0||v.perYear<1) return{result:'Enter valid values',chart:'',extra:''}; var p=v.face*v.rate/100/v.perYear; return{result:'Coupon Payment: $'+p.toFixed(2),chart:Charts.bar([p,v.face*v.rate/100],['Per period','Annual']),extra:'Annual total: $'+(v.face*v.rate/100).toFixed(2)+' in '+v.perYear+' payments | US corporate and Treasury bonds pay semiannually; many European bonds pay annually'};}, steps: function(v){ var p=v.face*v.rate/100/v.perYear; return['Formula: Payment = face × coupon ÷ payments per year','Step 1: $'+v.face.toLocaleString()+' × '+(v.rate/100)+' = $'+(v.face*v.rate/100).toFixed(2)+' annual','Step 2: ÷ '+v.perYear+' = $'+p.toFixed(2)+' each','The coupon never changes; what changes is the yield you earn relative to the price you paid'];} },

  { id: 'clean-dirty-price', name: 'Clean vs Dirty Bond Price', desc: 'Strip accrued interest from the quoted price', kw: 'clean dirty price calculator accrued interest bond settlement', inputs: [{id:'dirty',label:'Dirty (Full) Price ($)',type:'number',def:1025},{id:'accrued',label:'Accrued Interest ($)',type:'number',def:8.5}], calc: function(v){ if(v.accrued<0) return{result:'Accrued cannot be negative',chart:'',extra:''}; var clean=v.dirty-v.accrued; return{result:'Clean Price: $'+clean.toFixed(2),chart:Charts.bar([clean,v.accrued],['Clean','Accrued']),extra:'The dirty price is what you actually pay; the clean price is what gets quoted and charted | Accrued resets to zero after each coupon date'};}, steps: function(v){ var clean=v.dirty-v.accrued; return['Formula: Clean = dirty − accrued','Step 1: $'+v.dirty+' − $'+v.accrued+' = $'+clean.toFixed(2),'Step 2: The buyer repays the seller the accrued slice at settlement, then collects the next full coupon'];} },

  { id: 'convexity', name: 'Bond Convexity Calculator', desc: 'Curvature of price change from up and down repricing', kw: 'bond convexity calculator price sensitivity duration improvement', inputs: [{id:'p0',label:'Current Price ($)',type:'number',def:1000},{id:'pUp',label:'Price if Yield Falls ($)',type:'number',def:1019},{id:'pDn',label:'Price if Yield Rises ($)',type:'number',def:982},{id:'dy',label:'Yield Shift (decimal, e.g. 0.01)',type:'number',def:0.01}], calc: function(v){ if(v.p0<=0||v.dy<=0) return{result:'Enter valid values',chart:'',extra:''}; var cx=(v.pUp+v.pDn-2*v.p0)/(v.p0*v.dy*v.dy); return{result:'Convexity: '+cx.toFixed(1),chart:Charts.gauge(cx,200),extra:'Positive convexity means prices rise more when yields fall than they drop when yields rise — duration alone understates the upside'};}, steps: function(v){ var cx=(v.pUp+v.pDn-2*v.p0)/(v.p0*v.dy*v.dy); return['Formula: Convexity = (P↓yield + P↑yield − 2P0) ÷ (P0 × Δy²)','Step 1: '+v.pUp+' + '+v.pDn+' − 2×'+v.p0+' = '+(v.pUp+v.pDn-2*v.p0),'Step 2: ÷ ('+v.p0+' × '+Math.pow(v.dy,2)+') = '+cx.toFixed(1),'Bigger convexity is better for holders, all else equal'];} },

  { id: 'duration-bond', name: 'Modified Duration Calculator', desc: 'Rate sensitivity adjusted for payment frequency', kw: 'modified duration calculator macaulay bond interest rate sensitivity', inputs: [{id:'mac',label:'Macaulay Duration (years)',type:'number',def:7.2},{id:'y',label:'Yield (%)',type:'number',def:6},{id:'perYear',label:'Compounding per Year (1, 2)',type:'number',def:2}], calc: function(v){ if(v.mac<=0||v.perYear<1) return{result:'Enter valid values',chart:'',extra:''}; var md=v.mac/(1+v.y/100/v.perYear); return{result:'Modified Duration: '+md.toFixed(2),chart:Charts.gauge(md,30),extra:'A 1% rate rise drops the bond price about '+md.toFixed(2)+'% — modified duration is the practical risk number, Macaulay is the weighted time'};}, steps: function(v){ var md=v.mac/(1+v.y/100/v.perYear); return['Formula: Modified = Macaulay ÷ (1 + y ÷ k)','Step 1: '+v.y+'% ÷ '+v.perYear+' = '+(v.y/100/v.perYear),'Step 2: '+v.mac+' ÷ (1 + '+(v.y/100/v.perYear)+') = '+md.toFixed(2),'Price change ≈ −modified duration × Δyield for small shifts'];} },

  { id: 'appreciation-forecast', name: 'Property Appreciation Calculator', desc: 'Future value of real estate at a growth rate', kw: 'property appreciation calculator future home value growth rate', inputs: [{id:'val',label:'Current Value ($)',type:'number',def:300000},{id:'g',label:'Annual Growth (%)',type:'number',def:3},{id:'years',label:'Years',type:'number',def:10}], calc: function(v){ if(v.val<=0||v.years<0) return{result:'Enter valid values',chart:'',extra:''}; var fv=v.val*Math.pow(1+v.g/100,v.years); return{result:'Projected Value: $'+fv.toFixed(0),chart:Charts.bar([v.val,fv-v.val],['Today','Growth']),extra:'Gain: $'+(fv-v.val).toFixed(0)+' | Long-run US home appreciation has averaged 3-5%, but it is lumpy — decade-long flat stretches happen in weaker markets'};}, steps: function(v){ var fv=v.val*Math.pow(1+v.g/100,v.years); return['Formula: FV = value × (1 + g)^years','Step 1: (1 + '+(v.g/100)+')^'+v.years+' = '+Math.pow(1+v.g/100,v.years).toFixed(4),'Step 2: $'+v.val.toLocaleString()+' × '+Math.pow(1+v.g/100,v.years).toFixed(4)+' = $'+fv.toFixed(0),'Doubling time at '+v.g+'% is about '+(72/v.g).toFixed(0)+' years (rule of 72)'];} },

  { id: 'rent-vs-sell', name: 'Rent vs Sell Calculator', desc: 'Ten years of net rent against selling and investing', kw: 'rent vs sell calculator landlord keep property invest proceeds', inputs: [{id:'rentNet',label:'Net Annual Rent ($)',type:'number',def:20000},{id:'sell',label:'Sale Proceeds if Sold ($)',type:'number',def:350000},{id:'inv',label:'Investment Return (%)',type:'number',def:5},{id:'years',label:'Horizon (years)',type:'number',def:10}], calc: function(v){ var rentPath=v.rentNet*v.years; var sellPath=v.sell*Math.pow(1+v.inv/100,v.years)-v.sell; var keepRent=rentPath>=sellPath; return{result:(keepRent?'Renting':'Selling')+' projects ahead by $'+Math.abs(rentPath-sellPath).toFixed(0),chart:Charts.bar([rentPath,sellPath],['Rent income','Sale invested gains']),extra:'Rent path: $'+rentPath.toFixed(0)+' | Sale path gains: $'+sellPath.toFixed(0)+' | This ignores rent growth, upkeep shocks, and tax — treat it as the first cut, not the verdict'};}, steps: function(v){ var rentPath=v.rentNet*v.years; var sellPath=v.sell*Math.pow(1+v.inv/100,v.years)-v.sell; return['Step 1: Rent path = $'+v.rentNet.toLocaleString()+' × '+v.years+' = $'+rentPath.toLocaleString(),'Step 2: Sale path = $'+v.sell.toLocaleString()+' invested at '+v.inv+'% for '+v.years+' years → $'+(v.sell*Math.pow(1+v.inv/100,v.years)).toFixed(0)+', gains $'+sellPath.toFixed(0),'Step 3: Compare — but remember the house also appreciates while rented, and being a landlord is a job'];} },

  { id: 'seller-net', name: 'Seller Net Proceeds Calculator', desc: 'Cash in hand after commission and payoff', kw: 'seller net proceeds calculator home sale commission payoff', inputs: [{id:'price',label:'Sale Price ($)',type:'number',def:400000},{id:'comm',label:'Commission (%)',type:'number',def:6},{id:'closing',label:'Seller Closing Costs ($)',type:'number',def:3000},{id:'payoff',label:'Mortgage Payoff ($)',type:'number',def:250000}], calc: function(v){ if(v.price<=0) return{result:'Price must be positive',chart:'',extra:''}; var commD=v.price*v.comm/100; var net=v.price-commD-v.closing-v.payoff; return{result:'Net to Seller: $'+net.toFixed(0),chart:Charts.bar([v.price-commD-v.closing,v.payoff],['Before payoff','Payoff']),extra:'Commission: $'+commD.toFixed(0)+', closing: $'+v.closing.toLocaleString()+' | Add prorated taxes, seller credits, and any second liens to refine — net is usually 80-90% of price'};}, steps: function(v){ var commD=v.price*v.comm/100; var net=v.price-commD-v.closing-v.payoff; return['Step 1: Commission = $'+v.price.toLocaleString()+' × '+(v.comm/100)+' = $'+commD.toFixed(0),'Step 2: $'+v.price.toLocaleString()+' − $'+commD.toFixed(0)+' − $'+v.closing.toLocaleString()+' = $'+(v.price-commD-v.closing).toLocaleString(),'Step 3: − payoff $'+v.payoff.toLocaleString()+' = $'+net.toFixed(0)+' cash at closing'];} },

  { id: 'points-breakeven', name: 'Mortgage Points Break-Even', desc: 'Months for discount points to pay for themselves', kw: 'mortgage points break even calculator discount origination', inputs: [{id:'cost',label:'Points Cost ($)',type:'number',def:4000},{id:'save',label:'Monthly Savings ($)',type:'number',def:80}], calc: function(v){ if(v.save<=0) return{result:'Monthly savings must be positive',chart:'',extra:''}; var m=v.cost/v.save; return{result:'Break-even: '+m.toFixed(1)+' months ('+(m/12).toFixed(1)+' years)',chart:Charts.bar([m,360-m],['To break even','Remaining benefit window']),extra:'Stay past break-even and the points pay; sell or refinance earlier and they were a loss | Typical break-evens run 3-7 years'};}, steps: function(v){ var m=v.cost/v.save; return['Formula: Break-even months = points cost ÷ monthly saving','Step 1: $'+v.cost.toLocaleString()+' ÷ $'+v.save+' = '+m.toFixed(1)+' months','Step 2: Compare with how long you realistically expect to keep this loan','One point = 1% of the loan amount, buying roughly a 0.25% rate cut at normal pricing'];} },

  { id: 'cap-rate-conv', name: 'Cap Rate to Value Calculator', desc: 'Property value implied by NOI and a market cap rate', kw: 'cap rate to value calculator noi capitalization rate property valuation income approach',
    inputs: [{id:'noi',label:'Net Operating Income ($/yr)',type:'number',def:60000},{id:'cap',label:'Market Cap Rate (%)',type:'number',def:6}],
    calc: function(v){ const val=v.noi/(v.cap/100); return { result: '$'+val.toFixed(0), chart: null, extra: 'Value = NOI ÷ cap rate — the income approach. Lower cap rates mean higher valuations and often lower risk' }; },
    steps: function(v){ return ['Value = NOI ÷ cap rate']; } },
  { id: 'rule-of-40', name: 'Rule of 40 Calculator', desc: 'SaaS growth plus profit margin health check', kw: 'rule of 40 calculator saas growth margin software company valuation benchmark',
    inputs: [{id:'growth',label:'Revenue Growth Rate (%)',type:'number',def:30},{id:'margin',label:'Profit Margin (%)',type:'number',def:15}],
    calc: function(v){ const s=v.growth+v.margin; const verdict=s>=40?'Passes the Rule of 40':'Below the Rule of 40 threshold'; return { result: s.toFixed(0), chart: null, extra: verdict+' — popularized for SaaS by investors (McKinsey/Bessemer usage): growth % + profit % ≥ 40' }; },
    steps: function(v){ return ['Score = revenue growth % + profit margin %']; } },
  { id: 'cost-of-delay', name: 'Cost of Delay Calculator', desc: 'Revenue lost per month a launch or decision slips', kw: 'cost of delay calculator product launch revenue lost month project management',
    inputs: [{id:'monthly',label:'Value at Stake ($/month)',type:'number',def:1000},{id:'months',label:'Delay (months)',type:'number',def:8}],
    calc: function(v){ const d=v.monthly*v.months; return { result: '$'+d.toFixed(0), chart: null, extra: 'Simple linear cost of delay — the core quantity in SAFe and Lean product economics' }; },
    steps: function(v){ return ['Cost of delay = value per month × months delayed']; } },
];

if (typeof window !== 'undefined') window.FINANCE_TOOLS = FINANCE_TOOLS;
if (typeof module !== 'undefined') {
  module.exports = FINANCE_TOOLS;
  // Expose the pure math helpers for unit tests (keeps the array as default export)
  module.exports.helpers = { perPeriodRate, freqLabel, getDccLabel, calcEMI, calcPrincipal, calcRate, calcTerm, compFutureValue, compPrincipal, compRate, compTime, compIsContinuous, compContributionsFV };
}
