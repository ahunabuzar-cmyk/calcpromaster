// CalcProMaster — Batch 7: LIFESTYLE 25 + CAREER 23 + BUSINESS 21 = 69 tools.
// Independent textbook expected values. No app code.
const fmt = (x) => (Math.round(x * 100) / 100).toFixed(2);

// ================= LIFESTYLE 25 =================
// 1. relocation-cost: labor=4*2*50=400, fuel=100*0.5=50, total=400+200+75+50
console.log('relocation-cost total:', fmt(4*2*50 + 100*0.5 + 200 + 75));
// 2. rental-deposit: nw=2000*0.05*2=200, maxDed=200+200+100=500, refund=1500
console.log('rental-deposit refund:', fmt(2000 - (2000*0.05*2 + 200 + 100)));
// 3. paint-coverage: wall=2*(12+14)*8=416, net=416-30-40=346, coverage=346*2=692, gallons=ceil(692/350)=2
console.log('paint-coverage gallons:', Math.ceil((2*(12+14)*8 - 30 - 40) * 2 / 350));
// 4. electricity-bill-saving: bill=800*0.12=96, ledSaving=96*0.5*0.15=7.2, total=7.2+15
console.log('electricity-bill-saving monthly:', fmt(96*0.5*0.15 + 15));
// 5. water-usage: shower=10*8*2.1*4.33, toilet=15*1.6*30, laundry=4*40*4.33; cost=(...)/1000*4.5
const sh = 10*8*2.1*4.33, to = 15*1.6*30, la = 4*40*4.33;
console.log('water-usage cost:', fmt((sh+to+la)/1000*4.5));
// 6. grocery-budget-optimizer: persons=4→225/person, rec=225*4=900, grocery=600-100=500, perDay=500/30
console.log('grocery daily:', fmt((600-100)/30));
// 7. food-delivery-vs-cooking: trueCost=15+4+3+5=27
console.log('food-delivery true cost:', fmt(15+4+3+5));
// 8. coffee-habit: weekly=5.5*5=27.5, yearly=27.5*52
console.log('coffee annual:', fmt(5.5*5*52));
// 9. road-trip-cost: gas=1500/28*3.5, lodging=3*120, food=50*4, total=+20
console.log('road-trip total:', fmt((1500/28*3.5) + 3*120 + 50*4 + 20));
// 10. flight-cost-per-hour: total=450+35=485, per flight hr=485/5.5
console.log('flight cost/hr:', fmt(485/5.5));
// 11. baby-cost: diapers=8*0.35*365, formula=150*12, clothing=60*12, childcare=800*12
console.log('baby-cost annual:', fmt(8*0.35*365 + 150*12 + 60*12 + 800*12));
// 12. parental-leave: weekly=60000/52, paid=weekly*0.6*12
console.log('parental-leave paid:', fmt((60000/52)*0.6*12));
// 13. pet-cost: food=50*12, grooming=40*12, insurance=30*12, total=+300+200
console.log('pet-cost annual:', fmt(50*12 + 300 + 40*12 + 30*12 + 200));
// 14. lawn-mowing: service=45*26
console.log('lawn-mowing service:', fmt(45*26));
// 15. gym-cost-per-visit: total=50*12+0=600, visits=3*4.33*12, per=600/visits
console.log('gym cost/visit:', fmt(600/(3*4.33*12)));
// 16. vacation-savings: needed=3000-500=2500, monthly=2500/12
console.log('vacation monthly:', fmt(2500/12));
// 17. sale-savings: disc=100*0.3=30, after=70, tax=70*0.08=5.6, final=75.6
console.log('sale-savings pay:', fmt(100*0.7*1.08));
// 18. resell-value: 1000*0.7*1.0*0.85^2
console.log('resell-value:', fmt(1000*0.7*Math.pow(0.85,2)));
// 19. subscription-audit: monthly=45+30+50+10+25=160
console.log('subscription monthly:', fmt(45+30+50+10+25));
// 20. streaming-value: 15.99/20
console.log('streaming $/hr:', fmt(15.99/20));
// 21. charging-time: energy=5000*((80-20)/100)*3.7/1000=11.1Wh, min=11.1/(18*0.85)*60
console.log('charging minutes:', Math.round((5000*0.6*3.7/1000)/(18*0.85)*60));
// 22. gift-split: tax=200*0.08=16, total=226, per=226/5
console.log('gift-split per person:', fmt(226/5));
// 23. hourly-annual-salary: paid=52-2=50, weekly=25*40=1000, annual=50000
console.log('hourly-annual:', fmt(25*40*50));
// 24. pet-food-cost: total=50+15+30+20=115
console.log('pet-food total:', fmt(50+15+30+20));
// 25. cleaning-time: rooms=4*12=48, baths=2*15=30, floors=1200*0.02=24, total=102
console.log('cleaning-time mins:', Math.round(4*12 + 2*15 + 1200*0.02));

