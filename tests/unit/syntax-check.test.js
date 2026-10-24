import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';

const require = createRequire(import.meta.url);
const { collectFiles, checkSyntax } = require('../../scripts/syntax-check.js');

// A throwaway tree shaped like the repo: js/, scripts/ and a root entry point.
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'syntax-check-'));
  fs.mkdirSync(path.join(root, 'js'), { recursive: true });
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(root, 'js', 'app.js'), 'const a = 1;\n');
  fs.writeFileSync(path.join(root, 'scripts', 'gate.cjs'), 'module.exports = 1;\n');
  fs.writeFileSync(path.join(root, 'scripts', 'esm.mjs'), 'export const a = 1;\n');
  fs.writeFileSync(path.join(root, 'scripts', 'notes.txt'), 'not javascript\n');
  fs.writeFileSync(path.join(root, 'build-deploy.js'), 'const a = 1;\n');
  return root;
}

describe('collectFiles', () => {
  it('covers .cjs — the extension this repo\'s gates actually use', () => {
    const files = collectFiles(fixture());
    expect(files).toContain('scripts/gate.cjs');
  });

  it('still covers .js and .mjs, in js/ and scripts/', () => {
    const files = collectFiles(fixture());
    expect(files).toContain('js/app.js');
    expect(files).toContain('scripts/esm.mjs');
  });

  it('includes root-level entry points', () => {
    expect(collectFiles(fixture())).toContain('build-deploy.js');
  });

  it('leaves non-script files alone', () => {
    expect(collectFiles(fixture())).not.toContain('scripts/notes.txt');
  });

  it('returns forward-slash paths so Windows and CI list the same files', () => {
    for (const f of collectFiles(fixture())) expect(f).not.toContain('\\');
  });

  it('walks the real repo and reaches the .cjs gates CI depends on', () => {
    const repoFiles = collectFiles(path.join(__dirname, '..', '..'));
    expect(repoFiles).toContain('scripts/check-sitemap-coverage.cjs');
    expect(repoFiles).toContain('scripts/seo-indexing-audit.cjs');
    expect(repoFiles).toContain('scripts/build-index-burndown.cjs');
    for (const f of repoFiles) expect(f).toMatch(/\.(cjs|mjs|js)$/);
  });

  it('covers the Pages Functions that run in front of every request', () => {
    const repoFiles = collectFiles(path.join(__dirname, '..', '..'));
    expect(repoFiles).toContain('functions/_middleware.js');
  });
});

describe('checkSyntax', () => {
  it('returns null for a file that parses', () => {
    const root = fixture();
    expect(checkSyntax(path.join(root, 'scripts', 'gate.cjs'))).toBeNull();
  });

  it('reports the parser error for a .cjs file that does not parse', () => {
    const root = fixture();
    const broken = path.join(root, 'scripts', 'broken.cjs');
    fs.writeFileSync(broken, 'function bad( {\n');
    const err = checkSyntax(broken);
    expect(err).toBeTruthy();
    expect(err).toContain('broken.cjs');
  });

  it('applies each file\'s own module type, so ESM is not a false positive', () => {
    const root = fixture();
    expect(checkSyntax(path.join(root, 'scripts', 'esm.mjs'))).toBeNull();
  });

  it('checks an ESM .js file (Pages Functions) without a CommonJS false positive', () => {
    const root = fixture();
    const fn = path.join(root, 'functions', '_middleware.js');
    fs.mkdirSync(path.dirname(fn), { recursive: true });
    fs.writeFileSync(fn, 'export async function onRequest(context) { return context.next(); }\n');
    expect(checkSyntax(fn)).toBeNull();
  });

  it('still reports a real syntax error inside an ESM .js file', () => {
    const root = fixture();
    const fn = path.join(root, 'functions', 'broken.js');
    fs.mkdirSync(path.dirname(fn), { recursive: true });
    fs.writeFileSync(fn, 'export async function onRequest( {\n');
    const err = checkSyntax(fn);
    expect(err).toBeTruthy();
    expect(err).toContain('broken.js');
  });
});
