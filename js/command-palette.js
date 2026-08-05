// Command palette for quick calculator access
const CommandPalette = (function () {
  const OPEN_KEY = 'calcpro_cmd_open';
  const HISTORY_KEY = 'calcpro_cmd_history';
  const RESULTS_KEY = 'calcpro_cmd_results';
  const MAX_HISTORY = 10;
  const MAX_RESULTS = 5;
  
  let isOpen = false;
  let currentIndex = -1;
  let filteredResults = [];
  
  function getRecentCommands() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }
  
  function addToHistory(cmd) {
    const history = getRecentCommands();
    const filtered = history.filter(h => h !== cmd);
    filtered.unshift({ cmd, ts: Date.now() });
    if (filtered.length > MAX_HISTORY) filtered.length = MAX_HISTORY;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  }
  
  function getRecentResults() {
    try {
      return JSON.parse(localStorage.getItem(RESULTS_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }
  
  function addToResults(toolId, toolName, result) {
    const results = getRecentResults();
    const filtered = results.filter(r => r.id !== toolId);
    filtered.unshift({ id: toolId, name: toolName, result, ts: Date.now() });
    if (filtered.length > MAX_RESULTS) filtered.length = MAX_RESULTS;
    localStorage.setItem(RESULTS_KEY, JSON.stringify(filtered));
  }
  
  function buildMenuItems() {
    const recentCommands = getRecentCommands();
    const recentResults = getRecentResults();
    
    const commandItems = recentCommands.map(cmd => ({
      type: 'command',
      cmd: cmd.cmd,
      display: cmd.cmd,
      icon: '⌘',
      category: 'Recent Commands',
      result: null
    }));
    
    const resultItems = recentResults.map(result => ({
      type: 'result',
      cmd: result.id,
      display: result.name,
      icon: '📊',
      category: 'Recent Results',
      result: String(result.result).substring(0, 40) + '...'
    }));
    
    const calculatorItems = getCalCategories().map(cat => ({
      type: 'category',
      cmd: '/' + cat.id,
      display: cat.name,
      icon: cat.icon || '📈',
      category: 'Categories',
      result: null
    }));
    
    return [...resultItems, ...commandItems, ...calculatorItems].filter(item => item.display);
  }
  
  function filterResults(query) {
    if (!query) return [];
    const allItems = buildMenuItems();
    const searchLower = query.toLowerCase();
    
    return allItems.filter(item => {
      const inCmd = item.cmd.toLowerCase().includes(searchLower);
      const inDisplay = item.display.toLowerCase().includes(searchLower);
      const inResult = (item.result || '').toLowerCase().includes(searchLower);
      return inCmd || inDisplay || inResult;
    });
  }
  
    function renderResults() {
    const results = document.getElementById('cmdResults');
    if (!results) return;
    
    const query = document.getElementById('cmdInput').value;
    const filtered = filterResults(query);
    filteredResults = filtered;
    
    if (filtered.length === 0) {
      results.innerHTML = '<div class="cmd-empty">No results found</div>';
      return;
    }
    
    results.innerHTML = filtered.map((item, i) => `
      <div class="cmd-item ${i === currentIndex ? 'selected' : ''}" onclick="CommandPalette.selectItem(${i})" data-item-index="${i}">
        <span class="cmd-icon" style="color: var(--primary-color)">${item.icon}</span>
        <span class="cmd-cmd">${item.cmd}</span>
        <span class="cmd-desc">${item.display}</span>
        <span class="cmd-result" style="color: var(--text-light);font-size:12px;grid-column:2/span 3; margin-top:2px">${item.result || ''}</span>
      </div>
    `).join('');
  }
  
  function closePalette() {}
  function openPalette() {}
  
  function navigateToItem(item) {
    if (item.type === 'result') {
      App.navigateToTool(item.cmd, 'recent');
      App.closePalette();
    } else if (item.type === 'command') {
      addToHistory(item.cmd);
      App.executeCommand(item.cmd);
      App.closePalette();
    } else if (item.type === 'category') {
      App.navigate(item.cmd.substring(1)); // Remove leading '/'
      App.closePalette();
    }
  }
  
  function selectItem(index) {
    if (index >= 0 && index < filteredResults.length) {
      navigateToItem(filteredResults[index]);
    }
  }
  
  function init() {
    const overlay = document.getElementById('cmdPalette');
    const input = document.getElementById('cmdInput');
    const results = document.getElementById('cmdResults');
    
    // Override stub functions with real implementations
    closePalette = function() {
      if (!overlay) return;
      isOpen = false;
      overlay.classList.remove('active');
      currentIndex = -1;
      filteredResults = [];
      if (input) input.value = '';
    };
    openPalette = function() {
      if (!overlay || !input) return;
      isOpen = true;
      overlay.classList.add('active');
      input.focus();
      renderResults();
    };
    
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        togglePalette();
      }
    });
    
    function togglePalette() {
      if (isOpen) {
        closePalette();
      } else {
        openPalette();
      }
    }
    
    function onInputChange() {
      currentIndex = -1;
      renderResults();
    }
    
    function onKeyDown(e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        currentIndex = Math.min(currentIndex + 1, filteredResults.length - 1);
        renderResults();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        currentIndex = Math.max(currentIndex - 1, -1);
        renderResults();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentIndex >= 0) {
          navigateToItem(filteredResults[currentIndex]);
        }
      } else if (e.key === 'Escape') {
        closePalette();
      }
    }
    
    input?.addEventListener('input', onInputChange);
    input?.addEventListener('keydown', onKeyDown);
    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) closePalette();
    });
  }
  
  // Expose public API — closePalette defined at top level for access from init()
  return { init, closePalette, addToHistory, addToResults };
})();
if (typeof window !== 'undefined') window.CommandPalette = CommandPalette;