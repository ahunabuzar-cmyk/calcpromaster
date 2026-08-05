// calc-modes.js — reusable "solve-for-any-variable" solvers and compounding helpers.
// Loaded after core.js, before the data/*.js files. Zero backend, pure math.

// ---------- Loan / amortized-payment solver ----------
// All functions work on a PER-PERIOD rate r and integer-ish period count n.
// payment = periodic payment, P = principal.
const LoanSolver = (function () {
  // Periodic payment given principal, per-period rate, number of periods
  function payment(P, r, n) {
    if (n <= 0) return NaN;
    return r > 0 ? P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1) : P / n;
  }
  // Principal you can borrow given a periodic payment
  function principal(pmt, r, n) {
    if (n <= 0) return NaN;
    return r > 0 ? pmt * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n)) : pmt * n;
  }
  // Number of periods to pay off P at per-period rate r with payment pmt
  function term(P, r, pmt) {
    if (r <= 0) return P / pmt;
    if (pmt <= P * r) return Infinity; // payment doesn't even cover interest
    return Math.log(pmt / (pmt - P * r)) / Math.log(1 + r);
  }
  // Per-period rate given principal, payment and periods (binary search — no closed form)
  function rate(P, pmt, n) {
    if (pmt * n <= P) return 0; // no interest (or invalid) — treat as 0%
    let lo = 0, hi = 1; // search 0%..100% per period
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      const pay = payment(P, mid, n);
      if (pay > pmt) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2;
  }
  // Human label for a payments-per-year value
  function freqLabel(ppy) {
    return ({ 1: 'year', 2: 'half-year', 4: 'quarter', 12: 'month', 26: 'two weeks', 52: 'week' })[ppy] || 'period';
  }
  // Common selector option lists (used by finance tools)
  const PAYMENT_FREQ_OPTS = [
    { v: '12', l: 'Monthly' }, { v: '26', l: 'Bi-Weekly' }, { v: '52', l: 'Weekly' },
    { v: '4', l: 'Quarterly' }, { v: '2', l: 'Semi-Annually' }, { v: '1', l: 'Annually' }
  ];
  return { payment, principal, term, rate, freqLabel, PAYMENT_FREQ_OPTS };
})();
if (typeof window !== 'undefined') window.LoanSolver = LoanSolver;

// ---------- Day-Count Convention Utility ----------
const DayCount = (function () {
  // Options for the day-count convention selector
  const DCC_OPTS = [
    { v: 'act365', l: 'Actual/365' },
    { v: 'act360', l: 'Actual/360' },
    { v: '30360', l: '30/360' }
  ];

  // Convert an annual rate to a per-period rate given the day-count convention and period length
  // ppy = periods per year (e.g., 12 for monthly)
  function perPeriodRate(annualRatePct, ppy, convention) {
    const r = annualRatePct / 100;
    switch (convention) {
      case 'act360':
        // Actual/360: uses exact days in a year but treats year as 360 days
        // For monthly: approximate as r * 30.4375 / 360
        return r * (365.25 / ppy) / 360;
      case '30360':
        // 30/360: every month has 30 days, year has 360 days
        return r * 30 / 360;
      case 'act365':
      default:
        // Actual/365: standard per-period rate
        return r / ppy;
    }
  }

  // Calculate interest for a single period using day-count convention
  function periodInterest(principal, annualRatePct, convention) {
    // For a single period (monthly), compute the interest
    const r = annualRatePct / 100;
    switch (convention) {
      case 'act360':
        return principal * r * 30.4375 / 360;  // average days per month
      case '30360':
        return principal * r * 30 / 360;
      case 'act365':
      default:
        return principal * r / 12;
    }
  }

  // Human-readable label for a convention
  function label(convention) {
    return ({ 'act365': 'Actual/365', 'act360': 'Actual/360', '30360': '30/360' })[convention] || 'Actual/365';
  }

  return { DCC_OPTS, perPeriodRate, periodInterest, label };
})();
if (typeof window !== 'undefined') window.DayCount = DayCount;

// ---------- Compound-interest solver (supports continuous compounding) ----------
const Compounding = (function () {
  // freq: number of compounds per year, or 0 / 'continuous' for continuous compounding
  function isContinuous(freq) { return freq === 0 || freq === '0' || freq === 'continuous'; }

  function futureValue(P, annualRatePct, years, freq) {
    const r = annualRatePct / 100;
    if (isContinuous(freq)) return P * Math.exp(r * years);
    const n = parseFloat(freq) || 1;
    return P * Math.pow(1 + r / n, n * years);
  }
  function principal(A, annualRatePct, years, freq) {
    const r = annualRatePct / 100;
    if (isContinuous(freq)) return A / Math.exp(r * years);
    const n = parseFloat(freq) || 1;
    return A / Math.pow(1 + r / n, n * years);
  }
  // Solve annual rate (%) needed to grow P into A over `years`
  function rate(P, A, years, freq) {
    if (P <= 0 || A <= 0 || years <= 0) return NaN;
    if (isContinuous(freq)) return (Math.log(A / P) / years) * 100;
    const n = parseFloat(freq) || 1;
    return (Math.pow(A / P, 1 / (n * years)) - 1) * n * 100;
  }
  // Solve time (years) needed to grow P into A at annualRatePct
  function time(P, A, annualRatePct, freq) {
    const r = annualRatePct / 100;
    if (P <= 0 || A <= 0 || r <= 0) return NaN;
    if (isContinuous(freq)) return Math.log(A / P) / r;
    const n = parseFloat(freq) || 1;
    return Math.log(A / P) / (n * Math.log(1 + r / n));
  }
  // Future value of a series of level contributions.
  // atBeginning = annuity-due (contributions at start of each period).
  function contributionsFV(pmt, annualRatePct, years, freq, atBeginning) {
    const n = isContinuous(freq) ? 12 : (parseFloat(freq) || 1); // continuous: approximate monthly deposits
    const i = (annualRatePct / 100) / n;
    const periods = n * years;
    if (pmt === 0) return 0;
    let fv = i > 0 ? pmt * (Math.pow(1 + i, periods) - 1) / i : pmt * periods;
    if (atBeginning && i > 0) fv *= (1 + i);
    return fv;
  }
  const COMPOUND_FREQ_OPTS = [
    { v: '1', l: 'Annually' }, { v: '2', l: 'Semi-Annually' }, { v: '4', l: 'Quarterly' },
    { v: '12', l: 'Monthly' }, { v: '26', l: 'Bi-Weekly' }, { v: '52', l: 'Weekly' },
    { v: '365', l: 'Daily' }, { v: '0', l: 'Continuous' }
  ];
  return { isContinuous, futureValue, principal, rate, time, contributionsFV, COMPOUND_FREQ_OPTS };
})();
if (typeof window !== 'undefined') window.Compounding = Compounding;
