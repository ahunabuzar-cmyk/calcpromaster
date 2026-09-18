// Single source of truth for EXTENSIONLESS route prefixes that must keep a 200
// rewrite (SPA index.html) on every host: Netlify _redirects, Apache .htaccess,
// the local deploy server (serve-deploy.cjs), and the coverage checker
// (check-sitemap-coverage.cjs). Any path whose FIRST segment is NOT in this
// list falls through to the hard 404 catch-all instead of the soft-404
// index.html fallback.
//
// Why a whitelist: the old catch-all '/* /index.html 200' served 200 + the
// home page for any garbage URL (soft-404 -- indexed by crawlers, wastes
// crawl budget). A bare catch-all '/* /404.html 404' cannot be used because
// the SPA legitimately serves unprerendered extensionless URLs (see below),
// and Netlify splats cannot exclude paths -- only rule ordering can ("take
// advantage of the rule processing order to set a more specific rule" --
// Netlify docs). 404-status rules also respect shadowing, so real files
// always win over a later 404 rule; only the rewrite whitelist needs to be
// explicit.
//
// IMPORTANT maintenance contract: when the app learns a NEW single-segment
// route (new category, new top-level page), add it here FIRST — the coverage
// checker cross-checks this list against _redirects, .htaccess, and the
// sitemap and fails the build on drift.
'use strict';

// 20 calculator categories = CALC_DATA keys (7 eager in index.html +
// 13 lazy in js/data-loader.js) — every /<category> and /<category>/<tool>
// route (and /<category>/<tool>/<modifier> long-tails) must rewrite to the SPA.
const CATEGORIES = [
  'auto', 'business', 'construction', 'conversion', 'career', 'education',
  'engineering', 'everyday', 'family', 'finance', 'fitness', 'food',
  'health', 'homegarden', 'lifestyle', 'math', 'regional', 'science',
  'tech', 'utilities',
];

// Top-level (one-segment) app routes the SPA renders that have no dedicated
// static file or directory-splat rule.
// NOTE: 'hub' is intentionally NOT here — /hub/<category> pages are all
// prerendered static files (deploy/hub/<cat>/index.html), and bare /hub has
// no renderer (the SPA only handles /hub/<cat>), so it must fall through to
// the true-404 catch-all (pinned by tests/e2e/deploy-smoke.spec.js).
const APP_ROUTES = ['compare', 'favorites', 'guides', 'blog'];

// Locale prefixes written by the language switcher (Router.syncUrl → /xx/path)
// via js/i18n.js. Kept EXPLICITLY in sync with the TRANSLATIONS keys there —
// sync is enforced by check-sitemap-coverage.cjs (fails on drift).
const LOCALES = [
  'es', 'hi', 'ur', 'fr', 'de', 'pt', 'ar', 'ru', 'ja', 'zh',
  'ko', 'it', 'nl', 'tr', 'id', 'vi', 'th', 'bn',
];

// Static clean-URL pages rewritten to standalone .html files (no JS needed).
const STATIC_PAGES = [
  'about', 'privacy', 'terms', 'cookies', 'contact',
  'disclaimer-general', 'disclaimer-finance', 'disclaimer-health',
  'editorial-policy', 'qa-dashboard',
];

const PREFIXES = [...CATEGORIES, ...APP_ROUTES, ...LOCALES];

module.exports = { CATEGORIES, APP_ROUTES, LOCALES, STATIC_PAGES, PREFIXES };
