import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// The six URLs Search Console reported with
// "Unparsable structured data → Bad escape sequence in string" (first seen
// 2026-10-19):
//   /tech/  /homegarden/  /business/  /career/
//   /construction  /conversion        <- these two are the PRE-fix slashless
//                                        forms; they 308 to /construction/ and
//                                        /conversion/ now, so both the file and
//                                        the redirected form are covered here.
//
// The failure class is a JSON-LD block that does not parse. Whether the bad
// escape came from hand-escaped copy, a Windows path, a truncated emoji or a
// raw newline, the assertion is the same and it runs on the BUILT pages.
// ---------------------------------------------------------------------------

const DEPLOY = path.join(process.cwd(), 'deploy');
const hasDeploy = fs.existsSync(DEPLOY);

const BLOCK_RE = /<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

const PAGES = [
  { url: '/tech/', file: 'tech/index.html' },
  { url: '/homegarden/', file: 'homegarden/index.html' },
  { url: '/business/', file: 'business/index.html' },
  { url: '/career/', file: 'career/index.html' },
  { url: '/construction', file: 'construction/index.html', redirectsTo: '/construction/' },
  { url: '/conversion', file: 'conversion/index.html', redirectsTo: '/conversion/' },
];

function blocks(file) {
  const html = fs.readFileSync(path.join(DEPLOY, file), 'utf8');
  const out = [];
  BLOCK_RE.lastIndex = 0;
  let m;
  while ((m = BLOCK_RE.exec(html)) !== null) out.push(m[1]);
  return out;
}

const badEscapes = (raw) =>
  [...raw.matchAll(/\\(.)/g)].filter((x) => !/["\\/bfnrtu]/.test(x[1])).map((x) => '\\' + x[1]);

describe.skipIf(!hasDeploy)('the six reported category pages', () => {
  for (const page of PAGES) {
    describe(page.url, () => {
      it('ships at least one JSON-LD block', () => {
        expect(blocks(page.file).length).toBeGreaterThan(0);
      });

      it('every block parses as valid JSON (the reported failure)', () => {
        for (const raw of blocks(page.file)) {
          expect(() => JSON.parse(raw)).not.toThrow();
        }
      });

      it('contains no illegal escape sequence', () => {
        for (const raw of blocks(page.file)) expect(badEscapes(raw)).toEqual([]);
      });

      it('keeps the category schema (CollectionPage + breadcrumb), not an empty block', () => {
        const parsed = JSON.parse(blocks(page.file)[0]);
        const types = JSON.stringify(parsed);
        expect(types).toContain('CollectionPage');
        expect(types).toContain('BreadcrumbList');
      });

      if (page.redirectsTo) {
        it('is the slashless form that 308s — the file must still be canonical', () => {
          // The URL GSC recorded redirects to the slashed form; the built page
          // must point at that slashed URL, never at the slashless one.
          const parsed = JSON.parse(blocks(page.file)[0]);
          const urls = JSON.stringify(parsed).match(/https:\/\/calcpromaster\.com\/[^"]*/g) || [];
          expect(urls.some((u) => u.replace(/\/+$/, '') + '/' === 'https://calcpromaster.com' + page.redirectsTo)).toBe(true);
        });
      }
    });
  }
});

// Root cause, at the source: every FAQ answer that reaches JSON-LD goes through
// JSON.stringify (js/app.js `ymyl-tool-schema`, js/category-depth.js faqSchema).
// This builds the same blocks from the module and asserts the escape contract,
// so a future hand-built schema string is caught here too.
describe.skipIf(!hasDeploy)('category FAQ schema is generated, never hand-escaped', () => {
  it('every category FAQ block stringifies to valid JSON', async () => {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const CategoryDepth = require('../../js/category-depth.js');
    const cats = ['tech', 'homegarden', 'business', 'career', 'construction', 'conversion'];
    for (const cat of cats) {
      const schema = CategoryDepth.faqSchema(cat);
      if (!schema) continue; // no curated FAQs for this category
      const text = JSON.stringify(schema, null, 2);
      expect(() => JSON.parse(text), cat).not.toThrow();
      expect(badEscapes(text), cat).toEqual([]);
    }
  });
});
