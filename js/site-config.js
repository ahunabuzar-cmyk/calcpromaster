// ====== CalcProMaster Site Config — SINGLE SOURCE OF TRUTH ======
// Deploy ke baad sirf yahan values change karo:
//   - domain:      aapka asli domain (abhi Netlify default: calcpromaster.netlify.app)
//   - gsc:         Google Search Console verification code (Search Console → Settings → Verification → paste the content= value)
//   - ga4Id:       Google Analytics 4 Measurement ID (begins with G-)
// NOTE: gsc/ga4Id ko EMPTY rakha gaya hai taaki koi placeholder value HTML me leak na
//       ho (placeholder strings indexing ko nuksan pahunchate hain aur broken requests
//       banate hain). Apne REAL codes yahan paste karo — inject logic khud active ho jayega.
// =====================================================================
// 📌 TODO — MANUAL ACTION NEEDED (deploy ke BAAD, ek baar karna hai):
// ---------------------------------------------------------------------
// 1) GOOGLE ANALYTICS 4 (GA4):
//    a. https://analytics.google.com → Admin → Create Property → naam:
//       "CalcProMaster" → Create
//    b. Web data stream → copy the Measurement ID (starts with G-...)
//    c. Niche `ga4Id:` mein paste karo, e.g.  ga4Id: ''
// 2) GOOGLE SEARCH CONSOLE (GSC):
//    a. https://search.google.com/search-console → Add property →
//       URL prefix → https://calcpromaster.netlify.app
//    b. Verification method: HTML tag → copy the content="..." value
//    c. Niche `gsc:` mein paste karo (sirf value, tag nahi)
// 3) Redeploy karo (build-deploy.js + Netlify upload).
//    GSC verification meta tag + GA4 script automatically inject honge.
// NOTE: dono EMPTY rakhna bhi safe hai — koi broken/placeholder script
//       request nahi jati (SITE_GA4_READY gate niche hai). Bas traffic
//       data tab tak nahi milega.
// =====================================================================
window.SITE_CONFIG = {
  domain: 'calcpromaster.netlify.app',
  gsc: 'googled1ac20b54b36e7cf',
  ga4Id: 'G-8QCP0TP1TD',
  // Build-time synced by scripts/sync-counts.cjs from the registry (js/data/*.js).
  // Runtime ALL_TOOLS is lazy per-category on calculator pages, so user-facing
  // counts must use this authoritative total instead of ALL_TOOLS.length.
  totalCalculators: 543
};

// Helper: full origin ("https://domain") — sitemap/schema/canonical/og ke liye
window.SITE_ORIGIN = 'https://' + window.SITE_CONFIG.domain;

// Helper: kya GA4 real configured hai (placeholder ho to scripts load mat karo — zero broken requests)
// NOTE: regex se 'G-XXXXXXXXXX' placeholder ko bhi exclude karna zaroori hai (10+ consecutive X).
window.SITE_GA4_READY = /^G-[A-Z0-9]{6,}$/.test(window.SITE_CONFIG.ga4Id) && window.SITE_CONFIG.ga4Id.indexOf('XXXXXXXX') === -1;

// Dev reminder: analytics/verification tab tak on nahi hai — sirf console mein,
// real users ko kuch nahi dikhta. Ye reminder deploy ke baad aapko yaad dilata hai
// ki js/site-config.js mein apne REAL codes paste karne hain.
if (!window.SITE_GA4_READY || !window.SITE_CONFIG.gsc) {
  try {
    console.info('%cCalcProMaster: Analytics setup pending — js/site-config.js mein apne REAL GA4 Measurement ID (G-...) aur Google Search Console verification code paste karo. Current: ga4Id=' + (window.SITE_CONFIG.ga4Id || '(empty)') + ', gsc=' + (window.SITE_CONFIG.gsc || '(empty)'), 'color:#f59e0b;font-weight:bold');
  } catch (e) { /* non-fatal */ }
}
