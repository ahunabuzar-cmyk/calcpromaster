import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { mergeTwins, bandOf } = require('../../scripts/build-zero-click-queue.cjs');

const pages = {
  'https://calcpromaster.com/health/bmr-mifflin': { clicks: 0, impressions: 749, position: 6.5 },
  'https://calcpromaster.com/health/bmr-mifflin/': { clicks: 0, impressions: 359, position: 6.2 },
  'https://calcpromaster.com/guides/tip': { clicks: 3, impressions: 396, position: 6.6 },
};

describe('zero-click queue / twin merging', () => {
  it('merges the two URL forms of one page into a single row', () => {
    const rows = mergeTwins(pages, (p) => (p === '/health/bmr-mifflin' ? '/health/bmr-mifflin/' : p));
    const bmr = rows.find((r) => r.path === '/health/bmr-mifflin');
    expect(rows).toHaveLength(2); // not 3 — /x and /x/ are one page
    expect(bmr.impressions).toBe(1108);
    expect(bmr.forms).toBe(2);
    expect(bmr.url).toBe('https://calcpromaster.com/health/bmr-mifflin/');
  });

  it('weights the merged position by impressions, not by row count', () => {
    const rows = mergeTwins(pages, null);
    const bmr = rows.find((r) => r.path === '/health/bmr-mifflin');
    // (6.5 × 749 + 6.2 × 359) / 1108 = 6.40…
    expect(bmr.position).toBe(6.4);
  });

  it('keeps the GSC URL when no built page resolves a canonical form', () => {
    const rows = mergeTwins({ 'https://calcpromaster.com/ghost/': { clicks: 0, impressions: 5, position: 9 } }, () => null);
    expect(rows[0].url).toBe('https://calcpromaster.com/ghost/');
    expect(rows[0].canonical).toBeNull();
  });

  it('leaves a single-form page with forms = 1', () => {
    const rows = mergeTwins({ 'https://calcpromaster.com/guides/tip': { clicks: 3, impressions: 396, position: 6.6 } });
    expect(rows[0].forms).toBe(1);
    expect(rows[0].impressions).toBe(396);
  });
});

describe('zero-click queue / position bands', () => {
  it('puts page-1-2 results in the snippet-fixable band and the rest in the ranking bands', () => {
    expect(bandOf(3)).toBe('1-20');
    expect(bandOf(20)).toBe('1-20');
    expect(bandOf(21)).toBe('21-50');
    expect(bandOf(50)).toBe('21-50');
    expect(bandOf(51)).toBe('51+');
    expect(bandOf(0)).toBe('unknown');
  });
});
