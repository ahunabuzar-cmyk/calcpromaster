// ============================================================
// TILE GROUT & THINSET MATH — known-answer regression tests
//
// Why this file exists: the shipped calculator accepted a "Grout Line
// Width" input and then never used it, guessed grout with a fixed x1.5
// fudge factor, and estimated thinset from a flat 60 sq ft per 50 lb bag
// even though coverage is set by the trowel NOTCH, not by area alone.
//
// Every expectation below is computed HERE from a published source, never
// by calling the tool's own calc() to generate its own expected value:
//   * Grout: SGM published coverage chart (25 lb bag) —
//     12x12 tile on a 3/8" bed: 392 / 199 / 135 sq ft at 1/8" / 1/4" / 3/8"
//     joints; 6x6 tile on a 5/16" bed: 239 / 123 / 85 sq ft.
//     https://www.sgm.cc/grout-calculator/  (chart excludes waste; +10%
//     recommended, matching LATICRETE's estimator allowance)
//   * Thinset: CUSTOM VersaBond published coverage per 50 lb bag —
//     1/4"x1/4" square notch 90-100 sq ft, 1/4"x3/8" 60-67 sq ft,
//     1/2"x1/2" 42-47 sq ft, 3/4"x9/16" U-notch (45 deg) 34-38 sq ft.
//     https://www.custombuildingproducts.com/products/versabond-professional-thin-set-mortar-2
//   * Trowel-to-tile-size guidance: MAPEI — up to 8"x8" = 1/4"x1/4",
//     10"x10"-17"x17" = 1/4"x3/8", 18"x18"-12"x36" = 1/2"x1/2",
//     24"x24"+ = 3/4"x9/16" U.
//     https://mapeihome.com/blog/2021/05/15/what-size-trowel-should-i-use/
// ============================================================
import { describe, it, expect, beforeAll } from 'vitest';

global.window = global;
const svg = '<svg></svg>';
global.Charts = { bar: () => svg, donut: () => svg, gauge: () => svg, line: () => svg, spark: () => svg };

let tool;
beforeAll(async () => {
  const mod = await import('../../js/data/home-garden.js');
  const arr = mod.default || mod;
  tool = arr.find((t) => t.id === 'tile-grout');
  if (!tool) throw new Error('tile-grout calculator not found');
});

function run(values) {
  return tool.calc(values);
}

// SGM chart rows: [tile inches, bed thickness inches, joint inches, sq ft per 25 lb bag]
const SGM_ROWS = [
  [12, 0.375, 0.125, 392],
  [12, 0.375, 0.25, 199],
  [12, 0.375, 0.375, 135],
  [6, 0.3125, 0.125, 239],
  [6, 0.3125, 0.25, 123],
  [6, 0.3125, 0.375, 85],
];

// CUSTOM VersaBond published coverage per 50 lb bag: [trowel id, low, high]
const CUSTOM_BAG = [
  ['quarter', 90, 100],
  ['quarter_three_eighth', 60, 67],
  ['half', 42, 47],
  ['u_notch', 34, 38],
];

describe('grout volume model vs SGM published coverage chart', () => {
  it.each(SGM_ROWS)(
    '%sx%s tile, %s" bed, %s" joint — within 9%% of the published chart',
    (tile, bed, joint, perBag) => {
      // Independent expectation: the chart's own numbers, waste included.
      const expectedLb = (25 / perBag) * 100 * 1.1;
      const got = parseFloat(run({ sqft: 100, tileSize: tile, groutWidth: joint, tileThick: bed }).result);
      expect(got).toBeGreaterThan(expectedLb * 0.91);
      expect(got).toBeLessThan(expectedLb * 1.09);
    }
  );

  it('12x12 rows land within 4% (tightest part of the chart)', () => {
    for (const [tile, bed, joint, perBag] of SGM_ROWS.filter((r) => r[0] === 12)) {
      const expectedLb = (25 / perBag) * 100 * 1.1;
      const got = parseFloat(run({ sqft: 100, tileSize: tile, groutWidth: joint, tileThick: bed }).result);
      expect(Math.abs(got - expectedLb) / expectedLb).toBeLessThan(0.04);
    }
  });

  it('grout scales linearly with joint width (the old formula ignored this input)', () => {
    const narrow = parseFloat(run({ sqft: 100, tileSize: 12, groutWidth: 0.125, tileThick: 0.375 }).result);
    const wide = parseFloat(run({ sqft: 100, tileSize: 12, groutWidth: 0.375, tileThick: 0.375 }).result);
    expect(wide / narrow).toBeCloseTo(3, 1);
    // Regression guard: the old code returned the same number for both.
    expect(wide).not.toBe(narrow);
  });

  it('grout scales linearly with tile thickness', () => {
    // Read the unrounded figure out of `extra` (the headline result is rounded
    // to whole pounds, which distorts a ratio test).
    const lb = (tileThick) => parseFloat(String(run({ sqft: 100, tileSize: 12, groutWidth: 0.25, tileThick }).extra).match(/Grout: ([\d.]+) lbs/)[1]);
    expect(lb(0.5) / lb(0.25)).toBeCloseTo(2, 1);
  });

  it('bigger tile needs less grout at the same joint width', () => {
    const small = parseFloat(run({ sqft: 100, tileSize: 6, groutWidth: 0.25, tileThick: 0.375 }).result);
    const large = parseFloat(run({ sqft: 100, tileSize: 18, groutWidth: 0.25, tileThick: 0.375 }).result);
    expect(small).toBeGreaterThan(large);
  });

  it('rejects a nonsense joint width instead of shrinking grout to zero', () => {
    const got = parseFloat(run({ sqft: 100, tileSize: 12, groutWidth: 0, tileThick: 0.375 }).result);
    expect(got).toBeGreaterThan(0);
    expect(Number.isFinite(got)).toBe(true);
  });
});

