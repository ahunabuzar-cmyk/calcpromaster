import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { selectPanel, mergeFullQueue, panelRate, movementPair, churnOf, churnAlert, emitChurnAlert, tallyPanel, rankOf, pendingUrls, mapPool } = require('../../scripts/build-index-panel.cjs');

describe('index panel / rankOf', () => {
  it('orders Google’s crawl pipeline', () => {
    expect(rankOf('URL is unknown to Google')).toBe(0);
    expect(rankOf('Discovered - currently not indexed')).toBe(1);
    expect(rankOf('Crawled - currently not indexed')).toBe(2);
    expect(rankOf('Submitted and indexed')).toBe(3);
  });

  it('treats redirect / noindex / duplicate states as not-a-candidate', () => {
    expect(rankOf('Page with redirect')).toBeNull();
    expect(rankOf('Alternate page with proper canonical tag')).toBeNull();
    expect(rankOf(undefined)).toBeNull();
  });
});

describe('index panel / selectPanel', () => {
  const queue = Array.from({ length: 585 }, (_, i) => '/c' + String(i).padStart(3, '0'));

  it('picks exactly the requested size', () => {
    expect(selectPanel(queue, 95)).toHaveLength(95);
  });

  it('is deterministic — same queue, same panel, every week', () => {
    expect(selectPanel(queue, 40)).toEqual(selectPanel(queue.slice().reverse(), 40));
  });

  it('spreads across the whole queue instead of taking one alphabetical head', () => {
    const panel = selectPanel(queue, 10);
    expect(panel[0]).toBe('/c000');
    // A head-slice would never reach the tail of the queue.
    expect(panel[panel.length - 1] > '/c500').toBe(true);
    expect(panel.filter((u) => u > '/c250').length).toBeGreaterThan(3);
  });

  it('de-duplicates and drops non-strings', () => {
    expect(selectPanel(['/a', '/a', null, 42, '/b'], 10)).toEqual(['/a', '/b']);
  });

  it('returns the whole list when it is already small enough', () => {
    expect(selectPanel(['/a', '/b'], 100)).toEqual(['/a', '/b']);
  });

  it('handles an empty queue and a zero size without throwing', () => {
    expect(selectPanel([], 100)).toEqual([]);
    expect(selectPanel(null, 100)).toEqual([]);
    expect(selectPanel(queue, 0)).toEqual([]);
  });
});

describe('index panel / pendingUrls (resumable --inspect)', () => {
  const urls = ['/a', '/b', '/c'];

  it('skips the URLs an interrupted run already checked', () => {
    expect(pendingUrls(urls, { '/a': 'Submitted and indexed' })).toEqual(['/b', '/c']);
  });

  it('re-inspects a URL the checkpoint has no answer for', () => {
    expect(pendingUrls(urls, { '/a': 'URL is unknown to Google' })).toContain('/b');
  });

  it('treats an empty checkpoint as nothing done', () => {
    expect(pendingUrls(urls, {})).toEqual(urls);
    expect(pendingUrls(urls, null)).toEqual(urls);
  });
});

describe('index panel / tallyPanel', () => {
  it('splits a snapshot into still-queued vs indexed', () => {
    const t = tallyPanel({
      '/a': 'URL is unknown to Google',
      '/b': 'Discovered - currently not indexed',
      '/c': 'Crawled - currently not indexed',
      '/d': 'Submitted and indexed',
    });
    expect(t.total).toBe(4);
    expect(t.queued).toBe(3);
    expect(t.indexed).toBe(1);
    expect(t.byState['URL is unknown to Google']).toBe(1);
  });

  it('counts a non-candidate state in the total but in neither bucket', () => {
    const t = tallyPanel({ '/x': 'Page with redirect' });
    expect(t.total).toBe(1);
    expect(t.queued).toBe(0);
    expect(t.indexed).toBe(0);
  });

  it('handles an empty snapshot', () => {
    expect(tallyPanel(null)).toEqual({ byState: {}, queued: 0, indexed: 0, total: 0 });
  });
});

