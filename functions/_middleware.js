// ============================================================
// Cloudflare Pages Function — host consolidation (301)
// ------------------------------------------------------------
// The same site is reachable on three hostnames:
//   calcpromaster.com        ← canonical (keep serving)
//   www.calcpromaster.com    ← duplicate
//   calcpromaster.pages.dev  ← Cloudflare Pages project origin (duplicate)
//
// This middleware permanently redirects the two duplicates to the apex so
// Google sees a single URL per page. It runs in front of static assets for
// every request to the Pages project (see Pages → Functions → Middleware).
//
// Why middleware and not a zone Redirect Rule / Bulk Redirect: pages.dev is a
// Cloudflare-owned zone, so the project must own the redirect. This keeps the
// whole thing in the repo, version-controlled and reversible (delete this file
// and redeploy to turn it off).
//
// Scope notes:
//  - Only the exact production host `calcpromaster.pages.dev` is redirected.
//    Preview deployments live on `<hash>.calcpromaster.pages.dev` and are left
//    alone so previews keep working.
//  - Path + query string are preserved; the fragment is client-side only.
//  - Any error falls through to normal handling (never break the site).
// ============================================================

const CANONICAL_HOST = 'calcpromaster.com';
const DUPLICATE_HOSTS = new Set([
  'www.calcpromaster.com',
  'calcpromaster.pages.dev',
]);

// ---------------------------------------------------------------------------
// Cache-Control for unhashed assets, applied HERE instead of via _headers.
// ---------------------------------------------------------------------------
// `_headers` path WILDCARDS (/js/*, /fonts/*, …) never took effect on this
// project: measured 2026-10-21 with cache-busted requests, /js/app.js and
// /styles.css still answered the global "max-age=86400", while exact paths
// (/index.html, /sitemap.xml) DID match. Result: a returning visitor could keep
// an old app.js/styles.css for a day after a deploy — the "feature is broken on
// the live site" report that a hard refresh always fixed.
//
// A Function runs before the asset is served and its headers win, so this is the
// reliable place for the same policy. Keep it in sync with _headers (which still
// documents the intent and covers exact paths).
const NO_CACHE = /(^\/index\.html$)|(^\/styles\.css$)|(^\/sw\.js$)|(^\/js\/)|(^\/manifest\.json$)/;
const IMMUTABLE = /(^\/fonts\/)|(^\/og\/)|(^\/icons\/)/;
const SHORT_CACHE = /(^\/sitemap\.xml$)|(^\/robots\.txt$)/;

function cachePolicy(pathname) {
  if (NO_CACHE.test(pathname)) return 'no-cache';
  if (IMMUTABLE.test(pathname)) return 'public, max-age=31536000, immutable';
  if (SHORT_CACHE.test(pathname)) return 'public, max-age=3600';
  return null; // leave the global policy alone
}

// ---------------------------------------------------------------------------
// HSTS on the duplicate-host redirect.
// ---------------------------------------------------------------------------
// A crawler that checks https://www.<host>/ only sees the redirect response, so
// it never reads the apex response's Strict-Transport-Security header and
// reports "subdomain doesn't support HSTS". _headers cannot add headers to a
// redirect produced by this Function, so they are attached here explicitly.
const REDIRECT_HEADERS = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

// ---------------------------------------------------------------------------
// SPA fallback (the `_redirects` 200-rewrites cannot do it any more).
// ---------------------------------------------------------------------------
// Measured 2026-10-21 in workerd (`wrangler pages dev deploy`) and live:
// once a root `_middleware.js` exists, every request is handled by the Function
// and Cloudflare Pages NEVER applies the `200`-rewrite rules from `_redirects`.
// 3xx rules still fire (`/finance/ltv` -> 301), but `/blog/xyz`, `/es/xyz` and
// every other whitelisted SPA path answered 404 live — so the language switcher
// (`/es/...`) and runtime tool long-tails were dead URLs.
//
// The rewrite is therefore done here, and only for the same prefixes the
// `_redirects` whitelist documents (keep the two in sync; the ordering rule is
// unchanged: a real file always wins because this only runs on a 404).
const SPA_PREFIXES = [
  'auto', 'business', 'construction', 'conversion', 'career', 'education',
  'engineering', 'everyday', 'family', 'finance', 'fitness', 'food', 'health',
  'homegarden', 'lifestyle', 'math', 'regional', 'science', 'tech', 'utilities',
  'compare', 'favorites', 'guides', 'blog',
  // Locale prefixes written by the language switcher (js/i18n.js).
  'es', 'hi', 'ur', 'fr', 'de', 'pt', 'ar', 'ru', 'ja', 'zh', 'ko', 'it', 'nl',
  'tr', 'id', 'vi', 'th', 'bn',
];
const SPA_RE = new RegExp('^/(' + SPA_PREFIXES.join('|') + ')(/|$)');

