import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const { diffCopy, mergeLedger, groupByDate, snapshot, FIELDS } = require('../../scripts/build-changelog.cjs');

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

describe('changelog / diffCopy', () => {
  const previous = { bmi: { title: 'Old title', metaDesc: 'Old meta' } };
  const current = { bmi: { title: 'New title', metaDesc: 'Old meta', heading: 'BMI' } };

  it('records only the fields that actually changed', () => {
    const rows = diffCopy(current, previous, ['bmi'], '2026-10-11');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'bmi', field: 'title', from: 'Old title', to: 'New title', date: '2026-10-11' });
  });

  it('will not invent a change for a field the baseline never held', () => {
    const stats = {};
    const rows = diffCopy(current, previous, ['bmi'], '2026-10-11', stats);
    // heading has a value today but no recorded previous value → skipped, not nulled
    expect(rows.map((r) => r.field)).toEqual(['title']);
    expect(stats.compared).toBe(2);
    expect(stats.skippedNoBaseline).toBe(1);
  });

  it('records nothing at all when there is no baseline to compare against', () => {
    const stats = {};
    expect(diffCopy(current, null, ['bmi'], '2026-10-11', stats)).toEqual([]);
    expect(stats.compared).toBe(0);
    expect(stats.skippedNoBaseline).toBe(3);
  });

  it('never emits a from: null entry — every record has a real before value', () => {
    const rows = diffCopy(current, { bmi: {} }, ['bmi'], '2026-10-11');
    expect(rows).toEqual([]);
  });

  it('ignores ids with no current copy and empty field values', () => {
    expect(diffCopy({ bmi: { title: '' } }, { bmi: { title: 'x' } }, ['bmi', 'ghost'], '2026-10-11')).toEqual([]);
  });

  it('covers every field the ledger is supposed to date', () => {
    expect(FIELDS).toEqual(['title', 'metaDesc', 'heading', 'lead', 'quickAnswer']);
  });
});

describe('changelog / snapshot', () => {
  it('captures today’s copy as the next run’s baseline', () => {
    const snap = snapshot({ a: { title: 'T', metaDesc: '', heading: 'H' }, b: {} }, ['a', 'b', 'ghost']);
    expect(snap).toEqual({ a: { title: 'T', heading: 'H' } });
  });
});

describe('changelog / mergeLedger (append-only)', () => {
  const first = [{ id: 'a', field: 'title', from: null, to: 'One', date: '2026-10-04' }];

  it('keeps old entries and appends new ones', () => {
    const merged = mergeLedger({ entries: first }, [{ id: 'b', field: 'title', from: null, to: 'Two', date: '2026-10-11' }]);
    expect(merged.entries.map((e) => e.id)).toEqual(['a', 'b']);
    expect(merged.added).toHaveLength(1);
  });

  it('never re-records the same change twice', () => {
    const merged = mergeLedger({ entries: first }, first);
    expect(merged.entries).toHaveLength(1);
    expect(merged.added).toHaveLength(0);
  });

  it('still records a later change to the same field when the value differs', () => {
    const merged = mergeLedger({ entries: first }, [{ id: 'a', field: 'title', from: 'One', to: 'One v2', date: '2026-10-11' }]);
    expect(merged.entries).toHaveLength(2);
    expect(merged.entries[1].from).toBe('One');
  });

  it('starts a ledger from scratch without throwing', () => {
    expect(mergeLedger(null, first).entries).toHaveLength(1);
  });
});

describe('changelog / baseline round-trip', () => {
  it('a diff taken against a snapshot of the same copy records nothing', () => {
    const current = { a: { title: 'T', metaDesc: 'M' } };
    const stats = {};
    expect(diffCopy(current, snapshot(current, ['a']), ['a'], '2026-10-11', stats)).toEqual([]);
    expect(stats.compared).toBe(2);
    expect(stats.skippedNoBaseline).toBe(0);
  });

  it('and then reports a later edit with the real before value', () => {
    const before = { a: { title: 'Old', metaDesc: 'M' } };
    const after = { a: { title: 'New', metaDesc: 'M' } };
    const rows = diffCopy(after, snapshot(before, ['a']), ['a'], '2026-10-11');
    expect(rows).toEqual([{ id: 'a', field: 'title', from: 'Old', to: 'New', date: '2026-10-11' }]);
  });
});

describe('changelog / groupByDate', () => {
  it('groups by date, newest first, and pairs the title before → after', () => {
    const g = groupByDate([
      { id: 'a', field: 'title', from: 'old', to: 'new', date: '2026-10-11' },
      { id: 'a', field: 'metaDesc', from: 'x', to: 'y', date: '2026-10-11' },
      { id: 'b', field: 'title', from: 'p', to: 'q', date: '2026-10-04' },
    ]);
    expect(g.map((x) => x.date)).toEqual(['2026-10-11', '2026-10-04']);
    expect(g[0].pages).toHaveLength(1);
    expect(g[0].pages[0].titleBefore).toBe('old');
    expect(g[0].pages[0].titleAfter).toBe('new');
    expect(g[0].pages[0].fields.map((f) => f.field)).toEqual(['title', 'metaDesc']);
  });

  it('returns nothing for an empty ledger', () => {
    expect(groupByDate([])).toEqual([]);
  });
});

describe('changelog / the published artifacts', () => {
  it('ships a dated public page with title, canonical and indexable robots', () => {
    const html = read('changelog.html');
    const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
    expect(title.length).toBeGreaterThanOrEqual(30);
    expect(title.length).toBeLessThanOrEqual(70);
    expect(html).toMatch(/<link rel="canonical" href="https:\/\/calcpromaster\.com\/changelog">/);
    expect(html).toMatch(/<meta name="robots" content="index, follow">/);
    expect(html).not.toMatch(/undefined|NaN|\[object/);
  });

  it('keeps an append-only ledger with one dated entry per change', () => {
    const ledger = JSON.parse(read('data/seo-changelog.json'));
    expect(Array.isArray(ledger.entries)).toBe(true);
    expect(ledger.entries.length).toBeGreaterThan(0);
    for (const e of ledger.entries) {
      expect(e.id).toBeTruthy();
      expect(FIELDS).toContain(e.field);
      expect(e.to).toBeTruthy();
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('dates every change with a real before → after, so a movement can be traced', () => {
    const ledger = JSON.parse(read('data/seo-changelog.json'));
    for (const e of ledger.entries) {
      expect(typeof e.from).toBe('string');
      expect(e.from).not.toBe(e.to);
    }
  });

  it('stores the baseline the next run diffs against, so a later edit is measurable', () => {
    const ledger = JSON.parse(read('data/seo-changelog.json'));
    expect(ledger.baseline).toBeTruthy();
    expect(Object.keys(ledger.baseline).length).toBeGreaterThan(0);
    for (const fields of Object.values(ledger.baseline)) {
      expect(Object.keys(fields).length).toBeGreaterThan(0);
    }
  });

  it('links the changelog from the home page and from the stats page', () => {
    expect(read('index.html')).toContain('href="/changelog"');
    expect(read('stats.html')).toContain('href="/changelog"');
  });
});
