import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const { applyTo, stripBlock, wordsOf, START, END, blockHtml } = require('../../scripts/apply-guide-extra-depth.cjs');
const { PACK } = require('../../js/guide-extra-depth.js');

// The authored depth pass is the editorial half of "62 guides depth": it must
// land in the right place, survive the category-depth regeneration, and never
// stack a second copy of itself.

const SECTION = [['A test heading', ['First paragraph of the test section.', 'Second paragraph of the test section.']]];

describe('apply-guide-extra-depth', () => {
  it('wraps sections in markers', () => {
    const html = blockHtml(SECTION);
    expect(html.startsWith(START)).toBe(true);
    expect(html.trim().endsWith(END)).toBe(true);
    expect(html).toContain('<h2>A test heading</h2>');
    expect(html).toContain('<p>First paragraph of the test section.</p>');
  });

  it('strips a previous block byte-for-byte', () => {
    const base = '<main>\n<h1>t</h1>\n</main>\n';
    const once = base.slice(0, 7) + blockHtml(SECTION) + base.slice(7);
    expect(stripBlock(once)).toBe(base);
  });

  it('inserts above the FAQ heading on a topic guide', () => {
    const html = '<main>\n<h1>t</h1>\n<h2>Frequently asked questions</h2>\n<h3>q</h3>\n<p>a</p>\n</main>\n';
    PACK.__test_slug = { sections: SECTION };
    const out = applyTo(html, '__test_slug');
    delete PACK.__test_slug;
    expect(out.indexOf(START)).toBeLessThan(out.indexOf('Frequently asked questions'));
  });

  it('inserts above the category depth block so apply-guide-depth cannot erase it', () => {
    const html = '<main>\n<h1>t</h1>\n<!-- guide-depth:start -->\n<h2>Frequently asked questions</h2>\n<!-- guide-depth:end -->\n</main>\n';
    PACK.__test_slug2 = { sections: SECTION };
    const out = applyTo(html, '__test_slug2');
    delete PACK.__test_slug2;
    expect(out.indexOf(START)).toBeLessThan(out.indexOf('<!-- guide-depth:start -->'));
  });

  it('is idempotent: applying twice adds no second copy', () => {
    PACK.__test_slug3 = { sections: SECTION };
    const html = '<main>\n<h1>t</h1>\n<h2>FAQ</h2>\n</main>\n';
    const once = applyTo(html, '__test_slug3');
    const twice = applyTo(once, '__test_slug3');
    delete PACK.__test_slug3;
    expect(twice).toBe(once);
    expect(twice.split(START).length - 1).toBe(1);
  });

  it('leaves unknown slugs untouched', () => {
    const html = '<main>\n<h1>t</h1>\n</main>\n';
    expect(applyTo(html, 'not-a-guide')).toBe(html);
  });

  it('every shipped guide in the pack meets the 900-word floor', () => {
    const guides = path.join(__dirname, '..', '..', 'guides');
    const short = [];
    for (const slug of Object.keys(PACK)) {
      const file = path.join(guides, slug + '.html');
      expect(fs.existsSync(file), 'missing guide for pack entry: ' + slug).toBe(true);
      const w = wordsOf(fs.readFileSync(file, 'utf8'));
      if (w < 900) short.push(slug + ':' + w);
    }
    expect(short).toEqual([]);
  });

  it('no pack entry is empty or one-liner filler', () => {
    for (const [slug, data] of Object.entries(PACK)) {
      expect(Array.isArray(data.sections), slug).toBe(true);
      expect(data.sections.length, slug).toBeGreaterThanOrEqual(2);
      for (const [heading, paras] of data.sections) {
        expect(typeof heading, slug).toBe('string');
        expect(heading.length, slug).toBeGreaterThan(8);
        expect(Array.isArray(paras), slug).toBe(true);
        expect(paras.length, slug).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
