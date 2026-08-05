// ====== DonationWidget (Pillar 4: Support the Creator) ======
// A non-intrusive floating "Buy Me a Coffee" style button, gently reminding
// visitors this free site is run by a single developer. Sits at the bottom-right,
// and can also render inside the UserDashboard sidebar slot.
const DonationWidget = (function () {
  // ⚠️ MANUAL ACTION NEEDED: COFFEE_URL abhi placeholder buymeacoffee page hai.
  // Apni REAL Buy Me a Coffee page URL yahan paste karo (create hone ke baad).
  // Search "COFFEE_URL" karke replace karna — sirf ye ek jagah hai.
  var COFFEE_URL = 'https://www.buymeacoffee.com/calcpro'; // REPLACE WITH YOUR BUY-ME-A-COFFEE URL
  var DISMISS_KEY = 'calcpro_donate_dismissed';
  var rendered = false;

  function isDismissed() {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch (e) { return false; }
  }
  function dismiss() {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch (e) {}
    var btn = document.getElementById('donation-widget');
    if (btn) { btn.style.opacity = '0'; btn.style.transform = 'translateY(16px)'; setTimeout(function () { btn.remove(); }, 400); }
  }

  function renderFloating() {
    if (rendered || isDismissed()) return;
    if (document.getElementById('donation-widget')) return;
    rendered = true;
    var el = document.createElement('div');
    el.id = 'donation-widget';
    el.className = 'donation-widget';
    el.innerHTML =
      '<a class="donation-link" href="' + COFFEE_URL + '" target="_blank" rel="noopener noreferrer nofollow" aria-label="Support this free project on Buy Me a Coffee">' +
        '<span class="donation-heart">☕</span>' +
        '<span class="donation-copy">' +
          '<span class="donation-title">Support the creator</span>' +
          '<span class="donation-sub">Free forever — buy a coffee?</span>' +
        '</span>' +
        '<span class="donation-chev">→</span>' +
      '</a>' +
      '<button class="donation-close" onclick="DonationWidget.dismiss()" aria-label="Dismiss donation prompt">×</button>';
    document.body.appendChild(el);
    // Slide-in after a short delay so it never blocks the first paint
    setTimeout(function () { el.classList.add('shown'); }, 1500);
  }

  // Compact variant for the dashboard sidebar slot
  function renderInto(slotId) {
    var slot = document.getElementById(slotId);
    if (!slot || slot.querySelector('.donation-card')) return;
    slot.innerHTML =
      '<div class="donation-card" role="complementary" aria-label="Support the creator">' +
        '<div class="donation-card-title">☕ Keep CalcProMaster free</div>' +
        '<p>Built and run by one developer, free for everyone.</p>' +
        '<a class="donation-card-cta" href="' + COFFEE_URL + '" target="_blank" rel="noopener noreferrer nofollow">Buy me a coffee</a>' +
      '</div>';
  }

  function init() {
    renderFloating();
  }

  return { init: init, renderFloating: renderFloating, renderInto: renderInto, dismiss: dismiss };
})();

if (typeof window !== 'undefined') window.DonationWidget = DonationWidget;
if (typeof module !== 'undefined' && module.exports) module.exports = { DonationWidget };
