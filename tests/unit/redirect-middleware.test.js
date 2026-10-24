import { describe, it, expect, vi } from 'vitest';
import { onRequest, canonicalPathRedirect } from '../../functions/_middleware.js';

// Minimal Pages Functions EventContext stand-in.
function ctx(url, { onNext } = {}) {
  return {
    request: new Request(url),
    next: onNext || vi.fn(() => new Response('served', { status: 200 })),
  };
}

describe('host-consolidation middleware', () => {
  it('301-redirects www to the apex, preserving path and query', async () => {
    const res = await onRequest(ctx('https://www.calcpromaster.com/health/pf-ratio/?a=1'));
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://calcpromaster.com/health/pf-ratio/?a=1');
  });

  it('301-redirects the pages.dev origin to the apex', async () => {
    const res = await onRequest(ctx('https://calcpromaster.pages.dev/math/percentage/'));
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://calcpromaster.com/math/percentage/');
  });

  it('leaves the apex untouched (passes through to next)', async () => {
    const next = vi.fn(() => new Response('ok', { status: 200 }));
    const res = await onRequest(ctx('https://calcpromaster.com/', { onNext: next }));
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
  });

  it('does not touch preview deployments (<hash>.calcpromaster.pages.dev)', async () => {
    const next = vi.fn(() => new Response('preview', { status: 200 }));
    const res = await onRequest(ctx('https://99ecd08b.calcpromaster.pages.dev/', { onNext: next }));
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
  });

  it('never throws on a malformed URL — falls through to next', async () => {
    const next = vi.fn(() => new Response('ok', { status: 200 }));
    const res = await onRequest({
      request: { url: 'not-a-url' },
      next,
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
  });
});

// A root `_middleware.js` stops Cloudflare Pages from applying the `200`
// rewrites in `_redirects` (measured 2026-10-21 in workerd and live: /es/xyz,
// /blog/xyz and every locale deep link answered 404). The Function reproduces
// the whitelist itself, so these cases pin the contract.
describe('SPA fallback inside the middleware', () => {
  const notFound = () => new Response('nope', { status: 404 });
  const shell = () => new Response('<!doctype html><html><body>app</body></html>', {
    status: 200,
    headers: { 'content-type': 'text/html' },
  });

  it('serves the app shell for a whitelisted deep link that 404s', async () => {
    const fetchSpy = vi.fn(() => Promise.resolve(shell()));
    vi.stubGlobal('fetch', fetchSpy);
    const res = await onRequest(ctx('https://calcpromaster.com/es/finance/loan-emi', { onNext: notFound }));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(res.headers.get('cache-control')).toBe('no-cache');
    expect(fetchSpy.mock.calls[0][0]).toBe('https://calcpromaster.com/index.html');
    vi.unstubAllGlobals();
  });

  it('leaves a non-whitelisted extensionless 404 a real 404', async () => {
    const fetchSpy = vi.fn(() => Promise.resolve(shell()));
    vi.stubGlobal('fetch', fetchSpy);
    const res = await onRequest(ctx('https://calcpromaster.com/definitely-not-a-route-xyz', { onNext: notFound }));
    expect(res.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('never rewrites a missing asset (extension in the path)', async () => {
    const fetchSpy = vi.fn(() => Promise.resolve(shell()));
    vi.stubGlobal('fetch', fetchSpy);
    const res = await onRequest(ctx('https://calcpromaster.com/js/does-not-exist-xyz.js', { onNext: notFound }));
    expect(res.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('does not recurse when the shell request is already marked', async () => {
    const fetchSpy = vi.fn(() => Promise.resolve(shell()));
    vi.stubGlobal('fetch', fetchSpy);
    const res = await onRequest({
      request: new Request('https://calcpromaster.com/es/xyz', { headers: { 'x-served-spa-shell': '1' } }),
      next: notFound,
    });
    expect(res.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('keeps a real page (200) untouched', async () => {
    const fetchSpy = vi.fn(() => Promise.resolve(shell()));
    vi.stubGlobal('fetch', fetchSpy);
    const real = vi.fn(() => new Response('real page', { status: 200 }));
    const res = await onRequest(ctx('https://calcpromaster.com/finance/loan-emi/', { onNext: real }));
    expect(await res.text()).toBe('real page');
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

// One canonical URL per page: Cloudflare handles the slash twin and the clean-URL
// twin of flat files, but a CASE variant (served as a 200 soft 404 by the SPA
// fallback) and the ".html" form of a directory page (/finance/loan-emi.html was
// a 404) were still producing a second, wrong URL.
describe('second URL forms the edge does not fix', () => {
  it('301s an uppercase path straight to the lowercase canonical (query preserved)', async () => {
    // One hop, not two: /health/bmr-mifflin (no slash) 308s to the slash form,
    // so redirecting to it first would cost Googlebot a second request.
    const res = await onRequest(ctx('https://calcpromaster.com/health/BMR-Mifflin?ref=x'));
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://calcpromaster.com/health/bmr-mifflin/?ref=x');
  });

  it('301s an uppercase .html directory path in one hop too', () => {
    expect(canonicalPathRedirect('/Finance/LOAN-EMI.html')).toBe('/finance/loan-emi/');
    expect(canonicalPathRedirect('/HEALTH/bmr-mifflin')).toBe('/health/bmr-mifflin/');
  });

  it('keeps the canonical form of a flat page (no slash added after lowercasing)', () => {
    for (const [from, to] of [
      ['/guides/TIP', '/guides/tip'],
      ['/blog/HOW-EMI-WORKS', '/blog/how-emi-works'],
      ['/GUIDES/tip.html', '/guides/tip'],
    ]) {
      expect(canonicalPathRedirect(from), from).toBe(to);
    }
  });

  it('leaves a lowercase path to Pages (unchanged behaviour)', () => {
    expect(canonicalPathRedirect('/health/bmr-mifflin')).toBeNull();
    expect(canonicalPathRedirect('/finance/loan-emi')).toBeNull();
  });

  it('301s the .html form of a directory page straight to the trailing-slash URL', async () => {
    for (const [from, to] of [
      ['/finance/loan-emi.html', '/finance/loan-emi/'],
      ['/health/bmr-mifflin.html', '/health/bmr-mifflin/'],
      ['/finance.html', '/finance/'],
      ['/hub/finance.html', '/hub/finance/'],
    ]) {
      const res = await onRequest(ctx('https://calcpromaster.com' + from));
      expect(res.status, from).toBe(301);
      expect(res.headers.get('location'), from).toBe('https://calcpromaster.com' + to);
    }
  });

  it('leaves root files and flat pages to Pages (no loops)', async () => {
    for (const p of ['/og-image.html', '/404.html', '/about.html', '/guides/tip.html']) {
      expect(canonicalPathRedirect(p), p).toBeNull();
    }
    const next = vi.fn(() => new Response('ok', { status: 200 }));
    const res = await onRequest(ctx('https://calcpromaster.com/about.html', { onNext: next }));
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
  });

  it('leaves an already-canonical path alone, including SPA modifier routes', async () => {
    for (const p of ['/', '/finance/', '/finance/loan-emi/', '/guides/tip', '/health/bmr-mifflin/']) {
      expect(canonicalPathRedirect(p), p).toBeNull();
    }
  });

  it('is idempotent — a redirected path is canonical on the second pass', () => {
    for (const p of ['/health/BMR-Mifflin', '/finance/loan-emi.html', '/hub/finance.html']) {
      const once = canonicalPathRedirect(p);
      expect(once, p).not.toBeNull();
      expect(canonicalPathRedirect(once), once).toBeNull();
    }
  });
});

// Deploys must not leave visitors on yesterday's markup: every HTML response
// revalidates, while hashed/immutable assets keep their long cache.
describe('cache policy', () => {
  it('marks any HTML response no-cache, whatever the path', async () => {
    const html = () => new Response('<html></html>', {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
    for (const url of ['https://calcpromaster.com/', 'https://calcpromaster.com/finance/loan-emi/']) {
      const res = await onRequest(ctx(url, { onNext: html }));
      expect(res.headers.get('cache-control'), url).toBe('no-cache');
    }
  });

  it('keeps unhashed JS no-cache and fonts immutable', async () => {
    const js = () => new Response('x', { status: 200, headers: { 'content-type': 'application/javascript' } });
    const font = () => new Response('x', { status: 200, headers: { 'content-type': 'font/woff2' } });
    expect((await onRequest(ctx('https://calcpromaster.com/js/app.js', { onNext: js }))).headers.get('cache-control')).toBe('no-cache');
    expect((await onRequest(ctx('https://calcpromaster.com/fonts/inter.woff2', { onNext: font }))).headers.get('cache-control'))
      .toBe('public, max-age=31536000, immutable');
  });

  it('leaves a 404 response alone', async () => {
    const nf = vi.fn(() => new Response('nope', { status: 404, headers: { 'content-type': 'text/html' } }));
    const res = await onRequest(ctx('https://calcpromaster.com/nope-xyz', { onNext: nf }));
    expect(res.headers.get('cache-control')).toBeNull();
  });
});
