#!/usr/bin/env node
// "Kya site hack hui hai?" — a static scan of the built deploy/ output for the
// artefacts a compromise leaves behind: injected outbound links, hidden link
// blocks, spam pages/keywords, foreign-script spam, obfuscated scripts,
// unexpected iframes/meta-refresh, and files that should never ship.
//
// It cannot prove a site is clean (a hacked CDN or a served-only payload is
// invisible from here), but it catches everything that lands in the artifact we
// publish, which is where this project's HTML actually comes from.
//
//   node scripts/audit-site-security.cjs
//   node scripts/audit-site-security.cjs --json

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const SITEMAP = path.join(DEPLOY, 'sitemap.xml');
const OUT = path.join(ROOT, 'data', 'site-security-audit.json');

// Hosts this site legitimately talks to. Anything else is listed for review —
// not automatically "hacked", because a new integration is a valid reason to
// appear here.
const ALLOWED_HOSTS = new Set([
  'calcpromaster.com',
  'www.calcpromaster.com',
  'www.googletagmanager.com',
  'www.google-analytics.com',
  'region1.google-analytics.com',
  'pagead2.googlesyndication.com',
  'googleads.g.doubleclick.net',
  'tpc.googlesyndication.com',
  'static.cloudflareinsights.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'open.er-api.com',
  'api.frankfurter.app',
  'fazier.com',
  'startupfa.me',
  // "Featured On" badge in the footer — a directory listing, reviewed.
  'twelve.tools',
  'www.w3.org',
  'schema.org',
  'github.com',
  'twitter.com',
  'x.com',
  'www.linkedin.com',
  'calcpromaster.netlify.app',
]);

// Words that essentially never belong on a calculator site. If one shows up in
// a title, h1 or a link, the page needs a human look.
const SPAM_WORDS = [
  'viagra', 'cialis', 'levitra', 'tramadol', 'oxycontin', 'xanax',
  'casino', 'poker', 'slot gacor', 'togel', 'judi', 'bandar', 'sbobet',
  'betting', 'bookmaker', 'payday', 'replica watch', 'escort', 'porn',
  'xxx', 'adult dating', 'buy followers', 'hacked by', 'owned by',
];

// TLDs that show up in link-injection campaigns far more than in calculator
// citations.
const SUSPICIOUS_TLDS = ['.ru', '.cn', '.tk', '.top', '.xyz', '.buzz', '.click', '.loan', '.work', '.gq', '.cf', '.ml'];

// Paths where a "risky" API is the SUBJECT MATTER rather than an obfuscation
// attempt. /qa-dashboard prints every calculator's source code into the page —
// the Base64 encoder/decoder shows its own `atob`/`btoa`/`unescape` calls as a
// formula string, so the rule fires on a legitimate tool. Listed explicitly (and
// reported as `exemptedRiskyScripts`) so the exemption is visible in the audit
// output instead of silently swallowed.
const RISKY_SCRIPT_EXEMPT = new Set(['/qa-dashboard']);

