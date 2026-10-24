/* ============================================================
 * PortfolioStore — lightweight multi-property save & revisit model
 * ------------------------------------------------------------
 * Local-only persistence (localStorage), no accounts, no network.
 * This is the data model for rental-property / portfolio tracking.
 * Full accounts and cross-device sync are a later feature; this
 * module deliberately works today with zero login.
 *
 * Record shape:
 *   { id, name, value, monthlyRent, monthlyCosts, mortgage, savedAt }
 * ============================================================ */
(function (root) {
  'use strict';

  var KEY = 'calcprom:portfolio:v1';
  var MAX = 200;
  var memory = [];

  function storage() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) return localStorage;
    } catch (e) { /* access can throw in some privacy modes */ }
    return null;
  }

  function sanitizeNumber(n) {
    n = Number(n);
    return isFinite(n) ? n : 0;
  }

  function normalize(input) {
    input = input || {};
    var now = Date.now();
    return {
      id: input.id || ('p_' + now.toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36)),
      name: String(input.name == null ? 'Property' : input.name).slice(0, 80),
      value: sanitizeNumber(input.value),
      monthlyRent: sanitizeNumber(input.monthlyRent),
      monthlyCosts: sanitizeNumber(input.monthlyCosts),
      mortgage: sanitizeNumber(input.mortgage),
      savedAt: input.savedAt || now
    };
  }

  function read() {
    var s = storage();
    if (!s) return memory.slice();
    try {
      var raw = s.getItem(KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }

  function write(list) {
    list = list.slice(0, MAX);
    var s = storage();
    if (!s) { memory = list.slice(); return list; }
    try { s.setItem(KEY, JSON.stringify(list)); }
    catch (e) { memory = list.slice(); }
    return list;
  }

  var PortfolioStore = {
    KEY: KEY,
    MAX: MAX,

    /** All saved properties, newest first. */
    list: function () {
      return read().slice().sort(function (a, b) { return (b.savedAt || 0) - (a.savedAt || 0); });
    },

    get: function (id) {
      return read().filter(function (p) { return p.id === id; })[0] || null;
    },

    /** Add a property, returning the stored record. */
    add: function (input) {
      var rec = normalize(input);
      var list = read();
      var existing = list.filter(function (p) { return p.id === rec.id; })[0];
      if (existing) { rec.savedAt = existing.savedAt; }
      list = list.filter(function (p) { return p.id !== rec.id; });
      list.unshift(rec);
      write(list);
      return rec;
    },

    /** Update fields of an existing property by id. */
    update: function (id, patch) {
      var list = read();
      var idx = -1;
      for (var i = 0; i < list.length; i++) { if (list[i].id === id) { idx = i; break; } }
      if (idx < 0) return null;
      list[idx] = normalize(Object.assign({}, list[idx], patch || {}, { id: id, savedAt: list[idx].savedAt }));
      write(list);
      return list[idx];
    },

    remove: function (id) {
      var list = read();
      var next = list.filter(function (p) { return p.id !== id; });
      var removed = next.length !== list.length;
      if (removed) write(next);
      return removed;
    },

    clear: function () {
      var s = storage();
      if (s) { try { s.removeItem(KEY); } catch (e) { /* ignore */ } }
      memory = [];
      return true;
    },

    /** Aggregate monthly net cash flow and gross yield across saved properties. */
    summary: function () {
      var list = read();
      var rent = 0, costs = 0, mortgage = 0, value = 0;
      list.forEach(function (p) {
        rent += p.monthlyRent || 0;
        costs += p.monthlyCosts || 0;
        mortgage += p.mortgage || 0;
        value += p.value || 0;
      });
      var net = rent - costs - mortgage;
      var yieldPct = value > 0 ? (rent * 12) / value * 100 : 0;
      return {
        count: list.length,
        monthlyRent: rent,
        monthlyCosts: costs,
        monthlyMortgage: mortgage,
        monthlyNet: net,
        annualNet: net * 12,
        grossYieldPct: yieldPct
      };
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = PortfolioStore;
  if (typeof window !== 'undefined') window.PortfolioStore = PortfolioStore;
})(typeof window !== 'undefined' ? window : globalThis);
