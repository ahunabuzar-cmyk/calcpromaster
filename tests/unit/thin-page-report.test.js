import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const T = require('../../scripts/thin-page-report.cjs');

const small = (body) => '<!DOCTYPE html><html><head><title>t</title></head><body>' + body + '</body></html>';

describe('thin-page-report', () => {
  it('counts visible words only', () => {
    expect(T.visibleWords('<style>a{b:c}</style><script>var a=1;</script><p>one two three</p><!-- x -->')).toBe(3);
    expect(T.visibleWords('<p>alpha &amp; beta</p>')).toBe(2); // entity collapses to whitespace
    expect(T.visibleWords('')).toBe(0);
  });

  it('treats only real HTML documents as pages', () => {
    expect(T.isHtmlDoc('<!DOCTYPE html><html></html>')).toBe(true);
    expect(T.isHtmlDoc('<html lang="en">')).toBe(true);
    expect(T.isHtmlDoc('google-site-verification: abc.html')).toBe(false);
  });

  it('detects a noindex robots meta', () => {
    expect(T.isNoindex('<meta name="robots" content="noindex, follow">')).toBe(true);
    expect(T.isNoindex('<meta name="robots" content="index, follow">')).toBe(false);
    expect(T.isNoindex('<meta content="noindex" name="robots">')).toBe(true);
  });

  it('excludes documented short-by-design pages with or without .html', () => {
    for (const p of ['/contact', '/contact.html', '/privacy', '/privacy.html', '/terms.html', '/cookies', '/editorial-policy', '/disclaimer-finance.html']) {
      expect(T.isExcludedPath(p), p).toBe(true);
    }
    for (const p of ['/guides/tip.html', '/finance/emi/', '/blog/', '/editorial-policy-notes']) {
      expect(T.isExcludedPath(p), p).toBe(false);
    }
  });

  it('excludes the Google verification file and noindex pages, keeps real content', () => {
    expect(T.classify('/googled1ac20b54b36e7cf.html', 'google-site-verification: x')).toBeNull();
    expect(T.classify('/cookies.html', small('<meta name="robots" content="noindex"><p>hi</p>'))).toBeNull();
    expect(T.classify('/history/', small('<meta content="noindex,follow" name="robots"><p>hi</p>'))).toBeNull();
    const row = T.classify('/guides/tip.html', small('<h2>FAQ</h2><p>' + 'word '.repeat(40) + '</p>'), { threshold: 500 });
    expect(row.path).toBe('/guides/tip.html');
    expect(row.words).toBeGreaterThan(30);
    expect(row.thin).toBe(true);
  });

  it('separates bare thin pages from focused guides', () => {
    const bare = T.classify('/x.html', small('<p>' + 'word '.repeat(10) + '</p>'), { threshold: 500 });
    expect(bare.shape).toBe('bare');
    const focused = T.classify('/y.html', small('<h2>How it works</h2><h2>Frequently asked questions</h2><p>' + 'word '.repeat(10) + '</p>'), { threshold: 500 });
    expect(focused.shape).toBe('focused');
    const ok = T.classify('/z.html', small('<p>' + 'word '.repeat(600) + '</p>'), { threshold: 500 });
    expect(ok.shape).toBe('ok');
  });

  it('summarizes thinnest-first and counts bare pages', () => {
    const rows = [
      { path: '/b.html', words: 300, thin: true, shape: 'bare' },
      { path: '/a.html', words: 400, thin: true, shape: 'focused' },
      { path: '/c.html', words: 900, thin: false, shape: 'ok' }
    ];
    const rep = T.summarize(rows, 500);
    expect(rep.pages).toBe(3);
    expect(rep.thin).toBe(2);
    expect(rep.bare).toBe(1);
    expect(rep.thinnest).toBe(300);
    expect(rep.rows.map((r) => r.path)).toEqual(['/b.html', '/a.html']);
  });

  it('resolves internal hrefs to real page keys for inlink counts', () => {
    const pages = {
      '/guides/tip.html': '',
      '/finance/emi/': '',
      '/': ''
    };
    const counts = T.buildInlinks({
      ...pages,
      '/a.html': '<a href="/guides/tip">t</a><a href="/finance/emi/">e</a><a href="/guides/tip#x">dup</a><a href="https://example.com/out">out</a><a href="/">home</a>',
      '/b.html': '<a href="/guides/tip">t</a>'
    });
    expect(counts['/guides/tip.html']).toBe(2);
    expect(counts['/finance/emi/']).toBe(1);
    expect(counts['/']).toBe(1);
    expect(Object.keys(counts)).not.toContain('/out');
  });
});
