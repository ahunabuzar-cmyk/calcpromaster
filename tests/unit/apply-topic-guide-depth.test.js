import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const S = require('../../scripts/apply-topic-guide-depth.cjs');
const TD = require('../../js/topic-guide-depth.js');

const ROOT = path.join(process.cwd());

// Minimal topic-guide shell: one body section, a FAQ section and the closing
// related row the injector anchors on.
const page = () =>
  '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <title>Room Area</title>\n' +
  '  <script type="application/ld+json">\n  {\n    "@context": "https://schema.org",\n    "@type": "Article",\n' +
  '    "headline": "Room Area",\n    "mainEntity": {\n      "@type": "FAQPage",\n      "mainEntity": [\n' +
  '        { "@type": "Question", "name": "Q1", "acceptedAnswer": { "@type": "Answer", "text": "A1" } }\n' +
  '      ]\n    }\n  }\n  </script>\n</head>\n<body>\n' +
  '  <h1>Room Area</h1>\n  <h2>The shapes that cover real floors</h2>\n  <p>Body copy.</p>\n' +
  '  <h2>Frequently asked questions</h2>\n' +
  '  <h3>Q1</h3>\n  <p>A1</p>\n' +
  '  <p class="related"><a href="/guides/">← All guides</a></p>\n</body>\n</html>\n';

describe('apply-topic-guide-depth', () => {
  it('injects the sections and the extra FAQs', () => {
    const out = S.applyTo(page(), 'room-area');
    expect(out).toContain('<!-- topic-depth:start -->');
    expect(out).toContain('<!-- topic-faq:start -->');
    expect(out).toContain('<h2>Worked example: tape measure to tile order</h2>');
    expect(out).toContain('<h3>How many tiles do I need for 166 sq ft?</h3>');
    expect(S.isApplied(out)).toBe(true);
  });

  it('places the sections above the FAQ heading and the FAQs inside the FAQ section', () => {
    const out = S.applyTo(page(), 'room-area');
    expect(out.indexOf('topic-depth:start')).toBeLessThan(out.indexOf('Frequently asked questions'));
    expect(out.indexOf('topic-faq:start')).toBeGreaterThan(out.indexOf('Frequently asked questions'));
    expect(out.indexOf('topic-faq:end')).toBeLessThan(out.indexOf('<p class="related">'));
  });

  it('rebuilds the FAQPage schema from the visible questions', () => {
    const out = S.applyTo(page(), 'room-area');
    const block = out.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
    const ld = JSON.parse(block);
    expect(ld.mainEntity['@type']).toBe('FAQPage');
    expect(ld.mainEntity.mainEntity).toHaveLength(4); // Q1 + 3 injected
    expect(ld.mainEntity.mainEntity[3].name).toBe('How many tiles do I need for 166 sq ft?');
    // the rest of the node must survive untouched
    expect(ld['@type']).toBe('Article');
    expect(ld.headline).toBe('Room Area');
  });

  it('is idempotent — applying twice leaves the file byte-identical', () => {
    const once = S.applyTo(page(), 'room-area');
    expect(S.applyTo(once, 'room-area')).toBe(once);
  });

  it('is idempotent on the real guides on disk and keeps FAQ schema in sync', () => {
    for (const slug of Object.keys(TD.GUIDES)) {
      const html = fs.readFileSync(path.join(ROOT, 'guides', slug + '.html'), 'utf8');
      expect(S.isApplied(html), slug).toBe(true);
      expect(S.applyTo(html, slug), slug).toBe(html);
      const block = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
      const visible = S.visibleFaqs(html);
      expect(JSON.parse(block).mainEntity.mainEntity).toHaveLength(visible.length);
    }
  });

  it('every injected guide clears the thin-page threshold on its own', () => {
    for (const slug of Object.keys(TD.GUIDES)) {
      const html = fs.readFileSync(path.join(ROOT, 'guides', slug + '.html'), 'utf8');
      expect(S.wordsOf(html), slug).toBeGreaterThanOrEqual(700);
    }
  });

  it('falls back to </body> when the tail anchor is missing', () => {
    const noTail = page().replace(/<p class="related">[\s\S]*?<\/p>/, '');
    const out = S.applyTo(noTail, 'gear-ratio');
    expect(out).toContain('<h3>How do I get exactly 400 rpm from a 1,500 rpm motor?</h3>');
    expect(out.indexOf('topic-faq:end')).toBeLessThan(out.indexOf('</body>'));
  });

  it('leaves the page untouched when it has no FAQPage node', () => {
    const noSchema = page().replace(/"mainEntity": \{[\s\S]*?\n    \}/, '"inLanguage": "en"');
    expect(S.rebuildFaqSchema(noSchema, [{ q: 'a', a: 'b' }])).toBeNull();
    expect(S.applyTo(noSchema, 'gear-ratio')).toContain('topic-depth:start');
  });

  it('decodes entities and strips tags when reading visible FAQs', () => {
    const html = '<body><h3>How much is 5 &lt; 6 &amp; 7?</h3><p>Use <strong>0.98</strong> × it.</p></body>';
    expect(S.visibleFaqs(html)).toEqual([{ q: 'How much is 5 < 6 & 7?', a: 'Use 0.98 × it.' }]);
  });

  it('counts visible words only', () => {
    const html = '<style>a{b:c}</style><script>var x = 1;</script><p>one two three</p><!-- note -->';
    expect(S.wordsOf(html)).toBe(3);
  });

  it('strips its own block without eating neighbouring markup', () => {
    const out = S.applyTo(page(), 'room-area');
    const back = S.stripBlock(out, S.MARK.sections);
    expect(back).toContain('<h2>The shapes that cover real floors</h2>');
    expect(back).not.toContain('topic-depth:start');
    expect(back).toContain('<h2>Frequently asked questions</h2>');
  });
});
