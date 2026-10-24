// Guards for the UberSuggest export triage (scripts/ubersuggest-triage.cjs).
//
// The point of these tests is not coverage of the script. It is to pin the three
// judgements the report depends on:
//   1. a device/app/code keyword is not a page we can build;
//   2. the 50 currency phrasings are 7 pairs, not 50 keywords or 8 pairs;
//   3. one competitor's backlink profile is a link farm and the other is not.
// If any of those flip, the report's recommendations are wrong and this fails.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const T = require('../../scripts/ubersuggest-triage.cjs');

const OUT = path.join(process.cwd(), 'data', 'ubersuggest-triage-2026-10-18.json');
const DOC = path.join(process.cwd(), 'docs', 'UBERSUGGEST-TRIAGE-2026-10-18.md');
const haveOutput = fs.existsSync(OUT) && fs.existsSync(DOC);
const data = haveOutput ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;

describe('keyword intent', () => {
  it('separates a calculation from a shopping query', () => {
    expect(T.classifyKeyword('calculator bmi')).toBe('serve');
    expect(T.classifyKeyword('calculator emi')).toBe('serve');
    expect(T.classifyKeyword('calculator age')).toBe('serve');
  });

  it('rejects the rows that are a physical device', () => {
    expect(T.classifyKeyword('calculator casio')).toBe('device');
    expect(T.classifyKeyword('calculator watch casio')).toBe('device');
    expect(T.classifyKeyword('calculator 991es')).toBe('device');
    // "under 100" is a price filter on a device; it lands in serial because the
    // tail is a bare number. Either way it must not read as a calculation.
    expect(['device', 'serial']).toContain(T.classifyKeyword('calculator under 100'));
    expect(['device', 'serial']).toContain(T.classifyKeyword('calculator price in india'));
  });

  it('rejects app-store, tutorial and branded rows', () => {
    expect(T.classifyKeyword('calculator hide app')).toBe('app');
    expect(T.classifyKeyword('calculator apk')).toBe('app');
    expect(T.classifyKeyword('calculator program in python')).toBe('code');
    expect(T.classifyKeyword('calculator in tally')).toBe('code');
    expect(T.classifyKeyword('calculator google')).toBe('brand');
    expect(T.classifyKeyword('calculator net')).toBe('brand');
  });

  it('treats a bare model number as serial, not as a calculation', () => {
    expect(T.classifyKeyword('calculator 84')).toBe('serial');
    expect(T.classifyKeyword('calculator 80085')).toBe('serial');
    expect(T.classifyKeyword('0x3 calculator')).toBe('serial');
  });

  it('only calls the seed pattern off-intent, not "and" inside a real calculation', () => {
    expect(T.classifyKeyword('calculator vs computer')).toBe('offintent');
    expect(T.classifyKeyword('calculator and calendar')).toBe('offintent');
    // This one must stay: it is a real page (hours + minutes), not two products.
    expect(T.classifyKeyword('calculator hours and minutes')).toBe('serve');
  });
});

describe('intent clustering', () => {
  it('folds the rupee spellings into one cluster', () => {
    expect(T.clusterKey('usd to pkr')).toBe(T.clusterKey('dollar to pakistani rupee'));
    expect(T.clusterKey('dollar to pakistan rupee')).toBe(T.clusterKey('dollar to pak rupee'));
  });

  it('drops the generic tail and the filler', () => {
    expect(T.clusterKey('bmi calculator online')).toBe('bmi');
    expect(T.clusterKey('calculator bmi')).toBe('bmi');
  });

  it('does not merge two different calculations', () => {
    expect(T.clusterKey('bmi')).not.toBe(T.clusterKey('emi'));
  });
});

describe('currency pairs', () => {
  it('collapses the export to 7 pairs, all ending in PKR', () => {
    const { pairs } = T.currencyPairs();
    expect(pairs.length).toBe(7);
    for (const p of pairs) expect(p.pair.endsWith('>PKR')).toBe(true);
  });

  it('never invents a three-currency pair from "cad dollar"', () => {
    const { pairs } = T.currencyPairs();
    const cad = pairs.find((p) => p.pair.startsWith('CAD'));
    expect(cad).toBeTruthy();
    expect(cad.pair).toBe('CAD>PKR');
    expect(pairs.some((p) => p.pair.split('>').length > 2)).toBe(false);
  });

  it('reports the max phrasing volume, never the sum', () => {
    const { pairs } = T.currencyPairs();
    const usd = pairs.find((p) => p.pair === 'USD>PKR');
    expect(usd.phrasings).toBeGreaterThan(1);
    // 1.5M is the single largest USD>PKR phrasing; a sum would be several
    // million and would be a fabricated number.
    expect(usd.volume).toBe(1500000);
  });
});

