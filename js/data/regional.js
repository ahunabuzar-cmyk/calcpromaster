// Regional calculators — India, Pakistan, Bangladesh, Nepal, Sri Lanka specific (40+)
const REGIONAL_TOOLS = [
  // === INDIA SPECIFIC ===
  { id: 'fd-calculator', name: 'Fixed Deposit (FD) Calculator', desc: 'Calculate FD maturity amount with quarterly compounding and TDS deduction', kw: 'fixed deposit calculator, free online Fixed Deposit (FD) Calculator',
    inputs: [{id:'amount',label:'Deposit Amount (₹)',type:'number',def:100000,slider:{min:1000,max:10000000,step:1000}},{id:'rate',label:'Interest Rate (%)',type:'number',def:7.5,slider:{min:0,max:15,step:0.25}},{id:'years',label:'Tenure (years)',type:'number',def:3,slider:{min:1,max:30,step:1}},{id:'tdsRate',label:'TDS Rate (%)',type:'number',def:10,slider:{min:0,max:30,step:1}},{id:'senior',label:'Senior Citizen',type:'checkbox',def:false}],
    calc: function(v) { const r = v.senior ? v.rate + 0.5 : v.rate; const n = 4 * v.years; const perRate = r/100/4; const maturity = v.amount * Math.pow(1+perRate, n); const interest = maturity - v.amount; const tds = interest * (v.tdsRate/100); const postTds = interest - tds; const effective = maturity - tds; return { result: 'Maturity: ₹' + maturity.toLocaleString('en-IN',{maximumFractionDigits:2}), chart: Charts.bar([v.amount, interest], ['Principal','Interest']), extra: 'Interest: ₹' + interest.toLocaleString('en-IN',{maximumFractionDigits:2}) + ' | TDS: ₹' + tds.toLocaleString('en-IN',{maximumFractionDigits:2}) + ' | Effective: ₹' + effective.toLocaleString('en-IN',{maximumFractionDigits:2}) }; },
    steps: function(v) { const r=v.senior?v.rate+0.5:v.rate; const m=v.amount*Math.pow(1+r/100/4,4*v.years); return ['Step 1: Rate '+(v.senior?'(incl. senior citizen 0.5% bonus) ':'')+'= '+r+'%','Step 2: Maturity = ₹'+v.amount+' × (1 + '+r+'%/4)^'+(4*v.years)+' = ₹'+m.toLocaleString('en-IN',{maximumFractionDigits:2})]; } },
  { id: 'rd-calculator', name: 'Recurring Deposit (RD) Calculator', desc: 'Calculate RD maturity amount with monthly investments', kw: 'monthly savings india, free online Recurring Deposit (RD) Calculator',
    inputs: [{id:'monthly',label:'Monthly Deposit (₹)',type:'number',def:5000},{id:'rate',label:'Interest Rate (%)',type:'number',def:6.5},{id:'years',label:'Tenure (years)',type:'number',def:5}],
    calc: function(v) { const n = v.years * 12; const r = v.rate/100/12; const totalDeposited = v.monthly * n; const maturity = v.monthly * (Math.pow(1+r, n) - 1) / r; const interest = maturity - totalDeposited; return { result: 'Maturity: ₹' + maturity.toLocaleString('en-IN',{maximumFractionDigits:2}), chart: Charts.donut([totalDeposited, interest], ['Deposited','Interest']), extra: 'Deposited: ₹' + totalDeposited.toLocaleString('en-IN',{maximumFractionDigits:2}) + ' | Interest: ₹' + interest.toLocaleString('en-IN',{maximumFractionDigits:2}) }; },
    steps: function(v) { const n=v.years*12; const m=v.monthly*(Math.pow(1+v.rate/100/12,n)-1)/(v.rate/100/12); return ['Step 1: Total deposits = ₹'+v.monthly+' × '+n+' = ₹'+(v.monthly*n).toLocaleString('en-IN'),'Step 2: Maturity = ₹'+m.toLocaleString('en-IN',{maximumFractionDigits:2})]; } },
  { id: 'ppf-calculator', name: 'PPF Calculator', desc: 'Calculate Public Provident Fund maturity and tax-free returns', kw: 'public provident fund, free online PPF Calculator',
    inputs: [{id:'annual',label:'Annual Investment (₹)',type:'number',def:150000,slider:{min:500,max:5000000,step:500}},{id:'rate',label:'PPF Rate (%)',type:'number',def:7.1,slider:{min:0,max:15,step:0.1}},{id:'years',label:'Tenure (years)',type:'number',def:15,slider:{min:1,max:40,step:1}}],
    calc: function(v) { const r = v.rate/100; const years = Math.min(Math.max(parseInt(v.years,10)||0, 0), 100); let balance = 0; let totalInvested = 0; for(let y=1; y<=years; y++) { balance += v.annual; balance *= (1+r); totalInvested += v.annual; } const interest = balance - totalInvested; return { result: 'Maturity: ₹' + balance.toLocaleString('en-IN',{maximumFractionDigits:2}), chart: Charts.bar([totalInvested, interest], ['Invested','Interest']), extra: 'Invested: ₹' + totalInvested.toLocaleString('en-IN',{maximumFractionDigits:2}) + ' | Interest: ₹' + interest.toLocaleString('en-IN',{maximumFractionDigits:2}) + ' | Tax-free! ✓' }; },
    steps: function(v) { return ['Step 1: PPF compounds annually with tax-free interest','Step 2: Annual investment = ₹'+v.annual.toLocaleString('en-IN'),'Step 3: Rate = '+v.rate+'% (set by government quarterly)','Step 4: All interest earned is tax-free under Section 80C']; } },
  { id: 'nps-calculator', name: 'National Pension System (NPS) Calculator', desc: 'Calculate National Pension System corpus and annuity', kw: 'national pension system, free online National Pension System (NPS) Calculator',
    inputs: [{id:'age',label:'Current Age',type:'number',def:30},{id:'monthly',label:'Monthly Contribution (₹)',type:'number',def:5000},{id:'returnRate',label:'Expected Return (%)',type:'number',def:10},{id:'annuityPct',label:'Annuity Purchase (%)',type:'number',def:40},{id:'annuityRate',label:'Annuity Return (%)',type:'number',def:6}],
    calc: function(v) { const retireAge = 60; const years = retireAge - v.age; const n = years * 12; const r = v.returnRate/100/12; const corpus = v.monthly * (Math.pow(1+r, n) - 1) / r * (1+r); const annuityAmount = corpus * v.annuityPct/100; const monthlyPension = annuityAmount * v.annuityRate/100/12; const lumpSum = corpus - annuityAmount; return { result: 'Corpus: ₹' + corpus.toLocaleString('en-IN',{maximumFractionDigits:2}), chart: Charts.donut([lumpSum, annuityAmount], ['Lump Sum (60%)','Annuity (40%)']), extra: 'Monthly Pension: ₹' + monthlyPension.toLocaleString('en-IN',{maximumFractionDigits:2}) + ' | Lump Sum: ₹' + lumpSum.toLocaleString('en-IN',{maximumFractionDigits:2}) }; },
    steps: function(v) { const y=60-v.age; return ['Step 1: Years to retirement = 60 − '+v.age+' = '+y+' years','Step 2: NPS has 60% lump sum (tax-free) and 40% annuity','Step 3: Monthly pension depends on annuity rate at retirement']; } },
  { id: 'sip-return', name: 'SIP Return Calculator', desc: 'Calculate SIP investment returns with step-up option', kw: 'mutual fund sip, step-up sip, free online SIP Return Calculator',
    inputs: [{id:'monthly',label:'Monthly SIP (₹)',type:'number',def:5000,slider:{min:100,max:1000000,step:100}},{id:'returnRate',label:'Expected Return (%)',type:'number',def:12,slider:{min:0,max:30,step:0.5}},{id:'years',label:'Investment Period (years)',type:'number',def:10,slider:{min:1,max:40,step:1}},{id:'stepUp',label:'Annual Step-Up (%)',type:'number',def:0,slider:{min:0,max:50,step:1}}],
    calc: function(v) { let totalInvested = 0; let balance = 0; const r = v.returnRate/100/12; const months = Math.min(Math.max(parseInt(v.years,10)||0, 0), 100) * 12; let monthly = v.monthly; for(let y=1; y<=months; y++) { balance += monthly; balance *= (1+r); totalInvested += monthly; if(y%12===0 && v.stepUp>0 && y<months) monthly *= (1+v.stepUp/100); } const gain = balance - totalInvested; return { result: 'Future Value: ₹' + balance.toLocaleString('en-IN',{maximumFractionDigits:2}), chart: Charts.donut([totalInvested, gain], ['Invested','Returns']), extra: 'Invested: ₹' + totalInvested.toLocaleString('en-IN',{maximumFractionDigits:2}) + ' | Returns: ₹' + gain.toLocaleString('en-IN',{maximumFractionDigits:2}) + ' | XIRR: ~' + v.returnRate + '%' }; },
    steps: function(v) { return ['Step 1: Monthly SIP = ₹'+v.monthly.toLocaleString('en-IN'),'Step 2: Expected return = '+v.returnRate+'% p.a.','Step 3: Period = '+v.years+' years'+(v.stepUp>0?' with annual '+v.stepUp+'% step-up':'')]; } },

  // === TAX & INVESTMENT (INDIA) ===
  { id: 'income-tax-india', name: 'Income Tax Calculator India', desc: 'Calculate income tax under old and new tax regime for FY 2025-26', kw: 'income tax calculator india, old vs new tax',
    inputs: [{id:'income',label:'Annual Income (₹)',type:'number',def:1200000},{id:'oldRegimeDed',label:'Old Regime Deductions (₹)',type:'number',def:200000}],
    calc: function(v) { const taxableOld = Math.max(0, v.income - v.oldRegimeDed); const taxableNew = v.income; const slabsOld = [[250000,0],[500000,5],[1000000,20],[Infinity,30]]; const slabsNew = [[300000,0],[600000,5],[900000,10],[1200000,15],[1500000,20],[Infinity,30]]; const calcTax = (taxable, slabs) => { let tax=0, prev=0; for(const [limit, rate] of slabs) { if(taxable>prev) tax += (Math.min(taxable,limit)-prev)*rate/100; prev=limit; } return Math.max(0,tax); }; const taxOld = calcTax(taxableOld, slabsOld); const taxNew = calcTax(taxableNew, slabsNew); const cessOld = taxOld * 0.04; const cessNew = taxNew * 0.04; const totalOld = taxOld + cessOld; const totalNew = taxNew + cessNew; const better = totalOld <= totalNew ? 'Old Regime' : 'New Regime'; const saving = Math.abs(totalOld - totalNew); return { result: 'Tax (Old): ₹' + totalOld.toLocaleString('en-IN',{maximumFractionDigits:2}), chart: Charts.bar([totalOld, totalNew], ['Old Regime','New Regime']), extra: 'New Regime: ₹' + totalNew.toLocaleString('en-IN',{maximumFractionDigits:2}) + ' | ' + better + ' better | Save: ₹' + saving.toLocaleString('en-IN',{maximumFractionDigits:2}) }; },
    steps: function(v) { return ['Step 1: Old regime taxable = ₹'+v.income+' − ₹'+v.oldRegimeDed+' = ₹'+Math.max(0,v.income-v.oldRegimeDed).toLocaleString('en-IN'),'Step 2: New regime has lower rates but fewer deductions','Step 3: Compare both to choose the better option']; } },
  { id: 'gst-india', name: 'GST Calculator India', desc: 'Calculate GST amount and total with CGST/SGST or IGST breakdown', kw: 'gst calculator india calculator',
    inputs: [{id:'amount',label:'Amount (₹)',type:'number',def:10000,slider:{min:100,max:10000000,step:100}},{id:'gstRate',label:'GST Rate (%)',type:'select',opts:[{v:5,l:'5%'},{v:12,l:'12%'},{v:18,l:'18%'},{v:28,l:'28%'}],def:18},{id:'direction',label:'Calculation',type:'select',opts:[{v:'exclusive',l:'Exclusive (Add GST)'},{v:'inclusive',l:'Inclusive (Extract GST)'}],def:'exclusive'}],
    calc: function(v) { const r = parseInt(v.gstRate)/100; if(v.direction === 'exclusive') { const gst = v.amount * r; const total = v.amount + gst; const half = gst/2; return { result: 'Total (incl. GST): ₹' + total.toLocaleString('en-IN',{maximumFractionDigits:2}), chart: Charts.bar([v.amount, gst], ['Base','GST']), extra: 'CGST: ₹' + half.toLocaleString('en-IN',{maximumFractionDigits:2}) + ' | SGST: ₹' + half.toLocaleString('en-IN',{maximumFractionDigits:2}) + ' | Rate: ' + v.gstRate + '%' }; } else { const gst = v.amount * r / (1+r); const base = v.amount - gst; const half = gst/2; return { result: 'Base Amount: ₹' + base.toLocaleString('en-IN',{maximumFractionDigits:2}), chart: Charts.bar([base, gst], ['Base','GST']), extra: 'GST: ₹' + gst.toLocaleString('en-IN',{maximumFractionDigits:2}) + ' | CGST: ₹' + half.toLocaleString('en-IN',{maximumFractionDigits:2}) + ' | SGST: ₹' + half.toLocaleString('en-IN',{maximumFractionDigits:2}) }; } },
    steps: function(v) { if(v.direction==='exclusive') { const g=v.amount*parseInt(v.gstRate)/100; return ['Step 1: GST = ₹'+v.amount+' × '+v.gstRate+'% = ₹'+g.toLocaleString('en-IN',{maximumFractionDigits:2}),'Step 2: CGST = SGST = ₹'+(g/2).toLocaleString('en-IN',{maximumFractionDigits:2}),'Step 3: Total = ₹'+v.amount+' + ₹'+g.toLocaleString('en-IN',{maximumFractionDigits:2})+' = ₹'+(v.amount+g).toLocaleString('en-IN',{maximumFractionDigits:2})]; } else { const g=v.amount*parseInt(v.gstRate)/100/(1+parseInt(v.gstRate)/100); return ['Step 1: GST = ₹'+v.amount+' × '+v.gstRate+'% / (1+'+v.gstRate+'%) = ₹'+g.toLocaleString('en-IN',{maximumFractionDigits:2}),'Step 2: Base = ₹'+v.amount+' − ₹'+g.toLocaleString('en-IN',{maximumFractionDigits:2})+' = ₹'+(v.amount-g).toLocaleString('en-IN',{maximumFractionDigits:2})]; } } },

  // === REAL ESTATE (INDIA) ===
  { id: 'stamp-duty', name: 'Stamp Duty & Registration Calculator', desc: 'Calculate stamp duty, registration charges, and total property cost', kw: 'stamp duty calculator, property cost india, free online Stamp Duty & Registration Calculator',
    inputs: [{id:'propertyValue',label:'Property Value (₹)',type:'number',def:5000000},{id:'stampDutyPct',label:'Stamp Duty (%)',type:'number',def:5},{id:'registrationPct',label:'Registration (%)',type:'number',def:1}],
    calc: function(v) { const stamp = v.propertyValue * v.stampDutyPct/100; const reg = v.propertyValue * v.registrationPct/100; const gstOnReg = reg * 0.18; const totalCost = v.propertyValue + stamp + reg + gstOnReg; return { result: 'Total Cost: ₹' + totalCost.toLocaleString('en-IN',{maximumFractionDigits:2}), chart: Charts.donut([v.propertyValue, stamp, reg, gstOnReg], ['Property','Stamp Duty','Registration','GST']), extra: 'Stamp Duty: ₹' + stamp.toLocaleString('en-IN',{maximumFractionDigits:2}) + ' | Registration: ₹' + reg.toLocaleString('en-IN',{maximumFractionDigits:2}) + ' | GST: ₹' + gstOnReg.toLocaleString('en-IN',{maximumFractionDigits:2}) }; },
    steps: function(v) { const s=v.propertyValue*v.stampDutyPct/100; const r=v.propertyValue*v.registrationPct/100; return ['Step 1: Stamp duty = ₹'+v.propertyValue.toLocaleString('en-IN')+' × '+v.stampDutyPct+'% = ₹'+s.toLocaleString('en-IN',{maximumFractionDigits:2}),'Step 2: Registration = ₹'+v.propertyValue.toLocaleString('en-IN')+' × '+v.registrationPct+'% = ₹'+r.toLocaleString('en-IN',{maximumFractionDigits:2}),'Step 3: Total = ₹'+v.propertyValue.toLocaleString('en-IN')+' + ₹'+s.toLocaleString('en-IN',{maximumFractionDigits:2})+' + ₹'+r.toLocaleString('en-IN',{maximumFractionDigits:2})+' + GST = ₹'+(v.propertyValue+s+r+r*0.18).toLocaleString('en-IN',{maximumFractionDigits:2})]; } },
  { id: 'home-loan-emi-india', name: 'Home Loan EMI Calculator India', desc: 'Calculate home loan EMI with Indian tax benefits under Section 80C and 24(b)', kw: 'home loan tax benefit india',
    inputs: [{id:'amount',label:'Loan Amount (₹)',type:'number',def:3000000,slider:{min:100000,max:10000000,step:100000}},{id:'rate',label:'Interest Rate (%)',type:'number',def:8.5,slider:{min:0,max:25,step:0.25}},{id:'years',label:'Loan Tenure (years)',type:'number',def:20,slider:{min:1,max:40,step:1}},{id:'taxSlab',label:'Income Tax Slab (%)',type:'number',def:30,slider:{min:0,max:40,step:5}}],
    calc: function(v) { const n=v.years*12; const r=v.rate/100/12; const emi=v.amount*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1); const totalPay=emi*n; const interest=totalPay-v.amount; const taxSavePrincipal=Math.min(v.amount,150000)*v.taxSlab/100; const taxSaveInterest=Math.min(interest,200000)*v.taxSlab/100; const totalTaxSave=taxSavePrincipal+taxSaveInterest; const effectiveEmi=(totalPay-totalTaxSave)/n; return { result: 'EMI: ₹' + emi.toLocaleString('en-IN',{maximumFractionDigits:2}), chart: Charts.bar([v.amount, interest], ['Principal','Interest']), extra: 'Total Interest: ₹' + interest.toLocaleString('en-IN',{maximumFractionDigits:2}) + ' | Tax Saved: ₹' + totalTaxSave.toLocaleString('en-IN',{maximumFractionDigits:2}) + ' | Eff. EMI: ₹' + effectiveEmi.toLocaleString('en-IN',{maximumFractionDigits:2}) }; },
    steps: function(v) { const n=v.years*12; const e=v.amount*(v.rate/100/12)*Math.pow(1+v.rate/100/12,n)/(Math.pow(1+v.rate/100/12,n)-1); return ['Step 1: EMI = ₹'+e.toLocaleString('en-IN',{maximumFractionDigits:2}),'Step 2: Tax benefit: 80C (principal) + 24(b) (interest)','Step 3: Effective EMI after tax savings is lower']; } },

  // === GOLD ===
  { id: 'gold-rate', name: 'Gold Rate Calculator', desc: 'Calculate gold price including making charges and GST', kw: 'gold rate calculator, free online Gold Rate Calculator',
    inputs: [{id:'weight',label:'Weight (grams)',type:'number',def:10},{id:'ratePerGram',label:'Gold Rate per Gram (₹)',type:'number',def:6000},{id:'purity',label:'Purity (Karat)',type:'select',opts:[{v:24,l:'24K (99.9%)'},{v:22,l:'22K (91.6%)'},{v:18,l:'18K (75%)'},{v:14,l:'14K (58.5%)'}],def:22},{id:'makingPct',label:'Making Charges (%)',type:'number',def:10}],
    calc: function(v) { const purityFactor = v.purity/24; const pureGold = v.weight * v.ratePerGram * purityFactor; const making = pureGold * v.makingPct/100; const gst = (pureGold + making) * 0.03; const total = pureGold + making + gst; return { result: 'Total: ₹' + total.toLocaleString('en-IN',{maximumFractionDigits:2}), chart: Charts.donut([pureGold, making, gst], ['Gold Value','Making','GST (3%)']), extra: 'Gold: ₹' + pureGold.toLocaleString('en-IN',{maximumFractionDigits:2}) + ' | Making: ₹' + making.toLocaleString('en-IN',{maximumFractionDigits:2}) + ' | GST: ₹' + gst.toLocaleString('en-IN',{maximumFractionDigits:2}) }; },
    steps: function(v) { const pf=v.purity/24; const pg=v.weight*v.ratePerGram*pf; const m=pg*v.makingPct/100; return ['Step 1: Pure gold = '+v.weight+'g × ₹'+v.ratePerGram+' × ('+v.purity+'K/24) = ₹'+pg.toLocaleString('en-IN',{maximumFractionDigits:2}),'Step 2: Making charges = ₹'+pg.toLocaleString('en-IN',{maximumFractionDigits:2})+' × '+v.makingPct+'% = ₹'+m.toLocaleString('en-IN',{maximumFractionDigits:2}),'Step 3: GST = (₹'+pg.toLocaleString('en-IN',{maximumFractionDigits:2})+' + ₹'+m.toLocaleString('en-IN',{maximumFractionDigits:2})+') × 3% = ₹'+((pg+m)*0.03).toLocaleString('en-IN',{maximumFractionDigits:2})]; } },

  // === PAKISTAN SPECIFIC ===
  { id: 'pk-salary', name: 'Pakistan Salary Calculator', desc: 'Calculate take-home salary after income tax in Pakistan', kw: 'take home salary pak, free online Pakistan Salary Calculator',
    inputs: [{id:'grossSalary',label:'Gross Monthly Salary (PKR)',type:'number',def:100000},{id:'taxRate',label:'Tax Rate (%)',type:'number',def:10},{id:'provident',label:'Provident Fund (%)',type:'number',def:5}],
    calc: function(v) { const annual = v.grossSalary * 12; const tax = annual * v.taxRate/100; const pf = v.grossSalary * v.provident/100; const monthlyTax = tax/12; const takeHome = v.grossSalary - monthlyTax - pf; return { result: 'Take-Home: PKR ' + takeHome.toLocaleString() + '/mo', chart: Charts.donut([takeHome, monthlyTax, pf], ['Take-Home','Tax','Provident Fund']), extra: 'Annual: PKR ' + annual.toLocaleString() + ' | Tax: PKR ' + monthlyTax.toLocaleString() + '/mo | PF: PKR ' + pf.toLocaleString() + '/mo' }; },
    steps: function(v) { const t=v.grossSalary*v.taxRate/100/12; const p=v.grossSalary*v.provident/100; return ['Step 1: Monthly tax = PKR '+v.grossSalary+' × '+v.taxRate+'% = PKR '+t.toLocaleString(),'Step 2: Provident fund = PKR '+v.grossSalary+' × '+v.provident+'% = PKR '+p.toLocaleString(),'Step 3: Take-home = PKR '+v.grossSalary+' − PKR '+t.toLocaleString()+' − PKR '+p.toLocaleString()+' = PKR '+(v.grossSalary-t-p).toLocaleString()]; } },
  { id: 'gold-rate-pk', name: 'Gold Rate Calculator Pakistan', desc: 'Calculate gold price in PKR including making charges', kw: 'gold rate pakistan, gold price karachi, gold per tola, 22k gold pakistan, free online Gold Rate Calculator Pakistan',
    inputs: [{id:'tola',label:'Gold (Tola)',type:'number',def:1},{id:'ratePerTola',label:'Rate per Tola (PKR)',type:'number',def:240000},{id:'purity',label:'Purity',type:'select',opts:[{v:24,l:'24K'},{v:22,l:'22K'},{v:21,l:'21K'}],def:22},{id:'making',label:'Making Charges (PKR)',type:'number',def:5000}],
    calc: function(v) { const pf=v.purity/24; const pure=v.tola*v.ratePerTola*pf; const total=pure+v.making; return { result: 'Total: PKR ' + total.toLocaleString(), chart: Charts.bar([pure, v.making], ['Gold','Making']), extra: 'Gold: PKR ' + pure.toLocaleString() + ' | Making: PKR ' + v.making.toLocaleString() + ' | Rate/Tola (22K): PKR ' + (v.ratePerTola*22/24).toLocaleString() }; },
    steps: function(v) { const p=v.tola*v.ratePerTola*(v.purity/24); return ['Step 1: Pure gold = '+v.tola+' tola × PKR '+v.ratePerTola+' × ('+v.purity+'K/24) = PKR '+p.toLocaleString(),'Step 2: Total = PKR '+p.toLocaleString()+' + PKR '+v.making.toLocaleString()+' = PKR '+(p+v.making).toLocaleString()]; } },

  // === RICKSHAW / TRANSPORT ===
  { id: 'rickshaw-fare', name: 'Rickshaw/Auto Fare Calculator', desc: 'Calculate auto-rickshaw fare based on distance and waiting time', kw: 'tuk tuk fare, taxi fare india, free online Rickshaw/Auto Fare Calculator',
    inputs: [{id:'distance',label:'Distance (km)',type:'number',def:5},{id:'baseFare',label:'Base Fare (₹)',type:'number',def:25},{id:'perKm',label:'Per km Rate (₹)',type:'number',def:10},{id:'waitingMins',label:'Waiting Time (min)',type:'number',def:5},{id:'waitingPerMin',label:'Waiting Charge per min (₹)',type:'number',def:1}],
    calc: function(v) { const distanceCharge = v.distance * v.perKm; const waitingCharge = v.waitingMins * v.waitingPerMin; const total = v.baseFare + distanceCharge + waitingCharge; return { result: 'Total Fare: ₹' + total.toFixed(2), chart: Charts.bar([v.baseFare, distanceCharge, waitingCharge], ['Base','Distance','Waiting']), extra: 'Base: ₹' + v.baseFare + ' | Distance: ₹' + distanceCharge.toFixed(2) + ' | Waiting: ₹' + waitingCharge.toFixed(2) }; },
    steps: function(v) { const d=v.distance*v.perKm; const w=v.waitingMins*v.waitingPerMin; return ['Step 1: Distance charge = '+v.distance+'km × ₹'+v.perKm+' = ₹'+d.toFixed(2),'Step 2: Waiting = '+v.waitingMins+'min × ₹'+v.waitingPerMin+' = ₹'+w.toFixed(2),'Step 3: Total = ₹'+v.baseFare+' + ₹'+d.toFixed(2)+' + ₹'+w.toFixed(2)+' = ₹'+(v.baseFare+d+w).toFixed(2)]; } },

  // === UTILITY ===
  { id: 'electricity-bill-india', name: 'Electricity Bill Calculator India', desc: 'Calculate electricity bill with slab rates and fixed charges', kw: 'electricity bill india, free online Electricity Bill Calculator India',
    inputs: [{id:'units',label:'Units Consumed (kWh)',type:'number',def:300},{id:'slab1',label:'Rate 0-100 units (₹)',type:'number',def:3.5},{id:'slab2',label:'Rate 100-200 units (₹)',type:'number',def:4.5},{id:'slab3',label:'Rate 200+ units (₹)',type:'number',def:6.5},{id:'fixedCharges',label:'Fixed Charges (₹)',type:'number',def:100}],
    calc: function(v) { let energy = 0; if(v.units > 200) energy = 100*v.slab1 + 100*v.slab2 + (v.units-200)*v.slab3; else if(v.units > 100) energy = 100*v.slab1 + (v.units-100)*v.slab2; else energy = v.units*v.slab1; const gst = energy * 0.05; const total = energy + v.fixedCharges + gst; return { result: 'Bill: ₹' + total.toFixed(2), chart: Charts.donut([energy, v.fixedCharges, gst], ['Energy','Fixed','GST']), extra: 'Energy: ₹' + energy.toFixed(2) + ' | Fixed: ₹' + v.fixedCharges.toFixed(2) + ' | GST: ₹' + gst.toFixed(2) }; },
    steps: function(v) { let e=0; if(v.units>200) e=100*v.slab1+100*v.slab2+(v.units-200)*v.slab3; else if(v.units>100) e=100*v.slab1+(v.units-100)*v.slab2; else e=v.units*v.slab1; return ['Step 1: Energy charge (slab rates) = ₹'+e.toFixed(2),'Step 2: GST = ₹'+e.toFixed(2)+' × 5% = ₹'+(e*0.05).toFixed(2),'Step 3: Total = ₹'+e.toFixed(2)+' + ₹'+v.fixedCharges+' + ₹'+(e*0.05).toFixed(2)+' = ₹'+(e+v.fixedCharges+e*0.05).toFixed(2)]; } },
  { id: 'lpg-cost', name: 'LPG Cylinder Cost Calculator', desc: 'Calculate per-use cost of LPG cylinder for cooking', kw: 'lpg price india, free online LPG Cylinder Cost Calculator',
    inputs: [{id:'cylinderPrice',label:'Cylinder Price (₹)',type:'number',def:903},{id:'subsidy',label:'Subsidy (₹)',type:'number',def:200},{id:'cylindersPerYear',label:'Cylinders per Year',type:'number',def:9},{id:'monthsPerCylinder',label:'Months per Cylinder',type:'number',def:1.3}],
    calc: function(v) { const effectivePrice = v.cylinderPrice - v.subsidy; const perMonth = effectivePrice / v.monthsPerCylinder; const perDay = perMonth / 30; const yearly = effectivePrice * v.cylindersPerYear; const perMeal = perDay / 3; return { result: 'Per Day: ₹' + perDay.toFixed(2), chart: Charts.bar([v.cylinderPrice, v.subsidy, effectivePrice], ['Price','Subsidy','Effective']), extra: 'Per month: ₹' + perMonth.toFixed(2) + ' | Per meal: ₹' + perMeal.toFixed(2) + ' | Yearly: ₹' + yearly.toFixed(2) }; },
    steps: function(v) { const e=v.cylinderPrice-v.subsidy; return ['Step 1: Effective price = ₹'+v.cylinderPrice+' − ₹'+v.subsidy+' = ₹'+e.toFixed(2),'Step 2: Per month = ₹'+e.toFixed(2)+' / '+v.monthsPerCylinder+'mo = ₹'+(e/v.monthsPerCylinder).toFixed(2)]; } },

  // === WEDDING ===
  { id: 'wedding-budget-shaadi', name: 'Wedding Budget Calculator (Shaadi)', desc: 'Plan your wedding budget across all categories', kw: 'wedding planner india, free online Wedding Budget Calculator (Shaadi)',
    inputs: [{id:'venue',label:'Venue & Catering (₹)',type:'number',def:500000},{id:'decor',label:'Decoration (₹)',type:'number',def:200000},{id:'photography',label:'Photography (₹)',type:'number',def:100000},{id:'jewellery',label:'Jewellery (₹)',type:'number',def:300000},{id:'clothing',label:'Clothing (₹)',type:'number',def:150000},{id:'music',label:'Music & Entertainment (₹)',type:'number',def:100000},{id:'misc',label:'Miscellaneous (₹)',type:'number',def:150000}],
    calc: function(v) { const total = v.venue + v.decor + v.photography + v.jewellery + v.clothing + v.music + v.misc; return { result: 'Total: ₹' + total.toLocaleString('en-IN',{maximumFractionDigits:2}), chart: Charts.donut([v.venue, v.decor, v.photography, v.jewellery, v.clothing, v.music, v.misc], ['Venue','Decor','Photo','Jewellery','Clothing','Music','Misc']), extra: 'Guests estimated: ' + Math.floor(v.venue/2000) + ' | Per guest: ₹' + (total/Math.max(1,Math.floor(v.venue/2000))).toFixed(2) }; },
    steps: function(v) { const t=v.venue+v.decor+v.photography+v.jewellery+v.clothing+v.music+v.misc; return ['Step 1: Venue = ₹'+v.venue.toLocaleString('en-IN'),'Step 2: Total budget = ₹'+t.toLocaleString('en-IN',{maximumFractionDigits:2})]; } },

  // === DUBAI/UAE ===
  { id: 'dubai-salary', name: 'Dubai/UAE Salary Calculator', desc: 'Free Dubai salary calculator: take-home pay in AED after housing, DEWA and living costs — 0% income tax. Every step shown.', kw: 'dubai salary calculator, uae take home pay calculator, dubai tax free salary calculator',
    inputs: [{id:'salary',label:'Annual Salary (AED)',type:'number',def:180000},{id:'housing',label:'Housing Allowance (AED/mo)',type:'number',def:5000},{id:'dewa',label:'DEWA/Utilities (AED/mo)',type:'number',def:800},{id:'food',label:'Food (AED/mo)',type:'number',def:1500},{id:'transport',label:'Transport (AED/mo)',type:'number',def:1000}],
    calc: function(v) { const monthly = v.salary/12 + v.housing; const expenses = v.dewa + v.food + v.transport; const savings = monthly - expenses; const annualSavings = savings * 12; const savingRate = (savings/monthly)*100; return { result: 'Monthly Savings: AED ' + savings.toFixed(2), chart: Charts.donut([monthly - savings, savings], ['Expenses','Savings']), extra: 'Monthly income: AED ' + monthly.toFixed(2) + ' | Expenses: AED ' + expenses.toFixed(2) + ' | Saving rate: ' + savingRate.toFixed(0) + '% | Tax-free! ✓' }; },
    steps: function(v) { const m=v.salary/12+v.housing; const e=v.dewa+v.food+v.transport; return ['Step 1: Monthly income = AED '+(v.salary/12).toFixed(2)+' + AED '+v.housing+' = AED '+m.toFixed(2),'Step 2: Expenses = AED '+v.dewa+' + AED '+v.food+' + AED '+v.transport+' = AED '+e.toFixed(2),'Step 3: Savings = AED '+m.toFixed(2)+' − AED '+e.toFixed(2)+' = AED '+(m-e).toFixed(2)+' (zero income tax!)']; } },
  { id: 'gold-silver', name: 'Gold to Silver Ratio', desc: 'Compare gold vs silver value ratio', kw: 'gold silver ratio, gold silver price, free online Gold to Silver Ratio calculator',
    inputs: [{id:'goldPerGram',label:'Gold Rate per Gram (₹)',type:'number',def:6000},{id:'silverPerGram',label:'Silver Rate per Gram (₹)',type:'number',def:75}],
    calc: function(v) { const ratio = v.goldPerGram / v.silverPerGram; return { result: 'Ratio: 1:' + ratio.toFixed(1), chart: Charts.gauge(ratio, 120), extra: 'Historical avg: ~1:60–70 | ' + (ratio>80?'Gold pricey vs silver — silver may be undervalued':'Normal range') + ' | ₹' + v.goldPerGram + ' vs ₹' + v.silverPerGram }; },
    steps: function(v) { const r=v.goldPerGram/v.silverPerGram; return ['Step 1: Ratio = gold rate / silver rate','Step 2: Ratio = ₹'+v.goldPerGram+' / ₹'+v.silverPerGram+' = 1:'+r.toFixed(1)]; } },
  { id: 'chit-fund', name: 'Chit Fund Calculator', desc: 'Calculate chit fund monthly installment and dividend', kw: 'chit fund calculator, free online Chit Fund Calculator',
    inputs: [{id:'amount',label:'Chit Amount (₹)',type:'number',def:200000},{id:'months',label:'Months',type:'number',def:50},{id:'commission',label:'Commission (%)',type:'number',def:5},{id:'dividend',label:'Avg Dividend (₹/mo)',type:'number',def:3000}],
    calc: function(v) { const installment = Math.ceil(v.amount/v.months + v.amount*v.commission/100/v.months); const totalPaid = (v.amount/v.months)*v.months + v.amount*v.commission/100; const totalDividend = v.dividend*v.months; const effective = totalDividend - v.amount*v.commission/100; return { result: 'Installment: ₹' + installment.toLocaleString('en-IN'), chart: Charts.bar([totalPaid, totalDividend], ['Total Paid','Dividends']), extra: 'Total paid: ₹' + totalPaid.toLocaleString('en-IN',{maximumFractionDigits:0}) + ' | Dividends: ₹' + totalDividend.toLocaleString('en-IN',{maximumFractionDigits:0}) + ' | Net: ₹' + effective.toLocaleString('en-IN',{maximumFractionDigits:0}) }; },
    steps: function(v) { const i=Math.ceil(v.amount/v.months+v.amount*v.commission/100/v.months); return ['Step 1: Monthly share = ₹'+v.amount.toLocaleString('en-IN')+' / '+v.months+' = ₹'+Math.round(v.amount/v.months).toLocaleString('en-IN'),'Step 2: Commission = '+v.commission+'% → ₹'+Math.round(v.amount*v.commission/100/v.months).toLocaleString('en-IN')+'/mo','Step 3: Installment = ₹'+i.toLocaleString('en-IN')]; } },
  { id: 'gratuity', name: 'Gratuity Calculator', desc: 'Calculate gratuity amount under Payment of Gratuity Act', kw: 'free online Gratuity Calculator',
    inputs: [{id:'lastSalary',label:'Last Basic + DA (₹)',type:'number',def:50000},{id:'years',label:'Years of Service',type:'number',def:12},{id:'months',label:'Extra Months',type:'number',def:6}],
    calc: function(v) { const years = v.years + v.months/12; const eligible = years >= 5; const gratuity = eligible ? v.lastSalary*15*years/26 : 0; return { result: 'Gratuity: ₹' + gratuity.toLocaleString('en-IN',{maximumFractionDigits:2}), chart: Charts.gauge(gratuity, 500000), extra: 'Formula: Last salary × 15 × years / 26 | ' + (eligible?'Eligible ✓ ('+years.toFixed(1)+' yrs)':'Not eligible — need 5+ years') + ' | Tax-free up to ₹20 lakh' }; },
    steps: function(v) { const y=v.years+v.months/12; return ['Step 1: Total service = '+v.years+'y '+(v.months||0)+'m = '+y.toFixed(1)+' years'+(y<5?' (need 5+ for gratuity)':''),'Step 2: Gratuity = ₹'+v.lastSalary.toLocaleString('en-IN')+' × 15 × '+y.toFixed(1)+' / 26 = ₹'+((y>=5?v.lastSalary*15*y/26:0)).toLocaleString('en-IN',{maximumFractionDigits:2})]; } },
  { id: 'leave-encashment', name: 'Leave Encashment Calculator', desc: 'Calculate value of unavailed earned leaves', kw: 'leave encashment calculator, free online Leave Encashment Calculator',
    inputs: [{id:'basic',label:'Basic Salary (₹/mo)',type:'number',def:40000},{id:'da',label:'DA (₹/mo)',type:'number',def:5000},{id:'leaves',label:'Unavailed Leaves',type:'number',def:30}],
    calc: function(v) { const daily = (v.basic + v.da)/30; const amount = daily*v.leaves; return { result: 'Encashment: ₹' + amount.toLocaleString('en-IN',{maximumFractionDigits:2}), chart: Charts.gauge(amount, 100000), extra: 'Daily rate: ₹' + daily.toLocaleString('en-IN',{maximumFractionDigits:2}) + ' | ' + v.leaves + ' days | Taxable (unless at retirement)' }; },
    steps: function(v) { const d=(v.basic+v.da)/30; return ['Step 1: Daily rate = (₹'+v.basic.toLocaleString('en-IN')+' + ₹'+v.da.toLocaleString('en-IN')+') / 30 = ₹'+d.toLocaleString('en-IN',{maximumFractionDigits:2}),'Step 2: Amount = ₹'+d.toLocaleString('en-IN',{maximumFractionDigits:2})+' × '+v.leaves+' = ₹'+(d*v.leaves).toLocaleString('en-IN',{maximumFractionDigits:2})]; } },


  // ═══ NEW: 13 additional calculators ═══

  { id: 'epf-calculator', name: 'EPF Calculator (India)', desc: 'Employees Provident Fund balance projection', kw: 'epf calculator india provident fund balance interest',
    inputs: [{id:'basic',label:'Basic + DA (₹)',type:'number',def:30000},{id:'age',label:'Your Age',type:'number',def:30},{id:'retire',label:'Retirement Age',type:'number',def:60},{id:'existing',label:'Existing EPF Balance (₹)',type:'number',def:200000}],
    calc: function(v){var emp=v.basic*0.12;var total=emp*2;var years=Math.max(1,v.retire-v.age);var bal=v.existing;var rate=0.0825;for(var y=0;y<years;y++)bal=(bal+total*12)*(1+rate);var totalContrib=v.existing+total*12*years;return{result:'₹'+Math.round(bal).toLocaleString('en-IN'),chart:Charts.bar([totalContrib,bal],['Contributed','Projected']),extra:'Employee 12% + employer 12% (3.67% EPF) | Interest ~8.25%/yr'};},
    steps: function(v){var emp=v.basic*0.12;var total=emp*2;var years=Math.max(1,v.retire-v.age);var bal=v.existing;var rate=0.0825;for(var y=0;y<years;y++)bal=(bal+total*12)*(1+rate);return['Monthly contribution = ₹'+v.basic+' × 12% × 2 = ₹'+Math.round(total),'Years to retirement = '+years,'Compounded at ~8.25%/yr','Projected = ₹'+Math.round(bal).toLocaleString('en-IN')];} },
  { id: 'esic-calculator', name: 'ESIC Contribution Calculator', desc: 'Employee State Insurance contributions', kw: 'esic calculator india employee state insurance contribution',
    inputs: [{id:'salary',label:'Gross Salary (₹)',type:'number',def:25000}],
    calc: function(v){var emp=v.salary*0.0075;var empr=v.salary*0.0325;return{result:'Employee: ₹'+Math.round(emp),chart:Charts.bar([emp,empr],['Employee','Employer']),extra:'Employer: ₹'+Math.round(empr)+' | Applies if gross ≤ ₹21,000'};},
    steps: function(v){var emp=v.salary*0.0075;var empr=v.salary*0.0325;return['Employee share = '+v.salary+' × 0.75% = ₹'+Math.round(emp),'Employer share = '+v.salary+' × 3.25% = ₹'+Math.round(empr)];} },
  { id: 'tds-calculator', name: 'TDS Calculator (Salary)', desc: 'Tax deducted at source on salary (old regime)', kw: 'tds calculator india tax deducted at source salary',
    inputs: [{id:'income',label:'Annual Income (₹)',type:'number',def:1200000},{id:'deductions',label:'Deductions 80C etc (₹)',type:'number',def:150000}],
    calc: function(v){var taxable=Math.max(0,v.income-v.deductions);var tax=0;if(taxable>1000000)tax+=(taxable-1000000)*0.3+112500;else if(taxable>500000)tax+=(taxable-500000)*0.2+12500;else if(taxable>250000)tax+=(taxable-250000)*0.05;tax+=tax*0.04;return{result:'₹'+Math.round(tax).toLocaleString('en-IN'),chart:Charts.bar([taxable,tax],['Taxable','Tax']),extra:'Taxable: ₹'+taxable.toLocaleString('en-IN')+' | Old regime estimate'};},
    steps: function(v){var taxable=Math.max(0,v.income-v.deductions);var tax=0;if(taxable>1000000)tax+=(taxable-1000000)*0.3+112500;else if(taxable>500000)tax+=(taxable-500000)*0.2+12500;else if(taxable>250000)tax+=(taxable-250000)*0.05;tax+=tax*0.04;return['Taxable = ₹'+v.income.toLocaleString('en-IN')+' − ₹'+v.deductions.toLocaleString('en-IN')+' = ₹'+taxable.toLocaleString('en-IN'),'Slabs: 0–2.5L nil, 2.5–5L 5%, 5–10L 20%, >10L 30%','Cess 4% applied above ₹5L','Estimated TDS = ₹'+Math.round(tax).toLocaleString('en-IN')];} },
  { id: 'hra-exemption', name: 'HRA Exemption Calculator', desc: 'House rent allowance exemption (India)', kw: 'hra exemption calculator india house rent allowance',
    inputs: [{id:'basic',label:'Basic Salary (₹/yr)',type:'number',def:480000},{id:'hra',label:'HRA Received (₹/yr)',type:'number',def:144000},{id:'rent',label:'Rent Paid (₹/yr)',type:'number',def:180000},{id:'metro',label:'City',type:'select',opts:[{v:'metro',l:'Metro'},{v:'other',l:'Non-metro'}],def:'other'}],
    calc: function(v){var a=v.hra;var b=Math.max(0,v.rent-v.basic*0.1);var c=v.metro==='metro'?v.basic*0.5:v.basic*0.4;var exemption=Math.min(a,b,c);return{result:'₹'+Math.round(exemption).toLocaleString('en-IN'),chart:Charts.bar([a,b,c,exemption],['HRA','Rent−10%','50/40% basic','Exempt']),extra:'Least of the three limits'};},
    steps: function(v){var a=v.hra;var b=Math.max(0,v.rent-v.basic*0.1);var c=v.metro==='metro'?v.basic*0.5:v.basic*0.4;var exemption=Math.min(a,b,c);return['Limit 1 (actual HRA): ₹'+a.toLocaleString('en-IN'),'Limit 2 (rent − 10% basic): ₹'+b.toLocaleString('en-IN'),'Limit 3 ('+(v.metro==='metro'?'50':'40')+'% basic): ₹'+c.toLocaleString('en-IN'),'Exemption = least = ₹'+Math.round(exemption).toLocaleString('en-IN')];} },
  { id: 'capital-gains-india', name: 'Capital Gains Calculator (India)', desc: 'Long-term capital gains tax on sale', kw: 'capital gains tax calculator india property shares LTCG',
    inputs: [{id:'buyPrice',label:'Purchase Price (₹)',type:'number',def:3000000},{id:'sellPrice',label:'Sale Price (₹)',type:'number',def:4500000},{id:'years',label:'Holding Period (years)',type:'number',def:5},{id:'asset',label:'Asset Type',type:'select',opts:[{v:'property',l:'Property'},{v:'shares',l:'Shares'}],def:'property'}],
    calc: function(v){var gain=Math.max(0,v.sellPrice-v.buyPrice);var tax;if(v.asset==='property'){var indexed=v.buyPrice*Math.pow(1.05,v.years);var ltcg=Math.max(0,v.sellPrice-indexed);tax=ltcg*0.2;}else{var ltcgShares=Math.max(0,gain-100000);tax=ltcgShares*0.1;}return{result:'₹'+Math.round(tax).toLocaleString('en-IN'),chart:Charts.bar([v.buyPrice,v.sellPrice],['Buy','Sell']),extra:'Gain: ₹'+gain.toLocaleString('en-IN')+' | Estimate only'};},
    steps: function(v){var gain=Math.max(0,v.sellPrice-v.buyPrice);var tax;if(v.asset==='property'){var indexed=v.buyPrice*Math.pow(1.05,v.years);var ltcg=Math.max(0,v.sellPrice-indexed);tax=ltcg*0.2;}else{var ltcgShares=Math.max(0,gain-100000);tax=ltcgShares*0.1;}return['Gain = ₹'+gain.toLocaleString('en-IN'),v.asset==='property'?'Indexed cost (5%/yr) → LTCG 20%':'LTCG over ₹1L taxed 10%','Tax ≈ ₹'+Math.round(tax).toLocaleString('en-IN'),'Estimate only — consult a CA'];} },
  { id: 'sukanya-samriddhi', name: 'Sukanya Samriddhi Account', desc: 'Girl child savings scheme returns', kw: 'sukanya samriddhi calculator india girl child scheme',
    inputs: [{id:'deposit',label:'Annual Deposit (₹)',type:'number',def:100000},{id:'years',label:'Years',type:'number',def:15},{id:'rate',label:'Interest Rate (%)',type:'number',def:8.2}],
    calc: function(v){var r=v.rate/100;var bal=0;for(var y=0;y<v.years;y++)bal=(bal+v.deposit)*(1+r);var contributed=v.deposit*v.years;return{result:'₹'+Math.round(bal).toLocaleString('en-IN'),chart:Charts.bar([contributed,bal],['Deposited','Maturity']),extra:'Deposited: ₹'+contributed.toLocaleString('en-IN')+' | Compounded yearly'};},
    steps: function(v){var r=v.rate/100;var bal=0;for(var y=0;y<v.years;y++)bal=(bal+v.deposit)*(1+r);return['Deposit ₹'+v.deposit.toLocaleString('en-IN')+' yearly at '+v.rate+'%','Compounded annually for '+v.years+' years','Maturity ≈ ₹'+Math.round(bal).toLocaleString('en-IN')];} },
  { id: 'nsc-interest', name: 'NSC Interest Calculator', desc: 'National Savings Certificate returns', kw: 'nsc interest calculator india national savings certificate',
    inputs: [{id:'amount',label:'Investment (₹)',type:'number',def:100000},{id:'years',label:'Years',type:'number',def:5},{id:'rate',label:'Interest Rate (%)',type:'number',def:7.7}],
    calc: function(v){var r=v.rate/100;var bal=v.amount;var contrib=v.amount;for(var y=0;y<v.years;y++)bal*=(1+r);return{result:'₹'+Math.round(bal).toLocaleString('en-IN'),chart:Charts.bar([contrib,bal],['Invested','Maturity']),extra:'Interest: ₹'+Math.round(bal-v.amount).toLocaleString('en-IN')};},
    steps: function(v){var r=v.rate/100;var bal=v.amount;for(var y=0;y<v.years;y++)bal*=(1+r);return['₹'+v.amount.toLocaleString('en-IN')+' at '+v.rate+'%','Compounded annually for '+v.years+' years','Maturity ≈ ₹'+Math.round(bal).toLocaleString('en-IN')];} },
  { id: 'senior-savings-scheme', name: 'Senior Citizens Savings Scheme', desc: 'SCSS returns and quarterly payout', kw: 'senior citizens savings scheme calculator india scss',
    inputs: [{id:'amount',label:'Deposit (₹)',type:'number',def:1000000},{id:'rate',label:'Rate (%)',type:'number',def:8.2}],
    calc: function(v){var quarterly=v.amount*v.rate/100/4;var annual=quarterly*4;return{result:'₹'+Math.round(quarterly).toLocaleString('en-IN')+'/quarter',chart:Charts.bar([quarterly,annual],['Quarterly','Yearly']),extra:'Yearly: ₹'+Math.round(annual).toLocaleString('en-IN')+' | Max deposit ₹30L | 5 yr tenure'};},
    steps: function(v){var quarterly=v.amount*v.rate/100/4;return['Quarterly payout = ₹'+v.amount.toLocaleString('en-IN')+' × '+v.rate+'% / 4','= ₹'+Math.round(quarterly).toLocaleString('en-IN'),'Yearly ≈ ₹'+Math.round(quarterly*4).toLocaleString('en-IN')];} },
  { id: 'post-office-savings', name: 'Post Office Savings Calculator', desc: 'Post office recurring deposit returns', kw: 'post office savings calculator india recurring deposit RD',
    inputs: [{id:'monthly',label:'Monthly Deposit (₹)',type:'number',def:5000},{id:'years',label:'Years',type:'number',def:5},{id:'rate',label:'Rate (%)',type:'number',def:7.5}],
    calc: function(v){var n=v.years*12;var r=v.rate/100/4;var rd=v.monthly*((Math.pow(1+r,n/3)-1)/(1-Math.pow(1+r,-1/3)));var contributed=v.monthly*n;return{result:'₹'+Math.round(rd).toLocaleString('en-IN'),chart:Charts.bar([contributed,rd],['Deposited','Maturity']),extra:'Deposited: ₹'+contributed.toLocaleString('en-IN')};},
    steps: function(v){var n=v.years*12;var r=v.rate/100/4;var rd=v.monthly*((Math.pow(1+r,n/3)-1)/(1-Math.pow(1+r,-1/3)));return['₹'+v.monthly.toLocaleString('en-IN')+' monthly × '+v.years+' years','Interest compounded quarterly at '+v.rate+'%','Maturity ≈ ₹'+Math.round(rd).toLocaleString('en-IN')];} },
  { id: 'uae-vat', name: 'UAE VAT Calculator', desc: 'Add or extract 5% VAT (UAE)', kw: 'uae vat calculator 5 percent value added tax',
    inputs: [{id:'amount',label:'Amount (AED)',type:'number',def:1000},{id:'mode',label:'Mode',type:'select',opts:[{v:'add',l:'Add VAT'},{v:'extract',l:'Extract VAT'}],def:'add'}],
    calc: function(v){if(v.mode==='add'){var vat=v.amount*0.05;return{result:(v.amount+vat).toFixed(2)+' AED',chart:Charts.bar([v.amount,vat],['Net','VAT']),extra:'VAT: '+vat.toFixed(2)+' AED'};}var ex=v.amount*0.05/1.05;return{result:'Net: '+(v.amount-ex).toFixed(2)+' AED',chart:Charts.bar([v.amount-ex,ex],['Net','VAT']),extra:'VAT included: '+ex.toFixed(2)+' AED'};},
    steps: function(v){if(v.mode==='add'){var vat=v.amount*0.05;return['VAT = '+v.amount+' × 5% = '+vat.toFixed(2)+' AED','Total = '+(v.amount+vat).toFixed(2)+' AED'];}var ex=v.amount*0.05/1.05;return['VAT = '+v.amount+' × 5/105 = '+ex.toFixed(2)+' AED','Net = '+(v.amount-ex).toFixed(2)+' AED'];} },
  { id: 'zakat-calculator', name: 'Zakat Calculator', desc: 'Zakat due on savings (2.5%)', kw: 'zakat calculator 2.5 percent islamic wealth, free online Zakat Calculator',
    inputs: [{id:'cash',label:'Cash & Bank (PKR/AED)',type:'number',def:500000},{id:'gold',label:'Gold/Silver Value',type:'number',def:300000},{id:'other',label:'Other Assets',type:'number',def:100000},{id:'debt',label:'Debts Owed',type:'number',def:50000}],
    calc: function(v){var net=Math.max(0,v.cash+v.gold+v.other-v.debt);var zakat=net*0.025;return{result:zakat.toFixed(0)+' (2.5%)',chart:Charts.donut([net,zakat],['Net wealth','Zakat']),extra:'Net wealth: '+net.toLocaleString()};},
    steps: function(v){var net=Math.max(0,v.cash+v.gold+v.other-v.debt);var zakat=net*0.025;return['Net wealth = assets − debts = '+net.toLocaleString(),'Nisab applies (85g gold / 595g silver)','Zakat = net × 2.5% = '+zakat.toFixed(0)];} },
  { id: 'pk-income-tax', name: 'Pakistan Income Tax', desc: 'Salaried income tax (Pakistan)', kw: 'pakistan income tax calculator salaried FBR, free online Pakistan Income Tax calculator',
    inputs: [{id:'income',label:'Annual Income (PKR)',type:'number',def:2000000}],
    calc: function(v){var inc=v.income;var tax=0;if(inc>4100000)tax=(inc-4100000)*0.35+775000;else if(inc>3100000)tax=(inc-3100000)*0.325+450000;else if(inc>2200000)tax=(inc-2200000)*0.3+180000;else if(inc>1400000)tax=(inc-1400000)*0.225;else if(inc>1000000)tax=(inc-1000000)*0.175;else if(inc>700000)tax=(inc-700000)*0.125;else if(inc>600000)tax=(inc-600000)*0.075;else if(inc>500000)tax=(inc-500000)*0.025;else tax=0;return{result:'PKR '+Math.round(tax).toLocaleString(),chart:Charts.bar([inc,tax],['Income','Tax']),extra:'FY25 slabs estimate (salaried)'};},
    steps: function(v){var inc=v.income;var tax=0;if(inc>4100000)tax=(inc-4100000)*0.35+775000;else if(inc>3100000)tax=(inc-3100000)*0.325+450000;else if(inc>2200000)tax=(inc-2200000)*0.3+180000;else if(inc>1400000)tax=(inc-1400000)*0.225;else if(inc>1000000)tax=(inc-1000000)*0.175;else if(inc>700000)tax=(inc-700000)*0.125;else if(inc>600000)tax=(inc-600000)*0.075;else if(inc>500000)tax=(inc-500000)*0.025;else tax=0;return['Salaried slabs: up to 6L 0%, progressive to 35% above 4.1M','Tax ≈ PKR '+Math.round(tax).toLocaleString(),'Rough estimate — verify with FBR tables'];} },
  { id: 'gold-silver-ratio', name: 'Gold-Silver Ratio', desc: 'How many ounces of silver equal one ounce of gold', kw: 'gold silver ratio calculator oz, free online Gold-Silver Ratio calculator',
    inputs: [{id:'gold',label:'Gold Price/oz',type:'number',def:2650},{id:'silver',label:'Silver Price/oz',type:'number',def:30}],
    calc: function(v){var ratio=v.gold/v.silver;return{result:ratio.toFixed(1)+':1',chart:Charts.gauge(ratio,100),extra:'Historic average ~60:1 | Below 60 = silver cheap'};},
    steps: function(v){var ratio=v.gold/v.silver;return['Ratio = gold price / silver price','= '+v.gold+' / '+v.silver,'= '+ratio.toFixed(1)+' oz silver per 1 oz gold'];} },

  { id: 'gratuity-calculator', name: 'Gratuity Calculator (India)', desc: 'Gratuity under the Indian Payment of Gratuity Act', kw: 'gratuity calculator india payment of gratuity act',
    inputs: [{id:'basic',label:'Last Drawn Basic + DA (₹)',type:'number',def:50000},{id:'years',label:'Years of Service',type:'number',def:10},{id:'months',label:'Months Beyond Last Full Year',type:'number',def:6}],
    calc: function(v) { const totalMonths = v.years*12 + v.months; const yearsRounded = Math.floor(totalMonths/12); const gratuity = v.basic * 15/26 * yearsRounded; const eligible = totalMonths >= 60; return { result: 'Gratuity: ₹' + gratuity.toLocaleString('en-IN', {maximumFractionDigits:0}), chart: Charts.bar([gratuity], ['Gratuity']), extra: (eligible ? yearsRounded + ' years × 15/26 × ₹' + v.basic.toLocaleString('en-IN') : 'Eligible after 5 years (60 months) | Current: ' + Math.floor(totalMonths/12) + 'y ' + (totalMonths%12) + 'm') + ' | Tax-free up to ₹20 lakh' }; },
    steps: function(v) { const totalMonths = v.years*12 + v.months; const yearsRounded = Math.floor(totalMonths/12); const gratuity = v.basic * 15/26 * yearsRounded; return ['Formula: Gratuity = Last drawn salary × 15/26 × years of service','Step 1: Service = ' + v.years + 'y ' + v.months + 'm → ' + yearsRounded + ' years (round down)','Step 2: Gratuity = ₹' + v.basic.toLocaleString('en-IN') + ' × 15/26 × ' + yearsRounded + ' = ₹' + gratuity.toLocaleString('en-IN', {maximumFractionDigits:0})]; } },

  { id: 'stamp-duty-india', name: 'Stamp Duty & Registration (India)', desc: 'Property stamp duty + registration charges for Indian states', kw: 'stamp duty calculator india property registration charges',
    inputs: [{id:'propertyValue',label:'Property Value (₹)',type:'number',def:5000000},{id:'dutyRate',label:'Stamp Duty %',type:'number',def:7},{id:'regRate',label:'Registration %',type:'number',def:1}],
    calc: function(v) { const duty = v.propertyValue * v.dutyRate/100; const reg = v.propertyValue * v.regRate/100; const total = v.propertyValue + duty + reg; return { result: 'Duty + Reg: ₹' + (duty+reg).toLocaleString('en-IN', {maximumFractionDigits:0}), chart: Charts.donut([v.propertyValue, duty, reg], ['Property','Stamp duty','Registration']), extra: 'Stamp duty: ₹' + duty.toLocaleString('en-IN', {maximumFractionDigits:0}) + ' | Registration: ₹' + reg.toLocaleString('en-IN', {maximumFractionDigits:0}) + ' | Total cost: ₹' + total.toLocaleString('en-IN', {maximumFractionDigits:0}) }; },
    steps: function(v) { const duty = v.propertyValue * v.dutyRate/100; const reg = v.propertyValue * v.regRate/100; return ['Step 1: Stamp duty = ₹' + v.propertyValue.toLocaleString('en-IN') + ' × ' + v.dutyRate + '% = ₹' + duty.toLocaleString('en-IN', {maximumFractionDigits:0}),'Step 2: Registration = ₹' + v.propertyValue.toLocaleString('en-IN') + ' × ' + v.regRate + '% = ₹' + reg.toLocaleString('en-IN', {maximumFractionDigits:0}),'Step 3: Total payable = ₹' + (duty+reg).toLocaleString('en-IN', {maximumFractionDigits:0}) + ' (rates vary by state, gender, city)']; } },

  { id: 'gst-calculator', name: 'GST Payable (Input Tax Credit)', desc: 'Net GST payable after ITC for businesses', kw: 'gst payable calculator input tax credit itc business liability',
    inputs: [{id:'sales',label:'Taxable Sales (₹, excl GST)',type:'number',def:100000},{id:'purchases',label:'Taxable Purchases (₹, excl GST)',type:'number',def:40000},{id:'rate',label:'GST Rate %',type:'select',opts:[{v:'5',l:'5%'},{v:'12',l:'12%'},{v:'18',l:'18%'},{v:'28',l:'28%'}],def:'18'}],
    calc: function(v) { const rate = v.rate/100; const output = v.sales*rate; const itc = v.purchases*rate; const net = output - itc; return { result: 'Net GST Payable: ₹' + net.toLocaleString('en-IN', {maximumFractionDigits:0}), chart: Charts.bar([output, itc, net], ['Output GST','Input Credit (ITC)','Net Payable']), extra: 'Output GST: ₹' + output.toLocaleString('en-IN', {maximumFractionDigits:0}) + ' | ITC: ₹' + itc.toLocaleString('en-IN', {maximumFractionDigits:0}) + ' | ' + (net > 0 ? 'Pay ₹' + net.toLocaleString('en-IN', {maximumFractionDigits:0}) + ' to govt' : net < 0 ? 'Refund/credit of ₹' + Math.abs(net).toLocaleString('en-IN', {maximumFractionDigits:0}) : 'No GST due') }; },
    steps: function(v) { const rate = v.rate/100; const output = v.sales*rate; const itc = v.purchases*rate; const net = output - itc; return ['Formula: Net GST = Output GST (on sales) − Input Tax Credit (on purchases)','Step 1: Output GST = ₹' + v.sales.toLocaleString('en-IN') + ' × ' + v.rate + '% = ₹' + output.toLocaleString('en-IN', {maximumFractionDigits:0}),'Step 2: ITC = ₹' + v.purchases.toLocaleString('en-IN') + ' × ' + v.rate + '% = ₹' + itc.toLocaleString('en-IN', {maximumFractionDigits:0}),'Step 3: Net payable = ₹' + output.toLocaleString('en-IN', {maximumFractionDigits:0}) + ' − ₹' + itc.toLocaleString('en-IN', {maximumFractionDigits:0}) + ' = ₹' + net.toLocaleString('en-IN', {maximumFractionDigits:0})]; } }

