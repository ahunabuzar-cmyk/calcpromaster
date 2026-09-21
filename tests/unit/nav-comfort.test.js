import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

function loadNav(storage) {
  const src = readFileSync(join(ROOT, 'js', 'nav-comfort.js'), 'utf8');
  const sandbox = {
    module: { exports: {} },
    localStorage: {
      getItem: (k) => (k in storage ? storage[k] : null),
      setItem: (k, v) => { storage[k] = String(v); },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.module.exports;
}

describe('nav-comfort.js (S9+S10)', () => {
  let N;
  beforeEach(() => { N = loadNav({}); });

  it('categoryColor returns stable hsl triple per key', () => {
    const a = N.categoryColor('finance');
    const b = N.categoryColor('finance');
    expect(a).toEqual(b);
    expect(a.hue).toBeGreaterThanOrEqual(0);
    expect(a.hue).toBeLessThan(360);
    expect(a.bg).toContain('hsl(');
  });

  it('different categories can get different hues', () => {
    const hues = new Set(['finance', 'health', 'math', 'construction'].map((c) => N.categoryColor(c).hue));
    expect(hues.size).toBeGreaterThan(1);
  });

  describe('#62 recently viewed', () => {
    it('pushes newest first and dedupes by id', () => {
      let list = [];
      list = N.pushRecent(list, { id: 'a', name: 'A' }, 1000);
      list = N.pushRecent(list, { id: 'b', name: 'B' }, 2000);
      list = N.pushRecent(list, { id: 'a', name: 'A' }, 3000);
      expect(list.map((e) => e.id)).toEqual(['a', 'b']);
      expect(list[0].ts).toBe(3000);
    });
    it('caps at RECENT_MAX entries', () => {
      let list = [];
      for (let i = 0; i < 12; i++) list = N.pushRecent(list, { id: 't' + i }, i * 100);
      expect(list).toHaveLength(N.RECENT_MAX);
      expect(list[0].id).toBe('t11');
    });
    it('dedupeRecent collapses rapid re-visits inside the window', () => {
      const list = [
        { id: 'a', ts: 5000 }, { id: 'a', ts: 5500 }, { id: 'b', ts: 5600 },
      ];
      const out = N.dedupeRecent(list, 1000, 5600);
      // 'a' at 5500 replaces the 5000 visit; 'b' at 5600 is newer but list
      // order follows first-seen slot, so 'a' keeps its slot ahead of 'b'
      expect(out.map((e) => e.id)).toEqual(['a', 'b']);
    });
  });

  it('#63 scrollTopVisible uses threshold', () => {
    expect(N.scrollTopVisible(100, 800)).toBe(false);
    expect(N.scrollTopVisible(3000, 800)).toBe(true);
  });

  it('#64 headerShrinkState hides on scroll-down, shows on scroll-up', () => {
    expect(N.headerShrinkState(500, 400)).toEqual({ shrink: true, hide: true, show: false });
    expect(N.headerShrinkState(400, 500)).toEqual({ shrink: true, hide: false, show: true });
    expect(N.headerShrinkState(50, 40)).toEqual({ shrink: false, hide: false, show: true });
  });

  it('#61 buildCategoryOptions excludes current and sorts by name', () => {
    const cats = { health: { name: 'Health' }, finance: { name: 'Finance' }, auto: { name: 'Auto & Transport' } };
    const opts = N.buildCategoryOptions(cats, 'finance');
    expect(opts.map((o) => o.key)).toEqual(['auto', 'health']);
  });

  it('#66 orderRelated excludes self and caps results', () => {
    const rel = [{ id: 'self' }, { id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }, { id: 'f' }, { id: 'g' }];
    const out = N.orderRelated(rel, 'self', 6);
    expect(out).toHaveLength(6);
    expect(out.map((r) => r.id)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('#74 normalizeViewMode only allows grid|list', () => {
    expect(N.normalizeViewMode('list')).toBe('list');
    expect(N.normalizeViewMode('grid')).toBe('grid');
    expect(N.normalizeViewMode('banana')).toBe('grid');
  });

  it('#75 zoomClass maps 150/200 breakpoints', () => {
    expect(N.zoomClass(100)).toBe('');
    expect(N.zoomClass(150)).toBe('zoom-150');
    expect(N.zoomClass(220)).toBe('zoom-200');
  });

  it('#76 emptyState gives honest copy + action', () => {
    const e = N.emptyState('favorites', 1206);
    expect(e.title).toMatch(/No favorites yet/);
    expect(e.action.label).toContain('1206');
    expect(N.emptyState('nope')).toBeNull();
  });

  it('#71 shouldPulse throttles repeated pulses', () => {
    expect(N.shouldPulse(0, 1000)).toBe(true);
    expect(N.shouldPulse(1000, 1500)).toBe(false); // inside 1500ms gap
    expect(N.shouldPulse(1000, 2600)).toBe(true);
  });

  it('#73 markCurrentPath flags the matching href', () => {
    const out = N.markCurrentPath('/finance', [
      { href: '/', text: 'Home' },
      { href: '/finance', text: 'Finance' },
    ]);
    expect(out[1].current).toBe(true);
    expect(out[0].current).toBe(false);
  });
});
