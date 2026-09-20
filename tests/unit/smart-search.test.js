// ============================================================
// SMART SEARCH TESTS (S0)
//  1. Catalog integrity: tool-catalog.js count === registry count
//  2. Reference integrity: every id in NL_INTENTS + SYNONYMS exists
//  3. 26 real queries: typos, synonyms, natural language — expected
//     calculator must appear in the TOP 3 for each, covering all
//     20 categories
// ============================================================
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.join(__dirname, '..', '..');

// --- Load SmartSearch into a VM (it's a classic browser script) ---
const engineSrc = fs.readFileSync(path.join(ROOT, 'js', 'smart-search.js'), 'utf8');
const sandbox = { window: {}, module: { exports: {} }, console };
vm.createContext(sandbox);
vm.runInContext(engineSrc, sandbox);
const SmartSearch = sandbox.window.SmartSearch || sandbox.module.exports;
expect(SmartSearch).toBeTruthy();

// --- Build catalog from the REAL registry (source of truth) ---
const dataDir = path.join(ROOT, 'js', 'data');
const rows = [];
for (const f of fs.readdirSync(dataDir).filter(x => x.endsWith('.js'))) {
  const cat = f.replace('.js', '');
  const arr = require(path.join(dataDir, f));
  if (!Array.isArray(arr)) continue;
  for (const t of arr) rows.push({ id: t.id, cat, n: t.name, d: String(t.desc || '').slice(0, 90), k: String(t.kw || '').slice(0, 110) });
}
const catalog = SmartSearch.buildCatalog(rows.map(r => ({ id: r.id, cat: r.cat, name: r.n, desc: r.d, kw: r.k })));

const ALL_IDS = new Set(rows.map(r => r.cat + '/' + r.id));

// --- Committed catalog file must match the registry ---
const catalogSrc = fs.readFileSync(path.join(ROOT, 'js', 'tool-catalog.js'), 'utf8');
const catSandbox = { window: {} };
vm.createContext(catSandbox);
vm.runInContext(catalogSrc, catSandbox);
const committedCatalog = catSandbox.window.TOOL_CATALOG;

describe('S0: smart search — integrity', () => {
  it('committed tool-catalog.js has one row per registry tool', () => {
    expect(committedCatalog.length).toBe(rows.length);
    const committedIds = new Set(committedCatalog.map(r => r.cat + '/' + r.id));
    for (const r of rows) expect(committedIds.has(r.cat + '/' + r.id)).toBe(true);
  });

  it('every NL intent id exists in the registry', () => {
    const bad = [];
    for (const intent of SmartSearch.NL_INTENTS) {
      for (const id of intent.ids) if (!ALL_IDS.has(id)) bad.push(id);
    }
    expect(bad, 'intent ids not in registry: ' + bad.join(', ')).toEqual([]);
  });

  it('every synonym id exists in the registry', () => {
    const bad = [];
    for (const [word, ids] of Object.entries(SmartSearch.SYNONYMS)) {
      for (const id of ids) if (!ALL_IDS.has(id)) bad.push(word + '→' + id);
    }
    expect(bad, 'synonym ids not in registry: ' + bad.join(', ')).toEqual([]);
  });
});

describe('S0: smart search — query behavior', () => {
  // Results carry the FULL id ('cat/id') — same format the registry uses.
  const top3 = (q) => SmartSearch.search(q, catalog, { limit: 3 }).map(r => r.id.includes('/') ? r.id : r.cat + '/' + r.id);

  it('empty / whitespace query returns nothing', () => {
    expect(SmartSearch.search('', catalog)).toEqual([]);
    expect(SmartSearch.search('   ', catalog)).toEqual([]);
  });

  // 26 queries across all 20 categories — the expected tool must be in top 3
  const CASES = [
    // finance
    ['morgage', 'finance/mortgage'],                       // typo
    ['how much house can I afford', 'finance/home-afford'],// NL
    ['take home pay', 'finance/salary'],                   // synonym/NL
    ['calculate EMI for my loan', 'finance/loan-emi'],     // NL
    ['compound interest', 'finance/compound-interest'],
    ['mortgage monthly payment', 'finance/mortgage'],
    ['discount percent', 'finance/discount'],
    ['retirement savings plan', 'finance/retirement'],
    ['currency converter dollar to rupee', 'finance/currency-converter'],
    // auto-transport
    ['calculate EMI for my car loan', 'auto-transport/car-loan-emi'], // NL
    ['gas mileage cost', 'auto-transport/fuel-cost'],      // synonym (gas→fuel)
    ['speed distance time', 'auto-transport/speed-distance-time'],
    // health
    ['bmi', 'health/bmi'],
    ['am i overweight', 'health/bmi'],                     // NL
    ['how many calories should I eat', 'food-nutrition/daily-calorie'], // NL
    ['when will my baby be born', 'health/pregnancy'],     // NL (registry id for due-date)
    // math
    ['percemtage', 'math/percentage'],                     // typo
    ['quadratic equation solver', 'math/quadratic'],
    // construction
    ['concrete for a slab', 'construction/concrete-slab'], // NL
    ['how much paint for a room', 'lifestyle/paint-coverage'], // NL
    // engineering
    ['voltage drop', 'engineering/voltage-drop'],
    // science
    ['ohms law', 'science/ohms-law'],
    // education
    ['gpa', 'education/gpa'],
    // everyday
    ['how old age calculator', 'everyday/age'],
    ['days between two dates', 'everyday/date-diff'],
    // conversion
    ['convert kg to pounds', 'conversion/weight'],
    // utilities
    ['password', 'utilities/password-gen'],
    // tech-digital
    ['internet speed test bandwidth', 'tech-digital/internet-speed'],
    // business
    ['profit margin', 'business/profit-margin'],
    // career-freelance
    ['freelance hourly rate', 'career-freelance/freelance-hourly-rate'],
    // food-nutrition
    ['how much water should I drink', 'food-nutrition/daily-water-intake'],
    // fitness-exercise
    ['running pace', 'fitness-exercise/running-pace'],
    // home-garden
    ['room area', 'home-garden/room-area'],
    // parenting-family
    ['baby feeding', 'parenting-family/baby-feeding'],
    // lifestyle
    ['grocery budget', 'lifestyle/grocery-budget-optimizer'],
    // regional
    ['zakat', 'regional/zakat-calculator'],
    // daily-water handled above (food-nutrition); everyday electricity:
    ['electricity bill', 'everyday/electricity']
  ];

  for (const [q, expected] of CASES) {
    it(`"${q}" → ${expected} in top 3`, () => {
      const got = top3(q);
      expect(got, `query "${q}" got [${got.join(', ')}], wanted ${expected}`).toContain(expected);
    });
  }

  it('result limit is respected', () => {
    expect(SmartSearch.search('loan', catalog, { limit: 4 }).length).toBeLessThanOrEqual(4);
  });

  it('stopwords do not match every tool', () => {
    // "calculator" alone is a stopword — without other tokens nothing should rank
    const r = SmartSearch.search('calculator', catalog, { limit: 8 });
    expect(r.length).toBe(0);
  });
});
