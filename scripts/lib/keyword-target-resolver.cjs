#!/usr/bin/env node
// ============================================================
// CalcProMaster — keyword → target-page resolver
// ------------------------------------------------------------
// docs/KEYWORD-IMPLEMENTATION-MAP.md decides which page owns each of the 115
// actionable keywords, but 77 of the B/C/D rows record NO target URL — the map
// says "resolve by internal linking/metadata first" and leaves it there. A
// decision with no page cannot be implemented, so this module turns every such
// row into a concrete route drawn from the LIVE registry (js/data/*.js: id +
// name + curated `kw` phrases + desc), never from an invented page.
//
// The scoring is deliberately strict and inspectable, because the map itself
// warns that its own token matcher produced noise (walking-transit for "time
// card clock calculator"). A route qualifies only when it contains EVERY
// non-filler concept token of the keyword in its id/name/kw text; partial hits
// are reported, never silently accepted as an owner.
//
// Usage (from scripts/apply-keyword-targets.cjs):
//   const { resolveTarget } = require('./lib/keyword-target-resolver.cjs');
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');

// Same filler set the map generator drops, so the token spaces line up.
const FILLER = new Set(['calculator', 'calculators', 'calc', 'tool', 'tools', 'online', 'free', 'the', 'a', 'an', 'for', 'of', 'to', 'in', 'my', 'how', 'much', 'what', 'is']);

function tokensOf(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter((t) => t && !FILLER.has(t));
}

// Singular/plural fold only; no stemming, so "compounding" and "compounded"
// stay distinct tokens (they map to different tools).
function fold(t) {
  return (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) ? t.slice(0, -1) : t;
}

function loadRegistry() {
  const ctx = { window: {}, console };
  ctx.window.window = ctx.window;
  vm.createContext(ctx);
  const dir = path.join(ROOT, 'js', 'data');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
  }
  const W = ctx.window;
  const tools = [];
  for (const k of Object.keys(W)) {
    if (/_TOOLS$/.test(k) && Array.isArray(W[k])) for (const t of W[k]) tools.push(t);
  }
  return tools;
}

// Live route of every registry tool, read from the generated SEO table, which
// already carries `canonicalPath` for all 1,284 tools. This keeps the resolver
// aligned with what the build actually ships.
function loadToolRoutes() {
  const src = fs.readFileSync(path.join(ROOT, 'js', 'seo-content.js'), 'utf8');
  const sandbox = { window: {}, console: { log() {}, warn() {}, error() {} } };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  const seo = sandbox.window.TOOL_SEO || {};
  const byId = new Map();
  for (const [id, e] of Object.entries(seo)) {
    if (e && e.canonicalPath) byId.set(id, e.canonicalPath);
  }
  return byId;
}

function normaliseRoute(route) {
  if (!route) return '';
  const clean = String(route).replace(/^https?:\/\/[^/]+/, '').replace(/[?#].*$/, '');
  const trimmed = clean.replace(/\/+$/, '');
  return trimmed ? trimmed + '/' : '/';
}

// Rank every tool by how many concept tokens its id/name/kw text contains.
// Only all-token matches are returned as candidates.
function rankTools(keyword, tools, routes) {
  const want = [...new Set(tokensOf(keyword).map(fold))];
  if (!want.length) return [];
  const scored = [];
  for (const t of tools) {
    const hay = [...tokensOf([t.id, t.name, t.kw].join(' ')).map(fold)];
    const set = new Set(hay);
    let hits = 0;
    for (const w of want) if (set.has(w)) hits++;
    if (hits !== want.length) continue;
    // Prefer a name/id hit over a curated-kw-only hit, then a shorter name.
    const nameHay = new Set(tokensOf([t.id, t.name].join(' ')).map(fold));
    const nameHits = want.filter((w) => nameHay.has(w)).length;
    scored.push({ id: t.id, name: t.name, route: normaliseRoute(routes.get(t.id)), hits, nameHits, tokens: want.length });
  }
  scored.sort((a, b) => b.nameHits - a.nameHits || b.hits - a.hits || a.name.length - b.name.length || a.id.localeCompare(b.id));
  return scored;
}

module.exports = { FILLER, tokensOf, fold, loadRegistry, loadToolRoutes, normaliseRoute, rankTools, ROOT };
