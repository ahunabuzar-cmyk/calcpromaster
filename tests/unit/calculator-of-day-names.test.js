// Calculator of the Day ships its own `name` so the homepage card can render on
// the FIRST pass without fetching a category chunk (finance.js is 68KB and was
// 65% unused when it was pulled in just to label one card). A stale name would
// silently diverge from the calculator page title, so the rotation is checked
// against the real tool registry here.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const SRC = fs.readFileSync(path.join(ROOT, 'js', 'calculator-of-day.js'), 'utf8');

// Parse the DAILY_CALCULATORS literal out of the IIFE (it is not exported).
function rotation() {
  const block = SRC.match(/const DAILY_CALCULATORS = \[([\s\S]*?)\n  \];/);
  if (!block) throw new Error('DAILY_CALCULATORS block not found');
  const rows = [];
  const re = /\{ id: '([^']+)', cat: '([^']+)', name: (?:'([^']*)'|"([^"]*)")/g;
  let m;
  while ((m = re.exec(block[1]))) rows.push({ id: m[1], cat: m[2], name: m[3] || m[4] });
  return rows;
}

// id -> name from js/data/*.js
function registry() {
  const dir = path.join(ROOT, 'js', 'data');
  const map = {};
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    const s = fs.readFileSync(path.join(dir, f), 'utf8');
    const re = /\{ id: '([^']+)', name: (?:'([^']*)'|"([^"]*)")/g;
    let m;
    while ((m = re.exec(s))) if (!map[m[1]]) map[m[1]] = m[2] || m[3];
  }
  return map;
}

describe('Calculator of the Day rotation', () => {
  const rows = rotation();
  const names = registry();

  it('has a name on every entry (so no category chunk is needed at boot)', () => {
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.name, r.id).toBeTruthy();
  });

  it('matches the registered calculator name for every entry', () => {
    const mismatched = rows.filter((r) => names[r.id] && names[r.id] !== r.name).map((r) => r.id + ': ' + r.name + ' != ' + names[r.id]);
    expect(mismatched).toEqual([]);
  });

  it('only lists ids that exist in the registry', () => {
    expect(rows.filter((r) => !names[r.id]).map((r) => r.id)).toEqual([]);
  });

  it('renders the card title as an h2 (h1 -> h2 -> h3 order on the homepage)', () => {
    expect(SRC).toContain('<h2>${tool.name}</h2>');
    expect(SRC).not.toContain('<h3>${tool.name}</h3>');
  });
});
