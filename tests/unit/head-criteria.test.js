import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { criteria, servedPath, decodeEntities, auditHtml, isIndexable, SITE } = require('../../scripts/audit-head-criteria.cjs');

// A page that passes all ten criteria for a directory-style URL.
function goodPage(url = SITE + '/finance/tax/', keywords = 'income tax calculator, tax slab') {
  return `<!doctype html><html lang="en"><head>
<title>Income Tax Calculator: Slab Rate and Take-Home Pay</title>
<meta name="description" content="Estimate income tax by slab, deduction and rebate, then see take-home pay month by month. Try the calculator with your own numbers.">
<link rel="canonical" href="${url}">
<meta name="keywords" content="${keywords}">
<script type="application/ld+json">{"@type":"WebPage","dateModified":"2026-10-17"}</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-8QCP0TP1TD"></script>
</head><body><main><p class="tool-reviewed">Reviewed <time datetime="2026-10-17">October 2026</time></p></main></body></html>`;
}

const ctx = { homeKeywords: 'calculators, free online calculators' };

describe('audit-head-criteria / servedPath', () => {
  it('maps directory pages to a trailing-slash URL', () => {
    expect(servedPath('finance/tax/index.html')).toBe('/finance/tax/');
  });

  it('maps the homepage to /', () => {
    expect(servedPath('index.html')).toBe('/');
  });

  it('maps flat .html pages to their pretty URL', () => {
    expect(servedPath(path.join('guides', 'age.html'))).toBe('/guides/age');
  });
});

describe('audit-head-criteria / criteria', () => {
  it('passes a page that meets every criterion', () => {
    const url = SITE + '/finance/tax/';
    expect(auditHtml(goodPage(url), 'finance/tax/index.html', ctx).failed).toEqual([]);
  });

  it('counts entities as one display character', () => {
    expect(decodeEntities('A &amp; B &#39;quote&#39;')).toBe("A & B 'quote'");
    expect(criteria.title30to60.test('<title>Tax &amp; Pay Calculator: Slab Rates 2026</title>')).toBe(true);
  });

  it('rejects a title outside 30-60 characters', () => {
    expect(criteria.title30to60.test('<title>Tax</title>')).toBe(false);
    expect(criteria.title30to60.test('<title>' + 'x'.repeat(61) + '</title>')).toBe(false);
  });

  it('rejects a description without a call to action', () => {
    const html = goodPage().replace(
      /<meta name="description"[^>]*>/,
      '<meta name="description" content="Income tax slabs for the current year, with the rates and the rebate thresholds that apply to each one, listed in a table for reference only.">'
    );
    expect(criteria.descCTA.test(html)).toBe(false);
  });

  it('requires exactly one canonical and the served URL', () => {
    const url = SITE + '/finance/tax/';
    expect(criteria.canonicalServed.test(goodPage(url), 'finance/tax/index.html')).toBe(true);
    const duplicated = goodPage(url).replace('</head>', `<link rel="canonical" href="${url}"></head>`);
    expect(criteria.canonicalServed.test(duplicated, 'finance/tax/index.html')).toBe(false);
    expect(criteria.canonicalServed.test(goodPage(SITE + '/finance/tax'), 'finance/tax/index.html')).toBe(false);
  });

  it('requires keywords that differ from the homepage list', () => {
    expect(criteria.keywordsPageSpecific.test(goodPage(SITE + '/finance/tax/', ctx.homeKeywords), 'finance/tax/index.html', ctx)).toBe(false);
    expect(criteria.keywordsPageSpecific.test(goodPage(), 'finance/tax/index.html', ctx)).toBe(true);
    // The homepage is allowed to keep the broad list.
    expect(criteria.keywordsPageSpecific.test(goodPage(SITE + '/', ctx.homeKeywords), 'index.html', ctx)).toBe(true);
  });

  it('rejects inline handlers and HTML comments', () => {
    expect(criteria.noInlineHandlers.test('<img onerror="this.remove()">')).toBe(false);
    expect(criteria.noInlineHandlers.test('<img data-onerror="x">')).toBe(true);
    expect(criteria.noComments.test('<div><!-- note --></div>')).toBe(false);
  });

  it('rejects a second GA4 property', () => {
    expect(criteria.singleGA4.test('<script>G-8QCP0TP1TD</script><script>G-ABC1234567</script>')).toBe(false);
    expect(criteria.singleGA4.test('<script>G-8QCP0TP1TD</script>')).toBe(true);
  });

  it('requires both machine-readable and visible dates', () => {
    expect(criteria.jsonLdDates.test('<script>{"dateModified":"2026-10-17"}</script>')).toBe(true);
    expect(criteria.jsonLdDates.test('<script>{"datePublished":"2025-01-15"}</script>')).toBe(false);
    expect(criteria.visibleTime.test('<time datetime="2026-10-17">October 2026</time>')).toBe(true);
    expect(criteria.visibleTime.test('Last updated October 2026')).toBe(false);
  });

  it('audits every criterion and names each failure', () => {
    const bare = '<html><head><title>Tax</title></head><body></body></html>';
    const { failed } = auditHtml(bare, 'finance/tax/index.html', ctx);
    expect(failed).toEqual(expect.arrayContaining(['title30to60', 'descCTA', 'canonicalServed', 'jsonLdDates', 'visibleTime']));
  });

  it('excludes noindex pages in either attribute order', () => {
    expect(isIndexable('<meta name="robots" content="noindex, follow">')).toBe(false);
    expect(isIndexable('<meta content="noindex, follow" name="robots">')).toBe(false);
    expect(isIndexable('<meta name="robots" content="index, follow">')).toBe(true);
  });
});
