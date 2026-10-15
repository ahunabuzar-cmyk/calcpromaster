import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const S = require('../../scripts/apply-guide-depth.cjs');
const GD = require('../../js/guide-depth.js');

const ROOT = path.join(process.cwd());
const page = (extra) =>
  '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <title>Business Guides</title>\n  <style>\n    h2 { margin: 0; }\n  </style>\n</head>\n<body>\n' +
  '  <h1>Business Guides</h1>\n  <p>The intro paragraph.</p>\n' +
  '  <h2>How the math works</h2>\n  <p>Body copy.</p>\n' +
  (extra || '') +
  '  <h2>Try the matching calculators</h2>\n  <p><a href="/finance/break-even/">Break-Even</a></p>\n</body>\n</html>\n';

describe('apply-guide-depth', () => {
  it('injects the lede, pitfalls, FAQ and FAQPage schema', () => {
    const out = S.applyTo(page(), 'business');
    expect(out).toContain('<!-- guide-lede:start -->');
    expect(out).toContain('<!-- guide-depth:start -->');
    expect(out).toContain('<!-- guide-faq-schema:start -->');
    expect(out).toContain('/* guide-depth-css:start */');
    expect(out).toContain('class="guide-lede"');
    expect(out).toContain('<h2>Where these answers go wrong</h2>');
    expect(out).toContain('<h2>Frequently asked questions</h2>');
    expect(out).toContain('"@type": "FAQPage"');
    expect(S.isApplied(out)).toBe(true);
  });

  it('places the lede before the first subheading and the depth block before the CTA', () => {
    const out = S.applyTo(page(), 'business');
    expect(out.indexOf('guide-lede:start')).toBeLessThan(out.indexOf('<h2>How'));
    expect(out.indexOf('guide-depth:start')).toBeLessThan(out.indexOf('Try the matching calculators'));
  });

  it('is idempotent — applying twice leaves the file byte-identical', () => {
    const once = S.applyTo(page(), 'business');
    const twice = S.applyTo(once, 'business');
    expect(twice).toBe(once);
  });

  it('is idempotent on the real guide pages on disk', () => {
    for (const name of Object.keys(GD.GUIDES)) {
      const file = path.join(ROOT, 'guides', name + '.html');
      const html = fs.readFileSync(file, 'utf8');
      expect(S.isApplied(html), name).toBe(true);
      expect(S.applyTo(html, name), name).toBe(html);
    }
  });

  it('preserves a keyword-target FAQ injected inside its own block', () => {
    // apply-keyword-targets.cjs answers a B/C/D keyword by inserting its pair right
    // after the FAQ heading this script writes, i.e. inside this script's block.
    // Regenerating must not delete it (that was the guides/career.html staleness).
    const injected =
      '<h3>Can I use this page for &quot;paycheck deduction calculator&quot;?</h3>\n' +
      '<p>Yes — this guide answers the question.</p>\n';
    const once = S.applyTo(page(), 'business');
    const withKw = once.replace(/(<h2>Frequently asked questions<\/h2>)/, '$1' + injected);
    expect(withKw).toContain(injected);
    expect(S.captureInjectedFaq(withKw)).toBe(injected);
    const again = S.applyTo(withKw, 'business');
    expect(again).toContain(injected);
    expect(again).toBe(withKw);
  });

  it('falls back to </body> when the CTA anchor is missing', () => {
    const noCta = page().replace(/<h2[^>]*>\s*Try the matching calculators\s*<\/h2>/i, '<h2>Other tools</h2>');
    const out = S.applyTo(noCta, 'auto');
    expect(out).toContain('<h2>Where these answers go wrong</h2>');
    expect(out.indexOf('guide-depth:start')).toBeLessThan(out.indexOf('</body>'));
  });

  it('writes nothing for an unknown guide', () => {
    expect(GD.ledeHtml('not-a-guide')).toBe('');
    expect(GD.depthHtml('not-a-guide')).toBe('');
    expect(GD.faqSchema('not-a-guide')).toBeNull();
  });

  it('counts visible words only', () => {
    const html = '<style>a{b:c}</style><script>var x = 1;</script><p>one two three</p><!-- note -->';
    expect(S.wordsOf(html)).toBe(3);
  });

  it('strips its own block without eating neighbouring markup', () => {
    const out = S.applyTo(page(), 'business');
    const back = S.stripBlock(out, S.MARK.css);
    expect(back).toContain('h2 { margin: 0; }');
    expect(back).not.toContain('guide-depth-css:start');
    expect(back).toContain('</style>');
  });
});
