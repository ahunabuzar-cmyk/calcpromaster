'use strict';
// Screen remaining A3 candidates: flag near-aliases of existing tools for manual review
const { CANDIDATES } = require('./a3-candidates.cjs');
const reg = require('../docs/calculator-registry.json');

const doneF1 = new Set(['payout-ratio','market-cap','bvps','sortino-ratio','max-drawdown','zero-coupon-bond','cd-ladder','ibond-value','put-call-parity','risk-reward-ratio','position-size','stop-loss','cost-basis-avg','dca-calculator','staking-rewards','kelly-criterion','value-at-risk','ev-ebitda','peg-ratio','free-cash-flow','interest-coverage','asset-turnover','runway-months','effective-tax-rate','quarterly-tax','late-fee-interest','factoring-fee','royalty-payment','franchise-cost','food-cost-percent','menu-price','rmd','hsa-growth','safe-withdrawal','noi','price-per-sqft','rent-increase','deposit-interest','roommate-rent-split','purchasing-power','net-worth-statement','savings-goal-planner']);

const SKIP_CONVERSION = true; // master rule: unit-only variants don't count

const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const toks = s => norm(s).split(' ').filter(w => w.length > 3);
const STOP = new Set(['calculator','calc','free','online','tool','convert','converter','with','and','for','from','into','using']);
const tok = s => toks(s).filter(w => !STOP.has(w));

const entries = reg.tools.map(t => ({
  id: t.id,
  hay: new Set(tok(t.id + ' ' + (t.name || '') + ' ' + (t.kw || t.keywords || '')))
}));

function overlap(id, name, kw) {
  const want = tok(id + ' ' + name + ' ' + kw);
  if (!want.length) return null;
  let best = null, bestScore = 0;
  for (const e of entries) {
    let hit = 0;
    for (const w of want) if (e.hay.has(w)) hit++;
    const score = hit / want.length;
    if (score > bestScore) { bestScore = score; best = e.id; }
  }
  return { best, bestScore };
}

const results = [];
for (const c of CANDIDATES) {
  const [cat, id, name, desc, kw] = c;
  if (cat === 'conversion' && SKIP_CONVERSION) continue;
  if (doneF1.has(id)) continue;
  const ex = reg.tools.find(t => t.id === id);
  if (ex) continue; // exact dup
  const o = overlap(id, name, kw || desc || '');
  results.push({ cat, id, name, best: o && o.best, score: o ? +o.bestScore.toFixed(2) : 0 });
}

const risky = results.filter(r => r.score >= 0.34);
const clean = results.filter(r => r.score < 0.34);
console.log('=== SURVIVORS (clean, insert) :', clean.length, '===');
const byCat = {};
for (const r of clean) { (byCat[r.cat] = byCat[r.cat] || []).push(r.id); }
for (const [c, ids] of Object.entries(byCat)) console.log(c + ' (' + ids.length + '): ' + ids.join(', '));
console.log('');
console.log('=== FLAGGED (review):', risky.length, '===');
for (const r of risky) console.log(r.cat + '/' + r.id + '  ~  ' + r.best + '  (' + r.score + ')');
