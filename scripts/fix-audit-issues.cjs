#!/usr/bin/env node
// ============================================================
// Build-time fixer for the issues a third-party crawl reports on the
// PUBLISHED pages. Runs on deploy/ after every content pass, before the
// cache-bust + HTML minify step, so the fixes survive into the build.
//
//   1. Editorial external links carried rel="nofollow" on every citation
//      (NHTSA, BLS, IRS, Investopedia …). Crawlers report those as "outgoing
//      external links contain nofollow attributes". Citations are editorial,
//      not paid placements, so the nofollow token is removed — but `sponsored`
//      and affiliate/disclosure links keep theirs, which is the correct signal.
//
//   2. Static `mailto:` anchors are rewritten to /contact links carrying
//      data-email. Cloudflare's Email Address Obfuscation rewrites a static
//      mailto into href="/cdn-cgi/l/email-protection#…", and every crawler then
//      reports that as a broken internal link (the biggest single source of
//      "broken internal links" on this site). A data-email link cannot be
//      rewritten at the edge and still works: js/site-extras.js opens the mail
//      client on click, and the link falls back to the contact page without JS.
//
// Idempotent: running it twice changes nothing.
// Usage: node scripts/fix-audit-issues.cjs [--dry]
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const DRY = process.argv.includes('--dry');

// Reciprocal launch-directory links (footer badges + the "Featured On" credits).
// These are NOT the editorial citations rule 1 is about: the site that awards the
// badge is the same site the badge links back to, which is the "badge / embedded
// link" pattern Google lists as a link scheme. Removing nofollow from those turned
// a legitimate badge into a followed reciprocal link on 1,512 pages (measured
// 2026-10-27). Citations to IRS/BLS/Investopedia keep losing the token — that part
// of the crawler complaint is correct.
const PROGRAM_HOSTS = new Set(['twelve.tools', 'startupfa.me', 'fazier.com']);
function isProgramLink(href, attrs) {
  if (/\bbadge-link\b/.test(attrs)) return true;
  try {
    return PROGRAM_HOSTS.has(new URL(href).hostname.replace(/^www\./i, '').toLowerCase());
  } catch (e) {
    return false;
  }
}

// Split a page into script/style blocks and the rest, so an <a> inside inline
// JavaScript (a template string) is never rewritten.
function mapOutsideCode(html, fn) {
  const parts = html.split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>)/i);
  return parts.map((part, i) => (i % 2 === 1 ? part : fn(part))).join('');
}

const A_RE = /<a\b([^>]*)>/gi;
const attrOf = (attrs, name) => {
  const m = attrs.match(new RegExp('\\b' + name + '\\s*=\\s*"([^"]*)"', 'i'))
    || attrs.match(new RegExp("\\b" + name + "\\s*=\\s*'([^']*)'", 'i'));
  return m ? { value: m[1], raw: m[0] } : null;
};

let nofollowRemoved = 0;
let programNofollowKept = 0;
let mailtoRewritten = 0;
let filesTouched = 0;

function fixAnchors(html) {
  let changed = false;
  const out = html.replace(A_RE, (open, attrs) => {
    const href = attrOf(attrs, 'href');
    if (!href) return open;
    let next = open;

    // ---- 1. editorial nofollow ----
    const rel = attrOf(attrs, 'rel');
    if (rel && /\bnofollow\b/i.test(rel.value) && isProgramLink(href.value, attrs)) {
      programNofollowKept++;
    } else if (rel && /^https?:\/\//i.test(href.value) && /\bnofollow\b/i.test(rel.value) && !/\bsponsored\b/i.test(rel.value)) {
      const tokens = rel.value.split(/\s+/).filter((t) => t && !/^nofollow$/i.test(t));
      next = tokens.length
        ? next.replace(rel.raw, 'rel="' + tokens.join(' ') + '"')
        : next.replace(' ' + rel.raw, '');
      nofollowRemoved++;
      changed = true;
    }

    // ---- 2. static mailto → /contact + data-email ----
    const mail = href.value.match(/^mailto:([^?"'&]+)/i);
    if (mail) {
      const addr = decodeURIComponent(mail[1]).trim();
      next = next.replace(href.raw, 'href="/contact" data-email="' + addr + '"');
      mailtoRewritten++;
      changed = true;
    }
    return next;
  });
  return changed ? out : html;
}

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { walk(full); continue; }
    if (!e.name.endsWith('.html')) continue;
    const src = fs.readFileSync(full, 'utf8');
    const next = mapOutsideCode(src, fixAnchors);
    if (next !== src) {
      filesTouched++;
      if (!DRY) fs.writeFileSync(full, next);
    }
  }
}

if (!fs.existsSync(DEPLOY)) {
  console.error('deploy/ not found — run `node build-deploy.js` first.');
  process.exit(1);
}
walk(DEPLOY);
console.log('  audit-fixes: ' + nofollowRemoved + ' editorial nofollow removed, ' +
  programNofollowKept + ' badge/program nofollow kept, ' +
  mailtoRewritten + ' mailto link(s) rewritten, ' + filesTouched + ' page(s) touched' + (DRY ? ' (dry)' : ''));