// ================= CAREER 23 =================
// 26. salary-converter: 50000/2080 hourly
console.log('salary-converter hourly:', fmt(50000/2080));
// 27. salary-negotiation: diff=10000, total=10000*(1+1.03+1.03^2+1.03^3+1.03^4)
let t=0; for(let i=0;i<5;i++){t+=10000*Math.pow(1.03,i)}
console.log('salary-negotiation total:', Math.round(t));
// 28. raise-calculator: 75000*1.10
console.log('raise new:', fmt(75000*1.1));
// 29. tax-bracket: taxable=66150 → 11000*0.1+(44725-11000)*0.12+(66150-44725)*0.22
console.log('tax-bracket tax:', fmt(11000*0.1+(44725-11000)*0.12+(66150-44725)*0.22));
// 30. freelance-hourly-rate: hrs=2080*0.7=1456, rate=100000/1456
console.log('freelance hourly rate:', fmt(100000/(2080*0.7)));
// 31. freelance-project: 40*75+500
console.log('freelance-project quote:', fmt(40*75+500));
// 32. contractor-rate: total=100000*1.3=130000, rate=130000/2080
console.log('contractor-rate:', fmt(130000/2080));
// 33. overtime-pay: reg=25*40=1000, ot=25*1.5*10=375, weekly=1375
console.log('overtime weekly:', fmt(25*40 + 25*1.5*10));
// 34. bonus-calc: bonus=80000*0.15=12000, commission=500000*0.05=25000
console.log('bonus-calc bonus:', fmt(80000*0.15), 'commission:', fmt(500000*0.05));
// 35. pay-gap: gap=10000, pct=10000/80000*100
console.log('pay-gap pct:', fmt(10000/80000*100));
// 36. 401k-match: your=80000*0.06=4800, match=min(6,6)*1.0*80000/100=4800
console.log('401k match:', fmt(80000*0.06), fmt(Math.min(6,6)*1*80000/100));
// 37. stock-options: 10000*(25-10)
console.log('stock-options value:', fmt(10000*15));
// 38. side-hustle: 10*30*52*12/12
console.log('side-hustle annual:', fmt(10*30*52*12/12));
// 39. crypto-tax: gain=40000, long rate 15% → 6000
console.log('crypto-tax gain:', fmt(40000), 'tax:', fmt(40000*0.15));
// 40. career-gap: lost=100000*2=200000, lostGrowth=100000*((1.05^2-1)/0.05*100... — check impl separately
console.log('career-gap lostEarnings:', fmt(100000*2));
// 41. remortgage-calc: balance 250000, 5% vs 3.5%, 20y
const r1=0.05/12, r2v=0.035/12, n=240;
const oldPmt=250000*r1*Math.pow(1+r1,n)/(Math.pow(1+r1,n)-1);
const newPmt=250000*r2v*Math.pow(1+r2v,n)/(Math.pow(1+r2v,n)-1);
console.log('remortgage saving:', fmt((oldPmt-newPmt)*n), 'old:', fmt(oldPmt), 'new:', fmt(newPmt));
// 42. mortgage-afford: maxBorrow=100000*4.5=450000, maxMonthly=(100000/12)*0.28, r=0.045/12, n=300
const maxMonthly=(100000/12)*0.28, r3=0.045/12, n3=300;
const maxFromPmt=maxMonthly*(Math.pow(1+r3,n3)-1)/(r3*Math.pow(1+r3,n3));
console.log('mortgage-afford maxFromPmt:', fmt(maxFromPmt), 'affordable:', fmt(Math.min(450000, 50000+maxFromPmt)));
// 43. tax-refund: taxable=66150 → same as tax-bracket; refund=15000-9860.5
console.log('tax-refund refund:', fmt(15000 - 9860.5));
// 44. invoicing-calc: disc=1000*0.05=50, after=950, tax=95, total=1045
console.log('invoicing total:', fmt(1000*0.95*1.1));
// 45. employment-status: profit=65000, seTax=65000*0.153*0.9235=9184.21, ded=4592.10, incomeTaxable=60407.9
const seTax=65000*0.153*0.9235;
console.log('employment-status seTax:', fmt(seTax));
// 46. commission-plan: sales>quota → base=50000*0.05=2500, above=50000*0.08=4000, total=6500
console.log('commission-plan total:', fmt(50000*0.05 + 50000*0.08));
// 47. freelance-budget: tax=8000*0.3=2400, after=5600, afterExp=5100, savings=1020, spending=4080
console.log('freelance-budget spending:', fmt((8000-2400-500)*0.8));
// 48. redundancy-pay: age 35, 8 yrs, weekly 1000 → first 8 at 1.0 (age<41) = 8000
console.log('redundancy-pay:', fmt(8*1.0*1000));

