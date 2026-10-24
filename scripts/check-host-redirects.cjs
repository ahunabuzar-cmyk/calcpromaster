#!/usr/bin/env node
// ============================================================
// CalcProMaster — host-consolidation regression check
// ------------------------------------------------------------
// The site must answer on ONE host. This probes the live edge and fails if:
//   - the apex stops returning 200, or
//   - www / <project>.pages.dev stop 301-ing to the apex, or
//   - the redirect drops the deep path.
//
// It is network-only (talks to the live site), so it runs in the weekly SEO
// refresh and can also be run by hand:
//   node scripts/check-host-redirects.cjs            # human-readable
//   node scripts/check-host-redirects.cjs --json     # machine-readable
//   node scripts/check-host-redirects.cjs --dry      # print the probe plan only
//
// Exit codes: 0 = all good, 1 = at least one regression.
// ============================================================
'use strict';
const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const JSON_OUT = process.argv.includes('--json');
const DRY = process.argv.includes('--dry');

// --- canonical host: single source of truth = js/site-config.js `domain:` ---
let ORIGIN = (process.env.SITE_URL || '').replace(/\/+$/, '');
if (!ORIGIN) {
  try {
    const cfg = fs.readFileSync(path.join(ROOT, 'js', 'site-config.js'), 'utf8');
    const m = cfg.match(/domain:\s*'([^']+)'/);
    if (m && m[1]) ORIGIN = 'https://' + m[1].replace(/^https?:\/\//, '');
  } catch (e) { /* fall through */ }
}
if (!ORIGIN) ORIGIN = 'https://calcpromaster.com';

const HOST = ORIGIN.replace(/^https?:\/\//, '');
// Pages project name = the <project>.pages.dev origin (wrangler.toml `name`).
let PROJECT = 'calcpromaster';
try {
  const w = fs.readFileSync(path.join(ROOT, 'wrangler.toml'), 'utf8');
  const m = w.match(/^\s*name\s*=\s*"([^"]+)"/m);
  if (m && m[1]) PROJECT = m[1];
} catch (e) { /* default */ }

// Deep path used to prove the deep link (not just the root) is preserved.
const DEEP = '/health/pf-ratio/';

const PROBES = [
  { name: 'apex home',        url: ORIGIN + '/',                       expect: 200 },
  { name: 'apex deep link',   url: ORIGIN + DEEP,                      expect: 200 },
  { name: 'www root',         url: 'https://www.' + HOST + '/',        expect: 301, to: ORIGIN + '/' },
  { name: 'www deep link',    url: 'https://www.' + HOST + DEEP,       expect: 301, to: ORIGIN + DEEP },
  { name: 'pages.dev root',   url: 'https://' + PROJECT + '.pages.dev/',     expect: 301, to: ORIGIN + '/' },
  { name: 'pages.dev deep',   url: 'https://' + PROJECT + '.pages.dev' + DEEP, expect: 301, to: ORIGIN + DEEP },
];

// Trailing-slash consolidation (one URL per page).
// -----------------------------------------------------------------------------
// Google still lists 196 paths twice (e.g. /health/bmr-mifflin and
// /health/bmr-mifflin/) with impressions split between them. The edge already
// collapses those, but nothing failed CI if that behaviour ever regressed — a
// platform migration or a "Pretty URLs" setting flip would silently re-open the
// duplicates and split the ranking signals again. These probes pin the contract:
// the non-canonical form must 301/308 to the canonical URL, never answer 200.
const TWIN_PROBES = [
  { name: 'tool twin',     url: ORIGIN + '/health/bmr-mifflin', canonical: ORIGIN + '/health/bmr-mifflin/' },
  { name: 'category twin', url: ORIGIN + '/homegarden',         canonical: ORIGIN + '/homegarden/' },
  { name: 'hub twin',      url: ORIGIN + '/hub/finance',        canonical: ORIGIN + '/hub/finance/' },
  { name: 'guide twin',    url: ORIGIN + '/guides/tip/',        canonical: ORIGIN + '/guides/tip' },
  { name: 'page twin',     url: ORIGIN + '/about.html',         canonical: ORIGIN + '/about' },
];

// Pure: decide pass/fail for one twin probe. Exported for tests.
function evaluateTwin(probe, res) {
  if (!res || typeof res.status !== 'number' || res.status === 0) {
    return { ok: false, detail: 'no response' + (res && res.error ? ' (' + res.error + ')' : '') };
  }
  if (res.status === 200) {
    return { ok: false, detail: 'answers 200 — duplicate URL, must redirect to ' + probe.canonical };
  }
  if (res.status < 300 || res.status >= 400) {
    return { ok: false, detail: 'expected a 301/308 redirect, got ' + res.status };
  }
  if (!res.location) {
    return { ok: false, detail: String(res.status) + ' without a Location header' };
  }
  // Cloudflare answers with a RELATIVE Location ("/health/x/"), so resolve it
  // against the probe URL before comparing — and compare exactly, trailing
  // slash included: that slash is the whole point of this check.
  let target;
  try { target = new URL(res.location, probe.url).toString(); } catch (e) { target = res.location; }
  if (target !== probe.canonical) {
    return { ok: false, detail: 'Location "' + target + '" != "' + probe.canonical + '"' };
  }
  return { ok: true, detail: res.status + ' -> ' + target };
}

