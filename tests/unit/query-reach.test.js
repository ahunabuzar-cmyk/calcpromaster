import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  normPage, reachTier, groupPairsByPath, pageReach, variantSplits, intentCoverage, targetGap,
  classifySplit, visibleText, contentCoverage, planAction, TIERS, INTENT_BUCKETS,
} = require('../../scripts/build-query-reach.cjs');

// Do variants (slash / no-slash) + ek doosra page, taake split bhi test ho.
const PAIRS = [
  { query: 'home insurance calculator', page: 'https://calcpromaster.com/lifestyle/home-insurance', clicks: 0, impressions: 637, position: 12 },
  { query: 'home insurance calculator', page: 'https://calcpromaster.com/lifestyle/home-insurance/', clicks: 0, impressions: 366, position: 15 },
  { query: 'how much is home insurance', page: 'https://calcpromaster.com/lifestyle/home-insurance/', clicks: 0, impressions: 10, position: 40 },
  { query: 'raid capacity formula', page: '/tech/raid-capacity/', clicks: 0, impressions: 50, position: 5 },
  { query: 'raid capacity table', page: '/tech/raid-capacity/', clicks: 0, impressions: 20, position: 8 },
];

describe('query reach / normPage', () => {
  it('strips host, query string and trailing slash so variants share a key', () => {
    expect(normPage('https://calcpromaster.com/lifestyle/home-insurance/')).toBe('/lifestyle/home-insurance');
    expect(normPage('https://calcpromaster.com/lifestyle/home-insurance')).toBe('/lifestyle/home-insurance');
    expect(normPage('/a/b/?utm=1#x')).toBe('/a/b');
  });

  it('keeps the root path distinct from empty input', () => {
    expect(normPage('')).toBe('/');
    expect(normPage('https://calcpromaster.com/')).toBe('/');
  });
});

describe('query reach / reachTier', () => {
  it('labels a page by its distinct-query count', () => {
    expect(reachTier(165)).toBe('hundreds');
    expect(reachTier(100)).toBe('hundreds');
    expect(reachTier(99)).toBe('broad');
    expect(reachTier(30)).toBe('broad');
    expect(reachTier(29)).toBe('growing');
    expect(reachTier(10)).toBe('growing');
    expect(reachTier(9)).toBe('thin');
    expect(reachTier(4)).toBe('thin');
    expect(reachTier(3)).toBe('stuck');
    expect(reachTier(0)).toBe('stuck');
  });

  it('tiers cover every count without a gap', () => {
    // 0..200 har count ke liye ek tier milna chahiye.
    for (let n = 0; n <= 200; n++) expect(TIERS.some((t) => n >= t.min)).toBe(true);
  });
});

describe('query reach / groupPairsByPath', () => {
  const byPath = groupPairsByPath(PAIRS);

  it('groups URL variants of the same content under one canonical path', () => {
    expect([...byPath.keys()].sort()).toEqual(['/lifestyle/home-insurance', '/tech/raid-capacity']);
    expect(byPath.size).toBe(2);
  });

  it('keeps every raw variant so the split stays visible', () => {
    const e = byPath.get('/lifestyle/home-insurance');
    expect(e.variants.size).toBe(2);
    expect(e.variants.get('https://calcpromaster.com/lifestyle/home-insurance')).toBe(637);
    expect(e.variants.get('https://calcpromaster.com/lifestyle/home-insurance/')).toBe(376);
  });

  it('merges the same query across variants instead of double-counting pages', () => {
    const e = byPath.get('/lifestyle/home-insurance');
    expect(e.queryMap.get('home insurance calculator').impressions).toBe(1003);
    expect(e.queryMap.get('home insurance calculator').count).toBe(2);
  });
});

