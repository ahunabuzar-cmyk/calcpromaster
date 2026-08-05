// Personal Dashboard with Trend Tracking
const PersonalDashboard = (function () {
const DASHBOARD_KEY = 'calcpro_dashboard';
const TRENDS_KEY = 'calcpro_trends';
const GOALS_KEY = 'calcpro_goals';
const STREAKS_KEY = 'calcpro_streaks';
  
  let dashboardData = { widgets: [], layout: 'grid' };
  let trendsData = {};
  let goalsData = {};
  let streaksData = {};
  
  function init() {
    loadData();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renderDashboard);
    } else {
      renderDashboard();
    }
  }
  
  function loadData() {
    try {
      dashboardData = JSON.parse(localStorage.getItem(DASHBOARD_KEY) || '{"widgets":[],"layout":"grid"}');
      trendsData = JSON.parse(localStorage.getItem(TRENDS_KEY) || '{}');
      goalsData = JSON.parse(localStorage.getItem(GOALS_KEY) || '{}');
      streaksData = JSON.parse(localStorage.getItem(STREAKS_KEY) || '{}');
    } catch (e) {
      dashboardData = { widgets: [], layout: 'grid' };
      trendsData = {};
      goalsData = {};
      streaksData = {};
    }
  }
  
  function saveData() {
    localStorage.setItem(DASHBOARD_KEY, JSON.stringify(dashboardData));
    localStorage.setItem(TRENDS_KEY, JSON.stringify(trendsData));
    localStorage.setItem(GOALS_KEY, JSON.stringify(goalsData));
    localStorage.setItem(STREAKS_KEY, JSON.stringify(streaksData));
  }
  
  function trackCalculation(toolId, toolName, inputs, result) {
    const today = new Date().toISOString().split('T')[0];
    const key = `${toolId}_${today}`;
    
    if (!trendsData[key]) {
      trendsData[key] = { toolId, toolName, date: today, count: 0, inputs: [], results: [] };
    }
    trendsData[key].count++;
    trendsData[key].inputs.push(inputs);
    trendsData[key].results.push({ value: result, ts: Date.now() });
    
    if (trendsData[key].results.length > 50) {
      trendsData[key].results = trendsData[key].results.slice(-50);
    }
    
    updateStreak(toolId, today);
    saveData();
    checkGoals(toolId, result);
  }
  
  function updateStreak(toolId, today) {
    if (!streaksData[toolId]) {
      streaksData[toolId] = { current: 0, longest: 0, lastDate: null, dates: [] };
    }
    const streak = streaksData[toolId];
    
    if (streak.lastDate === today) return;
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const ystr = yesterday.toISOString().split('T')[0];
    
    if (streak.lastDate === ystr) {
      streak.current++;
    } else if (streak.lastDate) {
      streak.current = 1;
    } else {
      streak.current = 1;
    }
    
    streak.lastDate = today;
    streak.dates.push(today);
    if (streak.dates.length > 365) streak.dates.shift();
    if (streak.current > streak.longest) streak.longest = streak.current;
    
    saveData();
  }
  
  function calculateStreaks() {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const ystr = yesterday.toISOString().split('T')[0];
    
    return Object.entries(streaksData).map(([toolId, streak]) => {
      const isActive = streak.lastDate === today || streak.lastDate === ystr;
      return { toolId, ...streak, isActive };
    }).filter(s => s.current > 0).sort((a, b) => b.current - a.current);
  }
  
  function checkGoals(toolId, result) {
    const goal = goalsData[toolId];
    if (!goal || !goal.active) return;
    
    const numResult = parseFloat(String(result).replace(/[^0-9.-]/g, ''));
    if (isNaN(numResult)) return;
    
    let achieved = false;
    if (goal.type === 'target' && numResult >= goal.target) achieved = true;
    if (goal.type === 'below' && numResult <= goal.target) achieved = true;
    
    if (achieved && !goal.achieved) {
      goal.achieved = true;
      goal.achievedDate = new Date().toISOString();
      if (window.AdvancedFeatures) AdvancedFeatures.unlockAchievement('goal_achieved', { toolId, target: goal.target });
      if (window.App) App.showToast(`🎯 Goal achieved: ${goal.name}!`);
    }
    saveData();
  }
  
  function setGoal(toolId, name, type, target) {
    goalsData[toolId] = { name, type, target: parseFloat(target), active: true, created: Date.now() };
    saveData();
  }
  
  function getTrends(toolId, days = 30) {
    const cutoff = Date.now() - days * 86400000;
    return Object.values(trendsData)
      .filter(t => t.toolId === toolId && new Date(t.date).getTime() > cutoff)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }
  
  function getGoals() {
    return goalsData;
  }
  
  function addWidget(widget) {
    dashboardData.widgets.push({ ...widget, id: Date.now() });
    saveData();
    renderDashboard();
  }
  
  function removeWidget(widgetId) {
    dashboardData.widgets = dashboardData.widgets.filter(w => w.id !== widgetId);
    saveData();
    renderDashboard();
  }
  
  function showAddWidget() {
    const modal = document.getElementById('modalOverlay');
    const body = document.getElementById('modalBody');
    if (!modal || !body) return;
    
    body.innerHTML = `
      <h3>Add Dashboard Widget</h3>
      <div style="display:grid;gap:12px;margin-top:16px">
        <button class="action-btn" onclick="PersonalDashboard.addWidget({type:'trends'});document.getElementById('modalOverlay').classList.remove('active')">📈 Trends Tracker</button>
        <button class="action-btn" onclick="PersonalDashboard.addWidget({type:'goals'});document.getElementById('modalOverlay').classList.remove('active')">🎯 Goals Progress</button>
        <button class="action-btn" onclick="PersonalDashboard.addWidget({type:'streaks'});document.getElementById('modalOverlay').classList.remove('active')">🔥 Streaks</button>
        <button class="action-btn" onclick="PersonalDashboard.addWidget({type:'quickstats'});document.getElementById('modalOverlay').classList.remove('active')">📊 Quick Stats</button>
        <button class="action-btn" onclick="PersonalDashboard.addWidget({type:'favorites'});document.getElementById('modalOverlay').classList.remove('active')">⭐ Favorites</button>
        <button class="action-btn" onclick="PersonalDashboard.addWidget({type:'recent'});document.getElementById('modalOverlay').classList.remove('active')">🕒 Recent Calculations</button>
      </div>
    `;
    modal.classList.add('active');
  }
  
  function renderDashboard(attempt) {
    attempt = attempt || 0;
    // Self-healing boundary — catch corrupted localStorage, repair silently
    // Max 2 retries to prevent infinite recursion if recovery also fails
    try {
      return _renderDashboardSafe();
    } catch (err) {
      if (attempt >= 2) {
        try { if (typeof window._pushCrash === 'function') window._pushCrash(err, 'PersonalDashboard.renderDashboard-FATAL'); } catch(e) {}
        return;
      }
      // Wipe only the corrupted layout key, keep other data intact
      try { localStorage.removeItem(DASHBOARD_KEY); } catch(e) {}
      // Dispatch to Sentry crash log
      try {
        if (typeof window._pushCrash === 'function') {
          window._pushCrash(err, 'PersonalDashboard.renderDashboard');
        }
      } catch(e) {}
      // Reset to clean state and re-render
      dashboardData = { widgets: [], layout: 'grid' };
      return renderDashboard(attempt + 1);
    }
  }
  
  function _renderDashboardSafe() {
    const container = document.getElementById('personal-dashboard');
    if (!container) return;
    
    const recentTrends = getRecentTrends(7);
    const activeGoals = Object.entries(goalsData).filter(([_, g]) => g.active);
    const streaks = calculateStreaks();
    const totalCalcs = Object.values(trendsData).reduce((sum, t) => sum + t.count, 0);
    const uniqueTools = new Set(Object.values(trendsData).map(t => t.toolId)).size;
    const activeDays = new Set(Object.values(trendsData).map(t => t.date)).size;
    
    container.innerHTML = `
      <div class="dashboard-header">
        <h2>📊 Personal Dashboard</h2>
        <button class="action-btn small" onclick="PersonalDashboard.showAddWidget()">+ Add Widget</button>
      </div>
      <div class="dashboard-grid">
        ${renderWidget('trends', '📈 7-Day Trends', renderTrendWidget(recentTrends))}
        ${renderWidget('goals', '🎯 Active Goals', renderGoalsWidget(activeGoals))}
        ${renderWidget('streaks', '🔥 Calculation Streaks', renderStreakWidget(streaks))}
        ${renderWidget('quickstats', '📊 Quick Stats', renderQuickStatsWidget(totalCalcs, uniqueTools, activeDays))}
        ${renderWidget('favorites', '⭐ Favorite Tools', renderFavoritesWidget())}
        ${renderWidget('recent', '🕒 Recent Activity', renderRecentWidget())}
        ${dashboardData.widgets.map(w => renderCustomWidget(w)).join('')}
      </div>
    `;
  }
  
  function renderWidget(id, title, content) {
    return `<div class="dashboard-widget" data-widget="${id}"><h3>${title}</h3><div class="widget-content">${content}</div></div>`;
  }
  
  function getRecentTrends(days) {
    const cutoff = Date.now() - days * 86400000;
    return Object.values(trendsData)
      .filter(t => new Date(t.date).getTime() > cutoff)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }
  
  function renderTrendWidget(trends) {
    if (!trends.length) return '<p class="empty">No recent calculations. Start calculating to see trends!</p>';
    
    const byTool = {};
    trends.forEach(t => {
      if (!byTool[t.toolId]) byTool[t.toolId] = { name: t.toolName, count: 0, dates: [] };
      byTool[t.toolId].count += t.count;
      byTool[t.toolId].dates.push(t.date);
    });
    
    return `<div class="trend-list">${Object.entries(byTool).sort((a,b) => b[1].count - a[1].count).slice(0, 5).map(([id, data]) => `
      <div class="trend-item" onclick="App.navigateToTool('${Security.sanitizeJsString(id)}', '${Security.sanitizeJsString(getToolCategory(id))}')">
        <span class="trend-name">${Security.sanitizeHtml(data.name)}</span>
        <span class="trend-count">${data.count} calculations</span>
      </div>
    `).join('')}</div>`;
  }
  
  function renderGoalsWidget(goals) {
    if (!goals.length) return '<p class="empty">No active goals. <button class="action-btn small" onclick="PersonalDashboard.showGoalModal()">Set a Goal</button></p>';
    
    return `<div class="goals-list">${goals.map(([id, goal]) => `
      <div class="goal-item" onclick="App.navigateToTool('${Security.sanitizeJsString(id)}', '${Security.sanitizeJsString(getToolCategory(id))}')">
        <div class="goal-info">
          <strong>${Security.sanitizeHtml(goal.name)}</strong>
          <small>Target: ${goal.type === 'target' ? '≥' : '≤'} ${goal.target}</small>
        </div>
        <div class="goal-status ${goal.achieved ? 'achieved' : ''}">
          ${goal.achieved ? '✅ Achieved!' : '🎯 In Progress'}
        </div>
      </div>
    `).join('')}</div>`;
  }
  
  function renderStreakWidget(streaks) {
    if (!streaks.length) return '<p class="empty">No streaks yet. Use a calculator daily to build streaks!</p>';
    
    return `<div class="streaks-list">${streaks.slice(0, 5).map(s => `
      <div class="streak-item ${s.isActive ? 'active' : ''}" onclick="App.navigateToTool('${Security.sanitizeJsString(s.toolId)}', '${Security.sanitizeJsString(getToolCategory(s.toolId))}')">
        <span class="streak-name">${Security.sanitizeHtml(getToolName(s.toolId))}</span>
        <span class="streak-count">🔥 ${s.current} day${s.current !== 1 ? 's' : ''}</span>
        ${s.longest > s.current ? `<span class="streak-best">Best: ${s.longest}</span>` : ''}
      </div>
    `).join('')}</div>`;
  }
  
  function renderQuickStatsWidget(total, unique, days) {
    return `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${total.toLocaleString()}</div><div class="stat-label">Total Calculations</div></div>
        <div class="stat-card"><div class="stat-value">${unique}</div><div class="stat-label">Tools Used</div></div>
        <div class="stat-card"><div class="stat-value">${days}</div><div class="stat-label">Active Days</div></div>
        <div class="stat-card"><div class="stat-value">${Object.keys(goalsData).filter(k => goalsData[k].achieved).length}</div><div class="stat-label">Goals Achieved</div></div>
      </div>
    `;
  }
  
  function renderFavoritesWidget() {
    const favs = window.AdvancedFeatures ? AdvancedFeatures.getFavorites() : [];
    if (!favs.length) return '<p class="empty">No favorites yet. Click the ♥ on any calculator to add it.</p>';
    return `<div class="fav-list">${favs.slice(0, 5).map(f => `
      <button class="fav-item" onclick="App.navigateToTool('${Security.sanitizeJsString(f.id)}', '${Security.sanitizeJsString(f.cat)}')">${Security.sanitizeHtml(f.name)}</button>
    `).join('')}</div>`;
  }
  
  function renderRecentWidget() {
    const history = window.CalcHistory ? CalcHistory.getAll() : [];
    if (!history.length) return '<p class="empty">No history yet.</p>';
    return `<div class="recent-list">${history.slice(0, 5).map((h, i) => `
      <div class="recent-item" onclick="App.navigateToTool('${Security.sanitizeJsString(h.toolId || '')}', '${Security.sanitizeJsString(h.cat || '')}')">
        <span>${Security.sanitizeHtml(h.tool || 'Calculator')}</span>
        <small>${Security.sanitizeHtml(h.result || '')}</small>
      </div>
    `).join('')}</div>`;
  }
  
  function renderCustomWidget(widget) {
    return `<div class="dashboard-widget custom" data-widget="custom-${widget.id}"><h3>${widget.title || 'Custom'}</h3><div class="widget-content">${widget.content || 'Custom widget'}</div><button class="widget-remove" onclick="PersonalDashboard.removeWidget(${widget.id})">×</button></div>`;
  }
  
  function getToolCategory(toolId) {
    for (const [cat, data] of Object.entries(window.CALC_DATA || {})) {
      if (data.tools.some(t => t.id === toolId)) return cat;
    }
    return 'finance';
  }
  
  function getToolName(toolId) {
    const tool = window.TOOL_MAP?.[toolId];
    return tool?.name || toolId;
  }
  
  function showGoalModal() {
    const modal = document.getElementById('modalOverlay');
    const body = document.getElementById('modalBody');
    if (!modal || !body) return;
    
    body.innerHTML = `
      <h3>Set Calculation Goal</h3>
      <form onsubmit="PersonalDashboard.submitGoal(event)">
        <div class="input-group"><label>Calculator</label><select id="goal-tool" required>${Object.values(window.CALC_DATA || {}).flatMap(c => c.tools).map(t => `<option value="${t.id}">${t.name} (${c.name})</option>`).join('')}</select></div>
        <div class="input-group"><label>Goal Name</label><input type="text" id="goal-name" placeholder="e.g., Keep mortgage payment under $2000" required></div>
        <div class="input-group"><label>Type</label><select id="goal-type"><option value="target">Result ≥ Target</option><option value="below">Result ≤ Target</option></select></div>
        <div class="input-group"><label>Target Value</label><input type="number" id="goal-target" step="any" required></div>
        <button type="submit" class="action-btn">Create Goal</button>
      </form>
    `;
    modal.classList.add('active');
  }
  
  function submitGoal(e) {
    e.preventDefault();
    const toolId = document.getElementById('goal-tool').value;
    const name = document.getElementById('goal-name').value;
    const type = document.getElementById('goal-type').value;
    const target = document.getElementById('goal-target').value;
    setGoal(toolId, name, type, target);
    document.getElementById('modalOverlay').classList.remove('active');
    renderDashboard();
  }
  
  return { 
    init, 
    trackCalculation, 
    getTrends, 
    getGoals, 
    setGoal, 
    addWidget, 
    removeWidget, 
    showAddWidget,
    showGoalModal,
    submitGoal,
    renderDashboard,
    calculateStreaks
  };
})();

if (typeof window !== 'undefined') window.PersonalDashboard = PersonalDashboard;