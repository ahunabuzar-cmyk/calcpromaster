import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import os from 'os';

const require = createRequire(import.meta.url);
const { n, patchHomepage, healthCheckText } = require('../../scripts/build-stats-page.cjs');

const read = (rel) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

describe('stats page / number formatting', () => {
  it('groups thousands and keeps one decimal only when asked', () => {
    expect(n(1241)).toBe('1,241');
    expect(n(37767)).toBe('37,767');
    expect(n(2.34, 1)).toBe('2.3');
  });

  it('prints an em dash instead of NaN or undefined', () => {
    expect(n(NaN)).toBe('—');
    expect(n(undefined)).toBe('—');
    expect(n(null)).toBe('—');
  });
});

describe('stats page / the committed stats.html', () => {
  const html = read('stats.html');
  const growth = JSON.parse(read('data/growth-model.json'));
  const coverage = JSON.parse(read('data/gsc-coverage-fresh.json'));

  it('has a title the build gate accepts (30-70 chars decoded)', () => {
    const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
    const decoded = title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    expect(decoded.length).toBeGreaterThanOrEqual(30);
    expect(decoded.length).toBeLessThanOrEqual(70);
  });

  it('carries canonical, description and an indexable robots directive', () => {
    expect(html).toMatch(/<link rel="canonical" href="https:\/\/calcpromaster\.com\/stats">/);
    expect(html).toMatch(/<meta name="description" content="[^"]{70,200}">/);
    expect(html).toMatch(/<meta name="robots" content="index, follow">/);
  });

  it('shows the measured run-rate, not a rounded guess', () => {
    expect(html).toContain(n(growth.runRate7.perDay));
    expect(html).toContain(n(growth.runRate7.perMonth));
    expect(html).toContain(growth.runRate7.from);
    expect(html).toContain(growth.runRate7.to);
  });

  it('labels the 28-day average as lagging rather than hiding it', () => {
    expect(html).toMatch(/lagging/i);
  });

  it('shows the real indexing state from the coverage snapshot', () => {
    expect(html).toContain(n(coverage.latest.indexed));
    expect(html).toContain(coverage.latest.date);
  });

  it('states what it does not claim', () => {
    expect(html).toMatch(/does not claim/i);
    expect(html).toMatch(/not a forecast|rather than a forecast/i);
  });

  it('contains no generator artifacts', () => {
    expect(html).not.toMatch(/undefined|NaN|\[object/);
    expect(html).not.toMatch(/the undefined/);
  });
});

describe('stats page / the home-page figure', () => {
  const home = read('index.html');
  const growth = JSON.parse(read('data/growth-model.json'));

  const block = () => {
    const m = home.match(/<!-- STATS:BEGIN[^>]*-->([\s\S]*?)<!-- STATS:END -->/);
    return m ? m[1] : null;
  };

  it('marks the generated region so the generator never guesses where to write', () => {
    expect(block()).not.toBeNull();
  });

  it('states the same run-rate figure as the data file, and links to /stats', () => {
    const b = block();
    expect(b).toContain(n(growth.runRate7.perDay));
    expect(b).toContain(growth.runRate7.to);
    expect(b).toContain('href="/stats"');
  });

  it('does not claim a click or traffic number it cannot measure', () => {
    expect(block()).not.toMatch(/clicks|visitors|traffic/i);
  });
});

describe('stats page / weekly health check wording', () => {
  const stale = {
    status: 'stale-source',
    flatWeeks: 1,
    sourceLatestDate: '2026-10-18',
    sourceRawLatestDate: '2026-10-21',
    recordedWindowSample: '2026-10-24',
    windowTo: '2026-10-18',
  };

  it('never turns a re-measured window into a flat week', () => {
    const text = healthCheckText(stale);
    expect(text).not.toMatch(/flat week/i);
    expect(text).toMatch(/already measured on 2026-10-24/);
    expect(text).toMatch(/no stall is called/i);
  });

  it('does not claim the export stopped advancing when newer days exist', () => {
    const text = healthCheckText(stale);
    expect(text).not.toMatch(/has not advanced past/i);
    expect(text).toMatch(/runs to 2026-10-21/);
    expect(text).toMatch(/newest reading worth trusting/);
  });

  it('drops the settled-day sentence when the chart has no fresher day', () => {
    const text = healthCheckText({ ...stale, sourceRawLatestDate: '2026-10-18' });
    expect(text).not.toMatch(/still being filled in/i);
    expect(text).toMatch(/already measured on 2026-10-24/);
  });

  it('keeps the flat-week count for a real verdict, and says when it cannot decide', () => {
    expect(healthCheckText({ status: 'stalled', flatWeeks: 2 })).toMatch(/\(2 flat weeks\)/);
    expect(healthCheckText({ status: 'insufficient-history', flatWeeks: 0 }))
      .toMatch(/three weekly readings/i);
  });

  it('returns nothing when there is no health record', () => {
    expect(healthCheckText(null)).toBeNull();
  });
});

describe('stats page / patchHomepage is idempotent', () => {
  const blockText = '<!-- STATS:BEGIN — test -->\n<p>hello</p>\n        <!-- STATS:END -->';
  const tmp = () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stats-patch-'));
    const file = path.join(dir, 'index.html');
    fs.writeFileSync(file, 'before\n        <!-- STATS:BEGIN — old -->\nold\n        <!-- STATS:END -->\nafter\n');
    return file;
  };

  it('replaces the marked block and leaves the rest untouched', () => {
    const file = tmp();
    const r = patchHomepage(file, blockText);
    expect(r).toMatchObject({ patched: true, changed: true });
    const out = fs.readFileSync(file, 'utf8');
    expect(out).toContain('<p>hello</p>');
    expect(out).toContain('before');
    expect(out).toContain('after');
    expect(out).not.toContain('old');
  });

  it('running twice leaves the file byte-identical (build output stays stable)', () => {
    const file = tmp();
    patchHomepage(file, blockText);
    const once = fs.readFileSync(file, 'utf8');
    const second = patchHomepage(file, blockText);
    expect(second).toMatchObject({ patched: true, changed: false });
    expect(fs.readFileSync(file, 'utf8')).toBe(once);
  });

  it('refuses to write (and says why) when the markers are missing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stats-patch-'));
    const file = path.join(dir, 'index.html');
    fs.writeFileSync(file, '<p>no markers here</p>');
    const r = patchHomepage(file, blockText);
    expect(r.patched).toBe(false);
    expect(r.reason).toMatch(/markers/i);
    expect(fs.readFileSync(file, 'utf8')).toBe('<p>no markers here</p>');
  });

  it('skips with a reason when there is no run-rate data', () => {
    const r = patchHomepage(tmp(), null);
    expect(r).toMatchObject({ patched: false });
    expect(r.reason).toMatch(/run-rate/i);
  });
});