// ---------------------------------------------------------------------------
// One canonical URL per page — the two variants Cloudflare does NOT fix.
// ---------------------------------------------------------------------------
// Cloudflare Pages already 308s the slash twin (/x <-> /x/) and the clean-URL
// twin of a FLAT file (/about.html -> /about). Measured 2026-10-24 on 1420
// sitemap URLs: 1419/1419 twins redirect, 0 pages answer on both forms.
//
// Two variants still produced a second URL, and both are fixed here:
//
//  1. CASE. Pages serves directory paths case-insensitively in the SPA fallback
//     (/health/BMR-Mifflin answered 200 with a client-rendered "not found"), so
//     Google could index a case variant, or report it as a soft 404. Every slug
//     on this site is lowercase (docs/URL-FORMAT-AUDIT.md), so an uppercase path
//     is always a duplicate: 301 it to the lowercase form, query preserved.
//
//  2. ".html" ON A DIRECTORY PAGE. /about.html is handled by Pages, but
//     /finance/loan-emi.html and /health/bmr-mifflin.html answered 404 — a
//     dead end for any inbound link written the old way. Redirect them straight
//     to the trailing-slash form (one hop, not 404). Flat pages are left to
//     Pages, and root files such as /og-image.html and /404.html are never
//     touched because they are not under a directory prefix.
const DIR_PREFIXES = ['auto', 'business', 'construction', 'conversion', 'career',
  'education', 'engineering', 'everyday', 'family', 'finance', 'fitness', 'food',
  'health', 'homegarden', 'lifestyle', 'math', 'regional', 'science', 'tech',
  'utilities', 'hub'];
const DIR_PAGE_RE = new RegExp('^/(' + DIR_PREFIXES.join('|') + ')(/[^/]+)?$');

// Returns the canonical path for a request path, or null when it is already
// canonical. Pure so it can be unit-tested without a runtime.
//
// A case-only difference lands on the FINAL URL, not on the lowercase twin:
// /health/BMR-Mifflin used to 301 to /health/bmr-mifflin, which then 308'd to
// the trailing-slash form (measured live 2026-10-24 — two hops for one typo).
// Directory pages canonicalise with the slash, so the lowercase target gets it
// here and the redirect stays one hop. Flat pages (/guides/tip) keep their
// no-slash form, and a lowercase path is left to Pages' own 308 exactly as
// before — this only shortens redirects that were already happening.
export function canonicalPathRedirect(pathname) {
  if (!pathname) return null;
  if (/[A-Z]/.test(pathname)) {
    const lower = pathname.toLowerCase();
    if (/\.html$/i.test(lower)) {
      const bare = lower.slice(0, -'.html'.length);
      return DIR_PAGE_RE.test(bare) ? bare + '/' : bare;
    }
    if (DIR_PAGE_RE.test(lower) && !lower.endsWith('/')) return lower + '/';
    return lower;
  }
  if (/\.html$/i.test(pathname)) {
    const bare = pathname.slice(0, -'.html'.length);
    if (DIR_PAGE_RE.test(bare)) return bare + '/';
  }
  return null;
}

// Serve the SPA shell for a whitelisted path. `context.next()` only knows the
// current request, so the shell is fetched over HTTP from the same origin — the
// sentinel header makes the recursive call skip this branch and reach the asset
// server directly.
const SHELL_HEADER = 'x-served-spa-shell';

async function serveShell(context, url) {
  const shellUrl = new URL('/index.html', url.origin);
  const res = await fetch(shellUrl.toString(), {
    headers: { [SHELL_HEADER]: '1' },
    cf: { cacheTtl: 0 },
  });
  if (!res.ok) return null;
  const headers = new Headers(res.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  // A 200 rewrite must never inherit the shell's own cache policy for the URL
  // that was requested, and the SPA is the one asset that must always be fresh.
  headers.set('Cache-Control', 'no-cache');
  headers.delete('content-length');
  return new Response(res.body, { status: 200, headers });
}

export async function onRequest(context) {
  let pathname = '';
  try {
    const url = new URL(context.request.url);
    pathname = url.pathname;
    if (DUPLICATE_HOSTS.has(url.hostname)) {
      return new Response(null, {
        status: 301,
        headers: Object.assign(
          { Location: 'https://' + CANONICAL_HOST + url.pathname + url.search },
          REDIRECT_HEADERS
        ),
      });
    }
    // Same host, second URL form: 301 to the canonical path (see above).
    const canonical = canonicalPathRedirect(url.pathname);
    if (canonical) {
      return new Response(null, {
        status: 301,
        headers: Object.assign(
          { Location: url.origin + canonical + url.search },
          REDIRECT_HEADERS
        ),
      });
    }
  } catch (e) {
    // Malformed URL or unexpected runtime — serve the request normally.
  }

  const response = await context.next();
  // SPA fallback: whitelisted extensionless paths with no built page get the
  // app shell (same contract the `_redirects` whitelist documents).
  if (
    pathname &&
    response &&
    response.status === 404 &&
    !context.request.headers.get(SHELL_HEADER) &&
    SPA_RE.test(pathname) &&
    !/\.[a-z0-9]+$/i.test(pathname)
  ) {
    try {
      const shell = await serveShell(context, new URL(context.request.url));
      if (shell) return shell;
    } catch (e) {
      // Fall through to the real 404.
    }
  }
  // HTML always revalidates. The zone's Browser Cache TTL (4 h) is applied to
  // cached asset types like .js/.css — fine for cache-busted URLs — but HTML
  // carried `public, max-age=86400` from the global _headers rule, so a deploy
  // could leave returning visitors on yesterday's markup (and yesterday's
  // asset URLs) for a day. Match on the response type, not the path, so every
  // generated page (/, /guides/*, /blog/*, hubs, tools) is covered.
  const isHtml = /text\/html/i.test(response.headers.get('content-type') || '');
  const policy = isHtml ? 'no-cache' : (pathname ? cachePolicy(pathname) : null);
  if (!policy) return response;
  // Only successful document/asset responses are worth re-headering; a 404 or a
  // redirect must keep its own headers.
  if (!response || response.status >= 400) return response;
  const patched = new Response(response.body, response);
  patched.headers.set('Cache-Control', policy);
  return patched;
}