,
  { id: 'uk-ni', name: 'UK National Insurance Calculator', desc: 'NI contributions from annual salary', kw: 'uk national insurance calculator ni contributions',
    inputs: [{id:'salary',label:'Annual Salary (£)',type:'number',def:45000},{id:'selfEmployed',label:'Self-Employed (Class 4)',type:'select',opts:[{v:'0',l:'No (employee, Class 1)'},{v:'1',l:'Yes (Class 4)'}],def:'0'}],
    calc: function(v){ var primary=12570, upper=50270; var ni=0; if(v.selfEmployed==='1'){ if(v.salary>primary) ni=(Math.min(v.salary,upper)-primary)*0.06+(v.salary>upper?(v.salary-upper)*0.02:0); } else { if(v.salary>primary) ni=(Math.min(v.salary,upper)-primary)*0.08+(v.salary>upper?(v.salary-upper)*0.02:0); } return{result:'NI: £'+ni.toFixed(2)+'/yr',chart:Charts.donut([ni,v.salary-ni],['NI','Take-home before tax']),extra:'Monthly: £'+(ni/12).toFixed(2)+' | 2025/26: 8% from £12,570, 2% above £50,270'};},
    steps: function(v){ var primary=12570, upper=50270; var band=v.selfEmployed==='1'?6:8; var ni=band/100*(Math.min(v.salary,upper)-primary)+(v.salary>upper?(v.salary-upper)*0.02:0); return['Step 1: Band = '+v.salary+' − £12,570 = £'+(v.salary-primary).toFixed(0)+' at '+band+'%','Step 2: Above £50,270: £'+(v.salary>upper?v.salary-upper:0).toFixed(0)+' at 2%','Step 3: NI = £'+ni.toFixed(2)+' per year']; } },

  { id: 'us-fica', name: 'FICA Tax Calculator', desc: 'Social Security and Medicare withholding', kw: 'fica calculator social security medicare withholding, free online FICA Tax Calculator',
    inputs: [{id:'wages',label:'Annual Wages ($)',type:'number',def:80000},{id:'married',label:'Filing Jointly (higher Medicare threshold)',type:'select',opts:[{v:'0',l:'No'},{v:'1',l:'Yes'}],def:'0'}],
    calc: function(v){ var ssBase=176100, ss=Math.min(v.wages,ssBase)*0.062; var threshold=v.married==='1'?250000:200000; var med=v.wages*0.0145+(v.wages>threshold?(v.wages-threshold)*0.009:0); return{result:'FICA: $'+(ss+med).toFixed(2)+'/yr',chart:Charts.donut([ss,med],['Social Security','Medicare']),extra:'SS: $'+ss.toFixed(2)+' | Medicare: $'+med.toFixed(2)+' | 2025 rates: 6.2% + 1.45% (+0.9% above threshold)'};},
    steps: function(v){ var ss=Math.min(v.wages,176100)*0.062; var threshold=v.married==='1'?250000:200000; var med=v.wages*0.0145+(v.wages>threshold?(v.wages-threshold)*0.009:0); return['Step 1: Social Security = 6.2% × min($'+v.wages.toLocaleString()+', $176,100) = $'+ss.toFixed(2),'Step 2: Medicare = 1.45% × $'+v.wages.toLocaleString()+' = $'+(v.wages*0.0145).toFixed(2),'Step 3: Extra 0.9% above $'+(threshold).toLocaleString()+' = $'+((v.wages>threshold?(v.wages-threshold)*0.009:0)).toFixed(2),'Step 4: Total FICA = $'+(ss+med).toFixed(2)];} },

  { id: 'canada-cpp', name: 'Canada CPP Contribution Calculator', desc: 'CPP/QPP contributions from employment income', kw: 'canada cpp calculator contribution pension',
    inputs: [{id:'income',label:'Annual Employment Income ($)',type:'number',def:70000}],
    calc: function(v){ var exemption=3500, maxPensionable=71900, rate=0.0595; var contrib=Math.min(Math.max(v.income-exemption,0),maxPensionable-exemption)*rate; return{result:'CPP: $'+contrib.toFixed(2)+'/yr',chart:Charts.donut([contrib,v.income-contrib],['CPP','Income']),extra:'Monthly: $'+(contrib/12).toFixed(2)+' | 2025: 5.95% on earnings between $3,500 and $71,900 (employee share)'};},
    steps: function(v){ var contrib=Math.min(Math.max(v.income-3500,0),71900-3500)*0.0595; return['Step 1: Pensionable = $'+v.income.toLocaleString()+' − $3,500 = $'+Math.max(v.income-3500,0).toLocaleString(),'Step 2: Capped at $71,900 − $3,500','Step 3: × 5.95% = $'+contrib.toFixed(2)+' (your half; employer matches)'];} },

  { id: 'australia-super', name: 'Australia Superannuation Calculator', desc: 'Employer super guarantee on your salary', kw: 'australia super calculator superannuation guarantee',
    inputs: [{id:'salary',label:'Annual Salary (AUD)',type:'number',def:80000},{id:'rate',label:'Super Guarantee (%)',type:'number',def:11.5}],
    calc: function(v){ var maxBase=65060; var sgCapped=Math.min(v.salary,maxBase)*v.rate/100; return{result:'Super: A$'+sgCapped.toFixed(2)+'/yr',chart:Charts.donut([sgCapped,v.salary],['Super','Salary']),extra:'SG applies to salary up to the maximum contribution base (A$65,060 for 2025–26) | Rate: '+v.rate+'%'};},
    steps: function(v){ var sgCapped=Math.min(v.salary,65060)*v.rate/100; return['Step 1: Super = '+v.rate+'% × salary','Step 2: Capped at the maximum contribution base (A$65,060)','Step 3: A$'+sgCapped.toFixed(2)+' per year, paid by your employer on top of salary'];} },

  { id: 'singapore-cpf', name: 'Singapore CPF Calculator', desc: 'CPF contributions for employees by age band', kw: 'singapore cpf calculator contribution employee employer, free online Singapore CPF Calculator',
    inputs: [{id:'salary',label:'Monthly Salary (SGD)',type:'number',def:6000},{id:'age',label:'Age Band',type:'select',opts:[{v:'55',l:'Under 55'},{v:'60',l:'55–60'},{v:'65',l:'60–65'},{v:'70',l:'65+'}],def:'55'}],
    calc: function(v){ var bands={55:[0.2,0.17],60:[0.13,0.13],65:[0.075,0.09],70:[0.05,0.075]}[v.age]; var emp=v.salary*bands[0]; var er=v.salary*bands[1]; return{result:'Employee: S$'+emp.toFixed(2)+'/mo',chart:Charts.donut([emp,er],['Employee','Employer']),extra:'Employer: S$'+er.toFixed(2)+'/mo | Total: S$'+(emp+er).toFixed(2)+'/mo (wages ≤ S$8,000/month)'};},
    steps: function(v){ var bands={55:[0.2,0.17],60:[0.13,0.13],65:[0.075,0.09],70:[0.05,0.075]}[v.age]; return['Step 1: Employee share = '+bands[0]*100+'% × S$'+v.salary.toLocaleString()+' = S$'+(v.salary*bands[0]).toFixed(2),'Step 2: Employer share = '+bands[1]*100+'% × S$'+v.salary.toLocaleString()+' = S$'+(v.salary*bands[1]).toFixed(2),'Step 3: Total contribution = S$'+(v.salary*(bands[0]+bands[1])).toFixed(2)];} },
  { id: 'uk-take-home-salary', name: 'UK Take-Home Salary Calculator', desc: 'Free UK take-home pay calculator: salary after income tax and National Insurance, 2025-26 bands, every step shown.', kw: 'uk take home salary calculator, uk salary after tax calculator, take home pay uk calculator',
    inputs: [{id:'salary',label:'Annual Salary (£)',type:'number',def:35000},{id:'pension',label:'Pension Contribution (%)',type:'number',def:5},{id:'student',label:'Student Loan Plan',type:'select',opts:[{v:'None',l:'None'},{v:'Plan 1',l:'Plan 1'},{v:'Plan 2',l:'Plan 2'}],def:'None'}],
    calc: function(v) { var pension = v.salary * v.pension/100; var netPay = v.salary - pension; var taxable = Math.max(0, netPay - 12570); var tax = taxable <= 37700 ? taxable*0.20 : 37700*0.20 + (taxable-37700)*0.40; var ni = taxable <= 37700 ? taxable*0.08 : 37700*0.08 + (taxable-37700)*0.02; var loan = v.student === 'Plan 1' ? Math.max(0, netPay - 26065)*0.09 : v.student === 'Plan 2' ? Math.max(0, netPay - 28470)*0.09 : 0; var take = netPay - tax - ni - loan; return { result: 'Take-home: £' + (take/12).toFixed(2) + '/mo', chart: Charts.donut([tax, ni, pension, loan, take], ['Tax','NI','Pension','Student loan','Take-home']), extra: 'Annual take-home: £' + take.toFixed(0) + ' | Tax: £' + tax.toFixed(0) + ' | NI: £' + ni.toFixed(0) + (loan ? ' | Student loan: £' + loan.toFixed(0) : '') + ' | Pension: £' + pension.toFixed(0) + ' | 2025-26 rates, England rUK' }; },
    steps: function(v) { var pension = v.salary * v.pension/100; var netPay = v.salary - pension; var taxable = Math.max(0, netPay - 12570); var tax = taxable <= 37700 ? taxable*0.20 : 37700*0.20 + (taxable-37700)*0.40; var ni = taxable <= 37700 ? taxable*0.08 : 37700*0.08 + (taxable-37700)*0.02; var loan = v.student === 'Plan 1' ? Math.max(0, netPay - 26065)*0.09 : v.student === 'Plan 2' ? Math.max(0, netPay - 28470)*0.09 : 0; var out = ['Step 1: Pension = ' + v.pension + '% of £' + v.salary + ' = £' + pension.toFixed(2), 'Step 2: Taxable pay = £' + v.salary + ' − pension − £12,570 personal allowance = £' + taxable.toFixed(2), 'Step 3: Income tax (20%/40% bands) = £' + tax.toFixed(2), 'Step 4: National Insurance (8% up to £50,270, then 2%) = £' + ni.toFixed(2)]; if (loan > 0) out.push('Step 5: Student loan (9% over ' + (v.student === 'Plan 1' ? '£26,065' : '£28,470') + ', simplified) = £' + loan.toFixed(2)); out.push('Final: Take-home = salary − pension − tax − NI' + (loan ? ' − student loan' : '') + ' = £' + (netPay - tax - ni - loan).toFixed(2) + '/year'); return out; } },
  { id: 'india-take-home-salary', name: 'India Take-Home Salary Calculator', desc: 'Free India take-home salary calculator: in-hand pay after income tax (new regime) and EPF, 2025-26 slabs, every step shown.', kw: 'india take home salary calculator, in hand salary calculator india, salary after tax india calculator',
    inputs: [{id:'ctc',label:'Annual CTC (₹)',type:'number',def:1200000},{id:'epf',label:'Employee EPF (%)',type:'number',def:12}],
    calc: function(v) { var base = v.ctc * 0.85; var epf = Math.min(base * v.epf/100, 150000); var taxable = Math.max(0, base - 75000 - epf); var t = taxable <= 400000 ? 0 : taxable <= 800000 ? (taxable-400000)*0.05 : taxable <= 1200000 ? 20000 + (taxable-800000)*0.10 : taxable <= 1600000 ? 60000 + (taxable-1200000)*0.15 : taxable <= 2000000 ? 120000 + (taxable-1600000)*0.20 : taxable <= 2400000 ? 200000 + (taxable-2000000)*0.25 : 300000 + (taxable-2400000)*0.30; var rebate = taxable <= 1200000 ? Math.min(t, 60000) : 0; var tax = Math.max(0, t - rebate); var cess = tax * 0.04; var take = base - epf - tax - cess; return { result: 'In-hand: ₹' + Math.round(take/12).toLocaleString('en-IN') + '/mo', chart: Charts.donut([tax + cess, epf, take], ['Tax + cess','EPF','In-hand']), extra: 'Annual in-hand: ₹' + Math.round(take).toLocaleString('en-IN') + ' | Tax: ₹' + Math.round(tax + cess).toLocaleString('en-IN') + ' | EPF: ₹' + Math.round(epf).toLocaleString('en-IN') + ' | New regime 2025-26, ₹60k rebate' }; },
    steps: function(v) { var base = v.ctc * 0.85; var epf = Math.min(base * v.epf/100, 150000); var taxable = Math.max(0, base - 75000 - epf); return ['Step 1: Base salary ≈ 85% of CTC = ₹' + base.toFixed(0), 'Step 2: EPF = ' + v.epf + '% (capped ₹1.5L) = ₹' + epf.toFixed(0), 'Step 3: Taxable income = base − ₹75,000 std deduction − EPF = ₹' + taxable.toFixed(0), 'Step 4: New-regime slab tax (0/5/10/15/20/25/30%) − ₹60,000 rebate if ≤ ₹12L', 'Step 5: In-hand = base − EPF − tax − 4% cess']; } },
  { id: 'saudi-take-home-salary', name: 'Saudi Arabia Take-Home Salary Calculator', desc: 'Free Saudi take-home salary calculator: net pay after GOSI and zero personal income tax, every step shown.', kw: 'saudi take home salary calculator, ksa salary calculator after gosi, saudi arabia net salary calculator',
    inputs: [{id:'salary',label:'Monthly Salary (SAR)',type:'number',def:12000},{id:'saudi',label:'Saudi national?',type:'select',opts:[{v:'No (expat)',l:'No (expat)'},{v:'Yes',l:'Yes'}],def:'No (expat)'}],
    calc: function(v) { var gosi = v.saudi === 'Yes' ? v.salary * 0.0975 : v.salary * 0.02; var hazard = v.saudi === 'Yes' ? v.salary * 0.02 : 0; var take = v.salary - gosi - hazard; return { result: 'Take-home: SAR ' + take.toFixed(2) + '/mo', chart: Charts.donut([gosi, hazard, take], ['GOSI','SANED/hazard','Take-home']), extra: 'Annual take-home: SAR ' + (take*12).toFixed(0) + ' | GOSI: SAR ' + gosi.toFixed(2) + (v.saudi === 'Yes' ? ' (9.75% Saudi rate)' : ' (2% expat rate)') + ' | Personal income tax: 0%' }; },
    steps: function(v) { var gosi = v.saudi === 'Yes' ? v.salary * 0.0975 : v.salary * 0.02; var hazard = v.saudi === 'Yes' ? v.salary * 0.02 : 0; return ['Step 1: GOSI = ' + (v.saudi === 'Yes' ? '9.75%' : '2%') + ' of SAR ' + v.salary + ' = SAR ' + gosi.toFixed(2), 'Step 2: ' + (v.saudi === 'Yes' ? 'SANED/hazard 2% = SAR ' + hazard.toFixed(2) : 'Expat: no SANED contribution'), 'Step 3: Income tax = 0 (Saudi levies no personal income tax)', 'Step 4: Take-home = salary − GOSI ' + (v.saudi === 'Yes' ? '− SANED' : '') + ' = SAR ' + (v.salary - gosi - hazard).toFixed(2) + '/mo']; } },
  { id: 'canada-take-home-salary', name: 'Canada (Ontario) Take-Home Salary Calculator', desc: 'Free Ontario take-home pay calculator: salary after federal/provincial tax, CPP and EI, 2025 rates, every step shown.', kw: 'ontario take home pay calculator, canada salary after tax calculator ontario, take home salary canada calculator',
    inputs: [{id:'salary',label:'Annual Salary (C$)',type:'number',def:75000}],
    calc: function(v) { var taxable = Math.max(0, v.salary - 16198); var fed = taxable <= 57375 ? taxable*0.15 : taxable <= 114750 ? 8606.25 + (taxable-57375)*0.205 : taxable <= 177882 ? 20368.13 + (taxable-114750)*0.26 : taxable <= 253414 ? 36782.45 + (taxable-177882)*0.29 : 58686.73 + (taxable-253414)*0.33; var on = taxable <= 52886 ? taxable*0.0505 : taxable <= 105775 ? 2670.74 + (taxable-52886)*0.0915 : taxable <= 150000 ? 7510.09 + (taxable-105775)*0.1116 : taxable <= 220000 ? 12445.6 + (taxable-150000)*0.1216 : 20957.6 + (taxable-220000)*0.1316; var cpp = Math.min(Math.max(0, v.salary - 3500), 71300 - 3500) * 0.0595; var ei = Math.min(v.salary, 65700) * 0.0164; var take = v.salary - fed - on - cpp - ei; return { result: 'Take-home: C$' + (take/12).toFixed(2) + '/mo', chart: Charts.donut([fed, on, cpp, ei, take], ['Fed tax','ON tax','CPP','EI','Take-home']), extra: 'Annual: C$' + take.toFixed(0) + ' | Fed: ' + fed.toFixed(0) + ' | ON: ' + on.toFixed(0) + ' | CPP: ' + cpp.toFixed(0) + ' | EI: ' + ei.toFixed(0) + ' | 2025 rates' }; },
    steps: function(v) { var taxable = Math.max(0, v.salary - 16198); return ['Step 1: Taxable income = salary − C$16,198 basic personal amount = C$' + taxable.toFixed(0), 'Step 2: Federal tax (15–33% brackets) + Ontario tax (5.05–13.16%)', 'Step 3: CPP = 5.95% on pensionable earnings (max C$4,034) | EI = 1.64% (max C$1,077)', 'Step 4: Take-home = salary − fed − ON − CPP − EI (monthly ÷ 12)']; } },
  { id: 'germany-take-home-salary', name: 'Germany Take-Home Salary Calculator (Brutto-Netto)', desc: 'Free German Brutto-Netto calculator: net salary after income tax, soli and social contributions, 2025 values, every step shown.', kw: 'germany take home salary calculator, brutto netto rechner english, german net salary calculator',
    inputs: [{id:'salary',label:'Gross Annual Salary (€)',type:'number',def:60000},{id:'class',label:'Tax Class',type:'select',opts:[{v:'I',l:'I'},{v:'III',l:'III'},{v:'IV',l:'IV'}],def:'I'}],
    calc: function(v) { var rate = v.class === 'III' ? 0.18 : 0.24; var slope = v.class === 'III' ? 0.30 : 0.36; var taxable = Math.max(0, v.salary - 12096); var inc = taxable <= 17005 ? taxable * rate * 0.6 : 10206 * rate * 0.6 + (taxable - 17005) * slope * (taxable / 200000 + 0.7); var soli = inc * 0.055 * (inc > 36100 ? 1 : 0); var pension = Math.min(v.salary, 96600) * 0.093; var health = Math.min(v.salary, 66150) * 0.073; var care = v.salary * 0.018; var unemp = Math.min(v.salary, 89400) * 0.013; var take = v.salary - inc - soli - pension - health - care - unemp; return { result: 'Net: €' + (take/12).toFixed(2) + '/mo', chart: Charts.donut([inc, soli, pension, health + care + unemp, take], ['Income tax','Soli','Pension','Health+Care+UI','Net']), extra: 'Annual net: €' + take.toFixed(0) + ' | Tax: €' + inc.toFixed(0) + ' | Social: €' + (pension + health + care + unemp).toFixed(0) + ' | 2025 approx, Class ' + v.class }; },
    steps: function(v) { var taxable = Math.max(0, v.salary - 12096); return ['Step 1: Taxable = gross − €12,096 Grundfreibetrag = €' + taxable.toFixed(0), 'Step 2: Income tax (ESt, class ' + v.class + ' formula) + 5.5% Soli above threshold', 'Step 3: Social security: pension 9.3%, health 7.3%, care 1.8%, unemployment 1.3% (employee shares, on caps)', 'Step 4: Net = gross − tax − soli − social (monthly ÷ 12). Official Werttabelle may differ slightly.']; } },
  { id: 'australia-take-home-salary', name: 'Australia Take-Home Salary Calculator', desc: 'Free Australia take-home pay calculator: salary after income tax, Medicare levy and super, 2025-26 rates, every step shown.', kw: 'australia take home pay calculator, salary after tax australia calculator, take home salary australia calculator',
    inputs: [{id:'salary',label:'Annual Salary (A$)',type:'number',def:95000},{id:'super',label:'Super Contribution (%)',type:'number',def:11.5}],
    calc: function(v) { var tax = v.salary <= 18200 ? 0 : v.salary <= 45000 ? (v.salary-18200)*0.16 : v.salary <= 135000 ? 4288 + (v.salary-45000)*0.30 : v.salary <= 190000 ? 31288 + (v.salary-135000)*0.37 : 51638 + (v.salary-190000)*0.45; var medicare = v.salary * 0.02; var superAmt = v.salary * v.super/100; var take = v.salary - tax - medicare; return { result: 'Take-home: A$' + (take/12).toFixed(2) + '/mo', chart: Charts.donut([tax, medicare, superAmt, take], ['Income tax','Medicare','Super','Take-home']), extra: 'Annual take-home: A$' + take.toFixed(0) + ' | Tax: A$' + tax.toFixed(0) + ' | Medicare: A$' + medicare.toFixed(0) + ' | Super (employer): A$' + superAmt.toFixed(0) + ' | 2025-26 rates' }; },
    steps: function(v) { var tax = v.salary <= 18200 ? 0 : v.salary <= 45000 ? (v.salary-18200)*0.16 : v.salary <= 135000 ? 4288 + (v.salary-45000)*0.30 : v.salary <= 190000 ? 31288 + (v.salary-135000)*0.37 : 51638 + (v.salary-190000)*0.45; return ['Step 1: Income tax: first A$18,200 tax-free, then 16/30/37/45% brackets = A$' + tax.toFixed(0), 'Step 3: Medicare levy 2% = A$' + (v.salary*0.02).toFixed(0), 'Step 4: Take-home = salary − tax − medicare (super is ON TOP of salary) = A$' + (v.salary - tax - v.salary*0.02).toFixed(0) + '/year']; } },
  { id: 'singapore-take-home-salary', name: 'Singapore Take-Home Salary Calculator', desc: 'Free Singapore take-home pay calculator: net salary after CPF (or expat rates), 2025 rates, every step shown.', kw: 'singapore take home salary calculator, cpf calculator employee, singapore net salary calculator expat',
    inputs: [{id:'salary',label:'Monthly Salary (S$)',type:'number',def:6500},{id:'status',label:'Status',type:'select',opts:[{v:'PR/Citizen (CPF)',l:'PR/Citizen (CPF)'},{v:'Foreigner (no CPF)',l:'Foreigner (no CPF)'}],def:'PR/Citizen (CPF)'}],
    calc: function(v) { var cpf = v.status === 'PR/Citizen (CPF)' ? Math.min(v.salary, 7400) * 0.20 : 0; var take = v.salary - cpf; return { result: 'Take-home: S$' + take.toFixed(2) + '/mo', chart: Charts.donut([cpf, take], ['CPF (20%)','Take-home']), extra: 'Annual take-home: S$' + (take*12).toFixed(0) + ' | CPF: S$' + cpf.toFixed(0) + (v.status === 'PR/Citizen (CPF)' ? ' (employee 20%, capped at S$1,480)' : ' — expats pay no CPF') + ' | Income tax ~0-15% effective, filed yearly' }; },
    steps: function(v) { var cpf = v.status === 'PR/Citizen (CPF)' ? Math.min(v.salary, 7400) * 0.20 : 0; return ['Step 1: CPF = 20% employee share on first S$7,400 = S$' + cpf.toFixed(2) + (v.status === 'PR/Citizen (CPF)' ? '' : ' (foreigner: none)'), 'Step 2: Take-home = salary − CPF = S$' + (v.salary - cpf).toFixed(2) + '/mo', 'Step 3: Personal income tax is filed yearly (first S$20k is 0%) — not deducted monthly']; } },
  { id: 'qatar-take-home-salary', name: 'Qatar Take-Home Salary Calculator', desc: 'Free Qatar take-home salary calculator: net pay with zero income tax, basic vs allowances breakdown, every step shown.', kw: 'qatar salary calculator, qatar take home pay, doha salary tax free calculator',
    inputs: [{id:'basic',label:'Monthly Basic Salary (QAR)',type:'number',def:9000},{id:'allow',label:'Allowances (QAR/mo)',type:'number',def:2500}],
    calc: function(v) { var gross = v.basic + v.allow; var take = gross; return { result: 'Take-home: QAR ' + take.toFixed(2) + '/mo', chart: Charts.donut([v.basic, v.allow], ['Basic','Allowances']), extra: 'Annual take-home: QAR ' + (take*12).toFixed(0) + ' | Income tax: 0% — Qatar levies no personal income tax | End-of-service: ~QAR ' + (v.basic*21/30).toFixed(0) + '/yr accrues (21 days basic/yr)' }; },
    steps: function(v) { return ['Step 1: Gross = basic QAR ' + v.basic + ' + allowances QAR ' + v.allow + ' = QAR ' + (v.basic + v.allow).toFixed(2), 'Step 2: Income tax = 0 (Qatar has no personal income tax)', 'Step 3: Take-home = gross = QAR ' + (v.basic + v.allow).toFixed(2) + '/mo', 'Note: end-of-service gratuity accrues separately (21 days of basic wage per year)']; } },
  { id: 'abu-dhabi-cost-living', name: 'Abu Dhabi Cost of Living Calculator', desc: 'Free Abu Dhabi cost-of-living estimator: rent, utilities, schooling and transport against your salary, every item shown.', kw: 'abu dhabi cost of living calculator, uae living cost calculator expat, abu dhabi salary vs rent calculator',
    inputs: [{id:'salary',label:'Monthly Salary (AED)',type:'number',def:16000},{id:'rent',label:'Rent (AED/yr)',type:'number',def:55000},{id:'school',label:'Schooling (AED/yr)',type:'number',def:24000},{id:'transport',label:'Transport (AED/mo)',type:'number',def:900},{id:'utilities',label:'Utilities+Internet (AED/mo)',type:'number',def:700}],
    calc: function(v) { var monthlyFixed = (v.rent + v.school)/12 + v.transport + v.utilities; var other = v.salary * 0.2; var total = monthlyFixed + other; var surplus = v.salary - total; return { result: 'Surplus: AED ' + surplus.toFixed(2) + '/mo', chart: Charts.donut([v.rent/12, v.school/12, v.transport, v.utilities, other], ['Rent','School','Transport','Utilities','Other 20%']), extra: 'Fixed monthly: AED ' + monthlyFixed.toFixed(0) + ' | Estimated total: AED ' + total.toFixed(0) + ' | Saving rate: ' + (surplus/v.salary*100).toFixed(0) + '% — 0% income tax' }; },
    steps: function(v) { var monthlyFixed = (v.rent + v.school)/12 + v.transport + v.utilities; return ['Step 1: Rent monthly = AED ' + v.rent + ' ÷ 12 = AED ' + (v.rent/12).toFixed(0), 'Step 2: Schooling monthly = AED ' + v.school + ' ÷ 12 = AED ' + (v.school/12).toFixed(0), 'Step 3: Fixed monthly total = AED ' + monthlyFixed.toFixed(0), 'Step 4: + Other spending (20% of salary est.) = AED ' + (v.salary*0.2).toFixed(0), 'Step 5: Surplus = AED ' + v.salary + ' − total = AED ' + (v.salary - monthlyFixed - v.salary*0.2).toFixed(2) + '/mo (tax-free)']; } },
  { id: 'japan-take-home-salary', name: 'Japan Take-Home Salary Calculator', desc: 'Free Japan take-home pay calculator: net salary after income tax, resident tax and shakai hoken, 2025 estimates, every step shown.', kw: 'japan take home salary calculator, japan net salary after tax, shakai hoken calculator english',
    inputs: [{id:'salary',label:'Annual Salary (¥)',type:'number',def:6000000}],
    calc: function(v) { var income = Math.max(0, v.salary - 480000 - v.salary*0.1); var national = income <= 1950000 ? 5000 : (income - 1950000) * 0.1 + 5000; var itax = income <= 1950000 ? income * 0.05 : income <= 3300000 ? 97500 + (income-1950000)*0.10 : income <= 6950000 ? 232500 + (income-3300000)*0.20 : 962500 + (income-6950000)*0.23; var shakai = Math.min(v.salary, 15100000) * 0.1466; var take = v.salary - itax - national - shakai; return { result: 'Take-home: ¥' + Math.round(take/12).toLocaleString('ja-JP') + '/mo', chart: Charts.donut([itax, national, shakai, take], ['Income tax','Resident tax','Shakai hoken','Take-home']), extra: 'Annual net: ¥' + Math.round(take).toLocaleString('ja-JP') + ' | Income tax: ¥' + Math.round(itax).toLocaleString('ja-JP') + ' | Resident: ¥' + Math.round(national).toLocaleString('ja-JP') + ' | Social: ¥' + Math.round(shakai).toLocaleString('ja-JP') + ' | 2025 approx' }; },
    steps: function(v) { var income = Math.max(0, v.salary - 480000 - v.salary*0.1); return ['Step 1: Employment income deduction ≈ ¥480,000 + 10% of salary', 'Step 2: Income tax (5–23% brackets) on taxable income', 'Step 3: Resident tax ≈ 10% flat (paid the following year)', 'Step 4: Shakai hoken ≈ 14.66% employee share (health+pension+UI, on caps)', 'Step 5: Take-home = salary − tax − resident − shakai (monthly ÷ 12)']; } },
  { id: 'switzerland-take-home-salary', name: 'Switzerland Take-Home Salary Calculator', desc: 'Free Switzerland take-home salary calculator: net pay after AHV, ALV, pension fund and Swiss income tax, 2025 estimates, every step shown.', kw: 'switzerland take home salary calculator, swiss net salary calculator, salary after tax switzerland calculator',
    inputs: [{id:'salary',label:'Gross Annual Salary (CHF)',type:'number',def:90000},{id:'cantonal',label:'Canton Tax Level',type:'select',def:'Average (ZH)',options:["Low (ZG/SZ)","Average (ZH)","High (GE/VD)"]}],
    calc: function (v) {       var social = v.salary * 0.134;       var rate = v.cantonal === 'Low (ZG/SZ)' ? 0.09 : v.cantonal === 'High (GE/VD)' ? 0.21 : 0.135;       var tax = v.salary <= 30000 ? v.salary * 0.005 : v.salary <= 60000 ? v.salary * (0.03 + rate * 0.3) : v.salary <= 100000 ? v.salary * (0.06 + rate * 0.5) : v.salary * (0.09 + rate * 0.6);       var take = v.salary - social - tax;       return {         result: 'Take-home: CHF ' + (take / 12).toFixed(0) + '/mo',         chart: Charts.donut([tax, social, take], ['Income tax (fed+cantonal)', 'AHV/ALV/Pension', 'Take-home']),         extra: 'Annual net: CHF ' + take.toFixed(0) + ' | Social: CHF ' + social.toFixed(0) + ' (13.4%) | Tax: CHF ' + tax.toFixed(0) + ' (' + v.cantonal + ') | 2025 estimate'       };     },
    steps: function (v) {       return [         'Step 1: Social insurance = AHV 5.3% + ALV 1.1% + BVG pension ~7% = 13.4% of CHF ' + v.salary,         'Step 2: Income tax (federal + cantonal + communal, ' + v.cantonal + ' canton level) estimated on effective-rate bands',         'Step 3: Take-home = gross − social − tax, divided by 12 for the monthly figure',         'Note: actual canton/municipality/church rates vary widely — treat as a working estimate'       ];     } },
  { id: 'netherlands-take-home-salary', name: 'Netherlands Take-Home Salary Calculator', desc: 'Free Netherlands take-home pay calculator: net monthly salary after Dutch payroll tax and social premiums, 2025 rates with credits, every step shown.', kw: 'netherlands take home salary calculator, dutch net salary calculator, salary after tax netherlands',
    inputs: [{id:'salary',label:'Gross Annual Salary (€)',type:'number',def:50000},{id:'ruling',label:'30% Ruling?',type:'select',def:'No',options:["No","Yes"]}],
    calc: function (v) {       var base = v.ruling === 'Yes' ? v.salary * 0.7 : v.salary;       var tax = base <= 38441 ? base * 0.30 : base <= 76817 ? 11532 + (base - 38441) * 0.335 : 24380 + (base - 76817) * 0.42;       var take = v.salary - tax;       return {         result: 'Take-home: ' + String.fromCharCode(8364) + (take / 12).toFixed(0) + '/mo',         chart: Charts.donut([tax, take], ['Tax + premiums', 'Take-home']),         extra: 'Annual net: ' + String.fromCharCode(8364) + take.toFixed(0) + ' | Withholding est. (incl. general tax credit): ' + String.fromCharCode(8364) + tax.toFixed(0) + (v.ruling === 'Yes' ? ' | 30% ruling applied: only 70% taxed' : '')       };     },
    steps: function (v) {       var base = v.ruling === 'Yes' ? v.salary * 0.7 : v.salary;       return [         'Step 1: Taxable base = ' + (v.ruling === 'Yes' ? 'salary × 70% (30% expat ruling)' : 'full gross salary'),         'Step 2: Payroll tax + social premiums (loonheffing) on combined 2025 bands 30% → 42%, general credit folded in',         'Step 3: Take-home = gross − withholding, divided by 12',         'Note: yearly box-1 assessment (deductions, mortgage interest) can refund part of this — estimate only'       ];     } },
  { id: 'malaysia-take-home-salary', name: 'Malaysia Take-Home Salary Calculator', desc: 'Free Malaysia take-home salary calculator: net monthly pay after EPF (11%) and estimated PCB income tax, 2025 rules, every step shown.', kw: 'malaysia take home salary calculator, epf pcb calculator, malaysia net salary calculator',
    inputs: [{id:'salary',label:'Monthly Salary (RM)',type:'number',def:8000},{id:'epf',label:'Employee EPF (%)',type:'number',def:11}],
    calc: function (v) {       var epf = v.salary * v.epf / 100;       var taxable = Math.max(0, v.salary * 12 - epf * 12 - 9000);       var tax = taxable <= 35000 ? 0 : taxable <= 100000 ? (taxable - 35000) * 0.03 : 1950 + (taxable - 100000) * 0.08;       var take = v.salary - epf - tax / 12;       return {         result: 'Take-home: RM ' + take.toFixed(2) + '/mo',         chart: Charts.donut([epf, tax / 12, take], ['EPF (11%)', 'PCB tax (est.)', 'Take-home']),         extra: 'Annual net: RM ' + (take * 12).toFixed(0) + ' | EPF: RM ' + (epf * 12).toFixed(0) + '/yr | PCB est: RM ' + tax.toFixed(0) + '/yr (after RM9,000 relief) | 2025 estimate'       };     },
    steps: function (v) {       var epf = v.salary * v.epf / 100;       var taxable = Math.max(0, v.salary * 12 - epf * 12 - 9000);       return [         'Step 1: EPF employee share = ' + v.epf + '% of RM ' + v.salary + ' = RM ' + epf.toFixed(2),         'Step 2: Annual taxable income = gross − EPF − RM 9,000 individual relief = RM ' + taxable.toFixed(0),         'Step 3: Income tax (0% first RM35,000 taxable, then 3–8% bands here) ÷ 12 = monthly PCB estimate',         'Step 4: Take-home = salary − EPF − PCB (monthly)'       ];     } },
  { id: 'hongkong-take-home-salary', name: 'Hong Kong Take-Home Salary Calculator', desc: 'Free Hong Kong take-home salary calculator: net pay after MPF (5%, capped) and progressive salaries tax, 2025 estimates, every step shown.', kw: 'hong kong take home salary calculator, mpf salaries tax calculator, hk net salary calculator',
    inputs: [{id:'salary',label:'Monthly Salary (HK$)',type:'number',def:35000}],
    calc: function (v) {       var mpf = Math.min(v.salary, 30000) * 0.05;       var taxable = Math.max(0, v.salary * 12 - mpf * 12 - 132000);       var t = taxable <= 50000 ? taxable * 0.02 : taxable <= 100000 ? 1000 + (taxable - 50000) * 0.06 : taxable <= 150000 ? 4000 + (taxable - 100000) * 0.10 : 9000 + (taxable - 150000) * 0.14;       var tax = Math.min(t, taxable * 0.15);       var take = v.salary - mpf - tax / 12;       return {         result: 'Take-home: HK$' + (take).toFixed(0) + '/mo',         chart: Charts.donut([mpf, tax / 12, take], ['MPF (5%)', 'Salaries tax (est.)', 'Take-home']),         extra: 'Annual net: HK$' + (take * 12).toFixed(0) + ' | MPF: HK$' + (mpf * 12).toFixed(0) + '/yr (capped HK$' + '18,000) | Tax: HK$' + tax.toFixed(0) + '/yr (HK$' + '132,000 allowance) | 2025 estimate'       };     },
    steps: function (v) {       var mpf = Math.min(v.salary, 30000) * 0.05;       var taxable = Math.max(0, v.salary * 12 - mpf * 12 - 132000);       return [         'Step 1: MPF = 5% of monthly salary, capped at HK$' + '1,500/mo = HK$' + mpf.toFixed(0),         'Step 2: Net chargeable income = annual gross − MPF − HK$' + '132,000 basic allowance = HK$' + taxable.toFixed(0),         'Step 3: Salaries tax on 2%/6%/10%/14% bands (standard 15% rate applied only if lower)',         'Step 4: Take-home = salary − MPF − tax ÷ 12 (monthly)'       ];     } },
  { id: 'uae-gratuity-calculator', name: 'UAE Gratuity Calculator', desc: 'Free UAE end-of-service gratuity calculator: 21 days of basic wage per year (30 days after 5 years), capped at 2 years of pay, every step shown.', kw: 'uae gratuity calculator, end of service benefit calculator uae, gratuity calculation dubai abu dhabi',
    inputs: [{id:'basic',label:'Monthly Basic Salary (AED)',type:'number',def:10000},{id:'years',label:'Years of Service',type:'number',def:4}],
    calc: function (v) {       var first5 = Math.min(v.years, 5);       var rest = Math.max(0, v.years - 5);       var daily = v.basic * 12 / 365;       var grat = daily * 21 * first5 + daily * 30 * rest;       var cap = v.basic * 24;       var capped = grat > cap;       grat = Math.min(grat, cap);       return {         result: 'Est. gratuity: AED ' + grat.toFixed(0),         chart: Charts.donut([daily * 21 * first5, daily * 30 * rest || 0.0001], ['First 5 yrs (21 d/yr)', 'After 5 yrs (30 d/yr)']),         extra: 'Daily wage: AED ' + daily.toFixed(2) + ' (basic × 12 ÷ 365) | Eligibility: 1+ year of service | ' + (capped ? 'Capped at 2 years of wages' : 'Under the 2-year cap') + ' | New Labour Law (2022) rules'       };     },
    steps: function (v) {       var daily = v.basic * 12 / 365;       var first5 = Math.min(v.years, 5);       var rest = Math.max(0, v.years - 5);       return [         'Step 1: Daily wage = monthly basic × 12 ÷ 365 = AED ' + daily.toFixed(2) + ' (allowances excluded by law)',         'Step 2: First 5 years: 21 days of basic per year = AED ' + (daily * 21 * first5).toFixed(0),         rest > 0 ? 'Step 3: After 5 years: 30 days of basic per year = AED ' + (daily * 30 * rest).toFixed(0) : 'Step 3: Service under 5 years — the 30-day tier does not apply yet',         'Step 4: Total, capped at 2 years of total wages. Less than 1 year of service = no gratuity'       ];     } }
