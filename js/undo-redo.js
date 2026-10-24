// Undo/Redo stack manager - localStorage based
const UndoRedo = (function () {
  const STACK_KEY = 'calcpro_undoredostack';
  const MAX_DEPTH = 50;
  
  let stack = [];
  let index = -1;
  let savedData = {};
  let onRestoreCb = null;

  // Register a callback invoked with the restored state whenever undo()/redo()
  // pops the stack. This is how the app applies the state back to the form —
  // without it, undo/redo only moves the stack pointer without visible effect.
  function onRestore(fn) { if (typeof fn === 'function') onRestoreCb = fn; }
  function _emitRestore(result) {
    if (onRestoreCb && result && result.input) {
      try { onRestoreCb(result); } catch (e) { /* applying a state must never throw */ }
    }
  }

  function saveState(callback) {
    const result = callback();
    if (result.input) {
      const state = {
        timestamp: Date.now(),
        ...result
      };
      
      savedData = {
        ...savedData,
        lastState: state
      };
      
      if (stack[index + 1]) {
        stack = stack.slice(0, index + 1);
      }
      
      stack.push(state);
      if (stack.length > MAX_DEPTH) {
        stack.shift();
        index--;
      } else {
        index++;
      }
      
      localStorage.setItem(STACK_KEY, JSON.stringify(stack));
      return state;
    }
    return null;
  }

  function undo() {
    if (index < 0) return null;
    const state = stack[index--];
    const result = {
      ...state,
      undone: true
    };
    _emitRestore(result);
    return result;
  }

  function redo() {
    if (index >= stack.length - 1) return null;
    index++;
    const state = stack[index];
    const result = {
      ...state,
      redone: true
    };
    _emitRestore(result);
    return result;
  }

  function canUndo() { return index >= 0; }
  function canRedo() { return index < stack.length - 1; }

  function clear() {
    stack = [];
    index = -1;
    savedData = {};
    localStorage.removeItem(STACK_KEY);
  }

  function getHistory() {
    return stack.map((s, i) => ({ ...s, index: i }));
  }

  function restoreState() {
    return savedData.lastState;
  }

  function enableUndoRedoForTool(toolId) {
    const undoContainer = document.getElementById('undo-redo-container');
    if (!undoContainer) return;
    // No inline onclick: the production CSP blocks inline handlers, so the
    // buttons silently did nothing on the deployed build (a hardening audit
    // failure too). Listeners are bound here instead.
    undoContainer.innerHTML = '<div class="undo-redo-toolbar" role="group" aria-label="Undo and redo">'
      + '<button type="button" class="undo-btn" title="Undo (Ctrl+Z)"' + (canUndo() ? '' : ' disabled') + '>↶ Undo</button>'
      + '<button type="button" class="redo-btn" title="Redo (Ctrl+Y)"' + (canRedo() ? '' : ' disabled') + '>↷ Redo</button>'
      + '<button type="button" class="clear-stack-btn" title="Clear history">🗑️ Clear</button>'
      + '</div>';
    const bind = (sel, fn) => {
      const btn = undoContainer.querySelector(sel);
      if (!btn) return;
      btn.addEventListener('click', function () {
        fn();
        // Re-render so the disabled state of Undo/Redo reflects the new stack.
        enableUndoRedoForTool(toolId);
      });
    };
    bind('.undo-btn', undo);
    bind('.redo-btn', redo);
    bind('.clear-stack-btn', clear);
    undoContainer.style.display = 'block';
  }

  function onKeyDown(e) {
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      undo();
    } else if (e.ctrlKey && e.key === 'y') {
      e.preventDefault();
      redo();
    }
  }

  function init() {
    document.addEventListener('keydown', onKeyDown);
  }

  return { saveState, undo, redo, canUndo, canRedo, clear, getHistory, restoreState, enableUndoRedoForTool, init, onRestore };
})();
if (typeof window !== 'undefined') window.UndoRedo = UndoRedo;