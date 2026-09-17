// F3b batch — 28 genuinely unique tools → 1204 total
// CRLF-safe, idempotent, comma-guarded inserter (proven a2b mechanism).
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const CRLF = '\r\n';

// ---- tool definitions: [file, category, toolCodeLines, qaRows] ----
// Every tool line is a complete array element ending with a comma (trailing commas are legal in JS arrays).

const TOOLS = {
  'science.js': [
    { id: 'dew-point', name: 'Dew Point Calculator', desc: 'Dew point from air temperature and relative humidity (Magnus formula)', kw: 'dew point calculator humidity temperature magnus formula condensation',
      inputs: [{id:'temp',label:'Air Temperature (°C)',type:'number',def:30},{id:'rh',label:'Relative Humidity (%)',type:'number',def:70}],
      calc: function(v){ const a=Math.log(v.rh/100)+(17.27*v.temp)/(237.7+v.temp); const td=(237.7*a)/(17.27-a); return { result: td.toFixed(1)+' °C', chart: null, extra: 'Magnus formula | Humidex comfort: below 13 °C dry, 16–21 °C comfortable, above 21 °C muggy' }; },
      steps: function(v){ const a=Math.log(v.rh/100)+(17.27*v.temp)/(237.7+v.temp); return ['alpha = ln(RH/100) + (17.27×T)/(237.7+T) = '+a.toFixed(3),'Dew point = (237.7×alpha)/(17.27−alpha)']; } },
    { id: 'cloud-base-lcl', name: 'Cloud Base Calculator', desc: 'Estimated cloud base height from surface temperature and dew point', kw: 'cloud base calculator lifted condensation level lcl spread weather',
      inputs: [{id:'temp',label:'Surface Temperature (°C)',type:'number',def:25},{id:'dew',label:'Dew Point (°C)',type:'number',def:15}],
      calc: function(v){ const spread=v.temp-v.dew; const base=Math.max(0,125*spread); return { result: base.toFixed(0)+' m', chart: null, extra: 'Spread: '+spread.toFixed(1)+' °C × 125 m/°C — assumes a well-mixed boundary layer' }; },
      steps: function(v){ return ['Spread = T − Td','Base ≈ 125 m per °C of spread']; } },
    { id: 'grahams-law', name: "Graham's Law Calculator", desc: 'Relative effusion rate of two gases from molar masses', kw: 'grahams law calculator effusion diffusion rate gas molar mass',
      inputs: [{id:'m1',label:'Molar Mass of Gas 1 (g/mol)',type:'number',def:2},{id:'m2',label:'Molar Mass of Gas 2 (g/mol)',type:'number',def:32}],
      calc: function(v){ const rate=Math.sqrt(v.m2/v.m1); return { result: rate.toFixed(2)+' ×', chart: null, extra: 'Gas 1 effuses '+rate.toFixed(2)+' times faster than Gas 2 — rate is inversely proportional to the square root of molar mass' }; },
      steps: function(v){ return ['rate1/rate2 = √(M2/M1)','= √('+v.m2+'/'+v.m1+')']; } },
    { id: 'osmotic-pressure', name: 'Osmotic Pressure Calculator', desc: 'Osmotic pressure of a solution from molarity and temperature (π = MRT)', kw: 'osmotic pressure calculator molarity temperature solution chemistry van t hoff',
      inputs: [{id:'molarity',label:'Molarity (mol/L)',type:'number',def:0.3},{id:'temp',label:'Temperature (K)',type:'number',def:310}],
      calc: function(v){ const pi=v.molarity*0.0821*v.temp; return { result: pi.toFixed(2)+' atm', chart: null, extra: 'π = MRT with R = 0.0821 L·atm/(mol·K); multiply by the van t Hoff factor i for electrolytes' }; },
      steps: function(v){ return ['π = M × R × T','= '+v.molarity+' × 0.0821 × '+v.temp]; } },
    { id: 'sound-intensity', name: 'Sound Intensity Addition Calculator', desc: 'Combined decibel level of two sound sources', kw: 'sound intensity addition calculator decibel db combine two sources logarithmic',
      inputs: [{id:'l1',label:'Source 1 (dB)',type:'number',def:70},{id:'l2',label:'Source 2 (dB)',type:'number',def:60}],
      calc: function(v){ const il=Math.pow(10,v.l1/10)+Math.pow(10,v.l2/10); const total=10*Math.log10(il/1e-12); return { result: total.toFixed(1)+' dB', chart: null, extra: 'Decibels add logarithmically — two equal 70 dB sources give 73 dB, not 140 dB' }; },
      steps: function(v){ return ['I = 10^(L1/10) + 10^(L2/10) W/m²','L = 10·log10(I / 10⁻¹²)']; } },
    { id: 'angular-velocity', name: 'Angular Velocity Calculator', desc: 'Convert rotational speed between rpm, rad/s, and Hz', kw: 'angular velocity calculator rpm rad/s radians per second rotation frequency',
      inputs: [{id:'rpm',label:'Rotational Speed (rpm)',type:'number',def:60}],
      calc: function(v){ const rad=v.rpm*2*Math.PI/60; const hz=v.rpm/60; return { result: rad.toFixed(2)+' rad/s', chart: null, extra: 'Equivalent: '+hz.toFixed(3)+' Hz ('+v.rpm+' rpm × 2π/60)' }; },
      steps: function(v){ return ['ω (rad/s) = rpm × 2π / 60','f (Hz) = rpm / 60']; } }
  ],
  'health.js': [
    { id: 'corrected-calcium', name: 'Corrected Calcium Calculator', desc: 'Calcium level adjusted for low albumin (Payne formula)', kw: 'corrected calcium calculator albumin payne formula hypocalcemia',
      inputs: [{id:'ca',label:'Measured Calcium (mg/dL)',type:'number',def:8},{id:'alb',label:'Albumin (g/dL)',type:'number',def:2}],
      calc: function(v){ const cor=v.ca+0.8*(4-v.alb); return { result: cor.toFixed(1)+' mg/dL', chart: null, extra: 'Corrected = Ca + 0.8 × (4.0 − albumin). Educational estimate — interpret with ionized calcium when available' }; },
      steps: function(v){ return ['Corrected = measured Ca + 0.8 × (4.0 − albumin)']; } },
    { id: 'winters-formula', name: "Winter's Formula Calculator", desc: 'Expected respiratory compensation for metabolic acidosis', kw: 'winters formula calculator metabolic acidosis compensation pco2 expected',
      inputs: [{id:'hco3',label:'Bicarbonate (mEq/L)',type:'number',def:12}],
      calc: function(v){ const pco2=1.5*v.hco3+8; return { result: (pco2-2).toFixed(0)+'–'+(pco2+2).toFixed(0)+' mmHg', chart: null, extra: "Expected PCO₂ = 1.5 × HCO₃⁻ + 8 (±2). Measured PCO₂ higher suggests additional respiratory acidosis" }; },
      steps: function(v){ return ["Expected PCO₂ = 1.5 × HCO₃⁻ + 8 ± 2"]; } },
    { id: 'maintenance-fluids', name: 'Maintenance Fluids Calculator (4-2-1)', desc: 'Hourly pediatric maintenance fluid rate by the 4-2-1 rule', kw: 'maintenance fluids calculator 4-2-1 rule pediatric hourly rate Holliday Segar',
      inputs: [{id:'wt',label:'Weight (kg)',type:'number',def:25}],
      calc: function(v){ const w=v.wt; const rate=w<=10?4*w:w<=20?40+2*(w-10):60+1*(w-20); return { result: rate.toFixed(0)+' mL/hr', chart: null, extra: '4-2-1 rule (Holliday-Segar): 4 mL/kg/hr for the first 10 kg, 2 for the next 10, 1 thereafter' }; },
      steps: function(v){ return ['First 10 kg → 4 mL/kg/hr','Next 10 kg → 2 mL/kg/hr','Each kg above 20 → 1 mL/kg/hr']; } },
    { id: 'free-water-deficit', name: 'Free Water Deficit Calculator', desc: 'Water deficit in hypernatremia from serum sodium and weight', kw: 'free water deficit calculator hypernatremia sodium correction dehydration',
      inputs: [{id:'na',label:'Serum Sodium (mEq/L)',type:'number',def:155},{id:'wt',label:'Weight (kg)',type:'number',def:70}],
      calc: function(v){ const def=0.6*v.wt*(v.na/140-1); return { result: def.toFixed(1)+' L', chart: null, extra: 'Deficit = 0.6 × weight × (Na/140 − 1). Correct sodium by ≤10–12 mEq/L per 24 h — use 0.5 for women' }; },
      steps: function(v){ return ['Deficit = TBW × (Na measured / 140 − 1)','TBW ≈ 0.6 × body weight']; } },
    { id: 'serum-osmolality', name: 'Serum Osmolality Calculator', desc: 'Calculated plasma osmolality from sodium, glucose, and BUN', kw: 'serum osmolality calculator sodium glucose bun calculated plasma osm gap',
      inputs: [{id:'na',label:'Sodium (mEq/L)',type:'number',def:140},{id:'glu',label:'Glucose (mg/dL)',type:'number',def:90},{id:'bun',label:'BUN (mg/dL)',type:'number',def:14}],
      calc: function(v){ const osm=2*v.na+v.glu/18+v.bun/2.8; return { result: osm.toFixed(1)+' mOsm/kg', chart: null, extra: '2×Na + glucose/18 + BUN/2.8. Normal 275–295; a large osmolar gap suggests unmeasured osmoles (e.g., toxic alcohols)' }; },
      steps: function(v){ return ['Osm = 2×Na + Glu/18 + BUN/2.8']; } },
    { id: 'total-body-water', name: 'Total Body Water Calculator', desc: 'Body water estimate via the Watson formula', kw: 'total body water calculator watson formula tbw hydration',
      inputs: [{id:'wt',label:'Weight (kg)',type:'number',def:70},{id:'ht',label:'Height (cm)',type:'number',def:180},{id:'age',label:'Age (years)',type:'number',def:45},{id:'sex',label:'Sex',type:'select',opts:[{v:'male',l:'Male'},{v:'female',l:'Female'}],def:'male'}],
      calc: function(v){ const tbw=v.sex==='male' ? 2.447-0.09516*v.age+0.1074*v.ht+0.3362*v.wt : -2.097+0.1069*v.ht+0.2466*v.wt; return { result: tbw.toFixed(1)+' L', chart: null, extra: 'Watson formula — used for dosing and dilution studies; roughly 60% of body mass in adult men' }; },
      steps: function(v){ return v.sex==='male' ? ['TBW = 2.447 − 0.09516×age + 0.1074×height + 0.3362×weight'] : ['TBW = −2.097 + 0.1069×height + 0.2466×weight']; } },
    { id: 'pf-ratio', name: 'P/F Ratio Calculator', desc: 'PaO₂/FiO₂ ratio for oxygenation assessment', kw: 'pf ratio calculator pao2 fio2 oxygenation ards berlin criteria',
      inputs: [{id:'pao2',label:'PaO₂ (mmHg)',type:'number',def:100},{id:'fio2',label:'FiO₂ (%)',type:'number',def:50}],
      calc: function(v){ const r=v.pao2/(v.fio2/100); const cls=r<100?'Severe (ARDS Berlin <100)':r<200?'Moderate (100–200)':r<300?'Mild (200–300)':'Normal (>300)'; return { result: r.toFixed(2)+':1', chart: null, extra: 'Berlin classification: '+cls+'. Educational reference — clinical decisions need the full picture' }; },
      steps: function(v){ return ['P/F = PaO₂ ÷ FiO₂ (as a fraction)']; } }
  ],
  'fitness-exercise.js': [
    { id: 'sweat-rate', name: 'Sweat Rate Calculator', desc: 'Fluid loss per hour from pre/post exercise weights', kw: 'sweat rate calculator hydration fluid loss exercise weight change athlete',
      inputs: [{id:'pre',label:'Pre-exercise Weight (kg)',type:'number',def:70},{id:'post',label:'Post-exercise Weight (kg)',type:'number',def:68.6},{id:'mins',label:'Duration (minutes)',type:'number',def:90}],
      calc: function(v){ const rate=(v.pre-v.post)/(v.mins/60); return { result: rate.toFixed(2)+' L/hr', chart: null, extra: '1 kg of mass loss ≈ 1 L of sweat. Drink roughly 1.25–1.5 × the loss to rehydrate fully' }; },
      steps: function(v){ return ['Loss (L) = pre − post weight','Rate = loss ÷ hours']; } },
    { id: 'rpe-load', name: 'Training Load Calculator (sRPE)', desc: 'Session load from rating of perceived exertion × minutes', kw: 'session rpe training load calculator perceived exertion load monitoring athletes',
      inputs: [{id:'rpe',label:'Session RPE (0–10)',type:'number',def:7},{id:'mins',label:'Duration (minutes)',type:'number',def:60}],
      calc: function(v){ const load=v.rpe*v.mins; return { result: load.toFixed(0)+' AU', chart: null, extra: 'Arbitrary units (AU) — Gabbett/Foster sRPE method. Watch the acute:chronic ratio rather than single sessions' }; },
      steps: function(v){ return ['Load = RPE × minutes']; } },
    { id: 'fitness-age', name: 'Fitness Age Calculator', desc: 'Fitness age estimated from a 2 km run time and sex', kw: 'fitness age calculator running time 2km vo2 estimated age',
      inputs: [{id:'time',label:'2 km Run Time (minutes)',type:'number',def:11},{id:'sex',label:'Sex',type:'select',opts:[{v:'male',l:'Male'},{v:'female',l:'Female'}],def:'male'}],
      calc: function(v){ const T={20:8.3,25:8.9,30:9.4,35:9.9,40:10.4,45:10.9,50:11.4,55:11.9,60:12.5},F={20:9.8,25:10.4,30:11.0,35:11.6,40:12.2,45:12.8,50:13.4,55:14.1,60:14.8}; const tbl=v.sex==='male'?T:F; const ages=Object.keys(tbl).map(Number).sort((a,b)=>a-b); let fit=ages[0],best=1e9; for(const a of ages){ const d=Math.abs(tbl[a]-v.time); if(d<best){best=d;fit=a;} } return { result: fit+' years', chart: null, extra: 'Closest benchmark match to your 2 km time. Approximate guide — genetics and training history matter' }; },
      steps: function(v){ return ['Compare time against age-group 2 km benchmarks','Report the closest match']; } },
    { id: 'vo2-beep', name: 'Beep Test VO₂ Max Estimator', desc: 'Estimated VO₂ max from the 20 m shuttle run level reached', kw: 'beep test calculator vo2 max shuttle run 20m multistage fitness estimate',
      inputs: [{id:'level',label:'Level Reached',type:'number',def:8},{id:'speed0',label:'Starting Speed (km/h)',type:'number',def:6},{id:'step',label:'Speed Increase per Level (km/h)',type:'number',def:0.5}],
      calc: function(v){ const speed=v.speed0+v.step*(v.level-1); const vo2=-23.4+5.8*speed; return { result: vo2.toFixed(1)+' mL/kg/min', chart: null, extra: 'Speed at level '+v.level+' = '+speed.toFixed(1)+' km/h; VO₂ = −23.4 + 5.8 × speed (linear shuttle approximation)' }; },
      steps: function(v){ return ['Speed = start + step × (level − 1)','VO₂ = −23.4 + 5.8 × speed']; } },
    { id: 'resting-metabolic', name: 'Resting Metabolic Rate Calculator (Cunningham)', desc: 'RMR from fat-free mass via the Cunningham equation', kw: 'resting metabolic rate calculator cunningham fat free mass rmr athletes',
      inputs: [{id:'ffm',label:'Fat-Free Mass (kg)',type:'number',def:60}],
      calc: function(v){ const rmr=500+22*v.ffm; return { result: rmr.toFixed(0)+' kcal/day', chart: null, extra: 'Cunningham equation: RMR = 500 + 22 × FFM — preferred for lean athletes over weight-based formulas' }; },
      steps: function(v){ return ['RMR = 500 + 22 × FFM']; } }
  ],
  'finance.js': [
    { id: 'cd-ladder-calc', name: 'CD Ladder Calculator', desc: 'Year-one interest from splitting savings across rungs', kw: 'cd ladder calculator certificate of deposit interest rungs savings strategy',
      inputs: [{id:'total',label:'Total to Invest ($)',type:'number',def:10000},{id:'apy',label:'CD APY (%)',type:'number',def:5}],
      calc: function(v){ const y1=v.total*(v.apy/100); return { result: '$'+y1.toFixed(2), chart: null, extra: 'Year-one interest if all rungs average this APY. Laddering keeps part of your money liquid every maturity window' }; },
      steps: function(v){ return ['Year-one interest = total × APY']; } },
    { id: 'cap-rate-conv', name: 'Cap Rate to Value Calculator', desc: 'Property value implied by NOI and a market cap rate', kw: 'cap rate to value calculator noi capitalization rate property valuation income approach',
      inputs: [{id:'noi',label:'Net Operating Income ($/yr)',type:'number',def:60000},{id:'cap',label:'Market Cap Rate (%)',type:'number',def:6}],
      calc: function(v){ const val=v.noi/(v.cap/100); return { result: '$'+val.toFixed(0), chart: null, extra: 'Value = NOI ÷ cap rate — the income approach. Lower cap rates mean higher valuations and often lower risk' }; },
      steps: function(v){ return ['Value = NOI ÷ cap rate']; } },
    { id: 'price-per-sqft-prop', name: 'Price per Square Foot Calculator', desc: 'Compare properties on price per square foot of living area', kw: 'price per square foot calculator real estate comparison property value',
      inputs: [{id:'price',label:'List Price ($)',type:'number',def:450000},{id:'sqft',label:'Living Area (sq ft)',type:'number',def:2000}],
      calc: function(v){ const p=v.price/v.sqft; return { result: '$'+p.toFixed(2)+' /sq ft', chart: null, extra: 'Only comparable within the same market and property class — lot size, finishes, and land share shift the number' }; },
      steps: function(v){ return ['$ /sq ft = price ÷ living area']; } },
    { id: 'rule-of-40', name: 'Rule of 40 Calculator', desc: 'SaaS growth plus profit margin health check', kw: 'rule of 40 calculator saas growth margin software company valuation benchmark',
      inputs: [{id:'growth',label:'Revenue Growth Rate (%)',type:'number',def:30},{id:'margin',label:'Profit Margin (%)',type:'number',def:15}],
      calc: function(v){ const s=v.growth+v.margin; const verdict=s>=40?'Passes the Rule of 40':'Below the Rule of 40 threshold'; return { result: s.toFixed(0), chart: null, extra: verdict+' — popularized for SaaS by investors (McKinsey/Bessemer usage): growth % + profit % ≥ 40' }; },
      steps: function(v){ return ['Score = revenue growth % + profit margin %']; } },
    { id: 'cost-of-delay', name: 'Cost of Delay Calculator', desc: 'Revenue lost per month a launch or decision slips', kw: 'cost of delay calculator product launch revenue lost month project management',
      inputs: [{id:'monthly',label:'Value at Stake ($/month)',type:'number',def:1000},{id:'months',label:'Delay (months)',type:'number',def:8}],
      calc: function(v){ const d=v.monthly*v.months; return { result: '$'+d.toFixed(0), chart: null, extra: 'Simple linear cost of delay — the core quantity in SAFe and Lean product economics' }; },
      steps: function(v){ return ['Cost of delay = value per month × months delayed']; } }
  ],
  'tech-digital.js': [
    { id: 'wifi-throughput', name: 'Wi-Fi Real Throughput Calculator', desc: 'Expected usable throughput from link speed and efficiency', kw: 'wifi throughput calculator link speed real transfer rate overhead wireless',
      inputs: [{id:'link',label:'Link Speed (Mb/s)',type:'number',def:100},{id:'eff',label:'Efficiency Factor (0–1)',type:'number',def:0.6}],
      calc: function(v){ const tp=v.link*v.eff; return { result: tp.toFixed(1)+' Mb/s', chart: null, extra: 'Real throughput ≈ link rate × efficiency (0.5–0.7 typical for Wi-Fi) — protocol overhead, retries, and interference eat the rest' }; },
      steps: function(v){ return ['Throughput = link speed × efficiency']; } },
    { id: 'data-usage-est', name: 'Data Usage Estimator', desc: 'Monthly mobile data from daily streaming hours', kw: 'data usage estimator calculator monthly mobile gb streaming plan',
      inputs: [{id:'hrs',label:'Streaming Hours per Day',type:'number',def:2},{id:'gbph',label:'Data per Hour (GB)',type:'number',def:3},{id:'days',label:'Days per Month',type:'number',def:30}],
      calc: function(v){ const gb=v.hrs*v.gbph*v.days; return { result: gb.toFixed(0)+' GB', chart: null, extra: 'Typical rates: SD ~0.7 GB/h, HD ~3 GB/h, 4K ~7 GB/h per stream (video quality setting dominates)' }; },
      steps: function(v){ return ['GB = hours/day × GB/hour × days']; } },
    { id: 'image-size-calc', name: 'Uncompressed Image Size Calculator', desc: 'Raw bitmap size from pixel dimensions and channels', kw: 'image size calculator uncompressed bitmap bytes pixels bit depth raw file',
      inputs: [{id:'w',label:'Width (px)',type:'number',def:4000},{id:'h',label:'Height (px)',type:'number',def:3000},{id:'ch',label:'Bytes per Pixel (3 = RGB 8-bit)',type:'number',def:3}],
      calc: function(v){ const bytes=v.w*v.h*v.ch; const mb=bytes/(1024*1024); return { result: mb.toFixed(1)+' MB', chart: null, extra: bytes.toLocaleString()+' bytes raw. JPEG/PNG compress this substantially; 16-bit channels double the bytes-per-pixel' }; },
      steps: function(v){ return ['Bytes = width × height × bytes/pixel','MB = bytes ÷ 1,048,576']; } }
  ],
  'food-nutrition.js': [
    { id: 'homebrew-abv', name: 'Homebrew ABV Calculator', desc: 'Alcohol by volume from original and final gravity', kw: 'homebrew abv calculator original gravity final gravity beer alcohol brewing',
      inputs: [{id:'og',label:'Original Gravity (SG)',type:'number',def:1.05},{id:'fg',label:'Final Gravity (SG)',type:'number',def:1.01}],
      calc: function(v){ const abv=(v.og-v.fg)*131.25; return { result: abv.toFixed(2)+'%', chart: null, extra: 'ABV ≈ (OG − FG) × 131.25 — the standard homebrewing approximation' }; },
      steps: function(v){ return ['ABV = (OG − FG) × 131.25']; } }
  ],
  'engineering.js': [
    { id: 'rcf-gforce', name: 'RCF (G-Force) Calculator', desc: 'Relative centrifugal force from rpm and rotor radius', kw: 'rcf calculator g force centrifuge rpm rotor radius relative centrifugal force lab',
      inputs: [{id:'rpm',label:'Rotor Speed (rpm)',type:'number',def:5000},{id:'r',label:'Rotor Radius (cm)',type:'number',def:8}],
      calc: function(v){ const rcf=1.118e-5*v.r*v.rpm*v.rpm; return { result: rcf.toFixed(0)+' × g', chart: null, extra: 'RCF = 1.118 × 10⁻⁵ × r(cm) × rpm² — protocols specify g-force, not rpm, because rotors differ' }; },
      steps: function(v){ return ['RCF = 1.118×10⁻⁵ × r × rpm²']; } }
  ]
};