,
  {
    id: 'ireland-take-home-salary',
    name: 'Ireland Take-Home Salary Calculator',
    desc: 'Free Ireland take-home pay calculator: net salary after PAYE income tax, USC and PRSI, 2025 rates, every step shown.',
    kw: 'ireland take home salary calculator, irish salary after tax calculator, payslip calculator ireland',
    inputs: [
      { id: 'salary', label: 'Gross Annual Salary (€)', type: 'number', def: 50000 },
      { id: 'status', label: 'Tax Band Status', type: 'select', opts: [{v:'Single',l:'Single'},{v:'Married (one income)',l:'Married (one income)'}], def: 'Single' }
    ],
    calc: function (v) {
      var band = v.status === 'Married (one income)' ? 53000 : 44000;
      var paye = v.salary <= band ? v.salary * 0.20 : band * 0.20 + (v.salary - band) * 0.40;
      paye = Math.max(0, paye - 4000);
      var u1 = Math.min(v.salary, 12012) * 0.005;
      var u2 = Math.min(Math.max(v.salary - 12012, 0), 15370) * 0.02;
      var u3 = Math.min(Math.max(v.salary - 27382, 0), 42662) * 0.03;
      var u4 = Math.max(v.salary - 70044, 0) * 0.08;
      var usc = u1 + u2 + u3 + u4;
      var prsi = v.salary * 0.041;
      var take = v.salary - paye - usc - prsi;
      return {
        result: 'Take-home: ' + String.fromCharCode(8364) + (take / 12).toFixed(0) + '/mo',
        chart: Charts.donut([paye, usc, prsi, take], ['PAYE (after credits)', 'USC', 'PRSI', 'Take-home']),
        extra: 'Annual net: ' + String.fromCharCode(8364) + take.toFixed(0) + ' | PAYE: ' + String.fromCharCode(8364) + paye.toFixed(0) + ' | USC: ' + String.fromCharCode(8364) + usc.toFixed(0) + ' | PRSI: ' + String.fromCharCode(8364) + prsi.toFixed(0) + ' (4.1%) | 2025 rates'
      };
    },
    steps: function (v) {
      var band = v.status === 'Married (one income)' ? 53000 : 44000;
      var paye = Math.max(0, (v.salary <= band ? v.salary * 0.20 : band * 0.20 + (v.salary - band) * 0.40) - 4000);
      return [
        'Step 1: PAYE = 20% of the first ' + String.fromCharCode(8364) + band.toLocaleString() + ', 40% above = ' + String.fromCharCode(8364) + (v.salary <= band ? v.salary * 0.20 : band * 0.20 + (v.salary - band) * 0.40).toFixed(0),
        'Step 2: Less standard credits (personal 2,000 + employee 2,000) = PAYE ' + String.fromCharCode(8364) + paye.toFixed(0),
        'Step 3: USC = 0.5% to ' + String.fromCharCode(8364) + ' 12,012, 2% to ' + String.fromCharCode(8364) + ' 27,382, 3% to ' + String.fromCharCode(8364) + ' 70,044, 8% above',
        'Step 4: PRSI = 4.1% of gross salary',
        'Step 5: Take-home = salary − PAYE − USC − PRSI, divided by 12'
      ];
    }
  },
  {
    id: 'new-zealand-take-home-salary',
    name: 'New Zealand Take-Home Salary Calculator',
    desc: 'Free New Zealand take-home pay calculator: net salary after income tax, the ACC levy and KiwiSaver, 2025-26 rates, every step shown.',
    kw: 'new zealand take home salary calculator, nz salary after tax calculator, paye calculator new zealand',
    inputs: [
      { id: 'salary', label: 'Annual Salary (NZ$)', type: 'number', def: 80000 },
      { id: 'ks', label: 'KiwiSaver Rate (%)', type: 'number', def: 3 }
    ],
    calc: function (v) {
      var s = v.salary;
      var tax = Math.min(s, 15600) * 0.105
        + Math.min(Math.max(s - 15600, 0), 37900) * 0.175
        + Math.min(Math.max(s - 53500, 0), 24600) * 0.30
        + Math.min(Math.max(s - 78100, 0), 101900) * 0.33
        + Math.max(s - 180000, 0) * 0.39;
      var acc = Math.min(s, 152790) * 0.0167;
      var ks = s * v.ks / 100;
      var take = s - tax - acc - ks;
      return {
        result: 'Take-home: NZ' + String.fromCharCode(36) + (take / 12).toFixed(0) + '/mo',
        chart: Charts.donut([tax, acc, ks, take], ['PAYE income tax', 'ACC levy', 'KiwiSaver', 'Take-home']),
        extra: 'Annual net: NZ' + String.fromCharCode(36) + take.toFixed(0) + ' | Tax: NZ' + String.fromCharCode(36) + tax.toFixed(0) + ' | ACC: NZ' + String.fromCharCode(36) + acc.toFixed(0) + ' | KiwiSaver: NZ' + String.fromCharCode(36) + ks.toFixed(0) + ' (stays yours) | 2025-26 bands'
      };
    },
    steps: function (v) {
      var s = v.salary;
      var tax = Math.min(s, 15600) * 0.105 + Math.min(Math.max(s - 15600, 0), 37900) * 0.175 + Math.min(Math.max(s - 53500, 0), 24600) * 0.30 + Math.min(Math.max(s - 78100, 0), 101900) * 0.33 + Math.max(s - 180000, 0) * 0.39;
      return [
        'Step 1: PAYE bands 2025-26 = 10.5% to NZ' + String.fromCharCode(36) + ' 15,600, 17.5% to NZ' + String.fromCharCode(36) + ' 53,500, 30% to NZ' + String.fromCharCode(36) + ' 78,100, 33% to NZ' + String.fromCharCode(36) + ' 180,000, 39% above',
        'Step 2: Income tax total = NZ' + String.fromCharCode(36) + tax.toFixed(0),
        'Step 3: ACC earners levy = 1.67% on covered earnings (cap NZ' + String.fromCharCode(36) + ' 152,790)',
        'Step 4: KiwiSaver = ' + v.ks + '% employee share (employer adds at least 3% on top)',
        'Step 5: Take-home = salary − tax − ACC − KiwiSaver, divided by 12'
      ];
    }
  },
  {
    id: 'south-africa-take-home-salary',
    name: 'South Africa Take-Home Salary Calculator',
    desc: 'Free South Africa take-home salary calculator: net pay after SARS PAYE brackets, age rebates and UIF, 2025-26 tables, every step shown.',
    kw: 'south africa take home salary calculator, sars paye calculator, salary after tax south africa',
    inputs: [
      { id: 'salary', label: 'Monthly Salary (ZAR)', type: 'number', def: 50000 },
      { id: 'age', label: 'Age Band', type: 'select', opts: [{v:'Under 65',l:'Under 65'},{v:'65+',l:'65+'},{v:'75+',l:'75+'}], def: 'Under 65' }
    ],
    calc: function (v) {
      var annual = v.salary * 12;
      var tax = annual <= 237100 ? annual * 0.18
        : annual <= 370500 ? 42678 + (annual - 237100) * 0.26
        : annual <= 512800 ? 77362 + (annual - 370500) * 0.31
        : annual <= 673000 ? 121475 + (annual - 512800) * 0.36
        : annual <= 857900 ? 179147 + (annual - 673000) * 0.39
        : annual <= 1817000 ? 251258 + (annual - 857900) * 0.41
        : 644489 + (annual - 1817000) * 0.45;
      var rebate = v.age === '75+' ? 12589 : v.age === '65+' ? 9444 : 0;
      tax = Math.max(0, tax - rebate);
      var uif = Math.min(v.salary, 177.12);
      var take = v.salary - tax / 12 - uif;
      return {
        result: 'Take-home: R ' + take.toFixed(0) + '/mo',
        chart: Charts.donut([tax / 12, uif, take], ['PAYE (SARS)', 'UIF', 'Take-home']),
        extra: 'Annual net: R ' + (take * 12).toFixed(0) + ' | PAYE: R ' + tax.toFixed(0) + '/yr | UIF: R ' + (uif * 12).toFixed(0) + '/yr (1%, capped) | ' + v.age + ' rebates applied | 2025-26 tables'
      };
    },
    steps: function (v) {
      var annual = v.salary * 12;
      var tax = annual <= 237100 ? annual * 0.18 : annual <= 370500 ? 42678 + (annual - 237100) * 0.26 : annual <= 512800 ? 77362 + (annual - 370500) * 0.31 : annual <= 673000 ? 121475 + (annual - 512800) * 0.36 : annual <= 857900 ? 179147 + (annual - 673000) * 0.39 : annual <= 1817000 ? 251258 + (annual - 857900) * 0.41 : 644489 + (annual - 1817000) * 0.45;
      var rebate = v.age === '75+' ? 12589 : v.age === '65+' ? 9444 : 0;
      return [
        'Step 1: Annualise salary = R ' + v.salary + ' × 12 = R ' + annual.toLocaleString(),
        'Step 2: SARS 2025-26 brackets: 18% to R 237,100, 26% to R 370,500, 31% to R 512,800, 36% to R 673,000, 39% to R 857,900, 41% to R 1,817,000, 45% above',
        'Step 3: Less age rebate (primary R 17,235 is built in; + R 9,444 at 65+, + R 3,145 more at 75+) = PAYE R ' + Math.max(0, tax - rebate).toFixed(0) + '/yr',
        'Step 4: UIF = 1% of monthly salary, capped at R 177.12',
        'Step 5: Take-home = monthly salary − PAYE ÷ 12 − UIF'
      ];
    }
  }
