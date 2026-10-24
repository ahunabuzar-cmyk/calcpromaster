import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';

const require = createRequire(import.meta.url);
const { classify, classifyRendered, buildProbes, probesFromFile } = require('../../scripts/check-soft-404.cjs');

const page = (head, extra = '') =>
  '<!doctype html><html><head>' + head + '</head><body>' + extra + '</body></html>';
const canonical = (href) => '<link rel="canonical" href="' + href + '">';
const robots = (content) => '<meta name="robots" content="' + content + '">';
const SHELL = page('<title>CalcPro</title>' + canonical('https://calcpromaster.com/'),
  '<main id="mainContent"></main><script src="/js/app.js"></script>');

describe('soft-404 raw classification', () => {
  it('treats 301/308 as a redirect, not a problem', () => {
    for (const status of [301, 302, 308]) {
      expect(classify('/health/bmr-mifflin.html', { status, location: '/health/bmr-mifflin/' }).kind).toBe('redirect');
    }
  });

  it('accepts a hard 404 and 410', () => {
    expect(classify('/nope-xyz', { status: 404, body: page('') }).kind).toBe('notfound');
    expect(classify('/gone-xyz', { status: 410, body: page('') }).kind).toBe('notfound');
  });

  it('accepts a 200 that carries noindex', () => {
    const res = { status: 200, body: page(robots('noindex, follow')) };
    expect(classify('/health/bmr-mifflin', res).kind).toBe('noindex');
  });

  it('accepts a 200 whose canonical is itself (slash-insensitive)', () => {
    const res = { status: 200, body: page(canonical('https://calcpromaster.com/health/bmr-mifflin/')) };
    expect(classify('/health/bmr-mifflin', res).kind).toBe('real');
    expect(classify('/health/bmr-mifflin/', res).kind).toBe('real');
  });

  it('separates the SPA shell from a real soft 404', () => {
    // Unknown path under a whitelisted prefix: 200 + app mount point, canonical "/".
    expect(classify('/tech/this-page-does-not-exist-xyz', { status: 200, body: SHELL }).kind).toBe('shell');
    // Same 200 shell shape, but a page that claims another page as canonical and
    // has no app mount point is a true soft 404.
    const soft = page(canonical('https://calcpromaster.com/some-other-page/'), '<h1>Money page</h1>');
    const verdict = classify('/ghost-page/', { status: 200, body: soft });
    expect(verdict.kind).toBe('soft');
    expect(verdict.detail).toContain('some-other-page');
  });

  it('flags a 200 with no canonical and no shell markers as soft', () => {
    expect(classify('/ghost-page/', { status: 200, body: page('<title>x</title>', '<h1>x</h1>') }).kind).toBe('soft');
  });

  it('reports transport failures as errors, never as a pass', () => {
    expect(classify('/x', { status: 0, error: 'timeout' }).kind).toBe('error');
    expect(classify('/x', null).kind).toBe('error');
  });
});

describe('soft-404 rendered classification (the SPA case)', () => {
  it('accepts an SPA 404 that set noindex after JS ran', () => {
    expect(classifyRendered('/tech/nope-xyz', {
      robots: 'noindex, follow', canonical: 'https://calcpromaster.com/',
    }).kind).toBe('noindex');
  });

  it('accepts a rendered page that canonicalises to itself', () => {
    expect(classifyRendered('/es/finance/loan-emi', {
      robots: 'index, follow', canonical: 'https://calcpromaster.com/es/finance/loan-emi',
    }).kind).toBe('real');
  });

  it('fails a rendered 404 view that stayed indexable', () => {
    const verdict = classifyRendered('/tech/nope-xyz', {
      robots: 'index, follow', canonical: 'https://calcpromaster.com/', text: '404 — Page Not Found',
    });
    expect(verdict.kind).toBe('soft');
  });

  it('fails an SPA page that is neither self-canonical nor noindex', () => {
    expect(classifyRendered('/tech/nope-xyz', {
      robots: '', canonical: 'https://calcpromaster.com/', text: 'CalcPro',
    }).kind).toBe('soft');
  });
});

describe('probe generation', () => {
  it('covers the case, .html and junk-child twins of every sample, once each', () => {
    const probes = buildProbes(['/health/bmr-mifflin/', '/guides/tip', '/']);
    const urls = probes.map((p) => p.url);
    expect(urls).toContain('/health/BMR-MIFFLIN'); // uppercase twin
    expect(urls).toContain('/health/bmr-mifflin.html'); // .html twin
    expect(urls).toContain('/health/bmr-mifflin/this-page-does-not-exist-xyz');
    expect(urls).toContain('/guides/TIP');
    expect(urls).toContain('/guides/tip/this-page-does-not-exist-xyz');
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('never probes the root as a junk child of itself', () => {
    const urls = buildProbes(['/']).map((p) => p.url);
    expect(urls.some((u) => u.startsWith('/this-page'))).toBe(false);
  });
});

// Search Console's crawl stats show a 404 share but no URLs; the indexing report
// exports them. This turns that export into a triage list.
describe('triage list from a Search Console 404 export', () => {
  it('accepts paths or absolute URLs, drops the header row and duplicates', () => {
    const file = path.join(os.tmpdir(), 'gsc-404-' + process.pid + '.csv');
    fs.writeFileSync(file, [
      '"URL",Clicks,Impressions',
      'https://calcpromaster.com/old-slug/',
      '/old-slug/',
      '/ghost-page/this-page-does-not-exist-xyz',
      '',
    ].join('\n'));
    try {
      const probes = probesFromFile(file);
      expect(probes.map((p) => p.url)).toEqual(['/old-slug/', '/ghost-page/this-page-does-not-exist-xyz']);
    } finally {
      fs.unlinkSync(file);
    }
  });
});
