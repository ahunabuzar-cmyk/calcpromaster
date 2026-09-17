/* Generate standalone static HTML pages (about, privacy, terms, cookies, contact,
   disclaimers) from legal-pages.js content, so crawlers and users without JS get
   full E-E-A-T content on separate pages. Run: node scripts/generate-static-pages.cjs */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'js', 'legal-pages.js');
const OUT = path.join(__dirname, '..');
const src = fs.readFileSync(SRC, 'utf8');

// Eval in a sandbox — the module only defines string constants at load time.
const sandbox = { window: {}, console };
const vm = require('vm');
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const LegalPages = sandbox.window.LegalPages;

const PAGES = {
  'about': { title: 'About CalcProMaster', desc: 'About CalcProMaster — a free collection of 1201+ online calculators for finance, health, math, science and everyday life, all running in your browser.', content: LegalPages.ABOUT_PAGE },
  'privacy': { title: 'Privacy Policy', desc: 'CalcProMaster privacy policy — we do not use cookies or track you. Preferences, history and favorites are stored only in your own browser via localStorage.', content: LegalPages.PRIVACY_POLICY },
  'terms': { title: 'Terms of Service', desc: 'CalcProMaster terms of service — free use of all calculators, no warranty, and clear liability limits for financial, health and general tools.', content: LegalPages.TERMS_OF_SERVICE },
  'cookies': { title: 'Cookie Policy', desc: 'CalcProMaster cookie policy — this site does not use cookies. Local storage is used only for your own saved preferences and history.', content: LegalPages.COOKIE_POLICY },
  'contact': { title: 'Contact CalcProMaster', desc: 'Contact CalcProMaster — get help with a calculator, report a formula issue, or suggest a new tool. We respond to every message.', content: LegalPages.CONTACT_PAGE },
  'disclaimer-general': { title: 'General Disclaimer', desc: 'CalcProMaster general disclaimer — calculators provide estimates for general information only and are not professional advice.', content: LegalPages.GENERAL_DISCLAIMER },
  'disclaimer-finance': { title: 'Financial Disclaimer', desc: 'CalcProMaster financial disclaimer — results are illustrative estimates, not financial advice. Verify with a licensed professional before acting.', content: LegalPages.FINANCIAL_DISCLAIMER },
  'disclaimer-health': { title: 'Health Disclaimer', desc: 'CalcProMaster health disclaimer — health and fitness calculators give general estimates only and are not medical advice.', content: LegalPages.HEALTH_DISCLAIMER },
};

// Static pages don't load the SPA's Router, so inline onclick handlers that call
// Router.navigate(...) would throw (preventDefault already ran → dead links).
// Strip those handlers, keeping the plain href (which works via _redirects).
function stripSpaHandlers(html) {
  return html
    // <a href="/x" onclick="event.preventDefault();Router.navigate('/x')"> → plain href
    .replace(/\sonclick="event\.preventDefault\(\);Router\.navigate\([^"]*\)"/g, '')
    // any other inline onclick on any element
    .replace(/\sonclick="[^"]*"/g, '');
}

const DOMAIN = 'https://calcpromaster.netlify.app';

const SHELL = (title, body, robots, desc, slug) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | CalcProMaster</title>
  <meta name="description" content="${desc}">
  <meta name="robots" content="${robots || 'index, follow'}">
  <meta name="theme-color" content="#4f46e5">
  <link rel="canonical" href="${DOMAIN}/${slug}">
  <link rel="icon" type="image/svg+xml" href="icon.svg">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "${title}",
    "url": "${DOMAIN}/${slug}",
    "isPartOf": { "@type": "WebSite", "name": "CalcProMaster", "url": "${DOMAIN}/" },
    "inLanguage": "en"
  }
  </script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    :root{--bg:#f8fafc;--surface:#fff;--text:#1e293b;--text-light:#64748b;--border:#e2e8f0;--primary:#4f46e5;--radius:14px}
    @media (prefers-color-scheme: dark){:root{--bg:#0f172a;--surface:#1e293b;--text:#f8fafc;--text-light:#94a3b8;--border:#334155}}
    body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);line-height:1.75;-webkit-font-smoothing:antialiased}
    header{background:var(--surface);border-bottom:1px solid var(--border);padding:14px 24px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
    .logo{font-size:20px;font-weight:800;background:linear-gradient(135deg,#4f46e5,#7c3aed);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;text-decoration:none}
    header a{color:var(--text-light);text-decoration:none;font-size:13px}
    header a:hover{color:var(--primary)}
    main{max-width:820px;margin:0 auto;padding:32px 24px 64px}
    h1{font-size:30px;font-weight:800;margin-bottom:8px}
    h2{font-size:20px;font-weight:700;margin:26px 0 10px}
    h3{font-size:16px;font-weight:600;margin:18px 0 6px}
    p{margin-bottom:10px;color:var(--text)}
    ul{margin:8px 0 14px 22px}
    li{margin-bottom:4px}
    .legal-meta{font-size:13px;color:var(--text-light);margin-bottom:18px}
    .legal-warning{background:rgba(245,158,11,.12);border-left:4px solid #f59e0b;padding:12px 16px;border-radius:8px;margin:16px 0}
    .legal-note{font-size:12px;color:var(--text-light);margin-top:6px}
    a{color:var(--primary)}
    footer{background:var(--surface);border-top:1px solid var(--border);padding:18px 24px;text-align:center;font-size:13px;color:var(--text-light)}
    footer a{color:var(--text-light);text-decoration:none;margin:0 8px}
    footer a:hover{color:var(--primary)}
  </style>
</head>
<body>
  <header>
    <a class="logo" href="/">CalcProMaster</a>
    <a href="/">Home</a>
    <a href="/about">About</a>
    <a href="/privacy">Privacy</a>
    <a href="/terms">Terms</a>
    <a href="/contact">Contact</a>
  </header>
  <main>${body}</main>
  <footer>
    <a href="/">CalcProMaster</a> · 1201+ free online calculators · All calculations run in your browser
    <br><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/contact">Contact</a>
  </footer>
</body>
</html>`;

for (const [slug, page] of Object.entries(PAGES)) {
  // Cookie policy is a genuinely thin utility page (not needed for indexing) —
  // noindex it so Google stops wasting crawl budget on a duplicate-signal page.
  // All other legal/E-E-A-T pages stay indexable.
  const robots = slug === 'cookies' ? 'noindex, follow' : 'index, follow';
  const desc = page.desc || `${page.title} — CalcProMaster's ${page.title.toLowerCase().replace(/^calcpromaster's /, '')}. All calculators run 100% in your browser with step-by-step solutions.`;
  const html = SHELL(page.title, stripSpaHandlers(page.content), robots, desc, slug);
  fs.writeFileSync(path.join(OUT, slug + '.html'), html);
  console.log('wrote', slug + '.html', '(' + (html.length / 1024).toFixed(1) + ' KB)');
}
console.log('Done. Now add _redirects rules so /about etc. serve these static files.');
