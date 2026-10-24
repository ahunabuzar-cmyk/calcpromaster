import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import vm from 'vm';

const require = createRequire(import.meta.url);
const S = require('../../scripts/apply-seo-overrides.cjs');

// apply-seo-overrides.cjs fixes the two things the GSC join showed: pages on
// page 1 with zero clicks (template-shaped, machine-written snippets) and the
// 'the undefined' placeholder that leaked into 175 sentences.

describe('apply-seo-overrides / repairUndefined', () => {
  it('fixes every placeholder shape with well-formed English', () => {
    const cases = [
      ['<h3>What does the undefined do?</h3>', '<h3>What does this calculator do?</h3>'],
      ['<h3>How is the undefined calculated?</h3>', '<h3>How is the result calculated?</h3>'],
      ['<h3>What do I need to use the undefined?</h3>', '<h3>What do I need to use it?</h3>'],
      ['<h3>What does the result from the undefined show?</h3>', '<h3>What does the result from this calculator show?</h3>'],
      ['<h3>Is the undefined really free?</h3>', '<h3>Is it really free?</h3>'],
      ['You can use the undefined for this.', 'You can use this calculator for this.']
    ];
    for (const [input, expected] of cases) {
      expect(S.repairUndefined(input)).toBe(expected);
    }
  });

  it('leaves no trace of the placeholder, whatever the casing of the sentence', () => {
    const text = 'What does the undefined do? The undefined is free. the undefined';
    expect(S.repairUndefined(text)).not.toMatch(/the undefined/);
  });

  it('does not touch text that has no placeholder', () => {
    const clean = 'Enter the wall area and get the sheets you need.';
    expect(S.repairUndefined(clean)).toBe(clean);
  });

  it('normalises the "the tool" placeholder questions to match the rest of the site', () => {
    // 698 of 1,282 tools asked "What does the tool calculate?" / "What does the
    // result from the tool mean?" while the other 584 said "this calculator".
    expect(S.repairUndefined('"q":"What does the tool calculate?"'))
      .toBe('"q":"What does this calculator do?"');
    expect(S.repairUndefined('"q":"What does the result from the tool mean?"'))
      .toBe('"q":"What does the result from this calculator mean?"');
    // Legitimate prose that happens to say "the tool" must survive.
    const prose = 'the tool works offline and the tool converts to points';
    expect(S.repairUndefined(prose)).toBe(prose);
  });

  it('preserves the FAQ question shapes the SEO QA suite requires', () => {
    // tests/unit/seo-qa.test.js requires every tool to keep a metric, inputs,
    // result and free question. The repair must not flatten those to name-free
    // shapes ("What does the result show?") or that contract breaks.
    const out = [
      S.repairUndefined('How is the undefined calculated?'),
      S.repairUndefined('What do I need to use the undefined?'),
      S.repairUndefined('What does the result from the undefined show?'),
      S.repairUndefined('Is the undefined really free?')
    ];
    expect(out[0]).toMatch(/^How is the /);
    expect(out[1]).toMatch(/^What do I need to use /);
    expect(out[2]).toMatch(/^What does the result from /);
    expect(out[3]).toMatch(/really free\?$/);
  });

  it('is idempotent (safe to run twice)', () => {
    const once = S.repairUndefined('What does the undefined do? the undefined');
    expect(S.repairUndefined(once)).toBe(once);
  });

  it('never invents a tool name, so the fix cannot mislabel a page', () => {
    // The repair is deliberately name-free: it is applied to 175 sentences
    // across every category, so any name would be wrong somewhere.
    for (const [, to] of S.UNDEFINED_FIXES) {
      expect(to).not.toMatch(/Calculator|Predictor|Tracker|Estimator/);
    }
  });
});

describe('apply-seo-overrides / rewriteAeo', () => {
  const aeo = '<div class="seo-guide"><h2>Old heading</h2><p>Old lead paragraph text.</p>'
    + '<h3>Quick answer</h3><p>Old quick answer.</p>'
    + '<h3>Something else</h3><p>Keep this untouched.</p></div>';

  it('replaces the heading, the lead and the quick answer', () => {
    const out = S.rewriteAeo(aeo, { heading: 'New heading', lead: 'New lead.', quickAnswer: 'New answer.' });
    expect(out).toContain('<h2>New heading</h2>');
    expect(out).toContain('<p>New lead.</p>');
    expect(out).toContain('<h3>Quick answer</h3><p>New answer.</p>');
  });

  it('leaves the rest of the block alone', () => {
    const out = S.rewriteAeo(aeo, { heading: 'New heading', lead: 'New lead.', quickAnswer: 'New answer.' });
    expect(out).toContain('<h3>Something else</h3><p>Keep this untouched.</p>');
  });

  it('only rewrites the FIRST paragraph, not later ones', () => {
    const out = S.rewriteAeo(aeo, { heading: 'H', lead: 'L.' });
    expect(out.match(/<p>L\.<\/p>/g)).toHaveLength(1);
    expect(out).toContain('Keep this untouched.');
  });

  it('keeps dollar amounts intact (regression: $15 became group-1 + "5")', () => {
    // String.replace reads "$15" in a replacement string as backreference 1
    // followed by "5". The copy is full of dollar amounts, so this must use a
    // function replacement.
    const out = S.rewriteAeo(aeo, {
      heading: 'H', lead: 'L.',
      quickAnswer: 'One $3 cup costs $15 a week and $175 a month.'
    });
    expect(out).toContain('<p>One $3 cup costs $15 a week and $175 a month.</p>');
    expect(out).not.toContain('Quick answer</h3>\n5');
  });

  it('keeps the block unchanged when there is no quick-answer section', () => {
    const noQa = '<div><h2>Old</h2><p>Old lead.</p></div>';
    const out = S.rewriteAeo(noQa, { heading: 'New', lead: 'New lead.', quickAnswer: 'ignored' });
    expect(out).toBe('<div><h2>New</h2><p>New lead.</p></div>');
  });

  it('returns the block untouched for a missing entry or missing heading', () => {
    expect(S.rewriteAeo(null, { heading: 'x', lead: 'y' })).toBeNull();
    expect(S.rewriteAeo(aeo, {})).toBe(aeo);
  });
});

