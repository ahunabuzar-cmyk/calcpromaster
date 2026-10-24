import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { isToolPath, normPath, categoryOf, buildLinkGraph, buildPlan, CRAWL_PENDING } = require('../../scripts/build-crawl-plan.cjs');

describe('isToolPath', () => {
  it('accepts two-segment tool routes with or without trailing slash', () => {
    expect(isToolPath('/finance/bmi/')).toBe(true);
    expect(isToolPath('/math/percentage')).toBe(true);
  });

  it('rejects nav, legal, asset and deeper (long-tail) routes', () => {
    expect(isToolPath('/history/')).toBe(false);       // one segment
    expect(isToolPath('/')).toBe(false);
    expect(isToolPath('/about.html')).toBe(false);
    expect(isToolPath('/finance/loan-emi/5-years/')).toBe(false); // long-tail variant
    expect(isToolPath('https://example.com/finance/x/')).toBe(false);
    expect(isToolPath('mailto:a@b.c')).toBe(false);
  });
});

describe('normPath / categoryOf', () => {
  it('strips the host, normalises the trailing slash and keeps flat files flat', () => {
    expect(normPath('https://calcpromaster.com/finance/fha-loan/')).toBe('/finance/fha-loan/');
    expect(normPath('/finance/fha-loan')).toBe('/finance/fha-loan/');
    expect(normPath('/about.html')).toBe('/about.html');
    expect(normPath('/')).toBe('/');
  });

  it('drops fragment and query so they cannot split one page into two keys', () => {
    expect(normPath('/finance/fha-loan/#faq')).toBe('/finance/fha-loan/');
    expect(normPath('/finance/fha-loan/?x=1')).toBe('/finance/fha-loan/');
    expect(normPath('https://calcpromaster.com/health/bmi/#results')).toBe('/health/bmi/');
  });

  it('reads the first path segment as the category', () => {
    expect(categoryOf('https://calcpromaster.com/finance/fha-loan/')).toBe('finance');
    expect(categoryOf('/')).toBe('root');
  });
});

describe('buildLinkGraph', () => {
  const pages = {
    '/finance/a/': '<a href="/finance/b/">B</a><a href="/finance/c/">C</a><a href="/finance/b/">dup</a>',
    '/finance/b/': '<a href="/finance/c/">C</a>',
    '/health/x/': '<a href="/finance/c/#faq">C</a><a href="/history/">nav</a>',
  };

  it('counts inbound links once per source page and ignores nav/deep/legal links', () => {
    const g = buildLinkGraph(pages, 5);
    expect(g['/finance/b/'].inlinks).toBe(1);            // only /finance/a/
    expect(g['/finance/c/'].inlinks).toBe(3);            // a, b, health/x (fragment stripped)
    expect(g['/finance/c/'].sources).toEqual(['/finance/a/', '/finance/b/', '/health/x/']);
    expect(g['/history/']).toBeUndefined();
  });

  it('never counts a page as its own inbound source', () => {
    const g = buildLinkGraph({ '/finance/a/': '<a href="/finance/a/">self</a>' }, 5);
    expect(g['/finance/a/']).toBeUndefined();
  });

  it('caps the recorded source list but keeps the true inlink count', () => {
    const many = {};
    for (let i = 0; i < 10; i++) many['/finance/p' + i + '/'] = '<a href="/finance/target/">T</a>';
    const g = buildLinkGraph(many, 3);
    expect(g['/finance/target/'].inlinks).toBe(10);
    expect(g['/finance/target/'].sources).toHaveLength(3);
  });
});

describe('buildPlan tiers', () => {
  const results = [
    { url: 'https://calcpromaster.com/finance/a/', coverage: 'Discovered - currently not indexed' },
    { url: 'https://calcpromaster.com/finance/b/', coverage: 'URL is unknown to Google' },
    { url: 'https://calcpromaster.com/finance/c/', coverage: 'Discovered - currently not indexed' },
    { url: 'https://calcpromaster.com/finance/ok/', coverage: 'Submitted and indexed' },
  ];
  const graph = {
    '/finance/a/': { inlinks: 5, sources: [] },
    '/finance/b/': { inlinks: 5, sources: [] },
    '/finance/c/': { inlinks: 1, sources: [] },
  };
  const impressions = { pages: { '/finance/a': { impressions: 12, position: 9 } } };

  it('only considers Discovered + Unknown URLs', () => {
    const plan = buildPlan(results, impressions, graph);
    expect(plan.rows.map((r) => r.url)).not.toContain('/finance/ok/');
    expect(plan.totals.crawlPending).toBe(3);
  });

  it('labels tiers: impressions → P1, well linked → P2, weak graph → P3', () => {
    const byUrl = Object.fromEntries(buildPlan(results, impressions, graph).rows.map((r) => [r.url, r]));
    expect(byUrl['/finance/a/'].tier).toBe('P1');
    expect(byUrl['/finance/a/'].impressions).toBe(12);
    expect(byUrl['/finance/b/'].tier).toBe('P2');
    expect(byUrl['/finance/c/'].tier).toBe('P3');
  });

  it('orders rows P1 → P2 → P3 (the sequence the plan doc prescribes)', () => {
    const rows = buildPlan(results, impressions, graph).rows;
    expect(rows.map((r) => r.tier)).toEqual(['P1', 'P2', 'P3']);
    expect(rows[0].url).toBe('/finance/a/');
    expect(rows[rows.length - 1].url).toBe('/finance/c/');
  });

  it('groups counts per category and tolerates missing impressions/graph data', () => {
    const plan = buildPlan(results, null, {});
    expect(plan.byCategory.finance).toEqual({ total: 3, P1: 0, P2: 0, P3: 3, impressions: 0 });
    expect(plan.totals.zeroInlink).toBe(3);
  });

  it('exposes the crawl-pending predicate used by callers', () => {
    expect(CRAWL_PENDING('Discovered - currently not indexed')).toBe(true);
    expect(CRAWL_PENDING('URL is unknown to Google')).toBe(true);
    expect(CRAWL_PENDING('Submitted and indexed')).toBe(false);
    expect(CRAWL_PENDING("Excluded by 'noindex' tag")).toBe(false);
  });
});
