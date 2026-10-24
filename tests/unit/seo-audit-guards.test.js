// ============================================================
// The guards added around the generated copy:
//   · js/tool-intros.js has exactly one generator (generate-intros.js);
//     scripts/seo-regen-v5.cjs delegates to it instead of also writing it.
//   · scripts/audit-seo-placeholders.cjs P10 screens the copy that is NOT
//     generated per tool (guides, blog, hubs, premium articles).
//   · scripts/audit-query-quality.cjs flags pages whose impressions come mostly
//     from machine-shaped query strings.
// ============================================================
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

const A = require('../../scripts/audit-seo-placeholders.cjs');
const Q = require('../../scripts/audit-query-quality.cjs');

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('intro file freshness gate', () => {
  const G = require('../../generate-intros.js');

  it('ignores the generation date and nothing else', () => {
    const a = '// Generated: 2026-10-11 — 2 intros\nvar X = 1;\n';
    const b = '// Generated: 2026-10-12 — 2 intros\nvar X = 1;\n';
    expect(G.introFileMatches(a, b)).toBe(true);
    expect(G.introFileMatches(a, '// Generated: 2026-10-11 — 2 intros\nvar X = 2;\n')).toBe(false);
    // A missing file must never look up to date.
    expect(G.introFileMatches('', a)).toBe(false);
  });

  it('reports the committed intro file as matching the generator', () => {
    // End to end: this is the CI step. It fails the moment a second writer
    // (or a hand edit) makes js/tool-intros.js diverge from its generator.
    // The expected counts come from the registry instead of a frozen literal:
    // the number was pinned at 1,282 and every added calculator (the
    // peptide-reconstitution and proportion tools took it to 1,284) broke the
    // gate on the count alone rather than on real drift.
    const out = execFileSync(process.execPath, ['generate-intros.js', '--check'], { cwd: ROOT, encoding: 'utf8' });
    const n = G.loadAllTools().length;
    expect(out).toMatch(new RegExp('matches the generator \\(' + n + ' intros, ' + n + ' unique\\)'));
  });
});

