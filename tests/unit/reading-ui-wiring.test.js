import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// reading-ui.js is a DOM-wiring layer; its pure helpers are tested in
// reading.test.js. This file pins the WIRING CONTRACT so a refactor that
// silently disconnects #56/#57/#58/#67/#83 from the DOM fails here.
describe('reading-ui wiring contract (S8 gaps: #56/#57/#58/#83)', () => {
  const src = read('js/reading-ui.js');

  it('file parses as valid JS', () => {
    expect(() => new Function(src)).not.toThrow();
  });

  it('#56 collapsible toggle wired into toolbar + uses R.makeCollapsible contract', () => {
    expect(src).toContain("data-act=\"collapse\"");
    expect(src).toContain('applyCollapsibleSections');
    // SEO-safe behavior: wraps into details.open, marks body flag
    expect(src).toContain("data-collapsed-sections");
    expect(src).toContain("details.className = 'collapsible'");
    expect(src).toContain('.open = true');
  });

  it('#57 tabs toggle wired + accessible tablist via R.makeTabs + keyboard nav', () => {
    expect(src).toContain('applyTabbedSections');
    expect(src).toContain('R.makeTabs');
    expect(src).toContain('wireTabKeys');
    expect(src).toContain("ArrowRight");
    expect(src).toContain('aria-selected');
    expect(src).toContain("data-tabbed-sections");
    // SEO-safety: restore path must unhide all cards again
    expect(src).toContain('card.hidden = false');
  });

  it('#58 sticky calc bar exists, syncs on scroll, deep-links to share', () => {
    expect(src).toContain('buildStickyCalc');
    expect(src).toContain('syncStickyCalc');
    expect(src).toContain("'cpm-sticky-calc'");
    expect(src).toContain('App.shareTool');
    // only appears when the calculator form is out of view
    expect(src).toContain('r.bottom < 0');
  });

  it('#83 one-handed mode toggle persisted via R.savePrefs', () => {
    expect(src).toContain('data-one-handed');
    expect(src).toContain('cpm-one-handed-toggle');
    expect(src).toContain('prefs.oneHanded');
    expect(src).toContain('R.savePrefs');
  });

  it('all new features are additive: guarded, never throw on missing DOM', () => {
    // every querySelector is $('#...') guarded pattern in an IIFE that
    // no-ops when the element is missing
    expect(src).toContain("if ($('#cpm-sticky-calc') || !document.getElementById('calc-form')) return;");
    expect(src).toContain("if (!$('#jump-to-input')) return;".replace('!', ''));
  });

  it('scroll handler routes sticky-bar sync', () => {
    expect(src).toContain('syncStickyCalc();');
  });

  it('CSS covers the new surfaces', () => {
    const css = read('styles.css');
    expect(css).toContain('#cpm-sticky-calc');
    expect(css).toContain('#cpm-one-handed-toggle');
    expect(css).toContain('#cpm-ptr');
    expect(css).toContain('html[data-one-handed="on"]');
  });
});

describe('nav-ui wiring contract (S11 #82 pull-to-refresh)', () => {
  const src = read('js/nav-ui.js');

  it('#82 gesture uses the Decide gate, mobile-only, with indicator', () => {
    expect(src).toContain('wirePullToRefresh');
    expect(src).toContain('D.pullToRefreshAllowed');
    expect(src).toContain('cpm-ptr');
    expect(src).toContain("matchMedia('(max-width: 640px)')");
  });

  it('init() calls every wiring function (nothing silently disconnected)', () => {
    const init = src.match(/function init\(\) \{[\s\S]*?\n  \}/);
    expect(init).toBeTruthy();
    ['recordRecent', 'wireScrollTop', 'wireMiniHeader', 'renderRecentWidget', 'wireViewToggle', 'wireWizard', 'renderBottomNav', 'wirePullToRefresh']
      .forEach((fn) => expect(init[0]).toContain(fn + '()'));
  });
});
