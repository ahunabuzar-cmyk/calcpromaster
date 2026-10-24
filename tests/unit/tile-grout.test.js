// Tile grout & thinset — independent arithmetic.
//
// History: the shipped formula was once `sqft * 5 / 50` bags (10 bags / 500 lb for
// 100 ft²) and then a flat `sqft * 1.1 / 60`. Both ignored the trowel: 50 lb of
// thinset covers ~95 ft² on a 1/4"x1/4" notch but only ~36 ft² on a 3/4"x9/16"
// U-notch, so one flat rate cannot be right at both ends. Expectations below are
// computed from published coverage, never from the tool's own expression:
//   * CUSTOM VersaBond per 50 lb bag: 1/4"x1/4" = 90-100 ft², 1/4"x3/8" = 60-67 ft²,
//     1/2"x1/2" = 42-47 ft², 3/4"x9/16" U-notch = 34-38 ft².
//   * SGM grout chart (25 lb bag, waste excluded): 12x12 on a 3/8" bed covers
//     392 / 199 / 135 ft² at 1/8" / 1/4" / 3/8" joints.
import { describe, it, expect } from 'vitest';

// The data modules call the browser chart helper; stub it the way the other
// registry tests do.
global.Charts = { bar: () => '<svg></svg>', donut: () => '<svg></svg>', gauge: () => '<svg></svg>', line: () => '<svg></svg>' };

// Midpoints of the published per-bag ranges, keyed by trowel id.
const COVERAGE_SQFT_PER_BAG = { quarter: 95, quarter_three_eighth: 63.5, half: 44.5, u_notch: 36 };
const DEFAULT_TROWEL = 'quarter_three_eighth';

async function tool() {
  const m = await import('../../js/data/home-garden.js');
  const arr = m.default || m;
  return (Array.isArray(arr) ? arr : []).find((t) => t.id === 'tile-grout');
}

function expectedBags(sqft, trowel = DEFAULT_TROWEL, waste = 1.1) {
  return Math.ceil((sqft * waste) / COVERAGE_SQFT_PER_BAG[trowel]);
}

describe('tile-grout / thinset bags', () => {
  it('100 sq ft needs 2 bags, not 10', async () => {
    const t = await tool();
    const out = t.calc({ sqft: 100, tileSize: '12', groutWidth: 0.125 });
    expect(expectedBags(100)).toBe(2);
    expect(out.extra).toContain('Thinset: 2 × 50 lb bag');
    expect(out.extra).not.toContain('Thinset: 10 ');
  });

  it('scales with area and rounds up a partial bag', async () => {
    const t = await tool();
    for (const sqft of [40, 50, 60, 250, 1000]) {
      const out = t.calc({ sqft, tileSize: '12', groutWidth: 0.125 });
      expect(out.extra, String(sqft)).toContain('Thinset: ' + expectedBags(sqft) + ' × 50 lb bag');
    }
    // 40 x 1.1 = 44 -> one bag; 50 x 1.1 = 55 -> one bag; 60 x 1.1 = 66 -> two.
    expect(expectedBags(40)).toBe(1);
    expect(expectedBags(50)).toBe(1);
    expect(expectedBags(60)).toBe(2);
  });

  it('never drops below the published low end for the chosen notch', async () => {
    const t = await tool();
    const LOW = { quarter: 100, quarter_three_eighth: 67, half: 47, u_notch: 38 };
    for (const trowel of Object.keys(LOW)) {
      const out = t.calc({ sqft: 400, tileSize: '12', groutWidth: 0.125, tileThick: 0.375, trowel });
      const bags = Number(out.extra.match(/(\d+) × 50 lb bag/)[1]);
      // Worst case for the buyer: the real coverage could be as low as LOW[trowel].
      expect(bags * LOW[trowel], trowel).toBeGreaterThanOrEqual(400 * 1.1);
    }
  });

  it('states the coverage assumption it uses, per notch', async () => {
    const t = await tool();
    const out = t.calc({ sqft: 100, tileSize: '12', groutWidth: 0.125 });
    expect(out.extra).toMatch(/1\/4" × 3\/8" notch/);
    expect(out.extra).toMatch(/63\.5 sq ft\/bag/);
    expect(out.extra).toMatch(/10% waste/);
  });

  it('uses the trowel coverage, not the retired flat 60 sq ft/bag', async () => {
    const t = await tool();
    // 600 ft² of 18" tile belongs on a 1/2"x1/2" notch: 42-47 ft² per bag, so
    // 14-16 bags. The flat-60 rule printed 11, which under-buys the job.
    const out = t.calc({ sqft: 600, tileSize: 18, groutWidth: 0.125, tileThick: 0.375, trowel: 'half' });
    const bags = Number(out.extra.match(/(\d+) × 50 lb bag/)[1]);
    expect(bags).toBeGreaterThan(Math.ceil((600 * 1.1) / 60));
    expect(bags).toBe(expectedBags(600, 'half'));
  });

  it('grout follows the published SGM chart (7 lb at the defaults)', async () => {
    const t = await tool();
    const out = t.calc({ sqft: 100, tileSize: '12', groutWidth: 0.125 });
    // SGM: 25 lb covers 392 ft² of 12x12 on a 3/8" bed at 1/8" joints ->
    // 100 x 25 / 392 = 6.38 lb, + 10% waste = 7.0 lb.
    const chart = (25 / 392) * 100 * 1.1;
    expect(Number(out.result.match(/^(\d+)/)[1])).toBe(Math.round(chart));
    expect(out.result).toContain('lbs grout');
  });

  it('scales grout with the joint width the user typed', async () => {
    const t = await tool();
    const narrow = Number(t.calc({ sqft: 100, tileSize: '12', groutWidth: 0.125 }).result.match(/^(\d+)/)[1]);
    const wide = Number(t.calc({ sqft: 100, tileSize: '12', groutWidth: 0.25 }).result.match(/^(\d+)/)[1]);
    // SGM chart: 199 ft² per bag at 1/4" vs 392 at 1/8" -> about double.
    expect(wide / narrow).toBeGreaterThan(1.7);
    expect(wide / narrow).toBeLessThan(2.3);
  });
});
