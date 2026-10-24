import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
// Network is NOT touched here — we test the pure pass/fail decision logic only.
const { evaluate, evaluateTwin, PROBES, TWIN_PROBES } = require('../../scripts/check-host-redirects.cjs');

describe('host-consolidation regression check (pure evaluate)', () => {
  it('passes a 200 probe with no redirect target', () => {
    expect(evaluate({ expect: 200 }, { status: 200, location: null }).ok).toBe(true);
  });

  it('fails when the apex stops returning 200', () => {
    const v = evaluate({ expect: 200 }, { status: 301, location: 'https://calcpromaster.com/' });
    expect(v.ok).toBe(false);
    expect(v.detail).toContain('expected 200');
  });

  it('passes a 301 probe when Location matches (trailing slash insensitive)', () => {
    const v = evaluate(
      { expect: 301, to: 'https://calcpromaster.com/health/pf-ratio/' },
      { status: 301, location: 'https://calcpromaster.com/health/pf-ratio' }
    );
    expect(v.ok).toBe(true);
  });

  it('fails a 301 probe when the deep path is dropped', () => {
    const v = evaluate(
      { expect: 301, to: 'https://calcpromaster.com/health/pf-ratio/' },
      { status: 301, location: 'https://calcpromaster.com/' }
    );
    expect(v.ok).toBe(false);
    expect(v.detail).toContain('!=');
  });

  it('fails when a duplicate host starts returning 200 again (the original bug)', () => {
    const v = evaluate(
      { expect: 301, to: 'https://calcpromaster.com/' },
      { status: 200, location: null }
    );
    expect(v.ok).toBe(false);
  });

  it('fails cleanly on a network error / timeout', () => {
    expect(evaluate({ expect: 200 }, { status: 0, error: 'timeout' }).ok).toBe(false);
    expect(evaluate({ expect: 200 }, null).ok).toBe(false);
  });

  it('probe plan covers apex, www and pages.dev, roots and deep links', () => {
    const names = PROBES.map((p) => p.name);
    expect(names).toEqual(
      expect.arrayContaining(['apex home', 'www root', 'www deep link', 'pages.dev root', 'pages.dev deep'])
    );
    // every duplicate-host probe must be a 301 with a target, apex probes must be 200
    for (const p of PROBES) {
      if (p.url.includes('www.') || p.url.includes('.pages.dev')) {
        expect(p.expect).toBe(301);
        expect(typeof p.to).toBe('string');
      } else {
        expect(p.expect).toBe(200);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Trailing-slash twins: the split-signal bug. A page may answer on ONE form
// only; the twin must be a permanent redirect (301 or 308 — Google treats them
// identically for consolidation).
describe('one URL per page — twin probes (pure evaluateTwin)', () => {
  const probe = { name: 'tool twin', url: 'https://calcpromaster.com/health/bmr-mifflin', canonical: 'https://calcpromaster.com/health/bmr-mifflin/' };

  it('passes when the twin answers 301 to the canonical URL', () => {
    const v = evaluateTwin(probe, { status: 301, location: 'https://calcpromaster.com/health/bmr-mifflin/' });
    expect(v.ok).toBe(true);
  });

  it('accepts 308 — the status Cloudflare Pages emits for pretty URLs', () => {
    const v = evaluateTwin(probe, { status: 308, location: 'https://calcpromaster.com/health/bmr-mifflin/' });
    expect(v.ok).toBe(true);
  });

  it('fails the original bug: the twin answering 200 (two live URLs)', () => {
    const v = evaluateTwin(probe, { status: 200, location: null });
    expect(v.ok).toBe(false);
    expect(v.detail).toContain('answers 200');
  });

  it('resolves a relative Location (what Cloudflare actually sends)', () => {
    const v = evaluateTwin(probe, { status: 308, location: '/health/bmr-mifflin/' });
    expect(v.ok).toBe(true);
    expect(v.detail).toContain('https://calcpromaster.com/health/bmr-mifflin/');
  });

  it('fails a redirect that lands somewhere else', () => {
    const v = evaluateTwin(probe, { status: 301, location: 'https://calcpromaster.com/health/bmr/' });
    expect(v.ok).toBe(false);
    expect(v.detail).toContain('!=');
  });

  it('fails a redirect without a Location header, and a hard error', () => {
    expect(evaluateTwin(probe, { status: 301, location: null }).ok).toBe(false);
    expect(evaluateTwin(probe, { status: 0, error: 'timeout' }).ok).toBe(false);
    expect(evaluateTwin(probe, null).ok).toBe(false);
  });

  it('covers every page family the site builds (tool, category, hub, guide, flat page)', () => {
    const names = TWIN_PROBES.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining(['tool twin', 'category twin', 'hub twin', 'guide twin', 'page twin'])
    );
    for (const t of TWIN_PROBES) {
      expect(t.canonical.startsWith('https://calcpromaster.com/')).toBe(true);
      // The probe must be the NON-canonical form of the same page: either the
      // slash twin, or the *.html form Cloudflare 308s to the clean URL.
      const strip = (u) => u.replace(/\/+$/, '').replace(/\.html$/, '');
      expect(strip(t.url)).toBe(strip(t.canonical));
      expect(t.url).not.toBe(t.canonical);
    }
  });
});
