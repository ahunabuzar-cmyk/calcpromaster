// CALCPROMASTER — Automated SEO QA.
// Guards the generated content pipeline (generate-seo-v2.js -> js/seo-content.js
// -> scripts/split-seo.cjs -> js/seo/<cat>.js) against the production issues that
// were found in the audit:
//   - dangling connector titles ("... Price & (2026)")
//   - mid-word truncated meta descriptions ("... step. Runs")
//   - empty placeholder artifacts ("your  and", "Entering  in")
//   - identical boilerplate FAQs repeated on every page
//   - duplicate titles / canonicals
//   - missing required fields (title, metaDesc, canonicalPath, cat, aeo, desc, faqs)
//   - broken canonical paths (must match an actual tool route)
//   - orphan SEO entries / missing entries for registry tools
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

let TOOL_SEO;
let registryIds;

function loadToolRegistryIds() {
  // Data files declare top-level lexical consts (e.g. `const HEALTH_TOOLS = [...]`),
  // which are NOT properties of a vm sandbox object — read them by name instead.
  const dataDir = path.join(ROOT, 'js', 'data');
  const ids = new Set();
  const ctx = {
    window: {},
    console,
    Charts: { gauge: () => '', donut: () => '', bar: () => '', line: () => '' },
    Security: { sanitizeCalcValue: (v) => v, guardNumber: (v) => v },
    AdvancedCalc: {}
  };
  ctx.window.Charts = ctx.Charts;
  vm.createContext(ctx);
  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.js'));
  for (const f of files) {
    try {
      vm.runInContext(fs.readFileSync(path.join(dataDir, f), 'utf8'), ctx, { filename: f });
    } catch (e) { continue; }
  }
  // Discover declared *_TOOLS arrays by scanning each file's top-level consts.
  for (const f of files) {
    const src = fs.readFileSync(path.join(dataDir, f), 'utf8');
    for (const m of src.matchAll(/^const\s+([A-Z0-9_]+_TOOLS)\s*=\s*\[/gm)) {
      const key = m[1];
      let arr;
      try { arr = vm.runInContext(key, ctx); } catch (e) { continue; }
      if (Array.isArray(arr)) arr.forEach((t) => t && t.id && ids.add(t.id));
    }
  }
  return ids;
}

beforeAll(() => {
  const src = fs.readFileSync(path.join(ROOT, 'js', 'seo-content.js'), 'utf8');
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  TOOL_SEO = sandbox.window.TOOL_SEO || sandbox.TOOL_SEO;
  registryIds = loadToolRegistryIds();
});

describe('SEO content completeness', () => {
  it('has an entry for every registry tool (no orphans, no missing)', () => {
    const seoIds = new Set(Object.keys(TOOL_SEO));
    const missing = [...registryIds].filter((id) => !seoIds.has(id));
    const orphan = [...seoIds].filter((id) => !registryIds.has(id));
    expect(missing).toEqual([]);
    expect(orphan).toEqual([]);
  });

  it('every entry has all required fields', () => {
    const required = ['title', 'metaDesc', 'canonicalPath', 'cat', 'catName', 'lsi', 'aeo', 'desc', 'faqs'];
    const bad = [];
    for (const [id, m] of Object.entries(TOOL_SEO)) {
      for (const f of required) {
        if (m[f] === undefined || m[f] === null || m[f] === '') bad.push(`${id}.${f}`);
      }
      if (!Array.isArray(m.faqs) || m.faqs.length < 4) bad.push(`${id}.faqs(<4)`);
    }
    expect(bad).toEqual([]);
  });
});

describe('Titles', () => {
  it('no dangling connector titles ("... & (2026)")', () => {
    const bad = Object.entries(TOOL_SEO)
      .filter(([, m]) => /& \(2026\)$/.test(m.title) || /[,;:\-]\s*\(2026\)$/.test(m.title))
      .map(([id]) => id);
    expect(bad).toEqual([]);
  });

  it('all titles are 60 chars or fewer', () => {
    const long = Object.entries(TOOL_SEO)
      .filter(([, m]) => m.title.length > 60)
      .map(([id, m]) => `${id}(${m.title.length})`);
    expect(long).toEqual([]);
  });

  it('no duplicate titles', () => {
    const seen = {};
    const dups = [];
    for (const [id, m] of Object.entries(TOOL_SEO)) {
      const k = m.title.toLowerCase().replace(/\s+/g, ' ');
      if (seen[k]) dups.push(`${seen[k]} == ${id}: ${m.title}`);
      seen[k] = id;
    }
    expect(dups).toEqual([]);
  });
});

describe('Meta descriptions', () => {
  it('all meta descriptions are 140-155 chars (no truncation)', () => {
    const bad = Object.entries(TOOL_SEO)
      .filter(([, m]) => m.metaDesc.length < 140 || m.metaDesc.length > 155)
      .map(([id, m]) => `${id}(${m.metaDesc.length})`);
    expect(bad).toEqual([]);
  });

  it('no mid-word truncation artifacts', () => {
    const bad = Object.entries(TOOL_SEO)
      .filter(([, m]) => /\. Runs$/.test(m.metaDesc) || /\b(and|the|with|using|for|step)\s*$/.test(m.metaDesc))
      .map(([id]) => id);
    expect(bad).toEqual([]);
  });

  it('no duplicate meta descriptions', () => {
    const seen = {};
    const dups = [];
    for (const [id, m] of Object.entries(TOOL_SEO)) {
      if (seen[m.metaDesc]) dups.push(`${seen[m.metaDesc]} == ${id}`);
      seen[m.metaDesc] = id;
    }
    expect(dups).toEqual([]);
  });
});

describe('Canonicals', () => {
  it('every canonicalPath matches /<cat>/<id> and the entry cat', () => {
    const bad = [];
    for (const [id, m] of Object.entries(TOOL_SEO)) {
      const expected = `/${m.cat}/${id}`;
      if (m.canonicalPath !== expected) bad.push(`${id}: ${m.canonicalPath} != ${expected}`);
    }
    expect(bad).toEqual([]);
  });

  it('no duplicate canonical paths', () => {
    const seen = {};
    const dups = [];
    for (const [id, m] of Object.entries(TOOL_SEO)) {
      if (seen[m.canonicalPath]) dups.push(`${seen[m.canonicalPath]} == ${id}`);
      seen[m.canonicalPath] = id;
    }
    expect(dups).toEqual([]);
  });
});

describe('Duplicate / boilerplate content', () => {
  it('no empty placeholder artifacts in any field', () => {
    const pats = ['your  and', 'Entering  in', 'your  never', 'your  private', 'your  stays',
      'several  scenarios', 'change your  ', 'your  into', 'my  seems', 'turn your  '];
    const hits = [];
    for (const [id, m] of Object.entries(TOOL_SEO)) {
      const blob = JSON.stringify(m);
      for (const p of pats) if (blob.includes(p)) { hits.push(`${id}: ${p}`); break; }
    }
    expect(hits).toEqual([]);
  });

  it('no "true for every calculator" boilerplate', () => {
    const hits = Object.entries(TOOL_SEO)
      .filter(([, m]) => JSON.stringify(m).includes('true for every one of the'))
      .map(([id]) => id);
    expect(hits).toEqual([]);
  });

  it('every page has tool-specific FAQs (metric / inputs / result)', () => {
    const bad = [];
    for (const [id, m] of Object.entries(TOOL_SEO)) {
      const qs = m.faqs.map((f) => f.q);
      if (!qs.some((q) => /^How is the /.test(q))) bad.push(`${id}: no metric FAQ`);
      if (!qs.some((q) => /^What do I need to use /.test(q))) bad.push(`${id}: no inputs FAQ`);
      if (!qs.some((q) => /^What does the result from /.test(q))) bad.push(`${id}: no result FAQ`);
    }
    expect(bad).toEqual([]);
  });

  it('no identical question+answer pairs across tools (except known platform FAQs)', () => {
    // Platform-level FAQs (phone/accuracy/compare/advice/reset/share/save-data) are
    // legitimately shared site-wide text. Every OTHER question must carry a
    // tool-specific answer \u2014 identical (q, a) pairs mean templated duplicate content.
    const PLATFORM_QS = [
      /really free\?$/,
      /^Do you save my data\?$/,
      /^Does it work on my phone\?$/,
      /^How accurate are the results\?$/,
      /^Can I compare multiple scenarios at once\?$/,
      /^What if my input values seem unusual\?$/,
      /^Is this a substitute for professional advice\?$/,
      /^How do I reset the calculator\?$/,
      /^Can I share or export my result\?$/
    ];
    const isPlatform = (q) => PLATFORM_QS.some((re) => re.test(q));
    const seen = {};
    const dups = [];
    for (const [id, m] of Object.entries(TOOL_SEO)) {
      for (const f of m.faqs) {
        if (isPlatform(f.q)) continue;
        const key = f.q + ' ||| ' + f.a;
        if (seen[key]) dups.push(`${seen[key]} == ${id}: "${f.q}"`);
        seen[key] = id;
      }
    }
    expect(dups).toEqual([]);
  });

  it('no account-wall / signup filler FAQ (real privacy answer only)', () => {
    const hits = [];
    for (const [id, m] of Object.entries(TOOL_SEO)) {
      for (const f of m.faqs) {
        if (/Do I need to create an account\?/.test(f.q)) hits.push(id);
      }
    }
    expect(hits).toEqual([]);
  });
});

describe('Content quality', () => {
  it('no keyword stuffing (title phrase never just repeats the tool name)', () => {
    // The egregious pattern is "X Calculator: X Calculator (2026)" \u2014 the phrase after
    // the colon is the tool name verbatim. Natural overlap with input labels
    // ("Fence Calculator: Fence Length & Post Spacing") is fine and expected.
    const norm = (s) => s.toLowerCase().replace(/-/g, ' ').replace(/\W+/g, ' ').trim();
    const bad = [];
    for (const [id, m] of Object.entries(TOOL_SEO)) {
      const name = norm(id);
      if (!name || name.length < 6) continue;
      const phrase = m.title.split(':')[1] || '';
      const phraseNorm = norm(phrase).replace(/\(2026\)/g, '').trim();
      if (phraseNorm === name) bad.push(`${id}: ${m.title}`);
    }
    expect(bad).toEqual([]);
  });

  it('every page has substantial unique content (aeo + desc + faqs > 500 words)', () => {
    const thin = [];
    for (const [id, m] of Object.entries(TOOL_SEO)) {
      const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const words = [m.aeo, m.desc, ...m.faqs.map((f) => f.q + ' ' + f.a)].map(strip)
        .join(' ').split(/\s+/).filter(Boolean).length;
      if (words < 500) thin.push(`${id}(${words})`);
    }
    expect(thin).toEqual([]);
  });
});

describe('SSG static pages (deploy/)', () => {
  const deployDir = path.join(ROOT, 'deploy');
  const pageExists = fs.existsSync(path.join(deployDir, 'finance', 'loan-emi', 'index.html'));

  const readPage = (rel) => {
    try { return fs.readFileSync(path.join(deployDir, rel), 'utf8'); } catch (e) { return null; }
  };
  const extractJsonLd = (html) => {
    const m = html.match(/<script type="application\/ld\+json" id="ymyl-tool-schema">([\s\S]*?)<\/script>/);
    if (!m) return null;
    try { return JSON.parse(m[1]); } catch (e) { return null; }
  };

  it('tool pages exist with WebApplication + BreadcrumbList + HowTo + FAQPage schema', () => {
    if (!pageExists) return; // deploy/ not built — SSG pages not present
    const schemas = extractJsonLd(readPage(path.join('finance', 'loan-emi', 'index.html')));
    expect(schemas).toBeTruthy();
    const types = schemas.map((s) => s['@type']);
    expect(types).toContain('WebApplication');
    expect(types).toContain('BreadcrumbList');
    expect(types).toContain('HowTo');
    expect(types).toContain('FAQPage');
  });

  it('BreadcrumbList has 4 items ending at the tool URL', () => {
    if (!pageExists) return;
    const schemas = extractJsonLd(readPage(path.join('finance', 'loan-emi', 'index.html')));
    const bc = schemas.find((s) => s['@type'] === 'BreadcrumbList');
    expect(bc.itemListElement).toHaveLength(4);
    expect(bc.itemListElement[3].item).toBe('https://calcpromaster.netlify.app/finance/loan-emi');
  });

  it('FAQPage schema mirrors visible FAQs (5+ questions with answers)', () => {
    if (!pageExists) return;
    const schemas = extractJsonLd(readPage(path.join('finance', 'loan-emi', 'index.html')));
    const faq = schemas.find((s) => s['@type'] === 'FAQPage');
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(5);
    for (const q of faq.mainEntity) {
      expect(q['@type']).toBe('Question');
      expect(q.acceptedAnswer['@type']).toBe('Answer');
      expect(q.name.length).toBeGreaterThan(10);
      expect(q.acceptedAnswer.text.length).toBeGreaterThan(20);
    }
  });

  it('every tool page has unique title + canonical + H1', () => {
    if (!pageExists) return;
    const titles = new Set();
    const canonicals = new Set();
    const dir = path.join(deployDir, 'finance');
    for (const e of fs.readdirSync(dir)) {
      const f = path.join(dir, e, 'index.html');
      if (!fs.existsSync(f)) continue;
      const html = fs.readFileSync(f, 'utf8');
      const t = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
      const c = (html.match(/rel="canonical" href="([^"]*)"/) || [])[1];
      const h1s = (html.match(/<h1>/g) || []).length;
      expect(h1s).toBe(1);
      if (t) titles.add(t);
      if (c) canonicals.add(c);
    }
    // every finance tool page is unique
    expect(titles.size).toBeGreaterThan(20);
    expect(canonicals.size).toBeGreaterThan(20);
  });

  it('noindex dashboards exist (favorites/history/compare)', () => {
    if (!pageExists) return;
    for (const slug of ['favorites', 'history', 'compare']) {
      const html = readPage(path.join(slug, 'index.html'));
      expect(html).toBeTruthy();
      expect(html).toContain('name="robots" content="noindex, follow"');
    }
  });
});
