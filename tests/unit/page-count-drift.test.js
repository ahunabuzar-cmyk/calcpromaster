import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const {
  MIN_WORDS, readableWords, isContentless, isNonContentRoute, kindOf, compareCounts,
  checkInvariants, routeOf,
} = require('../../scripts/check-page-count-drift.cjs');

// Ek page jaise deploy mein hota hai: header, thoda content, aur script.
const REAL_PAGE = '<html><head><title>t</title><style>body{color:red}</style></head><body>' +
  '<h1>PMI Calculator</h1><p>' + 'word '.repeat(200) + '</p>' +
  '<script>var x=1;</script></body></html>';

describe('page count drift / readableWords', () => {
  it('counts only visible words, not markup or script bodies', () => {
    expect(readableWords('<p>one two three</p><script>a b c d e f</script>')).toBe(3);
    expect(readableWords('<style>.x{color:red}</style><p>hello world</p>')).toBe(2);
  });

  it('returns 0 for a NUL-filled file — the interrupted-build signature', () => {
    // 80 KB of zeros is exactly what the killed build left behind: the file size
    // and the file count both look healthy, only the content is gone.
    const sparse = '\u0000'.repeat(80000);
    expect(readableWords(sparse)).toBe(0);
    expect(isContentless(readableWords(sparse))).toBe(true);
  });

  it('treats an empty or whitespace-only page as contentless', () => {
    expect(isContentless(readableWords(''))).toBe(true);
    expect(isContentless(readableWords('<html><body>   </body></html>'))).toBe(true);
  });

  it('accepts a real page and marks the threshold boundary explicitly', () => {
    expect(isContentless(readableWords(REAL_PAGE))).toBe(false);
    expect(isContentless(MIN_WORDS - 1)).toBe(true);
    expect(isContentless(MIN_WORDS)).toBe(false);
  });

  it('does not invent a pass for a non-numeric count', () => {
    expect(isContentless(undefined)).toBe(true);
    expect(isContentless(NaN)).toBe(true);
  });
});

describe('page count drift / non-content exemptions', () => {
  it('exempts only the routes where a tiny page is normal', () => {
    expect(isNonContentRoute('/404')).toBe(true);
    expect(isNonContentRoute('/embed/percentage')).toBe(true);
    expect(isNonContentRoute('/googled1ac20b54b36e7cf')).toBe(true);
    expect(isNonContentRoute('/.well-known/security.txt')).toBe(true);
  });

  it('does not exempt a real calculator or guide', () => {
    expect(isNonContentRoute('/finance/pmi-calculator')).toBe(false);
    expect(isNonContentRoute('/guides/business-days')).toBe(false);
    expect(isNonContentRoute('/404-page')).toBe(false);
    expect(isNonContentRoute('/')).toBe(false);
  });
});

describe('page count drift / routeOf', () => {
  const deploy = path.join(process.cwd(), 'deploy');

  it('maps a directory index to its route', () => {
    expect(routeOf(path.join(deploy, 'finance', 'pmi-calculator', 'index.html'))).toBe('/finance/pmi-calculator');
  });

  it('maps a flat html file to its route', () => {
    expect(routeOf(path.join(deploy, 'guides', 'business-days.html'))).toBe('/guides/business-days');
  });

  it('maps the root index to /', () => {
    expect(routeOf(path.join(deploy, 'index.html'))).toBe('/');
  });
});

describe('page count drift / kindOf', () => {
  it('labels structural counts and reach counts apart', () => {
    expect(kindOf('sitemapUrls')).toBe('structural');
    expect(kindOf('deployPages')).toBe('structural');
    expect(kindOf('contentlessPages')).toBe('structural');
    expect(kindOf('stuckPages')).toBe('reach');
    expect(kindOf('backlogExpose')).toBe('reach');
    expect(kindOf('whatever')).toBe('other');
  });
});

describe('page count drift / compareCounts', () => {
  const base = { sitemapUrls: 1417, deployPages: 1617, stuckPages: 208 };

  it('reports no change as ok', () => {
    const rows = compareCounts(base, { ...base });
    expect(rows.every((r) => r.verdict === 'ok')).toBe(true);
    expect(rows.every((r) => r.delta === 0)).toBe(true);
  });

  it('fails on ANY structural change — that is the point of the gate', () => {
    const rows = compareCounts(base, { ...base, deployPages: 768 });
    const row = rows.find((r) => r.key === 'deployPages');
    expect(row.verdict).toBe('drift');
    expect(row.delta).toBe(-849);
    expect(row.kind).toBe('structural');
  });

  it('lets reach counts move inside the tolerance and fails beyond it', () => {
    const inside = compareCounts(base, { ...base, stuckPages: 215 }); // +3.4%
    expect(inside.find((r) => r.key === 'stuckPages').verdict).toBe('within-tolerance');
    const outside = compareCounts(base, { ...base, stuckPages: 300 }); // +44%
    expect(outside.find((r) => r.key === 'stuckPages').verdict).toBe('drift');
  });

  it('honours a custom tolerance', () => {
    const rows = compareCounts(base, { ...base, stuckPages: 220 }, { tolerancePct: 1 });
    expect(rows.find((r) => r.key === 'stuckPages').verdict).toBe('drift');
  });

  it('never divides by a zero baseline — it fails instead', () => {
    const rows = compareCounts({ stuckPages: 0 }, { stuckPages: 5 });
    expect(rows[0].verdict).toBe('drift');
  });

  it('marks counts with no baseline entry instead of passing them silently', () => {
    const rows = compareCounts(base, { ...base, newCounter: 3 });
    expect(rows.find((r) => r.key === 'newCounter').verdict).toBe('no-baseline');
  });

  it('handles a missing baseline entirely', () => {
    const rows = compareCounts(null, { sitemapUrls: 1417 });
    expect(rows[0].verdict).toBe('no-baseline');
    expect(rows[0].before).toBeNull();
  });
});

describe('page count drift / checkInvariants', () => {
  const clean = {
    contentlessPages: 0, missingToolPages: 0, missingSitemapHtml: 0, duplicateSitemapLocs: 0,
  };

  it('passes a healthy tree', () => {
    expect(checkInvariants(clean)).toEqual([]);
  });

  it('catches every invariant violation with an actionable message', () => {
    expect(checkInvariants({ ...clean, contentlessPages: 849 })[0]).toMatch(/no readable content/);
    expect(checkInvariants({ ...clean, missingToolPages: 76 })[0]).toMatch(/no deploy page/);
    expect(checkInvariants({ ...clean, missingSitemapHtml: 3 })[0]).toMatch(/build-deploy/);
    expect(checkInvariants({ ...clean, duplicateSitemapLocs: 2 })[0]).toMatch(/duplicate/i);
  });
});
