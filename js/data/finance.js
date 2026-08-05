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
  { id: 'loan-emi', name: 'Loan EMI Calculator', desc: 'Solve for payment, loan amount, rate or term — with interest-only mode & day-count convention', kw: 'emi calculator, loan calculator, monthly payment, interest only, day count convention',
    inputs: [
      {id:'mode',label:'Solve For',type:'select',opts:[{v:'payment',l:'Payment'},{v:'amount',l:'Loan Amount'},{v:'rate',l:'Interest Rate'},{v:'term',l:'Loan Term'},{v:'interest-only',l:'Interest-Only'}],def:'payment'},
      {id:'amount',label:'Loan Amount',type:'number',def:100000,slider:{min:1000,max:1000000,step:5000}},
      {id:'rate',label:'Interest Rate (% per year)',type:'number',def:8.5,slider:{min:0,max:25,step:0.5}},
      {id:'years',label:'Loan Term (years)',type:'number',def:5},
      {id:'payment',label:'Payment per Period (for solve modes)',type:'number',def:2000},
      {id:'ioYears',label:'Interest-Only Period (years)',type:'number',def:2},
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
      const emi=calcEMI(v.amount,r,n); return ['Solving for Payment (DCC: '+dccLabel+')','Step 1: Rate per '+per+' = '+v.rate+'% → '+(r*100).toFixed(4)+'% ('+dccLabel+')','Step 2: Periods n = '+v.years+'×'+ppy+' = '+n,'Step 3: PMT = P×r×(1+r)^n / ((1+r)^n − 1)','Step 4: PMT = $'+emi.toFixed(2)+' per '+per]; } },
  { id: 'mortgage', name: 'Mortgage Calculator', desc: 'Mortgage — solve for payment, home price, rate or term — with interest-only mode & DCC', kw: 'mortgage calculator, home loan, monthly mortgage, interest only mortgage, day count convention',
    inputs: [
      {id:'mode',label:'Solve For',type:'select',opts:[{v:'payment',l:'Payment'},{v:'amount',l:'Home Price'},{v:'rate',l:'Interest Rate'},{v:'term',l:'Loan Term'},{v:'interest-only',l:'Interest-Only'}],def:'payment'},
      {id:'amount',label:'Home Price',type:'number',def:300000},
      {id:'down',label:'Down Payment',type:'number',def:60000},
      {id:'rate',label:'Interest Rate (% per year)',type:'number',def:6.5},
      {id:'years',label:'Loan Term (years)',type:'number',def:30},
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
  { id: 'compound-interest', name: 'Compound Interest Calculator', desc: 'Compound growth with contributions — solve for amount, principal, rate or time', kw: 'compound interest, investment growth, ci calculator, continuous compounding, solve for rate',
    inputs: [
      {id:'mode',label:'Solve For',type:'select',opts:[{v:'final',l:'Final Amount'},{v:'principal',l:'Starting Principal'},{v:'rate',l:'Required Rate'},{v:'time',l:'Required Time'}],def:'final'},
      {id:'principal',label:'Principal Amount',type:'number',def:10000},
      {id:'rate',label:'Annual Rate (%)',type:'number',def:7},
      {id:'years',label:'Time (years)',type:'number',def:10},
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
  { id: 'simple-interest', name: 'Simple Interest Calculator', desc: 'Solve for interest, principal, rate or time', kw: 'simple interest, si calculator, interest, solve for rate',
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
  { id: 'auto-loan', name: 'Auto Loan Calculator', desc: 'Car loan — solve for payment, term or rate — with interest-only & DCC', kw: 'auto loan, car loan, vehicle finance, interest only, day count convention',
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
      const dccLabel=dccLabel(v.dcc || 'act365');
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
  { id: 'credit-card-payoff', name: 'Credit Card Payoff', desc: 'Credit card payoff — solve for payoff time, payment needed, rate, or balance', kw: 'credit card payoff, debt calculator, solve for payment, solve for time',
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
  { id: 'retirement', name: 'Retirement Calculator', desc: 'Retirement calculator — solve for final amount, monthly contribution, time, or required rate', kw: 'retirement calculator, retirement planning, 401k, solve for time, solve for contribution',
    inputs: [
      {id:'mode',label:'Solve For',type:'select',opts:[{v:'future',l:'Final Amount'},{v:'monthly',l:'Monthly Contribution'},{v:'time',l:'Years Needed'},{v:'rate',l:'Required Rate'}],def:'future'},
      {id:'current',label:'Current Savings',type:'number',def:50000},
      {id:'monthly',label:'Monthly Contribution',type:'number',def:500},
      {id:'rate',label:'Annual Return (%)',type:'number',def:7},
      {id:'years',label:'Years to Retirement',type:'number',def:30},
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
  { id: 'investment', name: 'Investment Calculator', desc: 'Investment calculator — solve for future value, initial investment, rate, or time', kw: 'investment calculator, roi, return on investment, solve for rate, solve for time',
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
  { id: 'savings-goal', name: 'Savings Goal Calculator', desc: 'Savings goal — solve for monthly contribution, target, time, or required rate', kw: 'savings goal, savings calculator, savings plan, solve for time, solve for rate',
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
  { id: 'tax', name: 'Income Tax Calculator', desc: 'Calculate income tax with deductions', kw: 'tax calculator, income tax, tax refund',
    inputs: [{id:'income',label:'Annual Income',type:'number',def:75000},{id:'rate',label:'Tax Rate (%)',type:'number',def:22},{id:'deductions',label:'Deductions',type:'number',def:12500}],
    calc: function(v) { const a = AdvancedCalc.taxSteps(v.income, v.rate, v.deductions); return { result: 'Tax Owed: $' + a.tax.toFixed(2), chart: Charts.bar([a.taxableIncome, a.tax, a.netIncome], ['Taxable','Tax','Net']), extra: 'Net Income: $' + a.netIncome.toFixed(2) }; },
    steps: function(v) { const taxable=Math.max(0,v.income-v.deductions); const tax=taxable*v.rate/100; return ['Step 1: Taxable income = $'+v.income+' - $'+v.deductions+' = $'+taxable,'Step 2: Tax = $'+taxable+' × '+v.rate+'% = $'+tax.toFixed(2),'Step 3: Net income = $'+v.income+' - $'+tax.toFixed(2)+' = $'+(v.income-tax).toFixed(2)]; } },
  { id: 'sales-tax', name: 'Sales Tax Calculator', desc: 'Calculate sales tax on purchases', kw: 'sales tax, vat calculator, tax on purchase',
    inputs: [{id:'amount',label:'Purchase Amount',type:'number',def:100},{id:'rate',label:'Tax Rate (%)',type:'number',def:8.25}],
    calc: function(v) { const tax = v.amount * v.rate / 100; return { result: 'Tax: $' + tax.toFixed(2), chart: Charts.donut([v.amount, tax], ['Price','Tax']), extra: 'Total: $' + (v.amount + tax).toFixed(2) }; },
    steps: function(v) { const tax=v.amount*v.rate/100; return ['Step 1: Tax = $'+v.amount+' × '+v.rate+'% = $'+tax.toFixed(2),'Step 2: Total = $'+v.amount+' + $'+tax.toFixed(2)+' = $'+(v.amount+tax).toFixed(2)]; } },
  { id: 'npv', name: 'NPV Calculator', desc: 'Net present value of cash flows', kw: 'npv calculator, net present value, dcf',
    inputs: [{id:'rate',label:'Discount Rate (%)',type:'number',def:10},{id:'flows',label:'Cash Flows (comma separated)',type:'text',def:'-10000,3000,3000,3000,3000'}],
    calc: function(v) { const flows = v.flows.split(',').map(Number); const r = v.rate/100; const npv = flows.reduce((s,f,t) => s + f/Math.pow(1+r,t), 0); return { result: 'NPV: $' + npv.toFixed(2), chart: Charts.bar(flows, flows.map((_,i)=>'Y'+i)), extra: npv > 0 ? 'Good investment' : 'Poor investment' }; },
    steps: function(v) { const flows=v.flows.split(',').map(Number); const r=v.rate/100; return ['Formula: NPV = Σ CFt / (1+r)^t','Step 1: Discount rate r = '+v.rate+'% = '+r,'Step 2: Discount each cash flow:','...CF0 = '+flows[0]+' / (1.1)^0 = '+flows[0],'...CF1 = '+flows[1]+' / (1.1)^1 = '+(flows[1]/1.1).toFixed(2),'Step 3: Sum all discounted flows = $'+flows.reduce((s,f,t)=>s+f/Math.pow(1+r,t),0).toFixed(2)]; } },
  { id: 'irr', name: 'IRR Calculator', desc: 'Internal rate of return', kw: 'irr calculator, internal rate of return, investment analysis',
    inputs: [{id:'flows',label:'Cash Flows (comma separated)',type:'text',def:'-10000,3000,3500,4000,3500'}],
    calc: function(v) { const flows = v.flows.split(',').map(Number); const r = AdvancedCalc.irr(flows); return { result: 'IRR: ' + (r*100).toFixed(2) + '%', chart: Charts.bar(flows, flows.map((_,i)=>'Y'+i)), extra: 'Annualized return rate' }; },
    steps: function(v) { const flows=v.flows.split(',').map(Number); const r=AdvancedCalc.irr(flows); return ['Formula: IRR is the rate where NPV = 0','Step 1: Find r such that Σ CFt/(1+r)^t = 0','Step 2: Using Newton-Raphson method...','Step 3: IRR = '+(r*100).toFixed(2)+'%']; } },
  { id: 'roi', name: 'ROI Calculator', desc: 'Return on investment', kw: 'roi calculator, return on investment, profit margin',
    inputs: [{id:'cost',label:'Investment Cost',type:'number',def:10000},{id:'gain',label:'Current Value',type:'number',def:15000}],
    calc: function(v) { const roi = (v.gain - v.cost) / v.cost * 100; return { result: 'ROI: ' + roi.toFixed(2) + '%', chart: Charts.gauge(roi, 100), extra: 'Profit: $' + (v.gain - v.cost).toFixed(2) }; },
    steps: function(v) { const roi=(v.gain-v.cost)/v.cost*100; return ['Formula: ROI = (Gain - Cost) / Cost × 100','Step 1: Profit = $'+v.gain+' - $'+v.cost+' = $'+(v.gain-v.cost),'Step 2: ROI = $'+(v.gain-v.cost)+' / $'+v.cost+' × 100','Step 3: ROI = '+roi.toFixed(2)+'%']; } },
  { id: 'tip', name: 'Tip Calculator', desc: 'Calculate tip and split bill', kw: 'tip calculator, gratuity, split bill',
    inputs: [{id:'bill',label:'Bill Amount',type:'number',def:50},{id:'tipPct',label:'Tip (%)',type:'number',def:15},{id:'people',label:'Number of People',type:'number',def:2}],
    calc: function(v) { const a = AdvancedCalc.tipSteps(v.bill, v.tipPct, v.people); return { result: 'Tip: $' + a.tip.toFixed(2), chart: Charts.donut([v.bill, a.tip], ['Bill','Tip']), extra: 'Per Person: $' + a.perPerson.toFixed(2) }; },
    steps: function(v) { const tip=v.bill*v.tipPct/100; const total=v.bill+tip; const pp=total/v.people; return ['Step 1: Tip = $'+v.bill+' × '+v.tipPct+'% = $'+tip.toFixed(2),'Step 2: Total = $'+v.bill+' + $'+tip.toFixed(2)+' = $'+total.toFixed(2),'Step 3: Per person = $'+total.toFixed(2)+' / '+v.people+' = $'+pp.toFixed(2)]; } },
  { id: 'salary', name: 'Salary Calculator', desc: 'Calculate annual salary breakdown', kw: 'salary calculator, hourly to salary, annual income',
    inputs: [{id:'hourly',label:'Hourly Rate',type:'number',def:25},{id:'hours',label:'Hours/Week',type:'number',def:40},{id:'weeks',label:'Weeks/Year',type:'number',def:52}],
    calc: function(v) { const annual = v.hourly * v.hours * v.weeks; const monthly = annual / 12; return { result: 'Annual: $' + annual.toFixed(2), chart: Charts.bar([monthly, annual/4, annual/26, annual/52], ['Monthly','Quarterly','Biweekly','Weekly']), extra: 'Monthly: $' + monthly.toFixed(2) }; },
    steps: function(v) { const annual=v.hourly*v.hours*v.weeks; return ['Step 1: Annual = $'+v.hourly+'/hr × '+v.hours+'hrs × '+v.weeks+'weeks','Step 2: Annual = $'+annual.toFixed(2),'Step 3: Monthly = $'+(annual/12).toFixed(2),'Step 4: Weekly = $'+(annual/v.weeks).toFixed(2)]; } },
  { id: 'annuity', name: 'Annuity Calculator', desc: 'Calculate annuity payments', kw: 'annuity calculator, annuity payment, future value annuity',
    inputs: [{id:'pv',label:'Present Value',type:'number',def:100000},{id:'rate',label:'Rate (%)',type:'number',def:5},{id:'years',label:'Years',type:'number',def:20}],
    calc: function(v) { const r = v.rate/100/12; const pmt = r > 0 ? v.pv * r / (1 - Math.pow(1+r, -v.years*12)) : v.pv / (v.years*12); return { result: 'Monthly Payment: $' + pmt.toFixed(2), chart: Charts.line([v.pv, v.pv*0.5, 0], ['Start','Mid','End']), extra: 'Total: $' + (pmt * v.years * 12).toFixed(2) }; },
    steps: function(v) { const r=v.rate/100/12; const pmt=r>0?v.pv*r/(1-Math.pow(1+r,-v.years*12)):v.pv/(v.years*12); return ['Formula: PMT = PV × r / (1 - (1+r)^-n)','Step 1: Monthly rate = '+(r*100).toFixed(4)+'%','Step 2: PMT = $'+v.pv+'×'+r.toFixed(6)+' / (1-(1+r)^-'+(v.years*12)+')','Step 3: PMT = $'+pmt.toFixed(2)+'/month']; } },
  { id: 'inflation', name: 'Inflation Calculator', desc: 'Calculate inflation impact on purchasing power', kw: 'inflation calculator, purchasing power, inflation rate',
    inputs: [{id:'amount',label:'Amount',type:'number',def:1000},{id:'rate',label:'Inflation Rate (%)',type:'number',def:3},{id:'years',label:'Years',type:'number',def:10}],
    calc: function(v) { const fv = v.amount * Math.pow(1 + v.rate/100, v.years); const real = v.amount / Math.pow(1 + v.rate/100, v.years); return { result: 'Future Value: $' + fv.toFixed(2), chart: Charts.line([v.amount, fv*0.5, fv], ['Now','Mid','Future']), extra: 'Real Value: $' + real.toFixed(2) }; },
    steps: function(v) { const fv=v.amount*Math.pow(1+v.rate/100,v.years); return ['Step 1: Future value = $'+v.amount+'×(1+'+(v.rate/100)+')^'+v.years,'Step 2: FV = $'+fv.toFixed(2),'Step 3: Real purchasing power = $'+(v.amount/Math.pow(1+v.rate/100,v.years)).toFixed(2)]; } },
  { id: 'bonds', name: 'Bond Calculator', desc: 'Calculate bond yield to maturity', kw: 'bond calculator, bond yield, fixed income',
    inputs: [{id:'face',label:'Face Value',type:'number',def:1000},{id:'coupon',label:'Coupon Rate (%)',type:'number',def:5},{id:'price',label:'Current Price',type:'number',def:950},{id:'years',label:'Years to Maturity',type:'number',def:10}],
    calc: function(v) { const c = v.face * v.coupon/100; const ytm = (c + (v.face - v.price) / v.years) / ((v.face + v.price) / 2) * 100; return { result: 'YTM: ' + ytm.toFixed(2) + '%', chart: Charts.bar([v.price, v.face], ['Price','Face']), extra: 'Annual Coupon: $' + c.toFixed(2) }; },
    steps: function(v) { const c=v.face*v.coupon/100; const ytm=(c+(v.face-v.price)/v.years)/((v.face+v.price)/2)*100; return ['Step 1: Annual coupon = $'+v.face+'×'+v.coupon+'% = $'+c.toFixed(2),'Step 2: Annual gain = ($'+v.face+' - $'+v.price+')/'+v.years+' = $'+((v.face-v.price)/v.years).toFixed(2),'Step 3: YTM = ($'+c.toFixed(2)+' + $'+((v.face-v.price)/v.years).toFixed(2)+') / (($'+v.face+'+$'+v.price+')/2)','Step 4: YTM = '+ytm.toFixed(2)+'%']; } },
  { id: 'debt-ratio', name: 'Debt-to-Income Ratio', desc: 'Calculate DTI ratio', kw: 'debt to income, dti calculator, debt ratio',
    inputs: [{id:'income',label:'Monthly Income',type:'number',def:5000},{id:'debts',label:'Monthly Debts',type:'number',def:1500}],
    calc: function(v) { const dti = v.debts / v.income * 100; return { result: 'DTI: ' + dti.toFixed(1) + '%', chart: Charts.gauge(dti, 100), extra: dti < 36 ? 'Healthy' : 'High risk' }; },
    steps: function(v) { const dti=v.debts/v.income*100; return ['Formula: DTI = (Monthly Debts / Monthly Income) × 100','Step 1: DTI = ($'+v.debts+' / $'+v.income+') × 100','Step 2: DTI = '+dti.toFixed(1)+'%',dti<36?'Step 3: Healthy (below 36%)':'Step 3: High risk (above 36%)']; } },
  { id: 'net-worth-calculator', name: 'Net Worth Calculator', desc: 'Calculate your net worth', kw: 'net worth calculator, assets liabilities, personal finance',
    inputs: [{id:'assets',label:'Total Assets',type:'number',def:250000},{id:'liabilities',label:'Total Liabilities',type:'number',def:100000}],
    calc: function(v) { const nw = v.assets - v.liabilities; return { result: 'Net Worth: $' + nw.toFixed(2), chart: Charts.donut([v.assets, v.liabilities], ['Assets','Liabilities']), extra: nw > 0 ? 'Positive net worth' : 'Negative net worth' }; },
    steps: function(v) { const nw=v.assets-v.liabilities; return ['Formula: Net Worth = Assets - Liabilities','Step 1: Net Worth = $'+v.assets+' - $'+v.liabilities,'Step 2: Net Worth = $'+nw.toFixed(2)]; } },
  { id: 'rent-vs-buy', name: 'Rent vs Buy Calculator', desc: 'Should you rent or buy a home?', kw: 'rent vs buy, home buying, rent calculator',
    inputs: [{id:'rent',label:'Monthly Rent',type:'number',def:1500},{id:'price',label:'Home Price',type:'number',def:300000},{id:'rate',label:'Mortgage Rate (%)',type:'number',def:6.5},{id:'years',label:'Years',type:'number',def:10}],
    calc: function(v) { const a = AdvancedCalc.generateAmortization(v.price, v.rate, 30, 0); const buyCost = a.emi * v.years * 12; const rentCost = v.rent * 12 * v.years; return { result: buyCost < rentCost ? 'Buy is better' : 'Rent is better', chart: Charts.bar([rentCost, buyCost], ['Rent','Buy']), extra: 'Buy: $' + buyCost.toFixed(0) + ' | Rent: $' + rentCost.toFixed(0) }; },
    steps: function(v) { const a=AdvancedCalc.generateAmortization(v.price,v.rate,30,0); const buyCost=a.emi*v.years*12; const rentCost=v.rent*12*v.years; return ['Step 1: Monthly mortgage = $'+a.emi.toFixed(2),'Step 2: Buy cost over '+v.years+' years = $'+buyCost.toFixed(2),'Step 3: Rent cost over '+v.years+' years = $'+rentCost.toFixed(2),buyCost<rentCost?'Step 4: Buying saves $'+(rentCost-buyCost).toFixed(2):'Step 4: Renting saves $'+(buyCost-rentCost).toFixed(2)]; } },
  { id: 'refinance', name: 'Refinance Calculator', desc: 'Should you refinance your mortgage?', kw: 'refinance calculator, mortgage refinance, refi',
    inputs: [{id:'balance',label:'Current Balance',type:'number',def:200000},{id:'oldRate',label:'Current Rate (%)',type:'number',def:6.5},{id:'newRate',label:'New Rate (%)',type:'number',def:5.5},{id:'years',label:'Remaining Years',type:'number',def:25}],
    calc: function(v) { const oldEmi = AdvancedCalc.generateAmortization(v.balance, v.oldRate, v.years, 0).emi; const newEmi = AdvancedCalc.generateAmortization(v.balance, v.newRate, v.years, 0).emi; const savings = (oldEmi - newEmi) * v.years * 12; return { result: 'Monthly Savings: $' + (oldEmi - newEmi).toFixed(2), chart: Charts.bar([oldEmi, newEmi], ['Old','New']), extra: 'Total Savings: $' + savings.toFixed(2) }; },
    steps: function(v) { const old=AdvancedCalc.generateAmortization(v.balance,v.oldRate,v.years,0).emi; const nw=AdvancedCalc.generateAmortization(v.balance,v.newRate,v.years,0).emi; return ['Step 1: Old monthly = $'+old.toFixed(2),'Step 2: New monthly = $'+nw.toFixed(2),'Step 3: Monthly savings = $'+(old-nw).toFixed(2),'Step 4: Total savings = $'+((old-nw)*v.years*12).toFixed(2)]; } },
  { id: 'home-afford', name: 'Home Affordability Calculator', desc: 'How much home can you afford?', kw: 'home affordability, how much house, mortgage affordability',
    inputs: [{id:'income',label:'Annual Income',type:'number',def:80000},{id:'down',label:'Down Payment',type:'number',def:20000},{id:'rate',label:'Rate (%)',type:'number',def:6.5},{id:'years',label:'Term (years)',type:'number',def:30}],
    calc: function(v) { const monthlyIncome = v.income / 12; const maxPayment = monthlyIncome * 0.28; const r = v.rate/100/12; const n = v.years*12; const maxLoan = r > 0 ? maxPayment * (Math.pow(1+r,n) - 1) / (r * Math.pow(1+r,n)) : maxPayment * n; const maxPrice = maxLoan + v.down; return { result: 'Max Home Price: $' + maxPrice.toFixed(2), chart: Charts.gauge(maxPrice/1000000, 1, {center:'M$'}), extra: 'Max Loan: $' + maxLoan.toFixed(2) }; },
    steps: function(v) { const mi=v.income/12; const mp=mi*0.28; const r=v.rate/100/12; const n=v.years*12; const ml=r>0?mp*(Math.pow(1+r,n)-1)/(r*Math.pow(1+r,n)):mp*n; return ['Step 1: Max monthly payment = 28% of $'+mi.toFixed(2)+' = $'+mp.toFixed(2),'Step 2: Max loan = $'+ml.toFixed(2),'Step 3: Max home price = $'+ml.toFixed(2)+' + $'+v.down+' = $'+(ml+v.down).toFixed(2)]; } },
  { id: 'currency-converter', name: 'Currency Converter', desc: 'Convert between 150+ currencies with live rates', kw: 'currency converter, exchange rate, forex',
    inputs: [{id:'amount',label:'Amount',type:'number',def:100},{id:'from',label:'From',type:'select',opts:[]},{id:'to',label:'To',type:'select',opts:[]}],
    calc: null, async: true },
  { id: 'loan-qualify', name: 'Loan Qualification', desc: 'Check loan eligibility', kw: 'loan qualification, loan eligibility, pre-qualify',
    inputs: [{id:'income',label:'Monthly Income',type:'number',def:5000},{id:'debts',label:'Monthly Debts',type:'number',def:500},{id:'rate',label:'Rate (%)',type:'number',def:6.5},{id:'years',label:'Term (years)',type:'number',def:30}],
    calc: function(v) { const maxDti = 0.43; const available = v.income * maxDti - v.debts; const r = v.rate/100/12; const n = v.years*12; const loan = r > 0 ? available * (Math.pow(1+r,n)-1) / (r * Math.pow(1+r,n)) : available * n; return { result: 'Max Loan: $' + loan.toFixed(2), chart: Charts.gauge(loan/500000, 1), extra: 'Max Payment: $' + available.toFixed(2) }; },
    steps: function(v) { const avail=v.income*0.43-v.debts; const r=v.rate/100/12; const n=v.years*12; const loan=r>0?avail*(Math.pow(1+r,n)-1)/(r*Math.pow(1+r,n)):avail*n; return ['Step 1: Max DTI = 43%','Step 2: Available = 43%×$'+v.income+' - $'+v.debts+' = $'+avail.toFixed(2),'Step 3: Max loan = $'+loan.toFixed(2)]; } },
  { id: 'paycheck', name: 'Paycheck Calculator', desc: 'Calculate take-home pay', kw: 'paycheck calculator, take home pay, net pay',
    inputs: [{id:'gross',label:'Gross Annual',type:'number',def:60000},{id:'tax',label:'Tax Rate (%)',type:'number',def:22},{id:'benefits',label:'Benefits/Deductions',type:'number',def:3000}],
    calc: function(v) { const net = v.gross * (1 - v.tax/100) - v.benefits; return { result: 'Annual Net: $' + net.toFixed(2), chart: Charts.donut([v.gross * v.tax/100, v.benefits, net], ['Tax','Benefits','Net']), extra: 'Monthly: $' + (net/12).toFixed(2) }; },
    steps: function(v) { const tax=v.gross*v.tax/100; const net=v.gross-tax-v.benefits; return ['Step 1: Tax = '+v.tax+'% × $'+v.gross+' = $'+tax.toFixed(2),'Step 2: Net = $'+v.gross+' - $'+tax.toFixed(2)+' - $'+v.benefits+' = $'+net.toFixed(2),'Step 3: Monthly = $'+(net/12).toFixed(2)]; } },
  { id: 'break-even', name: 'Break-Even Calculator', desc: 'Calculate break-even point', kw: 'break even, break even point, business analysis',
    inputs: [{id:'fixed',label:'Fixed Costs',type:'number',def:10000},{id:'price',label:'Price per Unit',type:'number',def:50},{id:'variable',label:'Variable Cost/Unit',type:'number',def:20}],
    calc: function(v) { const units = v.fixed / (v.price - v.variable); const revenue = units * v.price; return { result: 'Break-Even: ' + units.toFixed(0) + ' units', chart: Charts.bar([v.fixed, v.variable * units, v.price * units], ['Fixed','Variable','Revenue']), extra: 'Revenue: $' + revenue.toFixed(2) }; },
    steps: function(v) { const units=v.fixed/(v.price-v.variable); return ['Formula: Break-Even = Fixed Costs / (Price - Variable Cost)','Step 1: Contribution margin = $'+v.price+' - $'+v.variable+' = $'+(v.price-v.variable),'Step 2: Break-even = $'+v.fixed+' / $'+(v.price-v.variable)+' = '+units.toFixed(0)+' units']; } },
  { id: 'cash-flow', name: 'Cash Flow Calculator', desc: 'Project cash flow over time', kw: 'cash flow, cash flow projection, business finance',
    inputs: [{id:'income',label:'Monthly Income',type:'number',def:10000},{id:'expenses',label:'Monthly Expenses',type:'number',def:7000},{id:'months',label:'Months',type:'number',def:12}],
    calc: function(v) { const monthly = v.income - v.expenses; const total = monthly * v.months; return { result: 'Monthly Cash Flow: $' + monthly.toFixed(2), chart: Charts.line([0, total/2, total], ['Start','Mid','End']), extra: 'Total: $' + total.toFixed(2) }; },
    steps: function(v) { const m=v.income-v.expenses; return ['Step 1: Monthly cash flow = $'+v.income+' - $'+v.expenses+' = $'+m.toFixed(2),'Step 2: Total over '+v.months+' months = $'+(m*v.months).toFixed(2)]; } },
  { id: 'markup', name: 'Markup Calculator', desc: 'Calculate price markup', kw: 'markup calculator, profit margin, pricing',
    inputs: [{id:'cost',label:'Cost',type:'number',def:20},{id:'markup',label:'Markup (%)',type:'number',def:50}],
    calc: function(v) { const price = v.cost * (1 + v.markup/100); const profit = price - v.cost; return { result: 'Selling Price: $' + price.toFixed(2), chart: Charts.donut([v.cost, profit], ['Cost','Profit']), extra: 'Profit: $' + profit.toFixed(2) }; },
    steps: function(v) { const price=v.cost*(1+v.markup/100); return ['Step 1: Markup amount = $'+v.cost+' × '+v.markup+'% = $'+(v.cost*v.markup/100).toFixed(2),'Step 2: Selling price = $'+v.cost+' + $'+(v.cost*v.markup/100).toFixed(2)+' = $'+price.toFixed(2)]; } },
  { id: 'discount', name: 'Discount Calculator', desc: 'Calculate sale price after discount', kw: 'discount calculator, sale price, markdown',
    inputs: [{id:'price',label:'Original Price',type:'number',def:100},{id:'discount',label:'Discount (%)',type:'number',def:20}],
    calc: function(v) { const save = v.price * v.discount / 100; const final = v.price - save; return { result: 'Final Price: $' + final.toFixed(2), chart: Charts.donut([final, save], ['Price','Discount']), extra: 'You Save: $' + save.toFixed(2) }; },
    steps: function(v) { const save=v.price*v.discount/100; return ['Step 1: Discount = $'+v.price+' × '+v.discount+'% = $'+save.toFixed(2),'Step 2: Final price = $'+v.price+' - $'+save.toFixed(2)+' = $'+(v.price-save).toFixed(2)]; } },
  { id: 'present-value', name: 'Present Value Calculator', desc: 'Present value — solve for present value, future value, discount rate, or time', kw: 'present value, pv calculator, time value of money, solve for rate, solve for time',
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
  { id: 'future-value', name: 'Future Value Calculator', desc: 'Future value — solve for future value, present value, rate, or time', kw: 'future value, fv calculator, investment growth, solve for rate, solve for time',
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
  { id: 'amortization', name: 'Amortization Schedule', desc: 'Full amortization schedule with breakdown', kw: 'amortization schedule, loan schedule, payment breakdown',
    inputs: [{id:'amount',label:'Loan Amount',type:'number',def:200000},{id:'rate',label:'Rate (%)',type:'number',def:6.5},{id:'years',label:'Years',type:'number',def:30}],
    calc: function(v) { const a = AdvancedCalc.generateAmortization(v.amount, v.rate, v.years, 0); const firstYear = a.schedule.slice(0, 12); return { result: 'Monthly: $' + a.emi.toFixed(2), chart: Charts.bar(firstYear.map(s=>s.principal), firstYear.map((_,i)=>'M'+(i+1))), extra: 'Total Interest: $' + a.totalInterest.toFixed(2) }; },
    steps: function(v) { return ['Step 1: Calculate monthly payment using EMI formula','Step 2: Each month: Interest = Balance × monthly rate','Step 3: Principal = EMI - Interest','Step 4: New Balance = Old Balance - Principal','Step 5: Repeat for all months']; } },
  { id: 'loan-to-value', name: 'Loan-to-Value Ratio', desc: 'Calculate LTV ratio', kw: 'ltv calculator, loan to value, mortgage ratio',
    inputs: [{id:'loan',label:'Loan Amount',type:'number',def:240000},{id:'value',label:'Property Value',type:'number',def:300000}],
    calc: function(v) { const ltv = v.loan / v.value * 100; return { result: 'LTV: ' + ltv.toFixed(1) + '%', chart: Charts.gauge(ltv, 100), extra: ltv < 80 ? 'Good LTV' : 'High LTV - PMI needed' }; },
    steps: function(v) { const ltv=v.loan/v.value*100; return ['Formula: LTV = (Loan Amount / Property Value) × 100','Step 1: LTV = ($'+v.loan+' / $'+v.value+') × 100','Step 2: LTV = '+ltv.toFixed(1)+'%']; } },
  { id: 'apr', name: 'APR Calculator', desc: 'Calculate annual percentage rate', kw: 'apr calculator, annual percentage rate, interest rate',
    inputs: [{id:'amount',label:'Loan Amount',type:'number',def:10000},{id:'fees',label:'Fees',type:'number',def:500},{id:'rate',label:'Nominal Rate (%)',type:'number',def:6},{id:'years',label:'Term (years)',type:'number',def:5}],
    calc: function(v) { const r = v.rate/100/12; const n = v.years*12; const emi = v.amount * r * Math.pow(1+r,n) / (Math.pow(1+r,n)-1); const netLoan = v.amount - v.fees; const apr = ((emi * n - netLoan) / netLoan / v.years) * 100; return { result: 'APR: ' + apr.toFixed(2) + '%', chart: Charts.bar([v.rate, apr], ['Nominal','APR']), extra: 'Monthly: $' + emi.toFixed(2) }; },
    steps: function(v) { return ['Step 1: Calculate monthly payment','Step 2: Net loan = $'+v.amount+' - $'+v.fees+' = $'+(v.amount-v.fees),'Step 3: APR accounts for fees in effective rate','Step 4: APR > Nominal rate due to fees']; } },
  { id: 'capital-gains', name: 'Capital Gains Tax', desc: 'Calculate capital gains tax', kw: 'capital gains tax, investment tax, stock gains',
    inputs: [{id:'purchase',label:'Purchase Price',type:'number',def:10000},{id:'sale',label:'Sale Price',type:'number',def:15000},{id:'rate',label:'Tax Rate (%)',type:'number',def:15}],
    calc: function(v) { const gain = v.sale - v.purchase; const tax = gain * v.rate / 100; return { result: 'Tax: $' + tax.toFixed(2), chart: Charts.donut([gain - tax, tax], ['Net Gain','Tax']), extra: 'Gain: $' + gain.toFixed(2) }; },
    steps: function(v) { const gain=v.sale-v.purchase; const tax=gain*v.rate/100; return ['Step 1: Gain = $'+v.sale+' - $'+v.purchase+' = $'+gain.toFixed(2),'Step 2: Tax = '+v.rate+'% × $'+gain.toFixed(2)+' = $'+tax.toFixed(2),'Step 3: Net gain = $'+(gain-tax).toFixed(2)]; } },
  { id: 'dividend', name: 'Dividend Calculator', desc: 'Calculate dividend income', kw: 'dividend calculator, dividend yield, stock dividend',
    inputs: [{id:'shares',label:'Number of Shares',type:'number',def:100},{id:'dividend',label:'Dividend/Share',type:'number',def:2.5},{id:'rate',label:'Reinvest Rate (%)',type:'number',def:0}],
    calc: function(v) { const annual = v.shares * v.dividend; const withReinvest = annual * Math.pow(1 + v.rate/100, 10); return { result: 'Annual Dividend: $' + annual.toFixed(2), chart: Charts.line([annual, withReinvest*0.5, withReinvest], ['Y1','Y5','Y10']), extra: '10yr: $' + withReinvest.toFixed(2) }; },
    steps: function(v) { const annual=v.shares*v.dividend; return ['Step 1: Annual dividend = '+v.shares+' × $'+v.dividend+' = $'+annual.toFixed(2),'Step 2: With reinvestment at '+v.rate+'%, 10yr value = $'+(annual*Math.pow(1+v.rate/100,10)).toFixed(2)]; } },
  { id: 'fire', name: 'FIRE Calculator', desc: 'Financial independence number', kw: 'fire calculator, financial independence, early retirement',
    inputs: [{id:'expenses',label:'Annual Expenses',type:'number',def:40000},{id:'savings',label:'Current Savings',type:'number',def:100000},{id:'rate',label:'Return (%)',type:'number',def:7},{id:'monthly',label:'Monthly Saving',type:'number',def:2000}],
    calc: function(v) { const fireNum = v.expenses * 25; const r = v.rate/100/12; const fv = v.savings * Math.pow(1+r, 12*20) + v.monthly * (Math.pow(1+r, 12*20) - 1) / r; return { result: 'FIRE Goal: $' + fireNum.toFixed(2), chart: Charts.gauge(fv/fireNum, 1, {center:'%'}), extra: 'Projected (20yr): $' + fv.toFixed(2) }; },
    steps: function(v) { const fire=v.expenses*25; return ['Step 1: FIRE number = 25 × annual expenses = 25 × $'+v.expenses+' = $'+fire.toFixed(2),'Step 2: This follows the 4% safe withdrawal rule','Step 3: Save $'+fire.toFixed(2)+' to retire']; } },
  { id: 'social-security', name: 'Social Security Calculator', desc: 'Estimate social security benefits', kw: 'social security, retirement benefits, ssi',
    inputs: [{id:'income',label:'Average Annual Income',type:'number',def:50000},{id:'years',label:'Years Worked',type:'number',def:35}],
    calc: function(v) { const benefit = v.income * 0.4 * (v.years/35); return { result: 'Monthly Benefit: $' + (benefit/12).toFixed(2), chart: Charts.bar([v.income, benefit], ['Income','Benefit']), extra: 'Annual: $' + benefit.toFixed(2) }; },
    steps: function(v) { const benefit=v.income*0.4*(v.years/35); return ['Step 1: Base benefit ≈ 40% of income','Step 2: Adjust for years worked: '+v.years+'/35','Step 3: Annual benefit = $'+benefit.toFixed(2),'Step 4: Monthly = $'+(benefit/12).toFixed(2)]; } },
  { id: 'rental-yield', name: 'Rental Yield Calculator', desc: 'Calculate rental yield', kw: 'rental yield, rental income, property investment',
    inputs: [{id:'price',label:'Property Price',type:'number',def:200000},{id:'rent',label:'Monthly Rent',type:'number',def:1500},{id:'costs',label:'Annual Costs',type:'number',def:3000}],
    calc: function(v) { const annualRent = v.rent * 12; const netYield = (annualRent - v.costs) / v.price * 100; return { result: 'Net Yield: ' + netYield.toFixed(2) + '%', chart: Charts.donut([annualRent - v.costs, v.costs], ['Income','Costs']), extra: 'Gross Yield: ' + (annualRent/v.price*100).toFixed(2) + '%' }; },
    steps: function(v) { const ar=v.rent*12; const ny=(ar-v.costs)/v.price*100; return ['Step 1: Annual rent = $'+v.rent+'×12 = $'+ar.toFixed(2),'Step 2: Net income = $'+ar.toFixed(2)+' - $'+v.costs+' = $'+(ar-v.costs).toFixed(2),'Step 3: Net yield = $'+(ar-v.costs).toFixed(2)+' / $'+v.price+' × 100 = '+ny.toFixed(2)+'%']; } },
  { id: 'loan-comparison', name: 'Loan Comparison', desc: 'Compare multiple loan offers', kw: 'loan comparison, compare loans, best loan',
    inputs: [{id:'amount',label:'Loan Amount',type:'number',def:50000},{id:'rate1',label:'Offer 1 Rate (%)',type:'number',def:6},{id:'years1',label:'Offer 1 Term',type:'number',def:5},{id:'rate2',label:'Offer 2 Rate (%)',type:'number',def:7},{id:'years2',label:'Offer 2 Term',type:'number',def:4}],
    calc: function(v) { const a1=AdvancedCalc.generateAmortization(v.amount,v.rate1,v.years1,0); const a2=AdvancedCalc.generateAmortization(v.amount,v.rate2,v.years2,0); return { result: 'Offer 1: $'+a1.emi.toFixed(2)+'/mo | Offer 2: $'+a2.emi.toFixed(2)+'/mo', chart: Charts.bar([a1.emi, a2.emi, a1.totalPayment, a2.totalPayment], ['EMI1','EMI2','Total1','Total2']), extra: a1.totalPayment < a2.totalPayment ? 'Offer 1 saves $'+(a2.totalPayment-a1.totalPayment).toFixed(2) : 'Offer 2 saves $'+(a1.totalPayment-a2.totalPayment).toFixed(2) }; },
    steps: function(v) { const a1=AdvancedCalc.generateAmortization(v.amount,v.rate1,v.years1,0); const a2=AdvancedCalc.generateAmortization(v.amount,v.rate2,v.years2,0); return ['Step 1: Offer 1 EMI = $'+a1.emi.toFixed(2)+'/mo, Total = $'+a1.totalPayment.toFixed(2),'Step 2: Offer 2 EMI = $'+a2.emi.toFixed(2)+'/mo, Total = $'+a2.totalPayment.toFixed(2),a1.totalPayment<a2.totalPayment?'Step 3: Offer 1 is cheaper by $'+(a2.totalPayment-a1.totalPayment).toFixed(2):'Step 3: Offer 2 is cheaper by $'+(a1.totalPayment-a2.totalPayment).toFixed(2)]; } },
  { id: 'investment-growth', name: 'Investment Growth Comparison', desc: 'Compare different investment strategies', kw: 'investment growth, compare investments, portfolio growth',
    inputs: [{id:'amount',label:'Initial Investment',type:'number',def:10000},{id:'rate1',label:'Conservative (%)',type:'number',def:4},{id:'rate2',label:'Moderate (%)',type:'number',def:7},{id:'rate3',label:'Aggressive (%)',type:'number',def:10},{id:'years',label:'Years',type:'number',def:20}],
    calc: function(v) { const f1=v.amount*Math.pow(1+v.rate1/100,v.years); const f2=v.amount*Math.pow(1+v.rate2/100,v.years); const f3=v.amount*Math.pow(1+v.rate3/100,v.years); return { result: 'Conservative: $'+f1.toFixed(0)+' | Moderate: $'+f2.toFixed(0)+' | Aggressive: $'+f3.toFixed(0), chart: Charts.bar([f1, f2, f3], ['Conservative','Moderate','Aggressive']), extra: 'Difference: $'+(f3-f1).toFixed(2) }; },
    steps: function(v) { const f1=v.amount*Math.pow(1+v.rate1/100,v.years); const f3=v.amount*Math.pow(1+v.rate3/100,v.years); return ['Step 1: Conservative ('+v.rate1+'%) = $'+f1.toFixed(2),'Step 2: Moderate ('+v.rate2+'%) = $'+(v.amount*Math.pow(1+v.rate2/100,v.years)).toFixed(2),'Step 3: Aggressive ('+v.rate3+'%) = $'+f3.toFixed(2),'Step 4: Risk premium = $'+(f3-f1).toFixed(2)]; } },
  { id: 'savings-comparison', name: 'Savings Account Comparison', desc: 'Compare savings account rates', kw: 'savings comparison, compare savings, high yield savings',
    inputs: [{id:'amount',label:'Deposit Amount',type:'number',def:10000},{id:'rate1',label:'Bank 1 Rate (%)',type:'number',def:0.5},{id:'rate2',label:'Bank 2 Rate (%)',type:'number',def:4.5},{id:'years',label:'Years',type:'number',def:5}],
    calc: function(v) { const f1=v.amount*Math.pow(1+v.rate1/100,v.years); const f2=v.amount*Math.pow(1+v.rate2/100,v.years); return { result: 'Bank 1: $'+f1.toFixed(2)+' | Bank 2: $'+f2.toFixed(2), chart: Charts.bar([f1, f2], ['Bank 1','Bank 2']), extra: 'Bank 2 earns $'+(f2-f1).toFixed(2)+' more' }; },
    steps: function(v) { const f1=v.amount*Math.pow(1+v.rate1/100,v.years); const f2=v.amount*Math.pow(1+v.rate2/100,v.years); return ['Step 1: Bank 1 ('+v.rate1+'%) = $'+f1.toFixed(2),'Step 2: Bank 2 ('+v.rate2+'%) = $'+f2.toFixed(2),'Step 3: Difference = $'+(f2-f1).toFixed(2)+' extra in Bank 2']; } },
  { id: 'mortgage-payoff', name: 'Mortgage Payoff Calculator', desc: 'Calculate early mortgage payoff savings', kw: 'mortgage payoff, early payoff, extra payment',
    inputs: [{id:'amount',label:'Loan Amount',type:'number',def:200000},{id:'rate',label:'Rate (%)',type:'number',def:6.5},{id:'years',label:'Original Term',type:'number',def:30},{id:'extra',label:'Extra Monthly Payment',type:'number',def:200}],
    calc: function(v) { const a=AdvancedCalc.generateAmortization(v.amount,v.rate,v.years,0); const newEmi=a.emi+v.extra; const r=v.rate/100/12; const newMonths=Math.ceil(-Math.log(1-r*v.amount/newEmi)/Math.log(1+r)); const savings=a.totalPayment-(newEmi*newMonths); return { result: 'Payoff in '+newMonths+' months (vs '+v.years*12+')', chart: Charts.bar([v.years*12, newMonths], ['Original','With Extra']), extra: 'Save $'+savings.toFixed(2)+' in interest' }; },
    steps: function(v) { const a=AdvancedCalc.generateAmortization(v.amount,v.rate,v.years,0); const newEmi=a.emi+v.extra; const r=v.rate/100/12; const nm=Math.ceil(-Math.log(1-r*v.amount/newEmi)/Math.log(1+r)); return ['Step 1: Original EMI = $'+a.emi.toFixed(2),'Step 2: New EMI with extra = $'+newEmi.toFixed(2),'Step 3: New payoff time = '+nm+' months','Step 4: Save '+(v.years*12-nm)+' months and $'+(a.totalPayment-newEmi*nm).toFixed(2)]; } },
  { id: 'graduated-payment', name: 'Graduated Payment Mortgage', desc: 'Calculate GPM payments', kw: 'graduated payment, gpm, increasing payment mortgage',
    inputs: [{id:'amount',label:'Loan Amount',type:'number',def:200000},{id:'rate',label:'Rate (%)',type:'number',def:6},{id:'years',label:'Term (years)',type:'number',def:30},{id:'growth',label:'Annual Growth (%)',type:'number',def:5}],
    calc: function(v) { const r=v.rate/100/12; const n=v.years*12; const baseEmi=r>0?v.amount*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1):v.amount/n; const startEmi=baseEmi*0.7; const endEmi=startEmi*Math.pow(1+v.growth/100,5); return { result: 'Year 1: $'+startEmi.toFixed(2)+'/mo | Year 6+: $'+endEmi.toFixed(2)+'/mo', chart: Charts.bar([startEmi, startEmi*1.3, startEmi*1.6, endEmi], ['Y1','Y2','Y3','Y6+']), extra: 'Standard EMI would be $'+baseEmi.toFixed(2) }; },
    steps: function(v) { return ['Step 1: Calculate standard EMI','Step 2: Start at 70% of standard EMI','Step 3: Increase '+v.growth+'% annually for 5 years','Step 4: Then fixed for remaining term']; } },
  { id: 'balloon-payment', name: 'Balloon Payment Calculator', desc: 'Calculate balloon mortgage payment', kw: 'balloon payment, balloon mortgage, lump sum payment',
    inputs: [{id:'amount',label:'Loan Amount',type:'number',def:200000},{id:'rate',label:'Rate (%)',type:'number',def:6},{id:'years',label:'Amortization (years)',type:'number',def:30},{id:'balloon',label:'Balloon After (years)',type:'number',def:5}],
    calc: function(v) { const a=AdvancedCalc.generateAmortization(v.amount,v.rate,v.years,0); const balAfter=a.schedule[v.balloon*12-1].balance; return { result: 'Monthly: $'+a.emi.toFixed(2)+' | Balloon: $'+balAfter.toFixed(2), chart: Charts.bar([v.amount, balAfter], ['Initial','Balloon']), extra: 'After '+v.balloon+' years, pay $'+balAfter.toFixed(2) }; },
    steps: function(v) { const a=AdvancedCalc.generateAmortization(v.amount,v.rate,v.years,0); const bal=a.schedule[v.balloon*12-1].balance; return ['Step 1: Calculate monthly payment = $'+a.emi.toFixed(2),'Step 2: After '+v.balloon+' years, remaining balance = $'+bal.toFixed(2),'Step 3: This balance must be paid as lump sum']; } },
  { id: 'interest-only', name: 'Interest-Only Mortgage', desc: 'Calculate interest-only payments', kw: 'interest only mortgage, io loan, interest only payment',
    inputs: [{id:'amount',label:'Loan Amount',type:'number',def:300000},{id:'rate',label:'Rate (%)',type:'number',def:6.5},{id:'ioYears',label:'IO Period (years)',type:'number',def:5},{id:'years',label:'Total Term (years)',type:'number',def:30}],
    calc: function(v) { const ioPayment=v.amount*v.rate/100/12; const remainingYears=v.years-v.ioYears; const a=AdvancedCalc.generateAmortization(v.amount,v.rate,remainingYears,0); return { result: 'IO Payment: $'+ioPayment.toFixed(2)+'/mo | After: $'+a.emi.toFixed(2)+'/mo', chart: Charts.bar([ioPayment, a.emi], ['IO Period','After IO']), extra: 'IO for '+v.ioYears+' years, then amortize over '+remainingYears+' years' }; },
    steps: function(v) { const io=v.amount*v.rate/100/12; const rem=v.years-v.ioYears; const a=AdvancedCalc.generateAmortization(v.amount,v.rate,rem,0); return ['Step 1: IO payment = $'+v.amount+'×'+v.rate+'%/12 = $'+io.toFixed(2)+'/mo','Step 2: After '+v.ioYears+' years, amortize over '+rem+' years','Step 3: New payment = $'+a.emi.toFixed(2)+'/mo']; } },
  { id: 'emergency-fund', name: 'Emergency Fund Calculator', desc: 'Calculate how much you need in your emergency fund', kw: 'emergency fund, emergency savings, rainy day fund, savings goal',
    inputs: [{id:'monthlyExpenses',label:'Monthly Expenses ($)',type:'number',def:3000},{id:'months',label:'Months to Cover',type:'number',def:6},{id:'currentSaved',label:'Currently Saved ($)',type:'number',def:5000},{id:'monthlyContribution',label:'Monthly Contribution ($)',type:'number',def:500}],
    calc: function(v) { const target=v.monthlyExpenses*v.months; const gap=Math.max(0,target-v.currentSaved); const contrib=Math.max(0,v.monthlyContribution||0); const monthsToFill=gap>0?(contrib>0?Math.ceil(gap/contrib):-1):0; return { result: 'Target: $'+target.toLocaleString()+' | Saved: $'+v.currentSaved.toLocaleString(), chart: Charts.donut([v.currentSaved, Math.max(0,target-v.currentSaved)], ['Saved','Gap']), extra: 'Gap: $'+gap.toLocaleString()+' | '+(monthsToFill>0?monthsToFill+' months to fully fund at $'+contrib+'/mo':monthsToFill===0?'Fully funded ✓':'Add a monthly contribution to see timeline')+' | Rule: 3–6 months of expenses' }; },
    steps: function(v) { const t=v.monthlyExpenses*v.months; const g=Math.max(0,t-v.currentSaved); return ['Step 1: Target = $'+v.monthlyExpenses.toLocaleString()+' × '+v.months+' = $'+t.toLocaleString(),'Step 2: Gap = $'+t.toLocaleString()+' − $'+v.currentSaved.toLocaleString()+' = $'+g.toLocaleString(),'Step 3: Months to fill = $'+g.toLocaleString()+' / $'+v.monthlyContribution.toLocaleString()+' = '+Math.ceil(g/v.monthlyContribution)]; } },
{ id: "bond-yield", name: "Bond Yield to Maturity", desc: "Calculate bond yield to maturity and current yield", kw: "bond yield, YTM, current yield, fixed income", inputs: [{id:"faceValue",label:"Face Value ($)",type:"number",def:1000},{id:"coupon",label:"Coupon Rate (%)",type:"number",def:5},{id:"currentPrice",label:"Current Price ($)",type:"number",def:950},{id:"years",label:"Years to Maturity",type:"number",def:10}], calc: function(v) { var ac=v.faceValue*v.coupon/100; var cy=ac/v.currentPrice*100; var ap=(v.faceValue+v.currentPrice)/2; var ytm=(ac+(v.faceValue-v.currentPrice)/v.years)/ap*100; return { result: "YTM: "+ytm.toFixed(2)+"% | Current Yield: "+cy.toFixed(2)+"%", chart: Charts.bar([ytm,cy],["YTM","Current Yield"]), extra: "Annual Coupon: $"+ac.toFixed(2)+" | Maturity: $"+v.faceValue }; }, steps: function(v) { var c=v.faceValue*v.coupon/100; var cy=c/v.currentPrice*100; var ap=(v.faceValue+v.currentPrice)/2; var y=(c+(v.faceValue-v.currentPrice)/v.years)/ap*100; return ["Step 1: Coupon = $"+v.faceValue+"x"+v.coupon+"% = $"+c.toFixed(2),"Step 2: Current yield = "+cy.toFixed(2)+"%","Step 3: YTM ~ "+y.toFixed(2)+"%"]; } },
{ id: "retirement-income", name: "Retirement Income Calculator", desc: "Estimate monthly retirement income from savings", kw: "retirement income, retirement planning, 401k, IRA", inputs: [{id:"savings",label:"Current Savings ($)",type:"number",def:500000},{id:"monthlyAdd",label:"Monthly Contribution ($)",type:"number",def:1000},{id:"returnRate",label:"Expected Return (%)",type:"number",def:7},{id:"yearsToRetire",label:"Years Until Retirement",type:"number",def:20},{id:"retireYears",label:"Retirement Duration (years)",type:"number",def:25}], calc: function(v) { var r=v.returnRate/100/12; var n=v.yearsToRetire*12; var fv=v.savings*Math.pow(1+r,n)+v.monthlyAdd*(Math.pow(1+r,n)-1)/r; var wr=v.returnRate/100/12; var wn=v.retireYears*12; var mi=fv*wr*Math.pow(1+wr,wn)/(Math.pow(1+wr,wn)-1); var tc=v.savings+v.monthlyAdd*n; return { result: "Monthly Income: $"+mi.toFixed(2), chart: Charts.bar([fv,tc,fv-tc],["Total","Contributions","Growth"]), extra: "At retirement: $"+fv.toFixed(0)+" | Contributions: $"+tc.toFixed(0) }; }, steps: function(v) { var r=v.returnRate/100/12; var n=v.yearsToRetire*12; var fv=v.savings*Math.pow(1+r,n)+v.monthlyAdd*(Math.pow(1+r,n)-1)/r; return ["Step 1: N = "+n+" months","Step 2: Future value = $"+fv.toFixed(0),"Step 3: Monthly income ~ $"+(fv*(r)).toFixed(2)]; } },
{ id: "sip", name: "SIP Calculator (Systematic Investment Plan)", desc: "Calculate returns on regular mutual fund investments", kw: "sip calculator, mutual fund, systematic investment plan", inputs: [{id:"monthly",label:"Monthly Investment ($)",type:"number",def:500},{id:"returnRate",label:"Expected Annual Return (%)",type:"number",def:12},{id:"years",label:"Investment Period (years)",type:"number",def:10}], calc: function(v) { var r=v.returnRate/100/12; var n=v.years*12; var ti=v.monthly*n; var fv=v.monthly*((Math.pow(1+r,n)-1)/r)*(1+r); var ret=fv-ti; return { result: "Future Value: $"+fv.toFixed(0), chart: Charts.donut([ti,ret],["Invested","Returns"]), extra: "Invested: $"+ti.toFixed(0)+" | Returns: $"+ret.toFixed(0) }; }, steps: function(v) { var r=v.returnRate/100/12; var n=v.years*12; var ti=v.monthly*n; var fv=v.monthly*((Math.pow(1+r,n)-1)/r)*(1+r); return ["Step 1: "+v.years+" years = "+n+" months","Step 2: Total invested = $"+ti.toFixed(0),"Step 3: FV = $"+fv.toFixed(0)]; } },
{ id: "crypto-profit", name: "Crypto Profit Calculator", desc: "Calculate profit/loss on cryptocurrency investments", kw: "crypto calculator, bitcoin profit, cryptocurrency gains", inputs: [{id:"buyPrice",label:"Buy Price ($)",type:"number",def:30000},{id:"sellPrice",label:"Sell Price ($)",type:"number",def:45000},{id:"quantity",label:"Quantity (coins)",type:"number",def:1},{id:"fees",label:"Total Fees ($)",type:"number",def:50}], calc: function(v) { var i=v.buyPrice*v.quantity; var p=v.sellPrice*v.quantity; var pf=p-i-v.fees; var roi=pf/(i+v.fees)*100; return { result: (pf>=0?"Profit: $":"Loss: $")+Math.abs(pf).toFixed(2), chart: Charts.bar([i,p],["Investment","Proceeds"]), extra: "ROI: "+roi.toFixed(2)+"% | Invested: $"+i.toFixed(2) }; }, steps: function(v) { var i=v.buyPrice*v.quantity; var p=v.sellPrice*v.quantity; var pf=p-i-v.fees; var r=pf/(i+v.fees)*100; return ["Step 1: Invested = $"+i,"Step 2: Proceeds = $"+p,"Step 3: Profit = $"+(pf<0?"":"+")+pf.toFixed(2),"Step 4: ROI = "+r.toFixed(2)+"%"]; } },
{ id: "stock-profit", name: "Stock Profit Calculator", desc: "Calculate profit/loss on stock trades including commissions", kw: "stock profit, stock calculator, capital gains", inputs: [{id:"shares",label:"Number of Shares",type:"number",def:100},{id:"buyPrice",label:"Buy Price ($)",type:"number",def:50},{id:"sellPrice",label:"Sell Price ($)",type:"number",def:75},{id:"commission",label:"Commission per Trade ($)",type:"number",def:10}], calc: function(v) { var b=v.shares*v.buyPrice+v.commission; var s=v.shares*v.sellPrice-v.commission; var p=s-b; var pc=p/b*100; return { result: (p>=0?"Profit: $":"Loss: $")+Math.abs(p).toFixed(2), chart: Charts.bar([b,s],["Cost Basis","Proceeds"]), extra: "Return: "+pc.toFixed(2)+"%" }; }, steps: function(v) { var b=v.shares*v.buyPrice+v.commission; var s=v.shares*v.sellPrice-v.commission; var p=s-b; return ["Step 1: Cost = $"+b,"Step 2: Proceeds = $"+s,"Step 3: Profit = $"+(p<0?"":"+")+p.toFixed(2)]; } },
{ id: "dca", name: "DCA Calculator (Dollar Cost Average)", desc: "Show benefits of dollar-cost averaging vs lump sum", kw: "dca calculator, dollar cost averaging, lump sum vs dca", inputs: [{id:"lumpSum",label:"Lump Sum ($)",type:"number",def:12000},{id:"monthly",label:"Monthly DCA ($)",type:"number",def:1000},{id:"periods",label:"Number of Months",type:"number",def:12},{id:"annualReturn",label:"Annual Return (%)",type:"number",def:10}], calc: function(v) { var r=v.annualReturn/100/12; var lfv=v.lumpSum*Math.pow(1+r,v.periods); var dfv=v.monthly*((Math.pow(1+r,v.periods)-1)/r)*(1+r); var adv=dfv-lfv; return { result: "DCA: $"+dfv.toFixed(0)+" vs Lump: $"+lfv.toFixed(0), chart: Charts.bar([lfv,dfv],["Lump Sum","DCA"]), extra: "DCA "+(adv>0?"wins by $":"loses by $")+Math.abs(adv).toFixed(2) }; }, steps: function(v) { var r=v.annualReturn/100/12; var lfv=v.lumpSum*Math.pow(1+r,v.periods); var dfv=v.monthly*((Math.pow(1+r,v.periods)-1)/r)*(1+r); return ["Step 1: Lump sum = $"+lfv.toFixed(0),"Step 2: DCA = $"+dfv.toFixed(0)]; } },
{ id: "college-cost", name: "College Cost Calculator", desc: "Project future college costs and savings needed", kw: "college calculator, education savings, 529 plan, tuition cost", inputs: [{id:"currentCost",label:"Current Tuition ($)",type:"number",def:25000},{id:"yearsUntil",label:"Years Until College",type:"number",def:10},{id:"inflation",label:"Tuition Inflation (%)",type:"number",def:5},{id:"savedSoFar",label:"Already Saved ($)",type:"number",def:10000},{id:"returnOnSavings",label:"Return on Savings (%)",type:"number",def:6}], calc: function(v) { var fc=v.currentCost*Math.pow(1+v.inflation/100,v.yearsUntil); var fs=v.savedSoFar*Math.pow(1+v.returnOnSavings/100,v.yearsUntil); var gap=Math.max(0,fc-fs); return { result: "Future Cost: $"+fc.toFixed(0), chart: Charts.bar([fs,gap,fc],["Saved","Gap","Total"]), extra: "Gap: $"+gap.toFixed(0) }; }, steps: function(v) { var fc=v.currentCost*Math.pow(1+v.inflation/100,v.yearsUntil); return ["Step 1: Future cost = $"+fc.toFixed(0),"Step 2: Gap = future cost minus savings"]; } },
{ id: "perpetuity", name: "Perpetuity Calculator", desc: "Calculate present value of perpetual cash flows", kw: "perpetuity calculator, present value perpetuity, terminal value", inputs: [{id:"payment",label:"Payment per Period ($)",type:"number",def:1000},{id:"discountRate",label:"Discount Rate (%)",type:"number",def:8},{id:"growthRate",label:"Growth Rate (%) (0 for flat)",type:"number",def:0}], calc: function(v) { var dr=v.discountRate/100; var gr=v.growthRate/100; var pv=gr===0?v.payment/dr:v.payment/(dr-gr); return { result: "PV: $"+pv.toFixed(2), chart: Charts.gauge(Math.min(pv/10,100),100), extra: "Multiple: "+(pv/v.payment).toFixed(2)+"x" }; }, steps: function(v) { var dr=v.discountRate/100; var gr=v.growthRate/100; var pv=gr===0?v.payment/dr:v.payment/(dr-gr); return ["Formula: PV = PMT/(r-g)","Step 1: PV = $"+pv.toFixed(2)]; } },
{ id: "esop", name: "ESOP Calculator (Employee Stock Ownership)", desc: "Calculate value of employee stock options", kw: "esop calculator, employee stock options, stock options, RSU", inputs: [{id:"strikePrice",label:"Strike Price ($)",type:"number",def:10},{id:"currentPrice",label:"Current Stock Price ($)",type:"number",def:25},{id:"options",label:"Number of Options",type:"number",def:1000},{id:"taxRate",label:"Tax Rate (%)",type:"number",def:30}], calc: function(v) { var s=(v.currentPrice-v.strikePrice)*v.options; var p=s*(1-v.taxRate/100); return { result: "Net Profit: $"+p.toFixed(0), chart: Charts.bar([v.strikePrice*v.options,v.currentPrice*v.options,p],["Cost","Value","Profit"]), extra: "Spread: $"+s.toFixed(0)+" | Tax: "+v.taxRate+"%" }; }, steps: function(v) { var s=(v.currentPrice-v.strikePrice)*v.options; var p=s*(1-v.taxRate/100); return ["Step 1: Cost = $"+(v.strikePrice*v.options).toFixed(0),"Step 2: Value = $"+(v.currentPrice*v.options).toFixed(0),"Step 3: Profit = $"+p.toFixed(0)]; } },
    // ===== Global income-tax tools (Gap 7 — Good Calculators style localized taxes) =====
  // Marginal tax-bracket calculators for US / UK / Canada / Australia. Brackets are
  // the latest published rates; the disclaimer reminds users these are estimates.
  { id: 'us-income-tax', name: 'US Federal Income Tax Calculator', desc: 'Estimate US federal income tax with marginal brackets (2026)', kw: 'us income tax, federal tax calculator, irs tax brackets, tax refund estimator',
    inputs: [{id:'income',label:'Annual Income ($)',type:'number',def:75000,slider:{min:10000,max:500000,step:1000}},{id:'filing',label:'Filing Status',type:'select',opts:[{v:'single',l:'Single'},{v:'married',l:'Married Filing Jointly'},{v:'head',l:'Head of Household'}],def:'single'},{id:'deduction',label:'Standard Deduction ($)',type:'number',def:14600}],
    calc: function(v) { const brackets = {single:[[11600,10],[47150,12],[100525,22],[191950,24],[243725,32],[609350,35],[1e99,37]],married:[[23200,10],[94300,12],[201050,22],[383900,24],[487450,32],[731200,35],[1e99,37]],head:[[16550,10],[63100,12],[100500,22],[191950,24],[243700,32],[609350,35],[1e99,37]]};
      const br = brackets[v.filing] || brackets.single; const taxable = Math.max(0, v.income - (v.deduction||0));
      let tax = 0; let prev = 0; const rows = [];
      br.forEach((b, i) => { if (taxable > prev) { const amt = Math.min(taxable, b[0]) - prev; tax += amt * b[1]/100; rows.push('$' + prev.toLocaleString() + '–$' + Math.min(taxable,b[0]).toLocaleString() + ' @ ' + b[1] + '% → $' + (amt*b[1]/100).toFixed(0)); } prev = b[0]; });
      const eff = v.income > 0 ? tax/v.income*100 : 0;
      return { result: 'Federal Tax: $' + tax.toLocaleString(undefined,{maximumFractionDigits:0}), chart: Charts.bar([tax, v.income-tax], ['Tax','Take-home']), extra: 'Effective rate: ' + eff.toFixed(1) + '% | Take-home: $' + (v.income-tax).toLocaleString(undefined,{maximumFractionDigits:0}) + ' | ' + rows.join(' · ') };
    },
    steps: function(v) { return ['Step 1: Taxable income = $' + v.income.toLocaleString() + ' − $' + (v.deduction||0).toLocaleString() + ' standard deduction','Step 2: Apply ' + v.filing.replace(/([A-Z])/g,' $1').toLowerCase() + ' marginal brackets','Step 3: Sum each bracket portion × its rate = total federal tax','Step 4: Effective rate = tax ÷ gross income × 100']; } },
  { id: 'uk-income-tax', name: 'UK Income Tax Calculator', desc: 'Estimate UK income tax + National Insurance (2026)', kw: 'uk income tax calculator, hmrc tax, national insurance, take home pay uk',
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
  { id: 'canada-income-tax', name: 'Canada Income Tax Calculator', desc: 'Estimate Canadian federal + provincial income tax (2026)', kw: 'canada income tax, cra tax calculator, canadian tax, take home canada',
    inputs: [{id:'income',label:'Annual Income (CAD)',type:'number',def:65000,slider:{min:10000,max:300000,step:1000}},{id:'province',label:'Province',type:'select',opts:[{v:'on',l:'Ontario'},{v:'bc',l:'British Columbia'},{v:'ab',l:'Alberta'},{v:'qc',l:'Québec'},{v:'ns',l:'Nova Scotia'}],def:'on'}],
    calc: function(v) { const fed = [[55867,15],[111733,20.5],[173205,26],[246752,29],[1e99,33]];
      const prov = {on:[[51446,5.05],[102894,9.15],[150000,11.16],[220000,12.16],[1e99,13.16]],bc:[[47937,5.06],[95874,7.7],[110076,10.5],[133664,12.29],[181232,14.7],[252752,16.8],[1e99,20.5]],ab:[[148269,10],[177922,12],[237230,13],[355845,14],[1e99,15]],qc:[[51780,14],[103575,19],[103575,24],[1e99,25.75]],ns:[[29590,8.79],[59180,14.95],[93000,16.67],[150000,17.5],[1e99,21] ]};
      const tax = (b, inc) => { let t=0,p=0; b.forEach(x=>{ if(inc>p){ t+=(Math.min(inc,x[0])-p)*x[1]/100; p=x[0]; } }); return t; };
      const ft = tax(fed, v.income); const pt = tax(prov[v.province]||prov.on, v.income);
      const total = ft + pt; const take = v.income - total;
      return { result: 'Take-home: C$' + take.toLocaleString(undefined,{maximumFractionDigits:0}), chart: Charts.donut([take, ft, pt], ['Take-home','Federal','Provincial']), extra: 'Federal: C$' + ft.toLocaleString(undefined,{maximumFractionDigits:0}) + ' | Provincial (' + ({on:'ON',bc:'BC',ab:'AB',qc:'QC',ns:'NS'}[v.province]) + '): C$' + pt.toLocaleString(undefined,{maximumFractionDigits:0}) + ' | Combined: C$' + total.toLocaleString(undefined,{maximumFractionDigits:0}) }; },
    steps: function(v) { return ['Step 1: Apply 2026 federal brackets (15%–33%)','Step 2: Apply provincial brackets for ' + ({on:'Ontario',bc:'BC',ab:'Alberta',qc:'Québec',ns:'Nova Scotia'}[v.province]),'Step 3: Total tax = federal + provincial','Step 4: Take-home = income − total tax']; } },
  { id: 'australia-income-tax', name: 'Australia Income Tax Calculator', desc: 'Estimate Australian income tax + Medicare levy (2026)', kw: 'australia tax calculator, ato tax, medicare levy, take home australia',
    inputs: [{id:'income',label:'Annual Income (AUD)',type:'number',def:80000,slider:{min:10000,max:300000,step:1000}},{id:'super',label:'Salary Sacrifice Super (%)',type:'number',def:0}],
    calc: function(v) { const inc = v.income - v.income*(v.super||0)/100;
      const bands = [[18200,0],[45000,16],[135000,30],[190000,37],[1e99,45]]; let tax=0,p=0;
      bands.forEach(b=>{ if(inc>p){ tax+=(Math.min(inc,b[0])-p)*b[1]/100; p=b[0]; } });
      const medicare = inc*0.02; const total = tax+medicare; const take = inc-total;
      return { result: 'Take-home: A$' + take.toLocaleString(undefined,{maximumFractionDigits:0}) + '/yr', chart: Charts.donut([take, tax, medicare], ['Take-home','Income tax','Medicare']), extra: 'Income tax: A$' + tax.toLocaleString(undefined,{maximumFractionDigits:0}) + ' | Medicare levy (2%): A$' + medicare.toLocaleString(undefined,{maximumFractionDigits:0}) + ' | Weekly: A$' + (take/52).toLocaleString(undefined,{maximumFractionDigits:0}) }; },
    steps: function(v) { return ['Step 1: Taxable = salary − super sacrifice = A$' + (v.income-v.income*(v.super||0)/100).toLocaleString(),'Step 2: 2026 ATO brackets: 0% to 18,200 · 16% to 45,000 · 30% to 135,000 · 37% to 190,000 · 45% above','Step 3: Add 2% Medicare levy','Step 4: Take-home = taxable − tax − Medicare']; } }
];
if (typeof module !== 'undefined') {
  module.exports = FINANCE_TOOLS;
  // Expose the pure math helpers for unit tests (keeps the array as default export)
  module.exports.helpers = { perPeriodRate, freqLabel, getDccLabel, calcEMI, calcPrincipal, calcRate, calcTerm, compFutureValue, compPrincipal, compRate, compTime, compIsContinuous, compContributionsFV };
}
