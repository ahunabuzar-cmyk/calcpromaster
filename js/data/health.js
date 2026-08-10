// Health calculators with step-by-step (19)
const HEALTH_TOOLS = [
  { id: 'bmi', name: 'BMI Calculator', desc: 'Calculate Body Mass Index with category', kw: 'bmi calculator for men and women, body mass index calculator with age, body mass index',
    inputs: [{id:'weight',label:'Weight (kg)',type:'number',def:70,units:[{l:'kg',f:1,sel:true},{l:'lb',f:2.20462}]},{id:'height',label:'Height (cm)',type:'number',def:170,units:[{l:'cm',f:1,sel:true},{l:'m',f:0.01}]}],
    calc: function(v) { const a = AdvancedCalc.bmiSteps(v.weight, v.height); return { result: 'BMI: ' + a.bmi, chart: Charts.gauge(parseFloat(a.bmi), 40, {center: a.category}), extra: 'Category: ' + a.category }; },
    steps: function(v) { const h=v.height/100; const bmi=v.weight/(h*h); return ['Formula: BMI = weight(kg) / height(m)²','Step 1: Height in meters = '+v.height+'/100 = '+h+'m','Step 2: BMI = '+v.weight+' / '+h+'² = '+v.weight+' / '+(h*h).toFixed(4),'Step 3: BMI = '+bmi.toFixed(1),bmi<18.5?'Step 4: Underweight':bmi<25?'Step 4: Normal weight':bmi<30?'Step 4: Overweight':'Step 4: Obese']; } },
  { id: 'bmr', name: 'BMR Calculator', desc: 'Basal metabolic rate — 3 formulas: Mifflin-St Jeor, Harris-Benedict, Katch-McArdle', kw: 'bmr calculator for women over 50, calorie burn calculator at rest, basal metabolic rate',
    inputs: [
      {id:'formula',label:'Formula',type:'select',opts:[{v:'mifflin',l:'Mifflin-St Jeor'},{v:'harris',l:'Harris-Benedict'},{v:'katch',l:'Katch-McArdle (needs BF%)'}],def:'mifflin'},
      {id:'weight',label:'Weight (kg)',type:'number',def:70},
      {id:'height',label:'Height (cm)',type:'number',def:170},
      {id:'age',label:'Age',type:'number',def:30},
      {id:'gender',label:'Gender',type:'select',opts:[{v:'male',l:'Male'},{v:'female',l:'Female'}],def:'male'},
      {id:'bf',label:'Body Fat % (for Katch-McArdle)',type:'number',def:15}
    ],
    calc: function(v) {
      const mifflin = v.gender === 'male' ? 10*v.weight + 6.25*v.height - 5*v.age + 5 : 10*v.weight + 6.25*v.height - 5*v.age - 161;
      const harris = v.gender === 'male' ? 88.362 + 13.397*v.weight + 4.799*v.height - 5.677*v.age : 447.593 + 9.247*v.weight + 3.098*v.height - 4.330*v.age;
      const bfPct = parseFloat(v.bf) || 15;
      const lbm = v.weight * (1 - bfPct/100);
      const katch = 370 + 21.6 * lbm;
      
      let bmr, formulaName;
      if (v.formula === 'harris') { bmr = harris; formulaName = 'Harris-Benedict'; }
      else if (v.formula === 'katch') { bmr = katch; formulaName = 'Katch-McArdle'; }
      else { bmr = mifflin; formulaName = 'Mifflin-St Jeor'; }
      
      // Show all three for comparison
      const extra = 'Mifflin: ' + mifflin.toFixed(0) + ' | Harris: ' + harris.toFixed(0) + ' | Katch: ' + katch.toFixed(0);
      return { result: 'BMR: ' + bmr.toFixed(0) + ' cal/day (' + formulaName + ')', chart: Charts.bar([mifflin, harris, katch], ['Mifflin','Harris','Katch']), extra: extra };
    },
    steps: function(v) {
      const mifflin = v.gender==='male'?10*v.weight+6.25*v.height-5*v.age+5:10*v.weight+6.25*v.height-5*v.age-161;
      const harris = v.gender==='male'?88.362+13.397*v.weight+4.799*v.height-5.677*v.age:447.593+9.247*v.weight+3.098*v.height-4.330*v.age;
      const lbm = v.weight*(1-(v.bf||15)/100);
      const katch = 370+21.6*lbm;
      if (v.formula==='harris') return ['Formula (Harris-Benedict, 1919):','Male: BMR = 88.362 + 13.397W + 4.799H - 5.677A','Female: BMR = 447.593 + 9.247W + 3.098H - 4.330A','≈ '+harris.toFixed(0)+' cal/day','Note: Older formula, tends to overestimate']; 
      if (v.formula==='katch') return ['Formula (Katch-McArdle):','BMR = 370 + 21.6 × (LBM)','LBM = Weight × (1 - BF%)','LBM = '+v.weight+' × (1 - '+(v.bf||15)/100+') = '+lbm.toFixed(1)+' kg','BMR = 370 + 21.6 × '+lbm.toFixed(1)+' = '+katch.toFixed(0)+' cal/day','Note: Most accurate if BF% is known']; 
      return ['Formula (Mifflin-St Jeor, 1990):','Male: BMR = 10W + 6.25H - 5A + 5','Female: BMR = 10W + 6.25H - 5A - 161','≈ '+mifflin.toFixed(0)+' cal/day','Note: Most modern, widely used formula']; 
    } },
  { id: 'calorie', name: 'Calorie Calculator', desc: 'Daily calorie needs (TDEE)', kw: 'daily calorie intake calculator to lose weight, maintenance calorie calculator with activity level',
    inputs: [
      {id:'formula',label:'BMR Formula',type:'select',opts:[{v:'mifflin',l:'Mifflin-St Jeor'},{v:'harris',l:'Harris-Benedict'},{v:'katch',l:'Katch-McArdle'}],def:'mifflin'},
      {id:'weight',label:'Weight (kg)',type:'number',def:70,slider:{min:30,max:300,step:1}},
      {id:'height',label:'Height (cm)',type:'number',def:170,slider:{min:100,max:250,step:1}},
      {id:'age',label:'Age',type:'number',def:30,slider:{min:10,max:100,step:1}},
      {id:'gender',label:'Gender',type:'select',opts:[{v:'male',l:'Male'},{v:'female',l:'Female'}],def:'male'},
      {id:'bf',label:'Body Fat % (for Katch-McArdle)',type:'number',def:15,slider:{min:3,max:50,step:1}},
      {id:'activity',label:'Activity Level',type:'select',opts:[{v:'1.2',l:'Sedentary'},{v:'1.375',l:'Light'},{v:'1.55',l:'Moderate'},{v:'1.725',l:'Active'},{v:'1.9',l:'Very Active'}],def:'1.55'}
    ],
    calc: function(v) {
      const mifflin = v.gender === 'male' ? 10*v.weight + 6.25*v.height - 5*v.age + 5 : 10*v.weight + 6.25*v.height - 5*v.age - 161;
      const harris = v.gender === 'male' ? 88.362 + 13.397*v.weight + 4.799*v.height - 5.677*v.age : 447.593 + 9.247*v.weight + 3.098*v.height - 4.330*v.age;
      const lbm = v.weight * (1 - (v.bf || 15)/100);
      const katch = 370 + 21.6 * lbm;
      let bmr;
      if (v.formula === 'harris') bmr = harris;
      else if (v.formula === 'katch') bmr = katch;
      else bmr = mifflin;
      
      const tdee = bmr * parseFloat(v.activity);
      return { result: 'Daily Calories: ' + tdee.toFixed(0), chart: Charts.bar([tdee*0.8, tdee, tdee*1.2], ['Lose','Maintain','Gain']), extra: 'TDEE: ' + tdee.toFixed(0) + ' cal | BMR: ' + bmr.toFixed(0) + ' (' + v.formula + ')' };
    },
    steps: function(v) { 
      const mifflin=v.gender==='male'?10*v.weight+6.25*v.height-5*v.age+5:10*v.weight+6.25*v.height-5*v.age-161;
      const harris=v.gender==='male'?88.362+13.397*v.weight+4.799*v.height-5.677*v.age:447.593+9.247*v.weight+3.098*v.height-4.330*v.age;
      const lbm=v.weight*(1-(v.bf||15)/100);
      const katch=370+21.6*lbm;
      let bmr=v.formula==='harris'?harris:v.formula==='katch'?katch:mifflin;
      const tdee=bmr*parseFloat(v.activity);
      return ['Step 1: Calculate BMR using '+v.formula+' formula = '+bmr.toFixed(0)+' cal','Step 2: Apply activity factor '+v.activity,'Step 3: TDEE = '+bmr.toFixed(0)+' × '+v.activity+' = '+tdee.toFixed(0)+' cal/day','Step 4: To lose weight: '+((tdee*0.8).toFixed(0))+' cal/day','Step 5: To gain weight: '+((tdee*1.2).toFixed(0))+' cal/day']; 
    } },
  { id: 'body-fat', name: 'Body Fat Calculator', desc: 'Estimate body fat percentage (Navy method)', kw: 'body fat percentage navy method calculator, body fat calculator with measurements, body fat calculator, body fat percentage',
    inputs: [{id:'weight',label:'Weight (kg)',type:'number',def:70},{id:'waist',label:'Waist (cm)',type:'number',def:85},{id:'neck',label:'Neck (cm)',type:'number',def:38},{id:'height',label:'Height (cm)',type:'number',def:170},{id:'gender',label:'Gender',type:'select',opts:[{v:'male',l:'Male'},{v:'female',l:'Female'}],def:'male'}],
    calc: function(v) { let bf; if (v.gender === 'male') bf = 86.010*Math.log10(v.waist - v.neck) - 70.041*Math.log10(v.height) + 36.76; else bf = 163.205*Math.log10(v.waist) - 97.684*Math.log10(v.height) - 78.387; return { result: 'Body Fat: ' + bf.toFixed(1) + '%', chart: Charts.gauge(bf, 40), extra: bf < 20 ? 'Healthy' : 'Above average' }; },
    steps: function(v) { return ['Formula (US Navy method):','Male: BF% = 86.01×log(waist-neck) - 70.041×log(height) + 36.76','Female: BF% = 163.205×log(waist) - 97.684×log(height) - 78.387','Step 1: Apply formula with your measurements','Step 2: Body fat = '+((v.gender==='male'?86.010*Math.log10(v.waist-v.neck)-70.041*Math.log10(v.height)+36.76:163.205*Math.log10(v.waist)-97.684*Math.log10(v.height)-78.387)).toFixed(1)+'%']; } },
  { id: 'water-intake-health', name: 'Water Intake Calculator', desc: 'Daily water requirement', kw: 'daily water intake calculator by weight, how much water should i drink calculator',
    inputs: [{id:'weight',label:'Weight (kg)',type:'number',def:70},{id:'activity',label:'Activity (min/day)',type:'number',def:30}],
    calc: function(v) { const water = (v.weight * 0.033) + (v.activity / 30 * 0.35); return { result: 'Daily Water: ' + water.toFixed(1) + ' L', chart: Charts.gauge(water, 4), extra: '≈ ' + (water * 4).toFixed(0) + ' glasses' }; },
    steps: function(v) { const water=v.weight*0.033+v.activity/30*0.35; return ['Step 1: Base water = '+v.weight+'kg × 0.033 = '+(v.weight*0.033).toFixed(2)+'L','Step 2: Activity bonus = '+v.activity+'/30 × 0.35 = '+(v.activity/30*0.35).toFixed(2)+'L','Step 3: Total = '+(v.weight*0.033).toFixed(2)+' + '+(v.activity/30*0.35).toFixed(2)+' = '+water.toFixed(1)+'L/day']; } },
  { id: 'ideal-body-weight', name: 'Ideal Weight Calculator', desc: 'Calculate ideal body weight (Devine)', kw: 'ideal weight calculator',
    inputs: [{id:'height',label:'Height (cm)',type:'number',def:170},{id:'gender',label:'Gender',type:'select',opts:[{v:'male',l:'Male'},{v:'female',l:'Female'}],def:'male'}],
    calc: function(v) { const inches = v.height / 2.54; const base = v.gender === 'male' ? 50 : 45.5; const ideal = base + 2.3 * (inches - 60); return { result: 'Ideal Weight: ' + ideal.toFixed(1) + ' kg', chart: Charts.gauge(ideal, 100), extra: 'Based on Devine formula' }; },
    steps: function(v) { const inches=v.height/2.54; const base=v.gender==='male'?50:45.5; const ideal=base+2.3*(inches-60); return ['Formula (Devine):','Male: 50 + 2.3 × (height_inches - 60)','Female: 45.5 + 2.3 × (height_inches - 60)','Step 1: Height in inches = '+v.height+'/2.54 = '+inches.toFixed(1),'Step 2: Ideal weight = '+base+' + 2.3×'+(inches-60).toFixed(1)+' = '+ideal.toFixed(1)+'kg']; } },
  { id: 'heart-rate', name: 'Heart Rate Zone Calculator', desc: 'Target heart rate zones for exercise', kw: 'max heart rate calculator by age, target heart rate zone calculator, target heart rate',
    inputs: [{id:'age',label:'Age',type:'number',def:30}],
    calc: function(v) { const max = 220 - v.age; const fatBurn = max * 0.6; const cardio = max * 0.75; const peak = max * 0.9; return { result: 'Max HR: ' + max + ' bpm', chart: Charts.bar([max*0.5, fatBurn, cardio, peak, max], ['50%','60%','75%','90%','Max']), extra: 'Fat burn: ' + fatBurn.toFixed(0) + ' bpm' }; },
    steps: function(v) { const max=220-v.age; return ['Step 1: Max HR = 220 - age = 220 - '+v.age+' = '+max+' bpm','Step 2: Fat burn zone (50-65%) = '+(max*0.5).toFixed(0)+'-'+(max*0.65).toFixed(0)+' bpm','Step 3: Cardio zone (65-85%) = '+(max*0.65).toFixed(0)+'-'+(max*0.85).toFixed(0)+' bpm','Step 4: Peak zone (85-95%) = '+(max*0.85).toFixed(0)+'-'+(max*0.95).toFixed(0)+' bpm']; } },
  { id: 'pregnancy', name: 'Pregnancy Due Date', desc: 'Calculate pregnancy due date', kw: 'pregnancy due date calculator by last period, pregnancy week calculator from conception, pregnancy due date',
    inputs: [{id:'lmp',label:'Last Menstrual Period',type:'date',def:''}],
    calc: function(v) { if (!v.lmp) return { result: 'Enter date', chart: '', extra: '' }; const d = new Date(v.lmp); d.setDate(d.getDate() + 280); return { result: 'Due Date: ' + d.toLocaleDateString(), chart: Charts.gauge(280, 280), extra: '40 weeks from LMP' }; },
    steps: function(v) { if(!v.lmp) return ['Enter your last menstrual period date']; const d=new Date(v.lmp); d.setDate(d.getDate()+280); return ['Step 1: Naegele\'s rule: Due date = LMP + 280 days','Step 2: Due date = '+new Date(v.lmp).toLocaleDateString()+' + 280 days','Step 3: Estimated due date = '+d.toLocaleDateString(),'Step 4: This is approximately 40 weeks']; } },
  { id: 'ovulation', name: 'Ovulation Calculator', desc: 'Calculate ovulation date', kw: 'free ovulation calculator',
    inputs: [{id:'lmp',label:'Last Period Date',type:'date',def:''},{id:'cycle',label:'Cycle Length (days)',type:'number',def:28}],
    calc: function(v) { if (!v.lmp) return { result: 'Enter date', chart: '', extra: '' }; const d = new Date(v.lmp); d.setDate(d.getDate() + v.cycle - 14); return { result: 'Ovulation: ' + d.toLocaleDateString(), chart: Charts.gauge(v.cycle, 35), extra: 'Fertile window: 5 days before' }; },
    steps: function(v) { if(!v.lmp) return ['Enter your last period date']; const d=new Date(v.lmp); d.setDate(d.getDate()+v.cycle-14); return ['Step 1: Ovulation = LMP + (cycle length - 14)','Step 2: Ovulation = '+new Date(v.lmp).toLocaleDateString()+' + '+(v.cycle-14)+' days','Step 3: Estimated ovulation = '+d.toLocaleDateString(),'Step 4: Fertile window: 5 days before to 1 day after']; } },
  { id: 'macros', name: 'Macronutrient Calculator', desc: 'Calculate daily macros (protein/carbs/fat)', kw: 'macro calculator for lean bulking, protein carb fat macro calculator, protein carbs fat',
    inputs: [{id:'calories',label:'Daily Calories',type:'number',def:2000},{id:'protein',label:'Protein (%)',type:'number',def:30},{id:'carbs',label:'Carbs (%)',type:'number',def:40},{id:'fat',label:'Fat (%)',type:'number',def:30}],
    calc: function(v) { const p = v.calories * v.protein/100/4; const c = v.calories * v.carbs/100/4; const f = v.calories * v.fat/100/9; return { result: 'Protein: ' + p.toFixed(0) + 'g | Carbs: ' + c.toFixed(0) + 'g | Fat: ' + f.toFixed(0) + 'g', chart: Charts.donut([p, c, f], ['Protein','Carbs','Fat']), extra: 'Total: ' + v.calories + ' cal' }; },
    steps: function(v) { const p=v.calories*v.protein/100/4; const c=v.calories*v.carbs/100/4; const f=v.calories*v.fat/100/9; return ['Step 1: Protein = '+v.protein+'% of '+v.calories+' cal ÷ 4 = '+p.toFixed(0)+'g','Step 2: Carbs = '+v.carbs+'% of '+v.calories+' cal ÷ 4 = '+c.toFixed(0)+'g','Step 3: Fat = '+v.fat+'% of '+v.calories+' cal ÷ 9 = '+f.toFixed(0)+'g']; } },
  { id: 'lean-body-mass', name: 'Lean Body Mass', desc: 'Calculate lean body mass', kw: 'lean body mass',
    inputs: [{id:'weight',label:'Weight (kg)',type:'number',def:70},{id:'bodyfat',label:'Body Fat (%)',type:'number',def:20}],
    calc: function(v) { const lbm = v.weight * (1 - v.bodyfat/100); const fm = v.weight - lbm; return { result: 'Lean Mass: ' + lbm.toFixed(1) + ' kg', chart: Charts.donut([lbm, fm], ['Lean','Fat']), extra: 'Fat Mass: ' + fm.toFixed(1) + ' kg' }; },
    steps: function(v) { const lbm=v.weight*(1-v.bodyfat/100); return ['Formula: LBM = Weight × (1 - Body Fat%)','Step 1: LBM = '+v.weight+' × (1 - '+v.bodyfat/100+') = '+lbm.toFixed(1)+'kg','Step 2: Fat mass = '+v.weight+' - '+lbm.toFixed(1)+' = '+(v.weight-lbm).toFixed(1)+'kg']; } },
  { id: 'bsa', name: 'Body Surface Area', desc: 'Calculate body surface area (Mosteller)', kw: 'body surface area',
    inputs: [{id:'weight',label:'Weight (kg)',type:'number',def:70},{id:'height',label:'Height (cm)',type:'number',def:170}],
    calc: function(v) { const bsa = Math.sqrt(v.height * v.weight / 3600); return { result: 'BSA: ' + bsa.toFixed(2) + ' m²', chart: Charts.gauge(bsa, 3), extra: 'Mosteller formula' }; },
    steps: function(v) { const bsa=Math.sqrt(v.height*v.weight/3600); return ['Formula (Mosteller): BSA = √(height × weight / 3600)','Step 1: BSA = √('+v.height+' × '+v.weight+' / 3600)','Step 2: BSA = √'+((v.height*v.weight/3600)).toFixed(2),'Step 3: BSA = '+bsa.toFixed(2)+' m²']; } },
  { id: 'waist-hip', name: 'Waist-to-Hip Ratio', desc: 'Calculate WHR and health risk', kw: 'waist to hip ratio',
    inputs: [{id:'waist',label:'Waist (cm)',type:'number',def:85},{id:'hip',label:'Hip (cm)',type:'number',def:100}],
    calc: function(v) { const whr = v.waist / v.hip; return { result: 'WHR: ' + whr.toFixed(2), chart: Charts.gauge(whr, 1.5), extra: whr < 0.85 ? 'Low risk' : whr < 1.0 ? 'Moderate risk' : 'High risk' }; },
    steps: function(v) { const whr=v.waist/v.hip; return ['Formula: WHR = Waist / Hip','Step 1: WHR = '+v.waist+' / '+v.hip+' = '+whr.toFixed(2),whr<0.85?'Step 2: Low health risk':whr<1.0?'Step 2: Moderate health risk':'Step 2: High health risk']; } },
  { id: 'vo2-max', name: 'VO2 Max Calculator', desc: 'Estimate cardiovascular fitness', kw: 'vo2 max calculator',
    inputs: [{id:'distance',label:'1.5 Mile Run (min)',type:'number',def:12},{id:'age',label:'Age',type:'number',def:25},{id:'gender',label:'Gender',type:'select',opts:[{v:'male',l:'Male'},{v:'female',l:'Female'}],def:'male'}],
    calc: function(v) { const vo2 = v.gender === 'male' ? 110 - 2.6*v.distance - 0.3*v.age : 100 - 2.4*v.distance - 0.3*v.age; return { result: 'VO2 Max: ' + vo2.toFixed(1) + ' ml/kg/min', chart: Charts.gauge(vo2, 60), extra: vo2 > 40 ? 'Good fitness' : 'Below average' }; },
    steps: function(v) { const vo2=v.gender==='male'?110-2.6*v.distance-0.3*v.age:100-2.4*v.distance-0.3*v.age; return ['Formula (Cooper 1.5-mile run):','Male: VO2 = 110 - 2.6×time - 0.3×age','Female: VO2 = 100 - 2.4×time - 0.3×age','Step 1: VO2 = '+vo2.toFixed(1)+' ml/kg/min',vo2>40?'Step 2: Good cardiovascular fitness':'Step 2: Below average fitness']; } },
  { id: 'pregnancy-weight', name: 'Pregnancy Weight Gain', desc: 'Recommended pregnancy weight gain', kw: 'pregnancy due date calculator by last period, pregnancy week calculator from conception, pregnancy weight gain',
    inputs: [{id:'bmi',label:'Pre-pregnancy BMI',type:'number',def:22},{id:'trimester',label:'Trimester',type:'select',opts:[{v:'1',l:'First'},{v:'2',l:'Second'},{v:'3',l:'Third'}],def:'2'}],
    calc: function(v) { const total = v.bmi < 18.5 ? 13 : v.bmi < 25 ? 11 : v.bmi < 30 ? 7 : 5; const gain = v.trimester === '1' ? total * 0.1 : v.trimester === '2' ? total * 0.5 : total; return { result: 'Recommended Gain: ' + gain.toFixed(1) + ' kg', chart: Charts.gauge(gain, 20), extra: 'Total: ' + total + ' kg' }; },
    steps: function(v) { const total=v.bmi<18.5?13:v.bmi<25?11:v.bmi<30?7:5; return ['Step 1: BMI category determines total gain','Step 2: Underweight: 13kg | Normal: 11kg | Overweight: 7kg | Obese: 5kg','Step 3: Your recommended total = '+total+'kg','Step 4: By '+v.trimester+' trimester: '+((v.trimester==='1'?total*0.1:v.trimester==='2'?total*0.5:total)).toFixed(1)+'kg']; } },
  { id: 'blood-pressure', name: 'Blood Pressure Category', desc: 'Check blood pressure category', kw: 'blood pressure category calculator',
    inputs: [{id:'systolic',label:'Systolic',type:'number',def:120},{id:'diastolic',label:'Diastolic',type:'number',def:80}],
    calc: function(v) { let cat = 'Normal'; if (v.systolic >= 180 || v.diastolic >= 120) cat = 'Hypertensive Crisis'; else if (v.systolic >= 140 || v.diastolic >= 90) cat = 'Hypertension Stage 2'; else if (v.systolic >= 130 || v.diastolic >= 80) cat = 'Hypertension Stage 1'; else if (v.systolic >= 120) cat = 'Elevated'; return { result: cat, chart: Charts.gauge(v.systolic, 200), extra: 'BP: ' + v.systolic + '/' + v.diastolic }; },
    steps: function(v) { let cat='Normal'; if(v.systolic>=180||v.diastolic>=120)cat='Hypertensive Crisis';else if(v.systolic>=140||v.diastolic>=90)cat='Hypertension Stage 2';else if(v.systolic>=130||v.diastolic>=80)cat='Hypertension Stage 1';else if(v.systolic>=120)cat='Elevated'; return ['Step 1: Systolic = '+v.systolic+' mmHg','Step 2: Diastolic = '+v.diastolic+' mmHg','Step 3: Category = '+cat]; } },
  { id: 'calorie-burn', name: 'Calorie Burn Calculator', desc: 'Calories burned by activity', kw: 'daily calorie intake calculator to lose weight, maintenance calorie calculator with activity level',
    inputs: [{id:'weight',label:'Weight (kg)',type:'number',def:70},{id:'met',label:'Activity (MET)',type:'number',def:8},{id:'minutes',label:'Duration (min)',type:'number',def:30}],
    calc: function(v) { const cal = v.met * v.weight * (v.minutes / 60); return { result: 'Burned: ' + cal.toFixed(0) + ' cal', chart: Charts.gauge(cal, 500), extra: 'MET: ' + v.met }; },
    steps: function(v) { const cal=v.met*v.weight*(v.minutes/60); return ['Formula: Calories = MET × weight(kg) × time(hours)','Step 1: Time in hours = '+v.minutes+'/60 = '+(v.minutes/60).toFixed(2)+'h','Step 2: Calories = '+v.met+' × '+v.weight+' × '+(v.minutes/60).toFixed(2),'Step 3: Calories burned = '+cal.toFixed(0)+' kcal']; } },
  { id: 'sleep', name: 'Sleep Calculator', desc: 'Calculate optimal sleep times', kw: 'free sleep calculator',
    inputs: [{id:'wake',label:'Wake Up Time',type:'time',def:'07:00'}],
    calc: function(v) { if (!v.wake) return { result: 'Enter time', chart: '', extra: '' }; const [h,m] = v.wake.split(':').map(Number); const wake = h*60 + m; const cycles = [90, 180, 270, 360, 450]; const times = cycles.map(c => { let t = wake - c - 15; if (t < 0) t += 1440; return Math.floor(t/60) + ':' + String(t%60).padStart(2,'0'); }); return { result: 'Bedtimes: ' + times.join(', '), chart: Charts.bar(cycles, ['1.5h','3h','4.5h','6h','7.5h']), extra: '90-min sleep cycles' }; },
    steps: function(v) { if(!v.wake) return ['Enter wake up time']; return ['Step 1: Sleep cycles are 90 minutes each','Step 2: Allow 15 minutes to fall asleep','Step 3: For 6 hours sleep: go to bed 6h15m before wake','Step 4: For 7.5 hours sleep: go to bed 7h45m before wake']; } },
  { id: 'gfr', name: 'GFR Calculator', desc: 'Estimate kidney function', kw: 'free gfr calculator',
    inputs: [{id:'creatinine',label:'Serum Creatinine (mg/dL)',type:'number',def:1.0},{id:'age',label:'Age',type:'number',def:50},{id:'gender',label:'Gender',type:'select',opts:[{v:'male',l:'Male'},{v:'female',l:'Female'}],def:'male'}],
    calc: function(v) { const factor = v.gender === 'male' ? 1 : 0.742; const gfr = 186 * Math.pow(v.creatinine, -1.154) * Math.pow(v.age, -0.203) * factor; return { result: 'GFR: ' + gfr.toFixed(0) + ' mL/min', chart: Charts.gauge(gfr, 120), extra: gfr > 60 ? 'Normal' : 'Check with doctor' }; },
    steps: function(v) { const factor=v.gender==='male'?1:0.742; const gfr=186*Math.pow(v.creatinine,-1.154)*Math.pow(v.age,-0.203)*factor; return ['Formula (Cockcroft-Gault):','GFR = 186 × Cr^(-1.154) × age^(-0.203) × gender_factor','Step 1: GFR = 186 × '+v.creatinine+'^(-1.154) × '+v.age+'^(-0.203) × '+factor,'Step 2: GFR = '+gfr.toFixed(0)+' mL/min',gfr>60?'Step 3: Normal kidney function':'Step 3: Reduced function - consult doctor']; } },
  { id: 'target-heart-rate', name: 'Target Heart Rate Zones', desc: 'Calculate your heart rate training zones', kw: 'max heart rate calculator by age, target heart rate zone calculator, target heart rate, heart rate zones',
    inputs: [{id:'age',label:'Age',type:'number',def:30},{id:'restingHR',label:'Resting Heart Rate (bpm)',type:'number',def:70},{id:'intensity',label:'Training Intensity',type:'select',opts:[{v:'moderate',l:'Moderate (50–70%)'},{v:'vigorous',l:'Vigorous (70–85%)'},{v:'max',l:'Max (85–100%)'}],def:'moderate'}],
    calc: function(v) { const maxHR=220-v.age; const low=v.restingHR+(maxHR-v.restingHR)*0.5; const high=v.restingHR+(maxHR-v.restingHR)*0.85; const range={moderate:[v.restingHR+(maxHR-v.restingHR)*0.5,v.restingHR+(maxHR-v.restingHR)*0.7],vigorous:[v.restingHR+(maxHR-v.restingHR)*0.7,v.restingHR+(maxHR-v.restingHR)*0.85],max:[v.restingHR+(maxHR-v.restingHR)*0.85,maxHR]}[v.intensity]; return { result: 'Zone: ' + Math.round(range[0]) + '–' + Math.round(range[1]) + ' bpm', chart: Charts.gauge(Math.round((range[0]+range[1])/2), maxHR), extra: 'Max HR: '+maxHR+' bpm | Karvonen method | Resting: '+v.restingHR+' bpm | ' + v.intensity + ' zone' }; },
    steps: function(v) { const max=v.age?220-v.age:190; const lo=v.restingHR+(max-v.restingHR)*0.5; return ['Step 1: Max HR = 220 − '+v.age+' = '+max+' bpm','Step 2: Heart rate reserve = '+max+' − '+v.restingHR+' = '+(max-v.restingHR)+' bpm','Step 3: Zone = resting + reserve × intensity (Karvonen formula)','Step 4: '+v.intensity+' zone ≈ '+Math.round(lo)+'–'+Math.round(v.restingHR+(max-v.restingHR)*0.85)+' bpm']; } },
{ id: "sleep-quality", name: "Sleep Quality Score", desc: "Calculate your sleep quality score based on duration and efficiency", kw: "sleep calculator, sleep quality, sleep score, sleep duration", inputs: [{id:"hoursInBed",label:"Hours in Bed",type:"number",def:8},{id:"hoursAsleep",label:"Hours Asleep",type:"number",def:7},{id:"wakeups",label:"Night Wakings",type:"number",def:1}], calc: function(v) { var eff=Math.min(100,v.hoursAsleep/v.hoursInBed*100); var wPenalty=Math.min(20,v.wakeups*5); var score=Math.max(0,eff-wPenalty); return { result: "Quality Score: "+score.toFixed(0)+"/100", chart: Charts.gauge(score,100), extra: "Efficiency: "+eff.toFixed(0)+"%"+(score<60?" Low quality":" Good quality") }; }, steps: function(v) { var e=v.hoursAsleep/v.hoursInBed*100; var s=Math.max(0,e-Math.min(20,v.wakeups*5)); return ["Step 1: Efficiency = "+e.toFixed(0)+"%","Step 2: Penalty = "+Math.min(20,v.wakeups*5),"Step 3: Score = "+s.toFixed(0)]; } },
{ id: "fatigue-score", name: "Fatigue Score Calculator", desc: "Calculate your fatigue level based on sleep, activity, and stress", kw: "fatigue calculator, tiredness score, energy level, wellness", inputs: [{id:"sleepHours",label:"Avg Sleep Last 3 Days (hours)",type:"number",def:6},{id:"activity",label:"Physical Activity (1-10)",type:"number",def:4},{id:"stress",label:"Stress Level (1-10)",type:"number",def:7}], calc: function(v) { var sleepScore=Math.min(10,v.sleepHours/0.8); var stressPenalty=v.stress*10; var activityBonus=v.activity*3; var score=Math.max(0,Math.min(100,(sleepScore*10)-stressPenalty+activityBonus+30)); return { result: "Fatigue Score: "+score.toFixed(0)+"/100", chart: Charts.gauge(100-score,100), extra: (score>70?"Low fatigue":"Significant fatigue")+" | Sleep: "+v.sleepHours+"h" }; }, steps: function(v) { var s=Math.max(0,Math.min(100,(Math.min(10,v.sleepHours/0.8)*10)-v.stress*10+v.activity*3+30)); return ["Step 1: Score = "+s.toFixed(0)+"/100"]; } }
];
if (typeof module !== 'undefined') module.exports = HEALTH_TOOLS;