// Pure: decide pass/fail for one probe. Exported for tests.
function evaluate(probe, res) {
  if (!res || typeof res.status !== 'number' || res.status === 0) {
    return { ok: false, detail: 'no response' + (res && res.error ? ' (' + res.error + ')' : '') };
  }
  if (res.status !== probe.expect) {
    return { ok: false, detail: 'expected ' + probe.expect + ', got ' + res.status };
  }
  if (probe.to) {
    const norm = (u) => String(u || '').replace(/\/+$/, '');
    if (norm(res.location) !== norm(probe.to)) {
      return { ok: false, detail: 'Location "' + (res.location || '(none)') + '" != "' + probe.to + '"' };
    }
  }
  return { ok: true, detail: String(res.status) + (res.location ? ' -> ' + res.location : '') };
}

// Mixed-scheme chain audit.
// -----------------------------------------------------------------------------
// PROBES above only test the https hosts, which is why they all pass while a
// real 2-hop chain still exists: plain-http on www is upgraded to https by the
// zone's "Always Use HTTPS" setting FIRST, and only then does our Pages
// middleware redirect www -> apex. That is one extra round trip for every
// http://www visitor (and for any legacy link Google still has).
//
// This trace counts the redirects a browser actually follows, so the chain is
// visible instead of implied. It WARNS rather than fails: the single remaining
// hop can only be removed in the Cloudflare dashboard (a zone Redirect Rule that
// runs before Always Use HTTPS) — failing CI on it forever would just train
// people to ignore a red build.
const CHAIN_PROBES = [
  { name: 'http apex', url: 'http://' + HOST + '/', maxHops: 1 },
  { name: 'http www', url: 'http://www.' + HOST + '/', maxHops: 1 },
];

// HSTS coverage per host.
// -----------------------------------------------------------------------------
// Crawlers report "subdomain doesn't support HSTS" for every hostname that
// answers without Strict-Transport-Security. The apex gets the header from
// deploy/_headers, but www answers with a 301 that Cloudflare generates BEFORE
// any project header is applied, so www can only get HSTS from a zone-level
// Response Header Transform Rule. Probes every host the site answers on and
// reports which ones still lack the header.
const HSTS_PROBES = [
  { name: 'apex', url: ORIGIN + '/' },
  { name: 'www', url: 'https://www.' + HOST + '/' },
  { name: 'pages.dev', url: 'https://' + PROJECT + '.pages.dev/' },
];

async function traceHops(url, maxHops) {
  const hops = [];
  let next = url;
  for (let i = 0; i <= maxHops + 2; i++) {
    const res = await fetch(next, { redirect: 'manual', headers: { 'User-Agent': 'CalcProMaster-host-check/1.0' } });
    const loc = res.headers.get('location');
    hops.push({ url: next, status: res.status, location: loc });
    if (res.status < 300 || res.status >= 400 || !loc) break;
    next = new URL(loc, next).toString();
    if (hops.length > maxHops + 2) break;
  }
  return { hops, finalUrl: hops[hops.length - 1].url, redirects: hops.filter((h) => h.status >= 300 && h.status < 400).length };
}

