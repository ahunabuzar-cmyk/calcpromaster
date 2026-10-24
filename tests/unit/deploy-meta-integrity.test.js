// ============================================================
// Deploy meta integrity — two defects that reached production
// ------------------------------------------------------------
// Both of these shipped and were only noticed by reading the live HTML, so they
// get a file-inspection guard instead of another manual check:
//
//   1. NESTED META. scripts/fix-deploy-seo.cjs injected twitter:title /
//      twitter:description with a '$1' replacement string while the injected
//      text was dynamic. /guides/tip's description contains "$12.60", so "$1"
//      expanded as a capture-group reference and a whole <meta> tag landed
//      inside the twitter:description content attribute. Any page whose title
//      or description contains "$1"-style text can do the same, which is why
//      the check scans every page rather than pinning the one URL.
//
//   2. DANGLING CONNECTOR. Titles longer than 60 chars are word-clipped by the
//      same script. /guides/bmr shipped as "…Worked Example &" — a title that
//      ends on a conjunction reads as a broken snippet.
//
// Pure file inspection: no network, no server.
// ============================================================
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.join(process.cwd());
const DEPLOY = path.join(ROOT, 'deploy');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const pages = fs.existsSync(DEPLOY) ? walk(DEPLOY) : [];

describe('deploy meta integrity', () => {
  it('has a built deploy/ with pages to inspect (guards against an empty check)', () => {
    expect(pages.length).toBeGreaterThan(500);
  });

  it('never nests a tag inside a content attribute (the "$1" injection bug)', () => {
    const offenders = [];
    for (const p of pages) {
      if (/content="[^"]*<[a-z]/i.test(fs.readFileSync(p, 'utf8'))) {
        offenders.push(path.relative(DEPLOY, p));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('echoes the tip page description intact into its social tags', () => {
    const p = path.join(DEPLOY, 'guides', 'tip.html');
    if (!fs.existsSync(p)) return; // page removed — nothing to pin
    const html = fs.readFileSync(p, 'utf8');
    const meta = html.match(/<meta name="description" content="([^"]*)"/);
    const tw = html.match(/<meta name="twitter:description" content="([^"]*)"/);
    expect(meta).toBeTruthy();
    expect(tw).toBeTruthy();
    // The $12.60 / $16.80 figures must survive verbatim, not become a tag.
    expect(tw[1]).toContain('$12.60');
    expect(tw[1]).toContain('$16.80');
  });

  it('never ends a title on a connector (the clipped-title defect)', () => {
    // Compare the LAST WORD against a connector list rather than running a
    // regex over the tail: "…Calculator" ends in "or" but is a whole word, and
    // a naive /or$/ test flags 36 innocent titles.
    const CONNECTORS = new Set(['&', 'and', 'or', 'with', 'for', 'to', 'the', 'a', 'of', 'in', 'on', 'vs']);
    const offenders = [];
    for (const p of pages) {
      const m = fs.readFileSync(p, 'utf8').match(/<title>([^<]*)<\/title>/i);
      if (!m) continue;
      const inner = m[1].replace(/&amp;/g, '&').trim();
      const tail = inner.replace(/[\s,;:–—-]+$/, '').split(' ').pop().toLowerCase();
      if (CONNECTORS.has(tail)) {
        offenders.push(path.relative(DEPLOY, p) + ' → "' + inner + '"');
      }
    }
    expect(offenders).toEqual([]);
  });
});
