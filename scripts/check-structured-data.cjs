#!/usr/bin/env node
// ============================================================
// CalcProMaster — structured-data parseability gate
// ------------------------------------------------------------
// Search Console reported "Unparsable structured data → Bad escape sequence in
// string" from 2026-10-19 (4 → 8 → 7 → 6 → 6 pages/day). That class of error is
// always the same root cause: a JSON-LD block that is not valid JSON, usually a
// hand-escaped quote/backslash in an FAQ answer, a Windows path, a lone
// surrogate from a truncated emoji, or a raw control character.
//
// build-deploy.js already parses JSON-LD, but its regex only matches the exact
// attribute string `<script type="application/ld+json">` — a block written as
// `<script type='application/ld+json' id="x">` (single quotes, extra attributes,
// different order) slipped through unvalidated. This gate reads the BUILT tree
// with a tolerant matcher and fails on the first block that does not parse,
// printing the exact escape sequence so the fix is obvious.
//
// Usage:
//   node scripts/check-structured-data.cjs          # deploy/
//   node scripts/check-structured-data.cjs --json
//
// Exit codes: 0 = every block parses, 1 = at least one unparsable block.
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const JSON_OUT = process.argv.includes('--json');

// Tolerant matcher: any attribute order, single or double quotes, extra attrs.
const BLOCK_RE = /<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/** Extract every JSON-LD body from an HTML document. */
function extractBlocks(html) {
  const out = [];
  BLOCK_RE.lastIndex = 0;
  let m;
  while ((m = BLOCK_RE.exec(html)) !== null) out.push(m[1]);
  return out;
}

/**
 * Escape sequences a JSON string may NOT contain. `\" \\ \/ \b \f \n \r \t \uXXXX`
 * are legal; anything else (`\–`, `\%`, a lone `\ `) is the "bad escape sequence"
 * Search Console reports.
 */
function findBadEscapes(raw) {
  const bad = [];
  for (const m of raw.matchAll(/\\(.)/g)) {
    const ch = m[1];
    if (ch === 'u') {
      // A \uXXXX that decodes to a lone surrogate is also unparsable for Google.
      const hex = raw.slice(m.index + 2, m.index + 6);
      if (!/^[0-9a-fA-F]{4}$/.test(hex)) { bad.push({ seq: '\\u' + hex, offset: m.index, why: 'truncated \\u escape' }); continue; }
      const code = parseInt(hex, 16);
      const paired = code >= 0xd800 && code <= 0xdbff
        ? /^\\u[dD][c-fC-F][0-9a-fA-F]{2}/.test(raw.slice(m.index + 6))
        : true;
      if ((code >= 0xd800 && code <= 0xdbff && !paired) || (code >= 0xdc00 && code <= 0xdfff)) {
        bad.push({ seq: '\\u' + hex, offset: m.index, why: 'lone surrogate' });
      }
      continue;
    }
    if (!'"\\/bfnrt'.includes(ch)) bad.push({ seq: '\\' + ch, offset: m.index, why: 'not a JSON escape' });
  }
  return bad;
}

/** Parse one block; on failure explain WHY the way Search Console does. */
function checkBlock(raw) {
  try {
    JSON.parse(raw);
    // JSON.parse accepts a lone surrogate (\ud83d with no low half), but Search
    // Console's parser rejects it, and it always means the source text was
    // truncated mid-emoji. Treat it as a failure, not a curiosity.
    const lone = findBadEscapes(raw).filter((b) => b.why === 'lone surrogate');
    if (lone.length) {
      return {
        ok: false,
        error: 'lone surrogate escape',
        badEscapes: [...new Set(lone.map((b) => b.seq))].slice(0, 8),
        reason: 'lone surrogate',
        snippet: raw.slice(Math.max(0, lone[0].offset - 120), lone[0].offset + 120).replace(/\s+/g, ' '),
      };
    }
    return { ok: true };
  } catch (e) {
    const bad = findBadEscapes(raw);
    // Raw control characters (including a literal newline/tab) are illegal in a
    // JSON string — they must be written as \n / \t.
    const control = /[\u0000-\u001f]/.exec(raw);
    return {
      ok: false,
      error: e.message,
      badEscapes: [...new Set(bad.map((b) => b.seq))].slice(0, 8),
      reason: bad.length ? bad[0].why : control ? 'raw control character in string' : 'invalid JSON',
      snippet: raw.slice(Math.max(0, (bad[0] ? bad[0].offset : 0) - 120), (bad[0] ? bad[0].offset : 0) + 120).replace(/\s+/g, ' '),
    };
  }
}

function walk(dir, out = [], base = '') {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? base + '/' + e.name : e.name;
    if (e.isDirectory()) walk(path.join(dir, e.name), out, rel);
    else if (e.name.endsWith('.html')) out.push(rel);
  }
  return out;
}

function main() {
  if (!fs.existsSync(DEPLOY)) {
    console.error('  ✗ deploy/ missing — run `node build-deploy.js` first');
    process.exit(1);
  }

  const files = walk(DEPLOY);
  const failures = [];
  let blocks = 0;
  let pagesWithSchema = 0;

  for (const rel of files) {
    const html = fs.readFileSync(path.join(DEPLOY, rel), 'utf8');
    const bodies = extractBlocks(html);
    if (bodies.length) pagesWithSchema++;
    for (const body of bodies) {
      blocks++;
      const res = checkBlock(body);
      if (!res.ok) failures.push({ page: '/' + rel, ...res });
    }
  }

  const payload = {
    ranAt: new Date().toISOString(),
    pages: files.length,
    pagesWithSchema,
    blocks,
    failures,
    pass: failures.length === 0,
  };

  if (JSON_OUT) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log('==========================================');
    console.log(' STRUCTURED DATA — every JSON-LD block must parse');
    console.log('==========================================');
    console.log('  pages scanned       ' + files.length + ' (' + pagesWithSchema + ' carry schema)');
    console.log('  JSON-LD blocks      ' + blocks);
    if (!failures.length) {
      console.log('\n  ✅ PASS — every block is valid JSON (no bad escape sequences, no lone surrogates).');
    } else {
      console.log('\n  ❌ ' + failures.length + ' unparsable block(s)');
      for (const f of failures.slice(0, 20)) {
        console.log('   - ' + f.page + '  |  ' + f.reason + '  |  ' + f.error);
        if (f.badEscapes.length) console.log('       bad escape(s): ' + f.badEscapes.join(' '));
        console.log('       …' + f.snippet + '…');
      }
      console.log('\n  Fix: the block must be produced by JSON.stringify — never by string');
      console.log('  concatenation. A literal backslash or an unescaped quote in the source');
      console.log('  text is what produces "Bad escape sequence in string" in Search Console.');
    }
  }

  if (failures.length) process.exit(1);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('check-structured-data crashed: ' + (e && e.message)); process.exit(1); }
}

module.exports = { extractBlocks, findBadEscapes, checkBlock };
