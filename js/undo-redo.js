// Undo/Redo stack manager - localStorage based
const UndoRedo = (function () {
  const STACK_KEY = 'calcpro_undoredostack';
  const MAX_DEPTH = 50;
  
  let stack = [];
  let index = -1;
  let savedData = {};

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
    undoContainer.innerHTML = '<div class="undo-redo-toolbar"><button class="undo-btn" onclick="UndoRedo.undo()" ' + (!canUndo() ? 'disabled' : '') + ' title="Undo (Ctrl+Z)">↶ Undo</button><button class="redo-btn" onclick="UndoRedo.redo()" ' + (!canRedo() ? 'disabled' : '') + ' title="Redo (Ctrl+Y)">↷ Redo</button><button class="clear-stack-btn" onclick="UndoRedo.clear()" title="Clear History">🗑️ Clear</button></div>';
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

  return { saveState, undo, redo, canUndo, canRedo, clear, getHistory, restoreState, enableUndoRedoForTool, init };
})();
if (typeof window !== 'undefined') window.UndoRedo = UndoRedo;