describe('index panel / mapPool (parallel inspection)', () => {
  it('returns one result per item, in input order', async () => {
    const out = await mapPool([1, 2, 3, 4], 2, async (n) => n * 10);
    expect(out.map((r) => r.item)).toEqual([1, 2, 3, 4]);
    expect(out.map((r) => r.value)).toEqual([10, 20, 30, 40]);
  });

  it('never runs more workers at once than the limit', async () => {
    let inFlight = 0, peak = 0;
    await mapPool([1, 2, 3, 4, 5, 6, 7, 8], 3, async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
    });
    expect(peak).toBe(3);
  });

  it('finishes 8 slow workers in about the time of 2, not 8', async () => {
    const started = Date.now();
    await mapPool([1, 2, 3, 4, 5, 6, 7, 8], 4, () => new Promise((r) => setTimeout(r, 50)));
    expect(Date.now() - started).toBeLessThan(160);
  });

  it('captures a failure against its own item instead of aborting the pool', async () => {
    const out = await mapPool(['ok', 'bad', 'ok'], 3, async (s) => {
      if (s === 'bad') throw new Error('boom');
      return s;
    });
    expect(out[0].value).toBe('ok');
    expect(out[1].error.message).toBe('boom');
    expect(out[2].value).toBe('ok');
  });

  it('handles an empty list without starting a worker', async () => {
    let calls = 0;
    await mapPool([], 5, async () => { calls++; });
    expect(calls).toBe(0);
  });
});

describe('index panel / panelRate', () => {
  const snap = (date, checked) => ({ date, checked, failures: 0 });
  const history = [
    snap('2026-10-04', {
      '/a': 'URL is unknown to Google',
      '/b': 'URL is unknown to Google',
      '/c': 'Discovered - currently not indexed',
      '/d': 'Submitted and indexed',
    }),
    snap('2026-10-11', {
      '/a': 'Submitted and indexed',
      '/b': 'Discovered - currently not indexed',
      '/c': 'Crawled - currently not indexed',
      '/d': 'Submitted and indexed',
    }),
  ];

  it('measures only the URLs present in both snapshots', () => {
    const r = panelRate(history);
    expect(r.pairs).toHaveLength(1);
    expect(r.pairs[0].common).toBe(4);
    expect(r.pairs[0].days).toBe(7);
  });

  it('counts stages advanced, pages that became indexed and pages that left "unknown"', () => {
    const p = panelRate(history).pairs[0];
    // /a 0→3 = 3, /b 0→1 = 1, /c 1→2 = 1, /d 3→3 = 0
    expect(p.stages).toBe(5);
    expect(p.becameIndexed).toBe(1);
    expect(p.leftUnknown).toBe(2);
  });

  it('reports the rate per week, not per day', () => {
    expect(panelRate(history).indexedPerWeek).toBeCloseTo(1, 5);
  });

  it('says nothing rather than guessing when there is only one snapshot', () => {
    const r = panelRate([history[0]]);
    expect(r.pairs).toEqual([]);
    expect(r.indexedPerWeek).toBeNull();
    expect(panelRate([]).indexedPerWeek).toBeNull();
  });

  it('ignores snapshots that share a date (no zero-day division)', () => {
    const r = panelRate([history[0], snap('2026-10-04', history[1].checked), history[1]]);
    expect(r.pairs.every((p) => p.days > 0)).toBe(true);
  });

  it('never counts a backwards move as progress', () => {
    // Chronological, with the later snapshot worse than the earlier one: the rate
    // must read 0, not a negative number and not progress.
    const declined = [history[1], snap('2026-10-18', { '/a': 'Discovered - currently not indexed', '/d': 'Crawled - currently not indexed' })];
    const p = panelRate(declined).pairs[0];
    expect(p.stages).toBe(0);
    expect(p.becameIndexed).toBe(0);
  });

  it('uses the longest tracked span as the headline rate, not a shorter one', () => {
    const three = [
      history[0],
      history[1],
      snap('2026-10-25', { '/a': 'Submitted and indexed', '/b': 'Discovered - currently not indexed', '/c': 'Crawled - currently not indexed', '/d': 'Submitted and indexed' }),
    ];
    const r = panelRate(three);
    expect(r.pairs.map((p) => p.days)).toEqual([7, 14]);
    expect(r.span.days).toBe(14);
    // Over that span /c moved one ladder stage and nothing new got indexed.
    expect(r.indexedPerWeek).toBe(0);
  });
});