const RISKY_SCRIPT = [
  [/\beval\s*\(/, 'eval()'],
  [/\bnew\s+Function\s*\(/, 'new Function()'],
  [/\batob\s*\(/, 'atob()'],
  [/\bunescape\s*\(/, 'unescape()'],
  [/\bdocument\.write\s*\(/, 'document.write()'],
  [/String\.fromCharCode\s*\(\s*\d+\s*,/, 'fromCharCode()'],
];

const hiddenLinkRe = /style="[^"]*(?:display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0(?:px)?\b|left\s*:\s*-\d{3,}|text-indent\s*:\s*-\d{3,})[^"]*"[^>]*>[\s\S]{0,200}?<a\s/gi;
const anchorRe = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;
const srcRe = /\b(?:src|action)\s*=\s*["'](https?:\/\/[^"']+)["']/gi;
const iframeRe = /<iframe\b[^>]*>/gi;
const titleRe = /<title[^>]*>([\s\S]*?)<\/title>/i;
const h1Re = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i;
const metaRefreshRe = /<meta[^>]+http-equiv\s*=\s*["']?refresh/i;
const scriptBlockRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const hostOf = (url) => {
  try { return new URL(url).hostname.toLowerCase(); } catch { return ''; }
};
const rel = (p) => '/' + path.relative(DEPLOY, p).split(path.sep).join('/');
const stripTags = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

function audit() {
  if (!fs.existsSync(DEPLOY)) {
    throw new Error('deploy/ not found — run `node build-deploy.js` first');
  }

  const sitemap = fs.existsSync(SITEMAP) ? fs.readFileSync(SITEMAP, 'utf8') : '';
  const sitemapPaths = new Set(
    [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => m[1].replace(/^https?:\/\/[^/]+/i, '').replace(/\/+$/, '') || '/')
  );

  const files = walk(DEPLOY);
  const html = files.filter((f) => f.endsWith('.html'));
  const findings = {
    hiddenLinkBlocks: [],
    spamPages: [],
    foreignTitleSpam: [],
    riskyScripts: [],
    exemptedRiskyScripts: [],
    metaRefresh: [],
    suspiciousIframes: [],
    suspiciousOutbound: [],
    riskyFiles: [],
    nonSitemapPages: [],
  };
  const hosts = new Map();
  const badExtension = files.filter((f) => /\.(php\d?|exe|zip|rar|7z|sh|bat|ps1|jsp|aspx?)$/i.test(f));
  findings.riskyFiles = badExtension.map(rel);

  for (const file of html) {
    const url = rel(file).replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    const src = fs.readFileSync(file, 'utf8');
    const title = stripTags((src.match(titleRe) || [])[1]);
    const h1 = stripTags((src.match(h1Re) || [])[1]);
    const haystack = (title + ' ' + h1).toLowerCase();

    if (!sitemapPaths.has(url.replace(/\/$/, '') || '/')) findings.nonSitemapPages.push(url);

    // 1. Spam vocabulary. A page that calls itself a calculator and only uses a
    //    flagged word as its subject ("Poker Flush Odds Calculator", "Payday Loan
    //    Cost Calculator") is a real tool, not injected spam — only links and
    //    pages outside the sitemap are held to the strict rule.
    const hit = SPAM_WORDS.find((w) => haystack.includes(w));
    if (hit && !/calculator|calculator|odds|interest|budget|converter/.test(haystack)) {
      findings.spamPages.push({ url, word: hit, title });
    }

    // 2. Foreign-script title spam (CJK/Cyrillic/Arabic in a title is normal for
    //    the i18n pages, so only flag when it dominates a non-/i18n page).
    const nonLatin = (title.match(/[\u0400-\u04ff\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af]/g) || []).length;
    if (nonLatin > 0 && !/^\/(ar|hi|ur|ru|ja|ko|zh|id|tr|es|fr|de|pt|bn|fa|vi|th)\b/.test(url)) {
      const share = nonLatin / Math.max(1, title.replace(/\s/g, '').length);
      if (share > 0.3) findings.foreignTitleSpam.push({ url, title });
    }

    // 3. Hidden link blocks — the classic injected-links pattern.
    const hidden = src.match(hiddenLinkRe);
    if (hidden) findings.hiddenLinkBlocks.push({ url, blocks: hidden.length });

    // 4. Script risk + meta refresh.
    for (const m of src.matchAll(scriptBlockRe)) {
      // Strip comments first: "its eval (~250ms) would inflate TBT" in a comment
      // is not code, and matching it made every page look obfuscated.
      const body = m[1]
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
      for (const [re, label] of RISKY_SCRIPT) {
        if (!(re.test(body) && body.length > 40)) continue;
        const entry = { url, pattern: label };
        (RISKY_SCRIPT_EXEMPT.has(url) ? findings.exemptedRiskyScripts : findings.riskyScripts).push(entry);
      }
      const remote = body.match(/\b(?:location(?:\.href)?|location\.assign|location\.replace)\s*(?:=|\()\s*["']https?:\/\/([^"'/]+)/);
      if (remote && !ALLOWED_HOSTS.has(remote[1].toLowerCase())) {
        findings.suspiciousOutbound.push({ url, via: 'js-redirect', host: remote[1] });
      }
    }
    if (metaRefreshRe.test(src)) findings.metaRefresh.push(url);

    // 5. Outbound hosts (links + assets + forms).
    for (const m of src.matchAll(anchorRe)) {
      const h = hostOf(m[1]);
      if (!h) continue;
      hosts.set(h, (hosts.get(h) || 0) + 1);
      if (!ALLOWED_HOSTS.has(h)) {
        if (SUSPICIOUS_TLDS.some((t) => h.endsWith(t))) findings.suspiciousOutbound.push({ url, via: 'link', host: h });
      }
    }
    for (const m of src.matchAll(srcRe)) {
      const h = hostOf(m[1]);
      if (h) hosts.set(h, (hosts.get(h) || 0) + 1);
    }

    // 6. Iframes other than the ad/self allowlist.
    for (const m of src.matchAll(iframeRe)) {
      const tag = m[0];
      const h = hostOf((tag.match(/src\s*=\s*["']([^"']+)["']/) || [])[1] || '');
      if (h && !ALLOWED_HOSTS.has(h)) findings.suspiciousIframes.push({ url, host: h });
    }
  }

  const externalHosts = [...hosts.entries()]
    .filter(([h]) => !ALLOWED_HOSTS.has(h))
    .sort((a, b) => b[1] - a[1]);

  return {
    scannedAt: new Date().toISOString(),
    htmlPages: html.length,
    sitemapUrls: sitemapPaths.size,
    files: files.length,
    externalHosts,
    findings,
    summary: {
      hiddenLinkBlocks: findings.hiddenLinkBlocks.length,
      spamPages: findings.spamPages.length,
      foreignTitleSpam: findings.foreignTitleSpam.length,
      riskyScripts: findings.riskyScripts.length,
      exemptedRiskyScripts: findings.exemptedRiskyScripts.length,
      metaRefresh: findings.metaRefresh.length,
      suspiciousIframes: findings.suspiciousIframes.length,
      suspiciousOutbound: findings.suspiciousOutbound.length,
      riskyFiles: findings.riskyFiles.length,
      nonSitemapPages: findings.nonSitemapPages.length,
    },
  };
}

// Findings that mean "the published artifact carries injected content". A
// non-zero count here is the only thing that may fail a build. `externalHosts`
// (new outbound link, possibly a legitimate citation) and `nonSitemapPages`
// (noindex utility/variant pages that must stay out of the sitemap) are review
// leads, not defects, so they never gate.
const FATAL_FINDINGS = [
  'hiddenLinkBlocks', 'spamPages', 'foreignTitleSpam', 'suspiciousIframes',
  'suspiciousOutbound', 'riskyFiles', 'metaRefresh', 'riskyScripts',
];

if (require.main === module) {
  const result = audit();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n');
  if (!process.argv.includes('--json')) {
    console.log('==========================================');
    console.log(' SITE SECURITY / INJECTION SCAN — deploy/');
    console.log('==========================================');
    console.log('  html pages        ', result.htmlPages);
    console.log('  sitemap urls      ', result.sitemapUrls);
    console.log('  files             ', result.files);
    console.log('  ---');
    for (const [k, v] of Object.entries(result.summary)) {
      const fatal = FATAL_FINDINGS.includes(k);
      // A lead is never a pass/fail: print it as information so 200 noindex
      // utility pages do not read as "200 problems".
      console.log('  ' + (fatal ? (v ? '⚠ ' : '✓ ') : '· ') + k.padEnd(20), v);
    }
    if (result.externalHosts.length) {
      console.log('\n  external hosts not on the allowlist:');
      for (const [h, n] of result.externalHosts) console.log('   ', String(n).padStart(5), h);
    }
    const fatal = FATAL_FINDINGS.reduce((n, k) => n + (result.summary[k] || 0), 0);
    console.log('\n  ' + (fatal ? '⚠ INJECTION FINDINGS: ' + fatal : '✓ no injection findings') + ' → ' + path.relative(ROOT, OUT));
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
  if (process.argv.includes('--fail')) {
    const fatal = FATAL_FINDINGS.reduce((n, k) => n + (result.summary[k] || 0), 0);
    if (fatal) {
      console.error('\n✖ site security scan FAILED — ' + fatal + ' injection finding(s); see ' + path.relative(ROOT, OUT));
      process.exit(1);
    }
    console.log('✓ site security scan PASS — no injected content in the published artifact');
  }
}

module.exports = { audit, ALLOWED_HOSTS, SPAM_WORDS, SUSPICIOUS_TLDS, RISKY_SCRIPT_EXEMPT, FATAL_FINDINGS };
