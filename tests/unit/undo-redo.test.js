import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');

function loadUndoRedo(storage = {}) {
  const src = readFileSync(join(ROOT, 'js', 'undo-redo.js'), 'utf8');
  const sandbox = {
    window: {},
    localStorage: {
      _s: storage,
      getItem(k) { return k in this._s ? this._s[k] : null; },
      setItem(k, v) { this._s[k] = String(v); },
      removeItem(k) { delete this._s[k]; }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.window.UndoRedo;
}

describe('undo-redo stack (S1#5 wiring)', () => {
  it('saveState pushes only states with input; empty returns null', () => {
    const UR = loadUndoRedo();
    expect(UR.saveState(() => ({ input: { a: 1 } }))).toBeTruthy();
    expect(UR.saveState(() => ({}))).toBe(null);
    expect(UR.getHistory().length).toBe(1);
  });

  it('undo pops the latest state and flags it', () => {
    const UR = loadUndoRedo();
    UR.saveState(() => ({ input: { a: 1 } }));
    UR.saveState(() => ({ input: { a: 2 } }));
    const s = UR.undo();
    expect(s.undone).toBe(true);
    expect(s.input.a).toBe(2);
    expect(UR.undo().input.a).toBe(1);
    expect(UR.undo()).toBe(null); // stack exhausted
  });

  it('redo returns the undone state', () => {
    const UR = loadUndoRedo();
    UR.saveState(() => ({ input: { a: 1 } }));
    UR.saveState(() => ({ input: { a: 2 } }));
    UR.undo();
    const s = UR.redo();
    expect(s.redone).toBe(true);
    expect(s.input.a).toBe(2);
    expect(UR.redo()).toBe(null);
  });

  it('new save after undo truncates the redo branch', () => {
    const UR = loadUndoRedo();
    UR.saveState(() => ({ input: { a: 1 } }));
    UR.saveState(() => ({ input: { a: 2 } }));
    UR.undo();
    UR.saveState(() => ({ input: { a: 3 } }));
    expect(UR.canRedo()).toBe(false);
    expect(UR.getHistory().length).toBe(2);
  });

  it('onRestore fires with the restored state on undo and redo', () => {
    const UR = loadUndoRedo();
    const seen = [];
    UR.onRestore(s => seen.push(s));
    UR.saveState(() => ({ input: { a: 1 } }));
    UR.saveState(() => ({ input: { a: 2 } }));
    UR.undo();
    UR.redo();
    expect(seen.length).toBe(2);
    expect(seen[0].input.a).toBe(2);
    expect(seen[0].undone).toBe(true);
    expect(seen[1].redone).toBe(true);
  });

  it('onRestore callback errors never break undo()', () => {
    const UR = loadUndoRedo();
    UR.onRestore(() => { throw new Error('boom'); });
    UR.saveState(() => ({ input: { a: 1 } }));
    expect(() => UR.undo()).not.toThrow();
    expect(UR.undo()).toBe(null); // stack moved correctly despite callback error
  });

  it('onRestore with a non-function is ignored', () => {
    const UR = loadUndoRedo();
    UR.onRestore('nope');
    UR.saveState(() => ({ input: { a: 1 } }));
    expect(UR.undo().input.a).toBe(1);
  });

  it('stack persists to localStorage and clear() wipes it', () => {
    const storage = {};
    const UR = loadUndoRedo(storage);
    UR.saveState(() => ({ input: { a: 1 } }));
    expect(Object.keys(storage).length).toBe(1);
    UR.clear();
    expect(Object.keys(storage).length).toBe(0);
    expect(UR.canUndo()).toBe(false);
  });
});
