/* Shared keyword-difficulty tiering — used by build-keyword-map.cjs (per-row
 * difficulty tags) and keyword-difficulty.cjs (the full report).
 *
 * HONEST MODEL — what this is and is not:
 *  - It is NOT live Ahrefs/Semrush/Google data. There is no paid API wired up
 *    and no GSC credentials in the repo, so real search volume and real
 *    backlink-weighted difficulty are unknowable from inside this repo.
 *  - It IS a deterministic, reproducible estimate from (a) phrase structure
 *    (length + intent modifiers) and (b) live SERP probes run on 2026-09-19
 *    against representative site keywords (see docs/KEYWORD-DIFFICULTY.md).
 *
 * The user's rule: a keyword is worth targeting when fewer than 20 of the
 * top-10-ranking pages are strong brands and volume is decent. Tiering
 * operationalizes that: head terms score SERP-brand-heavy (HARD), fully
 * specified long-tails score few-strong-brands (EASY targets).
 */
'use strict';

const BRAND_RE = /calc\s?pro\s?master|calcpromaster/i;

// Words that qualify a query beyond the bare head term (feature, audience,
// locale, format). Presence ⇒ the SERP usually contains fewer pure-brand pages.
const MODIFIER_WORDS = new Set([
  'with', 'for', 'how', 'what', 'monthly', 'weekly', 'yearly', 'daily',
  'india', 'indian', 'uk', 'usa', 'canada', 'australia', 'uae', 'men', 'women',
  'man', 'woman', 'over', 'under', 'by', 'per', 'free', 'online', 'steps',
  'step', 'formula', 'based', 'without', 'between', 'from', 'vs', 'quick',
  'best', 'simple', 'example', 'examples', 'worksheet', 'excel', 'python',
  'prepayment', 'amortization', 'schedule', 'percentage', 'hours', 'minutes',
  'cubic', 'yards', 'tons', 'kg', 'cm', 'inches', 'feet', 'grams', 'ounces',
  'cycles', 'deepest', 'shalow', 'ordinal', 'weekday', 'macaulay', 'modified',
  'devine', 'hamwi', 'robinson', 'npv', 'irr', 'roi', 'cagr', 'state', 'wise',
  'semester', 'credit', 'hours', 'weighted', 'semester', 'quarter', 'gpa',
  'inr', 'pkr', 'aud', 'cad', 'aed', 'gbp', 'eur',
]);

// Head terms whose live SERPs (probed 2026-09-19) are dominated by strong
// brands (calculator.net, omnicalculator, inchcalculator, Groww, Navi,
// Bank of America, Khan Academy, Symbolab, GeeksforGeeks, Cleveland Clinic…).
const BRAND_HEAVY_HEADS = new Set([
  'loan', 'emi', 'mortgage', 'home', 'car', 'bmi', 'bmr', 'calorie', 'calories',
  'concrete', 'gravel', 'quadratic', 'equation', 'gpa', 'cgpa', 'sgpa',
  'crypto', 'bitcoin', 'ethereum', 'compound', 'interest', 'tax', 'salary',
  'age', 'date', 'percentage', 'discount', 'gpa', 'tip', 'bmr', 'ideal',
  'weight', 'pregnancy', 'ovulation', 'due', 'grade', 'gwa',
]);

function words(p) {
  return String(p).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/* Tier for one keyword phrase.
 * EASY   = long-tail: 4+ words incl. a qualifier (few strong brands compete;
 *          matches the <20-strong-brands-in-top-10 rule with margin)
 * MEDIUM = 3+ words or a qualifier, but shorter/generic
 * HARD   = 1-2 word head term, no qualifier (SERP = brand wall)
 * BRAND  = site's own brand queries
 */
function tier(phrase) {
  const p = String(phrase);
  if (BRAND_RE.test(p)) return 'BRAND';
  const w = words(p);
  const hasMod = w.some(x => MODIFIER_WORDS.has(x));
  const headHeavy = w.some(x => BRAND_HEAVY_HEADS.has(x));
  if (w.length >= 4 && hasMod) return 'EASY';
  if (w.length >= 3 || (hasMod && headHeavy)) return 'MEDIUM';
  if (hasMod) return 'MEDIUM';
  return headHeavy ? 'HARD' : 'MEDIUM';
}

/* 1-5 difficulty score (5 = hardest) combining tier and head-term weight. */
function score(phrase) {
  const t = tier(phrase);
  if (t === 'BRAND') return 1;
  if (t === 'EASY') return 2;
  if (t === 'HARD') return 5;
  const w = words(phrase);
  return w.some(x => BRAND_HEAVY_HEADS.has(x)) ? 4 : 3;
}

/* Coarse volume proxy — word count + head-term bonus. Explicitly a PROXY:
 * real volumes need GSC/keyword-API data. */
function volumeProxy(phrase) {
  const w = words(phrase);
  if (w.length >= 5) return 'low (10–100/mo est.)';
  if (w.length === 4) return 'low-mid (50–500/mo est.)';
  if (w.length === 3) return 'mid (100–2k/mo est.)';
  return w.some(x => BRAND_HEAVY_HEADS.has(x))
    ? 'high (1k–50k+/mo est.)'
    : 'mid (100–2k/mo est.)';
}

module.exports = { tier, score, volumeProxy, MODIFIER_WORDS, BRAND_HEAVY_HEADS, BRAND_RE };
