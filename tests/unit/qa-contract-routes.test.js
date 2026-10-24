// ============================================================
// QA contract routes must resolve
//
// docs/qa-contracts.json records, for every calculator, the page its formula
// lives on. That route is what a reviewer opens to check the maths, so a stale
// path (category renames left /auto-transport/... and /home-garden/... behind)
// silently breaks the traceability the file exists for. Measured 2026-10-18:
// 336 of 1285 routes pointed nowhere; repaired by scripts/fix-qa-contract-routes.cjs.
//
// The check runs against the built sitemap, which is the same ground truth the
// quality gate uses. If deploy/ has not been built yet the test says so instead of
// passing silently.
// ============================================================
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const SITEMAP = path.join(ROOT, 'deploy', 'sitemap.xml');
const CONTRACTS = path.join(ROOT, 'docs', 'qa-contracts.json');

function sitemapPaths() {
  const xml = fs.readFileSync(SITEMAP, 'utf8');
  return new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].replace(/^https?:\/\/[^/]+/, '').replace(/\/+$/, '') || '/'));
}

describe('qa-contracts.json routes', () => {
  const built = fs.existsSync(SITEMAP);

  it('has a built sitemap to check against', () => {
    // Not a pass-by-default: be explicit when the artifact is missing.
    expect(built, 'run `node build-deploy.js` before this test — deploy/sitemap.xml is the ground truth').toBe(true);
  });

  it('every contract route exists in the sitemap (no 404/redirect targets)', () => {
    if (!built) return; // the first test already failed loudly
    const valid = sitemapPaths();
    const doc = JSON.parse(fs.readFileSync(CONTRACTS, 'utf8'));
    const contracts = Array.isArray(doc) ? doc : (doc.contracts || doc.calculators || []);
    const bad = contracts
      .filter((c) => c.route)
      .map((c) => ({ id: c.calculatorId || c.id, route: String(c.route).replace(/\/+$/, '') }))
      .filter((c) => !valid.has(c.route))
      .map((c) => c.id + ' → ' + c.route);
    expect(bad).toEqual([]);
  });

  it('every contract carries the fields a reviewer needs', () => {
    const doc = JSON.parse(fs.readFileSync(CONTRACTS, 'utf8'));
    const contracts = Array.isArray(doc) ? doc : (doc.contracts || doc.calculators || []);
    // `inputs` and `knownAnswerTestCases` may legitimately be empty for a
    // NOT APPLICABLE record — /math/scientific is a custom UI with no calc()
    // function, so there is no formula to pin. Anything else must be complete.
    const incomplete = (c) => {
      if (!c.calculatorId || !c.route || !c.formula || !c.verificationStatus) return true;
      if (c.verificationStatus === 'NOT APPLICABLE') return false;
      return !c.inputs || !c.knownAnswerTestCases;
    };
    const missing = contracts.filter(incomplete).map((c) => c.calculatorId || '(no id)');
    expect(missing).toEqual([]);
  });
});
