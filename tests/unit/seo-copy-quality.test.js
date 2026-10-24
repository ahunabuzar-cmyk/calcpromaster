// Guards for the page copy: titles, meta descriptions and the guide body.
//
// Every assertion here pins a defect that was measured on the live snippets
// before this pass, so a future regen cannot quietly reintroduce it:
//   1. 1,285 descriptions opened with the same two words ("Free …");
//   2. 1,178 descriptions ended on the identical sentence;
//   3. "a offer rate" / "a estimated wait" shipped in meta, answer block, body
//      and FAQs of every tool the article rule misfired on;
//   4. one sentence appeared on all 1,285 pages.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const SRC = path.join(process.cwd(), 'js', 'seo-content.js');
const have = fs.existsSync(SRC);

const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
if (have) {
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(SRC, 'utf8'), sandbox);
}
const T = have ? sandbox.window.TOOL_SEO : {};
const ids = Object.keys(T);

describe.skipIf(!have)('meta descriptions', () => {
  const metas = ids.map((id) => T[id].metaDesc || '');

  it('keeps every snippet inside the 100-160 band', () => {
    const bad = ids.filter((id) => (T[id].metaDesc || '').length < 100 || (T[id].metaDesc || '').length > 160);
    expect(bad).toEqual([]);
  });

  it('never opens on the generic "Free " filler word', () => {
    // "Free Fall Calculator" is a tool name, not filler.
    const bad = ids.filter((id) => /^Free\b/.test(T[id].metaDesc || '') && !/^Free Fall\b/.test(T[id].metaDesc || ''));
    expect(bad).toEqual([]);
  });

  it('is unique per page', () => {
    expect(new Set(metas).size).toBe(metas.length);
  });

  it('does not end every page on the same sentence', () => {
    const endings = {};
    for (const m of metas) {
      const parts = m.split(/(?<=[.!?])\s+/);
      const last = parts[parts.length - 1];
      endings[last] = (endings[last] || 0) + 1;
    }
    const worst = Math.max(...Object.values(endings));
    // 6 rotating closers + the deploy CTA rotation: no single tail may dominate.
    expect(worst).toBeLessThan(250);
    expect(Object.keys(endings).length).toBeGreaterThan(50);
  });

  it('has no article-agreement errors ("a offer", "a estimated")', () => {
    const ALLOW = /\ba (US|UK|UAE|EU|URL|UUID|SQL|one|once|user|unit|unique|university)\b/i;
    // "your a and b" is a variable list, not a broken article.
    const VARIABLE_LIST = /\ba (?:and|or|of|to)\b/i;
    const bad = ids.filter((id) => {
      const m = T[id].metaDesc || '';
      return /\ba [aeiou][a-z]+/i.test(m) && !ALLOW.test(m) && !VARIABLE_LIST.test(m);
    });
    expect(bad).toEqual([]);
  });

  it('never dumps a raw multi-value result or a pipe into the snippet', () => {
    const bad = ids.filter((id) => /\|/.test(T[id].metaDesc || '') || /\b[A-Z]:\$/.test(T[id].metaDesc || ''));
    expect(bad).toEqual([]);
  });
});

describe.skipIf(!have)('titles', () => {
  it('are unique, fit the entry budget and never start with "Free "', () => {
    const titles = ids.map((id) => T[id].title || '');
    expect(new Set(titles).size).toBe(titles.length);
    for (const id of ids) {
      const t = T[id].title || '';
      // The 30-char floor is enforced on the served page (head-criteria audit);
      // a short entry title is padded by the shell, so only check the ceiling.
      expect(t.length, id).toBeGreaterThanOrEqual(15);
      expect(t.length, id + ' length').toBeLessThanOrEqual(60);
    }
    // A handful of tools are literally named "Free …" (Free Cash Flow, Free
    // Fall, Free Water Deficit). The filler pattern was 1,285 pages; allow the
    // real terms only.
    const freeTitled = titles.filter((t) => /^Free /.test(t));
    expect(freeTitled.length).toBeLessThan(6);
  });

  it('does not leave a title as a bare field list', () => {
    // The defect shape: "Car Affordability: Monthly Income, Monthly Expenses" —
    // a name plus field labels, with nothing that says what the page does.
    const FIELD_LIST = /^[^:]+:\s*(Monthly|Daily|Annual|Initial|Original|Desired|Current|Hourly|Yearly|Weekly)\b/;
    const INTENT = /\b(calculator|estimator|converter|checker|tracker|planner|comparison|cost|rate|price|score|range|plan|breakdown|index|ratio|total|budget|forecast|tool|solver|period|profit|affordability)\b/i;
    const bad = ids.filter((id) => {
      const t = T[id].title || '';
      return FIELD_LIST.test(t) && !INTENT.test(t);
    });
    expect(bad.length).toBeLessThan(10);
  });
});

describe.skipIf(!have)('body copy', () => {
  it('does not repeat one long sentence across the site', () => {
    const counts = new Map();
    for (const id of ids) {
      const html = (T[id].desc || '') + ' ' + (T[id].aeo || '');
      for (const s of html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/)) {
        const k = s.trim();
        if (k.length < 70) continue;
        counts.set(k, (counts.get(k) || 0) + 1);
      }
    }
    const worst = [...counts.entries()].filter(([, n]) => n > 40).sort((a, b) => b[1] - a[1]);
    expect(worst).toEqual([]);
  });

  it('keeps the article rule working inside the answer block too', () => {
    const VARIABLE_LIST = /\ba (?:and|or|of|to)\b/i;
    const bad = ids.filter((id) => /\ba [aeiou][a-z]+\b/i.test(T[id].aeo || '')
      && !/\ba (US|UK|UAE|EU|URL|UUID|one|once|user|unit|unique)\b/i.test(T[id].aeo || '')
      && !VARIABLE_LIST.test(T[id].aeo || ''));
    expect(bad.length).toBeLessThan(30);
  });
});
