import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
// No filesystem or network here — only the decision logic is exercised, so the
// test runs in the pre-build CI job where deploy/ does not exist yet.
const { twinOf, canonicalForm, auditSitemap, auditCanonicalTag } = require('../../scripts/check-canonical-urls.cjs');

// A miniature deploy/ tree: a directory page, a flat page and a tool page.
const FILES = new Set([
  'index.html',
  'about.html',
  'guides/tip.html',
  'health/bmr-mifflin/index.html',
  'blog/how-emi-works.html',
]);

describe('twinOf — the slash / non-slash twin', () => {
  it('adds the slash to a slashless path', () => {
    expect(twinOf('/health/bmr-mifflin')).toBe('/health/bmr-mifflin/');
  });

  it('removes the slash from a slashed path', () => {
    expect(twinOf('/guides/tip/')).toBe('/guides/tip');
  });

  it('never twins the root', () => {
    expect(twinOf('/')).toBe('/');
    expect(twinOf('')).toBe('/');
  });
});

describe('canonicalForm — the one form a page may answer on', () => {
  it('directory pages (X/index.html) keep the trailing slash', () => {
    expect(canonicalForm('/health/bmr-mifflin', FILES)).toBe('/health/bmr-mifflin/');
    expect(canonicalForm('/health/bmr-mifflin/', FILES)).toBe('/health/bmr-mifflin/');
  });

  it('flat pages (X.html) must NOT have a trailing slash', () => {
    expect(canonicalForm('/guides/tip/', FILES)).toBe('/guides/tip');
    expect(canonicalForm('/guides/tip', FILES)).toBe('/guides/tip');
    expect(canonicalForm('/about', FILES)).toBe('/about');
  });

  it('the root is always "/"', () => {
    expect(canonicalForm('/', FILES)).toBe('/');
  });

  it('returns null for a path the deploy tree does not serve', () => {
    expect(canonicalForm('/finance/loan-emi', FILES)).toBe(null);
  });
});

describe('auditSitemap — sitemap must list exactly one canonical URL per page', () => {
  const loc = (p) => 'https://calcpromaster.com' + p;

  it('passes a canonical-only sitemap', () => {
    const problems = auditSitemap([loc('/'), loc('/about'), loc('/guides/tip'), loc('/health/bmr-mifflin/')], FILES);
    expect(problems).toEqual([]);
  });

  it('fails the original bug: both slash forms of one path listed', () => {
    const problems = auditSitemap([loc('/health/bmr-mifflin'), loc('/health/bmr-mifflin/')], FILES);
    const kinds = problems.map((p) => p.kind);
    expect(kinds).toContain('non-canonical-form');
    expect(kinds).toContain('twin-in-sitemap');
  });

  it('fails a flat page submitted with a trailing slash (that URL 308s)', () => {
    const problems = auditSitemap([loc('/guides/tip/')], FILES);
    expect(problems).toEqual([{ kind: 'non-canonical-form', loc: loc('/guides/tip/'), want: '/guides/tip' }]);
  });

  it('fails duplicate <loc> entries', () => {
    const problems = auditSitemap([loc('/about'), loc('/about')], FILES);
    expect(problems.some((p) => p.kind === 'duplicate-loc')).toBe(true);
  });

  it('fails a legacy host or a query string in the sitemap', () => {
    const legacy = auditSitemap(['https://calcpromaster.netlify.app/about'], FILES);
    expect(legacy[0].kind).toBe('foreign-host');
    const query = auditSitemap([loc('/about?ref=x')], FILES);
    expect(query[0].kind).toBe('query-in-sitemap');
  });

  it('fails a sitemap URL with no file behind it', () => {
    const problems = auditSitemap([loc('/guides/does-not-exist')], FILES);
    expect(problems).toEqual([{ kind: 'no-static-file', loc: loc('/guides/does-not-exist') }]);
  });
});

describe('auditCanonicalTag — a page must canonicalise to itself', () => {
  const page = (href) => `<html><head><link rel="canonical" href="${href}"></head></html>`;

  it('passes a self-referencing canonical on the canonical host', () => {
    expect(auditCanonicalTag('/guides/tip', page('https://calcpromaster.com/guides/tip'))).toEqual([]);
  });

  it('fails a canonical on the legacy netlify.app host (signal sent to a redirect)', () => {
    const problems = auditCanonicalTag('/guides/tip', page('https://calcpromaster.netlify.app/guides/tip'));
    expect(problems.map((p) => p.kind)).toContain('legacy-host-canonical');
  });

  it('fails the twin form: a flat page canonicalising to its slashed twin', () => {
    const problems = auditCanonicalTag('/guides/tip', page('https://calcpromaster.com/guides/tip/'));
    expect(problems.map((p) => p.kind)).toContain('canonical-mismatch');
  });

  it('fails a canonical pointing at a different page', () => {
    const problems = auditCanonicalTag('/health/bmr-mifflin/', page('https://calcpromaster.com/health/bmr/'));
    expect(problems.map((p) => p.kind)).toContain('canonical-mismatch');
  });

  it('fails a missing canonical and a relative canonical', () => {
    expect(auditCanonicalTag('/about', '<html><head></head></html>')[0].kind).toBe('missing-canonical');
    expect(auditCanonicalTag('/about', page('/about'))[0].kind).toBe('relative-canonical');
  });
});
