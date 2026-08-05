// Timeline and milestone tracking for calculator history
const Timeline = (function () {
  const TIMELINE_KEY = 'calcpro_timeline';
  const MAX_ENTRIES = 50;
  
  let timeline = [];
  
  function addEvent(type, toolId, toolName, data, extra = {}) {
    const event = {
      type: type,
      toolId: toolId,
      toolName: toolName,
      data: data,
      ts: Date.now(),
      extra: extra,
      date: new Date().toISOString().split('T')[0]
    };
    timeline.unshift(event);
    if (timeline.length > MAX_ENTRIES) timeline.length = MAX_ENTRIES;
    localStorage.setItem(TIMELINE_KEY, JSON.stringify(timeline));
    renderTimeline();
    updateChartMilestones();
    updateAnalytics();
  }
  
  function updateChartMilestones() {
    // Top N achievements from timeline
    const achievements = timeline.filter(e => e.type === 'achievement').slice(0, 5);
    const chart = document.querySelector('.result-chart svg.chart');
    if (!chart || !achievements.length) {
      // Clear any existing milestones
      if (chart) {
        const existing = chart.querySelectorAll('.chart-milestone');
        existing.forEach(el => el.remove());
      }
      return;
    }
    
    // Render milestones on the chart
    const container = document.querySelector('.result-section');
    if (!container) return;
    
    let milestonesHtml = '<div class="chart-milestones">';
    achievements.forEach((a, i) => {
      milestonesHtml += `<div class="milestone-item"><div class="milestone-icon">🏆</div><div class="milestone-content"><div class="milestone-title">${a.toolName}</div><div class="milestone-desc">${a.data.description}</div><div class="milestone-date">${new Date(a.ts).toLocaleDateString()}</div></div></div>`;
    });
    milestonesHtml += '</div>';
    
    const existing = container.querySelector('.chart-milestones');
    if (existing) existing.remove();
    
    const resultChart = container.querySelector('.chart-container');
    if (resultChart) {
      resultChart.insertAdjacentHTML('afterend', milestonesHtml);
    }
  }
  
  function renderTimeline() {
    const panel = document.getElementById('timeline-panel');
    if (!panel) return;
    
    if (timeline.length === 0) {
      panel.style.display = 'none';
      return;
    }
    
    panel.style.display = 'block';
    let html = '<div class="timeline-header">Recent Activity <span class="timeline-count">(' + timeline.length + ')</span></div><div class="timeline-items">';
    
    timeline.slice(0, 20).forEach(event => {
      const icon = getEventIcon(event.type);
      const timeAgo = getTimeAgo(event.ts);
      // XSS-hardening: timeline events carry calc results/user strings — escape all interpolated data
      html += `<div class="timeline-item" data-type="${Security.sanitizeHtml(event.type)}"><div class="timeline-icon">${icon}</div><div class="timeline-content"><div class="timeline-header-row"><div class="timeline-title">${Security.sanitizeHtml(event.toolName || 'Calculator')}</div><div class="timeline-time" title="${new Date(event.ts).toLocaleString()}">${timeAgo}</div></div>${event.data.description ? '<div class="timeline-desc">' + Security.sanitizeHtml(event.data.description) + '</div>' : ''}${event.data.result ? '<div class="timeline-result">Result: ' + Security.sanitizeHtml(event.data.result) + '</div>' : ''}</div></div>`;
    });
    
    html += '</div><div class="timeline-footer"><button onclick="Timeline.clear()">Clear Timeline</button></div>';
    panel.innerHTML = html;
  }
  
  function getEventIcon(type) {
    const icons = {
      'calc': '📊',
      'achievement': '🏆',
      'favorite': '♥️',
      'pin': '📌',
      'comparison': '⚖️',
      'preset': '💾',
      'scenario': '📝',
      'share': '📤',
      'milestone': '📍'
    };
    return icons[type] || '🔔';
  }
  
  function getTimeAgo(ts) {
    const seconds = Math.floor((Date.now() - ts) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    const days = Math.floor(hours / 24);
    if (days < 30) return days + 'd ago';
    const months = Math.floor(days / 30);
    if (months < 12) return months + 'mo ago';
    const years = Math.floor(months / 12);
    return years + 'y ago';
  }
  
  function getTimeline() {
    return timeline;
  }
  
  function clear() {
    timeline = [];
    localStorage.removeItem(TIMELINE_KEY);
    renderTimeline();
    updateChartMilestones();
    updateAnalytics();
    App.showToast('Timeline cleared');
  }
  
  function updateAnalytics() {
    const analytics = CalcAnalytics.getData();
    if (analytics) {
      analytics.timelineEntries = timeline.length;
      localStorage.setItem('calcpro_analytics', JSON.stringify(analytics));
    }
  }
  
  function init() {
    try {
      timeline = JSON.parse(localStorage.getItem(TIMELINE_KEY) || '[]');
    } catch (e) {
      timeline = [];
    }
    
    // Listen for key calculator events
    document.addEventListener('app:calcComplete', (e) => {
      addEvent('calc', e.detail.toolId, e.detail.toolName, {
        inputs: e.detail.inputs,
        result: e.detail.result
      });
    });
    
    document.addEventListener('calc:achievement', (e) => {
      addEvent('achievement', e.detail.toolId, e.detail.toolName, {
        description: e.detail.description
      });
    });
    
    document.addEventListener('favorites:toggled', (e) => {
      addEvent('favorite', e.detail.toolId, e.detail.toolName, {});
    });
    
    document.addEventListener('pin:toggled', (e) => {
      addEvent('pin', e.detail.toolId, e.detail.toolName, {});
    });
    
    document.addEventListener('comparison:run', (e) => {
      addEvent('comparison', e.detail.toolId, e.detail.toolName, {
        scenarios: e.detail.scenarios.length
      });
    });
    
    document.addEventListener('preset:saved', (e) => {
      addEvent('preset', e.detail.toolId, e.detail.toolName, {});
    });
    
    document.addEventListener('scenario:saved', (e) => {
      addEvent('scenario', e.detail.toolId, e.detail.toolName, {});
    });
    
    document.addEventListener('share:generated', (e) => {
      addEvent('share', e.detail.toolId, e.detail.toolName, {});
    });
  }
  
  return { addEvent, init, getTimeline, renderTimeline, clear, updateAnalytics };
})();
if (typeof window !== 'undefined') window.Timeline = Timeline;