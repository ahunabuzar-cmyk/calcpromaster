// CalcProMaster — Batch 6: FINANCE 19 deep QA — INDEPENDENT textbook expected values.
// Standard finance math only (EMI, FV, PV, payoff logs). No app code.
const fmt = (x) => (Math.round(x * 100) / 100).toFixed(2);

// 1. auto-loan payment mode: P=20000, 5.5%/yr monthly, 60 months
const P = 20000, rM = 0.055 / 12, n60 = 60;
const emi = P * rM * Math.pow(1 + rM, n60) / (Math.pow(1 + rM, n60) - 1);
console.log('auto-loan payment:', fmt(emi));

// 2. bond-yield: face 1000, coupon 5%, price 950, 10y
const c = 1000 * 0.05, price = 950, yrs10 = 10;
const cy = c / price * 100;
const ytm = (c + (1000 - price) / yrs10) / ((1000 + price) / 2) * 100;
console.log('bond-yield YTM:', fmt(ytm), '| current yield:', fmt(cy));

// 3. bonds: same inputs → same YTM approximation
console.log('bonds YTM:', fmt((c + (1000 - price) / yrs10) / ((1000 + price) / 2) * 100));

// 4. cash-flow: 10000-7000=3000/mo × 12 = 36000
console.log('cash-flow monthly:', fmt(3000), 'total:', fmt(3000 * 12));

// 5. credit-card-payoff time mode: B=5000, 18% APR, P=200/mo
const B = 5000, rCC = 0.18 / 12, pmtCC = 200;
const months = Math.ceil(-Math.log(1 - rCC * B / pmtCC) / Math.log(1 + rCC));
console.log('credit-card payoff months:', months, 'total:', fmt(pmtCC * months));

// 6. crypto-profit: buy 30000, sell 45000, qty 1, fees 50
const inv = 30000 * 1, proc = 45000 * 1, fees = 50;
const profit = proc - inv - fees;
const roi = profit / (inv + fees) * 100;
console.log('crypto-profit profit:', fmt(profit), 'ROI:', fmt(roi));

// 7. esop: strike 10, price 25, 1000 opts, tax 30%
const spread = (25 - 10) * 1000;
console.log('esop spread:', fmt(spread), 'net:', fmt(spread * (1 - 0.30)));

// 8. future-value: pv 5000, 7%/yr, 15y, annual
console.log('future-value:', fmt(5000 * Math.pow(1.07, 15)));

// 9. investment: 10000 @ 8% 10y annual
console.log('investment FV:', fmt(10000 * Math.pow(1.08, 10)));

// 10. investment-growth: 10000 @ 4/7/10% 20y
console.log('investment-growth 4%:', fmt(10000 * Math.pow(1.04, 20)));
console.log('investment-growth 10%:', fmt(10000 * Math.pow(1.10, 20)));

// 11. loan-comparison: 50000 @6%/5y vs @7%/4y
const r1 = 0.06 / 12, n1 = 60, r2 = 0.07 / 12, n2 = 48;
const emi1 = 50000 * r1 * Math.pow(1 + r1, n1) / (Math.pow(1 + r1, n1) - 1);
const emi2 = 50000 * r2 * Math.pow(1 + r2, n2) / (Math.pow(1 + r2, n2) - 1);
console.log('loan-comp EMI1:', fmt(emi1), 'EMI2:', fmt(emi2));

// 12. mortgage-payoff: 200000 @6.5% 30y + extra 200
const PM = 200000, rM2 = 0.065 / 12, nM = 360;
const origEmi = PM * rM2 * Math.pow(1 + rM2, nM) / (Math.pow(1 + rM2, nM) - 1);
const newEmi = origEmi + 200;
const newMonths = Math.ceil(-Math.log(1 - rM2 * PM / newEmi) / Math.log(1 + rM2));
console.log('mortgage-payoff origEmi:', fmt(origEmi), 'newMonths:', newMonths);

// 13. present-value: fv 10000 @5% 10y
console.log('present-value:', fmt(10000 / Math.pow(1.05, 10)));

// 14. rent-vs-buy: rent 1500/mo 10y vs buy 300000 @6.5% 30y
const rentCost = 1500 * 12 * 10;
const buyEmi = 300000 * rM2 * Math.pow(1 + rM2, 360) / (Math.pow(1 + rM2, 360) - 1);
const buyCost = buyEmi * 12 * 10;
console.log('rent-vs-buy rentCost:', fmt(rentCost), 'buyCost:', fmt(buyCost), 'winner:', buyCost < rentCost ? 'Buy is better' : 'Rent is better');

// 15. retirement-income: 500000 + 1000/mo @7% 20y, then 25y withdrawal
const rr = 0.07 / 12, nR = 240, wn = 300;
const fvRet = 500000 * Math.pow(1 + rr, nR) + 1000 * (Math.pow(1 + rr, nR) - 1) / rr;
const mi = fvRet * rr * Math.pow(1 + rr, wn) / (Math.pow(1 + rr, wn) - 1);
console.log('retirement FV:', fmt(fvRet), 'monthly income:', fmt(mi));

// 16. savings-comparison: 10000 @0.5% vs 4.5% 5y
console.log('savings-comp bank1:', fmt(10000 * Math.pow(1.005, 5)));
console.log('savings-comp bank2:', fmt(10000 * Math.pow(1.045, 5)));

// 17. savings-goal payment mode: goal 50000 @4% 5y monthly
const rg = 0.04 / 12, ng = 60;
console.log('savings-goal pmt:', fmt(50000 * rg / (Math.pow(1 + rg, ng) - 1)));

// 18. tax: income 75000, 22%, deductions 12500
const taxable = 75000 - 12500;
console.log('tax taxable:', fmt(taxable), 'tax:', fmt(taxable * 0.22));

// 19. currency-converter — network (calc:null) — SKIP (documented)
console.log('currency-converter: NETWORK (skip, documented)');