describe('index panel / movementPair (both directions)', () => {
  it('records the URLs that advanced and the URLs that slipped', () => {
    const before = { date: '2026-10-04', checked: { '/a': 'URL is unknown to Google', '/b': 'Discovered - currently not indexed' } };
    const after = { date: '2026-10-11', checked: { '/a': 'Discovered - currently not indexed', '/b': 'URL is unknown to Google' } };
    const p = movementPair(before, after);
    expect(p.urlsAdvanced).toBe(1);
    expect(p.urlsSlipped).toBe(1);
    expect(p.stages).toBe(1);
    expect(p.slipped).toBe(1);
  });

  it('shows a traded pair as churn, not as progress', () => {
    const before = { date: '2026-10-04', checked: { '/a': 'URL is unknown to Google', '/b': 'Discovered - currently not indexed' } };
    const after = { date: '2026-10-11', checked: { '/a': 'Discovered - currently not indexed', '/b': 'URL is unknown to Google' } };
    const p = movementPair(before, after);
    expect(p.gainedBack).toBe(1); // the one advance was undone by the one backslide
    expect(p.churnStages).toBe(2);
    expect(p.netStages).toBe(0);
  });
});

describe('index panel / churnOf', () => {
  it('reports gainedBack as the advance that backslides cancel out', () => {
    const c = churnOf({ stages: 105, slipped: 133, urlsAdvanced: 105, urlsSlipped: 133 });
    expect(c.gainedBack).toBe(105);
    expect(c.churnStages).toBe(238);
    expect(c.netStages).toBe(-28);
  });

  it('is zero when movement only goes one way', () => {
    expect(churnOf({ stages: 5, slipped: 0 }).gainedBack).toBe(0);
    expect(churnOf({ stages: 0, slipped: 5 }).gainedBack).toBe(0);
  });

  it('caps gainedBack at the smaller side so it can never invent progress', () => {
    expect(churnOf({ stages: 10, slipped: 3 }).gainedBack).toBe(3);
  });

  it('defaults to zeros instead of NaN when given nothing', () => {
    expect(churnOf()).toEqual({ urlsAdvanced: 0, urlsSlipped: 0, churnStages: 0, gainedBack: 0, netStages: 0 });
  });
});

