// ============================================================
// js/tool-intros.js — every tool page carries one unique intro paragraph, and
// every opener is grammatical for the shape of that tool's description.
//
// The shipped defects these pin down:
//   76 registry tools had NO intro (the generator scraped the data files with a
//      regex that missed wrapped definitions)
//   ~600 intros put a noun phrase in a verb slot or the reverse
//      ("Need to customer acquisition cost?", "helps you cMU blocks needed…")
//   ~100 intros embedded a stub cut out of the description at a hyphen
//      ("Working out per is easier with…")
// ============================================================
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const G = require('../../generate-intros.js');
const A = require('../../scripts/audit-seo-placeholders.cjs');
const INTROS = require('../../js/tool-intros.js');

const tools = G.loadAllTools();
const byId = Object.fromEntries(tools.map((t) => [t.id, t]));

describe('tool intros / coverage', () => {
  it('covers every tool in the registry', () => {
    const missing = tools.filter((t) => !String(INTROS[t.id] || '').trim()).map((t) => t.id);
    expect(missing).toEqual([]);
    expect(Object.keys(INTROS).length).toBe(tools.length);
  });

  it('gives the tools whose wrapped definitions the old scraper missed an intro', () => {
    // These six are multi-line definitions in js/data/*.js; the previous
    // regex-based loader required id/name/desc/kw on one line and dropped them.
    for (const id of ['sponsorship-rate', 'canada-crs', 'tool-depreciation',
      'australia-pr-points', 'career-break-runway', 'moving-abroad-cost']) {
      expect(String(INTROS[id] || '').length, id).toBeGreaterThan(200);
    }
  });

  it('keeps every intro unique and within the 80-140 word gate', () => {
    const texts = Object.values(INTROS);
    expect(new Set(texts).size).toBe(texts.length);
    for (const [id, s] of Object.entries(INTROS)) {
      const wc = s.split(/\s+/).length;
      expect(wc, id).toBeGreaterThanOrEqual(80);
      expect(wc, id).toBeLessThanOrEqual(140);
    }
  });

  it('names the tool in the opening sentence', () => {
    const bad = [];
    for (const t of tools) {
      const first = String(INTROS[t.id]).split(/(?<=\.)\s/)[0];
      if (!first.includes(t.name)) bad.push(t.id);
    }
    expect(bad).toEqual([]);
  });
});

describe('tool intros / opener grammar', () => {
  it('never puts an action verb in a noun slot or a noun in a verb slot', () => {
    const broken = Object.entries(INTROS)
      .filter(([, s]) => A.INTRO_BAD_FRAME.test(s))
      .map(([id]) => id);
    expect(broken).toEqual([]);
  });

  it('never doubles the verb form ("Working out calculating…")', () => {
    // An action description reads as "Working out how to calculate fuel cost…";
    // its gerund is only used as the object of a noun frame ("the numbers behind
    // calculating fuel cost"). The check has to run against each tool's own
    // description — "Working out planning cost estimate" is a topic phrase that
    // merely looks like a gerund.
    const doubled = tools
      .filter((t) => {
        const p = G.descPhrase(t);
        return p.kind === 'action' && INTROS[t.id].includes('Working out ' + p.np.split(' ')[0]);
      })
      .map((t) => t.id);
    expect(doubled).toEqual([]);
  });

  it('keeps question descriptions in answer frames only', () => {
    const questions = tools.filter((t) => G.descPhrase(t).kind === 'question');
    expect(questions.length).toBeGreaterThan(10);
    for (const t of questions) {
      const s = INTROS[t.id];
      expect(s, t.id).toMatch(/answers one question directly: |is built to answer one question: /);
    }
  });

  it('never embeds a phrase that was cut inside its own description', () => {
    const cut = [];
    for (const t of tools) {
      const p = G.descPhrase(t);
      if (A.phraseCutAt(p.vp || p.np, t.desc)) cut.push(t.id);
    }
    expect(cut).toEqual([]);
  });
});