describe('query reach / pageReach', () => {
  it('reports distinct queries, head query and variant count', () => {
    const e = groupPairsByPath(PAIRS).get('/lifestyle/home-insurance');
    const r = pageReach(e);
    expect(r.path).toBe('/lifestyle/home-insurance');
    expect(r.distinctQueries).toBe(2);
    expect(r.tier).toBe('stuck');
    expect(r.headQuery).toBe('home insurance calculator');
    expect(r.variantCount).toBe(2);
    expect(r.splitSignal).toBe(true);
    expect(r.pairImpressions).toBe(1013);
  });

  it('prefers the authoritative page impressions when supplied', () => {
    const e = groupPairsByPath(PAIRS).get('/lifestyle/home-insurance');
    expect(pageReach(e, 9999).impressions).toBe(9999);
    expect(pageReach(e, 0).impressions).toBe(1013); // 0 is not authoritative
  });

  it('averages position across the same query on multiple variants', () => {
    const e = groupPairsByPath(PAIRS).get('/lifestyle/home-insurance');
    const q = pageReach(e).queries.find((x) => x.query === 'home insurance calculator');
    expect(q.position).toBe(13.5);
  });

  it('a single-URL page reports no split', () => {
    const e = groupPairsByPath(PAIRS).get('/tech/raid-capacity');
    const r = pageReach(e);
    expect(r.splitSignal).toBe(false);
    expect(r.positions.p4to10).toBe(2);
    expect(r.positions.p1to3).toBe(0);
  });
});

describe('query reach / variantSplits', () => {
  it('lists only split paths, biggest leak first', () => {
    const pages = [...groupPairsByPath(PAIRS).values()].map((e) => pageReach(e));
    const splits = variantSplits(pages);
    expect(splits).toHaveLength(1);
    expect(splits[0].path).toBe('/lifestyle/home-insurance');
    expect(splits[0].variantCount).toBe(2);
    expect(splits[0].minorityShare).toBeCloseTo(376 / 1013, 3);
  });
});

describe('query reach / classifySplit', () => {
  it('calls a split "consolidation-lag" when the config already agrees', () => {
    // Live serves /path/ natively (directory) and the sitemap lists /path/ too —
    // the dual impressions are just GSC lag, so no fix is warranted.
    const v = classifySplit({ winnerIsSlash: false, nativeForm: 'slash', sitemapHasSlash: true, sitemapHasNoSlash: false });
    expect(v.verdict).toBe('consolidation-lag');
    expect(v.sitemapForm).toBe('slash');
    expect(v.winnerMatchesConfig).toBe(false);
  });

  it('flags a real bug when the sitemap form differs from the served form', () => {
    const v = classifySplit({ winnerIsSlash: true, nativeForm: 'noslash', sitemapHasSlash: true, sitemapHasNoSlash: false });
    expect(v.verdict).toBe('config-mismatch');
    expect(v.winnerMatchesConfig).toBe(false);
  });

  it('flags a page served from BOTH forms as a config mismatch — that is a true duplicate', () => {
    const v = classifySplit({ winnerIsSlash: true, nativeForm: 'both', sitemapHasSlash: true, sitemapHasNoSlash: false });
    expect(v.verdict).toBe('config-mismatch');
  });

  it('reports a path missing from the sitemap instead of inventing a redirect fix', () => {
    const v = classifySplit({ winnerIsSlash: false, nativeForm: 'slash', sitemapHasSlash: false, sitemapHasNoSlash: false });
    expect(v.verdict).toBe('not-in-sitemap');
    expect(v.sitemapForm).toBe('none');
  });

  it('handles a flat .html page whose canonical form is no-slash', () => {
    const v = classifySplit({ winnerIsSlash: false, nativeForm: 'noslash', sitemapHasSlash: false, sitemapHasNoSlash: true });
    expect(v.verdict).toBe('consolidation-lag');
    expect(v.winnerMatchesConfig).toBe(true);
  });
});

describe('query reach / intentCoverage', () => {
  it('marks the buckets a page already covers', () => {
    const cov = intentCoverage([
      { query: 'how to calculate raid capacity' },
      { query: 'raid capacity formula' },
      { query: 'raid capacity table' },
      { query: 'raid capacity vs mirroring' },
    ]);
    const present = cov.present.map((p) => p.key);
    expect(present).toContain('question');
    expect(present).toContain('formula');
    expect(present).toContain('table');
    expect(present).toContain('comparison');
    expect(cov.missing.map((m) => m.key)).toContain('region');
  });

  it('reports every bucket missing for a page with no queries', () => {
    const cov = intentCoverage([]);
    expect(cov.present).toHaveLength(0);
    expect(cov.missing).toHaveLength(INTENT_BUCKETS.length);
    expect(cov.coverage).toBe(0);
  });

  it('coverage stays between 0 and 1', () => {
    const cov = intentCoverage([{ query: 'how to calculate pmi free table 2026' }]);
    expect(cov.coverage).toBeGreaterThan(0);
    expect(cov.coverage).toBeLessThanOrEqual(1);
  });
});

