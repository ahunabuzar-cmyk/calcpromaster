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
      // No aria-label here on purpose: an aria-label of "Support this free project
      // on Buy Me a Coffee" did not contain the link's visible text, which failed
      // axe/label-content-name-mismatch (Lighthouse a11y). The name now comes from
      // the visible copy itself; the emoji/arrow are decorative and hidden, and
      // the new-tab hint is a visually-hidden span so it stays announced.
      '<a class="donation-link" href="' + COFFEE_URL + '" target="_blank" rel="noopener noreferrer nofollow">' +
        '<span class="donation-heart" aria-hidden="true">☕</span>' +
        '<span class="donation-copy">' +
          '<span class="donation-title">Support the creator</span>' +
          '<span class="donation-sub">Free forever — buy a coffee?</span>' +
        '</span>' +
        '<span class="sr-only"> (opens Buy Me a Coffee in a new tab)</span>' +
        '<span class="donation-chev" aria-hidden="true">→</span>' +
      '</a>' +
      '<button type="button" class="donation-close" aria-label="Dismiss donation prompt">×</button>';
    document.body.appendChild(el);
    // Delegated listener instead of an inline onclick (crawler audits flag every
    // inline handler in the served DOM, and this widget is injected after load).
    var closeBtn = el.querySelector('.donation-close');
    if (closeBtn) closeBtn.addEventListener('click', dismiss);
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
