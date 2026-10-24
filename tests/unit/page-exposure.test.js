import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  EXPOSE_SHARE, wordOffset, firstMentionOffset, rawSignalWordOffset, stripEnhanceCard,
  measureExposure, measurePage, compareExposure,
} = require('../../scripts/measure-page-exposure.cjs');

const BODY = 'word '.repeat(300);

describe('page exposure / wordOffset', () => {
  it('counts the words before a character index', () => {
    expect(wordOffset('one two three four', 8)).toBe(2);
    expect(wordOffset('one two three four', 0)).toBe(0);
  });

  it('returns null for a missing index instead of faking a zero', () => {
    expect(wordOffset('one two', -1)).toBeNull();
    expect(wordOffset('one two', null)).toBeNull();
    expect(wordOffset('one two', undefined)).toBeNull();
  });
});

describe('page exposure / firstMentionOffset', () => {
  it('finds the first mention and its word depth', () => {
    const text = 'alpha beta formula gamma';
    expect(firstMentionOffset(text, /formula/)).toBe(2);
  });

  it('returns null when the bucket wording is absent', () => {
    expect(firstMentionOffset('alpha beta', /formula/)).toBeNull();
    expect(firstMentionOffset('alpha', null)).toBeNull();
  });
});

describe('page exposure / rawSignalWordOffset', () => {
  it('measures a raw-HTML signal in visible words — tags are not words', () => {
    const html = '<h2>Title here</h2><p>more words</p><table><tr><td>x</td></tr></table>';
    expect(rawSignalWordOffset(html, /<table[\s>]/i)).toBe(4);
  });

  it('returns null when the raw signal is missing', () => {
    expect(rawSignalWordOffset('<p>no table</p>', /<table[\s>]/i)).toBeNull();
  });
});

describe('page exposure / stripEnhanceCard', () => {
  const CARD = '<div class="explain-card tool-enhance"><h2>How it is calculated</h2>' +
    '<p>Formula: a = b &times; c</p><table><tr><td>1</td></tr></table></div>';

  it('removes exactly the enhancement card and nothing else', () => {
    const html = '<div class="explain-card seo-guide">guide</div>' + CARD + '<div class="explain-card seo-guide">faq</div>';
    const out = stripEnhanceCard(html);
    expect(out.removed).toBe(true);
    expect(out.html).not.toContain('tool-enhance');
    expect(out.html).toContain('guide');
    expect(out.html).toContain('faq');
  });

  it('walks nested divs so it cannot cut the page in half', () => {
    const nested = '<div class="explain-card tool-enhance"><div class="wrap"><p>deep</p></div><p>tail</p></div><p>after</p>';
    const out = stripEnhanceCard(nested);
    expect(out.removed).toBe(true);
    expect(out.html).toBe('<p>after</p>');
  });

  it('changes nothing when the page has no enhancement card', () => {
    const html = '<div class="explain-card seo-guide">guide</div>';
    const out = stripEnhanceCard(html);
    expect(out.removed).toBe(false);
    expect(out.html).toBe(html);
  });

  it('never mangles markup it cannot parse — unbalanced div returns input', () => {
    const broken = '<div class="explain-card tool-enhance"><p>never closed';
    const out = stripEnhanceCard(broken);
    expect(out.removed).toBe(false);
    expect(out.html).toBe(broken);
  });
});

describe('page exposure / measureExposure', () => {
  it('measures depth, share and the exposed/buried split', () => {
    const html = '<h1>PMI Calculator</h1><p>how is it calculated</p>' + BODY +
      '<table><tr><td>x</td></tr></table>';
    const m = measureExposure(html);
    // 6 words of heading/intro + the 300-word body sit before the <table>.
    expect(m.words).toBeGreaterThan(300);
    expect(m.depths.table).toBe(306);
    expect(m.exposed).toContain('question');
    expect(m.depthShare.table).toBeGreaterThan(EXPOSE_SHARE);
    expect(m.buried).toContain('table');
  });

  it('leaves a missing bucket at null depth — no fabricated position', () => {
    const m = measureExposure('<p>' + BODY + '</p>');
    expect(m.depths.table).toBeNull();
    expect(m.depthShare.table).toBeNull();
    expect(m.present).not.toContain('table');
    expect(m.missing).toContain('table');
  });

  it('counts the tables and records the FAQ offset', () => {
    const html = '<p>' + BODY + '</p><table><tr><td>1</td></tr></table>' +
      '<h2>Frequently asked questions</h2>';
    const m = measureExposure(html);
    // 300 body words + the "1" inside the table cell = the FAQ heading starts at word 301.
    expect(m.tableCount).toBe(1);
    expect(m.faqOffset).toBe(301);
  });

  it('reports zero words for an empty page without throwing', () => {
    const m = measureExposure('');
    expect(m.words).toBe(0);
    expect(m.coverage).toBe(0);
  });
});

describe('page exposure / measurePage', () => {
  const CARD = '<div class="explain-card tool-enhance"><h2>How it is calculated</h2>' +
    '<table><tr><td>1</td></tr></table></div>';

  it('proves what the enhancement section creates: coverage without it, and with it', () => {
    const html = '<div class="explain-card seo-guide">' + BODY + '</div>' + CARD;
    const m = measurePage(html);
    expect(m.enhanceRemoved).toBe(true);
    expect(m.withoutEnhance.missing).toContain('table');
    expect(m.withEnhance.present).toContain('table');
  });

  it('does not claim a coverage gain when the page has no enhancement card', () => {
    const m = measurePage('<div class="explain-card seo-guide">' + BODY + '</div>');
    expect(m.enhanceRemoved).toBe(false);
    expect(m.withEnhance.coverage).toBe(m.withoutEnhance.coverage);
  });
});

describe('page exposure / compareExposure', () => {
  const snapshot = (tableDepth) => ({
    pages: {
      '/finance/pmi-calculator': {
        withEnhance: {
          words: 2500, coverage: 0.875, missing: [], present: [], exposed: [], buried: [],
          depths: { table: tableDepth, formula: 300 }, depthShare: { table: tableDepth / 2500, formula: 0.12 },
        },
        withoutEnhance: { depthShare: {} },
        enhanceRemoved: true,
      },
    },
  });

  it('reports a section that moved up, with the word delta', () => {
    const rows = compareExposure(snapshot(900), snapshot(450));
    const table = rows[0].buckets.find((b) => b.key === 'table');
    expect(table.status).toBe('moved-up');
    expect(table.deltaWords).toBe(-450);
    expect(rows[0].movedUp).toBe(1);
  });

  it('reports a bucket that the change created as appeared', () => {
    const rows = compareExposure(snapshot(null), snapshot(450));
    const table = rows[0].buckets.find((b) => b.key === 'table');
    expect(table.status).toBe('appeared');
    expect(rows[0].appeared).toBe(1);
  });

  it('reports a section pushed down instead of hiding a regression', () => {
    const rows = compareExposure(snapshot(450), snapshot(700));
    const table = rows[0].buckets.find((b) => b.key === 'table');
    expect(table.status).toBe('moved-down');
    expect(rows[0].movedDown).toBe(1);
  });

  it('marks a page that is new since the snapshot as added', () => {
    const rows = compareExposure({ pages: {} }, snapshot(450));
    expect(rows[0].status).toBe('added');
  });
});
