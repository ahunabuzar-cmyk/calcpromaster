#!/usr/bin/env node
// Reliable HEAD membership check: for each (file,id), does the committed
// js/data/<file> contain an `id: '<id>'` declaration?
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const ids = ['college-529', 'distance-pace', 'discount', 'calorie-burned', 'calories-burned',
  'daily-calorie', 'parental-leave', 'currency-exchange', 'simple-tax', 'body-fat-food',
  'coffee-habit', 'body-fat-fitness', 'running-pace', '529-plan', 'discount-price',
  'calories-exercise', 'basal-metabolic-rate', 'tdee-advanced', 'maternity-leave-finance',
  'tax-bracket', 'currency-conv', 'paternity-leave', 'tip', 'tip-split', 'cargo-volume', 'water-tank'];
const files = {
  'college-529': 'parenting-family', 'distance-pace': 'everyday', 'discount': 'finance',
  'calorie-burned': 'food-nutrition', 'calories-burned': 'fitness-exercise',
  'daily-calorie': 'food-nutrition', 'parental-leave': 'lifestyle', 'currency-exchange': 'everyday',
  'simple-tax': 'utilities', 'body-fat-food': 'food-nutrition', 'coffee-habit': 'lifestyle',
  'body-fat-fitness': 'fitness-exercise', 'running-pace': 'fitness-exercise', '529-plan': 'finance',
  'discount-price': 'everyday', 'calories-exercise': 'fitness-exercise',
  'basal-metabolic-rate': 'health', 'tdee-advanced': 'health',
  'maternity-leave-finance': 'parenting-family', 'tax-bracket': 'career-freelance',
  'currency-conv': 'conversion', 'paternity-leave': 'parenting-family', 'tip': 'finance',
  'tip-split': 'utilities', 'cargo-volume': 'auto-transport', 'water-tank': 'construction',
};
const cache = {};
for (const [id, f] of Object.entries(files)) {
  if (!cache[f]) {
    try { cache[f] = execFileSync('git', ['show', 'HEAD:js/data/' + f + '.js'], { cwd: ROOT, encoding: 'utf8' }); }
    catch (e) { cache[f] = ''; }
  }
  const src = cache[f];
  const inHead = src.includes("id: '" + id + "'") || src.includes('id: "' + id + '"');
  console.log((inHead ? 'IN HEAD   ' : 'NOT in HEAD'), id + ' (' + f + ')');
}