,
  {
    id: 'kenya-take-home-salary',
    name: 'Kenya Take-Home Salary Calculator',
    desc: 'Free Kenya net salary calculator: PAYE after personal relief, NSSF tier I and II, SHIF and the Affordable Housing Levy, 2025 rates, every step shown.',
    kw: 'kenya take home salary calculator, paye calculator kenya, net salary kenya nssf shif housing levy',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (KES)', type: 'number', def: 100000 }
    ],
    calc: function (v) {
      var s = v.salary;
      var nssf = 0.06 * 8000 + 0.06 * Math.min(Math.max(s - 8000, 0), 100000);
      var shif = s * 0.0275;
      var ahl = s * 0.015;
      var taxable = s - nssf - shif - ahl;
      var paye = Math.min(taxable, 24000) * 0.10 + Math.min(Math.max(taxable - 24000, 0), 8333) * 0.25 + Math.max(taxable - 32333, 0) * 0.30;
      paye = Math.max(0, paye - 2400);
      var net = s - nssf - shif - ahl - paye;
      return {
        result: 'Take-home: KSh ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([paye, nssf, shif + ahl, net], ['PAYE', 'NSSF', 'SHIF + Housing Levy', 'Take-home']),
        extra: 'PAYE: KSh ' + paye.toFixed(0) + ' | NSSF: KSh ' + nssf.toFixed(0) + ' | SHIF: KSh ' + shif.toFixed(0) + ' | Housing Levy: KSh ' + ahl.toFixed(0) + ' | Taxable: KSh ' + taxable.toFixed(0) + ' | 2025 rates'
      };
    },
    steps: function (v) {
      var s = v.salary;
      var nssf = 0.06 * 8000 + 0.06 * Math.min(Math.max(s - 8000, 0), 100000);
      var shif = s * 0.0275;
      var ahl = s * 0.015;
      var taxable = s - nssf - shif - ahl;
      var paye = Math.max(0, Math.min(taxable, 24000) * 0.10 + Math.min(Math.max(taxable - 24000, 0), 8333) * 0.25 + Math.max(taxable - 32333, 0) * 0.30 - 2400);
      return [
        'Step 1: NSSF = 6% of the first KSh 8,000 + 6% of pay up to KSh 108,000 = KSh ' + nssf.toFixed(0),
        'Step 2: SHIF = 2.75% of gross = KSh ' + shif.toFixed(0) + '; Affordable Housing Levy = 1.5% = KSh ' + ahl.toFixed(0),
        'Step 3: Taxable pay = KSh ' + s.toFixed(0) + ' less NSSF, SHIF and levy = KSh ' + taxable.toFixed(0),
        'Step 4: PAYE bands = 10% on the first KSh 24,000, 25% on the next KSh 8,333, 30% above',
        'Step 5: Less personal relief of KSh 2,400 a month = PAYE KSh ' + paye.toFixed(0),
        'Step 6: Take-home = gross less NSSF, SHIF, levy and PAYE'
      ];
    }
  },
  {
    id: 'nigeria-take-home-salary',
    name: 'Nigeria Take-Home Salary Calculator',
    desc: 'Free Nigeria net salary calculator: PAYE on the Nigeria Tax Act 2025 bands with the 8% pension deduction, every step shown.',
    kw: 'nigeria take home salary calculator, paye calculator nigeria, net salary nigeria pension',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (NGN)', type: 'number', def: 500000 }
    ],
    calc: function (v) {
      var annual = v.salary * 12;
      var pension = annual * 0.08;
      var ti = annual - pension;
      var tax = Math.min(ti, 800000) * 0.00
        + Math.min(Math.max(ti - 800000, 0), 2200000) * 0.15
        + Math.min(Math.max(ti - 3000000, 0), 9000000) * 0.18
        + Math.min(Math.max(ti - 12000000, 0), 13000000) * 0.21
        + Math.min(Math.max(ti - 25000000, 0), 25000000) * 0.23
        + Math.max(ti - 50000000, 0) * 0.25;
      var net = v.salary - pension / 12 - tax / 12;
      return {
        result: 'Take-home: NGN ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([tax / 12, pension / 12, net], ['PAYE', 'Pension (8%)', 'Take-home']),
        extra: 'PAYE: NGN ' + tax.toFixed(0) + '/yr | Pension: NGN ' + pension.toFixed(0) + '/yr | Taxable: NGN ' + ti.toFixed(0) + '/yr | Effective rate: ' + (tax / annual * 100).toFixed(1) + '% | Nigeria Tax Act 2025'
      };
    },
    steps: function (v) {
      var annual = v.salary * 12;
      var pension = annual * 0.08;
      var ti = annual - pension;
      var tax = Math.min(ti, 800000) * 0.00 + Math.min(Math.max(ti - 800000, 0), 2200000) * 0.15 + Math.min(Math.max(ti - 3000000, 0), 9000000) * 0.18 + Math.min(Math.max(ti - 12000000, 0), 13000000) * 0.21 + Math.min(Math.max(ti - 25000000, 0), 25000000) * 0.23 + Math.max(ti - 50000000, 0) * 0.25;
      return [
        'Step 1: Annualise salary = NGN ' + v.salary + ' x 12 = NGN ' + annual.toLocaleString(),
        'Step 2: Pension = 8% of annual = NGN ' + pension.toFixed(0),
        'Step 3: Taxable income = NGN ' + ti.toFixed(0) + ' (the old Consolidated Relief Allowance no longer applies)',
        'Step 4: Nigeria Tax Act 2025 bands = 0% on the first NGN 800,000, 15% to NGN 3m, 18% to NGN 12m, 21% to NGN 25m, 23% to NGN 50m, 25% above',
        'Step 5: PAYE = NGN ' + tax.toFixed(0) + ' a year (NGN ' + (tax / 12).toFixed(0) + ' a month)',
        'Step 6: Take-home = gross less pension and PAYE'
      ];
    }
  },
  {
    id: 'philippines-take-home-salary',
    name: 'Philippines Take-Home Salary Calculator',
    desc: 'Free Philippines net pay calculator: BIR income tax after SSS, PhilHealth and Pag-IBIG deductions, 2025 contribution tables, every step shown.',
    kw: 'philippines take home salary calculator, bir income tax calculator philippines, net pay sss philhealth pagibig',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (PHP)', type: 'number', def: 50000 }
    ],
    calc: function (v) {
      var m = v.salary;
      var sss = Math.min(m, 35000) * 0.05;
      var ph = Math.min(m, 100000) * 0.025;
      var pi = Math.min(m, 10000) * 0.02;
      var ti = m - sss - ph - pi;
      var at = ti * 12;
      var tax = at <= 250000 ? 0
        : at <= 400000 ? (at - 250000) * 0.15
        : at <= 800000 ? 22500 + (at - 400000) * 0.20
        : at <= 2000000 ? 102500 + (at - 800000) * 0.25
        : at <= 8000000 ? 402500 + (at - 2000000) * 0.30
        : 2202500 + (at - 8000000) * 0.35;
      var net = m - sss - ph - pi - tax / 12;
      return {
        result: 'Take-home: PHP ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([tax / 12, sss, ph + pi, net], ['BIR tax', 'SSS', 'PhilHealth + Pag-IBIG', 'Take-home']),
        extra: 'SSS: PHP ' + sss.toFixed(0) + ' | PhilHealth: PHP ' + ph.toFixed(0) + ' | Pag-IBIG: PHP ' + pi.toFixed(0) + ' | Annual tax: PHP ' + tax.toFixed(0) + ' | Taxable: PHP ' + ti.toFixed(0) + '/mo | 2025 tables'
      };
    },
    steps: function (v) {
      var m = v.salary;
      var sss = Math.min(m, 35000) * 0.05;
      var ph = Math.min(m, 100000) * 0.025;
      var pi = Math.min(m, 10000) * 0.02;
      var ti = m - sss - ph - pi;
      var at = ti * 12;
      var tax = at <= 250000 ? 0 : at <= 400000 ? (at - 250000) * 0.15 : at <= 800000 ? 22500 + (at - 400000) * 0.20 : at <= 2000000 ? 102500 + (at - 800000) * 0.25 : at <= 8000000 ? 402500 + (at - 2000000) * 0.30 : 2202500 + (at - 8000000) * 0.35;
      return [
        'Step 1: SSS = 5% of salary up to the PHP 35,000 monthly salary credit = PHP ' + sss.toFixed(0),
        'Step 2: PhilHealth = 2.5% employee share = PHP ' + ph.toFixed(0) + '; Pag-IBIG = 2% up to PHP 10,000 = PHP ' + pi.toFixed(0),
        'Step 3: Taxable pay = PHP ' + m.toFixed(0) + ' less the three contributions = PHP ' + ti.toFixed(0) + ' a month',
        'Step 4: Annualise = PHP ' + at.toFixed(0) + ' and apply the BIR table: 0% to PHP 250,000, 15% to PHP 400,000, 20% to PHP 800,000, 25% to PHP 2m, 30% to PHP 8m, 35% above',
        'Step 5: Annual tax = PHP ' + tax.toFixed(0) + ' (PHP ' + (tax / 12).toFixed(0) + ' a month)',
        'Step 6: Take-home = gross less SSS, PhilHealth, Pag-IBIG and monthly tax'
      ];
    }
  },
  {
    id: 'bangladesh-income-tax',
    name: 'Bangladesh Income Tax Calculator',
    desc: 'Free Bangladesh income tax calculator: FY 2025-26 individual slabs with the tax-free threshold and minimum tax, every step shown.',
    kw: 'bangladesh income tax calculator, nbr tax calculator 2025-26, income tax slab bangladesh',
    inputs: [
      { id: 'income', label: 'Annual Income (BDT)', type: 'number', def: 1200000 },
      { id: 'category', label: 'Taxpayer Category', type: 'select', opts: [{v:'General',l:'General'},{v:'Woman or senior 65+',l:'Woman or senior 65+'},{v:'Physically challenged',l:'Physically challenged'},{v:'War-wounded freedom fighter',l:'War-wounded freedom fighter'}], def: 'General' }
    ],
    calc: function (v) {
      var exempt = v.category === 'Woman or senior 65+' ? 450000 : v.category === 'Physically challenged' ? 525000 : v.category === 'War-wounded freedom fighter' ? 550000 : 400000;
      var b = Math.max(0, v.income - exempt);
      var tax = Math.min(b, 300000) * 0.10
        + Math.min(Math.max(b - 300000, 0), 400000) * 0.15
        + Math.min(Math.max(b - 700000, 0), 500000) * 0.20
        + Math.min(Math.max(b - 1200000, 0), 2000000) * 0.25
        + Math.max(b - 3200000, 0) * 0.30;
      if (v.income > exempt) tax = Math.max(tax, 5000);
      return {
        result: 'Tax: BDT ' + tax.toFixed(0) + '/yr',
        chart: Charts.bar([v.income - tax, tax], ['Net income', 'Tax']),
        extra: 'Tax-free threshold: BDT ' + exempt.toLocaleString() + ' | Taxable: BDT ' + b.toLocaleString() + ' | Effective rate: ' + (tax / v.income * 100).toFixed(1) + '% | Minimum tax BDT 5,000 applies above the threshold | FY 2025-26 slabs'
      };
    },
    steps: function (v) {
      var exempt = v.category === 'Woman or senior 65+' ? 450000 : v.category === 'Physically challenged' ? 525000 : v.category === 'War-wounded freedom fighter' ? 550000 : 400000;
      var b = Math.max(0, v.income - exempt);
      var tax = Math.min(b, 300000) * 0.10 + Math.min(Math.max(b - 300000, 0), 400000) * 0.15 + Math.min(Math.max(b - 700000, 0), 500000) * 0.20 + Math.min(Math.max(b - 1200000, 0), 2000000) * 0.25 + Math.max(b - 3200000, 0) * 0.30;
      if (v.income > exempt) tax = Math.max(tax, 5000);
      return [
        'Step 1: Tax-free threshold for ' + v.category + ' = BDT ' + exempt.toLocaleString(),
        'Step 2: Taxable income = BDT ' + v.income.toLocaleString() + ' less the threshold = BDT ' + b.toLocaleString(),
        'Step 3: FY 2025-26 slabs = 10% on the first BDT 300,000, 15% on the next 400,000, 20% on the next 500,000, 25% on the next 2m, 30% above',
        'Step 4: Slab tax = BDT ' + tax.toFixed(0),
        'Step 5: Minimum tax of BDT 5,000 applies whenever income exceeds the threshold',
        'Step 6: Investment rebate (up to 10% of eligible investment) is not modelled here'
      ];
    }
  },
  {
    id: 'egypt-take-home-salary',
    name: 'Egypt Take-Home Salary Calculator',
    desc: 'Free Egypt net salary calculator: salary tax after the annual exemption and 11% social insurance, 2025-26 brackets, every step shown.',
    kw: 'egypt take home salary calculator, egypt income tax calculator, net salary egypt social insurance',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (EGP)', type: 'number', def: 30000 }
    ],
    calc: function (v) {
      var ann = v.salary * 12;
      var si = Math.min(v.salary, 16700) * 0.11;
      var ti = Math.max(0, ann - 20000 - si * 12);
      var tax = Math.min(ti, 40000) * 0
        + Math.min(Math.max(ti - 40000, 0), 15000) * 0.10
        + Math.min(Math.max(ti - 55000, 0), 15000) * 0.15
        + Math.min(Math.max(ti - 70000, 0), 130000) * 0.20
        + Math.min(Math.max(ti - 200000, 0), 200000) * 0.225
        + Math.min(Math.max(ti - 400000, 0), 800000) * 0.25
        + Math.max(ti - 1200000, 0) * 0.275;
      var net = v.salary - si - tax / 12;
      return {
        result: 'Take-home: EGP ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([tax / 12, si, net], ['Salary tax', 'Social insurance (11%)', 'Take-home']),
        extra: 'Social insurance: EGP ' + si.toFixed(0) + '/mo (capped at EGP 16,700 wage) | Taxable: EGP ' + ti.toFixed(0) + '/yr | Tax: EGP ' + tax.toFixed(0) + '/yr | EGP 20,000 annual exemption applied'
      };
    },
    steps: function (v) {
      var ann = v.salary * 12;
      var si = Math.min(v.salary, 16700) * 0.11;
      var ti = Math.max(0, ann - 20000 - si * 12);
      var tax = Math.min(ti, 40000) * 0 + Math.min(Math.max(ti - 40000, 0), 15000) * 0.10 + Math.min(Math.max(ti - 55000, 0), 15000) * 0.15 + Math.min(Math.max(ti - 70000, 0), 130000) * 0.20 + Math.min(Math.max(ti - 200000, 0), 200000) * 0.225 + Math.min(Math.max(ti - 400000, 0), 800000) * 0.25 + Math.max(ti - 1200000, 0) * 0.275;
      return [
        'Step 1: Annualise salary = EGP ' + v.salary + ' x 12 = EGP ' + ann.toLocaleString(),
        'Step 2: Social insurance = 11% of the insured wage, capped at EGP 16,700 a month = EGP ' + si.toFixed(0) + '/mo',
        'Step 3: Less the annual salary exemption of EGP 20,000 and the social insurance paid',
        'Step 4: Taxable income = EGP ' + ti.toFixed(0),
        'Step 5: Brackets = 0% to EGP 40,000, 10% to 55,000, 15% to 70,000, 20% to 200,000, 22.5% to 400,000, 25% to 1.2m, 27.5% above',
        'Step 6: Take-home = gross less social insurance and monthly salary tax'
      ];
    }
  }
