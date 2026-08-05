// Multi-language UI Integration - connects i18n scaffold to actual UI
const I18nUI = (function () {
  let currentLocale = 'en';
  let observer = null;
  
  function init() {
    if (window.I18n) {
      currentLocale = I18n.getLocale();
      I18n.onLocaleChange(onLocaleChange);
    }
    
    createLanguageSelector();
    translateStaticUI();
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startObserving);
    } else {
      startObserving();
    }
  }
  
  function startObserving() {
    observer = new MutationObserver(function () {
      translateStaticUI();
    });
    // Restrict observation to main content area and footer only, not entire body
    var targetNode = document.getElementById('mainContent') || document.querySelector('main') || document.body;
    observer.observe(targetNode, { childList: true, subtree: true });
  }
  
  function onLocaleChange(locale) {
    currentLocale = locale;
    translateStaticUI();
    // Live-switch the currently-open calculator page too (not just the header):
    // translateCalculatorUI re-labels the action buttons / Inputs / Result in the
    // new locale. Falls back silently when no tool page is open.
    translateCalculatorUI(getCurrentToolId());
    updateLanguageSelector();
    document.documentElement.lang = locale;
    document.documentElement.dir = ['ar', 'he', 'fa', 'ur'].includes(locale) ? 'rtl' : 'ltr';
  }
  
  function getCurrentToolId() {
    try {
      if (window.App && App._currentTool && App._currentTool.tool) return App._currentTool.tool.id;
      if (window.App && App._state && App._state.tool && App._state.tool.tool) return App._state.tool.tool.id;
    } catch (e) {}
    return '';
  }
  
  function translateStaticUI() {
    if (!window.I18n) return;
    
    const t = I18n.t.bind(I18n);
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const translation = t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        if (el.hasAttribute('placeholder')) el.placeholder = translation;
        else el.value = translation;
      } else {
        el.textContent = translation;
      }
    });
    
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.dataset.i18nTitle);
    });
    
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      el.setAttribute('aria-label', t(el.dataset.i18nAria));
    });
  }
  
  function createLanguageSelector() {
    const existing = document.getElementById('language-selector');
    if (existing) return;
    
    const nav = document.querySelector('.nav-links');
    if (!nav) return;
    
    const locales = I18n ? I18n.getAvailableLocales() : [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español' },
      { code: 'hi', name: 'हिंदी' }
    ];
    
    const selector = document.createElement('div');
    selector.id = 'language-selector';
    selector.className = 'language-selector';
    selector.innerHTML = `
      <button class="lang-trigger" onclick="I18nUI.toggleDropdown()" aria-expanded="false" aria-haspopup="true">
        <span class="lang-flag">${getFlag(currentLocale)}</span>
        <span class="lang-code">${currentLocale.toUpperCase()}</span>
        <span class="lang-arrow">▼</span>
      </button>
      <div class="lang-dropdown" id="langDropdown" role="menu" hidden>
        ${locales.map(l => `
          <button role="menuitem" onclick="I18nUI.setLanguage('${l.code}')" class="lang-option ${l.code === currentLocale ? 'active' : ''}">
            <span class="lang-flag">${getFlag(l.code)}</span>
            <span class="lang-name">${l.name}</span>
            ${l.code === currentLocale ? '<span class="lang-check">✓</span>' : ''}
          </button>
        `).join('')}
      </div>
    `;
    
    nav.appendChild(selector);
    
    document.addEventListener('click', (e) => {
      if (!selector.contains(e.target)) closeDropdown();
    });
    
    if (!document.getElementById('i18n-ui-styles')) injectStyles();
  }
  
  function getFlag(code) {
    const flags = { en: '🇺🇸', es: '🇪🇸', hi: '🇮🇳', ur: '🇵🇰', fr: '🇫🇷', de: '🇩🇪', pt: '🇧🇷', ar: '🇸🇦', ru: '🇷🇺', ja: '🇯🇵', zh: '🇨🇳', ko: '🇰🇷', it: '🇮🇹', nl: '🇳🇱', tr: '🇹🇷', id: '🇮🇩', vi: '🇻🇳', th: '🇹🇭', bn: '🇧🇩' };
    return flags[code] || '🌐';
  }
  
  function toggleDropdown() {
    const dropdown = document.getElementById('langDropdown');
    const trigger = document.querySelector('.lang-trigger');
    if (!dropdown) return;
    
    const isOpen = !dropdown.hidden;
    dropdown.hidden = isOpen;
    trigger.setAttribute('aria-expanded', !isOpen);
  }
  
  function closeDropdown() {
    const dropdown = document.getElementById('langDropdown');
    const trigger = document.querySelector('.lang-trigger');
    if (dropdown) dropdown.hidden = true;
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }
  
  function updateLanguageSelector() {
    const trigger = document.querySelector('.lang-trigger');
    const dropdown = document.getElementById('langDropdown');
    if (!trigger || !dropdown) return;
    
    trigger.querySelector('.lang-flag').textContent = getFlag(currentLocale);
    trigger.querySelector('.lang-code').textContent = currentLocale.toUpperCase();
    
    dropdown.querySelectorAll('.lang-option').forEach(function (opt) {
      const code = String(opt.onclick).match(/'([^']+)'/)?.[1] || '';
      opt.classList.toggle('active', code === currentLocale);
      const checkEl = opt.querySelector('.lang-check');
      if (checkEl) checkEl.style.display = code === currentLocale ? 'inline' : 'none';
    });
  }
  
  function setLanguage(locale) {
    if (window.I18n && I18n.setLocale(locale)) {
      currentLocale = locale;
      closeDropdown();
      // Keep the address bar in sync: /xx/current-path (i18n SEO + shareable URLs).
      // Silent URL update — no re-render, so calculator inputs are preserved.
      if (window.Router && typeof Router.setLocale === 'function' &&
          typeof Router.syncUrl === 'function' && typeof Router.getCleanPath === 'function') {
        Router.setLocale(locale);
        Router.syncUrl(Router.getCleanPath());
      }
    }
  }
  
  function injectStyles() {
    const style = document.createElement('style');
    style.id = 'i18n-ui-styles';
    style.textContent = `
      .language-selector { position: relative; }
      .lang-trigger { 
        display: flex; align-items: center; gap: 6px;
        padding: 6px 10px; background: var(--surface);
        border: 1px solid var(--border); border-radius: var(--radius-sm);
        cursor: pointer; font-size: 13px; font-weight: 500;
        color: var(--text); transition: all 0.2s;
      }
      .lang-trigger:hover { border-color: var(--primary); }
      .lang-arrow { font-size: 10px; transition: transform 0.2s; }
      .lang-trigger[aria-expanded="true"] .lang-arrow { transform: rotate(180deg); }
      .lang-dropdown { 
        position: absolute; top: 100%; right: 0; z-index: 100;
        background: var(--surface); border: 1px solid var(--border);
        border-radius: var(--radius-sm); box-shadow: var(--shadow-lg);
        min-width: 160px; overflow: hidden; margin-top: 4px;
      }
      .lang-option { 
        display: flex; align-items: center; gap: 8px; width: 100%;
        padding: 10px 12px; border: none; background: transparent;
        text-align: left; cursor: pointer; font-size: 14px;
        color: var(--text); transition: background 0.15s;
      }
      .lang-option:hover { background: var(--bg); }
      .lang-option.active { background: rgba(79,124,255,0.1); }
      .lang-name { flex: 1; }
      .lang-check { color: var(--primary); font-weight: bold; display: none; }
      .lang-option.active .lang-check { display: inline; }
    `;
    document.head.appendChild(style);
  }
  
  function translateCalculatorUI(toolId) {
    if (!window.I18n) return;
    const t = I18n.t.bind(I18n);
    
    const labels = {
      'calculate': t('tool.calculate'),
      'auto_calc': t('tool.auto_calc'),
      'inputs': t('tool.inputs'),
      'result': t('tool.result'),
      'steps': t('result.steps_title'),
      'sensitivity': t('result.sensitivity_title'),
      'explain': t('result.explain_title'),
      'suggestions': t('result.suggestions_title'),
      'placeholder': t('result.placeholder'),
      'pin': t('tool.pin'),
      'chain': t('tool.chain'),
      'scenario': t('tool.scenario'),
      'voice': t('tool.voice'),
      'share': t('tool.share'),
      'solve_for': t('tool.solve_for'),
      'print': t('tool.print'),
      'pdf': t('tool.pdf'),
      'csv': t('tool.csv'),
      'settings': t('tool.settings'),
      'goal_seek': t('tool.goal_seek'),
      'batch': t('tool.batch'),
      'embed': t('tool.embed'),
      'load_preset': t('tool.load_preset'),
      'save_preset': t('tool.save_preset'),
    };
    
    Object.entries(labels).forEach(([key, value]) => {
      // SPAN wrappers inside buttons (icon + text) — replace just the text node
      document.querySelectorAll(`[data-i18n-btn="${key}"]`).forEach(el => {
        if (el.tagName === 'SPAN') el.textContent = value;
        else if (el.tagName === 'BUTTON') el.textContent = value;
        else if (el.tagName === 'INPUT') el.value = value;
      });
      // Legacy direct-action buttons (full text replacement)
      document.querySelectorAll(`[data-action="${key}"]`).forEach(el => {
        if (el.tagName === 'BUTTON') el.textContent = value;
        else if (el.tagName === 'INPUT') el.value = value;
      });
    });
    // Favorite button keeps its ★/☆ star — compose state + translated word so the
    // label never reverts to English on click or locale switch.
    document.querySelectorAll('[data-i18n-btn="favorite"]').forEach(el => {
      let id = '';
      const btn = el.closest('button');
      if (btn) id = btn.getAttribute('data-fav-btn') || '';
      let fav = false;
      try { if (id && window.AdvancedFeatures && window.AdvancedFeatures.isFavorite) fav = window.AdvancedFeatures.isFavorite(id); } catch (e) {}
      el.textContent = (fav ? '★ ' : '☆ ') + t(fav ? 'tool.favorited' : 'tool.favorite');
    });
  }
  
  return { init, translateStaticUI, translateCalculatorUI, setLanguage, getCurrentLocale: () => currentLocale };
})();

if (typeof window !== 'undefined') window.I18nUI = I18nUI;