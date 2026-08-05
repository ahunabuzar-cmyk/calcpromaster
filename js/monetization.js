// ====== MonetizationManager (Pillar 1: Smart Affiliate & Ad Injection) ======
// 100% free tools — monetized via contextual, non-intrusive affiliate banners
// and native text links injected BELOW the calculation result.
// Category → offer mapping + returning-user rotation (fresh offers per visit).
const MonetizationManager = (function () {
  var ROT_KEY = 'calcpro_mnet_rotation';
  var HIDE_KEY = 'calcpro_mnet_hidden';

  // ⚠️ MANUAL ACTION NEEDED — REPLACE WITH YOUR AFFILIATE LINK (har url ke liye):
  // Har `url` neeche abhi bas brand homepage hai — COMMISSION NAHI deta.
  // Apni REAL affiliate link chalane ke liye har url mein apna affiliate tag
  // jodo, e.g.  https://nordpass.com/?ref=YOURAFFILIATEID  ya program ke
  // dedicated link. Saare URLs yahan OFFERS map mein hain — ek jagah.
  // Search "REPLACE WITH YOUR AFFILIATE LINK" karke saare urls dhundo.
  // (Jab tak real links nahi daalte, links neutral brand pages par jate hain,
  //  jo bhi ok hai — koi broken/tracking link nahi.)
  var OFFERS = {
    password: [
      { name: 'NordPass', url: 'https://nordpass.com/', tag: 'Password manager', emoji: '🔐' },
      { name: 'Bitwarden', url: 'https://bitwarden.com/', tag: 'Open-source vault', emoji: '🗝️' },
      { name: '1Password', url: 'https://1password.com/', tag: 'Family plans', emoji: '🔑' }
    ],
    security: [
      { name: 'NordVPN', url: 'https://nordvpn.com/', tag: 'Privacy protection', emoji: '🛡️' },
      { name: 'Surfshark', url: 'https://surfshark.com/', tag: 'Budget VPN', emoji: '🌊' }
    ],
    seo: [
      { name: 'Semrush', url: 'https://www.semrush.com/', tag: 'SEO & keyword research', emoji: '📊' },
      { name: 'Ahrefs', url: 'https://ahrefs.com/', tag: 'Backlink analysis', emoji: '🔗' }
    ],
    finance: [
      { name: 'Investopedia', url: 'https://www.investopedia.com/', tag: 'Financial education', emoji: '📈' },
      { name: 'NerdWallet', url: 'https://www.nerdwallet.com/', tag: 'Compare rates & cards', emoji: '💳' }
    ],
    health: [
      { name: 'WHO Guidelines', url: 'https://www.who.int/health-topics', tag: 'Health standards', emoji: '🩺' },
      { name: 'Mayo Clinic', url: 'https://www.mayoclinic.org/', tag: 'Trusted health info', emoji: '🏥' }
    ],
    fitness: [
      { name: 'MyFitnessPal', url: 'https://www.myfitnesspal.com/', tag: 'Calorie & macro tracking', emoji: '💪' },
      { name: 'Fitbit', url: 'https://www.fitbit.com/', tag: 'Activity trackers', emoji: '⌚' }
    ],
    food: [
      { name: 'KitchenAid', url: 'https://www.kitchenaid.com/', tag: 'Kitchen tools', emoji: '🍳' },
      { name: 'Serious Eats', url: 'https://www.seriouseats.com/', tag: 'Recipes & technique', emoji: '👨‍🍳' }
    ],
    education: [
      { name: 'Khan Academy', url: 'https://www.khanacademy.org/', tag: 'Free learning', emoji: '🎓' },
      { name: 'Coursera', url: 'https://www.coursera.org/', tag: 'Online courses', emoji: '📚' }
    ],
    conversion: [
      { name: 'XE.com', url: 'https://www.xe.com/', tag: 'Live currency rates', emoji: '💱' },
      { name: 'Google Units', url: 'https://www.google.com/search?q=unit+converter', tag: 'Quick conversions', emoji: '📐' }
    ],
    home: [
      { name: 'Wayfair', url: 'https://www.wayfair.com/', tag: 'Home improvement', emoji: '🏡' },
      { name: 'Home Depot', url: 'https://www.homedepot.com/', tag: 'DIY supplies', emoji: '🛠️' }
    ],
    auto: [
      { name: 'CarMax', url: 'https://www.carmax.com/', tag: 'Car pricing', emoji: '🚗' },
      { name: 'Kelley Blue Book', url: 'https://www.kbb.com/', tag: 'Vehicle values', emoji: '🚙' }
    ],
    career: [
      { name: 'LinkedIn Learning', url: 'https://www.linkedin.com/learning/', tag: 'Career skills', emoji: '💼' },
      { name: 'Upwork', url: 'https://www.upwork.com/', tag: 'Freelance work', emoji: '🧑‍💻' }
    ],
    tech: [
      { name: 'DigitalOcean', url: 'https://www.digitalocean.com/', tag: 'Cloud hosting', emoji: '☁️' },
      { name: 'Namecheap', url: 'https://www.namecheap.com/', tag: 'Domains & hosting', emoji: '🌐' }
    ],
    default: [
      { name: 'Amazon', url: 'https://www.amazon.com/', tag: 'Everyday essentials', emoji: '🛒' }
    ]
  };

  // Map tool/category ids → offer category key
  var CATEGORY_MAP = {
    'password-generator': 'password', 'password-strength': 'password', 'random-password': 'password',
    'vpn': 'security', 'security': 'security',
    'seo': 'seo', 'keyword': 'seo', 'backlink': 'seo',
    'loan-emi': 'finance', 'mortgage': 'finance', 'compound-interest': 'finance', 'simple-interest': 'finance', 'finance': 'finance',
    'bmi': 'health', 'bmr': 'health', 'health': 'health', 'calorie': 'fitness', 'fitness': 'fitness',
    'food': 'food', 'recipe': 'food',
    'education': 'education', 'gpa': 'education', 'school': 'education',
    'conversion': 'conversion', 'currency': 'conversion', 'unit': 'conversion',
    'home': 'home', 'garden': 'home',
    'auto': 'auto', 'car': 'auto', 'vehicle': 'auto',
    'career': 'career', 'salary': 'career', 'freelance': 'career',
    'tech': 'tech', 'digital': 'tech', 'data': 'tech', 'developer': 'tech'
  };

  // Track which offer was shown per visit — returning users see a different one
  function getRotationState() {
    try {
      var d = JSON.parse(localStorage.getItem(ROT_KEY) || '{}');
      return { day: d.day || '', shown: d.shown || [] };
    } catch (e) { return { day: '', shown: [] }; }
  }
  function saveRotationState(state) {
    try { localStorage.setItem(ROT_KEY, JSON.stringify(state)); } catch (e) { /* quota */ }
  }

  function getToday() { return new Date().toISOString().slice(0, 10); }

  // Stable per-session choice per category (fresh across visits, stable within a session)
  var SESSION_CACHE_KEY = 'calcpro_mnet_offer_cache';
  function getSessionCache() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_CACHE_KEY) || '{}'); } catch (e) { return {}; }
  }
  function setSessionChoice(catKey, offerName) {
    try {
      var c = getSessionCache();
      c[catKey] = offerName;
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(c));
    } catch (e) { /* ignore */ }
  }

  // Pick the next offer for a category (rotate within the category per visit)
  function pickOffer(catKey) {
    var offers = OFFERS[catKey] || OFFERS.default;
    if (!offers.length) return null;
    // Reuse this session's choice so the banner doesn't flip on every auto-calc
    var cache = getSessionCache();
    if (cache[catKey]) {
      var cachedOffer = offers.filter(function (o) { return o.name === cache[catKey]; })[0];
      if (cachedOffer) return cachedOffer;
    }
    var state = getRotationState();
    var today = getToday();
    if (state.day !== today) { state.day = today; state.shown = []; }

    // Find an offer not shown today; if all shown (fresh visits), pick the least-recent
    var fresh = offers.filter(function (o) { return state.shown.indexOf(o.name) === -1; });
    var chosen = (fresh.length ? fresh : offers)[0];
    state.shown.push(chosen.name);
    if (state.shown.length > 10) state.shown.shift();
    saveRotationState(state);
    setSessionChoice(catKey, chosen.name);
    return chosen;
  }

  function resolveCategory(toolId, catKey) {
    if (CATEGORY_MAP[toolId]) return CATEGORY_MAP[toolId];
    if (catKey && CATEGORY_MAP[catKey]) return CATEGORY_MAP[catKey];
    // keyword sniffing fallback
    if (toolId) {
      var t = (toolId || '') + ' ' + (catKey || '');
      if (/(password|token|secure|hash)/.test(t)) return 'password';
      if (/(seo|rank|keyword)/.test(t)) return 'seo';
      if (/(loan|emi|interest|invest|finance|tax|retire|mortgage)/.test(t)) return 'finance';
      if (/(bmi|health|heart|body|weight)/.test(t)) return 'health';
      if (/(calorie|fitness|macro)/.test(t)) return 'fitness';
    }
    return 'default';
  }

  // User dismissed the offer for this session
  function dismiss() {
    try { sessionStorage.setItem(HIDE_KEY, '1'); } catch (e) { /* ignore */ }
  }
  function isDismissed() {
    try { return sessionStorage.getItem(HIDE_KEY) === '1'; } catch (e) { return false; }
  }

  // Render a single contextual affiliate card under the result
  function render(toolId, catKey, containerId) {
    var container = document.getElementById(containerId || 'monetization-area');
    if (!container) return;
    if (isDismissed()) { container.style.display = 'none'; return; }
    var cat = resolveCategory(toolId, catKey);
    var offer = pickOffer(cat);
    if (!offer) { container.style.display = 'none'; return; }
    container.style.display = 'block';
    container.innerHTML =
      '<div class="mnet-card" role="complementary" aria-label="Sponsored recommendation">' +
        '<span class="mnet-badge">Recommended</span>' +
        '<span class="mnet-emoji">' + offer.emoji + '</span>' +
        '<div class="mnet-body">' +
          '<div class="mnet-name">' + offer.name + '</div>' +
          '<div class="mnet-tag">' + offer.tag + '</div>' +
          '<a class="mnet-cta" href="' + offer.url + '" target="_blank" rel="noopener noreferrer nofollow sponsored">Explore ' + offer.name + '</a>' +
        '</div>' +
        '<button class="mnet-close" onclick="MonetizationManager.dismiss()" aria-label="Dismiss recommendation">×</button>' +
      '</div>';
  }

  // Guard against the mutation-feedback loop: #monetization-area lives INSIDE
  // #mainContent, so re-rendering it from the observer callback would re-trigger
  // the observer forever. Only re-render when the tool actually changes, or when
  // the slot was emptied by navigation. executeCalc also calls render() explicitly.
  var _lastToolId = null;
  function init() {
    var main = document.getElementById('mainContent');
    if (!main) return;
    var observer = new MutationObserver(function () {
      var current = null;
      try { current = window.App && App._currentTool; } catch (e) {}
      var slot = document.getElementById('monetization-area');
      if (current && current.tool) {
        var needsRender = current.tool.id !== _lastToolId || (slot && slot.childElementCount === 0);
        if (needsRender) {
          _lastToolId = current.tool.id;
          MonetizationManager.render(current.tool.id, current.catKey);
        }
      } else {
        _lastToolId = null;
      }
    });
    observer.observe(main, { childList: true, subtree: true });
  }

  return { render: render, init: init, dismiss: dismiss, pickOffer: pickOffer, resolveCategory: resolveCategory };
})();

if (typeof window !== 'undefined') window.MonetizationManager = MonetizationManager;
if (typeof module !== 'undefined' && module.exports) module.exports = { MonetizationManager };