describe('backlink classification', () => {
  it('flags spun-content blog farm posts', () => {
    expect(T.classifyLink('bob.blogprodesign.com/taking-control-your-guide-to-home-loan-calculators'))
      .toBe('farm');
    expect(T.classifyLink('ztndz.com/story18918362/dwelling-financial-loan-calculator-calculator-io'))
      .toBe('farm');
    expect(T.classifyLink('mylisthero.com/all/538/2.html')).toBe('farm');
  });

  it('keeps real editorial links out of the farm bucket', () => {
    expect(T.classifyLink('www.bbc.com/future/article/20200106-how-to-calculate-your-dogs-real-age'))
      .toBe('news');
    expect(T.classifyLink('www.nytimes.com/wirecutter/reviews/best-led-lantern/')).toBe('news');
    expect(T.classifyLink('en.wikipedia.org/wiki/Gamma')).toBe('wiki');
    expect(T.classifyLink('cs112.cs.yale.edu/18sp/psets/pset01/great_race.html')).toBe('edu');
    expect(T.classifyLink('stackoverflow.com/questions/11438794/is-the-size-of-c-int-2-bytes-or-4-bytes'))
      .toBe('forum');
  });

  it('separates search-engine and shortener artifacts from links', () => {
    expect(T.classifyLink('bit.ly/2DQVvn8')).toBe('search/shortener');
    expect(T.classifyLink('sba.yandex.ru/redirect?url=https%3A%2F%2Fwww.rapidtables.com')).toBe('search/shortener');
  });
});

describe('regenerated artifacts', () => {
  it('has been run', () => {
    expect(haveOutput, 'run node scripts/ubersuggest-triage.cjs first').toBe(true);
    expect(data).toBeTruthy();
  });

  it('read every row of the exports', () => {
    expect(data.sources.length).toBe(8);
    const links = data.links;
    expect(links.length).toBe(2);
    for (const l of links) expect(l.rows).toBe(500);
    for (const f of data.keywords) expect(f.rows).toBeGreaterThan(0);
  });

  it('finds calculator.io half link-farm and rapidtables not', () => {
    const ci = data.links.find((l) => /calculatorio/.test(l.file));
    const rt = data.links.find((l) => /rapidtables/.test(l.file));
    expect(ci.farmShare).toBeGreaterThan(0.4);
    expect(rt.farmShare).toBeLessThan(0.05);
  });

  it('cross-competitor overlap is publishers, with a minority of platforms', () => {
    const share = data.refDomains.sharedPlatformNoise / data.refDomains.sharedAtLeast2;
    expect(data.refDomains.sharedAtLeast2).toBeGreaterThan(50);
    // The claim in the report is that the shared surface is mostly real
    // publishers. If platforms ever dominate again, that prose is wrong.
    expect(share).toBeLessThan(0.4);
    expect(data.refDomains.sharedRealCount).toBeGreaterThan(50);
    expect(data.refDomains.sharedReal.some((d) => d.domain === 'nytimes.com')).toBe(true);
  });

  it('every covered cluster points at a page that ships', () => {
    const shipped = new Set(data.join.covered.map((c) => c.page || c.pageTitle).filter(Boolean));
    expect(shipped.size).toBeGreaterThan(0);
    for (const c of data.join.covered) {
      const u = c.page || c.pageTitle;
      expect(u, c.cluster).toMatch(/^https:\/\/calcpromaster\.com\//);
      expect(u.endsWith('.html')).toBe(false);
    }
    for (const c of data.join.uncovered) expect(c.page).toBeNull();
  });

  it('no exported keyword overlaps a query we already appear for', () => {
    // This is the claim §6 rests on: new keywords cannot be the fast win, because
    // none of them is a query Google already shows us for.
    expect(data.overlap).toBeTruthy();
    expect(data.overlap.checkedKeywords).toBeGreaterThan(500);
    expect(data.overlap.exactMatches).toBe(0);
  });

  it('the CTR finding survives: top-10 URLs carry impressions and no clicks', () => {
    expect(data.gsc.zeroClickTop10Count).toBeGreaterThan(50);
    expect(data.gsc.zeroClickTop10Impressions).toBeGreaterThan(1000);
    expect(data.gsc.totals.clicks).toBeLessThan(100);
  });

  it('the doc quotes the computed numbers, not stale ones', () => {
    const md = fs.readFileSync(DOC, 'utf8');
    const nf = (n) => Number(n).toLocaleString('en-US');
    expect(md).toContain(nf(data.gsc.duplicateUrlForms) + ' pages appear in GSC under **both**');
    expect(md).toContain(nf(data.gsc.zeroClickTop10Count) + ' pages (' + nf(data.gsc.zeroClickTop10Forms)
      + ' URL forms, because of the slash split below)');
    // The page count must never exceed the form count, or the slash collapse broke.
    expect(data.gsc.zeroClickTop10Count).toBeLessThanOrEqual(data.gsc.zeroClickTop10Forms);
    expect(md).toContain(nf(data.join.uncovered.length) + ' |');
    expect(md).toContain(nf(data.overlap.exactMatches) + ' of the ' + nf(data.overlap.checkedKeywords));
    expect(md).toContain('Every figure below is recomputed by the script');
  });
});
