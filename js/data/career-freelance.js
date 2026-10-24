// career freelance
const CAREER_TOOLS = [
  { id: 'salary-converter', name: 'Salary Converter', desc: 'Convert between hourly, monthly, annual salary', kw: 'hourly to annual, free online Salary Converter', inputs: [{id:'amount',label:'Amount',type:'number',def:50000},{id:'fromPeriod',label:'From',type:'select',opts:[{v:'hourly',l:'Hourly'},{v:'monthly',l:'Monthly'},{v:'annual',l:'Annual'}],def:'annual'}], calc: function(v) { const h = {hourly:1,monthly:173.33,annual:2080}; const r = v.amount / h[v.fromPeriod]; return { result: 'Hourly: $' + r.toFixed(2) + ' | Monthly: $' + (r*173.33).toFixed(0) + ' | Annual: $' + (r*2080).toFixed(0), chart: null, extra: 'Based on 40hr/week, 52 weeks/yr' }; } },
  { id: 'salary-negotiation', name: 'Salary Negotiation Calculator', desc: 'Calculate lifetime value of negotiating salary', kw: 'free online Salary Negotiation Calculator', inputs: [{id:'offered',label:'Offered ($)',type:'number',def:80000},{id:'asking',label:'Asking ($)',type:'number',def:90000},{id:'years',label:'Years',type:'number',def:5}], calc: function(v) { const diff = v.asking - v.offered; const years = Math.min(Math.max(parseInt(v.years,10)||0, 0), 100); let total = 0; for(let i=0;i<years;i++){total+=diff*Math.pow(1.03,i)} return { result: '$' + total.toFixed(0) + ' extra over ' + years + ' yrs', chart: null, extra: 'Difference: $' + diff + '/yr | Assuming 3% annual raise' }; } },
  { id: 'raise-calculator', name: 'Pay Raise Calculator', desc: 'Calculate new salary after a raise', kw: 'pay raise calculator, free online Pay Raise Calculator', inputs: [{id:'currentSalary',label:'Current Salary ($)',type:'number',def:75000},{id:'raisePct',label:'Raise %',type:'number',def:10}], calc: function(v) { const incr = v.currentSalary * v.raisePct/100; return { result: 'New: $' + (v.currentSalary+incr).toFixed(0), chart: null, extra: 'Increase: $' + incr.toFixed(0) + ' (' + v.raisePct + '%) | Monthly: +$' + (incr/12).toFixed(0) }; } },
  { id: 'tax-bracket', name: 'Income Tax Bracket Calculator', desc: 'Calculate effective tax rate', kw: 'free online Income Tax Bracket Calculator', inputs: [{id:'income',label:'Annual Income ($)',type:'number',def:80000},{id:'deductions',label:'Deductions ($)',type:'number',def:13850}], calc: function(v) { const taxable = Math.max(0, v.income - v.deductions); const brackets = [[11000,0.1],[44725,0.12],[95375,0.22],[182100,0.24],[231250,0.32],[578125,0.35],[Infinity,0.37]]; let tax = 0; let prev = 0; for(const [bracket,rate] of brackets){if(taxable>prev){tax+=(Math.min(taxable,bracket)-prev)*rate;prev=bracket}} return { result: '$' + tax.toLocaleString() + ' tax', chart: null, extra: 'Effective rate: ' + (tax/v.income*100).toFixed(1) + '% | Taxable: $' + taxable.toLocaleString() }; } },
  { id: 'freelance-hourly-rate', name: 'Freelance Hourly Rate', desc: 'Calculate freelance hourly rate', kw: 'freelance hourly rate, free online Freelance Hourly Rate calculator', inputs: [{id:'targetIncome',label:'Desired Annual ($)',type:'number',def:100000},{id:'billablePct',label:'Billable %',type:'select',opts:[{v:'50',l:'50%'},{v:'70',l:'70%'},{v:'80',l:'80%'}],def:'70'}], calc: function(v) { const hrs = 2080 * (v.billablePct/100); const rate = v.targetIncome / hrs; return { result: '$' + rate.toFixed(2) + '/hr', chart: null, extra: 'Billable hrs: ' + hrs.toFixed(0) + '/yr | Daily: $' + (rate*8).toFixed(2) }; } },
  { id: 'freelance-project', name: 'Freelance Project Fee', desc: 'Calculate project-based fees', kw: 'freelance project fee, free online Freelance Project Fee calculator', inputs: [{id:'hours',label:'Estimated Hours',type:'number',def:40},{id:'hourlyRate',label:'Hourly Rate ($)',type:'number',def:75},{id:'expenses',label:'Expenses ($)',type:'number',def:500}], calc: function(v) { return { result: 'Quote: $' + (v.hours*v.hourlyRate+v.expenses).toFixed(0), chart: null, extra: (v.hours*v.hourlyRate).toFixed(0) + ' labor + ' + v.expenses + ' expenses' }; } },
  { id: 'contractor-rate', name: 'Contractor vs Employee Rate', desc: 'Compare contractor vs employee rates', kw: 'contractor vs employee, free online Contractor vs Employee Rate calculator', inputs: [{id:'employeeSalary',label:'Employee Salary ($)',type:'number',def:100000},{id:'benefitsPct',label:'Benefits %',type:'number',def:30}], calc: function(v) { const totalCost = v.employeeSalary * (1+v.benefitsPct/100); const contractorRate = totalCost / 2080; return { result: 'Contractor rate: $' + contractorRate.toFixed(2) + '/hr', chart: null, extra: 'Total cost: $' + totalCost.toFixed(0) + '/yr | Benefits: ' + v.benefitsPct + '% | ' + (contractorRate > 75 ? 'Senior level' : 'Mid level') + ' rate' }; } },
  { id: 'overtime-pay', name: 'Overtime Pay Calculator', desc: 'Calculate overtime pay earnings', kw: 'overtime pay calculator, free online Overtime Pay Calculator', inputs: [{id:'hourlyRate',label:'Hourly Rate ($)',type:'number',def:25},{id:'regularHrs',label:'Regular Hours/Week',type:'number',def:40},{id:'otHrs',label:'Overtime Hours/Week',type:'number',def:10},{id:'otMultiplier',label:'OT Multiplier',type:'select',opts:[{v:'1.5',l:'1.5x (Time & Half)'},{v:'2',l:'2x (Double Time)'}],def:'1.5'}], calc: function(v) { const reg = v.hourlyRate * v.regularHrs; const ot = v.hourlyRate * parseFloat(v.otMultiplier) * v.otHrs; const weekly = reg + ot; return { result: 'Weekly: $' + weekly.toFixed(2), chart: null, extra: 'Regular: $' + reg.toFixed(2) + ' | OT: $' + ot.toFixed(2) + ' | ' + v.otHrs + ' hrs × ' + v.otMultiplier + '×' }; } },
  { id: 'bonus-calc', name: 'Bonus & Commission Calculator', desc: 'Calculate bonus and commission pay', kw: 'bonus commission calculator, free online Bonus & Commission Calculator', inputs: [{id:'baseSalary',label:'Base Salary ($)',type:'number',def:80000},{id:'bonusPct',label:'Bonus %',type:'number',def:15},{id:'salesAmount',label:'Sales Amount ($)',type:'number',def:500000},{id:'commissionRate',label:'Commission Rate %',type:'number',def:5}], calc: function(v) { const bonus = v.baseSalary * v.bonusPct/100; const commission = v.salesAmount * v.commissionRate/100; return { result: 'Bonus: $' + bonus.toFixed(0) + ' | Commission: $' + commission.toFixed(0), chart: null, extra: 'Total comp: $' + (v.baseSalary + bonus + commission).toFixed(0) + ' | ' + v.bonusPct + '% bonus + ' + v.commissionRate + '% commission' }; } },
  { id: 'pay-gap', name: 'Gender Pay Gap Calculator', desc: 'Calculate pay gap between colleagues', kw: 'pay gap calculator, free online Gender Pay Gap Calculator', inputs: [{id:'salaryA',label:'Person A Salary ($)',type:'number',def:80000},{id:'salaryB',label:'Person B Salary ($)',type:'number',def:70000}], calc: function(v) { const gap = Math.abs(v.salaryA - v.salaryB); const pct = (gap / Math.max(v.salaryA,v.salaryB)) * 100; const lower = v.salaryA < v.salaryB ? 'A' : 'B'; return { result: 'Gap: $' + gap.toLocaleString() + ' (' + pct.toFixed(1) + '%)', chart: null, extra: lower + ' earns ' + pct.toFixed(1) + '% less | ' + lower + ' would earn $' + (Math.max(v.salaryA,v.salaryB)).toLocaleString() + ' at parity' }; } },
  { id: '401k-match', name: '401k Match Calculator', desc: 'Calculate 401k employer match value', kw: '401k match calculator, free online 401k Match Calculator', inputs: [{id:'salary',label:'Salary ($)',type:'number',def:80000},{id:'contributionPct',label:'Your Contribution %',type:'number',def:6},{id:'matchPct',label:'Employer Match %',type:'number',def:100},{id:'matchLimit',label:'Match Limit %',type:'number',def:6}], calc: function(v) { const yourContrib = v.salary * v.contributionPct/100; const match = Math.min(v.contributionPct, v.matchLimit) * (v.matchPct/100) * v.salary / 100; return { result: 'Your: $' + yourContrib.toFixed(0) + ' | Match: $' + match.toFixed(0), chart: null, extra: 'Total: $' + (yourContrib+match).toFixed(0) + '/yr | Free money: $' + match.toFixed(0) + ' | Max match at ' + v.matchLimit + '% contribution' }; } },
  { id: 'stock-options', name: 'Stock Options Value Calculator', desc: 'Calculate stock option value', kw: 'stock options calculator, free online Stock Options Value Calculator', inputs: [{id:'options',label:'Number of Options',type:'number',def:10000},{id:'strikePrice',label:'Strike Price ($)',type:'number',def:10},{id:'currentPrice',label:'Current Price ($)',type:'number',def:25}], calc: function(v) { const value = v.options * (v.currentPrice - v.strikePrice); return { result: 'Value: $' + value.toLocaleString(), chart: null, extra: 'Options: ' + v.options.toLocaleString() + ' | Gain per share: $' + (v.currentPrice-v.strikePrice).toFixed(2) + ' | Current price: $' + v.currentPrice }; } },
  { id: 'side-hustle', name: 'Side Hustle Income Calculator', desc: 'Calculate side hustle earnings', kw: 'side hustle calculator, free online Side Hustle Income Calculator', inputs: [{id:'hoursWeek',label:'Hours/Week',type:'number',def:10},{id:'hourlyRate',label:'Rate ($/hr)',type:'number',def:30},{id:'monthsYear',label:'Months/Year',type:'number',def:12}], calc: function(v) { const annual = v.hoursWeek * v.hourlyRate * 52 * v.monthsYear / 12; return { result: 'Annual: $' + annual.toFixed(0), chart: null, extra: 'Monthly: $' + (annual/12).toFixed(0) + ' | Weekly: $' + (v.hoursWeek*v.hourlyRate).toFixed(0) + ' | ' + v.hoursWeek + ' hrs/wk' }; } },
  { id: 'crypto-tax', name: 'Cryptocurrency Tax Calculator', desc: 'Estimate crypto capital gains tax', kw: 'free online Cryptocurrency Tax Calculator', inputs: [{id:'buyPrice',label:'Buy Price ($)',type:'number',def:10000},{id:'sellPrice',label:'Sell Price ($)',type:'number',def:50000},{id:'holdingPeriod',label:'Holding Period',type:'select',opts:[{v:'short',l:'<1 Year (Ordinary Income)'},{v:'long',l:'>1 Year (Capital Gains)'}],def:'long'},{id:'income',label:'Annual Income ($)',type:'number',def:80000}], reverse: { target: function(r) { const m = String(r.result || '').match(/Tax: \$(-?[\d,]+(?:\.\d+)?)/); return m ? parseFloat(m[1].replace(/,/g, '')) : NaN; }, solveFor: { buyPrice: 1, sellPrice: 1 }, variables: {
      buyPrice: { analytical: function(o, v) { const rate = o.holdingPeriod === 'long' ? 0.15 : (o.income > 578125 ? 0.37 : o.income > 231250 ? 0.35 : 0.32); return o.sellPrice - v / rate; }, domain: [0, 1e9] },
      sellPrice: { analytical: function(o, v) { const rate = o.holdingPeriod === 'long' ? 0.15 : (o.income > 578125 ? 0.37 : o.income > 231250 ? 0.35 : 0.32); return o.buyPrice + v / rate; }, domain: [0, 1e9] }
    } },
    calc: function(v) { const gain = v.sellPrice - v.buyPrice; const rate = v.holdingPeriod === 'long' ? 0.15 : (v.income > 578125 ? 0.37 : v.income > 231250 ? 0.35 : 0.32); const tax = gain * rate; return { result: 'Gain: $' + gain.toLocaleString() + ' | Tax: $' + tax.toLocaleString(), chart: null, extra: (v.holdingPeriod==='long'?'Long-term ':'Short-term ') + 'rate: ' + (rate*100) + '% | Net: $' + (gain-tax).toLocaleString() }; } },
  { id: 'career-gap', name: 'Career Gap Impact Calculator', desc: 'Calculate financial impact of a career gap', kw: 'career gap calculator, free online Career Gap Impact Calculator', inputs: [{id:'currentSalary',label:'Current Salary ($)',type:'number',def:100000},{id:'gapYears',label:'Gap Duration (years)',type:'number',def:2},{id:'growthRate',label:'Growth Rate %',type:'number',def:5}], reverse: { solveFor: { currentSalary: 1, gapYears: 1, growthRate: 1 }, variables: {
      currentSalary: { analytical: function(o, v) { const g = o.growthRate/100; return v * (g / (Math.pow(1+g, o.gapYears) - 1)); }, domain: [0, 1e9] },
      gapYears: { analytical: function(o, v) { const g = o.growthRate/100; return Math.log(1 + v*g/o.currentSalary) / Math.log(1+g); }, domain: [0, 50] },
      growthRate: { fn: function(x, o) { const g = x/100; return o.currentSalary * (Math.pow(1+g, o.gapYears) - 1) / g; }, domain: [0.01, 100] }
    } },
    calc: function(v) { const lostEarnings = v.currentSalary * v.gapYears; const lostGrowth = v.currentSalary * (Math.pow(1+v.growthRate/100, v.gapYears)-1)/v.growthRate*100 - v.gapYears*v.currentSalary; return { result: 'Loss: $' + (lostEarnings+lostGrowth).toLocaleString(), chart: null, extra: 'Lost salary: $' + lostEarnings.toLocaleString() + ' | Growth: $' + Math.max(0,lostGrowth).toLocaleString() }; } },
  { id: 'remortgage-calc', name: 'Remortgage Savings Calculator', desc: 'Calculate savings from remortgaging at lower rate', kw: 'remortgage savings calculator, free online Remortgage Savings Calculator', inputs: [{id:'balance',label:'Balance ($)',type:'number',def:250000},{id:'currentRate',label:'Current Rate %',type:'number',def:5},{id:'newRate',label:'New Rate %',type:'number',def:3.5},{id:'yearsLeft',label:'Years Left',type:'number',def:20}], calc: function(v) { const r1=v.currentRate/100/12; const r2=v.newRate/100/12; const n=v.yearsLeft*12; const oldPmt=v.balance*r1*Math.pow(1+r1,n)/(Math.pow(1+r1,n)-1); const newPmt=v.balance*r2*Math.pow(1+r2,n)/(Math.pow(1+r2,n)-1); const saving=(oldPmt-newPmt)*n; return{result:'Save $' + saving.toLocaleString() + ' over ' + v.yearsLeft + 'yrs',chart:null,extra:'Old: $' + oldPmt.toFixed(0) + '/mo | New: $' + newPmt.toFixed(0) + '/mo | Monthly save: $' + (oldPmt-newPmt).toFixed(0)}; } },
  { id: 'mortgage-afford', name: 'Mortgage Affordability Checker', desc: 'Check if you can afford a mortgage', kw: 'mortgage affordability checker calculator, free online Mortgage Affordability Checker calculator', inputs: [{id:'income',label:'Annual Income ($)',type:'number',def:100000},{id:'deposit',label:'Deposit ($)',type:'number',def:50000},{id:'rate',label:'Mortgage Rate %',type:'number',def:4.5},{id:'years',label:'Term Years',type:'number',def:25},{id:'expensesMth',label:'Monthly Expenses ($)',type:'number',def:1500}], calc: function(v) { const maxBorrow=v.income*4.5; const maxMonthly=(v.income/12)*0.28; const r=v.rate/100/12; const n=v.years*12; const maxFromPmt=maxMonthly*(Math.pow(1+r,n)-1)/(r*Math.pow(1+r,n)); const affordable=Math.min(maxBorrow,v.deposit+maxFromPmt); return{result:'Can afford: $' + affordable.toLocaleString(),chart:null,extra:'Max loan: $' + Math.min(maxBorrow,maxFromPmt).toLocaleString() + ' | Deposit: $' + v.deposit.toLocaleString() + ' | Max monthly: $' + maxMonthly.toFixed(0)}; } },
  { id: 'tax-refund', name: 'Tax Refund Estimator', desc: 'Estimate income tax refund', kw: 'free online Tax Refund Estimator', inputs: [{id:'income',label:'Annual Income ($)',type:'number',def:80000},{id:'withheld',label:'Tax Withheld ($)',type:'number',def:15000},{id:'deductions',label:'Deductions ($)',type:'number',def:13850}], calc: function(v) { const taxable=Math.max(0,v.income-v.deductions); const brackets=[[11000,0.1],[44725,0.12],[95375,0.22],[182100,0.24],[231250,0.32],[578125,0.35],[Infinity,0.37]]; let tax=0;let prev=0; for(const [bracket,rate] of brackets){if(taxable>prev){const atThis=Math.min(taxable,bracket)-prev;tax+=atThis*rate;prev=bracket;}} const refund=v.withheld-tax; return{result:'Refund: $' + refund.toLocaleString() + (refund<0?' (You owe)':''),chart:null,extra:'Tax: $' + tax.toLocaleString() + ' | Withheld: $' + v.withheld.toLocaleString() + ' | Taxable: $' + taxable.toLocaleString()}; } },
  { id: 'invoicing-calc', name: 'Invoice Total Calculator', desc: 'Calculate invoice total with tax and discounts', kw: 'invoice total calculator, free online Invoice Total Calculator', inputs: [{id:'subtotal',label:'Subtotal ($)',type:'number',def:1000},{id:'taxRate',label:'Tax Rate %',type:'number',def:10},{id:'discount',label:'Discount %',type:'number',def:5}], calc: function(v) { const disc=v.subtotal*v.discount/100; const afterDisc=v.subtotal-disc; const tax=afterDisc*v.taxRate/100; const total=afterDisc+tax; return{result:'Total: $' + total.toFixed(2),chart:null,extra:'Subtotal: $' + v.subtotal.toFixed(2) + ' | Discount: -$' + disc.toFixed(2) + ' (' + v.discount + '%) | Tax: $' + tax.toFixed(2) + ' (' + v.taxRate + '%)'}; } },
  { id: 'employment-status', name: 'Self-Employed Tax Calculator', desc: 'Calculate self-employment tax', kw: 'free online Self-Employed Tax Calculator', inputs: [{id:'netIncome',label:'Net Income ($)',type:'number',def:80000},{id:'expenses',label:'Business Expenses ($)',type:'number',def:15000}], calc: function(v) { const profit=v.netIncome-v.expenses; const seTax=profit*0.153*0.9235; const ded=seTax/2; const incomeTaxable=profit-ded; const br=[[11600,0.1],[47150,0.12],[100525,0.22],[191950,0.24],[243725,0.32],[609350,0.35],[Infinity,0.37]]; let tax=0;let prev=0;for(const [b,rate] of br){if(incomeTaxable>prev){tax+=(Math.min(incomeTaxable,b)-prev)*rate;prev=b;}} return{result:'SE Tax: $' + seTax.toFixed(0) + ' | Income Tax: $' + tax.toFixed(0),chart:null,extra:'Profit: $' + profit.toLocaleString() + ' | Total tax: $' + (seTax+tax).toLocaleString() + ' | Effective: ' + ((seTax+tax)/profit*100).toFixed(1) + '%'}; } },
  { id: 'commission-plan', name: 'Sales Commission Calculator', desc: 'Calculate sales commission earnings', kw: 'sales commission calculator, free online Sales Commission Calculator', inputs: [{id:'sales',label:'Total Sales ($)',type:'number',def:100000},{id:'baseRate',label:'Base Rate %',type:'number',def:5},{id:'quota',label:'Quota ($)',type:'number',def:50000},{id:'accelerator',label:'Above Quota Rate %',type:'number',def:8}], calc: function(v) { if(v.sales<=v.quota)return{result:'$'+(v.sales*v.baseRate/100).toFixed(2),chart:null,extra:'Base rate: ' + v.baseRate + '% | Sales: $' + v.sales.toLocaleString()}; const base=v.quota*v.baseRate/100; const above=(v.sales-v.quota)*v.accelerator/100; return{result:'$'+(base+above).toFixed(0),chart:null,extra:'Base: $' + base.toFixed(0) + ' at ' + v.baseRate + '% | Accelerator: $' + above.toFixed(0) + ' at ' + v.accelerator + '% | Total: $' + (base+above).toFixed(0)}; } },
  { id: 'freelance-budget', name: 'Freelance Monthly Budget', desc: 'Budget as a freelancer for taxes and expenses', kw: 'freelance budget planner, free online Freelance Monthly Budget calculator', inputs: [{id:'monthlyIncome',label:'Monthly Income ($)',type:'number',def:8000},{id:'taxRate',label:'Tax Rate %',type:'number',def:30},{id:'businessExpenses',label:'Business Expenses ($)',type:'number',def:500},{id:'livingExpenses',label:'Living Expenses ($)',type:'number',def:3000},{id:'savingsGoal',label:'Savings Goal %',type:'number',def:20}], calc: function(v) { const taxSetAside=v.monthlyIncome*v.taxRate/100; const afterTax=v.monthlyIncome-taxSetAside; const afterExpenses=afterTax-v.businessExpenses; const savings=afterExpenses*v.savingsGoal/100; const spending=afterExpenses-savings; return{result:'For spending: $' + spending.toFixed(0) + '/mo',chart:null,extra:'Gross: $' + v.monthlyIncome.toFixed(0) + ' | Tax: -$' + taxSetAside.toFixed(0) + ' | Biz: -$' + v.businessExpenses.toFixed(0) + ' | Savings: $' + savings.toFixed(0) + ' | Living: $' + v.livingExpenses.toFixed(0)}; } },
  { id: 'redundancy-pay', name: 'Redundancy Pay Calculator', desc: 'Calculate statutory redundancy pay', kw: 'redundancy pay calculator, free online Redundancy Pay Calculator', inputs: [{id:'age',label:'Age',type:'number',def:35},{id:'yearsService',label:'Full Years Worked',type:'number',def:8},{id:'weeklyPay',label:'Weekly Pay ($)',type:'number',def:1000}], calc: function(v) { const weekRates=[{maxAge:22,weeks:0.5},{maxAge:41,weeks:1},{maxAge:100,weeks:1.5}]; let total=0;let remaining=v.yearsService;for(const r of weekRates){const capped=v.age<r.maxAge?Math.min(v.yearsService,remaining):0;total+=capped*r.weeks*v.weeklyPay;remaining-=capped;if(remaining<=0)break;} return{result:'Est. pay: $' + total.toLocaleString(),chart:null,extra:'Age: ' + v.age + ' | Service: ' + v.yearsService + ' yrs | Weekly: $' + v.weeklyPay + ' | Max: $' + (v.age<22?v.weeklyPay*0.5*v.yearsService:v.age<41?v.weeklyPay*v.yearsService:v.weeklyPay*1.5*v.yearsService).toLocaleString()}; } },
  { id: 'self-employment-tax', name: 'Self-Employment Tax', desc: 'SE tax and effective rate for freelancers', kw: 'self employment tax calculator freelancer 15.3 percent, free online Self-Employment Tax calculator',
    inputs: [{id:'netIncome',label:'Net Self-Employment Income ($)',type:'number',def:60000},{id:'otherIncome',label:'Other W-2 Income ($)',type:'number',def:0}],
    calc: function(v){var seBase=Math.min(v.netIncome*0.9235,168600);var seTax=seBase*0.153;var deductible=seTax*0.5;var extra=(v.netIncome*0.9235>168600)?(v.netIncome*0.9235-168600)*0.029:0;return{result:'$'+seTax.toFixed(0)+' SE tax',chart:Charts.bar([v.netIncome,seTax],['Income','SE tax']),extra:'Social Security (12.4%) + Medicare (2.9%) | ½ deductible: $'+deductible.toFixed(0)};},
    steps: function(v){var seBase=Math.min(v.netIncome*0.9235,168600);var seTax=seBase*0.153;return['SE income × 92.35% = '+v.netIncome+' × 0.9235 = $'+seBase.toFixed(0),'SE tax = $'+seBase.toFixed(0)+' × 15.3% = $'+seTax.toFixed(0),'Half ($'+(seTax*0.5).toFixed(0)+') is deductible above the line'];} },
  { id: 'freelance-daily', name: 'Freelance Daily Rate', desc: 'Equivalent daily rate from salary', kw: 'freelance daily rate calculator contract equivalent salary',
    inputs: [{id:'salary',label:'Salary ($)',type:'number',def:80000},{id:'benefits',label:'Benefits % (overhead)',type:'number',def:30},{id:'billableDays',label:'Billable Days/Year',type:'number',def:220}],
    calc: function(v){var totalCost=v.salary*(1+v.benefits/100);var daily=totalCost/v.billableDays;return{result:'$'+daily.toFixed(0)+'/day',chart:Charts.bar([v.salary,totalCost],['Salary','Total cost']),extra:'Hourly (8h): $'+(daily/8).toFixed(0)+'/h'};},
    steps: function(v){var totalCost=v.salary*(1+v.benefits/100);var daily=totalCost/v.billableDays;return['Total cost = $'+v.salary+' × 1.'+v.benefits+' = $'+totalCost.toFixed(0),'Daily rate = $'+totalCost.toFixed(0)+' / '+v.billableDays+' = $'+daily.toFixed(0)];} },
  { id: 'monthly-goal', name: 'Freelance Monthly Goal', desc: 'Billable hours needed to hit income goal', kw: 'freelance monthly goal calculator billable hours target',
    inputs: [{id:'goal',label:'Monthly Income Goal ($)',type:'number',def:6000},{id:'rate',label:'Hourly Rate ($)',type:'number',def:75},{id:'utilization',label:'Utilization (billable %)',type:'number',def:70}],
    calc: function(v){var billableHours=v.goal/v.rate;var totalHours=billableHours/(v.utilization/100);var days=billableHours/8;return{result:billableHours.toFixed(0)+' billable hrs',chart:Charts.bar([billableHours,totalHours],['Billable','At desk']),extra:days.toFixed(1)+' full days | ~'+totalHours.toFixed(0)+' hrs at desk'};},
    steps: function(v){var billableHours=v.goal/v.rate;var totalHours=billableHours/(v.utilization/100);return['Billable hours = $'+v.goal+' / $'+v.rate+' = '+billableHours.toFixed(1),'Desk hours at '+v.utilization+'% util = '+totalHours.toFixed(1),'≈ '+(billableHours/8).toFixed(1)+' working days'];} },
  { id: 'retirement-contrib', name: 'Retirement Contribution Impact', desc: 'Effect of extra retirement contributions', kw: 'retirement contribution calculator 401k impact take home, free online Retirement Contribution Impact calculator',
    inputs: [{id:'salary',label:'Annual Salary ($)',type:'number',def:75000},{id:'current',label:'Current Contribution %',type:'number',def:6},{id:'increase',label:'Increase to %',type:'number',def:10},{id:'match',label:'Employer Match %',type:'number',def:50}],
    calc: function(v){var add=v.salary*(v.increase-v.current)/100;var matchAdd=add*v.match/100;var taxSaved=add*0.22;var netImpact=add-taxSaved;return{result:'$'+netImpact.toFixed(0)+'/yr net impact',chart:Charts.bar([add,matchAdd],['Your extra','Employer match']),extra:'Extra saved: $'+add.toFixed(0)+' | Tax saved: ~$'+taxSaved.toFixed(0)};},
    steps: function(v){var add=v.salary*(v.increase-v.current)/100;var matchAdd=add*v.match/100;return['Extra pre-tax = $'+v.salary+' × '+(v.increase-v.current)+'% = $'+add.toFixed(0),'Employer match adds $'+matchAdd.toFixed(0),'Net take-home impact ≈ $'+(add-add*0.22).toFixed(0)+' (22% bracket)'];} },
  { id: 'benefits-value', name: 'Benefits Package Value', desc: 'Real value of your benefits', kw: 'benefits value calculator package compensation insurance, free online Benefits Package Value calculator',
    inputs: [{id:'salary',label:'Base Salary ($)',type:'number',def:70000},{id:'insurance',label:'Insurance Premium Paid ($)',type:'number',def:8000},{id:'retirement',label:'Retirement Match ($)',type:'number',def:3500},{id:'vacation',label:'Paid Vacation Days',type:'number',def:15},{id:'perks',label:'Other Perks ($)',type:'number',def:2000}],
    calc: function(v){var dailyRate=v.salary/260;var vacValue=dailyRate*v.vacation;var total=v.salary+v.insurance+v.retirement+vacValue+v.perks;var uplift=(total/v.salary-1)*100;return{result:'$'+total.toLocaleString(undefined,{maximumFractionDigits:0}),chart:Charts.donut([v.salary,v.insurance,v.retirement,vacValue,v.perks],['Salary','Insurance','Retirement','Vacation','Perks']),extra:'Benefits worth '+uplift.toFixed(0)+'% of salary'};},
    steps: function(v){var dailyRate=v.salary/260;var vacValue=dailyRate*v.vacation;var total=v.salary+v.insurance+v.retirement+vacValue+v.perks;return['Vacation value = $'+dailyRate.toFixed(0)+' × '+v.vacation+' = $'+vacValue.toFixed(0),'Total package = $'+total.toLocaleString(),'Uplift over salary = '+((total/v.salary-1)*100).toFixed(0)+'%'];} },
  { id: 'pto-calc', name: 'PTO Accrual Calculator', desc: 'Paid time off accrual and balance', kw: 'pto calculator accrual paid time off hours days',
    inputs: [{id:'daysPerYear',label:'PTO Days per Year',type:'number',def:15},{id:'accrued',label:'Days Accrued So Far',type:'number',def:5},{id:'hoursPerDay',label:'Hours per Day',type:'number',def:8}],
    calc: function(v){var perMonth=v.daysPerYear/12;var perPay=v.daysPerYear/26;var totalHours=(v.accrued+v.daysPerYear)*v.hoursPerDay;return{result:perMonth.toFixed(1)+' days/month',chart:Charts.bar([perMonth*8,perPay*8],['Monthly hrs','Per pay period hrs']),extra:'Potential balance: '+(v.accrued+v.daysPerYear)+' days = '+totalHours+' hrs'};},
    steps: function(v){var perMonth=v.daysPerYear/12;var perPay=v.daysPerYear/26;return['Monthly accrual = '+v.daysPerYear+' / 12 = '+perMonth.toFixed(1)+' days','Per pay period = '+v.daysPerYear+' / 26 = '+perPay.toFixed(2)+' days','Full balance = '+(v.accrued+v.daysPerYear)+' days'];} },
  { id: 'job-offer-compare', name: 'Job Offer Comparison', desc: 'Compare two job offers by total value', kw: 'job offer compare calculator total compensation two, free online Job Offer Comparison calculator',
    inputs: [{id:'salaryA',label:'Offer A Salary ($)',type:'number',def:80000},{id:'bonusA',label:'Offer A Bonus %',type:'number',def:10},{id:'commuteA',label:'Offer A Commute (min/day)',type:'number',def:30},{id:'salaryB',label:'Offer B Salary ($)',type:'number',def:75000},{id:'bonusB',label:'Offer B Bonus %',type:'number',def:15},{id:'commuteB',label:'Offer B Commute (min/day)',type:'number',def:60}],
    calc: function(v){var valueA=v.salaryA*(1+v.bonusA/100);var valueB=v.salaryB*(1+v.bonusB/100);var commuteValueA=v.commuteA*0.5*260/60;var commuteValueB=v.commuteB*0.5*260/60;var adjA=valueA-commuteValueA;var adjB=valueB-commuteValueB;return{result:adjA>adjB?'Offer A wins':'Offer B wins',chart:Charts.bar([valueA,valueB],['A total','B total']),extra:'A: $'+valueA.toFixed(0)+' → $'+adjA.toFixed(0)+' adj | B: $'+valueB.toFixed(0)+' → $'+adjB.toFixed(0)+' adj'};},
    steps: function(v){var valueA=v.salaryA*(1+v.bonusA/100);var valueB=v.salaryB*(1+v.bonusB/100);var adjA=valueA-v.commuteA*0.5*260/60;var adjB=valueB-v.commuteB*0.5*260/60;return['A total = $'+valueA.toFixed(0)+' | B total = $'+valueB.toFixed(0),'Commute value ($0.5/min, 260 days): A −$'+(v.commuteA*0.5*260/60).toFixed(0)+' | B −$'+(v.commuteB*0.5*260/60).toFixed(0),'Adjusted: A $'+adjA.toFixed(0)+' | B $'+adjB.toFixed(0)];} },
  { id: 'cost-living-adjustment', name: 'Cost of Living Adjustment', desc: 'Salary needed in a new city', kw: 'cost of living calculator salary adjustment city compare, free online Cost of Living Adjustment calculator',
    inputs: [{id:'currentSalary',label:'Current Salary ($)',type:'number',def:80000},{id:'currentIndex',label:'Current City Index (100 = avg)',type:'number',def:100},{id:'newIndex',label:'New City Index',type:'number',def:135}],
    calc: function(v){var required=v.currentSalary*v.newIndex/v.currentIndex;var diff=required-v.currentSalary;return{result:'$'+required.toLocaleString(undefined,{maximumFractionDigits:0}),chart:Charts.bar([v.currentSalary,required],['Current','Needed']),extra:diff>0?'Need $'+diff.toLocaleString(undefined,{maximumFractionDigits:0})+' more ('+(diff/v.currentSalary*100).toFixed(0)+'%)':'Can earn $'+Math.abs(diff).toLocaleString(undefined,{maximumFractionDigits:0})+' less'};},
    steps: function(v){var required=v.currentSalary*v.newIndex/v.currentIndex;return['Required = current × new index / old index','= $'+v.currentSalary+' × '+v.newIndex+' / '+v.currentIndex,'= $'+required.toLocaleString(undefined,{maximumFractionDigits:0})];} },
  { id: 'severance-calc', name: 'Severance Calculator', desc: 'Estimate severance pay', kw: 'severance calculator pay weeks years service, free online Severance Calculator',
    inputs: [{id:'salary',label:'Annual Salary ($)',type:'number',def:90000},{id:'years',label:'Years of Service',type:'number',def:6},{id:'weeksPerYear',label:'Weeks Pay per Year Served',type:'number',def:2}],
    calc: function(v){var weekly=v.salary/52;var weeks=Math.min(v.years,20)*v.weeksPerYear;var total=weekly*weeks;return{result:'$'+total.toLocaleString(undefined,{maximumFractionDigits:0}),chart:Charts.bar([total],['Severance']),extra:weeks+' weeks of pay | Weekly: $'+weekly.toFixed(0)};},
    steps: function(v){var weekly=v.salary/52;var weeks=Math.min(v.years,20)*v.weeksPerYear;var total=weekly*weeks;return['Weekly pay = $'+v.salary+' / 52 = $'+weekly.toFixed(0),'Weeks = min('+v.years+', 20) × '+v.weeksPerYear+' = '+weeks,'Total = $'+weekly.toFixed(0)+' × '+weeks+' = $'+total.toLocaleString(undefined,{maximumFractionDigits:0})];} },
  { id: 'side-hustle-profit', name: 'Side Hustle Profit', desc: 'True hourly profit of a side hustle', kw: 'side hustle profit calculator hourly true cost, free online Side Hustle Profit calculator',
    inputs: [{id:'revenue',label:'Monthly Revenue ($)',type:'number',def:1500},{id:'expenses',label:'Monthly Expenses ($)',type:'number',def:400},{id:'hours',label:'Hours per Month',type:'number',def:30}],
    calc: function(v){var profit=v.revenue-v.expenses;var hourly=profit/v.hours;var margin=profit/v.revenue*100;return{result:'$'+hourly.toFixed(2)+'/hour',chart:Charts.bar([v.revenue,profit],['Revenue','Profit']),extra:'$'+profit.toFixed(0)+'/mo profit ('+margin.toFixed(0)+'% margin)'};},
    steps: function(v){var profit=v.revenue-v.expenses;var hourly=profit/v.hours;return['Profit = $'+v.revenue+' − $'+v.expenses+' = $'+profit.toFixed(0),'True hourly = $'+profit.toFixed(0)+' / '+v.hours+'h = $'+hourly.toFixed(2)];} },
  { id: 'salary-raise-worth', name: 'Salary Raise Worth', desc: 'Net value of a raise over time', kw: 'salary raise calculator net worth 5 years, free online Salary Raise Worth calculator',
    inputs: [{id:'salary',label:'Current Salary ($)',type:'number',def:70000},{id:'raise',label:'Raise %',type:'number',def:7},{id:'years',label:'Years',type:'number',def:5},{id:'taxRate',label:'Tax Rate %',type:'number',def:25}],
    calc: function(v){var newSalary=v.salary*(1+v.raise/100);var add=newSalary-v.salary;var netAdd=add*(1-v.taxRate/100);var fiveYear=0;var s=v.salary;for(var y=0;y<v.years;y++){s*=(1+v.raise/100);fiveYear+=s;}return{result:'+$'+netAdd.toFixed(0)+'/yr net',chart:Charts.bar([v.salary,newSalary],['Now','After raise']),extra:'$'+fiveYear.toLocaleString(undefined,{maximumFractionDigits:0})+' total over '+v.years+' yrs compounding'};},
    steps: function(v){var newSalary=v.salary*(1+v.raise/100);var netAdd=(newSalary-v.salary)*(1-v.taxRate/100);var fiveYear=0;var s=v.salary;for(var y=0;y<v.years;y++){s*=(1+v.raise/100);fiveYear+=s;}return['New salary = $'+v.salary+' × 1.'+v.raise+' = $'+newSalary.toFixed(0),'Net raise after tax = $'+netAdd.toFixed(0),'Cumulative over '+v.years+' yrs ≈ $'+fiveYear.toLocaleString(undefined,{maximumFractionDigits:0})];} }

,
  { id: 'wfh-savings', name: 'Work-from-Home Savings Calculator', desc: 'Money saved by not commuting', kw: 'work from home savings calculator commute remote',
    inputs: [{id:'miles',label:'Round-Trip Commute (miles)',type:'number',def:30},{id:'days',label:'Work Days per Year',type:'number',def:220},{id:'rate',label:'Cost per Mile ($)',type:'number',def:0.655},{id:'meals',label:'Daily Meals/Coffee Saved ($)',type:'number',def:8},{id:'other',label:'Other Daily Savings ($)',type:'number',def:5}],
    calc: function(v){ var fuel=v.miles*v.rate*v.days; var food=v.meals*v.days; var other=v.other*v.days; return{result:'Savings: $'+(fuel+food+other).toFixed(0)+'/yr',chart:Charts.donut([fuel,food,other],['Commute','Meals','Other']),extra:'Commute: $'+fuel.toFixed(0)+' | Meals: $'+food.toFixed(0)+' | Other: $'+other.toFixed(0)+' | Per month: $'+((fuel+food+other)/12).toFixed(0)};},
    steps: function(v){ var fuel=v.miles*v.rate*v.days; var food=v.meals*v.days; var other=v.other*v.days; return['Step 1: Commute = '+v.miles+' mi × $'+v.rate+' × '+v.days+' days = $'+fuel.toFixed(0),'Step 2: Meals = $'+v.meals+' × '+v.days+' = $'+food.toFixed(0),'Step 3: Other = $'+v.other+' × '+v.days+' = $'+other.toFixed(0),'Step 4: Total = $'+(fuel+food+other).toFixed(0)+' per year'];} },

  { id: 'stock-vesting', name: 'Stock Vesting Calculator', desc: 'Shares vested on a cliff-and-graded schedule', kw: 'stock vesting calculator schedule cliff shares',
    inputs: [{id:'shares',label:'Shares Granted',type:'number',def:1000},{id:'years',label:'Vesting Period (years)',type:'number',def:4},{id:'cliff',label:'Cliff (years)',type:'number',def:1},{id:'elapsed',label:'Elapsed (years)',type:'number',def:2.5}],
    calc: function(v){ if(v.years<=0||v.cliff<0||v.elapsed<0) return{result:'Enter valid periods',chart:'',extra:''}; var vested=0; if(v.elapsed>=v.cliff){ var perYear=v.shares/v.years; vested=Math.min(v.shares,v.cliff*perYear+Math.max(0,v.elapsed-v.cliff)*perYear); } return{result:'Vested: '+vested.toFixed(0)+' shares',chart:Charts.donut([vested,v.shares-vested],['Vested','Unvested']),extra:'Unvested: '+(v.shares-vested).toFixed(0)+' | '+(vested/v.shares*100).toFixed(0)+'% of grant | cliff grants the first tranche only after you stay that long'};},
    steps: function(v){ var perYear=v.shares/v.years; var vested=v.elapsed>=v.cliff?Math.min(v.shares,v.cliff*perYear+Math.max(0,v.elapsed-v.cliff)*perYear):0; return['Step 1: Annual vest = '+v.shares+' / '+v.years+' = '+perYear.toFixed(0)+' shares','Step 2: Cliff = '+v.cliff+' year(s) — nothing vests before then','Step 3: At '+v.elapsed+' years: '+(v.elapsed>=v.cliff?'cliff tranche + monthly graded = '+vested.toFixed(0)+' shares':'0 shares (still in cliff)')];} },


  { id: 'vacation-days', name: 'Vacation Accrual Calculator', desc: 'Days banked at an annual rate over months worked', kw: 'vacation accrual calculator pto days earned months worked, free online Vacation Accrual Calculator', inputs: [{id:'rate',label:'Annual PTO Days',type:'number',def:15},{id:'months',label:'Months Worked',type:'number',def:8}], calc: function(v){ if(v.rate<0||v.months<0) return{result:'Enter non-negative values',chart:'',extra:''}; var days=v.rate*v.months/12; return{result:'Accrued: '+days.toFixed(1)+' days',chart:Charts.bar([days,v.rate-days],['Earned','Remaining']),extra:v.rate+' days/year ≈ '+Math.round(v.rate*8)+' hours | Many plans front-load on Jan 1; others accrue per paycheck — check which yours is before a long trip'};}, steps: function(v){ var days=v.rate*v.months/12; return['Formula: accrued = annual days × months ÷ 12','Step 1: '+v.rate+' × '+(v.months/12)+' = '+days.toFixed(1)+' days','Hours vs days matters for partial-day requests — HR systems track one or the other'];} },

  { id: 'timesheet-hours', name: 'Timesheet Decimal Converter', desc: 'Convert hh:mm entries to decimal hours', kw: 'timesheet decimal hours calculator hh mm payroll convert', inputs: [{id:'times',label:'Time entries (comma separated hh:mm)',type:'text',def:'8:30,7:45,8:00'}], calc: function(v){ var parts=v.times.split(',').map(function(s){var m=s.trim().match(/^(\d+):(\d+)$/); return m?+m[1]+ +m[2]/60:NaN;}); if(parts.some(isNaN)) return{result:'Use hh:mm format, e.g. 8:30,7:45',chart:'',extra:''}; var tot=parts.reduce(function(a,b){return a+b;},0); return{result:'Total: '+tot.toFixed(2)+' hours',chart:Charts.bar(parts,parts.map(function(_,i){return 'D'+(i+1);})),extra:'Payroll wants decimals: 8:30 becomes 8.5, never 8.30 — that 0.30 reads as 18 minutes and shortchecks your pay'};}, steps: function(v){ var parts=v.times.split(',').map(function(s){var m=s.trim().match(/^(\d+):(\d+)$/); return m?+m[1]+ +m[2]/60:NaN;}); var tot=parts.reduce(function(a,b){return a+b;},0); return['Step 1: Convert each: '+parts.map(function(p){return p.toFixed(2);}).join(' + '),'Step 2: Sum = '+tot.toFixed(2)+' decimal hours','Minutes ÷ 60 is the whole trick: 15 min = 0.25, 45 min = 0.75'];} },


  { id: 'shift-differential', name: 'Shift Differential Calculator', desc: 'Premium pay for nights or weekends', kw: 'shift differential calculator night shift premium weekend pay, free online Shift Differential Calculator', inputs: [{id:'base',label:'Base Rate ($/h)',type:'number',def:25},{id:'diff',label:'Differential (%)',type:'number',def:15},{id:'hours',label:'Differential Hours',type:'number',def:8}], calc: function(v){ if(v.base<=0||v.diff<0||v.hours<0) return{result:'Enter valid values',chart:'',extra:''}; var rate=v.base*(1+v.diff/100); var extra=rate-v.base; return{result:'Premium Rate: $'+rate.toFixed(2)+'/h',chart:Charts.bar([v.base*v.hours,extra*v.hours],['Base pay','Differential']),extra:'Per shift: +$'+(extra*v.hours).toFixed(2)+' | Over a year of 160 night shifts, a 15% differential adds '+(extra*v.hours*160).toFixed(0)+' dollars — real money worth negotiating'};}, steps: function(v){ var rate=v.base*(1+v.diff/100); var extra=rate-v.base; return['Step 1: Premium rate = '+v.base+' × '+(1+v.diff/100)+' = $'+rate.toFixed(2)+'/h','Step 2: Uplift = $'+extra.toFixed(2)+'/h × '+v.hours+' h = $'+(extra*v.hours).toFixed(2)+' per shift','Differentials typically run 10-15% for nights, more for weekends or hazardous duty'];} }
,
  {
    id: 'canada-crs',
    name: 'Canada CRS Score Estimator',
    desc: 'Simplified Express Entry CRS core points estimate from age, education, language and work.',
    kw: 'canada crs calculator, express entry crs estimator, immigration points calculator canada, pr points canada',
    inputs: [
{ id: 'age', label: 'Age', type: 'number', def: 30 },
      { id: 'education', label: 'Education', type: 'select', opts: [{v:'Secondary',l:'Secondary'},{v:'One-year post-secondary',l:'One-year post-secondary'},{v:'Two-year post-secondary',l:'Two-year post-secondary'},{v:'Bachelors',l:'Bachelors'},{v:'Two or more certificates',l:'Two or more certificates'},{v:'Masters',l:'Masters'},{v:'Doctoral',l:'Doctoral'}], def: 'Bachelors' },
      { id: 'clb', label: 'First official language CLB', type: 'number', def: 9 },
      { id: 'canadianWorkYears', label: 'Canadian skilled work years', type: 'number', def: 1 },
      { id: 'foreignWorkYears', label: 'Foreign skilled work years', type: 'number', def: 3 }
    ],
    calc: function (v) {
      var age = Math.round(v.age);
      var agePts = 0;
      if (age >= 18 && age <= 44) {
        if (age === 18) agePts = 90;
        else if (age === 19) agePts = 95;
        else if (age <= 29) agePts = 110;
        else { var t = { 30: 105, 31: 99, 32: 94, 33: 88, 34: 83, 35: 77, 36: 72, 37: 66, 38: 61, 39: 55, 40: 50, 41: 39, 42: 28, 43: 17, 44: 6 }; agePts = t[age] || 0; }
      }
      var eduPts = ({ 'Secondary': 30, 'One-year post-secondary': 90, 'Two-year post-secondary': 98, 'Bachelors': 120, 'Two or more certificates': 128, 'Masters': 135, 'Doctoral': 150 })[v.education] || 0;
      var clb = Math.round(v.clb);
      var per = clb < 4 ? 0 : clb <= 5 ? 6 : clb === 6 ? 8 : clb === 7 ? 16 : clb === 8 ? 22 : clb === 9 ? 29 : 32;
      var langPts = per * 4;
      var cw = Math.round(v.canadianWorkYears);
      var workPts = cw >= 5 ? 80 : cw >= 4 ? 72 : cw >= 3 ? 64 : cw >= 2 ? 53 : cw >= 1 ? 40 : 0;
      var fw = Math.round(v.foreignWorkYears);
      var foreignPts = fw >= 2 ? 25 : fw >= 1 ? 13 : 0;
      var total = agePts + eduPts + langPts + workPts + foreignPts;
      return {
        result: 'Estimated CRS core: ' + total + ' points',
        chart: Charts.bar([agePts, eduPts, langPts, workPts + foreignPts], ['Age', 'Education', 'Language', 'Work']),
        extra: 'Age ' + agePts + ' | Education ' + eduPts + ' | Language ' + langPts + ' | Canadian work ' + workPts + ' | Foreign work ' + foreignPts + ' | Core human capital only, skill transferability and additional points not included'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Age points peak at 110 for ages 20 to 29 and fall each year after 30.',
        'Step 2: Education points run from 30 for secondary up to 150 for a doctorate.',
        'Step 3: Language points are awarded per ability at CLB level, here ' + v.clb + ' across four abilities.',
        'Step 4: Canadian skilled work experience adds up to 80 points at five years or more; foreign experience adds a smaller amount.',
        'Step 5: Add the parts. The full CRS also includes skill transferability, spouse factors and additional points, so treat this as a core estimate only.'
      ];
    }
  },
  {
    id: 'australia-pr-points',
    name: 'Australia PR Points Calculator',
    desc: 'Simplified skilled migration points estimate for age, English, qualifications and experience.',
    kw: 'australia pr points calculator, skilled migration points, australia immigration points test, subclass 189 points',
    inputs: [
{ id: 'age', label: 'Age', type: 'number', def: 30 },
      { id: 'english', label: 'English level', type: 'select', opts: [{v:'Competent',l:'Competent'},{v:'Proficient',l:'Proficient'},{v:'Superior',l:'Superior'}], def: 'Proficient' },
      { id: 'qualification', label: 'Qualification', type: 'select', opts: [{v:'Diploma',l:'Diploma'},{v:'Bachelors',l:'Bachelors'},{v:'Masters',l:'Masters'},{v:'Doctorate',l:'Doctorate'}], def: 'Bachelors' },
      { id: 'overseasYears', label: 'Overseas skilled work years', type: 'number', def: 5 },
      { id: 'australianYears', label: 'Australian skilled work years', type: 'number', def: 0 },
      { id: 'partner', label: 'Partner status', type: 'select', opts: [{v:'Single',l:'Single'},{v:'Partner skilled',l:'Partner skilled'},{v:'Partner not skilled',l:'Partner not skilled'}], def: 'Single' }
    ],
    calc: function (v) {
      var age = Math.round(v.age);
      var agePts = (age >= 25 && age <= 32) ? 30 : (age >= 18 && age <= 24) ? 25 : (age >= 33 && age <= 39) ? 25 : (age >= 40 && age <= 44) ? 15 : 0;
      var engPts = v.english === 'Superior' ? 20 : v.english === 'Proficient' ? 10 : 0;
      var qualPts = ({ 'Diploma': 10, 'Bachelors': 15, 'Masters': 15, 'Doctorate': 20 })[v.qualification] || 0;
      var ov = Math.round(v.overseasYears);
      var ovPts = ov >= 8 ? 15 : ov >= 5 ? 10 : ov >= 3 ? 5 : 0;
      var au = Math.round(v.australianYears);
      var auPts = au >= 8 ? 20 : au >= 5 ? 15 : au >= 3 ? 10 : au >= 1 ? 5 : 0;
      var partnerPts = v.partner === 'Partner not skilled' ? 0 : 10;
      var total = agePts + engPts + qualPts + ovPts + auPts + partnerPts;
      return {
        result: 'Estimated points: ' + total,
        chart: Charts.bar([agePts, engPts, qualPts, ovPts + auPts, partnerPts], ['Age', 'English', 'Qualification', 'Experience', 'Partner']),
        extra: 'Age ' + agePts + ' | English ' + engPts + ' | Qualification ' + qualPts + ' | Overseas ' + ovPts + ' | Australian ' + auPts + ' | Partner ' + partnerPts + ' | The skilled visa threshold is generally 65 points'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Age awards 30 points between 25 and 32, 25 points at 18 to 24 and 33 to 39, and 15 points at 40 to 44.',
        'Step 2: English awards 10 points for proficient and 20 for superior.',
        'Step 3: Qualifications award 10 for a diploma, 15 for a degree or masters, and 20 for a doctorate.',
        'Step 4: Skilled work experience awards points by years, with Australian experience worth more than overseas.',
        'Step 5: Partner and single status add 10 points. Add the parts, and remember the visa threshold is generally 65 points.'
      ];
    }
  }
,
  {
    id: 'career-break-runway',
    name: 'Career Break Runway Calculator',
    desc: 'See how many months your savings last on a career break or sabbatical and the gap if the break is longer.',
    kw: 'career break calculator, sabbatical runway calculator, how long will savings last, career gap fund',
    inputs: [
{ id: 'monthlyExpenses', label: 'Monthly expenses', type: 'number', def: 2000 },
      { id: 'currentSavings', label: 'Savings set aside', type: 'number', def: 10000 },
      { id: 'monthlyIncome', label: 'Income during break', type: 'number', def: 0 },
      { id: 'plannedMonths', label: 'Planned break (months)', type: 'number', def: 12 }
    ],
    calc: function (v) {
      var net = v.monthlyExpenses - v.monthlyIncome;
      if (net <= 0) return { result: 'No drawdown: income covers expenses', chart: Charts.gauge(100, 100), extra: 'Your income during the break meets or beats your expenses' };
      var runway = v.currentSavings / net;
      var shortfall = Math.max(0, v.plannedMonths * net - v.currentSavings);
      return {
        result: 'Runway ' + runway.toFixed(1) + ' months | Shortfall at ' + v.plannedMonths + ' months: ' + shortfall.toFixed(0),
        chart: Charts.bar([runway, v.plannedMonths], ['Runway', 'Planned break']),
        extra: 'Net monthly drawdown ' + net.toFixed(0) + ' | ' + (shortfall > 0 ? 'Top up savings before you start' : 'Your fund covers the planned break') + ' | Excludes one-off costs and investment returns'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Net monthly drawdown equals monthly expenses minus any income during the break.',
        'Step 2: Runway in months equals savings divided by the net drawdown.',
        'Step 3: Compare the runway with the planned break length.',
        'Step 4: If the planned break is longer, shortfall equals planned months times net drawdown minus savings.',
        'Step 5: Add a buffer for one-off costs such as travel, healthcare and re-entry, since this model only counts regular monthly spending.'
      ];
    }
  },
  {
    id: 'ats-resume-score',
    name: 'ATS Resume Score Checker',
    desc: 'Score a resume out of 100 for applicant tracking system friendliness from keywords, format and structure.',
    kw: 'ats resume score, ats checker, resume score calculator, will my resume pass ats',
    inputs: [
{ id: 'keywordMatchPct', label: 'Job keyword match (percent)', type: 'number', def: 70 },
      { id: 'quantifiedBulletsPct', label: 'Bullets with numbers (percent)', type: 'number', def: 60 },
      { id: 'hasContactInfo', label: 'Clear contact details', type: 'checkbox', def: true },
      { id: 'hasSkillsSection', label: 'Dedicated skills section', type: 'checkbox', def: true },
      { id: 'wordCount', label: 'Resume word count', type: 'number', def: 600 },
      { id: 'usesTablesGraphics', label: 'Uses tables, columns or graphics', type: 'checkbox', def: false },
      { id: 'fileFormat', label: 'File format', type: 'select', opts: [{v:'PDF (text-based)',l:'PDF (text-based)'},{v:'DOCX',l:'DOCX'},{v:'PDF (scanned image)',l:'PDF (scanned image)'}], def: 'PDF (text-based)' }
    ],
    calc: function (v) {
      var score = 0;
      score += Math.min(40, v.keywordMatchPct * 0.4);
      score += Math.min(30, v.quantifiedBulletsPct * 0.3);
      if (v.hasContactInfo) score += 10;
      if (v.hasSkillsSection) score += 10;
      if (v.wordCount >= 400 && v.wordCount <= 800) score += 10;
      if (v.fileFormat !== 'PDF (scanned image)') score += 10;
      if (v.usesTablesGraphics) score -= 10;
      score = Math.max(0, Math.min(100, Math.round(score)));
      return {
        result: 'ATS score: ' + score + ' out of 100',
        chart: Charts.gauge(score, 100),
        extra: 'Keywords ' + Math.min(40, v.keywordMatchPct * 0.4).toFixed(0) + ' | Quantified bullets ' + Math.min(30, v.quantifiedBulletsPct * 0.3).toFixed(0) + ' | Format ' + (v.fileFormat === 'PDF (scanned image)' ? 'scanned PDF, a common ATS failure' : 'text readable') + ' | Aim for 80 or more'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Keyword match adds up to 40 points, the single biggest factor.',
        'Step 2: Bullets that contain numbers add up to 30 points.',
        'Step 3: Clear contact details and a dedicated skills section add 10 points each.',
        'Step 4: A word count between 400 and 800 adds 10 points, and a text-readable file adds 10 more.',
        'Step 5: Tables, columns or graphics subtract 10 points because many systems cannot parse them. Aim for 80 or more.'
      ];
    }
  },
  {
    id: 'salary-negotiation-range',
    name: 'Salary Negotiation Range Calculator',
    desc: 'Build an opening, target and walk-away salary range from market data, experience and offer strength.',
    kw: 'salary negotiation calculator, salary range calculator, how much to ask for salary, negotiation target salary',
    inputs: [
{ id: 'currentSalary', label: 'Current salary', type: 'number', def: 60000 },
      { id: 'marketLow', label: 'Market low', type: 'number', def: 65000 },
      { id: 'marketMedian', label: 'Market median', type: 'number', def: 75000 },
      { id: 'marketHigh', label: 'Market high', type: 'number', def: 85000 },
      { id: 'yearsExperience', label: 'Years relevant experience', type: 'number', def: 5 },
      { id: 'offerStrength', label: 'Your leverage', type: 'select', opts: [{v:'Strong',l:'Strong'},{v:'Moderate',l:'Moderate'},{v:'Weak',l:'Weak'}], def: 'Strong' }
    ],
    calc: function (v) {
      var target = Math.min(v.marketHigh, Math.round(v.marketMedian * (1 + 0.02 * v.yearsExperience)));
      var sf = v.offerStrength === 'Strong' ? 1 : v.offerStrength === 'Moderate' ? 0.5 : 0;
      var opening = Math.round(target * (1 + 0.08 * sf));
      return {
        result: 'Target: ' + target + ' | Open at: ' + opening,
        chart: Charts.bar([v.marketLow, target, opening], ['Walk-away', 'Target', 'Opening']),
        extra: 'Walk away below ' + v.marketLow + ' | Market median ' + v.marketMedian + ' | Current ' + v.currentSalary + ' | Ask for the whole package, not just base'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Start from the market median for the role and location.',
        'Step 2: Add about two percent per year of relevant experience, capped at the market high.',
        'Step 3: That gives your target. Your opening ask sits above the target by up to eight percent depending on leverage.',
        'Step 4: Your walk-away is the market low, the figure below which you would rather not accept.',
        'Step 5: Anchor at the opening, justify it with results, and negotiate the whole package including bonus, equity, leave and flexibility.'
      ];
    }
  }
,
  {
    id: 'us-priority-date',
    name: 'US Visa Priority Date Wait Estimator',
    desc: 'Estimate the remaining wait for a US immigrant visa from your priority date and the current published cutoff.',
    kw: 'us visa priority date calculator, green card wait time estimator, visa bulletin priority date, immigrant visa backlog',
    inputs: [
{ id: 'category', label: 'Preference category', type: 'select', opts: [{v:'Family F1',l:'Family F1'},{v:'Family F2A',l:'Family F2A'},{v:'Family F2B',l:'Family F2B'},{v:'Family F3',l:'Family F3'},{v:'Family F4',l:'Family F4'},{v:'Employment EB-2',l:'Employment EB-2'},{v:'Employment EB-3',l:'Employment EB-3'}], def: 'Family F4' },
      { id: 'priorityYear', label: 'Your priority date year', type: 'number', def: 2025 },
      { id: 'currentCutoffYear', label: 'Current cutoff year (visa bulletin)', type: 'number', def: 2018 }
    ],
    calc: function (v) {
      var behind = Math.max(0, v.priorityYear - v.currentCutoffYear);
      if (behind === 0) {
        return { result: 'Priority date is current', chart: Charts.gauge(0, 20), extra: v.category + ' | Your priority date is at or before the published cutoff, so you may be able to progress' };
      }
      return {
        result: 'Estimated remaining wait: approximately ' + behind + ' years',
        chart: Charts.gauge(behind, 20),
        extra: v.category + ' | Your priority date is ' + behind + ' years behind the published cutoff | Cutoffs move forward unevenly and can retrogression, so treat this as a rough estimate'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Find the cutoff priority date for your category and country in the current visa bulletin.',
        'Step 2: Compare your priority date with that cutoff year.',
        'Step 3: If your priority date is earlier than the cutoff, you are current; otherwise the gap estimates the remaining wait.',
        'Step 4: Watch the final action date and the filing date, which can differ, and note that some countries have separate, longer queues.',
        'Step 5: Cutoffs move unevenly and can go backwards. This is an educational estimate, not legal or official guidance. Confirm with the visa bulletin.'
      ];
    }
  },
  {
    id: 'interview-to-offer-tracker',
    name: 'Interview to Offer Conversion Tracker',
    desc: 'Track job search conversion rates from applications to interviews to offers.',
    kw: 'interview to offer calculator, job search conversion rate, application success rate, job hunt tracker',
    inputs: [
{ id: 'applications', label: 'Applications sent', type: 'number', def: 50 },
      { id: 'interviews', label: 'Interviews', type: 'number', def: 10 },
      { id: 'offers', label: 'Offers', type: 'number', def: 1 }
    ],
    calc: function (v) {
      var apps = Math.max(1, v.applications);
      var interviewRate = v.interviews / apps * 100;
      var offerRate = v.offers / apps * 100;
      var perInterview = v.interviews > 0 ? v.offers / v.interviews * 100 : 0;
      return {
        result: 'Offer rate: ' + offerRate.toFixed(1) + ' percent (' + v.offers + ' of ' + v.applications + ' applications)',
        chart: Charts.bar([v.applications, v.interviews, v.offers], ['Applications', 'Interviews', 'Offers']),
        extra: 'Interview rate ' + interviewRate.toFixed(1) + ' percent | Offer per interview ' + perInterview.toFixed(1) + ' percent | A healthy funnel usually narrows at each stage'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Count applications, interviews and offers over a fixed period.',
        'Step 2: Interview rate equals interviews divided by applications.',
        'Step 3: Offer rate equals offers divided by applications.',
        'Step 4: Offer per interview shows how well you convert once you are in the room.',
        'Step 5: A low interview rate points at the resume and targeting; a low offer per interview points at the interview itself.'
      ];
    }
  }
];
if (typeof module !== 'undefined') module.exports = CAREER_TOOLS;
if (typeof window !== 'undefined') window.CAREER_TOOLS = CAREER_TOOLS;