// QA rows: [category, id, values, expected, tolerance, label]
const QA = [
  ['science', 'dew-point', { temp: 30, rh: 70 }, 23.9, 0.2, 'Magnus: T=30, RH=70 → 23.9 °C'],
  ['science', 'cloud-base-lcl', { temp: 25, dew: 15 }, 1250, 1, '125 × 10 °C spread = 1250 m'],
  ['science', 'grahams-law', { m1: 2, m2: 32 }, 4, 0.01, '√(32/2) = 4×'],
  ['science', 'osmotic-pressure', { molarity: 0.3, temp: 310 }, 7.64, 0.05, '0.3 × 0.0821 × 310 = 7.64 atm'],
  ['science', 'sound-intensity', { l1: 70, l2: 60 }, 70.4, 0.1, '10log10(1.1e-5/1e-12) = 70.4 dB'],
  ['science', 'angular-velocity', { rpm: 60 }, 376.99, 0.5, '2π×60/60 = 2π rad/s'],
  ['health', 'corrected-calcium', { ca: 8, alb: 2 }, 9.6, 0.05, '8 + 0.8×2 = 9.6'],
  ['health', 'winters-formula', { hco3: 12 }, 26, 0.5, '1.5×12+8 = 26 (±2 shown)'],
  ['health', 'maintenance-fluids', { wt: 25 }, 65, 0.5, '4-2-1: 40+20+5 = 65 mL/hr'],
  ['health', 'free-water-deficit', { na: 155, wt: 70 }, 4.5, 0.1, '0.6×70×(155/140−1) = 4.5 L'],
  ['health', 'serum-osmolality', { na: 140, glu: 90, bun: 14 }, 370.8, 0.5, '280+5+0.78 = 370.8'],
  ['health', 'total-body-water', { wt: 70, ht: 180, age: 45, sex: 'male' }, 41.0, 0.2, 'Watson male = 41.0 L'],
  ['health', 'pf-ratio', { pao2: 100, fio2: 50 }, 2, 0.01, '100/0.5 = 2.00'],
  ['fitness-exercise', 'sweat-rate', { pre: 70, post: 68.6, mins: 90 }, 0.93, 0.02, '1.4 kg / 1.5 h = 0.93 L/h'],
  ['fitness-exercise', 'rpe-load', { rpe: 7, mins: 60 }, 420, 0.5, '7 × 60 = 420 AU'],
  ['fitness-exercise', 'fitness-age', { time: 11, sex: 'male' }, 50, 0.5, '11 min → closest male benchmark 50'],
  ['fitness-exercise', 'vo2-beep', { level: 8, speed0: 6, step: 0.5 }, 31.7, 0.3, 'speed 9.5 → −23.4+5.8×9.5 = 31.7'],
  ['fitness-exercise', 'resting-metabolic', { ffm: 60 }, 1820, 0.5, '500+22×60 = 1820'],
  ['finance', 'cd-ladder-calc', { total: 10000, apy: 5 }, 10500, 0.5, '10000 × 5% = 10500'],
  ['finance', 'cap-rate-conv', { noi: 60000, cap: 6 }, 1000000, 1, '60000/0.06 = 1,000,000'],
  ['finance', 'price-per-sqft-prop', { price: 450000, sqft: 2000 }, 225, 0.1, '450000/2000 = 225'],
  ['finance', 'rule-of-40', { growth: 30, margin: 15 }, 45, 0.1, '30+15 = 45'],
  ['finance', 'cost-of-delay', { monthly: 1000, months: 8 }, 8000, 0.5, '1000×8 = 8000'],
  ['tech-digital', 'wifi-throughput', { link: 100, eff: 0.6 }, 60, 0.1, '100×0.6 = 60 Mb/s'],
  ['tech-digital', 'data-usage-est', { hrs: 2, gbph: 3, days: 30 }, 180, 0.5, '2×3×30 = 180 GB'],
  ['tech-digital', 'image-size-calc', { w: 4000, h: 3000, ch: 3 }, 36, 0.2, '4000×3000×3 B = 36 MB'],
  ['food-nutrition', 'homebrew-abv', { og: 1.05, fg: 1.01 }, 5.25, 0.05, '0.04×131.25 = 5.25%'],
  ['engineering', 'rcf-gforce', { rpm: 5000, r: 8 }, 2236, 2, '1.118e-5×8×5000² = 2236 g']
];

