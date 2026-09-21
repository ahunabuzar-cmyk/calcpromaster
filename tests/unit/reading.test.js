import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

function loadReading(storage) {
  const src = readFileSync(join(ROOT, 'js', 'reading.js'), 'utf8');
  const sandbox = {
    module: { exports: {} },
    localStorage: {
      getItem: (k) => (k in storage ? storage[k] : null),
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: (k) => { delete storage[k]; },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.module.exports;
}

describe('reading.js (S8)', () => {
  let storage;
  let Reading;
  beforeEach(() => {
    storage = {};
    Reading = loadReading(storage);
  });

  it('loads with default prefs when storage is empty', () => {
    const p = Reading.loadPrefs();
    expect(p).toEqual({
      lineHeight: 1.5,
      letterSpacing: 'normal',
      dyslexic: false,
      numberFormat: 'western',
      contentWidth: 'normal',
    });
  });

  it('saves and reloads prefs round-trip', () => {
    Reading.savePrefs({ lineHeight: 1.9, letterSpacing: 'wide', dyslexic: true, numberFormat: 'indian', contentWidth: 'narrow' });
    expect(Reading.loadPrefs()).toEqual({
      lineHeight: 1.9, letterSpacing: 'wide', dyslexic: true, numberFormat: 'indian', contentWidth: 'narrow',
    });
  });

  it('survives corrupt JSON in prefs', () => {
    storage[Reading.KEYS.prefs] = '{not json';
    expect(Reading.loadPrefs().lineHeight).toBe(1.5);
  });

  it('steps line-height within bounds in both directions', () => {
    expect(Reading.nextLineHeight(1.5, 1)).toBe(1.6);
    expect(Reading.nextLineHeight(2.2, 1)).toBe(2.2); // clamp max
    expect(Reading.nextLineHeight(1.4, -1)).toBe(1.4); // clamp min
  });

  it('steps letter-spacing through normal/wide/wider with clamps', () => {
    expect(Reading.nextLetterSpacing('normal', 1)).toBe('wide');
    expect(Reading.nextLetterSpacing('wider', 1)).toBe('wider');
    expect(Reading.nextLetterSpacing('normal', -1)).toBe('normal');
  });

  describe('formatNumber (#59)', () => {
    it('formats western 1234567 -> 1,234,567', () => {
      expect(Reading.formatNumber(1234567, 'western')).toBe('1,234,567');
    });
    it('formats indian 1234567 -> 12,34,567', () => {
      expect(Reading.formatNumber(1234567, 'indian')).toBe('12,34,567');
    });
    it('plain has no separators', () => {
      expect(Reading.formatNumber(1234567.5, 'plain')).toBe('1234567.5');
    });
    it('handles negatives and decimals', () => {
      expect(Reading.formatNumber(-9876543.21, 'western')).toBe('-9,876,543.21');
      expect(Reading.formatNumber(-123456, 'indian')).toBe('-1,23,456');
    });
    it('passes through non-finite values', () => {
      expect(Reading.formatNumber(NaN, 'western')).toBe('NaN');
    });
  });

  describe('TOC (#52)', () => {
    it('extracts h2/h3 in order with levels', () => {
      const heads = Reading.extractHeadings('<h2>Formula</h2><p>x</p><h3>Nested</h3><h2>FAQ</h2>');
      expect(heads).toEqual([
        { level: 'h2', text: 'Formula' },
        { level: 'h3', text: 'Nested' },
        { level: 'h2', text: 'FAQ' },
      ]);
    });
    it('strips inner tags from heading text', () => {
      expect(Reading.extractHeadings('<h2>The <em>Math</em></h2>')[0].text).toBe('The Math');
    });
    it('slugifies heading text into stable ids', () => {
      expect(Reading.slugify('Formula, Explained!')).toMatch(/^sec-formula-explained$/);
    });
    it('activeSection picks the last heading above the scroll line', () => {
      const offsets = [
        { id: 'a', top: 0 }, { id: 'b', top: 500 }, { id: 'c', top: 1500 },
      ];
      expect(Reading.activeSection(offsets, 0, 800)).toBe('a');
      expect(Reading.activeSection(offsets, 600, 800)).toBe('b');
      expect(Reading.activeSection(offsets, 5000, 800)).toBe('c');
    });
  });

  it('progressPercent clamps 0-100', () => {
    expect(Reading.progressPercent(0, 2000, 500)).toBe(0);
    expect(Reading.progressPercent(750, 2000, 500)).toBe(50);
    expect(Reading.progressPercent(9999, 2000, 500)).toBe(100);
    expect(Reading.progressPercent(100, 400, 500)).toBe(0); // no scrollable area
  });

  describe('SEO-safe transforms (#56/#57)', () => {
    const html = '<h2>Formula</h2><p>E = mc²</p><h2>FAQ</h2><p>Q&amp;A</p>';

    it('makeCollapsible wraps sections in <details open> so crawlers see content', () => {
      const out = Reading.makeCollapsible(html);
      expect(out).toContain('<details class="collapsible" open>');
      expect(out).toContain('<summary>Formula</summary>');
      expect(out).toContain('E = mc²');
      expect(out).toContain('Q&amp;A');
    });

    it('makeCollapsible honors skip list (FAQ stays a plain heading)', () => {
      const out = Reading.makeCollapsible(html, { skip: /FAQ/ });
      expect(out).toContain('<h2>FAQ</h2>');
      expect(out).toContain('<summary>Formula</summary>');
    });

    it('makeCollapsible returns original html when no h2 present', () => {
      expect(Reading.makeCollapsible('<p>plain</p>')).toBe('<p>plain</p>');
    });

    it('makeTabs builds accessible tablist with hidden non-active panels', () => {
      const out = Reading.makeTabs([
        { title: 'Calculator', html: '<p>inputs</p>' },
        { title: 'Formula', html: '<p>E = mc²</p>' },
      ]);
      expect(out).toContain('role="tablist"');
      expect(out).toContain('aria-selected="true"');
      expect(out).toContain('role="tabpanel"');
      expect(out).toContain('hidden');
      expect(out).toContain('E = mc²'); // all content present in DOM
    });

    it('nextTabIndex wraps forward and backward', () => {
      expect(Reading.nextTabIndex(3, 0, 1)).toBe(1);
      expect(Reading.nextTabIndex(3, 2, 1)).toBe(0);
      expect(Reading.nextTabIndex(3, 0, -1)).toBe(2);
    });
  });
});