,
  {
    id: 'brazil-take-home-salary',
    name: 'Brazil Take-Home Salary Calculator',
    desc: 'Free Brazil net salary calculator: INSS at 7.5% to 14% on the 2026 table and IRRF after the simplified deduction, every step shown.',
    kw: 'brazil take home salary calculator, salario liquido brasil, inss irrf calculator',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (BRL)', type: 'number', def: 8000 }
    ],
    calc: function (v) {
      var s = v.salary;
      var inss = Math.min(s, 1621) * 0.075
        + Math.min(Math.max(s - 1621, 0), 1281.84) * 0.09
        + Math.min(Math.max(s - 2902.84, 0), 1451.43) * 0.12
        + Math.min(Math.max(s - 4354.27, 0), 4121.28) * 0.14;
      var base = s - inss;
      var tax = base <= 2428.80 ? 0
        : base <= 2826.65 ? base * 0.075 - 182.16
        : base <= 3751.05 ? base * 0.15 - 394.16
        : base <= 4664.68 ? base * 0.225 - 675.49
        : base * 0.275 - 908.73;
      tax = Math.max(0, tax);
      var net = s - inss - tax;
      return {
        result: 'Take-home: BRL ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([tax, inss, net], ['IRRF', 'INSS', 'Take-home']),
        extra: 'INSS: BRL ' + inss.toFixed(0) + ' | IRRF: BRL ' + tax.toFixed(0) + ' | Taxable base: BRL ' + base.toFixed(0) + ' | 2026 INSS table (cap BRL 988.09)'
      };
    },
    steps: function (v) {
      var s = v.salary;
      var inss = Math.min(s, 1621) * 0.075 + Math.min(Math.max(s - 1621, 0), 1281.84) * 0.09 + Math.min(Math.max(s - 2902.84, 0), 1451.43) * 0.12 + Math.min(Math.max(s - 4354.27, 0), 4121.28) * 0.14;
      var base = s - inss;
      var tax = Math.max(0, base <= 2428.80 ? 0 : base <= 2826.65 ? base * 0.075 - 182.16 : base <= 3751.05 ? base * 0.15 - 394.16 : base <= 4664.68 ? base * 0.225 - 675.49 : base * 0.275 - 908.73);
      return [
        'Step 1: INSS is progressive on the contribution salary - 7.5% up to BRL 1,621, 9% to 2,902.84, 12% to 4,354.27, 14% to 8,475.55 = BRL ' + inss.toFixed(0),
        'Step 2: The INSS contribution is capped at BRL 988.09 a month at the top bracket',
        'Step 3: IRRF base = gross less INSS = BRL ' + base.toFixed(0),
        'Step 4: IRRF table = 0% to BRL 2,428.80, 7.5% to 2,826.65, 15% to 3,751.05, 22.5% to 4,664.68, 27.5% above, each with a deductible amount',
        'Step 5: IRRF = BRL ' + tax.toFixed(0) + ' a month (the simplified deduction of BRL 607.20 a month is not modelled here)',
        'Step 6: Take-home = gross less INSS and IRRF'
      ];
    }
  },
  {
    id: 'mexico-isr-salary',
    name: 'Mexico ISR Salary Calculator',
    desc: 'Free Mexico ISR calculator: the 2026 Article 96 monthly withholding table with fixed quota and marginal rate, every step shown.',
    kw: 'mexico isr calculator, calculadora isr 2026, impuesto sobre la renta nomina',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (MXN)', type: 'number', def: 25000 }
    ],
    calc: function (v) {
      var s = v.salary;
      var T = [[0.01, 844.59, 0, 0.0192], [844.60, 7168.51, 16.22, 0.064], [7168.52, 12598.02, 420.95, 0.1088], [12598.03, 14644.64, 1011.68, 0.16], [14644.65, 17533.64, 1339.14, 0.1792], [17533.65, 35362.83, 1856.84, 0.2136], [35362.84, 55736.68, 5665.16, 0.2352], [55736.69, 106410.50, 10457.09, 0.30], [106410.51, 141880.66, 25659.23, 0.32], [141880.67, 425641.99, 37009.69, 0.34], [425642.00, 1000000000000, 133488.54, 0.35]];
      var row = T[0];
      for (var i = 0; i < T.length; i++) { if (s >= T[i][0] && s <= T[i][1]) { row = T[i]; break; } }
      var tax = row[2] + (s - row[0]) * row[3];
      var net = s - tax;
      return {
        result: 'ISR: MXN ' + tax.toFixed(0) + '/mo',
        chart: Charts.donut([tax, net], ['ISR withheld', 'Net after ISR']),
        extra: 'ISR: MXN ' + tax.toFixed(0) + '/mo | Net after ISR: MXN ' + net.toFixed(0) + '/mo | Marginal rate: ' + (row[3] * 100).toFixed(2) + '% | 2026 Art 96 monthly table'
      };
    },
    steps: function (v) {
      var s = v.salary;
      var T = [[0.01, 844.59, 0, 0.0192], [844.60, 7168.51, 16.22, 0.064], [7168.52, 12598.02, 420.95, 0.1088], [12598.03, 14644.64, 1011.68, 0.16], [14644.65, 17533.64, 1339.14, 0.1792], [17533.65, 35362.83, 1856.84, 0.2136], [35362.84, 55736.68, 5665.16, 0.2352], [55736.69, 106410.50, 10457.09, 0.30], [106410.51, 141880.66, 25659.23, 0.32], [141880.67, 425641.99, 37009.69, 0.34], [425642.00, 1000000000000, 133488.54, 0.35]];
      var row = T[0];
      for (var i = 0; i < T.length; i++) { if (s >= T[i][0] && s <= T[i][1]) { row = T[i]; break; } }
      var tax = row[2] + (s - row[0]) * row[3];
      return [
        'Step 1: Start from monthly taxable income = gross less authorised deductions (mainly the IMSS employee share)',
        'Step 2: Find the bracket. For MXN ' + s + ' the lower limit is MXN ' + row[0] + ' at a marginal rate of ' + (row[3] * 100).toFixed(2) + '%',
        'Step 3: Excess over the lower limit = MXN ' + (s - row[0]).toFixed(2),
        'Step 4: Tax on the excess = MXN ' + ((s - row[0]) * row[3]).toFixed(2),
        'Step 5: Add the fixed quota of MXN ' + row[2] + ' = ISR of MXN ' + tax.toFixed(2) + ' a month before the employment subsidy',
        'Step 6: The 2026 table was inflation-adjusted, so the same nominal salary falls in a more favourable bracket than in 2025'
      ];
    }
  },
  {
    id: 'vietnam-take-home-salary',
    name: 'Vietnam Take-Home Salary Calculator',
    desc: 'Free Vietnam net salary calculator: PIT on the five 2026 bands after 10.5% compulsory insurance and family deductions, every step shown.',
    kw: 'vietnam take home salary calculator, vietnam pit calculator, net salary vietnam insurance',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (VND)', type: 'number', def: 30000000 }
    ],
    calc: function (v) {
      var s = v.salary;
      var ins = Math.min(s, 46800000) * 0.105;
      var taxable = Math.max(0, s - ins - 15500000);
      var tax = Math.min(taxable, 10000000) * 0.05
        + Math.min(Math.max(taxable - 10000000, 0), 20000000) * 0.10
        + Math.min(Math.max(taxable - 30000000, 0), 30000000) * 0.20
        + Math.min(Math.max(taxable - 60000000, 0), 40000000) * 0.30
        + Math.max(taxable - 100000000, 0) * 0.35;
      var net = s - ins - tax;
      return {
        result: 'Take-home: VND ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([tax, ins, net], ['PIT', 'Insurance (10.5%)', 'Take-home']),
        extra: 'Insurance: VND ' + ins.toFixed(0) + ' | PIT: VND ' + tax.toFixed(0) + ' | Taxable after deductions: VND ' + taxable.toFixed(0) + ' | Law 109/2025 five bands'
      };
    },
    steps: function (v) {
      var s = v.salary;
      var ins = Math.min(s, 46800000) * 0.105;
      var taxable = Math.max(0, s - ins - 15500000);
      var tax = Math.min(taxable, 10000000) * 0.05 + Math.min(Math.max(taxable - 10000000, 0), 20000000) * 0.10 + Math.min(Math.max(taxable - 30000000, 0), 30000000) * 0.20 + Math.min(Math.max(taxable - 60000000, 0), 40000000) * 0.30 + Math.max(taxable - 100000000, 0) * 0.35;
      return [
        'Step 1: Compulsory insurance = 10.5% of salary (8% social, 1.5% health, 1% unemployment) = VND ' + ins.toFixed(0),
        'Step 2: Insurance is capped at 20 times the base salary, so it stops rising on very high pay',
        'Step 3: Personal deduction = VND 15,500,000 a month (VND 186m a year); each dependent adds VND 6,200,000 a month',
        'Step 4: Taxable income = gross less insurance less the personal deduction = VND ' + taxable.toFixed(0),
        'Step 5: 2026 bands = 5% to VND 10m, 10% to 30m, 20% to 60m, 30% to 100m, 35% above (monthly taxable income)',
        'Step 6: Take-home = gross less insurance and PIT'
      ];
    }
  },
  {
    id: 'indonesia-take-home-salary',
    name: 'Indonesia Take-Home Salary Calculator',
    desc: 'Free Indonesia net salary calculator: PPh 21 on the progressive bands after BPJS Kesehatan, JHT and JP deductions, every step shown.',
    kw: 'indonesia take home salary calculator, kalkulator pph 21, gaji bersih bpjs',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (IDR)', type: 'number', def: 10000000 }
    ],
    calc: function (v) {
      var s = v.salary;
      var jht = s * 0.02;
      var jp = Math.min(s, 10547400) * 0.01;
      var kes = Math.min(s, 12000000) * 0.01;
      var bpjs = jht + jp + kes;
      var annual = s * 12;
      var biaya = Math.min(s * 0.05, 500000) * 12;
      var taxable = Math.max(0, annual - biaya - (jht + jp) * 12 - 54000000);
      var tax = Math.min(taxable, 60000000) * 0.05
        + Math.min(Math.max(taxable - 60000000, 0), 190000000) * 0.15
        + Math.min(Math.max(taxable - 250000000, 0), 250000000) * 0.25
        + Math.min(Math.max(taxable - 500000000, 0), 4500000000) * 0.30
        + Math.max(taxable - 5000000000, 0) * 0.35;
      var net = s - bpjs - tax / 12;
      return {
        result: 'Take-home: IDR ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([tax / 12, bpjs, net], ['PPh 21', 'BPJS', 'Take-home']),
        extra: 'BPJS: IDR ' + bpjs.toFixed(0) + ' | PPh 21: IDR ' + tax.toFixed(0) + '/yr | Taxable after PTKP: IDR ' + taxable.toFixed(0) + '/yr | JHT 2%, JP 1%, Kesehatan 1%'
      };
    },
    steps: function (v) {
      var s = v.salary;
      var jht = s * 0.02;
      var jp = Math.min(s, 10547400) * 0.01;
      var kes = Math.min(s, 12000000) * 0.01;
      var bpjs = jht + jp + kes;
      var annual = s * 12;
      var biaya = Math.min(s * 0.05, 500000) * 12;
      var taxable = Math.max(0, annual - biaya - (jht + jp) * 12 - 54000000);
      var tax = Math.min(taxable, 60000000) * 0.05 + Math.min(Math.max(taxable - 60000000, 0), 190000000) * 0.15 + Math.min(Math.max(taxable - 250000000, 0), 250000000) * 0.25 + Math.min(Math.max(taxable - 500000000, 0), 4500000000) * 0.30 + Math.max(taxable - 5000000000, 0) * 0.35;
      return [
        'Step 1: BPJS employee share = JHT 2% + JP 1% (capped at IDR 10,547,400) + Kesehatan 1% (capped at IDR 12,000,000) = IDR ' + bpjs.toFixed(0),
        'Step 2: Occupational allowance (biaya jabatan) = 5% of gross, capped at IDR 500,000 a month = IDR ' + (biaya / 12).toFixed(0),
        'Step 3: Annualise and subtract the JHT and JP contributions (these are deductible; Kesehatan is not)',
        'Step 4: Subtract PTKP of IDR 54,000,000 a year for a single taxpayer',
        'Step 5: Taxable income = IDR ' + taxable.toFixed(0) + ' a year; PPh 21 bands = 5% to 60m, 15% to 250m, 25% to 500m, 30% to 5bn, 35% above',
        'Step 6: Take-home = gross less BPJS and the monthly PPh 21'
      ];
    }
  },
  {
    id: 'thailand-take-home-salary',
    name: 'Thailand Take-Home Salary Calculator',
    desc: 'Free Thailand net salary calculator: PIT on the 0% to 35% bands after the 50% expense deduction, personal allowance and 5% social security, every step shown.',
    kw: 'thailand take home salary calculator, thai income tax calculator, net salary thailand social security',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (THB)', type: 'number', def: 40000 }
    ],
    calc: function (v) {
      var s = v.salary;
      var sso = Math.min(s * 0.05, 875);
      var annual = s * 12;
      var expense = Math.min(annual * 0.5, 100000);
      var taxable = Math.max(0, annual - expense - 60000 - sso * 12);
      var tax = Math.min(taxable, 150000) * 0
        + Math.min(Math.max(taxable - 150000, 0), 150000) * 0.05
        + Math.min(Math.max(taxable - 300000, 0), 200000) * 0.10
        + Math.min(Math.max(taxable - 500000, 0), 250000) * 0.15
        + Math.min(Math.max(taxable - 750000, 0), 250000) * 0.20
        + Math.min(Math.max(taxable - 1000000, 0), 2000000) * 0.25
        + Math.min(Math.max(taxable - 3000000, 0), 2000000) * 0.30
        + Math.max(taxable - 5000000, 0) * 0.35;
      var net = s - sso - tax / 12;
      return {
        result: 'Take-home: THB ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([tax / 12, sso, net], ['PIT', 'Social security', 'Take-home']),
        extra: 'Social security: THB ' + sso.toFixed(0) + ' | PIT: THB ' + tax.toFixed(0) + '/yr | Taxable after allowances: THB ' + taxable.toFixed(0) + '/yr | 2026 wage base to THB 17,500'
      };
    },
    steps: function (v) {
      var s = v.salary;
      var sso = Math.min(s * 0.05, 875);
      var annual = s * 12;
      var expense = Math.min(annual * 0.5, 100000);
      var taxable = Math.max(0, annual - expense - 60000 - sso * 12);
      var tax = Math.min(taxable, 150000) * 0 + Math.min(Math.max(taxable - 150000, 0), 150000) * 0.05 + Math.min(Math.max(taxable - 300000, 0), 200000) * 0.10 + Math.min(Math.max(taxable - 500000, 0), 250000) * 0.15 + Math.min(Math.max(taxable - 750000, 0), 250000) * 0.20 + Math.min(Math.max(taxable - 1000000, 0), 2000000) * 0.25 + Math.min(Math.max(taxable - 3000000, 0), 2000000) * 0.30 + Math.max(taxable - 5000000, 0) * 0.35;
      return [
        'Step 1: Social security = 5% of monthly wage, capped at THB 875 on a wage base of THB 17,500 (2026) = THB ' + sso.toFixed(0),
        'Step 2: Standard expense deduction = 50% of annual income, capped at THB 100,000',
        'Step 3: Personal allowance = THB 60,000 a year; the social security paid is also deductible',
        'Step 4: Taxable income = annual income less expense, allowance and social security = THB ' + taxable.toFixed(0),
        'Step 5: PIT bands = 0% to THB 150,000, 5% to 300,000, 10% to 500,000, 15% to 750,000, 20% to 1m, 25% to 3m, 30% to 5m, 35% above',
        'Step 6: Take-home = gross less social security and monthly PIT'
      ];
    }
  },
  {
    id: 'colombia-take-home-salary',
    name: 'Colombia Take-Home Salary Calculator',
    desc: 'Free Colombia net salary calculator: withholding on the Article 383 UVT table after 8% health and pension contributions and the 25% exempt income, every step shown.',
    kw: 'colombia take home salary calculator, retencion en la fuente salarios, salario neto colombia',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (COP)', type: 'number', def: 12000000 }
    ],
    calc: function (v) {
      var s = v.salary;
      var uvt = 52374;
      var aportes = s * 0.08;
      var base = Math.max(0, (s - aportes) * 0.75);
      var uvts = base / uvt;
      var ret = uvts <= 95 ? 0
        : uvts <= 150 ? (uvts - 95) * 0.19
        : uvts <= 360 ? (uvts - 150) * 0.28 + 10.45
        : uvts <= 640 ? (uvts - 360) * 0.33 + 69.25
        : uvts <= 945 ? (uvts - 640) * 0.35 + 161.65
        : uvts <= 2300 ? (uvts - 945) * 0.37 + 268.4
        : (uvts - 2300) * 0.39 + 769.75;
      var tax = ret * uvt;
      var net = s - aportes - tax;
      return {
        result: 'Take-home: COP ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([tax, aportes, net], ['Withholding', 'Health + pension', 'Take-home']),
        extra: 'Health + pension: COP ' + aportes.toFixed(0) + ' | Withholding: COP ' + tax.toFixed(0) + ' | Base: ' + uvts.toFixed(2) + ' UVT (UVT 2026 = COP 52,374) | Art 383 table'
      };
    },
    steps: function (v) {
      var s = v.salary;
      var uvt = 52374;
      var aportes = s * 0.08;
      var base = Math.max(0, (s - aportes) * 0.75);
      var uvts = base / uvt;
      var ret = uvts <= 95 ? 0 : uvts <= 150 ? (uvts - 95) * 0.19 : uvts <= 360 ? (uvts - 150) * 0.28 + 10.45 : uvts <= 640 ? (uvts - 360) * 0.33 + 69.25 : uvts <= 945 ? (uvts - 640) * 0.35 + 161.65 : uvts <= 2300 ? (uvts - 945) * 0.37 + 268.4 : (uvts - 2300) * 0.39 + 769.75;
      return [
        'Step 1: Mandatory contributions = 4% health + 4% pension = 8% of salary = COP ' + aportes.toFixed(0),
        'Step 2: The first 95 UVT of the remaining base is exempt; UVT 2026 = COP 52,374',
        'Step 3: Apply the 25% exempt income (renta exenta) to the remainder, subject to the 40% overall cap',
        'Step 4: Depurated base = COP ' + base.toFixed(0) + ' = ' + uvts.toFixed(2) + ' UVT',
        'Step 5: Article 383 marginal table = 0% to 95 UVT, then 19% to 150, 28% to 360, 33% to 640, 35% to 945, 37% to 2,300, 39% above',
        'Step 6: Withholding = COP ' + (ret * uvt).toFixed(0) + '; take-home = gross less contributions and withholding'
      ];
    }
  },
  {
    id: 'chile-take-home-salary',
    name: 'Chile Take-Home Salary Calculator',
    desc: 'Free Chile net salary calculator: unique second-category tax after 10% AFP, 7% health and 0.6% unemployment insurance, every step shown.',
    kw: 'chile take home salary calculator, impuesto unico segunda categoria, sueldo liquido chile',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (CLP)', type: 'number', def: 1500000 }
    ],
    calc: function (v) {
      var s = v.salary;
      var utm = 71506;
      var afp = s * 0.10;
      var salud = s * 0.07;
      var ces = s * 0.006;
      var base = s - afp - salud - ces;
      var bu = base / utm;
      var tax = bu <= 13.5 ? 0
        : bu <= 30 ? bu * 0.04 - 0.54
        : bu <= 50 ? bu * 0.08 - 1.74
        : bu <= 70 ? bu * 0.135 - 4.49
        : bu <= 90 ? bu * 0.23 - 11.14
        : bu <= 120 ? bu * 0.304 - 17.8
        : bu <= 150 ? bu * 0.35 - 23.32
        : bu * 0.40 - 30.82;
      tax = Math.max(0, tax * utm);
      var net = s - afp - salud - ces - tax;
      return {
        result: 'Take-home: CLP ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([tax, afp + salud + ces, net], ['Income tax', 'AFP + health + cesantia', 'Take-home']),
        extra: 'AFP: CLP ' + afp.toFixed(0) + ' | Health: CLP ' + salud.toFixed(0) + ' | Cesantia: CLP ' + ces.toFixed(0) + ' | Tax: CLP ' + tax.toFixed(0) + ' | UTM 2026 = CLP 71,506'
      };
    },
    steps: function (v) {
      var s = v.salary;
      var utm = 71506;
      var afp = s * 0.10;
      var salud = s * 0.07;
      var ces = s * 0.006;
      var base = s - afp - salud - ces;
      var bu = base / utm;
      var tax = Math.max(0, (bu <= 13.5 ? 0 : bu <= 30 ? bu * 0.04 - 0.54 : bu <= 50 ? bu * 0.08 - 1.74 : bu <= 70 ? bu * 0.135 - 4.49 : bu <= 90 ? bu * 0.23 - 11.14 : bu <= 120 ? bu * 0.304 - 17.8 : bu <= 150 ? bu * 0.35 - 23.32 : bu * 0.40 - 30.82) * utm);
      return [
        'Step 1: AFP pension = 10% of gross = CLP ' + afp.toFixed(0),
        'Step 2: Health = 7% (Fonasa or the minimum for an Isapre plan) = CLP ' + salud.toFixed(0),
        'Step 3: Unemployment insurance = 0.6% on a permanent contract = CLP ' + ces.toFixed(0),
        'Step 4: Taxable base = gross less AFP, health and cesantia = CLP ' + base.toFixed(0) + ' = ' + bu.toFixed(2) + ' UTM',
        'Step 5: Unique second-category table = exempt to 13.5 UTM, then 4% to 30, 8% to 50, 13.5% to 70, 23% to 90, 30.4% to 120, 35% to 150, 40% above',
        'Step 6: Income tax = CLP ' + tax.toFixed(0) + '; take-home = gross less the three contributions and tax'
      ];
    }
  },
  {
    id: 'peru-take-home-salary',
    name: 'Peru Take-Home Salary Calculator',
    desc: 'Free Peru net salary calculator: fifth-category income tax on the 8% to 30% scale after 7 UIT and 13% ONP, every step shown.',
    kw: 'peru take home salary calculator, renta quinta categoria calculadora, sueldo neto peru onp',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (PEN)', type: 'number', def: 5000 }
    ],
    calc: function (v) {
      var s = v.salary;
      var uit = 5350;
      var onp = s * 0.13;
      var annual = s * 12;
      var taxable = Math.max(0, annual - 7 * uit);
      var tu = taxable / uit;
      var tax = (Math.min(tu, 5) * 0.08
        + Math.min(Math.max(tu - 5, 0), 15) * 0.14
        + Math.min(Math.max(tu - 20, 0), 15) * 0.17
        + Math.min(Math.max(tu - 35, 0), 10) * 0.20
        + Math.max(tu - 45, 0) * 0.30) * uit;
      var net = s - onp - tax / 12;
      return {
        result: 'Take-home: PEN ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([tax / 12, onp, net], ['Income tax', 'ONP (13%)', 'Take-home']),
        extra: 'ONP: PEN ' + onp.toFixed(0) + ' | Income tax: PEN ' + tax.toFixed(0) + '/yr | Taxable after 7 UIT: PEN ' + taxable.toFixed(0) + '/yr | UIT 2026 = PEN 5,350'
      };
    },
    steps: function (v) {
      var s = v.salary;
      var uit = 5350;
      var onp = s * 0.13;
      var annual = s * 12;
      var taxable = Math.max(0, annual - 7 * uit);
      var tu = taxable / uit;
      var tax = (Math.min(tu, 5) * 0.08 + Math.min(Math.max(tu - 5, 0), 15) * 0.14 + Math.min(Math.max(tu - 20, 0), 15) * 0.17 + Math.min(Math.max(tu - 35, 0), 10) * 0.20 + Math.max(tu - 45, 0) * 0.30) * uit;
      return [
        'Step 1: ONP pension = 13% of gross (the alternative is an AFP, which varies) = PEN ' + onp.toFixed(0),
        'Step 2: Annualise the salary and subtract 7 UIT, the flat exemption for work income = PEN ' + (7 * uit),
        'Step 3: Taxable income = PEN ' + taxable.toFixed(0) + ' a year = ' + tu.toFixed(2) + ' UIT',
        'Step 4: Fifth-category scale = 8% to 5 UIT, 14% to 20, 17% to 35, 20% to 45, 30% above',
        'Step 5: Annual tax = PEN ' + tax.toFixed(0) + ' (PEN ' + (tax / 12).toFixed(0) + ' a month, withheld progressively by the employer)',
        'Step 6: Take-home = gross less ONP and the monthly income tax'
      ];
    }
  },
  {
    id: 'poland-take-home-salary',
    name: 'Poland Take-Home Salary Calculator',
    desc: 'Free Poland net salary calculator: PIT at 12% and 32% after 13.71% ZUS and the 9% health contribution, every step shown.',
    kw: 'poland take home salary calculator, kalkulator wynagrodzen, net salary poland zus pit',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (PLN)', type: 'number', def: 8000 }
    ],
    calc: function (v) {
      var s = v.salary;
      var zus = s * 0.1371;
      var health = (s - zus) * 0.09;
      var pit = Math.max(0, (s - zus - 300) * 0.12 - 300);
      var net = s - zus - health - pit;
      return {
        result: 'Take-home: PLN ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([pit, zus + health, net], ['PIT', 'ZUS + health', 'Take-home']),
        extra: 'ZUS: PLN ' + zus.toFixed(0) + ' | Health: PLN ' + health.toFixed(0) + ' | PIT: PLN ' + pit.toFixed(0) + ' | 12% band up to PLN 120,000 a year'
      };
    },
    steps: function (v) {
      var s = v.salary;
      var zus = s * 0.1371;
      var health = (s - zus) * 0.09;
      var pit = Math.max(0, (s - zus - 300) * 0.12 - 300);
      return [
        'Step 1: ZUS employee contributions = 13.71% of gross (9.76% pension, 1.5% disability, 2.45% sickness) = PLN ' + zus.toFixed(0),
        'Step 2: Health contribution = 9% of the gross less ZUS = PLN ' + health.toFixed(0),
        'Step 3: The health contribution is no longer deductible from PIT since 2022',
        'Step 4: Taxable base = gross less ZUS less the PLN 300 monthly tax-reducing amount, applied at 12%',
        'Step 5: PIT = PLN ' + pit.toFixed(0) + ' (the 32% rate only starts above PLN 120,000 of annual taxable income)',
        'Step 6: Take-home = gross less ZUS, health and PIT'
      ];
    }
  },
  {
    id: 'romania-take-home-salary',
    name: 'Romania Take-Home Salary Calculator',
    desc: 'Free Romania net salary calculator: 25% CAS, 10% CASS and 10% income tax, every step shown.',
    kw: 'romania take home salary calculator, calculator salariu net, cas cass impozit',
    inputs: [
      { id: 'salary', label: 'Gross Monthly Salary (RON)', type: 'number', def: 8000 }
    ],
    calc: function (v) {
      var s = v.salary;
      var cas = s * 0.25;
      var cass = s * 0.10;
      var tax = (s - cas - cass) * 0.10;
      var net = s - cas - cass - tax;
      return {
        result: 'Take-home: RON ' + net.toFixed(0) + '/mo',
        chart: Charts.donut([tax, cas + cass, net], ['Income tax', 'CAS + CASS', 'Take-home']),
        extra: 'CAS: RON ' + cas.toFixed(0) + ' | CASS: RON ' + cass.toFixed(0) + ' | Income tax: RON ' + tax.toFixed(0) + ' | Combined employee rate 42.5%'
      };
    },
    steps: function (v) {
      var s = v.salary;
      var cas = s * 0.25;
      var cass = s * 0.10;
      var tax = (s - cas - cass) * 0.10;
      return [
        'Step 1: CAS (social insurance) = 25% of gross = RON ' + cas.toFixed(0),
        'Step 2: CASS (health insurance) = 10% of gross = RON ' + cass.toFixed(0),
        'Step 3: The two contributions total 35% and are deducted before income tax',
        'Step 4: Taxable base = gross less CAS and CASS = RON ' + (s - cas - cass).toFixed(0),
        'Step 5: Income tax = 10% of the taxable base = RON ' + tax.toFixed(0),
        'Step 6: Take-home = gross less CAS, CASS and income tax; the employer adds CAM of 2.25% on top'
      ];
    }
  }