// ---------- insertion helpers (CRLF-safe) ----------
function toLines(obj) {
  return obj.map(t => {
    const fn = t.inputs.map(i => {
      if (i.type === 'select') return "{id:'" + i.id + "',label:'" + i.label + "',type:'select',opts:" + JSON.stringify(i.opts) + ",def:" + JSON.stringify(i.def) + "}";
      return "{id:'" + i.id + "',label:'" + i.label + "',type:'" + i.type + "',def:" + i.def + "}";
    }).join(',');
    const js = "{ id: '" + t.id + "', name: '" + t.name.replace(/'/g, "\\'") + "', desc: '" + t.desc.replace(/'/g, "\\'") + "', kw: '" + t.kw.replace(/'/g, "\\'") + "'," + CRLF +
      "    inputs: [" + fn + "]," + CRLF +
      "    calc: " + t.calc.toString().replace(/\n\s*/g, ' ').trim() + ',' + CRLF +
      "    steps: " + t.steps.toString().replace(/\n\s*/g, ' ').trim() + ' }';
    return js;
  });
}

function insertTools(file, blocks) {
  const p = path.join(ROOT, 'js/data', file);
  let txt = fs.readFileSync(p, 'utf8');
  const anchor = txt.lastIndexOf(CRLF + '];');
  if (anchor < 0) throw new Error('no array close in ' + file);
  const after = txt.slice(anchor, anchor + 260);
  if (!/module\.exports|window\./.test(after)) throw new Error('anchor not before export in ' + file);
  // idempotency
  if (blocks.some(b => txt.includes("id: '" + b.id + "'"))) {
    console.log('SKIP (already present): ' + file);
    return false;
  }
  // comma-guard: last non-space char before anchor
  let cut = anchor;
  while (cut > 0 && /\s/.test(txt[cut - 1])) cut--;
  const needsComma = txt[cut - 1] !== ',';
  const insert = (needsComma ? ',' : '') + CRLF + '  ' + blocks.map(b => b.replace(/\r?\n/g, CRLF)).join(',' + CRLF + '  ') + ',';
  fs.writeFileSync(p, txt.slice(0, anchor) + insert + txt.slice(anchor), 'utf8');
  return true;
}