describe('index panel / churnAlert', () => {
  // The real window that motivated this: 105 stages of advance, 133 of backslide.
  const tradedWindow = {
    from: '2026-10-09', to: '2026-10-11',
    stages: 105, slipped: 133,
    ...churnOf({ stages: 105, slipped: 133, urlsAdvanced: 105, urlsSlipped: 133 }),
  };

  it('flags the window whose advance was entirely cancelled by backslides', () => {
    const a = churnAlert(tradedWindow);
    expect(a.severity).toBe('high'); // net is negative: nothing drained
    expect(a.cancelledShare).toBe(1);
    expect(a.churnStages).toBe(238);
    expect(a.netStages).toBe(-28);
    expect(a.from).toBe('2026-10-09');
  });

  it('says nothing about a window that only moved one way', () => {
    expect(churnAlert({ stagesAdvanced: 105, slippedBack: 0 })).toBeNull();
  });

  it('still flags a queue that drained, when most of the advance was churn', () => {
    const a = churnAlert({ stagesAdvanced: 100, slippedBack: 80 });
    expect(a.severity).toBe('warn'); // net +20, but 80% of the advance was undone
    expect(a.cancelledShare).toBe(0.8);
    expect(a.netStages).toBe(20);
  });

  it('accepts both movement shapes (panel `stages` and burn-down `stagesAdvanced`)', () => {
    const panelShape = { stages: 105, slipped: 133, gainedBack: 105, churnStages: 238, netStages: -28 };
    const burndownShape = { stagesAdvanced: 105, slippedBack: 133, gainedBack: 105, churnStages: 238, netStages: -28 };
    expect(churnAlert(panelShape)).toEqual(churnAlert(burndownShape));
  });

  it('stays quiet on samples too small for the ratio to mean anything', () => {
    // A 4-URL pair changing its mind is not a churn-heavy week.
    expect(churnAlert({ stagesAdvanced: 4, slippedBack: 4 })).toBeNull();
    expect(churnAlert({ stagesAdvanced: 4, slippedBack: 4 }, { minStages: 3 })).not.toBeNull();
  });

  it('does not cry churn when nothing advanced at all', () => {
    // Pure slippage is already visible as a negative net; there is no advance to hide.
    expect(churnAlert({ stagesAdvanced: 0, slippedBack: 133 })).toBeNull();
  });

  it('handles a missing pair instead of throwing', () => {
    expect(churnAlert(null)).toBeNull();
    expect(churnAlert(undefined)).toBeNull();
  });

  it('prints the alert, and returns nothing to print when there is none', () => {
    const lines = [];
    const a = churnAlert(tradedWindow);
    expect(emitChurnAlert(a, 'index panel', (l) => lines.push(l))).toBe(a);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('⚠ index panel: churn alert:');
    expect(lines[0]).toContain('net -28');
    expect(emitChurnAlert(null, 'index panel', (l) => lines.push(l))).toBeNull();
    expect(lines).toHaveLength(1);
  });

  it('emits a GitHub Actions annotation, so the alert cannot sit only in a report', () => {
    const prev = process.env.GITHUB_ACTIONS;
    process.env.GITHUB_ACTIONS = 'true';
    try {
      const lines = [];
      emitChurnAlert(churnAlert(tradedWindow), 'index burn-down', (l) => lines.push(l));
      expect(lines[0]).toMatch(/^::warning::index burn-down: churn alert: /);
    } finally {
      if (prev === undefined) delete process.env.GITHUB_ACTIONS;
      else process.env.GITHUB_ACTIONS = prev;
    }
  });
});