describe('thinset follows the trowel notch, not a flat area rate', () => {
  it.each(CUSTOM_BAG)('%s: bag count covers the job across the whole published range', (trowel, low, high) => {
    const sqft = 400;
    const bags = Number(String(run({ sqft, tileSize: 12, groutWidth: 0.125, tileThick: 0.375, trowel }).extra).match(/(\d+) × 50 lb bag/)[1]);
    // Independent requirement: bags must sit between the two published bounds —
    // never below ceil(area x 1.1 / high) and never above ceil(area x 1.1 / low).
    expect(bags).toBeGreaterThanOrEqual(Math.ceil((sqft * 1.1) / high));
    expect(bags).toBeLessThanOrEqual(Math.ceil((sqft * 1.1) / low));
  });

  it('a wider notch needs strictly more bags for the same area', () => {
    const base = { sqft: 600, tileSize: 18, groutWidth: 0.125, tileThick: 0.375 };
    const bags = (trowel) => Number(String(run({ ...base, trowel }).extra).match(/(\d+) × 50 lb bag/)[1]);
    expect(bags('quarter')).toBeLessThan(bags('quarter_three_eighth'));
    expect(bags('quarter_three_eighth')).toBeLessThan(bags('half'));
    expect(bags('half')).toBeLessThan(bags('u_notch'));
  });

  it('rejects the old flat 60 sq ft/bag answer it used to print', () => {
    const sqft = 600;
    const oldAnswer = Math.ceil((sqft * 1.1) / 60); // 11 bags — the retired maths
    const bags = Number(String(run({ sqft, tileSize: 18, groutWidth: 0.125, tileThick: 0.375, trowel: 'half' }).extra).match(/(\d+) × 50 lb bag/)[1]);
    // 600 sq ft on a 1/2"x1/2" notch at 42-47 sq ft/bag = 15 or 16 bags.
    expect(bags).toBeGreaterThan(oldAnswer);
    expect(bags).toBeGreaterThanOrEqual(Math.ceil((sqft * 1.1) / 47));
    expect(bags).toBeLessThanOrEqual(Math.ceil((sqft * 1.1) / 42));
  });

  it('says so when the notch does not match the tile size (both directions)', () => {
    const small = String(run({ sqft: 100, tileSize: 18, groutWidth: 0.125, tileThick: 0.375, trowel: 'quarter' }).extra);
    expect(small).toContain('⚠');
    expect(small).toContain('small');
    const big = String(run({ sqft: 100, tileSize: 6, groutWidth: 0.125, tileThick: 0.375, trowel: 'half' }).extra);
    expect(big).toContain('ℹ');
    expect(big).toContain('larger');
  });

  it('stays quiet when the notch matches MAPEI guidance for the tile size', () => {
    const paired = [
      [6, 'quarter'],
      [12, 'quarter_three_eighth'],
      [18, 'half'],
    ];
    for (const [tileSize, trowel] of paired) {
      const extra = String(run({ sqft: 100, tileSize, groutWidth: 0.125, tileThick: 0.375, trowel }).extra);
      expect(extra).not.toContain('⚠');
      expect(extra).not.toContain('ℹ');
    }
  });
});

describe('tile count', () => {
  it('does not add a phantom tile through float error (100 sq ft of 12" tile)', () => {
    // 100 / 1 x 1.1 = 110.00000000000001 in IEEE754 -> ceil() used to say 111.
    const extra = String(run({ sqft: 100, tileSize: 12, groutWidth: 0.125, tileThick: 0.375 }).extra);
    expect(extra).toContain('Tiles: 110 ');
  });

  it('carries 10% breakage on clean numbers', () => {
    const extra = String(run({ sqft: 200, tileSize: 12, groutWidth: 0.125, tileThick: 0.375 }).extra);
    expect(extra).toContain('Tiles: 220 ');
  });
});