function insertQA(rows) {
  const p = path.join(ROOT, 'tests/unit/formula-qa-full.test.js');
  let txt = fs.readFileSync(p, 'utf8');
  if (rows.some(r => txt.includes("'" + r[1] + "'"))) { console.log('QA SKIP (present)'); return false; }
  const anchor = txt.indexOf(CRLF + '];' + CRLF);
  if (anchor < 0) throw new Error('no CASES close found');
  let cut = anchor;
  while (cut > 0 && /\s/.test(txt[cut - 1])) cut--;
  const needsComma = txt[cut - 1] !== ',';
  const lines = rows.map(r => "  ['" + r[0] + "', '" + r[1] + "', " + JSON.stringify(r[2]) + ', ' + r[3] + ', ' + r[4] + ", '" + r[5].replace(/'/g, "\\'") + "'],");
  const insert = (needsComma ? ',' : '') + CRLF + lines.join(CRLF);
  fs.writeFileSync(p, txt.slice(0, anchor) + insert + txt.slice(anchor), 'utf8');
  return true;
}

let n = 0;
if (process.argv.includes('--check')) {
  for (const [file, arr] of Object.entries(TOOLS)) {
    const p = path.join(ROOT, 'js/data', file);
    const txt = fs.readFileSync(p, 'utf8');
    for (const t of arr) {
      if (txt.includes("id: '" + t.id + "'")) { console.log('DUP would-skip: ' + t.id); continue; }
      console.log('would insert: ' + file + ' ← ' + t.id);
      n++;
    }
  }
  console.log('total new: ' + n + ' | QA rows: ' + QA.length);
  process.exit(0);
}

for (const [file, arr] of Object.entries(TOOLS)) {
  const blocks = toLines(arr);
  // syntax-validate each block standalone
  for (const b of blocks) { new Function('(' + b.replace(/,\s*$/, '') + ')'); }
  if (insertTools(file, blocks)) n += arr.length;
}
const ok = insertQA(QA);
console.log('inserted ' + n + ' tools | QA rows ' + (ok ? QA.length : 0));
