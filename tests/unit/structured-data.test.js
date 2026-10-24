import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { extractBlocks, findBadEscapes, checkBlock } = require('../../scripts/check-structured-data.cjs');

describe('extractBlocks — every JSON-LD variant must be found', () => {
  it('matches the standard attribute form', () => {
    const html = '<script type="application/ld+json">{"@type":"Thing"}</script>';
    expect(extractBlocks(html)).toEqual(['{"@type":"Thing"}']);
  });

  it('matches single quotes, extra attributes and different attribute order', () => {
    const html = [
      `<script id="faq" type='application/ld+json'>{"a":1}</script>`,
      `<script data-x="1" type="application/ld+json" id="b">{"b":2}</script>`,
    ].join('');
    expect(extractBlocks(html)).toHaveLength(2);
  });

  it('ignores scripts that are not JSON-LD', () => {
    const html = '<script type="application/javascript">var a = 1;</script><script>2</script>';
    expect(extractBlocks(html)).toEqual([]);
  });

  it('finds multiple blocks in one document, in order', () => {
    const html = '<script type="application/ld+json">{"i":1}</script><script type="application/ld+json">{"i":2}</script>';
    expect(extractBlocks(html)).toEqual(['{"i":1}', '{"i":2}']);
  });
});

describe('checkBlock — what Search Console calls "Bad escape sequence in string"', () => {
  it('accepts a block with legal escapes', () => {
    // Exactly what JSON.stringify emits for quotes, unicode, newlines and a backslash.
    expect(checkBlock(JSON.stringify({ text: 'say "hi" — 50% \\ ok' })).ok).toBe(true);
    expect(checkBlock('{"text":"a \\"quoted\\" word \\u00e9 \\n \\\\"}').ok).toBe(true);
  });

  it('fails an escape that is not a JSON escape (the reported bug)', () => {
    // A literal backslash before a character that JSON does not allow to follow it.
    const res = checkBlock('{"text":"40\\–50"}');
    expect(res.ok).toBe(false);
    expect(res.badEscapes).toContain('\\–');
    expect(res.reason).toBe('not a JSON escape');
  });

  it('fails an unescaped Windows path', () => {
    const res = checkBlock('{"text":"C:\\Users\\me"}');
    expect(res.ok).toBe(false);
    expect(res.badEscapes.some((s) => s.startsWith('\\U'))).toBe(true);
  });

  it('fails a lone surrogate — a truncated emoji', () => {
    const res = checkBlock('{"text":"a \\ud83d b"}');
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('lone surrogate');
  });

  it('fails a raw control character inside a string', () => {
    const res = checkBlock('{"text":"line1\nline2"}');
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('raw control character in string');
  });

  it('fails a truncated \\u escape', () => {
    const res = checkBlock('{"text":"\\u12"}');
    expect(res.ok).toBe(false);
  });

  it('points at the offending text so the fix is obvious', () => {
    const res = checkBlock('{"@type":"FAQPage","mainEntity":{"text":"tip 15\\–20%"}}');
    expect(res.ok).toBe(false);
    expect(res.snippet).toContain('15\\–20%');
  });
});

describe('findBadEscapes — legal escapes are not flagged', () => {
  it('allows \\" \\\\ \\/ \\b \\f \\n \\r \\t and \\uXXXX', () => {
    expect(findBadEscapes('{"a":"\\\\ \\/ \\b \\f \\n \\r \\t \\u00e9 \\"x\\""}')).toEqual([]);
  });

  it('flags \\ followed by anything else', () => {
    const seqs = findBadEscapes('{"a":"\\% \\x \\q"}').map((b) => b.seq);
    expect(seqs).toEqual(['\\%', '\\x', '\\q']);
  });
});
