// Calculation history - localStorage based, max 200 items
const CalcHistory = (function () {
  const KEY = 'calcpro_history';
  const MAX = 200;

  function getAll() { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  function add(entry) {
    const items = getAll();
    items.unshift({ ...entry, ts: Date.now() });
    if (items.length > MAX) items.length = MAX;
    localStorage.setItem(KEY, JSON.stringify(items));
  }
  function remove(idx) {
    const items = getAll();
    items.splice(idx, 1);
    localStorage.setItem(KEY, JSON.stringify(items));
  }
  function clear() { localStorage.removeItem(KEY); }

  function toggle() {
    const panel = document.getElementById('history-panel');
    if (!panel) return;
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) render();
  }

  function render() {
    const list = document.getElementById('history-list');
    if (!list) return;
    const items = getAll();
    if (items.length === 0) { list.innerHTML = '<p style="padding:1rem;color:var(--text-muted)">No history yet</p>'; return; }
    // XSS-hardening: history results can hold HTML/crafted values from shared URLs — always escape
    list.innerHTML = items.map((it, i) => `
      <div class="history-item">
        <div class="history-tool">${Security.sanitizeHtml(it.tool || 'Calculator')}</div>
        <div class="history-result">${Security.sanitizeHtml(it.result || '')}</div>
        <div class="history-time">${new Date(it.ts).toLocaleString()}</div>
        <button class="history-del" onclick="CalcHistory.remove(${i})">×</button>
      </div>`).join('');
  }

  return { getAll, add, remove, clear, toggle, render };
})();
if (typeof window !== 'undefined') window.CalcHistory = CalcHistory;