describe('intro writer ownership', () => {
  it('keeps generate-intros.js as the only generator of js/tool-intros.js', () => {
    expect(read('generate-intros.js')).toMatch(/path\.join\(__dirname, 'js', 'tool-intros\.js'\)/);
    // Nothing may write that path through writeFileSync except the generator
    // itself (which uses its OUT constant).
    const files = [
      ...fs.readdirSync(ROOT).filter((f) => /\.(js|cjs)$/.test(f)),
      ...fs.readdirSync(path.join(ROOT, 'scripts')).filter((f) => /\.(js|cjs)$/.test(f)).map((f) => path.join('scripts', f))
    ];
    const direct = files.filter((rel) => /writeFileSync\(\s*[^)\n]*tool-intros/.test(read(rel)));
    expect(direct).toEqual([]);
  });

  it('makes seo-regen-v5.cjs delegate instead of writing the intros itself', () => {
    const v5 = read('scripts/seo-regen-v5.cjs');
    expect(v5).not.toMatch(/OUT_INTROS/);
    expect(v5).not.toMatch(/buildIntro\(/);
    expect(v5).toMatch(/execFileSync\(process\.execPath, \[INTRO_GENERATOR\]/);
    expect(read('generate-intros.js')).toMatch(/if \(require\.main === module\) main\(\)/);
  });

  it('still lets sync-counts.cjs patch the count inside the intros file', () => {
    // The count patcher is not a generator: it rewrites stale "N+ calculators"
    // strings. Dropping the file from its list would let the count drift.
    expect(read('scripts/sync-counts.cjs')).toMatch(/'js\/tool-intros\.js',/);
  });

  it('names its generator in the generated file header', () => {
    expect(read('js/tool-intros.js').slice(0, 400)).toMatch(/Regenerate with: node generate-intros\.js/);
  });
});

describe('override script reads the object from the text it edits', () => {
  // The label repairs are located in the *repaired* text (repairUndefined runs
  // first). Reading TOOL_SEO from the pre-repair source made every entry
  // repairUndefined had touched unreachable: protein-need's label repair was
  // skipped, the run reported "did not apply cleanly" and exited before writing,
  // which took the whole v5 → overrides → split regen chain down with it.
  it('evaluates the SEO object from the repaired source, not from disk', () => {
    const s = read('scripts/apply-seo-overrides.cjs');
    expect(s).toMatch(/const TOOL_SEO = evalSeo\(text\)/);
    expect(s).not.toMatch(/vm\.runInContext\(original, sandbox\)/);
    expect(s).toMatch(/const evalSeo = \(src\) => \{/);
  });

  it('still guards the label repairs it cannot verify', () => {
    const s = read('scripts/apply-seo-overrides.cjs');
    // The failure path must keep existing: a repair that genuinely cannot land
    // has to stop the run instead of writing a half-repaired file.
    expect(s).toMatch(/overrides that did not apply cleanly/);
    expect(s).toMatch(/r\.needsFix && r\.changed\.fields < 1/);
  });
});

describe('P10 — site copy screening', () => {
  it('scans the guide, blog, hub and premium sources', () => {
    const files = A.siteCopyFiles();
    expect(files.length).toBeGreaterThan(80);
    expect(files.some((f) => /^guides\/.+\.html$/.test(f))).toBe(true);
    expect(files.some((f) => /^blog\/.+\.html$/.test(f))).toBe(true);
    expect(files).toContain('js/category-depth.js');
    expect(files.some((f) => f.startsWith('js/seo-premium'))).toBe(true);
  });

  it('reports nothing for the copy that is in the repo today', () => {
    expect(A.auditSiteCopy().pages).toEqual([]);
  });

  it('catches each shape it claims to catch', () => {
    // The gate is only worth wiring into CI if it fires on the real defect text.
    const samples = {
      'raw result label': 'enter the Value and get force units of 22.4809 lbf',
      'undefined placeholder': 'How is the undefined calculated?',
      'page-name placeholder': 'What does the page calculator do?',
      'error string used as a label': 'the result is a cannot directly convert value',
      'stringified object or NaN': 'You get a value of [object Object] from NaN'
    };
    for (const [shape, text] of Object.entries(samples)) {
      expect(SITE_SHAPES_HIT(shape, text), shape).toBe(true);
    }
  });

  it('does not flag correct authored prose that shares the same words', () => {
    const legit = [
      'How Much You Need to Retire — The 25x Rule Explained',
      'Convert force units (N, kN, lbf) with the conversion table below.',
      'Everything you need to know about the page calculator layout.',
      'Combine protein sources so the mix covers all nine essential amino acids.'
    ];
    for (const text of legit) {
      for (const [shape, re] of Object.entries(A.SITE_SHAPES)) {
        expect(re.test(text), shape + ' :: ' + text).toBe(false);
      }
    }
  });
});

function SITE_SHAPES_HIT(shape, text) {
  return new RegExp(A.SITE_SHAPES[shape].source).test(text);
}

describe('machine-shaped query guard', () => {
  it('flags the shapes Search Console actually reported', () => {
    const machine = [
      '+mifflin st jeor equation women 10 weight 6.25 height 5 age 161 source%',
      '%mifflin st jeor equation resting energy expenditure w',
      '#4f46e5',
      '4f46e5',
      '529000000',
      '100/4.67',
      'enterprise%2bseo%2broi%2bcalculator'
    ];
    for (const q of machine) expect(Q.isMachineQuery(q), q).toBe(true);
  });

  it('leaves real searches alone, including non-Latin scripts', () => {
    // The first version of the rule used [^A-Za-z] and flagged every Hebrew,
    // Russian, Japanese and Arabic query in the join as machine-shaped.
    const human = [
      'mifflin st jeor calculator',
      '4.5% apy on 10000',
      'e=mc2 calculator',
      '1000va inverter',
      'מחשבון גליקמי',
      'расчет заработной платы в дубае',
      'タクシー 金額 計算',
      'التكلفة'
    ];
    for (const q of human) expect(Q.isMachineQuery(q), q).toBe(false);
  });

  it('flags a page only when volume AND share both trip', () => {
    const join = {
      days: 28, startDate: '2026-09-09', endDate: '2026-10-07',
      pairs: [
        // shaped: 30 impressions, all machine → flagged
        { query: '+pasted fragment source%', page: 'https://x.test/a/', impressions: 30, clicks: 0, position: 6 },
        { query: 'real search', page: 'https://x.test/a/', impressions: 10, clicks: 1, position: 5 },
        // low volume, all machine → below the 20-impression floor
        { query: '#abcdef', page: 'https://x.test/b/', impressions: 5, clicks: 0, position: 8 },
        // high volume but mostly human → below the share threshold
        { query: 'real search', page: 'https://x.test/c/', impressions: 90, clicks: 3, position: 7 },
        { query: '999999', page: 'https://x.test/c/', impressions: 10, clicks: 0, position: 9 }
      ]
    };
    const report = Q.audit(join);
    expect(report.flagged.map((f) => f.path)).toEqual(['/a']);
    expect(report.summary.machineRows).toBe(3);
    expect(report.summary.machineImpressions).toBe(45);
    expect(report.summary.machineClicks).toBe(0);
  });

  it('counts one page once, whichever slash form GSC reported it under', () => {
    // GSC lists the same page as both /x and /x/. Keying on the raw string split
    // it into two entries and halved the share, so the flag boundary landed on a
    // coin flip — this is what the real /health/bmr-mifflin finding exposed.
    const join = {
      days: 28, startDate: '2026-09-09', endDate: '2026-10-07',
      pairs: [
        { query: '+pasted fragment', page: 'https://x.test/health/bmr', impressions: 20, clicks: 0, position: 6 },
        { query: 'real search', page: 'https://x.test/health/bmr', impressions: 10, clicks: 1, position: 5 },
        { query: '+pasted fragment', page: 'https://x.test/health/bmr/', impressions: 20, clicks: 0, position: 6 },
        { query: 'real search', page: 'https://x.test/health/bmr/', impressions: 10, clicks: 0, position: 9 }
      ]
    };
    const report = Q.audit(join);
    expect(report.flagged).toHaveLength(1);
    const [page] = report.flagged;
    expect(page.path).toBe('/health/bmr');
    expect(page.impressions).toBe(60);
    expect(page.machineImpressions).toBe(40);
    expect(page.share).toBeCloseTo(40 / 60, 5);
    // Both raw forms stay visible in the report instead of being merged away.
    expect(page.paths).toEqual(['https://x.test/health/bmr', 'https://x.test/health/bmr/']);
    expect(report.summary.pagesInJoin).toBe(1);
    expect(Q.normPath('/')).toBe('/');
    expect(Q.normPath('https://x.test/')).toBe('/');
  });

  it('is pure about the ledger: known, grown and new are told apart', () => {
    const page = (over) => ({ path: '/p', impressions: 100, machineImpressions: 60, clicks: 0, share: 0.6, machineQueries: [], ...over });
    const report = { flagged: [page({}), page({ path: '/grown', share: 0.75, machineImpressions: 75 }), page({ path: '/new' })] };
    const ledger = [
      { path: '/p', share: 0.6, machineImpressions: 60 },
      { path: '/grown', share: 0.6, machineImpressions: 60 }
    ];
    const { knownPages, actionable } = Q.classifyFindings(report, ledger);
    expect(knownPages.map((p) => p.path)).toEqual(['/p']);
    expect(actionable.map((p) => [p.path, p.status])).toEqual([['/grown', 'grown'], ['/new', 'new']]);
    // An accepted page re-alerts on volume even when the share holds.
    const byVolume = Q.classify(page({ path: '/p2', share: 0.6, machineImpressions: 60 + Q.GROWTH_IMPRESSIONS }), [{ path: '/p2', share: 0.6, machineImpressions: 60 }]);
    expect(byVolume).toBe('grown');
    // A corrupt or absent ledger must silence nothing.
    expect(Q.classify(page({ path: '/p3' }), [])).toBe('new');
  });

  it('accepts the committed ledger entry for the real finding, and nothing else', () => {
    const ledger = JSON.parse(read('data/query-quality-ledger.json')).known;
    const report = JSON.parse(read('data/query-quality-audit.json'));
    // Every accepted entry must still be a real flagged page and carry a reason,
    // so the ledger can never list something the guard no longer reports.
    for (const e of ledger) {
      expect(typeof e.note, e.path).toBe('string');
      expect(e.note.length, e.path).toBeGreaterThan(40);
      expect(report.flagged.some((f) => f.path === e.path), e.path + ' is in the ledger but no longer flagged').toBe(true);
    }
    // And the run that produced the committed report ended with nothing pending.
    expect(report.summary.newPages).toBe(0);
    expect(report.known.map((p) => p.path)).toEqual(ledger.map((e) => e.path));
  });

  it('skips cleanly (exit 0) when the GSC join is absent', () => {
    // CI runs in a checkout without data/gsc-query-page.json; the guard must not
    // fail the job for missing data it never had.
    const script = read('scripts/audit-query-quality.cjs');
    expect(script).toMatch(/query-quality guard skipped/);
    expect(script).toMatch(/process\.exit\(0\)/);
  });
});
