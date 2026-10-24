import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const apply = require('../../scripts/apply-reviewers.cjs');
const CM = require('../../js/category-methodology.js');

describe('reviewer flow (data/reviewers.json -> js/reviewers-data.js)', () => {
  it('normalizes a valid reviewer entry', () => {
    const { out, warnings } = apply.normalize({
      finance: { name: 'Jane Doe', credentials: 'CFP', url: '/about' }
    });
    expect(warnings).toEqual([]);
    expect(out.finance).toEqual({ name: 'Jane Doe', credentials: 'CFP', url: '/about' });
  });

  it('drops entries without a real name (never invents reviewers)', () => {
    const { out, warnings } = apply.normalize({
      finance: {},
      health: { credentials: 'RD' },
      math: null,
      auto: { name: '   ' }
    });
    expect(out).toEqual({});
    expect(warnings.length).toBeGreaterThanOrEqual(3);
  });

  it('ignores documentation/comment keys but keeps _default', () => {
    const { out } = apply.normalize({
      _comment: 'this is docs, not a reviewer',
      _default: { name: 'Jane Doe' }
    });
    expect(out._comment).toBeUndefined();
    expect(out._default).toEqual({ name: 'Jane Doe' });
  });

  it('only accepts site-relative (rooted) reviewer urls', () => {
    const { out } = apply.normalize({
      finance: { name: 'Jane Doe', url: 'https://evil.example' }
    });
    expect(out.finance.url).toBeUndefined();
  });

  it('builds a module that exposes the map to Node and the browser', () => {
    const code = apply.buildModule({ finance: { name: 'Jane Doe' } });
    expect(code).toContain('module.exports');
    expect(code).toContain('window.__CPM_REVIEWERS__');
    expect(code).toContain('Jane Doe');
  });

  it('current repo state ships NO invented reviewer bylines', () => {
    // data/reviewers.json is documentation-only today: every byline stays absent.
    const { out } = apply.normalize(apply.loadJson());
    expect(Object.keys(out).length).toBe(0);
    expect(CM.bylineHtml('finance')).toBe('');
    expect(CM.bylineHtml('math')).toBe('');
  });
});