// ================= BUSINESS 21 =================
// 49. business-roi: (100000-75000)/75000*100
console.log('business-roi:', fmt(25000/75000*100));
// 50. profit-margin: (50000-35000)/50000*100
console.log('profit-margin:', fmt(15000/50000*100));
// 51. ltv: 50*24
console.log('ltv:', fmt(50*24));
// 52. cac: 10000/100
console.log('cac:', fmt(100));
// 53. conversion-rate: 250/5000*100
console.log('conversion-rate:', fmt(5));
// 54. churn: 50/1000*100
console.log('churn:', fmt(5));
// 55. roas: 5000/1000
console.log('roas:', fmt(5));
// 56. burn-rate: 500000/50000
console.log('burn-rate runway:', fmt(10));
// 57. mrr: 500*20
console.log('mrr:', fmt(10000));
// 58. nps: (60-20)/100*100
console.log('nps:', Math.round(40));
// 59. freelance-rate: 80000/(25*48)
console.log('freelance-rate:', fmt(80000/1200));
// 60. pricing: 10/(1-0.4)
console.log('pricing:', fmt(10/0.6));
// 61. inventory: 200000/50000
console.log('inventory turnover:', fmt(4));
// 62. break-even-revenue: 50000/0.4
console.log('break-even-revenue:', fmt(125000));
// 63. payback: 50000/15000
console.log('payback:', fmt(50000/15000));
// 64. depreciation: (50000-5000)/5
console.log('depreciation annual:', fmt(9000));
// 65. discount-rate WACC: (600000/1000000*0.12)+(400000/1000000*0.06*0.75)
console.log('wacc:', fmt((0.6*0.12)+(0.4*0.06*0.75))*100);
// 66. saas-unit-metrics: arpu=10000/100=100, lifespan=1/0.05=20, ltv=100*20*0.8=1600
console.log('saas ltv:', fmt(10000/100*20*0.8), 'arpu:', fmt(100));
// 67. break-even-point: cm=50-20=30, bep=5000/30=166.67 → ceil 167
console.log('break-even-point units:', Math.ceil(5000/30));
// 68. invoice-due-date: fee=1000*0.015*(10/30)
console.log('invoice late fee:', fmt(1000*0.015*(10/30)));
// 69. employee-cost: b=60000*0.2=12000, o=6000, bo=3000, total=81000
console.log('employee-cost total:', fmt(60000*1.35));