,
  {
    id: 'prayer-time',
    name: 'Prayer Time Calculator',
    desc: 'Location-based Islamic prayer times from the sun position and a chosen calculation method.',
    kw: 'prayer time calculator, salah times calculator, fajr maghrib time, islamic prayer times by city',
    inputs: [
{ id: 'city', label: 'City', type: 'select', opts: [{v:'Karachi',l:'Karachi'},{v:'Lahore',l:'Lahore'},{v:'Islamabad',l:'Islamabad'},{v:'Delhi',l:'Delhi'},{v:'Mumbai',l:'Mumbai'},{v:'Dhaka',l:'Dhaka'},{v:'Dubai',l:'Dubai'},{v:'Riyadh',l:'Riyadh'},{v:'Jeddah',l:'Jeddah'},{v:'Istanbul',l:'Istanbul'},{v:'Cairo',l:'Cairo'},{v:'London',l:'London'},{v:'Birmingham',l:'Birmingham'},{v:'Manchester',l:'Manchester'},{v:'New York',l:'New York'},{v:'Toronto',l:'Toronto'},{v:'Sydney',l:'Sydney'},{v:'Kuala Lumpur',l:'Kuala Lumpur'},{v:'Jakarta',l:'Jakarta'}], def: 'Karachi' },
      { id: 'date', label: 'Date', type: 'date', def: '' },
      { id: 'method', label: 'Calculation method', type: 'select', opts: [{v:'MWL',l:'MWL'},{v:'ISNA',l:'ISNA'},{v:'Egypt',l:'Egypt'},{v:'Karachi',l:'Karachi'}], def: 'MWL' },
      { id: 'asr', label: 'Asr shadow length', type: 'select', opts: [{v:'Standard',l:'Standard'},{v:'Hanafi',l:'Hanafi'}], def: 'Standard' }
    ],
    calc: function (v) {
      var C = { 'Karachi': [24.86, 67.01, 5], 'Lahore': [31.55, 74.34, 5], 'Islamabad': [33.69, 73.06, 5], 'Delhi': [28.61, 77.21, 5.5], 'Mumbai': [19.08, 72.88, 5.5], 'Dhaka': [23.81, 90.41, 6], 'Dubai': [25.20, 55.27, 4], 'Riyadh': [24.71, 46.68, 3], 'Jeddah': [21.49, 39.19, 3], 'Istanbul': [41.01, 28.98, 3], 'Cairo': [30.04, 31.24, 2], 'London': [51.51, -0.13, 0], 'Birmingham': [52.49, -1.90, 0], 'Manchester': [53.48, -2.24, 0], 'New York': [40.71, -74.01, -4], 'Toronto': [43.65, -79.38, -4], 'Sydney': [-33.87, 151.21, 10], 'Kuala Lumpur': [3.14, 101.69, 8], 'Jakarta': [-6.21, 106.85, 7] };
      var c = C[v.city];
      if (!c) return { result: 'Select a supported city', chart: '', extra: '' };
      var parts = String(v.date || '').split('-');
      var y = parseInt(parts[0], 10), mo = parseInt(parts[1], 10), da = parseInt(parts[2], 10);
      var d = (y && mo && da) ? new Date(y, mo - 1, da) : new Date();
      var start = new Date(d.getFullYear(), 0, 1);
      var N = Math.floor((d - start) / 86400000) + 1;
      var dec = (23.45 * Math.sin(2 * Math.PI * (284 + N) / 365)) * Math.PI / 180;
      var Bb = 2 * Math.PI * (N - 81) / 364;
      var eot = 9.87 * Math.sin(2 * Bb) - 7.53 * Math.cos(Bb) - 1.5 * Math.sin(Bb);
      var lat = c[0] * Math.PI / 180, lng = c[1], tz = c[2];
      var noon = 12 - lng / 15 + tz - eot / 60;
      function ha(altDeg) { var alt = altDeg * Math.PI / 180; var x = (Math.sin(alt) - Math.sin(lat) * Math.sin(dec)) / (Math.cos(lat) * Math.cos(dec)); if (x < -1 || x > 1) return null; return Math.acos(x) * 180 / Math.PI / 15; }
      var A = ({ 'MWL': [18, 17], 'ISNA': [15, 15], 'Egypt': [19.5, 17.5], 'Karachi': [18, 18] })[v.method] || [18, 17];
      var fajr = ha(-A[0]); var sr = ha(-0.833); var isha = ha(-A[1]);
      var shadow = v.asr === 'Hanafi' ? 2 : 1;
      var asrAlt = Math.atan(1 / (shadow + Math.tan(Math.abs(lat - dec)))) * 180 / Math.PI;
      var asr = ha(asrAlt);
      function hm(h) { if (h == null) return '--:--'; h = ((h % 24) + 24) % 24; var hh = Math.floor(h); var mm = Math.round((h - hh) * 60); if (mm === 60) { mm = 0; hh = (hh + 1) % 24; } return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm; }
      if (fajr == null || isha == null || asr == null) return { result: 'The sun does not reach the required angle on this date at this location.', chart: '', extra: 'Try a different calculation method, a different city, or a season when the sun rises higher.' };
      var fajrT = noon - fajr, sunT = noon - sr, dhuhrT = noon, asrT = noon + asr, maghribT = noon + sr, ishaT = noon + isha;
      return {
        result: 'Fajr ' + hm(fajrT) + ' | Dhuhr ' + hm(dhuhrT) + ' | Asr ' + hm(asrT) + ' | Maghrib ' + hm(maghribT) + ' | Isha ' + hm(ishaT),
        chart: Charts.bar([fajrT, dhuhrT, asrT, maghribT, ishaT], ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']),
        extra: 'Sunrise ' + hm(sunT) + ' | ' + v.city + ' | ' + v.method + ' method, ' + v.asr + ' Asr | Times are approximate and should be confirmed with your local mosque'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Look up the latitude, longitude and timezone for ' + v.city + '.',
        'Step 2: Work out the solar declination and the equation of time for the date.',
        'Step 3: Solar noon = 12 minus longitude divided by 15 plus the timezone offset, corrected by the equation of time.',
        'Step 4: Fajr and Isha use the sun depression angle for the ' + v.method + ' method, and Asr uses the ' + v.asr + ' shadow length.',
        'Step 5: Convert each solar time to local clock time. Confirm the result with your local mosque before relying on it.'
      ];
    }
  },
  {
    id: 'mirath-calculator',
    name: 'Islamic Inheritance Calculator',
    desc: 'Simplified Mirath (faraid) share estimate for spouse, parents, sons and daughters.',
    kw: 'islamic inheritance calculator, mirath calculator, faraid shares calculator, inheritance share islam',
    inputs: [
{ id: 'estate', label: 'Net estate', type: 'number', def: 100000 },
      { id: 'spouse', label: 'Spouse', type: 'select', opts: [{v:'Wife',l:'Wife'},{v:'Husband',l:'Husband'},{v:'None',l:'None'}], def: 'Wife' },
      { id: 'sons', label: 'Sons', type: 'number', def: 1 },
      { id: 'daughters', label: 'Daughters', type: 'number', def: 0 },
      { id: 'father', label: 'Father alive', type: 'checkbox', def: true },
      { id: 'mother', label: 'Mother alive', type: 'checkbox', def: true }
    ],
    calc: function (v) {
      var net = v.estate;
      var sons = Math.max(0, Math.round(v.sons));
      var daughters = Math.max(0, Math.round(v.daughters));
      var hasChildren = sons > 0 || daughters > 0;
      var sp = 0;
      if (v.spouse === 'Husband') sp = hasChildren ? 0.25 : 0.5;
      else if (v.spouse === 'Wife') sp = hasChildren ? 0.125 : 0.25;
      var mother = v.mother ? (hasChildren ? 1 / 6 : 1 / 3) : 0;
      var father = (v.father && sons > 0) ? 1 / 6 : 0;
      var residue = 1 - sp - mother - father;
      if (residue < 0) residue = 0;
      var sSons = 0, sDaughters = 0;
      if (sons > 0) {
        var units = sons * 2 + daughters;
        sSons = residue * (sons * 2) / units;
        sDaughters = residue * daughters / units;
      } else if (daughters > 0) {
        sDaughters = residue;
      } else if (v.father) {
        father += residue;
      }
      var children = sSons + sDaughters;
      return {
        result: 'Spouse ' + (sp * net).toFixed(0) + ' | Children ' + (children * net).toFixed(0),
        chart: Charts.donut([sp, mother, father, children], ['Spouse', 'Mother', 'Father', 'Children']),
        extra: 'Shares: spouse ' + (sp * 100).toFixed(1) + ' percent | mother ' + (mother * 100).toFixed(1) + ' | father ' + (father * 100).toFixed(1) + ' | children ' + (children * 100).toFixed(1) + ' | Simplified model, confirm with a scholar'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Deduct funeral costs and debts first; this tool starts from the net estate you enter.',
        'Step 2: The spouse takes one eighth of the net estate when there are children, or one quarter when there are none.',
        'Step 3: The mother takes one sixth when there are children, or one third when there are none.',
        'Step 4: The father takes one sixth when there are sons, otherwise he is a residuary heir.',
        'Step 5: The children share the residue, with a son receiving twice the share of a daughter.',
        'Step 6: This is a simplified model. Full faraid also covers grandfathers, siblings, awl and radd, so confirm the final shares with a qualified scholar.'
      ];
    }
  },
  {
    id: 'hijri-converter',
    name: 'Hijri Gregorian Date Converter',
    desc: 'Convert between the Gregorian and Hijri (Islamic) calendars using the tabular arithmetic calendar.',
    kw: 'hijri date converter, gregorian to hijri, islamic calendar converter, hijri to gregorian',
    inputs: [
{ id: 'direction', label: 'Direction', type: 'select', opts: [{v:'Gregorian to Hijri',l:'Gregorian to Hijri'},{v:'Hijri to Gregorian',l:'Hijri to Gregorian'}], def: 'Gregorian to Hijri' },
      { id: 'date', label: 'Gregorian date', type: 'date', def: '' },
      { id: 'hy', label: 'Hijri year', type: 'number', def: 1448 },
      { id: 'hm', label: 'Hijri month (1-12)', type: 'number', def: 1 },
      { id: 'hd', label: 'Hijri day (1-30)', type: 'number', def: 1 }
    ],
    calc: function (v) {
      function gregToJD(y, m, d) { if (m < 3) { y--; m += 12; } var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4); return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5; }
      function jdToHijri(jd) { jd += 0.5; var l = jd - 1948440 + 10632; var n = Math.floor((l - 1) / 10631); l = l - 10631 * n + 354; var j = (Math.floor((10985 - l) / 5316)) * (Math.floor((50 * l) / 17719)) + (Math.floor(l / 5670)) * (Math.floor((43 * l) / 15238)); l = l - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) - (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29; var m = Math.floor((24 * l) / 709); var d = l - Math.floor((709 * m) / 24); return { y: 30 * n + j - 30, m: m, d: d }; }
      function hijriToJD(y, m, d) { return Math.floor((11 * y + 3) / 30) + 354 * y + 30 * m - Math.floor((m - 1) / 2) + d + 1948440 - 385; }
      function jdToGreg(jd) { jd += 0.5; var z = Math.floor(jd); var a = z; if (z >= 2299161) { var al = Math.floor((z - 1867216.25) / 36524.25); a = z + 1 + al - Math.floor(al / 4); } var b = a + 1524, c = Math.floor((b - 122.1) / 365.25), d2 = Math.floor(365.25 * c), e = Math.floor((b - d2) / 30.6001); var dy = b - d2 - Math.floor(30.6001 * e); var mo = (e < 14) ? e - 1 : e - 13; var yr = (mo > 2) ? c - 4716 : c - 4715; return { y: yr, m: mo, d: dy }; }
      function pad(n) { return (n < 10 ? '0' : '') + n; }
      if (v.direction === 'Hijri to Gregorian') {
        var hy = Math.round(v.hy), hm = Math.round(v.hm), hd = Math.round(v.hd);
        if (hm < 1 || hm > 12 || hd < 1 || hd > 30) return { result: 'Enter a Hijri month 1-12 and a day 1-30', chart: '', extra: '' };
        var g = jdToGreg(hijriToJD(hy, hm, hd));
        return { result: 'Hijri ' + hy + '-' + pad(hm) + '-' + pad(hd) + ' = Gregorian ' + g.y + '-' + pad(g.m) + '-' + pad(g.d), chart: Charts.gauge(hm, 12), extra: 'Tabular arithmetic Islamic calendar; observed dates can differ by a day depending on moon sighting' };
      }
      var parts = String(v.date || '').split('-');
      var y = parseInt(parts[0], 10), mo = parseInt(parts[1], 10), da = parseInt(parts[2], 10);
      if (!y || !mo || !da) { var now = new Date(); y = now.getFullYear(); mo = now.getMonth() + 1; da = now.getDate(); }
      var h = jdToHijri(gregToJD(y, mo, da));
      return { result: 'Gregorian ' + y + '-' + pad(mo) + '-' + pad(da) + ' = Hijri ' + h.y + '-' + pad(h.m) + '-' + pad(h.d), chart: Charts.gauge(h.m, 12), extra: 'Tabular arithmetic Islamic calendar; observed dates can differ by a day depending on moon sighting' };
    },
    steps: function (v) {
      return [
        'Step 1: Convert the Gregorian date to a Julian day number using the standard civil calendar formula.',
        'Step 2: Shift into the Islamic epoch and work out the 30-year cycle and the year within it.',
        'Step 3: Find the month and day within the Hijri year using the tabular arithmetic rule.',
        'Step 4: The reverse direction uses the same arithmetic in reverse, from the Hijri year, month and day to the Gregorian date.',
        'Step 5: Religious dates are usually confirmed by moon sighting, so observed dates can differ by a day.'
      ];
    }
  }
