// ============================================================
// Keyword implementation map — decision contract.
//
// scripts/build-keyword-implementation-map.cjs turns the keyword-gap audit into
// ONE decision per keyword (A new page / B improve existing / C link+metadata /
// D shared page / E no build). Rule A fires when nothing in the registry or the
// live sitemap matches, but A is a *candidate* signal, not a build order — the
// 2026-10-13 pass resolved the last ten A rows from repo evidence and five of
// them were answered by an existing page while five were not calculation
// intents at all. Building them would have shipped five duplicates and five
// thin pages, so the resolutions are pinned here.
//
// The builder calls process.exit() at load, so this test reads its OUTPUT
// artifacts (the JSON + the committed doc) rather than requiring the module.
// ============================================================
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const MAP = path.join(ROOT, 'data', 'keyword-implementation-map.json');
const DOC = path.join(ROOT, 'docs', 'KEYWORD-IMPLEMENTATION-MAP.md');

// The ten rows that were still unclassified A before the 2026-10-13 pass, with
// the decision each must now carry and (for B) the live page it must point at.
const RESOLVED = {
  'polypeptide calculator': { code: 'B', url: '/health/peptide-reconstitution/' },
  'simplify calculator': { code: 'B', url: '/utilities/ratio-simplifier/' },
  'fv calculator': { code: 'B', url: '/finance/future-value/' },
  'dob calculator': { code: 'B', url: '/utilities/age-exact/' },
  'open calculator': { code: 'E' },
  'smart calculator': { code: 'E' },
  'downloadable calculator': { code: 'E' },
  'show calculator': { code: 'E' },
  'google math calculator': { code: 'E' },
  'calculator that prints': { code: 'E' }
};

function loadMap() {
  return JSON.parse(fs.readFileSync(MAP, 'utf8'));
}

function sitemapPaths() {
  const xml = fs.readFileSync(path.join(ROOT, 'deploy', 'sitemap.xml'), 'utf8');
  return new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].replace(/^https?:\/\/[^/]+/, '').replace(/\/+$/, '') || '/'));
}

describe('keyword implementation map — decisions', () => {
  it('leaves no unresolved code-A candidate', () => {
    const map = loadMap();
    const stillA = map.decisions.filter((d) => d.code === 'A');
    expect(stillA.map((d) => d.keyword)).toEqual([]);
    expect(map.totals.decisions.A).toBe(0);
  });

  it('resolves all ten formerly-A rows with a recorded reason', () => {
    const map = loadMap();
    for (const [keyword, expected] of Object.entries(RESOLVED)) {
      const row = map.decisions.find((d) => d.keyword === keyword);
      expect(row, keyword + ' must still be in the map').toBeTruthy();
      expect(row.code, keyword + ' code').toBe(expected.code);
      // A decision without a stated reason is not auditable.
      expect(typeof row.why, keyword + ' why').toBe('string');
      expect(row.why.length, keyword + ' why length').toBeGreaterThan(30);
    }
  });

  it('points every B-row target at a page that actually ships', () => {
    const map = loadMap();
    const live = sitemapPaths();
    const broken = [];
    for (const d of map.decisions) {
      if (d.code !== 'B') continue;
      const url = String(d.proposedUrl || '').replace(/\/+$/, '');
      if (!url) continue;
      if (!live.has(url)) broken.push(d.keyword + ' -> ' + d.proposedUrl);
    }
    expect(broken).toEqual([]);
  });

  it('keeps the four formerly-A B-rows on their verified live pages', () => {
    const map = loadMap();
    const live = sitemapPaths();
    for (const [keyword, expected] of Object.entries(RESOLVED)) {
      if (expected.code !== 'B') continue;
      const row = map.decisions.find((d) => d.keyword === keyword);
      expect(row.proposedUrl.replace(/\/+$/, ''), keyword).toBe(expected.url.replace(/\/+$/, ''));
      expect(live.has(expected.url.replace(/\/+$/, '')), keyword + ' target must be in the sitemap').toBe(true);
    }
  });

  it('never proposes a URL for an E (no-build) row', () => {
    const map = loadMap();
    const withUrl = map.decisions.filter((d) => d.code === 'E' && d.proposedUrl);
    expect(withUrl.map((d) => d.keyword)).toEqual([]);
  });

  it('gives every P1 row a target page (no P1 item without a destination)', () => {
    const map = loadMap();
    const p1 = map.decisions.filter((d) => d.priority === 'P1');
    expect(p1.length).toBeGreaterThan(0);
    // A P1 row with no URL is an action nobody can take. The two branded currency
    // rows used to cluster to D with no page; they now map to the live converter.
    expect(p1.filter((d) => !d.proposedUrl).map((d) => d.keyword)).toEqual([]);
  });

  it('accounts for every actionable row exactly once', () => {
    const map = loadMap();
    const { A, B, C, D, E } = map.totals.decisions;
    expect(A + B + C + D + E).toBe(map.decisions.length);
    expect(map.decisions.length).toBe(map.totals.opportunities);
  });

  it('renders the same decision set in the committed doc (no A rows show a build order)', () => {
    const doc = fs.readFileSync(DOC, 'utf8');
    // The one-row-per-intent table carries the code column; an A row there means a
    // page was requested that no evidence supports.
    const codeRows = [...doc.matchAll(/\|\s*P[123]\s*\|\s*([A-E])\s*\|/g)].map((m) => m[1]);
    expect(codeRows.length).toBeGreaterThan(0);
    expect(codeRows.filter((c) => c === 'A')).toEqual([]);
  });
});