describe('apply-seo-overrides / replaceValue', () => {
  const src = '{"a":{"title":"Old title","metaDesc":"Old meta"}}';

  it('replaces the first JSON-encoded occurrence and reports success', () => {
    const r = S.replaceValue(src, 'Old title', 'New title');
    expect(r.replaced).toBe(true);
    expect(JSON.parse(r.text).a.title).toBe('New title');
  });

  it('reports a miss instead of silently corrupting the file', () => {
    const r = S.replaceValue(src, 'Not present', 'New');
    expect(r.replaced).toBe(false);
    expect(r.text).toBe(src);
  });

  it('escapes the replacement so quotes cannot break the generated JS', () => {
    const r = S.replaceValue(src, 'Old meta', 'A "quoted" value');
    expect(r.replaced).toBe(true);
    expect(JSON.parse(r.text).a.metaDesc).toBe('A "quoted" value');
  });
});

describe('apply-seo-overrides / CTR_OVERRIDES data quality', () => {
  const entries = Object.entries(S.CTR_OVERRIDES);

  it('covers the page-1 zero-click pages found in the GSC join', () => {
    expect(entries.length).toBeGreaterThanOrEqual(10);
  });

  it('gives every entry a complete, non-placeholder override', () => {
    for (const [id, o] of entries) {
      expect(typeof o.title, id).toBe('string');
      // The build enforces a 30-60 char title gate (scripts/ ssg-pages title gate);
      // matching it here means a bad override fails in unit tests, not at build.
      expect(o.title.length, id + ' title').toBeGreaterThanOrEqual(30);
      expect(o.title.length, id + ' title length (build gate 30-60)').toBeLessThanOrEqual(60);
      expect(o.metaDesc.length, id + ' metaDesc').toBeGreaterThan(70);
      expect(o.metaDesc.length, id + ' metaDesc length').toBeLessThanOrEqual(185);
      expect(typeof o.heading, id + ' heading').toBe('string');
      expect(typeof o.lead, id + ' lead').toBe('string');
      expect(typeof o.quickAnswer, id + ' quickAnswer').toBe('string');
      expect(o.lead.length, id + ' lead').toBeGreaterThan(120);
      for (const v of [o.title, o.metaDesc, o.heading, o.lead, o.quickAnswer]) {
        expect(v, id).not.toMatch(/the undefined|undefined/i);
        expect(v, id).not.toMatch(/\bTODO\b/);
      }
    }
  });

  it('fixes the broken result labels across the whole entry, not just the aeo block', () => {
    // The generator emitted the result label as a raw unit string, which then
    // appeared in the title, the meta, the aeo block, the long-form desc, the
    // FAQ answers AND the lsi keyword tags. Fixing only the aeo block left the
    // phrase visible elsewhere, so the entry-wide fixes are asserted here.
    const file = path.join(process.cwd(), 'js', 'seo-content.js');
    const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox);
    const T = sandbox.window.TOOL_SEO;
    const CASES = [
      ['length', 'between length'],
      ['pressure-conv', 'between pressure'],
      ['temperature', 'between celsius'],
      ['time-conv', 'the time units'],
      ['cooking-conv', 'the cooking measurements'],
      ['clothing-size', 'the international clothing'],
      ['torque-conv', 'the torque units'],
      ['power-conv', 'the power units'],
      ['voltage-conv', 'cannot directly convert'],
      ['density-conv', 'the density units']
    ];
    const left = [];
    for (const [id, broken] of CASES) {
      if (JSON.stringify(T[id]).includes(broken)) left.push(id + ' still says "' + broken + '"');
    }
    expect(left).toEqual([]);
  });

  it('keeps the conversion numbers truthful after the rewrite', () => {
    // Each figure is the tool's own conversion at its own default input.
    const file = path.join(process.cwd(), 'js', 'seo-content.js');
    const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox);
    const T = sandbox.window.TOOL_SEO;
    const EXPECT = [
      ['length', '3.2808 feet'],
      ['pressure-conv', '14.5038 psi'],
      ['temperature', '212 °F'],
      ['time-conv', '3,600 seconds is 1 hour'],
      ['cooking-conv', '240 ml'],
      ['clothing-size', 'EU 40'],
      ['torque-conv', '0.7376'],
      ['power-conv', '745.7 watts'],
      ['density-conv', '1 g/cm3']
    ];
    for (const [id, needle] of EXPECT) {
      expect(JSON.stringify(T[id]), id + ' should state ' + needle).toContain(needle);
    }
  });

  it('does not repeat the same snippet across pages', () => {
    const titles = entries.map(([, o]) => o.title);
    const metas = entries.map(([, o]) => o.metaDesc);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(metas).size).toBe(metas.length);
  });

  it('does not start a title with "Free" (the shape that got ignored)', () => {
    for (const [id, o] of entries) {
      expect(o.title, id).not.toMatch(/^Free /);
    }
  });

  it('is applied to the generated SEO source (no placeholder left behind)', () => {
    const file = path.join(process.cwd(), 'js', 'seo-content.js');
    const text = fs.readFileSync(file, 'utf8');
    expect(text).not.toMatch(/the undefined/);
    expect(text).not.toMatch(/"q":"What does the tool calculate\?"/);
    expect(text).not.toMatch(/"q":"What does the result from the tool mean\?"/);
    // Every override title must be present in the generated source.
    for (const [, o] of entries) {
      expect(text, o.title).toContain(JSON.stringify(o.title));
    }
  });
});