describe('tool intros / description classifier', () => {
  it('reads an action description as an action and derives the gerund', () => {
    const p = G.descPhrase(byId['fuel-cost']);
    expect(p.kind).toBe('action');
    expect(p.vp).toBe('calculate fuel cost for any trip');
    expect(p.np).toBe('calculating fuel cost for any trip');
  });

  it('reads a topic description as a topic', () => {
    expect(G.descPhrase(byId['cac']).kind).toBe('topic');
    expect(G.descPhrase(byId['cac']).np).toBe('customer acquisition cost');
    expect(G.descPhrase(byId['scooter-cost']).np).toBe('cost per km for a scooter');
  });

  it('keeps acronyms and proper nouns capitalised mid-sentence', () => {
    // Regression: the lowercasing rule turned these into "sE tax", "cMU blocks".
    expect(G.descPhrase(byId['self-employment-tax']).np).toMatch(/^SE tax/);
    expect(G.descPhrase(byId['block-wall']).np).toMatch(/^CMU blocks/);
    expect(G.descPhrase(byId['head-loss']).np).toMatch(/^Darcy–Weisbach/);
    // ...while ordinary sentence-case descriptions still drop to lower case.
    expect(G.descPhrase(byId['auto-fare']).vp).toMatch(/^calculate auto-rickshaw fare$/);
  });

  it('treats a question description as a question and trim its trailing clause', () => {
    expect(G.descPhrase(byId['car-affordability']).kind).toBe('question');
    expect(G.descPhrase(byId['leap-year']).np).toBe('is a year a leap year?');
    expect(G.descPhrase(byId['rent-vs-buy']).np).toBe('should you rent or buy a home?');
  });

  it('keeps hyphens, unspaced colons and trailing parentheticals intact', () => {
    // Regression: the head rule split on every '-' and ':', so these became
    // "Calculate per", "Convert hh", "Drag" and "Working days between two dates (Mon".
    expect(G.descPhrase(byId['timesheet-hours']).vp).toBe('convert hh:mm entries to decimal hours');
    expect(G.descPhrase(byId['business-days']).np).toBe('working days between two dates (Mon–Fri)');
    expect(G.descPhrase(byId['quarter-mile']).np).toBe('drag-strip estimate from power and weight');
  });

  it('strips the "Free … calculator" wrapper from a self-describing topic', () => {
    expect(G.descPhrase(byId['sponsorship-rate']).np).toBe('influencer sponsorship rate');
  });

  it('trims a long description at a list boundary, not mid-item', () => {
    const p = G.descPhrase(byId['canada-crs']);
    expect(p.np.split(' ').length).toBeLessThanOrEqual(14);
    expect(p.np).not.toMatch(/\b(and|or|of|to|from)$/);
  });
});

describe('audit / raw result-label detector', () => {
  // The broken sentences are quoted from js/seo-content.js at HEAD (the copy the
  // label repairs replaced); the correct ones are what the generators write now.
  const BROKEN = [
    'Free Force Converter: enter the Value and get force units of 22.4809 lbf.',
    'Force Converter works out the force units from the Value, following standard Unit Conversion conventions',
    'Free Bit Rate Converter: enter the Value and get data rates of 100000.0000 kbps.',
    'Bit Rate Converter works out the data rates from the Value',
    'Free Maintenance Fluids Calculator (4-2-1): enter the Weight and get a hourly pediatric maintenance of 65 mL/hr.',
    'Maintenance Fluids Calculator (4-2-1) works out the hourly pediatric maintenance from the Weight',
    'the page defaults produce a between length of 3.2808 ft.',
    'Conductivity Converter: enter the Value and get a btufthf etc of 0.3467 BTU/(ft·h·°F)',
    '"force units formula"',
    '"data rates formula"',
    '"hourly pediatric maintenance formula"'
  ];
  const CORRECT = [
    'Force Converter is a free online calculator that helps you convert force units (N, kN, lbf).',
    'Convert force units (N, kN, lbf)', // the tool's own UI description
    'Need a fast answer on converting data rates between bps, Kbps, Mbps, Gbps?',
    'Maintenance Fluids Calculator (4-2-1) turns the numbers behind hourly pediatric maintenance fluid rate by the 4-2-1 rule into an instant, step-by-step result.',
    'Convert time units (hours, minutes, seconds)',
    'Convert between lux and foot-candles'
  ];

  it('fires on every shape the repairs replaced', () => {
    for (const s of BROKEN) expect(A.RAW_LABEL.test(s), s).toBe(true);
  });

  it('does not fire on correct prose that contains the same words', () => {
    for (const s of CORRECT) expect(A.RAW_LABEL.test(s), s).toBe(false);
  });
});

describe('audit / phraseCutAt detector', () => {
  it('catches the truncations the old head rule produced', () => {
    expect(A.phraseCutAt('calculate per', 'Calculate per-delivery cost')).toBe('calculate per');
    expect(A.phraseCutAt('Drag', 'Drag-strip estimate from power and weight')).toBe('Drag');
    expect(A.phraseCutAt('Convert hh', 'Convert hh:mm entries to decimal hours')).toBe('Convert hh');
    expect(A.phraseCutAt('Long', 'Long-term capital gains tax')).toBe('Long');
  });

  it('does not flag an intended cut at a spaced dash or a colon-plus-space', () => {
    expect(A.phraseCutAt('days cash is tied up', 'Days cash is tied up: DIO + DSO − DPO')).toBe('');
    expect(A.phraseCutAt('ordinal date', 'Ordinal date — which day of the year')).toBe('');
    expect(A.phraseCutAt('long-term capital gains tax', 'Long-term capital gains tax on sale')).toBe('');
    expect(A.phraseCutAt('e=mc²', 'E=mc² energy stored')).toBe('');
  });
});
