import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const GD = require('../../js/guide-depth.js');
const CD = require('../../js/category-depth.js');

// The thin category guide pages that js/guide-depth.js covers. Each name is a
// file under guides/<name>.html.
const GUIDES = [
  'business', 'family', 'everyday', 'auto', 'science', 'utilities', 'food',
  'tax-salary', 'homegarden', 'lifestyle', 'career', 'math-statistics',
  'regional', 'engineering', 'health-fitness', 'construction', 'loans-mortgages'
];

describe('guide-depth', () => {
  it('exposes the shared API', () => {
    expect(typeof GD.guideFor).toBe('function');
    expect(typeof GD.ledeHtml).toBe('function');
    expect(typeof GD.pitfallsHtml).toBe('function');
    expect(typeof GD.faqHtml).toBe('function');
    expect(typeof GD.depthHtml).toBe('function');
    expect(typeof GD.faqSchema).toBe('function');
  });

  it('covers exactly the thin category guides', () => {
    expect(Object.keys(GD.GUIDES).sort()).toEqual([...GUIDES].sort());
  });

  it('gives every guide a lede, 4 pitfalls and 3 FAQs', () => {
    for (const g of GUIDES) {
      const d = GD.guideFor(g);
      expect(d, g).toBeTruthy();
      expect(d.lede.length, g + ' lede').toBeGreaterThan(120);
      expect(d.pitfalls.length, g + ' pitfalls').toBeGreaterThanOrEqual(4);
      expect(d.faqs.length, g + ' faqs').toBe(3);
      for (const f of d.faqs) {
        expect(f.q.length, g + ' question').toBeGreaterThan(15);
        expect(f.a.length, g + ' answer').toBeGreaterThan(120);
      }
    }
  });

  it('never repeats copy across guides', () => {
    const ledes = GUIDES.map((g) => GD.guideFor(g).lede);
    const questions = GUIDES.flatMap((g) => GD.guideFor(g).faqs.map((f) => f.q));
    const pitfalls = GUIDES.flatMap((g) => GD.guideFor(g).pitfalls);
    expect(new Set(ledes).size).toBe(ledes.length);
    expect(new Set(questions).size).toBe(questions.length);
    expect(new Set(pitfalls).size).toBe(pitfalls.length);
  });

  it('does not duplicate the hub copy in js/category-depth.js', () => {
    // Overlap here would mean near-duplicate content across /guides/<cat> and
    // /hub/<cat> — the exact problem this module exists to avoid.
    const hubFaqs = new Set(
      Object.keys(CD.DEPTH).flatMap((c) => CD.DEPTH[c].faqs.map((f) => f.q))
    );
    const guideFaqs = GUIDES.flatMap((g) => GD.guideFor(g).faqs.map((f) => f.q));
    for (const q of guideFaqs) expect(hubFaqs.has(q), 'duplicated question: ' + q).toBe(false);
  });

  it('returns nothing for an unknown guide instead of throwing', () => {
    expect(GD.guideFor('nope')).toBeNull();
    expect(GD.ledeHtml('nope')).toBe('');
    expect(GD.pitfallsHtml('nope')).toBe('');
    expect(GD.faqHtml('nope')).toBe('');
    expect(GD.depthHtml('nope')).toBe('');
    expect(GD.faqSchema('nope')).toBeNull();
  });

  it('renders the lede, pitfalls list and FAQ markup', () => {
    expect(GD.ledeHtml('business')).toContain('class="guide-lede"');
    const p = GD.pitfallsHtml('business');
    expect(p).toContain('<h2>Where these answers go wrong</h2>');
    expect(p).toContain('<ul class="guide-pitfalls">');
    expect((p.match(/<li>/g) || []).length).toBe(GD.guideFor('business').pitfalls.length);
    const f = GD.faqHtml('finance-does-not-exist');
    expect(f).toBe('');
    expect(GD.faqHtml('business')).toContain('<div class="seo-faqs">');
  });

  it('depthHtml is the pitfalls and FAQ blocks in reading order', () => {
    expect(GD.depthHtml('auto')).toBe(GD.pitfallsHtml('auto') + GD.faqHtml('auto'));
  });

  it('faqSchema mirrors exactly the questions the page renders', () => {
    const s = GD.faqSchema('construction');
    expect(s['@type']).toBe('FAQPage');
    expect(s.mainEntity).toHaveLength(GD.guideFor('construction').faqs.length);
    expect(s.mainEntity.map((q) => q.name)).toEqual(
      GD.guideFor('construction').faqs.map((f) => f.q)
    );
    expect(s.mainEntity[0].acceptedAnswer['@type']).toBe('Answer');
  });

  it('escapes content so stored text can never inject markup', () => {
    const original = GD.GUIDES.auto.pitfalls[0];
    try {
      GD.GUIDES.auto.pitfalls[0] = 'Use <script>alert(1)</script> & "quotes"';
      const html = GD.pitfallsHtml('auto');
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&amp;');
      expect(html).toContain('&quot;');
    } finally {
      GD.GUIDES.auto.pitfalls[0] = original;
    }
  });
});
