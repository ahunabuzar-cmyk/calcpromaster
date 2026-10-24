// Business calculators (18)
const BUSINESS_TOOLS = [
  { id: 'business-roi', name: 'Business ROI', desc: 'Calculate return on investment', kw: 'marketing roi calculator with campaign cost',
    inputs: [{id:'revenue',label:'Revenue',type:'number',def:100000,slider:{min:10000,max:500000,step:5000}},{id:'cost',label:'Total Cost',type:'number',def:75000,slider:{min:5000,max:400000,step:5000}}],
    calc: function(v) { const profit = v.revenue - v.cost; const roi = profit / v.cost * 100; return { result: 'ROI: ' + roi.toFixed(2) + '%', chart: Charts.donut([v.cost, profit], ['Cost','Profit']), extra: 'Profit: $' + profit.toFixed(2) }; },
    steps: function(v) { const p=v.revenue-v.cost; const roi=p/v.cost*100; return ['Formula: ROI = (Revenue - Cost) / Cost × 100','Step 1: Profit = $'+v.revenue+' - $'+v.cost+' = $'+p.toFixed(2),'Step 2: ROI = $'+p.toFixed(2)+' / $'+v.cost+' × 100 = '+roi.toFixed(2)+'%']; } },
  { id: 'profit-margin', name: 'Profit Margin Calculator', desc: 'Calculate profit margin', kw: 'profit margin calculator with cost and revenue',
    inputs: [{id:'revenue',label:'Revenue',type:'number',def:50000,slider:{min:5000,max:300000,step:5000}},{id:'cost',label:'Cost',type:'number',def:35000,slider:{min:1000,max:250000,step:5000}}],
    calc: function(v) { const profit = v.revenue - v.cost; const margin = profit / v.revenue * 100; return { result: 'Margin: ' + margin.toFixed(2) + '%', chart: Charts.donut([v.cost, profit], ['Cost','Profit']), extra: 'Profit: $' + profit.toFixed(2) }; },
    steps: function(v) { const p=v.revenue-v.cost; const m=p/v.revenue*100; return ['Formula: Margin = (Revenue - Cost) / Revenue × 100','Step 1: Profit = $'+v.revenue+' - $'+v.cost+' = $'+p.toFixed(2),'Step 2: Margin = $'+p.toFixed(2)+' / $'+v.revenue+' × 100 = '+m.toFixed(2)+'%']; } },
  { id: 'ltv', name: 'Customer LTV', desc: 'Calculate customer lifetime value', kw: 'customer ltv calculator, free online Customer LTV calculator',
    inputs: [{id:'arpu',label:'Monthly Revenue/User',type:'number',def:50},{id:'lifespan',label:'Customer Lifespan (months)',type:'number',def:24}],
    calc: function(v) { const ltv = v.arpu * v.lifespan; return { result: 'LTV: $' + ltv.toFixed(2), chart: Charts.gauge(ltv, 5000), extra: 'ARPU: $' + v.arpu }; },
    steps: function(v) { const ltv=v.arpu*v.lifespan; return ['Formula: LTV = ARPU × Customer Lifespan','Step 1: LTV = $'+v.arpu+'/mo × '+v.lifespan+' months','Step 2: LTV = $'+ltv.toFixed(2)]; } },
  { id: 'cac', name: 'CAC Calculator', desc: 'Customer acquisition cost', kw: 'customer acquisition cost, free online CAC Calculator',
    inputs: [{id:'spend',label:'Marketing Spend',type:'number',def:10000},{id:'customers',label:'New Customers',type:'number',def:100}],
    calc: function(v) { const cac = v.spend / v.customers; return { result: 'CAC: $' + cac.toFixed(2), chart: Charts.gauge(cac, 500), extra: 'Spend: $' + v.spend }; },
    steps: function(v) { const cac=v.spend/v.customers; return ['Formula: CAC = Marketing Spend / New Customers','Step 1: CAC = $'+v.spend+' / '+v.customers,'Step 2: CAC = $'+cac.toFixed(2)]; } },
  { id: 'conversion-rate', name: 'Conversion Rate', desc: 'Calculate conversion rate', kw: 'conversion rate calculator, free online Conversion Rate calculator',
    inputs: [{id:'visitors',label:'Total Visitors',type:'number',def:5000},{id:'conversions',label:'Conversions',type:'number',def:250}],
    calc: function(v) { const cr = v.conversions / v.visitors * 100; return { result: 'Conversion Rate: ' + cr.toFixed(2) + '%', chart: Charts.donut([v.conversions, v.visitors - v.conversions], ['Converted','Not']), extra: v.conversions + ' / ' + v.visitors }; },
    steps: function(v) { const cr=v.conversions/v.visitors*100; return ['Formula: CR = (Conversions / Visitors) × 100','Step 1: CR = '+v.conversions+' / '+v.visitors+' × 100','Step 2: CR = '+cr.toFixed(2)+'%']; } },
  { id: 'churn', name: 'Churn Rate Calculator', desc: 'Calculate customer churn', kw: 'churn rate calculator, free online Churn Rate Calculator',
    inputs: [{id:'start',label:'Starting Customers',type:'number',def:1000},{id:'lost',label:'Lost Customers',type:'number',def:50}],
    calc: function(v) { const churn = v.lost / v.start * 100; return { result: 'Churn: ' + churn.toFixed(2) + '%', chart: Charts.donut([v.lost, v.start - v.lost], ['Lost','Retained']), extra: 'Retained: ' + (v.start - v.lost) }; },
    steps: function(v) { const c=v.lost/v.start*100; return ['Formula: Churn = (Lost Customers / Starting Customers) × 100','Step 1: Churn = '+v.lost+' / '+v.start+' × 100','Step 2: Churn = '+c.toFixed(2)+'%']; } },
  { id: 'roas', name: 'ROAS Calculator', desc: 'Return on ad spend', kw: 'return on ad spend, free online ROAS Calculator',
    inputs: [{id:'revenue',label:'Ad Revenue',type:'number',def:5000},{id:'spend',label:'Ad Spend',type:'number',def:1000}],
    calc: function(v) { const roas = v.revenue / v.spend; return { result: 'ROAS: ' + roas.toFixed(2) + 'x', chart: Charts.gauge(roas, 10), extra: 'Profit: $' + (v.revenue - v.spend).toFixed(2) }; },
    steps: function(v) { const r=v.revenue/v.spend; return ['Formula: ROAS = Ad Revenue / Ad Spend','Step 1: ROAS = $'+v.revenue+' / $'+v.spend,'Step 2: ROAS = '+r.toFixed(2)+'x']; } },
  { id: 'burn-rate', name: 'Burn Rate Calculator', desc: 'Calculate startup burn rate', kw: 'burn rate calculator, free online Burn Rate Calculator',
    inputs: [{id:'cash',label:'Cash Balance',type:'number',def:500000},{id:'monthly',label:'Monthly Expenses',type:'number',def:50000}],
    calc: function(v) { const runway = v.cash / v.monthly; return { result: 'Runway: ' + runway.toFixed(0) + ' months', chart: Charts.gauge(runway, 24), extra: 'Monthly burn: $' + v.monthly }; },
    steps: function(v) { const r=v.cash/v.monthly; return ['Formula: Runway = Cash / Monthly Burn','Step 1: Runway = $'+v.cash+' / $'+v.monthly,'Step 2: Runway = '+r.toFixed(0)+' months']; } },
  { id: 'mrr', name: 'MRR Calculator', desc: 'Calculate monthly recurring revenue', kw: 'monthly recurring revenue, free online MRR Calculator',
    inputs: [{id:'users',label:'Active Subscribers',type:'number',def:500},{id:'price',label:'Monthly Price',type:'number',def:20}],
    calc: function(v) { const mrr = v.users * v.price; return { result: 'MRR: $' + mrr.toFixed(2), chart: Charts.gauge(mrr, 50000), extra: 'ARR: $' + (mrr * 12).toFixed(2) }; },
    steps: function(v) { const mrr=v.users*v.price; return ['Formula: MRR = Active Subscribers × Monthly Price','Step 1: MRR = '+v.users+' × $'+v.price,'Step 2: MRR = $'+mrr.toFixed(2)+'/month','Step 3: ARR = $'+(mrr*12).toFixed(2)+'/year']; } },
  { id: 'nps', name: 'Net Promoter Score (NPS) Calculator', desc: 'Calculate Net Promoter Score', kw: 'net promoter score, free online Net Promoter Score (NPS) Calculator',
    inputs: [{id:'promoters',label:'Promoters',type:'number',def:60},{id:'passives',label:'Passives',type:'number',def:20},{id:'detractors',label:'Detractors',type:'number',def:20}],
    calc: function(v) { const total = v.promoters + v.passives + v.detractors; const nps = (v.promoters - v.detractors) / total * 100; return { result: 'NPS: ' + nps.toFixed(0), chart: Charts.donut([v.promoters, v.passives, v.detractors], ['Promoters','Passives','Detractors']), extra: nps > 50 ? 'Excellent' : nps > 0 ? 'Good' : 'Needs improvement' }; },
    steps: function(v) { const t=v.promoters+v.passives+v.detractors; const nps=(v.promoters-v.detractors)/t*100; return ['Formula: NPS = ((Promoters - Detractors) / Total) × 100','Step 1: Total = '+v.promoters+'+'+v.passives+'+'+v.detractors+' = '+t,'Step 2: NPS = ('+v.promoters+' - '+v.detractors+') / '+t+' × 100 = '+nps.toFixed(0)]; } },
  { id: 'freelance-rate', name: 'Freelance Rate Calculator', desc: 'Calculate hourly freelance rate', kw: 'freelance rate calculator, free online Freelance Rate Calculator',
    inputs: [{id:'desired',label:'Desired Annual Income',type:'number',def:80000},{id:'hours',label:'Billable Hours/Week',type:'number',def:25},{id:'weeks',label:'Weeks/Year',type:'number',def:48}],
    calc: function(v) { const rate = v.desired / (v.hours * v.weeks); return { result: 'Hourly Rate: $' + rate.toFixed(2), chart: Charts.gauge(rate, 200), extra: 'Billable hours: ' + (v.hours * v.weeks) }; },
    steps: function(v) { const r=v.desired/(v.hours*v.weeks); return ['Step 1: Billable hours = '+v.hours+' × '+v.weeks+' = '+(v.hours*v.weeks),'Step 2: Hourly rate = $'+v.desired+' / '+(v.hours*v.weeks)+' = $'+r.toFixed(2)]; } },
  { id: 'pricing', name: 'Pricing Calculator', desc: 'Calculate optimal price', kw: 'free pricing calculator, free online Pricing Calculator',
    inputs: [{id:'cost',label:'Unit Cost',type:'number',def:10},{id:'margin',label:'Desired Margin (%)',type:'number',def:40}],
    calc: function(v) { const price = v.cost / (1 - v.margin / 100); const profit = price - v.cost; return { result: 'Price: $' + price.toFixed(2), chart: Charts.donut([v.cost, profit], ['Cost','Profit']), extra: 'Profit/unit: $' + profit.toFixed(2) }; },
    steps: function(v) { const p=v.cost/(1-v.margin/100); return ['Formula: Price = Cost / (1 - Margin%)','Step 1: Price = $'+v.cost+' / (1 - '+(v.margin/100)+')','Step 2: Price = $'+v.cost+' / '+(1-v.margin/100).toFixed(2)+' = $'+p.toFixed(2)]; } },
  { id: 'inventory', name: 'Inventory Turnover', desc: 'Calculate inventory turnover ratio', kw: 'inventory turnover calculator, free online Inventory Turnover calculator',
    inputs: [{id:'cogs',label:'Cost of Goods Sold',type:'number',def:200000},{id:'avgInventory',label:'Average Inventory',type:'number',def:50000}],
    calc: function(v) { const turnover = v.cogs / v.avgInventory; return { result: 'Turnover: ' + turnover.toFixed(2) + 'x', chart: Charts.gauge(turnover, 20), extra: 'Days in inventory: ' + (365 / turnover).toFixed(0) }; },
    steps: function(v) { const t=v.cogs/v.avgInventory; return ['Formula: Turnover = COGS / Average Inventory','Step 1: Turnover = $'+v.cogs+' / $'+v.avgInventory,'Step 2: Turnover = '+t.toFixed(2)+'x','Step 3: Days in inventory = 365 / '+t.toFixed(2)+' = '+(365/t).toFixed(0)+' days']; } },
  { id: 'break-even-revenue', name: 'Break-Even Revenue', desc: 'Calculate break-even revenue', kw: 'break even revenue, free online Break-Even Revenue calculator',
    inputs: [{id:'fixed',label:'Fixed Costs',type:'number',def:50000},{id:'cm',label:'Contribution Margin (%)',type:'number',def:40}],
    calc: function(v) { const be = v.fixed / (v.cm / 100); return { result: 'Break-Even Revenue: $' + be.toFixed(2), chart: Charts.gauge(be, 200000), extra: 'Margin: ' + v.cm + '%' }; },
    steps: function(v) { const be=v.fixed/(v.cm/100); return ['Formula: Break-Even Revenue = Fixed Costs / Contribution Margin%','Step 1: BE = $'+v.fixed+' / '+(v.cm/100),'Step 2: BE = $'+be.toFixed(2)]; } },
  { id: 'payback', name: 'Payback Period', desc: 'Calculate investment payback', kw: 'payback period calculator, free online Payback Period calculator',
    inputs: [{id:'cost',label:'Initial Investment',type:'number',def:50000},{id:'annual',label:'Annual Cash Flow',type:'number',def:15000}],
    calc: function(v) { const years = v.cost / v.annual; return { result: 'Payback: ' + years.toFixed(2) + ' years', chart: Charts.gauge(years, 10), extra: 'Annual: $' + v.annual }; },
    steps: function(v) { const y=v.cost/v.annual; return ['Formula: Payback = Initial Investment / Annual Cash Flow','Step 1: Payback = $'+v.cost+' / $'+v.annual,'Step 2: Payback = '+y.toFixed(2)+' years']; },
    // Reverse calc (target = payback years): years = cost/annual → cost, annual
    reverse: { solveFor: { cost: 1, annual: 1 }, variables: {
      cost: { analytical: function(o, target) { return target * o.annual; }, domain: [0, 1e12] },
      annual: { analytical: function(o, target) { return o.cost / target; }, domain: [0, 1e9] }
    } } },
  { id: 'depreciation', name: 'Depreciation Calculator', desc: 'Calculate straight-line depreciation', kw: 'free depreciation calculator, free online Depreciation Calculator',
    inputs: [{id:'cost',label:'Asset Cost',type:'number',def:50000},{id:'salvage',label:'Salvage Value',type:'number',def:5000},{id:'life',label:'Useful Life (years)',type:'number',def:5}],
    calc: function(v) { const annual = (v.cost - v.salvage) / v.life; return { result: 'Annual Depreciation: $' + annual.toFixed(2), chart: Charts.line([v.cost, v.cost - annual, v.cost - annual*2, v.cost - annual*3, v.salvage], ['Y0','Y1','Y2','Y3','Y5']), extra: 'Monthly: $' + (annual/12).toFixed(2) }; },
    steps: function(v) { const a=(v.cost-v.salvage)/v.life; return ['Formula: Annual Depreciation = (Cost - Salvage) / Life','Step 1: Depreciable amount = $'+v.cost+' - $'+v.salvage+' = $'+(v.cost-v.salvage),'Step 2: Annual = $'+(v.cost-v.salvage)+' / '+v.life+' = $'+a.toFixed(2)]; } },
  { id: 'discount-rate', name: 'Discount Rate Calculator', desc: 'Calculate WACC', kw: 'cost of capital, free online Discount Rate Calculator',
    inputs: [{id:'equity',label:'Equity ($)',type:'number',def:600000},{id:'debt',label:'Debt ($)',type:'number',def:400000},{id:'costEquity',label:'Cost of Equity (%)',type:'number',def:12},{id:'costDebt',label:'Cost of Debt (%)',type:'number',def:6},{id:'tax',label:'Tax Rate (%)',type:'number',def:25}],
    calc: function(v) { const total = v.equity + v.debt; const wacc = (v.equity/total * v.costEquity/100) + (v.debt/total * v.costDebt/100 * (1 - v.tax/100)); return { result: 'WACC: ' + (wacc*100).toFixed(2) + '%', chart: Charts.donut([v.equity, v.debt], ['Equity','Debt']), extra: 'Total Capital: $' + total }; },
    steps: function(v) { const t=v.equity+v.debt; const wacc=(v.equity/t*v.costEquity/100)+(v.debt/t*v.costDebt/100*(1-v.tax/100)); return ['Formula: WACC = (E/V × Re) + (D/V × Rd × (1-T))','Step 1: E/V = '+v.equity+'/'+t+' = '+(v.equity/t).toFixed(2),'Step 2: D/V = '+(v.debt/t).toFixed(2),'Step 3: WACC = '+(v.equity/t).toFixed(2)+'×'+v.costEquity+'% + '+(v.debt/t).toFixed(2)+'×'+v.costDebt+'%×'+(1-v.tax/100),'Step 4: WACC = '+(wacc*100).toFixed(2)+'%']; } },
{ id: "saas-unit-metrics", name: "SaaS Unit Metrics Calculator", desc: "Calculate key SaaS metrics: ARPU, LTV, CAC, payback period", kw: "saas metrics, ARPU calculator, LTV calculator, CAC calculator, unit economics, free online SaaS Unit Metrics Calculator", inputs: [{id:"mrr",label:"Monthly Recurring Revenue ($)",type:"number",def:10000},{id:"customers",label:"Number of Customers",type:"number",def:100},{id:"churnRate",label:"Monthly Churn Rate (%)",type:"number",def:5},{id:"cac",label:"Customer Acquisition Cost ($)",type:"number",def:150},{id:"grossMargin",label:"Gross Margin (%)",type:"number",def:80}], calc: function(v) { const arpu=v.mrr/v.customers; const avgLifespan=1/(v.churnRate/100); const ltv=arpu*avgLifespan*v.grossMargin/100; const ltvCac=ltv/v.cac; const payback=v.cac/(arpu*v.grossMargin/100); return { result: "LTV: $"+ltv.toFixed(2)+" | ARPU: $"+arpu.toFixed(2), chart: Charts.bar([v.cac,ltv],["CAC","LTV"]), extra: "LTV/CAC: "+ltvCac.toFixed(2)+"x | ARPU: $"+arpu.toFixed(2) }; }, steps: function(v) { const a=v.mrr/v.customers; const al=1/(v.churnRate/100); const l=a*al*v.grossMargin/100; const ltvCacRatio = l / v.cac; return ["Step 1: ARPU = $"+a.toFixed(2),"Step 2: Avg lifespan = "+al.toFixed(1)+" months","Step 3: LTV = $"+l.toFixed(2),"Step 4: LTV/CAC = "+ltvCacRatio.toFixed(2)+"x"]; } },
  { id: 'break-even-point', name: 'Break-Even Point Calculator', desc: 'Calculate how many units you must sell to break even', kw: 'break even point calculator with fixed costs, break even point',
    inputs: [{id:'fixedCosts',label:'Fixed Costs ($/mo)',type:'number',def:5000},{id:'price',label:'Selling Price ($)',type:'number',def:50},{id:'varCost',label:'Variable Cost per Unit ($)',type:'number',def:20}],
    calc: function(v) { const cm = v.price - v.varCost; const bep = v.fixedCosts / cm; const bepRev = bep * v.price; return { result: 'Break-even: ' + Math.ceil(bep) + ' units', chart: Charts.gauge(bep, 500), extra: 'Revenue at BEP: $' + bepRev.toFixed(2) + ' | Contribution margin: $' + cm.toFixed(2) + '/unit' }; },
    steps: function(v) { const cm=v.price-v.varCost; const b=v.fixedCosts/cm; return ['Formula: BEP = Fixed Costs / (Price − Variable Cost)','Step 1: Contribution margin = $'+v.price+' − $'+v.varCost+' = $'+cm.toFixed(2),'Step 2: BEP = $'+v.fixedCosts+' / $'+cm.toFixed(2)+' = '+Math.ceil(b)+' units']; } },
  { id: 'invoice-due-date', name: 'Invoice Due Date & Late Fee', desc: 'Calculate invoice due date and late payment penalty', kw: 'free online Invoice Due Date & Late Fee calculator',
    inputs: [{id:'amount',label:'Invoice Amount ($)',type:'number',def:1000},{id:'terms',label:'Payment Terms',type:'select',opts:[{v:7,l:'Net 7'},{v:14,l:'Net 14'},{v:30,l:'Net 30'},{v:45,l:'Net 45'}],def:30},{id:'daysLate',label:'Days Late',type:'number',def:10},{id:'lateRate',label:'Late Fee (% per mo)',type:'number',def:1.5}],
    calc: function(v) { const due = v.amount; const fee = v.daysLate>0 ? v.amount*(v.lateRate/100)*(v.daysLate/30) : 0; return { result: 'Due: $' + due.toFixed(2) + (v.daysLate>0 ? ' + $' + fee.toFixed(2) + ' fee' : ''), chart: Charts.bar([due, fee], ['Invoice','Late Fee']), extra: (v.daysLate>0?'Late fee: $'+fee.toFixed(2)+' ('+v.daysLate+' days @ '+v.lateRate+'%/mo)':'Paid on time ✓') + ' | Terms: Net ' + v.terms }; },
    steps: function(v) { const f=v.daysLate>0?v.amount*(v.lateRate/100)*(v.daysLate/30):0; return ['Step 1: Payment due on Net '+v.terms+' terms','Step 2: Late fee = $'+v.amount+' × '+v.lateRate+'% × ('+v.daysLate+'/30) = $'+f.toFixed(2),'Step 3: Total = $'+(v.amount+f).toFixed(2)]; } },
  { id: 'employee-cost', name: 'True Employee Cost', desc: 'Calculate the full cost of an employee including benefits', kw: 'cost of hire, free online True Employee Cost calculator',
    inputs: [{id:'salary',label:'Annual Salary ($)',type:'number',def:60000},{id:'benefits',label:'Benefits (% of salary)',type:'number',def:20},{id:'overhead',label:'Overhead (% of salary)',type:'number',def:10},{id:'bonus',label:'Bonus (% of salary)',type:'number',def:5}],
    calc: function(v) { const b=v.salary*v.benefits/100; const o=v.salary*v.overhead/100; const bo=v.salary*v.bonus/100; const total=v.salary+b+o+bo; return { result: 'Total cost: $' + total.toLocaleString(), chart: Charts.donut([v.salary, b, o, bo], ['Salary','Benefits','Overhead','Bonus']), extra: 'Benefits: $'+b.toLocaleString()+' | Overhead: $'+o.toLocaleString()+' | Bonus: $'+bo.toLocaleString()+' | '+(total/v.salary).toFixed(2)+'× salary' }; },
    steps: function(v) { const b=v.salary*v.benefits/100; const o=v.salary*v.overhead/100; const bo=v.salary*v.bonus/100; return ['Step 1: Benefits = $'+v.salary.toLocaleString()+' × '+v.benefits+'% = $'+b.toLocaleString(),'Step 2: Overhead = $'+o.toLocaleString()+' | Bonus = $'+bo.toLocaleString(),'Step 3: Total = $'+(v.salary+b+o+bo).toLocaleString()]; } },
  { id: 'markup-margin', name: 'Markup vs Margin', desc: 'Convert between markup percentage and margin', kw: 'markup margin calculator conversion pricing, free online Markup vs Margin calculator',
    inputs: [{id:'cost',label:'Cost ($)',type:'number',def:50},{id:'sell',label:'Selling Price ($)',type:'number',def:75}],
    calc: function(v){var profit=v.sell-v.cost;var margin=profit/v.sell*100;var markup=profit/v.cost*100;return{result:'Margin: '+margin.toFixed(1)+'%',chart:Charts.bar([v.cost,profit],['Cost','Profit']),extra:'Markup: '+markup.toFixed(1)+'% | Profit: $'+profit.toFixed(2)};},
    steps: function(v){var profit=v.sell-v.cost;var margin=profit/v.sell*100;var markup=profit/v.cost*100;return['Profit = $'+v.sell+' − $'+v.cost+' = $'+profit.toFixed(2),'Margin = profit / price = '+margin.toFixed(1)+'%','Markup = profit / cost = '+markup.toFixed(1)+'%'];} },
  { id: 'working-capital', name: 'Working Capital Calculator', desc: 'Current assets minus current liabilities', kw: 'working capital calculator current ratio liquidity, free online Working Capital Calculator',
    inputs: [{id:'assets',label:'Current Assets ($)',type:'number',def:200000},{id:'liabilities',label:'Current Liabilities ($)',type:'number',def:120000}],
    calc: function(v){var wc=v.assets-v.liabilities;var ratio=v.assets/v.liabilities;return{result:'$'+wc.toLocaleString(undefined,{maximumFractionDigits:0}),chart:Charts.bar([v.assets,v.liabilities],['Assets','Liabilities']),extra:'Current ratio: '+ratio.toFixed(2)};},
    steps: function(v){var wc=v.assets-v.liabilities;var ratio=v.assets/v.liabilities;return['Working capital = assets − liabilities','= $'+v.assets.toLocaleString()+' − $'+v.liabilities.toLocaleString()+' = $'+wc.toLocaleString(),'Current ratio = '+ratio.toFixed(2)];} },
  { id: 'cash-flow-statement', name: 'Cash Flow Statement Calculator', desc: 'Net cash flow over a period', kw: 'cash flow calculator net operating investing financing, free online Cash Flow Statement Calculator',
    inputs: [{id:'operating',label:'Operating CF ($)',type:'number',def:80000},{id:'investing',label:'Investing CF ($)',type:'number',def:-30000},{id:'financing',label:'Financing CF ($)',type:'number',def:10000}],
    calc: function(v){var net=v.operating+v.investing+v.financing;return{result:'$'+net.toLocaleString(undefined,{maximumFractionDigits:0}),chart:Charts.bar([v.operating,v.investing,v.financing],['Operating','Investing','Financing']),extra:net>0?'Positive net cash flow':'Negative net cash flow'};},
    steps: function(v){var net=v.operating+v.investing+v.financing;return['Net CF = operating + investing + financing','= $'+v.operating.toLocaleString()+' + $'+v.investing.toLocaleString()+' + $'+v.financing.toLocaleString(),'Net CF = $'+net.toLocaleString()];} },
  { id: 'revenue-per-employee', name: 'Revenue per Employee', desc: 'Revenue efficiency per employee', kw: 'revenue per employee calculator productivity',
    inputs: [{id:'revenue',label:'Annual Revenue ($)',type:'number',def:2000000},{id:'employees',label:'Employees',type:'number',def:25}],
    calc: function(v){var rpe=v.revenue/v.employees;return{result:'$'+rpe.toLocaleString(undefined,{maximumFractionDigits:0}),chart:Charts.bar([rpe],['Per employee']),extra:'Benchmark: $100k–$250k typical'};},
    steps: function(v){var rpe=v.revenue/v.employees;return['Revenue per employee = revenue / headcount','= $'+v.revenue.toLocaleString()+' / '+v.employees,'= $'+rpe.toLocaleString(undefined,{maximumFractionDigits:0})];} },
  { id: 'cac-payback', name: 'CAC Payback Period', desc: 'Months to recover customer acquisition cost', kw: 'cac payback period calculator months customer acquisition, free online CAC Payback Period calculator',
    inputs: [{id:'cac',label:'Customer Acquisition Cost ($)',type:'number',def:500},{id:'margin',label:'Gross Margin per Customer ($)',type:'number',def:100}],
    calc: function(v){var months=v.cac/v.margin;return{result:months.toFixed(1)+' months',chart:Charts.gauge(months,24),extra:months<12?'Healthy (<12 months)':'Long payback (>12 months)'};},
    steps: function(v){var months=v.cac/v.margin;return['Payback = CAC / monthly gross margin','= $'+v.cac+' / $'+v.margin,'= '+months.toFixed(1)+' months'];} },
  { id: 'business-valuation', name: 'Business Valuation (Revenue Multiple)', desc: 'Quick valuation using revenue or EBITDA multiples', kw: 'business valuation calculator revenue multiple ebitda, free online Business Valuation (Revenue Multiple) calculator',
    inputs: [{id:'revenue',label:'Annual Revenue ($)',type:'number',def:1000000},{id:'ebitda',label:'EBITDA ($)',type:'number',def:150000},{id:'revMult',label:'Revenue Multiple',type:'number',def:1.5},{id:'ebitdaMult',label:'EBITDA Multiple',type:'number',def:5}],
    calc: function(v){var byRev=v.revenue*v.revMult;var byEbitda=v.ebitda*v.ebitdaMult;var avg=(byRev+byEbitda)/2;return{result:'~$'+avg.toLocaleString(undefined,{maximumFractionDigits:0}),chart:Charts.bar([byRev,byEbitda],['By revenue','By EBITDA']),extra:'Revenue method: $'+byRev.toLocaleString(undefined,{maximumFractionDigits:0})+' | EBITDA method: $'+byEbitda.toLocaleString(undefined,{maximumFractionDigits:0})};},
    steps: function(v){var byRev=v.revenue*v.revMult;var byEbitda=v.ebitda*v.ebitdaMult;return['By revenue: $'+v.revenue.toLocaleString()+' × '+v.revMult+' = $'+byRev.toLocaleString(),'By EBITDA: $'+v.ebitda.toLocaleString()+' × '+v.ebitdaMult+' = $'+byEbitda.toLocaleString(),'Average ≈ $'+((byRev+byEbitda)/2).toLocaleString(undefined,{maximumFractionDigits:0})];} },
  { id: 'gross-margin', name: 'Gross Margin Calculator', desc: 'Gross profit margin from revenue and COGS', kw: 'gross margin calculator gross profit percentage',
    inputs: [{id:'revenue',label:'Revenue ($)',type:'number',def:100000},{id:'cogs',label:'COGS ($)',type:'number',def:60000}],
    calc: function(v){var gp=v.revenue-v.cogs;var margin=gp/v.revenue*100;return{result:margin.toFixed(1)+'%',chart:Charts.donut([gp,v.cogs],['Gross profit','COGS']),extra:'Gross profit: $'+gp.toLocaleString(undefined,{maximumFractionDigits:0})};},
    steps: function(v){var gp=v.revenue-v.cogs;var margin=gp/v.revenue*100;return['Gross profit = $'+v.revenue.toLocaleString()+' − $'+v.cogs.toLocaleString()+' = $'+gp.toLocaleString(),'Margin = $'+gp.toLocaleString()+' / $'+v.revenue.toLocaleString()+' = '+margin.toFixed(1)+'%'];} },
  { id: 'goal-seek-price', name: 'Target Price from Margin', desc: 'Selling price needed for a target margin', kw: 'target price calculator margin cost pricing, free online Target Price from Margin calculator',
    inputs: [{id:'cost',label:'Cost ($)',type:'number',def:40},{id:'target',label:'Target Margin (%)',type:'number',def:40}],
    calc: function(v){var price=v.cost/(1-v.target/100);var profit=price-v.cost;return{result:'$'+price.toFixed(2),chart:Charts.bar([v.cost,profit],['Cost','Profit']),extra:'Profit: $'+profit.toFixed(2)};},
    steps: function(v){var price=v.cost/(1-v.target/100);var profit=price-v.cost;return['Price = cost / (1 − margin)','Price = $'+v.cost+' / (1 − '+v.target+'%)','Price = $'+price.toFixed(2)];} },
  { id: 'subscription-ltv', name: 'Subscription LTV Calculator', desc: 'Lifetime value of a subscription customer', kw: 'subscription ltv calculator lifetime value churn, free online Subscription LTV Calculator',
    inputs: [{id:'arpu',label:'Monthly Revenue per User ($)',type:'number',def:25},{id:'churn',label:'Monthly Churn (%)',type:'number',def:5},{id:'margin',label:'Gross Margin (%)',type:'number',def:80}],
    calc: function(v){var avgLife=1/(v.churn/100);var ltv=v.arpu*avgLife*(v.margin/100);return{result:'$'+ltv.toFixed(0),chart:Charts.bar([v.arpu,ltv],['MRR/user','LTV']),extra:'Avg lifetime: '+avgLife.toFixed(1)+' months'};},
    steps: function(v){var avgLife=1/(v.churn/100);var ltv=v.arpu*avgLife*(v.margin/100);return['Avg lifetime = 1/churn = 1/'+(v.churn/100).toFixed(2)+' = '+avgLife.toFixed(1)+' mo','LTV = $'+v.arpu+' × '+avgLife.toFixed(1)+' × '+v.margin+'%','LTV = $'+ltv.toFixed(0)];} }

,
  { id: 'cash-conversion-cycle', name: 'Cash Conversion Cycle Calculator', desc: 'Days cash is tied up: DIO + DSO − DPO', kw: 'cash conversion cycle calculator dio dso dpo, free online Cash Conversion Cycle Calculator',
    inputs: [{id:'dio',label:'Days Inventory Outstanding',type:'number',def:45},{id:'dso',label:'Days Sales Outstanding',type:'number',def:30},{id:'dpo',label:'Days Payable Outstanding',type:'number',def:35}],
    calc: function(v){ var ccc=v.dio+v.dso-v.dpo; var band=ccc<0?'Negative — you get paid before you pay suppliers':ccc<30?'Excellent':ccc<60?'Good':'Cash-tight — review terms'; return{result:'CCC: '+ccc+' days',chart:Charts.bar([v.dio,v.dso,v.dpo,ccc],['DIO','DSO','DPO','CCC']),extra:band+' | CCC = DIO + DSO − DPO'};},
    steps: function(v){ var ccc=v.dio+v.dso-v.dpo; return['Formula: CCC = DIO + DSO − DPO','Step 1: '+v.dio+' + '+v.dso+' = '+(v.dio+v.dso)+' days','Step 2: − '+v.dpo+' = '+ccc+' days','Lower is better — cash returns faster'];} },

  { id: 'market-share', name: 'Market Share Calculator', desc: 'Your share of the total market', kw: 'market share calculator percentage revenue',
    inputs: [{id:'revenue',label:'Your Revenue ($)',type:'number',def:500000},{id:'market',label:'Total Market Revenue ($)',type:'number',def:5000000}],
    calc: function(v){ if(v.market<=0) return{result:'Market must be > 0',chart:'',extra:''}; var share=v.revenue/v.market*100; return{result:'Market share: '+share.toFixed(1)+'%',chart:Charts.donut([v.revenue,v.market-v.revenue],['You','Rest of market']),extra:'You are #'+(share>=20?'1–2':share>=10?'2–5':'5+')+' by size | relative size: 1 : '+(v.market/v.revenue).toFixed(1)};},
    steps: function(v){ var share=v.revenue/v.market*100; return['Formula: Share = Your Revenue / Market Revenue × 100','Step 1: $'+v.revenue.toLocaleString()+' / $'+v.market.toLocaleString(),'Step 2: = '+(v.revenue/v.market).toFixed(4),'Step 3: Market share = '+share.toFixed(1)+'%'];} },

  { id: 'aov', name: 'Average Order Value Calculator', desc: 'AOV from revenue and order count', kw: 'average order value calculator aov ecommerce, free online Average Order Value Calculator',
    inputs: [{id:'revenue',label:'Total Revenue ($)',type:'number',def:25000},{id:'orders',label:'Orders',type:'number',def:500}],
    calc: function(v){ if(v.orders<=0) return{result:'Orders must be > 0',chart:'',extra:''}; var aov=v.revenue/v.orders; return{result:'AOV: $'+aov.toFixed(2),chart:Charts.gauge(Math.min(aov/100,1)*100,100),extra:'Revenue per order | Raising AOV (bundles, free-shipping thresholds) lifts revenue without more traffic'};},
    steps: function(v){ var aov=v.revenue/v.orders; return['Formula: AOV = Revenue / Orders','Step 1: $'+v.revenue.toLocaleString()+' / '+v.orders.toLocaleString(),'Step 2: AOV = $'+aov.toFixed(2)];} },


  { id: 'customer-ltv', name: 'Customer Lifetime Value Calculator', desc: 'Revenue per customer from ARPU, margin, and churn', kw: 'customer lifetime value calculator ltv arpu churn margin saas, free online Customer Lifetime Value Calculator', inputs: [{id:'arpu',label:'Monthly Revenue per Customer ($)',type:'number',def:50},{id:'margin',label:'Gross Margin (%)',type:'number',def:70},{id:'churn',label:'Monthly Churn (%)',type:'number',def:5}], calc: function(v){ if(v.arpu<=0||v.churn<=0) return{result:'Revenue and churn must be positive',chart:'',extra:''}; var ltv=v.arpu*(v.margin/100)/(v.churn/100); var life=1/(v.churn/100); return{result:'LTV: $'+ltv.toFixed(0),chart:Charts.bar([ltv,v.arpu*(1-v.margin/100)/(v.churn/100)],['Gross LTV','Cost portion']),extra:'Average lifetime: '+life.toFixed(1)+' months | Compare with CAC — a healthy SaaS keeps LTV:CAC above 3:1'};}, steps: function(v){ var ltv=v.arpu*(v.margin/100)/(v.churn/100); return['Formula: LTV = ARPU × margin ÷ churn','Step 1: Gross profit per month = '+v.arpu+' × '+(v.margin/100)+' = $'+(v.arpu*v.margin/100).toFixed(2),'Step 2: ÷ churn '+(v.churn/100)+' = $'+ltv.toFixed(0)+' lifetime gross profit','Churn compounds: cutting it from 5% to 4% lifts lifetime from 20 to 25 months'];} },

  { id: 'csat-score', name: 'CSAT Score Calculator', desc: 'Customer satisfaction percent from survey counts', kw: 'csat calculator customer satisfaction score survey percent, free online CSAT Score Calculator', inputs: [{id:'good',label:'Satisfied Responses (4-5)',type:'number',def:180},{id:'total',label:'Total Responses',type:'number',def:200}], calc: function(v){ if(v.total<=0||v.good<0||v.good>v.total) return{result:'Enter valid counts',chart:'',extra:''}; var csat=v.good/v.total*100; return{result:'CSAT: '+csat.toFixed(1)+'%',chart:Charts.gauge(csat,100),extra:'Only 4-5 ratings count as satisfied | CSAT measures the transaction, NPS measures the relationship — they move differently'};}, steps: function(v){ var csat=v.good/v.total*100; return['Formula: CSAT = satisfied ÷ total × 100','Step 1: '+v.good+' ÷ '+v.total+' = '+(v.good/v.total).toFixed(3),'Step 2: × 100 = '+csat.toFixed(1)+'%','Segment by channel — chat and phone CSAT usually diverge from email'];} },

  { id: 'conversion-funnel', name: 'Conversion Funnel Calculator', desc: 'Step-to-step and overall conversion rates', kw: 'conversion funnel calculator step rate drop off marketing', inputs: [{id:'s1',label:'Visitors',type:'number',def:1000},{id:'s2',label:'Added to Cart',type:'number',def:300},{id:'s3',label:'Checked Out',type:'number',def:60}], calc: function(v){ if(v.s1<=0) return{result:'Enter a positive visitor count',chart:'',extra:''}; var r1=v.s2/v.s1*100, r2=v.s3/v.s2*100, overall=v.s3/v.s1*100; return{result:'Overall: '+overall.toFixed(1)+'%',chart:Charts.bar([v.s1,v.s2,v.s3],['Visit','Cart','Purchase']),extra:'Step rates: '+(r1).toFixed(0)+'% then '+(r2).toFixed(0)+'% | The biggest drop-off is your leverage — a relative gain there beats the same effort anywhere else'};}, steps: function(v){ var r1=v.s2/v.s1*100, r2=v.s3/v.s2*100; return['Step 1: Visit → Cart: '+v.s2+' ÷ '+v.s1+' = '+r1.toFixed(1)+'%','Step 2: Cart → Purchase: '+v.s3+' ÷ '+v.s2+' = '+r2.toFixed(1)+'%','Step 3: Overall = '+r1.toFixed(1)+'% × '+r2.toFixed(1)+'% ÷ 100 = '+(r1*r2/100).toFixed(1)+'%','Funnel stages multiply — small wins at each step compound'];} },

  { id: 'ab-test-significance', name: 'A/B Test Significance Calculator', desc: 'Z-score for a two-variant conversion test', kw: 'ab test significance calculator z score conversion split test, free online A/B Test Significance Calculator', inputs: [{id:'na',label:'Variant A Visitors',type:'number',def:1000},{id:'ca',label:'Variant A Conversions',type:'number',def:50},{id:'nb',label:'Variant B Visitors',type:'number',def:1000},{id:'cb',label:'Variant B Conversions',type:'number',def:65}], calc: function(v){ if(v.na<=0||v.nb<=0) return{result:'Visitor counts must be positive',chart:'',extra:''}; var p1=v.ca/v.na, p2=v.cb/v.nb; var p=(v.ca+v.cb)/(v.na+v.nb); var se=Math.sqrt(p*(1-p)*(1/v.na+1/v.nb)); if(se===0) return{result:'No variance — check your inputs',chart:'',extra:''}; var z=(p2-p1)/se; var sig=Math.abs(z)>=1.96?'significant at 95%':Math.abs(z)>=1.64?'significant at 90%':'not significant'; return{result:'z = '+z.toFixed(2)+' ('+sig+')',chart:Charts.bar([p1*100,p2*100],['A %','B %']),extra:'A converts '+(p1*100).toFixed(2)+'%, B '+(p2*100).toFixed(2)+'% | Stop tests at the planned sample size — peeking early inflates false positives'};}, steps: function(v){ var p1=v.ca/v.na, p2=v.cb/v.nb; var p=(v.ca+v.cb)/(v.na+v.nb); var se=Math.sqrt(p*(1-p)*(1/v.na+1/v.nb)); var z=(p2-p1)/se; return['Step 1: Rates — A: '+(p1*100).toFixed(2)+'%, B: '+(p2*100).toFixed(2)+'%','Step 2: Pooled p = '+(v.ca+v.cb)+' ÷ '+(v.na+v.nb)+' = '+p.toFixed(4),'Step 3: SE = √(p(1−p)(1/nA+1/nB)) = '+se.toFixed(5),'Step 4: z = (pB − pA) ÷ SE = '+z.toFixed(3)+' — |z| ≥ 1.96 means 95% confidence'];} },

  { id: 'project-bid', name: 'Project Bid Calculator', desc: 'Bid price from cost, contingency, and margin', kw: 'project bid calculator price margin contingency contractor estimate, free online Project Bid Calculator', inputs: [{id:'cost',label:'Direct Cost ($)',type:'number',def:50000},{id:'cont',label:'Contingency (%)',type:'number',def:10},{id:'margin',label:'Profit Margin (%)',type:'number',def:20}], calc: function(v){ if(v.cost<=0) return{result:'Cost must be positive',chart:'',extra:''}; var withCont=v.cost*(1+v.cont/100); var bid=withCont/(1-v.margin/100); return{result:'Bid: $'+bid.toFixed(0),chart:Charts.bar([v.cost,withCont-v.cost,bid-withCont],['Cost','Contingency','Margin']),extra:'Margin on price, not cost: dividing by (1 − margin) is correct — multiplying cost by 1.2 underprices every job'};}, steps: function(v){ var withCont=v.cost*(1+v.cont/100); var bid=withCont/(1-v.margin/100); return['Step 1: Cost + contingency = $'+v.cost.toLocaleString()+' × '+(1+v.cont/100)+' = $'+withCont.toLocaleString(),'Step 2: Bid = $'+withCont.toLocaleString()+' ÷ (1 − '+(v.margin/100)+') = $'+bid.toLocaleString(),'The division matters: a 20% margin on price equals a 25% markup on cost'];} },

  { id: 'retainer-value', name: 'Retainer Value Calculator', desc: 'Contract value with a term discount applied', kw: 'retainer value calculator monthly contract discount annual', inputs: [{id:'monthly',label:'Monthly Fee ($)',type:'number',def:5000},{id:'months',label:'Term (months)',type:'number',def:12},{id:'disc',label:'Prepay Discount (%)',type:'number',def:10}], calc: function(v){ if(v.monthly<=0||v.months<=0) return{result:'Enter positive values',chart:'',extra:''}; var gross=v.monthly*v.months; var net=gross*(1-v.disc/100); return{result:'Contract Value: $'+net.toFixed(0),chart:Charts.bar([gross,gross-net],['List','Discount']),extra:'Effective monthly: $'+(net/v.months).toFixed(0)+' | The discount buys cash flow and commitment — cap it below your financing cost plus churn risk'};}, steps: function(v){ var gross=v.monthly*v.months; var net=gross*(1-v.disc/100); return['Step 1: List value = $'+v.monthly+' × '+v.months+' = $'+gross.toLocaleString(),'Step 2: Apply '+v.disc+'% prepay discount → $'+net.toLocaleString(),'Discounts should be traded, not given: tie them to longer terms or upfront payment'];} }
,
  {
    id: 'sponsorship-rate',
    name: 'Influencer Sponsorship Rate Calculator',
    desc: 'Free influencer sponsorship rate calculator: an estimated paid-post price from follower count, engagement rate and platform CPM.',
    kw: 'influencer rate calculator, sponsorship rate calculator, how much to charge sponsored post, creator pricing calculator',
    inputs: [
{ id: 'followers', label: 'Followers', type: 'number', def: 50000 },
      { id: 'engagement', label: 'Engagement rate (percent)', type: 'number', def: 3 },
      { id: 'platform', label: 'Platform', type: 'select', opts: [{v:'Instagram',l:'Instagram'},{v:'TikTok',l:'TikTok'},{v:'YouTube',l:'YouTube'}], def: 'Instagram' },
      { id: 'cpm', label: 'Rate per 1000 followers', type: 'number', def: 25 }
    ],
    calc: function (v) {
      var base = v.followers / 1000 * v.cpm;
      var adj = v.engagement / 3;
      var est = base * adj;
      return {
        result: 'Estimated rate per post: ' + est.toFixed(0),
        chart: Charts.bar([est * 0.7, est, est * 1.5], ['Low', 'Mid', 'High']),
        extra: 'Range ' + (est * 0.7).toFixed(0) + ' to ' + (est * 1.5).toFixed(0) + ' | Base ' + base.toFixed(0) + ' x engagement factor ' + adj.toFixed(2) + ' | ' + v.platform + ' rates vary with niche and usage rights'
      };
    },
    steps: function (v) {
      var base = v.followers / 1000 * v.cpm;
      var adj = v.engagement / 3;
      var est = base * adj;
      return [
        'Step 1: Base value = followers / 1000 x rate per 1000 = ' + v.followers + ' / 1000 x ' + v.cpm + ' = ' + base.toFixed(0) + '.',
        'Step 2: Adjust for engagement. A 3 percent rate is the baseline, so the factor is ' + v.engagement + ' / 3 = ' + adj.toFixed(2) + '.',
        'Step 3: Estimated rate = ' + base.toFixed(0) + ' x ' + adj.toFixed(2) + ' = ' + est.toFixed(0) + ' per post.',
        'Step 4: Quote a range of ' + (est * 0.7).toFixed(0) + ' to ' + (est * 1.5).toFixed(0) + ' to leave room for negotiation.',
        'Step 5: Add a premium for exclusive usage, whitelisting, or a multi-post package, and never trade free product for a rate this calculation says you are worth.'
      ];
    }
  },
  {
    id: 'brand-deal-value',
    name: 'Brand Deal Value Calculator',
    desc: 'Free brand deal value calculator: estimate a multi-post sponsorship package price from followers, engagement and number of deliverables.',
    kw: 'brand deal calculator, sponsored package price, influencer campaign cost, creator deal calculator',
    inputs: [
{ id: 'followers', label: 'Followers', type: 'number', def: 50000 },
      { id: 'engagement', label: 'Engagement rate (percent)', type: 'number', def: 3 },
      { id: 'posts', label: 'Deliverables (posts)', type: 'number', def: 3 },
      { id: 'cpm', label: 'Rate per 1000 followers', type: 'number', def: 25 }
    ],
    calc: function (v) {
      var per = v.followers / 1000 * v.cpm * (v.engagement / 3);
      var total = per * v.posts;
      var bundle = total * 0.9;
      return {
        result: 'Estimated deal value: ' + total.toFixed(0),
        chart: Charts.bar([per, total, bundle], ['Per post', 'Total', 'Bundle (10% off)']),
        extra: 'Per post ' + per.toFixed(0) + ' x ' + v.posts + ' deliverables = ' + total.toFixed(0) + ' | Typical multi-post bundle discount lands near ' + bundle.toFixed(0)
      };
    },
    steps: function (v) {
      var per = v.followers / 1000 * v.cpm * (v.engagement / 3);
      var total = per * v.posts;
      return [
        'Step 1: Value per post = followers / 1000 x rate x engagement factor = ' + per.toFixed(0) + '.',
        'Step 2: Multiply by the number of deliverables: ' + per.toFixed(0) + ' x ' + v.posts + ' = ' + total.toFixed(0) + '.',
        'Step 3: A multi-post bundle is usually pitched 10 to 20 percent below the straight sum, so a fair bundle is about ' + (total * 0.9).toFixed(0) + '.',
        'Step 4: Price usage rights and exclusivity separately — they are not free.',
        'Step 5: Ask for a deposit and clear deliverables before you commit to a launch date.'
      ];
    }
  },
  {
    id: 'podcast-ad-rate',
    name: 'Podcast Ad Rate Calculator',
    desc: 'Free podcast advertising rate calculator: estimated ad price per episode from downloads, CPM and number of ad spots.',
    kw: 'podcast ad rate calculator, podcast sponsorship cost, cpm podcast calculator, how much do podcasts charge',
    inputs: [
{ id: 'downloads', label: 'Downloads per episode', type: 'number', def: 5000 },
      { id: 'cpm', label: 'CPM', type: 'number', def: 18 },
      { id: 'spots', label: 'Ad spots per episode', type: 'number', def: 2 }
    ],
    calc: function (v) {
      var perSpot = v.downloads / 1000 * v.cpm;
      var total = perSpot * v.spots;
      return {
        result: 'Ad rate: ' + total.toFixed(0) + ' per episode',
        chart: Charts.donut([total, perSpot], ['Per episode', 'Per spot']),
        extra: perSpot.toFixed(0) + ' per spot x ' + v.spots + ' spots | CPM ' + v.cpm + ' | Host-read ads command a higher CPM than programmatic'
      };
    },
    steps: function (v) {
      var perSpot = v.downloads / 1000 * v.cpm;
      var total = perSpot * v.spots;
      return [
        'Step 1: Rate per spot = downloads / 1000 x CPM = ' + v.downloads + ' / 1000 x ' + v.cpm + ' = ' + perSpot.toFixed(0) + '.',
        'Step 2: Podcast CPMs commonly run from about 15 for programmatic to 30 or more for a host-read endorsement.',
        'Step 3: Multiply by the number of spots: ' + perSpot.toFixed(0) + ' x ' + v.spots + ' = ' + total.toFixed(0) + ' per episode.',
        'Step 4: For a multi-episode campaign, price a package rather than a single episode and offer a mid-roll premium.',
        'Step 5: Downloads for older episodes keep earning, so a back-catalogue bundle can be the most valuable thing you sell.'
      ];
    }
  },
  {
    id: 'newsletter-sponsorship-rate',
    name: 'Newsletter Sponsorship Rate Calculator',
    desc: 'Free newsletter sponsorship rate calculator: suggested per-issue price from subscriber count, open rate and newsletter CPM.',
    kw: 'newsletter sponsorship rate, newsletter ad pricing, cpm newsletter calculator, how much to charge newsletter ad',
    inputs: [
{ id: 'subs', label: 'Subscribers', type: 'number', def: 10000 },
      { id: 'openRate', label: 'Open rate (percent)', type: 'number', def: 35 },
      { id: 'cpm', label: 'CPM (per 1000 opens)', type: 'number', def: 30 }
    ],
    calc: function (v) {
      var opens = v.subs * v.openRate / 100;
      var rate = opens / 1000 * v.cpm;
      return {
        result: 'Suggested rate: ' + rate.toFixed(0) + ' per issue',
        chart: Charts.donut([rate, opens], ['Rate', 'Opens']),
        extra: 'Estimated opens ' + opens.toFixed(0) + ' x ' + (v.cpm / 1000).toFixed(3) + ' per open = ' + rate.toFixed(0) + ' | Priced like a primary placement; a classified slot can go for a third of that'
      };
    },
    steps: function (v) {
      var opens = v.subs * v.openRate / 100;
      var rate = opens / 1000 * v.cpm;
      return [
        'Step 1: Estimate real opens = subscribers x open rate = ' + v.subs + ' x ' + v.openRate + ' percent = ' + opens.toFixed(0) + '.',
        'Step 2: Newsletter CPMs are quoted per 1000 opens and typically run from 20 to 50 or more for a niche audience.',
        'Step 3: Suggested rate = ' + opens.toFixed(0) + ' / 1000 x ' + v.cpm + ' = ' + rate.toFixed(0) + ' per issue.',
        'Step 4: A primary placement earns the full rate; a classified or secondary slot is usually a third to a half.',
        'Step 5: Sell a four-issue run for a discount rather than one-offs, and always disclose sponsored content clearly.'
      ];
    }
  }
,
  {
    id: 'tool-depreciation',
    name: 'Tool and Equipment Depreciation Calculator',
    desc: 'Work out annual tool depreciation for taxes using straight line or declining balance methods.',
    kw: 'tool depreciation calculator, equipment depreciation, small business tool tax deduction, straight line depreciation',
    inputs: [
{ id: 'toolCost', label: 'Tool cost', type: 'number', def: 2000 },
      { id: 'salvageValue', label: 'Salvage value', type: 'number', def: 200 },
      { id: 'usefulLifeYears', label: 'Useful life (years)', type: 'number', def: 5 },
      { id: 'method', label: 'Method', type: 'select', opts: [{v:'Straight line',l:'Straight line'},{v:'Declining balance',l:'Declining balance'}], def: 'Straight line' }
    ],
    calc: function (v) {
      var annual = v.method === 'Declining balance'
        ? v.toolCost * 2 / v.usefulLifeYears
        : (v.toolCost - v.salvageValue) / v.usefulLifeYears;
      return {
        result: 'Annual depreciation: ' + annual.toFixed(0),
        chart: Charts.bar([annual, annual * v.usefulLifeYears], ['Per year', 'Over life']),
        extra: v.method + ' over ' + v.usefulLifeYears + ' years | Depreciable base ' + (v.toolCost - v.salvageValue).toFixed(0) + ' | Confirm the correct method and life with your tax adviser'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Separate the cost from the salvage value, the amount the tool is still worth at the end.',
        'Step 2: For straight line, divide the cost minus salvage by the useful life for an even annual deduction.',
        'Step 3: For declining balance, apply twice the straight-line rate to the remaining book value, so the deduction is larger early.',
        'Step 4: Tools above a set threshold can sometimes be expensed in full in the first year instead of depreciated.',
        'Step 5: Tax rules differ by country, so confirm the allowable method, life and threshold with a qualified accountant.'
      ];
    }
  },
  {
    id: 'ev-charger-business-roi',
    name: 'Business EV Charger ROI Calculator',
    desc: 'Estimate payback on installing public EV chargers for a business from capital cost, sessions and pricing.',
    kw: 'ev charger business roi, commercial ev charger payback, public charging station profit, ev charging business case',
    inputs: [
{ id: 'chargers', label: 'Number of chargers', type: 'number', def: 4 },
      { id: 'costPerCharger', label: 'Cost per charger', type: 'number', def: 5000 },
      { id: 'installTotal', label: 'Installation and setup total', type: 'number', def: 20000 },
      { id: 'sessionsPerDay', label: 'Sessions per charger per day', type: 'number', def: 6 },
      { id: 'kwhPerSession', label: 'kWh per session', type: 'number', def: 30 },
      { id: 'pricePerKwh', label: 'Price charged per kWh', type: 'number', def: 0.5 },
      { id: 'costPerKwh', label: 'Energy cost per kWh', type: 'number', def: 0.2 },
      { id: 'daysPerYear', label: 'Operating days per year', type: 'number', def: 350 }
    ],
    calc: function (v) {
      var sessions = v.chargers * v.sessionsPerDay * v.daysPerYear;
      var kwh = sessions * v.kwhPerSession;
      var revenue = kwh * v.pricePerKwh;
      var energy = kwh * v.costPerKwh;
      var gross = revenue - energy;
      var capex = v.chargers * v.costPerCharger + v.installTotal;
      var payback = gross > 0 ? capex / gross : 0;
      return {
        result: 'Payback: ' + payback.toFixed(1) + ' years',
        chart: Charts.bar([revenue, energy, gross], ['Revenue', 'Energy cost', 'Gross profit']),
        extra: 'Annual gross profit ' + gross.toFixed(0) + ' | Capital ' + capex.toFixed(0) + ' | Sessions a year ' + (sessions * 1).toFixed(0) + ' | Excludes maintenance and demand charges'
      };
    },
    steps: function (v) {
      return [
        'Step 1: Annual sessions equals chargers times sessions per day times operating days.',
        'Step 2: Multiply sessions by kWh per session for annual energy delivered.',
        'Step 3: Revenue is energy delivered times the price per kWh; energy cost is the same times your cost per kWh.',
        'Step 4: Gross profit is revenue minus energy cost, before maintenance, network fees and demand charges.',
        'Step 5: Payback equals total capital divided by annual gross profit. Utilization is the key risk: quiet sites never pay back.'
      ];
    }
  }
];
if (typeof module !== 'undefined') module.exports = BUSINESS_TOOLS;
if (typeof window !== 'undefined') window.BUSINESS_TOOLS = BUSINESS_TOOLS;