,
  {
    id: 'gold-price',
    name: 'Gold Price and Value Calculator',
    desc: 'Value gold by weight and price per gram, adding making charges, with tola and gram conversions.',
    kw: 'gold price calculator, gold value calculator, tola to gram gold, gold rate per gram value',
    inputs: [
{ id: 'weightGrams', label: 'Weight (grams)', type: 'number', def: 50 },
      { id: 'pricePerGram', label: 'Gold price per gram', type: 'number', def: 75 },
      { id: 'makingPct', label: 'Making charges (percent)', type: 'number', def: 5 }
    ],
    calc: function (v) {
      var base = v.weightGrams * v.pricePerGram;
      var making = base * v.makingPct / 100;
      var total = base + making;
      var tola = v.weightGrams / 11.6638;
      return {
        result: 'Gold value: ' + total.toFixed(0),
        chart: Charts.bar([base, making], ['Gold value', 'Making charges']),
        extra: 'Metal ' + base.toFixed(0) + ' | Making ' + making.toFixed(0) + ' | ' + v.weightGrams + ' grams = ' + tola.toFixed(2) + ' tola | Confirm the live rate and purity before dealing'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Multiply the weight in grams by the price per gram for the metal value.',
        'Step 2: Add making charges as a percentage of the metal value for jewellery.',
        'Step 3: One tola is about 11.6638 grams, so grams divided by that gives the weight in tola.',
        'Step 4: Purity matters: 24 karat is pure, while 22 karat is about 91.6 percent and 18 karat about 75 percent, so adjust the price accordingly.',
        'Step 5: Gold rates move constantly, so use the current rate and confirm the purity stamp before any sale.'
      ];
    }
  },
  {
    id: 'qurbani-cost',
    name: 'Qurbani Cost Calculator',
    desc: 'Total the cost of Eid al-Adha Qurbani from the number of animals and their prices, including cow shares.',
    kw: 'qurbani cost calculator, eid al adha cost, qurbani animal price, cow share cost eid',
    inputs: [
{ id: 'sheepCount', label: 'Sheep or goats', type: 'number', def: 1 },
      { id: 'sheepPrice', label: 'Price per sheep or goat', type: 'number', def: 350 },
      { id: 'cowShares', label: 'Cow shares (1 to 7 per cow)', type: 'number', def: 0 },
      { id: 'cowSharePrice', label: 'Price per cow share', type: 'number', def: 550 }
    ],
    calc: function (v) {
      var sheep = v.sheepCount * v.sheepPrice;
      var cows = v.cowShares * v.cowSharePrice;
      var total = sheep + cows;
      return {
        result: 'Qurbani total cost: ' + total.toFixed(0),
        chart: Charts.bar([sheep, cows], ['Sheep and goats', 'Cow shares']),
        extra: 'Sheep and goats ' + sheep.toFixed(0) + ' | Cow shares ' + cows.toFixed(0) + ' | One cow serves seven shares and one sheep or goat serves one person'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Multiply the number of sheep and goats by their price.',
        'Step 2: Multiply the number of cow shares by the share price; a cow has seven shares.',
        'Step 3: Add the two for the total Qurbani cost.',
        'Step 4: One sheep or goat counts for one person and a cow share counts for one person, so match the numbers to your household and any intended charity.',
        'Step 5: Prices vary by market and season, so check local rates closer to Eid.'
      ];
    }
  },
  {
    id: 'umrah-cost',
    name: 'Umrah Cost Calculator',
    desc: 'Estimate the total cost of an Umrah trip from package level, travellers, flights, visa, hotel nights and transport.',
    kw: 'umrah cost calculator, umrah package cost, umrah trip budget, umrah expense estimator',
    inputs: [
{ id: 'packageType', label: 'Package level', type: 'select', opts: [{v:'Economy',l:'Economy'},{v:'Standard',l:'Standard'},{v:'Premium',l:'Premium'}], def: 'Economy' },
      { id: 'people', label: 'Travellers', type: 'number', def: 2 },
      { id: 'flights', label: 'Return flight per person', type: 'number', def: 700 },
      { id: 'visa', label: 'Visa and fees per person', type: 'number', def: 150 },
      { id: 'hotelPerNight', label: 'Hotel per night', type: 'number', def: 80 },
      { id: 'nights', label: 'Nights', type: 'number', def: 10 },
      { id: 'transport', label: 'Local transport per person', type: 'number', def: 200 }
    ],
    calc: function (v) {
      var mult = v.packageType === 'Premium' ? 1.8 : v.packageType === 'Standard' ? 1.3 : 1;
      var per = (v.flights + v.visa + v.transport) * mult + v.hotelPerNight * v.nights;
      var total = per * v.people;
      return {
        result: 'Estimated Umrah cost: ' + total.toFixed(0),
        chart: Charts.bar([v.flights * v.people, v.hotelPerNight * v.nights * v.people, v.visa * v.people + v.transport * v.people], ['Flights', 'Hotel', 'Other']),
        extra: v.packageType + ' | Per person ' + per.toFixed(0) + ' | ' + v.people + ' travellers for ' + v.nights + ' nights | Excludes shopping, food and insurance'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Add flights, visa fees and local transport per person.',
        'Step 2: Apply the package multiplier: economy 1.0, standard 1.3, premium 1.8.',
        'Step 3: Add the hotel cost, which is the nightly rate times the nights.',
        'Step 4: Multiply the per-person total by the number of travellers.',
        'Step 5: Prices swing with season, especially in Ramadan, so book early and add a margin for food, shopping and insurance.'
      ];
    }
  },
  {
    id: 'remittance-fee',
    name: 'Remittance Fee Calculator',
    desc: 'See how much a recipient actually gets after flat fees, percentage fees and the exchange-rate margin.',
    kw: 'remittance fee calculator, money transfer cost, exchange rate margin calculator, how much does transfer cost',
    inputs: [
{ id: 'amount', label: 'Amount you send', type: 'number', def: 1000 },
      { id: 'feeFlat', label: 'Flat fee', type: 'number', def: 5 },
      { id: 'feePct', label: 'Transfer fee (percent)', type: 'number', def: 1 },
      { id: 'fxMarginPct', label: 'Exchange rate margin (percent)', type: 'number', def: 2 }
    ],
    calc: function (v) {
      var pctFee = v.amount * v.feePct / 100;
      var fxMargin = v.amount * v.fxMarginPct / 100;
      var cost = v.feeFlat + pctFee + fxMargin;
      var recipient = v.amount - cost;
      return {
        result: 'Recipient receives: ' + recipient.toFixed(0),
        chart: Charts.bar([v.feeFlat, pctFee, fxMargin], ['Flat fee', 'Percent fee', 'FX margin']),
        extra: 'Total cost ' + cost.toFixed(0) + ' | Effective cost ' + (cost / v.amount * 100).toFixed(2) + ' percent | The FX margin is often the hidden cost'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Add the flat fee, which does not change with the amount.',
        'Step 2: Add the percentage fee on the amount sent.',
        'Step 3: Add the exchange-rate margin, the gap between the mid-market rate and the rate offered.',
        'Step 4: Subtract the total cost from the amount to find what the recipient actually gets.',
        'Step 5: The FX margin is often larger than the visible fee, so compare the received amount, not the advertised fee.'
      ];
    }
  }
];

if (typeof module !== 'undefined') module.exports = REGIONAL_TOOLS;
if (typeof window !== 'undefined') window.REGIONAL_TOOLS = REGIONAL_TOOLS;

