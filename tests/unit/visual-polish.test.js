import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const src = readFileSync(join(ROOT, 'js', 'visual-polish.js'), 'utf8');
const sandbox = { module: { exports: {} }, window: undefined, document: undefined, localStorage: undefined, setTimeout: () => 0, matchMedia: undefined };
vm.createContext(sandbox);
vm.runInContext(src + '\nthis.module.exports = module.exports;', sandbox);
const VP = sandbox.module.exports;

describe('VisualPolish — accent palettes', () => {
  it('exposes 6 palettes with base/dark/light colors', () => {
    expect(VP.ACCENT_PALETTES.length).toBe(6);
    for (const p of VP.ACCENT_PALETTES) {
      expect(p.base).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.dark).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.light).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('paletteById falls back to default for unknown ids', () => {
    expect(VP.paletteById('nope').id).toBe('indigo');
    expect(VP.paletteById('emerald').base).toBe('#059669');
  });

  it('applyAccent without DOM returns the palette (no crash in Node)', () => {
    const p = VP.applyAccent('rose');
    expect(p.id).toBe('rose');
  });

  it('applyAccent sets CSS vars on a fake document', () => {
    const style = {};
    const doc = { documentElement: { style: { setProperty: (k, v) => { style[k] = v; } } } };
    VP.applyAccent('blue', doc);
    expect(style['--primary']).toBe('#2563eb');
    expect(style['--primary-dark']).toBe('#1d4ed8');
    expect(style['--primary-gradient']).toContain('#2563eb');
  });
});

describe('VisualPolish — tour', () => {
  it('has 3 steps each with title, body, selector and key', () => {
    expect(VP.TOUR_STEPS.length).toBe(3);
    for (const s of VP.TOUR_STEPS) {
      expect(s.title).toBeTruthy();
      expect(s.body).toBeTruthy();
      expect(s.sel).toBeTruthy();
    }
  });

  it('tourStepsFor filters to steps present on the page', () => {
    const all = VP.TOUR_STEPS.map(s => s.sel.split(', ')[0]);
    const some = VP.tourStepsFor([all[0], all[1]]);
    expect(some.length).toBe(2);
    expect(VP.tourStepsFor([]).length).toBe(0);
  });

  it('tourSeen defaults true when localStorage is unavailable', () => {
    expect(VP.tourSeen()).toBe(true);
  });
});

describe('VisualPolish — gauge', () => {
  it('renders an SVG with dasharray/offset matching pct', () => {
    const svg = VP.gauge(25, { size: 120, stroke: 10 });
    expect(svg).toContain('<svg');
    const r = (120 - 10) / 2;
    const c = 2 * Math.PI * r;
    expect(svg).toContain((c * 0.75).toFixed(2)); // offset = c*(1-0.25)
  });

  it('clamps pct into 0..100 and escapes labels', () => {
    expect(VP.gauge(150)).toContain('100%');
    expect(VP.gauge(-5)).toContain('0%');
    expect(VP.gauge(50, { label: '<b>' })).not.toContain('<b>');
    expect(VP.gauge(50, { label: '<b>' })).toContain('&lt;b&gt;');
  });

  it('includes sub-label and aria when provided', () => {
    const svg = VP.gauge(60, { sub: 'of goal', aria: '60 percent of goal' });
    expect(svg).toContain('of goal');
    expect(svg).toContain('aria-label="60 percent of goal"');
  });
});

describe('VisualPolish — what-if chart', () => {
  it('lineChart builds a polyline for numeric series', () => {
    const svg = VP.lineChart([100, 80, 60, 40, 20, 0]);
    expect(svg).toContain('<polyline');
    expect(svg).toContain('viewBox');
  });

  it('returns empty string for tiny/invalid series', () => {
    expect(VP.lineChart([])).toBe('');
    expect(VP.lineChart([5])).toBe('');
    expect(VP.lineChart([NaN, undefined, 'x'])).toBe('');
    // NaN entries are cleaned; remaining valid points still chart
    expect(VP.lineChart([1, NaN, 3])).toContain('<polyline');
  });

  it('balanceSeries amortizes to zero at term end', () => {
    const s = VP.balanceSeries(100000, 9, 1);
    expect(s.length).toBe(13); // 12 months + initial
    expect(s[0]).toBe(100000);
    expect(s[s.length - 1]).toBeLessThan(1);
  });

  it('balanceSeries handles zero-rate and invalid input', () => {
    const s = VP.balanceSeries(1200, 0, 1);
    expect(s[s.length - 1]).toBe(0);
    expect(VP.balanceSeries(-5, 9, 2)).toEqual([]);
    expect(VP.balanceSeries('x', 'y', 'z')).toEqual([]);
  });
});
