import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const CD = require('../../js/category-depth.js');

// Must stay in step with CATEGORY_META in scripts/ssg-pages.cjs (20 hubs).
const CATS = [
  'finance', 'health', 'math', 'everyday', 'science', 'engineering',
  'construction', 'conversion', 'business', 'education', 'utilities',
  'lifestyle', 'regional', 'food', 'fitness', 'auto', 'career',
  'homegarden', 'tech', 'family'
];

describe('category-depth', () => {
  it('exposes the shared API used by the SSG and the client', () => {
    expect(typeof CD.depthFor).toBe('function');
    expect(typeof CD.introHtml).toBe('function');
    expect(typeof CD.faqHtml).toBe('function');
    expect(typeof CD.depthHtml).toBe('function');
    expect(typeof CD.faqSchema).toBe('function');
  });

  it('covers every hub category', () => {
    expect(Object.keys(CD.DEPTH).sort()).toEqual([...CATS].sort());
  });

  it('gives every category a real intro, 4+ uses and 3 FAQs', () => {
    for (const c of CATS) {
      const d = CD.depthFor(c);
      expect(d, c).toBeTruthy();
      expect(d.intro.length, c + ' intro').toBeGreaterThan(120);
      expect(d.uses.length, c + ' uses').toBeGreaterThanOrEqual(4);
      expect(d.faqs.length, c + ' faqs').toBe(3);
      for (const f of d.faqs) {
        expect(f.q.length, c + ' question').toBeGreaterThan(15);
        expect(f.a.length, c + ' answer').toBeGreaterThan(120);
      }
    }
  });

  it('does not repeat the same copy across categories (no templated boilerplate)', () => {
    const intros = CATS.map((c) => CD.depthFor(c).intro);
    const questions = CATS.flatMap((c) => CD.depthFor(c).faqs.map((f) => f.q));
    expect(new Set(intros).size).toBe(intros.length);
    expect(new Set(questions).size).toBe(questions.length);
  });

  it('returns nothing for an unknown category instead of throwing', () => {
    expect(CD.depthFor('nope')).toBeNull();
    expect(CD.introHtml('nope')).toBe('');
    expect(CD.faqHtml('nope')).toBe('');
    expect(CD.depthHtml('nope')).toBe('');
    expect(CD.faqSchema('nope')).toBeNull();
  });

  it('introHtml output does not depend on the caller (prerender === hydrate)', () => {
    // The SSG and the client disagree on 6 display names, so the block must be
    // byte-identical whatever the caller passes.
    expect(CD.introHtml('math')).toBe(CD.introHtml('math', { category: 'Math' }));
    expect(CD.introHtml('health')).toBe(CD.introHtml('health', { category: 'Health & Fitness' }));
    const html = CD.introHtml('math');
    expect(html).toContain('class="explain-card seo-guide hub-depth"');
    expect(html).toContain('What you can work out');
    expect(html).toContain('<li>');
  });

  it('escapes content so stored text can never inject markup', () => {
    const original = CD.DEPTH.math.intro;
    try {
      CD.DEPTH.math.intro = 'Use <script>alert(1)</script> & "quotes"';
      const html = CD.introHtml('math');
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&amp;');
      expect(html).toContain('&quot;');
    } finally {
      CD.DEPTH.math.intro = original;
    }
  });

  it('faqHtml renders every question and answer into the shared FAQ markup', () => {
    const html = CD.faqHtml('finance');
    expect(html).toContain('<div class="seo-faqs">');
    for (const f of CD.depthFor('finance').faqs) {
      expect(html).toContain(f.q);
      expect(html).toContain(f.a);
    }
  });

  it('faqSchema mirrors exactly the questions the page renders', () => {
    const s = CD.faqSchema('health');
    expect(s['@type']).toBe('FAQPage');
    expect(s.mainEntity).toHaveLength(CD.depthFor('health').faqs.length);
    expect(s.mainEntity.map((q) => q.name)).toEqual(CD.depthFor('health').faqs.map((f) => f.q));
    expect(s.mainEntity[0].acceptedAnswer['@type']).toBe('Answer');
  });

  it('depthHtml is the intro and FAQ blocks in reading order', () => {
    expect(CD.depthHtml('tech', { category: 'Tech' })).toBe(
      CD.introHtml('tech', { category: 'Tech' }) + CD.faqHtml('tech')
    );
  });
});
