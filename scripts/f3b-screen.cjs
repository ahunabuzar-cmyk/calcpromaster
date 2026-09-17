// F3b candidate screening: exact + fuzzy token match vs existing registry.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// name, id, kw (screen only; definitions live in the batch script)
const CANDIDATES = [
  // science
  ['Angular Velocity Calculator','angular-velocity','angular velocity rpm rad s calculator rotational speed'],
  ['Half-Life Calculator','half-life-calc','half life calculator radioactive decay exponential'],
  ['Wave Speed Calculator','wave-speed','wave speed calculator frequency wavelength v f lambda'],
  ['Sound Intensity Calculator','sound-intensity','sound intensity level decibel calculator w/m2'],
  ['Magnetic Force Calculator','magnetic-force','magnetic force calculator current wire field BIL'],
  ['Electric Field Calculator','electric-field-calc','electric field calculator charge coulomb n/c'],
  ['Capacitor Energy Calculator','capacitor-energy','capacitor energy calculator joules cv farad'],
  ['Thermal Expansion Calculator','thermal-expansion','thermal expansion calculator linear length temperature'],
  ['Heat Required Calculator','heat-required','heat energy calculator specific heat mass temperature change'],
  ['Graham\'s Law Calculator','grahams-law','grahams law effusion rate gas calculator'],
  ['Osmotic Pressure Calculator','osmotic-pressure','osmotic pressure calculator molarity temperature solution'],
  ['Freezing Point Depression','freezing-depression','freezing point depression calculator molality kf'],
  ['Molarity Dilution Calculator','molarity-dilution','dilution calculator m1v1 m2v2 concentration'],
  ['Percent Yield Calculator','percent-yield','percent yield chemistry calculator actual theoretical'],
  ['EMF Induction Calculator','emf-induction','emf induction calculator faraday flux turns coil'],
  ['Transformer Ratio Calculator','transformer-ratio','transformer ratio calculator primary secondary voltage turns'],
  ['LC Resonance Calculator','lc-resonance','lc resonance frequency calculator inductor capacitor tank'],
  ['Ripple Voltage Calculator','ripple-voltage','ripple voltage calculator capacitor power supply rectifier'],
  // health
  ['Water Intake Calculator','water-intake','water intake calculator daily hydration how much water'],
  ['Protein Requirement Calculator','protein-requirement','protein calculator per kg body weight daily requirement'],
  ['Creatinine Clearance Calculator','creatinine-clearance','creatinine clearance calculator cockcroft gault renal'],
  ['Anion Gap Calculator','anion-gap','anion gap calculator sodium chloride bicarbonate metabolic'],
  ['Corrected Sodium Calculator','corrected-sodium','corrected sodium calculator hyperglycemia glucose correction'],
  ['Free Water Deficit Calculator','free-water-deficit','free water deficit calculator hypernatremia correction'],
  ['Ideal Body Weight Calculator','ideal-body-weight','ideal body weight calculator ibw devine height'],
  ['Lean Body Mass Calculator','lean-body-mass','lean body mass calculator boer formula lbm'],
  ['Mean Arterial Pressure Calculator','mean-arterial-pressure','mean arterial pressure calculator map blood pressure'],
  ['QTc Correction Calculator','qtc-correction','qtc calculator bazett correction qt interval ecg'],
  ['Pregnancy Weight Gain Calculator','pregnancy-weight-gain','pregnancy weight gain calculator bmi trimester recommended'],
  ['Mid-Parental Height Calculator','mid-parental-height','mid parental height calculator child predicted adult height'],
  // tech-digital
  ['Subnet Host Calculator','subnet-hosts','subnet calculator cidr hosts network mask prefix'],
  ['Bandwidth Delay Product','bandwidth-delay','bandwidth delay product calculator network tcp window'],
  ['RAID Capacity Calculator','raid-capacity','raid capacity calculator usable space raid 0 1 5 10'],
  ['Aspect Ratio Calculator','aspect-ratio-calc','aspect ratio calculator width height scale video image'],
  ['Battery Life Calculator','battery-life','battery life calculator mah hours drain device'],
  ['UPS Runtime Calculator','ups-runtime','ups runtime calculator battery backup minutes va watts'],
  ['Data Transfer Time Calculator','transfer-time-calc','data transfer time calculator gb file speed bandwidth'],
  ['SMS Segment Calculator','sms-segments','sms segment calculator characters gsm 7 bit unicode length'],
];

const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/calculator-registry.json'), 'utf8'));
const tools = reg.tools || reg;
const stop = new Set(['calculator','calc','convert','converter','how','much','what','the','a','an','of','to','for','and','or','per','in','on','free','online','from','by','with','your','me']);

function toks(s) {
  return new Set(String(s||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>2 && !stop.has(w)));
}
function jac(a, b) {
  const A = toks(a), B = toks(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter || 1);
}

const exact = [], fuzzy = [], clean = [];
for (const [name, id, kw] of CANDIDATES) {
  if (tools.some(t => t.id === id)) { exact.push(id); continue; }
  const hits = [];
  for (const t of tools) {
    const j = Math.max(jac(name, t.name), jac(kw, (t.kw||'') + ' ' + (t.name||'')));
    if (j >= 0.30) hits.push({ id: t.id, name: t.name, j: +j.toFixed(2) });
  }
  hits.sort((a,b)=>b.j-a.j);
  if (hits.length) fuzzy.push({ name, id, hits: hits.slice(0,3) });
  else clean.push({ name, id });
}

console.log('candidates:', CANDIDATES.length);
console.log('EXACT DUP (drop):', exact.join(', ') || 'none');
console.log('\nFUZZY SUSPECTS:', fuzzy.length);
for (const f of fuzzy) console.log(' -', f.id, '| j=', JSON.stringify(f.hits));
console.log('\nCLEAN:', clean.length, '→', clean.map(c=>c.id).join(', '));
