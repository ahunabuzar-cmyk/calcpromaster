import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const CM = require('../../js/category-methodology.js');

describe('category-methodology', () => {
  it('exposes the shared API', () => {
    expect(typeof CM.methodologyFor).toBe('function');
    expect(typeof CM.reviewerFor).toBe('function');
    expect(typeof CM.bylineHtml).toBe('function');
    expect(typeof CM.methodologyHtml).toBe('function');
  });

  it('returns non-empty methodology text for every known category', () => {
    const cats = [
      'finance', 'health', 'math', 'everyday', 'science', 'engineering',
      'construction', 'conversion', 'business', 'education', 'utilities',
      'lifestyle', 'regional', 'food', 'fitness', 'auto', 'career',
      'homegarden', 'tech', 'family'
    ];
    for (const c of cats) {
      const t = CM.methodologyFor(c);
      expect(typeof t).toBe('string');
      expect(t.length).toBeGreaterThan(40);
    }
  });

  it('falls back to a default methodology for an unknown category', () => {
    expect(CM.methodologyFor('does-not-exist')).toBe(CM.METHODOLOGY._default);
    expect(CM.methodologyFor('does-not-exist').length).toBeGreaterThan(40);
  });

  it('never invents a reviewer — empty byline unless a real name is set', () => {
    // REVIEWERS ships empty by design. An unset category renders no byline at all.
    expect(CM.reviewerFor('finance')).toBeNull();
    expect(CM.bylineHtml('finance')).toBe('');
    expect(CM.bylineHtml('math')).toBe('');
    expect(CM.bylineHtml('anything')).toBe('');
  });

  it('renders a byline only when a real reviewer object is provided', () => {
    const original = CM.REVIEWERS._default;
    try {
      CM.REVIEWERS._default = { name: 'Jane Doe', credentials: 'CFP', url: '/about' };
      const html = CM.bylineHtml('finance');
      expect(html).toContain('Reviewed by');
      expect(html).toContain('Jane Doe');
      expect(html).toContain('CFP');
      expect(html).toContain('href="/about"');
    } finally {
      CM.REVIEWERS._default = original;
    }
  });

  it('methodologyHtml always wraps the text in the shared class', () => {
    const html = CM.methodologyHtml('math');
    expect(html).toContain('class="tool-methodology"');
    expect(html).toContain('Methodology:');
    expect(html).toContain(CM.methodologyFor('math'));
  });
});
