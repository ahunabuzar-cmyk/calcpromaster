#!/usr/bin/env node
/* Keyword-phrase fixer v2 — surgical, escape-safe.
 *
 * Fixes ONLY the audit-flagged phrase classes (docs/KEYWORD-AUDIT.md):
 *   S1  overlong phrases (>70 chars)  -> searchable core (word-boundary, <=70)
 *   S2  single generic word           -> intent phrase (known map or fallback)
 *   Q1  year-stamped phrases          -> year token dropped (evergreen)
 *
 * Safety:
 *  - Operates ONLY inside the '...' / "..." string of each kw: literal,
 *    scanning char-by-char so escaped quotes (\' / \") never break parsing.
 *  - Escapes the rewritten value back with the same quote rules.
 *  - DUP guard: a normalized phrase may belong to exactly one page; the first
 *    owner wins, later collisions are dropped and logged (no C2 regressions).
 *  - Idempotent: second run makes zero changes.
 * Run: node scripts/fix-keyword-phrases.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'js', 'data');

// S2 expansions keyed by "<file>|<phrase>" (from docs/KEYWORD-AUDIT.md S2 list)
const S2 = {
  'saas-unit-metrics.js|arpu': 'arpu calculator for saas',
  'saas-unit-metrics.js|ltv': 'ltv calculator for saas',
  'saas-unit-metrics.js|cac': 'cac calculator for saas',
  'temperature.js|kelvin': 'kelvin to celsius converter',
  'bond-yield.js|ytm': 'ytm bond yield calculator',
  'retirement-income.js|401k': '401k contribution calculator',
  'retirement-income.js|ira': 'ira retirement calculator',
  'esop.js|rsu': 'rsu tax calculator',
  'fatigue-score.js|wellness': 'wellness score calculator',
};

const STOP = new Set(['free', 'online', 'best', 'with', 'for', 'and', 'the', 'a', 'in', 'to', 'of', 'how']);
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

function escapeFor(val, q) {
  return val.replace(/\\/g, '\\\\').split(q).join('\\' + q);
}

// Locate every kw literal with escape-aware scanning
function findKwLiterals(src) {
  const out = [];
  const re = /kw\s*:\s*(['"])/g;
  let m;
  while ((m = re.exec(src))) {
    const q = m[1];
    let i = m.index + m[0].length;
    let val = '';
    while (i < src.length) {
      const c = src[i];
      if (c === '\\') { val += src.substr(i, 2); i += 2; continue; }
      if (c === q) break;
      val += c; i++;
    }
    // owner record: nearest id: '...' / name: '...' BEFORE this kw (same line/record)
    const before = src.slice(Math.max(0, m.index - 3000), m.index);
    const idM = before.match(/id:\s*(['"])([^'"]+)\1(?![\s\S]*id:\s*(['"]))/);
    const nameM = before.match(/name:\s*(['"])([^'"]+)\1(?![\s\S]*name:\s*(['"]))/);
    out.push({ start: m.index, qStart: m.index + m[0].length - 1, q, val, end: i,
      id: idM ? idM[2] : '?', name: nameM ? nameM[2] : '' });
    re.lastIndex = i;
  }
  return out;
}

const stats = { files: 0, s1: 0, s2: 0, q1: 0, dups: 0 };
const owners = new Map(); // normalized phrase -> "file|id"
const dupLog = [];
const fixLog = [];

for (const f of fs.readdirSync(DATA_DIR).filter((x) => x.endsWith('.js')).sort()) {
  const FILE = path.join(DATA_DIR, f);
  let src = fs.readFileSync(FILE, 'utf8');
  let changed = false;

  const lits = findKwLiterals(src);
  // process back-to-front so earlier replacements don't shift offsets
  for (let li = lits.length - 1; li >= 0; li--) {
    const L = lits[li];
    const segments = L.val.split(',').map((s) => s.trim()).filter(Boolean);
    let touched = false;
    const outSegs = [];

    for (const p of segments) {
      let np = p;

      // Q1: drop bare year tokens
      if (/\b20\d{2}\b/.test(np)) {
        const t = np.replace(/\b20\d{2}\b/g, '').replace(/\s+/g, ' ').trim();
        if (t && t !== np) { np = t; stats.q1++; touched = true; fixLog.push(`Q1 [${L.id}] ${p} -> ${t}`); }
      }

      // S2: single generic word -> intent phrase
      const bare = norm(np).split(' ').filter((t) => t && !STOP.has(t));
      if (bare.length <= 1 && !/calculator|calc|converter|generator|chart|table/.test(norm(np))) {
        const key = `${f}|${np.toLowerCase()}`;
        const toolName = (L.name || '').toLowerCase();
        const fixed = S2[key]
          || (/convert/.test(toolName) ? np + ' converter' : /gen/.test(toolName) ? np + ' generator' : np + ' calculator');
        if (fixed !== np) { np = fixed; stats.s2++; touched = true; fixLog.push(`S2 [${L.id}] ${p} -> ${fixed}`); }
      }

      // S1: overlong -> word-boundary trim to <=70
      if (np.length > 70) {
        let t = np.split(/\s+/).slice(0, 9).join(' ');
        while (t.length > 70 && t.split(' ').length > 3) t = t.split(' ').slice(0, -1).join(' ');
        t = t.replace(/ (for|with|and|to|of|in|on)$/i, '').trim();
        if (t !== np) { np = t; stats.s1++; touched = true; fixLog.push(`S1 [${L.id}] ${p} -> ${t}`); }
      }

      // DUP guard across all pages
      const n = norm(np);
      const ownerKey = `${f}|${L.id}`;
      if (owners.has(n) && owners.get(n) !== ownerKey) {
        stats.dups++;
        dupLog.push(`"${np}" owned by ${owners.get(n)} — dropped from ${ownerKey}`);
        touched = true;
        continue; // drop the colliding phrase
      }
      owners.set(n, ownerKey);
      outSegs.push(np);
    }

    if (touched) {
      const nextVal = outSegs.join(', ');
      src = src.slice(0, L.qStart + 1) + escapeFor(nextVal, L.q) + src.slice(L.end);
      changed = true;
    }
  }

  if (changed) { fs.writeFileSync(FILE, src); stats.files++; }
}

console.log(`fix-keyword-phrases: files=${stats.files} S1=${stats.s1} S2=${stats.s2} Q1=${stats.q1} dupsDropped=${stats.dups}`);
if (dupLog.length) console.log('dups:\n' + dupLog.slice(0, 12).join('\n'));
fs.writeFileSync(path.join(__dirname, '.kw-fix-log.txt'), fixLog.join('\n'));