function fetchHead(url) {
  return new Promise((resolve) => {
    const req = https.request(url, {
      method: 'GET',
      headers: { 'User-Agent': 'CalcProMaster-host-check/1.0' }
    }, (res) => {
      res.resume(); // drain — we only need status + Location
      resolve({
        status: res.statusCode,
        location: res.headers.location || null,
        hsts: res.headers['strict-transport-security'] || null,
      });
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.setTimeout(15000, () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
    req.end();
  });
}

async function main() {
  if (DRY) {
    console.log('Probe plan for ' + ORIGIN + ' (project: ' + PROJECT + '):');
    for (const p of PROBES) console.log('  [' + p.expect + '] ' + p.name.padEnd(16) + p.url);
    return;
  }


  const results = [];
  for (const p of PROBES) {
    const res = await fetchHead(p.url);
    const v = evaluate(p, res);
    results.push({ ...p, ...res, ok: v.ok, detail: v.detail });
  }

  const failed = results.filter((r) => !r.ok);

  // Trailing-slash twins: a 200 here is a live duplicate page.
  const twins = [];
  for (const t of TWIN_PROBES) {
    const res = await fetchHead(t.url);
    const v = evaluateTwin(t, res);
    twins.push({ ...t, status: res.status, location: res.location, ok: v.ok, detail: v.detail });
  }
  const twinsFailed = twins.filter((t) => !t.ok);

  // HSTS: a host with no header is a notice, not a broken build — the fix for a
  // redirecting host lives in the Cloudflare dashboard (see the hint below).
  const hsts = [];
  for (const h of HSTS_PROBES) {
    const res = await fetchHead(h.url);
    hsts.push({ name: h.name, url: h.url, status: res.status, hsts: res.hsts, ok: !!res.hsts });
  }
  const hstsMissing = hsts.filter((h) => !h.ok);

  const payload = {
    ranAt: new Date().toISOString(),
    origin: ORIGIN,
    project: PROJECT,
    pass: failed.length === 0,
    hstsPass: hstsMissing.length === 0,
    probes: results.map((r) => ({ name: r.name, url: r.url, expect: r.expect, to: r.to || null, status: r.status, location: r.location, ok: r.ok, detail: r.detail })),
    twinsPass: twinsFailed.length === 0,
    twins: twins.map((t) => ({ name: t.name, url: t.url, canonical: t.canonical, status: t.status, location: t.location, ok: t.ok, detail: t.detail })),
    hsts,
  };

  if (JSON_OUT) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log('==========================================');
    console.log(' HOST-CONSOLIDATION CHECK — ' + ORIGIN);
    console.log('==========================================');
    for (const r of results) {
      console.log((r.ok ? '  ✅ ' : '  ❌ ') + r.name.padEnd(16) + r.detail);
    }
    console.log(failed.length ? '❌ FAIL — ' + failed.length + ' probe(s) regressed' : '✅ PASS — apex serves, duplicates 301 to the apex (path preserved)');
    console.log('---- one canonical URL per page (trailing-slash twins) ----');
    for (const t of twins) {
      console.log((t.ok ? '  ✅ ' : '  ❌ ') + t.name.padEnd(16) + t.detail);
    }
    console.log(twinsFailed.length ? '❌ FAIL — ' + twinsFailed.length + ' page(s) answer on two URL forms' : '✅ PASS — every twin form redirects to its canonical URL');
    for (const h of hsts) {
      console.log((h.ok ? '  ✅ ' : '  ⚠️  ') + ('hsts ' + h.name).padEnd(16) + (h.ok ? h.hsts : 'no Strict-Transport-Security on this host'));
    }
    if (hstsMissing.length) {
      console.log('\n  ⚠️  ' + hstsMissing.map((h) => h.name).join(', ') + ' answer(s) without HSTS.');
      console.log('     Fix (dashboard, one-time): Cloudflare → ' + HOST + ' → Rules → Transform Rules →');
      console.log('        Modify Response Header: set Strict-Transport-Security to');
      console.log('        "max-age=63072000; includeSubDomains; preload" when hostname in {"www.' + HOST + '"}');
      console.log('     A Pages custom-domain redirect is generated before deploy/_headers, so the header');
      console.log('     must come from the zone. Until then this is a notice, not a failure.');
    }
  }

  // Mixed-scheme chains (http -> https -> apex) are reported separately.
  const chains = [];
  for (const c of CHAIN_PROBES) {
    let t;
    try { t = await traceHops(c.url, c.maxHops); } catch (e) { t = { hops: [], finalUrl: c.url, redirects: 0, error: e.message }; }
    chains.push({ ...c, ...t, ok: t.redirects <= c.maxHops });
  }
  payload.chains = chains.map((c) => ({ name: c.name, url: c.url, redirects: c.redirects, hops: c.hops, ok: c.ok }));

  if (!JSON_OUT) {
    for (const c of chains) {
      console.log((c.ok ? '  ✅ ' : '  ⚠️  ') + c.name.padEnd(16) + c.redirects + ' redirect(s) → ' + c.finalUrl);
    }
    const extra = chains.filter((c) => !c.ok);
    if (extra.length) {
      console.log('\n  ⚠️  ' + extra.map((c) => c.name).join(', ') + ' take ' + extra.map((c) => c.redirects).join('/') + ' hops (1 is the target).');
      console.log('     Fix (dashboard, one-time): Cloudflare → calcpromaster.com → Rules → Redirect Rules →');
      console.log('        Rule: http://www.' + HOST + '/*  →  https://' + HOST + '/${1}  (301, preserve query)');
      console.log('     A zone Redirect Rule is evaluated before "Always Use HTTPS", so the scheme upgrade and');
      console.log('     the host move happen in ONE response. Until it exists this is a warning, not a failure.');
    }
  }

  if (failed.length || twinsFailed.length) process.exit(1);
}

if (require.main === module) {
  main().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
}

module.exports = { evaluate, evaluateTwin, PROBES, TWIN_PROBES, ORIGIN, PROJECT };
