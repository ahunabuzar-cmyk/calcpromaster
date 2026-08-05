// ====== Global preferences store (client-only) ======
// Tiny pub/sub store for the global Currency ($/₹/€) and Unit (km/miles)
// switchers. Persists to localStorage so the choice survives reloads.
// The header SettingsBar writes here; ToolEngine subscribes and re-renders.

const KEY = 'calcpro_next_prefs';
const DEFAULT = { currency: 'USD', unit: 'km' };

let prefs = { ...DEFAULT };
let loaded = false;
const listeners = new Set();

function load() {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) prefs = { ...DEFAULT, ...JSON.parse(raw) };
  } catch (e) { /* corrupt prefs → defaults */ }
  loaded = true;
}

export function getPrefs() {
  if (!loaded) load();
  return prefs;
}

export function setPrefs(patch) {
  if (!loaded) load();
  prefs = { ...prefs, ...patch };
  if (typeof window !== 'undefined') {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* private mode */ }
  }
  listeners.forEach((fn) => { try { fn(prefs); } catch (e) { /* ignore */ } });
}

export function subscribe(fn) {
  if (!loaded) load();
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
