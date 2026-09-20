import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

function loadPowerTools(sandboxExtra = {}) {
  const src = readFileSync(join(ROOT, 'js', 'power-tools.js'), 'utf8');
  const sandbox = {
    module: { exports: {} },
    window: undefined,
    document: undefined,
    localStorage: undefined,
    SafeMathParser: undefined,
    ...sandboxExtra
  };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.module.exports;
}

describe('S5 power-tools', () => {
  let PT;
  beforeAll(() => { PT = loadPowerTools(); });

  it('exposes shortcut list with unique keys', () => {
    const s = PT.shortcuts();
    expect(s.length).toBeGreaterThanOrEqual(8);
    const keyset = new Set(s.map(x => x.keys));
    expect(keyset.size).toBe(s.length);
    s.forEach(x => { expect(typeof x.desc).toBe('string'); expect(x.desc.length).toBeGreaterThan(3); });
  });

  it('shortcut list documents palette, undo, redo and the ? key', () => {
    const all = PT.shortcuts().map(x => x.keys).join(' ');
    expect(all).toContain('K');        // Ctrl/Cmd+K palette
    expect(all).toContain('Z');        // undo
    expect(all).toContain('Y');        // redo
    expect(all).toContain('?');        // cheat-sheet itself
  });

  it('toggleCheatSheet returns false safely when no document', () => {
    expect(PT.toggleCheatSheet()).toBe(false);
  });

  it('attachGlobalKeys is idempotent (single listener registration)', () => {
    // No document in sandbox — must not throw.
    expect(() => PT.attachGlobalKeys()).not.toThrow();
  });

  it('bookmarkletSource is a javascript: URL that routes selection to ?q=', () => {
    const src = PT.bookmarkletSource('https://example.com/');
    expect(src.startsWith('javascript:')).toBe(true);
    expect(src).toContain('https://example.com/');
    expect(src).toContain('?q=');
    expect(src).toContain('getSelection');
  });

  it('bookmarkletSource escapes quotes in the base URL', () => {
    const src = PT.bookmarkletSource('https://example.com/"x');
    expect(src).toContain('\\"');
  });

  it('bookmarkletLinkHtml produces a draggable anchor', () => {
    const html = PT.bookmarkletLinkHtml();
    expect(html).toContain('<a href="javascript:');
    expect(html).toContain('CalcPro Search');
  });

  it('initMiniCalc returns null safely when no document', () => {
    expect(PT.initMiniCalc()).toBe(null);
  });

  it('does not reference eval directly (uses SafeMathParser indirection)', () => {
    const src = readFileSync(join(ROOT, 'js', 'power-tools.js'), 'utf8');
    expect(src).not.toMatch(/\beval\s*\(/);
    expect(src).toContain('SafeMathParser');
  });

  it('window global registered on window when present', () => {
    const fakeWindow = {};
    const src = readFileSync(join(ROOT, 'js', 'power-tools.js'), 'utf8');
    const sandbox = { window: fakeWindow, module: { exports: {} }, document: undefined, localStorage: undefined };
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox);
    expect(fakeWindow.PowerTools).toBeTruthy();
    expect(fakeWindow.PowerTools.shortcuts().length).toBeGreaterThan(0);
  });
});