describe('apply-seo-overrides / TITLE_OVERRIDES (GSC push list)', () => {
  const titles = Object.entries(S.TITLE_OVERRIDES);
  const push = require('../../data/top10-push-list.json');
  const allTools = (() => {
    const file = path.join(process.cwd(), 'js', 'seo-content.js');
    const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox);
    return sandbox.window.TOOL_SEO;
  })();

  it('names a page that exists', () => {
    for (const [id] of titles) expect(allTools[id], id).toBeTruthy();
  });

  it('respects the build title gate and never starts with "Free "', () => {
    for (const [id, title] of titles) {
      expect(title.length, id).toBeGreaterThanOrEqual(30);
      expect(title.length, id + ' title (build gate 30-60)').toBeLessThanOrEqual(60);
      expect(title, id).not.toMatch(/^Free /);
    }
  });

  it('keeps every title unique, against each other and against the CTR overrides', () => {
    const all = [
      ...titles.map(([id, t]) => [id, t]),
      ...Object.entries(S.CTR_OVERRIDES).map(([id, o]) => [id, o.title])
    ];
    const seen = new Map();
    const dups = [];
    for (const [id, t] of all) {
      const k = t.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(k)) dups.push(seen.get(k) + ' == ' + id + ': ' + t);
      seen.set(k, id);
    }
    expect(dups).toEqual([]);
  });

  it('is applied to the generated SEO source', () => {
    const text = fs.readFileSync(path.join(process.cwd(), 'js', 'seo-content.js'), 'utf8');
    for (const [id, title] of titles) {
      expect(text, id).toContain(JSON.stringify(title));
      expect(allTools[id].title, id).toBe(title);
    }
  });

  // The point of the table is that the term the page's impressions actually
  // arrive on now appears in its title. A row whose title omitted its own term
  // would be the exact defect the push list reported, so it is asserted here:
  // every entry must contain at least one of the terms its row was missing.
  it('contains the missing term from each page\u2019s own push-list row', () => {
    const rows = push.rows.filter((r) => r.verdict && r.verdict.verdict === 'add-term');
    for (const [id, title] of titles) {
      // Rows whose rewrite fixes a defective title without wearing the term
      // (narration, count words) are listed explicitly instead of silently passing.
      if (S.TITLE_OVERRIDE_NONTERM.includes(id)) continue;
      const row = rows.find((r) => r.id === id);
      if (!row) continue; // the one sitewide title defect (quartiles) is not a term row
      const low = title.toLowerCase();
      const present = (row.missing || []).filter((m) => low.includes(m.toLowerCase()));
      expect(present.length, id + ' must state one of: ' + row.missing.join(', ') + ' \u2014 got "' + title + '"').toBeGreaterThan(0);
    }
  });

  it('documents every add-term row it deliberately skipped', () => {
    const rows = push.rows.filter((r) => r.verdict && r.verdict.verdict === 'add-term');
    const answered = new Set([
      ...Object.keys(S.TITLE_OVERRIDES),
      ...S.TITLE_OVERRIDE_SKIPS,
      ...S.TITLE_OVERRIDE_NONTERM
    ]);
    const unanswered = rows.filter((r) => !answered.has(r.id)).map((r) => r.id);
    // Either a title override or an explicit, reasoned skip \u2014 never silence.
    expect(unanswered).toEqual([]);
  });
});
