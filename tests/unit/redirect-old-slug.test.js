// ============================================================
// Old-slug 301 guard — /regional/abuDhabi-cost-living
// ------------------------------------------------------------
// The only sitemap URL that failed slug formatting was the camelCase
// /regional/abuDhabi-cost-living (docs/URL-FORMAT-AUDIT.md rules U1 + U7).
// The tool id/slug is now lowercase-hyphen, which means the old path has NO
// static file behind it any more — its backlinks, bookmarks and any lingering
// Google record survive only through the _redirects rule.
//
// Two things must stay true, and neither is covered by a test that only checks
// the rule exists:
//
//   1. the 301 rule is present and points at the new slug;
//   2. it appears BEFORE the `/regional/*` → /index.html rewrite. Netlify and
//      Cloudflare Pages match top-to-bottom, so a later 301 would never fire:
//      the wildcard would serve the SPA shell with HTTP 200 for the old path
//      (a soft 404 that keeps the old URL alive in the index).
//
// Pure file inspection — no network, no server.
// ============================================================
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const REDIRECTS = path.join(ROOT, '_redirects');

const OLD_PATH = '/regional/abuDhabi-cost-living';
const NEW_PATH = '/regional/abu-dhabi-cost-living';

function lines() {
  return fs
    .readFileSync(REDIRECTS, 'utf8')
    .split('\n')
    .map((l) => l.replace(/\r$/, ''));
}

function ruleLines() {
  // Skip blank lines and comments — only real rules participate in matching order.
  return lines()
    .map((raw, i) => ({ raw: raw.trim(), i }))
    .filter(({ raw }) => raw && !raw.startsWith('#'));
}

describe('redirects: camelCase tool slug is 301ed to the lowercase form', () => {
  it('_redirects exists and is readable', () => {
    expect(fs.existsSync(REDIRECTS)).toBe(true);
  });

  it('has a 301 from the old camelCase path to the new slug', () => {
    const rule = ruleLines().find(({ raw }) => raw.startsWith(OLD_PATH + ' '));
    expect(rule, `no redirect rule starts with "${OLD_PATH}"`).toBeTruthy();
    expect(rule.raw).toContain(NEW_PATH);
    expect(rule.raw).toMatch(/\s301$/);
  });

  it('places that 301 above the /regional/* SPA rewrite (first match wins)', () => {
    const rules = ruleLines();
    const idx301 = rules.findIndex(({ raw }) => raw.startsWith(OLD_PATH + ' '));
    const idxWildcard = rules.findIndex(({ raw }) => raw.startsWith('/regional/*'));
    expect(idx301).toBeGreaterThan(-1);
    expect(idxWildcard).toBeGreaterThan(-1);
    expect(idx301).toBeLessThan(idxWildcard);
  });

  it('no other rule still serves the old path with a 200 rewrite', () => {
    const offenders = ruleLines().filter(
      ({ raw }) => raw.startsWith(OLD_PATH + ' ') && /\s200$/.test(raw)
    );
    expect(offenders).toEqual([]);
  });
});

// A 301 whose destination is a prerendered directory page must carry the
// trailing slash. Cloudflare Pages 308s "/path" to "/path/", so a slashless
// destination turns every legacy URL into a two-hop chain (301 -> 308 -> 200).
// Live-measured 2026-10-15 — /lifestyle/moving-cost did exactly that, and GSC
// reported the chain's end as "Page with redirect". All 37 destinations were the
// slashless form; this pins them so a future edit cannot quietly reintroduce the
// extra hop.
describe('redirects: 301 destinations are the canonical one-hop form', () => {
  const DEPLOY = path.join(ROOT, 'deploy');

  function redirect301s() {
    return ruleLines()
      .map(({ raw }) => raw.match(/^(\/\S+)\s+(\/\S+)\s+(301!?)$/))
      .filter(Boolean)
      .map((m) => ({ from: m[1], to: m[2] }));
  }

  it('finds the renamed-tool redirects (guards against a silently empty check)', () => {
    expect(redirect301s().length).toBeGreaterThan(20);
  });

  it('every destination that is a built directory page ends in a slash', () => {
    const offenders = redirect301s()
      .filter((r) => fs.existsSync(path.join(DEPLOY, r.to.replace(/^\//, ''), 'index.html')))
      .filter((r) => !r.to.endsWith('/'))
      .map((r) => r.from + ' -> ' + r.to + ' (add the trailing slash)');
    expect(offenders).toEqual([]);
  });

  it('a destination with a trailing slash resolves to a real built page', () => {
    const missing = redirect301s()
      .filter((r) => r.to.endsWith('/'))
      .filter((r) => !fs.existsSync(path.join(DEPLOY, r.to.replace(/^\//, ''), 'index.html')))
      .map((r) => r.from + ' -> ' + r.to);
    expect(missing).toEqual([]);
  });
});
