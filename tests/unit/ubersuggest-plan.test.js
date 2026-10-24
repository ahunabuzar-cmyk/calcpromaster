// UberSuggest pair plan — guards the build list the research script emits, so a
// future pair-page generator cannot silently consume a broken CSV.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const CSV = path.join(process.cwd(), 'data', 'keyword-gap', 'ubersuggest-pair-plan.csv');
const HEADER = 'family,pair_slug,phrasings,top_keyword,monthly_volume,min_kd,rival_url';

function rows() {
  const text = fs.readFileSync(CSV, 'utf8').trim().split(/\r?\n/);
  expect(text[0]).toBe(HEADER);
  return text.slice(1).map((line) => {
    // top_keyword is quoted; the remaining columns never contain commas.
    const m = line.match(/^([^,]+),([^,]+),(\d+),"([^"]*)",(\d+),(\d*),(.*)$/);
    if (!m) throw new Error('unparseable plan row: ' + line);
    return {
      family: m[1], pair: m[2], phrasings: Number(m[3]), topKeyword: m[4],
      volume: Number(m[5]), kd: m[6] ? Number(m[6]) : null, rivalUrl: m[7],
    };
  });
}

describe('uberSuggest pair plan', () => {
  it('exists with the documented header', () => {
    expect(fs.existsSync(CSV)).toBe(true);
    expect(rows().length).toBeGreaterThan(0);
  });

  it('uses one slug per pair, shaped from-to', () => {
    const r = rows();
    const slugs = r.map((x) => x.pair);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const pair of slugs) {
      expect(pair).toMatch(/^[a-z0-9]+-to-[a-z0-9]+$/);
      const [a, b] = pair.split('-to-');
      expect(a).not.toBe(b);
    }
  });

  it('is ranked by volume (largest phrasing per pair), not by summed phrasings', () => {
    const vols = rows().map((x) => x.volume);
    expect([...vols].sort((a, b) => b - a)).toEqual(vols);
    // The sum-of-phrasings mistake produced 4.5M for 60 pairs; the max-phrasing
    // plan is ~0.8M. A regression here means the non-additivity guard was lost.
    const total = vols.reduce((s, v) => s + v, 0);
    expect(total).toBeGreaterThan(500_000);
    expect(total).toBeLessThan(1_500_000);
  });

  it('carries a keyword difficulty for every winnable pair', () => {
    const missing = rows().filter((x) => x.kd === null);
    expect(missing.map((x) => x.pair)).toEqual([]);
    for (const x of rows()) expect(x.kd).toBeGreaterThanOrEqual(1);
  });

  it('only lists families the site actually serves', () => {
    const allowed = new Set(['length', 'weight', 'temperature', 'volume', 'area', 'speed', 'data', 'time', 'energy', 'pressure', 'angle', 'currency']);
    for (const x of rows()) expect(allowed.has(x.family), x.family).toBe(true);
  });
});