describe('index panel / trailing window (why daily runs pay off)', () => {
  const snap = (date, checked) => ({ date, checked, failures: 0 });
  // Slow first week, fast second week — the shape a weekly-only sample cannot see.
  const daily = [
    snap('2026-10-01', { '/a': 'URL is unknown to Google', '/b': 'URL is unknown to Google' }),
    snap('2026-10-08', { '/a': 'Discovered - currently not indexed', '/b': 'URL is unknown to Google' }),
    snap('2026-10-15', { '/a': 'Submitted and indexed', '/b': 'Submitted and indexed' }),
  ];

  it('measures current speed over the trailing window, not the whole history', () => {
    const r = panelRate(daily, { windowDays: 7 });
    expect(r.recent.from).toBe('2026-10-08');
    expect(r.recent.to).toBe('2026-10-15');
    expect(r.recent.days).toBe(7);
    expect(r.recent.indexedPerWeek).toBe(2);
    // Two pages reached the index: 3 stages for the unknown one, 2 for the
    // discovered one — stages, not pages, is what says how fast the ladder moves.
    expect(r.recent.stagesPerWeek).toBeCloseTo(5, 5);
  });

  it('shows a speed-up the long-span headline still hides', () => {
    // Slow fortnight, then a fast week — exactly the shape a weekly-only pair
    // reports as one flat number.
    const ramping = [
      snap('2026-10-01', { '/a': 'URL is unknown to Google', '/b': 'URL is unknown to Google', '/c': 'URL is unknown to Google' }),
      snap('2026-10-15', { '/a': 'Submitted and indexed', '/b': 'URL is unknown to Google', '/c': 'URL is unknown to Google' }),
      snap('2026-10-22', { '/a': 'Submitted and indexed', '/b': 'Submitted and indexed', '/c': 'Submitted and indexed' }),
    ];
    const r = panelRate(ramping, { windowDays: 7 });
    // Headline is the 14-day pair: 1 page became indexed → 0.5/week.
    expect(r.span.days).toBe(14);
    expect(r.indexedPerWeek).toBeCloseTo(0.5, 5);
    // The last 7 days indexed 2 more → 2/week, which is the number worth acting on.
    expect(r.recent.indexedPerWeek).toBe(2);
    expect(r.recent.indexedPerWeek).toBeGreaterThan(r.indexedPerWeek);
  });

  it('widens with the requested window without double-counting a page', () => {
    const r = panelRate(daily, { windowDays: 14 });
    expect(r.recent.from).toBe('2026-10-01');
    expect(r.recent.days).toBe(14);
    // Two pages became indexed across 14 days — counted once each, not per step.
    expect(r.recent.becameIndexed).toBe(2);
    expect(r.recent.indexedPerWeek).toBe(1);
  });

  it('says nothing instead of guessing when the window holds one snapshot', () => {
    expect(panelRate(daily.slice(0, 1)).recent).toBeNull();
    expect(panelRate([]).recent).toBeNull();
  });

  it('defaults the window to a week', () => {
    expect(panelRate(daily).recent.windowDays).toBe(7);
  });
});

describe('index panel / movementPair', () => {
  it('counts a page that advanced several stages as the stages it moved', () => {
    const p = movementPair(
      { date: '2026-10-01', checked: { '/a': 'URL is unknown to Google' } },
      { date: '2026-10-08', checked: { '/a': 'Submitted and indexed' } },
    );
    expect(p.stages).toBe(3);
    expect(p.becameIndexed).toBe(1);
    expect(p.leftUnknown).toBe(1);
  });

  it('reports a backwards move as slipped, not as progress', () => {
    const p = movementPair(
      { date: '2026-10-01', checked: { '/a': 'Discovered - currently not indexed' } },
      { date: '2026-10-08', checked: { '/a': 'URL is unknown to Google' } },
    );
    expect(p.stages).toBe(0);
    expect(p.slipped).toBe(1);
    expect(p.netStages).toBe(-1);
  });

  it('ignores URLs only one of the two snapshots holds', () => {
    const p = movementPair(
      { date: '2026-10-01', checked: { '/old': 'URL is unknown to Google' } },
      { date: '2026-10-08', checked: { '/new': 'URL is unknown to Google' } },
    );
    expect(p.common).toBe(0);
    expect(p.stages).toBe(0);
  });
});

describe('index panel / mergeFullQueue (--all)', () => {
  it('covers the whole queue, not a stride sample', () => {
    const queue = ['/a', '/b', '/c', '/d'];
    expect(mergeFullQueue([], queue, ['/ctrl'])).toEqual(['/a', '/b', '/c', '/d', '/ctrl']);
  });

  it('never drops a URL that already reached the index', () => {
    // '/a' got indexed and left the queue — it must stay in the panel, or the next
    // snapshot silently loses the evidence that indexing works.
    expect(mergeFullQueue(['/a'], ['/b'], [])).toEqual(['/a', '/b']);
  });

  it('adds newly queued URLs without duplicating existing ones', () => {
    expect(mergeFullQueue(['/a', '/b'], ['/b', '/c'], ['/a'])).toEqual(['/a', '/b', '/c']);
  });

  it('drops junk entries', () => {
    expect(mergeFullQueue([null, 42, ''], ['/a'], [undefined])).toEqual(['/a']);
  });

  it('handles empty arguments', () => {
    expect(mergeFullQueue(null, null, null)).toEqual([]);
  });
});