describe('query reach / visibleText', () => {
  it('drops scripts, styles and attributes so markup cannot fake content', () => {
    const text = visibleText('<script>var formula = "2 x 3";</script><style>.a{color:red}</style><a href="/x?y=1">Monthly</a>');
    expect(text).toContain('monthly');
    expect(text).not.toContain('formula');
    expect(text).not.toContain('color:red');
  });

  it('collapses whitespace and lowercases', () => {
    expect(visibleText('<p>  Hello   WORLD </p>')).toBe(' hello world ');
  });
});

describe('query reach / contentCoverage', () => {
  // Regression guard: an href attribute full of "=" must NOT satisfy the
  // formula bucket — that false positive made every page look covered.
  it('does not count attribute equals signs as a formula', () => {
    const cov = contentCoverage('<html><body><a href="/finance/pmi-calculator/?a=1">Open</a></body></html>');
    expect(cov.missing.map((m) => m.key)).toContain('formula');
    expect(cov.missing.map((m) => m.key)).toContain('table');
  });

  it('detects a real formula, table, question heading and example', () => {
    const html = '<h2>How PMI is calculated</h2>' +
      '<p>Monthly PMI = Loan \u00d7 Rate \u00f7 12</p>' +
      '<table><tr><td>1</td></tr></table>' +
      '<p>For example, a $400,000 loan at 0.5% costs $166.67 per month.</p>';
    const cov = contentCoverage(html);
    const present = cov.present.map((p) => p.key);
    expect(present).toContain('question');
    expect(present).toContain('formula');
    expect(present).toContain('table');
    expect(present).toContain('example');
    expect(present).toContain('period');
    expect(cov.missing.map((m) => m.key)).toContain('comparison');
  });

  it('reports zero coverage for an empty page, never a fabricated pass', () => {
    const cov = contentCoverage('');
    expect(cov.coverage).toBe(0);
    expect(cov.missing).toHaveLength(INTENT_BUCKETS.length);
  });
});

describe('query reach / planAction', () => {
  it('labels a bucket neither side has as "write"', () => {
    const a = planAction(['table', 'region'], ['table', 'formula']);
    expect(a.write).toEqual(['table']);
    expect(a.expose).toEqual(['region']);
    expect(a.action).toBe('write');
  });

  it('prefers "expose" when content already covers every missing query bucket', () => {
    const a = planAction(['comparison'], []);
    expect(a.write).toEqual([]);
    expect(a.expose).toEqual(['comparison']);
    expect(a.action).toBe('expose');
  });

  it('says "fine" when no query bucket is missing', () => {
    const a = planAction([], ['table']);
    expect(a.action).toBe('fine');
  });
});

describe('query reach / targetGap', () => {
  it('turns a 28-day window into a monthly base and a multiple', () => {
    const g = targetGap({ impressions: 14000, days: 28, targets: [200000], runRateMonthly: 37767 });
    expect(g.perDay).toBe(500);
    expect(g.perMonth).toBe(15000);
    expect(g.targets[0].multiple).toBeCloseTo(13.33, 2);
    expect(g.targets[0].perDay).toBeCloseTo(6666.7, 1);
  });

  it('reports the run-rate base separately so the two never contradict', () => {
    const g = targetGap({ impressions: 14000, days: 28, targets: [200000, 300000], runRateMonthly: 37767 });
    expect(g.runRateMonthly).toBe(37767);
    expect(g.targetsFromRunRate[0].multiple).toBeCloseTo(5.3, 1);
    expect(g.targetsFromRunRate[1].multiple).toBeCloseTo(7.94, 1);
  });

  it('does not invent a run-rate multiple when the tracker has not run', () => {
    const g = targetGap({ impressions: 14000, days: 28, targets: [200000] });
    expect(g.runRateMonthly).toBeNull();
    expect(g.targetsFromRunRate).toBeNull();
  });

  it('handles a zero base without dividing by zero', () => {
    const g = targetGap({ impressions: 0, days: 28, targets: [200000] });
    expect(g.perMonth).toBe(0);
    expect(g.targets[0].multiple).toBeNull();
  });
});
