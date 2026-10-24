import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { evaluate, resolveSource, REPORTS } = require('../../scripts/audit-report-staleness.cjs');

// A fake filesystem: name → mtime in seconds. Anything absent does not exist.
const fakeStat = (mtimes) => (rel) => (
  Object.prototype.hasOwnProperty.call(mtimes, rel)
    ? { file: rel, exists: true, mtime: mtimes[rel] * 1000 }
    : { file: rel, exists: false, mtime: null }
);

describe('staleness gate / evaluate', () => {
  it('passes when the artifact is newer than its data', () => {
    const r = evaluate({ report: 'stats.html', sources: ['data/index-burndown.json'] }, 2000, fakeStat({
      'stats.html': 200,
      'data/index-burndown.json': 100,
    }));
    expect(r.status).toBe('fresh');
    expect(r.newestSource).toBe('data/index-burndown.json');
  });

  it('FAILS when the data is newer than the published artifact', () => {
    const r = evaluate({ report: 'stats.html', sources: ['data/index-burndown.json'] }, 2000, fakeStat({
      'stats.html': 100,
      'data/index-burndown.json': 200,
    }));
    expect(r.status).toBe('stale');
    expect(r.newestSource).toBe('data/index-burndown.json');
  });

  it('picks the newest of several sources, not the first', () => {
    const r = evaluate({ report: 'docs/GROWTH-MODEL.md', sources: ['a.json', 'b.json'] }, 0, fakeStat({
      'docs/GROWTH-MODEL.md': 150,
      'a.json': 100,
      'b.json': 900,
    }));
    expect(r.status).toBe('stale');
    expect(r.newestSource).toBe('b.json');
  });

  it('gives a second of tolerance so same-second writes do not flap', () => {
    const r = evaluate({ report: 'x.json', sources: ['y.json'] }, 2000, fakeStat({
      'x.json': 100,
      'y.json': 101,
    }));
    expect(r.status).toBe('fresh');
  });

  it('reports a not-yet-built artifact as missing rather than fresh', () => {
    const r = evaluate({ report: 'stats.html', sources: ['a.json'] }, 0, fakeStat({ 'a.json': 100 }));
    expect(r.status).toBe('missing');
  });

  it('records sources that do not exist yet without calling the artifact stale', () => {
    const r = evaluate({ report: 'x.json', sources: ['gone.json', 'y.json'] }, 0, fakeStat({
      'x.json': 200,
      'y.json': 100,
    }));
    expect(r.status).toBe('fresh');
    expect(r.missingSources).toEqual(['gone.json']);
  });

  it('says "no sources" when nothing it depends on can be found', () => {
    const r = evaluate({ report: 'x.json', sources: ['gone.json'] }, 0, fakeStat({ 'x.json': 200 }));
    expect(r.status).toBe('no-sources');
  });
});

describe('staleness gate / glob sources', () => {
  const mtimes = {
    'data/gsc-coverage-export-2026-10-04/Chart.csv': 100,
    'data/gsc-coverage-export-2026-10-09/Chart.csv': 300,
  };

  it('follows a dated export folder glob', () => {
    const r = resolveSource('data/gsc-coverage-export-*/Chart.csv', fakeStat(mtimes));
    expect(r.file).toBe('data/gsc-coverage-export-2026-10-09/Chart.csv');
    expect(r.mtime).toBe(300000);
  });

  it('returns a not-found marker when no folder matches, instead of throwing', () => {
    const r = resolveSource('data/nope-*/Chart.csv', fakeStat(mtimes));
    expect(r.exists).toBe(false);
  });
});

describe('staleness gate / the tracked artifact list', () => {
  it('every entry names a report and at least one source', () => {
    expect(REPORTS.length).toBeGreaterThan(10);
    for (const e of REPORTS) {
      expect(typeof e.report).toBe('string');
      expect(e.sources.length).toBeGreaterThan(0);
    }
  });

  it('tracks the artifacts this project publishes', () => {
    const names = REPORTS.map((e) => e.report);
    for (const expected of ['stats.html', 'changelog.html', 'docs/GROWTH-MODEL.md', 'docs/INDEX-PANEL.md', 'docs/INDEX-BURNDOWN.md', 'docs/LINK-EQUITY-PLAN.md']) {
      expect(names).toContain(expected);
    }
  });
});
